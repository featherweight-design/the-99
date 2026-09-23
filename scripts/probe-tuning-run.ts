// A tuning run's durability contract, proved against a real Postgres by calling the real
// writers: `startRun`, `finishRun`, `persistRun`, `cancelRun`, `readTuningState`, the four
// verdicts and `saveIntent`.
//
// Every rule here is a fact about what a transaction wrote: whether a guard held, whether a
// lock serialised two presses, whether a unit was spent or given back, whether an undo put the
// deck back exactly. A jsdom test with a stubbed driver proves the text was issued and nothing
// about any of that. The model is never called: a run's outcome is written the way `runTuning`
// writes it once the model has answered.
//
// Cases, numbered as the plan numbers them:
//   1  the reaper got there first: a late success writes nothing
//   2  the player pressed Stop: a late failure writes nothing
//   3  a second run on one deck is refused, and the loser holds no unit
//   4  two decks race for one player's last unit, and exactly one wins
//   5  apply refuses when the deck has moved, and changes nothing
//   6  apply refuses twice
//   7  undo returns exactly the prior deck, proxy mark included
//   8  dismiss, then restore
//   9  only an answer spends a unit
//  10  saving the intent clears the seeded flag; an over-cap save writes nothing
//  11  a commit since the run retires the set and reopens the gate; a moved cut no longer applies
// Case 11, the seeding in `createDeck` (and `fillDeck` declining to seed), needs a session and
// an EDHREC fetch, so it lives in `src/app/decks/actions.test.ts` against the stubbed driver.
//
// It writes decks under per-run `user_id`s and deletes them, and their allowance rows, in a
// `finally`. Every fixture deck is WHOLE (99 cards), because the analysis the run reads refuses
// a short one. Point it at `local-dev` or a scratch Neon branch, NEVER production.
//
//   pnpm probe:tuning-run
// First, and on its own line: the helper's import loads `.env`, and anything reading
// `DATABASE_URL` at module scope needs it already loaded.
import { requireEnv } from "./lib/env.mjs";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";

import { readAllowance } from "../src/lib/model/allowance";
import { MODEL_DAILY_ALLOWANCE } from "../src/lib/model/allowance-rule";
import { readTuningState } from "../src/lib/decks/tuning-read";
import { gateReason } from "../src/lib/tuning/gate";
import { cancelRun, finishRun, persistRun, saveIntent, startRun } from "../src/lib/tuning/run-store";
import { applyItem, setDismissed, undoItem } from "../src/lib/tuning/verdicts";
import type { ValidatedSuggestion } from "../src/lib/tuning/validate";

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);

const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const PREFIX = `probe-tuning-run-${Date.now()}`;
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
const fail = (label: string, why: string) => {
  failures += 1;
  console.log(`FAIL  ${label} — ${why}`);
};

const rows = async <T>(text: ReturnType<typeof sql>): Promise<T[]> =>
  (await fixture.execute(text)).rows as T[];

type Catalog = { legend: string; body: string[]; add: string };

async function catalog(): Promise<Catalog | null> {
  const [legend] = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line ilike '%Legendary Creature%' and commander_legal
    order by oracle_id limit 1`);
  // A colourless card legal in any deck: the add, which apply checks against the commander.
  const [add] = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where commander_legal and color_identity = '{}' and type_line ilike '%Artifact%'
      and type_line not ilike '%Land%' and type_line not ilike '%Legendary%'
    order by oracle_id limit 1`);
  if (!legend || !add) return null;
  const body = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line not ilike '%Land%' and oracle_id <> ${legend.oracle_id}::uuid
      and oracle_id <> ${add.oracle_id}::uuid
    order by oracle_id limit 99`);
  if (body.length < 99) return null;
  return { legend: legend.oracle_id, body: body.map((b) => b.oracle_id), add: add.oracle_id };
}

async function makeDeck(userId: string, c: Catalog): Promise<string> {
  const [deck] = await rows<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${userId}, 'probe tuning run', ${c.legend}::uuid) returning id`);
  // One statement: a row per round trip is ~100 of them against a serverless Postgres.
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values ${sql.join(
      c.body.map((id) => sql`(${deck.id}::uuid, ${id}::uuid, 1)`), sql`, `)}`);
  return deck.id;
}

const runRow = async (runId: string) =>
  (await rows<{ status: string; error_class: string | null; unit: string }>(sql`
    select r.status, r.error_class, m.status as unit
    from deck_suggestion_runs r join model_calls m on m.id = r.model_call_id
    where r.id = ${runId}::uuid`))[0] ?? null;

const itemCount = async (runId: string) =>
  (await rows<{ n: number }>(sql`
    select count(*)::int as n from deck_suggestion_items where run_id = ${runId}::uuid`))[0].n;

const units = async (userId: string) =>
  (await rows<{ status: string }>(sql`
    select status from model_calls where user_id = ${userId} order by created_at`)).map((r) => r.status);

const cardRow = async (deckId: string, oracleId: string) =>
  (await rows<{ quantity: number; auto: boolean }>(sql`
    select quantity, auto from deck_cards
    where deck_id = ${deckId}::uuid and oracle_id = ${oracleId}::uuid`))[0] ?? null;

const proxied = async (deckId: string, oracleId: string) =>
  (await rows<{ n: number }>(sql`
    select count(*)::int as n from deck_proxies
    where deck_id = ${deckId}::uuid and oracle_id = ${oracleId}::uuid`))[0].n === 1;

const verdictOf = async (itemId: string) =>
  (await rows<{ verdict: string; snapshot: boolean }>(sql`
    select verdict, undo_snapshot is not null as snapshot
    from deck_suggestion_items where id = ${itemId}::uuid`))[0];

function suggestion(c: Catalog, cut = c.body[0]): ValidatedSuggestion {
  return {
    addOracleId: c.add,
    cutOracleId: cut,
    rationale: "Mana was marked as hurting in 3 of 5 games.",
    rationaleShort: "Mana hurt in 3 of 5",
    evidence: [{ kind: "decklist", value: "the decklist" }],
    position: 0,
    bracketAfter: null,
  };
}

/** A run that answered, as `runTuning` writes one: started, then persisted. */
async function answered(userId: string, deckId: string, c: Catalog, fingerprint = "fp", cut?: string) {
  const started = await startRun(userId, deckId, fingerprint);
  if (started.kind !== "started") throw new Error(`startRun refused: ${started.kind}`);
  await persistRun(started.runId, [suggestion(c, cut)], 0);
  const [item] = await rows<{ id: string }>(sql`
    select id from deck_suggestion_items where run_id = ${started.runId}::uuid`);
  return { runId: started.runId, itemId: item.id };
}

async function run() {
  const c = await catalog();
  if (!c) return fail("a catalog to build fixtures from", "no legend, colourless add, or 99 body cards");
  const future = (minutes: number) => new Date(Date.now() + minutes * 60_000);

  // 1 · The reaper got there first.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    const started = await startRun(u, deck, "fp");
    if (started.kind !== "started") return fail("case 1 start", started.kind);
    await readTuningState(deck, u, "fp", future(10));
    const wrote = await persistRun(started.runId, [suggestion(c)], 0);
    check("1 · a late success after the reaper reports superseded", wrote, false);
    check("1 · the run still reads failed/interrupted, unit refunded",
      await runRow(started.runId), { status: "failed", error_class: "interrupted", unit: "refunded" });
    check("1 · no items were written", await itemCount(started.runId), 0);
  }

  // 2 · The player pressed Stop.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    const started = await startRun(u, deck, "fp");
    if (started.kind !== "started") return fail("case 2 start", started.kind);
    check("2 · the Stop lands", await cancelRun(started.runId, deck, u), true);
    const wrote = await finishRun(started.runId, { status: "failed", errorClass: "timeout" });
    check("2 · a late failure after the Stop reports superseded", wrote, false);
    check("2 · cancelled survives, unit refunded",
      await runRow(started.runId), { status: "cancelled", error_class: null, unit: "refunded" });
    check("2 · a second Stop finds nothing to stop", await cancelRun(started.runId, deck, u), false);
  }

  // 3 · A second run on one deck, both sequentially and started together.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    const first = await startRun(u, deck, "fp");
    const second = await startRun(u, deck, "fp");
    check("3 · a second run on the deck is refused as in flight", [first.kind, second.kind], ["started", "in_flight"]);
    check("3 · the loser holds no unit", await units(u), ["reserved"]);

    const u2 = newUser();
    const deck2 = await makeDeck(u2, c);
    const raced = await Promise.all([startRun(u2, deck2, "fp"), startRun(u2, deck2, "fp")]);
    check("3 · started together, exactly one starts",
      raced.map((r) => r.kind).sort(), ["in_flight", "started"]);
    check("3 · and exactly one unit is held", await units(u2), ["reserved"]);
  }

  // 4 · Two decks race for one player's last unit.
  {
    const u = newUser();
    const [deckA, deckB] = [await makeDeck(u, c), await makeDeck(u, c)];
    // Every unit but one already spent, inside the window.
    await fixture.execute(sql`
      insert into model_calls (user_id, feature, status)
      select ${u}, 'tuning', 'spent' from generate_series(1, ${MODEL_DAILY_ALLOWANCE - 1})`);
    const raced = await Promise.all([startRun(u, deckA, "fp"), startRun(u, deckB, "fp")]);
    check("4 · exactly one of two decks takes the last unit",
      raced.map((r) => r.kind).sort(), ["allowance", "started"]);
    const allowance = await readAllowance(u);
    check("4 · the allowance reads full, not over", [allowance.used, allowance.limit],
      [MODEL_DAILY_ALLOWANCE, MODEL_DAILY_ALLOWANCE]);
  }

  // 5–7 · Apply and undo, on a cut held at two copies, auto, and proxied.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    const cut = c.body[0];
    await fixture.execute(sql`
      update deck_cards set quantity = 2, auto = true
      where deck_id = ${deck}::uuid and oracle_id = ${cut}::uuid`);
    await fixture.execute(sql`insert into deck_proxies (deck_id, oracle_id) values (${deck}::uuid, ${cut}::uuid)`);
    const { itemId } = await answered(u, deck, c);

    check("7 · another reader cannot apply the item", await applyItem(itemId, newUser()), null);

    check("5 · apply lands", await applyItem(itemId, u), deck);
    check("5 · the cut loses one copy", await cardRow(deck, cut), { quantity: 1, auto: true });
    check("5 · the add arrives as one chosen copy", await cardRow(deck, c.add), { quantity: 1, auto: false });
    check("5 · the verdict and the snapshot land with it", await verdictOf(itemId),
      { verdict: "accepted", snapshot: true });

    check("6 · a second apply is refused", await applyItem(itemId, u), null);
    check("6 · and changes no row", [await cardRow(deck, cut), await cardRow(deck, c.add)],
      [{ quantity: 1, auto: true }, { quantity: 1, auto: false }]);

    check("7 · undo lands", await undoItem(itemId, u), deck);
    check("7 · the cut is back at two copies, auto", await cardRow(deck, cut), { quantity: 2, auto: true });
    check("7 · the cut is still proxied", await proxied(deck, cut), true);
    check("7 · the add is gone", await cardRow(deck, c.add), null);
    check("7 · the item is pending again, snapshot cleared", await verdictOf(itemId),
      { verdict: "pending", snapshot: false });
    check("7 · a second undo is refused", await undoItem(itemId, u), null);
  }

  // 5, 7 · A cut at ONE copy leaves the deck, its proxy mark with it, and both come back.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    const cut = c.body[1];
    await fixture.execute(sql`insert into deck_proxies (deck_id, oracle_id) values (${deck}::uuid, ${cut}::uuid)`);
    const { itemId } = await answered(u, deck, c, "fp", cut);
    await applyItem(itemId, u);
    check("5 · a last copy cut leaves the deck", await cardRow(deck, cut), null);
    check("5 · and its proxy mark goes with it", await proxied(deck, cut), false);
    await undoItem(itemId, u);
    check("7 · undo puts the row back as it was", await cardRow(deck, cut), { quantity: 1, auto: false });
    check("7 · and the proxy mark with it", await proxied(deck, cut), true);

    // 5 · The deck moved: the cut is gone, so the apply refuses and writes nothing.
    await fixture.execute(sql`delete from deck_cards where deck_id = ${deck}::uuid and oracle_id = ${cut}::uuid`);
    check("5 · an apply whose cut the deck no longer holds is refused", await applyItem(itemId, u), null);
    check("5 · and adds nothing", await cardRow(deck, c.add), null);
    check("5 · and leaves the item pending", await verdictOf(itemId), { verdict: "pending", snapshot: false });
  }

  // 7 · Undo restores the deck the apply left, and nothing it did not leave.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    const cut = c.body[2];
    await fixture.execute(sql`
      update deck_cards set quantity = 2 where deck_id = ${deck}::uuid and oracle_id = ${cut}::uuid`);
    const { itemId } = await answered(u, deck, c, "fp", cut);
    await applyItem(itemId, u);
    // A mark put on the remaining copy AFTER the apply is not part of the deck undo restores.
    await fixture.execute(sql`insert into deck_proxies (deck_id, oracle_id) values (${deck}::uuid, ${cut}::uuid)`);
    await undoItem(itemId, u);
    check("7 · undo takes off a proxy mark added after the apply", await proxied(deck, cut), false);
    check("7 · and the cut is back at two copies", await cardRow(deck, cut), { quantity: 2, auto: false });

    // The player keeps the cut's remaining copy after applying: a provenance edit, refused too.
    {
      const u2 = newUser();
      const deck2 = await makeDeck(u2, c);
      await fixture.execute(sql`
        update deck_cards set quantity = 2, auto = true where deck_id = ${deck2}::uuid and oracle_id = ${cut}::uuid`);
      const kept = await answered(u2, deck2, c, "fp", cut);
      await applyItem(kept.itemId, u2);
      await fixture.execute(sql`
        update deck_cards set auto = false where deck_id = ${deck2}::uuid and oracle_id = ${cut}::uuid`);
      check("7 · undo after the player kept the cut's copy is refused", await undoItem(kept.itemId, u2), null);
      check("7 · and the kept copy stays kept", await cardRow(deck2, cut), { quantity: 1, auto: false });
    }

    // The player edits the add after applying: undo would destroy that edit, so it refuses.
    await applyItem(itemId, u);
    await fixture.execute(sql`delete from deck_cards where deck_id = ${deck}::uuid and oracle_id = ${c.add}::uuid`);
    check("7 · undo over a deck the player has since changed is refused", await undoItem(itemId, u), null);
    check("7 · and leaves the cut as the player left it", await cardRow(deck, cut), { quantity: 1, auto: false });
    check("7 · and the item accepted", (await verdictOf(itemId)).verdict, "accepted");
  }

  // 8 · Dismiss, then restore, with the deck untouched.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    const { itemId } = await answered(u, deck, c);
    check("8 · dismiss lands", await setDismissed(itemId, u, true), deck);
    check("8 · the item reads dismissed", (await verdictOf(itemId)).verdict, "dismissed");
    check("8 · an apply on a dismissed item is refused", await applyItem(itemId, u), null);
    check("8 · restore lands", await setDismissed(itemId, u, false), deck);
    check("8 · the item is pending again", (await verdictOf(itemId)).verdict, "pending");
    check("8 · the deck never moved", [await cardRow(deck, c.body[0]), await cardRow(deck, c.add)],
      [{ quantity: 1, auto: false }, null]);
  }

  // 9 · Only an answer spends a unit — and the gate reads it.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    const before = (await readAllowance(u)).used;
    const failed = await startRun(u, deck, "fp");
    if (failed.kind !== "started") return fail("case 9 start", failed.kind);
    await finishRun(failed.runId, { status: "failed", errorClass: "malformed" });
    check("9 · a failed run gives its unit back", (await runRow(failed.runId))!.unit, "refunded");
    check("9 · and the allowance is where it was", (await readAllowance(u)).used, before);

    const { runId } = await answered(u, deck, c, "fp-1");
    check("9 · an answered run spends its unit", (await runRow(runId))!.unit, "spent");
    check("9 · and the allowance counts it", (await readAllowance(u)).used, before + 1);

    const same = await readTuningState(deck, u, "fp-1");
    check("9 · the panel reads the answer's items", same.items.length, 1);
    check("9 · an unchanged deck gates as unchanged", gateReason(same)?.kind ?? null, "unchanged");
    const moved = await readTuningState(deck, u, "fp-2");
    check("9 · a changed deck is stale and ungated", [moved.stale, gateReason(moved)], [true, null]);
  }

  // 11 · A commit retires the set, and an item the deck has moved past no longer applies.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    const insertVersion = (n: number) => fixture.execute(sql`
      insert into deck_versions (deck_id, number, commander_oracle_id)
      values (${deck}::uuid, ${n}, ${c.legend}::uuid)`);
    await insertVersion(1);
    const { itemId } = await answered(u, deck, c, "fp-v");
    const before = await readTuningState(deck, u, "fp-v");
    check("11 · a set with no commit since reads unretired", before.retired, null);
    check("11 · and its item applies", before.items.map((i) => i.applies), [true]);

    // Committed a moment later, by the database's clock, with the list unchanged.
    await fixture.execute(sql`select pg_sleep(0.05)`);
    await insertVersion(2);
    const after = await readTuningState(deck, u, "fp-v");
    check("11 · a commit since the run retires the set, naming both versions", after.retired, { from: 1, to: 2 });
    check("11 · and reopens the gate though the list did not move", [after.stale, gateReason(after)], [false, null]);

    await fixture.execute(sql`delete from deck_cards where deck_id = ${deck}::uuid and oracle_id = ${c.body[0]}::uuid`);
    const moved = await readTuningState(deck, u, "fp-v");
    check("11 · an item whose cut the deck no longer holds does not apply", moved.items.map((i) => i.applies), [false]);
    check("11 · and apply refuses it", await applyItem(itemId, u), null);
  }

  // 10 · The intent.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    await fixture.execute(sql`
      update decks set intent = 'Built around a legend.', intent_seeded = true where id = ${deck}::uuid`);
    const intentOf = async () => (await rows<{ intent: string | null; seeded: boolean }>(sql`
      select intent, intent_seeded as seeded from decks where id = ${deck}::uuid`))[0];

    check("10 · an over-cap save is refused", await saveIntent(deck, u, "a".repeat(121)), "tooLong");
    check("10 · and writes nothing", await intentOf(), { intent: "Built around a legend.", seeded: true });
    check("10 · another reader's save is refused", await saveIntent(deck, newUser(), "mine"), "refused");
    check("10 · a save lands", await saveIntent(deck, u, "  grind it out  "), "saved");
    check("10 · the line is the player's now, trimmed", await intentOf(), { intent: "grind it out", seeded: false });
    await saveIntent(deck, u, "");
    check("10 · an empty save clears the line", await intentOf(), { intent: null, seeded: false });
  }
}

async function main() {
  let thrown: unknown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  } finally {
    // Each on its own, so one failing cannot strand the other. Runs cascade with their deck;
    // allowance rows go after, since a run references its unit.
    for (const step of [
      sql`delete from decks where user_id like ${`${PREFIX}-%`}`,
      sql`delete from model_calls where user_id like ${`${PREFIX}-%`}`,
    ]) {
      try { await fixture.execute(step); } catch (error) { console.error("cleanup:", error); }
    }
    await pool.end();
  }
  // Reported AFTER the `finally`, never from inside it: an exit there swallows the throw and
  // prints a pass over a case that never ran.
  if (thrown) {
    console.error(thrown);
    process.exit(1);
  }
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

void main();
