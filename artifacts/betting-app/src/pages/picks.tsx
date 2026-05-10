import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { useListPicks, useSettlePicks, getListPicksQueryKey, useListPredictions, useGetStatsSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { calcEdge } from "@/lib/utils";
import { CheckCircle2, RefreshCw } from "lucide-react";

function SportBreakdown({ picks, predictions }: { picks: any[]; predictions: any[] }) {
  const predMap = useMemo(() => new Map(predictions.map(p => [p.gameId, p])), [predictions]);

  const byLeague = useMemo(() => {
    const map: Record<string, { wins: number; losses: number; pushes: number; units: number }> = {};
    picks.forEach(p => {
      const key = "Picks"; // fallback since picks don't carry league
      if (!map[key]) map[key] = { wins: 0, losses: 0, pushes: 0, units: 0 };
      if (p.result === "win") { map[key].wins++; map[key].units += Number(p.units) || 1; }
      else if (p.result === "loss") { map[key].losses++; map[key].units -= Number(p.units) || 1; }
      else if (p.result === "push") map[key].pushes++;
    });
    return map;
  }, [picks]);

  if (picks.length === 0) return null;

  const decided = picks.filter(p => p.result === "win" || p.result === "loss").length;
  const wins = picks.filter(p => p.result === "win").length;
  const losses = picks.filter(p => p.result === "loss").length;
  const unitPnl = picks.reduce((acc, p) => {
    if (p.result === "win") return acc + (Number(p.units) || 1);
    if (p.result === "loss") return acc - (Number(p.units) || 1);
    return acc;
  }, 0);
  const winRate = decided > 0 ? ((wins / decided) * 100).toFixed(1) : "—";

  return (
    <Card className="bg-card border-border">
      <CardHeader className="border-b border-border/50 bg-card/50 pb-3 pt-4 px-5">
        <CardTitle className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Performance Summary</CardTitle>
      </CardHeader>
      <CardContent className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">Record</div>
          <div className="text-xl font-bold font-mono">{wins}W–{losses}L{picks.filter(p => p.result === "push").length > 0 ? `–${picks.filter(p => p.result === "push").length}P` : ""}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">Win Rate</div>
          <div className={`text-xl font-bold font-mono ${Number(winRate) >= 55 ? "text-primary" : Number(winRate) < 45 ? "text-destructive" : ""}`}>{winRate}{winRate !== "—" ? "%" : ""}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">Unit P&L</div>
          <div className={`text-xl font-bold font-mono ${unitPnl > 0 ? "text-primary" : unitPnl < 0 ? "text-destructive" : ""}`}>
            {unitPnl > 0 ? "+" : ""}{unitPnl.toFixed(1)}u
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">Pending</div>
          <div className="text-xl font-bold font-mono">{picks.filter(p => !p.result).length}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function PnlChart({ picks }: { picks: any[] }) {
  const chartData = useMemo(() => {
    let running = 0;
    const resolved = picks
      .filter(p => p.result === "win" || p.result === "loss" || p.result === "push")
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (resolved.length === 0) return [];
    const points: { date: string; units: number; pick?: string; result?: string }[] = [{ date: "Start", units: 0 }];
    resolved.forEach(p => {
      if (p.result === "win") running += Number(p.units) || 1;
      else if (p.result === "loss") running -= Number(p.units) || 1;
      points.push({
        date: format(new Date(p.createdAt), "MMM d"),
        units: Math.round(running * 100) / 100,
        pick: p.userPick,
        result: p.result ?? undefined,
      });
    });
    return points;
  }, [picks]);

  if (chartData.length < 2) return null;

  const max = Math.max(...chartData.map(d => d.units), 1);
  const min = Math.min(...chartData.map(d => d.units), -1);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="border-b border-border/50 bg-card/50 pb-3 pt-4 px-5">
        <CardTitle className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Unit P&L Curve</CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-4">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} domain={[min - 0.5, max + 0.5]} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
              formatter={(v: any) => [`${v > 0 ? "+" : ""}${v}u`, "P&L"]}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 2" />
            <Area
              type="monotone"
              dataKey="units"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#pnlGradient)"
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                if (!payload.result) return <g key={props.key} />;
                const color = payload.result === "win" ? "hsl(var(--primary))" : payload.result === "loss" ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))";
                return <circle key={props.key} cx={cx} cy={cy} r={4} fill={color} stroke="hsl(var(--background))" strokeWidth={2} />;
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export default function Picks() {
  const { data: picks, isLoading } = useListPicks();
  const { data: predictions } = useListPredictions();
  const { data: stats } = useGetStatsSummary();
  const settlePicks = useSettlePicks();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "pending" | "win" | "loss">("all");

  const handleSettle = () => {
    settlePicks.mutate(undefined, {
      onSuccess: (data) => {
        const n = data.settled;
        toast({ title: n > 0 ? `Settled ${n} pick${n > 1 ? "s" : ""}` : "Nothing to settle", description: n > 0 ? "Results updated from game scores." : "No finished games with pending picks." });
        queryClient.invalidateQueries({ queryKey: getListPicksQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to settle picks", variant: "destructive" });
      },
    });
  };

  const filteredPicks = useMemo(() => {
    if (!picks) return [];
    if (filter === "all") return picks.slice().reverse();
    if (filter === "pending") return picks.filter(p => !p.result).slice().reverse();
    return picks.filter(p => p.result === filter).slice().reverse();
  }, [picks, filter]);

  const clvStats = useMemo(() => {
    if (!picks) return { wins: 0, losses: 0, units: 0 };
    let units = 0, wins = 0, losses = 0;
    picks.forEach(p => {
      if (p.result === "win") { units += Number(p.units) || 1; wins++; }
      else if (p.result === "loss") { units -= Number(p.units) || 1; losses++; }
    });
    return { wins, losses, units: Math.round(units * 100) / 100 };
  }, [picks]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Picks</h1>
          <p className="text-muted-foreground text-sm font-mono uppercase tracking-widest mt-1">Performance Tracking</p>
        </div>
        <div className="flex items-center gap-3">
          {picks && picks.filter(p => !p.result).length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs tracking-widest uppercase gap-2"
              onClick={handleSettle}
              disabled={settlePicks.isPending}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${settlePicks.isPending ? "animate-spin" : ""}`} />
              {settlePicks.isPending ? "Settling..." : "Settle Picks"}
            </Button>
          )}
          {picks && picks.length > 0 && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground font-mono uppercase tracking-widest mb-1">CLV Check</div>
              <div className="flex gap-3 items-center">
                <span className="font-mono text-sm">{clvStats.wins}W–{clvStats.losses}L</span>
                <Badge variant="secondary" className={clvStats.units > 0 ? "text-primary bg-primary/10" : clvStats.units < 0 ? "text-destructive bg-destructive/10" : "text-muted-foreground bg-muted/10"}>
                  {clvStats.units > 0 ? "+" : ""}{clvStats.units.toFixed(2)}u
                </Badge>
              </div>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full bg-card" />)}</div>
      ) : picks && picks.length > 0 ? (
        <>
          <SportBreakdown picks={picks} predictions={predictions ?? []} />
          <PnlChart picks={picks} />

          <div className="flex gap-2">
            {(["all", "pending", "win", "loss"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-mono uppercase tracking-widest rounded-md border transition-colors ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/50"}`}
              >
                {f === "all" ? `All (${picks.length})` : f === "pending" ? `Pending (${picks.filter(p => !p.result).length})` : f === "win" ? `Wins (${picks.filter(p => p.result === "win").length})` : `Losses (${picks.filter(p => p.result === "loss").length})`}
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            {filteredPicks.map((pick) => {
              const pred = predictions?.find(p => p.gameId === pick.gameId);
              return (
                <Card key={pick.id} className={`bg-card border-border transition-colors ${pick.result === "win" ? "hover:border-primary/30" : pick.result === "loss" ? "hover:border-destructive/30" : "hover:border-border"}`}>
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground font-mono">
                          {format(new Date(pick.createdAt), "MMM d, yyyy")}
                        </span>
                        {pred && (
                          <span className="text-xs font-mono text-muted-foreground">
                            · {pred.confidenceTier.toUpperCase()} · {pred.unitsRecommended}u
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-medium">{pick.awayTeam} @ {pick.homeTeam}</div>
                    </div>
                    <div className="flex items-center gap-6 md:gap-8">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase tracking-widest font-mono mb-1">Your Pick</div>
                        <div className="font-bold flex items-center justify-end gap-2">
                          {pick.userPick}
                          <span className="text-xs text-muted-foreground font-mono">{pick.units || 1}u</span>
                          {pick.book && <Badge variant="outline" className="text-[10px] uppercase py-0">{pick.book}</Badge>}
                        </div>
                      </div>
                      <div className="w-24 text-right">
                        {pick.result === "win" && <Badge className="bg-primary text-primary-foreground uppercase tracking-widest text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" />Win</Badge>}
                        {pick.result === "loss" && <Badge variant="destructive" className="uppercase tracking-widest text-[10px]">Loss</Badge>}
                        {pick.result === "push" && <Badge variant="secondary" className="uppercase tracking-widest text-[10px]">Push</Badge>}
                        {!pick.result && <Badge variant="outline" className="uppercase tracking-widest text-[10px]">Pending</Badge>}
                      </div>
                      <Link href={`/games/${pick.gameId}`} className="text-muted-foreground hover:text-primary transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center p-12 border border-dashed border-border rounded-lg bg-card/50">
          <p className="text-muted-foreground font-mono mb-4">No picks placed yet.</p>
          <Link href="/games" className="text-primary hover:underline">Browse Games to find an edge</Link>
        </div>
      )}
    </div>
  );
}
