// Read-only, staging: latency and output of the any-size combo facts per deck.
//   pnpm tsx scripts/eval/measure-combos.mts "Counter Intelligence" "Wizards" ...   (no args: every deck)
import { connectStaging } from "./lib/staging.mjs";
import type { ComboPieceRow } from "../../src/lib/synopsis/combo-facts";

const argv = process.argv.slice(2);
const showAll = argv.includes("--all");
const needles = argv.filter((a) => a !== "--all");
const db = await connectStaging();
const { sql } = await import("drizzle-orm");
const { loadProfileHead, loadDeckProfileFromHead } = await import("../../src/lib/profile/load");
const { loadComboFacts, anySizeComboQuery } = await import("../../src/lib/synopsis/combo-facts");

const all = (await db.execute(sql`select id, user_id, name from decks order by name`)).rows as { id: string; user_id: string; name: string }[];
const decks = needles.length ? all.filter((d) => needles.some((n) => d.name.toLowerCase().includes(n.toLowerCase()))) : all;
const times: number[] = [];
for (const d of decks) {
  const head = await loadProfileHead(d.id, d.user_id);
  if (!head) continue;
  const profile = await loadDeckProfileFromHead(head);
  const t0 = performance.now();
  const out = await loadComboFacts(profile);
  const ms = Math.round(performance.now() - t0);
  times.push(ms);
  if (showAll) {
    // Uncapped: every assembled combo, to read recall against the cap.
    const present = [...new Set([...profile.cards.map((c) => c.oracleId), ...profile.commanderOracleIds])];
    const rows = (await db.execute(anySizeComboQuery(present, profile.commanderOracleIds))).rows as ComboPieceRow[];
    const byV = new Map<string, ComboPieceRow[]>();
    for (const r of rows) byV.set(r.variant_id, [...(byV.get(r.variant_id) ?? []), r]);
    for (const ps of byV.values()) if (ps.every((p) => p.held)) console.log(`  [all] ${ps.length}p ${ps.map((p) => p.name).sort().join(" + ")} -> ${ps[0].produces.slice(0, 2).join(", ")}`);
  }
  console.log(`\n${d.name}: ${ms}ms, ${out ? `${out.combos.length} combos, ${out.nearCombos.length} near` : "READ FAILED"}`);
  for (const c of out?.combos ?? []) console.log(`  + ${c.pieces.join(" + ")} -> ${c.produces.slice(0, 3).join(", ")}${c.usesCommander ? " [cmdr]" : ""}`);
  for (const n of out?.nearCombos ?? []) console.log(`  ~ has ${n.have}; lacks ${n.missing}`);
}
times.sort((a, b) => a - b);
if (times.length) console.log(`\n${times.length} decks, latency median ${times[Math.floor(times.length / 2)]}ms, max ${times[times.length - 1]}ms`);
process.exit(0);
