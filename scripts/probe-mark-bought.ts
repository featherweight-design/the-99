// probe:mark-bought — I got it's receipt and undo against a real Postgres (plan
// `2026-10-10-i-got-it.md`, PR 1). Every claim here is about availability read under the write's
// lock, or about the deck check a revert runs, which no unit test can reach. It proves:
//
//   1. SENIORITY DECIDES WHO TAKES THE COPY. Two committed decks want a card nobody owns; a copy
//      bought for the JUNIOR deck goes to the senior one, the receipt names it, and the junior deck
//      still needs one. Bought for the SENIOR deck, the receipt names nobody.
//   2. A DRAFT DECK's need is read from its own vantage: bought for a brew, it needs nothing more
//      and no committed deck is named.
//   3. TWO PURCHASES AT ONCE (two printings of one card): each receipt is its own. `before` is the
//      after snapshot less this write's copies, so a concurrent purchase never shows up in it, and
//      each receipt's `after` already counts whatever committed before it under the lock.
//   4. THE TOAST'S UNDO leaves the source deck out of the deck check, and only for that entry's own
//      deck: naming another deck changes nothing.
//   5. MEMBERSHIP IS CHECKED INSIDE THE WRITE: a card removed from the deck is refused `notInDeck`
//      and nothing is written.
//
// It writes under a per-run user_id and deletes everything that id created in a `finally`.
// Refused on production and staging; point DATABASE_URL at local-dev or a scratch branch.
//
// Run: `pnpm probe:mark-bought`
import { requireEnv } from "./lib/env.mjs";
import { randomUUID } from "node:crypto";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { applyCollectionChange, type ChangeResult } from "../src/lib/collection/write";
import { commitVersion } from "../src/lib/decks/versions";
import { receiptFacts } from "../src/lib/decks/mark-bought";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
const USER = `probe-mark-bought-${Date.now()}`;
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

const one = async <T>(text: string, params: unknown[] = []) =>
  (await pool.query(text, params)).rows[0] as T;

/** A purchase as `markBought` writes it, minus the auth and catalog checks the action makes first. */
const buy = (deckId: string, oracleId: string, collectorNumber: string, expected: number, quantity: number) =>
  applyCollectionChange(
    USER,
    {
      kind: "edit",
      rows: [{ oracleId, setCode: "prb", collectorNumber, finish: "nonfoil", quantity: expected + quantity, expected, condition: null }],
    },
    { id: randomUUID(), source: `shopping:${deckId}`, receipt: { oracleId, deckId } },
  );

const factsOf = (r: ChangeResult, deckId: string) => {
  if (r.status !== "applied" || !r.receipt) throw new Error(`expected an applied receipt, got ${r.status}`);
  return receiptFacts(r.receipt.before, r.receipt.after, r.receipt.afterFromDeck, deckId);
};

async function main() {
  const { branch } = await one<{ branch: string | null }>(
    "select current_setting('neon.branch_id', true) as branch",
  );
  if (!branch || branch === PRODUCTION || branch === STAGING) {
    throw new Error(`refusing branch ${branch ?? "(unknown)"}; point DATABASE_URL at local-dev or a scratch branch`);
  }
  const picked = (await pool.query(
    "select oracle_id, name from cards where type_line not like '%Basic%' order by oracle_id limit 5",
  )).rows as { oracle_id: string; name: string }[];
  if (picked.length < 5) throw new Error("the catalog holds fewer than five cards");
  const [A, B, C, CMD1, CMD2] = picked.map((p) => p.oracle_id);
  console.log(`branch ${branch} · fixture ${USER}`);

  const deck = async (name: string, commander: string, cards: string[], commit: boolean) => {
    const { id } = await one<{ id: string }>(
      "insert into decks (user_id, name, commander_oracle_id) values ($1, $2, $3) returning id",
      [USER, name, commander],
    );
    for (const c of cards) await pool.query("insert into deck_cards (deck_id, oracle_id, quantity) values ($1, $2, 1)", [id, c]);
    if (commit) await commitVersion(id, null);
    return id;
  };

  try {
    // Committed in this order, so `senior` holds the earlier claim.
    const senior = await deck("probe senior", CMD1, [A, B], true);
    const junior = await deck("probe junior", CMD2, [A, B], true);
    const brew = await deck("probe brew", CMD1, [C], false);

    // ---- 1. Seniority ---------------------------------------------------------------------
    const forJunior = factsOf(await buy(junior, A, "1", 0, 1), junior);
    check("a copy bought for the junior deck goes to the senior one",
      forJunior.tookCopy.length === 1 && forJunior.tookCopy[0].deckId === senior && forJunior.tookCopy[0].copies === 1,
      JSON.stringify(forJunior.tookCopy));
    check("and the junior deck still needs one", forJunior.stillNeeds === 1, `stillNeeds ${forJunior.stillNeeds}`);

    const forSenior = factsOf(await buy(senior, B, "1", 0, 1), senior);
    check("a copy bought for the senior deck names nobody else",
      forSenior.tookCopy.length === 0 && forSenior.stillNeeds === 0, JSON.stringify(forSenior));

    // ---- 2. A draft deck --------------------------------------------------------------------
    const forBrew = factsOf(await buy(brew, C, "1", 0, 1), brew);
    check("a brew reads its own need: none left, nobody named",
      forBrew.tookCopy.length === 0 && forBrew.stillNeeds === 0, JSON.stringify(forBrew));

    // ---- 3. Two purchases at once, two printings of one card ---------------------------------
    const [p, q] = await Promise.all([buy(junior, A, "2", 0, 1), buy(junior, A, "3", 0, 2)]);
    const delta = (r: ChangeResult) =>
      r.status === "applied" && r.receipt ? (r.receipt.after?.owned ?? 0) - (r.receipt.before?.owned ?? 0) : NaN;
    const owns = (r: ChangeResult) => (r.status === "applied" ? r.receipt?.after?.owned ?? NaN : NaN);
    check("each concurrent receipt counts exactly its own copies, and the later one sees the earlier",
      delta(p) === 1 && delta(q) === 2 && Math.max(owns(p), owns(q)) - Math.min(owns(p), owns(q)) === (owns(p) > owns(q) ? 1 : 2),
      `deltas ${delta(p)}, ${delta(q)}`);

    // ---- 5. Membership, checked inside the write ---------------------------------------------
    await pool.query("delete from deck_cards where deck_id = $1 and oracle_id = $2", [brew, C]);
    const owned = Number((await one<{ q: number } | undefined>(
      "select quantity as q from collection_items where user_id = $1 and oracle_id = $2", [USER, C],
    ))?.q ?? 0);
    const gone = await applyCollectionChange(
      USER,
      { kind: "edit", rows: [{ oracleId: C, setCode: "prb", collectorNumber: "1", finish: "nonfoil", quantity: owned + 1, expected: owned, condition: null }] },
      { id: randomUUID(), source: `shopping:${brew}`, requireMember: { deckId: brew, oracleId: C } },
    );
    const after = Number((await one<{ q: number } | undefined>(
      "select quantity as q from collection_items where user_id = $1 and oracle_id = $2", [USER, C],
    ))?.q ?? 0);
    check("a card the deck no longer holds is refused inside the write, and nothing moves",
      gone.status === "notInDeck" && after === owned, `${gone.status}; count ${owned} -> ${after}`);

    // ---- 4. The undo's exclusion -------------------------------------------------------------
    // B: one copy, held by the senior deck. One more bought for the junior (1 -> 2) covers both, so
    // reverting that purchase leaves the junior short again.
    const bought = randomUUID();
    await applyCollectionChange(
      USER,
      { kind: "edit", rows: [{ oracleId: B, setCode: "prb", collectorNumber: "1", finish: "nonfoil", quantity: 2, expected: 1, condition: null }] },
      { id: bought, source: `shopping:${junior}` },
    );
    const preview = async (ignoreDeckId?: string) => {
      const r = await applyCollectionChange(USER, { kind: "revert", entryId: bought, ignoreDeckId }, { id: randomUUID(), dryRun: true });
      return r.status === "preview" ? r.decks.map((d) => d.deckId).sort() : [`(${r.status})`];
    };
    const all = await preview();
    check("a revert from History warns the source deck", all.includes(junior), JSON.stringify(all));
    const fromToast = await preview(junior);
    check("the toast's undo leaves the source deck out", !fromToast.includes(junior), JSON.stringify(fromToast));
    const forged = await preview(senior);
    check("naming another deck excludes nothing", JSON.stringify(forged) === JSON.stringify(all), JSON.stringify(forged));
  } finally {
    await pool.query("delete from collection_history where user_id = $1", [USER]);
    await pool.query("delete from collection_items where user_id = $1", [USER]);
    await pool.query("delete from commander_scores where user_id = $1", [USER]);
    await pool.query("delete from decks where user_id = $1", [USER]);
    await pool.query("delete from user_data_stamps where user_id = $1", [USER]);
  }
  console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
