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

function v8Schema<T extends z.ZodType<string>, U extends z.ZodType<string>, W extends z.ZodType<string>>(topic: T, verdict: U, tier: W) {
  return z.object({
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
      topic,
      verdict,
      tier: tier.optional(),
      line: text.optional(),
      evidence,
    })).max(14),
  });
}

/** The reply with its closed words as enums: what the validator works on. */
export const synopsisResponseSchemaV8 = v8Schema(z.enum(ASSESSMENT_TOPICS), z.enum(ASSESSMENT_VERDICTS), z.enum(WEAKNESS_TIERS));

/**
 * What the model is held to on the wire. The SDK turns an enum into a description, not a
 * constraint, so the server never enforced `verdict`; and a strict enum here turned a reply with
 * one stray word ("none", "n/a") into a MALFORMED reply, retried and billed twice, on 3 of the
 * first 9 corpus answers. The words are read in code (`normalizeV8`): an unreadable verdict is
 * `unknown` (silence), an unreadable tier or topic leaves the checklist incomplete.
 */
export const synopsisResponseSchemaV8Wire = v8Schema(z.string().max(60), z.string().max(60), z.string().max(60));

export type SynopsisResponseV8 = z.infer<typeof synopsisResponseSchemaV8>;
/** A contract-8 reply as it comes off the wire, before its closed words are read. */
export type SynopsisReplyV8Wire = z.infer<typeof synopsisResponseSchemaV8Wire>;

/** What a model call returns under either contract. */
export type SynopsisReply = SynopsisResponse | SynopsisReplyV8Wire;
