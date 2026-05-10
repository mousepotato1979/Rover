import { Router, type IRouter } from "express";
import { db, lineMovesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { GetLineMovesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/line-moves/:gameId", async (req, res): Promise<void> => {
  const gameId = parseInt(req.params.gameId as string, 10);
  if (isNaN(gameId)) {
    res.status(400).json({ error: "Invalid gameId" });
    return;
  }

  const moves = await db
    .select()
    .from(lineMovesTable)
    .where(eq(lineMovesTable.gameId, gameId))
    .orderBy(lineMovesTable.recordedAt);

  res.json(
    GetLineMovesResponse.parse(
      moves.map(m => ({
        id: m.id,
        gameId: m.gameId,
        bookName: m.bookName,
        homeMoneyline: m.homeMoneyline,
        awayMoneyline: m.awayMoneyline,
        homeSpread: Number(m.homeSpread),
        overUnder: Number(m.overUnder),
        recordedAt: m.recordedAt.toISOString(),
      }))
    )
  );
});

export default router;
