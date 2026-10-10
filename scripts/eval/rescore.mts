/**
 * `pnpm eval:rescore --run <runId>` — scores a run's stored replies again with the real accept
 * contract (the two lists since prompt v8: a run made under the swap contract no longer parses), and adds each row's `keptSuggestions` and the
 * run's `prepared.json`. It sends nothing to the model.
 *
 * The packs are rebuilt from staging, read-only, by the same path the run used. A deck edited
 * since the run would give a different pack, so each re-score is checked against the outcome, the
 * kept count and the drops the run recorded. Any disagreement is printed, and the run's rows are
 * left untouched.
 */
import "../lib/env.mjs";

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { openTuning, type OverlayDeck } from "./lib/tuning-app.mjs";
import { TUNING_VARIANTS } from "./variants/tuning.mjs";

const { values: args } = parseArgs({ options: { run: { type: "string" } } });
if (!args.run) throw new Error("eval:rescore needs --run <runId>");

const dir = new URL(`../../docs/superpowers/eval/runs/${args.run}/`, import.meta.url);
const meta = JSON.parse(readFileSync(new URL("meta.json", dir), "utf8")) as {
  args: { variant: string; overlay: boolean };
  decks: { deckId: string }[];
};
const rowsPath = new URL("rows.jsonl", dir);
const rows = readFileSync(rowsPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

const app = await openTuning();
const overlay = meta.args.overlay
  ? (JSON.parse(readFileSync(new URL("fixtures/evidence-overlay.json", import.meta.url), "utf8")) as { decks: OverlayDeck[] }).decks
  : null;
const prepared = await app.prepare(meta.decks.map((d) => d.deckId), TUNING_VARIANTS[meta.args.variant], overlay);
const packOf = new Map(prepared.map((p) => [p.deckId, p.pack]));

const withReply = rows.filter((r) => r.reply);
const scored = await app.score(withReply.map((r) => ({ pack: packOf.get(r.deckId)!, value: r.reply })));
const mismatches: string[] = [];
withReply.forEach((r, i) => {
  const s = scored[i];
  if (s.outcome !== r.outcome || s.kept !== r.kept || JSON.stringify(s.drops) !== JSON.stringify(r.drops)) {
    mismatches.push(`${r.cell} ${r.deckId} t${r.trial}: run ${r.outcome}/${r.kept} ${r.drops}, now ${s.outcome}/${s.kept} ${s.drops}`);
  }
  r.keptSuggestions = s.keptSuggestions;
});

if (mismatches.length > 0) {
  console.error(`eval:rescore: ${mismatches.length} rows score differently now; rows left untouched:\n${mismatches.join("\n")}`);
  process.exit(1);
}
writeFileSync(rowsPath, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
if (!existsSync(new URL("prepared.json", dir))) writeFileSync(new URL("prepared.json", dir), `${JSON.stringify(prepared)}\n`);
console.log(`eval:rescore: ${withReply.length} rows re-scored, all agree with the run; keptSuggestions added`);
process.exit(0);
