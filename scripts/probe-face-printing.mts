// Proves a player's face can be ANY card in any printing (Hugh, 2026-10-27), on a real database: a card that
// cannot lead a deck is accepted; a printing is stored only when it is OF that card; a read draws the chosen
// printing's art and falls back to the card's own when there is no pick or the pick no longer matches; a
// printing leaving the catalog sets the pick null; and the two raw-SQL readers (spare requests) take the same
// chain. Four of the six reads of the face are exercised by value; see face-reads.test.ts for the rest by shape.
//
// It WRITES, so it fails closed on its target: `PROBE_DB_BRANCH` must name the Neon branch `DATABASE_URL` reports,
// and never staging, production or local-dev. Run it on a scratch branch off local-dev migrated to 0176 with a
// 0.25 CU compute, then delete the branch. Its two accounts are made-up ids, and it removes every row it wrote,
// in a finally, including the one printing it inserts (a fixture row, deleted last).
//
//   PROBE_DB_BRANCH=br-… pnpm probe:face-printing
import "./lib/env.mjs";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const run = Date.now().toString(36);
const A = `probe_face_a_${run}`;
const B = `probe_face_b_${run}`;

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:face-printing: set PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:face-printing: ${named} is staging, production or local-dev; it writes`);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows: br } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (br[0]?.b !== named) throw new Error(`probe:face-printing: database reports ${br[0]?.b}, not ${named}`);
  console.log(`branch ${named}`);

  const friends = await import("../src/lib/social/friends");
  const { setCommander } = await import("../src/lib/social/commander");
  const requests = await import("../src/lib/social/spare-requests");
  const prompt = await import("../src/lib/discovery/face-prompt");
  const picker = await import("../src/lib/decks/commander-picker");
  const { NON_GAME_LAYOUTS } = await import("../src/lib/cards/game-card");

  const FIXTURE_PRINTING = "00000000-0000-4000-8000-0000000fa0ce";
  const FIXTURE_VARIANT = "00000000-0000-4000-8000-0000000fa0cf";
  let fixtureCard: string | null = null;
  try {
    // A card that can NOT lead a deck: a basic land with art, and two printings of it (one inserted, with its own art).
    const { rows: lands } = await db.execute<{ oracle_id: string; name: string; art: string }>(sql`
      select oracle_id::text, name, art_crop_uri as art from cards
       where type_line like 'Basic Land%' and art_crop_uri is not null order by name limit 2`);
    if (lands.length < 2) throw new Error("no two basic lands with art in this catalog");
    const [land, other] = lands;
    fixtureCard = land.oracle_id;
    const PICK_ART = `https://probe.invalid/${run}/pick.jpg`;
    await db.execute(sql`
      insert into printings (scryfall_id, oracle_id, set_code, collector_number, finishes, art_crop_uri)
      values (${FIXTURE_PRINTING}::uuid, ${land.oracle_id}::uuid, 'prb', '1', array['nonfoil']::text[], ${PICK_ART})`);
    const { rows: foreign } = await db.execute<{ id: string }>(sql`
      select scryfall_id::text as id from printings where oracle_id = ${other.oracle_id}::uuid limit 1`);
    if (!foreign[0]) throw new Error("no printing of the second land");

    await friends.ensureProfile(A, "Alice");
    await friends.ensureProfile(B, "Bob");
    await db.execute(sql`insert into friend_links (user_id, friend_user_id) values (${A}, ${B}), (${B}, ${A})`);

    // 1. Any card.
    const noPick = await setCommander(A, land.oracle_id);
    check("a basic land, which cannot lead a deck, is accepted as a face", noPick.ok, JSON.stringify(noPick));
    check("an unknown card id is refused", JSON.stringify(await setCommander(A, "00000000-0000-4000-8000-000000000001")) === JSON.stringify({ ok: false, reason: "noCard" }));
    // A card that is not a game card (G1): a token, an emblem, an art card.
    const layouts = sql.join([...NON_GAME_LAYOUTS].map((l) => sql`${l}`), sql`, `);
    const { rows: nonGame } = await db.execute<{ oracle_id: string }>(sql`select oracle_id::text from cards where layout in (${layouts}) limit 1`);
    if (nonGame[0]) {
      const refused = await setCommander(B, nonGame[0].oracle_id);
      check("a card that is not a game card is refused", !refused.ok && refused.reason === "noCard", JSON.stringify(refused));
    } else console.log("skip  no non-game card in this catalog to refuse");

    // 1b. Asked once (G4): the pick stamped the flag, and a later pick leaves the stamp where it was.
    const doneAt = async (u: string) =>
      (await db.execute<{ at: string | null }>(sql`select face_prompt_done_at::text as at from user_prefs where user_id = ${u}`)).rows[0]?.at ?? null;
    const firstAt = await doneAt(A);
    check("a pick stamps the reader done being asked", firstAt !== null && (await prompt.facePromptDone(A)));
    await setCommander(A, land.oracle_id);
    check("a second pick leaves the stamp as it was", (await doneAt(A)) === firstAt, `${firstAt} -> ${await doneAt(A)}`);
    check("a reader never asked is not done", !(await prompt.facePromptDone(B)));
    check("Skip stamps once", (await prompt.skipFacePrompt(B)) && (await prompt.facePromptDone(B)));
    check("a second Skip writes nothing", !(await prompt.skipFacePrompt(B)));

    // 2. Art with no pick: the card's own.
    const seen = async () => (await friends.loadFriendsAndLinks(B)).friends.find((f) => f.displayName === "Alice")?.commander ?? null;
    check("with no printing chosen the face draws the card's own art", (await seen())?.artCropUri === land.art, String((await seen())?.artCropUri));

    // 3. A printing of that card.
    const picked = await setCommander(A, land.oracle_id, FIXTURE_PRINTING);
    check("a printing of the card is accepted", picked.ok, JSON.stringify(picked));
    check("a friend's read draws the chosen printing's art", (await seen())?.artCropUri === PICK_ART, String((await seen())?.artCropUri));
    check("so does the player's own read", (await friends.ensureProfile(A, "x")).commander?.artCropUri === PICK_ART);
    const own = (await friends.ensureProfile(A, "x")).commander;
    check("the own read returns the pick behind the face", own?.printingId === FIXTURE_PRINTING && own.printingGone === false, JSON.stringify(own));

    // 2b. The picker's reads (G3).
    const hits = await picker.searchFaceCards(land.name);
    const hit = hits.find((h) => h.oracleId === land.oracle_id);
    const { rows: counted } = await db.execute<{ n: number }>(sql`
      select count(*)::int as n from printings where oracle_id = ${land.oracle_id}::uuid and art_crop_uri is not null`);
    check("the search finds a card that cannot lead a deck", hit !== undefined, JSON.stringify(hits.map((h) => h.name)));
    check("with its type line and its count of printings with art", hit?.typeLine.startsWith("Basic Land") === true && hit.printings === counted[0].n,
      `${hit?.typeLine} ${hit?.printings} vs ${counted[0].n}`);
    if (nonGame[0]) {
      const { rows: ng } = await db.execute<{ name: string }>(sql`select name from cards where oracle_id = ${nonGame[0].oracle_id}::uuid`);
      check("the search never offers a card that is not a game card", !(await picker.searchFaceCards(ng[0].name)).some((h) => h.oracleId === nonGame[0].oracle_id));
      check("nor its printings", (await picker.listFacePrintings(nonGame[0].oracle_id)) === null);
    }
    const screen = await picker.listFacePrintings(land.oracle_id);
    check("the printings screen leads with the card's usual art", screen?.usual.artCropUri === land.art, String(screen?.usual.artCropUri));
    check("and lists every printing with art, the pick among them", screen?.printings.length === counted[0].n && screen.printings.some((x) => x.scryfallId === FIXTURE_PRINTING),
      `${screen?.printings.length} vs ${counted[0].n}`);
    const { rows: order } = await db.execute<{ id: string }>(sql`
      select p.scryfall_id::text as id from printings p left join sets s on s.code = p.set_code
       where p.oracle_id = ${land.oracle_id}::uuid and p.art_crop_uri is not null
       order by s.released_at desc nulls last, p.collector_number asc`);
    check("newest set first", JSON.stringify(screen?.printings.map((x) => x.scryfallId)) === JSON.stringify(order.map((r) => r.id)));

    // 2c. A pick whose printing lost its crop: friends see the usual art, and only the own read says so (P8).
    await db.execute(sql`update printings set art_crop_uri = null where scryfall_id = ${FIXTURE_PRINTING}::uuid`);
    const lost = (await friends.ensureProfile(A, "x")).commander;
    check("a pick that lost its crop reads as gone, drawn in the usual art", lost?.printingGone === true && lost.artCropUri === land.art, JSON.stringify(lost));
    await db.execute(sql`update printings set art_crop_uri = ${PICK_ART} where scryfall_id = ${FIXTURE_PRINTING}::uuid`);

    // 2d. The deck row: a lead in the printing its deck shows (the Collection's, with no deck pick).
    const { rows: leads } = await db.execute<{ oracle_id: string; id: string; set_code: string; num: string; art: string }>(sql`
      select c.oracle_id::text, p.scryfall_id::text as id, p.set_code, p.collector_number as num, p.art_crop_uri as art
        from cards c join printings p on p.oracle_id = c.oracle_id
       where c.type_line like 'Legendary Creature%' and c.commander_legal and p.art_crop_uri is not null
         and p.art_crop_uri <> c.art_crop_uri
       order by p.image_uri is null desc, c.name
       limit 1`);
    if (leads[0]) {
      const L = leads[0];
      await db.execute(sql`insert into collection_items (user_id, oracle_id, quantity, set_code, collector_number)
        values (${A}, ${L.oracle_id}::uuid, 1, ${L.set_code}, ${L.num})`);
      await db.execute(sql`insert into decks (user_id, name, commander_oracle_id) values (${A}, ${`probe ${run}`}, ${L.oracle_id}::uuid)`);
      const tiles = await picker.listOwnDeckFaces(A, process.env);
      const tile = tiles.find((x) => x.oracleId === L.oracle_id);
      // A printing with no full image first: the deck's own art then falls back to another printing's, and the tile
      // must still draw the crop the face will.
      check("the deck row saves the printing its deck holds, drawn in that printing's own crop", tile?.printingId === L.id && tile.artCropUri === L.art, JSON.stringify(tile));
      // A variant sharing that set, code and number: the deck's holding no longer names one printing, so the tile keeps
      // the usual art rather than saving whichever variant the lookup returned.
      await db.execute(sql`
        insert into printings (scryfall_id, oracle_id, set_code, collector_number, finishes, art_crop_uri)
        values (${FIXTURE_VARIANT}::uuid, ${L.oracle_id}::uuid, ${L.set_code}, ${L.num}, array['nonfoil']::text[], ${`https://probe.invalid/${run}/variant.jpg`})`);
      const twin = (await picker.listOwnDeckFaces(A, process.env)).find((x) => x.oracleId === L.oracle_id);
      check("a holding two variants share saves no printing", twin?.printingId === null, JSON.stringify(twin));
    } else console.log("skip  no legendary creature with a second art in this catalog");

    // 4. The raw-SQL readers take the same chain.
    await db.execute(sql`insert into spare_requests (asker_user_id, holder_user_id, oracle_id, status) values (${A}, ${B}, ${land.oracle_id}::uuid, 'open')`);
    const incoming = await db.execute<{ commander_art: string | null }>(requests.incomingAsksQuery(B, new Date()));
    check("the holder's incoming asks draw the asker's chosen printing", incoming.rows[0]?.commander_art === PICK_ART, JSON.stringify(incoming.rows[0]));
    await db.execute(sql`update social_profiles set commander_oracle_id = ${land.oracle_id}::uuid, commander_printing_id = ${FIXTURE_PRINTING}::uuid where user_id = ${B}`);
    const mine = await db.execute<{ commander_art: string | null }>(requests.myAsksQuery(A, new Date()));
    check("the asker's own asks draw the holder's chosen printing", mine.rows[0]?.commander_art === PICK_ART, JSON.stringify(mine.rows[0]));

    // 5. Refusals.
    const wrong = await setCommander(A, land.oracle_id, foreign[0].id);
    check("a printing of ANOTHER card is refused", !wrong.ok && wrong.reason === "badPrinting", JSON.stringify(wrong));
    const stillPicked = await db.execute<{ p: string | null }>(sql`select commander_printing_id::text p from social_profiles where user_id = ${A}`);
    check("and the refused write changed nothing", stillPicked.rows[0]?.p === FIXTURE_PRINTING);
    const nocard = await setCommander(A, land.oracle_id, "00000000-0000-4000-8000-000000000002");
    check("a printing that is not in the catalog is refused", !nocard.ok && nocard.reason === "badPrinting", JSON.stringify(nocard));

    // 6. Changing the card drops the pick; clearing clears both.
    await setCommander(A, other.oracle_id);
    const afterChange = await db.execute<{ c: string | null; p: string | null }>(sql`select commander_oracle_id::text c, commander_printing_id::text p from social_profiles where user_id = ${A}`);
    check("changing the card without a printing drops the old pick", afterChange.rows[0]?.c === other.oracle_id && afterChange.rows[0]?.p === null);

    // 7. A pick that no longer matches its card draws the card's default (the join checks both ids).
    await db.execute(sql`update social_profiles set commander_oracle_id = ${other.oracle_id}::uuid, commander_printing_id = ${FIXTURE_PRINTING}::uuid where user_id = ${A}`);
    check("a pick that does not belong to the profile's card draws that card's own art", (await seen())?.artCropUri === other.art, String((await seen())?.artCropUri));

    // 8. The printing leaves the catalog: the pick is set null and the art falls back.
    await setCommander(A, land.oracle_id, FIXTURE_PRINTING);
    await db.execute(sql`delete from printings where scryfall_id = ${FIXTURE_PRINTING}::uuid`);
    const gone = await db.execute<{ p: string | null }>(sql`select commander_printing_id::text p from social_profiles where user_id = ${A}`);
    check("a printing leaving the catalog sets the pick null", gone.rows[0]?.p === null);
    check("and the face falls back to the card's own art", (await seen())?.artCropUri === land.art, String((await seen())?.artCropUri));

    const cleared = await setCommander(A, null);
    const after = await db.execute<{ c: string | null; p: string | null }>(sql`select commander_oracle_id::text c, commander_printing_id::text p from social_profiles where user_id = ${A}`);
    check("a null card clears both columns", cleared.ok && after.rows[0]?.c === null && after.rows[0]?.p === null);
    check("a printing with no card is refused", JSON.stringify(await setCommander(A, null, FIXTURE_PRINTING)) === JSON.stringify({ ok: false, reason: "badPrinting" }));
  } finally {
    await db.execute(sql`delete from spare_requests where asker_user_id in (${A}, ${B})`);
    await db.execute(sql`delete from friend_links where user_id in (${A}, ${B})`);
    await db.execute(sql`delete from social_profiles where user_id in (${A}, ${B})`);
    await db.execute(sql`delete from user_prefs where user_id in (${A}, ${B})`);
    await db.execute(sql`delete from decks where user_id in (${A}, ${B})`);
    await db.execute(sql`delete from collection_items where user_id in (${A}, ${B})`);
    await db.execute(sql`delete from printings where scryfall_id in (${FIXTURE_PRINTING}::uuid, ${FIXTURE_VARIANT}::uuid)`);
    // Last: the friend_links writes above fire user_data_touch, which upserts a stamp row for each account.
    await db.execute(sql`delete from user_data_stamps where user_id in (${A}, ${B})`);
  }
  if (failed > 0) {
    console.error(`${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("all checks passed");
}

main().then(() => process.exit(0), (e) => {
  console.error(e);
  process.exit(1);
});
