import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const predictionsTable = pgTable("predictions", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  predictedWinner: text("predicted_winner").notNull(),
  confidencePct: integer("confidence_pct").notNull(),
  analysis: text("analysis").notNull(),
  keyFactors: text("key_factors").array().notNull().default([]),
  sharpMove: text("sharp_move").notNull().default("neutral"),
  confidenceTier: text("confidence_tier").notNull().default("medium"),
  unitsRecommended: numeric("units_recommended", { precision: 3, scale: 1 }).notNull().default("1.0"),
  hitRateLast7: numeric("hit_rate_last7", { precision: 4, scale: 3 }),
  hitRateSeason: numeric("hit_rate_season", { precision: 4, scale: 3 }),
  sampleSize: integer("sample_size"),
  contrarianCheck: text("contrarian_check"),
  bestCase: text("best_case"),
  baseCase: text("base_case"),
  worstCase: text("worst_case"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPredictionSchema = createInsertSchema(predictionsTable).omit({ id: true, createdAt: true });
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Prediction = typeof predictionsTable.$inferSelect;
