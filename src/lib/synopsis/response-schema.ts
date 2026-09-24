import { z } from "zod";

import { CATEGORIES } from "./types";

/**
 * The shape a synopsis reply must have. Handed to the client as the structured-output format, so
 * the API constrains the reply to it. SHAPE ONLY, and deliberately loose about counts and
 * lengths: a count or a budget the reply misses is a REFUSED section with a reason the player is
 * shown (`validate.ts`), where a schema failure would be a malformed reply retried out of sight.
 * The string caps here are far above every budget and exist only to bound a runaway reply.
 */
const text = z.string().max(2_000);

export const synopsisResponseSchema = z.object({
  overview: text,
  primer: z.object({
    strategy: z.array(text).max(12),
    mulligan: z.object({
      keep: z.array(text).max(8),
      sendBack: z.array(text).max(8),
    }),
    tips: z.array(z.object({
      cards: z.array(z.string().max(200)).max(8),
      text,
    })).max(8),
  }),
  keyCards: z.array(z.object({
    card: z.string().max(200),
    claims: z.array(z.enum(CATEGORIES)).max(CATEGORIES.length),
    job: text,
  })).max(16),
  weaknesses: z.array(text).max(8),
});

export type SynopsisResponse = z.infer<typeof synopsisResponseSchema>;
