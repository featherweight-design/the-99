"use server";

import { requireUserId } from "../../lib/auth";
import { isUuid } from "../../lib/uuid";
import { analysisTabEnabled } from "../../lib/decks/analysis-flag";
import { cachedDeckProfile } from "../../lib/profile/load";
import type { DeckProfile } from "../../lib/profile/types";

export type ProfileFetch =
  | { ok: true; profile: DeckProfile }
  /** The deck is absent, not this reader's, or the id was malformed. */
  | { ok: false; reason: "not-found" }
  /** The flag is off for this deployment. Distinct from a failure: nothing is wrong. */
  | { ok: false; reason: "disabled" };

/**
 * The deck profile, fetched when the reader opens the Analysis tab and not before.
 *
 * WHY AN ACTION RATHER THAN THE PAGE'S OWN LOADER. `BuilderTabs` is client state — pressing a
 * tab is not a navigation, and `builder-view.ts` says why in its own header — so a route loader
 * that fetched the profile when the tab was active could never re-run: no navigation happens.
 * Adding it to the deck page's `Promise.all` instead would make every visit pay for it.
 *
 * AND THE PROFILE IS NOT CHEAP. `pnpm measure:profile-cost` against staging, over all 20 real
 * decks: 630ms median cold, 1.8-2.2s on the slowest, 559ms on the fastest. Paying that on every
 * `/decks/<id>` load, for a tab most visits never open, is the regression the decklist's own
 * cache exists to prevent. The head read alone is ~120ms of it, and it is the only part that has
 * to run before the cache can be consulted.
 *
 * SO: ON A PRESS. Round 4's ruling 7 settles which press — *"the verdict fires on analyse or
 * commit, and nowhere else. No per-add, no per-edit, no auto-run on tab open."*
 *
 * `cachedDeckProfile` keys its SERVER-side entry on `profileFingerprint`, so a second press
 * after an edit builds afresh while a second press after no edit is nearly free. **That keying
 * does not reach the client**, and this is the sentence an earlier draft got wrong: the caller
 * holds one answer for the visit, so an edit made without leaving the route does not retire it.
 * Nothing needs it to — the reader presses again, which is exactly the model Round 4 draws,
 * where a determined verdict goes stale and the control invites another pass.
 *
 * THE FLAG GATES THE LOADER AS WELL AS THE TAB. A hidden tab whose payload still loads is the
 * worst of both, so `disabled` is answered before any read — and it is a distinct reason from
 * `not-found`, because nothing is wrong with the deck.
 */
export async function fetchDeckProfile(deckId: string): Promise<ProfileFetch> {
  if (!analysisTabEnabled()) return { ok: false, reason: "disabled" };

  // Before the id reaches a `uuid` column: Postgres answers a malformed one with 22P02, which
  // arrives as a rejected action rather than as the refusal this type promises.
  if (!isUuid(deckId)) return { ok: false, reason: "not-found" };

  const userId = await requireUserId();
  const profile = await cachedDeckProfile(deckId, userId);
  // A deck the reader does not own reads as ABSENT rather than forbidden: `loadProfileHead`
  // scopes by `user_id`, so there is no state in which this returns another player's deck.
  if (!profile) return { ok: false, reason: "not-found" };

  return { ok: true, profile };
}
