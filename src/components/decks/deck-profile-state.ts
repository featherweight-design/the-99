// The analysis tab's reading and the states it moves through, and the one rule the panel draws by: pure types and a pure
// function. The hook that fetches and holds them (`useDeckProfile`, which calls the profile actions) is `use-deck-profile.ts`,
// which re-exports these; this file imports no action, so the presentational panel can be read by a surface that may not
// reach one.

import type { BenchmarksWire } from "../../lib/benchmarks/wire";
import type { DeckProfile } from "../../lib/profile/types";

/** A reading the tab can draw: current, or HELD while stale, re-reading or refused. */
export type Reading = {
  profile: DeckProfile;
  /** An ISO instant, drawn as the bracket box's `analyzed {when}`. */
  analyzedAt: string;
  /** The list analyzed is the deck's, and no edit since. False draws the 2i banner. */
  fresh: boolean;
  /** The version the reading is pinned to, for `analyzed with version n`. */
  versionNumber: number | null;
  /** Its evidence benchmarks, or null (the read failed). Held with the reading. */
  benchmarks?: BenchmarksWire | null;
};

export type ProfileState =
  /** Never asked for. No request has been made and none should be until the reader asks. */
  | { kind: "idle" }
  /** A press in flight. `held` is the reading on screen when it was made, which stays (2i). */
  | { kind: "loading"; held: Reading | null; retry?: boolean }
  | ({ kind: "ready" } & Reading)
  /** The deck is absent or not this reader's. */
  | { kind: "missing" }
  /** The request itself failed. Distinct from `missing`: retrying is worth offering. Over a held
   *  reading this is 2d, and the reading stays whole. */
  | { kind: "failed"; held: Reading | null }
  /** The body is not a whole deck (ruling 1). A reading held from before stays. */
  | { kind: "illegal"; built: number; size: number; held: Reading | null };

/** The reading the tab draws in any state, held or current. */
export function shownReading(state: ProfileState): Reading | null {
  if (state.kind === "ready") return state;
  if (state.kind === "loading" || state.kind === "failed" || state.kind === "illegal") return state.held;
  return null;
}

/**
 * Whether the Tuning tab hands Suggested changes a reading (tool discovery B2): the shown reading, held through a
 * re-analysis, a failure or a refusal, and none while a first press still holds its loader (`hold`), so the tool stays
 * dimmed until the verdict paints. Hugh, 2026-10-14: Tuning stays put before, during and after an analysis.
 */
export function tuningReading(state: ProfileState, hold: "reading" | "writing" | null): Reading | null {
  return hold === null ? shownReading(state) : null;
}
