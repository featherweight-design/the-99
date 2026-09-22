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
  /**
   * What this surface can actually tick — `canSeed`, plus its own exclusions.
   *
   * A THUNK, and that is the whole of it: it is called after the await, never before. The
   * editing controls stay live while the server thinks, so a row set aside mid-request is gone
   * from this set by the time the answer lands, and a Set captured at the call site describes a
   * draft that no longer exists.
   *
   * NOT ASSERTED, and the reason is worth keeping. The obvious case — decline a row mid-request,
   * then restore it — cannot tell the two apart, because a restored row returns UNTICKED by
   * design: the tick was dropped when it was declined. So the stale tick is written and then
   * normalised away by the path you would observe it through. I wrote that case, watched it pass
   * against the capture-early mutation, and deleted it rather than ship a guard that cannot fail.
   *
   * What remains reachable is the other exclusion — a row that goes ILLEGAL while the list is
   * open stays visible and is dropped from this set — and no fixture here can make a card go
   * illegal mid-request. The correctness argument is the ordering itself, which the signature
   * now enforces: a caller cannot pass a value, only a way to read one.
   */
  allowed: () => ReadonlySet<string>;
}): Promise<BulkChoice> {
  try {
    const result = await chooseBulkFill(args.deckId, args.slots);
    if (!result.ok) return result;
    // INTERSECTED HERE so neither caller has to remember. The action reads the DECK; a
    // surface carries exclusions of its own — a row set aside, or one that went illegal
    // while the list was open — and those must not come back ticked because a bulk
    // selection was made.
    const allowed = args.allowed();
    return {
      ok: true,
      ticks: new Set(result.oracleIds.filter((id) => allowed.has(id))),
    };
  } catch {
    return { ok: false, message: synergyCopy.lastSlots.topUpFailed };
  }
}
