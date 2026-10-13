// probe:swap-take — the swap tools' writes against a real Postgres (sub-project 4, PR 2), by calling
// the real `takeStandIn`, `undoSwap` and `setShoppingLimit`.
//
// WHY A DATABASE. A take is a transaction over `deck_cards`, `deck_proxies` and `deck_swaps`, and
// what it proves is what those tables hold afterwards: one copy out and one in, the snapshot an
// undo restores from, a refusal that writes nothing, and whether the added copy was free by the
// TAKE's own read against a real claim. Every check reads the tables back rather than trusting a
// return value.
//
// It writes a fixture under a per-run `user_id` and deletes it in a `finally`. Point it at
// `local-dev` or a scratch branch, never production.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import { commitVersion } from "../src/lib/decks/versions";
import { setShoppingLimit, takeStandIn, undoSwap } from "../src/lib/swaps/take";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-swap-take-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) failures += 1;
  console.log(`${a === e ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};
const rows = async <T>(text: ReturnType<typeof sql>): Promise<T[]> => (await fixture.execute(text)).rows as T[];

async function id(name: string): Promise<string> {
  const [c] = await rows<{ oracle_id: string }>(sql`select oracle_id from cards where name = ${name} and commander_legal`);
  if (!c) throw new Error(`the catalog holds no ${name}`);
  return c.oracle_id;
}

async function makeDeck(name: string, commander: string, cards: [string, number][]) {
  const [deck] = await rows<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id) values (${USER}, ${name}, ${commander}::uuid) returning id`);
  for (const [oracleId, quantity] of cards) {
    await fixture.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}::uuid, ${oracleId}::uuid, ${quantity})`);
  }
  return deck.id;
}

/** The two rows a swap moves, and whether the cut carries a proxy mark. */
async function state(deckId: string, cut: string, add: string) {
  const r = await rows<{ oracle_id: string; quantity: number; auto: boolean }>(sql`
    select oracle_id, quantity, auto from deck_cards where deck_id = ${deckId}::uuid and oracle_id in (${cut}::uuid, ${add}::uuid)`);
  const [proxy] = await rows(sql`select 1 from deck_proxies where deck_id = ${deckId}::uuid and oracle_id = ${cut}::uuid`);
  const q = (o: string) => r.find((x) => x.oracle_id === o) ?? null;
  return {
    cut: q(cut) ? [q(cut)!.quantity, q(cut)!.auto] : null,
    add: q(add) ? [q(add)!.quantity, q(add)!.auto] : null,
    proxied: proxy !== undefined,
  };
}

const swapCount = async (deckId: string) =>
  (await rows<{ n: number }>(sql`select count(*)::int as n from deck_swaps where deck_id = ${deckId}::uuid`))[0].n;

async function main() {
  const [commander] = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where commander_legal and type_line ~* 'legendary creature'
      and color_identity @> array['R','G','W'] and color_identity <@ array['R','G','W'] order by name limit 1`);
  const plateau = await id("Plateau");
  const foundry = await id("Sacred Foundry");
  const tower = await id("Command Tower");
  const cradle = await id("Gaea's Cradle");
  const forest = await id("Forest");
  const vault = await id("Mana Vault");
  const sol = await id("Sol Ring");

  // 1. A bought take: Sacred Foundry, owned by no one, in place of a proxied Plateau.
  const deck = await makeDeck("probe swap take", commander.oracle_id, [[plateau, 1], [cradle, 1], [forest, 5], [vault, 1], [sol, 1]]);
  await fixture.execute(sql`insert into deck_proxies (deck_id, oracle_id) values (${deck}::uuid, ${plateau}::uuid)`);
  const before = await state(deck, plateau, foundry);
  const bought = await takeStandIn(deck, USER, plateau, foundry, process.env);
  check("take: bought, one copy out and one in", { ok: bought.ok, free: bought.ok && bought.addWasFree, left: bought.ok && bought.cutLeft },
    { ok: true, free: false, left: 0 });
  check("take: the deck after", await state(deck, plateau, foundry), { cut: null, add: [1, false], proxied: false });
  check("take: one deck_swaps row, not undone",
    (await rows<{ undone: boolean }>(sql`select undone_at is not null as undone from deck_swaps where deck_id = ${deck}::uuid`)).map((r) => r.undone),
    [false]);

  // 2. Undo swap puts back exactly what was there, proxy mark included, once.
  if (bought.ok) {
    // Another reader first, while the swap still stands: after the owner's undo it would read null
    // for being undone, whoever asked, and prove nothing about ownership.
    check("undo: another reader cannot", await undoSwap(bought.swapId, "someone-else", process.env), null);
    check("undo: returns the deck", await undoSwap(bought.swapId, USER, process.env), deck);
    check("undo: the deck exactly as before", await state(deck, plateau, foundry), before);
    check("undo: a second press does nothing", await undoSwap(bought.swapId, USER, process.env), null);
  }

  // 2b. An undone swap's id stays spent, even when the same take is made again: without that, the
  //     OLD id would undo the NEW take and leave the new swap row claiming it still stands.
  if (bought.ok) {
    const again = await takeStandIn(deck, USER, plateau, foundry, process.env);
    check("undo: an old swap id cannot undo a new take of the same pair", await undoSwap(bought.swapId, USER, process.env), null);
    if (again.ok) check("undo: the new take's own id still can", await undoSwap(again.swapId, USER, process.env), deck);
  }

  // 3. A free take: the only Command Tower is owned and spoken for by no one.
  await fixture.execute(sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${USER}, ${tower}::uuid, 1, 'probe')`);
  const free = await takeStandIn(deck, USER, plateau, tower, process.env);
  check("take: a spare copy is free, by the take's own read", free.ok && free.addWasFree, true);
  if (free.ok) await undoSwap(free.swapId, USER, process.env);

  // 4. Free by the TAKE's read, not the list's: a committed deck holding that Command Tower makes
  //    the same take a buy.
  const holder = await makeDeck("probe swap holder", commander.oracle_id, [[tower, 1]]);
  await commitVersion(holder, null, undefined, undefined, process.env);
  const claimed = await takeStandIn(deck, USER, plateau, tower, process.env);
  check("take: a copy a committed deck holds is not free", claimed.ok && claimed.addWasFree, false);
  if (claimed.ok) await undoSwap(claimed.swapId, USER, process.env);

  // 5. A basic already in the draft gains a copy, and undo takes it back off.
  const forestIn = await takeStandIn(deck, USER, cradle, forest, process.env);
  check("take: a basic the deck holds gains a copy", await state(deck, cradle, forest), { cut: null, add: [6, false], proxied: false });
  check("take: a basic is free", forestIn.ok && forestIn.addWasFree, true);
  if (forestIn.ok) await undoSwap(forestIn.swapId, USER, process.env);
  check("undo: the basic back to five", await state(deck, cradle, forest), { cut: [1, false], add: [5, false], proxied: false });

  // 6. Refusals write nothing, and say why.
  const swapsBefore = await swapCount(deck);
  check("refused: a non-basic the deck already holds", await takeStandIn(deck, USER, vault, sol, process.env), { ok: false, reason: "addHeld" });
  check("refused: a basic in place of itself", await takeStandIn(deck, USER, forest, forest, process.env), { ok: false, reason: "addHeld" });
  check("refused: that basic untouched", await state(deck, forest, forest), { cut: [5, false], add: [5, false], proxied: false });
  await fixture.execute(sql`delete from deck_cards where deck_id = ${deck}::uuid and oracle_id = ${vault}::uuid`);
  check("refused: the cut left in another tab", await takeStandIn(deck, USER, vault, tower, process.env), { ok: false, reason: "cutGone" });
  check("refused: another reader's deck", await takeStandIn(deck, "someone-else", plateau, foundry, process.env), { ok: false, reason: "notFound" });
  check("refused: no swap row written by any of them", await swapCount(deck), swapsBefore);

  // 7. Undo over a deck that moved since writes nothing.
  const moved = await takeStandIn(deck, USER, plateau, foundry, process.env);
  await fixture.execute(sql`delete from deck_cards where deck_id = ${deck}::uuid and oracle_id = ${foundry}::uuid`);
  check("undo: refused once the player edited the add", moved.ok ? await undoSwap(moved.swapId, USER, process.env) : "no take", null);
  check("undo: that refusal left the deck as the player made it", await state(deck, plateau, foundry), { cut: null, add: null, proxied: false });

  // 8. The limit: whole dollars of at least 1, or the default.
  check("limit: $25", await setShoppingLimit(deck, USER, 2500), true);
  check("limit: stored", (await rows<{ c: number | null }>(sql`select shopping_limit_cents as c from decks where id = ${deck}::uuid`))[0].c, 2500);
  check("limit: not a whole dollar", await setShoppingLimit(deck, USER, 2550), false);
  check("limit: under a dollar", await setShoppingLimit(deck, USER, 50), false);
  check("limit: another reader's deck", await setShoppingLimit(deck, "someone-else", 500), false);
  check("limit: back to the default", await setShoppingLimit(deck, USER, null), true);
  check("limit: the check constraint refuses what the function would", await fixture.execute(
    sql`update decks set shopping_limit_cents = 2550 where id = ${deck}::uuid`).then(() => "accepted", () => "refused"), "refused");
}

void (async () => {
  try {
    await main();
  } catch (e) {
    failures += 1;
    console.log(`FAIL  the run threw — ${(e as Error).message}`);
  } finally {
    await fixture.execute(sql`delete from decks where user_id = ${USER}`);
    await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
    await pool.end();
  }
  // Reported AFTER the `finally`: an exit there swallows the throw and prints a pass.
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures ? 1 : 0);
})();
