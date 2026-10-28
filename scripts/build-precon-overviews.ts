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
// `model_calls` row per batch, feature `precon_overview`, so the admin Costs page shows them.
//
// FAILS CLOSED on its target: `PRECON_OVERVIEW_TARGET_BRANCH` is never defaulted and must equal
// the database's `neon.branch_id`, or it exits 2 having written nothing.
//
//   PRECON_OVERVIEW_TARGET_BRANCH=br-… pnpm db:build:precon-overviews [--dry-run] [--stub] [--max-usd N] [--limit N]
//   (locally, name the database with PRECON_OVERVIEW_DB_URL)
//
// `--dry-run` builds and hashes every request and prints the worst case, and calls and writes
// nothing (input tokens are ESTIMATED there, at a character count over 3, since counting them is
// an API call). `--stub` answers with the app's synopsis stub and writes, for a probe on a scratch
// branch: the paid model never runs outside the staging build.
import { requireEnv } from "./lib/env.mjs";
import { and, eq, isNull, sql } from "drizzle-orm";

requireEnv(["DATABASE_URL", "PRECON_OVERVIEW_TARGET_BRANCH"]);
// `PRECON_OVERVIEW_DB_URL`, when set, names the database instead: the env import above overrides
// DATABASE_URL from a local `.env`, so a developer's run (a probe on a scratch branch) names its
// target here. The workflow sets DATABASE_URL itself. The client is loaded dynamically below, so it
// reads this value, and the branch check refuses anything but the named branch either way.
if (process.env.PRECON_OVERVIEW_DB_URL) process.env.DATABASE_URL = process.env.PRECON_OVERVIEW_DB_URL;

const argv = process.argv.slice(2);
const DRY = argv.includes("--dry-run");
const STUB = argv.includes("--stub");
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
  const { PRECON_OVERVIEW_CONTRACT, buildPreconRequest, preconOverviewCall, preconRequestParams } = await import("./lib/precon-overview-request");
  const { STUB_MODEL, stubReply } = await import("../src/lib/synopsis/stub");
  const { batchCostMicroUsd } = await import("../src/lib/model/prices");
  const { parseReply } = await import("./eval/lib/request.mjs");
  const { sendBatch, countTokens } = await import("./eval/lib/batch.mjs");
  const { recordSystemSpend } = await import("./lib/system-spend");
  const { capMicroUsd, runBuild, worstMicroUsd } = await import("./lib/precon-overview-build");
  type Job = import("./lib/precon-overview-build").Job<unknown>;
  type Outgoing = import("./lib/precon-overview-build").Outgoing;
  type SynopsisFacts = import("../src/lib/synopsis/facts").SynopsisFacts;
  type SynopsisReply = import("../src/lib/synopsis/response-schema").SynopsisReply;

  const { rows: [branch] } = await db.execute<{ id: string | null }>(sql`select current_setting('neon.branch_id', true) as id`);
  if (branch?.id !== process.env.PRECON_OVERVIEW_TARGET_BRANCH) {
    console.error(`build-precon-overviews: refusing. This database is ${branch?.id ?? "unknown"}, PRECON_OVERVIEW_TARGET_BRANCH is ${process.env.PRECON_OVERVIEW_TARGET_BRANCH}.`);
    return 2;
  }
  const live = !DRY && !STUB;
  if (live) requireEnv(["ANTHROPIC_API_KEY"]);
  // A stub's Overview is a fixture: written only to a scratch branch, never where a real one belongs.
  if (STUB) {
    const { assertScratchBranch } = await import("./lib/scratch-branch.mjs");
    assertScratchBranch(branch?.id ?? null, "db:build:precon-overviews --stub");
  }

  const contract = PRECON_OVERVIEW_CONTRACT;
  const call = preconOverviewCall;
  const model = STUB ? STUB_MODEL : call.model;
  const capMicro = capMicroUsd(process.env.PRECON_OVERVIEW_MAX_USD, flag("--max-usd"));
  const limit = flag("--limit");

  const files = (await db.select({ file: precons.fileName }).from(precons).where(isNull(precons.twinOf)).orderBy(precons.fileName)).map((r) => r.file);
  const stored = new Map((await db.select({ file: preconSynopses.preconFile, hash: preconSynopses.inputHash, list: preconSynopses.listFingerprint, model: preconSynopses.model })
    .from(preconSynopses).where(eq(preconSynopses.contractVersion, contract))).map((r) => [r.file, r]));

  const inputTokensOf = async (params: object) => (live ? countTokens(params as never) : Math.ceil(JSON.stringify(params).length / 3));

  const facts = new Map<string, SynopsisFacts>();
  const meta = new Map<string, { file: string; list: string; hash: string }>();
  const jobs: Job[] = [];
  const skipped: { file: string; why: string }[] = [];
  let current = 0;
  let held = 0;
  for (const [i, file] of files.entries()) {
    const req = await buildPreconRequest(file);
    if (!req.ok) {
      skipped.push({ file, why: req.why });
      continue;
    }
    const { list, params, hash } = req;
    const had = stored.get(file);
    // Current only when written for this very request by the model this run writes with, so a
    // stub's row on a scratch branch never stands in for the real one.
    if (had && had.hash === hash && had.list === list && had.model === model) {
      current += 1;
      if (!DRY) await db.update(preconSynopses).set({ current: true, checkedAt: new Date() })
        .where(and(eq(preconSynopses.preconFile, file), eq(preconSynopses.contractVersion, contract)));
      continue;
    }
    // Its inputs moved: never carried over while its replacement waits (or fails, or is deferred).
    if (had && !DRY) await db.update(preconSynopses).set({ current: false, checkedAt: new Date() })
      .where(and(eq(preconSynopses.preconFile, file), eq(preconSynopses.contractVersion, contract)));
    // `--limit` caps what is SENT, never what is checked: every precon past it is still hashed above,
    // so a row whose inputs moved is marked not current whatever the limit.
    if (limit !== undefined && jobs.length >= limit) {
      held += 1;
      continue;
    }
    const customId = `p${i}`;
    facts.set(customId, req.facts);
    meta.set(customId, { file, list, hash });
    const f = req.facts;
    jobs.push({
      file,
      first: { customId, params, worstMicro: worstMicroUsd(call.model, await inputTokensOf(params), call.maxTokens) },
      check: (v) => checkReply(v as SynopsisReply, f, true),
      repair: async (content, failing, v): Promise<Outgoing> => {
        const p = preconRequestParams(repairPrompt(f, content, failing, true, v as SynopsisReply));
        facts.set(`${customId}-r`, f);
        return { customId: `${customId}-r`, params: p, worstMicro: worstMicroUsd(call.model, await inputTokensOf(p), call.maxTokens) };
      },
      merge: (first, v, failing) => applyRepair(first, { ok: true, value: v as SynopsisReply, usage: { inputTokens: 0, outputTokens: 0 } } as never, failing, f, true),
    });
  }

  const worst = jobs.reduce((n, j) => n + j.first.worstMicro, 0);
  console.log(`precons: ${files.length} plain, ${current} current, ${jobs.length} to write, ${held} held back by --limit, ${skipped.length} skipped`);
  for (const s of skipped) console.log(`  skipped ${s.file}: ${s.why}`);
  console.log(`first answers' worst case $${(worst / 1e6).toFixed(2)}${live ? "" : " (input tokens estimated)"}; cap $${(capMicro / 1e6).toFixed(2)}; model ${model}`);
  if (DRY) {
    console.log("dry run: nothing was called and nothing was written");
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
      const { batchId, results } = await sendBatch(batch.map((o) => ({ customId: o.customId, params: o.params as never })), (l) => console.log(l));
      const replies = results.map((g) => {
        if (!g.ok) return { customId: g.customId, ok: false as const, reason: g.reason, micro: 0, usage: { input: 0, output: 0 } };
        const u = g.message.usage;
        const usage = { input: u.input_tokens, output: u.output_tokens };
        const micro = batchCostMicroUsd(call.model, { inTokens: u.input_tokens, outTokens: u.output_tokens, cacheWriteTokens: u.cache_creation_input_tokens ?? 0, cacheReadTokens: u.cache_read_input_tokens ?? 0 });
        const parsed = parseReply(synopsisResponseSchemaV8Wire, g.message);
        return parsed.ok
          ? { customId: g.customId, ok: true as const, value: parsed.value as unknown, micro, usage }
          : { customId: g.customId, ok: false as const, reason: parsed.reason, micro, usage };
      });
      const micro = replies.reduce((n, r) => n + r.micro, 0);
      const tokens = replies.reduce((t, r) => ({ ...t, input: t.input + r.usage.input, output: t.output + r.usage.output }), { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
      await recordSystemSpend({ feature: "precon_overview", model: call.model, usd: micro / 1e6, key: `precon_overview:${batchId}`, tokens });
      return { batchId, replies };
    },
    store: async (s) => {
      const m = [...meta.values()].find((x) => x.file === s.file)!;
      const row = {
        preconFile: s.file, contractVersion: contract, listFingerprint: m.list, inputHash: m.hash, model, content: s.content,
        inputTokens: s.usage.input, outputTokens: s.usage.output, costMicroUsd: s.micro, current: true, createdAt: new Date(), checkedAt: new Date(),
      };
      await db.insert(preconSynopses).values(row).onConflictDoUpdate({ target: [preconSynopses.preconFile, preconSynopses.contractVersion], set: row });
    },
  });

  console.log(`\nstored ${result.stored.length} of ${jobs.length}; failed ${result.failed.length}; deferred ${result.deferred.length}`);
  for (const f of result.failed) console.log(`  failed ${f.file}: ${f.reason}`);
  for (const d of result.deferred) console.log(`  deferred ${d} (the cap)`);
  console.log(`spent $${(result.spentMicro / 1e6).toFixed(4)} over ${result.batches.length} batch(es)`);
  return 0;
}

main().then((code) => process.exit(code)).catch((e) => {
  console.error(e);
  process.exit(1);
});
