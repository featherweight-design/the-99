// The label build's write paths, proved against a real Postgres.
//
// WHAT ONLY A DATABASE CAN ANSWER HERE. Every rule that decides money is pure and unit-tested
// in `src/lib/labels/plan.test.ts` — the cap, the waves, the floor, the ids. What no unit test
// reaches is whether the transaction wrote what those rules decided, and six facts live there:
//
//   THE CARD READ ACTUALLY RUNS. Its names are bound as ONE array parameter, which a bare
//   interpolation does not do — it renders a row constructor and raises 42809. That took down the
//   first real dispatch, past typecheck, lint, 11,296 tests and `--dry-run`, because the read sat
//   four lines above the provider call and this file's API exclusion silently covered it too.
//   A STRANDED INTENT IS RELEASED, AND ONLY ONCE. The release is a DELETE, so two callers racing
//   one intent cannot both take it — measured on two connections; the UPDATE it replaced let both
//   through, and every single-connection check passed over that.
//
//   AN INTENT SURVIVES A CRASH BEFORE THE ID EXISTS. Anthropic assigns `batch_id` only when
//   `batches.create` RETURNS, so the row goes down first with a null id. A run that dies in
//   that window must leave a row a later run can find — the whole double-charge protection.
//   THE STAMP SCOPES TO ITS OWN WAVE. An earlier wave's unresolved intent keeps its null id
//   when a later wave is submitted. Branded with the new batch's id, it would assert a request
//   belongs to a batch that never contained it, and the resume lookup would adopt the wrong
//   results. Silent, and in the direction that loses money.
//   THE PUBLISH IS ATOMIC AND SCOPED. `delete` + `insert ... select` in one transaction, over
//   the oracle ids this run staged and no others, so a card the run never touched keeps its
//   label and a reader never sees a mixture of two runs.
//   A REFUSAL PUBLISHES NOTHING AND KEEPS STAGING. Below the floor the previous labels stand
//   and the staged rows are kept, because discarding them throws away work already paid for.
//
// WHAT IT DOES NOT PROVE, deliberately: anything that needs the API. No batch is created, no
// model is called, and nothing here spends. The submit path's provider call is exercised by
// the staging run itself, which is a separate and deliberate act.
//
// It writes a fixture under a per-run id and deletes it in a `finally`. Point it at
// `local-dev` or a scratch branch, NEVER production: it writes `card_labels` rows for the
// cards it fixtures, and the publish path DELETES the rows it is about to replace.
import { requireEnv } from "./lib/env.mjs";
const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);

import { randomUUID } from "node:crypto";

import { eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

import { cardLabelBatches, cardLabels, cardLabelsStaging } from "../src/db/schema";
import { meetsFloor, planChunks } from "../src/lib/labels/plan";
import { publishRun, readCardsByName, releaseIntents, stampWave } from "../src/lib/labels/publish";
import { RECLAIM_GRACE_MS } from "../src/lib/labels/plan";
import type { Job } from "../src/lib/labels/types";

const db = drizzle(DATABASE_URL);
const runId = `probe-${randomUUID()}`;
const otherRun = `probe-other-${randomUUID()}`;
/** Section 7's own run, recorded so the cleanup can delete its row without re-deriving the id. */
let strandedRunId: string | null = null;

let failures = 0;
/** Card `c`'s real label, captured before the fixture overwrites it, restored in the finally. */
let restoreC: typeof cardLabels.$inferSelect | null = null;
/** Card `c`'s oracle id, recorded so the cleanup can address it without re-querying. */
let cOracleId: string | null = null;
/**
 * Every `card_labels` row this probe overwrites, captured BEFORE the write, restored after.
 *
 * Cards `a` and `b` are published over by the fixture, and the first version deleted them
 * afterwards by `input_hash like 'h-%'` — which destroys a real label for those cards and any
 * unrelated row whose hash happens to start that way. Captured by oracle id and put back.
 */
const priorRows = new Map<string, typeof cardLabels.$inferSelect>();
let publishedIds: string[] = [];
const report = (what: string, ok: boolean, detail = "") => {
  if (!ok) failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${what}${detail ? ` — ${detail}` : ""}`);
};

const JOB: Job = {
  space: "role", kind: "ramp", rampKind: "tapsForMana", restrictedTo: null,
  trigger: "none", recurrence: "repeatable", threshold: null, modal: false,
};

async function main(): Promise<void> {
  // Real oracle ids, because `card_labels` and staging both carry a foreign key to `cards`.
  const picked = await db.execute<{ oracleId: string; name: string }>(sql`
    select oracle_id as "oracleId", name from cards
     where commander_legal = true order by oracle_id limit 3`);
  const cards = picked.rows ?? (picked as unknown as { oracleId: string; name: string }[]);
  if (cards.length < 3) throw new Error("need three catalog cards; is this database seeded?");
  const [a, b, c] = cards;

  console.log("1. an intent survives a crash before the batch id exists");
  const chunks = planChunks(runId, "claude-sonnet-4-5", [a.name, b.name]);
  await db.insert(cardLabelBatches).values(chunks.map((ch) => ({
    intentKey: ch.intentKey, runId, model: "claude-sonnet-4-5",
    customId: ch.customId, asked: ch.names,
  })));
  const open = await db.select().from(cardLabelBatches).where(eq(cardLabelBatches.runId, runId));
  report("the intent is stored with no batch id", open.length === 1 && open[0].batchId === null,
    `${open.length} row(s), batchId ${String(open[0]?.batchId)}`);
  report("and defaults to `intended`", open[0]?.status === "intended", String(open[0]?.status));

  console.log("2. the stamp scopes to its own wave");
  // A second intent standing in for an EARLIER wave the provider never confirmed.
  const stale = `${runId}:stale:0`;
  await db.insert(cardLabelBatches).values({
    intentKey: stale, runId, model: "claude-sonnet-4-5",
    customId: `${runId.slice(0, 7)}-stale`, asked: [c.name],
  });
  // The REAL stamp, not a copy of it. An earlier version hand-wrote this scoping, so deleting
  // the script's own left every check green — a probe asserting the shape of code nothing runs.
  await stampWave(db, chunks.map((ch) => ch.intentKey), "msgbatch_probe");
  const [staleRow] = await db.select().from(cardLabelBatches)
    .where(eq(cardLabelBatches.intentKey, stale));
  report("the earlier wave's intent keeps its null id", staleRow?.batchId === null,
    `batchId ${String(staleRow?.batchId)}`);
  const [stamped] = await db.select().from(cardLabelBatches)
    .where(eq(cardLabelBatches.intentKey, chunks[0].intentKey));
  report("and this wave's intent got the id", stamped?.batchId === "msgbatch_probe");

  console.log("3. the publish is atomic and scoped to what this run staged");
  // A pre-existing label on a card this run does NOT touch, which must survive the publish.
  //
  // CAPTURED BEFORE IT IS OVERWRITTEN, and restored in the `finally`. An earlier version
  // upserted over whatever was there and then deleted every row whose hash was `untouched` —
  // so pointed at a database holding a real label for that card, the probe destroyed it. The
  // handle is populated before the write it covers, which is the rule `probe:review` learned
  // the same way: a throw part-way through must not strand a loss.
  const [priorC] = await db.select().from(cardLabels).where(eq(cardLabels.oracleId, c.oracleId));
  restoreC = priorC ?? null;
  cOracleId = c.oracleId;
  await db.insert(cardLabels).values({
    oracleId: c.oracleId, labels: [JOB], model: "older-model",
    promptVersion: "0", inputHash: "untouched",
  }).onConflictDoUpdate({
    target: cardLabels.oracleId,
    set: { model: "older-model", promptVersion: "0", inputHash: "untouched", labels: [JOB] },
  });
  // Captured before the publish overwrites them, and the CLEANUP HANDLE IS SET LAST.
  //
  // Order matters and I had it backwards: with `publishedIds` assigned before the select, a failed
  // or partial capture leaves the handle populated and `priorRows` empty — and the `finally` reads
  // a missing entry as "this card had no label" and DELETES a real row. That is the exact rule this
  // file cites from `probe:review` (populate the handle before the write it covers) applied in the
  // wrong order: the handle must cover a capture that has already succeeded.
  const ids = [a.oracleId, b.oracleId];
  const captured = await db.select().from(cardLabels).where(inArray(cardLabels.oracleId, ids));
  for (const row of captured) priorRows.set(row.oracleId, row);
  publishedIds = ids;
  await db.insert(cardLabelsStaging).values([a, b].map((card) => ({
    runId, oracleId: card.oracleId, labels: [JOB],
    model: "claude-sonnet-4-5", promptVersion: "1", inputHash: `h-${card.oracleId}`,
  })));
  const staged = await db.select().from(cardLabelsStaging).where(eq(cardLabelsStaging.runId, runId));
  report("staging holds this run's rows", staged.length === 2, `${staged.length}`);

  // The REAL publish, for the same reason.
  const moved = await publishRun(db, runId);
  report("the publish reports what it moved", moved === 2, `${moved}`);
  const published = await db.select().from(cardLabels)
    .where(inArray(cardLabels.oracleId, [a.oracleId, b.oracleId]));
  report("both staged cards are published", published.length === 2, `${published.length}`);
  report("under this run's model and hash",
    published.every((r) => r.model === "claude-sonnet-4-5" && r.inputHash.startsWith("h-")));
  const [untouched] = await db.select().from(cardLabels).where(eq(cardLabels.oracleId, c.oracleId));
  report("a card this run never staged keeps its old label",
    untouched?.inputHash === "untouched", `hash ${String(untouched?.inputHash)}`);
  const leftover = await db.select().from(cardLabelsStaging).where(eq(cardLabelsStaging.runId, runId));
  report("staging is cleared for the published run", leftover.length === 0, `${leftover.length}`);

  console.log("4. another run's staging is untouched by this one's publish");
  await db.insert(cardLabelsStaging).values({
    runId: otherRun, oracleId: c.oracleId, labels: [JOB],
    model: "m", promptVersion: "1", inputHash: "other",
  });
  await db.transaction(async (tx) => {
    await tx.delete(cardLabelsStaging).where(eq(cardLabelsStaging.runId, runId));
  });
  const other = await db.select().from(cardLabelsStaging).where(eq(cardLabelsStaging.runId, otherRun));
  report("it survives", other.length === 1, `${other.length}`);

  console.log("5. a refusal keeps staging, so paid work is not discarded");
  // The floor decision is pure; what matters here is that refusing writes nothing. The run
  // above staged 2 of 2; this asks the same function about a shortfall.
  const verdict = meetsFloor(1, 10, 0.95);
  report("the floor refuses a shortfall", !verdict.ok);
  const stillThere = await db.select().from(cardLabelsStaging).where(eq(cardLabelsStaging.runId, otherRun));
  report("and the staged rows are still there to inspect", stillThere.length === 1);

  console.log("6. submit's card read, executed — the read that took the first dispatch down");
  // THE POINT OF THIS SECTION. `readCardsByName` lived inline in `submit`, four lines above
  // `batches.create`, and this file's own header excluded "anything that needs the API" — which
  // silently excluded a DATABASE READ as well. So nothing ever executed it, and a bare JS array
  // interpolated into a `sql` template renders `any(($1, $2, $3))`: Postgres 42809, on the first
  // real dispatch, past typecheck, lint, 11,297 tests and `--dry-run`.
  //
  // MORE THAN ONE NAME, deliberately, and asserted as such — though a single name fails too
  // (`any(($1))`), so this is belt and braces rather than the crux.
  // Three names, which matters because the bug is about how a LIST is bound. Asserting
  // `askNames.length > 1` against a literal declared one line up could not fail on any build; the
  // load-bearing assertion is that all three come back, below.
  const askNames = [a.name, b.name, c.name];
  const read = await readCardsByName(db, askNames);
  report("every asked name comes back", read.length === askNames.length, `${read.length} row(s)`);
  report("and they are the names asked for",
    askNames.every((n) => read.some((r) => r.name === n)),
    read.map((r) => r.name).join(", "));
  report("with the prompt's fields populated",
    read.every((r) => typeof r.oracleId === "string" && typeof r.type_line === "string"));
  // A name nobody holds returns nothing rather than throwing, which is what lets `submit`'s
  // `byName.get(...)` filter drop it.
  // A name no catalog row can hold. NOT a NUL byte — Postgres rejects those with 22021
  // `invalid byte sequence`, which is the fixture failing rather than the read under test.
  const none = await readCardsByName(db, [`probe-no-such-card-${randomUUID()}`]);
  report("an unknown name returns no rows rather than throwing", none.length === 0, `${none.length}`);

  console.log("7. an intent a crash stranded is released, and only one caller gets it");
  // EXACTLY THE STATE THE FIRST DISPATCH LEFT: status `intended`, batch_id null, nothing at the
  // provider. 127 such rows block run weekly-2026-W40, because `intent_key` is the primary key so
  // the claim insert conflicts, and the row is absent from `done` so it is re-planned for ever.
  const strandedRun = `probe-stranded-${randomUUID()}`;
  const strandedKey = `${strandedRun}:claude-sonnet-4-5:0`;
  // STATED AGE, because the release is age-scoped and a default `intended_at` of now() is a LIVE
  // claim rather than a stranded row. `stale()` is the cutoff every case below releases against.
  const graceCutoff = () => new Date(Date.now() - RECLAIM_GRACE_MS);
  const longAgo = new Date(Date.now() - 3 * RECLAIM_GRACE_MS);
  const plant = async (key: string, extra: Record<string, unknown> = {}) => {
    await db.insert(cardLabelBatches).values({
      intentKey: key, runId: strandedRun, model: "claude-sonnet-4-5",
      customId: `${key}-custom`, asked: [a.name], intendedAt: longAgo, ...extra,
    });
  };
  strandedRunId = strandedRun;
  await plant(strandedKey);
  const before = await db.select().from(cardLabelBatches)
    .where(eq(cardLabelBatches.intentKey, strandedKey));
  report("the stranded row is `intended` with no batch id",
    before[0]?.status === "intended" && before[0]?.batchId === null,
    `${before[0]?.status}, batchId ${String(before[0]?.batchId)}`);

  const first = await releaseIntents(db, [strandedKey], graceCutoff());
  report("it is released", first.length === 1 && first[0] === strandedKey, `${first.length}`);
  const afterRelease = await db.select().from(cardLabelBatches)
    .where(eq(cardLabelBatches.intentKey, strandedKey));
  report("and the row is GONE, so the insert claim can take it again",
    afterRelease.length === 0, `${afterRelease.length} row(s)`);

  // A row that reached the provider is never released. `stampWave` sets a batch id AND
  // `submitted`, which excludes it twice over — so the case below isolates the clause that does
  // the work, because with both present either one could be removed and this still pass.
  const sentToProvider = `${strandedRun}:claude-sonnet-4-5:1`;
  await plant(sentToProvider);
  await stampWave(db, [sentToProvider], "msgbatch_probe_stranded");
  report("a row that reached the provider is not released",
    (await releaseIntents(db, [sentToProvider], graceCutoff())).length === 0);

  const withId = `${strandedRun}:claude-sonnet-4-5:2`;
  await plant(withId, { batchId: "msgbatch_probe_has_an_id", status: "intended" });
  report("nor one carrying a batch id while still `intended`",
    (await releaseIntents(db, [withId], graceCutoff())).length === 0);

  // THE STATUS CLAUSE IS IMPLIED, and saying so beats claiming coverage it cannot have.
  // `card_label_batches_id_with_status_check` is `status in ('intended','abandoned') or batch_id
  // is not null`, so a null-batch-id row CANNOT carry a moved-on status; removing
  // `inArray(status, ...)` from `releaseIntents` is unfalsifiable against a valid database. What
  // is asserted instead is the constraint, which is the thing actually protecting us.
  let refused = false;
  try { await plant(`${strandedRun}:claude-sonnet-4-5:3`, { status: "collected" }); }
  catch { refused = true; }
  report("the database refuses a moved-on status with no batch id", refused);

  // A LIVE CLAIM MUST SURVIVE, and this is the case whose absence made the release worse than the
  // deadlock it cures. `submit` inserts with `batch_id` null and the status defaulting to
  // `intended`, and only stamps after `batches.create` RETURNS — so a fresh claim is byte-identical
  // to a stranded row on every other clause. Without the age cutoff this release deletes another
  // invocation's in-flight claim, its own insert then finds nothing to conflict with, and the chunk
  // is submitted and charged twice. Planted with the column's real default rather than a stated
  // date, because that is what `submit` writes.
  const liveClaim = `${strandedRun}:claude-sonnet-4-5:5`;
  await db.insert(cardLabelBatches).values({
    intentKey: liveClaim, runId: strandedRun, model: "claude-sonnet-4-5",
    customId: `${liveClaim}-custom`, asked: [a.name],
  });
  report("a live claim written moments ago is NOT released",
    (await releaseIntents(db, [liveClaim], graceCutoff())).length === 0);
  const survived = await db.select().from(cardLabelBatches)
    .where(eq(cardLabelBatches.intentKey, liveClaim));
  report("and its row is still there for its own caller to stamp", survived.length === 1);

  const absent = await releaseIntents(db, [`${strandedRun}:claude-sonnet-4-5:999`], graceCutoff());
  report("an unknown key releases nothing", absent.length === 0, `${absent.length}`);

  console.log("8. two callers race one stranded intent and exactly one wins");
  // THE EXCLUSION, ON TWO CONNECTIONS. Single-connection checks cannot see this: the first
  // implementation was an UPDATE setting `status = "intended"` — a value its own `where` already
  // accepted — so under READ COMMITTED the loser's statement re-evaluated its predicate against
  // the committed row, still matched, and BOTH callers would have called `batches.create` for one
  // chunk. Every single-connection check passed. A delete cannot do that: a row exists once.
  const raced = `${strandedRun}:claude-sonnet-4-5:4`;
  await plant(raced);
  const dbA = drizzle(DATABASE_URL);
  const dbB = drizzle(DATABASE_URL);
  const [ra, rb] = await Promise.all([
    releaseIntents(dbA, [raced], graceCutoff()),
    releaseIntents(dbB, [raced], graceCutoff()),
  ]);
  report("exactly one caller takes it", ra.length + rb.length === 1,
    `A ${ra.length}, B ${rb.length}`);
  const gone = await db.select().from(cardLabelBatches).where(eq(cardLabelBatches.intentKey, raced));
  report("and the row is gone once, not twice", gone.length === 0, `${gone.length} row(s)`);
}

main()
  .then(() => {
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} CHECK(S) FAILED.`);
  })
  .catch((err) => { console.error(err); failures++; })
  // Cleanup runs whatever happened, and each step independently so one failure cannot skip
  // the rest. `process.exit` is deliberately NOT in here: in a `finally` it swallows the
  // exception, which this repository has shipped three times.
  .finally(async () => {
    for (const step of [
      () => db.delete(cardLabelsStaging).where(inArray(cardLabelsStaging.runId, [runId, otherRun])),
      () => db.delete(cardLabelBatches).where(eq(cardLabelBatches.runId, runId)),
      // Section 7's stranded run, on its OWN step so a failure here cannot skip the rest — and
      // guarded on the handle, which is set BEFORE the first insert rather than after it, so a
      // throw anywhere in the section still leaves every row it planted deletable.
      () => strandedRunId === null
        ? Promise.resolve()
        : db.delete(cardLabelBatches).where(eq(cardLabelBatches.runId, strandedRunId)),
      // Card `c` is RESTORED to what it held, or removed if it held nothing. Never deleted by
      // hash: `untouched` is this fixture's marker, and a blanket delete on it would take a
      // real row with the same value.
      async () => {
        if (cOracleId === null) return;
        if (restoreC === null) {
          await db.delete(cardLabels).where(eq(cardLabels.oracleId, cOracleId));
        } else {
          await db.insert(cardLabels).values(restoreC).onConflictDoUpdate({
            target: cardLabels.oracleId,
            set: {
              labels: restoreC.labels, model: restoreC.model,
              promptVersion: restoreC.promptVersion, inputHash: restoreC.inputHash,
            },
          });
        }
      },
      // The two published cards are restored to what they held, or removed if they held
      // nothing. NEVER deleted by hash prefix: `h-%` is this fixture's marker and a real row
      // could carry it.
      async () => {
        for (const id of publishedIds) {
          const prior = priorRows.get(id);
          if (prior === undefined) {
            await db.delete(cardLabels).where(eq(cardLabels.oracleId, id));
          } else {
            await db.insert(cardLabels).values(prior).onConflictDoUpdate({
              target: cardLabels.oracleId,
              set: {
                labels: prior.labels, model: prior.model,
                promptVersion: prior.promptVersion, inputHash: prior.inputHash,
              },
            });
          }
        }
      },
    ]) {
      try { await step(); } catch (e) { console.error("cleanup step failed:", e); failures++; }
    }
    process.exit(failures === 0 ? 0 : 1);
  });
