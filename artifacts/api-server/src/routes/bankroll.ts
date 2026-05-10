import { Router, type IRouter } from "express";
import { db, bankrollTable, picksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetBankrollResponse, UpdateBankrollBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrCreateBankroll() {
  const [existing] = await db.select().from(bankrollTable).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(bankrollTable).values({}).returning();
  return created;
}

function buildResponse(b: typeof bankrollTable.$inferSelect, dailyExposurePct: number) {
  const amount = Number(b.amount);
  const unitPct = Number(b.unitPct);
  const unitSize = Math.round(amount * (unitPct / 100) * 100) / 100;
  const unitMultiplier = b.streak <= -3 ? 0.5 : 1.0;
  return {
    id: b.id,
    amount,
    unitPct,
    unitSize,
    streak: b.streak,
    weekWins: b.weekWins,
    weekLosses: b.weekLosses,
    weekPushes: b.weekPushes,
    preferredBook: b.preferredBook ?? null,
    unitMultiplier,
    dailyExposurePct,
    updatedAt: b.updatedAt.toISOString(),
  };
}

router.get("/bankroll", async (_req, res): Promise<void> => {
  const bankroll = await getOrCreateBankroll();
  const picks = await db.select().from(picksTable);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPicks = picks.filter(p => new Date(p.createdAt) >= today);
  const amount = Number(bankroll.amount);
  const totalStake = todayPicks.reduce((sum, p) => sum + (p.stake != null ? Number(p.stake) : 0), 0);
  const dailyExposurePct = amount > 0 ? Math.round((totalStake / amount) * 1000) / 10 : 0;

  res.json(GetBankrollResponse.parse(buildResponse(bankroll, dailyExposurePct)));
});

router.put("/bankroll", async (req, res): Promise<void> => {
  const parsed = UpdateBankrollBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const bankroll = await getOrCreateBankroll();
  const updateData: Partial<typeof bankrollTable.$inferInsert> = { updatedAt: new Date() };

  if (parsed.data.amount != null) updateData.amount = String(parsed.data.amount);
  if (parsed.data.unitPct != null) updateData.unitPct = String(parsed.data.unitPct);
  if (parsed.data.streak != null) updateData.streak = parsed.data.streak;
  if (parsed.data.weekWins != null) updateData.weekWins = parsed.data.weekWins;
  if (parsed.data.weekLosses != null) updateData.weekLosses = parsed.data.weekLosses;
  if (parsed.data.weekPushes != null) updateData.weekPushes = parsed.data.weekPushes;
  if ("preferredBook" in parsed.data) updateData.preferredBook = parsed.data.preferredBook ?? null;

  const [updated] = await db.update(bankrollTable).set(updateData).where(eq(bankrollTable.id, bankroll.id)).returning();

  const picks = await db.select().from(picksTable);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPicks = picks.filter(p => new Date(p.createdAt) >= today);
  const amount = Number(updated.amount);
  const totalStake = todayPicks.reduce((sum, p) => sum + (p.stake != null ? Number(p.stake) : 0), 0);
  const dailyExposurePct = amount > 0 ? Math.round((totalStake / amount) * 1000) / 10 : 0;

  res.json(GetBankrollResponse.parse(buildResponse(updated, dailyExposurePct)));
});

export default router;
