// Proves a player's face can be ANY card in any printing (Hugh, 2026-10-27), on a real database: a card that
// cannot lead a deck is accepted; a printing is stored only when it is OF that card; a read draws the chosen
// printing's art and falls back to the card's own when there is no pick or the pick no longer matches; a
// printing leaving the catalog sets the pick null; and the two raw-SQL readers (spare requests) take the same
// chain. Four of the six reads of the face are exercised by value; see face-reads.test.ts for the rest by shape.
//
// It WRITES, so it fails closed on its target: `PROBE_DB_BRANCH` must name the Neon branch `DATABASE_URL` reports,
// and never staging, production or local-dev. Run it on a scratch branch off local-dev migrated to 0174 with a
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

  const FIXTURE_PRINTING = "00000000-0000-4000-8000-0000000fa0ce";
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

    // 2. Art with no pick: the card's own.
    const seen = async () => (await friends.loadFriendsAndLinks(B)).friends.find((f) => f.displayName === "Alice")?.commander ?? null;
    check("with no printing chosen the face draws the card's own art", (await seen())?.artCropUri === land.art, String((await seen())?.artCropUri));

    // 3. A printing of that card.
    const picked = await setCommander(A, land.oracle_id, FIXTURE_PRINTING);
    check("a printing of the card is accepted", picked.ok, JSON.stringify(picked));
    check("a friend's read draws the chosen printing's art", (await seen())?.artCropUri === PICK_ART, String((await seen())?.artCropUri));
    check("so does the player's own read", (await friends.ensureProfile(A, "x")).commander?.artCropUri === PICK_ART);

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
    await db.execute(sql`delete from printings where scryfall_id = ${FIXTURE_PRINTING}::uuid`);
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
