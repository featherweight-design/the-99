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
  kind: z.enum(["games", "note", "decklist", "intent", "mix", "notes", "focus"]),
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

/**
 * Suggested changes v2's reply shape (spec 2026-10-27 §5.2, §5.3). The ask scales with the player's count, so the
 * schema is built per run: each list's cap is LOOSE, twice the ask (`schemaCapFor`), because a strict cap rejected the
 * whole reply for one card too many (6 of 20 misses in the count-mechanism eval). The app keeps the first ask-many valid
 * lines. The run's typed words are the REQUEST in v2, cited as `request`; the v10 schema above keeps `notes` unchanged.
 */
export const citationSchemaV2 = z.object({
  kind: z.enum(["games", "note", "decklist", "intent", "mix", "request", "focus"]),
  value: z.string().min(1).max(160),
});

const lineSchemaV2 = lineSchema.extend({ evidence: z.array(citationSchemaV2).min(1).max(4) });

/** One list of a v2 reply: the two-call flow asks for additions and cuts in separate calls (§5.1). */
export function suggestedChangesV2Schema<L extends "additions" | "cuts">(cap: number, list: L) {
  return z.object({ [list]: z.array(lineSchemaV2).max(cap) } as { [K in L]: z.ZodArray<typeof lineSchemaV2> });
}
/** One card the model named, to add or to cut: either contract's line (v2 cites `request` where v10 cites `notes`). */
export type TuningLine = Omit<z.infer<typeof lineSchema>, "evidence"> & {
  evidence: (z.infer<typeof citationSchema> | z.infer<typeof citationSchemaV2>)[];
};
