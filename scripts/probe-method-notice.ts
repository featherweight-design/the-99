// probe:method-notice — the free method-change rewrite against a real Postgres (overview
// accuracy, PR 5; plan 7.4; the addendum_method_notice READINESS audit, build rules 1 to 5, 11),
// by calling the real `writeSynopsisFor`, `retrySynopsisFor` and `readSynopsisState`.
//
// What no unit test reaches is what the rewrite WROTE: the `system` row in the ledger, the
// player's allowance left exactly where it was, the cap of two attempts per deck, and the
// `reused` early return bypassed at BOTH sites (the pre-check in `run` and the re-decision under
// the reservation lock in `startRun`).
//
// THE MODEL IS INJECTED and spends nothing: a fake built by the same `stubReply` the dev server
// uses. The overviews it starts from are contract 7, written with the switch OFF; every rewrite
// runs with `OVERVIEW_V2_ENABLED` on.
//
// FIXTURE. Default: one deck under a per-run `user_id`, deleted in a `finally`. With `--seed`
// (and `PROBE_USER_ID`, the browser account) it leaves five decks standing in the states the
// contact sheet photographs, and prints their ids; `--unseed` removes them. Refuses any database
// that is not `local-dev` by `neon.branch_id`. NEVER point it anywhere else.
//
//   pnpm probe:method-notice
//   PROBE_USER_ID=user_... pnpm probe:method-notice --seed   # then: --unseed

// First, and on its own line: the helper's import loads `.env`.
import { requireEnv } from "./lib/env.mjs";
import { sql } from "drizzle-orm";

import { db } from "../src/db";
import { readCatalogGeneration } from "../src/lib/cache/catalog-generation";
import { touchDeck } from "../src/lib/decks/touch";
import { loadDeckProfile } from "../src/lib/profile/load";
import { computeAndStoreProfile, type StoredProfileDeps } from "../src/lib/profile/stored";
import type { ModelOutcome } from "../src/lib/model/client";
import { readAllowance } from "../src/lib/model/allowance";
import { retrySynopsisFor, writeSynopsisFor, type GenerateDeps } from "../src/lib/synopsis/generate";
import { readSynopsisState } from "../src/lib/synopsis/read";
import type { SynopsisReply } from "../src/lib/synopsis/response-schema";
import { STUB_MODEL, stubReply, type StubMode } from "../src/lib/synopsis/stub";

const LOCAL_DEV = "br-patient-hall-a6nbonvo";
requireEnv(["DATABASE_URL"]);

const SEED = process.argv.includes("--seed");
const UNSEED = process.argv.includes("--unseed");
const USER = SEED || UNSEED ? requireEnv(["PROBE_USER_ID"]).PROBE_USER_ID : `probe-method-notice-${Date.now()}`;
const SEED_PREFIX = "mn-";

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
};
const rows = async <T>(text: ReturnType<typeof sql>): Promise<T[]> => (await db.execute(text)).rows as T[];

const profileDeps: StoredProfileDeps = {
  generation: () => readCatalogGeneration(),
  compute: (deckId, userId) => loadDeckProfile(deckId, userId),
};

let calls = 0;
let queue: StubMode[] = [];
const delayMs = 0;
const deps: GenerateDeps = {
  modelName: STUB_MODEL,
  model: async (req, facts): Promise<ModelOutcome<SynopsisReply>> => {
    calls += 1;
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    return stubReply(facts, queue.shift() ?? "survived", false, !!req.v2);
  },
  now: () => new Date(),
  profile: profileDeps,
};

const setV2 = (on: boolean) => { if (on) process.env.OVERVIEW_V2_ENABLED = "true"; else delete process.env.OVERVIEW_V2_ENABLED; };
const state = async (deckId: string) => (await readSynopsisState(deckId, USER, profileDeps))!;
const origins = async (deckId: string) => rows<{ origin: string; status: string; contract_version: number }>(sql`
  select mc.origin, mc.status, ds.contract_version from deck_synopses ds join model_calls mc on mc.id = ds.model_call_id
  where ds.deck_id = ${deckId}::uuid order by ds.created_at`);

async function makeDeck(name: string, offset: number): Promise<string> {
  const [legend] = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line ilike '%Legendary Creature%' order by oracle_id offset ${offset} limit 1`);
  const pool = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line not ilike '%Land%' and oracle_id <> ${legend.oracle_id}::uuid
    order by oracle_id offset ${offset * 7} limit 99`);
  if (!legend || pool.length < 99) throw new Error("the catalog is too small for a fixture");
  const [deck] = await rows<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id) values (${USER}, ${name}, ${legend.oracle_id}::uuid) returning id`);
  await db.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values ${sql.join(
    pool.map((c) => sql`(${deck.id}::uuid, ${c.oracle_id}::uuid, 1)`), sql`, `)}`);
  return deck.id;
}

/** A deck holding a fresh reading and an overview written the OLD way (contract 7, switch off). */
async function oldDeck(name: string, offset: number): Promise<string> {
  const id = await makeDeck(name, offset);
  setV2(false);
  await computeAndStoreProfile(id, USER, profileDeps);
  const first = await writeSynopsisFor(id, USER, deps);
  if (first.kind !== "written" || first.outcome !== "survived") throw new Error(`the contract-7 write failed: ${JSON.stringify(first)}`);
  // The player's credit for it is long spent: age it out of the window so the allowance starts whole.
  await db.execute(sql`update model_calls set created_at = now() - interval '25 hours'
    where id in (select model_call_id from deck_synopses where deck_id = ${id}::uuid)`);
  setV2(true);
  return id;
}

/** Spend `n` free tries that FAIL, the way the app would: a press, the model busy. */
async function failFree(deckId: string, n: number) {
  for (let i = 0; i < n; i++) {
    queue = ["busy"];
    const got = await writeSynopsisFor(deckId, USER, deps);
    if (got.kind !== "written" || got.outcome !== "upstream_busy") throw new Error(`free try ${i + 1}: ${JSON.stringify(got)}`);
  }
}

/**
 * Removes what this probe wrote. A throwaway user owns nothing else, so all of its ledger goes; the
 * browser account in seed mode owns real rows, so only the calls this probe's own overviews hold
 * are deleted, and nothing else of the account is touched.
 */
async function cleanup() {
  const mine = SEED || UNSEED ? sql` and name like ${SEED_PREFIX + "%"}` : sql``;
  const held = await rows<{ id: string }>(sql`
    select ds.model_call_id as id from deck_synopses ds join decks d on d.id = ds.deck_id
    where d.user_id = ${USER}${SEED || UNSEED ? sql` and d.name like ${SEED_PREFIX + "%"}` : sql``}`);
  await db.execute(sql`delete from decks where user_id = ${USER}${mine}`);
  if (!SEED && !UNSEED) await db.execute(sql`delete from model_calls where user_id = ${USER}`);
  else for (const h of held) await db.execute(sql`delete from model_calls where id = ${h.id}::uuid`);
}

async function seed() {
  await cleanup();
  const a = await oldDeck(`${SEED_PREFIX}eligible`, 0);
  // Two more eligible decks the contact sheet PRESSES (one per width), so the press at the second
  // width does not find the first one's rewrite already landed.
  const pp = await oldDeck(`${SEED_PREFIX}press-phone`, 5);
  const pd = await oldDeck(`${SEED_PREFIX}press-desktop`, 6);
  const b = await oldDeck(`${SEED_PREFIX}one-left`, 1);
  await failFree(b, 1);
  const c = await oldDeck(`${SEED_PREFIX}both-used`, 2);
  await failFree(c, 2);
  // 1f: an edit makes the reading stale (the banner leads) over a deck that is still eligible.
  const d = await oldDeck(`${SEED_PREFIX}with-stale-banner`, 3);
  const [extra] = await rows<{ oracle_id: string }>(sql`select oracle_id from cards where type_line not ilike '%Land%' order by oracle_id offset 5000 limit 1`);
  await db.transaction(async (tx) => {
    await tx.execute(sql`update deck_cards set oracle_id = ${extra.oracle_id}::uuid where ctid = (select ctid from deck_cards where deck_id = ${d}::uuid limit 1)`);
    await touchDeck(tx, d);
  });
  // The reading fresh but the overview behind the list (ruling D's row beside the notice).
  const e = await oldDeck(`${SEED_PREFIX}with-older-row`, 4);
  await db.transaction(async (tx) => {
    await tx.execute(sql`update deck_cards set oracle_id = ${extra.oracle_id}::uuid where ctid = (select ctid from deck_cards where deck_id = ${e}::uuid limit 1)`);
    await touchDeck(tx, e);
  });
  await computeAndStoreProfile(e, USER, profileDeps);
  console.log(`export MN_ELIGIBLE=${a} MN_PRESS_PHONE=${pp} MN_PRESS_DESKTOP=${pd} MN_ONE_LEFT=${b} MN_BOTH_USED=${c} MN_WITH_STALE=${d} MN_WITH_OLDER_ROW=${e}`);
}

async function scenarios() {
  const allowanceUsed = async () => (await readAllowance(USER, new Date(), "synopsis")).used;

  // 1 · ELIGIBLE: an overview written the old way, switch on.
  const deck = await oldDeck("probe method notice", 0);
  let s = await state(deck);
  check("an old-contract overview owes the notice, two tries", s.methodNotice, { attemptsLeft: 2 });
  check("…and the contract change did not stale it (ruling B)", [s.stale, s.pressWrites], [false, false]);
  setV2(false);
  check("…with the switch off there is no notice", (await state(deck)).methodNotice, null);
  setV2(true);

  // 2 · A FREE FAILURE: system origin, refunded, the allowance untouched, one try left.
  const before = await allowanceUsed();
  calls = 0;
  await failFree(deck, 1);
  check("a failed free try calls the model once", calls, 1);
  check("…is written as a system call", (await origins(deck)).slice(-1), [{ origin: "system", status: "refunded", contract_version: 8 }]);
  check("…and touches no credit", await allowanceUsed(), before);
  s = await state(deck);
  check("…leaving one try, carried by the notice", [s.methodNotice, s.lastFree, s.lastFailed], [{ attemptsLeft: 1 }, true, true]);

  // 3 · THE ALLOWANCE IS NOT NEEDED: every credit spent and the rewrite still runs.
  await db.execute(sql`insert into model_calls (user_id, feature, status) select ${USER}, 'synopsis', 'spent' from generate_series(1, 10)`);
  check("every credit is out", (await state(deck)).allowance.used >= (await state(deck)).allowance.limit, true);
  calls = 0;
  queue = ["busy"];
  const second = await writeSynopsisFor(deck, USER, deps);
  check("the second free try runs with no credit left", [second.kind, calls], ["written", 1]);
  s = await state(deck);
  check("…and both tries are then used: the paid fallback", s.methodNotice, { attemptsLeft: 0 });

  // 4 · THE CAP: a third free attempt is refused, and falls to the player path (which says so).
  calls = 0;
  const third = await writeSynopsisFor(deck, USER, deps);
  check("a third attempt is refused: the player's allowance answers", [third.kind, calls], ["allowance", 0]);
  check("…and wrote no third system call", (await origins(deck)).filter((r) => r.origin === "system").length, 2);

  // 5 · THE PAID PRESS: with a credit back, the third press is the player's, and ends the notice.
  await db.execute(sql`update model_calls set created_at = now() - interval '25 hours' where user_id = ${USER} and origin = 'player'`);
  const paidBefore = await allowanceUsed();
  const paid = await writeSynopsisFor(deck, USER, deps);
  check("the fallback writes under a credit", [paid.kind, await allowanceUsed()], ["written", paidBefore + 1]);
  check("…as a player call, and the notice is gone", [(await origins(deck)).slice(-1)[0].origin, (await state(deck)).methodNotice], ["player", null]);

  // 6 · A FREE SUCCESS: reuse is bypassed (the list HAS an overview), no credit, one run, notice gone.
  const ok = await oldDeck("probe method notice 2", 1);
  await db.execute(sql`delete from model_calls where user_id = ${USER} and origin = 'player' and id not in (select model_call_id from deck_synopses)`);
  const used0 = await allowanceUsed();
  calls = 0;
  const free = await writeSynopsisFor(ok, USER, deps);
  check("a free rewrite over an overview the list already has is WRITTEN, not reused", [free.kind, calls], ["written", 1]);
  check("…is a system call, spent", (await origins(ok)).slice(-1), [{ origin: "system", status: "spent", contract_version: 8 }]);
  check("…costs the player no credit", await allowanceUsed(), used0);
  s = await state(ok);
  check("…and the shown overview is the new method's: no notice", [s.methodNotice, s.synopsis?.contractVersion], [null, 8]);
  calls = 0;
  check("a second press reuses it, calling no model", [(await writeSynopsisFor(ok, USER, deps)).kind, calls], ["reused", 0]);

  // 7 · A REVERT: the free run's overview belongs to another list now, so the shown row is the old
  // contract-7 one again, and the free rewrite already produced an overview: no second one.
  await db.execute(sql`update deck_synopses set fingerprint = 'another-list' where deck_id = ${ok}::uuid and contract_version = 8`);
  s = await state(ok);
  check("a revert to the old overview offers no second free rewrite", [s.synopsis?.contractVersion, s.methodNotice], [7, null]);

  // 8 · A SECTION RETRY over an eligible overview is the free write too (rule 1).
  const retryDeck = await oldDeck("probe method notice 3", 2);
  const shown = (await state(retryDeck)).synopsis!;
  await db.execute(sql`update model_calls set created_at = now() - interval '25 hours' where user_id = ${USER}`);
  const usedR = await allowanceUsed();
  queue = ["survived"];
  const retry = await retrySynopsisFor(retryDeck, USER, shown.id, deps);
  check("a retry on an eligible overview writes it whole, as a free system call", [retry.kind, (await origins(retryDeck)).slice(-1)[0].origin, await allowanceUsed()], ["written", "system", usedR]);
}

async function main() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (branch !== LOCAL_DEV) {
    console.error(`refusing: this database reports ${branch ?? "no neon.branch_id"}, not local-dev (${LOCAL_DEV}).`);
    process.exit(2);
  }
  let thrown: unknown;
  try {
    if (UNSEED) await cleanup();
    else if (SEED) await seed();
    else await scenarios();
  } catch (error) {
    thrown = error;
  } finally {
    if (!SEED) await cleanup();
  }
  if (thrown) {
    console.error(thrown);
    process.exit(1);
  }
  if (!SEED && !UNSEED) console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

void main();
