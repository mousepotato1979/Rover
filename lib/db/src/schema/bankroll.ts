import { pgTable, serial, numeric, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bankrollTable = pgTable("bankroll", {
  id: serial("id").primaryKey(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("1000.00"),
  unitPct: numeric("unit_pct", { precision: 4, scale: 2 }).notNull().default("1.00"),
  streak: integer("streak").notNull().default(0),
  weekWins: integer("week_wins").notNull().default(0),
  weekLosses: integer("week_losses").notNull().default(0),
  weekPushes: integer("week_pushes").notNull().default(0),
  preferredBook: text("preferred_book"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBankrollSchema = createInsertSchema(bankrollTable).omit({ id: true, updatedAt: true });
export type InsertBankroll = z.infer<typeof insertBankrollSchema>;
export type Bankroll = typeof bankrollTable.$inferSelect;
