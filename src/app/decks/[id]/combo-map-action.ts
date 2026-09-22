"use server";

import { and, eq } from "drizzle-orm";

import { db } from "../../../db";
import { deckCards, decks } from "../../../db/schema";
import { requireUserId } from "../../../lib/auth";
import type { AttachedCombo } from "../../../lib/combos/attach";
import { loadCompletionPartners } from "../../../lib/combos/near-miss";
import { isUuid } from "../../../lib/uuid";

/**
 * Every card that would complete a two-card combo already half-built in this deck, keyed by
 * that card's oracle id.
 *
 * WHY THIS IS A WHOLE-DECK READ AND NOT A PER-KEYSTROKE ONE. The quick-add bar's results
 * arrive a keystroke at a time, and the obvious shape — ask about the twenty cards on screen —
 * was measured at ~305ms per keystroke against a real staging deck, FLAT regardless of how
 * many results came back. That figure is the shape of the answer: the cost is the index walk
 * from the deck's side, which does not depend on what was typed, and the candidate list is a
 * post-filter on rows the query has already produced. Asking per keystroke pays a deck-shaped
 * cost to answer a question the keystroke did not change.
 *
 * So it is paid once, when the panel opens, and every keystroke is answered from the map. The
 * clause then ships with the row on first paint rather than arriving a beat later and pushing
 * the row it lands in.
 *
 * A PLAIN RECORD, not a Map: this crosses a Server Action boundary.
 */
export async function loadDeckComboMap(
  deckId: string,
): Promise<Record<string, NonNullable<AttachedCombo>>> {
  const userId = await requireUserId();
  // Before the query, not after: `decks.id` is a uuid column and Postgres refuses a malformed
  // value with an error, which would reach the panel as a rejected action rather than as the
  // empty map a deck with no completions returns.
  if (!isUuid(deckId)) return {};

  // Scoped to the signed-in user in the WHERE, so a deck id belonging to someone else reads
  // as absent rather than as a deck. The panel sends an id from the route it is mounted on,
  // but a Server Action argument is a runtime value and not a claim this can take on trust.
  const [deck] = await db
    .select({
      commanderOracleId: decks.commanderOracleId,
      partnerOracleId: decks.partnerOracleId,
    })
    .from(decks)
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  if (!deck) return {};

  const rows = await db
    .select({ oracleId: deckCards.oracleId })
    .from(deckCards)
    .where(eq(deckCards.deckId, deckId));

  const completions = await loadCompletionPartners({
    deckOracleIds: rows.map((r) => r.oracleId),
    // SEPARATE FROM THE CARDS, per §4.3b rule 3: a commander counts as held and is a column
    // here rather than a `deck_cards` row, so a read taking only the list would miss every
    // combo the commander is half of.
    commanderOracleIds: [
      deck.commanderOracleId,
      ...(deck.partnerOracleId ? [deck.partnerOracleId] : []),
    ],
    // The whole map. See the header.
    candidateOracleIds: null,
  });

  const out: Record<string, NonNullable<AttachedCombo>> = {};
  for (const [oracleId, partner] of completions) {
    out[oracleId] = { oracleId: partner.partnerOracleId, name: partner.partnerName };
  }
  return out;
}
