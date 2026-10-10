import { connectStaging } from "./lib/staging.mjs";

/**
 * Prints the v2 facts and the prompt size for staging decks whose name matches an argument, and
 * calls NO model. Read-only (the staging harness enforces it). Usage:
 *   pnpm tsx scripts/eval/facts-v2-dry.mts Baral Kilo Gishath
 */
const db = await connectStaging();
const { sql } = await import("drizzle-orm");
const { loadProfileHead, loadDeckProfileFromHead } = await import("../../src/lib/profile/load");
const { factsFor } = await import("../../src/lib/synopsis/generate");
const { buildSynopsisPrompt, v2FactLines } = await import("../../src/lib/synopsis/prompt");

const rows = (await db.execute(sql`select id, user_id, name from decks order by name`)).rows as { id: string; user_id: string; name: string }[];
for (const needle of process.argv.slice(2)) {
  for (const d of rows.filter((r) => r.name.toLowerCase().includes(needle.toLowerCase()))) {
    const head = await loadProfileHead(d.id, d.user_id);
    if (!head) continue;
    const facts = await factsFor(await loadDeckProfileFromHead(head), true);
    const off = buildSynopsisPrompt(facts);
    const on = buildSynopsisPrompt(facts, undefined, { v2: true });
    console.log(`\n== ${d.name} (${d.id})\nchars off ${off.system.length + off.user.length}, on ${on.system.length + on.user.length}`);
    console.log(v2FactLines(facts).join("\n"));
  }
}
process.exit(0);
