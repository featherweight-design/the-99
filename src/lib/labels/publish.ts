/**
 * The database work a label run does that must be exactly scoped, extracted so a PROBE can call
 * the real thing.
 *
 * They lived inside `scripts/build-card-labels.ts`, which runs `main()` at module scope — so a
 * probe could not import them and hand-wrote its own copies instead. That probe then passed
 * with the script's scoping deleted, which is the worst kind of green: it asserted the shape of
 * code nothing runs. Both are here now, both are called by the script, and the probe calls
 * these.
 *
 * A third, `readCardsByName`, joined them for the same reason and is called from both of the
 * places that used to hold their own copy of it.
 */

import { eq, inArray, sql } from "drizzle-orm";
import type { NeonDatabase } from "drizzle-orm/neon-serverless";

import { cardLabelBatches, cardLabels, cards, cardLabelsStaging } from "../../db/schema";

/**
 * The connection is INJECTED rather than imported, because `src/db` reads `DATABASE_URL` at
 * module scope and a probe points itself at its own database.
 */
type Db = NeonDatabase<Record<string, unknown>>;

/**
 * Stamps a provider batch id onto THIS WAVE's intents and no others.
 *
 * Scoped by intent key rather than by "every row of this run with a null id". An earlier wave
 * can legitimately hold a null id — that is the ambiguous state the resume path resolves
 * against the provider — and branding it with this batch's id asserts that a request belongs to
 * a batch which never contained it, corrupting the one lookup the resume path depends on.
 */
export async function stampWave(db: Db, intentKeys: string[], batchId: string): Promise<void> {
  if (intentKeys.length === 0) return;
  await db.update(cardLabelBatches)
    .set({ batchId, status: "submitted", submittedAt: new Date() })
    .where(inArray(cardLabelBatches.intentKey, intentKeys));
}

/**
 * Publishes one run's staged labels into `card_labels`, in ONE transaction, and returns how
 * many rows moved.
 *
 * `delete` + `insert ... select` rather than a per-row upsert, so a reader never sees a mixture
 * of two runs. Scoped to the oracle ids THIS RUN staged: a card the run never touched keeps its
 * existing label, because the run labels what has moved and an untouched card was skipped
 * rather than found wanting.
 *
 * Staging for the run is cleared inside the same transaction, so a crash mid-publish leaves
 * either the old labels and the staged rows, or the new labels and no staged rows — never a
 * mixture, and never staged rows whose work has already been published.
 */
export async function publishRun(db: Db, runId: string): Promise<number> {
  return db.transaction(async (tx) => {
    // SERIALIZED on the run, before anything is read.
    //
    // Two concurrent publishes of one run would otherwise both read the staging rows, and the
    // second — waiting on the first's label delete — would resume to find staging already gone,
    // still delete the labels it had selected, and return the count it read. The visible result
    // is a successful-looking publish that leaves NO labels behind. A transaction alone does not
    // prevent it, because the second call's read happened before the first's delete.
    //
    // An advisory lock rather than `select ... for update`: the rows to lock are the ones being
    // deleted, so row locks cannot order a reader that has already read them.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`card-labels:${runId}`}))`);

    const staged = await tx.select({ id: cardLabelsStaging.oracleId }).from(cardLabelsStaging)
      .where(eq(cardLabelsStaging.runId, runId));
    const ids = staged.map((r) => r.id);
    // Re-read AFTER the lock, so a second caller that queued behind the first sees the empty
    // staging the first left and reports 0 rather than re-deleting what it published.
    if (ids.length === 0) return 0;
    await tx.delete(cardLabels).where(inArray(cardLabels.oracleId, ids));
    await tx.execute(sql`
      insert into ${cardLabels} (oracle_id, labels, model, prompt_version, input_hash, labelled_at)
      select oracle_id, labels, model, prompt_version, input_hash, labelled_at
        from ${cardLabelsStaging} where run_id = ${runId}
    `);
    await tx.delete(cardLabelsStaging).where(eq(cardLabelsStaging.runId, runId));
    return ids.length;
  });
}

/** One catalog row as the label prompt needs it. */
export type CardRow = {
  oracleId: string; name: string; mana_cost: string | null;
  type_line: string; oracle_text: string | null; layout: string;
};

/**
 * The cards a wave is about to ask the model about, by NAME.
 *
 * Here, rather than inline, because this read took down the first real dispatch and NOTHING
 * executed it. `probe:label-build`'s header excludes "anything that needs the API" — and both
 * copies of this read sat a few lines above the provider call, so that exclusion silently covered
 * a database read too. No test, no probe and no `--dry-run` ever ran it. The probe calls THIS now,
 * against a real Postgres, with more than one name.
 *
 * `sql.param` AND the cast, because neither alone works and the failure is not the obvious one:
 *
 *   `any(${names})`                     -> `any(($1, $2, $3))`         42809, a row constructor
 *   `any(${names}::text[])`             -> `any(($1, $2, $3)::text[])` 42846, cast a record to text[]
 *   `any(${sql.param(names)}::text[])`                                 one array parameter, correct
 *
 * A one-element array is not a lucky case either — it renders `any(($1))` and fails too — so no
 * input size would ever have worked. All three measured against a real Postgres (and the middle
 * one's code was recorded wrong here at first — it is 42846, a different failure, not 42809), because the
 * cast-only form looks right and `src/lib/combos/near-miss.ts` looks like a precedent for it: its
 * `${present}` is itself a `sql.param`, which is easy to miss.
 *
 * An empty ask is not a query. `any('{}'::text[])` is valid and returns nothing, so the guard saves
 * a round trip rather than avoiding a bug — and it belongs with the read rather than with one of
 * its two callers.
 */
export async function readCardsByName(db: Db, names: readonly string[]): Promise<CardRow[]> {
  if (names.length === 0) return [];
  const rows = await db.execute<CardRow>(sql`
    select oracle_id as "oracleId", name, mana_cost, type_line, oracle_text, layout
      from ${cards} where name = any(${sql.param([...names])}::text[])
  `);
  return rows.rows ?? (rows as unknown as CardRow[]);
}
