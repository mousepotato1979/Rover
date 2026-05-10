import { pgTable, serial, integer, numeric, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bookOddsTable = pgTable("book_odds", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  bookName: text("book_name").notNull(),
  homeMoneyline: integer("home_moneyline").notNull(),
  awayMoneyline: integer("away_moneyline").notNull(),
  homeSpread: numeric("home_spread", { precision: 4, scale: 1 }).notNull(),
  awaySpread: numeric("away_spread", { precision: 4, scale: 1 }).notNull(),
  spreadJuice: integer("spread_juice").notNull().default(-110),
  overUnder: numeric("over_under", { precision: 4, scale: 1 }).notNull(),
  overJuice: integer("over_juice").notNull().default(-110),
  underJuice: integer("under_juice").notNull().default(-110),
  lastUpdated: timestamp("last_updated", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.gameId, t.bookName)]);

export const insertBookOddsSchema = createInsertSchema(bookOddsTable).omit({ id: true, lastUpdated: true });
export type InsertBookOdds = z.infer<typeof insertBookOddsSchema>;
export type BookOdds = typeof bookOddsTable.$inferSelect;
