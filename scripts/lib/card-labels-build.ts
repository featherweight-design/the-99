// The label build itself, as a module the entry script and a probe can both call.
//
// It lived inside `scripts/build-card-labels.ts`, which ran `main()` at module scope and built its
// Anthropic client there, so the only way to exercise the wave logic was to spend money. The
// collect-and-publish path is exactly the part that cost money to get wrong — a run stopped at its
// cap published nothing, and a new run id re-paid for everything the stopped one had staged — so
// it has to be provable against a real Postgres with a fake provider. The client is therefore a
// PARAMETER (`BuildOptions.client`): the entry script passes the real one, `probe:card-labels-waves`
// passes a fake, and nothing in a normal run can reach the fake.
//
// Three properties carry the money, and each one exists because something already went wrong:
//
//   THE CAP binds on the worst case plus what the run's BUDGET FAMILY already spent, never on the
//   estimate. See `withinCap` and `familySpend`; a family rather than a run id, because a fresh
//   run id used to be a fresh cap.
//
//   RESUME is against INTENTS, not batch ids. Anthropic assigns `batch_id` only when
//   `batches.create` RETURNS, so an intent goes down first with a null id and the id is filled
//   in after; one provider batch holds every chunk of a wave, so that id is shared; and the
//   `custom_id`s embed a run token, or a recovery listing the provider's batches matches an
//   earlier run's request and either adopts a stale result or re-pays for a finished chunk.
//   An intent's key is its CONTENT (`chunkHash`), so a shifted card set re-plans rather than
//   refusing, and any run id may collect another's paid batch.
//
//   THE FLOOR is evaluated PER BATCH, in the transaction that publishes it. A batch whose
//   returned share falls under the floor publishes nothing, keeps its staged rows, and stops the
//   run non-zero before anything else is submitted — because a partly-labelled batch is
//   indistinguishable from a complete one to every reader, which is what #704 cost on the
//   printings denominators.
import type Anthropic from "@anthropic-ai/sdk";
import { and, eq, inArray, isNotNull, or, sql } from "drizzle-orm";

import { db } from "../../src/db";
import { cardLabelBatches, cardLabels, cardLabelsStaging } from "../../src/db/schema";
import { readReply, withoutRepeats } from "../../src/lib/labels/parse";
import {
  CARDS_PER_REQUEST, MEASURED_PER_CARD, budgetFamily, familySpend, meetsFloor, pauseRemediation, planChunks, waveSize,
  projectedTotalUsd, withinCap, worstCaseUsd,
  type Chunk, type FamilySpend,
} from "../../src/lib/labels/plan";
import {
  buildRequest, labelInputHash, LABEL_PROMPT_VERSION, MAX_TOKENS_CEILING, MAX_TOKENS_PER_BATCH, renderBody,
  SENDS_CACHE_BREAKPOINT, SYSTEM_TOKENS_BOUND,
} from "../../src/lib/labels/prompt";
// `CardRow` comes from the same module as the read that returns it — two structurally identical
// row types drift, and the day one gains a field the other lacks the shared helper silently stops
// satisfying this script.
import type { CardRow } from "../../src/lib/labels/publish";
import { publishWave, readCardsByName, stampWave } from "../../src/lib/labels/publish";
import { type LabelScope, scopeCondition, scopeDeck } from "../../src/lib/labels/scope";
import { labelTrialPool } from "../../src/lib/swaps/gather";
import { listScopeIds } from "./label-list";
import type { Job } from "../../src/lib/labels/types";
import { ALL_MODELS, PRICING } from "./card-labels-pricing.mjs";

/** The four provider calls a run makes, and nothing else — what a probe's fake has to answer. */
export type BatchClient = Pick<Anthropic["messages"]["batches"], "create" | "retrieve" | "results" | "list">;

/** Sonnet 4.5, Hugh's pick (2026-09-26), chosen on the restriction family rather than price. */
export const MODEL = process.env.LABEL_MODEL ?? "claude-sonnet-4-5";

/**
 * Batch rates for the model actually selected, and a REFUSAL for one this repository has no
 * canonical rate for.
 *
 * `LABEL_MODEL` is configurable and the rates were hardcoded to Sonnet 4.5's, so selecting Haiku
 * produced projections and wave sizes computed from a model three times its price — and an
 * unknown model would have been priced as Sonnet 4.5 and invalidated the cap outright. The rates
 * come from `card-labels-pricing.mjs`, which `card-labels-pricing.test.mts` ties to
 * `scripts/eval/lib/pricing.mts` at batch rates, so there is no third copy of a price here.
 */
const MODEL_KEY = (Object.entries(ALL_MODELS) as [keyof typeof PRICING, string][])
  .find(([, id]) => id === MODEL)?.[0];
if (MODEL_KEY === undefined) {
  throw new Error(
    `LABEL_MODEL="${MODEL}" has no canonical rate. Known: ${Object.values(ALL_MODELS).join(", ")}. `
    + `Refusing rather than pricing an unknown model at another model's rates, which would make `
    + `the spend cap meaningless.`,
  );
}
// The instruction block is booked at the cache WRITE rate whenever a breakpoint is sent, because no
// request is guaranteed a warm cache (`SENDS_CACHE_BREAKPOINT`). Whatever `caches` recorded for an older,
// shorter block: a bound must not rest on a measurement of a different prompt.
const ratesFor = (key: keyof typeof PRICING) => ({
  in: PRICING[key].in, out: PRICING[key].out,
  ...(SENDS_CACHE_BREAKPOINT ? { system: PRICING[key].cacheWrite } : {}),
});
export const RATES = ratesFor(MODEL_KEY);


/**
 * The input figures the WORST CASE is booked on, and both are CEILINGS rather than averages.
 *
 * This matters more than it looks: `waveSize` and `withinCap` bound Hugh's hard stop on
 * these numbers, so a figure that is merely typical makes the bound merely typical too.
 *
 * `SYSTEM_TOKENS` is `SYSTEM_TOKENS_BOUND`, one token per character of the block as it is NOW. It was
 * the BILLED 1,215, measured on the block before the vocabulary plan's Task 2 widened it, and a
 * measurement of an older string is no ceiling on a longer one. Task 6 re-measures it.
 *
 * `PER_CARD_TOKENS` is the MAXIMUM a commander-legal card renders to, measured over all 31,830
 * of them: 892 characters. ONE TOKEN PER CHARACTER for the variable text, which is a provable
 * upper bound rather than an estimate: no tokenizer emits more tokens than the string has
 * characters. `892 / 4` was the first version and it is not a maximum — four characters a token
 * is an AVERAGE, and punctuation, short fragments and non-Latin text all beat it. It costs almost
 * nothing to be this conservative: input is a small share of the worst case.
 */
const SYSTEM_TOKENS = SYSTEM_TOKENS_BOUND;
const PER_CARD_TOKENS = 892;

/**
 * The body's own fixed text, DERIVED from `renderBody` rather than estimated: the
 * "Label these N cards." line plus the `---` separators between them. Measured by rendering a
 * full request of empty cards, so what is left is exactly the wrapper.
 */
const BODY_OVERHEAD_TOKENS = renderBody(
  Array.from({ length: CARDS_PER_REQUEST }, () => ({
    name: "", mana_cost: null, type_line: "", oracle_text: null, layout: "normal",
  })),
).length; // characters, for the reason above

const requestWorstFor = (rates: typeof RATES, maxTokens: number) => worstCaseUsd(
  1, SYSTEM_TOKENS, PER_CARD_TOKENS, maxTokens, rates, BODY_OVERHEAD_TOKENS,
);
/** One request's worst case at THIS run's ceiling: what a wave is sized by. */
export const REQUEST_WORST_USD = requestWorstFor(RATES, MAX_TOKENS_PER_BATCH);
/**
 * What an EXPIRED request is reserved at: the worst case at `MAX_TOKENS_CEILING`, which no request can
 * exceed. Not this run's ceiling, because the request that expired was sent by an earlier invocation
 * that may have run under a different `LABEL_MAX_TOKENS`.
 */
const expiredReserveFor = (rates: typeof RATES) => requestWorstFor(rates, MAX_TOKENS_CEILING);

/**
 * EXIT CODES, because a caller must not have to read prose to know what happened.
 *
 * The weekly workflow polls this script, and it decided success by pattern-matching stdout — which
 * produced three separate findings in three rounds. The coupling itself is the defect, because
 * every message this script prints is then load-bearing for a caller's control flow.
 *
 *   0   done — published, or nothing was stale
 *   75  MORE WORK: a wave went out, or batches are still processing. Call again with the same
 *       LABEL_RUN_ID. (75 is EX_TEMPFAIL — "try again", not a failure.)
 *   1   stop and look: refused, paused, held below the floor, or nothing labelable
 */
export const EXIT_DONE = 0;
export const EXIT_MORE_WORK = 75;
export const EXIT_STOP = 1;

/**
 * The statuses in which an intent's request may still be paid for and answered: not yet resolved
 * one way or the other. Planning never asks about a card inside one of these, from ANY run, so
 * nothing is asked twice while a batch is processing.
 *
 * Narrower than "not collected and not expired" on purpose. `failed` is a batch whose every
 * request errored — answered, unbilled, and its cards are owed a retry. `abandoned` is an intent
 * whose id was lost past the provider's listing: a run that meets one of its own refuses and tells
 * the operator to relabel under a new run id, which only works if a new run id is allowed to plan
 * those cards. Treating either as open would strand its cards for ever.
 */
const OPEN_STATUSES = ["intended", "submitted", "in_progress"];

export type BuildOptions = {
  /** The provider's batch API. The real client in a run; a fake in `probe:card-labels-waves`. */
  client: BatchClient;
  /** A run id that sorts and is readable; the run TOKEN in each custom id derives from it. */
  runId: string;
  capUsd: number;
  reportAtUsd: number;
  floor: number;
  /** The highest report line a dispatch can ask for, so a pause can say whether one can resume. */
  dispatchCeilingUsd: number;
  dryRun: boolean;
  /** Which cards the run labels (`LABEL_SCOPE`); `src/lib/labels/scope.ts` states the trade. */
  scope: LabelScope;
  /**
   * PROBE-ONLY: restrict the run to these oracle ids. A probe cannot let a run plan the whole
   * catalog, and filtering the read is the narrowest seam — every rule after it runs unchanged.
   * The entry script never sets it.
   */
  onlyOracleIds?: readonly string[];
  /**
   * PROBE-ONLY: called inside each collect transaction after everything is written and before it
   * commits, so a probe can crash a collect at its worst moment and prove the commit is atomic.
   */
  hooks?: { beforeCommit?: (batchId: string) => void | Promise<void> };
};

/** A refusal: printed, and the run exits 1. Thrown so a probe sees an exit code, not an exit. */
class Refusal extends Error {}
const refuse = (why: string): never => { throw new Refusal(why); };

/**
 * Cards that need labelling: Commander-legal, and whose stored hash does not match what
 * their current inputs produce.
 *
 * ORDERED, so an unchanged stale set chunks the same way on every invocation and an unfinished
 * chunk reproduces its own content-addressed key.
 */
/**
 * A card to label, with how many catalog rows share its name. Counted over the WHOLE `cards` table,
 * because a reply is matched by name: a sibling outside this run's set (another scope, an already
 * current label, a deck trial's pool) is still a row the reply could belong to.
 */
type StaleCard = CardRow & { nameRows: number };

async function cardsNeedingLabels(scope: LabelScope, only: readonly string[] | undefined): Promise<StaleCard[]> {
  const deckId = scopeDeck(scope);
  const trial = deckId !== null ? await labelTrialPool(deckId) : listScopeIds(scope);
  if (deckId !== null && trial === null) throw new Error(`LABEL_SCOPE names deck ${deckId}, which does not exist`);
  if (trial !== null) console.log(`  ${scope}: ${trial.length} card(s) in its trial pool`);
  const rows = await db.execute<StaleCard>(sql`
    select c.oracle_id as "oracleId", c.name, c.mana_cost, c.type_line, c.oracle_text, c.layout,
           (select count(*)::int from cards n where n.name = c.name) as "nameRows"
      from cards c
     -- A trial's ids are EXPLICIT: every pool slice already requires legality, and a deck spell
     -- banned since it was added is still an original its stand-ins sheet compares against.
     where ${trial === null ? sql`c.commander_legal = true ${scopeCondition(scope)}` : sql`c.oracle_id = any(${sql.param(trial)}::uuid[])`}
       ${only === undefined ? sql`` : sql`and c.oracle_id = any(${sql.param([...only])}::uuid[])`}
     order by c.oracle_id
  `);
  const all = rows.rows ?? (rows as unknown as StaleCard[]);
  const stored = new Map(
    (await db.select({ id: cardLabels.oracleId, hash: cardLabels.inputHash }).from(cardLabels))
      .map((r) => [r.id, r.hash]),
  );
  return all.filter((c) => stored.get(c.oracleId) !== labelInputHash(c, MODEL));
}

/** A reply's text blocks, joined: what `readReply` reads. */
const replyText = (message: { content: readonly { type: string; text?: string }[] }): string =>
  message.content.map((c) => (c.type === "text" ? c.text ?? "" : "")).join("");

type Intent = typeof cardLabelBatches.$inferSelect;

type Collected =
  | { kind: "published"; published: number }
  | { kind: "held"; why: string }
  | { kind: "expired" }
  | { kind: "failed" }
  | { kind: "already" };

/**
 * Reads ONE PROVIDER BATCH's results, and stages, records and publishes them in ONE transaction.
 *
 * One stream per batch rather than one per chunk: a wave's 400 requests live in a single
 * provider batch, so streaming per chunk would re-read the whole result set 400 times.
 *
 * Four reading rules, all the sample's, measured there and not re-litigated here:
 *
 * - Results are attributed by `custom_id` to the intent that sent it. A result whose id
 *   belongs to no intent here is IGNORED rather than attributed to the nearest one.
 * - A job the schema REJECTS is dropped and recorded, never repaired: a repaired label
 *   stores the repair and the next re-score measures the repair. The one exception is
 *   `normalizeJob`'s, a `to` or `method` on a kind that does not take it (Hugh, 2026-10-04).
 * - A missing or non-array `jobs` is NOT an empty answer. The gold set has hard negatives
 *   where `[]` is correct, so coercing malformed output to `[]` credits it as right on
 *   exactly the cards designed to catch over-labelling.
 * - A returned name is resolved by FACE against what that request asked for, and a name that
 *   is neither is refused rather than inserted.
 *
 * And the commit rule, which is what this function exists for: staging the rows, recording the
 * batch's MEASURED usage, judging the batch's own floor and publishing its cards are one commit.
 * Done as separate writes, a crash between "intents collected" and "labels published" left paid
 * work that nothing would ever re-collect; inside one transaction a crash leaves the batch exactly
 * as open as it was, and the next invocation — under any run id — collects it again for free.
 */
async function collectBatch(opts: BuildOptions, batchId: string, intents: Intent[]): Promise<Collected> {
  const byCustom = new Map(intents.map((i) => [i.customId, i]));
  /** Per intent: the cards it got back, and the usage its request reported. */
  const got = new Map<string, {
    byName: Map<string, Job[]>; inTok: number; outTok: number; cacheW: number; cacheR: number;
  }>();
  const slot = (customId: string) => {
    const existing = got.get(customId);
    if (existing) return existing;
    const fresh = { byName: new Map<string, Job[]>(), inTok: 0, outTok: 0, cacheW: 0, cacheR: 0 };
    got.set(customId, fresh);
    return fresh;
  };
  const rejected: string[] = [];
  let succeeded = 0;

  try {
    for await (const entry of await opts.client.results(batchId)) {
      const intent = byCustom.get(entry.custom_id);
      if (intent === undefined) continue; // not a request these intents sent
      if (entry.result.type !== "succeeded") continue;
      succeeded++;
      const here = slot(entry.custom_id);
      const u = entry.result.message.usage;
      here.inTok += u.input_tokens; here.outTok += u.output_tokens;
      here.cacheW += u.cache_creation_input_tokens ?? 0;
      here.cacheR += u.cache_read_input_tokens ?? 0;

      const read = readReply(replyText(entry.result.message), intent.asked);
      if (read === null) { rejected.push(`${entry.custom_id}: unparseable`); continue; }
      rejected.push(...read.rejected);
      for (const [name, kept] of read.byName) {
        here.byName.set(name, withoutRepeats([...(here.byName.get(name) ?? []), ...kept]));
      }
    }
  } catch (err) {
    // The provider keeps results 29 days; past that a retrieve fails rather than returning
    // nothing, and the cards have to be re-submitted.
    if ((err as { status?: number }).status === 404) return { kind: "expired" };
    throw err;
  }

  // NOT ONE REQUEST SUCCEEDED: a terminal failure, not a short batch. Errored, canceled and
  // expired requests are not billed, so this records no usage and reserves nothing, and its cards
  // are planned again (under the next attempt's key, see `planChunks`). Judging it against the
  // floor instead would hold it for ever, since no re-collection can make an errored request
  // succeed.
  if (succeeded === 0) return { kind: "failed" };

  // One catalog read for the whole batch. THE SHARED HELPER: it runs only after a batch has come
  // BACK, so a broken read here fires with the money already spent.
  // The ASKED names as well as the replied ones: a card asked and since renamed, or since changed,
  // has to be found to be judged moved, whether or not the reply carried it.
  const allNames = [...new Set([...got.values()].flatMap((g) => [...g.byName.keys()])
    .concat(intents.flatMap((i) => i.asked)))];
  const byName = new Map((await readCardsByName(db, allNames)).map((c) => [c.name, c]));

  return db.transaction(async (tx) => {
    // SERIALIZED on the batch, because any run id may now collect it. Two invocations streaming
    // the same ended batch would otherwise both stage it and both publish it, and the second
    // would re-set usage the first already recorded.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`card-labels-batch:${batchId}`}))`);
    // Re-read INSIDE the lock: the intents this process listed may have been collected while it
    // streamed the results.
    const stillOpen = new Set((await tx.select({ key: cardLabelBatches.intentKey }).from(cardLabelBatches)
      .where(and(
        inArray(cardLabelBatches.intentKey, intents.map((i) => i.intentKey)),
        inArray(cardLabelBatches.status, OPEN_STATUSES),
      ))).map((r) => r.key));
    const mine = intents.filter((i) => stillOpen.has(i.intentKey));
    if (mine.length === 0) return { kind: "already" } as const;

    /** Oracle ids staged by this batch, per run: a staged row keeps the run id that ASKED for it. */
    const stagedByRun = new Map<string, Set<string>>();
    /** Cards whose text moved between the request and now: not judged, not staged, planned again. */
    let moved = 0;
    for (const intent of mine) {
      const here = got.get(intent.customId);
      const sentHash = intent.askedHashes;
      // AN ANSWER DESCRIBES THE TEXT IT WAS ASKED ABOUT. Stamping it with today's hash would mark
      // an answer to yesterday's oracle text as current for ever. Every ASKED card is judged,
      // whether or not the reply carried it: one renamed since, which no longer resolves by its
      // asked name, or one whose inputs moved, is left for the next plan and out of the floor —
      // otherwise a single rename holds an otherwise good batch below the floor for ever. A card
      // the model simply omitted is unchanged, and still counts against the floor. A legacy
      // intent (no record) stages as it always did.
      const changed = new Set(sentHash === null ? [] : intent.asked.filter((n) => {
        const c = byName.get(n);
        return c === undefined || sentHash[n] !== labelInputHash(c, MODEL);
      }));
      moved += changed.size;
      const rows = [...(here?.byName.keys() ?? [])]
        .filter((n) => !changed.has(n))
        .map((n) => byName.get(n))
        .filter((c): c is CardRow => c !== undefined)
        .map((c) => ({
          // The INTENT's run, not this process's: a batch collected by a later run id is still
          // that earlier run's work, and its staging rows say so.
          runId: intent.runId, oracleId: c.oracleId, labels: here?.byName.get(c.name) ?? [],
          model: MODEL, promptVersion: LABEL_PROMPT_VERSION, inputHash: labelInputHash(c, MODEL),
        }));
      if (rows.length > 0) {
        // Idempotent: a batch held below the floor is re-collected on every invocation until it
        // is accepted, and its rows are the same rows each time. An UPDATE rather than a skip,
        // because a row already staged under this run id may be an older build's answer to an
        // older prompt (staging holds `backfill-2026-09-28`'s prompt-1 rows): skipping it would
        // let `publishWave` publish that stale answer as this batch's.
        await tx.insert(cardLabelsStaging).values(rows).onConflictDoUpdate({
          target: [cardLabelsStaging.runId, cardLabelsStaging.oracleId],
          set: {
            labels: sql`excluded.labels`, model: sql`excluded.model`,
            promptVersion: sql`excluded.prompt_version`, inputHash: sql`excluded.input_hash`,
            labelledAt: sql`excluded.labelled_at`,
          },
        });
        const set = stagedByRun.get(intent.runId) ?? new Set<string>();
        for (const r of rows) set.add(r.oracleId);
        stagedByRun.set(intent.runId, set);
      }
      // Usage is SET, never added, whatever the floor says. A held batch was paid for, so its cost
      // must count against the cap now — and setting it means a re-collection cannot count it twice.
      await tx.update(cardLabelBatches)
        .set({
          batchId,
          inTokens: here?.inTok ?? 0, outTokens: here?.outTok ?? 0,
          cacheWriteTokens: here?.cacheW ?? 0, cacheReadTokens: here?.cacheR ?? 0,
        })
        .where(eq(cardLabelBatches.intentKey, intent.intentKey));
    }

    // THIS BATCH's floor: of the cards its intents asked about, how many came back usable.
    const asked = mine.reduce((n, i) => n + i.asked.length, 0) - moved;
    const staged = [...stagedByRun.values()].reduce((n, s) => n + s.size, 0);
    // EVERY card moved: nothing is left to judge, and nothing here is short. The batch is complete,
    // publishing nothing, and its cards go to the next plan. `meetsFloor` refuses 0 of 0 on purpose
    // (an empty RUN is not a success), so without this the batch would be held, and its cards
    // blocked from planning, for ever.
    const floor = asked === 0 && moved > 0 ? { ok: true as const, share: 1 } : meetsFloor(staged, asked, opts.floor);
    if (!floor.ok) {
      // HELD: staged, measured, unpublished, and still open — so it blocks its own cards from
      // being planned again, and the next invocation re-reads it under whatever floor it is
      // given. Marked `in_progress` rather than collected, because collected would mean nobody
      // ever looks at it again and its cards would be re-asked and re-paid.
      await tx.update(cardLabelBatches).set({ status: "in_progress" })
        .where(inArray(cardLabelBatches.intentKey, mine.map((i) => i.intentKey)));
      return { kind: "held", why: `${batchId}: ${floor.why}` } as const;
    }

    let published = 0;
    for (const [runId, ids] of stagedByRun) published += await publishWave(tx, runId, [...ids]);
    await tx.update(cardLabelBatches).set({ status: "collected", collectedAt: new Date() })
      .where(inArray(cardLabelBatches.intentKey, mine.map((i) => i.intentKey)));
    if (rejected.length > 0) console.warn(`  ${batchId}: dropped ${rejected.length} item(s)`);
    if (moved > 0) console.warn(`  ${batchId}: ${moved} card(s) changed since they were asked; left for the next plan`);
    await opts.hooks?.beforeCommit?.(batchId);
    return { kind: "published", published } as const;
  });
}

/**
 * RECONCILE before submitting anything, which is the whole resume story.
 *
 * Which intents it looks at: every OPEN intent of this run, and every open intent of ANY run that
 * carries a batch id and was asked under this model and prompt version. The second half is what
 * lets a new run id pick up a crashed or stopped run's paid results instead of paying for them
 * again. Another run's intent with a NULL id is left alone: resolving one means searching the
 * provider for its `custom_id`s and possibly abandoning it, which is that run's decision to make
 * when it is resumed — and its cards stay out of this run's plan meanwhile.
 *
 * The states an intent can be in, and the ambiguous one is the reason this exists:
 *
 *   id present         retrieve it. `ended` is collected (and published, if its floor holds);
 *                      still processing means EXIT cleanly rather than duplicate it; results
 *                      expired past the provider's 29-day window are marked and re-planned;
 *                      every request errored is marked `failed` and re-planned.
 *   id NULL            AMBIGUOUS. The `create` may have succeeded with the id lost, so the
 *                      provider is asked: its recent batches are listed and matched on the
 *                      `custom_id`s this run chose. A match adopts the id; an exhaustive search
 *                      with no match on a young intent means the request never landed, and the
 *                      intent is withdrawn so the plan can ask again. Neither → `abandoned`,
 *                      reported, never silently re-submitted.
 */
async function reconcile(opts: BuildOptions): Promise<{
  waiting: number; abandoned: string[]; held: string[]; published: number;
}> {
  const open = await db.select().from(cardLabelBatches).where(and(
    inArray(cardLabelBatches.status, OPEN_STATUSES),
    // This run's OWN intents are held to the same model and prompt as another run's. Its answers
    // are staged with the current prompt version and `labelInputHash(c, MODEL)`, so an intent
    // asked under an older prompt or model, collected after a bump, would publish an old answer
    // stamped as current.
    eq(cardLabelBatches.model, MODEL),
    eq(cardLabelBatches.promptVersion, LABEL_PROMPT_VERSION),
    or(eq(cardLabelBatches.runId, opts.runId), isNotNull(cardLabelBatches.batchId)),
  ));
  if (open.length === 0) return { waiting: 0, abandoned: [], held: [], published: 0 };

  const others = new Set(open.filter((o) => o.runId !== opts.runId).map((o) => o.runId));
  console.log(`reconciling ${open.length} open intent(s)`
    + (others.size > 0 ? `, including ${[...others].join(", ")}'s paid batches` : ""));
  // Listed ONCE, not per intent: the ambiguous branch needs the same page of batches for every
  // one of them, and a list call per intent is a round trip per chunk.
  //
  // **Only ENDED batches are streamed, and a failure to stream one is survived.** `results()`
  // calls `retrieve` and THROWS when `results_url` is null — so a batch still processing
  // anywhere in the workspace, including this run's own, aborted the whole reconciliation
  // before a single intent was resolved.
  const byCustomId = new Map<string, string>();
  /** True when the search was exhaustive, so "not found" actually means "never submitted". */
  let searchWasComplete = false;
  /** Set when any listed batch is still running, which makes "not found" inconclusive. */
  let anyStillProcessing = false;
  const unresolved = new Set(open.filter((o) => o.batchId === null).map((o) => o.customId));
  if (unresolved.size > 0) {
    // PAGINATED UNTIL EXHAUSTED, or until every lost id is accounted for. One page of 100 does
    // NOT prove the provider has no matching batch — other activity can push a lost batch past
    // it — and treating a truncated search as "no match" re-submits a request a successful
    // `create` already accepted. So the search either completes or says it did not.
    let cursor: string | undefined;
    let pages = 0;
    do {
      const page = await opts.client.list({ limit: 100, ...(cursor ? { after_id: cursor } : {}) });
      pages++;
      for (const batch of page.data) {
        if (batch.processing_status !== "ended") continue;
        try {
          for await (const r of await opts.client.results(batch.id)) {
            byCustomId.set(r.custom_id, batch.id);
            unresolved.delete(r.custom_id);
          }
        } catch (err) {
          // One unreadable batch must not blind the lookup to the others.
          console.warn(`  could not read ${batch.id}: ${(err as Error).message}`);
        }
      }
      // A batch still PROCESSING has no readable results, so its `custom_id`s cannot be matched.
      // If any such batch exists, the absence of a match proves nothing.
      if (page.data.some((b) => b.processing_status !== "ended")) anyStillProcessing = true;
      cursor = page.data.at(-1)?.id;
      if (unresolved.size === 0) { searchWasComplete = true; break; }
      if (!page.has_more) { searchWasComplete = !anyStillProcessing; break; }
    } while (pages < 50);
    console.log(`  searched ${pages} page(s) of provider batches; `
      + `${unresolved.size} id(s) still unaccounted for`
      + (anyStillProcessing ? "; a batch is still processing, so absence proves nothing" : ""));
  } else {
    searchWasComplete = true;
  }

  const abandoned: string[] = [];
  const held: string[] = [];
  let waiting = 0;
  let published = 0;

  // Intents whose id is still unknown after the lookup above. Resolved by AGE, not by guessing:
  // a batch the provider would still list is recent, so a young intent the exhaustive search did
  // not find never reached the provider, while an old one is `abandoned` and reported rather than
  // silently re-submitted.
  for (const intent of open.filter((o) => (o.batchId ?? byCustomId.get(o.customId) ?? null) === null)) {
    if (searchWasComplete && Date.now() - intent.intendedAt.getTime() < 60 * 60 * 1000) {
      // WITHDRAWN rather than left `intended`. Left standing it is an open intent, so it would
      // keep its own cards out of the plan for ever; and the plan reproduces its key for the same
      // cards, so the claim would collide with it. Deleting it asserts nothing was billed, which
      // is exactly what an exhaustive search finding no such request established.
      await db.delete(cardLabelBatches).where(and(
        eq(cardLabelBatches.intentKey, intent.intentKey), sql`${cardLabelBatches.batchId} is null`,
      ));
      continue;
    }
    await db.update(cardLabelBatches).set({ status: "abandoned" })
      .where(eq(cardLabelBatches.intentKey, intent.intentKey));
    abandoned.push(intent.intentKey);
  }

  // GROUPED BY BATCH, and that is not tidiness. One provider batch holds every chunk of a wave,
  // so collecting per intent would `retrieve` the same batch once per chunk and stream its whole
  // result set once per chunk. Each batch is retrieved once and streamed once.
  const byBatch = new Map<string, Intent[]>();
  for (const intent of open) {
    const id = intent.batchId ?? byCustomId.get(intent.customId) ?? null;
    if (id === null) continue;
    byBatch.set(id, [...(byBatch.get(id) ?? []), intent]);
  }

  for (const [batchId, intents] of byBatch) {
    const keys = intents.map((i) => i.intentKey);
    const batch = await opts.client.retrieve(batchId);
    if (batch.processing_status !== "ended") {
      waiting += intents.length; // chunks, not batches — named as such where it is printed
      await db.update(cardLabelBatches).set({ status: "in_progress", batchId })
        .where(inArray(cardLabelBatches.intentKey, keys));
      continue;
    }
    const collected = await collectBatch(opts, batchId, intents);
    switch (collected.kind) {
      case "expired":
        await db.update(cardLabelBatches).set({ status: "expired", batchId })
          .where(inArray(cardLabelBatches.intentKey, keys));
        console.warn(`  ${batchId}: results expired — its ${intents.length} chunk(s) will be re-submitted`);
        break;
      case "failed":
        await db.update(cardLabelBatches).set({ status: "failed", batchId })
          .where(inArray(cardLabelBatches.intentKey, keys));
        console.warn(`  ${batchId}: no request succeeded — its ${intents.length} chunk(s) will be re-submitted`);
        break;
      case "held":
        held.push(collected.why);
        break;
      case "published":
        published += collected.published;
        console.log(`  ${batchId}: published ${collected.published} label(s)`);
        break;
      case "already":
        break;
    }
  }

  return { waiting, abandoned, held, published };
}

/**
 * Submits one wave as ONE provider batch, with every intent written FIRST.
 *
 * The order is the point and it is not negotiable: every intent row goes down, then
 * `batches.create` is called, then the returned id is stamped onto all of them. A process
 * dying in the window between `create` returning and the stamp leaves rows that say
 * `intended` with a null id — which `reconcile` treats as ambiguous and RESOLVES against the
 * provider, rather than as absent and re-submits. Writing the rows after the call is the
 * shape that pays twice.
 */
async function submit(opts: BuildOptions, chunks: Chunk[], rowsByName: ReadonlyMap<string, CardRow>): Promise<void> {
  // THE INSERT IS THE CLAIM, and only what this process actually inserted is submitted.
  //
  // Two invocations sharing a `LABEL_RUN_ID` could otherwise both find the intents already present
  // because `onConflictDoNothing` leaves them, and both call `batches.create` for the same chunks.
  // `returning()` on a conflict-do-nothing insert reports the rows THIS statement created, which
  // is an atomic claim decided by the database rather than by a read the other process cannot see.
  const claimed = await db.insert(cardLabelBatches).values(chunks.map((c) => ({
    intentKey: c.intentKey, runId: opts.runId, model: MODEL, customId: c.customId, asked: c.names,
    promptVersion: LABEL_PROMPT_VERSION,
    // From the SAME rows the request is built from, below: a hash read separately could describe
    // text a catalog refresh replaced in between, and the collect would discard a good answer.
    askedHashes: Object.fromEntries(c.names.flatMap((n) => {
      const row = rowsByName.get(n);
      return row === undefined ? [] : [[n, labelInputHash(row, MODEL)]];
    })),
  }))).onConflictDoNothing().returning({ intentKey: cardLabelBatches.intentKey });

  const mine = new Set(claimed.map((r) => r.intentKey));
  const unclaimed = chunks.filter((c) => !mine.has(c.intentKey));
  if (unclaimed.length > 0) {
    console.error(`\n${unclaimed.length} of ${chunks.length} chunk(s) were already claimed by `
      + `another process for ${opts.runId}. Nothing has been submitted by this one.`);
    return refuse(`two invocations of one run can both submit the same chunks, and both are `
      + `billable. Wait for the other process, or start a new run.`);
  }

  // Built from the rows the plan read, the same ones the intent's hashes came from.
  const requests = chunks.map((c) => buildRequest(
    c.customId, MODEL, c.names.map((n) => rowsByName.get(n)).filter((c2): c2 is CardRow => c2 !== undefined),
  ));

  const batch = await opts.client.create({ requests });
  // Scoped to THIS WAVE's intent keys, not to "every null batch id in this run": an earlier wave
  // can legitimately have left a null id behind, and stamping this batch's id onto it would assert
  // that a request belongs to a batch that never contained it.
  await stampWave(db, chunks.map((c) => c.intentKey), batch.id);
  console.log(`submitted ${requests.length} request(s) as ${batch.id}`);
}

/**
 * What a budget family has already spent, read from the ledger and summed by `familySpend`.
 *
 * EVERY MODEL counts against the family, each row priced at its own model's rates: the family is
 * the run id and the prompt version, so a `LABEL_MODEL` change must not make the spend before it
 * vanish and hand the same backfill a second cap. A ledger model with no canonical rate refuses,
 * as `LABEL_MODEL` does, rather than counting as free. The MEASURED rate (`measuredUsd` over
 * `measuredCards`) stays this model's alone, because it is what the projection prices the
 * remaining cards at, and those are asked of this model.
 */
export async function readFamilySpend(runId: string): Promise<FamilySpend> {
  const rows = await db.select({
    model: cardLabelBatches.model,
    runId: cardLabelBatches.runId,
    status: cardLabelBatches.status,
    promptVersion: cardLabelBatches.promptVersion,
    askedCards: sql<number>`jsonb_array_length(${cardLabelBatches.asked})::int`,
    inTokens: cardLabelBatches.inTokens,
    outTokens: cardLabelBatches.outTokens,
    cacheWriteTokens: cardLabelBatches.cacheWriteTokens,
    cacheReadTokens: cardLabelBatches.cacheReadTokens,
  }).from(cardLabelBatches)
    // Narrowed in SQL to the rows that can count at all; the family itself is a pure rule, so it
    // is applied in `familySpend` where it is tested rather than restated as a LIKE here.
    .where(eq(cardLabelBatches.promptVersion, LABEL_PROMPT_VERSION));
  // Narrowed to THIS family before any model is priced: a row only another family holds cannot
  // move this cap, so an unpriced model there must not refuse this run.
  const family = budgetFamily(runId);
  const byModel = new Map<string, typeof rows>();
  for (const r of rows) {
    if (budgetFamily(r.runId) !== family) continue;
    byModel.set(r.model, [...(byModel.get(r.model) ?? []), r]);
  }
  const own = familySpend(byModel.get(MODEL) ?? [], runId, LABEL_PROMPT_VERSION, RATES, expiredReserveFor(RATES));
  let { expiredChunks, reserveUsd, totalUsd } = own;
  for (const [model, those] of byModel) {
    if (model === MODEL) continue;
    const key = (Object.entries(ALL_MODELS) as [keyof typeof PRICING, string][]).find(([, id]) => id === model)?.[0];
    if (key === undefined) {
      throw new Error(`the ledger holds ${those.length} row(s) for model "${model}", which has no canonical `
        + `rate. Refusing: spend that cannot be priced cannot be held to the cap.`);
    }
    const rates = ratesFor(key);
    const other = familySpend(those, runId, LABEL_PROMPT_VERSION, rates, expiredReserveFor(rates));
    expiredChunks += other.expiredChunks;
    reserveUsd += other.reserveUsd;
    totalUsd += other.totalUsd;
  }
  return { ...own, expiredChunks, reserveUsd, totalUsd };
}

/** Runs one invocation of the build and returns its exit code. */
export async function runLabelBuild(opts: BuildOptions): Promise<number> {
  try {
    return await build(opts);
  } catch (err) {
    if (err instanceof Refusal) {
      console.error(`\nbuild-card-labels REFUSED: ${err.message}`);
      return EXIT_STOP;
    }
    throw err;
  }
}

async function build(opts: BuildOptions): Promise<number> {
  const { runId } = opts;
  console.log(`run ${runId}  model ${MODEL}  scope ${opts.scope}  cap $${opts.capUsd.toFixed(2)}${opts.dryRun ? "  (dry run)" : ""}`);

  // RECONCILE FIRST, always, before anything is planned or priced. An in-flight batch this
  // run cannot see is work it would submit again.
  const { waiting, abandoned, held } = opts.dryRun
    ? { waiting: 0, abandoned: [] as string[], held: [] as string[] }
    : await reconcile(opts);
  // ONE MODEL AT A TIME PER FAMILY. An open intent of another model is spend this run cannot see:
  // it is billed when it lands, `familySpend` counts it only once it is measured, and reconcile
  // only collects this model's. Planning beside it would let one family commit two caps. A model
  // switch is not supported mid-flight; it waits until the other model's open work has landed.
  if (!opts.dryRun) {
    const otherModel = (await db.select({ runId: cardLabelBatches.runId, model: cardLabelBatches.model })
      .from(cardLabelBatches).where(and(
        inArray(cardLabelBatches.status, OPEN_STATUSES),
        eq(cardLabelBatches.promptVersion, LABEL_PROMPT_VERSION),
        sql`${cardLabelBatches.model} <> ${MODEL}`,
      ))).filter((r) => budgetFamily(r.runId) === budgetFamily(runId));
    if (otherModel.length > 0) {
      return refuse(`${otherModel.length} open intent(s) in this budget family were asked of `
        + `${[...new Set(otherModel.map((r) => r.model))].join(", ")}, not ${MODEL}. Their cost is not `
        + `known yet. Finish them under that LABEL_MODEL first.`);
    }
  }
  if (abandoned.length > 0) {
    console.error(`\n${abandoned.length} intent(s) ABANDONED — submitted, id lost, and no longer`);
    console.error(`listed by the provider. Their cards are NOT re-submitted automatically:`);
    for (const k of abandoned) console.error(`  ${k}`);
    return refuse(`unresolvable intents. Re-run with LABEL_RUN_ID=<new id> to relabel their cards, `
      + `accepting that the originals may already have been charged.`);
  }
  if (held.length > 0) {
    // Nothing further is submitted while a batch is held: a batch returning too little is the
    // first sign of a prompt or model problem, and the next wave would pay for the same problem.
    for (const h of held) console.error(`  HELD ${h}`);
    return refuse(`${held.length} batch(es) came back under the ${(100 * opts.floor).toFixed(0)}% floor. `
      + `Their rows are staged and NOT published, their cost is counted, and nothing more has been `
      + `submitted. Inspect card_labels_staging, then re-run with a stated LABEL_FLOOR once you know `
      + `why the shortfall is acceptable — the held batch is re-read and judged again, for free.`);
  }
  if (waiting > 0) {
    console.log(`\n${waiting} chunk(s) still processing. Nothing submitted.`);
    console.log(`Re-run with LABEL_RUN_ID=${runId} to resume when they finish.`);
    return EXIT_MORE_WORK;
  }

  const all = await cardsNeedingLabels(opts.scope, opts.onlyOracleIds);

  // **A CARD WHOSE NAME IS SHARED IS EXCLUDED AND NAMED, never labelled by guess.**
  //
  // The prompt asks by name and the model answers by name, so two oracle rows sharing one name are
  // indistinguishable in the reply. `src/lib/tuning/resolve-names.ts` takes the same position:
  // resolve when unambiguous, otherwise drop rather than guess.
  // Counted over the whole catalog (`nameRows`), never over this run's own set: a sibling outside
  // the set is still a row the reply's name could belong to.
  const ambiguous = all.filter((c) => Number(c.nameRows) > 1);
  const stale = all.filter((c) => Number(c.nameRows) === 1);
  if (ambiguous.length > 0) {
    console.warn(`\n${ambiguous.length} card(s) share a name with another oracle row and are `
      + `EXCLUDED — the model's reply could not be attributed to one of them:`);
    for (const c of ambiguous.slice(0, 10)) console.warn(`  ${c.name} (${c.oracleId})`);
    if (ambiguous.length > 10) console.warn(`  ...and ${ambiguous.length - 10} more`);
  }

  // **NOTHING IS ASKED TWICE WHILE IT MAY STILL BE ANSWERED.** A card inside an open intent asked
  // under this model and prompt, by any run, is already paid for or about to be; planning it again
  // is the double charge. An intent asked under an older prompt does not block: its answer can
  // never be published (reconcile leaves it alone), so the card has to be asked again. After
  // reconcile, what is left open here is another run's ambiguous intent, which only that run can
  // resolve.
  const openRows = await db.select({ runId: cardLabelBatches.runId, asked: cardLabelBatches.asked })
    .from(cardLabelBatches).where(and(
      inArray(cardLabelBatches.status, OPEN_STATUSES),
      eq(cardLabelBatches.model, MODEL),
      eq(cardLabelBatches.promptVersion, LABEL_PROMPT_VERSION),
    ));
  const inFlight = new Set(openRows.flatMap((r) => r.asked));
  const cards = stale.filter((c) => !inFlight.has(c.name));
  const blocked = stale.length - cards.length;

  console.log(`${stale.length} card(s) need labels (stored hash differs or absent)`
    + (blocked > 0 ? `; ${blocked} of them are inside an open intent and are not planned` : ""));

  // Every intent this run already recorded for this model, whatever became of it, so a chunk that
  // re-plans to the same cards takes a fresh attempt number rather than colliding with its key.
  const prior = await db.select({ asked: cardLabelBatches.asked }).from(cardLabelBatches)
    .where(and(eq(cardLabelBatches.runId, runId), eq(cardLabelBatches.model, MODEL)));
  const chunks = planChunks(runId, MODEL, cards.map((c) => c.name), prior.map((p) => p.asked));

  // NOTHING LEFT TO SUBMIT. Each collected batch published itself in its own transaction, so
  // there is no run-wide publish left to make. The old run-at-a-time build's drain is gone with
  // it: the only staging it ever left is `backfill-2026-09-28`'s, answered under prompt 1, and
  // publishing that over current labels is the one thing a drain here could do.
  if (chunks.length === 0) {
    // FOUR different states reach here and they are not interchangeable. Collapsing them printed
    // "every card's label matches its inputs" when stale cards existed and were simply
    // unlabelable — so the weekly workflow matched it as success for ever.
    if (stale.length === 0 && ambiguous.length > 0) {
      console.error(`\nEVERY stale card is unlabelable: ${ambiguous.length} share a name with `
        + `another oracle row, and the model's reply could not be attributed to one of them. `
        + `These cards stay unlabelled until the duplicate names are resolved — this is NOT a no-op.`);
      return EXIT_STOP;
    }
    if (blocked > 0) {
      const holders = [...new Set(openRows.map((r) => r.runId))];
      console.error(`\n${blocked} stale card(s) are inside open intents of ${holders.join(", ")} `
        + `and nothing else is left to plan. An intent with no batch id can only be resolved by `
        + `resuming its own run id, which this run will not do on its behalf.`);
      return EXIT_STOP;
    }
    console.log(stale.length === 0
      ? "nothing to do — every Commander-legal card's label matches its inputs"
      : "nothing left to submit");
    return EXIT_DONE;
  }

  const worst = worstCaseUsd(chunks.length, SYSTEM_TOKENS, PER_CARD_TOKENS, MAX_TOKENS_PER_BATCH, RATES, BODY_OVERHEAD_TOKENS);

  // WHAT THE FAMILY HAS ALREADY SPENT: measured usage of every batch that came back, plus a
  // worst-case reserve for every batch whose results expired unread (billed, and unknowable).
  // Over the whole budget family rather than this run id, because a run id is free to change and
  // a cap that resets with it bounds nothing.
  const spend = await readFamilySpend(runId);
  const alreadySpent = spend.totalUsd;
  if (spend.expiredChunks > 0) {
    console.log(`  ${spend.expiredChunks} expired chunk(s) reserved at worst case $${spend.reserveUsd.toFixed(2)} `
      + `— billed, unreadable, so counted rather than assumed free`);
  }
  /**
   * The family's own measured rate once it has one. Before that, the newest re-sample's measured
   * rate (`MEASURED_PER_CARD`): a projection that kept using a sample's figure could never notice
   * a run costing more than the sample did, which is the one thing the projection is for.
   */
  const measuredPerCard = spend.measuredCards > 0 ? spend.measuredUsd / spend.measuredCards : MEASURED_PER_CARD.usd;
  const rateSource = spend.measuredCards === 0 ? `${MEASURED_PER_CARD.runId}'s` : "this budget's";

  console.log(`  ${chunks.length} request(s) of ${CARDS_PER_REQUEST}  worst case $${worst.toFixed(2)}`
    + (alreadySpent > 0 ? `  (plus $${alreadySpent.toFixed(2)} already committed in this budget)` : ""));

  // ONE WAVE AT A TIME, because `batches.create` is atomic: submitting every request commits
  // the run to their whole cost with no way to stop at the cap. A wave sized to the REMAINING
  // budget means the worst case is bounded at every point, and the next wave is authorised
  // against what the previous one actually cost.
  const remaining = opts.capUsd - alreadySpent;
  const size = waveSize(remaining, SYSTEM_TOKENS, PER_CARD_TOKENS, MAX_TOKENS_PER_BATCH, RATES, 400, BODY_OVERHEAD_TOKENS);
  if (size === 0) {
    return refuse(`no budget left for even one request: $${alreadySpent.toFixed(2)} of the `
      + `$${opts.capUsd.toFixed(2)} cap is committed, and one request's worst case is `
      + `$${REQUEST_WORST_USD.toFixed(4)}. Everything collected so far is already published.`);
  }

  const wave = chunks.slice(0, size);
  const waveWorst = worstCaseUsd(wave.length, SYSTEM_TOKENS, PER_CARD_TOKENS, MAX_TOKENS_PER_BATCH, RATES, BODY_OVERHEAD_TOKENS);
  const verdict = withinCap(waveWorst, alreadySpent, opts.capUsd);
  if (!verdict.ok) return refuse(verdict.why);

  console.log(`  this wave: ${wave.length} request(s), worst case $${waveWorst.toFixed(2)}`);
  console.log(`  ${chunks.length - wave.length} request(s) wait for a later wave`);
  console.log(`  remaining cards expected ~$${(measuredPerCard * cards.length).toFixed(2)} at `
    + `${rateSource} measured rate; worst case if every `
    + `request returns its full ceiling $${worst.toFixed(2)}`);

  // TWO BOUNDS, and they are different questions (d9's ruling on Hugh's backfill stop):
  //
  //   the CAP   each wave's worst case must fit `cap − spent so far`, which is what makes actual
  //             spend unable to pass the cap even if every remaining request maxes out.
  //   the PAUSE  the PROJECTED total — spent plus the cards still to plan at the measured rate —
  //             must stay under the report line. The cap stops a disaster; the pause reports a
  //             surprise.
  const projected = projectedTotalUsd(alreadySpent, cards.length, measuredPerCard);
  console.log(`  projected total $${projected.toFixed(2)} `
    + `(spent $${alreadySpent.toFixed(2)} + ${cards.length} cards at `
    + `$${measuredPerCard.toFixed(6)}, ${rateSource} rate)`);
  if (projected > opts.reportAtUsd) {
    console.error(`\nPAUSED: the projected total is $${projected.toFixed(2)}, past the `
      + `$${opts.reportAtUsd.toFixed(2)} report line (cap $${opts.capUsd.toFixed(2)}).`);
    // THE REMEDIATION HAS TO BE FOLLOWABLE, and has been wrong twice in opposite directions: it
    // states the figure the report line would have to reach, and whether a dispatch can reach it.
    console.error(`Nothing further has been submitted. Report the figure and hold for Hugh.`);
    console.error(pauseRemediation(projected, opts.dispatchCeilingUsd).text);
    // NON-ZERO: a pause is a hold awaiting a decision, which is not success.
    return EXIT_STOP;
  }

  if (opts.dryRun) {
    console.log("\ndry run — nothing submitted, nothing published");
    return EXIT_DONE;
  }

  await submit(opts, wave, new Map(cards.map((c) => [c.name, c])));
  console.log(`\nSubmitted wave of ${wave.length}. Batches are asynchronous: re-run with `
    + `LABEL_RUN_ID=${runId} to collect it and submit the next wave.`);
  return EXIT_MORE_WORK;
}
