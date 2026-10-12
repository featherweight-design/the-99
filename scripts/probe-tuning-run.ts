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
//  1b  the deck was deleted mid-call: the run row cascaded away, and a late success or failure
//      still records its bill on the unit, by the id `startRun` handed back. Looking the unit up
//      through the run row instead fails "1b · and still records what it billed on the unit",
//      once per outcome path (finishRun's and persistRun's, each mutated on its own).
//   2  the player pressed Stop: a late failure writes nothing
//   3  a second run on one deck is refused, and the loser holds no unit
//   4  two decks race for one player's last unit, and exactly one wins
//   5  apply refuses when the deck has moved, and changes nothing
//   6  apply refuses twice
//   7  undo returns exactly the prior deck, proxy mark included
//   8  dismiss, then restore
//   9  only an answer spends a unit
//  10  saving the intent clears the seeded flag; an over-cap save writes nothing
//  12  a commit since the run retires the set and reopens the gate; a moved cut no longer applies
//  13  v2's context (2026-09-24): the run reads the overview written for the LIVE list over a newer
//      one for another list, keeps its Key cards, names the universal staples through the catalog,
//      and the prompt and validator built from that pack carry and enforce them. The model's
//      effort and retry floor are `tuning-actions.test.ts`'s and `client.test.ts`'s, and a
//      failure's refund is case 9's; no model is called here either.
//  15  The two lists (sub-project 8): an addition and a cut are separate items, applied and undone
//      on their own half; a cut whose card left no longer applies; the CHECK refuses neither card.
//  14  Locked (never cut): a cut locked since the run no longer applies, is named, and is refused;
//      the lock moves the fingerprint and reopens the gate; a `locked_only` run is written and
//      refunded (the 0062 constraint). The validator's own `neverCut` drop is `validate.test.ts`'s.
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
import { randomUUID } from "node:crypto";

import { dailyLimitFor, readAllowance } from "../src/lib/model/allowance";
import { readTuningContext, readTuningState, tuningInputs } from "../src/lib/decks/tuning-read";
import { buildPlayGroup } from "../src/lib/profile/play";
import { listFingerprint } from "../src/lib/profile/fingerprint";
import { loadDeckProfileFromHead } from "../src/lib/profile/load";
import { loadUniversalStaples } from "../src/lib/staples/universal";
import { buildEvidencePack } from "../src/lib/tuning/evidence";
import { buildPrompt } from "../src/lib/tuning/prompt";
import { validateSuggestions } from "../src/lib/tuning/validate";
import { gateReason } from "../src/lib/tuning/gate";
import { cancelRun, finishRun, persistRun, saveIntent, startRun } from "../src/lib/tuning/run-store";
import { applyItem, setDismissed, undoItem } from "../src/lib/tuning/verdicts";
import type { ValidatedSuggestion } from "../src/lib/tuning/validate";
import type { TuningResponse } from "../src/lib/tuning/response-schema";
import type { PairItem } from "../src/lib/tuning/state";

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

/** The unit's meters, as a late outcome records them (`recordLate` in `run-store.ts`). */
const unitMeters = async (runId: string) =>
  (await rows<{ output_tokens: number | null; cost: string | null }>(sql`
    select m.output_tokens, m.cost_micro_usd::text as cost
    from deck_suggestion_runs r join model_calls m on m.id = r.model_call_id
    where r.id = ${runId}::uuid`))[0] ?? null;
const lateBill = { model: "claude-sonnet-5", usage: { inputTokens: 1_000, outputTokens: 500, cacheReadTokens: 0, cacheWriteTokens: 0 } };

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
async function answered(
  userId: string, deckId: string, c: Catalog, fingerprint = "fp", cut?: string, readVersion: number | null = null,
) {
  const started = await startRun(userId, deckId, fingerprint, readVersion);
  if (started.kind !== "started") throw new Error(`startRun refused: ${started.kind}`);
  await persistRun(started, [suggestion(c, cut)], 0);
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
    const started = await startRun(u, deck, "fp", null);
    if (started.kind !== "started") return fail("case 1 start", started.kind);
    await readTuningState(deck, u, "fp", future(10));
    const wrote = await persistRun(started, [suggestion(c)], 0, lateBill);
    check("1 · a late success after the reaper reports superseded", wrote, false);
    // The call billed all the same: its meters land on the refunded unit (credits count
    // successes; dollars count everything billed).
    check("1 · and still records what it billed on the unit", await unitMeters(started.runId),
      { output_tokens: 500, cost: "7000" });
    check("1 · the run still reads failed/interrupted, unit refunded",
      await runRow(started.runId), { status: "failed", error_class: "interrupted", unit: "refunded" });
    check("1 · no items were written", await itemCount(started.runId), 0);
  }

  // 1b · The deck was DELETED mid-call. Its run rows cascade away while `model_calls` is kept, so a
  // late outcome can only reach its unit by the id the start handed back, never through the run.
  {
    const u = newUser();
    const callMeters = async (callId: string) => (await rows<{ output_tokens: number | null; cost: string | null }>(sql`
      select output_tokens, cost_micro_usd::text as cost from model_calls where id = ${callId}::uuid`))[0] ?? null;
    for (const [label, deliver] of [
      ["success", (h: { runId: string; callId: string }) => persistRun(h, [], 0, lateBill)],
      ["failure", (h: { runId: string; callId: string }) => finishRun(h, { status: "failed", errorClass: "timeout" }, lateBill)],
    ] as const) {
      const deck = await makeDeck(u, c);
      const started = await startRun(u, deck, "fp", null);
      if (started.kind !== "started") return fail(`case 1b start (${label})`, started.kind);
      await fixture.execute(sql`delete from decks where id = ${deck}::uuid`);
      check(`1b · the deck's delete took the run row with it (${label})`, await runRow(started.runId), null);
      check(`1b · a late ${label} on a deleted deck reports superseded`, await deliver(started), false);
      check(`1b · and still records what it billed on the unit (${label})`, await callMeters(started.callId),
        { output_tokens: 500, cost: "7000" });
    }
  }

  // 2 · The player pressed Stop. The panel names its run, so Stop cancels that id and no other;
  // a Stop that beats the row writes nothing, and the row then lands under the named id.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    const chosen = randomUUID();
    check("2 · a Stop before the row exists finds nothing", await cancelRun(chosen, deck, u), false);
    const started = await startRun(u, deck, "fp", null, { runId: chosen });
    if (started.kind !== "started") return fail("case 2 start", started.kind);
    check("2 · the run is written under the id the panel chose", started.runId, chosen);
    check("2 · the Stop lands", await cancelRun(started.runId, deck, u), true);
    const wrote = await finishRun(started, { status: "failed", errorClass: "timeout" }, lateBill);
    check("2 · a late failure after the Stop reports superseded", wrote, false);
    check("2 · and still records what it billed on the unit", await unitMeters(started.runId),
      { output_tokens: 500, cost: "7000" });
    check("2 · cancelled survives, unit refunded",
      await runRow(started.runId), { status: "cancelled", error_class: null, unit: "refunded" });
    check("2 · a second Stop finds nothing to stop", await cancelRun(started.runId, deck, u), false);
  }

  // 3 · A second run on one deck, both sequentially and started together.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    const first = await startRun(u, deck, "fp", null);
    const second = await startRun(u, deck, "fp", null);
    check("3 · a second run on the deck is refused as in flight", [first.kind, second.kind], ["started", "in_flight"]);
    check("3 · the loser holds no unit", await units(u), ["reserved"]);

    const u2 = newUser();
    const deck2 = await makeDeck(u2, c);
    const raced = await Promise.all([startRun(u2, deck2, "fp", null), startRun(u2, deck2, "fp", null)]);
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
      select ${u}, 'tuning', 'spent' from generate_series(1, ${dailyLimitFor(u) - 1})`);
    const raced = await Promise.all([startRun(u, deckA, "fp", null), startRun(u, deckB, "fp", null)]);
    check("4 · exactly one of two decks takes the last unit",
      raced.map((r) => r.kind).sort(), ["allowance", "started"]);
    const allowance = await readAllowance(u);
    check("4 · the allowance reads full, not over", [allowance.used, allowance.limit],
      [dailyLimitFor(u), dailyLimitFor(u)]);
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
    const before = (await readTuningState(deck, u, "fp")).items.find((i): i is PairItem => i.id === itemId && i.side === undefined);
    check("5 · before the apply the add is not in the deck", before?.addInDeck, false);

    check("7 · another reader cannot apply the item", await applyItem(itemId, newUser()), null);

    check("5 · apply lands", await applyItem(itemId, u), deck);
    check("5 · the cut loses one copy", await cardRow(deck, cut), { quantity: 1, auto: true });
    check("5 · the add arrives as one chosen copy", await cardRow(deck, c.add), { quantity: 1, auto: false });
    check("5 · the verdict and the snapshot land with it", await verdictOf(itemId),
      { verdict: "accepted", snapshot: true });
    // The card reads the add's claim with this deck's own ask subtracted, and marks it self-excluded
    // exactly when the deck holds the add. Before the apply it did not; now it does.
    const applied = (await readTuningState(deck, u, "fp")).items.find((i): i is PairItem => i.id === itemId && i.side === undefined);
    check("5 · the panel reads the applied add as in the deck", applied?.addInDeck, true);

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
    const failed = await startRun(u, deck, "fp", null);
    if (failed.kind !== "started") return fail("case 9 start", failed.kind);
    await finishRun(failed, { status: "failed", errorClass: "malformed" });
    check("9 · a failed run gives its unit back", (await runRow(failed.runId))!.unit, "refunded");
    check("9 · and the allowance is where it was", (await readAllowance(u)).used, before);

    const { runId } = await answered(u, deck, c, "fp-1");
    check("9 · an answered run spends its unit", (await runRow(runId))!.unit, "spent");
    check("9 · and the allowance counts it", (await readAllowance(u)).used, before + 1);

    // 9b · An answer too thin to charge for (`refundsCredit`, Hugh 2026-10-11) is stored and shown as an
    // ok run, and its unit comes back. Its own player and deck: an ok run moves the gate for its deck.
    {
      const u2 = newUser();
      const deck2 = await makeDeck(u2, c);
      const used = (await readAllowance(u2)).used;
      const thin = await startRun(u2, deck2, "fp-thin", null);
      if (thin.kind !== "started") return fail("case 9b start", thin.kind);
      await persistRun(thin, [suggestion(c)], 0, undefined, undefined, "refunded");
      check("9b · a thin answer reads ok and keeps its item",
        [(await runRow(thin.runId))!.status, (await rows<{ n: number }>(sql`
          select count(*)::int as n from deck_suggestion_items where run_id = ${thin.runId}::uuid`))[0].n], ["ok", 1]);
      check("9b · but its unit is refunded", (await runRow(thin.runId))!.unit, "refunded");
      check("9b · and the allowance counts nothing for it", (await readAllowance(u2)).used, used);
    }

    const same = await readTuningState(deck, u, "fp-1");
    check("9 · the panel reads the answer's items", same.items.length, 1);
    check("9 · an unchanged deck gates as unchanged", gateReason(same)?.kind ?? null, "unchanged");
    const moved = await readTuningState(deck, u, "fp-2");
    check("9 · a changed deck is stale and ungated", [moved.stale, gateReason(moved)], [true, null]);
    // A failed re-run leaves the last good set on screen, still open: the failure is the new
    // run's, and nothing the player had changed (STATES-tuning-panel.md :42).
    const rerun = await startRun(u, deck, "fp-2", null);
    if (rerun.kind !== "started") return fail("case 9 re-run start", rerun.kind);
    await finishRun(rerun, { status: "failed", errorClass: "timeout" });
    const kept = await readTuningState(deck, u, "fp-2");
    check("9 · a failed re-run keeps the last set's items", [kept.run?.status, kept.items.length], ["failed", 1]);
  }

  // 12 · A commit retires the set, and an item the deck has moved past no longer applies.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    const insertVersion = (n: number) => fixture.execute(sql`
      insert into deck_versions (deck_id, number, commander_oracle_id)
      values (${deck}::uuid, ${n}, ${c.legend}::uuid)`);
    await insertVersion(1);
    const read = await tuningInputs(deck, u);
    check("12 · the inputs carry the version they were read at", read?.readVersion ?? null, 1);
    const { itemId } = await answered(u, deck, c, "fp-v", undefined, read!.readVersion);
    const before = await readTuningState(deck, u, "fp-v");
    check("12 · a set with no commit since reads unretired", before.retired, null);
    check("12 · and its item applies", before.items.map((i) => i.applies), [true]);

    await insertVersion(2);
    const after = await readTuningState(deck, u, "fp-v");
    check("12 · a commit since the run retires the set, naming both versions", after.retired, { from: 1, to: 2 });
    check("12 · and reopens the gate though the list did not move", [after.stale, gateReason(after)], [false, null]);

    await fixture.execute(sql`delete from deck_cards where deck_id = ${deck}::uuid and oracle_id = ${c.body[0]}::uuid`);
    const moved = await readTuningState(deck, u, "fp-v");
    check("12 · an item whose cut the deck no longer holds does not apply", moved.items.map((i) => i.applies), [false]);
    check("12 · and apply refuses it", await applyItem(itemId, u), null);
  }

  // 14 · Locked (never cut): a cut the player locks after the run no longer applies, is named as
  //      locked, and is refused by the apply; the lock reopens the gate on an unchanged list (D6);
  //      and a run whose every cut was locked settles as `locked_only`, refunded like any failure.
  {
    process.env.NEVER_CUT_ENABLED = "true";
    const u = newUser();
    const deck = await makeDeck(u, c);
    const unlocked = await tuningInputs(deck, u);
    const { itemId } = await answered(u, deck, c, unlocked!.fingerprint);
    check("14 · before a lock, the gate reads unchanged", gateReason(await readTuningState(deck, u, unlocked!.fingerprint))?.kind ?? null, "unchanged");
    await fixture.execute(sql`insert into deck_locks (deck_id, oracle_id) values (${deck}::uuid, ${c.body[0]}::uuid)`);
    const locked = await tuningInputs(deck, u);
    check("14 · locking a card moves the fingerprint (D6)", locked!.fingerprint !== unlocked!.fingerprint, true);
    const state = await readTuningState(deck, u, locked!.fingerprint);
    check("14 · and reopens the gate", gateReason(state), null);
    check("14 · the item no longer applies, and says the cut is locked", state.items.map((i) => [i.applies, i.side === undefined ? i.cutLocked : i.locked]), [[false, true]]);
    check("14 · the apply refuses it", await applyItem(itemId, u), null);
    check("14 · and the locked card is still in the deck", await cardRow(deck, c.body[0]), { quantity: 1, auto: false });

    // The gate read a snapshot; the reservation re-checks under the deck row lock. With every card
    // locked, `startRun` refuses inside its transaction and reserves nothing.
    const allowanceBefore = (await readAllowance(u)).used;
    const everyCard = await fixture.execute<{ oracle_id: string }>(sql`select oracle_id from deck_cards where deck_id = ${deck}::uuid`);
    for (const r of everyCard.rows) {
      await fixture.execute(sql`insert into deck_locks (deck_id, oracle_id) values (${deck}::uuid, ${r.oracle_id}::uuid) on conflict do nothing`);
    }
    const refused = await startRun(u, deck, "fp-all-locked", null);
    check("14 · with every card locked, startRun refuses under the lock", refused.kind, "allLocked");
    check("14 · and reserves nothing", (await readAllowance(u)).used, allowanceBefore);
    await fixture.execute(sql`delete from deck_locks where deck_id = ${deck}::uuid and oracle_id <> ${c.body[0]}::uuid`);

    const run = await startRun(u, deck, locked!.fingerprint, null);
    if (run.kind !== "started") return fail("case 14 start", run.kind);
    await finishRun(run, { status: "failed", errorClass: "locked_only" });
    const settled = await runRow(run.runId);
    check("14 · a locked-only run is written (the constraint allows it) and refunded", settled?.unit, "refunded");
    check("14 · and the panel reads its class", (await readTuningState(deck, u, locked!.fingerprint)).run?.errorClass, "locked_only");
  }

  // 12 · A commit landing BETWEEN the read and the run's start still retires the set: the run
  // records the version it read, not the moment it began.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    await fixture.execute(sql`
      insert into deck_versions (deck_id, number, commander_oracle_id) values (${deck}::uuid, 1, ${c.legend}::uuid)`);
    const read = await tuningInputs(deck, u);
    await fixture.execute(sql`
      insert into deck_versions (deck_id, number, commander_oracle_id) values (${deck}::uuid, 2, ${c.legend}::uuid)`);
    await answered(u, deck, c, "fp-race", undefined, read!.readVersion);
    check("12 · a commit between the read and the start retires the set",
      (await readTuningState(deck, u, "fp-race")).retired, { from: 1, to: 2 });
  }

  // 13 · v2's context, read from the database a run reads.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    const head = (await tuningInputs(deck, u))!.head;
    const names = new Map((await rows<{ oracle_id: string; name: string }>(sql`
      select oracle_id, name from cards where oracle_id in (${sql.join([c.body[0], c.body[1], c.add].map((id) => sql`${id}::uuid`), sql`, `)})`)).map((r) => [r.oracle_id, r.name]));
    const [key, other, add] = [names.get(c.body[0])!, names.get(c.body[1])!, names.get(c.add)!];
    // An overview for THIS list naming one Key card, and a NEWER one for another list naming a
    // different card: the run must read the live list's own, as `readShownSynopsis` promises.
    const overview = (card: string, step: string) => ({
      verdicts: [{ section: "primer", status: "ok", failed: 0, total: 1 }, { section: "keyCards", status: "ok", failed: 0, total: 1 }],
      overview: null, weaknesses: null, cards: {},
      primer: { strategy: [step], mulligan: { keep: [], sendBack: [] }, tips: [] },
      keyCards: [{ card, claims: [], job: "Holds the plan together." }],
    });
    for (const [fingerprint, card, step] of [[listFingerprint(head), key, `Win with [[${key}]].`], ["another-list", other, "Something else."]] as const) {
      const [call] = await rows<{ id: string }>(sql`insert into model_calls (user_id, feature, status) values (${u}, 'synopsis', 'spent') returning id`);
      await fixture.execute(sql`insert into deck_synopses (deck_id, user_id, fingerprint, contract_version, model, model_call_id, status, outcome, content)
        values (${deck}::uuid, ${u}, ${fingerprint}, 7, 'probe', ${call.id}::uuid, 'done', 'survived', ${JSON.stringify(overview(card, step))}::jsonb)`);
    }

    const context = await readTuningContext(head);
    check("13 · the run reads the live list's own overview, not the newer one", context.overview, { strategy: [`Win with [[${key}]].`], keyCards: [key] });
    const universalIds = await loadUniversalStaples();
    // An empty set would pass every staple check here while measuring nothing: a database whose
    // staple index was never built is a failure of this case, not a pass.
    if (universalIds.size === 0) fail("13 · universal staples", "format_staples names none on this database; build the staple index first");
    // By id, not count: a read returning as many unrelated catalog cards would match a count.
    check("13 · every universal staple is named through the catalog",
      context.universal.map((u2) => u2.oracleId).sort(), [...universalIds].sort());

    const profile = await loadDeckProfileFromHead(head);
    const pack = buildEvidencePack({
      profile, play: buildPlayGroup([]), intent: null, owned: new Set(), ...context,
      limits: { capCents: null, sets: [], ownedOnly: false },
    });
    check("13 · the pack keeps the Key card the deck holds", pack.strategy?.keyCards.map((k) => k.oracleId), [c.body[0]]);
    const { system, user } = buildPrompt(pack);
    check("13 · the prompt carries the strategy and the Key card",
      [user.includes(`How this deck plays (from its own overview):\n- Win with ${key}.`), user.includes(`Key cards, never to be cut: ${key}.`)], [true, true]);
    check("13 · and names the universal staples", universalIds.size > 0 && context.universal.every((u2) => system.includes(u2.name)), true);

    const resolved = new Map([[key, c.body[0]], [other, c.body[1]], [add, c.add]]);
    const response: TuningResponse = { additions: [], cuts: [{ card: key, rationale: "r", rationaleShort: "r", evidence: [{ kind: "decklist", value: key }] }] };
    const { drops } = validateSuggestions({
      response, pack,
      resolveName: (n) => resolved.has(n)
        ? { oracleId: resolved.get(n)!, colorIdentity: [], commanderLegal: true, priceCents: null, printedInSelectedSets: true, owned: false }
        : null,
    });
    check("13 · the validator drops a cut of that Key card", drops.map((d) => d.rule), ["keyCard"]);
  }

  // 15 · The two lists (sub-project 8): an ADDITION and a CUT are separate items, each applied and
  // undone on its own half, and the migration's CHECK refuses a row with neither card.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    const cutId = c.body[1];
    const line = (over: Partial<ValidatedSuggestion>): ValidatedSuggestion => ({ ...suggestion(c), ...over });
    const started = await startRun(u, deck, "fp-lists", null);
    if (started.kind !== "started") return fail("case 15 start", started.kind);
    await persistRun(started, [
      line({ addOracleId: c.add, cutOracleId: null, position: 0 }),
      line({ addOracleId: null, cutOracleId: cutId, position: 1 }),
    ], 0);
    const state = await readTuningState(deck, u, "fp-lists");
    check("15 · the run reads back as an addition and a cut",
      state.items.map((i) => [i.side, i.applies]), [["add", true], ["cut", true]]);
    const [addItem, cutItem] = state.items;

    check("15 · applying the addition adds one chosen copy and cuts nothing", [await applyItem(addItem.id, u), await cardRow(deck, c.add)], [deck, { quantity: 1, auto: false }]);
    check("15 · applying the cut takes the card out", [await applyItem(cutItem.id, u), await cardRow(deck, cutId)], [deck, null]);
    check("15 · a second press of either is refused", [await applyItem(addItem.id, u), await applyItem(cutItem.id, u)], [null, null]);
    check("15 · the deck is 99 again: one in, one out",
      (await rows<{ n: number }>(sql`select sum(quantity)::int as n from deck_cards where deck_id = ${deck}::uuid`))[0].n, 99);

    check("15 · undoing the cut puts the card back as it was", [await undoItem(cutItem.id, u), await cardRow(deck, cutId)], [deck, { quantity: 1, auto: false }]);
    check("15 · undoing the addition takes it out again", [await undoItem(addItem.id, u), await cardRow(deck, c.add)], [deck, null]);

    // A cut whose card has left the deck no longer applies, and an addition already in the deck neither.
    await fixture.execute(sql`delete from deck_cards where deck_id = ${deck}::uuid and oracle_id = ${cutId}::uuid`);
    check("15 · a cut whose card left no longer applies, and the apply refuses it",
      [(await readTuningState(deck, u, "fp-lists")).items.map((i) => i.applies), await applyItem(cutItem.id, u)], [[true, false], null]);
    let refusedBoth = false;
    try {
      await fixture.execute(sql`insert into deck_suggestion_items (run_id, rationale, rationale_short, evidence, position)
        values (${started.runId}::uuid, 'r', 'r', '[]'::jsonb, 9)`);
    } catch {
      refusedBoth = true;
    }
    check("15 · a row naming neither card is refused by the CHECK", refusedBoth, true);
  }

  // 10 · The intent.
  {
    const u = newUser();
    const deck = await makeDeck(u, c);
    await fixture.execute(sql`
      update decks set intent = 'Built around a legend.', intent_seeded = true where id = ${deck}::uuid`);
    const intentOf = async () => (await rows<{ intent: string | null; seeded: boolean }>(sql`
      select intent, intent_seeded as seeded from decks where id = ${deck}::uuid`))[0];

    check("10 · an over-cap save is refused", await saveIntent(deck, u, "a".repeat(241)), "tooLong");
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
