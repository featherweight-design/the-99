/**
 * WHICH CARDS A BULK SELECTION TICKS — one definition, for both callers.
 *
 * The Last-31 surface offers a bulk selection twice: the SEED, pre-ticked when the list first
 * opens, and the BUTTON beside it. They used to share `canSeed` — which decides what is
 * ELIGIBLE — and nothing else, so when #798 taught the button to ask the real fill what the
 * deck NEEDS, the seed went on taking the top N by synergy. The two then disagreed about the
 * same deck in the same frame, and the seed is the half a player is actually shown.
 *
 * Sharing the eligibility rule was never enough. This is the objective, shared too.
 *
 * It never throws: a refusal and a transport failure arrive as the same `ok: false`, because
 * both leave the caller with the same choice to make and neither is worth two code paths.
 */
import { chooseBulkFill } from "../../app/decks/actions";
import { synergyCopy } from "../copy/synergy-discovery";

export type BulkChoice =
  | { ok: true; ticks: Set<string> }
  | { ok: false; message: string };

export async function chooseBulkTicks(args: {
  deckId: string;
  /** How many slots the control is offering to fill. */
  slots: number;
  /** What this surface can actually tick — `canSeed`, plus its own exclusions. */
  allowed: ReadonlySet<string>;
}): Promise<BulkChoice> {
  try {
    const result = await chooseBulkFill(args.deckId, args.slots);
    if (!result.ok) return result;
    // INTERSECTED HERE so neither caller has to remember. The action reads the DECK; a
    // surface carries exclusions of its own — a row set aside, or one that went illegal
    // while the list was open — and those must not come back ticked because a bulk
    // selection was made.
    return {
      ok: true,
      ticks: new Set(result.oracleIds.filter((id) => args.allowed.has(id))),
    };
  } catch {
    return { ok: false, message: synergyCopy.lastSlots.topUpFailed };
  }
}
