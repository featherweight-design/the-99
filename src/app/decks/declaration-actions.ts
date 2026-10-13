"use server";

import { eq, and, sql } from "drizzle-orm";
import { db } from "../../db";
import { deckProfiles, decks } from "../../db/schema";
import { requireUserId } from "../../lib/auth";
import { isUuid } from "../../lib/uuid";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { declarationRefusal, type DeclarationRefusal } from "../../lib/bracket/declaration";
import type { Bracket } from "../../lib/bracket/types";
import { cachedDeckProfile } from "../../lib/profile/load";
import { requestSwitchEnv } from "../../lib/switches/request";
import { slotDeck } from "../../lib/bracket/slot";
import { deckSurfaces } from "../../lib/decks/revalidate";

export type DeclareResult =
  | { ok: true; declared: Bracket }
  | { ok: false; reason: DeclarationRefusal["kind"] | "not-found" | "stale" };

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
 * verdict the reader is looking at, so the check is against what the cards permit — a page held
 * open while the deck was edited elsewhere would otherwise store an answer those cards never
 * allowed. The profile read is `cachedDeckProfile`, so the common case costs a cache hit rather
 * than the 630ms a cold build takes.
 *
 * THIS IS NOT ATOMIC WITH THE WRITE, and an earlier version of this comment claimed it was —
 * "at the moment of the write", which it is not. The profile completes before the update, so a
 * concurrent edit narrowing the range from [1,2] to [2] between the two can still store 1.
 *
 * Left that way on purpose. Closing it means deriving permits inside the transaction, which is
 * a 630ms-to-2.2s profile build holding the deck's row lock while every concurrent edit and
 * claim read queues behind a measurement. And the state the race produces is one the design
 * already draws: a declaration the cards no longer permit is DRIFT, reported as its own
 * reading, never corrected and never inferred. The race reaches a drawn state by an unusual
 * road rather than reaching an undrawn one.
 *
 * What the check does buy is the case that matters — a request naming a bracket the cards have
 * never permitted is refused outright.
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

  // A STALE READING TAKES NO ANSWER (§4.2, audit finding 12): the tab withholds the chips until
  // the re-read, and this is the server's half of that rule. An answer given now would be about a
  // reading the list has moved past.
  const [stored] = await db
    .select({ dirty: deckProfiles.dirty })
    .from(deckProfiles)
    .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId)));
  if (stored?.dirty) return { ok: false, reason: "stale" };

  // Under the reader's resolved switches, so the profile is the one the tab's own read keyed and built.
  const profile = await cachedDeckProfile(deckId, userId, await requestSwitchEnv(userId));
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
  //
  // AND ON A CLEAN READING, in the same statement. The read above refuses early and cheaply, but an
  // edit committing between it and this write would otherwise leave a declaration answering a
  // reading the list has already moved past.
  const [row] = await db
    .update(decks)
    .set({ declaredBracket: value })
    .where(and(
      eq(decks.id, deckId),
      eq(decks.userId, userId),
      sql`not exists (select 1 from ${deckProfiles} dp where dp.deck_id = ${decks}.id and dp.dirty)`,
    ))
    .returning({ id: decks.id });
  if (!row) {
    // Matching nothing is either a deck that is not the reader's or a reading that went stale
    // since the read above; the second is reported as itself.
    const [now] = await db
      .select({ dirty: deckProfiles.dirty })
      .from(deckProfiles)
      .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId)));
    return { ok: false, reason: now?.dirty ? "stale" : "not-found" };
  }

  // The declaration is NOT in `profileFingerprint` (#797) — the profile does not read it — so no
  // cached profile goes stale here and nothing about this write needs one rebuilt. What does
  // change is what the deck's own surfaces draw, which is what these paths are for.
  //
  // DEFERRED INTO `after()`. A Server Action that revalidates during its own run re-renders the
  // route it was called from into its reply (`probe:printing-pick` measured 1.6 MB against 122
  // bytes), and this one is called from the deck page to change one column. The caller already
  // draws the answer it sent — `useDeclaration` holds it for the visit — so the fresh page would
  // buy nothing but bytes. The paths are still retired, for the next visit.
  after(() => {
    for (const path of deckSurfaces(deckId)) revalidatePath(path);
  });

  return { ok: true, declared: value as Bracket };
}
