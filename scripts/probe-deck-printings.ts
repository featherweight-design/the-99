// Deck printings, proved against a real Postgres through the real callers: that a deck's pick moves
// the art and the printing the deck page draws (and that switching off restores the Collection's),
// that a commit records each card's and the commander's printing (and nothing with the switch off),
// that the version diff draws the printing a version recorded rather than today's, for an In row
// and an Out row alike, and that deck tiles (`/decks`, Home) draw each deck's own pick of its
// commander. The resolver's own rules are unit tested in `printings.test.ts`; only a
// database can answer whether the deck page, the commit and the diff actually read it.
//
// It writes a fixture under a per-run user_id and deletes it in a finally. Run it against a scratch
// Neon branch or local dev — NEVER production.
//
// Run: `pnpm probe:deck-printings`
// First, and on its own line: src/db reads DATABASE_URL at module scope, so the .env has to be
// loaded before the imports below reach it.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { getDeckDetail, listDecksWithStats } from "../src/lib/decks/read";
import { commitVersion, loadVersionDiff } from "../src/lib/decks/versions";
import { loadPrices, priceFor } from "../src/lib/decks/price-query";
import { readHeldPricePicks } from "../src/lib/decks/printings";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-printings-${Date.now()}`;

let failures = 0;
// Set only once the branch check passes, so a refused target is never written to, cleanup included.
let wroteFixtures = false;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${String(actual)}, expected ${String(expected)}`);
};
const setSwitch = (on: boolean) => {
  process.env.DECK_PRINTINGS_ENABLED = on ? "true" : "";
};

type Printing = { scryfall_id: string; set_code: string; collector_number: string; image_uri: string };

async function main() {
  // Production and staging are refused by branch, like every probe that writes.
  const { rows: [{ branch }] } = await fixture.execute<{ branch: string }>(
    sql`select current_setting('neon.branch_id', true) as branch`,
  );
  // Fails CLOSED: a database that reports no Neon branch at all is refused too, since nothing
  // then says it is not production.
  if (!branch || branch === "br-noisy-violet-a6vw4ess" || branch === "br-polished-pond-a6e63y0b") {
    throw new Error(`refusing to write fixtures on ${branch}`);
  }
  wroteFixtures = true;

  // From the catalog rather than hard-coded: a non-legendary card with two printings that carry
  // different art, and a legend to lead the deck.
  const { rows: [card] } = await fixture.execute<{ oracle_id: string }>(sql`
    select p.oracle_id from printings p join cards c on c.oracle_id = p.oracle_id
    where c.type_line not like '%Legendary%' and c.type_line not like '%Basic%' and p.image_uri is not null
    group by p.oracle_id having count(distinct p.image_uri) >= 2
    order by p.oracle_id limit 1
  `);
  const { rows: twoPrintings } = await fixture.execute<Printing>(sql`
    select distinct on (image_uri) scryfall_id, set_code, collector_number, image_uri
    from printings where oracle_id = ${card.oracle_id} and image_uri is not null
    order by image_uri, scryfall_id limit 2
  `);
  const [a, b] = twoPrintings;
  const { rows: [legend] } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line ~ 'Legendary Creature' and commander_legal
    order by oracle_id limit 1
  `);

  for (const p of [a, b]) {
    await fixture.execute(sql`
      insert into collection_items (user_id, oracle_id, quantity, set_code, collector_number, scryfall_id)
      values (${USER}, ${card.oracle_id}, 1, ${p.set_code}, ${p.collector_number}, ${p.scryfall_id})
    `);
  }
  const { rows: [{ id: deckId }] } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id) values (${USER}, 'Probe printings', ${legend.oracle_id})
    returning id
  `);

  // v1: the commander alone, committed with the switch OFF. Nothing is recorded.
  setSwitch(false);
  const { version: v1 } = await commitVersion(deckId, "probe v1");
  const { rows: [v1Row] } = await fixture.execute<{ commander_set_code: string | null }>(
    sql`select commander_set_code from deck_versions where id = ${v1.id}`,
  );
  check("switch off: a commit records no commander printing", v1Row.commander_set_code, null);

  await fixture.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}, ${card.oracle_id}, 1)`);

  // The Collection's printing, before any pick, is whichever one the deck page draws now.
  setSwitch(true);
  const shownBefore = (await getDeckDetail(deckId, USER))!.cards.find((c) => c.oracleId === card.oracle_id)!;
  const collection = [a, b].find((p) => p.set_code.toUpperCase() === shownBefore.printedSetCode && p.collector_number === shownBefore.printedCollectorNumber)!;
  const other = collection === a ? b : a;
  check("before a pick, the deck page draws the Collection's printing", shownBefore.imageUri, collection.image_uri);

  await fixture.execute(sql`
    insert into deck_printings (deck_id, oracle_id, set_code, collector_number)
    values (${deckId}, ${card.oracle_id}, ${other.set_code}, ${other.collector_number})
  `);
  const picked = (await getDeckDetail(deckId, USER))!.cards.find((c) => c.oracleId === card.oracle_id)!;
  check("a pick moves the deck page's art", picked.imageUri, other.image_uri);
  check("a pick moves the printing export names", `${picked.printedSetCode} ${picked.printedCollectorNumber}`, `${other.set_code.toUpperCase()} ${other.collector_number}`);
  setSwitch(false);
  const off = (await getDeckDetail(deckId, USER))!.cards.find((c) => c.oracleId === card.oracle_id)!;
  check("switch off: the deck page draws the Collection's printing again", off.imageUri, collection.image_uri);

  // v2: the picked card, committed with the switch ON. Body and commander are recorded.
  setSwitch(true);
  const { version: v2 } = await commitVersion(deckId, "probe v2");
  const { rows: [v2Card] } = await fixture.execute<{ set_code: string | null; collector_number: string | null }>(
    sql`select set_code, collector_number from deck_version_cards where version_id = ${v2.id} and oracle_id = ${card.oracle_id}`,
  );
  check("a commit records the card's picked printing", `${v2Card.set_code} ${v2Card.collector_number}`, `${other.set_code} ${other.collector_number}`);
  const { rows: [v2Row] } = await fixture.execute<{ commander_set_code: string | null }>(
    sql`select commander_set_code from deck_versions where id = ${v2.id}`,
  );
  check("a commit records the commander's printing", v2Row.commander_set_code !== null, true);
  check("the version a commit returns carries the commander's printing", (v2 as unknown as Record<string, unknown>).commanderSetCode, v2Row.commander_set_code);

  // Move the pick back to the Collection's printing: the version must still draw what it recorded.
  await fixture.execute(sql`delete from deck_printings where deck_id = ${deckId}`);
  const inDiff = await loadVersionDiff(v2.id, v1.id, USER, deckId);
  check("the diff's In row draws the printing the newer version recorded", inDiff.in.find((c) => c.oracleId === card.oracle_id)?.imageUri, other.image_uri);
  setSwitch(false);
  const inOff = await loadVersionDiff(v2.id, v1.id, USER, deckId);
  check("switch off: the diff's In row draws today's printing", inOff.in.find((c) => c.oracleId === card.oracle_id)?.imageUri, collection.image_uri);

  // v3: the card removed. Its Out row is the OLDER version's record.
  setSwitch(true);
  await fixture.execute(sql`delete from deck_cards where deck_id = ${deckId}`);
  const { version: v3 } = await commitVersion(deckId, "probe v3");
  const outDiff = await loadVersionDiff(v3.id, v2.id, USER, deckId);
  check("the diff's Out row draws the printing the older version recorded", outDiff.out.find((c) => c.oracleId === card.oracle_id)?.imageUri, other.image_uri);

  // DECK TILES (`/decks`, Home): two decks led by one OWNED commander, one with a pick. Each tile
  // draws its own deck's printing, keyed by deck rather than by card.
  const { rows: [owned] } = await fixture.execute<{ oracle_id: string }>(sql`
    select p.oracle_id from printings p join cards c on c.oracle_id = p.oracle_id
    where c.type_line ~ 'Legendary Creature' and c.commander_legal and p.image_uri is not null
    group by p.oracle_id having count(distinct p.image_uri) >= 2
    order by p.oracle_id limit 1
  `);
  const { rows: legendPrintings } = await fixture.execute<Printing & { art_crop_uri: string }>(sql`
    select distinct on (image_uri) scryfall_id, set_code, collector_number, image_uri, art_crop_uri
    from printings where oracle_id = ${owned.oracle_id} and image_uri is not null
    order by image_uri, scryfall_id limit 2
  `);
  for (const p of legendPrintings) {
    await fixture.execute(sql`
      insert into collection_items (user_id, oracle_id, quantity, set_code, collector_number, scryfall_id)
      values (${USER}, ${owned.oracle_id}, 1, ${p.set_code}, ${p.collector_number}, ${p.scryfall_id})
    `);
  }
  const deckOf = async (name: string) => (await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id) values (${USER}, ${name}, ${owned.oracle_id}) returning id
  `)).rows[0].id;
  const picks = await deckOf("Probe tile with a pick");
  const plain = await deckOf("Probe tile without one");
  const tileArt = async (id: string) =>
    (await listDecksWithStats(USER, "name", { includeCommanderArt: true })).find((d) => d.id === id)?.commanderImageUri;
  const shownTile = await tileArt(plain);
  const tileOther = legendPrintings.find((p) => p.image_uri !== shownTile)!;
  await fixture.execute(sql`
    insert into deck_printings (deck_id, oracle_id, set_code, collector_number)
    values (${picks}, ${owned.oracle_id}, ${tileOther.set_code}, ${tileOther.collector_number})
  `);
  check("a tile draws its own deck's pick of its commander", await tileArt(picks), tileOther.image_uri);
  check("a tile with no pick keeps the Collection's printing", await tileArt(plain), shownTile);
  setSwitch(false);
  check("switch off: the picked deck's tile draws the Collection's printing", await tileArt(picks), shownTile);

  // PRICES: a card with two live non-foil printings at different figures. The deck's pick of the
  // dearer one prices it; today's figure (no pick, or switch off) is the cheaper one.
  setSwitch(true);
  const { rows: [{ newest }] } = await fixture.execute<{ newest: string }>(sql`select max(as_of)::text as newest from printing_prices`);
  const { rows: [priced] } = await fixture.execute<{ oracle_id: string }>(sql`
    select p.oracle_id from printings p join printing_prices pp on pp.scryfall_id = p.scryfall_id
    join cards c on c.oracle_id = p.oracle_id
    where pp.as_of = ${newest}::timestamp and pp.price_cents is not null
      and c.type_line not like '%Basic%'
    group by p.oracle_id having count(distinct pp.price_cents) >= 2
    order by p.oracle_id limit 1
  `);
  const { rows: tiers } = await fixture.execute<{ scryfall_id: string; set_code: string; collector_number: string; price_cents: number }>(sql`
    select p.scryfall_id, p.set_code, p.collector_number, pp.price_cents
    from printings p join printing_prices pp on pp.scryfall_id = p.scryfall_id
    where p.oracle_id = ${priced.oracle_id} and pp.as_of = ${newest}::timestamp and pp.price_cents is not null
    order by pp.price_cents asc, p.scryfall_id
  `);
  const cheapest = tiers[0];
  const dearer = tiers[tiers.length - 1];
  await fixture.execute(sql`
    insert into collection_items (user_id, oracle_id, quantity, set_code, collector_number, scryfall_id)
    values (${USER}, ${priced.oracle_id}, 1, ${dearer.set_code}, ${dearer.collector_number}, ${dearer.scryfall_id})
  `);
  await fixture.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}, ${priced.oracle_id}, 1)`);
  await fixture.execute(sql`
    insert into deck_printings (deck_id, oracle_id, set_code, collector_number)
    values (${deckId}, ${priced.oracle_id}, ${dearer.set_code}, ${dearer.collector_number})
  `);
  const held = await readHeldPricePicks(USER, [deckId]);
  check("a held pick is passed to the price read", held.some((p) => p.oracleId === priced.oracle_id), true);
  const pickedRead = await loadPrices([priced.oracle_id], held);
  check("a deck's in-stock pick prices its own printing", priceFor(pickedRead, deckId, priced.oracle_id)?.cents, dearer.price_cents);
  check("the same card in another deck keeps today's cheapest figure", priceFor(pickedRead, plain, priced.oracle_id)?.cents, cheapest.price_cents);
  check("the figure names the printing behind it", priceFor(pickedRead, deckId, priced.oracle_id)?.printing?.scryfallId, dearer.scryfall_id);
  // The player lets go of that printing: the pick is no longer held, so it is not priced.
  await fixture.execute(sql`delete from collection_items where user_id = ${USER} and oracle_id = ${priced.oracle_id}`);
  check("a pick the player no longer holds is not passed", (await readHeldPricePicks(USER, [deckId])).some((p) => p.oracleId === priced.oracle_id), false);
  setSwitch(false);
  check("switch off: no picks reach the price read", (await readHeldPricePicks(USER, [deckId])).length, 0);
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    if (!wroteFixtures) {
      await pool.end();
      console.log(`\n${failures} check(s) failed`);
      process.exit(1);
    }
    // Versions, version cards and picks go with the deck (on delete cascade).
    await fixture.execute(sql`delete from deck_cards where deck_id in (select id from decks where user_id = ${USER})`);
    await fixture.execute(sql`delete from decks where user_id = ${USER}`);
    await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
    await fixture.execute(sql`delete from user_data_stamps where user_id = ${USER}`);
    await pool.end();
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  });
