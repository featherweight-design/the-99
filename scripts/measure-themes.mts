// `pnpm measure:themes`: what `cardThemes` does to the live catalog. Read-only.
//
// It prints each theme's count over the Commander-legal catalog and the named cards it was checked
// against, so the vocabulary Hugh approved (2026-09-25) can be re-measured instead of recalled. A theme is
// added only with a count and test cards; this is where the count comes from. `measure:tutors` is the
// precedent: a classifier built from a named fixture agrees with that fixture and says nothing about the
// cards nobody listed, so the sweep is what gets read.
//
// Point DATABASE_URL at staging to measure (AGENTS.md: measure on staging, mutate on local-dev).

import { requireEnv } from "./lib/env.mjs";
requireEnv(["DATABASE_URL"]);
import { sql } from "drizzle-orm";
import { db } from "../src/db";
import { cardThemes, type Theme } from "../src/lib/recs/themes";
import { loadCreatureTypes } from "../src/lib/swaps/gather";

// The cards each rule was sized against over the three passes (themes.test.ts holds their text).
const KNOWN = [
  "Runadi, Behemoth Caller", "Hardened Scales", "Craterhoof Behemoth", "Swiftfoot Boots", "Maddening Cacophony",
  "Fraying Sanity", "Lotus Cobra", "Tireless Provisioner", "Gishath, Sun's Avatar", "Kindred Discovery", "Mulldrifter",
  "Viscera Seer", "Blood Artist", "Eternal Witness", "Ghostly Flicker", "Young Pyromancer", "Zulaport Cutthroat",
  "Lord of Atlantis", "Herald's Horn", "Restoration Angel", "Omnath, Locus of Rage",
];

type Row = { name: string; type_line: string; oracle_text: string | null };

void (async () => {
  const rows = (await db.execute<Row>(sql`select name, type_line, oracle_text from cards where commander_legal`)).rows;
  // The catalog's own creature subtypes, read by the app's own query: what the tribal rule is handed there.
  const types = await loadCreatureTypes();
  const isType = (w: string) => types.has(w);

  const counts = new Map<Theme, number>();
  const caught = new Map<Theme, string[]>();
  let none = 0;
  for (const r of rows) {
    const themes = cardThemes({ typeLine: r.type_line, oracleText: r.oracle_text }, isType);
    if (themes.length === 0) none++;
    for (const t of themes) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
      if (KNOWN.includes(r.name)) caught.set(t, [...(caught.get(t) ?? []), r.name.split(",")[0]]);
    }
  }
  console.log(`${rows.length} Commander-legal cards, ${types.size} creature types, ${none} with no theme\n`);
  for (const [t, n] of [...counts].sort((a, b) => b[1] - a[1])) {
    console.log(`${t.padEnd(14)} ${String(n).padStart(6)}  ${(caught.get(t) ?? []).join(", ")}`);
  }
  process.exit(0);
})();
