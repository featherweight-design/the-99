import { z } from "zod";

import { deckCutsCopy } from "../copy/deck-cuts";
import { ROLE_ORDER } from "../decks/mix";

/**
 * The shape a Proposed cuts reply must have, handed to the client as the structured-output format.
 * SHAPE ONLY: whether the card is in the deck and the cited figure is true is `cuts-validate.ts`.
 * Built per call because the array bound is `over`, which differs per deck.
 */
export const citeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("inclusion"), pct: z.number() }),
  z.object({ kind: z.literal("offList") }),
  z.object({ kind: z.literal("role"), role: z.enum(ROLE_ORDER as [string, ...string[]]), have: z.number(), target: z.number() }),
  z.object({ kind: z.literal("curve"), cmc: z.number(), have: z.number() }),
  z.object({ kind: z.literal("flag"), flag: z.enum(["gameChanger", "massLandDenial", "extraTurn", "combo"]) }),
  z.object({ kind: z.literal("intent") }),
]);

export const cutSchema = z.object({
  name: z.string().min(1).max(200),
  reason: z.string().min(1).max(deckCutsCopy.reasonMaxLength),
  cites: z.array(citeSchema).min(1).max(4),
});

export function cutsResponseSchema(over: number) {
  return z.object({ cuts: z.array(cutSchema).min(1).max(Math.max(1, over)) });
}

export type CutsResponse = z.infer<ReturnType<typeof cutsResponseSchema>>;
export type CutProposal = z.infer<typeof cutSchema>;
export type CutCite = z.infer<typeof citeSchema>;
