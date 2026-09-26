// ~15 of the most telling disagreements, BLIND: card, label A, label B, and the
// gold answer withheld from the columns so the reader judges the labels rather
// than the scoreboard. Which column is which model is recorded once, at the
// bottom, so the sheet can be read either way round.
//
// "Telling" is defined, not eyeballed: the two models disagree, on a limit that
// GATES a match (a named type, a ramp kind), on a card where getting it wrong
// produces the kind of false match this lane exists to explain. Gold is shown in
// the key, because a sheet where nobody can check the answer settles nothing.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { GOLD } from "./lib/card-labels-gold.mjs";

const h = JSON.parse(readFileSync("out/labels-haiku.json", "utf8"));
const s = JSON.parse(readFileSync("out/labels-sonnet.json", "utf8"));
const LIMS = ["rampKind", "restrictedTo", "trigger", "recurrence", "threshold", "modal"];
const limOf = (j, f) => f === "threshold"
  ? (j.threshold ? `${j.threshold.stat}${j.threshold.op}${j.threshold.value}` : "none")
  : String(j[f] ?? "none");
const NON_GATING = new Set(["creature", "permanent", "spell", "player", "none", null]);
const kindKey = (j) => `${j.space}:${j.kind}`;
const show = (j) => {
  if (!j) return "— (no such job)";
  const bits = [kindKey(j)];
  if (j.rampKind !== undefined) bits.push(`kind=${j.rampKind}`);
  if (j.restrictedTo) bits.push(`only ${j.restrictedTo}`);
  if (j.trigger !== "none") bits.push(`on ${j.trigger}`);
  if (j.recurrence !== "repeatable") bits.push(j.recurrence);
  if (j.threshold) bits.push(`${j.threshold.stat}${j.threshold.op}${j.threshold.value}`);
  if (j.modal) bits.push("modal");
  return bits.join(", ");
};

const rows = [];
for (const row of GOLD) {
  const A = h[row.name], B = s[row.name];
  if (!Array.isArray(A) || !Array.isArray(B)) continue;
  // Same-kind jobs are paired best-first and WITHOUT REUSE, as the scorer does.
  // `find` returns the same predicted job for both of a card's two pumps, which
  // renders two correct labels as a disagreement on the sheet.
  const poolA = [...A], poolB = [...B];
  const take = (pool, g) => {
    let best = -1, at = -1;
    for (const [i, q] of pool.entries()) {
      if (kindKey(q) !== kindKey(g)) continue;
      const sc = LIMS.filter((f) => limOf(q, f) === limOf(g, f)).length;
      if (sc > best) { best = sc; at = i; }
    }
    return at < 0 ? undefined : pool.splice(at, 1)[0];
  };
  for (const g of row.jobs) {
    const a = take(poolA, g);
    const b = take(poolB, g);
    const gating = !NON_GATING.has(g.restrictedTo) || (g.kind === "ramp" && g.space === "role");
    if (!gating) continue;
    const differ = show(a) !== show(b);
    if (!differ) continue;
    // Weight: a disagreement where ONE side matches gold is the most telling,
    // because it shows the choice mattering rather than both models guessing.
    const aRight = show(a) === show(g), bRight = show(b) === show(g);
    rows.push({ card: row.name, klass: row.klass, job: kindKey(g), A: show(a), B: show(b), gold: show(g), decisive: aRight !== bRight });
  }
}
rows.sort((x, y) => (y.decisive ? 1 : 0) - (x.decisive ? 1 : 0));
const sheet = rows.slice(0, 15);

const lines = [
  "# Blind sheet — 15 telling disagreements",
  "",
  "Two models labelled the same card. The columns are unlabelled on purpose: judge",
  "the labels, not the scoreboard.",
  "",
  "Every row is a job whose GOLD label gates a match — a named type, or a ramp kind.",
  "The DIFFERENCE shown may be on any limit, so several rows differ only on `trigger`",
  "or `recurrence` while both columns agree on the gating limit itself. That is worth",
  "seeing rather than filtering out: it is what the scores say too, that both models",
  "mostly agree on the restriction and part company on the secondary limits.",
  "",
  "| # | card | job | label A | label B |",
  "|---|------|-----|---------|---------|",
  ...sheet.map((r, i) => `| ${i + 1} | ${r.card} | ${r.job} | ${r.A} | ${r.B} |`),
  "",
  "## Key (read after judging)",
  "",
  "**A = Haiku 4.5. B = Sonnet 4.5.** Gold, hand-labelled from oracle text:",
  "",
  ...sheet.map((r, i) => `${i + 1}. **${r.card}** — gold: \`${r.gold}\`${r.decisive ? " *(one side right)*" : ""}`),
];
mkdirSync("out", { recursive: true });
writeFileSync("out/blind-sheet.md", lines.join("\n"));
console.log(`${rows.length} gating disagreements, ${sheet.filter((r) => r.decisive).length} of the top 15 decisive`);
console.log(lines.slice(6, 24).join("\n"));
