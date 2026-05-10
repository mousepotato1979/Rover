import { pgTable, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const oddsTable = pgTable("odds", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull().unique(),
  homeMoneyline: integer("home_moneyline").notNull(),
  awayMoneyline: integer("away_moneyline").notNull(),
  homeSpread: numeric("home_spread", { precision: 4, scale: 1 }).notNull(),
  awaySpread: numeric("away_spread", { precision: 4, scale: 1 }).notNull(),
  spreadJuice: integer("spread_juice").notNull().default(-110),
  overUnder: numeric("over_under", { precision: 4, scale: 1 }).notNull(),
  overJuice: integer("over_juice").notNull().default(-110),
  underJuice: integer("under_juice").notNull().default(-110),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOddsSchema = createInsertSchema(oddsTable).omit({ id: true, lastUpdated: true });
export type InsertOdds = z.infer<typeof insertOddsSchema>;
export type Odds = typeof oddsTable.$inferSelect;
