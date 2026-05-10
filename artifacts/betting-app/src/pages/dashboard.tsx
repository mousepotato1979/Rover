import React, { useMemo } from "react";
import { Link } from "wouter";
import { useGetStatsSummary, useListUpcomingGames, useListPicks, useListPredictions } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Target, TrendingUp, TrendingDown, AlertTriangle, ArrowRight, Zap, Terminal, DollarSign, BarChart2 } from "lucide-react";
import { formatMoneyline, calcEdge, impliedProbability } from "@/lib/utils";

function getConfidenceStars(tier: string) {
  switch (tier) {
    case "low": return "★";
    case "medium": return "★★";
    case "high": return "★★★";
    case "elite": return "★★★★★";
    default: return "";
  }
}

function StatCard({ title, value, sub, icon, highlight }: {
  title: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ReactNode;
  highlight?: "green" | "red" | "yellow";
}) {
  const colorMap = { green: "text-primary", red: "text-destructive", yellow: "text-yellow-400" };
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5 flex flex-col gap-2">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs uppercase tracking-widest font-medium">{title}</span>
          {icon}
        </div>
        <div className={`text-3xl font-bold font-mono tracking-tighter ${highlight ? colorMap[highlight] : ""}`}>
          {value}
        </div>
        {sub && <div className="text-xs text-muted-foreground font-mono">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetStatsSummary();
  const { data: upcomingSports, isLoading: gamesLoading } = useListUpcomingGames();
  const { data: picks } = useListPicks();
  const { data: predictions } = useListPredictions();

  const bestPick = useMemo(() => {
    if (!upcomingSports || !predictions) return null;
    let best: { game: any; pred: any; edge: number } | null = null;
    upcomingSports.forEach(sport => {
      sport.games.forEach(game => {
        if (!game.predictionId || !game.odds) return;
        const pred = predictions.find(p => p.id === game.predictionId);
        if (!pred) return;
        const isHome = pred.predictedWinner === game.homeTeam;
        const ml = isHome ? game.odds.homeMoneyline : game.odds.awayMoneyline;
        const edge = calcEdge(pred.confidencePct, ml);
        if (edge > 0 && (!best || edge > best.edge)) {
          best = { game, pred, edge };
        }
      });
    });
    return best;
  }, [upcomingSports, predictions]);

  const recentPicks = useMemo(() => picks?.slice(-5).reverse() ?? [], [picks]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground text-sm font-mono uppercase tracking-widest">
          Market Intelligence &amp; Personal Performance
        </p>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-28 w-full bg-card" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            title="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            sub={`${stats.wins}W — ${stats.losses}L — ${stats.pushes}P`}
            icon={<TrendingUp className="h-4 w-4 text-primary" />}
            highlight={stats.winRate >= 55 ? "green" : stats.winRate < 45 ? "red" : undefined}
          />
          <StatCard
            title="Unit P&L"
            value={`${stats.unitPnl >= 0 ? "+" : ""}${stats.unitPnl.toFixed(1)}u`}
            icon={stats.unitPnl >= 0
              ? <TrendingUp className="h-4 w-4 text-primary" />
              : <TrendingDown className="h-4 w-4 text-destructive" />}
            highlight={stats.unitPnl > 0 ? "green" : stats.unitPnl < 0 ? "red" : undefined}
          />
          <StatCard
            title="ROI"
            value={`${stats.roi >= 0 ? "+" : ""}${stats.roi.toFixed(1)}%`}
            sub="per pick"
            icon={<DollarSign className="h-4 w-4 text-chart-2" />}
            highlight={stats.roi > 0 ? "green" : stats.roi < 0 ? "red" : undefined}
          />
          <StatCard
            title="Active Predictions"
            value={stats.activePredictions}
            icon={<Target className="h-4 w-4 text-chart-2" />}
          />
          <StatCard
            title="Upcoming Games"
            value={stats.upcomingGames}
            icon={<AlertTriangle className="h-4 w-4 text-chart-3" />}
          />
          <StatCard
            title="Edge Opportunities"
            value={stats.edgeHits}
            icon={<Zap className="h-4 w-4 text-yellow-500" />}
            highlight={stats.edgeHits > 0 ? "yellow" : undefined}
          />
        </div>
      ) : null}

      {bestPick && (
        <Link href={`/games/${(bestPick as any).game.id}`}>
          <Card className="bg-primary/5 border-primary/40 hover:border-primary cursor-pointer transition-colors overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/50 to-transparent" />
            <CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 shrink-0">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-mono text-primary uppercase tracking-widest mb-1">Rover's Best Pick Today</div>
                  <div className="text-lg font-bold">{(bestPick as any).game.awayTeam} @ {(bestPick as any).game.homeTeam}</div>
                  <div className="text-sm text-muted-foreground">
                    Pick: <span className="text-primary font-medium">{(bestPick as any).pred.predictedWinner}</span>
                    {" "}· {(bestPick as any).pred.unitsRecommended}u · {getConfidenceStars((bestPick as any).pred.confidenceTier)} {(bestPick as any).pred.confidenceTier.toUpperCase()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Edge</div>
                  <div className="text-2xl font-bold text-primary">+{(bestPick as any).edge}%</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider mb-1">Confidence</div>
                  <div className="text-2xl font-bold text-foreground">{(bestPick as any).pred.confidencePct}%</div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Active Edge Opportunities</h2>
            <Link href="/games" className="text-sm text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {predictions && (
            <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg flex items-center gap-3">
              <Terminal className="h-5 w-5 text-primary shrink-0" />
              <div className="font-mono text-sm">
                <span className="font-bold text-primary">ROVER IS LIVE</span>
                {" "}— {predictions.filter(p => p.sharpMove === "sharp_reverse" || p.sharpMove === "sharp_confirmed").length} sharp signals detected today
              </div>
            </div>
          )}

          {gamesLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full bg-card" />)}
            </div>
          ) : upcomingSports && upcomingSports.length > 0 ? (
            <div className="space-y-6">
              {upcomingSports.map(sport => (
                <div key={sport.sport.id} className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest border-b border-border pb-1">
                    {sport.sport.name}
                  </h3>
                  <div className="grid gap-3">
                    {sport.games.slice(0, 3).map(game => {
                      let edgeBadge = null;
                      let confidenceBadge = null;
                      let unitsBadge = null;
                      if (game.predictionId && game.odds && predictions) {
                        const pred = predictions.find(p => p.id === game.predictionId);
                        if (pred) {
                          const isHome = pred.predictedWinner === game.homeTeam;
                          const ml = isHome ? game.odds.homeMoneyline : game.odds.awayMoneyline;
                          const edge = calcEdge(pred.confidencePct, ml);
                          if (edge > 0) {
                            edgeBadge = <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">+{edge}% EDGE</Badge>;
                          }
                          confidenceBadge = (
                            <Badge variant="outline" className="border-primary/50 text-primary">
                              {getConfidenceStars(pred.confidenceTier)} {pred.confidenceTier.toUpperCase()}
                            </Badge>
                          );
                          unitsBadge = <span className="text-xs font-mono font-bold text-foreground">{pred.unitsRecommended}u</span>;
                        }
                      }
                      return (
                        <Link key={game.id} href={`/games/${game.id}`}>
                          <Card className="hover:border-primary/50 transition-colors cursor-pointer group bg-card">
                            <CardContent className="p-0">
                              <div className="p-4 flex items-center justify-between">
                                <div className="flex flex-col gap-1">
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(game.scheduledAt), "MMM d, h:mm a")}
                                  </span>
                                  <div className="font-medium">{game.awayTeam} @ {game.homeTeam}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {unitsBadge}
                                  {confidenceBadge}
                                  {edgeBadge}
                                </div>
                              </div>
                              {game.odds && (
                                <div className="bg-muted/30 border-t border-border px-4 py-2 grid grid-cols-3 text-xs font-mono">
                                  <div><span className="text-muted-foreground">ML: </span>{formatMoneyline(game.odds.awayMoneyline)} / {formatMoneyline(game.odds.homeMoneyline)}</div>
                                  <div><span className="text-muted-foreground">SPR: </span>{game.odds.awaySpread > 0 ? `+${game.odds.awaySpread}` : game.odds.awaySpread} / {game.odds.homeSpread > 0 ? `+${game.odds.homeSpread}` : game.odds.homeSpread}</div>
                                  <div><span className="text-muted-foreground">O/U: </span>{game.odds.overUnder}</div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-8 border border-dashed border-border rounded-lg bg-card/50">
              <p className="text-muted-foreground">No upcoming games found.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Recent Activity</h2>
            <Link href="/picks" className="text-sm text-primary hover:underline flex items-center gap-1">
              History <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <Card>
            <CardContent className="p-0">
              {recentPicks.length > 0 ? (
                <div className="divide-y divide-border">
                  {recentPicks.map(pick => (
                    <Link key={pick.id} href={`/games/${pick.gameId}`}>
                      <div className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors cursor-pointer">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{pick.userPick}</span>
                          <span className="text-xs text-muted-foreground">{pick.awayTeam} @ {pick.homeTeam}</span>
                          {pick.units && <span className="text-xs font-mono text-muted-foreground">{pick.units}u{pick.book ? ` · ${pick.book}` : ""}</span>}
                        </div>
                        <div>
                          {pick.result === "win" && <Badge className="bg-primary text-primary-foreground">Win</Badge>}
                          {pick.result === "loss" && <Badge variant="destructive">Loss</Badge>}
                          {pick.result === "push" && <Badge variant="secondary">Push</Badge>}
                          {!pick.result && <Badge variant="outline">Pending</Badge>}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6">
                  <p className="text-sm text-muted-foreground">No recent picks.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {stats && (
            <Card className="bg-card border-border">
              <CardContent className="p-5 space-y-3">
                <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-3">Performance</div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Picks</span>
                  <span className="font-mono font-bold">{stats.totalPicks}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Win Rate</span>
                  <span className={`font-mono font-bold ${stats.winRate >= 55 ? "text-primary" : stats.winRate < 45 ? "text-destructive" : ""}`}>{stats.winRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Unit P&L</span>
                  <span className={`font-mono font-bold ${stats.unitPnl > 0 ? "text-primary" : stats.unitPnl < 0 ? "text-destructive" : ""}`}>{stats.unitPnl >= 0 ? "+" : ""}{stats.unitPnl.toFixed(1)}u</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">ROI</span>
                  <span className={`font-mono font-bold ${stats.roi > 0 ? "text-primary" : stats.roi < 0 ? "text-destructive" : ""}`}>{stats.roi >= 0 ? "+" : ""}{stats.roi.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                  <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${Math.min(stats.winRate, 100)}%` }} />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
