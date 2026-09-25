// Picks GOLD SET CANDIDATES by hard class, and the random comparison set.
//
// Not a random sample for the gold set, deliberately: d9 asked for it weighted to
// the hard cases, and a random 100 of 31,830 is mostly vanilla creatures that
// every classifier agrees on. Those would report a high agreement rate that says
// nothing about the false matches this lane exists to explain.
//
// The random 400 is separate and IS random, because an agreement rate is only
// meaningful over the distribution the full run would actually meet.
//
// Read-only. Catalog rows only -- no per-account data is touched, so local-dev's
// catalog is the right source, and it carries the same 31,830 Commander-legal
// cards staging does (checked 2026-09-25).
import "./lib/env.mjs";

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

/** Cards named in the brief, plus the pair whose false match started this. */
const NAMED = [
  "Bejeweled Warg", "Generator Servant", "Runadi, Behemoth Caller",
];

// One query per hard class 2b listed. Each is deliberately NARROW: a broad
// `ilike` returns the commonest phrasing, and the commonest phrasing is what the
// text rules already handle.
const CLASSES = {
  // "Put a +1/+1 counter on target Wolf you control" -- the Warg's shape.
  //
  // CASE-SENSITIVE `~`, and that is the whole rule. With `~*` the character class
  // `[A-Z][a-z]+` also matches the word "creature", so the class filled up with
  // "target creature you control" -- the UNRESTRICTED phrasing the text rules
  // already read correctly, and the exact opposite of what this class is for.
  // Caught by reading the first 16 rows before labelling any of them.
  // `creature|permanent|player|opponent` are excluded by name because they are
  // common nouns that pass a capitalised-word test at the start of a sentence.
  restrictedCounter: sql`
    select name, mana_cost, type_line, oracle_text, layout from cards
    where commander_legal
      and oracle_text ~ 'counter on target [A-Z][a-z]+ you control'
      and oracle_text !~ 'counter on target (Creature|Permanent|Player) you control'
    order by md5(name || 'gold') limit 14`,
  // A static lord restricting to a named type, which is NOT "target X you control".
  //
  // The common-noun exclusions are load-bearing for the same reason as above: a
  // sentence-initial "Creatures you control get +1/+1" passes `[A-Z][a-z]+s`, and
  // that is the unrestricted phrasing this class exists to contrast with. First
  // run returned "Creatures you control" for half its rows.
  tribalStatic: sql`
    select name, mana_cost, type_line, oracle_text, layout from cards
    where commander_legal
      and oracle_text ~ '(Other )?[A-Z][a-z]+s you control (get|have|gain)'
      and oracle_text !~ '(Creatures|Permanents|Lands|Tokens|Vehicles|Spells) you control (get|have|gain)'
    order by md5(name || 'gold') limit 12`,
  // Mana that arrives only on a condition, or only once. NON-LAND, because a land
  // that taps for mana is the `lands` class and crowded this one out entirely on
  // the first run -- and the distinction being tested (one-shot or conditional
  // mana against a repeatable tap) is most confusable on spells and creatures.
  conditionalMana: sql`
    select name, mana_cost, type_line, oracle_text, layout from cards
    where commander_legal and type_line not ilike '%Land%'
      and oracle_text ~* 'add \{[CWUBRG0-9]'
      and oracle_text ~* '(sacrifice this|deals combat damage|whenever|when this)'
    order by md5(name || 'gold') limit 14`,
  // A threshold: Runadi's "mana value 5 or greater".
  thresholds: sql`
    select name, mana_cost, type_line, oracle_text, layout from cards
    where commander_legal and oracle_text ~* 'mana value [0-9] or (greater|less)'
    order by md5(name || 'gold') limit 10`,
  // Jobs that are ALTERNATIVES, not a sum.
  modal: sql`
    select name, mana_cost, type_line, oracle_text, layout from cards
    where commander_legal and oracle_text ~ 'choose one' and layout = 'normal'
    order by md5(name || 'gold') limit 12`,
  // Two faces, where the front face is the only one the rules read.
  twoFaced: sql`
    select name, mana_cost, type_line, oracle_text, layout from cards
    where commander_legal and layout in ('modal_dfc','transform','adventure')
    order by md5(name || 'gold') limit 12`,
  // A land that does something, or costs something to use.
  lands: sql`
    select name, mana_cost, type_line, oracle_text, layout from cards
    where commander_legal and type_line ilike '%Land%'
      and oracle_text ~* '(enters tapped|sacrifice|unless you)'
    order by md5(name || 'gold') limit 10`,
  // Ramp that FETCHES rather than taps -- the kind distinction, from the other side.
  fetchesLand: sql`
    select name, mana_cost, type_line, oracle_text, layout from cards
    where commander_legal and oracle_text ~* 'search your library for a[^.]*land'
    order by md5(name || 'gold') limit 10`,
};

const rows = [];
const seen = new Set();
const add = (klass, r) => {
  if (seen.has(r.name)) return;
  seen.add(r.name);
  rows.push({ klass, ...r });
};

for (const name of NAMED) {
  const r = await sql`select name, mana_cost, type_line, oracle_text, layout from cards where name = ${name} limit 1`;
  if (!r.length) throw new Error(`named card missing from the catalog: ${name}`);
  add("named", r[0]);
}
for (const [klass, q] of Object.entries(CLASSES)) {
  for (const r of await q) add(klass, r);
}

// A random tail, so the gold set is not ONLY hard cases -- a scorer that has
// never seen an easy card cannot show a model over-labelling one.
for (const r of await sql`
  select name, mana_cost, type_line, oracle_text, layout from cards
  where commander_legal and layout = 'normal' and oracle_text is not null
  order by md5(name || 'gold-tail') limit 14`) add("easy", r);

console.log(JSON.stringify(rows, null, 1));
console.error(`gold candidates: ${rows.length}`);
for (const [k, n] of Object.entries(rows.reduce((a, r) => ({ ...a, [r.klass]: (a[r.klass] ?? 0) + 1 }), {}))) {
  console.error(`  ${k.padEnd(18)} ${n}`);
}
