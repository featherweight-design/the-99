// Proposed cuts' state read and verdicts, proved against a real Postgres. The model is NEVER
// called: a run is written the way `runProposedCuts` writes it once the model has answered
// (`startCutsRun`, `persistCutsRun`), so the probe costs nothing.
//
// What only a database can answer, and a component test with a mocked read cannot:
//   readCutsState: the newest run, the newest OK run and ITS items as one instant; a failed or
//     stopped re-run leaves the last ok run's cuts standing; the allowance is this feature's own.
//   A cut writes the list: one copy out, the verdict and the undo snapshot with it; Undo puts the
//     row back exactly, and refuses over a deck that has moved.
//   A cut is refused when the card was locked while the run ran, and when it is the commander.
//   THE RE-OFFER RULE: a cut made from a result re-chains the run's fingerprint, so the result is
//     still current; an edit that is not one of its cuts is not chained, so it is stale.
//   A second cuts run on one deck is refused, and a Stop refunds.
//
// It clones a real over-100 deck (the first one it finds, or PROBE_CUTS_DECK) under a per-run
// `user_id` and deletes the clone and its rows in a `finally`. Point it at `local-dev` or a scratch
// Neon branch, NEVER production. NEVER staging: it writes.
//
//   pnpm probe:cuts-state
// First, and on its own line: the helper's import loads `.env`.
import { requireEnv } from "./lib/env.mjs";
import { Pool } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

process.env.NEVER_CUT_ENABLED = "true";
process.env.PROPOSED_CUTS_ENABLED = "true";
process.env.ANALYSIS_TAB_ENABLED = "true";

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const { readCutsState, readProposedCuts } = await import("../src/lib/decks/cuts-read");
const { cancelCutsRun, finishCutsRun, persistCutsRun, startCutsRun } = await import("../src/lib/tuning/cuts-run-store");
const { cutItem, setCutKept, undoCutItem } = await import("../src/lib/tuning/cuts-verdicts");

const pool = new Pool({ connectionString: DATABASE_URL });
const q = async (text: string, params: unknown[] = []) => (await pool.query(text, params)).rows;
const USER = `probe-cuts-state-${Date.now()}`;
let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} - got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
};

async function clone(): Promise<string> {
  const source = process.env.PROBE_CUTS_DECK
    ?? (await q(`select d.id from decks d join deck_cards c on c.deck_id = d.id group by d.id having sum(c.quantity) > 100 limit 1`))[0]?.id;
  if (!source) throw new Error("no over-100 deck to clone on this database");
  const id = randomUUID();
  const cols = (await q(`select column_name from information_schema.columns where table_name = 'decks' order by ordinal_position`)).map((r) => r.column_name as string);
  const list = cols.map((c) => `"${c}"`).join(", ");
  const select = cols.map((c) => (c === "id" ? "$1::uuid" : c === "user_id" ? "$2" : `"${c}"`)).join(", ");
  await q(`insert into decks (${list}) select ${select} from decks where id = $3`, [id, USER, source]);
  await q(`insert into deck_cards (deck_id, oracle_id, quantity, auto) select $1, oracle_id, quantity, auto from deck_cards where deck_id = $2`, [id, source]);
  return id;
}

let deckId = "";
try {
  deckId = await clone();
  const inputs = (await readProposedCuts(deckId, USER))!;
  check("the clone is over 100", inputs.facts.over > 0, true);
  const picks = inputs.facts.cards.slice(0, 3);
  const cuts = picks.map((c, i) => ({ oracleId: c.oracleId, name: c.name, reason: `Reason ${i}.`, cites: [{ kind: "offList" as const }], position: i }));
  const report = { askedCount: 3, survivedCount: 3, keptCount: 3, over: inputs.facts.over, drops: [] };

  // A fresh deck reads as never run.
  const never = await readCutsState(deckId, USER);
  check("never run: no run, no items, no last ok", [never.run, never.items.length, never.lastOkFingerprint], [null, 0, null]);

  // Stop refunds; a second run is refused while one is pending.
  const s1 = await startCutsRun(USER, deckId, inputs.fingerprint, inputs.readVersion);
  check("the first run starts", s1.kind, "started");
  const s2 = await startCutsRun(USER, deckId, inputs.fingerprint, inputs.readVersion);
  check("a second cuts run on one deck is refused", s2.kind, "in_flight");
  if (s1.kind === "started") {
    check("Stop cancels the run", await cancelCutsRun(s1.runId, deckId, USER), true);
    check("and refunds its unit", (await q(`select status from model_calls where id = $1`, [s1.callId]))[0].status, "refunded");
  }

  // A run that answers: items persisted, unit spent.
  const s3 = await startCutsRun(USER, deckId, inputs.fingerprint, inputs.readVersion);
  if (s3.kind !== "started") throw new Error(`start refused: ${s3.kind}`);
  check("persist writes the run and its items", await persistCutsRun(s3, cuts, report), true);
  const ok = await readCutsState(deckId, USER);
  check("readCutsState: newest run is the ok run", ok.run?.status, "ok");
  check("readCutsState: its items, in position order", ok.items.map((i) => i.position), [0, 1, 2]);
  check("readCutsState: every cut is a card in the deck, none the commander",
    (await q(`select count(*)::int n from deck_cut_items i join deck_cards c on c.deck_id = $1 and c.oracle_id = i.cut_oracle_id join decks d on d.id = $1 where i.run_id = $2 and i.cut_oracle_id not in (d.commander_oracle_id, coalesce(d.partner_oracle_id, d.commander_oracle_id))`, [deckId, s3.runId]))[0].n, 3);
  check("readCutsState: the run's own fingerprint", ok.lastOkFingerprint, inputs.fingerprint);
  check("readCutsState: the allowance is this feature's own, one unit spent", ok.allowance.used >= 1, true);

  // A failed re-run leaves the last ok run's cuts on screen.
  const s4 = await startCutsRun(USER, deckId, inputs.fingerprint, inputs.readVersion);
  if (s4.kind === "started") await finishCutsRun(s4, { status: "failed", errorClass: "upstream_busy" });
  const after = await readCutsState(deckId, USER);
  check("a failed re-run: newest run failed, last ok cuts stand", [after.run?.status, after.items.length], ["failed", 3]);

  // Cut: one copy out, verdict and snapshot written with it.
  const before = (await q(`select quantity from deck_cards where deck_id = $1 and oracle_id = $2`, [deckId, picks[0].oracleId]))[0].quantity;
  const itemIds = ok.items.map((i) => i.id);
  const cut = await cutItem(itemIds[0], USER);
  check("cut succeeds", cut.ok, true);
  const row = (await q(`select quantity from deck_cards where deck_id = $1 and oracle_id = $2`, [deckId, picks[0].oracleId]))[0];
  check("cut removed one copy", row?.quantity ?? 0, before - 1);
  check("cut stored the verdict and the undo snapshot", (await q(`select verdict, undo_snapshot is not null s from deck_cut_items where id = $1`, [itemIds[0]]))[0], { verdict: "accepted", s: true });

  // THE RE-OFFER RULE. A cut moves the run's fingerprint in its own transaction, so the result is
  // still current; an edit that is not one of its cuts moves the deck and not the run, so it is stale.
  const now = (await readProposedCuts(deckId, USER))!;
  check("the cut moved the deck's fingerprint", now.fingerprint !== inputs.fingerprint, true);
  check("and the run's fingerprint followed it, so the result is current", (await readCutsState(deckId, USER)).lastOkFingerprint, now.fingerprint);

  // Undo puts the row back exactly, and refuses over a deck that has moved.
  check("undo succeeds over the deck the cut left", (await undoCutItem(itemIds[0], USER)).ok, true);
  check("undo chained the run back to the list it was made against", (await readCutsState(deckId, USER)).lastOkFingerprint, inputs.fingerprint);
  check("undo restored the quantity", (await q(`select quantity from deck_cards where deck_id = $1 and oracle_id = $2`, [deckId, picks[0].oracleId]))[0].quantity, before);
  await cutItem(itemIds[0], USER);
  const afterCut = (await readProposedCuts(deckId, USER))!.fingerprint;
  await q(`insert into deck_cards (deck_id, oracle_id, quantity, auto) values ($1, $2, 1, false) on conflict (deck_id, oracle_id) do update set quantity = deck_cards.quantity + 1`, [deckId, picks[0].oracleId]);
  const edited = (await readProposedCuts(deckId, USER))!.fingerprint;
  check("an edit that is not a cut moves the deck and not the run: the result is stale", [edited !== afterCut, (await readCutsState(deckId, USER)).lastOkFingerprint === edited], [true, false]);
  const moved = await undoCutItem(itemIds[0], USER);
  check("undo over a moved deck refuses", moved.ok ? "ok" : moved.reason, "moved");

  // Locks: a card locked while the run ran can be stored as a proposal and is refused at Cut.
  await q(`insert into deck_locks (deck_id, oracle_id) values ($1, $2)`, [deckId, picks[1].oracleId]);
  const locked = await cutItem(itemIds[1], USER);
  check("a locked card is refused at Cut", locked.ok ? "ok" : locked.reason, "cutLocked");
  check("and is still in the deck", (await q(`select count(*)::int n from deck_cards where deck_id = $1 and oracle_id = $2`, [deckId, picks[1].oracleId]))[0].n, 1);

  // A result is actionable only for the list it was made against: the deck was edited above, so a
  // cut from the old result is refused before it writes anything.
  const staleCut = await cutItem(itemIds[2], USER);
  check("a cut from a result the deck has moved past is refused as stale", staleCut.ok ? "ok" : staleCut.reason, "stale");

  // Keep and Show it again move no card.
  const k = await setCutKept(itemIds[2], USER, true);
  check("keep dismisses", k.ok, true);
  check("show it again restores", (await setCutKept(itemIds[2], USER, false)).ok, true);

  // A cut is never offered for a commander, whatever a stale row says.
  const cmd = (await q(`select commander_oracle_id c from decks where id = $1`, [deckId]))[0].c;
  const run2 = await startCutsRun(USER, deckId, now.fingerprint, null);
  if (run2.kind === "started") {
    await persistCutsRun(run2, [{ oracleId: cmd, name: "commander", reason: "x", cites: [{ kind: "offList" }], position: 0 }], { ...report, askedCount: 1, survivedCount: 1, keptCount: 1 });
    const id = (await q(`select i.id from deck_cut_items i where i.run_id = $1`, [run2.runId]))[0].id;
    const c = await cutItem(id, USER);
    check("the commander is refused", c.ok ? "ok" : c.reason, "cutGone");
  }
} finally {
  if (deckId) {
    await q(`delete from deck_suggestion_runs where deck_id = $1`, [deckId]);
    await q(`delete from decks where id = $1`, [deckId]);
  }
  await q(`delete from model_calls where user_id = $1`, [USER]);
  await pool.end();
}
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
