// probe:swap-coverage — how much of what a utility land gives up is NAMED rather than quoted, over
// the lands in staging's own decks (Hugh, 2026-09-24: H3 names what is given up, from the card's
// own text, and the share named against quoted goes in the PR body).
//
// READ-ONLY, against STAGING: the lands players actually run, not a fixture. It reads every land in
// every deck's draft, keeps the ones that do something besides make mana, and reports each ability
// as named (a pattern in `GIVES_UP_PATTERNS`) or quoted (the fallback). The quoted list is printed
// whole, because it is what /copy-review reads.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { isLandFace } from "../src/lib/cards/facet";
import { nameAbility, nonManaAbilities } from "../src/lib/swaps/land";

neonConfig.webSocketConstructor = ws;

const { THE_99_NEON_STAGING_DIRECT } = requireEnv(["THE_99_NEON_STAGING_DIRECT"]);
const pool = new Pool({ connectionString: THE_99_NEON_STAGING_DIRECT });

void (async () => {
  try {
    const { rows } = await pool.query<{ name: string; type_line: string; oracle_text: string | null; decks: number }>(`
      select c.name, c.type_line, c.oracle_text, count(distinct dc.deck_id)::int as decks
      from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
      where c.type_line ~* 'land'
      group by c.name, c.type_line, c.oracle_text`);
    const lands = rows.filter((r) => isLandFace(r.type_line) && !/\bBasic\b/.test(r.type_line));
    let named = 0;
    let quoted = 0;
    let utility = 0;
    const labels = new Map<string, number>();
    const quotes: string[] = [];
    for (const land of lands) {
      const abilities = nonManaAbilities({ name: land.name, typeLine: land.type_line, oracleText: land.oracle_text });
      if (abilities.length === 0) continue;
      utility += 1;
      for (const a of abilities) {
        const g = nameAbility(a, land.name);
        if (g.kind === "named") {
          named += 1;
          labels.set(g.label, (labels.get(g.label) ?? 0) + 1);
        } else {
          quoted += 1;
          quotes.push(`${land.name}: "${g.text}"`);
        }
      }
    }
    const total = named + quoted;
    console.log(`nonbasic lands in staging decks: ${lands.length}; utility lands (something besides mana): ${utility}`);
    console.log(`abilities: ${total} — named ${named} (${((100 * named) / total).toFixed(1)}%), quoted ${quoted} (${((100 * quoted) / total).toFixed(1)}%)`);
    console.log("\nnamed, by label:");
    for (const [label, n] of [...labels].sort((a, b) => b[1] - a[1])) console.log(`  ${n}  ${label}`);
    console.log("\nquoted:");
    for (const q of quotes.sort()) console.log(`  ${q}`);
  } finally {
    await pool.end();
  }
})();
