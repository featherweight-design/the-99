/**
 * `pnpm eval:overview-read --from <firstRunId> --repair <repairRunId> --cell sonnet-low --variant budgets-plus --round 2 --title <shown title>`
 *
 * Builds Hugh's ABSOLUTE read of the overview (orchestrator, 2026-09-24: "would you show this to
 * your pod?"): one overview per held-out deck, trial 0, exactly as a player would see it under the
 * contract he picked, A+B. It sends nothing. Facts are rebuilt read-only from staging with the
 * current `factsFor` (contract v2), as the repair run was judged.
 *
 * Per section, the same rule the A+B tally in `repair.mts` counts: the FIRST answer's section when
 * the drop-the-line rule passes it (its failing lines dropped); otherwise the REPAIR's section when
 * that section was refused now, was repaired then, and the repair passes the rule; otherwise the
 * app's refused state, in the app's own words. Nothing on the page says which of the three
 * happened, which model wrote it, or what it cost.
 *
 * Writes `blind/overview-<round>-pairs.json` for Claude to seed into the page's `pairs` collection
 * with the Artifact tool's `write_db`, and `blind/overview-<round>-key.json` (untracked) naming
 * where each shown section came from, for the report.
 */
import "../lib/env.mjs";

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

import { synopsisCopy as copy } from "../../src/lib/copy/synopsis";
import type { Got } from "./lib/batch.mjs";
import { DESIGN_MINIMUMS, dropLineContent, dropLineRule, type SectionPass } from "./lib/line-rule.mjs";
import { parseReply } from "./lib/request.mjs";
import { ROOT } from "./lib/run.mjs";
import { openSynopsis } from "./lib/synopsis-app.mjs";
import { SYNOPSIS_VARIANTS } from "./variants/synopsis.mjs";

const { values: args } = parseArgs({
  options: {
    from: { type: "string" },
    repair: { type: "string" },
    cell: { type: "string" },
    variant: { type: "string" },
    round: { type: "string", default: "2" },
    set: { type: "string", default: "heldOut" },
    title: { type: "string" },
  },
});
if (!args.from || !args.cell || !args.variant || !args.title) {
  throw new Error("eval:overview-read needs --from, --cell, --variant and --title (and --repair for A+B)");
}

type Facts = import("../../src/lib/synopsis/facts").SynopsisFacts;
type Reply = import("../../src/lib/synopsis/response-schema").SynopsisResponse;
type SectionId = import("../../src/lib/synopsis/types").SectionId;

const app = await openSynopsis();
const runs = new URL("runs/", ROOT);
const readJson = <T,>(run: string, file: string) => JSON.parse(readFileSync(new URL(`${run}/${file}`, runs), "utf8")) as T;

const meta = readJson<{ split: { heldOut: string[]; dev: string[] }; decks: { deckId: string; name: string }[] }>(args.from, "meta.json");
const stored = new Map(readJson<{ deckId: string; facts: Facts }[]>(args.from, "prepared.json").map((p) => [p.deckId, p.facts]));
const { facts: factsOf } = await app.freshFacts(stored, SYNOPSIS_VARIANTS[args.variant]);
const firsts = new Map(readFileSync(new URL(`${args.from}/rows.jsonl`, runs), "utf8").split("\n").filter(Boolean)
  .map((l) => JSON.parse(l) as { deckId: string; cell: string; variant: string; trial: number; reply: Reply | null })
  .filter((r) => r.cell === args.cell && r.variant === args.variant && r.trial === 0)
  .map((r) => [r.deckId, r]));

// The repair must have been made FROM this run, for this cell and variant, and judged under
// rebuilt facts as this read is: replies judged under other inputs would pair with the wrong answer.
// Without --repair the read is contract A alone: the first write, its failing lines dropped.
const repairMeta = !args.repair ? null : readJson<{ args: { from?: string; cell?: string; variant?: string; "fresh-facts"?: boolean } }>(args.repair, "meta.json").args;
const mismatch = !repairMeta ? [] : (["from", "cell", "variant"] as const).filter((k) => repairMeta[k] !== args[k]);
if (repairMeta && (mismatch.length > 0 || repairMeta["fresh-facts"] !== true)) {
  throw new Error(`repair run ${args.repair} was not made from ${args.from} / ${args.cell} / ${args.variant} with --fresh-facts (differs on ${[...mismatch, ...(repairMeta["fresh-facts"] ? [] : ["fresh-facts"])].join(", ")})`);
}

// The repair run's replies, keyed through its own prepared list (custom ids are positions in it).
const sent = args.repair ? readJson<{ deckId: string; trial: number; refused: SectionId[] }[]>(args.repair, "prepared.json") : [];
const raw = new Map<string, Got[]>();
for (const pass of args.repair ? ["a1", "a2"] : []) {
  const f = new URL(`${args.repair}/raw-${pass}.jsonl`, runs);
  if (!existsSync(f)) continue;
  for (const g of readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Got)) {
    const id = g.customId.replace(/-r$/, "");
    raw.set(id, [...(raw.get(id) ?? []), g]);
  }
}
const repairs = new Map<string, { reply: Reply | null; refused: SectionId[] }>();
sent.forEach((p, i) => {
  if (p.trial !== 0) return;
  let reply: Reply | null = null;
  for (const t of raw.get(`repair-d${String(i).padStart(3, "0")}`) ?? []) {
    if (!t.ok) continue;
    const parsed = parseReply(app.schema, t.message);
    if (parsed.ok) { reply = parsed.value; break; }
  }
  repairs.set(p.deckId, { reply, refused: p.refused });
});

/** A refused section carries the app's whole refused slot: its badge, its sentence and its count. */
type Shown = { title: string; paragraph?: string; items?: string[]; refused?: string; badge?: string; detail?: string };
const SECTIONS: SectionId[] = ["overview", "primer", "keyCards", "weaknesses"];
const pairs: { id: string; data: Record<string, unknown> }[] = [];
const key: Record<string, { deckId: string; source: Record<SectionId, "first" | "repair" | "refused"> }> = {};
let allFour = 0;

for (const [order, deckId] of (args.set === "dev" ? meta.split.dev : meta.split.heldOut).entries()) {
  const facts = factsOf.get(deckId)!;
  const first = firsts.get(deckId);
  if (!first) throw new Error(`deck ${deckId} has no trial-0 answer in ${args.from}`);
  const firstCat = first.reply ? await app.catalog(first.reply, facts) : null;
  const firstPass: SectionPass | null = first.reply && firstCat ? dropLineRule(first.reply, facts, firstCat, DESIGN_MINIMUMS) : null;
  const shippedRefused = first.reply && firstCat
    ? app.validate(first.reply, facts, firstCat).verdicts.filter((v) => v.status === "refused").map((v) => v.section)
    : SECTIONS;
  const rep = repairs.get(deckId);
  const repCat = rep?.reply ? await app.catalog(rep.reply, facts) : null;
  const repPass = rep?.reply && repCat ? dropLineRule(rep.reply, facts, repCat, DESIGN_MINIMUMS) : null;
  // The verdict a refused section is shown with: the repair's when the section was repaired, else the first write's.
  const firstVerdicts = first.reply && firstCat ? app.validate(first.reply, facts, firstCat).verdicts : [];
  const repVerdicts = rep?.reply && repCat ? app.validate(rep.reply, facts, repCat).verdicts : [];
  // A repair with no parseable reply leaves the first write's verdict standing, as the app keeps it.
  const verdictOf = (s: SectionId) => (rep?.reply && rep.refused.includes(s) ? repVerdicts : firstVerdicts).find((v) => v.section === s);

  const source = {} as Record<SectionId, "first" | "repair" | "refused">;
  const content = {} as Record<SectionId, ReturnType<typeof dropLineContent> | null>;
  for (const s of SECTIONS) {
    if (firstPass?.[s]) { source[s] = "first"; content[s] = dropLineContent(first.reply!, facts, firstCat!); }
    else if (rep && repPass?.[s] && rep.refused.includes(s) && shippedRefused.includes(s)) { source[s] = "repair"; content[s] = dropLineContent(rep.reply!, facts, repCat!); }
    else { source[s] = "refused"; content[s] = null; }
  }
  if (SECTIONS.every((s) => source[s] !== "refused")) allFour += 1;

  const t = copy.modal;
  const refused = (title: string, s: SectionId): Shown => {
    const v = verdictOf(s);
    return {
      title,
      badge: copy.notWritten,
      refused: s === "overview" ? copy.overviewRefused : copy.sectionRefused,
      detail: v ? copy.failedCount(v.failed, v.total) : undefined,
    };
  };
  const sections: Shown[] = [];
  sections.push(content.overview ? { title: t.sections.overview, paragraph: content.overview.overview } : refused(t.sections.overview, "overview"));
  if (content.primer) {
    const p = content.primer.primer;
    sections.push({ title: t.primer.strategy, items: p.strategy });
    sections.push({ title: `${t.primer.mulligan}: ${t.keep}`, items: p.mulligan.keep });
    sections.push({ title: `${t.primer.mulligan}: ${t.sendBack}`, items: p.mulligan.sendBack });
    sections.push({ title: t.primer.tips, items: p.tips.map((x) => x.text) });
  } else sections.push(refused(t.sections.primer, "primer"));
  sections.push(content.keyCards ? { title: t.sections.keyCards, items: content.keyCards.keyCards.map((k) => `[[${k.card.replace(/^\[\[(.*)\]\]$/, "$1")}]]: ${k.job}`) } : refused(t.sections.keyCards, "keyCards"));
  sections.push(content.weaknesses ? { title: t.sections.weaknesses, items: content.weaknesses.weaknesses } : refused(t.sections.weaknesses, "weaknesses"));

  const id = `overview-${args.round}-${String(order + 1).padStart(2, "0")}`;
  pairs.push({
    id,
    data: {
      feature: "synopsis",
      mode: "absolute",
      round: `overview-${args.round}`,
      roundTitle: args.title,
      order: order + 1,
      deckName: meta.decks.find((d) => d.deckId === deckId)?.name ?? "Untitled deck",
      commander: facts.commanders.join(" and "),
      decklist: facts.cards.map((c) => ({ name: c.name, quantity: c.quantity })).sort((a, b) => a.name.localeCompare(b.name)),
      answer: { status: "sections", sections },
    },
  });
  key[id] = { deckId, source };
}

const out = new URL("blind/", ROOT);
mkdirSync(out, { recursive: true });
writeFileSync(new URL(`overview-${args.round}-pairs.json`, out), `${JSON.stringify(pairs, null, 2)}\n`);
writeFileSync(new URL(`overview-${args.round}-key.json`, out), `${JSON.stringify(key, null, 2)}\n`);
console.log(`eval:overview-read: ${pairs.length} overviews for overview-${args.round}; all four sections shown on ${allFour}`);
process.exit(0);
