// probe:synopsis — the deck synopsis's writes and reads against a real Postgres (sub-project 6,
// PR 2), by calling the real `writeSynopsisFor`, `retrySynopsisFor`, `readSynopsisState`,
// `readVersionSynopsis` and `pinSynopsisToVersion`.
//
// Every rule those functions apply to what they READ is unit tested; what no unit test can reach
// is what they WROTE: the run row and its allowance unit settled in one transaction, the partial
// index that makes a second run on one deck impossible, the reaper that frees a deck a crash left
// pending, and the version copy taken once, at the commit, onto the newest version only.
//
// THE MODEL IS INJECTED and spends nothing: a fake that counts its calls and answers what each
// case needs, built by the same `stubReply` the dev server uses. `--live` is the one exception,
// and it is capped (see the end of this file).
//
// It writes a fixture under a per-run `user_id` and deletes it in a `finally`. Point it at
// `local-dev` or a scratch Neon branch, **never production**.

// First, and on its own line: the helper's import loads `.env`, and anything reading
// `process.env` below needs it loaded.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import { db } from "../src/db";
import { readCatalogGeneration } from "../src/lib/cache/catalog-generation";
import { touchDeck } from "../src/lib/decks/touch";
import { commitVersion } from "../src/lib/decks/versions";
import { listFingerprint } from "../src/lib/profile/fingerprint";
import { loadDeckProfile } from "../src/lib/profile/load";
import { PROFILE_VERSION } from "../src/lib/profile/version";
import { computeAndStoreProfile, type StoredProfileDeps } from "../src/lib/profile/stored";
import type { ModelOutcome } from "../src/lib/model/client";
import { retrySynopsisFor, writeSynopsisFor, type GenerateDeps } from "../src/lib/synopsis/generate";
import { pinSynopsisToVersion } from "../src/lib/synopsis/pin";
import { readSynopsisState, readVersionSynopsis } from "../src/lib/synopsis/read";
import type { SynopsisReply, SynopsisResponse } from "../src/lib/synopsis/response-schema";
import { STUB_MODEL, stubReply, type StubMode } from "../src/lib/synopsis/stub";
import type { SynopsisFacts } from "../src/lib/synopsis/facts";
import { loadUniversalStaples } from "../src/lib/staples/universal";
import { isRepair } from "../src/lib/synopsis/prompt";
import { SYNOPSIS_CONTRACT_VERSION, SYNOPSIS_DEADLINE_MS, SYNOPSIS_REAPER_CUTOFF_MS, SYNOPSIS_REPAIR_MIN_MS } from "../src/lib/synopsis/limits";

neonConfig.webSocketConstructor = ws;

// Its assertions are contract 7's (stored shapes, `SYNOPSIS_CONTRACT_VERSION`). Contract 8 is
// measured by `eval:corpus` and unit tests until the gate; a flag-on run would fail on shape.
if (process.env.OVERVIEW_V2_ENABLED === "true") {
  console.error("probe:synopsis asserts contract 7; unset OVERVIEW_V2_ENABLED to run it.");
  process.exit(2);
}

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-synopsis-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};
const fail = (label: string, why: string) => {
  failures += 1;
  console.log(`FAIL  ${label} — ${why}`);
};
const rows = async <T>(text: ReturnType<typeof sql>): Promise<T[]> => (await fixture.execute(text)).rows as T[];

const profileDeps: StoredProfileDeps = {
  generation: () => readCatalogGeneration(),
  compute: (deckId, userId) => loadDeckProfile(deckId, userId),
};

/** The fake model: counts calls, answers the queued modes in order, then `survived`. */
let calls = 0;
let queue: StubMode[] = [];
let delayMs = 0;
/** Every request the fake model was sent, in order, with the deadline it was given. */
let seen: { user: string; deadlineMs: number; reply: SynopsisReply | null }[] = [];
/** The facts the fake model was last handed: what `factsFor` built. */
let lastFacts: SynopsisFacts | null = null;
const deps: GenerateDeps = {
  // The stub's own name, which the spend cap knows makes no request: a made-up name has no price,
  // and pricing refuses to guess one.
  modelName: STUB_MODEL,
  model: async (req, facts): Promise<ModelOutcome<SynopsisReply>> => {
    calls += 1;
    lastFacts = facts;
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    // The stub answers in the contract the request asks for (`req.v2`: OVERVIEW_V2_ENABLED on).
    const out = stubReply(facts, queue.shift() ?? "survived", false, !!req.v2);
    // A repair's reply words its primer differently, so a merge that took a PASSING section from
    // the repair rather than keeping the first answer's is visible, not identical by construction.
    if (out.ok && isRepair(req.user)) {
      const words = "Build your mana early in the game.";
      const strategy = out.value.primer.strategy as (string | { text: string })[];
      strategy[0] = typeof strategy[0] === "string" ? words : { ...strategy[0]!, text: words };
    }
    seen.push({ user: req.user, deadlineMs: req.deadlineMs, reply: out.ok ? out.value : null });
    return out;
  },
  now: () => new Date(),
  profile: profileDeps,
};

const analyze = (deckId: string) => computeAndStoreProfile(deckId, USER, profileDeps);
/** The ledger INSIDE the allowance window, which is what the allowance counts; aged rows are out. */
const ledger = async () => rows<{ status: string; n: number }>(sql`
  select status, count(*)::int as n from model_calls
  where user_id = ${USER} and created_at > now() - interval '24 hours'
  group by status order by status`);
/** Key order is not content: jsonb stores keys in its own order, so compare canonical forms. */
const canon = (v: unknown): string => JSON.stringify(v, (_k, x) =>
  x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x);
/** Spent units age out of the window, so each section starts with the whole allowance. */
const ageLedger = () => fixture.execute(sql`
  update model_calls set created_at = now() - interval '25 hours' where user_id = ${USER}`);

async function run() {
  const [legend] = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line ilike '%Legendary Creature%' order by oracle_id limit 1`);
  if (!legend) return fail("a legend to lead the fixture", "the catalog is empty");
  const pool = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line not ilike '%Land%' and oracle_id <> ${legend.oracle_id}::uuid
    order by oracle_id limit 107`);
  if (pool.length < 107) return fail("107 cards for the fixture", `found ${pool.length}`);
  const body = pool.slice(0, 99);
  const spares = pool.slice(99);

  const [deck] = await rows<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${USER}, 'probe synopsis', ${legend.oracle_id}::uuid) returning id`);
  await fixture.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values ${sql.join(
    body.map((c) => sql`(${deck.id}::uuid, ${c.oracle_id}::uuid, 1)`), sql`, `)}`);
  const current = [...body];
  const list = () => listFingerprint({ commanderOracleId: legend.oracle_id, partnerOracleId: null,
    cards: current.map((c) => ({ oracleId: c.oracle_id, quantity: 1 })) });
  /** An edit the way the app makes one: a card swapped and `touchDeck`, in one transaction. */
  const swap = (spare: { oracle_id: string }) => db.transaction(async (tx) => {
    const out = current.shift()!;
    current.push(spare);
    await tx.execute(sql`update deck_cards set oracle_id = ${spare.oracle_id}::uuid
      where deck_id = ${deck.id}::uuid and oracle_id = ${out.oracle_id}::uuid`);
    await touchDeck(tx, deck.id);
  });
  const state = async () => (await readSynopsisState(deck.id, USER, profileDeps))!;

  // 1 · No reading: nothing is written, nothing is called, nothing is charged.
  check("no reading refuses the write", (await writeSynopsisFor(deck.id, USER, deps)).kind, "no_reading");
  check("…and calls no model", calls, 0);

  // 2 · A first write, over a fresh reading.
  await analyze(deck.id);
  check("a fresh reading with no synopsis would spend", (await state()).wouldSpend, true);
  const first = await writeSynopsisFor(deck.id, USER, deps);
  check("the first write survives", first.kind === "written" && first.outcome, "survived");
  check("…is charged as spent", await ledger(), [{ status: "spent", n: 1 }]);
  const [stored] = await rows<{ model: string; contract_version: number; fingerprint: string }>(sql`
    select model, contract_version, fingerprint from deck_synopses where deck_id = ${deck.id}::uuid`);
  check("…records the model that wrote it", stored.model, STUB_MODEL);
  check("…and the list it describes", stored.fingerprint, list());
  {
    // Every card the shown overview names carries its preview art in the read, including any a
    // Weaknesses line names that the deck does not hold.
    const s2 = await state();
    const named = new Set(Object.values(s2.synopsis?.content.cards ?? {}).map((c) => c.oracleId));
    check("the read carries art for every card the overview names",
      named.size > 0 && [...named].every((id) => id in s2.art), true);
  }

  // 3 · REUSE IS KEYED ON THE LIST (ruling B): a second press on the same list reuses, free.
  const again = await writeSynopsisFor(deck.id, USER, deps);
  check("the same list reuses the synopsis", again.kind, "reused");
  check("…calling no model", calls, 1);
  check("…and charging nothing", await ledger(), [{ status: "spent", n: 1 }]);
  check("a current synopsis is not stale and would not spend", [(await state()).stale, (await state()).wouldSpend], [false, false]);
  check("…and a press over its list writes nothing (7d)", (await state()).pressWrites, false);
  // A contract bump alone is not an edit either: the old synopsis is still the list's.
  await fixture.execute(sql`update deck_synopses set contract_version = 0 where deck_id = ${deck.id}::uuid`);
  check("a synopsis under an older contract is reused too", (await writeSynopsisFor(deck.id, USER, deps)).kind, "reused");
  check("…and reads as current", (await state()).stale, false);

  // 4 · An edit stales it; the write waits for a fresh reading, which Re-analyze gives.
  const listA = list();
  const outA = current[0];
  await swap(spares[0]);
  const edited = await state();
  check("an edit stales the synopsis", edited.stale, true);
  // The press note keys on the LIVE list (the credits audit, item 2): an edit makes a press write
  // before any reading describes the new list, and a revert (7d) would make it write nothing.
  check("…and makes a press write, read off the live list", edited.pressWrites, true);
  check("…and a write over the stale reading is refused", (await writeSynopsisFor(deck.id, USER, deps)).kind, "no_reading");
  await analyze(deck.id);
  check("after Re-analyze a press would spend", (await state()).wouldSpend, true);
  const rewritten = await writeSynopsisFor(deck.id, USER, deps);
  check("the new list is written", rewritten.kind, "written");
  check("…and reads current", (await state()).stale, false);

  // 4b · A REVERT (7d, finding 6). The list is A again, and A's overview is still A's: reuse is
  // keyed on the fingerprint alone (ruling B), not on whichever overview is newest. So the tab
  // shows A, a press writes nothing, and a write is reused at no charge.
  await db.transaction(async (tx) => {
    await tx.execute(sql`update deck_cards set oracle_id = ${outA.oracle_id}::uuid
      where deck_id = ${deck.id}::uuid and oracle_id = ${spares[0].oracle_id}::uuid`);
    current.splice(current.indexOf(spares[0]), 1);
    current.unshift(outA);
    await touchDeck(tx, deck.id);
  });
  check("the revert is back on list A", list(), listA);
  const reverted = await state();
  check("after a revert, the overview shown is list A's own", reverted.synopsis?.fingerprint, listA);
  check("…and a press over it writes nothing", reverted.pressWrites, false);
  await analyze(deck.id);
  const callsBefore = calls;
  const reusedA = await writeSynopsisFor(deck.id, USER, deps);
  check("…and a write reuses A, calling no model", [reusedA.kind, calls - callsBefore], ["reused", 0]);
  // Back to list B, exactly as the edit above left it, so every later section starts where it did.
  await swap(spares[0]);
  await analyze(deck.id);

  // 5 · CONTRACT B: a first answer with a refused section gets ONE repair, before anything is
  // shown, and the rest stays byte for byte. All four render, so it spends one unit.
  await ageLedger();
  await swap(spares[1]);
  await analyze(deck.id);
  queue = ["partial", "survived"];
  seen = [];
  calls = 0;
  // A clock that moves 40s during the first call, so the repair's share of the deadline is a
  // figure worked out by hand rather than "whatever was left", which any budget satisfies.
  let clock5 = Date.now();
  const repaired = await writeSynopsisFor(deck.id, USER, {
    ...deps,
    now: () => new Date(clock5),
    model: async (req, facts) => {
      const out = await deps.model(req, facts);
      clock5 += 40_000;
      return out;
    },
  });
  check("a refused section is repaired in the same write", repaired.kind === "written" && [repaired.outcome, calls], ["survived", 2]);
  check("…the repair asks only for the refused section, with its reason",
    /did not pass checking last time: overview\./.test(seen[1]?.user ?? "") && /fix exactly these: overview: unknown_card/.test(seen[1]?.user ?? ""), true);
  check("…under what is left of the write's one deadline", [seen[0]?.deadlineMs, seen[1]?.deadlineMs], [SYNOPSIS_DEADLINE_MS, SYNOPSIS_DEADLINE_MS - 40_000]);
  const [repairedRow] = await rows<{ content: { primer: unknown } }>(sql`select content from deck_synopses where deck_id = ${deck.id}::uuid order by created_at desc limit 1`);
  check("…keeps the first answer's passing sections byte for byte", canon(repairedRow.content.primer), canon(seen[0]?.reply?.primer));
  check("…and spends once, for both calls", (await ledger()).find((r) => r.status === "spent")?.n, 1);

  // 5b · A repair that fails again leaves the first answer standing: shown, but three sections
  // of four, so the unit is REFUNDED (Hugh, 2026-09-24) while the dollars stay counted.
  await ageLedger();
  await swap(spares[6]);
  await analyze(deck.id);
  queue = ["partial", "partial"];
  calls = 0;
  const partial = await writeSynopsisFor(deck.id, USER, deps);
  check("an unrepaired answer is refused, and shown", partial.kind === "written" && [partial.outcome, !!partial.synopsis, calls], ["refused", true, 2]);
  check("…and refunded, since not all four render", await ledger(), [{ status: "refunded", n: 1 }]);
  const before = partial.kind === "written" ? partial.synopsis! : null;
  queue = ["survived"];
  calls = 0;
  const retried = await retrySynopsisFor(deck.id, USER, before!.id, deps);
  const after = retried.kind === "written" ? retried.synopsis! : null;
  check("the player's Try again survives, in one call", retried.kind === "written" && [retried.outcome, calls], ["survived", 1]);
  check("…keeps the passing sections unchanged", canon([after?.content.primer, after?.content.keyCards, after?.content.weaknesses]),
    canon([before?.content.primer, before?.content.keyCards, before?.content.weaknesses]));
  check("…rewrites the refused one", after?.content.overview !== null, true);
  const [link] = await rows<{ retry_of: string | null }>(sql`select retry_of from deck_synopses where id = ${after!.id}::uuid`);
  check("…and names the run it retried", link.retry_of, before!.id);
  check("…and spends, now that all four render", (await ledger()).find((r) => r.status === "spent")?.n, 1);

  // 5c · A first answer that used up the deadline gets no repair: the write stands as checked.
  await ageLedger();
  await swap(spares[7]);
  await analyze(deck.id);
  queue = ["partial"];
  calls = 0;
  let clock = Date.now();
  const lateDeps: GenerateDeps = {
    ...deps,
    now: () => new Date(clock),
    model: async (req, facts) => {
      const out = await deps.model(req, facts);
      clock += SYNOPSIS_DEADLINE_MS - SYNOPSIS_REPAIR_MIN_MS + 1;
      return out;
    },
  };
  const late = await writeSynopsisFor(deck.id, USER, lateDeps);
  check("no repair is sent with less than its minimum of the deadline left", late.kind === "written" && [late.outcome, calls], ["refused", 1]);
  check("…and the partial answer is refunded", await ledger(), [{ status: "refunded", n: 1 }]);

  // 6 · A retry whose retried section fails AGAIN shows nothing new, and is refunded too.
  await ageLedger();
  await swap(spares[2]);
  await analyze(deck.id);
  queue = ["partial", "partial"];
  const partial2 = await writeSynopsisFor(deck.id, USER, deps);
  queue = ["partial"];
  const failedRetry = await retrySynopsisFor(deck.id, USER, partial2.kind === "written" ? partial2.synopsis!.id : "", deps);
  check("a retry failing again is still refused", failedRetry.kind === "written" && failedRetry.outcome, "refused");
  check("…and both are refunded", (await ledger()).find((r) => r.status === "refunded")?.n, 2);

  // 7 · An upstream failure refunds, keeps the old synopsis, and says so once.
  await ageLedger();
  await swap(spares[3]);
  await analyze(deck.id);
  queue = ["busy"];
  const busy = await writeSynopsisFor(deck.id, USER, deps);
  check("a busy upstream ends upstream_busy", busy.kind === "written" && busy.outcome, "upstream_busy");
  const afterBusy = await state();
  // The section began by ageing the ledger, so this refund is the only one in the window.
  check("…refunds", (await ledger()).find((r) => r.status === "refunded")?.n, 1);
  check("…keeps the old synopsis on screen, stale", [!!afterBusy.synopsis, afterBusy.stale], [true, true]);
  check("…and reports the failure for Try again", afterBusy.lastFailed, true);
  check("…and not as a rejection", afterBusy.lastRejected, false);

  // 7b · A REJECTED request (H33: a bad key, a retired model id) is its own outcome, stored with
  // the status the call failed with, and read as a failure with no Try again. The model is
  // injected, as in every case here, so the run does not depend on SYNOPSIS_STUB (whose `rejected`
  // mode serves a dev server); the CHECK admitting the class is what only a database can prove.
  const rejectingModel: GenerateDeps = { ...deps, model: async () => ({ ok: false, errorClass: "upstream_rejected", status: 404 }) };
  const rejected = await writeSynopsisFor(deck.id, USER, rejectingModel);
  check("a rejected request ends upstream_rejected", rejected.kind === "written" && rejected.outcome, "upstream_rejected");
  const [rejectedRow] = await rows<{ outcome: string; error_status: number | null }>(sql`
    select outcome, error_status from deck_synopses where deck_id = ${deck.id}::uuid order by created_at desc limit 1`);
  check("…stored with its status", rejectedRow, { outcome: "upstream_rejected", error_status: 404 });
  const afterRejected = await state();
  check("…and read as a failure, a rejection", [afterRejected.lastFailed, afterRejected.lastRejected], [true, true]);

  // 8 · ONE RUN IN FLIGHT: a double press makes one run and one charge, never two.
  delayMs = 1500;
  const [a, b] = await Promise.all([writeSynopsisFor(deck.id, USER, deps), writeSynopsisFor(deck.id, USER, deps)]);
  delayMs = 0;
  check("a double press writes once and refuses the other as in flight",
    [a.kind, b.kind].sort(), ["in_flight", "written"]);

  // 8b · A run the reaper failed while the model was answering reports `superseded`, never
  // `written`, and its answer is neither stored nor charged.
  await ageLedger();
  await swap(body[3]); // left the deck in section 7
  await analyze(deck.id);
  const reapingModel: GenerateDeps = {
    ...deps,
    model: async (req, facts) => {
      await fixture.execute(sql`update deck_synopses set status = 'done', outcome = 'interrupted'
        where deck_id = ${deck.id}::uuid and status = 'pending'`);
      return deps.model(req, facts);
    },
  };
  check("a run reaped mid-call reports superseded", (await writeSynopsisFor(deck.id, USER, reapingModel)).kind, "superseded");
  check("…and charges nothing", (await ledger()).find((r) => r.status === "spent"), undefined);
  // …but records what the call billed on its unit: a late outcome still writes its meters, since
  // until they land the unit counts toward the month's spend at its worst case. The stub bills
  // nothing, so its cost is a recorded 0, never the null of a call with no meters.
  const [lateUnit] = await rows<{ model: string | null; cost: string | null }>(sql`
    select m.model, m.cost_micro_usd::text as cost from deck_synopses s join model_calls m on m.id = s.model_call_id
    where s.deck_id = ${deck.id}::uuid and s.outcome = 'interrupted' order by s.created_at desc limit 1`);
  check("…and still records the late call's meters on its unit", lateUnit, { model: STUB_MODEL, cost: "0" });

  // 8c · A throw AFTER the reservation (here, a reply the checks cannot read) settles the run as a
  // refunded upstream failure at once, rather than leaving it pending for the reaper.
  await ageLedger();
  const throwingModel: GenerateDeps = {
    ...deps,
    model: async (req, facts) => {
      const out = await deps.model(req, facts);
      // A reply that came back (and was billed: a usage the stub never reports, so the probe can
      // see it land) but that the checks cannot read.
      return out.ok
        ? { ...out, value: { ...out.value, weaknesses: null as unknown as string[] }, usage: { ...out.usage, inputTokens: 1_234 } }
        : out;
    },
  };
  const threw = await writeSynopsisFor(deck.id, USER, throwingModel);
  check("a throw after the reservation ends as a refunded upstream failure",
    [threw.kind === "written" && threw.outcome, (await ledger()).find((r) => r.status === "refunded")?.n, (await state()).pending],
    ["upstream_busy", 1, false]);
  // …and that fallback settle still records what the returned call billed.
  const [threwUnit] = await rows<{ input_tokens: number | null; cost: string | null }>(sql`
    select m.input_tokens, m.cost_micro_usd::text as cost from model_calls m
    where m.user_id = ${USER} and m.status = 'refunded' and m.created_at > now() - interval '24 hours'`);
  check("…and records the billed call's meters on its unit", threwUnit, { input_tokens: 1_234, cost: "0" });

  // 8d · The DECK is deleted while the model answers. `deck_synopses.deck_id` cascades, so the run
  // row is gone when the outcome lands; `model_calls` is kept, and the bill must reach it by the
  // unit id the start handed back, never through the vanished run row. A throwaway deck, so the
  // fixture the rest of the run reads survives. With `finishRun` looking the unit up through the
  // run row instead, the meters check below reads null and fails.
  await ageLedger();
  const [doomed] = await rows<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${USER}, 'probe synopsis doomed', ${legend.oracle_id}::uuid) returning id`);
  await fixture.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values ${sql.join(
    body.map((c) => sql`(${doomed.id}::uuid, ${c.oracle_id}::uuid, 1)`), sql`, `)}`);
  await analyze(doomed.id);
  const deletingModel: GenerateDeps = {
    ...deps,
    model: async (req, facts) => {
      const out = await deps.model(req, facts);
      await fixture.execute(sql`delete from decks where id = ${doomed.id}::uuid`);
      return out.ok ? { ...out, usage: { ...out.usage, inputTokens: 4_321 } } : out;
    },
  };
  check("a deck deleted mid-call reports superseded", (await writeSynopsisFor(doomed.id, USER, deletingModel)).kind, "superseded");
  const [orphan] = await rows<{ input_tokens: number | null; cost: string | null; runs: number }>(sql`
    select m.input_tokens, m.cost_micro_usd::text as cost,
      (select count(*)::int from deck_synopses s where s.model_call_id = m.id) as runs
    from model_calls m where m.user_id = ${USER} order by m.created_at desc limit 1`);
  check("…its run row went with the deck, and its unit still carries the meters", orphan,
    { input_tokens: 4_321, cost: "0", runs: 0 });

  // 9 · THE REAPER, on both paths: a run a crash left pending is failed, refunded, and frees the
  // deck, whether the next thing to arrive is a write or a read. Each path is proved on its own
  // stranded run, because a read reaping first would hide a write that never reaps.
  const strand = async () => {
    const [unit] = await rows<{ id: string }>(sql`
      insert into model_calls (user_id, feature, created_at) values (${USER}, 'synopsis', now() - interval '6 minutes')
      returning id`);
    const [run] = await rows<{ id: string }>(sql`
      insert into deck_synopses (deck_id, user_id, fingerprint, contract_version, model, model_call_id, created_at)
      values (${deck.id}::uuid, ${USER}, ${list()}, ${SYNOPSIS_CONTRACT_VERSION}, 'probe-stub', ${unit.id}::uuid,
        now() - (${SYNOPSIS_REAPER_CUTOFF_MS + 60_000} || ' milliseconds')::interval)
      returning id`);
    return run.id;
  };
  const fate = async (id: string) => (await rows<{ status: string; outcome: string; unit: string }>(sql`
    select s.status, s.outcome, m.status as unit from deck_synopses s join model_calls m on m.id = s.model_call_id
    where s.id = ${id}::uuid`))[0];
  await ageLedger();
  await swap(spares[4]);
  await analyze(deck.id);
  const onWrite = await strand();
  check("a write straight after a crash is not locked out by it", (await writeSynopsisFor(deck.id, USER, deps)).kind, "written");
  check("…because the write reaped it as interrupted and refunded its unit", await fate(onWrite), { status: "done", outcome: "interrupted", unit: "refunded" });
  const onRead = await strand();
  await state();
  check("a read reaps a stranded run too", await fate(onRead), { status: "done", outcome: "interrupted", unit: "refunded" });

  // 9a · The write's reap survives a spent allowance: the reservation is refused and rolled back,
  // and the reap before it must have committed on its own, or the deck stays locked.
  await swap(body[4]); // left the deck in section 9
  await analyze(deck.id);
  const spentFill = await rows<{ id: string }>(sql`insert into model_calls (user_id, feature, status)
    select ${USER}, 'synopsis', 'spent' from generate_series(1, 10) returning id`);
  const onSpent = await strand();
  check("a write with the allowance spent is refused", (await writeSynopsisFor(deck.id, USER, deps)).kind, "allowance");
  check("…but its reap still committed", (await fate(onSpent)).outcome, "interrupted");
  await fixture.execute(sql`delete from model_calls where id in (${sql.join(spentFill.map((r) => sql`${r.id}::uuid`), sql`, `)})`);

  // 9b · A first write refused in EVERY section shows nothing, so it costs nothing.
  await ageLedger();
  await swap(body[2]); // left the deck in section 6
  await analyze(deck.id);
  queue = ["refused", "refused"];
  const allRefused = await writeSynopsisFor(deck.id, USER, deps);
  check("a write refused in every section is refused and shows nothing",
    allRefused.kind === "written" && [allRefused.outcome, allRefused.synopsis], ["refused", null]);
  check("…and is refunded", await ledger(), [{ status: "refunded", n: 1 }]);

  // 10 · A section retry on a synopsis under an older contract rewrites it whole.
  // body[0] left the deck in section 4, so putting it back is a real edit.
  await swap(body[0]);
  await analyze(deck.id);
  // A reading an older PROFILE_VERSION wrote is rebuilt quietly by the read, which moves its
  // stamp; the write must still accept it rather than refuse it as moved underneath.
  await fixture.execute(sql`update deck_profiles set profile_version = ${PROFILE_VERSION - 1} where deck_id = ${deck.id}::uuid`);
  queue = ["partial", "partial"];
  const old = await writeSynopsisFor(deck.id, USER, deps);
  check("a write over a reading rebuilt for a new PROFILE_VERSION still writes", old.kind, "written");
  const oldId = old.kind === "written" ? old.synopsis!.id : "";
  await fixture.execute(sql`update deck_synopses set contract_version = 0 where id = ${oldId}::uuid`);
  const whole = await retrySynopsisFor(deck.id, USER, oldId, deps);
  const [wholeRow] = await rows<{ retry_of: string | null; contract_version: number }>(sql`
    select retry_of, contract_version from deck_synopses where deck_id = ${deck.id}::uuid order by created_at desc limit 1`);
  check("a retry over an older contract rewrites the whole synopsis under the current one",
    [whole.kind, wholeRow.retry_of, wholeRow.contract_version], ["written", null, SYNOPSIS_CONTRACT_VERSION]);

  // 10b · UNIVERSAL STAPLES (Hugh, 2026-09-24). The set is read from `format_staples`, and it is
  // checked here against an independent query of the same rule; `factsFor` flags a staple the deck
  // holds, and the stub, which never picks one, still writes a whole overview beside it.
  const universal = await loadUniversalStaples();
  const independent = await rows<{ oracle_id: string }>(sql`
    select oracle_id from format_staples group by oracle_id
    having count(distinct condition) >= ceil(0.75 * (select count(distinct condition) from format_staples))`);
  check("the universal staples are the cards staple in three quarters of the conditions",
    [...universal].sort(), independent.map((r) => r.oracle_id).sort());
  const [staple] = universal.size === 0 ? [] : await rows<{ oracle_id: string }>(sql`
    select c.oracle_id from cards c
    where not exists (select 1 from deck_cards d where d.deck_id = ${deck.id}::uuid and d.oracle_id = c.oracle_id)
      and c.oracle_id in (${sql.join([...universal].map((id) => sql`${id}::uuid`), sql`, `)}) and c.type_line not ilike '%Land%'
    order by c.oracle_id limit 1`);
  if (!staple) {
    fail("a universal staple that is not a land", `the set holds ${universal.size}`);
  } else {
    await ageLedger();
    await swap(staple);
    await analyze(deck.id);
    queue = ["survived"];
    const withStaple = await writeSynopsisFor(deck.id, USER, deps);
    const flagged = (lastFacts as SynopsisFacts | null)?.cards.filter((c) => c.universalStaple).map((c) => c.oracleId) ?? [];
    check("factsFor flags the universal staple the deck holds, and only that", flagged, [staple.oracle_id]);
    // The stub never offers a staple, so this proves the write path and the stored card list; the
    // validator's own refusal of one is proved in validate.test.ts.
    const keyCards = withStaple.kind === "written" ? withStaple.synopsis?.content.keyCards ?? [] : [];
    const stapleName = (lastFacts as SynopsisFacts | null)?.cards.find((c) => c.oracleId === staple.oracle_id)?.name;
    check("…and the write survives with the staple off its Key cards",
      [withStaple.kind === "written" && withStaple.outcome, keyCards.some((k) => k.card === stapleName)], ["survived", false]);
  }

  // 11 · THE VERSION COPY, at commit only, onto the newest version, once.
  const committedList = list();
  const { version: v1 } = await commitVersion(deck.id, null);
  check("a pin for a list the version does not hold writes nothing",
    await pinSynopsisToVersion(deck.id, USER, { versionId: v1.id, list: "not-this-list" }), false);
  check("a pin for the committed list copies the synopsis", await pinSynopsisToVersion(deck.id, USER, { versionId: v1.id, list: committedList }), true);
  const copy = await readVersionSynopsis(v1.id, USER);
  check("…which the version reads back", copy?.versionNumber, v1.number);
  {
    // A version can name cards the deck no longer holds, so its read carries their preview art.
    const named = new Set(Object.values(copy?.content.cards ?? {}).map((c) => c.oracleId));
    check("…with art for every card it names", named.size > 0 && [...named].every((id) => id in (copy?.art ?? {})), true);
  }
  check("…and a second pin changes nothing", await pinSynopsisToVersion(deck.id, USER, { versionId: v1.id, list: committedList }), false);
  const { version: v2 } = await commitVersion(deck.id, null);
  check("an older version is never pinned", await pinSynopsisToVersion(deck.id, USER, { versionId: v1.id, list: committedList }), false);
  check("…while the newest one is", await pinSynopsisToVersion(deck.id, USER, { versionId: v2.id, list: committedList }), true);
  check("another reader cannot read a version's copy", await readVersionSynopsis(v1.id, "someone-else"), null);
  // Only the DRAFT'S synopsis is copied: an older run for this same list is history. A newer run
  // for another list makes the committed list's own run stale, and a commit then pins nothing.
  const [latest] = await rows<{ id: string }>(sql`select id from deck_synopses where deck_id = ${deck.id}::uuid
    and status = 'done' order by created_at desc limit 1`);
  await fixture.execute(sql`insert into deck_synopses (deck_id, user_id, fingerprint, contract_version, model, model_call_id, status, outcome, content)
    select deck_id, user_id, 'another-list', contract_version, model, model_call_id, 'done', outcome, content
    from deck_synopses where id = ${latest.id}::uuid`);
  // A draft that is DIRTY records no synopsis, even when its list matches the synopsis's.
  await fixture.execute(sql`delete from deck_synopses where fingerprint = 'another-list' and deck_id = ${deck.id}::uuid`);
  await fixture.execute(sql`update deck_profiles set dirty = true where deck_id = ${deck.id}::uuid`);
  const { version: vDirty } = await commitVersion(deck.id, null);
  check("a commit from a dirty draft pins no synopsis",
    await pinSynopsisToVersion(deck.id, USER, { versionId: vDirty.id, list: committedList }), false);
  await fixture.execute(sql`update deck_profiles set dirty = false where deck_id = ${deck.id}::uuid`);
  await fixture.execute(sql`insert into deck_synopses (deck_id, user_id, fingerprint, contract_version, model, model_call_id, status, outcome, content)
    select deck_id, user_id, 'another-list', contract_version, model, model_call_id, 'done', outcome, content
    from deck_synopses where id = ${latest.id}::uuid`);
  const { version: v3 } = await commitVersion(deck.id, null);
  check("a commit whose list only an OLDER synopsis describes pins nothing",
    await pinSynopsisToVersion(deck.id, USER, { versionId: v3.id, list: committedList }), false);
  // AT COMMIT: a run for the committed list that lands AFTER the commit, before its after() pin
  // runs, is not what the version was committed with, and is never copied into it.
  await fixture.execute(sql`insert into deck_synopses (deck_id, user_id, fingerprint, contract_version, model, model_call_id, status, outcome, content, created_at)
    select deck_id, user_id, ${committedList}, contract_version, model, model_call_id, 'done', outcome, content, now() + interval '1 second'
    from deck_synopses where id = ${latest.id}::uuid`);
  check("a synopsis written after the commit is not copied into it",
    await pinSynopsisToVersion(deck.id, USER, { versionId: v3.id, list: committedList }), false);

  // 11b · `lastRefused`, read from the database rather than handed in: the NEWEST run, refused in
  // EVERY section, newer than the overview on screen, its counts summed over the sections.
  const verdicts = (ok: boolean) => (["overview", "primer", "keyCards", "weaknesses"] as const).map((section, i) =>
    ok && i > 0 ? { section, status: "ok", failed: 0, total: 3 }
      : { section, status: "refused", reason: "unknown_card", failed: i + 1, total: 4 });
  const refusedContent = (ok: boolean) => JSON.stringify({
    verdicts: verdicts(ok), overview: null, primer: null, keyCards: null, weaknesses: null, cards: {},
  });
  const [anyCall] = await rows<{ model_call_id: string }>(sql`select model_call_id from deck_synopses where deck_id = ${deck.id}::uuid limit 1`);
  const refusedRun = (ok: boolean, offset: string, by: string = USER) => fixture.execute(sql`
    insert into deck_synopses (deck_id, user_id, fingerprint, contract_version, model, model_call_id, status, outcome, content, created_at)
    values (${deck.id}::uuid, ${by}, ${list()}, ${SYNOPSIS_CONTRACT_VERSION}, 'probe-stub', ${anyCall.model_call_id}::uuid,
      'done', 'refused', ${refusedContent(ok)}::jsonb, now() + ${offset}::interval)`);
  const shownBefore = (await state()).synopsis?.id ?? null;
  check("with no newer refusal, lastRefused is null", (await state()).lastRefused, null);
  // Scoped to the reader: a newer run held for another principal on the same deck is not theirs.
  await refusedRun(false, "1 second", "someone-else");
  check("another principal's newer run is not the reader's lastRefused", (await state()).lastRefused, null);
  await fixture.execute(sql`delete from deck_synopses where deck_id = ${deck.id}::uuid and user_id = 'someone-else'`);
  // Tied to the list: a newer run written for ANOTHER list, failed or refused, is history.
  await fixture.execute(sql`
    insert into deck_synopses (deck_id, user_id, fingerprint, contract_version, model, model_call_id, status, outcome, content, created_at)
    values (${deck.id}::uuid, ${USER}, 'an-older-list', ${SYNOPSIS_CONTRACT_VERSION}, 'probe-stub', ${anyCall.model_call_id}::uuid,
      'done', 'refused', ${refusedContent(false)}::jsonb, now() + interval '1 second')`);
  check("a refusal written for another list is not this list's lastRefused", (await state()).lastRefused, null);
  await fixture.execute(sql`update deck_synopses set outcome = 'timeout', content = null
    where deck_id = ${deck.id}::uuid and fingerprint = 'an-older-list'`);
  check("…nor is a failure written for another list this list's lastFailed", (await state()).lastFailed, false);
  await fixture.execute(sql`delete from deck_synopses where deck_id = ${deck.id}::uuid and fingerprint = 'an-older-list'`);
  await refusedRun(false, "2 seconds");
  check("a newer run refused everywhere sums its sections", (await state()).lastRefused, { failed: 10, total: 16 });
  check("…and the overview on screen stays", (await state()).synopsis?.id ?? null, shownBefore);
  await refusedRun(true, "3 seconds");
  check("a newer PARTIAL refusal is not lastRefused", (await state()).lastRefused, null);
  await fixture.execute(sql`delete from deck_synopses where deck_id = ${deck.id}::uuid`);
  await refusedRun(false, "0 seconds");
  check("with no overview ever shown, a refused-everywhere run still reads", (await state()).lastRefused, { failed: 10, total: 16 });
  check("…with nothing on screen", (await state()).synopsis, null);
  await fixture.execute(sql`delete from deck_synopses where deck_id = ${deck.id}::uuid`);

  // 11c · THE LIST UNDER THE DECK ROW'S LOCK (found/notices-synopsis-stale-list-window). An edit
  //       that commits after the write read its reading, and before the reservation, must refuse
  //       the write with nothing reserved, rather than charge for and write the list it replaced.
  //       Two connections, because a lock is invisible in every value the write returns: a second
  //       one holds the deck row with an edit in flight, the write waits on the lock, and the edit
  //       commits while it waits. With the lock removed the write reads the committed list before
  //       the edit lands, reserves, and writes.
  await analyze(deck.id);
  {
    const held = new Set(current.map((c) => c.oracle_id));
    const spare = [...spares, ...body].find((c) => !held.has(c.oracle_id))!;
    const out = current[0];
    const before11c = await ledger();
    // Its own pool: `pool` in this function is the fixture's card pool.
    const lockPool = new Pool({ connectionString: DATABASE_URL });
    const holder = await lockPool.connect();
    try {
      await holder.query("begin");
      await holder.query("select 1 from decks where id = $1 for update", [deck.id]);
      // The edit the way the app makes one: the swap and `touchDeck`'s dirty mark, in its transaction.
      await holder.query("update deck_cards set oracle_id = $1 where deck_id = $2 and oracle_id = $3", [spare.oracle_id, deck.id, out.oracle_id]);
      await holder.query("update deck_profiles set dirty = true where deck_id = $1", [deck.id]);
      const racing = writeSynopsisFor(deck.id, USER, deps);
      let waiting = false;
      for (let i = 0; i < 100 && !waiting; i += 1) {
        const [w] = await rows<{ n: number }>(sql`select count(*)::int as n from pg_stat_activity
          where wait_event_type = 'Lock' and query ilike '%"decks"%for update%'`);
        waiting = w.n > 0;
        if (!waiting) await new Promise((r) => setTimeout(r, 100));
      }
      check("a write waits on the deck row while an edit holds it", waiting, true);
      await holder.query("commit");
      current.shift();
      current.push(spare);
      check("an edit landing while it waits refuses the write", (await racing).kind, "no_reading");
      check("…reserving and charging nothing", await ledger(), before11c);
      const [{ n }] = await rows<{ n: number }>(sql`select count(*)::int as n from deck_synopses where deck_id = ${deck.id}::uuid`);
      check("…and writing no run", n, 0);
    } finally {
      await holder.query("rollback").catch(() => {});
      holder.release();
      await lockPool.end();
    }
    // Back to the list section 12 expects, the way the app would make the edit.
    await db.transaction(async (tx) => {
      await tx.execute(sql`update deck_cards set oracle_id = ${out.oracle_id}::uuid
        where deck_id = ${deck.id}::uuid and oracle_id = ${spare.oracle_id}::uuid`);
      await touchDeck(tx, deck.id);
    });
    current.pop();
    current.unshift(out);
  }

  // 12 · The allowance: spent, the write says so, the analysis is untouched.
  await swap(body[1]); // left the deck in section 5
  await analyze(deck.id);
  await fixture.execute(sql`insert into model_calls (user_id, feature, status)
    select ${USER}, 'synopsis', 'spent' from generate_series(1, 10)`);
  check("a spent allowance refuses the write", (await writeSynopsisFor(deck.id, USER, deps)).kind, "allowance");
  check("…and a press would not spend", (await state()).wouldSpend, false);

  // 13 · Another reader's deck reads as nothing.
  check("another reader's deck reads as nothing", await readSynopsisState(deck.id, "someone-else", profileDeps), null);

  // --live: the one path that calls the real model, capped, over this fixture's deck.
  if (process.argv.includes("--live")) await live(deck.id);
}

/**
 * `--live`: real calls, for ruling 7's measurement of what one costs. Requires the flag AND
 * `ANTHROPIC_API_KEY`; `--max-calls` defaults to 3 (and to 3 for anything unreadable) and is
 * capped at 5, inside Hugh's $25 eval budget. Prints tokens and an estimated cost after every call.
 *
 * For a real list, `pull:staging` a deck into local-dev and name it with `PROBE_SYNOPSIS_DECK`. Its
 * commanders and cards are COPIED onto this run's own fixture deck, and nothing of the named deck or
 * its owner is read again or written: the calls, the ledger rows and the cleanup all stay on `USER`.
 */
async function live(fixtureDeck: string) {
  requireEnv(["ANTHROPIC_API_KEY"]);
  const arg = process.argv.find((a) => a.startsWith("--max-calls="));
  const asked = Number(arg?.split("=")[1] ?? 3);
  const max = Math.min(5, Math.max(1, Number.isFinite(asked) ? Math.trunc(asked) : 3));
  process.env.SYNOPSIS_LIVE = "1";
  const { defaultDeps } = await import("../src/lib/synopsis/generate");
  const deckId = fixtureDeck;
  const userId = USER;
  const source = process.env.PROBE_SYNOPSIS_DECK;
  if (source) {
    await fixture.execute(sql`update decks d set commander_oracle_id = s.commander_oracle_id,
      partner_oracle_id = s.partner_oracle_id from decks s where d.id = ${deckId}::uuid and s.id = ${source}::uuid`);
    await fixture.execute(sql`delete from deck_cards where deck_id = ${deckId}::uuid`);
    await fixture.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity)
      select ${deckId}::uuid, oracle_id, quantity from deck_cards where deck_id = ${source}::uuid`);
  }
  // Sonnet list prices per million tokens, input and output; an estimate, never a bill.
  const [IN, OUT] = [3, 15];
  // `--max-calls` counts MODEL CALLS, not writes: since contract B a write can make two (the first
  // answer and its repair), and a call past the cap is refused here rather than sent.
  let made = 0;
  for (let i = 0; i < max && made < max; i++) {
    await fixture.execute(sql`update model_calls set created_at = now() - interval '25 hours' where user_id = ${userId}`);
    await fixture.execute(sql`delete from deck_version_synopses where synopsis_id in (select id from deck_synopses where deck_id = ${deckId}::uuid)`);
    await fixture.execute(sql`delete from deck_synopses where deck_id = ${deckId}::uuid`);
    await computeAndStoreProfile(deckId, userId, profileDeps);
    const started = Date.now();
    const liveDeps = defaultDeps();
    const debug = process.argv.includes("--debug");
    let callsThisWrite = 0;
    const result = await writeSynopsisFor(deckId, userId, { ...liveDeps, profile: profileDeps, model: async (req, facts) => {
      if (made >= max) {
        console.log(`CAP  call ${made + 1} not sent (--max-calls=${max})`);
        return { ok: false, errorClass: "upstream_busy" };
      }
      made += 1;
      callsThisWrite += 1;
      const out = await liveDeps.model(req, facts);
      // --debug: what the refusals were ABOUT, which the stored run keeps only for passing sections.
      if (debug && out.ok) {
        const { unmarkedNames } = await import("../src/lib/synopsis/validate");
        const names = [...new Set(facts.cards.flatMap((c) => [c.name, ...c.name.split(" // ")]))];
        // `writeSynopsisFor` asks for contract 8 while OVERVIEW_V2_ENABLED is on, and that reply has no
        // `weaknesses` list: this legacy debug view reads contract 7 only.
        if ("assessment" in out.value) { console.log("--debug reads contract 7; OVERVIEW_V2_ENABLED is on, skipped"); return out; }
        const v7 = out.value;
        const texts = [v7.overview, ...v7.primer.strategy, ...v7.primer.mulligan.keep,
          ...v7.primer.mulligan.sendBack, ...v7.primer.tips.map((t) => t.text), ...v7.keyCards.map((k) => k.job), ...v7.weaknesses];
        for (const t of texts) { const bare = unmarkedNames(t, names); if (bare.length) console.log(`UNMARKED ${JSON.stringify(bare)} in: ${t}`); }
        for (const k of v7.keyCards) console.log(`JOB ${k.job.length}: ${k.job}`);
      }
      return out;
    } });
    const seconds = ((Date.now() - started) / 1000).toFixed(1);
    const [r] = await rows<{ outcome: string; input_tokens: number | null; output_tokens: number | null; content: unknown }>(sql`
      select outcome, input_tokens, output_tokens, content from deck_synopses where deck_id = ${deckId}::uuid
      order by created_at desc limit 1`);
    const cost = ((r?.input_tokens ?? 0) * IN + (r?.output_tokens ?? 0) * OUT) / 1e6;
    const [unit] = await rows<{ status: string }>(sql`
      select status from model_calls where user_id = ${userId} order by created_at desc limit 1`);
    console.log(`LIVE write ${i + 1} (${callsThisWrite} call${callsThisWrite === 1 ? "" : "s"}, ${made}/${max})  ${result.kind} ${r?.outcome}  unit ${unit?.status}  in ${r?.input_tokens} out ${r?.output_tokens}  ~$${cost.toFixed(4)}  ${seconds}s`);
    if (r?.content) console.log(JSON.stringify((r.content as { verdicts: unknown }).verdicts));
    // A write that made no call cannot make one next time either (no reading, a spent allowance).
    if (callsThisWrite === 0) break;
  }
}

async function main() {
  let thrown: unknown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  } finally {
    // Runs cascade with the deck; the ledger rows are the player's and are removed after them.
    await fixture.execute(sql`delete from decks where user_id = ${USER}`);
    await fixture.execute(sql`delete from model_calls where user_id = ${USER}`);
    await pool.end();
  }
  // Reported AFTER the `finally`: an exit there swallows the throw and prints a pass.
  if (thrown) {
    console.error(thrown);
    process.exit(1);
  }
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

void main();
