import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Games from "@/pages/games";
import GameDetail from "@/pages/game-detail";
import Picks from "@/pages/picks";
import Leaderboard from "@/pages/leaderboard";
import NotFound from "@/pages/not-found";
import Bankroll from "@/pages/bankroll";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/games" component={Games} />
        <Route path="/games/:id" component={GameDetail} />
        <Route path="/picks" component={Picks} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/bankroll" component={Bankroll} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
