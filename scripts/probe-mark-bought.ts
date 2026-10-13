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
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

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

/** JSON with sorted keys: a jsonb column hands keys back in its own order, not the writer's. */
const canonical = (v: unknown): string => JSON.stringify(v, (_k, x) =>
  x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b))) : x);

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
    { id: randomUUID(), source: `shopping:${deckId}`, receipt: { oracleId, deckIds: [deckId] }, env: process.env },
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
    "select oracle_id, name from cards where type_line not like '%Basic%' order by oracle_id limit 8",
  )).rows as { oracle_id: string; name: string }[];
  if (picked.length < 8) throw new Error("the catalog holds fewer than eight cards");
  const [A, B, C, CMD1, CMD2, D, E, F] = picked.map((p) => p.oracle_id);
  console.log(`branch ${branch} · fixture ${USER}`);

  const deck = async (name: string, commander: string, cards: string[], commit: boolean, owner = USER) => {
    const { id } = await one<{ id: string }>(
      "insert into decks (user_id, name, commander_oracle_id) values ($1, $2, $3) returning id",
      [owner, name, commander],
    );
    for (const c of cards) await pool.query("insert into deck_cards (deck_id, oracle_id, quantity) values ($1, $2, 1)", [id, c]);
    if (commit) await commitVersion(id, null, undefined, undefined, process.env);
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
      { id: randomUUID(), source: `shopping:${brew}`, requireMember: { deckIds: [brew], oracleId: C }, env: process.env },
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
      { id: bought, source: `shopping:${junior}`, env: process.env },
    );
    const preview = async (ignoreDeckId?: string) => {
      const r = await applyCollectionChange(USER, { kind: "revert", entryId: bought, ignoreDeckId }, { id: randomUUID(), dryRun: true, env: process.env });
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
          env: process.env,
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
      { id: randomUUID(), env: process.env },
    );
    const pq = [lineP, lineQ];
    const pickedP = await applyCollectionChange(
      USER,
      { kind: "edit", rows: [{ oracleId: E, setCode: "prb", collectorNumber: "8", finish: "nonfoil", quantity: 2, expected: 1, condition: null }] },
      {
        id: randomUUID(), source: cartSource(pq), receipt: { oracleId: E, deckIds: [], owesFor: pq },
        requireMember: { deckIds: pq, oracleId: E }, assign: { oracleId: E, deckId: lineP },
        env: process.env,
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
      { id: randomUUID(), confirmShort: undefined, env: process.env },
    ).then(async (r) => (r.status === "wouldShort"
      ? applyCollectionChange(
        USER,
        { kind: "edit", rows: [{ oracleId: E, setCode: "prb", collectorNumber: "8", finish: "nonfoil", quantity: 0, expected: 2, condition: null }] },
        { id: randomUUID(), confirmShort: r.decks, env: process.env },
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
        env: process.env,
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
      const r = await applyCollectionChange(USER, { kind: "revert", entryId: cartBought, ...ignore }, { id: randomUUID(), dryRun: true, env: process.env });
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
      USER, { kind: "revert", entryId: bought, ignoreDeckIds: [junior] }, { id: randomUUID(), dryRun: true, env: process.env },
    );
    const deckEntryDecks = deckEntry.status === "preview" ? deckEntry.decks.map((d) => d.deckId).sort() : [`(${deckEntry.status})`];
    check("and the cart's exemption does nothing for a deck's own entry",
      JSON.stringify(deckEntryDecks) === JSON.stringify(all), JSON.stringify(deckEntryDecks));

    // ---- Undo drops only a pick the press made (added copy PR 2) ---------------------------------
    // Two brews list F, so a revert shorts no committed deck and no confirmation intervenes.
    const brewX = await deck("probe undo X", CMD1, [F], false);
    const brewY = await deck("probe undo Y", CMD2, [F], false);
    const xy = [brewX, brewY];
    const reservedF = async (deckId: string) => Number((await one<{ n: number }>(
      "select count(*)::int as n from card_assignments where user_id = $1 and oracle_id = $2 and deck_id = $3", [USER, F, deckId],
    )).n);
    const buyF = (expected: number, entryId: string) => applyCollectionChange(
      USER,
      { kind: "edit", rows: [{ oracleId: F, setCode: "prb", collectorNumber: "9", finish: "nonfoil", quantity: expected + 1, expected, condition: null }] },
      { id: entryId, source: cartSource(xy), receipt: { oracleId: F, deckIds: [], owesFor: xy }, requireMember: { deckIds: xy, oracleId: F }, assign: { oracleId: F, deckId: brewY }, env: process.env },
    );
    const e1 = randomUUID();
    const made = await buyF(0, e1);
    check("a pick on a deck with no reservation reports that the press created it",
      made.status === "applied" && made.assigned?.created === true && await reservedF(brewY) === 1,
      `${made.status}; created ${made.status === "applied" ? JSON.stringify(made.assigned) : "-"}; reserved ${await reservedF(brewY)}`);
    const undone = await applyCollectionChange(USER, { kind: "revert", entryId: e1, undoPlacement: { oracleId: F, deckId: brewY } }, { id: randomUUID(), env: process.env });
    check("Undo with that pick drops the reservation in the same revert",
      undone.status === "applied" && await reservedF(brewY) === 0, `${undone.status}; reserved ${await reservedF(brewY)}`);

    // The same deck picked again since (another tab cleared the press's pick and made a new one):
    // the undo names the press's row by its instant, so the newer pick survives.
    const e1b = randomUUID();
    const madeAgain = await buyF(0, e1b);
    await pool.query("delete from card_assignments where user_id = $1 and oracle_id = $2", [USER, F]);
    await pool.query("insert into card_assignments (user_id, oracle_id, deck_id, created_at) values ($1, $2, $3, now() + interval '1 second')", [USER, F, brewY]);
    const undoneB = await applyCollectionChange(USER, { kind: "revert", entryId: e1b, undoPlacement: { oracleId: F, deckId: brewY } }, { id: randomUUID(), env: process.env });
    check("Undo leaves a newer pick of the same deck, made since the press",
      madeAgain.status === "applied" && undoneB.status === "applied" && await reservedF(brewY) === 1,
      `${madeAgain.status}/${undoneB.status}; reserved ${await reservedF(brewY)}`);
    await pool.query("delete from card_assignments where user_id = $1 and oracle_id = $2", [USER, F]);

    await pool.query("insert into card_assignments (user_id, oracle_id, deck_id) values ($1, $2, $3)", [USER, F, brewY]);
    const e2 = randomUUID();
    const kept = await buyF(0, e2);
    check("a pick on a deck that already holds the reservation reports it did not create one",
      kept.status === "applied" && kept.assigned?.created === false,
      `${kept.status}; created ${kept.status === "applied" ? JSON.stringify(kept.assigned) : "-"}`);
    // The cart sends no undoPlacement for it, so the older reservation survives the undo.
    const undone2 = await applyCollectionChange(USER, { kind: "revert", entryId: e2 }, { id: randomUUID(), env: process.env });
    check("and Undo without a placement leaves the reservation that predates the purchase",
      undone2.status === "applied" && await reservedF(brewY) === 1, `${undone2.status}; reserved ${await reservedF(brewY)}`);

    // ---- A pick that MOVES a reservation: Undo puts the displaced one back, as it stood --------
    await pool.query("delete from card_assignments where user_id = $1 and oracle_id = $2", [USER, F]);
    await pool.query(
      "insert into card_assignments (user_id, oracle_id, deck_id, created_at) values ($1, $2, $3, '2026-01-02 03:04:05.123456')",
      [USER, F, brewX],
    );
    const stampX = async () => (await one<{ at: string | null }>(
      "select max(created_at)::text as at from card_assignments where user_id = $1 and oracle_id = $2 and deck_id = $3", [USER, F, brewX],
    )).at;
    const heldNow = async () => Number((await one<{ n: number }>(
      "select coalesce(sum(quantity), 0)::int as n from collection_items where user_id = $1 and oracle_id = $2", [USER, F],
    )).n);
    const e3 = randomUUID();
    const moved = await buyF(await heldNow(), e3);
    const movedPlaced = moved.status === "applied" ? moved.entry.rows.find((r) => r.oracleId === F)?.placed : undefined;
    check("a pick that moves another deck's reservation reports and records the one it displaced",
      moved.status === "applied" && moved.assigned?.created === true && moved.assigned.displaced?.deckId === brewX
        && movedPlaced?.deckId === brewY && movedPlaced.displaced?.deckId === brewX
        && await reservedF(brewX) === 0 && await reservedF(brewY) === 1,
      `${moved.status}; ${moved.status === "applied" ? JSON.stringify(moved.assigned) : "-"}; placed ${JSON.stringify(movedPlaced)}`);
    const retried = await buyF(0, e3);
    const retriedPlaced = retried.status === "alreadyApplied" ? retried.entry.rows.find((r) => r.oracleId === F)?.placed : undefined;
    check("a retry of that press reads the same record off the entry",
      retried.status === "alreadyApplied" && canonical(retriedPlaced) === canonical(movedPlaced),
      `${retried.status}; placed ${JSON.stringify(retriedPlaced)}`);
    const forgedRestore = await applyCollectionChange(
      USER, { kind: "revert", entryId: e3, undoPlacement: { oracleId: F, deckId: brewY, restore: { deckId: brewY, copies: 1 } } },
      { id: randomUUID(), dryRun: true, env: process.env },
    );
    check("a restore the entry did not record puts nothing back (dry run)",
      forgedRestore.status === "preview" && await reservedF(brewX) === 0, `${forgedRestore.status}; X reserved ${await reservedF(brewX)}`);
    const undone3 = await applyCollectionChange(
      USER, { kind: "revert", entryId: e3, undoPlacement: { oracleId: F, deckId: brewY, restore: { deckId: brewX, copies: 1 } } },
      { id: randomUUID(), env: process.env },
    );
    check("Undo drops the moved pick and puts the displaced reservation back, at its own instant",
      undone3.status === "applied" && await reservedF(brewY) === 0 && await reservedF(brewX) === 1
        && await stampX() === "2026-01-02 03:04:05.123456",
      `${undone3.status}; Y ${await reservedF(brewY)}; X ${await reservedF(brewX)} at ${await stampX()}`);

    // ---- An older reservation the one-per-card rule predates does not block the restore --------
    const brewZ = await deck("probe undo Z", CMD2, [F], false);
    await pool.query("delete from card_assignments where user_id = $1 and oracle_id = $2", [USER, F]);
    await pool.query(
      "insert into card_assignments (user_id, oracle_id, deck_id, created_at) values ($1, $2, $3, '2026-01-02 03:04:05.123456'), ($1, $2, $4, '2026-01-03 03:04:05')",
      [USER, F, brewX, brewZ],
    );
    const e4 = randomUUID();
    const moved4 = await buyF(await heldNow(), e4);
    const undone4 = await applyCollectionChange(
      USER, { kind: "revert", entryId: e4, undoPlacement: { oracleId: F, deckId: brewY, restore: { deckId: brewX, copies: 1 } } },
      { id: randomUUID(), env: process.env },
    );
    check("Undo puts the moved reservation back beside an older one on another deck",
      moved4.status === "applied" && undone4.status === "applied"
        && await reservedF(brewX) === 1 && await reservedF(brewZ) === 1 && await reservedF(brewY) === 0,
      `${moved4.status}/${undone4.status}; X ${await reservedF(brewX)} Z ${await reservedF(brewZ)} Y ${await reservedF(brewY)}`);

    // ---- A deck that stopped claiming the card since the press gets no reservation back ---------
    await pool.query("delete from card_assignments where user_id = $1 and oracle_id = $2", [USER, F]);
    await pool.query(
      "insert into card_assignments (user_id, oracle_id, deck_id, created_at) values ($1, $2, $3, '2026-01-02 03:04:05.123456')",
      [USER, F, brewX],
    );
    const e5 = randomUUID();
    const moved5 = await buyF(await heldNow(), e5);
    // X prints the card now: a proxied card is not claimed.
    await pool.query("insert into deck_proxies (deck_id, oracle_id) values ($1, $2)", [brewX, F]);
    const undone5 = await applyCollectionChange(
      USER, { kind: "revert", entryId: e5, undoPlacement: { oracleId: F, deckId: brewY, restore: { deckId: brewX, copies: 1 } } },
      { id: randomUUID(), env: process.env },
    );
    check("Undo puts nothing back on a deck that no longer claims the card",
      moved5.status === "applied" && undone5.status === "applied" && await reservedF(brewX) === 0 && await reservedF(brewY) === 0,
      `${moved5.status}/${undone5.status}; X ${await reservedF(brewX)} Y ${await reservedF(brewY)}`);
    await pool.query("delete from deck_proxies where deck_id = $1", [brewX]);
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
