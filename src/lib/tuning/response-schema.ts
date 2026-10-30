import { z } from "zod";

import { ASK_PER_LIST } from "./limits";
import { askFor, MAX_COUNT, schemaCapFor } from "./v2/count";

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
 * Suggested changes v2's reply shape (spec 2026-10-27 §5.2, §5.3). The run's typed words are the REQUEST in v2, cited
 * as `request`; the v10 schema above keeps `notes` unchanged.
 */
export const citationSchemaV2 = z.object({
  kind: z.enum(["games", "note", "decklist", "intent", "mix", "request", "focus"]),
  value: z.string().min(1).max(160),
});

export const lineSchemaV2 = lineSchema.extend({ evidence: z.array(citationSchemaV2).min(1).max(4) });

/**
 * A v2 reply's line as the model is asked to write it: `lineSchemaV2` plus `n`, its 1-based number (prompt v14). A counting
 * aid only. The cut call sometimes closed its array early, far under the token cap (4 of 30 asked, at 446 output tokens), and
 * numbering each line keeps the count in front of the model ("Number the lines 1 to {ask}"). It is REQUIRED here so the
 * structured-output format makes the model write it, and unbounded, so no value can fail the whole-reply parse. Its value is
 * never read: the engine parses each streamed line with `lineSchemaV2`, which strips `n`, so a line is never dropped for a
 * missing or wrong number, and positions come from arrival order as before.
 */
// `n` comes FIRST: structured output writes properties in schema order, so the model commits to the number before the line.
export const replyLineSchemaV2 = z.object({ n: z.number().int() }).extend(lineSchemaV2.shape);

/**
 * One list of a v2 reply, and the SAME schema for every call of a run: additions, cuts and both refills (§5.1). The
 * structured-output format is part of Anthropic's prompt-cache key, so a schema that varied by call (a per-list key, a
 * per-ask cap) meant the cut call and the refills never read the prefix the additions call cached (measured: 4,713 cached
 * tokens read with the same schema, none with the cut call's). So the key is neutral, `lines` (the step's text says
 * whether they are cards to add or to cut; the side comes from the stage, never the key), and the cap is fixed at the
 * largest any call asks: twice N=20's ask (`schemaCapFor(askFor(MAX_COUNT))`, 60). The cap stays LOOSE because a strict
 * one rejected the whole reply for one card too many (6 of 20 misses in the count-mechanism eval); the engine keeps the
 * first ask-many valid lines of each call (`caps`, `overAsk`).
 */
export const suggestedChangesV2ReplySchema = z.object({
  lines: z.array(replyLineSchemaV2).max(schemaCapFor(askFor(MAX_COUNT))),
});

export type SuggestedChangesV2Reply = z.infer<typeof suggestedChangesV2ReplySchema>;
/** One card the model named, to add or to cut: either contract's line (v2 cites `request` where v10 cites `notes`). */
export type TuningLine = Omit<z.infer<typeof lineSchema>, "evidence"> & {
  evidence: (z.infer<typeof citationSchema> | z.infer<typeof citationSchemaV2>)[];
};
