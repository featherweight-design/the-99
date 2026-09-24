/**
 * `pnpm eval:strategy-input --reads overview-dev,overview-2`
 *
 * Builds `runs/strategy-overviews.json` for the tuning `strategy` variant: each deck's stored
 * overview (its strategy steps and Key cards, exactly as the overview read shows them) and the
 * UNIVERSAL staples, the cards `format_staples` lists in at least 12 of its 16 conditions. It sends
 * nothing; staging is read read-only for the staples. A deck whose strategy section was refused
 * gets no strategy lines, and a deck with no Key cards section gets none, rather than invented ones.
 */
import "../lib/env.mjs";

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { ROOT } from "./lib/run.mjs";
import { connectStaging } from "./lib/staging.mjs";
import type { StrategyInput } from "./variants/tuning.mjs";

const { values: args } = parseArgs({ options: { reads: { type: "string" }, "universal-min": { type: "string", default: "12" } } });
if (!args.reads) throw new Error("eval:strategy-input needs --reads <round>[,<round>…], e.g. overview-dev,overview-2");

type Section = { title: string; items?: string[]; refused?: string };
const blind = new URL("blind/", ROOT);
const decks: StrategyInput["decks"] = {};
for (const round of args.reads.split(",")) {
  const pairs = JSON.parse(readFileSync(new URL(`${round}-pairs.json`, blind), "utf8")) as { id: string; data: { answer: { sections: Section[] } } }[];
  const key = JSON.parse(readFileSync(new URL(`${round}-key.json`, blind), "utf8")) as Record<string, { deckId: string }>;
  for (const p of pairs) {
    const at = (title: string) => p.data.answer.sections.find((s) => s.title === title && !s.refused)?.items ?? [];
    decks[key[p.id].deckId] = {
      strategy: at("Core strategy"),
      keyCards: at("Key cards").map((k) => /^\[\[(.*?)\]\]/.exec(k)?.[1] ?? k.split(":")[0]),
    };
  }
}

const db = await connectStaging();
const { sql } = await import("drizzle-orm");
const min = Number(args["universal-min"]);
const universal = ((await db.execute(sql`
  select c.name from format_staples fs join cards c on c.oracle_id = fs.oracle_id
  group by c.name having count(distinct fs.condition) >= ${min} order by c.name
`)).rows as { name: string }[]).map((r) => r.name);

const out: StrategyInput = { universal, decks };
// `runs/` is untracked, so a clean checkout has none until something writes one.
mkdirSync(new URL("runs/", ROOT), { recursive: true });
writeFileSync(new URL("runs/strategy-overviews.json", ROOT), `${JSON.stringify(out, null, 2)}\n`);
console.log(`eval:strategy-input: ${Object.keys(decks).length} decks; universal staples (in ${min}+ conditions): ${universal.join(", ")}`);
process.exit(0);
