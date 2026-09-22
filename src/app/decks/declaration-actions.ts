"use server";

import { eq, and } from "drizzle-orm";
import { db } from "../../db";
import { decks } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { isUuid } from "../../lib/uuid";
import { revalidatePath } from "next/cache";
import { declarationRefusal, type DeclarationRefusal } from "../../lib/bracket/declaration";
import type { Bracket } from "../../lib/bracket/types";
import { cachedDeckProfile } from "../../lib/profile/load";
import { slotDeck } from "../../lib/bracket/slot";
import { deckSurfaces } from "../../lib/decks/revalidate";

export type DeclareResult =
  | { ok: true; declared: Bracket }
  | { ok: false; reason: DeclarationRefusal["kind"] | "not-found" };

/**
 * Record what a player says their deck is.
 *
 * THE REFUSAL RULES MATTER MORE THAN THE WRITE, and every one of them lives in
 * `declarationRefusal` rather than here. A server action needs a request and a signed-in reader,
 * so no probe in this repository can call one — so this function is deliberately too thin to
 * hold a rule: guard the id, read the deck, derive its permits, ask, write or refuse. The
 * decision is unit-tested and mutation-proved; what is left here is wiring.
 *
 * THE APP NEVER DEFAULTS AND NEVER INFERS ONE. There is no argument this function takes that
 * writes a bracket the caller did not name, no fallback when the answer is absent, and no path
 * to the column that skips the rule above. A player who says nothing leaves the deck unanswered,
 * and `null` in that column means *unanswered* and nothing else.
 *
 * PERMITS COME FROM THE DECK'S OWN CARDS, never from the request. The control is drawn over a
 * verdict the reader is looking at, so the honest check is against what the cards permit at the
 * moment of the write — a page held open while the deck was edited elsewhere would otherwise
 * store an answer those cards never allowed. The profile read is `cachedDeckProfile`, so the
 * common case costs a cache hit rather than the 630ms a cold build takes.
 *
 * WHAT THIS DOES NOT DO: it never clears. There is no skip and no dismissal (Round 3, R5) — a
 * player changes a declaration by making a different one, and the only way back to `null` is a
 * state no control offers. A `clearDeclaration` would be the skip under another name.
 */
export async function declareBracket(deckId: string, value: number): Promise<DeclareResult> {
  const userId = await requireUserId();

  // BEFORE the id reaches a `uuid` column. The declared type is a compile-time claim and this
  // is a Server Action argument, so a crafted request can post anything — and Postgres answers
  // a malformed uuid with 22P02, which reaches the reader as a rejected action rather than as
  // the refusal `DeclareResult` promises. Every other deck action in this directory guards it;
  // `lib/uuid.ts` says why in its own header, including that a posted `["<a real uuid>"]`
  // survives a bare `RegExp.test`.
  if (!isUuid(deckId)) return { ok: false, reason: "not-found" };

  const profile = await cachedDeckProfile(deckId, userId);
  // A deck the reader does not own reads as absent rather than as forbidden: `loadProfileHead`
  // scopes by `user_id`, so there is no state in which this returns another player's deck.
  if (!profile) return { ok: false, reason: "not-found" };

  // `slotDeck` already resolves the range — it owns `permitsFor` and the 3-vs-4 boundary with
  // it. Calling `permitsFor` here would be a second copy of that resolution, free to drift.
  const { permits } = slotDeck(profile);

  const refusal = declarationRefusal(permits, value);
  if (refusal) return { ok: false, reason: refusal.kind };

  // Scoped by BOTH ids, so ownership is enforced by the statement rather than by the read above
  // having happened. The check constraint refuses anything but 1-5 or null underneath this.
  const [row] = await db
    .update(decks)
    .set({ declaredBracket: value })
    .where(and(eq(decks.id, deckId), eq(decks.userId, userId)))
    .returning({ id: decks.id });
  if (!row) return { ok: false, reason: "not-found" };

  // The declaration is NOT in `profileFingerprint` (#797) — the profile does not read it — so no
  // cached profile goes stale here and nothing about this write needs one rebuilt. What does
  // change is what the deck's own surfaces draw, which is what these paths are for.
  for (const path of deckSurfaces(deckId)) revalidatePath(path);

  return { ok: true, declared: value as Bracket };
}
