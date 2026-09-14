// Does a design table still quote a string the code stopped emitting?
//
// The property tables under `docs/superpowers/design-tables/` are the spec an
// engineer implements from, and they quote copy EXACTLY. Nothing notices when
// the copy moves, so a table can sit for months telling the next reader to ship
// a sentence the app no longer says.
//
// It exists because the 2026-09-13 em-dash sweep spent FOUR consecutive review
// rounds on precisely this, each round naming a different partial list of stale
// references. Every fix was correct and every round found more, because a list
// assembled by reading is a list with a tail.
//
// Static: no server, no browser, no database. Runs in about a second.
//   node scripts/check-copy-drift.mjs
//
// HOW IT COMPARES, and why this shape rather than the obvious one. The first
// version synthesised the stale form — put a dash back where the punctuation
// now is, then search for that — and reported 46 findings, every one false. It
// had rewritten `plural(n, "card", "cards")` into `plural(n — "card", …)` and
// then matched it through wildcards loose enough to absorb the difference.
//
// So nothing is synthesised. Both sides are reduced to their WORDS — drop
// `${…}` and every mark in the swept class — and a table quotation is a finding
// only when its words match a shipped string exactly while its punctuation does
// not. Same words, different marks, which is what drift after a punctuation
// sweep looks like and nothing else is.
//
// Two mechanics the sweep paid for the hard way and this keeps:
//
//   INTERPOLATIONS ARE HOLES, NOT TEXT. `Account — ${name}` has "Account — " as
//   its only literal run, so anything matching on literal runs misses every
//   string whose punctuation sits beside a `${}`. Reducing to words drops the
//   interpolation from both sides and the comparison survives it.
//
//   WRAPPING IS COLLAPSED. A long quote wraps in a markdown paragraph and in a
//   code comment, so `"68 cards — the\n * roles and the mana base"` is one
//   string to a reader and two lines to a matcher. The table is flattened first.
//
// WHAT IT DOES NOT COVER, deliberately. Prose that makes a CLAIM about the copy
// without quoting it — a module header saying "transcribed verbatim from the
// handoff" — is invisible to any string matcher, and four of those were found
// by grepping for the claim instead. Merged plans and point-in-time reports are
// records of their date, so only `design-tables/` is read.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const COPY_DIR = path.join(ROOT, "src/lib/copy");
const TABLE_DIR = path.join(ROOT, "docs/superpowers/design-tables");

/** The marks this project sweeps between. A quotation differing from the code
 *  in one of these, and in nothing else, is stale. */
const MARKS = /[—:,.]/g;

/** String literals in a module, with comments stripped so a commented-out
 *  string never becomes a rule the tables are held to. */
function literals(src) {
  const out = [];
  let i = 0, inLine = false, inBlock = false;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === "\n") { inLine = false; i++; continue; }
    if (inLine) { i++; continue; }
    if (inBlock) { if (c === "*" && n === "/") { inBlock = false; i += 2; } else i++; continue; }
    if (c === "/" && n === "/") { inLine = true; i += 2; continue; }
    if (c === "/" && n === "*") { inBlock = true; i += 2; continue; }
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      i++;
      let buf = "";
      while (i < src.length) {
        if (src[i] === "\\") { buf += src[i] + src[i + 1]; i += 2; continue; }
        if (src[i] === quote) break;
        buf += src[i];
        i++;
      }
      i++;
      out.push(buf.replace(/\\u2014/g, "—"));
      continue;
    }
    i++;
  }
  return out;
}

/** The sentence reduced to its words: interpolations gone, marks gone, case and
 *  spacing normalised. Two strings share a key when they say the same thing. */
const words = (s) =>
  s
    .replace(/\$\{[^}]*\}/g, " ")
    .replace(/\{[a-zA-Z][a-zA-Z0-9]*\}/g, " ") // a table writes `{n}` for `${n}`
    .replace(MARKS, " ")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Only the marks, in order. Differs when the punctuation moved. */
const marks = (s) => (s.replace(/\$\{[^}]*\}/g, "").match(MARKS) || []).join("");

const flatten = (s) => s.replace(/\n\s*(?:\*|\/\/|>|\|)?\s*/g, " ").replace(/\s+/g, " ");
const readable = (s) => s.replace(/\s+/g, " ").trim();

const copyFiles = (await readdir(COPY_DIR)).filter(
  (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
);
const tableFiles = (await readdir(TABLE_DIR)).filter((f) => f.endsWith(".md"));

// Shipped strings, keyed by their words. Short ones are skipped: a two-word
// label collides with everything and proves nothing.
const shipped = new Map();
let stringCount = 0;
for (const f of copyFiles) {
  for (const s of literals(await readFile(path.join(COPY_DIR, f), "utf8"))) {
    stringCount++;
    const k = words(s);
    if (k.split(" ").length < 6) continue;
    if (!shipped.has(k)) shipped.set(k, []);
    shipped.get(k).push({ raw: s, file: f });
  }
}

// Quotations in a table: backtick spans and double-quoted spans.
const quotations = (flat) => [
  ...[...flat.matchAll(/`([^`]{20,240})`/g)].map((m) => m[1]),
  ...[...flat.matchAll(/"([^"]{20,240})"/g)].map((m) => m[1]),
];

const findings = [];
for (const f of tableFiles) {
  const flat = flatten(await readFile(path.join(TABLE_DIR, f), "utf8"));
  for (const q of quotations(flat)) {
    if (!q.includes("—")) continue; // only the mark this project swept out
    const hits = shipped.get(words(q));
    if (!hits) continue;
    // A quotation whose ONLY extra mark is a leading dash is not drift: the
    // component supplies that dash to join a label to its gloss, and the table
    // is correctly documenting the rendered form. `resolution-expander.tsx`
    // renders `— {copy.prompt}` where `prompt` itself carries no dash. Those
    // joiners were ruled deliberate on 2026-09-13 and are not swept.
    const joined = q.trimStart().startsWith("—");
    const differs = hits.filter(
      (h) => marks(h.raw) !== marks(q) && !(joined && marks(h.raw) === marks(q).replace(/^—/, "")),
    );
    if (differs.length === 0) continue;
    findings.push({
      table: `design-tables/${f}`,
      quoted: readable(q),
      ships: readable(differs[0].raw),
      from: differs[0].file,
    });
  }
}

console.log(
  `check:copy-drift — ${stringCount} strings in ${copyFiles.length} modules ` +
    `vs ${tableFiles.length} design tables`,
);

if (findings.length === 0) {
  console.log("\nNo design table quotes a form the code stopped emitting.");
  process.exit(0);
}

console.error(`\n${findings.length} stale quotation(s):\n`);
for (const f of findings) {
  console.error(`  ${f.table}`);
  console.error(`     table: ${f.quoted}`);
  console.error(`     ships: ${f.ships}   (${f.from})\n`);
}
console.error(
  "A design table is the spec someone implements from, so it has to say what\n" +
    "ships. Correct the table — or, when the wording diverged for a reason that\n" +
    "pre-dates this change, mark the drift in the row rather than half-correcting\n" +
    "its punctuation and hiding that the two were ever different.",
);
process.exit(1);
