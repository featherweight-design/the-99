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
//   6. THE ALL-DECKS CART (cart PR 5): one write for several decks, sourced `shopping:cart`. The
//      chooser's pick lands as the card's reservation in the same transaction, a brew included, and
//      the receipt reads every deck from its own vantage. A refused pick, a deck that dropped the
//      card and a deck that is not the player's each refuse the whole press with nothing written.
//      The cart's undo leaves out every deck the line listed, and only for a `shopping:cart` entry.
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
import { cartReceiptFacts, cartSource, receiptFacts } from "../src/lib/decks/mark-bought";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
const USER = `probe-mark-bought-${Date.now()}`;
const OTHER = `${USER}-other`;
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
    { id: randomUUID(), source: `shopping:${deckId}`, receipt: { oracleId, deckIds: [deckId] } },
  );

const factsOf = (r: ChangeResult, deckId: string) => {
  if (r.status !== "applied" || !r.receipt) throw new Error(`expected an applied receipt, got ${r.status}`);
  return receiptFacts(r.receipt.before, r.receipt.after, r.receipt.afterFromDecks[deckId] ?? null, deckId);
};

async function main() {
  const { branch } = await one<{ branch: string | null }>(
    "select current_setting('neon.branch_id', true) as branch",
  );
  if (!branch || branch === PRODUCTION || branch === STAGING) {
    throw new Error(`refusing branch ${branch ?? "(unknown)"}; point DATABASE_URL at local-dev or a scratch branch`);
  }
  const picked = (await pool.query(
    "select oracle_id, name from cards where type_line not like '%Basic%' order by oracle_id limit 7",
  )).rows as { oracle_id: string; name: string }[];
  if (picked.length < 7) throw new Error("the catalog holds fewer than seven cards");
  const [A, B, C, CMD1, CMD2, D, E] = picked.map((p) => p.oracle_id);
  console.log(`branch ${branch} · fixture ${USER}`);

  const deck = async (name: string, commander: string, cards: string[], commit: boolean, owner = USER) => {
    const { id } = await one<{ id: string }>(
      "insert into decks (user_id, name, commander_oracle_id) values ($1, $2, $3) returning id",
      [owner, name, commander],
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
      { id: randomUUID(), source: `shopping:${brew}`, requireMember: { deckIds: [brew], oracleId: C } },
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

    // ---- 6. The all-decks cart ---------------------------------------------------------------
    const cartSenior = await deck("probe cart senior", CMD1, [D], true);
    const cartJunior = await deck("probe cart junior", CMD2, [D], true);
    const cartBrew = await deck("probe cart brew", CMD1, [D], false);
    const notTheirs = await deck("probe cart stranger", CMD1, [D], false, OTHER);
    const heldD = async () => Number((await one<{ q: number } | null>(
      "select coalesce(sum(quantity), 0)::int as q from collection_items where user_id = $1 and oracle_id = $2", [USER, D],
    ))?.q ?? 0);
    const reservedFor = async () => ((await pool.query(
      "select deck_id from card_assignments where user_id = $1 and oracle_id = $2", [USER, D],
    )).rows as { deck_id: string }[]).map((r) => r.deck_id);
    const buyCart = (deckIds: string[], quantity: number, pick: string | null, id = randomUUID()) => heldD().then((expected) =>
      applyCollectionChange(
        USER,
        { kind: "edit", rows: [{ oracleId: D, setCode: "prb", collectorNumber: "9", finish: "nonfoil", quantity: expected + quantity, expected, condition: null }] },
        {
          id, source: cartSource(deckIds), receipt: { oracleId: D, deckIds: [], owesFor: deckIds }, requireMember: { deckIds, oracleId: D },
          ...(pick ? { assign: { oracleId: D, deckId: pick } } : {}),
        },
      ));
    const lineDecks = [cartSenior, cartJunior, cartBrew];

    const picked1 = await buyCart(lineDecks, 1, cartBrew);
    const facts = picked1.status === "applied" && picked1.receipt
      ? cartReceiptFacts(picked1.receipt.before, picked1.receipt.after, lineDecks, new Map(Object.entries(picked1.receipt.owes ?? {}))) : null;
    check("one copy for three decks, picked for the brew, lands as the brew's reservation",
      picked1.status === "applied" && JSON.stringify(await reservedFor()) === JSON.stringify([cartBrew]),
      `${JSON.stringify(picked1).slice(0, 120)}; reserved ${JSON.stringify(await reservedFor())}`);
    check("and the receipt covers the brew and leaves both committed decks one short",
      facts !== null && facts.covered.map((d) => d.deckId).join() === cartBrew
        && facts.still.map((d) => `${d.deckId}:${d.need}`).sort().join() === [`${cartSenior}:1`, `${cartJunior}:1`].sort().join(),
      JSON.stringify(facts));

    // A pick's reservation never reads as already made: one E, held by a senior deck off the line.
    // One more bought for {P, Q} with P picked goes to P, and the senior deck kept its copy all
    // along, so the receipt must not name it as covered.
    const offSenior = await deck("probe cart off-line senior", CMD1, [E], true);
    const lineP = await deck("probe cart P", CMD2, [E], true);
    const lineQ = await deck("probe cart Q", CMD1, [E], false);
    await applyCollectionChange(
      USER,
      { kind: "edit", rows: [{ oracleId: E, setCode: "prb", collectorNumber: "8", finish: "nonfoil", quantity: 1, expected: 0, condition: null }] },
      { id: randomUUID() },
    );
    const pq = [lineP, lineQ];
    const pickedP = await applyCollectionChange(
      USER,
      { kind: "edit", rows: [{ oracleId: E, setCode: "prb", collectorNumber: "8", finish: "nonfoil", quantity: 2, expected: 1, condition: null }] },
      {
        id: randomUUID(), source: cartSource(pq), receipt: { oracleId: E, deckIds: [], owesFor: pq },
        requireMember: { deckIds: pq, oracleId: E }, assign: { oracleId: E, deckId: lineP },
      },
    );
    const pFacts = pickedP.status === "applied" && pickedP.receipt
      ? cartReceiptFacts(pickedP.receipt.before, pickedP.receipt.after, pq, new Map(Object.entries(pickedP.receipt.owes ?? {}))) : null;
    check("a pick's receipt never names a deck off the line that held its copy all along",
      pFacts !== null && !pFacts.covered.some((d) => d.deckId === offSenior) && pFacts.covered.some((d) => d.deckId === lineP),
      JSON.stringify(pFacts));

    // A pick whose deck already holds the reservation still needs supply to grant it. P keeps its
    // reservation on E while the collection drops to nothing and two committed decks take E as
    // their commander: one copy bought for P then has nothing reservable left, so the pick refuses
    // and the purchase with it, rather than reporting a copy P will never get.
    await applyCollectionChange(
      USER,
      { kind: "edit", rows: [{ oracleId: E, setCode: "prb", collectorNumber: "8", finish: "nonfoil", quantity: 0, expected: 2, condition: null }] },
      { id: randomUUID(), confirmShort: undefined },
    ).then(async (r) => (r.status === "wouldShort"
      ? applyCollectionChange(
        USER,
        { kind: "edit", rows: [{ oracleId: E, setCode: "prb", collectorNumber: "8", finish: "nonfoil", quantity: 0, expected: 2, condition: null }] },
        { id: randomUUID(), confirmShort: r.decks },
      )
      : r));
    await deck("probe cart E commander 1", E, [], true);
    await deck("probe cart E commander 2", E, [], true);
    const ungrantable = await applyCollectionChange(
      USER,
      { kind: "edit", rows: [{ oracleId: E, setCode: "prb", collectorNumber: "8", finish: "nonfoil", quantity: 1, expected: 0, condition: null }] },
      {
        id: randomUUID(), source: cartSource([lineP]), receipt: { oracleId: E, deckIds: [] },
        requireMember: { deckIds: [lineP], oracleId: E }, assign: { oracleId: E, deckId: lineP },
      },
    );
    const heldE = Number((await one<{ q: number } | null>(
      "select coalesce(sum(quantity), 0)::int as q from collection_items where user_id = $1 and oracle_id = $2", [USER, E],
    ))?.q ?? 0);
    check("a pick its deck already holds still refuses when nothing is reservable, and nothing is written",
      ungrantable.status === "assignRefused" && ungrantable.reason === "no-supply-left" && heldE === 0,
      `${JSON.stringify(ungrantable).slice(0, 100)}; count ${heldE}`);

    // Made only now: a committed deck with D as its commander takes a copy no pick can give.
    const cartCommander = await deck("probe cart commander", D, [], true);
    const before = await heldD();
    const refusedPick = await buyCart([cartCommander, cartSenior], 1, cartCommander);
    check("a pick the deck cannot take refuses the whole press, nothing written",
      refusedPick.status === "assignRefused" && refusedPick.reason === "target-is-commander" && await heldD() === before,
      `${JSON.stringify(refusedPick)}; count ${before} -> ${await heldD()}`);

    const dropped = await buyCart([cartSenior, brew], 1, null);
    check("a line deck that no longer holds the card refuses, nothing written",
      dropped.status === "notInDeck" && await heldD() === before, `${dropped.status}; count ${await heldD()}`);
    const stranger = await buyCart([cartSenior, notTheirs], 1, null);
    check("a deck that is not the player's refuses, nothing written",
      stranger.status === "notInDeck" && await heldD() === before, `${stranger.status}; count ${await heldD()}`);

    // Three more for the committed decks: every claim on D is met. Reverting this purchase leaves
    // one copy, so committed decks go short again: a line deck, and the commander deck, which was
    // never on the line.
    const cartBought = randomUUID();
    await buyCart([cartSenior, cartJunior], 3, null, cartBought);
    const cartPreview = async (ignore: { ignoreDeckId?: string; ignoreDeckIds?: string[] }) => {
      const r = await applyCollectionChange(USER, { kind: "revert", entryId: cartBought, ...ignore }, { id: randomUUID(), dryRun: true });
      return r.status === "preview" ? r.decks.map((d) => d.deckId).sort() : [`(${r.status})`];
    };
    const cartAll = await cartPreview({});
    check("a revert of a cart purchase from History warns a deck the line listed",
      cartAll.includes(cartSenior) || cartAll.includes(cartJunior), JSON.stringify(cartAll));
    // The commander deck is named too, and was never on the line: the entry did not record it, so
    // naming it exempts nothing.
    const cartToast = await cartPreview({ ignoreDeckIds: [cartSenior, cartJunior, cartCommander] });
    // The commander deck was never on the line, so the undo still warns it if the revert shorts it.
    check("the cart's undo leaves out every deck the line listed, and only those",
      !cartToast.includes(cartSenior) && !cartToast.includes(cartJunior)
        && JSON.stringify(cartToast) === JSON.stringify(cartAll.filter((d) => d !== cartSenior && d !== cartJunior)),
      `${JSON.stringify(cartToast)}; commander deck ${cartCommander}`);
    const oneDeck = await cartPreview({ ignoreDeckId: cartSenior });
    check("a single deck's exemption does nothing for a cart entry",
      JSON.stringify(oneDeck) === JSON.stringify(cartAll), JSON.stringify(oneDeck));
    const deckEntry = await applyCollectionChange(
      USER, { kind: "revert", entryId: bought, ignoreDeckIds: [junior] }, { id: randomUUID(), dryRun: true },
    );
    const deckEntryDecks = deckEntry.status === "preview" ? deckEntry.decks.map((d) => d.deckId).sort() : [`(${deckEntry.status})`];
    check("and the cart's exemption does nothing for a deck's own entry",
      JSON.stringify(deckEntryDecks) === JSON.stringify(all), JSON.stringify(deckEntryDecks));
  } finally {
    await pool.query("delete from collection_history where user_id = $1", [USER]);
    await pool.query("delete from collection_items where user_id = $1", [USER]);
    await pool.query("delete from commander_scores where user_id = $1", [USER]);
    await pool.query("delete from card_assignments where user_id = $1", [USER]);
    await pool.query("delete from decks where user_id = any($1)", [[USER, OTHER]]);
    await pool.query("delete from user_data_stamps where user_id = any($1)", [[USER, OTHER]]);
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
