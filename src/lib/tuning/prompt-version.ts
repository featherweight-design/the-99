// Stored per run in deck_suggestion_runs.prompt_version and compared there — never hashed into
// the tuning fingerprint, so a prompt change reopens the gate as an improvement and never reads
// as the player having changed their deck. (PROFILE_VERSION cites this file as its precedent.)
// 2 (2026-09-23): up to five swaps, the `mix` citation, note dates in the log's form, and the
// bracket and result rules.
export const PROMPT_VERSION = 2;
