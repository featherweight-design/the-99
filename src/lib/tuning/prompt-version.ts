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
// 6 (2026-10-05, H35 PR 4b): "one of six kinds" replaces "one of five kinds", and a new "A notes
// citation quotes..." line names the sixth — unconditional for every deck, like version 5's
// swaps-count change above it, never absent the way the limits/notes rules themselves are.
// 7 (2026-10-06): the `intent` and `notes` citation lines now say "Quote the player's whole
// line in quotation marks, or cite a part WITHOUT quotation marks" instead of the ambiguous
// "whole or a part of them" — the old wording let the model quote a part in quotation marks,
// which `presentationFailures` (`validate.ts`) now repairs to bare rather than drops, but a
// clearer instruction up front is cheaper than a repair downstream. The `note` citation line
// is untouched (it already asked for a verbatim quote, never "whole or a part"). Unconditional
// for every deck, like 5 and 6.
// 8 (2026-10-10, Tuning sub-project 8): two lists, Additions and Cuts, one rationale and one set
// of citations per card instead of one swap with one rationale. The reply shape moves from
// `suggestions[{add, cut}]` to `additions[]` and `cuts[]` (up to six apiece, five kept), so the
// system message's size line, the independence rule and the `oneCard` rule all change.
// Unconditional for every deck. A deck with a successful run stored at version 7 reopens the gate
// and can run again; its stored swaps stay on screen, drawn as the swap card, until it does.
// 9 (2026-10-12, model tiering): no wording change. The model moves from Sonnet 5 to Sonnet 5.5
// (`TUNING_MODEL`), whose answers differ in length and in what they choose, so a deck with a successful
// run stored at version 8 reopens the gate and can run again on the model now in use. The model is
// recorded per run but is not what the gate compares; this number is.
// 10 (2026-10-27, the lopsided run): the reply schema's citation kinds gain `focus`, for every deck, and a deck with a focus
// is told to cite it as `focus`, never as `intent`. With no kind for it the model filed the focus under `intent`, which a deck
// with no intent fails, and HD - Goblins lost all five additions. A deck with a run stored at version 9 reopens the gate.
// 11 (2026-11-01, US date order): a note's date is quoted month first, `Aug 26` and `Dec 31, 2025`, as the game log
// writes it, and the note citation line's example says so. The validator reads the same form. A deck with a run stored at
// version 10 reopens the gate.
export const PROMPT_VERSION = 11;

// Suggested changes v2's OWN number (plan 2026-10-27, P1), stamped on a v2 run beside v10's unchanged `PROMPT_VERSION`, and
// compared against a run of its own path. 11 (2026-10-27): the count and the two-call wording (additions, then cuts that make
// room for what is coming in; additions asked ceil(1.5N), and since then the first cut call ceil(1.5·min(N, K1)) for the K1
// additions kept, `cutPlanFor`, a sizing change that left the prompt text as it was), the refill's question, `notes` renamed
// `request`, the signal-trust order, and the bracket choice (`buildPromptV2`).
// 12 (2026-10-29): an owned-only run's additions are offered a second owned list, "Other cards the player owns that fit
// this deck's colors" (owned cards off the commander's index, ranked by its neighbour commanders), and told to prefer the
// first; the cut calls are sent neither owned list.
// 13 (2026-10-30, the cached prefix): every call of a run sends one identical prefix, the rules every call shares and then
// the deck's evidence, sent as a cached block; what a call says and another does not (its size, aim and bracket lines, the
// cut's narrowed result-claim rule, the additions' owned lists and the rule that names them, "Coming in", the refill) moves
// after it, under "This step". The owned-only rule in the shared part is the listless sentence for every call.
// 14 (2026-10-30, numbered lines): every ask (additions, cuts, both refills) adds "Number the lines 1 to {ask}; stop only
// after line {ask}." after "This step", and the one reply schema gains each line's `n`. A reply had closed its list early, far
// under its token cap (a cut call asked 30 stopped at 4); the number is a counting aid, never read. The cached prefix is unchanged.
// 15 (2026-11-01, US date order): the note citation's example date and every note's date read month first, `Aug 26`, as the
// game log does. The cached prefix changes with it.
export const PROMPT_VERSION_V2 = 15;
