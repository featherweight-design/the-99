/**
 * The database work a label run does that must be exactly scoped, extracted so a PROBE can call
 * the real thing.
 *
 * They lived inside `scripts/build-card-labels.ts`, which runs `main()` at module scope — so a
 * probe could not import them and hand-wrote its own copies instead. That probe then passed
 * with the script's scoping deleted, which is the worst kind of green: it asserted the shape of
 * code nothing runs. Both are here now, both are called by the script, and the probe calls
 * these.
 */

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
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
 * The cards a wave is about to ask the model for, by NAME.
 *
 * Here, rather than inline in `submit`, because it is the read that took down the first real
 * dispatch and nothing executed it. `probe:label-build` deliberately stops short of the provider
 * call — its header says so — and this read sits four lines above that call, so no test, no probe
 * and no `--dry-run` ever ran it. The probe calls THIS now, against a real Postgres, with more
 * than one name.
 *
 * `sql.param` AND the cast, because neither alone works and the failure is not the obvious one:
 *
 *   `any(${names})`              -> `any(($1, $2, $3))`         42809, a row constructor
 *   `any(${names}::text[])`      -> `any(($1, $2, $3)::text[])` 42809, still a row constructor
 *   `any(${sql.param(names)}::text[])`                          one array parameter, correct
 *
 * A one-element array is not a lucky case either: it renders `any(($1))` and fails too, so no
 * input size would have worked. All three measured against a real Postgres.
 */
export async function readCardsByName(db: Db, names: readonly string[]): Promise<CardRow[]> {
  const rows = await db.execute<CardRow>(sql`
    select oracle_id as "oracleId", name, mana_cost, type_line, oracle_text, layout
      from ${cards} where name = any(${sql.param([...names])}::text[])
  `);
  return rows.rows ?? (rows as unknown as CardRow[]);
}

/**
 * Re-claim intents a crash left behind, and do it ATOMICALLY.
 *
 * `submit` writes its claim rows before calling `batches.create`, so two invocations cannot both
 * submit the same chunks — and `intent_key` is the primary key. A crash in between therefore
 * leaves rows no later run can get past: absent from `done`, so re-planned, and the claim insert
 * then conflicts on every one. The first real dispatch left 127 such rows and they blocked that
 * run id permanently.
 *
 * The caller must already have proved these were never submitted — exhaustive provider search, no
 * batch for the custom id. This function enforces the rest INSIDE the statement: `batch_id is
 * null` and a status that has not moved on. A concurrent invocation that reclaimed the row a
 * moment ago has set it `submitted`, so this UPDATE matches nothing, returns nothing, and that
 * process owns the chunk. Whichever statement matches first wins, decided by the database.
 *
 * Read-then-write would hand one chunk to two `batches.create` calls, which is the double charge
 * the claim exists to prevent. `asked` is left alone: it is read only for collected rows.
 */
export async function reclaimIntents(db: Db, intentKeys: string[]): Promise<string[]> {
  if (intentKeys.length === 0) return [];
  const retaken = await db.update(cardLabelBatches)
    .set({ status: "intended", intendedAt: new Date() })
    .where(and(
      inArray(cardLabelBatches.intentKey, intentKeys),
      isNull(cardLabelBatches.batchId),
      inArray(cardLabelBatches.status, ["intended", "abandoned"]),
    ))
    .returning({ intentKey: cardLabelBatches.intentKey });
  return retaken.map((r) => r.intentKey);
}
