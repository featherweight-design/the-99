// measure:precons: what the precon ingest would publish against a real catalog, and what a deck
// started from each precon would meet (plan `2026-10-11-commander-precons.md`, PR 1; audit finding
// 6). READ-ONLY, against STAGING. Runs the shipped `planPrecons` over the live feed (or the derived
// file `PRECON_FEED_PATH` names) and the catalog's ids, then, per kept list:
//
//   - each commander passes what `createDeck` and `importDeck` re-check: `commander_legal` and
//     `isCommanderCandidate`, and a two-commander list passes `canPair`;
//   - every body card is `commander_legal`, and inside the commanders' color identity.
//
// It prints every failure by precon and card name, so a card the start would meet is named before
// the start is built, never found after.
import { requireEnv } from "./lib/env.mjs";
import { readFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { canPair, partnerAbility } from "../src/lib/decks/partner";
import { loadPreconFeed, parseFeed, type PreconFeed } from "../src/lib/precons/feed";
import { planPrecons } from "../src/lib/precons/ingest";
import { isCommanderCandidate } from "../src/lib/recs/score";

neonConfig.webSocketConstructor = ws;
const { THE_99_NEON_STAGING_DIRECT } = requireEnv(["THE_99_NEON_STAGING_DIRECT"]);
const pool = new Pool({ connectionString: THE_99_NEON_STAGING_DIRECT });

type Card = {
  oracle_id: string; name: string; type_line: string; oracle_text: string | null; mana_cost: string | null;
  layout: string; color_identity: string[]; commander_legal: boolean;
};

async function main() {
  const path = process.env.PRECON_FEED_PATH;
  const feed: PreconFeed = path ? parseFeed(JSON.parse(readFileSync(path, "utf8")))! : await loadPreconFeed();
  const oracleIds = [...new Set(feed.decks.flatMap((d) => d.cards.map((c) => c.oracleId)).filter((x): x is string => !!x))];
  const scryfallIds = [...new Set(feed.decks.flatMap((d) => d.cards.map((c) => c.scryfallId)).filter((x): x is string => !!x))];

  const { rows: cardRows } = await pool.query<Card>(
    `select oracle_id, name, type_line, oracle_text, mana_cost, layout, color_identity, commander_legal
       from cards where oracle_id = any($1::uuid[])`, [oracleIds]);
  const { rows: printingRows } = await pool.query<{ scryfall_id: string }>(
    `select scryfall_id from printings where scryfall_id = any($1::uuid[])`, [scryfallIds]);
  const byId = new Map(cardRows.map((c) => [c.oracle_id, c]));
  const plan = planPrecons(feed, new Set(byId.keys()), new Set(printingRows.map((r) => r.scryfall_id)));

  const r = plan.report;
  console.log(`listed ${r.listed} · kept ${r.kept} · twins ${r.twins} · distinct lists ${r.kept - r.twins}`);
  console.log(`copies ${r.copies} · unmapped ${r.unmappedCopies} · no catalog printing ${r.printingsMissing}`);
  console.log(`refusals: ${plan.refusals.length === 0 ? "none" : plan.refusals.join("; ")}`);
  for (const d of r.dropped) console.log(`dropped ${d}`);

  const names = new Map(plan.precons.map((p) => [p.fileName, `${p.name} (${p.setCode})`]));
  const lists = plan.precons.filter((p) => p.twinOf === null);
  let commanderFails = 0, pairs = 0, pairFails = 0, bannedLists = 0, outsideLists = 0;
  for (const p of lists) {
    const rows = plan.cards.filter((c) => c.fileName === p.fileName);
    const commanders = rows.filter((c) => c.isCommander).map((c) => byId.get(c.oracleId)!);
    const label = names.get(p.fileName);
    for (const c of commanders) {
      if (!c.commander_legal || !isCommanderCandidate({ typeLine: c.type_line, oracleText: c.oracle_text, manaCost: c.mana_cost, layout: c.layout })) {
        commanderFails++;
        console.log(`COMMANDER ${label}: ${c.name} is not a legal commander`);
      }
    }
    if (commanders.length === 2) {
      pairs++;
      const [a, b] = commanders;
      const ok = canPair({ name: a.name, ability: partnerAbility(a.oracle_text) }, { name: b.name, ability: partnerAbility(b.oracle_text) });
      console.log(`PAIR ${label}: ${a.name} + ${b.name} ${ok ? "pairs" : "DOES NOT PAIR"}`);
      if (!ok) pairFails++;
    } else if (commanders.length > 2) {
      console.log(`PAIR ${label}: ${commanders.length} commanders`);
      pairFails++;
    }
    const identity = new Set(commanders.flatMap((c) => c.color_identity));
    const body = rows.filter((c) => !c.isCommander).map((c) => byId.get(c.oracleId)!);
    const banned = body.filter((c) => !c.commander_legal).map((c) => c.name);
    const outside = body.filter((c) => c.color_identity.some((x) => !identity.has(x))).map((c) => c.name);
    if (banned.length > 0) { bannedLists++; console.log(`BANNED ${label}: ${banned.join(", ")}`); }
    if (outside.length > 0) { outsideLists++; console.log(`OUTSIDE IDENTITY ${label}: ${outside.join(", ")}`); }
  }
  console.log(`\n${lists.length} distinct lists: ${commanderFails} illegal commanders; ${pairs} pairs, ${pairFails} not pairing; ` +
    `${bannedLists} lists holding a card not legal in Commander; ${outsideLists} holding a card outside the identity.`);
  await pool.end();
}

main().catch((err) => { console.error(err); process.exit(1); });
