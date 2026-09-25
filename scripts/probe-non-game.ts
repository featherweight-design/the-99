// Cardboard that is not a card, proved against a real Postgres and the real catalog by calling
// the real resolver.
//
// Scryfall's catalog holds Jumpstart theme fronts, planes, schemes, avatars and a few `normal`
// objects whose type line is only `Card`. One of the fronts is named "Lands", so a pasted list's
// section header resolved to it by exact name and the deck gained a card called Lands (Hugh's
// staging walk, 2026-09-25). `isGameCard` is the rule and `matchRows` applies it; the unit tests
// prove both over hand-built catalogs. What only a database answers is whether the catalog
// `loadMatchInputs` reads carries the columns the rule needs, whether the real "Lands" front is
// refused, and whether the skipped-printings ledger reports only the TOKEN layouts as skipped.
//
// Four paths, one resolver. Deck import and "Update from a list" both run `buildDeckImport` over
// `loadMatchInputs({ detailed: true })`; the collection CSV runs `matchRows` over the plain read.
// Both reads are exercised. The unresolved-row picker and quick-add search `commander_legal`
// cards only, so what keeps these objects out of them is a fact about the catalog, asserted
// last: none of them is commander-legal on the database this runs against.
//
// It writes two sentinel rows into `skipped_printings`, under ids no printing can have, and
// deletes them in a `finally`. Point it at local-dev or a scratch branch, NEVER production.
//
// Run: `pnpm tsx scripts/probe-non-game.ts`
// First, and on its own line: src/db reads DATABASE_URL at module scope, so the .env has to be
// loaded before the import below reaches it.
import { requireEnv } from "./lib/env.mjs";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { NON_GAME_LAYOUTS } from "../src/lib/cards/game-card";
import { loadMatchInputs } from "../src/lib/collection/import";
import { matchRows } from "../src/lib/collection/match";
import { buildDeckImport } from "../src/lib/decks/import";
import type { CollectionRow } from "../src/lib/manabox/parse";

requireEnv(["DATABASE_URL"]);

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

const csvRow = (name: string, scryfallId: string | null, line: number): CollectionRow => ({
  name, setCode: "", collectorNumber: "", quantity: 1, scryfallId,
  finish: "nonfoil", condition: null, line,
});

const TOKEN_ID = randomUUID();
const FRONT_ID = randomUUID();

async function main() {
  const { rows: fronts } = await db.execute<{ oracle_id: string; scryfall_id: string }>(sql`
    select c.oracle_id, p.scryfall_id from cards c
    join printings p on p.oracle_id = c.oracle_id
    where c.name = 'Lands' and c.layout = 'front_card'
    order by p.scryfall_id limit 1
  `);
  const lands = fronts[0];
  if (!lands) throw new Error("no 'Lands' front_card with a printing in this catalog: the probe has no subject");

  // ── Deck import and Update from a list ─────────────────────────────────
  const detailed = await loadMatchInputs([], { detailed: true });
  const deck = buildDeckImport({
    text: "1 Sol Ring\nLands\n1 Forest\nCreatures",
    catalog: detailed.catalog,
    indexes: detailed.indexes,
  });
  const names = deck.cards.map((c) => c.oracleId);
  check("the 'Lands' header is not imported as a card", !names.includes(lands.oracle_id),
    `${deck.cards.length} card(s) imported`);
  check("the 'Lands' header reads as unresolved", deck.unresolved.some((u) => u.rawName === "Lands"),
    `unresolved: ${JSON.stringify(deck.unresolved.map((u) => u.rawName))}`);
  check("the real cards beside it still import", deck.cards.length === 2,
    `${deck.cards.length} of 2`);

  // ── Collection CSV, by name and by the front's own printing id ─────────
  await db.execute(sql`
    insert into skipped_printings (scryfall_id, layout, name) values
      (${TOKEN_ID}, 'token', 'probe-non-game token'),
      (${FRONT_ID}, 'front_card', 'probe-non-game front')
  `);
  const rows = [
    csvRow("Lands", null, 2),
    csvRow("Lands", lands.scryfall_id, 3),
    csvRow("probe-non-game token", TOKEN_ID, 4),
    csvRow("probe-non-game front", FRONT_ID, 5),
    csvRow("Sol Ring", null, 6),
  ];
  const plain = await loadMatchInputs(rows);
  const result = matchRows(rows, plain.catalog, plain.indexes);
  const unmatchedLines = result.unmatched.map((r) => r.line);
  check("a CSV row naming 'Lands' is unmatched", unmatchedLines.includes(2),
    `unmatched lines ${JSON.stringify(unmatchedLines)}`);
  // Not "unmatched": Scryfall has at some point listed this printing as a token, and the ledger
  // still holds it that way (315 printings sit in both tables, on local-dev and staging alike).
  // Either way it is not imported, which is the rule; what it must never be is matched.
  check("a CSV row carrying the front's printing id is not matched", !result.matched.some((m) => m.row.line === 3),
    `line 3 is ${unmatchedLines.includes(3) ? "unmatched" : result.skipped.some((r) => r.line === 3) ? "skipped" : "matched"}`);
  check("a token in the ledger is still reported skipped", result.skipped.some((r) => r.line === 4),
    `skipped lines ${JSON.stringify(result.skipped.map((r) => r.line))}`);
  check("a theme front in the ledger reads as unmatched, not skipped", unmatchedLines.includes(5),
    `unmatched lines ${JSON.stringify(unmatchedLines)}`);
  check("Sol Ring still matches", result.matched.some((m) => m.row.line === 6),
    `${result.matched.length} matched`);

  // ── The picker and quick-add: both search commander-legal cards only ───
  const { rows: legal } = await db.execute<{ n: number }>(sql`
    select count(*)::int as n from cards
    where commander_legal
      and (layout in (${sql.join([...NON_GAME_LAYOUTS].map((l) => sql`${l}`), sql`, `)})
        or btrim(type_line) in ('Card', 'Card // Card'))
  `);
  check("no non-game object is commander-legal, so search cannot offer one", legal[0].n === 0,
    `${legal[0].n} commander-legal`);
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    try {
      await db.execute(sql`delete from skipped_printings where scryfall_id in (${TOKEN_ID}, ${FRONT_ID})`);
    } catch (error) {
      failures += 1;
      console.error("cleanup failed", error);
    }
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  });
