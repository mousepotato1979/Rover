import { Router, type IRouter } from "express";
import { db, predictionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListPredictionsQueryParams,
  ListPredictionsResponse,
  GetPredictionParams,
  GetPredictionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function formatPrediction(p: typeof predictionsTable.$inferSelect) {
  return {
    ...p,
    unitsRecommended: Number(p.unitsRecommended),
    hitRateLast7: p.hitRateLast7 != null ? Number(p.hitRateLast7) : null,
    hitRateSeason: p.hitRateSeason != null ? Number(p.hitRateSeason) : null,
    sampleSize: p.sampleSize ?? null,
    contrarianCheck: p.contrarianCheck ?? null,
    bestCase: p.bestCase ?? null,
    baseCase: p.baseCase ?? null,
    worstCase: p.worstCase ?? null,
    createdAt: p.createdAt.toISOString(),
    keyFactors: p.keyFactors ?? [],
  };
}

router.get("/predictions", async (req, res): Promise<void> => {
  const query = ListPredictionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { gameId } = query.data;
  const preds = gameId != null
    ? await db.select().from(predictionsTable).where(eq(predictionsTable.gameId, gameId))
    : await db.select().from(predictionsTable).orderBy(predictionsTable.createdAt);

  res.json(ListPredictionsResponse.parse(preds.map(formatPrediction)));
});

router.get("/predictions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetPredictionParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [pred] = await db.select().from(predictionsTable).where(eq(predictionsTable.id, params.data.id));
  if (!pred) {
    res.status(404).json({ error: "Prediction not found" });
    return;
  }

  res.json(GetPredictionResponse.parse(formatPrediction(pred)));
});

export default router;
