// measure:intake-tribes — Hugh's four-tribe ask (2026-09-27), before and after, READ-ONLY.
//
// "Tribal options are Orcs, Elves, Dwarves, or Wizards" became four theme chips, ANDed, and the
// search returned nothing: no commander backs all four, and the too-narrow note offered four
// single drops that each read 0. This prints that ask against a real index, twice from one read:
//
//  - BEFORE, as main ranked it: themes backed by a measured share only, and one answer dropped at a
//    time, zeros included (the note then showed nothing it could offer).
//  - AFTER, as this build ranks it: a tribal theme also backed by the type line, and the removal
//    search by size that never offers a 0.
//
// It calls the real `loadSearchFacts` and `rankCandidates`, never a copy of their rules. It writes
// nothing. It points `src/db` at STAGING (`THE_99_NEON_STAGING_DIRECT`) AFTER `env.mjs` has loaded,
// since `env.mjs` overrides `DATABASE_URL` with `.env`'s, and refuses to run unless the database
// reports staging's branch.
//
//   MEASURE_USER_ID=<staging account> pnpm measure:intake-tribes

import { requireEnv } from "./lib/env.mjs";

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const { THE_99_NEON_STAGING_DIRECT } = requireEnv(["THE_99_NEON_STAGING_DIRECT"]);
process.env.DATABASE_URL = THE_99_NEON_STAGING_DIRECT;

const { sql } = await import("drizzle-orm");
const { db } = await import("../src/db");
const { loadSearchFacts, loadIntakeThemes } = await import("../src/lib/intake/search");
const { rankCandidates, passes, answerKeys } = await import("../src/lib/intake/rank");

const [{ branch }] = (await db.execute(sql`select current_setting('neon.branch_id', true) as branch`)).rows as { branch: string }[];
if (branch !== STAGING_BRANCH) throw new Error(`measure:intake-tribes reads staging only; this database is ${branch}.`);

// Whose collection: named, or the one account that holds decks.
let userId = process.env.MEASURE_USER_ID;
if (!userId) {
  const owners = (await db.execute(sql`select user_id, count(*)::int as n from decks group by user_id order by n desc`)).rows as { user_id: string; n: number }[];
  if (owners.length !== 1) {
    console.log(owners.map((o) => `  ${o.user_id}  ${o.n} decks`).join("\n"));
    throw new Error("More than one account holds decks on staging: name one with MEASURE_USER_ID.");
  }
  userId = owners[0].user_id;
}

const themes = await loadIntakeThemes();
const TRIBES = ["Orcs", "Elves", "Dwarves", "Wizards"];
const slugs = TRIBES.map((label) => {
  const t = themes.find((v) => v.label === label);
  if (!t) throw new Error(`The vocabulary offers no ${label} theme.`);
  return t.slug;
});
const label = (slug: string) => themes.find((t) => t.slug === slug)?.label ?? slug;
const asked = { colors: [], match: "contains" as const, themes: slugs, themeJoin: "all" as const, card: null, budgetDollars: null, bracket: null };

const facts = await loadSearchFacts(userId, asked);
const name = (k: { kind: string; slug?: string }) => (k.kind === "theme" ? label(k.slug!) : k.kind);
console.log(`staging · ${facts.candidates.length} candidates · asked: ${TRIBES.join(", ")}`);
console.log(`tribes derived: ${[...facts.tribes].map(([s, f]) => `${label(s)} -> ${f.join("|")}`).join(" · ")}`);

// BEFORE: main's rules. No type-line backing, and each answer dropped alone.
const before = rankCandidates(facts.candidates, facts.answers, facts.card, new Map());
console.log(`\nBEFORE  results: ${before.rows.length}`);
for (const k of answerKeys(facts.answers)) {
  console.log(`  drop ${name(k)}: ${facts.candidates.filter((c) => passes(c, facts.answers, facts.card, [k], new Map())).length}`);
}

// Per-theme backers, both ways, so the type-line gain is visible per tribe.
console.log("\nbackers per tribe (measured / with the type line):");
for (const s of slugs) {
  const one = { ...facts.answers, themes: [s] };
  const measured = facts.candidates.filter((c) => passes(c, one, facts.card, [], new Map())).length;
  const both = facts.candidates.filter((c) => passes(c, one, facts.card, [], facts.tribes)).length;
  console.log(`  ${label(s).padEnd(8)} ${measured} / ${both}`);
}

// AFTER: this build's rules.
const after = rankCandidates(facts.candidates, facts.answers, facts.card, facts.tribes);
console.log(`\nAFTER   results: ${after.rows.length}`);
for (const o of after.tooNarrow?.without.slice(0, 6) ?? []) {
  const dropped = o.answers.map(name);
  const same = (x: { kind: string; slug?: string }, y: { kind: string; slug?: string }) => x.kind === y.kind && x.slug === y.slug;
  const kept = answerKeys(facts.answers).filter((k) => !o.answers.some((d) => same(d, k))).map(name);
  console.log(`  ${kept.length === 1 && dropped.length > 1 ? `keep only ${kept[0]}` : `drop ${dropped.join(" + ")}`}: ${o.count}`);
}

// Three-answers PR 1: the four asked as any of. The note's join first (asked as all of), then the
// results the join produces, each row ranked by the tribe it fits best.
console.log(`\nANY OF  offered by the note: ${after.tooNarrow?.anyOf ? `${after.tooNarrow.anyOf.count} commanders, most backed at once ${after.tooNarrow.anyOf.most}` : "no"}`);
const anyOf = rankCandidates(facts.candidates, { ...facts.answers, themeJoin: "any" }, facts.card, facts.tribes);
console.log(`ANY OF  results: ${anyOf.rows.length}`);
for (const r of anyOf.rows.slice(0, 12)) {
  const fits = r.themeFits.map((t) => `${t.best ? "*" : ""}${label(t.slug)} ${Math.round(t.share * 100)}%${t.typeLine ? " (type line)" : ""}`).join(", ");
  console.log(`  ${r.candidate.name}: ${fits}`);
}

// Three answers, PR 2: Hugh's whole ask, the four tribes as any of, printed in HOB or HOC. The
// Sets answer runs through the loader (`printedIn`), so it is asked for there, not filtered here.
const hugh = await loadSearchFacts(userId, { ...asked, themeJoin: "any", sets: ["hob", "hoc"] });
const hughRanked = rankCandidates(hugh.candidates, hugh.answers, hugh.card, hugh.tribes);
console.log(`\nANY OF, printed in HOB or HOC: ${hughRanked.rows.length} results`);
for (const r of hughRanked.rows) {
  const fits = r.themeFits.map((t) => `${t.best ? "*" : ""}${label(t.slug)} ${Math.round(t.share * 100)}%${t.typeLine ? " (type line)" : ""}`).join(", ");
  console.log(`  ${r.candidate.name}: ${fits}`);
}
// And his words, read by the free match as the form's submit reads them.
const { loadIntakeCatalog } = await import("../src/lib/intake/search");
const { submitTarget } = await import("../src/lib/intake/submit");
const { emptyParams, parseChooseParams } = await import("../src/lib/intake/params");
const HUGH = "I want a deck from the HOB or HOC sets using cards I own. The commander can be one I have to buy. Tribal options are Orcs, Elves, Dwarves, or Wizards.";
const read = parseChooseParams(new URLSearchParams(submitTarget({ ...emptyParams(), words: HUGH }, (await loadIntakeCatalog()).index).split("?")[1]));
console.log(`  his words read as: themes ${read.themes.join(",")} · join ${read.themeJoin} · sets ${read.sets.join(",")} · pool ${read.pool} · not used: ${read.notUsed.join(" | ")}`);
const printedAll = hugh.candidates.filter((c) => c.inSets).length;
console.log(`  (commanders printed in HOB or HOC, any theme: ${printedAll})`);

// The HOB commanders the type line brings in, by the tribe they now back.
console.log("\ntype-line-only backers (the gain), first 20 per tribe:");
for (const s of slugs) {
  const one = { ...facts.answers, themes: [s] };
  const rows = rankCandidates(facts.candidates, one, facts.card, facts.tribes).rows.filter((r) => r.themeFits[0].typeLine);
  console.log(`  ${label(s)} (${rows.length}): ${rows.slice(0, 20).map((r) => `${r.candidate.name} ${Math.round(r.themeFits[0].share * 100)}%`).join(", ")}`);
}

// Held back by the no-0% rule: the type line carries the tribe, but the share rounds to 0%, and a
// row has no way yet to draw a match without a percentage (Design's addendum).
const { carriesSubtype, themeShare } = await import("../src/lib/intake/vocabulary");
console.log("\nheld back (type line carries it, share rounds to 0%):");
for (const s of slugs) {
  const forms = facts.tribes.get(s) ?? [];
  const held = facts.candidates.filter((c) => themeShare(c, s) === null && c.typeLine && carriesSubtype(c.typeLine, forms)
    && !passes(c, { ...facts.answers, themes: [s] }, facts.card, [], facts.tribes));
  console.log(`  ${label(s)} (${held.length}): ${held.slice(0, 20).map((c) => c.name).join(", ")}`);
}

// Hugh's sets too: of the legends printed in HOB or HOC that carry one of the tribes, which does
// the search admit for that tribe? The sets are not an answer yet (Design's addendum); this is
// what the build hands that answer to start from.
const printed = new Set(((await db.execute(sql`
  select distinct p.oracle_id from printings p where p.set_code in ('hob', 'hoc')`)).rows as { oracle_id: string }[]).map((r) => r.oracle_id));
console.log("\nHOB/HOC legends by tribe (admitted: measured / type line / held at 0%):");
for (const s of slugs) {
  const forms = facts.tribes.get(s) ?? [];
  const inSet = facts.candidates.filter((c) => printed.has(c.oracleId) && c.typeLine && carriesSubtype(c.typeLine, forms));
  const one = { ...facts.answers, themes: [s] };
  const measured = inSet.filter((c) => themeShare(c, s) !== null);
  const line = inSet.filter((c) => themeShare(c, s) === null && passes(c, one, facts.card, [], facts.tribes));
  const heldAt0 = inSet.length - measured.length - line.length;
  console.log(`  ${label(s).padEnd(8)} ${inSet.length} carry it: ${measured.length} / ${line.length} / ${heldAt0}`);
}
process.exit(0);
