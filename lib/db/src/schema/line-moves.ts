import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const lineMovesTable = pgTable("line_moves", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  bookName: text("book_name").notNull(),
  homeMoneyline: integer("home_moneyline").notNull(),
  awayMoneyline: integer("away_moneyline").notNull(),
  homeSpread: numeric("home_spread", { precision: 4, scale: 1 }).notNull(),
  overUnder: numeric("over_under", { precision: 5, scale: 1 }).notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLineMoveSchema = createInsertSchema(lineMovesTable).omit({ id: true });
export type InsertLineMove = z.infer<typeof insertLineMoveSchema>;
export type LineMove = typeof lineMovesTable.$inferSelect;
