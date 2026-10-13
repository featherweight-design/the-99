// A deck's commander art, proved against a real Postgres by calling the real readers.
//
// `cards.art_crop_uri` and `cards.image_uri` are ORACLE-LEVEL — one arbitrary printing per
// card — so both deck surfaces drew a commander's art from a printing the player may not
// own, while the decklist under it had resolved every other card to the copy in their box.
// Three things only a database can answer:
//
//   THE DECK PAGE RESOLVES. `getDeckDetail` hands back the owned printing's front and crop
//   for the commander, and for a partner.
//   THE TILE RESOLVES TOO. `listDecksWithStats` does the same for the grid, through a
//   separate query that could drift from the page's at any time.
//   THE PICKER READS IT TOO. `/decks/new` lists the legends the player owns and draws
//   each one's card image, through a loader of its own.
//   THE FALLBACK HOLDS. A commander the player does NOT own keeps the oracle-level art,
//   and so does a printing ingested before `printings.art_crop_uri` existed — which is
//   EVERY printing until the next catalog refresh, so it is the state that ships first.
//
// A unit test cannot reach any of it: the resolution is a join across `collection_items`,
// two aliases of `printings` and `card_art_preferences`, assembled by `aggregateCollection`.
//
// It writes a fixture under a per-run `user_id` and deletes it in a `finally`. It also
// writes a sentinel `art_crop_uri` onto ONE catalog printing — the column is null across
// the whole catalog until a re-seed, and a crop that is null everywhere cannot tell a
// resolved crop from a fallback. The previous value is read BEFORE the write and put back
// in the same `finally`, for the reason every fixture here captures before it mutates.
//
// Run it against local dev or a scratch Neon branch — NEVER production.
//
// Run: `pnpm probe:commander-art`
// First, and on its own line: src/db reads DATABASE_URL at module scope, so the .env has to
// be loaded before the import below reaches it.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import {
  getDeckDetail,
  listDecksWithStats,
  listOwnedLegalCommanders,
} from "../src/lib/decks/read";
import { DEFAULT_DECK_SORT } from "../src/lib/decks/sort";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-commander-art-${Date.now()}`;
const SENTINEL_CROP = "https://example.invalid/probe-owned-crop.jpg";

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${actual}, expected ${expected}`);
};

type Legend = {
  oracle_id: string;
  card_image: string | null;
  card_crop: string | null;
  scryfall_id: string;
  set_code: string;
  collector_number: string;
  printing_image: string | null;
};

/**
 * A legend the player can own in a printing that is NOT the one the oracle row names, with
 * its own front image — which is what makes "the art moved" observable at all.
 *
 * Asked of the catalog rather than hard-coded: the fixture has to be a card whose oracle row
 * and chosen printing genuinely disagree, and which printing Scryfall's oracle row names
 * changes with every bulk refresh.
 *
 * `notOracleId` excludes a CARD, never a printing, and that is what the partner needs: this
 * row set is one row per printing, so an unfiltered second pick lands on a second printing of
 * the SAME card whenever the lowest-sorting one has two. The deck would then be led and
 * partnered by one oracle id resolving through one map entry, and the partner checks would
 * compare against a printing the resolver never chose.
 *
 * `cropless` picks a printing with no `art_crop_uri` of its own — the state of every printing
 * before the first catalog refresh that fills the column, and the one the fallback check needs
 * to stay true AFTER that refresh has run.
 */
const pickLegend = async (opts: { notOracleId?: string; cropless?: boolean } = {}): Promise<Legend> => {
  const { rows } = await fixture.execute<Legend>(sql`
    select c.oracle_id, c.image_uri as card_image, c.art_crop_uri as card_crop,
           p.scryfall_id, p.set_code, p.collector_number, p.image_uri as printing_image
    from cards c
    join printings p on p.oracle_id = c.oracle_id
    where c.type_line ~ 'Legendary Creature'
      and c.commander_legal
      and p.scryfall_id <> c.scryfall_id
      and p.image_uri is not null
      and c.image_uri is not null
      and c.art_crop_uri is not null
      and p.image_uri <> c.image_uri
      ${opts.notOracleId ? sql`and c.oracle_id <> ${opts.notOracleId}::uuid` : sql``}
      ${opts.cropless ? sql`and p.art_crop_uri is null` : sql``}
    order by c.oracle_id, p.scryfall_id
    limit 1
  `);
  if (!rows[0]) throw new Error("no legend owns a second printing — seed the catalog first");
  return rows[0];
};

/**
 * A legend with no collection row of its own, for the unowned fallback.
 *
 * The two cards the fixture is about to OWN are excluded by id. They sort from the other
 * end, so the overlap does not happen today — and if it ever did, `own()` would make this
 * deck's commander owned and all four fallback assertions would quietly exercise the owned
 * path instead, which is a probe reporting a pass about a check it never ran.
 */
const pickUnownedLegend = async (owned: string[]) => {
  const { rows } = await fixture.execute<{
    oracle_id: string; image_uri: string | null; art_crop_uri: string | null;
  }>(sql`
    select oracle_id, image_uri, art_crop_uri from cards
    where type_line ~ 'Legendary Creature' and commander_legal and image_uri is not null
      and oracle_id not in (${sql.join(owned.map((id) => sql`${id}::uuid`), sql`, `)})
    order by oracle_id desc limit 1
  `);
  if (!rows[0]) throw new Error("catalog holds no legend — seed it first");
  return rows[0];
};

const own = async (l: Pick<Legend, "oracle_id" | "scryfall_id" | "set_code" | "collector_number">) => {
  await fixture.execute(sql`
    insert into collection_items
      (user_id, oracle_id, scryfall_id, set_code, collector_number, finish, quantity)
    values (${USER}, ${l.oracle_id}::uuid, ${l.scryfall_id}::uuid,
            ${l.set_code}, ${l.collector_number}, 'nonfoil', 1)
  `);
};

const makeDeck = async (name: string, commander: string, partner: string | null) => {
  const { rows } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, partner_oracle_id)
    values (${USER}, ${name}, ${commander}::uuid,
            ${partner === null ? null : sql`${partner}::uuid`})
    returning id
  `);
  return rows[0].id;
};

async function run() {
  // Captured BEFORE anything is written to it, and INSIDE the try that restores it. A
  // cleanup handle populated after its write cannot restore a row a throw interrupted,
  // and a write outside the try can commit and then be stranded by a failure on the very
  // next statement — which on this one row would leave a sentinel URL on a real printing
  // in a shared catalog.
  let cropRestore: { scryfallId: string; previous: string | null } | null = null;

  try {
    const commander = await pickLegend();
    const partner = await pickLegend({ notOracleId: commander.oracle_id, cropless: true });
    const unowned = await pickUnownedLegend([commander.oracle_id, partner.oracle_id]);

    const { rows: before } = await fixture.execute<{ art_crop_uri: string | null }>(sql`
      select art_crop_uri from printings where scryfall_id = ${commander.scryfall_id}::uuid
    `);
    cropRestore = { scryfallId: commander.scryfall_id, previous: before[0]?.art_crop_uri ?? null };
    await fixture.execute(sql`
      update printings set art_crop_uri = ${SENTINEL_CROP}
      where scryfall_id = ${commander.scryfall_id}::uuid
    `);

    await own(commander);
    await own(partner);
    const pairId = await makeDeck("probe pair", commander.oracle_id, partner.oracle_id);
    const unownedId = await makeDeck("probe unowned", unowned.oracle_id, null);

    // ONE. The deck page hands back the copy in the box, front and crop.
    const detail = await getDeckDetail(pairId, USER, undefined, process.env);
    check("deck page: commander front is the owned printing's",
      detail?.commander.imageUri, commander.printing_image);
    check("deck page: commander crop is the owned printing's",
      detail?.commander.artCropUri, SENTINEL_CROP);
    // The partner is CHOSEN for a printing with no crop of its own — every printing's state
    // until the catalog is re-seeded, and a state some printings keep afterwards — so its
    // front is its own and its crop is the oracle's, resolved through `resolveArtCropUri`.
    // Picked rather than assumed: reading it off whatever printing sorted second passes only
    // while the whole column is null, and would fail on a correct build the Monday after.
    check("deck page: partner front is the owned printing's",
      detail?.partner?.imageUri, partner.printing_image);
    check("deck page: a printing with no crop of its own falls back to the oracle's",
      detail?.partner?.artCropUri, partner.card_crop);

    // TWO. The grid, through its own query, and only where the caller asks for it.
    const list = await listDecksWithStats(USER, DEFAULT_DECK_SORT, { includeCommanderArt: true, env: process.env });
    const pairTile = list.find((d) => d.id === pairId);
    check("deck tile: commander front is the owned printing's",
      pairTile?.commanderImageUri, commander.printing_image);
    check("deck tile: commander crop is the owned printing's",
      pairTile?.commanderArtCropUri, SENTINEL_CROP);

    // THREE. The fallback, on a commander the player does not own at all. This is the
    // rendering that shipped before any of this, and it has to be exactly unchanged.
    const unownedDetail = await getDeckDetail(unownedId, USER, undefined, process.env);
    check("deck page: an unowned commander keeps the oracle front",
      unownedDetail?.commander.imageUri, unowned.image_uri);
    check("deck page: an unowned commander keeps the oracle crop",
      unownedDetail?.commander.artCropUri, unowned.art_crop_uri);
    const unownedTile = list.find((d) => d.id === unownedId);
    check("deck tile: an unowned commander keeps the oracle front",
      unownedTile?.commanderImageUri, unowned.image_uri);
    check("deck tile: an unowned commander keeps the oracle crop",
      unownedTile?.commanderArtCropUri, unowned.art_crop_uri);

    // FOUR. The option is a real gate, not decoration. `/decks/[id]` calls this loader for
    // a deck-name list and draws no commander art, so it must not pay the aggregation —
    // and a default that silently resolved anyway would make the option a lie that costs
    // a query per deck on every builder load.
    const names = await listDecksWithStats(USER, DEFAULT_DECK_SORT, { env: process.env });
    const namesPair = names.find((d) => d.id === pairId);
    check("names-only caller: commander front stays oracle-level",
      namesPair?.commanderImageUri, commander.card_image);
    check("names-only caller: commander crop stays oracle-level",
      namesPair?.commanderArtCropUri, commander.card_crop);
    check("names-only caller: no printed name is resolved",
      namesPair?.commanderPrintedName, null);
    // FIVE. The commander picker on `/decks/new`, which lists the legends the player owns
    // and draws each one's card image. Every row there has a printing of its own by
    // definition, so unlike the deck surfaces this one has no fallback case to speak of —
    // what it can get wrong is asking the catalog instead of the collection.
    const picker = await listOwnedLegalCommanders(USER);
    const pickerRow = picker.find((c) => c.oracleId === commander.oracle_id);
    check("commander picker: the card image is the owned printing's",
      pickerRow?.imageUri, commander.printing_image);
    check("commander picker: the fixture's commander is listed at all",
      pickerRow !== undefined, true);

  } finally {
    // EVERY restoration is attempted, and the SHARED row goes first. Sequential awaits
    // make each cleanup a gate on the next, so a transient failure deleting this run's
    // own rows would exit the block with `SENTINEL_CROP` left on a real catalog printing
    // — a fixture's mess is this user's alone, that one is everybody's. Failures are
    // collected and thrown after the last attempt rather than at the first.
    const cleanups = [
      ...(cropRestore
        ? [fixture.execute(sql`
            update printings set art_crop_uri = ${cropRestore.previous}
            where scryfall_id = ${cropRestore.scryfallId}::uuid
          `)]
        : []),
      fixture.execute(sql`delete from decks where user_id = ${USER}`),
      fixture.execute(sql`delete from collection_items where user_id = ${USER}`),
    ];
    const outcomes = await Promise.allSettled(cleanups);
    const failed = outcomes.filter((o) => o.status === "rejected");
    if (failed.length > 0) {
      for (const f of failed) console.error(f.reason);
      throw new Error(`${failed.length} cleanup step(s) failed — see above`);
    }
  }
}

// A throw COUNTS as a failure before the exit code is computed: three probes in this
// repository have printed "all checks passed" over an exception a `finally` swallowed.
run()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    await pool.end();
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exit(failures === 0 ? 0 : 1);
  });
