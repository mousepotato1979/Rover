import React, { useState } from "react";
import { Link } from "wouter";
import { useListGames, useListSports, getListGamesQueryKey, useListPredictions } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { formatMoneyline, calcEdge } from "@/lib/utils";

function getConfidenceStars(tier: string) {
  switch (tier) {
    case "low": return "★";
    case "medium": return "★★";
    case "high": return "★★★";
    case "elite": return "★★★★★";
    default: return "";
  }
}

export default function Games() {
  const [sportId, setSportId] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const { data: sports } = useListSports();
  const { data: games, isLoading } = useListGames(
    { sportId, status: status as any },
    { query: { queryKey: getListGamesQueryKey({ sportId, status: status as any }) } }
  );
  const { data: predictions } = useListPredictions();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edge Games</h1>
          <p className="text-muted-foreground text-sm font-mono uppercase tracking-widest mt-1">
            Browse Market Opportunities
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={sportId?.toString() || "all"} onValueChange={(v) => setSportId(v === "all" ? null : Number(v))}>
            <SelectTrigger className="w-[140px] bg-card">
              <SelectValue placeholder="All Sports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sports</SelectItem>
              {sports?.map(s => (
                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? null : v)}>
            <SelectTrigger className="w-[140px] bg-card">
              <SelectValue placeholder="Any Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Status</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="finished">Finished</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 w-full bg-card" />)}
        </div>
      ) : games && games.length > 0 ? (
        <div className="grid gap-4">
          {games.map((game, i) => {
            let edgeBadge = null;
            let confidenceBadge = null;
            let unitsBadge = null;
            let sharpBadge = null;
            if (game.predictionId && game.odds && predictions) {
              const pred = predictions.find(p => p.id === game.predictionId);
              if (pred) {
                const isHome = pred.predictedWinner === game.homeTeam;
                const ml = isHome ? game.odds.homeMoneyline : game.odds.awayMoneyline;
                const edge = calcEdge(pred.confidencePct, ml);
                if (edge > 0) {
                  edgeBadge = <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 ml-2">+{edge}% EDGE</Badge>;
                } else if (edge < 0) {
                  edgeBadge = <Badge variant="secondary" className="bg-muted text-muted-foreground ml-2">{edge}% EDGE</Badge>;
                }
                confidenceBadge = <Badge variant="outline" className="border-primary/50 text-primary">{getConfidenceStars(pred.confidenceTier)} {pred.confidenceTier.toUpperCase()}</Badge>;
                unitsBadge = <span className="text-xs font-mono font-bold text-foreground">{pred.unitsRecommended}u</span>;
                if (pred.sharpMove === 'sharp_reverse' || pred.sharpMove === 'sharp_confirmed') {
                  sharpBadge = <Badge variant="secondary" className="bg-orange-500/20 text-orange-500 border-orange-500/30">SHARP</Badge>;
                }
              }
            }

            return (
              <Link key={game.id} href={`/games/${game.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer group bg-card animate-in slide-in-from-bottom-2 overflow-hidden" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "both" }}>
                  <CardContent className="p-0">
                    <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] rounded-sm px-1.5 py-0 uppercase tracking-wider">{game.sportName}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(game.scheduledAt), "MMM d, h:mm a")}
                          </span>
                          {game.status === "live" && <span className="flex h-2 w-2 rounded-full bg-destructive animate-pulse"></span>}
                        </div>
                        <div className="flex flex-col text-lg font-bold tracking-tight">
                          <div className="flex justify-between w-full md:w-64">
                            <span>{game.awayTeam}</span>
                            {game.awayScore !== null && <span className="font-mono text-muted-foreground">{game.awayScore}</span>}
                          </div>
                          <div className="flex justify-between w-full md:w-64">
                            <span>{game.homeTeam}</span>
                            {game.homeScore !== null && <span className="font-mono text-muted-foreground">{game.homeScore}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {game.predictionId ? (
                          <div className="text-right flex flex-col items-end gap-1">
                            <div className="text-xs text-primary font-mono uppercase tracking-widest flex items-center gap-2">
                              <span className="font-bold">Rover Active</span>
                              {sharpBadge}
                            </div>
                            <div className="flex items-center gap-2">
                              {unitsBadge}
                              {confidenceBadge}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground/50 font-mono uppercase tracking-widest">No Model</div>
                        )}
                        <Button variant="ghost" size="icon" className="group-hover:translate-x-1 transition-transform">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground"><path d="m9 18 6-6-6-6"/></svg>
                        </Button>
                      </div>
                    </div>

                    {game.odds && (
                      <div className="bg-muted/20 border-t border-border px-5 py-3 flex flex-wrap gap-6 text-sm font-mono items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground uppercase text-xs tracking-wider">ML</span>
                          <span>{formatMoneyline(game.odds.awayMoneyline)} / {formatMoneyline(game.odds.homeMoneyline)}</span>
                          {edgeBadge}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground uppercase text-xs tracking-wider">Spread</span>
                          <span>{game.odds.awaySpread > 0 ? `+${game.odds.awaySpread}` : game.odds.awaySpread} / {game.odds.homeSpread > 0 ? `+${game.odds.homeSpread}` : game.odds.homeSpread}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground uppercase text-xs tracking-wider">Total</span>
                          <span>O/U {game.odds.overUnder}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-12 border border-dashed border-border rounded-lg bg-card/50">
          <p className="text-muted-foreground font-mono">No games match your criteria.</p>
        </div>
      )}
    </div>
  );
}
