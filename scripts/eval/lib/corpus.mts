import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

/**
 * The Overview accuracy corpus (plan 2026-10-10-overview-accuracy.md, sections 5 and 11): one JSON
 * file per deck holding the GOLD, atomised and paraphrased from Hugh's comparison with an outside
 * analyser. The outside text itself is never stored (third-party), only the claims.
 *
 * NAMES ARE SUBSTRINGS. A gold card is written as much of its name as identifies it ("Zhulodok",
 * "Naru Meha"), matched case-insensitively against the answer with `[[marks]]` removed, because a
 * double-faced or titled card is named in prose by its front. Nothing here needs a card database.
 *
 * WHAT THE SCORER WILL NOT DO is report a rate over claims it did not grade. A claim is graded by
 * code only where the corpus says what is true (`wrong`, `right`); every other claim of ours is
 * `ungraded`, left for a person, and no figure is computed from the ungraded.
 */

const names = z.array(z.string().min(2)).min(1);

export const corpusCaseSchema = z.object({
  id: z.string().min(1),
  deck: z.object({
    name: z.string(),
    deckId: z.string().uuid().nullable(),
    /** Where `deckId` lives. Production is never written to by this harness, and is read by nobody here. */
    source: z.enum(["staging", "production"]),
    /** The list fingerprint (`listFingerprint`) the gold was written against; null until pinned. */
    listFingerprint: z.string().nullable(),
  }),
  gold: z.object({
    /** Assembled combos and loops. Named in the overview or the strategy lines = recalled. */
    combos: z.array(z.object({ cards: names, produces: z.string(), forced: z.boolean().default(false) })).default([]),
    /** Cards a good Key cards section names (win conditions, engine enablers). */
    keyCards: z.array(z.string().min(2)).default([]),
    /** A weakness is covered when one weakness line names any of `names` (hate pieces or phrases). */
    weaknesses: z.array(z.object({ topic: z.string(), names })).default([]),
    /** A Mulligan keep or send-back line naming any piece ties the advice to the deck's engine. */
    mulliganPieces: z.array(z.string().min(2)).default([]),
    /** Claims known to be false. A claim naming all `cards` (when given) and matching `pattern` (when given). */
    wrong: z.array(z.object({
      id: z.string(),
      cards: z.array(z.string().min(2)).default([]),
      pattern: z.string().optional(),
      /** Only claims in these sections are judged: a card can be a wrong KEY card and a right WEAKNESS warning. */
      sections: z.array(z.enum(["overview", "strategy", "mulligan", "tip", "keyCard", "weakness"])).optional(),
      why: z.string(),
    }).refine((w) => w.cards.length > 0 || w.pattern, "a wrong-claim rule needs cards or a pattern")).default([]),
    /** Claims known to be good: a claim naming all `cards` is correct. Also the regression anchors. */
    right: z.array(z.object({ id: z.string(), cards: names, note: z.string() })).default([]),
  }),
});
export type CorpusCase = z.infer<typeof corpusCaseSchema>;

/** The slice of a synopsis reply the scorer reads (a reply from the model, before validation). */
export type Reply = {
  overview: string;
  primer: { strategy: string[]; mulligan: { keep: string[]; sendBack: string[] }; tips: { cards: string[]; text: string }[] };
  keyCards: { card: string; claims?: string[]; job: string }[];
  weaknesses: string[];
};

export type ClaimSection = "overview" | "strategy" | "mulligan" | "tip" | "keyCard" | "weakness";
export type Claim = { section: ClaimSection; text: string; cards: string[] };
export type Grade = "correct" | "wrong" | "ungraded";

const strip = (t: string) => t.replace(/\[\[([^\]]+)\]\]/g, "$1").toLowerCase();
const names_ = (t: string) => [...t.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]!);
export const names_in = (text: string, cards: readonly string[]) => {
  const t = strip(text);
  return cards.filter((c) => t.includes(c.toLowerCase()));
};
const namesAll = (text: string, cards: readonly string[]) => cards.length > 0 && names_in(text, cards).length === cards.length;

/** Every sentence-sized assertion in a reply, each with the cards it marks. */
export function claimsOf(reply: Reply): Claim[] {
  const out: Claim[] = [];
  for (const s of reply.overview.split(/(?<=[.!?])\s+/).filter(Boolean)) out.push({ section: "overview", text: s, cards: names_(s) });
  for (const s of reply.primer.strategy) out.push({ section: "strategy", text: s, cards: names_(s) });
  for (const s of [...reply.primer.mulligan.keep, ...reply.primer.mulligan.sendBack]) out.push({ section: "mulligan", text: s, cards: names_(s) });
  for (const t of reply.primer.tips) out.push({ section: "tip", text: t.text, cards: [...new Set([...t.cards, ...names_(t.text)])] });
  for (const k of reply.keyCards) out.push({ section: "keyCard", text: `${k.card}: ${k.job}`, cards: [k.card] });
  for (const s of reply.weaknesses) out.push({ section: "weakness", text: s, cards: names_(s) });
  return out;
}

/** A wrong rule beats a right one: a sentence that names the good pair and says something false is false. */
export function gradeClaim(c: Claim, gold: CorpusCase["gold"]): { grade: Grade; ruleId?: string } {
  const claimText = `${c.text} ${c.cards.join(" ")}`;
  for (const w of gold.wrong) {
    if (w.sections && !w.sections.includes(c.section)) continue;
    const cardsOk = w.cards.length === 0 || namesAll(claimText, w.cards);
    const patternOk = !w.pattern || new RegExp(w.pattern, "i").test(strip(c.text));
    if (cardsOk && patternOk) return { grade: "wrong", ruleId: w.id };
  }
  for (const r of gold.right) if (namesAll(claimText, r.cards)) return { grade: "correct", ruleId: r.id };
  return { grade: "ungraded" };
}

export type Score = {
  id: string;
  claims: { total: number; correct: number; wrong: number; ungraded: number };
  wrongIds: string[];
  /** Gold items our answer lacks, by name, so a miss can be read and not only counted. */
  missed: { combos: string[]; keyCards: string[]; weaknesses: string[]; mulligan: boolean; anchors: string[] };
  combos: { gold: number; named: number; forcedGold: number; forcedInWeaknesses: number };
  keyCards: { gold: number; named: number };
  weaknesses: { gold: number; covered: number };
  mulliganTied: boolean | null;
};

export function scoreCase(c: CorpusCase, reply: Reply): Score {
  const g = c.gold;
  const claims = claimsOf(reply);
  const grades = claims.map((cl) => gradeClaim(cl, g));
  const count = (k: Grade) => grades.filter((x) => x.grade === k).length;

  const headline = [reply.overview, ...reply.primer.strategy];
  const named = g.combos.filter((cb) => headline.some((t) => namesAll(t, cb.cards)));
  const forced = g.combos.filter((cb) => cb.forced);
  const loops = forced.filter((cb) => reply.weaknesses.some((t) => namesAll(t, cb.cards)));

  const keyNames = reply.keyCards.map((k) => k.card).join(" | ");
  const keyHit = g.keyCards.filter((k) => names_in(keyNames, [k]).length > 0);

  const covered = g.weaknesses.filter((w) => reply.weaknesses.some((t) => names_in(t, w.names).length > 0));

  const mull = [...reply.primer.mulligan.keep, ...reply.primer.mulligan.sendBack];
  const tied = g.mulliganPieces.length === 0 ? null : mull.some((t) => names_in(t, g.mulliganPieces).length > 0);

  const anchors = g.right.filter((r) => !claims.some((cl) => namesAll(`${cl.text} ${cl.cards.join(" ")}`, r.cards))).map((r) => r.id);

  return {
    id: c.id,
    claims: { total: claims.length, correct: count("correct"), wrong: count("wrong"), ungraded: count("ungraded") },
    wrongIds: [...new Set(grades.flatMap((x) => (x.grade === "wrong" && x.ruleId ? [x.ruleId] : [])))],
    missed: {
      combos: g.combos.filter((cb) => !named.includes(cb)).map((cb) => cb.cards.join(" + ")),
      keyCards: g.keyCards.filter((k) => !keyHit.includes(k)),
      weaknesses: g.weaknesses.filter((w) => !covered.includes(w)).map((w) => w.topic),
      mulligan: tied === false,
      anchors,
    },
    combos: { gold: g.combos.length, named: named.length, forcedGold: forced.length, forcedInWeaknesses: loops.length },
    keyCards: { gold: g.keyCards.length, named: keyHit.length },
    weaknesses: { gold: g.weaknesses.length, covered: covered.length },
    mulliganTied: tied,
  };
}

export function loadCorpus(dir: string): CorpusCase[] {
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => {
    const parsed = corpusCaseSchema.safeParse(JSON.parse(readFileSync(join(dir, f), "utf8")));
    if (!parsed.success) throw new Error(`corpus: ${f} does not match the schema: ${parsed.error.message}`);
    return parsed.data;
  });
}

const pct = (n: number, d: number) => (d === 0 ? "n/a" : `${n}/${d}`);

/** The metrics document: counts only, per deck and pooled. Nothing is a rate over ungraded claims. */
export function renderMetrics(label: string, scores: Score[], skipped: string[]): string {
  const sum = (f: (s: Score) => number) => scores.reduce((n, s) => n + f(s), 0);
  const lines = [
    `# Overview accuracy, corpus score: ${label}`, "",
    "Generated by `pnpm eval:corpus score`. Claims are graded by code only where the corpus says what is true: **wrong** (a claim the corpus lists as false) and **correct** (a claim the corpus lists as good). Every other claim of ours is **ungraded** and left for a person; no rate below is computed over them. Recall columns are gold items our answer names, over gold items.", "",
    "| deck | claims | correct | wrong | ungraded | combo recall | key-card recall | weakness recall | mulligan tied | wrong rules fired |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...scores.map((s) => `| ${s.id} | ${s.claims.total} | ${s.claims.correct} | ${s.claims.wrong} | ${s.claims.ungraded} | ${pct(s.combos.named, s.combos.gold)} | ${pct(s.keyCards.named, s.keyCards.gold)} | ${pct(s.weaknesses.covered, s.weaknesses.gold)} | ${s.mulliganTied === null ? "n/a" : s.mulliganTied ? "yes" : "no"} | ${s.wrongIds.join(", ") || "none"} |`),
    `| **all** | ${sum((s) => s.claims.total)} | ${sum((s) => s.claims.correct)} | ${sum((s) => s.claims.wrong)} | ${sum((s) => s.claims.ungraded)} | ${pct(sum((s) => s.combos.named), sum((s) => s.combos.gold))} | ${pct(sum((s) => s.keyCards.named), sum((s) => s.keyCards.gold))} | ${pct(sum((s) => s.weaknesses.covered), sum((s) => s.weaknesses.gold))} | ${pct(scores.filter((s) => s.mulliganTied === true).length, scores.filter((s) => s.mulliganTied !== null).length)} | |`,
    "",
    `Forced loops named in a weakness line: ${pct(sum((s) => s.combos.forcedInWeaknesses), sum((s) => s.combos.forcedGold))}.`,
    "",
    "## What each answer missed", "",
    ...scores.flatMap((s) => {
      const m = s.missed;
      const parts = [m.combos.length ? `combos: ${m.combos.join("; ")}` : "", m.keyCards.length ? `key cards: ${m.keyCards.join(", ")}` : "", m.weaknesses.length ? `weaknesses: ${m.weaknesses.join(", ")}` : "", m.mulligan ? "mulligan names no engine piece" : "", m.anchors.length ? `good claims lost: ${m.anchors.join(", ")}` : ""].filter(Boolean);
      return [`- **${s.id}**: ${parts.join(" | ") || "nothing missed"}`];
    }),
  ];
  if (skipped.length) lines.push("", `Skipped (no answer supplied): ${skipped.join(", ")}.`);
  return `${lines.join("\n")}\n`;
}
