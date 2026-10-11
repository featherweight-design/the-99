/**
 * The deeper read's fixed numbers, in one place. Pure and client-safe: `src/lib/model/prices.ts`
 * prices every reservation from these, and the form (PR 5) caps its field with the words limit.
 *
 * The model, effort and output room are Hugh's ruling (plan, "The deeper read", 2026-09-25):
 * Sonnet 5 at low effort with the synopsis's 3,000 tokens, the one precedent measured at low.
 * Sonnet 5's adaptive thinking counts inside `max_tokens`, so the room is not cut below that.
 */
export const INTAKE_MODEL = "claude-sonnet-5";
export const INTAKE_EFFORT = "low" as const;
export const INTAKE_MAX_TOKENS = 3_000;

/**
 * The most the player's words may run to. The input ceiling in `FEATURE_CALLS` was MEASURED at this
 * length: 800 characters of the densest words (names and digits) with the whole vocabulary came to
 * 3,946 tokens against a ceiling of 6,000, so a press at the cap stays inside what its reservation
 * priced. Raising the cap means measuring again. The Server Action refuses a longer press rather
 * than trimming it: a read of half the words is not the read the player asked for.
 */
export const READ_WORDS_MAX_CHARS = 800;

/**
 * One deadline across both attempts. 3,000 tokens at the ~80 tokens a second tuning measured is
 * about 38s, so 100s leaves the retry room for one whole answer. It has to fit under the choose
 * page's `maxDuration` of 120s (PR 5), which bounds the Server Action, with the reserve before the
 * call and the settle after it in what is left.
 */
export const INTAKE_DEADLINE_MS = 100_000;

/** A retry needs this much of the deadline left to finish one whole answer; less, and it fails. */
export const INTAKE_RETRY_FLOOR_MS = 40_000;

/**
 * How long a press that found another look already running waits on it, polling, before it reads
 * as failed: the choose page's 120s `maxDuration`, which bounds the other look's own request.
 */
export const INTAKE_WAIT_MS = 120_000;
/** How often that waiting press asks whether the other look has settled. */
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
export const READ_SHORTLIST_EFFORT = "low" as const;
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
