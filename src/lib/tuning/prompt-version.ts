// Stored per run in deck_suggestion_runs.prompt_version and compared there — never hashed into
// the tuning fingerprint, so a prompt change reopens the gate as an improvement and never reads
// as the player having changed their deck. (PROFILE_VERSION cites this file as its precedent.)
// 2 (2026-09-23): up to five swaps, the `mix` citation, note dates in the log's form, and the
// bracket and result rules.
// 3 (2026-09-24): v2. The deck's own strategy and Key cards, universal staples, 4 to 5 swaps sized
// to the gap, and the rationale rules (chips never restated, no repeated opening, notes quoted).
export const PROMPT_VERSION = 3;
