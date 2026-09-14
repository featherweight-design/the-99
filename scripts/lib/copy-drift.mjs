// The reading half of `check:copy-drift`: how a module's shipped strings and a
// design table's quotations are extracted and reduced so the two can be
// compared. The script beside it does the file walking and the reporting.
//
// It lives in its own module because every function here is a hand-written
// parser for a case that has already gone wrong once — nested templates,
// `+`-assembled sentences, JSX text split across markup, delimiter parity — and
// a guard whose parser cannot be tested is a guard that quietly stops guarding.
// `copy-drift.test.mts` pins each of those paths against the shape that broke it.
import { readdir } from "node:fs/promises";
import path from "node:path";

/** The marks this project sweeps between. A quotation differing from the code
 *  in one of these, and in nothing else, is stale. */
export const MARKS = /[—:,.]/g;

/** Everything standing in for a value rather than being text: the code's own
 *  interpolation, and the three forms a table writes in its place — `{n}`, a
 *  bare `…`, and a short bracketed marker like `[N] cards matched…`. The
 *  bracket form is kept short deliberately: `[a link](…)` is markdown, not a
 *  placeholder, and a permissive pattern would eat every link label. */
export const HOLES = /\$\{[^}]*\}|\{[a-zA-Z][a-zA-Z0-9]*\}|\[[A-Za-z][A-Za-z0-9]{0,3}\]|…|\.\.\./g;

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
export function literals(src) {
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
    // Every escape, not the one that happened to matter first. `game-log.ts`
    // writes `\u2019` and `\u00b7`, and a table holds the rendered character;
    // leaving the escape in the key means those two can never be compared.
    return buf
      .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\n/g, " ")
      .replace(/\\t/g, " ")
      .replace(/\\(["'`\\])/g, "$1");
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
export function jsxText(src) {
  const out = [];
  // Tags go, expressions become holes, and what is left is the sentence as a
  // reader meets it. A sentence SPLIT ACROSS MARKUP is the reason: `rec-card`
  // renders `No synergy data` inside a <strong> and `— EDHREC doesn't track
  // this commander…` after it, so matching each text node on its own finds two
  // fragments and never the sentence a table quotes.
  const flat = src
    .replace(/\{\s*["'`]\s*["'`]\s*\}/g, " ") // the {" "} spacer between nodes
    .replace(/\{[^{}]*\}/g, "\u0000") // any other expression: a hole, and a boundary
    .replace(/<[^>]*>/g, "\u0000") // a tag is not a word boundary a reader sees
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
  // A run is broken by an expression hole only where the hole is not INSIDE the
  // sentence; both readings are indexed, so neither a joined nor a split quote
  // is missed.
  for (const run of flat.split("\u0000")) {
    const t = run.replace(/\s+/g, " ").trim();
    if (t.length >= 20) out.push(t);
  }
  for (const run of flat.split(/\u0000{2,}/)) {
    const t = run.replace(/\u0000/g, " ").replace(/\s+/g, " ").trim();
    if (t.length >= 20) out.push(t);
  }
  return out;
}

/** Every `.tsx` under a directory, test files excluded. */
export async function componentFiles(dir) {
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
export const words = (s) =>
  s
    .replace(HOLES, " ")
    .replace(MARKS, " ")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

/** Only the marks, in order. Differs when the punctuation moved. */
export const marks = (s) => (s.replace(HOLES, "").match(MARKS) || []).join("");

export const readable = (s) => s.replace(/\s+/g, " ").trim();

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
export function quotations(src) {
  const out = [];
  const emit = (buf) => {
    for (const d of ["`", '"']) {
      buf.split(d).forEach((s, k) => {
        // No upper bound. A cap drops exactly the long quotations most likely to
        // be a whole sentence, and a dropped span is a silent pass.
        if (k % 2 === 1 && s.length >= 20) out.push(s);
      });
    }
  };
  const open = (buf, d) => (buf.split(d).length - 1) % 2 === 1;
  let buf = "";
  for (const line of src.split("\n")) {
    // A blank line ends a paragraph and a table alike, so an unbalanced
    // delimiter cannot run past one. Without this bound a single stray quote
    // mark would join the rest of the file into one span.
    if (!line.trim() && buf) {
      emit(buf);
      buf = "";
      continue;
    }
    buf = buf ? `${buf} ${line.replace(/^\s*(?:\*|\/\/|>|\|)?\s*/, "")}` : line;
    // Both delimiters, not just the backtick: a double-quoted span wrapping
    // across two lines was emitted as two fragments and never compared.
    if (open(buf, "`") || open(buf, '"')) continue;
    emit(buf);
    buf = "";
  }
  if (buf) emit(buf); // an unclosed span at end of file
  return out;
}
