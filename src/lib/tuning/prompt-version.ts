// Stored per run in deck_suggestion_runs.prompt_version and compared there — never hashed into
// the tuning fingerprint, so a prompt change reopens the gate as an improvement and never reads
// as the player having changed their deck. (PROFILE_VERSION cites this file as its precedent.)
// 2 (2026-09-23): up to five swaps, the `mix` citation, note dates in the log's form, and the
// bracket and result rules.
// 3 (2026-09-24): v2. The deck's own strategy and Key cards, universal staples, 4 to 5 swaps sized
// to the gap, and the rationale rules (chips never restated, no repeated opening, notes quoted).
// 4 (2026-10-03): the deck intent and every note are wrapped in `playerText`'s delimited data
// block, with the system rule naming the tags, so a player's own words can no longer read as an
// instruction. A deck with a successful run stored at an earlier version reopens the gate and
// runs again against the safer prompt rather than going on serving a suggestion generated before
// this boundary existed.
// 5 (2026-10-04, H35 PR 4a): "Propose up to 8 swaps" replaces "at most 5... fewer is better... an
// empty list is acceptable" — unconditional for every deck, unlike the limits rules below it,
// which stay absent (and so version-exempt) for a deck with none set.
export const PROMPT_VERSION = 5;
