import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { deckProfiles } from "../../db/schema";
import { slotDeck } from "../bracket/slot";
import { catalogGeneration } from "../cache/catalog-generation";
import { profileFingerprint } from "./fingerprint";
import { cachedDeckProfile, loadProfileHead } from "./load";
import type { DeckProfile } from "./types";

/**
 * How long a stored analysis is shown before it is treated as absent.
 *
 * A WEEK, because that is the cadence of the inputs the fingerprint cannot see. The fingerprint
 * covers the deck's own cards and commanders and the catalog generation covers the Monday card
 * ingest, but the Spellbook combo index refreshes weekly and the commander index monthly, and
 * neither stamps anything this row can be compared against. A week bounds how long a stored row
 * can outlive a refresh it cannot see, give or take the hour `cachedDeckProfile` may have held
 * the profile before the press stored it (`computed_at` is when it was STORED, not built). Past
 * that it is not shown, and the reader presses again, which is the same state as never having
 * analyzed.
 */
export const STORED_PROFILE_MAX_AGE_DAYS = 7;

/**
 * The two cached reads this module sits on, injectable because both wrap `unstable_cache`,
 * which raises an invariant outside a request. `probe:profile-store` passes the uncached
 * readers beneath them so it proves THIS module's SQL rather than a copy of it.
 */
export type StoredProfileDeps = {
  generation: () => Promise<string>;
  compute: (deckId: string, userId: string) => Promise<DeckProfile | null>;
};

const REQUEST_DEPS: StoredProfileDeps = { generation: catalogGeneration, compute: cachedDeckProfile };

/**
 * The analysis to show on tab open, or null — and null is never a computation.
 *
 * A head read (~120ms on staging, `measure:profile-cost`) and one primary-key lookup. The head is
 * what the fingerprint is computed from, and is scoped by `user_id`, so a deck the reader does not
 * own reads as absent here exactly as it does through `cachedDeckProfile`.
 *
 * A row is returned only when all three stamps agree — same cards, same catalog, inside the week.
 * Anything else is absent rather than stale: a stale reading is Design's to draw (it is in the
 * consolidated Analysis-tab handoff), and until it is drawn the honest state is the press.
 */
export async function readStoredProfile(
  deckId: string,
  userId: string,
  deps: StoredProfileDeps = REQUEST_DEPS,
): Promise<DeckProfile | null> {
  const head = await loadProfileHead(deckId, userId);
  if (!head) return null;
  const [catalog, rows] = await Promise.all([
    deps.generation(),
    db
      .select({ profile: deckProfiles.profile, catalog: deckProfiles.catalog })
      .from(deckProfiles)
      .where(
        and(
          eq(deckProfiles.deckId, deckId),
          eq(deckProfiles.userId, userId),
          eq(deckProfiles.fingerprint, profileFingerprint(head)),
          sql`${deckProfiles.computedAt} > now() - make_interval(days => ${STORED_PROFILE_MAX_AGE_DAYS})`,
        ),
      )
      .limit(1),
  ]);
  // The catalog is compared here rather than in the WHERE because the generation is itself a
  // cached read, and running it beside the lookup is the point of the `Promise.all`.
  const row = rows[0];
  return row && row.catalog === catalog ? row.profile : null;
}

/**
 * Compute the analysis (through the existing cache) and store it, returning what was stored.
 *
 * The WRITE rides on the press, which is the only place the analysis is computed from a reader's
 * request, so storing costs nothing that was not already being paid. It is best-effort: a failed
 * write must not take the verdict the reader just asked for down with it, so it is caught and the
 * profile returned — the next tab open simply finds no row and offers the press again.
 */
export async function computeAndStoreProfile(
  deckId: string,
  userId: string,
  deps: StoredProfileDeps = REQUEST_DEPS,
): Promise<DeckProfile | null> {
  const profile = await deps.compute(deckId, userId);
  if (!profile) return null;
  try {
    const catalog = await deps.generation();
    const permits = [...slotDeck(profile).permits].sort((a, b) => a - b);
    await db
      .insert(deckProfiles)
      .values({ deckId, userId, fingerprint: profile.fingerprint, catalog, profile, permits })
      .onConflictDoUpdate({
        target: deckProfiles.deckId,
        set: {
          userId,
          fingerprint: profile.fingerprint,
          catalog,
          profile,
          permits,
          computedAt: sql`now()`,
        },
      });
  } catch (error) {
    console.warn("deck profile not stored; the next tab open will offer the press again", error);
  }
  return profile;
}
