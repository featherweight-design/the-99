// Suggested changes v2's run and its one apply, proved against a real Postgres by calling the real writers:
// `startTuningV2` and its work (the run action's own path, past the switch), `applyPicks`, `undoSet` and `setPicked`.
// The model is never called: `TUNING_V2_STUB_DELAY_MS` turns on the staged stub (`stagedStubOutcome`), which streams
// canned additions and cuts a line at a time, so the additions land and are readable before the cuts.
//
// Cases:
//   1  a deck at 99 or 101 is refused before anything is reserved
//   2  the additions are saved and readable while the run is still pending, then the cuts; the run settles ok, spent
//   3  the same request on the unchanged deck asks to confirm, naming that run
//   4  apply 3 + 3: the deck stays at 100 with the three in and the three out; a repeat of the same press writes nothing;
//      undo returns the exact list, and the lines are open again and still picked
//   5  unequal counts are refused and change nothing
//   6  a second set from the same pool, and undoing it leaves the first applied
//  6b  per-card apply and dismiss refuse a v2 line
//   7  a pick is saved, only on an open v2 line of the reader's
//   8  an owned-only run never saves an addition the player does not own
//
// What it does NOT prove: every charge and refund row of spec §9 and plan P4 (a failed cut call, a refill short by the
// model). The staged stub cannot fail a call, so those rows are `charge.test.ts`'s table and `engine.test.ts`'s fakes.
// v10's per-card apply is `probe:tuning-run`'s cases 5 to 7 and 15, unchanged here.
//
// It writes decks under per-run `user_id`s and deletes them, their runs and their units, in a `finally`. Point it at
// `local-dev` or a scratch Neon branch, NEVER production or staging.
//
//   pnpm probe:tuning-v2
// First, and on its own line: the helper's import loads `.env`, and anything reading `DATABASE_URL` at module scope
// needs it already loaded.
import { requireEnv } from "./lib/env.mjs";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { PRODUCTION_BRANCH_ID, STAGING_BRANCH_ID } from "./lib/spend-target";

import { db } from "../src/db";
import { STUB_ADDITIONS } from "../src/lib/tuning/stub";
import { applyItem, setDismissed, undoItem } from "../src/lib/tuning/verdicts";
import { applyPicks, setPicked, undoSet } from "../src/lib/tuning/v2/apply-set";
import { startTuningV2, type V2Wire } from "../src/lib/tuning/v2/run";

requireEnv(["DATABASE_URL"]);
const env = { ...process.env, TUNING_V2_STUB_DELAY_MS: "400" } as NodeJS.ProcessEnv;

const PREFIX = `probe-tuning-v2-${Date.now()}`;
let users = 0;
const newUser = () => `${PREFIX}-${++users}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};

const rows = async <T,>(text: ReturnType<typeof sql>): Promise<T[]> => (await db.execute(text)).rows as T[];

type Catalog = { legend: string; body: string[] };

/** A mono-colourless legend, 99 nonland cards that are none of the stub's additions, so the stub's names validate. */
async function catalog(): Promise<Catalog | null> {
  const [legend] = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line ilike '%Legendary Artifact Creature%' and commander_legal and color_identity = '{}'
    order by oracle_id limit 1`);
  if (!legend) return null;
  const body = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where commander_legal and color_identity = '{}' and type_line not ilike '%Land%' and type_line not ilike '%Legendary%'
      and oracle_id <> ${legend.oracle_id}::uuid and name <> all(${sql.param([...STUB_ADDITIONS])}::text[])
    order by oracle_id limit 99`);
  if (body.length < 99) return null;
  return { legend: legend.oracle_id, body: body.map((b) => b.oracle_id) };
}

async function makeDeck(userId: string, c: Catalog, size = 99, ownedOnly = false): Promise<string> {
  const [deck] = await rows<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, tuning_owned_only)
    values (${userId}, 'probe tuning v2', ${c.legend}::uuid, ${ownedOnly}) returning id`);
  await db.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values ${sql.join(
      c.body.slice(0, Math.min(size, 99)).map((id, i) => sql`(${deck.id}::uuid, ${id}::uuid, ${i === 0 && size > 99 ? 1 + size - 99 : 1})`), sql`, `)}`);
  return deck.id;
}

const deckList = async (deckId: string) =>
  (await rows<{ oracle_id: string; quantity: number }>(sql`
    select oracle_id, quantity from deck_cards where deck_id = ${deckId}::uuid order by oracle_id`))
    .map((r) => `${r.oracle_id}x${r.quantity}`);
const deckSize = async (deckId: string) =>
  (await rows<{ n: number }>(sql`select coalesce(sum(quantity), 0)::int + 1 as n from deck_cards where deck_id = ${deckId}::uuid`))[0].n;
const unitCount = async (userId: string) =>
  (await rows<{ n: number }>(sql`select count(*)::int as n from model_calls where user_id = ${userId}`))[0].n;
const runOf = async (runId: string) =>
  (await rows<{ status: string; unit: string }>(sql`
    select r.status, m.status as unit from deck_suggestion_runs r join model_calls m on m.id = r.model_call_id
    where r.id = ${runId}::uuid`))[0] ?? null;
type Line = { id: string; add: string | null; cut: string | null; verdict: string; apply_set: string | null; picked: boolean };
const linesOf = async (runId: string) => rows<Line>(sql`
  select id, add_oracle_id as add, cut_oracle_id as cut, verdict, apply_set, picked
  from deck_suggestion_items where run_id = ${runId}::uuid order by position, id`);

const wire = (n: number): V2Wire => ({ requestedCount: n, request: undefined, bracket: null, confirmed: false });

/** Start a run and its work, watching the run while it is made: whether additions were readable while it was pending. */
async function run(deckId: string, userId: string, n: number) {
  const start = await startTuningV2({ deckId, userId, env, wire: wire(n), request: "" });
  if (start.kind !== "started") return { start, sawEarly: false };
  let sawEarly = false;
  let settled = false;
  const work = start.work(() => undefined).finally(() => { settled = true; });
  while (!settled) {
    const [s] = await rows<{ status: string; adds: number; cuts: number }>(sql`
      select r.status,
        (select count(*) from deck_suggestion_items i where i.run_id = r.id and i.add_oracle_id is not null)::int as adds,
        (select count(*) from deck_suggestion_items i where i.run_id = r.id and i.cut_oracle_id is not null)::int as cuts
      from deck_suggestion_runs r where r.id = ${start.runId}::uuid`);
    if (s?.status === "pending" && s.adds > 0 && s.cuts === 0) sawEarly = true;
    await new Promise((r) => setTimeout(r, 100));
  }
  await work;
  return { start, sawEarly };
}

const made: string[] = [];
async function main() {
  const [{ id: branchId }] = await rows<{ id: string | null }>(sql`select current_setting('neon.branch_id', true) as id`);
  // Fail closed: an unknown branch (a primary, or a non-Neon database) is refused as well as the two named ones.
  if (!branchId || branchId === PRODUCTION_BRANCH_ID || branchId === STAGING_BRANCH_ID || process.env.VERCEL_ENV === "production") {
    throw new Error(`refusing to write a fixture to ${branchId ?? "(unknown)"}: point DATABASE_URL at local-dev or a scratch branch`);
  }
  console.log(`branch ${branchId}`);
  const c = await catalog();
  if (!c) {
    console.log("FAIL  catalog — no colourless legend with 99 colourless nonland cards");
    process.exit(1);
  }

  // 1 — refused before anything is reserved.
  for (const size of [98, 100]) {
    const u = newUser();
    made.push(u);
    const deckId = await makeDeck(u, c, size);
    const r = await startTuningV2({ deckId, userId: u, env, wire: wire(3), request: "" });
    check(`1 · a deck at ${size + 1} is refused`, r.kind, "refused");
    check(`1 · and holds no unit (${size + 1})`, await unitCount(u), 0);
  }

  // 2 — additions first, then cuts.
  const u = newUser();
  made.push(u);
  const deckId = await makeDeck(u, c);
  check("2 · the fixture deck is at 100", await deckSize(deckId), 100);
  const first = await run(deckId, u, 3);
  check("2 · the run started", first.start.kind, "started");
  if (first.start.kind !== "started") return;
  const runId = first.start.runId;
  check("2 · additions were readable while the run was pending, before any cut", first.sawEarly, true);
  check("2 · the run settled ok and was charged", await runOf(runId), { status: "ok", unit: "spent" });
  const lines = await linesOf(runId);
  const adds = lines.filter((l) => l.add !== null);
  const cuts = lines.filter((l) => l.cut !== null);
  check("2 · it kept the ask of each list (ceil(1.5 × 3))", [adds.length, cuts.length], [5, 5]);
  if (adds.length < 5 || cuts.length < 5) {
    const [rep] = await rows<{ r: unknown }>(sql`select validation_report as r from deck_suggestion_runs where id = ${runId}::uuid`);
    console.log("report:", JSON.stringify(rep?.r).slice(0, 1500));
  }
  // Every case below picks from these lines; with fewer, its checks would pass over empty lists.
  if (adds.length < 5 || cuts.length < 5) return;

  // 3 — the same request asks to confirm.
  const again = await startTuningV2({ deckId, userId: u, env, wire: wire(3), request: "" });
  check("3 · the same request on the unchanged deck asks to confirm that run", again.kind === "confirm" ? again.runId : again.kind, runId);

  // 4 — apply 3 + 3, repeat, undo.
  const before = await deckList(deckId);
  const pick = { addIds: adds.slice(0, 3).map((l) => l.id), cutIds: cuts.slice(0, 3).map((l) => l.id) };
  const actionId = randomUUID();
  const applied = await applyPicks({ runId, ...pick, actionId, userId: u, env });
  check("4 · apply 3 + 3", applied.ok, true);
  check("4 · the deck stays at 100", await deckSize(deckId), 100);
  const after = await deckList(deckId);
  check("4 · the three additions are in", adds.slice(0, 3).every((l) => after.includes(`${l.add}x1`)), true);
  check("4 · the three cuts are out", cuts.slice(0, 3).every((l) => !after.some((r) => r.startsWith(l.cut!))), true);
  check("4 · the six lines carry the set", (await linesOf(runId)).filter((l) => l.apply_set === actionId).map((l) => l.verdict),
    Array(6).fill("accepted"));
  const repeat = await applyPicks({ runId, ...pick, actionId, userId: u, env });
  check("4 · a repeat of the same press answers with the set", repeat.ok && repeat.itemIds.length, 6);
  check("4 · and writes nothing", await deckList(deckId), after);
  check("4 · per-card undo refuses one line of the set", await undoItem(adds[0].id, u, env), null);
  check("4 · and the deck keeps the whole set", await deckList(deckId), after);
  const undone = await undoSet({ applySet: actionId, userId: u, env });
  check("4 · undo the set", undone.ok && undone.itemIds.length, 6);
  check("4 · undo returns the exact list", await deckList(deckId), before);
  check("4 · the lines are open again and still picked",
    (await linesOf(runId)).filter((l) => [...pick.addIds, ...pick.cutIds].includes(l.id)).map((l) => [l.verdict, l.apply_set, l.picked]),
    Array(6).fill(["pending", null, true]));

  // 5 — unequal counts.
  const unequal = await applyPicks({ runId, addIds: pick.addIds.slice(0, 2), cutIds: pick.cutIds.slice(0, 1), actionId: randomUUID(), userId: u, env });
  check("5 · unequal counts are refused", unequal.ok ? "applied" : unequal.refusal, { kind: "picks", reason: "unequal" });
  check("5 · and change nothing", await deckList(deckId), before);

  // 6 — two sets from one pool.
  const setA = randomUUID();
  const setB = randomUUID();
  const a = await applyPicks({ runId, addIds: pick.addIds.slice(0, 2), cutIds: pick.cutIds.slice(0, 2), actionId: setA, userId: u, env });
  const withA = await deckList(deckId);
  const b = await applyPicks({ runId, addIds: [adds[3].id], cutIds: [cuts[3].id], actionId: setB, userId: u, env });
  check("6 · a second set from the same pool", [a.ok, b.ok], [true, true]);
  await undoSet({ applySet: setB, userId: u, env });
  const afterB = await linesOf(runId);
  check("6 · undoing it leaves the first set applied", afterB.filter((l) => l.apply_set === setA).length, 4);
  check("6 · and its own lines open", afterB.filter((l) => [adds[3].id, cuts[3].id].includes(l.id)).map((l) => l.verdict), ["pending", "pending"]);
  check("6 · the deck is what set A left", await deckList(deckId), withA);
  await undoSet({ applySet: setA, userId: u, env });
  check("6 · undoing both returns the exact list", await deckList(deckId), before);

  // 6b — a v2 line is never applied or dismissed alone (plan P3): one line would move the deck off 99.
  check("6b · per-card apply refuses a v2 line", await applyItem(adds[4].id, u, env), null);
  check("6b · and so does dismiss", await setDismissed(adds[4].id, u, true), null);
  check("6b · and the deck is unchanged", await deckList(deckId), before);

  // 7 — picks.
  check("7 · a pick is saved", await setPicked(adds[4].id, u, true), deckId);
  check("7 · and read back", (await linesOf(runId)).find((l) => l.id === adds[4].id)?.picked, true);
  check("7 · another reader's pick is refused", await setPicked(adds[4].id, `${u}-other`, false), null);

  // 8 — owned-only: the stub's additions are owned by nobody here.
  const o = newUser();
  made.push(o);
  const ownedDeck = await makeDeck(o, c, 99, true);
  const owned = await run(ownedDeck, o, 3);
  if (owned.start.kind === "started") {
    const ownedLines = await linesOf(owned.start.runId);
    check("8 · an owned-only run saves no addition the player does not own", ownedLines.filter((l) => l.add !== null).length, 0);
  } else {
    check("8 · an owned-only run starts", owned.start.kind, "started");
  }
}

try {
  await main();
} finally {
  for (const u of made) {
    await db.execute(sql`delete from decks where user_id = ${u}`);
    await db.execute(sql`delete from model_calls where user_id = ${u}`);
  }
}
console.log(failures === 0 ? "probe:tuning-v2 — all checks passed" : `probe:tuning-v2 — ${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
