/**
 * `pnpm eval:cuts-blind-score <answers.json> [--key <key.json>]` — scores Hugh's blind Proposed cuts
 * ratings per source. Reads no database and sends nothing.
 *
 * Input: the JSON the sheet exports (`cuts-<round>-answers.json`) and the key
 * `eval:cuts-blind` wrote beside the sheet (`blind/cuts-<round>-key.json`, gitignored). The two must
 * carry the same `sheetHash`, so ratings given on one build are never scored against another's key.
 *
 * Per source (`model`, `free`, `random`), over every card it proposed:
 *  - PRECISION: the share of its picks Hugh rated "Cut it". Strict counts a Maybe as not a cut;
 *    the lenient figure counts a Maybe as half.
 *  - RECALL: the share of every card Hugh rated "Cut it" on the sheet that this source proposed.
 *    The sheet is the pool of all three sources' picks, so this is recall WITHIN THE POOL: a card
 *    Hugh would cut that no source offered is never seen, and no source is charged for it.
 *  - LIFT: the source's strict precision over random's, the chance baseline drawn from the same
 *    cuttable cards.
 * A card two sources proposed counts for both. Reason flags (the non-blind section) are counted
 * against the model's kept reasons. `hughCut` marks a card his own next version dropped, reported
 * as a side figure only: that list is the weak truth set this sheet exists to replace.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { scoreSources, type BlindAnswers as Answers, type BlindKey as Key, type SourceScore } from "./lib/cuts-blind-score.mjs";

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: { key: { type: "string" } },
});
const answersPath = positionals[0];
if (!answersPath) throw new Error("usage: pnpm eval:cuts-blind-score <answers.json> [--key <key.json>]");

const answers = JSON.parse(readFileSync(answersPath, "utf8")) as Answers;
const keyPath = args.key ?? new URL(`../../docs/superpowers/eval/blind/${answers.round}-key.json`, import.meta.url).pathname;
const key = JSON.parse(readFileSync(keyPath, "utf8")) as Key;
if (answers.sheetHash !== key.sheetHash) throw new Error("these answers were given on a different build of the sheet than this key describes; refusing");

const pct = (x: number | null) => (x === null ? "n/a" : `${Math.round(100 * x)}%`);
const ids = Object.keys(key.cards);
const unrated = ids.filter((id) => !answers.ratings[id]).length;
const decks = [...new Set(ids.map((id) => key.cards[id].deck))];

console.log(`# Proposed cuts blind read: ${key.round}\n`);
console.log(`${ids.length} cards across ${decks.length} decks; ${ids.length - unrated} rated${unrated ? ` (${unrated} unrated, skipped)` : ""}${answers.submittedAt ? `, submitted ${answers.submittedAt}` : ", NOT submitted"}.\n`);
const table = (title: string, rows: SourceScore[]) => {
  console.log(`## ${title}\n`);
  console.log("| Source | Picks | Cut it | Maybe | Keep it | Precision | Precision, Maybe as half | Recall in pool | Lift over random |");
  console.log("|---|---|---|---|---|---|---|---|---|");
  for (const r of rows) console.log(`| ${r.source} | ${r.picks} | ${r.cut} | ${r.maybe} | ${r.keep} | ${pct(r.precision)} | ${pct(r.lenient)} | ${pct(r.recall)} | ${r.lift === null ? "n/a" : `${r.lift.toFixed(2)}x`} |`);
  console.log("");
};
table("All decks", scoreSources(key.cards, answers.ratings));
for (const d of decks) {
  table(d, scoreSources(Object.fromEntries(ids.filter((id) => key.cards[id].deck === d).map((id) => [id, key.cards[id]])), answers.ratings));
}

const modelIds = ids.filter((id) => key.cards[id].sources.includes("model"));
const flagged = modelIds.filter((id) => answers.reasonFlags[id]?.falseOrInvented);
console.log(`## The model's reasons\n`);
console.log(`${flagged.length} of ${modelIds.length} reasons flagged false or invented${answers.submittedAt ? "" : " (the sheet was not submitted, so the reasons may not have been read)"}.`);
for (const id of flagged) console.log(`- ${key.cards[id].deck}: ${key.cards[id].name}${answers.reasonFlags[id].note ? `: ${answers.reasonFlags[id].note}` : ""}`);
const hugh = ids.filter((id) => key.cards[id].hughCut);
console.log(`\nSide figure: ${hugh.length} cards on the sheet were dropped by your own next version; you rated ${hugh.filter((id) => answers.ratings[id] === "cut").length} of them "Cut it" here.`);
