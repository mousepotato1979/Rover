import { Router, type IRouter } from "express";
import { db, oddsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ListOddsResponse, GetOddsParams, GetOddsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function formatOdds(o: typeof oddsTable.$inferSelect) {
  return {
    ...o,
    homeSpread: Number(o.homeSpread),
    awaySpread: Number(o.awaySpread),
    overUnder: Number(o.overUnder),
    lastUpdated: o.lastUpdated.toISOString(),
  };
}

router.get("/odds", async (_req, res): Promise<void> => {
  const rows = await db.select().from(oddsTable).orderBy(oddsTable.gameId);
  res.json(ListOddsResponse.parse(rows.map(formatOdds)));
});

router.get("/odds/:gameId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.gameId) ? req.params.gameId[0] : req.params.gameId;
  const params = GetOddsParams.safeParse({ gameId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db.select().from(oddsTable).where(eq(oddsTable.gameId, params.data.gameId));
  if (!row) {
    res.status(404).json({ error: "Odds not found" });
    return;
  }

  res.json(GetOddsResponse.parse(formatOdds(row)));
});

export default router;
