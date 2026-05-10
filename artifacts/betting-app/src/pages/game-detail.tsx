import React, { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetGame,
  getGetGameQueryKey,
  useCreatePick,
  useListPicks,
  getListPicksQueryKey,
  useGetBookOdds,
  getGetBookOddsQueryKey,
  useGetLineMoves,
  getGetLineMovesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle2, ChevronRight, LineChart, TrendingUp, AlertTriangle, Star, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatMoneyline, impliedProbability, calcEdge } from "@/lib/utils";
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";

function evPer100(odds: number, hitRate: number): number {
  if (odds > 0) return Math.round(((odds / 100) * hitRate - (1 - hitRate)) * 100 * 10) / 10;
  return Math.round(((100 / Math.abs(odds)) * hitRate - (1 - hitRate)) * 100 * 10) / 10;
}

function TierStars({ tier }: { tier: string }) {
  const map: Record<string, { count: number; label: string; color: string }> = {
    low: { count: 1, label: "LOW", color: "text-yellow-500" },
    medium: { count: 2, label: "MEDIUM", color: "text-yellow-400" },
    high: { count: 3, label: "HIGH", color: "text-primary" },
    elite: { count: 5, label: "ELITE", color: "text-primary" },
  };
  const t = map[tier] ?? map.medium;
  return (
    <span className={`font-mono text-xs font-bold ${t.color} flex items-center gap-1`}>
      {Array.from({ length: t.count }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
      <span>{t.label}</span>
    </span>
  );
}

function SharpBadge({ move }: { move: string }) {
  if (move === "sharp_reverse") return (
    <span className="font-mono text-xs font-bold text-orange-400 bg-orange-400/10 border border-orange-400/30 px-2 py-0.5 rounded">
      SHARP — REVERSE LINE
    </span>
  );
  if (move === "sharp_confirmed") return (
    <span className="font-mono text-xs font-bold text-green-400 bg-green-400/10 border border-green-400/30 px-2 py-0.5 rounded">
      SHARP — CONFIRMED
    </span>
  );
  if (move === "public") return (
    <span className="font-mono text-xs font-bold text-muted-foreground bg-muted/20 border border-border px-2 py-0.5 rounded">
      PUBLIC MOVE
    </span>
  );
  return (
    <span className="font-mono text-xs font-bold text-muted-foreground bg-muted/20 border border-border px-2 py-0.5 rounded">
      NEUTRAL
    </span>
  );
}

export default function GameDetail() {
  const { id } = useParams();
  const gameId = Number(id);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: game, isLoading } = useGetGame(gameId, {
    query: { enabled: !!gameId, queryKey: getGetGameQueryKey(gameId) }
  });

  const { data: bookOdds } = useGetBookOdds(gameId, {
    query: { enabled: !!gameId, queryKey: getGetBookOddsQueryKey(gameId) }
  });

  const { data: lineMoves } = useGetLineMoves(gameId, {
    query: { enabled: !!gameId, queryKey: getGetLineMovesQueryKey(gameId) }
  });

  const { data: allPicks } = useListPicks();
  const existingPick = allPicks?.find(p => p.gameId === gameId);

  const createPick = useCreatePick();
  const [selectedPick, setSelectedPick] = useState<string | null>(null);

  const handlePlacePick = () => {
    if (!selectedPick) return;
    const units = prediction ? prediction.unitsRecommended : 1;
    const bestBook = bestLineBook?.bookName ?? null;
    createPick.mutate({ data: { gameId, userPick: selectedPick, stake: 100, units, book: bestBook } }, {
      onSuccess: () => {
        toast({ title: "Pick placed", description: `${selectedPick} — ${units}u` });
        queryClient.invalidateQueries({ queryKey: getListPicksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetGameQueryKey(gameId) });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to place pick", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!game) return <div>Game not found</div>;

  const prediction = game.prediction;
  const odds = game.odds;
  const confidence = prediction?.confidencePct ?? 0;

  const isHome = prediction ? prediction.predictedWinner === game.homeTeam : false;
  const predictedML = odds ? (isHome ? odds.homeMoneyline : odds.awayMoneyline) : null;
  const impliedProb = predictedML != null ? impliedProbability(predictedML) * 100 : 0;
  const edge = predictedML != null ? calcEdge(confidence, predictedML) : 0;

  const l7 = prediction?.hitRateLast7 ?? null;
  const season = prediction?.hitRateSeason ?? null;
  const weighted = l7 != null && season != null ? Math.round((l7 * 0.60 + season * 0.40) * 1000) / 10 : null;
  const sharpImpact = prediction?.sharpMove === "sharp_reverse" || prediction?.sharpMove === "sharp_confirmed";

  const bestLineBook = bookOdds
    ? [...bookOdds].sort((a, b) => {
        const mlA = isHome ? a.homeMoneyline : a.awayMoneyline;
        const mlB = isHome ? b.homeMoneyline : b.awayMoneyline;
        const evA = weighted != null ? evPer100(mlA, weighted / 100) : mlA;
        const evB = weighted != null ? evPer100(mlB, weighted / 100) : mlB;
        return evB - evA;
      })[0]
    : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <Link href="/games" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Games
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Matchup Header */}
        <div className="lg:col-span-3">
          <Card className="bg-card border-border overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-8">
                <Badge variant="outline" className="tracking-widest uppercase text-xs">{game.sportName}</Badge>
                <div className="text-sm font-mono text-muted-foreground">
                  {format(new Date(game.scheduledAt), "EEEE, MMM d • h:mm a")}
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1 text-center md:text-right">
                  <div className="text-sm text-muted-foreground font-mono uppercase tracking-widest mb-2">Away</div>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">{game.awayTeam}</h2>
                  {game.awayScore !== null && <div className="text-4xl font-mono mt-4">{game.awayScore}</div>}
                </div>
                <div className="flex-shrink-0 px-4">
                  <span className="text-2xl font-black text-muted-foreground/30">VS</span>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <div className="text-sm text-muted-foreground font-mono uppercase tracking-widest mb-2">Home</div>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">{game.homeTeam}</h2>
                  {game.homeScore !== null && <div className="text-4xl font-mono mt-4">{game.homeScore}</div>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Left column — Market Odds + Rover Analysis */}
        <div className="lg:col-span-2 space-y-6">

          {/* Market Odds */}
          {odds && (
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border/50 bg-card/50">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LineChart className="h-5 w-5 text-chart-2" />
                  Market Odds
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-sm font-mono">
                    <thead className="bg-muted/20 border-b border-border text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3 text-left font-medium">Team</th>
                        <th className="px-6 py-3 text-right font-medium">Moneyline</th>
                        <th className="px-6 py-3 text-right font-medium">Spread</th>
                        <th className="px-6 py-3 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="hover:bg-muted/10">
                        <td className="px-6 py-4 font-sans font-medium">{game.awayTeam}</td>
                        <td className="px-6 py-4 text-right">{formatMoneyline(odds.awayMoneyline)}</td>
                        <td className="px-6 py-4 text-right"><span className="text-muted-foreground mr-2">{odds.spreadJuice}</span>{odds.awaySpread > 0 ? `+${odds.awaySpread}` : odds.awaySpread}</td>
                        <td className="px-6 py-4 text-right"><span className="text-muted-foreground mr-2">O {odds.overJuice}</span>{odds.overUnder}</td>
                      </tr>
                      <tr className="hover:bg-muted/10">
                        <td className="px-6 py-4 font-sans font-medium">{game.homeTeam}</td>
                        <td className="px-6 py-4 text-right">{formatMoneyline(odds.homeMoneyline)}</td>
                        <td className="px-6 py-4 text-right"><span className="text-muted-foreground mr-2">{odds.spreadJuice}</span>{odds.homeSpread > 0 ? `+${odds.homeSpread}` : odds.homeSpread}</td>
                        <td className="px-6 py-4 text-right"><span className="text-muted-foreground mr-2">U {odds.underJuice}</span>{odds.overUnder}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                {prediction && (
                  <div className="p-6 border-t border-border bg-card/30">
                    <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-widest mb-4">Model vs Market</h4>
                    <div className="flex items-center justify-between text-sm font-mono mb-4">
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Market Implied ({formatMoneyline(predictedML ?? 0)})</div>
                        <div className="text-lg">{impliedProb.toFixed(1)}%</div>
                      </div>
                      <div className="text-center">
                        <Badge variant="outline" className={edge > 0 ? "border-primary text-primary bg-primary/10" : "border-muted text-muted-foreground"}>
                          {edge > 0 ? "Model has edge" : edge < 0 ? "Market disagrees" : "Aligned"}
                        </Badge>
                        <div className={`text-2xl font-bold mt-2 ${edge > 0 ? "text-primary" : "text-destructive"}`}>
                          {edge > 0 ? "+" : ""}{edge}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rover Confidence</div>
                        <div className="text-lg text-primary">{confidence}%</div>
                      </div>
                    </div>
                    <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="absolute top-0 left-0 h-full bg-muted-foreground/40 rounded-full" style={{ width: `${impliedProb}%` }} />
                      <div className="absolute top-0 left-0 h-full bg-primary rounded-full" style={{ width: `${confidence}%`, opacity: 0.8 }} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Rover Analysis Panel */}
          {prediction && (
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border/50 bg-card/50">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span className="font-mono tracking-widest text-primary">ROVER</span>
                    <span className="text-muted-foreground font-normal">Analysis</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TierStars tier={prediction.confidenceTier} />
                    <SharpBadge move={prediction.sharpMove} />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-8">

                {/* Edge Formula */}
                <div>
                  <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Edge Formula</h4>
                  <div className="bg-background border border-border rounded-lg p-4 font-mono text-sm space-y-2">
                    {l7 != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">L7 Hit Rate</span>
                        <span>{Math.round(l7 * 7)}/7 = <span className="text-foreground">{Math.round(l7 * 100)}%</span></span>
                      </div>
                    )}
                    {season != null && prediction.sampleSize != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Season Hit Rate</span>
                        <span>{Math.round(season * prediction.sampleSize)}/{prediction.sampleSize} = <span className="text-foreground">{Math.round(season * 100)}%</span></span>
                      </div>
                    )}
                    {weighted != null && (
                      <div className="flex justify-between border-t border-border/50 pt-2">
                        <span className="text-muted-foreground">Weighted Est. (60/40)</span>
                        <span className="text-foreground">{weighted}%</span>
                      </div>
                    )}
                    {predictedML != null && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Implied Prob (best line)</span>
                        <span className="text-foreground">{impliedProb.toFixed(1)}%</span>
                      </div>
                    )}
                    {sharpImpact && (
                      <div className="flex justify-between text-orange-400">
                        <span>Sharp Signal Modifier</span>
                        <span>+3.0%</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-border pt-2 text-base font-bold">
                      <span className="text-muted-foreground">Final Edge</span>
                      <span className={edge > 0 ? "text-primary" : "text-destructive"}>{edge > 0 ? "+" : ""}{edge}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Units</span>
                      <span className="text-foreground font-bold">{prediction.unitsRecommended}u</span>
                    </div>
                    {bestLineBook && (
                      <div className="flex justify-between text-primary">
                        <span className="text-muted-foreground">Best Book</span>
                        <span>{bestLineBook.bookName} — {formatMoneyline(isHome ? bestLineBook.homeMoneyline : bestLineBook.awayMoneyline)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Analysis + Key Factors */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Rover's Take</h4>
                    <p className="text-sm leading-relaxed border-l-2 border-primary/50 pl-4 py-1 text-foreground/90">{prediction.analysis}</p>
                  </div>
                  {prediction.keyFactors && prediction.keyFactors.length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2">Key Factors</h4>
                      <ul className="space-y-1">
                        {prediction.keyFactors.map((f, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Tree of Thoughts */}
                {(prediction.bestCase || prediction.baseCase || prediction.worstCase) && (
                  <div>
                    <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Tree of Thoughts</h4>
                    <div className="space-y-2">
                      {prediction.bestCase && (
                        <div className="flex gap-3 text-sm">
                          <span className="font-mono text-xs font-bold text-primary w-12 shrink-0 pt-0.5">BEST</span>
                          <span className="text-foreground/80">{prediction.bestCase}</span>
                        </div>
                      )}
                      {prediction.baseCase && (
                        <div className="flex gap-3 text-sm">
                          <span className="font-mono text-xs font-bold text-yellow-400 w-12 shrink-0 pt-0.5">BASE</span>
                          <span className="text-foreground/80">{prediction.baseCase}</span>
                        </div>
                      )}
                      {prediction.worstCase && (
                        <div className="flex gap-3 text-sm">
                          <span className="font-mono text-xs font-bold text-destructive w-12 shrink-0 pt-0.5">WORST</span>
                          <span className="text-foreground/80">{prediction.worstCase}</span>
                        </div>
                      )}
                      <div className="text-xs font-mono text-muted-foreground pt-1">Most likely: BASE</div>
                    </div>
                  </div>
                )}

                {/* Contrarian Check */}
                {prediction.contrarianCheck && (
                  <div>
                    <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3" />
                      Contrarian Check — Strongest Argument Against
                    </h4>
                    <p className="text-sm text-muted-foreground italic border-l-2 border-muted pl-4 py-1">{prediction.contrarianCheck}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Line Movement Chart */}
          {lineMoves && lineMoves.length > 1 && (
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border/50 bg-card/50">
                <CardTitle className="flex items-center gap-2 text-lg font-mono tracking-wide">
                  <Activity className="h-5 w-5 text-chart-2" />
                  LINE MOVEMENT
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 pt-4">
                <ResponsiveContainer width="100%" height={200}>
                  <ReLineChart data={lineMoves.map(m => ({
                    time: format(new Date(m.recordedAt), "h:mm a"),
                    home: m.homeMoneyline,
                    away: m.awayMoneyline,
                    spread: m.homeSpread,
                  }))} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => v > 0 ? `+${v}` : `${v}`} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                      formatter={(v: any, name: string) => [v > 0 ? `+${v}` : `${v}`, name === "home" ? `${game.homeTeam} ML` : `${game.awayTeam} ML`]}
                      labelStyle={{ color: "hsl(var(--muted-foreground))" }}
                    />
                    <Legend formatter={(v) => v === "home" ? `${game.homeTeam} ML` : `${game.awayTeam} ML`} />
                    <Line type="monotone" dataKey="home" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    <Line type="monotone" dataKey="away" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} activeDot={{ r: 4 }} strokeDasharray="4 2" />
                  </ReLineChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border font-mono text-xs">
                  <div>
                    <div className="text-muted-foreground uppercase tracking-widest mb-1">Open</div>
                    <div className="font-bold">{game.homeTeam}: {lineMoves[0].homeMoneyline > 0 ? "+" : ""}{lineMoves[0].homeMoneyline} · {game.awayTeam}: {lineMoves[0].awayMoneyline > 0 ? "+" : ""}{lineMoves[0].awayMoneyline}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground uppercase tracking-widest mb-1">Current</div>
                    <div className="font-bold">{game.homeTeam}: {lineMoves[lineMoves.length - 1].homeMoneyline > 0 ? "+" : ""}{lineMoves[lineMoves.length - 1].homeMoneyline} · {game.awayTeam}: {lineMoves[lineMoves.length - 1].awayMoneyline > 0 ? "+" : ""}{lineMoves[lineMoves.length - 1].awayMoneyline}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Line Shopping */}
          {bookOdds && bookOdds.length > 0 && prediction && (
            <Card className="bg-card border-border">
              <CardHeader className="border-b border-border/50 bg-card/50">
                <CardTitle className="text-lg font-mono tracking-wide">
                  LINE SHOPPING — {prediction.predictedWinner.toUpperCase()}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm font-mono">
                    <thead className="bg-muted/20 border-b border-border text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3 text-left">Book</th>
                        <th className="px-5 py-3 text-right">Home ML</th>
                        <th className="px-5 py-3 text-right">Away ML</th>
                        <th className="px-5 py-3 text-right">Spread</th>
                        <th className="px-5 py-3 text-right">O/U</th>
                        <th className="px-5 py-3 text-right">EV/$100</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {bookOdds.map((b) => {
                        const ml = isHome ? b.homeMoneyline : b.awayMoneyline;
                        const ev = weighted != null ? evPer100(ml, weighted / 100) : null;
                        const isBest = bestLineBook?.id === b.id;
                        return (
                          <tr key={b.id} className={`hover:bg-muted/10 transition-colors ${isBest ? "bg-primary/5 border-l-2 border-l-primary" : ""}`}>
                            <td className="px-5 py-3 font-sans font-medium">
                              {b.bookName}
                              {isBest && <span className="ml-2 text-xs text-primary font-mono">BEST LINE</span>}
                            </td>
                            <td className={`px-5 py-3 text-right ${isHome && isBest ? "text-primary font-bold" : ""}`}>{formatMoneyline(b.homeMoneyline)}</td>
                            <td className={`px-5 py-3 text-right ${!isHome && isBest ? "text-primary font-bold" : ""}`}>{formatMoneyline(b.awayMoneyline)}</td>
                            <td className="px-5 py-3 text-right">{b.homeSpread > 0 ? `+${b.homeSpread}` : b.homeSpread} / {b.awaySpread > 0 ? `+${b.awaySpread}` : b.awaySpread}</td>
                            <td className="px-5 py-3 text-right">{b.overUnder}</td>
                            <td className={`px-5 py-3 text-right font-bold ${ev != null && ev > 0 ? "text-primary" : "text-muted-foreground"}`}>
                              {ev != null ? `$${ev}` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {bestLineBook && weighted != null && (
                  <div className="p-4 border-t border-border bg-primary/5 text-xs font-mono text-primary">
                    ROVER RECOMMENDS: Bet {bestLineBook.bookName} at {formatMoneyline(isHome ? bestLineBook.homeMoneyline : bestLineBook.awayMoneyline)} — best EV per $100
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — Pick panel */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="bg-card border-border sticky top-8">
            <CardHeader className="border-b border-border/50 bg-card/50">
              <CardTitle className="text-lg">Place Your Pick</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {existingPick ? (
                <div className="text-center space-y-4 py-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 text-primary mb-2">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-widest font-mono">Your Pick</div>
                    <div className="text-xl font-bold mt-1">{existingPick.userPick}</div>
                    {existingPick.units && <div className="text-sm font-mono text-muted-foreground mt-1">{existingPick.units}u</div>}
                    {existingPick.book && <div className="text-xs text-primary font-mono mt-1">{existingPick.book}</div>}
                  </div>
                  <Badge className="mt-2 bg-secondary text-secondary-foreground hover:bg-secondary">Pick Locked</Badge>
                </div>
              ) : game.status !== "upcoming" ? (
                <div className="text-center py-8 text-muted-foreground font-mono text-sm">
                  Game is {game.status}.<br />Picks are closed.
                </div>
              ) : (
                <div className="space-y-6">
                  {prediction && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-center">
                      <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">Rover Recommends</div>
                      <div className="font-bold text-primary">{prediction.predictedWinner}</div>
                      <div className="text-xs font-mono text-muted-foreground mt-1">{prediction.unitsRecommended}u — {prediction.confidenceTier.toUpperCase()}</div>
                    </div>
                  )}
                  <div className="space-y-3">
                    <button
                      onClick={() => setSelectedPick(game.awayTeam)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${selectedPick === game.awayTeam ? "border-primary bg-primary/5" : "border-border bg-background hover:border-muted-foreground"}`}
                    >
                      <div className="text-xs text-muted-foreground uppercase tracking-widest font-mono mb-1">Away</div>
                      <div className="font-bold">{game.awayTeam}</div>
                      {odds && <div className="text-sm font-mono text-muted-foreground mt-1">{formatMoneyline(odds.awayMoneyline)}</div>}
                    </button>
                    <button
                      onClick={() => setSelectedPick(game.homeTeam)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${selectedPick === game.homeTeam ? "border-primary bg-primary/5" : "border-border bg-background hover:border-muted-foreground"}`}
                    >
                      <div className="text-xs text-muted-foreground uppercase tracking-widest font-mono mb-1">Home</div>
                      <div className="font-bold">{game.homeTeam}</div>
                      {odds && <div className="text-sm font-mono text-muted-foreground mt-1">{formatMoneyline(odds.homeMoneyline)}</div>}
                    </button>
                  </div>
                  <Button
                    className="w-full font-bold tracking-widest uppercase"
                    size="lg"
                    disabled={!selectedPick || createPick.isPending}
                    onClick={handlePlacePick}
                  >
                    {createPick.isPending ? "Processing..." : "Confirm Pick"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
