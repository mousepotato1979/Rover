import { Router, type IRouter } from "express";
import { db, picksTable, gamesTable, predictionsTable, oddsTable } from "@workspace/db";
import {
  GetStatsSummaryResponse,
  GetLeaderboardResponse,
} from "@workspace/api-zod";
import { impliedProbability } from "../lib/math";

const router: IRouter = Router();

function calcEdge(confidencePct: number, moneyline: number): number {
  const implied = impliedProbability(moneyline) * 100;
  return Math.round((confidencePct - implied) * 10) / 10;
}

router.get("/stats/summary", async (_req, res): Promise<void> => {
  const picks = await db.select().from(picksTable);
  const totalPicks = picks.length;
  const wins = picks.filter(p => p.result === "win").length;
  const losses = picks.filter(p => p.result === "loss").length;
  const pushes = picks.filter(p => p.result === "push").length;
  const decided = wins + losses;
  const winRate = decided > 0 ? Math.round((wins / decided) * 1000) / 10 : 0;

  let unitPnl = 0;
  picks.forEach(p => {
    const u = Number(p.units) || 1;
    if (p.result === "win") unitPnl += u;
    else if (p.result === "loss") unitPnl -= u;
  });
  unitPnl = Math.round(unitPnl * 100) / 100;
  const roi = totalPicks > 0 ? Math.round((unitPnl / totalPicks) * 1000) / 10 : 0;

  const games = await db.select().from(gamesTable);
  const totalGames = games.length;
  const upcomingGames = games.filter(g => g.status === "upcoming").length;

  const predictions = await db.select().from(predictionsTable);
  const activePredictions = predictions.length;

  const odds = await db.select().from(oddsTable);
  const oddsMap = new Map(odds.map(o => [o.gameId, o]));

  let edgeHits = 0;
  predictions.forEach(pred => {
    const gameOdds = oddsMap.get(pred.gameId);
    const game = games.find(g => g.id === pred.gameId);
    if (!gameOdds || !game) return;
    const isHome = pred.predictedWinner === game.homeTeam;
    const ml = isHome ? gameOdds.homeMoneyline : gameOdds.awayMoneyline;
    const edge = calcEdge(pred.confidencePct, ml);
    if (edge > 0) edgeHits++;
  });

  res.json(GetStatsSummaryResponse.parse({
    totalPicks,
    wins,
    losses,
    pushes,
    winRate,
    totalGames,
    upcomingGames,
    activePredictions,
    unitPnl,
    roi,
    edgeHits,
  }));
});

router.get("/stats/leaderboard", async (_req, res): Promise<void> => {
  const predictions = await db.select().from(predictionsTable);
  const games = await db.select().from(gamesTable);
  const odds = await db.select().from(oddsTable);
  const gameMap = new Map(games.map(g => [g.id, g]));
  const oddsMap = new Map(odds.map(o => [o.gameId, o]));

  const entries = predictions
    .map((pred) => {
      const game = gameMap.get(pred.gameId);
      if (!game) return null;

      let result: string | null = null;
      if (game.status === "finished" && game.homeScore != null && game.awayScore != null) {
        const winner = game.homeScore > game.awayScore ? game.homeTeam : game.awayTeam;
        result = winner === pred.predictedWinner ? "win" : "loss";
      }

      const gameOdds = oddsMap.get(pred.gameId);
      let edge: number | null = null;
      if (gameOdds) {
        const isHome = pred.predictedWinner === game.homeTeam;
        const ml = isHome ? gameOdds.homeMoneyline : gameOdds.awayMoneyline;
        edge = calcEdge(pred.confidencePct, ml);
      }

      return {
        rank: 0,
        gameId: pred.gameId,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        predictedWinner: pred.predictedWinner,
        confidencePct: pred.confidencePct,
        result,
        edge,
        units: Number(pred.unitsRecommended),
        sharpMove: pred.sharpMove,
        confidenceTier: pred.confidenceTier,
        sport: game.league,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null)
    .sort((a, b) => (b.edge ?? 0) - (a.edge ?? 0))
    .map((e, idx) => ({ ...e, rank: idx + 1 }));

  res.json(GetLeaderboardResponse.parse(entries));
});

export default router;
