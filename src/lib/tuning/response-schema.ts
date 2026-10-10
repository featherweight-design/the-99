import { z } from "zod";

import { ASK_PER_LIST } from "./limits";

/**
 * The shape a model reply must have. Handed to the client as the structured-output format, so
 * the API constrains the reply to it; parsed again client-side by the SDK. SHAPE ONLY — whether
 * the cards exist, the cut is in the deck and the evidence is real is `validate.ts`'s job.
 *
 * TWO LISTS (sub-project 8, Hugh's ruling (b), 2026-10-09; Design's B10): `additions` are cards to
 * put in, `cuts` are cards to take out, and each card carries its OWN rationale and citations.
 * There is no pairing, so the deck count can move; the panel's tally says by how much. An empty
 * list is legal — zero suggestions is an honest answer, and none at all becomes the `ungrounded`
 * outcome, not a schema failure.
 */
export const citationSchema = z.object({
  kind: z.enum(["games", "note", "decklist", "intent", "mix", "notes"]),
  value: z.string().min(1).max(160),
});

export const lineSchema = z.object({
  card: z.string().min(1).max(200),
  rationale: z.string().min(1).max(400),
  /** What the phone card draws instead of truncating the full rationale. */
  rationaleShort: z.string().min(1).max(80),
  evidence: z.array(citationSchema).min(1).max(4),
});

export const tuningResponseSchema = z.object({
  additions: z.array(lineSchema).max(ASK_PER_LIST),
  cuts: z.array(lineSchema).max(ASK_PER_LIST),
});

export type TuningResponse = z.infer<typeof tuningResponseSchema>;
/** One card the model named, to add or to cut. */
export type TuningLine = z.infer<typeof lineSchema>;
