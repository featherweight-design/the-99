"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { requireUserId } from "../../lib/auth";
import { requestSwitchEnv } from "../../lib/switches/request";
import { isUuid } from "../../lib/uuid";
import { analysisTabEnabled } from "../../lib/decks/analysis-flag";
import { deckBenchmarksEnabled } from "../../lib/decks/benchmarks-flag";
import { readingBenchmarks } from "../../lib/benchmarks/reading";
import type { BenchmarksWire } from "../../lib/benchmarks/wire";
import { computeAndStoreProfile, readStoredReading } from "../../lib/profile/stored";
import type { DeckProfile } from "../../lib/profile/types";

export type ProfileFetch =
  /** `analyzedAt` is an ISO instant: when the press ran, or when the stored reading was written. */
  | {
      ok: true;
      profile: DeckProfile;
      analyzedAt: string;
      /** The list analyzed is the deck's, and no edit since. A peek may answer a stale one. */
      fresh: boolean;
      /** The version this reading is pinned to, for `analyzed with version n`. */
      versionNumber: number | null;
      /** The reading's evidence benchmarks, graded from its own list; null when the switch is off or a
       *  read failed. Belongs to the reading, so a held one carries its own. */
      benchmarks: BenchmarksWire | null;
    }
  /** The deck is absent, not this reader's, or the id was malformed. */
  | { ok: false; reason: "not-found" }
  /** The flag is off for this deployment. Distinct from a failure: nothing is wrong. */
  | { ok: false; reason: "disabled" }
  /** The body is not a whole deck (ruling 1), so nothing was analyzed. */
  | { ok: false; reason: "illegal"; built: number; size: number };

/**
 * The deck profile, fetched when the reader presses Analyze and not before.
 *
 * WHY AN ACTION RATHER THAN THE PAGE'S OWN LOADER. Round 4's ruling 7 puts this behind a press,
 * and a page loader cannot answer a press at all. Even gated on the tab it could not: `BuilderTabs`
 * is client state — pressing a tab is not a navigation, and `builder-view.ts` says why in its own
 * header — so a loader keyed on the active tab would never re-run. Adding it to the deck page's
 * `Promise.all` instead would make every visit pay for it.
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
 * worst of both, so `disabled` is answered before any deck read: after the session and the
 * reader's own switches, which decide it, and before anything else. It is a distinct reason from
 * `not-found`, because nothing is wrong with the deck.
 */
export async function fetchDeckProfile(deckId: string): Promise<ProfileFetch> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!analysisTabEnabled(env)) return { ok: false, reason: "disabled" };

  // Before the id reaches a `uuid` column: Postgres answers a malformed one with 22P02, which
  // arrives as a rejected action rather than as the refusal this type promises.
  if (!isUuid(deckId)) return { ok: false, reason: "not-found" };

  // Computed through the same cache as before, and now also STORED, so the next visit can show
  // it without a press. See `stored.ts`.
  const result = await computeAndStoreProfile(deckId, userId);
  // A deck the reader does not own reads as ABSENT rather than forbidden: `loadProfileHead`
  // scopes by `user_id`, so there is no state in which this returns another player's deck.
  if (!result) return { ok: false, reason: "not-found" };
  // Ruling 1: analysis runs only on a whole deck. Nothing was computed or written.
  if (result.kind === "illegal") {
    return { ok: false, reason: "illegal", built: result.built, size: result.size };
  }

  // The deck tile draws its bracket chip from the row just stored, so the `/decks` list the router
  // may be holding from before the press is retired. DEFERRED into `after()`: a revalidation during
  // the action re-renders the route it was called from into its reply, which on this page is the
  // whole deck (the 1.6MB lesson recorded in `probe:printing-pick`).
  // Home's resume row draws the same chip, from the same row (Home bracket-chip addendum, F5).
  after(() => {
    revalidatePath("/decks");
    revalidatePath("/");
  });

  const { profile, analyzedAt, fresh, versionNumber } = result.reading;
  return { ok: true, profile, analyzedAt: analyzedAt.toISOString(), fresh, versionNumber, benchmarks: await readingBenchmarks(profile, userId, deckBenchmarksEnabled(env)) };
}

export type StoredProfileFetch =
  | ProfileFetch
  /** No stored analysis matches this deck as it is now. The press is the next step. */
  | { ok: false; reason: "none" };

/**
 * The analysis already stored for this deck, read when the Analysis tab opens — never computed.
 *
 * WHY THIS DOES NOT BREAK RULING 7. Round 4 forbids an auto-RUN on tab open because an analysis
 * costs 630ms median and 2.2s on the largest deck. This runs nothing: it is a head read and a
 * primary-key lookup, and answers `none` rather than falling through to a computation. A reader
 * who pressed Analyze before a reload sees that same analysis after it, which is what the press
 * already bought; a reader who never pressed still sees the press.
 */
export async function fetchStoredDeckProfile(deckId: string): Promise<StoredProfileFetch> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!analysisTabEnabled(env)) return { ok: false, reason: "disabled" };
  if (!isUuid(deckId)) return { ok: false, reason: "not-found" };
  const stored = await readStoredReading(deckId, userId);
  // A STALE reading is answered as one: the tab holds it under the banner (2i) rather than
  // withdrawing it.
  return stored
    ? {
        ok: true,
        profile: stored.profile,
        analyzedAt: stored.analyzedAt.toISOString(),
        fresh: stored.fresh,
        versionNumber: stored.versionNumber,
        benchmarks: await readingBenchmarks(stored.profile, userId, deckBenchmarksEnabled(env)),
      }
    : { ok: false, reason: "none" };
}
