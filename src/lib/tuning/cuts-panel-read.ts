import { readCutsState, readProposedCuts } from "../decks/cuts-read";
import { deckBodySize } from "../decks/deck-size";
import { commanderName } from "../decks/tuning-read";
import { listFingerprint } from "../profile/fingerprint";
import { deckNameIndex, normalizeName } from "../synopsis/facts";
import { isUuid } from "../uuid";
import { cutCounts } from "./cuts-count";
import type { CutsPanel } from "./cuts-state";
import { cutsCountSummary, recordToolCount } from "./tool-counts";

/**
 * The Proposed cuts panel's one read, for a reader already known: the run state, and the count the model reads for the
 * deck as it stands. Null when the deck is not the reader's. `readCutsPanel` (`cuts-actions.ts`) is this behind the
 * session and the id check; the landing demo's exporter (`scripts/demo-export.mts`) calls it with the fixture's owner,
 * since a script has no session.
 *
 * NOT A PURE READ: it reaps the deck's stale runs (`readCutsState`) and records History's free count row
 * (`recordToolCount`), exactly as an open of the panel does.
 *
 * `resultCurrent` is the re-offer rule (README open 9, decided in the R2 audit): the newest ok run's cuts stand while the
 * deck still matches the fingerprint they were made against, and a cut pressed FROM them moves that fingerprint in its own
 * transaction (`cuts-verdicts.ts`), so only an edit that is not one of their own cuts retires them and brings the offer back.
 */
export async function loadCutsPanel(
  deckId: string,
  userId: string,
  env: NodeJS.ProcessEnv,
  runId: string | null = null,
): Promise<CutsPanel | null> {
  const inputs = await readProposedCuts(deckId, userId, env);
  if (!inputs) return null;
  const { head, facts, locked, allLocked: lockedOut, fingerprint } = inputs;
  const keyCards = inputs.keyCards;
  const [state, name] = await Promise.all([
    // `runId` is History's re-review: that past run's cuts. Anything not a uuid reads as ordinary.
    readCutsState(deckId, userId, new Date(), runId && isUuid(runId) ? runId : null, env),
    commanderName(head),
  ]);
  const declared = (head.declaredBracket as 1 | 2 | 3 | 4 | 5 | null) ?? null;
  // Key cards that are still candidates, resolved the way the validator resolves them. A name the
  // deck no longer holds, a duplicate, or a locked card counts for nothing; and when every card
  // the player has not locked is a Key card, a deeper look has nothing it may name.
  const byName = deckNameIndex(facts.cards);
  const liveKey = new Set(keyCards.flatMap((k) => { const hit = byName.get(normalizeName(k)); return hit ? [hit.oracleId] : []; }));
  const allLocked = lockedOut || (facts.cards.length > 0 && facts.cards.every((c) => liveKey.has(c.oracleId)));
  const counts = cutCounts(facts, declared, name);
  // History's free row: once per version of the LIST, written the first time this list's count is
  // read. Keyed on the list alone (`listFingerprint`), not on the tool's input fingerprint, which
  // also moves with a lock, the intent or a declared bracket on an unchanged list.
  const summary = cutsCountSummary(facts);
  if (summary) {
    await recordToolCount({ deckId, userId, tool: "proposed_cuts", listFingerprint: listFingerprint(head), readVersion: inputs.readVersion, summary });
  }
  return {
    ...state,
    total: facts.total,
    bodySize: deckBodySize(head.partnerOracleId !== null),
    over: facts.over,
    commander: name,
    allLocked,
    lockedCount: locked.length,
    keyCount: liveKey.size,
    declaredBracket: declared,
    edhrecDecks: facts.support?.deckCount ?? null,
    thin: facts.missing.includes("inclusion"),
    rows: counts.rows,
    // The chips quote the figures the run's cites were checked against; the rows above stay live.
    chips: state.itemsReport?.chips ?? counts.chips,
    resultCurrent: state.lastOkFingerprint === fingerprint && !state.modelVersionMoved,
    asked: state.itemsReport?.over ?? state.items.length,
  };
}
