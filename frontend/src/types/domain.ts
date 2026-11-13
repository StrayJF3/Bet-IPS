import { z } from 'zod';

/** Esquemas de las respuestas de la API. Lo que no cumpla se rechaza. */

const pct = z.number().min(0).max(1);

export const teamSchema = z.object({
  id: z.string().regex(/^[a-z-]{2,30}$/),
  name: z.string().min(1).max(60),
  flag: z.string().regex(/^[a-z]{2}(-[a-z]{3})?$/),
  confederation: z.enum(['AFC', 'CAF', 'CONCACAF', 'CONMEBOL', 'OFC', 'UEFA']),
  host: z.boolean(),
  fifa_rank: z.number().int().min(1).max(250),
  fifa_points: z.number(),
  form: z.array(z.enum(['V', 'E', 'D'])).max(10),
  form_points: z.number(),
});
export const teamListSchema = z.array(teamSchema).max(64);
export type Team = z.infer<typeof teamSchema>;

export const predictionSchema = z.object({
  team_a: z.string(),
  team_b: z.string(),
  probabilities: z.object({ win: pct, draw: pct, loss: pct }),
  venue: z.enum(['neutral', 'local', 'visitante']),
  model_version: z.string().max(40),
});
export type Prediction = z.infer<typeof predictionSchema>;

export const modelInfoSchema = z.object({
  version: z.string().max(40),
  algorithm: z.string().max(120),
  features: z.array(z.string().max(40)).max(30),
  trained_at: z.string().max(40),
  data_until: z.string().max(20),
  metrics: z.object({
    accuracy: pct,
    precision: pct,
    recall: pct,
    f1_macro: pct,
    baseline_accuracy: pct,
    hits: z.number().int(),
    train_matches: z.number().int(),
    final_train_matches: z.number().int(),
    test_matches: z.number().int(),
    test_set: z.string().max(60),
  }),
});
export type ModelInfo = z.infer<typeof modelInfoSchema>;
