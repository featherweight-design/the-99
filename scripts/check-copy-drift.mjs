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
// So nothing is synthesised. Both sides are reduced to their WORDS — drop the
// holes and every mark in the swept class — and a table quotation is a finding
// only when its words match a shipped string exactly while its punctuation does
// not. Same words, different marks, which is what drift after a punctuation
// sweep looks like and nothing else is.
//
// Three mechanics the sweep paid for the hard way and this keeps:
//
//   INTERPOLATIONS ARE HOLES, NOT TEXT. `Account — ${name}` has "Account — " as
//   its only literal run, so anything matching on literal runs misses every
//   string whose punctuation sits beside a `${}`. Reducing to words drops the
//   interpolation from both sides and the comparison survives it. A table often
//   writes `{n}`, or a bare `…`, where the code interpolates, so those are holes
//   too — and a hole is dropped from the punctuation signature as well, or an
//   elision would read as three full stops the code does not ship.
//
//   DELIMITERS PAIR BY PARITY, NEVER BY SEARCH. See `quotations`. Getting that
//   wrong is what made the first version report clean over two genuinely stale
//   rows.
//
//   A SENTENCE CAN BE ASSEMBLED. `literals` folds `"a " + "b"` into one string,
//   and skips `${…}` as a balanced region so a nested template cannot truncate
//   the string containing it. See there for why both matter.
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
const COMPONENT_DIR = path.join(ROOT, "src/components");
const TABLE_DIR = path.join(ROOT, "docs/superpowers/design-tables");

/** The marks this project sweeps between. A quotation differing from the code
 *  in one of these, and in nothing else, is stale. */
const MARKS = /[—:,.]/g;

/** Everything standing in for a value rather than being text: the code's own
 *  interpolation, and the two forms a table writes in its place. */
const HOLES = /\$\{[^}]*\}|\{[a-zA-Z][a-zA-Z0-9]*\}|…|\.\.\./g;

/** String literals in a module, with comments stripped so a commented-out
 *  string never becomes a rule the tables are held to.
 *
 *  TEMPLATES NEST. `${mode === "free" ? "x" : `${n(count)} commanders`}` puts a
 *  backtick inside a backtick string, so a scanner that closes on the next
 *  backtick ends the outer string early and reads the rest of the file
 *  inside-out. Interpolations are skipped as balanced `${ }` regions instead,
 *  recursively, and left as a bare `${}` — which is all `words` wanted of them.
 *
 *  SENTENCES ARE ASSEMBLED. `deck-versioning.ts` builds `discard.consequence`
 *  across `+`. On screen that is one sentence and a table quotes it whole, so
 *  literals separated by nothing but a `+` are folded into one. */
function literals(src) {
  const out = [];
  let i = 0;

  // Read the string whose opening delimiter is at src[i]; leaves i past its close.
  const readString = () => {
    const quote = src[i];
    i++;
    let buf = "";
    while (i < src.length) {
      const c = src[i];
      if (c === "\\") { buf += c + src[i + 1]; i += 2; continue; }
      if (c === quote) { i++; break; }
      if (quote === "`" && c === "$" && src[i + 1] === "{") { skipInterpolation(); buf += "${}"; continue; }
      buf += c;
      i++;
    }
    return buf.replace(/\\u2014/g, "—");
  };

  // Skip a balanced `${ … }`, including any string or further template inside it.
  const skipInterpolation = () => {
    i += 2;
    let depth = 1;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === "'" || c === '"' || c === "`") { readString(); continue; }
      if (c === "{") depth++;
      else if (c === "}") depth--;
      i++;
    }
  };

  let inLine = false, inBlock = false, lastEnd = -1;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (c === "\n") { inLine = false; i++; continue; }
    if (inLine) { i++; continue; }
    if (inBlock) { if (c === "*" && n === "/") { inBlock = false; i += 2; } else i++; continue; }
    if (c === "/" && n === "/") { inLine = true; i += 2; continue; }
    if (c === "/" && n === "*") { inBlock = true; i += 2; continue; }
    if (c === "'" || c === '"' || c === "`") {
      const start = i;
      const text = readString();
      if (out.length && /^\s*\+\s*$/.test(src.slice(lastEnd, start))) out[out.length - 1] += text;
      else out.push(text);
      lastEnd = i;
      continue;
    }
    i++;
  }
  return out;
}

/** Copy written straight into a component rather than into a copy module.
 *
 *  The convention here is copy-in-definitions, but the app does not fully obey
 *  it — #597 swept sixteen hardcoded strings and `review-screen.tsx` still draws
 *  its matched-count label as JSX TEXT. A text node is not a string literal, so
 *  `literals` cannot see it however carefully it scans, and a table quoting that
 *  label is drift no amount of copy-module reading would catch. Text runs
 *  between tags are read as well, with entities resolved, since `&amp;` on the
 *  page is `&` to the reader and to the table quoting it. */
function jsxText(src) {
  return [...src.matchAll(/>([^<>{}]+)</g)]
    .map((m) =>
      m[1]
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((t) => t.length >= 20);
}

/** Every `.tsx` under a directory, test files excluded. */
async function componentFiles(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await componentFiles(full)));
    else if (e.name.endsWith(".tsx") && !e.name.endsWith(".test.tsx")) out.push(full);
  }
  return out;
}

/** The sentence reduced to its words: holes gone, marks gone, case and spacing
 *  normalised. Two strings share a key when they say the same thing. */
const words = (s) =>
  s
    .replace(HOLES, " ")
    .replace(MARKS, " ")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Only the marks, in order. Differs when the punctuation moved. */
const marks = (s) => (s.replace(HOLES, "").match(MARKS) || []).join("");

const readable = (s) => s.replace(/\s+/g, " ").trim();

const copyFiles = (await readdir(COPY_DIR)).filter(
  (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
);
const tableFiles = (await readdir(TABLE_DIR)).filter((f) => f.endsWith(".md"));

// Shipped strings, keyed by their words. Short ones are skipped: a two-word
// label collides with everything and proves nothing.
const shipped = new Map();
let stringCount = 0;
const index = (strings, file) => {
  for (const s of strings) {
    stringCount++;
    const k = words(s);
    if (k.split(" ").length < 6) continue;
    if (!shipped.has(k)) shipped.set(k, []);
    shipped.get(k).push({ raw: s, file });
  }
};
for (const f of copyFiles) {
  index(literals(await readFile(path.join(COPY_DIR, f), "utf8")), f);
}
const components = await componentFiles(COMPONENT_DIR);
for (const full of components) {
  const src = await readFile(full, "utf8");
  const rel = path.relative(ROOT, full);
  index(literals(src), rel);
  index(jsxText(src), rel);
}

/** Quoted spans in a table: backtick spans and double-quoted spans.
 *
 *  PAIRED BY PARITY, NEVER BY SEARCH. The first version matched
 *  `` /`([^`]{20,240})`/g ``, which pairs by searching: where a span falls
 *  outside the length window the engine advances a single character and pairs
 *  from the NEXT backtick, so from there on it reads the GAPS BETWEEN code
 *  spans as though they were the quotations. It is not a corner case. It is why
 *  this check first reported "no design table quotes a form the code stopped
 *  emitting" across two rows that plainly did: the real quotation had already
 *  been swallowed as part of a gap.
 *
 *  Splitting on the delimiter cannot drift like that — segment 0 is outside,
 *  1 is inside, 2 is outside. A span wrapping across lines leaves its line with
 *  an odd count, so that line is joined to the next before splitting; ten of
 *  this project's tables contain those. */
function quotations(src) {
  const out = [];
  const emit = (buf) => {
    for (const d of ["`", '"']) {
      buf.split(d).forEach((s, k) => {
        if (k % 2 === 1 && s.length >= 20 && s.length <= 240) out.push(s);
      });
    }
  };
  let buf = "";
  for (const line of src.split("\n")) {
    buf = buf ? `${buf} ${line.replace(/^\s*(?:\*|\/\/|>|\|)?\s*/, "")}` : line;
    if ((buf.match(/`/g) || []).length % 2) continue; // a span is still open
    emit(buf);
    buf = "";
  }
  if (buf) emit(buf); // an unclosed span at end of file
  return out;
}

const findings = [];
const seen = new Set();
for (const f of tableFiles) {
  for (const q of quotations(await readFile(path.join(TABLE_DIR, f), "utf8"))) {
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
    const key = `${f} ${readable(q)}`;
    if (seen.has(key)) continue; // one span both delimiters found
    seen.add(key);
    findings.push({
      table: `design-tables/${f}`,
      quoted: readable(q),
      ships: readable(differs[0].raw),
      from: differs[0].file,
    });
  }
}

console.log(
  `check:copy-drift — ${stringCount} strings in ${copyFiles.length} copy modules ` +
    `and ${components.length} components vs ${tableFiles.length} design tables`,
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
