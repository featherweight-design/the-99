import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { deckProfiles } from "../../db/schema";
import { slotDeck } from "../bracket/slot";
import { catalogGeneration } from "../cache/catalog-generation";
import { deckBodySize } from "../decks/deck-size";
import { listFingerprint, profileFingerprint } from "./fingerprint";
import { cachedDeckProfile, readProfileHead, type ProfileHead } from "./load";
import { PROFILE_VERSION } from "./version";
import type { Bracket } from "../bracket/types";
import { isReachablePermits } from "../bracket/verdict-head";
import type { DeckProfile } from "./types";

// THE ANALYSIS LIFECYCLE (Hugh's rulings, 2026-09-23), in the terms this module stores it:
//
//   · A reading never LAPSES. The catalog moving and a week passing retire nothing; the row is
//     shown until the deck changes, and then it is shown as stale rather than withdrawn.
//   · FRESH means the list is the one analyzed and nothing has touched it since:
//     `fingerprint` (the list alone, `listFingerprint`) matches the deck, and `dirty` is clear.
//     `touchDeck` sets `dirty` in the edit's own transaction; every analysis clears it.
//   · A new PROFILE_VERSION is not an edit. The fingerprint carries no version, so a deploy
//     that bumps it changes no deck's freshness. The document itself was built under the old
//     shape, though, and version.ts records what reading an old shape costs: fields the type
//     says exist, absent, and NaN wherever arithmetic touches them. So an old document is never
//     shown. On a clean legal deck the next read recomputes it quietly (deterministic, no model
//     call, no banner); otherwise it reads as nothing until the next press.
//   · Analysis runs only on a LEGAL deck: the body at `deckBodySize` exactly (ruling 1).
//   · A re-analyze of an unchanged list answers from the store, without computing (ruling 5).
//   · A commit pins the reading to the version it committed (ruling 2), through `versionId`.

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

/** A stored reading, with whether it still describes the deck. */
export type StoredReading = {
  profile: DeckProfile;
  analyzedAt: Date;
  /** The same list as the deck's, and no edit since the analysis. */
  fresh: boolean;
  /** The version a commit pinned this reading to, or null when a press produced it. */
  versionId: string | null;
};

/** The body count against the size a legal deck holds (ruling 1: the body count alone). */
export function deckLegality(head: Pick<ProfileHead, "partnerOracleId" | "cards">) {
  const built = head.cards.reduce((n, c) => n + c.quantity, 0);
  const size = deckBodySize(head.partnerOracleId !== null);
  return { legal: built === size, built, size };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The deck's head and its stored row, from ONE snapshot. Read apart, an edit committing between
 *  them pairs the edited deck with the analysis of the deck before it. */
async function readHeadAndRow(tx: Tx, deckId: string, userId: string) {
  const head = await readProfileHead(tx, deckId, userId);
  if (!head) return { head: null, row: null };
  const [row] = await tx
    .select({
      profile: deckProfiles.profile,
      fingerprint: deckProfiles.fingerprint,
      profileVersion: deckProfiles.profileVersion,
      dirty: deckProfiles.dirty,
      versionId: deckProfiles.versionId,
      computedAt: deckProfiles.computedAt,
    })
    .from(deckProfiles)
    .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId)))
    .limit(1);
  return { head, row: row ?? null };
}

/**
 * Whether the stored row describes the deck's current list. A row written before migration 0054
 * (`profile_version` 0) stored `profileFingerprint`, which carries the version it was built at;
 * every later row stores `listFingerprint`. A legacy row built under an older version than the
 * current one cannot be compared, and reads as a different list.
 */
function sameList(row: { profileVersion: number; fingerprint: string }, head: ProfileHead): boolean {
  return row.profileVersion === 0
    ? row.fingerprint === profileFingerprint(head)
    : row.fingerprint === listFingerprint(head);
}

const READ_ONLY = { isolationLevel: "repeatable read", accessMode: "read only" } as const;

/**
 * The stored reading for the Analysis tab, fresh or stale, or null — and never a press.
 *
 * A head read (~120ms on staging, `measure:profile-cost`) and one primary-key lookup. The one
 * computation it can start is the quiet rebuild of a document an older PROFILE_VERSION wrote,
 * which is not the reader's analysis being re-run: the list is the one they analyzed, and the
 * answer is the one the current code gives for it.
 */
export async function readStoredReading(
  deckId: string,
  userId: string,
  deps: StoredProfileDeps = REQUEST_DEPS,
): Promise<StoredReading | null> {
  const { head, row } = await db.transaction((tx) => readHeadAndRow(tx, deckId, userId), READ_ONLY);
  if (!head || !row) return null;
  if (row.profileVersion !== PROFILE_VERSION) {
    // Rebuilt only over the list the reader analyzed. `dirty` alone cannot say so: a row written
    // before this column existed arrives clean however the deck was edited before the deploy.
    if (row.dirty || !deckLegality(head).legal || !sameList(row, head)) return null;
    const rebuilt = await computeAndStoreProfile(deckId, userId, deps);
    return rebuilt?.kind === "ok" ? { ...rebuilt.reading } : null;
  }
  return {
    profile: row.profile,
    analyzedAt: row.computedAt,
    fresh: sameList(row, head) && !row.dirty,
    versionId: row.versionId,
  };
}

/** The stored profile when it is FRESH, else null. */
export async function readStoredProfile(
  deckId: string,
  userId: string,
  deps: StoredProfileDeps = REQUEST_DEPS,
): Promise<DeckProfile | null> {
  const reading = await readStoredReading(deckId, userId, deps);
  return reading?.fresh ? reading.profile : null;
}

/**
 * The deck's last analyzed bracket, for the header's chip. It HOLDS over an edit (ruling 4): no
 * fingerprint, no catalog, no age, and no version — `permits` is two integers, not a document
 * whose shape can move. The page ships this rather than the profile, which it would otherwise
 * send on every load to draw one pill.
 */
export async function readStoredPermits(deckId: string, userId: string): Promise<Bracket[] | null> {
  const [row] = await db
    .select({ permits: deckProfiles.permits })
    .from(deckProfiles)
    .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId)))
    .limit(1);
  // Fails closed on a shape no writer produces; see `isReachablePermits`.
  return row && isReachablePermits(row.permits) ? row.permits : null;
}

/** What a commit hands the pin: the version it wrote, and the fingerprint of the list it froze. */
export type CommitPin = { versionId: string; list: string };

export type AnalyzeResult =
  | { kind: "ok"; reading: StoredReading }
  /** The body is not `deckBodySize` (ruling 1). Nothing was computed or written. */
  | { kind: "illegal"; built: number; size: number };

/**
 * Analyze the deck: answer from the store when the list is the one already analyzed, compute and
 * store otherwise. Null when the deck is not the reader's.
 *
 * `pinTo` is passed by a commit (ruling 2), which pins the reading to the version it just wrote.
 * The pin answers from the store like any other analysis when the list is unchanged, so a commit
 * of a deck analyzed a moment ago costs one UPDATE.
 *
 * The WRITE is best-effort: a failed write must not take the verdict the reader asked for down
 * with it, so it is caught and the profile returned.
 */
export async function computeAndStoreProfile(
  deckId: string,
  userId: string,
  deps: StoredProfileDeps = REQUEST_DEPS,
  { pinTo }: { pinTo?: CommitPin } = {},
): Promise<AnalyzeResult | null> {
  const { head, row } = await db.transaction((tx) => readHeadAndRow(tx, deckId, userId), READ_ONLY);
  if (!head) return null;
  const legality = deckLegality(head);
  if (!legality.legal) return { kind: "illegal", built: legality.built, size: legality.size };

  const list = listFingerprint(head);
  // A PIN IS FOR THE LIST THE COMMIT WROTE. An edit landing between the commit and this read has
  // moved the deck off that version, and pinning the edited list to it would claim the version
  // was analyzed as something it never held. So nothing is written, and the next press analyzes
  // the draft as a draft.
  if (pinTo && pinTo.list !== list) return null;
  const versionId = pinTo?.versionId;

  // RULING 5: the same list, under the same code, is the same answer. Clear `dirty` (and take the
  // commit's pin) on the row as it stands, guarded on the fingerprint and version it was read at,
  // and return what is stored. An edit landing after that read either changes the fingerprint the
  // next read compares, or marks the row dirty again when it commits.
  if (row && row.profileVersion === PROFILE_VERSION && row.fingerprint === list) {
    try {
      await db
        .update(deckProfiles)
        .set({ dirty: false, ...(versionId ? { versionId } : {}) })
        .where(and(
          eq(deckProfiles.deckId, deckId),
          eq(deckProfiles.fingerprint, list),
          eq(deckProfiles.profileVersion, PROFILE_VERSION),
        ));
    } catch (error) {
      console.warn("deck profile's dirty flag not cleared", error);
    }
    return {
      kind: "ok",
      reading: {
        profile: row.profile,
        analyzedAt: row.computedAt,
        fresh: true,
        versionId: versionId ?? row.versionId,
      },
    };
  }

  // THE GENERATION IS READ BEFORE THE BUILD, never after it. `cachedDeckProfile` keys on the
  // generation it reads itself, and reads are monotonic, so the one read here is never newer than
  // the catalog the profile was built against.
  const catalog = await deps.generation();
  const profile = await deps.compute(deckId, userId);
  if (!profile) return null;
  let analyzedAt = new Date();
  try {
    // STORED ONLY IF IT STILL DESCRIBES THE DECK. Two presses from two tabs can finish out of
    // order, and an older result landing last would replace the newer one. One head read in the
    // write's own repeatable-read snapshot decides it: `profile.fingerprint` carries the list AND
    // the version it was built under, so comparing it to the head's is the whole test. An edit
    // committing after the snapshot marks the row dirty or moves the fingerprint; a newer press's
    // write landing first makes this upsert fail to serialize, and the catch keeps that row.
    const permits = [...slotDeck(profile).permits].sort((a, b) => a - b);
    await db.transaction(async (tx) => {
      const now = await readProfileHead(tx, deckId, userId);
      if (!now || profileFingerprint(now) !== profile.fingerprint) return;
      const fingerprint = listFingerprint(now);
      const [written] = await tx
        .insert(deckProfiles)
        .values({
          deckId, userId, fingerprint, catalog, profile, permits,
          profileVersion: PROFILE_VERSION, dirty: false, versionId: versionId ?? null,
        })
        .onConflictDoUpdate({
          target: deckProfiles.deckId,
          set: {
            userId, fingerprint, catalog, profile, permits,
            profileVersion: PROFILE_VERSION,
            dirty: false,
            // A recompute describes a list that differs from the one any earlier pin was for.
            versionId: versionId ?? null,
            computedAt: sql`now()`,
          },
        })
        .returning({ computedAt: deckProfiles.computedAt });
      if (written) analyzedAt = written.computedAt;
    }, { isolationLevel: "repeatable read" });
  } catch (error) {
    console.warn("deck profile not stored; the next tab open will offer the press again", error);
  }
  return { kind: "ok", reading: { profile, analyzedAt, fresh: true, versionId: versionId ?? null } };
}

/**
 * Pin the reading to the version a commit just wrote (ruling 2), best-effort and off the commit's
 * path: it runs in `after()`, so the commit answers without waiting on a 630ms-to-2.2s analysis.
 * A deck the commit left illegal (a later version may be any size) is not analyzed at all.
 */
export async function pinAnalysisToVersion(
  deckId: string,
  userId: string,
  pinTo: CommitPin,
  deps: StoredProfileDeps = REQUEST_DEPS,
): Promise<void> {
  try {
    await computeAndStoreProfile(deckId, userId, deps, { pinTo });
  } catch (error) {
    console.warn("the committed version's analysis was not pinned", error);
  }
}
