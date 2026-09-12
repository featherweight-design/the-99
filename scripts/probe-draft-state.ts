// The draft readers, proved against a real Postgres by calling the real
// `loadDraftState` and `loadDraftRows`.
//
// Every figure these two return comes out of a snapshot transaction, a diff
// against a committed version, a claim read, a price join and a collection
// lookup. No unit test in this repository can assemble that — the pure halves
// (`draftDiff`, `bucketDraftAdds`, `summarisePrices`, `averageManaValue`) are
// unit tested, and this script is the only proof the readers put them together
// over real rows.
//
// It writes a fixture under a per-run user_id and deletes it in a finally. No
// begin/rollback: the readers go through the src/db singleton, which is a
// different connection from the one this script opens, so a transaction held
// here would be invisible to the functions under test.
//
// Run it against a scratch Neon branch or local dev — NEVER production.
//
// Run: `pnpm probe:draft`
// First, and on its own line: src/db reads DATABASE_URL at module scope, so the
// .env has to be loaded before the import below reaches it.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { changeCount, hasChanges, loadDraftRows, loadDraftState } from "../src/lib/decks/draft-state";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-draft-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
};

const one = async (label: string, query: ReturnType<typeof sql>) => {
  const { rows } = await fixture.execute<{ oracle_id: string }>(query);
  if (!rows[0]) throw new Error(`${label}: no candidate in the catalog — seed it first`);
  return rows[0].oracle_id;
};

// Read from the catalog rather than hard-coded: a fixed uuid rots the first time
// it moves. The priced card must carry a LIVE price — `priceState` calls a row
// whose `as_of` is behind the newest in the table sold out, and a sold-out card
// is priced by nothing, so a stale pick would make the total assertions vacuous.
const pickCards = async () => ({
  commander: await one("commander", sql`
    select oracle_id from cards
    where type_line ~ 'Legendary Creature' order by oracle_id limit 1
  `),
  priced: await one("priced add", sql`
    select distinct on (p.oracle_id) p.oracle_id from printing_prices pp
    join printings p on p.scryfall_id = pp.scryfall_id
    join cards c on c.oracle_id = p.oracle_id
    where pp.price_cents is not null
      and pp.as_of = (select max(as_of) from printing_prices)
      and c.type_line !~ '\\mBasic\\M' and c.type_line !~ 'Legendary'
    order by p.oracle_id limit 1
  `),
  unpriced: await one("unpriced add", sql`
    select c.oracle_id from cards c
    where c.type_line !~ '\\mBasic\\M' and c.type_line !~ 'Legendary'
      and not exists (
        select 1 from printings p
        join printing_prices pp on pp.scryfall_id = p.scryfall_id
        where p.oracle_id = c.oracle_id
      )
    order by c.oracle_id limit 1
  `),
  kept: await one("kept card", sql`
    select oracle_id from cards
    where type_line ~ 'Instant' and type_line !~ 'Legendary' order by oracle_id limit 1
  `),
  cut: await one("cut card", sql`
    select oracle_id from cards
    where type_line ~ 'Sorcery' and type_line !~ 'Legendary' order by oracle_id limit 1
  `),
  basic: await one("basic land", sql`
    select oracle_id from cards where type_line ~ '\\mBasic\\M.*Land' order by oracle_id limit 1
  `),
});

// Wrapped in main() rather than run at top level: tsx transpiles this repo's
// scripts to CJS, where a top-level await is a build error.
async function main() {
const card = await pickCards();

const put = (deckId: string, oracleId: string, quantity: number) => fixture.execute(sql`
  insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}, ${oracleId}, ${quantity})
  on conflict (deck_id, oracle_id) do update set quantity = ${quantity}
`);

try {
  // The cut card is OWNED; the two adds are not. That split is what makes the
  // adds unfree and therefore priced, and it is what the `out` row's ownership
  // dot reads.
  await fixture.execute(sql`
    insert into collection_items (user_id, oracle_id, quantity, set_code)
    values (${USER}, ${card.cut}, 1, 'probe'), (${USER}, ${card.commander}, 1, 'probe')
  `);
  const { rows: [deck] } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${USER}, 'Probe deck', ${card.commander}) returning id
  `);

  // 1. A BREW. No version, so there is nothing for a draft to be pending
  //    against — not an empty change list, an absent one.
  await put(deck.id, card.kept, 1);
  const brew = await loadDraftState(deck.id, USER);
  check("a brew has no version", brew.version, null);
  check("a brew has nothing pending", hasChanges(brew), false);

  // Sleeve it as v1: the kept card and the card a later edit will cut.
  await put(deck.id, card.cut, 1);
  const { rows: [v1] } = await fixture.execute<{ id: string; committed_at: string }>(sql`
    insert into deck_versions (deck_id, number, committed_at, commander_oracle_id, commander_since)
    values (${deck.id}, 1, now(), ${card.commander}, now()) returning id, committed_at
  `);
  await fixture.execute(sql`
    insert into deck_version_cards (version_id, oracle_id, quantity, since) values
      (${v1.id}, ${card.kept}, 1, ${v1.committed_at}),
      (${v1.id}, ${card.cut}, 1, ${v1.committed_at})
  `);

  // 2. THE SNAPSHOT PAIRING. The version and the deck's rows are read under one
  //    `repeatable read` transaction, so a draft identical to its version has
  //    nothing pending — not every card in v1 listed as an add.
  const clean = await loadDraftState(deck.id, USER);
  check("a committed deck reads its own version", clean.version?.number, 1);
  check("an untouched draft is clean", changeCount(clean), 0);

  // 3. A BASICS-ONLY EDIT. Real, committable, and priceable by nothing: both
  //    lists stay empty and `basicsChanged` is the one signal.
  await put(deck.id, card.basic, 12);
  const basicsOnly = await loadDraftState(deck.id, USER);
  check("a basics-only edit names no card", changeCount(basicsOnly), 0);
  check("…and still counts as a change", basicsOnly.basicsChanged, true);

  // 4. A REAL EDIT: two adds in, one card out.
  await put(deck.id, card.priced, 1);
  await put(deck.id, card.unpriced, 1);
  await fixture.execute(sql`
    delete from deck_cards where deck_id = ${deck.id} and oracle_id = ${card.cut}
  `);
  const state = await loadDraftState(deck.id, USER);
  check("the adds are named", state.adds.length, 2);
  check("the cut is named", state.removes.length, 1);
  check("basics are in neither list", state.basicsChanged, false);

  //    `names` is a CHANGED-CARD map. The facts behind it are read over the whole
  //    draft because the mana average needs every row, and a consumer enumerating
  //    this map must not draw the kept card or the twelve basics.
  check("names covers the changed cards and nothing else", state.names.size, 3);

  // 5. THE PURCHASE. Neither add is owned, so both are unfree; one has a live
  //    price and one has never been stocked. A figure over partial coverage
  //    reads as a complete one, so the coverage travels with it.
  check("both adds cost something", state.unfreeCount, 2);
  check("the total covers the one priced copy", state.pricedCopies, 1);
  check("…and is stated", state.total !== null, true);
  check("…against the feed's newest run", state.newestAsOf !== null, true);

  // 6. THE ROWS. Driven by the state's own two lists so the drawn rows cannot
  //    drift out of step with the counts, and `quantity` is the DELTA.
  const { rows } = await loadDraftRows(deck.id, USER);
  check("an in row per add", rows.in.length, 2);
  check("an out row per cut", rows.out.length, 1);
  check("the out row is the cut card", rows.out[0]?.oracleId, card.cut);
  check("the out row counts the copies it lost", rows.out[0]?.quantity, 1);
  check("the out row prints the pair it moved between", `${rows.out[0]?.from}→${rows.out[0]?.to}`, "1→0");
  //    The collection lookup: the cut copy is going back to a box the player has,
  //    and the two adds are cards they do not own.
  check("the cut card reads as owned", rows.out[0]?.owned, true);
  check("an add reads as unowned", rows.in.every((r) => !r.owned), true);
  //    A cut makes no purchase decision, whatever the claim read said.
  check("an out row carries no bucket", rows.out[0]?.bucket, null);
} finally {
  // Ordered by dependency; deck_versions and deck_cards cascade off decks.
  await fixture.execute(sql`delete from decks where user_id = ${USER}`);
  await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
  await pool.end();
}

console.log(failures === 0 ? "\nEvery draft figure holds." : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
