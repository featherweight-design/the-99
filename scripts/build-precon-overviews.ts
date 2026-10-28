// db:build:precon-overviews — write every plain precon's Overview once, on staging (Hugh,
// 2026-10-27). A deck started from that precon carries it over while its list is the precon's
// (PR 4); the copy installs it on production (PR 3).
//
// THE REQUEST IS THE APP'S OWN. Each precon's list is the one a start writes (`preparePreconDeck`),
// its reading is `loadDeckProfileFromHead` over that list, its facts are `factsWithSource`, its
// prompt is `buildSynopsisPrompt` under contract 12 (v2 with the evidence benchmarks, what
// production writes), its reply is checked by `checkReply`, and a refused section gets ONE repair
// through `repairPrompt` and `applyRepair`, exactly as an Analyze press's write does. Only the
// transport differs: the Batch API, at half price, with the request built by the eval harness's
// `buildParams`, which `request.test.mts` holds equal to what `callModel` sends.
//
// `input_hash` is the hash of that request. A precon whose stored row still has it is skipped and
// stamped current; one whose request moved (card text, combos, labels, the index) is marked NOT
// current before anything is sent, so a stale Overview is never carried over while it waits.
//
// THE CAP: `PRECON_OVERVIEW_MAX_USD` (or `--max-usd`), default and ceiling $15, a worst-case stop
// (`scripts/lib/precon-overview-build.ts`). The dollars come from each reply's usage and go to ONE
// `model_calls` row per batch, feature `precon_overview`, so the admin Costs page shows them; a batch
// whose row cannot be written fails the run (exit 1) naming the batch and its dollars.
//
// FAILS CLOSED on its target: `PRECON_OVERVIEW_TARGET_BRANCH` is never defaulted and must equal
// the database's `neon.branch_id`, or it exits 2 having written nothing.
//
//   PRECON_OVERVIEW_TARGET_BRANCH=br-… PRECON_OVERVIEW_ROLE_BASIS=labels|classifier pnpm db:build:precon-overviews [--dry-run] [--stub] [--readings-only] [--max-usd N] [--limit N]
//   (locally, name the database with PRECON_OVERVIEW_DB_URL)
//
// THE READING TOO (small items 5, PR 6a). Every request is built from the precon's reading
// (`loadDeckProfileFromHead`, no model), so each row also stores that reading (`reading_*`), the
// first reading a start will copy into its deck (PR 6; a start still computes its own until then). It is written, before anything is sent, for every row
// whose stored reading is missing, not current for the precon's list and this code, or whose data
// moved since (a change log entry touching it, `preconReadingDue`), WHATEVER its Overview hash says; a newly stored Overview
// gets one at the write. `--readings-only` does that step alone: no model, no key, no Overview touched.
//
// `--dry-run` builds and hashes every request and prints the worst case, and calls and writes
// nothing (input tokens are ESTIMATED there, at a character count over 3, since counting them is
// an API call). `--stub` answers with the app's synopsis stub and writes, for a probe on a scratch
// branch: the paid model never runs outside the staging build.
import { requireEnv } from "./lib/env.mjs";
import { and, eq, isNull, sql } from "drizzle-orm";

requireEnv(["DATABASE_URL", "PRECON_OVERVIEW_TARGET_BRANCH", "PRECON_OVERVIEW_ROLE_BASIS"]);
// `PRECON_OVERVIEW_DB_URL`, when set, names the database instead: the env import above overrides
// DATABASE_URL from a local `.env`, so a developer's run (a probe on a scratch branch) names its
// target here. The workflow sets DATABASE_URL itself. The client is loaded dynamically below, so it
// reads this value, and the branch check refuses anything but the named branch either way.
if (process.env.PRECON_OVERVIEW_DB_URL) process.env.DATABASE_URL = process.env.PRECON_OVERVIEW_DB_URL;

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const STUB = argv.includes("--stub");
const READINGS_ONLY = argv.includes("--readings-only");
const COLLECT = argv.includes("--collect") ? argv[argv.indexOf("--collect") + 1] : undefined;
if (argv.includes("--collect") && !/^msgbatch_[A-Za-z0-9]+$/.test(COLLECT ?? "")) throw new Error("--collect needs a batch id (msgbatch_…)");
const flag = (name: string): number | undefined => {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const v = Number(argv[i + 1]);
  if (!Number.isFinite(v)) throw new Error(`${name} needs a number`);
  return v;
};

async function main(): Promise<number> {
  const { db } = await import("../src/db");
  const { precons, preconSynopses } = await import("../src/db/schema");
  const { checkReply, repairPrompt, applyRepair } = await import("../src/lib/synopsis/generate");
  const { synopsisResponseSchemaV8Wire } = await import("../src/lib/synopsis/response-schema");
  const { PRECON_OVERVIEW_CONTRACT, buildPreconRequest, preconOverviewCall, preconRequestParams, preconRoleBasis } = await import("./lib/precon-overview-request");
  const { STUB_MODEL, stubReply } = await import("../src/lib/synopsis/stub");
  const { batchCostMicroUsd } = await import("../src/lib/model/prices");
  const { parseReply } = await import("./eval/lib/request.mjs");
  const { countTokens } = await import("./eval/lib/batch.mjs");
  const { collectBatch, customIdFor, submitBatch } = await import("./lib/precon-overview-batch");
  const { systemSpendRow } = await import("./lib/system-spend");
  const { modelCalls } = await import("../src/db/schema");
  const { capMicroUsd, runBuild, worstMicroUsd } = await import("./lib/precon-overview-build");
  const { NO_PRECON_READING, preconReadingColumns, preconReadingDue } = await import("../src/lib/precons/reading-rule");
  const { preconColumnsMoved } = await import("../src/lib/precons/reading");
  const { readCatalogGeneration } = await import("../src/lib/cache/catalog-generation");
  const { readLogHead } = await import("../src/lib/notices/log");
  type Job = import("./lib/precon-overview-build").Job<unknown>;
  type Outgoing = import("./lib/precon-overview-build").Outgoing;
  type SynopsisFacts = import("../src/lib/synopsis/facts").SynopsisFacts;
  type SynopsisReply = import("../src/lib/synopsis/response-schema").SynopsisReply;

  const { rows: [branch] } = await db.execute<{ id: string | null }>(sql`select current_setting('neon.branch_id', true) as id`);
  if (branch?.id !== process.env.PRECON_OVERVIEW_TARGET_BRANCH) {
    console.error(`build-precon-overviews: refusing. This database is ${branch?.id ?? "unknown"}, PRECON_OVERVIEW_TARGET_BRANCH is ${process.env.PRECON_OVERVIEW_TARGET_BRANCH}.`);
    return 2;
  }
  if (READINGS_ONLY && (STUB || COLLECT)) throw new Error("--readings-only writes readings alone: not with --stub or --collect");
  const live = !DRY && !STUB && !READINGS_ONLY;
  if (COLLECT && (DRY || STUB)) throw new Error("--collect collects a real batch: not with --dry-run or --stub");
  if (live) requireEnv(["ANTHROPIC_API_KEY"]);
  // A stub's Overview is a fixture: written only to a scratch branch, never where a real one belongs.
  if (STUB) {
    const { assertScratchBranch } = await import("./lib/scratch-branch.mjs");
    assertScratchBranch(branch?.id ?? null, "db:build:precon-overviews --stub");
  }

  const contract = PRECON_OVERVIEW_CONTRACT;
  const basis = preconRoleBasis(process.env.PRECON_OVERVIEW_ROLE_BASIS);
  const call = preconOverviewCall;
  const model = STUB ? STUB_MODEL : call.model;
  const capMicro = capMicroUsd(process.env.PRECON_OVERVIEW_MAX_USD, flag("--max-usd"));
  const limit = flag("--limit");

  const files = (await db.select({ file: precons.fileName }).from(precons).where(isNull(precons.twinOf)).orderBy(precons.fileName)).map((r) => r.file);
  const stored = new Map((await db.select({
    file: preconSynopses.preconFile, hash: preconSynopses.inputHash, list: preconSynopses.listFingerprint, model: preconSynopses.model,
    reading: preconSynopses.reading, readingPermits: preconSynopses.readingPermits, readingList: preconSynopses.readingList,
    readingCatalog: preconSynopses.readingCatalog, readingProfileVersion: preconSynopses.readingProfileVersion,
    readingRulesVersion: preconSynopses.readingRulesVersion, readingAnalyzedOracleIds: preconSynopses.readingAnalyzedOracleIds,
    readingSeenSeq: preconSynopses.readingSeenSeq, readingAt: preconSynopses.readingAt,
  }).from(preconSynopses).where(and(eq(preconSynopses.contractVersion, contract), eq(preconSynopses.roleBasis, basis)))).map((r) => [r.file, r]));

  // THE READING'S STAMPS, read BEFORE any reading is computed, as `computeAndStoreProfile` reads them:
  // a catalog write or a change log entry landing during the run is past them, so the reading it might
  // have changed is judged not current (or the entry still reported) rather than hidden. Unreadable,
  // the log head is never guessed: no reading is written this run.
  const readingStamps = async () => ({ catalog: await readCatalogGeneration(), seenSeq: await readLogHead(db) });
  const stamps = await readingStamps();
  const readingFor = (req: { list: string; profile: import("../src/lib/profile/types").DeckProfile; analyzedOracleIds: string[] }, at: { catalog: string; seenSeq: number | null }) =>
    at.seenSeq === null ? NO_PRECON_READING : preconReadingColumns({ profile: req.profile, list: req.list, catalog: at.catalog, seenSeq: at.seenSeq, analyzedOracleIds: req.analyzedOracleIds, at: new Date() });
  let readings = 0;

  const inputTokensOf = async (params: object) => (live ? countTokens(params as never) : Math.ceil(JSON.stringify(params).length / 3));

  const facts = new Map<string, SynopsisFacts>();
  const meta = new Map<string, { file: string; list: string; hash: string }>();
  const jobs: Job[] = [];
  const skipped: { file: string; why: string }[] = [];
  let current = 0;
  let held = 0;
  for (const [i, file] of files.entries()) {
    const req = await buildPreconRequest(file, basis);
    if (!req.ok) {
      skipped.push({ file, why: req.why });
      // No request means no way to show a stored row still fits: it is never carried over meanwhile.
      if (stored.has(file) && !DRY) await db.update(preconSynopses).set({ current: false, checkedAt: new Date() })
        .where(and(eq(preconSynopses.preconFile, file), eq(preconSynopses.contractVersion, contract), eq(preconSynopses.roleBasis, basis)));
      continue;
    }
    const { list, params, hash } = req;
    const had = stored.get(file);
    // The reading first, and whatever the Overview's hash says: no model, so never held by the cap.
    if (had && preconReadingDue(had, { list, moved: await preconColumnsMoved(had, list) })) {
      readings += 1;
      if (!DRY && stamps.seenSeq !== null) await db.update(preconSynopses).set(readingFor(req, stamps))
        .where(and(eq(preconSynopses.preconFile, file), eq(preconSynopses.contractVersion, contract), eq(preconSynopses.roleBasis, basis)));
    }
    if (READINGS_ONLY) continue;
    // Current only when written for this very request by the model this run writes with, so a
    // stub's row on a scratch branch never stands in for the real one.
    if (had && had.hash === hash && had.list === list && had.model === model) {
      current += 1;
      if (!DRY) await db.update(preconSynopses).set({ current: true, checkedAt: new Date() })
        .where(and(eq(preconSynopses.preconFile, file), eq(preconSynopses.contractVersion, contract), eq(preconSynopses.roleBasis, basis)));
      continue;
    }
    // Its inputs moved: never carried over while its replacement waits (or fails, or is deferred).
    if (had && !DRY) await db.update(preconSynopses).set({ current: false, checkedAt: new Date() })
      .where(and(eq(preconSynopses.preconFile, file), eq(preconSynopses.contractVersion, contract), eq(preconSynopses.roleBasis, basis)));
    // `--limit` caps what is SENT, never what is checked: every precon past it is still hashed above,
    // so a row whose inputs moved is marked not current whatever the limit.
    if (limit !== undefined && jobs.length >= limit) {
      held += 1;
      continue;
    }
    const customId = customIdFor(i, hash);
    facts.set(customId, req.facts);
    meta.set(customId, { file, list, hash });
    const f = req.facts;
    jobs.push({
      file,
      first: { customId, params, worstMicro: worstMicroUsd(call.model, await inputTokensOf(params), call.maxTokens) },
      check: (v) => checkReply(v as SynopsisReply, f, true),
      repair: async (content, failing, v): Promise<Outgoing> => {
        const p = preconRequestParams(repairPrompt(f, content, failing, true, v as SynopsisReply));
        const repairId = customIdFor(i, hash, true);
        facts.set(repairId, f);
        return { customId: repairId, params: p, worstMicro: worstMicroUsd(call.model, await inputTokensOf(p), call.maxTokens) };
      },
      merge: (first, v, failing) => applyRepair(first, { ok: true, value: v as SynopsisReply, usage: { inputTokens: 0, outputTokens: 0 } } as never, failing, f, true),
    });
  }

  console.log(`readings: ${readings} ${DRY ? "due" : stamps.seenSeq === null ? "due, NOT written (the change log head was unreadable)" : "written"} at catalog generation ${stamps.catalog}`);
  if (READINGS_ONLY) {
    console.log("readings only: nothing was sent and no Overview was touched");
    return 0;
  }
  const worst = jobs.reduce((n, j) => n + j.first.worstMicro, 0);
  console.log(`precons: ${files.length} plain, ${current} current, ${jobs.length} to write, ${held} held back by --limit, ${skipped.length} skipped`);
  for (const s of skipped) console.log(`  skipped ${s.file}: ${s.why}`);
  console.log(`first answers' worst case $${(worst / 1e6).toFixed(2)}${live ? "" : " (input tokens estimated)"}; cap $${(capMicro / 1e6).toFixed(2)}; model ${model}; role basis ${basis}`);
  if (DRY) {
    console.log("dry run: nothing was called and nothing was written");
    return 0;
  }

  const unrecorded: { batchId: string; usd: number; error: string }[] = [];
  const moved: string[] = [];
  type Reply = import("./lib/precon-overview-build").Reply<unknown>;
  type Stored = import("./lib/precon-overview-build").Stored;

  // STRICT, unlike the shared helper: this job keeps no ledger of its own, so a batch's dollars reach
  // the Costs page through this row or not at all. Keyed on the batch: written with the batch's WORST
  // case the moment it is accepted, then replaced by what it cost, so a run that dies while waiting
  // still shows the batch's spend at its ceiling. A row that cannot be written fails the run, naming it.
  const recordSpend = async (batchId: string, usd: number, tokens?: { input: number; output: number; cacheRead: number; cacheWrite: number }) => {
    const row = systemSpendRow({ feature: "precon_overview", model: call.model, usd, key: `precon_overview:${batchId}`, tokens });
    const write = () => db.insert(modelCalls).values(row).onConflictDoUpdate({
      target: modelCalls.id,
      set: { costMicroUsd: row.costMicroUsd, inputTokens: row.inputTokens, outputTokens: row.outputTokens },
    });
    try {
      await write();
    } catch {
      try {
        await write();
      } catch (e) {
        unrecorded.push({ batchId, usd, error: e instanceof Error ? e.message : String(e) });
      }
    }
  };
  const repliesOf = (results: import("./eval/lib/batch.mjs").Got[]): Reply[] => results.map((g) => {
    if (!g.ok) return { customId: g.customId, ok: false as const, reason: g.reason, micro: 0, usage: { input: 0, output: 0 } };
    const u = g.message.usage;
    const usage = { input: u.input_tokens, output: u.output_tokens };
    const micro = batchCostMicroUsd(call.model, { inTokens: u.input_tokens, outTokens: u.output_tokens, cacheWriteTokens: u.cache_creation_input_tokens ?? 0, cacheReadTokens: u.cache_read_input_tokens ?? 0 });
    const parsed = parseReply(synopsisResponseSchemaV8Wire, g.message);
    return parsed.ok
      ? { customId: g.customId, ok: true as const, value: parsed.value as unknown, micro, usage }
      : { customId: g.customId, ok: false as const, reason: parsed.reason, micro, usage };
  });
  const spendOf = (replies: readonly Reply[]) => ({
    micro: replies.reduce((n, r) => n + r.micro, 0),
    tokens: replies.reduce((t, r) => ({ ...t, input: t.input + r.usage.input, output: t.output + r.usage.output }), { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }),
  });
  const store = async (s: Stored) => {
    const m = [...meta.values()].find((x) => x.file === s.file)!;
    // THE INPUTS ARE RE-CHECKED AT THE WRITE: the catalog can move while a batch runs. The answer is
    // stored either way (it is paid for), but current only when this database still builds the very
    // request it answered; otherwise the next run, or the copy, writes or checks it again.
    const at = await readingStamps();
    const now = await buildPreconRequest(s.file, basis);
    const fits = now.ok && now.hash === m.hash && now.list === m.list;
    if (!fits) moved.push(s.file);
    const row = {
      preconFile: s.file, contractVersion: contract, roleBasis: basis, listFingerprint: m.list, inputHash: m.hash, model, content: s.content,
      inputTokens: s.usage.input, outputTokens: s.usage.output, costMicroUsd: s.micro, current: fits, createdAt: new Date(), checkedAt: new Date(),
      // The reading of the request this database builds NOW, whatever the Overview's fit: judged by its own key.
      ...(now.ok ? readingFor(now, at) : NO_PRECON_READING),
    };
    await db.insert(preconSynopses).values(row).onConflictDoUpdate({ target: [preconSynopses.preconFile, preconSynopses.contractVersion, preconSynopses.roleBasis], set: row });
  };

  // `--collect <batch id>`: the results of a batch an earlier run submitted and never collected. Only a
  // first answer whose custom id carries THIS run's request hash for its precon is stored (the id
  // embeds it, `customIdFor`); a precon whose inputs moved since, and a repair's answer (its first
  // answer is gone), are left to the next ordinary run. Nothing new is sent.
  if (COLLECT) {
    const replies = repliesOf(await collectBatch(COLLECT, (l) => console.log(l)));
    const spent = spendOf(replies);
    await recordSpend(COLLECT, spent.micro / 1e6, spent.tokens);
    const byId = new Map(jobs.map((j) => [j.first.customId, j]));
    let kept = 0;
    let left = 0;
    for (const r of replies) {
      const job = byId.get(r.customId);
      if (!job || !r.ok) {
        left += 1;
        continue;
      }
      try {
        const content = await job.check(r.value);
        if (content.verdicts.every((v) => v.status === "ok")) {
          await store({ file: job.file, content, micro: r.micro, usage: r.usage });
          kept += 1;
        } else left += 1;
      } catch (e) {
        console.error(`  ${job.file}: ${e instanceof Error ? e.message : String(e)}`);
        left += 1;
      }
    }
    console.log(`collected batch ${COLLECT}: stored ${kept}, left ${left} to the next run; it cost $${(spent.micro / 1e6).toFixed(4)}`);
    for (const f of moved) console.log(`  stored NOT current ${f}: its inputs moved while the batch ran`);
    if (unrecorded.length > 0) {
      for (const u of unrecorded) console.error(`model_calls: batch ${u.batchId} ($${u.usd.toFixed(4)}) was NOT recorded: ${u.error}`);
      return 1;
    }
    return 0;
  }

  const result = await runBuild<unknown>({
    jobs,
    capMicro,
    log: (line) => console.log(line),
    send: async (batch) => {
      if (STUB) {
        return {
          batchId: `stub-${Date.now()}`,
          replies: batch.map((o) => {
            const out = stubReply(facts.get(o.customId)!, "survived", o.customId.endsWith("-r"), true);
            return out.ok
              ? { customId: o.customId, ok: true as const, value: out.value as unknown, micro: 0, usage: { input: 0, output: 0 } }
              : { customId: o.customId, ok: false as const, reason: out.errorClass, micro: 0, usage: { input: 0, output: 0 } };
          }),
        };
      }
      const batchId = await submitBatch(batch.map((o) => ({ customId: o.customId, params: o.params as never })));
      console.log(`batch ${batchId}: ${batch.length} requests submitted (if this run dies, collect it with --collect ${batchId})`);
      await recordSpend(batchId, batch.reduce((n, o) => n + o.worstMicro, 0) / 1e6);
      const replies = repliesOf(await collectBatch(batchId, (l) => console.log(l)));
      const spent = spendOf(replies);
      await recordSpend(batchId, spent.micro / 1e6, spent.tokens);
      return { batchId, replies };
    },
    store,
  });

  console.log(`\nstored ${result.stored.length} of ${jobs.length}; failed ${result.failed.length}; deferred ${result.deferred.length}`);
  for (const f of result.failed) console.log(`  failed ${f.file}: ${f.reason}`);
  for (const d of result.deferred) console.log(`  deferred ${d} (the cap)`);
  for (const f of moved) console.log(`  stored NOT current ${f}: its inputs moved while the batch ran`);
  console.log(`spent $${(result.spentMicro / 1e6).toFixed(4)} over ${result.batches.length} batch(es)`);
  if (unrecorded.length > 0) {
    for (const u of unrecorded) console.error(`model_calls: batch ${u.batchId} ($${u.usd.toFixed(4)}) was NOT recorded: ${u.error}`);
    return 1;
  }
  return 0;
}

main().then((code) => process.exit(code)).catch((e) => {
  console.error(e);
  process.exit(1);
});
