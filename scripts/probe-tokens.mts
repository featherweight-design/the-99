// Reproduces the tokens brief's Fixtures against the REAL bytes (docs/superpowers/design-briefs/
// 2026-10-11-tokens-for-my-deck.md, "Fixtures"): builds the token catalog exactly as the printings
// ingest does, from a `pnpm catalog:fetch <dir>` directory, then joins it to one player's decks.
//
// READ-ONLY, on STAGING (`connectStaging` refuses a writable connection or any other branch). It
// writes nothing, anywhere: the catalog is built in memory, so it runs before a single token table
// exists. Needs `CATALOG_FETCH_DIR=<dir>` and `PROBE_USER_ID=<clerk id>`; a missing one stops it.
//
//   CATALOG_FETCH_DIR=/tmp/fetch PROBE_USER_ID=user_… pnpm probe:tokens [--strict]
//
// The brief's figures are a snapshot of 2026-10-11 (21 decks, 121 deck-token pairs, 80 distinct
// tokens under 61 names). Decks move, so a drift is PRINTED beside the brief's figure and only
// `--strict` turns it into a failure. What always fails is the catalog side: a token floor.
import "./lib/env.mjs";
import { TokenCatalogBuilder, tokenFloorFailure } from "../src/lib/tokens/catalog";
import { fetchBulkIndex, streamBulkEntries } from "../src/lib/scryfall/bulk";
import { connectStaging } from "./eval/lib/staging.mjs";

const BRIEF = { decks: 21, pairs: 121, tokens: 80, names: 61 };

// The brief's per-deck table: deck id -> [tokens, tokens without `Copy`, cards that make them].
const BRIEF_DECKS: Record<string, [number, number, number]> = {
  "dcf9a86d-f6ef-4c7c-a20c-a9807c7cdfbd": [14, 13, 16], // Omnath
  "0b49cb44-8ae2-4c19-b558-633344a2f4ed": [10, 9, 10],  // Eldrazi
  "1a352a97-00fc-4309-a60e-5d518d56d34f": [8, 7, 22],   // Prismari Artistry
  "2bd462de-5f94-47e5-bd29-eabea5921c75": [8, 7, 10],   // Kratos
  "904fdc61-e190-4ba5-8e34-2b18fa0584f2": [8, 7, 7],    // Gishath
  "40bb31db-dfc9-465b-af94-44e2ab83ed5d": [8, 7, 19],   // Thorin
  "122c9884-fd27-4a80-bd2c-6166d9e7e6ac": [7, 7, 10],   // Soldiers
  "c8b95d73-f5c7-4049-99a6-b7063bfb8522": [7, 6, 10],   // Scrappy Survivors
  "659c1ad2-acef-4fb0-9554-ade8fab72c30": [6, 6, 6],    // Sultai Arisen
  "783df427-d0c5-456a-805e-cdc94ecb0952": [6, 6, 10],   // Blood Rites
  "f7380a97-3f58-41a1-8d4e-7342ec01b054": [6, 6, 6],    // Brago
  "8da5f286-9c80-4330-a6f9-06f5fd6756f8": [5, 4, 5],    // Mutant Menace
  "fc97e49c-a2f3-4944-8436-3df8db102bd5": [5, 4, 6],    // Yuriko
  "2829cf41-1e07-4ec7-8353-8b0d9dfd678b": [4, 4, 5],    // Counter Intelligence
  "cbfb48c5-b085-4e60-889a-a861e9b39bd6": [4, 4, 9],    // Zombies
  "13a6dc28-958c-4591-a2bb-c0297bbe5d92": [4, 4, 4],    // Gods
  "0f585441-203e-475b-be7c-f11e67e20d79": [4, 4, 6],    // Avatar Aang
  "86ce528f-836d-476f-9ee8-88470bb2b0e3": [2, 2, 2],    // Elves
  "7284ff0a-6e76-4dc0-8af5-fc630a403b2b": [2, 2, 6],    // Goblins
  "cc306935-26c9-4e30-8f0c-e0cec410cf8b": [2, 2, 7],    // Tovolar
  "7653dec3-bcf4-4045-8242-9000765c7601": [1, 0, 1],    // Wizards
};
const AANG = "0f585441-203e-475b-be7c-f11e67e20d79";
const AANG_TOKENS = ["Ally", "Food", "Monk", "Soldier"];

async function main() {
  const userId = process.env.PROBE_USER_ID;
  if (!process.env.CATALOG_FETCH_DIR) throw new Error("probe:tokens: set CATALOG_FETCH_DIR to a `pnpm catalog:fetch` directory");
  if (!userId) throw new Error("probe:tokens: set PROBE_USER_ID (the account whose decks to read)");
  const strict = process.argv.includes("--strict");

  const known = new Set<string>();
  for await (const e of streamBulkEntries(await fetchBulkIndex("oracle_cards"))) {
    if (typeof e.oracle_id === "string") known.add(e.oracle_id);
  }
  const builder = new TokenCatalogBuilder();
  for await (const e of streamBulkEntries(await fetchBulkIndex("default_cards"))) builder.add(e);
  const catalog = builder.finish(known);
  console.log("catalog:", catalog.stats);
  const floor = tokenFloorFailure(catalog.stats);
  let failed = false;
  if (floor) { console.error(floor); failed = true; }

  const tokenByOracle = new Map(catalog.tokens.map((t) => [t.oracleId, t]));
  const madeBy = new Map<string, string[]>();
  for (const l of catalog.links) madeBy.set(l.cardOracleId, [...(madeBy.get(l.cardOracleId) ?? []), l.tokenOracleId]);

  const db = await connectStaging();
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute(sql`
    select d.id::text as deck_id, d.name,
           (select count(*) from deck_versions v where v.deck_id = d.id)::int as versions,
           array(
             select dc.oracle_id::text from deck_cards dc where dc.deck_id = d.id
             union select d.commander_oracle_id::text
             union select d.partner_oracle_id::text where d.partner_oracle_id is not null
           ) as oracle_ids
    from decks d where d.user_id = ${userId} order by d.name
  `);
  if (rows.length === 0) throw new Error(`probe:tokens: ${userId} owns no deck on staging`);

  const allTokens = new Set<string>(), pairs: string[] = [];
  const deckDrift: string[] = [];
  let aang: string[] | null = null;
  const table: Record<string, unknown>[] = [];
  for (const r of rows as { deck_id: string; name: string; versions: number; oracle_ids: string[] }[]) {
    const tokens = new Set<string>(), makers = new Set<string>();
    for (const o of r.oracle_ids) for (const t of madeBy.get(o) ?? []) { tokens.add(t); makers.add(o); }
    const withoutCopy = [...tokens].filter((t) => tokenByOracle.get(t)?.name !== "Copy").length;
    for (const t of tokens) { allTokens.add(t); pairs.push(`${r.deck_id}>${t}`); }
    table.push({ deck: r.name, committed: r.versions > 0, tokens: tokens.size, withoutCopy, makers: makers.size });
    const want = BRIEF_DECKS[r.deck_id];
    if (want && (want[0] !== tokens.size || want[1] !== withoutCopy || want[2] !== makers.size)) {
      deckDrift.push(`${r.name}: now ${tokens.size}/${withoutCopy}/${makers.size}, brief ${want.join("/")}`);
    }
    if (r.deck_id === AANG) aang = [...tokens].map((t) => tokenByOracle.get(t)?.name ?? "?").sort();
  }
  console.table(table);

  const names = new Set([...allTokens].map((t) => tokenByOracle.get(t)?.name));
  const got = { decks: rows.length, pairs: pairs.length, tokens: allTokens.size, names: names.size };
  console.log("now  :", got);
  console.log("brief:", { decks: BRIEF.decks, pairs: BRIEF.pairs, tokens: BRIEF.tokens, names: BRIEF.names });
  const drift = (Object.keys(got) as (keyof typeof got)[]).filter((k) => got[k] !== BRIEF[k]);
  // Per-deck rows and the named case are compared too: offsetting moves between decks leave every
  // total unchanged. A deck absent from the account is drift as well, not a pass.
  for (const id of Object.keys(BRIEF_DECKS)) {
    if (!(rows as { deck_id: string }[]).some((r) => r.deck_id === id)) deckDrift.push(`deck ${id} is not on this account`);
  }
  if (aang === null) deckDrift.push("Avatar Aang is not on this account");
  else if (aang.join() !== AANG_TOKENS.join()) deckDrift.push(`Avatar Aang makes ${aang.join(", ")}, brief ${AANG_TOKENS.join(", ")}`);
  if (drift.length > 0 || deckDrift.length > 0) {
    for (const d of deckDrift) console.log(`  ${d}`);
    console.log(`drift from the brief's snapshot: ${[...drift, ...(deckDrift.length ? [`${deckDrift.length} per-deck`] : [])].join(", ")}${strict ? " (--strict: failing)" : " (decks move; not a failure)"}`);
    if (strict) failed = true;
  }
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
