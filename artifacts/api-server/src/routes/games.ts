import { Router, type IRouter } from "express";
import { db, gamesTable, sportsTable, predictionsTable, oddsTable } from "@workspace/db";
import { eq, and, type SQL } from "drizzle-orm";
import {
  ListGamesQueryParams,
  ListGamesResponse,
  GetGameParams,
  GetGameResponse,
  ListUpcomingGamesResponse,
} from "@workspace/api-zod";

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

router.get("/games/upcoming", async (_req, res): Promise<void> => {
  const sports = await db.select().from(sportsTable).orderBy(sportsTable.id);
  const games = await db.select().from(gamesTable).where(eq(gamesTable.status, "upcoming")).orderBy(gamesTable.scheduledAt);
  const predictions = await db.select().from(predictionsTable);
  const allOdds = await db.select().from(oddsTable);

  const predMap = new Map(predictions.map(p => [p.gameId, p.id]));
  const oddsMap = new Map(allOdds.map(o => [o.gameId, o]));

  const grouped = sports.map(sport => ({
    sport,
    games: games
      .filter(g => g.sportId === sport.id)
      .map(g => {
        const o = oddsMap.get(g.id);
        return {
          ...g,
          sportName: sport.name,
          scheduledAt: g.scheduledAt.toISOString(),
          predictionId: predMap.get(g.id) ?? null,
          homeScore: g.homeScore ?? null,
          awayScore: g.awayScore ?? null,
          odds: o ? formatOdds(o) : undefined,
        };
      }),
  })).filter(sg => sg.games.length > 0);

  res.json(ListUpcomingGamesResponse.parse(grouped));
});

router.get("/games", async (req, res): Promise<void> => {
  const query = ListGamesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { sportId, status } = query.data;
  const conditions: SQL[] = [];
  if (sportId != null) conditions.push(eq(gamesTable.sportId, sportId));
  if (status != null) conditions.push(eq(gamesTable.status, status));

  const games = await db.select().from(gamesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(gamesTable.scheduledAt);

  const sports = await db.select().from(sportsTable);
  const predictions = await db.select().from(predictionsTable);
  const allOdds = await db.select().from(oddsTable);

  const sportMap = new Map(sports.map(s => [s.id, s]));
  const predMap = new Map(predictions.map(p => [p.gameId, p.id]));
  const oddsMap = new Map(allOdds.map(o => [o.gameId, o]));

  const result = games.map(g => {
    const o = oddsMap.get(g.id);
    return {
      ...g,
      sportName: sportMap.get(g.sportId)?.name ?? "",
      scheduledAt: g.scheduledAt.toISOString(),
      predictionId: predMap.get(g.id) ?? null,
      homeScore: g.homeScore ?? null,
      awayScore: g.awayScore ?? null,
      odds: o ? formatOdds(o) : undefined,
    };
  });

  res.json(ListGamesResponse.parse(result));
});

router.get("/games/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetGameParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, params.data.id));
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }

  const [sport] = await db.select().from(sportsTable).where(eq(sportsTable.id, game.sportId));
  const [prediction] = await db.select().from(predictionsTable).where(eq(predictionsTable.gameId, game.id));
  const [gameOdds] = await db.select().from(oddsTable).where(eq(oddsTable.gameId, game.id));

  const detail = {
    ...game,
    sportName: sport?.name ?? "",
    scheduledAt: game.scheduledAt.toISOString(),
    homeScore: game.homeScore ?? null,
    awayScore: game.awayScore ?? null,
    prediction: prediction
      ? {
          ...prediction,
          unitsRecommended: Number(prediction.unitsRecommended),
          hitRateLast7: prediction.hitRateLast7 != null ? Number(prediction.hitRateLast7) : null,
          hitRateSeason: prediction.hitRateSeason != null ? Number(prediction.hitRateSeason) : null,
          sampleSize: prediction.sampleSize ?? null,
          contrarianCheck: prediction.contrarianCheck ?? null,
          bestCase: prediction.bestCase ?? null,
          baseCase: prediction.baseCase ?? null,
          worstCase: prediction.worstCase ?? null,
          createdAt: prediction.createdAt.toISOString(),
          keyFactors: prediction.keyFactors ?? [],
        }
      : undefined,
    userPick: undefined,
    odds: gameOdds ? formatOdds(gameOdds) : undefined,
  };

  res.json(GetGameResponse.parse(detail));
});

export default router;
