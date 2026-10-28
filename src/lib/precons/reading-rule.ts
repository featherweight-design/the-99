/**
 * A precon's PRE-COMPUTED bracket reading (small items 5, PR 6a; the-99-d9's option (c), 2026-10-28).
 *
 * A start used to compute the deck's first reading in the arrival render (`computeAndStoreProfile`,
 * ~1.1s of a ~1.8s carry at the median). The reading is deterministic from the list, the catalog and
 * the role basis, with no model, so the precon Overview build computes it once per precon and stores it
 * on the `precon_synopses` row (the `reading_*` columns), the copy writes the TARGET's own, and a start
 * will copy it into `deck_profiles` (PR 6; until then a start computes its own in `after()`, as before).
 *
 * FRESH BY THE RULE A DECK'S OWN STORED READING KEEPS, never by the row's `current` (the Overview's):
 * the list it was built for, the profile and bracket-rules versions this code runs (`preconReadingCurrent`,
 * pure), and no change log entry touching its cards since the log head read before it was computed
 * (`readingMoved`, the H1 rule a press recomputes on; `preconReadingFresh` in `reading.ts`). NOT the
 * catalog generation: every ingest and every catalog copy stamps it (this build's own copy included), and
 * a deck's stored reading is never judged by it either; `reading_catalog` is kept as `deck_profiles.catalog`
 * keeps it. Once PR 6 copies it, a reading that is not fresh is never copied; the start then computes its own, as now.
 *
 * Pure (no database): the rules a build, a copy and a start share. The reader is `reading.ts`.
 */
import { BRACKET_RULES_VERSION } from "../bracket/rules-version";
import { slotDeck } from "../bracket/slot";
import type { DeckProfile } from "../profile/types";
import { PROFILE_VERSION } from "../profile/version";

/** The `reading_*` columns, as a build or a copy writes them. */
export type PreconReadingColumns = {
  reading: DeckProfile | null;
  readingPermits: number[] | null;
  readingList: string | null;
  readingCatalog: string | null;
  readingProfileVersion: number | null;
  readingRulesVersion: number | null;
  readingAnalyzedOracleIds: string[] | null;
  readingSeenSeq: number | null;
  readingAt: Date | null;
};

/** No reading: what a precon whose reading cannot be built (or a target that cannot build it) holds. */
export const NO_PRECON_READING: PreconReadingColumns = {
  reading: null, readingPermits: null, readingList: null, readingCatalog: null, readingProfileVersion: null,
  readingRulesVersion: null, readingAnalyzedOracleIds: null, readingSeenSeq: null, readingAt: null,
};

/**
 * Pure: the columns for a reading `profile` of the precon's `list`. `catalog` and `seenSeq` are the
 * generation and the change log head read BEFORE the profile was computed, as `computeAndStoreProfile`
 * reads them, so a log entry landing during the compute is past the mark and still reported.
 */
export function preconReadingColumns(input: {
  profile: DeckProfile;
  list: string;
  catalog: string;
  seenSeq: number;
  analyzedOracleIds: string[];
  at: Date;
}): PreconReadingColumns {
  return {
    reading: input.profile,
    readingPermits: [...slotDeck(input.profile).permits].sort((a, b) => a - b),
    readingList: input.list,
    readingCatalog: input.catalog,
    readingProfileVersion: PROFILE_VERSION,
    readingRulesVersion: BRACKET_RULES_VERSION,
    readingAnalyzedOracleIds: input.analyzedOracleIds,
    readingSeenSeq: input.seenSeq,
    readingAt: input.at,
  };
}

/** A stored reading, whole: every column a start copies is present. */
export type PreconReading = {
  profile: DeckProfile;
  permits: number[];
  list: string;
  catalog: string;
  profileVersion: number;
  rulesVersion: number;
  analyzedOracleIds: string[];
  seenSeq: number;
  at: Date;
};

/** Pure: the stored columns as a whole reading, or null when any is missing (never written, or cleared). */
export function preconReadingOf(c: PreconReadingColumns): PreconReading | null {
  if (!c.reading || !c.readingPermits || c.readingList === null || c.readingCatalog === null || c.readingProfileVersion === null
    || c.readingRulesVersion === null || !c.readingAnalyzedOracleIds || c.readingSeenSeq === null || !c.readingAt) return null;
  return {
    profile: c.reading, permits: c.readingPermits, list: c.readingList, catalog: c.readingCatalog,
    profileVersion: c.readingProfileVersion, rulesVersion: c.readingRulesVersion,
    analyzedOracleIds: c.readingAnalyzedOracleIds, seenSeq: c.readingSeenSeq, at: c.readingAt,
  };
}

/**
 * Pure: whether a stored reading is what an Analyze press would compute for a deck holding `list` now.
 * Its list and the profile and bracket-rules versions this code runs: any one moved and it is not. The
 * data under it is the other half (`preconReadingFresh`), which needs the change log.
 */
export function preconReadingCurrent(r: PreconReading | null, now: { list: string }): r is PreconReading {
  return !!r && r.list === now.list && r.profileVersion === PROFILE_VERSION && r.rulesVersion === BRACKET_RULES_VERSION;
}

/**
 * Pure: whether a build or copy must (re)write a row's reading: none stored, not current for the precon's
 * list and this code (`preconReadingCurrent`), or the data under it moved (`moved`, the caller's
 * `readingMoved` over the stored marks). An unchanged Overview hash never excuses it.
 */
export function preconReadingDue(c: PreconReadingColumns, now: { list: string; moved: boolean }): boolean {
  return !preconReadingCurrent(preconReadingOf(c), now) || now.moved;
}

