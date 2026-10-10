// measure:source-mana — how many non-land mana sources `sourceProduces` can give a color, over the
// catalog's fresh labels (a landcycler is counted as neither). READ-ONLY, against STAGING. The mana addendum's ledger item 5: if the share
// whose color cannot be read is large, the card should draw them again; this prints the share, per
// ramp kind, and lists the unreadable cards by name. `MEASURE_SOURCE_LIMIT` caps each list (default 60).
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { isLandFace } from "../src/lib/cards/facet";
import { freshLabels } from "../src/lib/labels/read";
import type { RampKind } from "../src/lib/labels/types";
import { makesNoManaSource, sourceProduces } from "../src/lib/mana/supply";

neonConfig.webSocketConstructor = ws;

const { THE_99_NEON_STAGING_DIRECT } = requireEnv(["THE_99_NEON_STAGING_DIRECT"]);
const pool = new Pool({ connectionString: THE_99_NEON_STAGING_DIRECT });
const limit = Number(process.env.MEASURE_SOURCE_LIMIT ?? 60);
const KINDS: RampKind[] = ["tapsForMana", "fetchesLand"];
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
    for (const [id, jobs] of fresh) {
      const r = byId.get(id)!;
      if (isLandFace(r.type_line)) continue;
      const ramp = jobs.find((j) => j.kind === "ramp");
      if (!ramp) continue;
      const kind = (ramp as { rampKind?: RampKind | null }).rampKind ?? null;
      if (kind === null || !KINDS.includes(kind)) continue;
      const key = kind;
      const t = tally.get(key) ?? { read: 0, unreadable: [] };
      const got = sourceProduces({ name: r.name, typeLine: r.type_line, oracleText: r.oracle_text }, kind, ALL);
      if (got.length) t.read++;
      else if (makesNoManaSource({ oracleText: r.oracle_text })) continue;
      else t.unreadable.push(`${r.name} :: ${(r.oracle_text ?? "").replace(/\n/g, " / ").slice(0, 160)}`);
      tally.set(key, t);
    }
    let read = 0;
    let bad = 0;
    for (const [k, t] of tally) {
      console.log(`${k}: ${t.read} read, ${t.unreadable.length} unreadable`);
      read += t.read;
      bad += t.unreadable.length;
    }
    console.log(`total: ${read + bad} sources, ${bad} unreadable (${((100 * bad) / Math.max(1, read + bad)).toFixed(1)}%)`);
    for (const [k, t] of tally) {
      console.log(`\n== ${k} unreadable (${t.unreadable.length}) ==`);
      for (const line of t.unreadable.slice(0, limit)) console.log(line);
    }
  } finally {
    await pool.end();
  }
})();
