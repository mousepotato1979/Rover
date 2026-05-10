import React, { useState, useMemo } from "react";
import { Link } from "wouter";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, TrendingUp, Star } from "lucide-react";

const SPORTS = ["All Sports", "NFL", "NBA", "MLB", "NHL", "Soccer"];
const SORT_OPTIONS = [
  { value: "edge", label: "Edge %" },
  { value: "confidence", label: "Confidence" },
  { value: "units", label: "Units" },
];

function TierStars({ tier }: { tier: string | null }) {
  if (!tier) return null;
  const map: Record<string, { count: number; color: string }> = {
    low: { count: 1, color: "text-yellow-500" },
    medium: { count: 2, color: "text-yellow-400" },
    high: { count: 3, color: "text-primary" },
    elite: { count: 5, color: "text-primary" },
  };
  const t = map[tier] ?? map.medium;
  return (
    <span className={`flex items-center gap-0.5 ${t.color}`}>
      {Array.from({ length: t.count }).map((_, i) => <Star key={i} className="h-3 w-3 fill-current" />)}
    </span>
  );
}

function SharpDot({ move }: { move: string | null }) {
  if (move === "sharp_reverse") return <span className="inline-block w-2 h-2 rounded-full bg-orange-400" title="Sharp Reverse" />;
  if (move === "sharp_confirmed") return <span className="inline-block w-2 h-2 rounded-full bg-green-400" title="Sharp Confirmed" />;
  return null;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="font-mono text-muted-foreground text-sm">#{rank}</span>;
}

export default function Leaderboard() {
  const { data: leaderboard, isLoading } = useGetLeaderboard();
  const [sportFilter, setSportFilter] = useState("All Sports");
  const [sortBy, setSortBy] = useState("edge");

  const filtered = useMemo(() => {
    if (!leaderboard) return [];
    let data = [...leaderboard];
    if (sportFilter !== "All Sports") {
      data = data.filter(e => e.sport === sportFilter);
    }
    data.sort((a, b) => {
      if (sortBy === "edge") return (b.edge ?? 0) - (a.edge ?? 0);
      if (sortBy === "confidence") return b.confidencePct - a.confidencePct;
      if (sortBy === "units") return (b.units ?? 0) - (a.units ?? 0);
      return 0;
    });
    return data.map((e, i) => ({ ...e, displayRank: i + 1 }));
  }, [leaderboard, sportFilter, sortBy]);

  const eliteCount = useMemo(() => leaderboard?.filter(e => e.confidenceTier === "elite").length ?? 0, [leaderboard]);
  const sharpCount = useMemo(() => leaderboard?.filter(e => e.sharpMove === "sharp_reverse" || e.sharpMove === "sharp_confirmed").length ?? 0, [leaderboard]);
  const edgeAvg = useMemo(() => {
    if (!leaderboard || leaderboard.length === 0) return 0;
    const edges = leaderboard.filter(e => e.edge != null).map(e => e.edge!);
    return edges.length > 0 ? Math.round((edges.reduce((a, b) => a + b, 0) / edges.length) * 10) / 10 : 0;
  }, [leaderboard]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Model Leaderboard</h1>
            <p className="text-muted-foreground text-sm font-mono uppercase tracking-widest mt-1">
              Predictions Ranked by Edge
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={sportFilter} onValueChange={setSportFilter}>
            <SelectTrigger className="w-[140px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPORTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <Star className="h-5 w-5 text-primary fill-primary" />
            <div>
              <div className="text-2xl font-bold font-mono text-primary">{eliteCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Elite Picks</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-orange-400" />
            <div>
              <div className="text-2xl font-bold font-mono text-orange-400">{sharpCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Sharp Signals</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-chart-2" />
            <div>
              <div className="text-2xl font-bold font-mono">{edgeAvg > 0 ? "+" : ""}{edgeAvg}%</div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Avg Edge</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filtered.length > 0 ? (
            <div className="w-full overflow-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase tracking-widest font-mono bg-muted/30 border-b border-border">
                  <tr>
                    <th className="px-5 py-4 font-medium w-14">Rank</th>
                    <th className="px-5 py-4 font-medium">Matchup</th>
                    <th className="px-5 py-4 font-medium">Pick</th>
                    <th className="px-5 py-4 font-medium text-right">Tier</th>
                    <th className="px-5 py-4 font-medium text-right">Edge</th>
                    <th className="px-5 py-4 font-medium text-right">Units</th>
                    <th className="px-5 py-4 font-medium text-right">Sharp</th>
                    <th className="px-5 py-4 font-medium text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((entry) => (
                    <tr
                      key={entry.rank}
                      className={`hover:bg-muted/10 transition-colors ${entry.displayRank <= 3 ? "bg-primary/3" : ""}`}
                    >
                      <td className="px-5 py-4">
                        <RankBadge rank={entry.displayRank} />
                      </td>
                      <td className="px-5 py-4">
                        <Link href={`/games/${entry.gameId}`} className="hover:text-primary transition-colors font-medium">
                          {entry.awayTeam} @ {entry.homeTeam}
                        </Link>
                        {entry.sport && (
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">{entry.sport}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-medium text-primary">{entry.predictedWinner}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <TierStars tier={entry.confidenceTier ?? null} />
                          <span className="text-xs text-muted-foreground font-mono">{entry.confidencePct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold">
                        {entry.edge != null ? (
                          <span className={entry.edge > 0 ? "text-primary" : "text-destructive"}>
                            {entry.edge > 0 ? "+" : ""}{entry.edge}%
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-4 text-right font-mono">
                        {entry.units != null ? `${entry.units}u` : "—"}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end">
                          <SharpDot move={entry.sharpMove ?? null} />
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {entry.result === "win" && <Badge className="bg-primary text-primary-foreground">Win</Badge>}
                        {entry.result === "loss" && <Badge variant="destructive">Loss</Badge>}
                        {entry.result === "push" && <Badge variant="secondary">Push</Badge>}
                        {(!entry.result || entry.result === "null") && <Badge variant="outline">Pending</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center p-12 text-muted-foreground font-mono">
              No predictions match this filter.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Sharp Confirmed</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Sharp Reverse (Fade Public)</span>
        <span className="flex items-center gap-1.5"><Star className="h-3 w-3 text-primary fill-primary" /> Elite Tier</span>
      </div>
    </div>
  );
}
