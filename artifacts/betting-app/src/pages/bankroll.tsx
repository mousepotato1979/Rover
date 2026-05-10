import React, { useState, useEffect } from "react";
import { useGetBankroll, useUpdateBankroll, getGetBankrollQueryKey, useGetBankrollHistory } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, TrendingUp, TrendingDown, Terminal } from "lucide-react";
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
import { format } from "date-fns";

function EquityCurve({ history }: { history: Array<{ date: string; amount: number; pnl: number; note: string }> }) {
  const data = history.map(h => ({
    date: format(new Date(h.date), "MMM d"),
    amount: h.amount,
    pnl: h.pnl,
    note: h.note,
  }));

  const min = Math.min(...data.map(d => d.amount));
  const max = Math.max(...data.map(d => d.amount));
  const startAmount = data[0]?.amount ?? 1000;
  const endAmount = data[data.length - 1]?.amount ?? 1000;
  const totalPnl = endAmount - startAmount;
  const totalPct = startAmount > 0 ? ((totalPnl / startAmount) * 100).toFixed(1) : "0.0";
  const isUp = totalPnl >= 0;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="border-b border-border/50 bg-card/50">
        <CardTitle className="flex items-center justify-between text-lg uppercase font-mono tracking-widest">
          <span>Equity Curve</span>
          <div className="flex items-center gap-3">
            <span className={`text-base font-bold ${isUp ? "text-primary" : "text-destructive"}`}>
              {isUp ? "+" : ""}${totalPnl.toFixed(0)} ({isUp ? "+" : ""}{totalPct}%)
            </span>
            {isUp ? <TrendingUp className="h-4 w-4 text-primary" /> : <TrendingDown className="h-4 w-4 text-destructive" />}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-5 pt-4">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isUp ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stopOpacity={0.25} />
                <stop offset="95%" stopColor={isUp ? "hsl(var(--primary))" : "hsl(var(--destructive))"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              domain={[min * 0.98, max * 1.02]}
              tickFormatter={(v) => `$${v.toLocaleString()}`}
              width={70}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              formatter={(v: any, name: string) => [`$${Number(v).toLocaleString()}`, "Bankroll"]}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
            />
            <ReferenceLine y={startAmount} stroke="hsl(var(--border))" strokeDasharray="4 2" />
            <Area
              type="monotone"
              dataKey="amount"
              stroke={isUp ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
              strokeWidth={2}
              fill="url(#equityGrad)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border text-xs font-mono">
          <div>
            <div className="text-muted-foreground uppercase tracking-widest mb-1">Starting</div>
            <div className="font-bold">${startAmount.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground uppercase tracking-widest mb-1">Current</div>
            <div className={`font-bold ${isUp ? "text-primary" : "text-destructive"}`}>${endAmount.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground uppercase tracking-widest mb-1">Total P&L</div>
            <div className={`font-bold ${isUp ? "text-primary" : "text-destructive"}`}>{isUp ? "+" : ""}${totalPnl.toFixed(0)} ({isUp ? "+" : ""}{totalPct}%)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Bankroll() {
  const { data: bankroll, isLoading } = useGetBankroll();
  const { data: history } = useGetBankrollHistory();
  const updateBankroll = useUpdateBankroll();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<string>("");
  const [unitPct, setUnitPct] = useState<string>("");
  const [preferredBook, setPreferredBook] = useState<string>("DraftKings");

  useEffect(() => {
    if (bankroll) {
      setAmount(bankroll.amount.toString());
      setUnitPct(bankroll.unitPct.toString());
      if (bankroll.preferredBook) setPreferredBook(bankroll.preferredBook);
    }
  }, [bankroll]);

  const handleSave = () => {
    updateBankroll.mutate({
      data: { amount: Number(amount), unitPct: Number(unitPct), preferredBook }
    }, {
      onSuccess: () => {
        toast({ title: "Bankroll updated", description: "Rover has logged the new parameters." });
        queryClient.invalidateQueries({ queryKey: getGetBankrollQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to update bankroll", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64 bg-card" />
        <Skeleton className="h-64 w-full bg-card" />
      </div>
    );
  }

  if (!bankroll) return <div>Failed to load bankroll status</div>;

  const isCutActive = bankroll.streak <= -3;
  const isHotStreak = bankroll.streak >= 5;
  const effectiveUnitSize = bankroll.unitSize * bankroll.unitMultiplier;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Terminal className="h-6 w-6 text-primary" />
          BANKROLL MANAGER
        </h1>
        <p className="text-muted-foreground text-sm font-mono uppercase tracking-widest text-primary">
          ROVER BANKROLL CONTROL
        </p>
      </div>

      {isCutActive && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-6 py-4 rounded-lg flex items-start gap-4">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <div>
            <div className="font-bold font-mono tracking-widest">UNIT CUT ACTIVE — 50% SIZE</div>
            <div className="text-sm mt-1">3+ loss streak detected. Sizing reduced until 2 consecutive wins. Protect the bankroll.</div>
          </div>
        </div>
      )}

      {isHotStreak && (
        <div className="bg-primary/10 border border-primary text-primary px-6 py-4 rounded-lg flex items-start gap-4">
          <TrendingUp className="h-6 w-6 shrink-0" />
          <div>
            <div className="font-bold font-mono tracking-widest">HOT STREAK — {bankroll.streak} IN A ROW</div>
            <div className="text-sm mt-1">Models are firing. Maintain standard sizing — don't deviate from your system.</div>
          </div>
        </div>
      )}

      {history && history.length > 1 && (
        <EquityCurve history={history} />
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border/50 bg-card/50">
            <CardTitle className="text-lg tracking-widest uppercase font-mono">Status</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div>
              <div className="text-sm text-muted-foreground font-mono tracking-widest uppercase mb-1">Total Bankroll</div>
              <div className="text-5xl font-black tracking-tighter">${bankroll.amount.toLocaleString()}</div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/20 p-4 rounded-lg border border-border">
                <div className="text-xs text-muted-foreground font-mono tracking-widest uppercase mb-1">1 Unit</div>
                <div className="text-2xl font-bold">${effectiveUnitSize.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {bankroll.unitPct}% of total
                  {isCutActive && <span className="text-destructive ml-1">(50% cut)</span>}
                </div>
              </div>
              <div className="bg-muted/20 p-4 rounded-lg border border-border">
                <div className="text-xs text-muted-foreground font-mono tracking-widest uppercase mb-1">Current Streak</div>
                <div className={`text-2xl font-bold flex items-center gap-2 ${bankroll.streak > 0 ? "text-primary" : bankroll.streak < 0 ? "text-destructive" : "text-foreground"}`}>
                  {bankroll.streak > 0 ? <TrendingUp className="h-5 w-5" /> : bankroll.streak < 0 ? <TrendingDown className="h-5 w-5" /> : null}
                  {Math.abs(bankroll.streak)} {bankroll.streak >= 0 ? "W" : "L"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground font-mono tracking-widest uppercase mb-1">Week Record</div>
                <div className="text-xl font-bold">{bankroll.weekWins}-{bankroll.weekLosses}-{bankroll.weekPushes}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-mono tracking-widest uppercase mb-1">Daily Exposure</div>
                <div className={`text-xl font-bold ${bankroll.dailyExposurePct > 10 ? "text-destructive" : bankroll.dailyExposurePct >= 5 ? "text-yellow-500" : "text-primary"}`}>
                  {bankroll.dailyExposurePct.toFixed(1)}%
                  <span className="text-xs text-muted-foreground ml-2">/ 10% max</span>
                </div>
              </div>
            </div>

            <div className="bg-muted/10 border border-border rounded-lg p-4 font-mono text-sm space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Sizing Guide (Today)</div>
              {[1, 1.5, 2, 2.5, 3].map(u => (
                <div key={u} className="flex justify-between">
                  <span className="text-muted-foreground">{u}u pick</span>
                  <span className="font-bold">${(effectiveUnitSize * u).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border/50 bg-card/50">
              <CardTitle className="text-lg tracking-widest uppercase font-mono">Parameters</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Total Bankroll ($)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Size (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={unitPct}
                  onChange={(e) => setUnitPct(e.target.value)}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label>Preferred Book</Label>
                <Select value={preferredBook} onValueChange={setPreferredBook}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DraftKings">DraftKings</SelectItem>
                    <SelectItem value="FanDuel">FanDuel</SelectItem>
                    <SelectItem value="BetMGM">BetMGM</SelectItem>
                    <SelectItem value="Underdog">Underdog</SelectItem>
                    <SelectItem value="PrizePicks">PrizePicks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full font-bold tracking-widest uppercase mt-4"
                onClick={handleSave}
                disabled={updateBankroll.isPending}
              >
                {updateBankroll.isPending ? "Syncing..." : "Update Rover Params"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-black border-border overflow-hidden">
            <CardHeader className="border-b border-border/50 bg-muted/10">
              <CardTitle className="text-sm tracking-widest uppercase font-mono text-primary flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Rover Iron Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 font-mono text-sm text-primary/80 leading-loose">
              MINIMUM 5% EDGE — NO EXCEPTIONS<br />
              MAX 5% BANKROLL PER SINGLE BET<br />
              MAX 10% BANKROLL DAILY EXPOSURE<br />
              MAX 5 PICKS PER DAY — QUALITY BEATS VOLUME<br />
              3+ LOSS STREAK → 50% UNIT CUT UNTIL 2 WINS<br />
              DOWN 20% IN A WEEK → FULL STOP<br />
              ALWAYS BET BEST LINE — SHOP ALL BOOKS
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
