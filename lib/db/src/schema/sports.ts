import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sportsTable = pgTable("sports", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").notNull(),
});

export const insertSportSchema = createInsertSchema(sportsTable).omit({ id: true });
export type InsertSport = z.infer<typeof insertSportSchema>;
export type Sport = typeof sportsTable.$inferSelect;
