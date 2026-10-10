// measure:land-reader — sweeps manaSupply()'s land attribution (`landProduces`) over every land in the
// catalog. READ-ONLY, against STAGING (the catalog both databases share, ingested from one fetch).
//
// It lists the lands whose oracle text mentions adding mana, or searching for a land, but which are
// credited only colorless or nothing: the shape of a pattern the reader does not know. A deck's
// colors are all five, so an any-color land is credited every color and falls out of the list.
// The population is `manaSupply`'s own: a card whose FRONT face is a land (a transform card with a land
// back, or a modal DFC with one, is a spell row there). `MEASURE_LAND_LIMIT` caps the printed rows per bucket (default 200).
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { isLandFace } from "../src/lib/cards/facet";
import { landProduces } from "../src/lib/mana/supply";

neonConfig.webSocketConstructor = ws;

const { THE_99_NEON_STAGING_DIRECT } = requireEnv(["THE_99_NEON_STAGING_DIRECT"]);
const pool = new Pool({ connectionString: THE_99_NEON_STAGING_DIRECT });
const limit = Number(process.env.MEASURE_LAND_LIMIT ?? 200);

const strip = (t: string) => t.replace(/\([^)]*\)/g, "");

void (async () => {
  try {
    const { rows } = await pool.query<{ name: string; type_line: string; oracle_text: string | null }>(
      `select name, type_line, oracle_text from cards where type_line ~* 'land' and commander_legal`,
    );
    const lands = rows.filter((r) => isLandFace(r.type_line));
    const buckets = { unattributed: [] as string[], colorlessOnly: [] as string[] };
    let flagged = 0;
    for (const r of lands) {
      const text = strip(r.oracle_text ?? "");
      const adds = /\badd\b/i.test(text);
      const searches = /search your library for[^.]*\bland/i.test(text);
      if (!adds && !searches) continue;
      flagged++;
      const got = landProduces({ name: r.name, typeLine: r.type_line, oracleText: r.oracle_text }, ["W", "U", "B", "R", "G"]);
      const bucket = got.length === 0 ? buckets.unattributed : got.every((c) => c === "C") ? buckets.colorlessOnly : null;
      if (bucket) bucket.push(`${r.name} :: ${text.replace(/\n/g, " / ").slice(0, 200)}`);
    }
    console.log(`lands ${lands.length}, mention add/search ${flagged}`);
    console.log(`unattributed ${buckets.unattributed.length}, colorless-only ${buckets.colorlessOnly.length}`);
    for (const [k, v] of Object.entries(buckets)) {
      console.log(`\n== ${k} (${v.length}) ==`);
      for (const line of v.slice(0, limit)) console.log(line);
    }
  } finally {
    await pool.end();
  }
})();
