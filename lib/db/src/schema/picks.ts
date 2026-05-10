import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const picksTable = pgTable("picks", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  userPick: text("user_pick").notNull(),
  stake: numeric("stake", { precision: 10, scale: 2 }),
  units: numeric("units", { precision: 3, scale: 1 }),
  book: text("book"),
  result: text("result"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPickSchema = createInsertSchema(picksTable).omit({ id: true, createdAt: true });
export type InsertPick = z.infer<typeof insertPickSchema>;
export type Pick = typeof picksTable.$inferSelect;
