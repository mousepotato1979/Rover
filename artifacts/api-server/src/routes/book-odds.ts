import { Router, type IRouter } from "express";
import { db, bookOddsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetBookOddsParams, GetBookOddsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function formatBookOdds(o: typeof bookOddsTable.$inferSelect) {
  return {
    ...o,
    homeSpread: Number(o.homeSpread),
    awaySpread: Number(o.awaySpread),
    overUnder: Number(o.overUnder),
    lastUpdated: o.lastUpdated.toISOString(),
  };
}

router.get("/book-odds/:gameId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.gameId) ? req.params.gameId[0] : req.params.gameId;
  const params = GetBookOddsParams.safeParse({ gameId: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db.select().from(bookOddsTable)
    .where(eq(bookOddsTable.gameId, params.data.gameId))
    .orderBy(bookOddsTable.bookName);

  res.json(GetBookOddsResponse.parse(rows.map(formatBookOdds)));
});

export default router;
