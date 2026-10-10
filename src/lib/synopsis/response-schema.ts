import { z } from "zod";

import { ASSESSMENT_TOPICS, ASSESSMENT_VERDICTS, CATEGORIES, WEAKNESS_TIERS } from "./types";

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

/**
 * The contract-8 reply (plan section 3). Same discipline: shape only, counts and budgets are the
 * validator's. `evidence` is deck-local refs (`c12`, `refOf`), resolved to oracle ids by the
 * validator. There is no `weaknesses` list: the model fills the checklist (`assessment`) and the
 * rendered weaknesses are chosen from it in code.
 */
const evidence = z.array(z.string().max(16)).max(12);
const claimed = z.object({ text, evidence });

export const synopsisResponseSchemaV8 = z.object({
  overview: text,
  primer: z.object({
    strategy: z.array(claimed).max(12),
    mulligan: z.object({
      keep: z.array(claimed).max(8),
      sendBack: z.array(claimed).max(8),
    }),
    tips: z.array(claimed).max(8),
  }),
  keyCards: z.array(z.object({
    card: z.string().max(200),
    claims: z.array(z.enum(CATEGORIES)).max(CATEGORIES.length),
    job: text,
    evidence,
  })).max(16),
  assessment: z.array(z.object({
    topic: z.enum(ASSESSMENT_TOPICS),
    verdict: z.enum(ASSESSMENT_VERDICTS),
    tier: z.enum(WEAKNESS_TIERS).optional(),
    line: text.optional(),
    evidence,
  })).max(14),
});

export type SynopsisResponseV8 = z.infer<typeof synopsisResponseSchemaV8>;
