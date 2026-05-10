import { Router, type IRouter } from "express";
import { db, picksTable, gamesTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import {
  ListPicksResponse,
  CreatePickBody,
  UpdatePickParams,
  UpdatePickBody,
  DeletePickParams,
  SettlePicksResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatPick(p: typeof picksTable.$inferSelect, game: typeof gamesTable.$inferSelect | undefined) {
  return {
    ...p,
    homeTeam: game?.homeTeam ?? "",
    awayTeam: game?.awayTeam ?? "",
    stake: p.stake != null ? Number(p.stake) : null,
    units: p.units != null ? Number(p.units) : null,
    book: p.book ?? null,
    result: p.result ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/picks", async (_req, res): Promise<void> => {
  const picks = await db.select().from(picksTable).orderBy(picksTable.createdAt);
  const games = await db.select().from(gamesTable);
  const gameMap = new Map(games.map(g => [g.id, g]));
  res.json(ListPicksResponse.parse(picks.map(p => formatPick(p, gameMap.get(p.gameId)))));
});

router.post("/picks", async (req, res): Promise<void> => {
  const parsed = CreatePickBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, parsed.data.gameId));
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  const [pick] = await db.insert(picksTable).values({
    gameId: parsed.data.gameId,
    userPick: parsed.data.userPick,
    stake: parsed.data.stake != null ? String(parsed.data.stake) : null,
    units: parsed.data.units != null ? String(parsed.data.units) : null,
    book: parsed.data.book ?? null,
  }).returning();

  res.status(201).json(formatPick(pick, game));
});

router.post("/picks/settle", async (_req, res): Promise<void> => {
  const pendingPicks = await db
    .select()
    .from(picksTable)
    .where(isNull(picksTable.result));

  const games = await db.select().from(gamesTable);
  const gameMap = new Map(games.map(g => [g.id, g]));

  const details: Array<{ pickId: number; gameId: number; result: string }> = [];

  for (const pick of pendingPicks) {
    const game = gameMap.get(pick.gameId);
    if (!game || game.status !== "finished") continue;
    if (game.homeScore == null || game.awayScore == null) continue;

    let result: string;
    if (game.homeScore === game.awayScore) {
      result = "push";
    } else {
      const winner = game.homeScore > game.awayScore ? game.homeTeam : game.awayTeam;
      result = winner === pick.userPick ? "win" : "loss";
    }

    await db
      .update(picksTable)
      .set({ result })
      .where(eq(picksTable.id, pick.id));

    details.push({ pickId: pick.id, gameId: pick.gameId, result });
  }

  res.json(SettlePicksResponse.parse({ settled: details.length, details }));
});

router.patch("/picks/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdatePickParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePickBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [pick] = await db.update(picksTable)
    .set({ result: parsed.data.result ?? null })
    .where(eq(picksTable.id, params.data.id))
    .returning();

  if (!pick) {
    res.status(404).json({ error: "Pick not found" });
    return;
  }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, pick.gameId));
  res.json(formatPick(pick, game));
});

router.delete("/picks/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeletePickParams.safeParse({ id: parseInt(rawId, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [pick] = await db.delete(picksTable).where(eq(picksTable.id, params.data.id)).returning();
  if (!pick) {
    res.status(404).json({ error: "Pick not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
