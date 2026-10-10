// The Results card's figures (Stats card f + g): the record, every game as a bead oldest first with
// the last five marked, and the same by version. Pure over the games the page already reads
// (`listDeckGames`) and the versions it already reads (`listVersions`); no query of its own.

import { playRecord, type GameResult, type PlayRecord } from "./stats";

/** The trend marks the last five games, and only once there are more than five: before that the
 *  last five would be the whole record. */
export const LAST_FIVE = 5;

export type ResultBead = { result: GameResult; playedAt: Date; lastFive: boolean };

export type VersionResults = {
  /** Stable key: the version number, or `unrecorded`. */
  key: string;
  /** Null on the "Version not recorded" bucket. */
  number: number | null;
  current: boolean;
  committedAt: Date | null;
  /** Oldest first. */
  beads: GameResult[];
  /** Null with no games: the row says so instead of printing 0-0-0. */
  record: PlayRecord | null;
};

export type ResultsStats = {
  games: number;
  record: PlayRecord;
  /** Oldest first. Empty with no games. */
  beads: ResultBead[];
  /** The first and last game dates; null with no games. */
  span: { from: Date; to: Date } | null;
  /** The last five's record, once there are more than five games. */
  lastFive: PlayRecord | null;
  /** Newest version first, "Version not recorded" last. Null for a brew (no versions), where the
   *  section is absent as the Versions tab is. */
  versions: VersionResults[] | null;
};

type GameIn = { result: GameResult; playedAt: Date; versionNumber: number | null };
type VersionIn = { number: number; committedAt: Date };

/**
 * `games` NEWEST FIRST, as `listDeckGames` returns them (played-at, then created-at, descending):
 * reversing that read is what keeps two games on one date in the order they were logged.
 * `versions` NEWEST FIRST as `listVersions` returns them; the first is the current one.
 *
 * A game stamped with a version number the deck does not hold lands in "Version not recorded"
 * with the unstamped ones, so every game is in exactly one bucket and none is dropped.
 */
export function resultsStats(games: readonly GameIn[], versions: readonly VersionIn[]): ResultsStats {
  const oldestFirst = [...games].reverse();
  const n = oldestFirst.length;
  const beads = oldestFirst.map((g, i) => ({ result: g.result, playedAt: g.playedAt, lastFive: n > LAST_FIVE && i >= n - LAST_FIVE }));

  let versionRows: VersionResults[] | null = null;
  if (versions.length > 0) {
    const known = new Set(versions.map((v) => v.number));
    const rowFor = (key: string, number: number | null, current: boolean, committedAt: Date | null, mine: GameIn[]): VersionResults => ({
      key,
      number,
      current,
      committedAt,
      beads: mine.map((g) => g.result),
      record: mine.length > 0 ? playRecord(mine) : null,
    });
    versionRows = versions.map((v, i) =>
      rowFor(String(v.number), v.number, i === 0, v.committedAt, oldestFirst.filter((g) => g.versionNumber === v.number)),
    );
    const unrecorded = oldestFirst.filter((g) => g.versionNumber === null || !known.has(g.versionNumber));
    if (unrecorded.length > 0) versionRows.push(rowFor("unrecorded", null, false, null, unrecorded));
  }

  return {
    games: n,
    record: playRecord(games),
    beads,
    span: n > 0 ? { from: oldestFirst[0].playedAt, to: oldestFirst[n - 1].playedAt } : null,
    lastFive: n > LAST_FIVE ? playRecord(oldestFirst.slice(n - LAST_FIVE)) : null,
    versions: versionRows,
  };
}

/** `4–1–1`, with en dashes: wins, losses, draws. */
export function recordText(r: Pick<PlayRecord, "wins" | "losses" | "draws">): string {
  return `${r.wins}–${r.losses}–${r.draws}`;
}
