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
import { computeAndStoreProfile, type StoredProfileDeps } from "../src/lib/profile/stored";
import type { ModelOutcome } from "../src/lib/model/client";
import { retrySynopsisFor, writeSynopsisFor, type GenerateDeps } from "../src/lib/synopsis/generate";
import { pinSynopsisToVersion } from "../src/lib/synopsis/pin";
import { readSynopsisState, readVersionSynopsis } from "../src/lib/synopsis/read";
import type { SynopsisResponse } from "../src/lib/synopsis/response-schema";
import { stubReply, type StubMode } from "../src/lib/synopsis/stub";
import { SYNOPSIS_REAPER_CUTOFF_MS } from "../src/lib/synopsis/limits";

neonConfig.webSocketConstructor = ws;

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
const deps: GenerateDeps = {
  modelName: "probe-stub",
  model: async (_req, facts): Promise<ModelOutcome<SynopsisResponse>> => {
    calls += 1;
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    return stubReply(facts, queue.shift() ?? "survived");
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
  const pool104 = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line not ilike '%Land%' and oracle_id <> ${legend.oracle_id}::uuid
    order by oracle_id limit 104`);
  if (pool104.length < 104) return fail("104 cards for the fixture", `found ${pool104.length}`);
  const body = pool104.slice(0, 99);
  const spares = pool104.slice(99);

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
  check("…records the model that wrote it", stored.model, "probe-stub");
  check("…and the list it describes", stored.fingerprint, list());

  // 3 · REUSE IS KEYED ON THE LIST (ruling B): a second press on the same list reuses, free.
  const again = await writeSynopsisFor(deck.id, USER, deps);
  check("the same list reuses the synopsis", again.kind, "reused");
  check("…calling no model", calls, 1);
  check("…and charging nothing", await ledger(), [{ status: "spent", n: 1 }]);
  check("a current synopsis is not stale and would not spend", [(await state()).stale, (await state()).wouldSpend], [false, false]);
  // A contract bump alone is not an edit either: the old synopsis is still the list's.
  await fixture.execute(sql`update deck_synopses set contract_version = 0 where deck_id = ${deck.id}::uuid`);
  check("a synopsis under an older contract is reused too", (await writeSynopsisFor(deck.id, USER, deps)).kind, "reused");
  check("…and reads as current", (await state()).stale, false);

  // 4 · An edit stales it; the write waits for a fresh reading, which Re-analyze gives.
  await swap(spares[0]);
  const edited = await state();
  check("an edit stales the synopsis", edited.stale, true);
  check("…and a write over the stale reading is refused", (await writeSynopsisFor(deck.id, USER, deps)).kind, "no_reading");
  await analyze(deck.id);
  check("after Re-analyze a press would spend", (await state()).wouldSpend, true);
  const rewritten = await writeSynopsisFor(deck.id, USER, deps);
  check("the new list is written", rewritten.kind, "written");
  check("…and reads current", (await state()).stale, false);

  // 5 · A PARTIAL refusal, then a section retry that passes: the rest byte for byte.
  await ageLedger();
  await swap(spares[1]);
  await analyze(deck.id);
  queue = ["partial"];
  const partial = await writeSynopsisFor(deck.id, USER, deps);
  check("a partial answer is refused, and shown", partial.kind === "written" && [partial.outcome, !!partial.synopsis], ["refused", true]);
  check("…and spends, because the player sees three sections", (await ledger()).find((r) => r.status === "spent")?.n, 1);
  const before = partial.kind === "written" ? partial.synopsis! : null;
  const retried = await retrySynopsisFor(deck.id, USER, before!.id, deps);
  const after = retried.kind === "written" ? retried.synopsis! : null;
  check("the retry survives", retried.kind === "written" && retried.outcome, "survived");
  check("…keeps the passing sections unchanged", canon([after?.content.primer, after?.content.keyCards, after?.content.weaknesses]),
    canon([before?.content.primer, before?.content.keyCards, before?.content.weaknesses]));
  check("…rewrites the refused one", after?.content.overview !== null, true);
  const [link] = await rows<{ retry_of: string | null }>(sql`select retry_of from deck_synopses where id = ${after!.id}::uuid`);
  check("…and names the run it retried", link.retry_of, before!.id);
  check("…and spends for the section that passed", (await ledger()).find((r) => r.status === "spent")?.n, 2);

  // 6 · A retry whose retried section fails AGAIN shows nothing new, and is refunded.
  await swap(spares[2]);
  await analyze(deck.id);
  queue = ["partial"];
  const partial2 = await writeSynopsisFor(deck.id, USER, deps);
  queue = ["partial"];
  const failedRetry = await retrySynopsisFor(deck.id, USER, partial2.kind === "written" ? partial2.synopsis!.id : "", deps);
  check("a retry failing again is still refused", failedRetry.kind === "written" && failedRetry.outcome, "refused");
  check("…and refunded", (await ledger()).find((r) => r.status === "refunded")?.n, 1);

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

  // 9 · THE REAPER, on both paths: a run a crash left pending is failed, refunded, and frees the
  // deck, whether the next thing to arrive is a write or a read. Each path is proved on its own
  // stranded run, because a read reaping first would hide a write that never reaps.
  const strand = async () => {
    const [unit] = await rows<{ id: string }>(sql`
      insert into model_calls (user_id, feature, created_at) values (${USER}, 'synopsis', now() - interval '6 minutes')
      returning id`);
    const [run] = await rows<{ id: string }>(sql`
      insert into deck_synopses (deck_id, user_id, fingerprint, contract_version, model, model_call_id, created_at)
      values (${deck.id}::uuid, ${USER}, ${list()}, 1, 'probe-stub', ${unit.id}::uuid,
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

  // 9b · A first write refused in EVERY section shows nothing, so it costs nothing.
  await ageLedger();
  await swap(body[2]); // left the deck in section 6
  await analyze(deck.id);
  queue = ["refused"];
  const allRefused = await writeSynopsisFor(deck.id, USER, deps);
  check("a write refused in every section is refused and shows nothing",
    allRefused.kind === "written" && [allRefused.outcome, allRefused.synopsis], ["refused", null]);
  check("…and is refunded", await ledger(), [{ status: "refunded", n: 1 }]);

  // 10 · A section retry on a synopsis under an older contract rewrites it whole.
  // body[0] left the deck in section 4, so putting it back is a real edit.
  await swap(body[0]);
  await analyze(deck.id);
  queue = ["partial"];
  const old = await writeSynopsisFor(deck.id, USER, deps);
  const oldId = old.kind === "written" ? old.synopsis!.id : "";
  await fixture.execute(sql`update deck_synopses set contract_version = 0 where id = ${oldId}::uuid`);
  const whole = await retrySynopsisFor(deck.id, USER, oldId, deps);
  const [wholeRow] = await rows<{ retry_of: string | null; contract_version: number }>(sql`
    select retry_of, contract_version from deck_synopses where deck_id = ${deck.id}::uuid order by created_at desc limit 1`);
  check("a retry over an older contract rewrites the whole synopsis under the current one",
    [whole.kind, wholeRow.retry_of, wholeRow.contract_version], ["written", null, 1]);

  // 11 · THE VERSION COPY, at commit only, onto the newest version, once.
  const committedList = list();
  const { version: v1 } = await commitVersion(deck.id, null);
  check("a pin for a list the version does not hold writes nothing",
    await pinSynopsisToVersion(deck.id, USER, { versionId: v1.id, list: "not-this-list" }), false);
  check("a pin for the committed list copies the synopsis", await pinSynopsisToVersion(deck.id, USER, { versionId: v1.id, list: committedList }), true);
  const copy = await readVersionSynopsis(v1.id, USER);
  check("…which the version reads back", copy?.versionNumber, v1.number);
  check("…and a second pin changes nothing", await pinSynopsisToVersion(deck.id, USER, { versionId: v1.id, list: committedList }), false);
  const { version: v2 } = await commitVersion(deck.id, null);
  check("an older version is never pinned", await pinSynopsisToVersion(deck.id, USER, { versionId: v1.id, list: committedList }), false);
  check("…while the newest one is", await pinSynopsisToVersion(deck.id, USER, { versionId: v2.id, list: committedList }), true);
  check("another reader cannot read a version's copy", await readVersionSynopsis(v1.id, "someone-else"), null);

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
  for (let i = 0; i < max; i++) {
    await fixture.execute(sql`update model_calls set created_at = now() - interval '25 hours' where user_id = ${userId}`);
    await fixture.execute(sql`delete from deck_version_synopses where synopsis_id in (select id from deck_synopses where deck_id = ${deckId}::uuid)`);
    await fixture.execute(sql`delete from deck_synopses where deck_id = ${deckId}::uuid`);
    await computeAndStoreProfile(deckId, userId, profileDeps);
    const result = await writeSynopsisFor(deckId, userId, { ...defaultDeps(), profile: profileDeps });
    const [r] = await rows<{ outcome: string; input_tokens: number | null; output_tokens: number | null; content: unknown }>(sql`
      select outcome, input_tokens, output_tokens, content from deck_synopses where deck_id = ${deckId}::uuid
      order by created_at desc limit 1`);
    const cost = ((r?.input_tokens ?? 0) * IN + (r?.output_tokens ?? 0) * OUT) / 1e6;
    console.log(`LIVE ${i + 1}/${max}  ${result.kind} ${r?.outcome}  in ${r?.input_tokens} out ${r?.output_tokens}  ~$${cost.toFixed(4)}`);
    if (r?.content) console.log(JSON.stringify((r.content as { verdicts: unknown }).verdicts));
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
