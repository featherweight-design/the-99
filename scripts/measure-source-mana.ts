// measure:source-mana — how many non-land mana sources `sourceProduces` can give a color, over the
// catalog's fresh labels (a landcycler is counted as neither). READ-ONLY, against STAGING. The mana addendum's ledger item 5: if the share
// whose color cannot be read is large, the card should draw them again; this prints the share, per
// ramp kind, and lists the unreadable cards by name. `MEASURE_SOURCE_LIMIT` caps each list (default 60).
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { isLandFace } from "../src/lib/cards/facet";
import { freshLabels } from "../src/lib/labels/read";
import { sourceKindsOf } from "../src/lib/mana/source-kinds";
import { makesNoManaSource, sourceProduces } from "../src/lib/mana/supply";

neonConfig.webSocketConstructor = ws;

const { THE_99_NEON_STAGING_DIRECT } = requireEnv(["THE_99_NEON_STAGING_DIRECT"]);
const pool = new Pool({ connectionString: THE_99_NEON_STAGING_DIRECT });
const limit = Number(process.env.MEASURE_SOURCE_LIMIT ?? 60);
const ALL = ["W", "U", "B", "R", "G"];

void (async () => {
  try {
    const { rows } = await pool.query(`
      select l.oracle_id, l.labels, l.model, l.prompt_version, l.input_hash,
             c.name, c.mana_cost, c.type_line, c.oracle_text, c.layout
        from card_labels l join cards c on c.oracle_id = l.oracle_id
       where c.commander_legal`);
    const fresh = freshLabels(rows);
    const byId = new Map(rows.map((r) => [r.oracle_id, r]));
    const tally = new Map<string, { read: number; unreadable: string[] }>();
    // A card counts ONCE in the total, whatever its kinds; under each kind it carries it also counts in that
    // kind's line, so the kind lines can add to more than the total. Read means any of its parsers gave a color.
    let total = 0;
    let unreadableTotal = 0;
    for (const [id, jobs] of fresh) {
      const r = byId.get(id)!;
      if (isLandFace(r.type_line)) continue;
      const kinds = sourceKindsOf(jobs);
      if (kinds.length === 0) continue;
      const card = { name: r.name, typeLine: r.type_line, oracleText: r.oracle_text, layout: r.layout };
      if (sourceProduces(card, kinds, ALL).length === 0 && makesNoManaSource(card)) continue;
      total++;
      const readAll = sourceProduces(card, kinds, ALL).length > 0;
      if (!readAll) unreadableTotal++;
      for (const kind of kinds) {
        const t = tally.get(kind) ?? { read: 0, unreadable: [] };
        if (sourceProduces(card, [kind], ALL).length) t.read++;
        else t.unreadable.push(`${r.name} :: ${(r.oracle_text ?? "").replace(/\n/g, " / ").slice(0, 160)}`);
        tally.set(kind, t);
      }
    }
    for (const [k, t] of tally) console.log(`${k}: ${t.read} read, ${t.unreadable.length} unreadable`);
    console.log(`total: ${total} source cards, ${unreadableTotal} unreadable (${((100 * unreadableTotal) / Math.max(1, total)).toFixed(1)}%)`);
    for (const [k, t] of tally) {
      console.log(`\n== ${k} unreadable (${t.unreadable.length}) ==`);
      for (const line of t.unreadable.slice(0, limit)) console.log(line);
    }
  } finally {
    await pool.end();
  }
})();
