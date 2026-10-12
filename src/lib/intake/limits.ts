/**
 * The read's fixed numbers, in one place. Pure and client-safe: `src/lib/model/prices.ts`
 * prices the two steps from the models and ceilings below, and the form (PR 5) caps its field with
 * the words limit.
 *
 * `INTAKE_MODEL` and `INTAKE_MAX_TOKENS` are the RETIRED one-call read's. They stay only as the
 * base fields `FEATURE_CALLS` requires of every feature; `FEATURE_CALLS.intake.steps` prices every
 * reservation, so nothing is priced from them. The two-step read's models and ceilings are below
 * and in `prices.ts`.
 */
export const INTAKE_MODEL = "claude-sonnet-5";
export const INTAKE_MAX_TOKENS = 3_000;

/**
 * The most the player's words may run to. The Server Action refuses a longer press rather than
 * trimming it: a read of half the words is not the read the player asked for. The prompt's input
 * ceilings (`FEATURE_CALLS.intake` steps) leave room for the whole cap.
 */
export const READ_WORDS_MAX_CHARS = 800;

/**
 * The most RAW characters of the words the address or a submit may carry: the cap above on what is
 * drawn, plus room for the ids of the cards tagged in it (`[[<uuid>|Name]]` is 38 characters longer than
 * its name, and eight tags are far more than a read uses). The cap itself is on rendered text.
 */
export const READ_WORDS_URL_MAX = READ_WORDS_MAX_CHARS + 8 * 48;

/** A retry needs this much of the deadline left to finish one whole answer; less, and it fails. */
export const INTAKE_RETRY_FLOOR_MS = 40_000;

/** How often the results panel asks whether its read has settled. */
export const INTAKE_POLL_MS = 2_000;

/**
 * A pending read older than this was abandoned: the process that owned it is gone. The reaper fails
 * it as `interrupted` and refunds its unit, so the player's one-pending slot frees. Past the
 * deadline by a wide margin, so no live read is ever reaped.
 */
export const INTAKE_REAPER_CUTOFF_MS = 5 * 60 * 1000;

/**
 * THE READ (rework plan 2026-10-11, the orchestrator's ruling of the same day as Hugh's proxy): two
 * calls under one credit. The shortlist scans the whole commander list on Claude Haiku 5.5, whose
 * long-prompt rate is a fifth of Sonnet's; the judgement reads only the shortlist, on Claude Sonnet
 * 5.5 at medium, as the Overview does. The eval (PR 2) measures both and may move either.
 */
export const READ_SHORTLIST_MODEL = "claude-haiku-5-5";
/**
 * MEDIUM, measured (eval 2026-10-11, `scripts/eval/intake-read.mts`): at low, Haiku 5.5 returned no
 * keys at all inside a mono-black pool and five for an unfiltered Landfall ask, which the judgement
 * then found nothing in. At medium it shortlisted 16 to 39 for every ask the pool could answer and
 * the judgement kept 7 to 10 (3 and 2 for mono-blue Dinosaurs, a pool built to hold almost no fit),
 * for about $0.004 more a warm press. Its longest reply was 2,138 tokens and its slowest 9.8s.
 */
export const READ_SHORTLIST_EFFORT = "medium" as const;
/** Room for 40 keys and the thinking that picks them. */
export const READ_SHORTLIST_MAX_TOKENS = 4_000;
export const READ_JUDGE_MODEL = "claude-sonnet-5-5";
export const READ_JUDGE_EFFORT = "medium" as const;
/** Ten reasons of at most 140 characters each, plus medium thinking; the request streams. */
export const READ_JUDGE_MAX_TOKENS = 12_000;

/** How many commanders the shortlist asks for, and the fewest a reply may carry and still count. */
export const READ_SHORTLIST_SIZE = 40;
/** The top of the re-ordered list that carries a reason line. */
export const READ_TOP = 10;
/** A reason line's length, in characters, after the app has drawn any deck name into it. Over it,
 *  the row is refused, never cut (handoff, "The reason line"). */
export const READ_REASON_MAX_CHARS = 140;

/**
 * Both calls run inside the submit's `after()`, which the choose page's 120s `maxDuration` bounds.
 * The shortlist gets its own deadline so a slow first call leaves the judgement its share; the
 * judgement gets what is left of the whole.
 */
export const READ_SHORTLIST_DEADLINE_MS = 40_000;
export const READ_TOTAL_DEADLINE_MS = 110_000;
