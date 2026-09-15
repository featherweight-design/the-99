// Deck proxies, proved against a real Postgres by calling the real
// loadAvailability and the real loadDeckBuyRows. Both anti-joins live in raw
// SQL no unit test in this repository can reach, and they are in DIFFERENT
// queries: filtering the claim model does nothing for the buy rows, which read
// `deck_cards` directly. A probe that exercised only the first would pass while
// the player is still billed for a card they printed.
//
// It writes a fixture under a per-run user_id and deletes it in a finally. No
// begin/rollback: the functions under test go through the src/db singleton,
// which is a different connection from the one this script opens.
//
// Run it against a scratch Neon branch or local dev — NEVER production.
//
// Run: `pnpm probe:proxies`
// First, and on its own line: src/db reads DATABASE_URL at module scope.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { loadAvailability, loadDeckBuyRows } from "../src/lib/decks/availability-query";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-proxy-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
};

// Three distinct ids: two legends to lead the decks, one ordinary card to fight
// over. A commander that is also the contested card would claim twice against
// one owned copy and every figure below would be wrong.
const pickCards = async () => {
  const { rows } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line ~ 'Legendary Creature' and type_line !~ '\\mBasic\\M'
    order by oracle_id limit 2
  `);
  const { rows: [subject] } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line !~ '\\mBasic\\M' and type_line !~ 'Legendary'
    order by oracle_id limit 1
  `);
  if (rows.length < 2 || !subject) throw new Error("catalog is empty — seed it first");
  return { cmdA: rows[0].oracle_id, cmdB: rows[1].oracle_id, card: subject.oracle_id };
};

async function main() {
const { cmdA, cmdB, card } = await pickCards();

const free = async (oracleId: string, deckId: string) => {
  const availability = await loadAvailability(USER, {
    oracleIds: [oracleId],
    excludeDeckId: deckId,
  });
  return availability.get(oracleId)?.free ?? null;
};

// What this deck is told to buy, in copies, for one card. The buy rows are a
// different query from the claim model and this is the only reader of it here.
const buyCopies = async (deckId: string, oracleId: string) => {
  const rows = await loadDeckBuyRows(USER, [deckId]);
  return rows.filter((r) => r.deckId === deckId && r.oracleId === oracleId)
    .reduce((n, r) => n + r.quantity, 0);
};

const proxy = (deckId: string, oracleId: string) => fixture.execute(sql`
  insert into deck_proxies (deck_id, oracle_id) values (${deckId}, ${oracleId})
`);
const unproxy = (deckId: string, oracleId: string) => fixture.execute(sql`
  delete from deck_proxies where deck_id = ${deckId} and oracle_id = ${oracleId}
`);

try {
  // ONE copy of the contested card, and one of each commander. The single copy
  // is the whole point: two sleeved decks want it and only one can have it.
  await fixture.execute(sql`
    insert into collection_items (user_id, oracle_id, quantity, set_code)
    values (${USER}, ${card}, 1, 'probe'),
           (${USER}, ${cmdA}, 1, 'probe'),
           (${USER}, ${cmdB}, 1, 'probe')
  `);
  const { rows: [holder] } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${USER}, 'Holder', ${cmdA}) returning id
  `);
  const { rows: [printer] } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${USER}, 'Printer', ${cmdB}) returning id
  `);

  const commit = async (deckId: string, cmd: string, number: number, holds: string[]) => {
    const { rows: [v] } = await fixture.execute<{ id: string; committed_at: string }>(sql`
      insert into deck_versions
        (deck_id, number, committed_at, commander_oracle_id, commander_since)
      values (${deckId}, ${number}, now(), ${cmd}, now())
      returning id, committed_at
    `);
    for (const oracleId of holds) {
      await fixture.execute(sql`
        insert into deck_version_cards (version_id, oracle_id, quantity, since)
        values (${v.id}, ${oracleId}, 1, ${v.committed_at})
      `);
    }
    return v.id;
  };

  // Both decks sleeve the card. The holder commits FIRST, so it is senior on
  // this card and the printer is the one told to buy.
  await commit(holder.id, cmdA, 1, [card]);
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values (${holder.id}, ${card}, 1)
  `);
  await commit(printer.id, cmdB, 1, [card]);
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values (${printer.id}, ${card}, 1)
  `);

  // The state before any proxy exists, and the reason the feature is wanted:
  // the junior deck is short a copy and is billed for it.
  check("before: the junior deck is short", await free(card, printer.id), -1);
  check("before: the junior deck is billed", await buyCopies(printer.id, card), 1);

  // 1. THE HEADLINE. The junior deck prints its copy. Its claim retires, so the
  //    senior deck's own page stops reporting a contested copy…
  await proxy(printer.id, card);
  check("a proxied claim releases the copy", await free(card, holder.id), 0);
  //    …and the printing deck no longer reads short, because it is asking for
  //    nothing. This is `own_claims`' anti-join rather than `all_claims`'.
  check("the printing deck is not short", await free(card, printer.id), 0);

  // 2. THE SECOND ANTI-JOIN, in a different query. Everything above could pass
  //    with `list_claims` untouched, and the player would still be billed.
  check("a proxied card leaves the buy rows", await buyCopies(printer.id, card), 0);
  check("the senior deck was never billed", await buyCopies(holder.id, card), 0);

  // 3. A PROXIED COMMANDER. Neither commander is a `deck_cards` row, so this is
  //    the arm a column on that table could not have expressed at all. The
  //    printer's commander is its own card, owned in one copy and claimed by
  //    that deck alone; proxying it frees the copy outright.
  check("before: the commander's copy is spoken for", await free(cmdB, holder.id), 0);
  await proxy(printer.id, cmdB);
  check("a proxied commander releases its copy", await free(cmdB, holder.id), 1);

  // 4. AN ORPHAN ROW IS INERT. The card leaves the deck; the proxy row stays,
  //    because no write path prunes it. It must do nothing — and when the card
  //    comes back it must NOT arrive silently already proxied.
  await fixture.execute(sql`
    delete from deck_cards where deck_id = ${printer.id} and oracle_id = ${card}
  `);
  await commit(printer.id, cmdB, 2, []);
  const { rows: orphan } = await fixture.execute<{ n: number }>(sql`
    select count(*)::int as n from deck_proxies
    where deck_id = ${printer.id} and oracle_id = ${card}
  `);
  check("the orphan row survives the removal", orphan[0].n, 1);
  //    The senior deck holds the only copy and nobody else asks for it.
  check("an orphan row claims nothing either way", await free(card, holder.id), 0);

  // 5. UNPROXYING RESTORES THE CLAIM. Put the card back in the printer's draft
  //    and drop the proxy: the two decks are contesting one copy again.
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values (${printer.id}, ${card}, 1)
  `);
  await unproxy(printer.id, card);
  check("unproxying puts the deck back in the queue", await free(card, printer.id), -1);
  check("unproxying puts the card back on the bill", await buyCopies(printer.id, card), 1);
} finally {
  // deck_proxies, deck_versions and deck_cards all cascade off decks.
  await fixture.execute(sql`delete from decks where user_id = ${USER}`);
  await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
  await pool.end();
}

console.log(failures === 0 ? "\nBoth anti-joins hold, on both queries." : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
