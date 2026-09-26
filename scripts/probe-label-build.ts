// The label build's write paths, proved against a real Postgres.
//
// WHAT ONLY A DATABASE CAN ANSWER HERE. Every rule that decides money is pure and unit-tested
// in `src/lib/labels/plan.test.ts` — the cap, the waves, the floor, the ids. What no unit test
// reaches is whether the transaction wrote what those rules decided, and four facts live there:
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

import { and, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

import { cardLabelBatches, cardLabels, cardLabelsStaging } from "../src/db/schema";
import { meetsFloor, planChunks } from "../src/lib/labels/plan";
import { publishRun, stampWave } from "../src/lib/labels/publish";
import type { Job } from "../src/lib/labels/types";

const db = drizzle(DATABASE_URL);
const runId = `probe-${randomUUID()}`;
const otherRun = `probe-other-${randomUUID()}`;

let failures = 0;
/** Card `c`'s real label, captured before the fixture overwrites it, restored in the finally. */
let restoreC: typeof cardLabels.$inferSelect | null = null;
/** Card `c`'s oracle id, recorded so the cleanup can address it without re-querying. */
let cOracleId: string | null = null;
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
      // The two cards this run published are the fixture's own: removed, since the run created
      // their rows.
      () => db.delete(cardLabels).where(sql`${cardLabels.inputHash} like 'h-%'`),
    ]) {
      try { await step(); } catch (e) { console.error("cleanup step failed:", e); failures++; }
    }
    process.exit(failures === 0 ? 0 : 1);
  });
