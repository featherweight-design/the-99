import { z } from "zod";

import { ASK_SUGGESTIONS } from "./limits";

/**
 * The shape a model reply must have. Handed to the client as the structured-output format, so
 * the API constrains the reply to it; parsed again client-side by the SDK. SHAPE ONLY — whether
 * the cards exist, the cut is in the deck and the evidence is real is `validate.ts`'s job.
 *
 * `cut` is required: every suggestion is exactly one cut and one add, and the deck count never
 * changes (`suggestionRules.onePair`). An empty list is legal — zero suggestions is an honest
 * answer that becomes the `ungrounded` outcome, not a schema failure.
 */
export const citationSchema = z.object({
  kind: z.enum(["games", "note", "decklist", "intent", "mix", "notes"]),
  value: z.string().min(1).max(160),
});

export const suggestionSchema = z.object({
  add: z.string().min(1).max(200),
  cut: z.string().min(1).max(200),
  rationale: z.string().min(1).max(400),
  /** What the phone card draws instead of truncating the full rationale. */
  rationaleShort: z.string().min(1).max(80),
  evidence: z.array(citationSchema).min(1).max(4),
});

export const tuningResponseSchema = z.object({
  suggestions: z.array(suggestionSchema).max(ASK_SUGGESTIONS),
});

export type TuningResponse = z.infer<typeof tuningResponseSchema>;
export type TuningSuggestion = z.infer<typeof suggestionSchema>;
