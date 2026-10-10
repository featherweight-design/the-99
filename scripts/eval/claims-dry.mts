import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { loadCorpus, toReply } from "./lib/corpus.mjs";
import { connectStaging } from "./lib/staging.mjs";

/**
 * `pnpm tsx scripts/eval/claims-dry.mts <answers.jsonl>...` runs the contract-8 claim checks
 * (`src/lib/synopsis/claims.ts`) over stored corpus answers and calls NO model. Staging, read-only,
 * for each deck's facts. It reports every line a check WOULD have dropped, so a rule is judged on
 * real answers (the false-hit rate) before it ships, and prints how many lines it read.
 */
const db = await connectStaging();
const { sql } = await import("drizzle-orm");
const { loadProfileHead, loadDeckProfileFromHead } = await import("../../src/lib/profile/load");
const { factsFor } = await import("../../src/lib/synopsis/generate");
const { deckNameIndex, normalizeName } = await import("../../src/lib/synopsis/facts");
const { keywordClaims, edictEntry, nonWeakness } = await import("../../src/lib/synopsis/claims");

const cases = new Map(loadCorpus(fileURLToPath(new URL("../../docs/superpowers/eval/corpus/", import.meta.url))).map((c) => [c.id, c]));
let lines = 0;
let hits = 0;
for (const file of process.argv.slice(2)) {
  for (const row of readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as { id: string; reply: unknown })) {
    const c = cases.get(row.id);
    if (!c?.deck.deckId || c.deck.source !== "staging") continue;
    const owner = (await db.execute(sql`select user_id from decks where id = ${c.deck.deckId}`)).rows[0] as { user_id: string } | undefined;
    const head = owner && await loadProfileHead(c.deck.deckId, owner.user_id);
    if (!head) continue;
    const facts = await factsFor(await loadDeckProfileFromHead(head), true);
    const byId = new Map(facts.cards.map((f) => [f.oracleId, f]));
    const deck = new Map([...deckNameIndex(facts.cards)].map(([k, v]) => [k, byId.get(v.oracleId)!]));
    if ((row.reply as { assessment?: unknown }).assessment) throw new Error(`${row.id}: a contract-8 answer holds no tip card names; run validateSynopsisV8 on it instead`);
    const r = toReply(row.reply);
    const all: [string, string, string[]][] = [
      ["overview", r.overview, []],
      ...r.primer.strategy.map((t: string) => ["strategy", t, []] as [string, string, string[]]),
      ...[...r.primer.mulligan.keep, ...r.primer.mulligan.sendBack].map((t: string) => ["mulligan", t, []] as [string, string, string[]]),
      ...r.primer.tips.map((t: { text: string; cards: string[] }) => ["tip", t.text, t.cards] as [string, string, string[]]),
      ...r.keyCards.map((k: { job: string }) => ["keyCard", k.job, []] as [string, string, string[]]),
      ...r.weaknesses.map((t: string) => ["weakness", t, []] as [string, string, string[]]),
    ];
    for (const [section, text, cited] of all) {
      lines++;
      const found: string[] = [];
      for (const h of keywordClaims(text, deck)) found.push(`keyword ${h.keyword} on ${h.card}`);
      if (section === "tip" && edictEntry(text, cited.map((n) => deck.get(normalizeName(n))).filter((x) => !!x) as never, deck)) found.push("edict entry");
      if (section === "weakness" && nonWeakness(text, facts.identity)) found.push("non-weakness CANDIDATE (contract 7 rows carry no topic; contract 8 applies this to mana_and_colors only)");
      for (const f of found) { hits++; console.log(`${row.id} [${section}] ${f}: ${text}`); }
    }
  }
}
console.log(`\n${lines} lines read, ${hits} would be dropped`);
process.exit(0);
