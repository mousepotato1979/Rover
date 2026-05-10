import { pgTable, serial, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bankrollHistoryTable = pgTable("bankroll_history", {
  id: serial("id").primaryKey(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  pnl: numeric("pnl", { precision: 8, scale: 2 }).notNull().default("0.00"),
  note: text("note").notNull().default(""),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBankrollHistorySchema = createInsertSchema(bankrollHistoryTable).omit({ id: true });
export type InsertBankrollHistory = z.infer<typeof insertBankrollHistorySchema>;
export type BankrollHistory = typeof bankrollHistoryTable.$inferSelect;
