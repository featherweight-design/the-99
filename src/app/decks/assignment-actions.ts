"use server";
// Giving a contested copy to a deck — the request-facing half.
//
// THIS IS NOT A PULL, and the two must never be confused. `pullCardFromDeck` takes a card out of
// another deck's list and commits that deck a version it did not ask for; this writes one
// `card_assignments` row and edits nobody's list. The losing deck keeps the card on its list and
// goes on billing it, which is exactly what makes the act reversible with one more tap.
//
// The guarded write lives in `src/lib/decks/assign.ts`. It takes a `userId`, and every export of
// THIS module is a server action anybody can call — so it stays where a caller cannot reach it
// with somebody else's id.

import { requireUserId } from "../../lib/auth";
import { assignCopyFor, type AssignRefusal, type AssignReport } from "../../lib/decks/assign";
import { loadContestedCard, type ContestedCard } from "../../lib/collection/summary-read";
import { revalidateClaims } from "../../lib/decks/revalidate-claims";
import { requestSwitchEnv } from "../../lib/switches/request";

export type { AssignRefusal };

export type AssignResult =
  /** `createdAt`: the reservation this press wrote, exactly, when it wrote one (an undo names it). */
  | { ok: true; card: ContestedCard | null; createdAt?: string }
  | { ok: false; cause: AssignRefusal; card: ContestedCard | null };

/**
 * `card` comes back on success AND on refusal, because a refusal means the row is out of date and
 * redrawing it from stale props would leave the player looking at the state that just lost.
 */
export async function assignCopy(oracleId: string, deckId: string): Promise<AssignResult> {
  const userId = await requireUserId();
  const report: AssignReport = { created: false };
  const cause = await assignCopyFor(userId, oracleId, deckId, report);

  // A DECK THAT IS NOT THIS PLAYER'S WROTE NOTHING, so nothing is invalidated and nothing is read
  // back. Falling through would let anyone post a valid deck id belonging to somebody else and
  // churn every shared claim surface plus a live claim read, none of which they are entitled to
  // move. It is also the one refusal with no sentence — there is nothing for the row to draw.
  if (cause === "not-your-deck") return { ok: false, cause, card: null };

  // EVERY claimant's page, not just this deck's. One reservation changes the allocation figures of
  // every deck claiming the card, so the pattern form is what keeps a losing deck from going on
  // drawing the marker and buy state it had before the pick.
  // Every claimant's page AND the import receipt — `revalidateClaims` carries the summary route
  // now, because a commit and a proxy toggle move those same figures and were leaving it stale.
  revalidateClaims(deckId, userId);

  // The row's fresh state, read after the write: the page is about to redraw it, and a refusal
  // without it would leave the player looking at exactly the state that lost.
  // Under the reader's resolved switches, which decide the claim model's `locked` key and pending clause.
  const card = await loadContestedCard(oracleId, userId, { env: await requestSwitchEnv(userId) }).catch(() => null);
  if (cause) return { ok: false, cause, card };
  return { ok: true, card, ...(report.created && report.createdAt ? { createdAt: report.createdAt } : {}) };
}
