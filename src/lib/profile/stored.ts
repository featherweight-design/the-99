import { and, eq, sql } from "drizzle-orm";

import { db } from "../../db";
import { deckProfiles, deckVersions, decks } from "../../db/schema";
import { BRACKET_RULES_VERSION } from "../bracket/rules-version";
import { slotDeck } from "../bracket/slot";
import { catalogGeneration } from "../cache/catalog-generation";
import { deckBodySize } from "../decks/deck-size";
import { newestVersion, versionCards } from "../decks/versions";
import { analyzedOracleIds, LOG_HEAD_SQL, readLogHead } from "../notices/log";
import { listFingerprint, profileFingerprint } from "./fingerprint";
import { cachedDeckProfile, loadDeckProfile, readProfileHead, type ProfileHead } from "./load";
import { noticesEnabled } from "../notices/flag";
import { readingMoved } from "../notices/read";
import { PROFILE_VERSION } from "./version";
import { roleBasisFromEnv } from "../decks/label-counts-flag";
import type { RoleBasis } from "./build";
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
  /**
   * The UNCACHED build, for every press (plan D9, and H1's recompute). `cachedDeckProfile` keys on the list and the
   * catalog generation, and neither moves for a log entry: the generation stamp is written at the
   * END of an ingest, is cached for a minute, and a rules bump never moves it. So a cache hit could
   * hand back the very reading a notice is about. Absent, `compute` stands in.
   */
  computeFresh?: (deckId: string, userId: string) => Promise<DeckProfile | null>;
};

const REQUEST_DEPS: StoredProfileDeps = {
  generation: catalogGeneration, compute: cachedDeckProfile, computeFresh: loadDeckProfile,
};

/** A stored reading, with whether it still describes the deck. */
export type StoredReading = {
  profile: DeckProfile;
  analyzedAt: Date;
  /** The same list as the deck's, and no edit since the analysis. */
  fresh: boolean;
  /** The version this reading was pinned to (by a commit, or by a press on an unchanged
   *  committed list), or null. */
  versionId: string | null;
  /** That version's number, for the date line's `analyzed with version n`. */
  versionNumber: number | null;
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
  if (!head) return { head: null, row: null, editedAt: null };
  // The EDIT STAMP, as text: `touchDeck` moves it on every list edit, so a write guarded on it
  // matches nothing once an edit has landed since this read. Text because the column is
  // microsecond-precise and a JS Date is not; round-tripped as a Date it would never match.
  const [stamp] = await tx
    .select({ editedAt: sql<string>`${decks.lastEditedAt}::text` })
    .from(decks)
    .where(eq(decks.id, deckId));
  const [row] = await tx
    .select({
      profile: deckProfiles.profile,
      fingerprint: deckProfiles.fingerprint,
      profileVersion: deckProfiles.profileVersion,
      dirty: deckProfiles.dirty,
      versionId: deckProfiles.versionId,
      versionNumber: deckVersions.number,
      computedAt: deckProfiles.computedAt,
      seenSeq: deckProfiles.seenSeq,
      rulesVersion: deckProfiles.rulesVersion,
      analyzedOracleIds: deckProfiles.analyzedOracleIds,
    })
    .from(deckProfiles)
    .leftJoin(deckVersions, eq(deckVersions.id, deckProfiles.versionId))
    .where(and(eq(deckProfiles.deckId, deckId), eq(deckProfiles.userId, userId)))
    .limit(1);
  return { head, row: row ?? null, editedAt: stamp?.editedAt ?? null };
}

/**
 * Whether the deployment counts roles on another basis than the one a stored reading was built
 * under (`LABEL_ROLE_COUNTS_ENABLED`, labels-everywhere PR 8). `PROFILE_VERSION` deliberately does
 * not move with the switch, so without this a press on an unchanged list would answer from the
 * store and the reading would keep its old basis (a flip on, or a rollback) until the list was
 * edited. Like a moved change log, it makes a PRESS recompute; a commit's pin and a quiet rebuild
 * keep ruling 5's shortcut.
 */
export function storedBasisMoved(
  profile: Pick<DeckProfile, "skeleton"> | null | undefined,
  basis: RoleBasis = roleBasisFromEnv(),
): boolean {
  return (profile?.skeleton?.roleBasis ?? "classifier") !== basis;
}

/**
 * Whether a PRESS on a list whose reading is stored must recompute instead of answering from the
 * store (ruling 5's shortcut): the role basis moved (`storedBasisMoved`), or, behind the notices
 * switch, the change log moved under the reading (H1). Only a press; a commit's pin and a quiet
 * rebuild never recompute for either.
 */
export async function pressMustRecompute(args: {
  isPress: boolean;
  sameAnswer: boolean;
  storedProfile: Pick<DeckProfile, "skeleton"> | null | undefined;
  noticesOn: boolean;
  logMoved: () => Promise<boolean>;
}): Promise<boolean> {
  if (!args.isPress || !args.sameAnswer) return false;
  if (storedBasisMoved(args.storedProfile)) return true;
  return args.noticesOn ? args.logMoved() : false;
}

/**
 * Whether the stored row describes the deck's current list. A row written before migration 0054
 * (`profile_version` 0) stored `profileFingerprint`, which carries the version it was built at;
 * every later row stores `listFingerprint`. A legacy row built under an older version than the
 * current one cannot be compared, and reads as a different list.
 */
export function sameList(row: { profileVersion: number; fingerprint: string }, head: ProfileHead): boolean {
  return row.profileVersion === 0
    ? row.fingerprint === profileFingerprint(head)
    : row.fingerprint === listFingerprint(head);
}

/** The newest version's id when it holds exactly `list`, else null. A version never changes after
 *  it is written, so reading it apart from the head is safe: the comparison is against the list the
 *  caller already read. */
async function versionHolding(deckId: string, list: string): Promise<{ id: string; number: number } | null> {
  const version = await newestVersion(deckId);
  if (!version) return null;
  const cards = await versionCards(version.id);
  const held = listFingerprint({
    commanderOracleId: version.commanderOracleId,
    partnerOracleId: version.partnerOracleId,
    cards,
  });
  return held === list ? { id: version.id, number: version.number } : null;
}

const SNAPSHOT = { isolationLevel: "repeatable read" } as const;

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
  const { head, row } = await db.transaction((tx) => readHeadAndRow(tx, deckId, userId), SNAPSHOT);
  if (!head || !row) return null;
  // A row a NEWER deployment wrote is a document this code cannot read, and never rebuilds: it
  // reads as nothing here until the newer code serves the request (see REBUILD RULES).
  if (row.profileVersion > PROFILE_VERSION) return null;
  if (row.profileVersion < PROFILE_VERSION) {
    // Rebuilt only over the list the reader analyzed. `dirty` alone cannot say so: a row written
    // before this column existed arrives clean however the deck was edited before the deploy.
    if (row.dirty || !deckLegality(head).legal || !sameList(row, head)) return null;
    // Rebuilt ONLY over the list this read saw, and keeping its pin: a version bump changes the
    // document, never which version the list belongs to.
    const rebuilt = await computeAndStoreProfile(deckId, userId, deps, {
      rebuildOf: {
        list: listFingerprint(head), versionId: row.versionId, versionNumber: row.versionNumber,
        marks: {
          seenSeq: row.seenSeq, rulesVersion: row.rulesVersion,
          analyzedOracleIds: row.analyzedOracleIds,
        },
      },
    });
    return rebuilt?.kind === "ok" ? { ...rebuilt.reading } : null;
  }
  return {
    profile: row.profile,
    analyzedAt: row.computedAt,
    fresh: sameList(row, head) && !row.dirty,
    versionId: row.versionId,
    versionNumber: row.versionNumber,
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

/** What a quiet rebuild carries over from the row it replaces (plan D4). */
export type RebuildMarks = { seenSeq: number; rulesVersion: number; analyzedOracleIds: string[] };

export type AnalyzeResult =
  | { kind: "ok"; reading: StoredReading }
  /** The body is not `deckBodySize` (ruling 1). Nothing was computed or written. */
  | { kind: "illegal"; built: number; size: number };

/**
 * Analyze the deck: answer from the store when the list is the one already analyzed, compute and
 * store otherwise. Null when the deck is not the reader's.
 *
 * `pinTo` is passed by a commit (ruling 2), which pins the reading to the version it just wrote.
 * The pin answers from the store when the list is unchanged, so a commit of a deck analyzed a
 * moment ago costs one UPDATE. It never analyzes a list nobody pressed Analyze on (H32): a reading
 * of another list is left stale and unpinned, and the only pin that computes is the rebuild of a
 * reading of this same list under an older `PROFILE_VERSION`.
 *
 * The WRITE is best-effort: a failed write must not take the verdict the reader asked for down
 * with it, so it is caught and the profile returned.
 */
export async function computeAndStoreProfile(
  deckId: string,
  userId: string,
  deps: StoredProfileDeps = REQUEST_DEPS,
  {
    pinTo,
    rebuildOf,
  }: {
    pinTo?: CommitPin;
    /** A quiet rebuild of a row an older PROFILE_VERSION wrote: the list the reader's read saw, and
     *  the pin it held. Written only over that list, and the pin is kept. So are the deck notices
     *  marks and the analysis date (`marks`): a rebuild is a deploy's, not the player's, and must
     *  not swallow a pending notice or read as a new analysis (brief §6, readiness F4). */
    rebuildOf?: {
      list: string; versionId: string | null; versionNumber: number | null;
      marks: RebuildMarks;
    };
  } = {},
): Promise<AnalyzeResult | null> {
  const { head, row, editedAt } = await db.transaction((tx) => readHeadAndRow(tx, deckId, userId), SNAPSHOT);
  if (!head) return null;
  const legality = deckLegality(head);
  if (!legality.legal) return { kind: "illegal", built: legality.built, size: legality.size };

  const list = listFingerprint(head);
  // A PIN IS FOR THE LIST THE COMMIT WROTE. An edit landing between the commit and this read has
  // moved the deck off that version, and pinning the edited list to it would claim the version
  // was analyzed as something it never held. So nothing is written, and the next press analyzes
  // the draft as a draft.
  if (pinTo && pinTo.list !== list) return null;
  // And the same for a rebuild: an edit landing after the read that decided on it is not analyzed.
  if (rebuildOf && rebuildOf.list !== list) return null;
  // A REBUILD THAT ARRIVES TO A CURRENT ROW IS ALREADY SUPERSEDED (REBUILD RULES 3, round 11): a
  // press wrote this version between the reader's read and this snapshot. Taking the same-answer
  // shortcut below would hand `clearDirty` the rebuild's old pin over the press's own.
  if (rebuildOf && row && row.profileVersion >= PROFILE_VERSION) {
    const current = await readStoredReading(deckId, userId, deps);
    return current ? { kind: "ok", reading: current } : null;
  }
  // ONLY THE NEWEST VERSION IS PINNED. Two commits' `after()` pins can run out of order, and the
  // older one landing last would name the wrong version. Checked here and again in the write.
  if (pinTo && (await newestVersion(deckId))?.id !== pinTo.versionId) return null;
  // A PRESS NAMES ITS VERSION when the draft IS the newest version (build amendment, 2026-09-23):
  // a reading of an unchanged committed list is that version's reading. It also repairs a commit
  // whose `after()` pin failed, and names versions committed before the pin existed.
  const holding = pinTo || rebuildOf ? null : await versionHolding(deckId, list);
  const versionId = pinTo?.versionId ?? rebuildOf?.versionId ?? holding?.id ?? undefined;
  const versionNumber = holding?.number ?? rebuildOf?.versionNumber ?? null;
  const stillNewest = (pinTo || holding) && versionId ? isNewestVersion(deckId, versionId) : sql`true`;

  // H1 (Hugh, 2026-09-24): a PRESS on an unchanged list recomputes when the data under the reading
  // moved: a change log entry touches it (plan D5, D8). Only a press: a commit's pin and a quiet
  // rebuild keep ruling 5's shortcut, so a commit never moves the held bracket. With nothing
  // pending, the press answers from the store exactly as before.
  const isPress = !pinTo && !rebuildOf;
  const sameAnswer = row && row.profileVersion === PROFILE_VERSION && row.fingerprint === list;
  // A COMMIT ONLY PINS A READING OF THE LIST IT WROTE (H32, Hugh's walk). When the stored reading
  // describes another list, the commit leaves it stale and unpinned: computing here would re-analyze
  // the new list behind the player's back and draw it fresh, so the banner offering the press never
  // shows. The next press names this version through `versionHolding`.
  //
  // THE LIST, NOT THE VERSION. A reading of this list under an older `PROFILE_VERSION` (a deploy
  // landing between the press and the commit) falls through and is rebuilt and pinned, because a
  // version bump is not an edit: the player analyzed this list, and the reading stays theirs.
  // `sameList`, not a raw comparison: a row written before migration 0054 stores
  // `profileFingerprint` rather than `listFingerprint`, and is this list all the same.
  if (pinTo && (!row || !sameList(row, head))) return null;
  // A pin never touches a row a newer deployment wrote (REBUILD RULES).
  if (pinTo && row && row.profileVersion > PROFILE_VERSION) return null;
  // REBUILD RULES, the one statement of what a rebuild may overwrite (PR #1164, rounds 2 to 8,
  // each of which found one edge of this). A rebuild is a deploy's work, never the player's, so:
  //  1. It replaces only a row of THE SAME LIST at a LOWER `PROFILE_VERSION`. A row a newer
  //     deployment wrote is never rebuilt, read or pinned by older code (round 8).
  //  2. It keeps that row's marks, its date (round 2) and its `dirty` flag (round 7): only a
  //     press stamps a new analysis, and only `clearDirty`, under the edit stamp, clears dirty.
  //  3. Its write is guarded on rule 1 IN THE WRITE, since a press can land while it computes
  //     (round 4). A guarded write that matches nothing stores nothing, and the rebuild answers
  //     with the row the store holds, never with its own discarded result (round 5); a write
  //     that lands answers with the freshness it wrote, kept dirt included (round 10).
  // Two entry points take these rules: the quiet rebuild (`readStoredReading`, which hands over
  // `rebuildOf`) and a commit's pin over this list's older-version reading, which differs from
  // the quiet rebuild only in the pin it writes.
  const kept: RebuildMarks | null = rebuildOf?.marks
    ?? (pinTo && row && row.profileVersion < PROFILE_VERSION
      ? { seenSeq: row.seenSeq, rulesVersion: row.rulesVersion, analyzedOracleIds: row.analyzedOracleIds }
      : null);
  // Behind the notices switch (Hugh's release ruling): off, a press keeps ruling 5 unamended.
  const dataMoved = await pressMustRecompute({
    isPress,
    sameAnswer: Boolean(row && sameAnswer),
    storedProfile: row?.profile,
    noticesOn: noticesEnabled(),
    // Read only when nothing cheaper already said yes, and only for a row that exists.
    logMoved: () => readingMoved({
      seenSeq: row!.seenSeq,
      rulesVersion: row!.rulesVersion,
      // An empty list is a legacy row (schema note), read as the list this press is guarded to.
      analyzedOracleIds: row!.analyzedOracleIds.length > 0 ? row!.analyzedOracleIds : analyzedOracleIds(head),
      commanderOracleIds: [head.commanderOracleId, ...(head.partnerOracleId ? [head.partnerOracleId] : [])],
    }),
  });

  // RULING 5: the same list, under the same code, and the same data (H1), is the same answer. Clear
  // `dirty` (and take the commit's pin) on the row as it stands, guarded on the fingerprint and
  // version it was read at AND on the deck's edit stamp: an edit landing after that read — even one
  // undone back to the same list — moves the stamp, and the clear matches nothing.
  if (row && sameAnswer && !dataMoved) {
    let cleared = false;
    try {
      cleared = await clearDirty(deckId, list, editedAt, versionId, stillNewest);
    } catch (error) {
      console.warn("deck profile's dirty flag not cleared", error);
    }
    // THE ANSWER IS WHAT WAS WRITTEN. A clear that matched nothing (an edit since the read, or a
    // same-list commit that made the held version no longer the newest) left the row as it was,
    // and the reader is told what the row now says rather than what this press hoped to write.
    if (!cleared) {
      const now = await readStoredReading(deckId, userId, deps);
      return {
        kind: "ok",
        reading: now ?? {
          profile: row.profile, analyzedAt: row.computedAt, fresh: false,
          versionId: row.versionId, versionNumber: row.versionNumber,
        },
      };
    }
    return {
      kind: "ok",
      reading: {
        profile: row.profile,
        analyzedAt: row.computedAt,
        fresh: true,
        versionId: versionId ?? row.versionId,
        versionNumber: versionId ? versionNumber : row.versionNumber,
      },
    };
  }

  // THE GENERATION IS READ BEFORE THE BUILD, never after it. `cachedDeckProfile` keys on the
  // generation it reads itself, and reads are monotonic, so the one read here is never newer than
  // the catalog the profile was built against.
  const catalog = await deps.generation();
  // THE LOG HEAD TOO, and for the same reason (plan D3): an entry published while this computes
  // is past the mark and still reported. A rebuild keeps the mark it replaced.
  // Unreadable (null): the write takes the head in its own statement, which errs towards quiet.
  const seenSeq = kept ? kept.seenSeq : await readLogHead(db);
  const seenSeqValue = seenSeq ?? sql`(${LOG_HEAD_SQL})`;
  // A PRESS NEVER TAKES THE CACHE. It stamps the reading as past every entry and under the current
  // rules, and the cache key carries neither the log head nor the rules version: a press on a list
  // analyzed before a rules bump or an entry (edit away, edit back) would otherwise store the old
  // answer under the new marks and clear the notice over a verdict that never saw it. A pin and a
  // quiet rebuild keep their marks, so the cache stays theirs.
  const profile = isPress
    ? await (deps.computeFresh ?? deps.compute)(deckId, userId)
    : await deps.compute(deckId, userId);
  if (!profile) return null;
  let analyzedAt = new Date();
  // What the row says about freshness once written. A rebuild keeps the row's `dirty` (REBUILD
  // RULES 2), so an edit landing while it computed is stale in the store and must be in the answer.
  let writtenDirty = false;
  // THE PIN IS WRITTEN SEPARATELY, after the row, when it names a version that must still be the
  // newest (a commit's, or the version a press found holding the list). That check needs the
  // commit's own lock and a snapshot taken after it, which the row's repeatable-read write
  // cannot give it; `clearDirty` takes both. A rebuild keeps the pin it held, as it was.
  const pinLater = Boolean(versionId && (pinTo || holding));
  let pinned: string | null = pinLater ? null : versionId ?? null;
  let stored = false;
  // A rebuild whose guarded upsert matched nothing: a press wrote the current version while it
  // computed. Set only when the write RAN, never for a head that moved or a write that threw.
  let superseded = false;
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
      // An EMPTY analyzed list is a legacy row, never a real one (every deck holds its commander):
      // a pre-0058 deployment still serving during the cutover writes readings with the columns'
      // defaults, which the migration's backfill ran too early to see. A rebuild fills the list
      // from the list it was guarded to (the same list, `rebuildOf.list`) rather than carrying
      // an empty one forward, which would match no card-scoped entry ever again.
      const marks = kept
        ? {
            ...kept,
            analyzedOracleIds: kept.analyzedOracleIds.length > 0
              ? kept.analyzedOracleIds
              : analyzedOracleIds(now),
          }
        : { seenSeq: seenSeqValue, rulesVersion: BRACKET_RULES_VERSION, analyzedOracleIds: analyzedOracleIds(now) };
      const [written] = await tx
        .insert(deckProfiles)
        .values({
          deckId, userId, fingerprint, catalog, profile, permits,
          profileVersion: PROFILE_VERSION, dirty: false, versionId: pinned,
          seenSeq: marks.seenSeq, rulesVersion: marks.rulesVersion, analyzedOracleIds: marks.analyzedOracleIds,
        })
        .onConflictDoUpdate({
          target: deckProfiles.deckId,
          set: {
            userId, fingerprint, catalog, profile, permits,
            profileVersion: PROFILE_VERSION,
            // A REBUILD KEEPS THE ROW'S `dirty` (review round 7). An edit away and back to this
            // list while it computes leaves the head fingerprint matching, so only the flag
            // records it; `clearDirty`, which checks the edit stamp, is the one write that clears
            // it, and it takes a commit's pin with it.
            dirty: kept ? sql`${deckProfiles}.dirty` : false,
            // A commit's pin, a rebuild's kept pin, or none: a press's recompute describes a list
            // that differs from the one any earlier pin was for.
            versionId: pinned,
            seenSeq: marks.seenSeq,
            rulesVersion: marks.rulesVersion,
            analyzedOracleIds: marks.analyzedOracleIds,
            // A rebuild keeps the date of the analysis it replaced (readiness F4), so `since
            // analyzed` is the player's press and never the deploy's.
            // The row's own column, not a value read back through JS: the column is
            // microsecond-precise and a Date is not, so a carried value would move the date.
            computedAt: kept ? sql`${deckProfiles}.computed_at` : sql`now()`,
          },
          // A REBUILD REPLACES ONLY AN OLDER VERSION'S ROW. It carries that row's marks and date,
          // and a press of the same list can land while it computes (review round 4): the press
          // wrote the current version, and a rebuild finishing after it would put the old marks
          // and date back over a reading the player asked for. Matching nothing, it stores nothing.
          ...(kept ? { setWhere: sql`${deckProfiles.profileVersion} < ${PROFILE_VERSION}` } : {}),
        })
        .returning({ computedAt: deckProfiles.computedAt, dirty: deckProfiles.dirty });
      if (written) {
        analyzedAt = written.computedAt;
        writtenDirty = written.dirty;
        stored = true;
      } else if (kept) {
        superseded = true;
      }
    }, { isolationLevel: "repeatable read" });
    if (stored && pinLater && (await clearDirty(deckId, list, editedAt, versionId, stillNewest))) {
      pinned = versionId ?? null;
      writtenDirty = false;
    }
  } catch (error) {
    console.warn("deck profile not stored; the next tab open will offer the press again", error);
  }
  // THE PRESS WON (review round 5): answer with the reading the store holds, never the computation
  // the guard just discarded. The row is at the current version now, so this read cannot rebuild.
  if (superseded) {
    const current = await readStoredReading(deckId, userId, deps);
    return current ? { kind: "ok", reading: current } : null;
  }
  return {
    kind: "ok",
    reading: { profile, analyzedAt, fresh: !writtenDirty, versionId: pinned, versionNumber: pinned ? versionNumber : null },
  };
}

/** The guard a pin carries: `versionId` is still the deck's newest version. */
export function isNewestVersion(deckId: string, versionId: string) {
  return sql`${versionId}::uuid = (
    select dv.id from deck_versions dv where dv.deck_id = ${deckId}::uuid
    order by dv.number desc limit 1)`;
}

/**
 * Clear `dirty` (and take a pin) on a row that already describes `list`, but only if the deck's
 * edit stamp is still `editedAt`: an edit since that read, even one undone back to the same list,
 * moves the stamp and this matches nothing. Exported so `probe:profile-store` can land an edit in
 * the window between the read and this write, which no caller exposes.
 */
export async function clearDirty(
  deckId: string,
  list: string,
  editedAt: string | null,
  versionId?: string,
  stillNewest = sql`true`,
): Promise<boolean> {
  return db.transaction(async (tx) => {
    // THE COMMIT'S OWN LOCK. `commitVersion` takes the deck row FOR UPDATE, so holding it FOR SHARE
    // waits out a commit in flight and holds off the next one until this ends. Under read
    // committed the update below then reads every version committed before it, which is what
    // `stillNewest` needs: a snapshot older than the lock would miss the version it guards against.
    await tx.select({ id: decks.id }).from(decks).where(eq(decks.id, deckId)).for("share");
    const written = await tx
      .update(deckProfiles)
      .set({ dirty: false, ...(versionId ? { versionId } : {}) })
      .where(and(
        eq(deckProfiles.deckId, deckId),
        eq(deckProfiles.fingerprint, list),
        eq(deckProfiles.profileVersion, PROFILE_VERSION),
        sql`exists (select 1 from ${decks} d where d.id = ${deckId}::uuid
          and d.last_edited_at::text = ${editedAt})`,
        stillNewest,
      ))
      .returning({ deckId: deckProfiles.deckId });
    return written.length > 0;
  });
}

/**
 * Pin the reading to the version a commit just wrote (ruling 2), best-effort and off the commit's
 * path: it runs in `after()`, so the commit answers without waiting on it. It pins a reading of
 * the committed list only (H32); the one case that analyzes is a reading of that list under an
 * older `PROFILE_VERSION`, which a 630ms-to-2.2s rebuild replaces. A deck the commit left illegal
 * (a later version may be any size) is not analyzed at all.
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
