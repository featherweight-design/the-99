// Tailwind 4 registers a NAMED utility for every theme color, and this app's mana palette
// names five of its colors `w`, `u`, `b`, `r`, `g` (`--color-w` etc. in `globals.css`). Two of
// those letters are also Tailwind's own side abbreviations for `border-{t,r,b,l}` — so `border-r`
// and `border-b` are each registered TWICE: once as the width/style utility
// (`border-right-width`, `border-bottom-width`) and once as a color utility
// (`border-color: var(--r)` / `var(--b)`). Both land in the SAME `@layer utilities` block at the
// SAME selector specificity, so plain CSS source order decides — and Tailwind registers color
// utilities AFTER directional ones, so the bare class silently repaints the border in mana red or
// mana black instead of leaving it at `currentColor` (or overriding whatever the author intended).
//
// `t` and `l` are NOT mana letters (no `--color-t`/`--color-l`), so `border-t` and `border-l`
// never collide — confirmed against the compiled stylesheet, not assumed.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export const COLLIDING_SIDES = ["r", "b"];

/**
 * Comments and quoted/template-literal strings, found in ONE pass with shared state — fixing a
 * real miss Copilot's review caught (round 1, PR #1272): stripping comments with a standalone
 * `//` regex first, then finding string spans in the result, lets a STRING containing a literal
 * `" // "` (`change-commander-sheet.tsx:32`: `name.split(" // ")`) get read as a comment start.
 * That blanks the rest of the line, including the string's own closing quote, which desyncs every
 * later quote-pairing in the file and silently drops real findings after it (line 162, that file,
 * returned none). A single scanner that tracks "am I inside a string" never makes that mistake,
 * because it only treats `/` as a comment marker in the NORMAL state, never inside one.
 */
function scan(text) {
  const spans = [];
  const n = text.length;
  let i = 0;

  // Round 2's finding: a template literal closed at the next backtick, ignoring `${...}`
  // entirely, splits a NESTED template wrong — `` `${on ? `border-b` : ""}` `` has its inner
  // backtick read as the OUTER template's close, so the real `border-b` never lands inside any
  // scanned span. Interpolations are now parsed recursively: `scanJs` (normal JS — comments,
  // strings, templates) is called for the code at top level and, with `inBraces: true`, inside
  // every `${ ... }`, where it also tracks `{`/`}` depth so it knows which `}` closes the
  // interpolation rather than some object literal the expression contains.
  function scanJs(inBraces) {
    let depth = inBraces ? 1 : 0;
    while (i < n) {
      const c = text[i];
      if (c === "/" && text[i + 1] === "/") {
        while (i < n && text[i] !== "\n") i++;
        continue;
      }
      if (c === "/" && text[i + 1] === "*") {
        i += 2;
        while (i < n && !(text[i] === "*" && text[i + 1] === "/")) i++;
        i += 2;
        continue;
      }
      if (c === '"' || c === "'") {
        scanQuoted(c);
        continue;
      }
      if (c === "`") {
        scanTemplate();
        continue;
      }
      if (inBraces && c === "{") {
        depth++;
        i++;
        continue;
      }
      if (inBraces && c === "}") {
        depth--;
        i++;
        if (depth === 0) return;
        continue;
      }
      i++;
    }
  }

  function scanQuoted(quote) {
    const start = i;
    i++;
    while (i < n && text[i] !== quote) {
      if (text[i] === "\\") i++;
      i++;
    }
    i++; // past the closing quote (or past end of file on an unterminated string)
    spans.push({ start, text: text.slice(start, i) });
  }

  function scanTemplate() {
    const start = i;
    i++;
    while (i < n) {
      if (text[i] === "\\") {
        i += 2;
        continue;
      }
      if (text[i] === "`") {
        i++;
        break;
      }
      if (text[i] === "$" && text[i + 1] === "{") {
        i += 2;
        scanJs(true); // consumes up to and including the matching `}`
        continue;
      }
      i++;
    }
    spans.push({ start, text: text.slice(start, i) });
  }

  scanJs(false);
  return spans;
}

/**
 * A bare colliding utility, found anywhere in the stripped source — `border-b` and `border-r`,
 * never `border-b-2`/`border-b-0`/`border-b-[...]`/`border-bottom-*`, all of which are distinct
 * identifiers. Each match keeps its VARIANT chain (`md:`, `last:hover:`) and the legacy `!` that follows it (`md:!border-r`), because the override
 * that fixes it has to carry the same one: see `hasSideOverride`. Offsets are kept so a caller can
 * report a line without re-deriving positions.
 */
// A bracketed variant or value is ONE unit, quotes included: `[&[data-x='a']]:` is a single
// variant, and cutting it at the quote would let `[&[data-x='a']]:border-r` and
// `[&[data-y='a']]:border-r-[...]` read as the same chain. Tailwind writes a space as `_`, so a
// bracket holds no whitespace; one level of nesting covers the attribute-selector form.
const BRACKETED = "\\[(?:[^\\[\\]\\s]|\\[[^\\[\\]\\s]*\\])*\\]";

function bareCollisions(text) {
  const found = [];
  for (const side of COLLIDING_SIDES) {
    // `\b` alone matches mid-token: "border-b-0" contains "border-b" at a word boundary (the
    // following "-" is non-word), so a plain `\bborder-b\b` wrongly flags the WIDTH utility
    // `border-b-0`/`md:border-b-0` — a different, unambiguous utility with no color collision at
    // all. The bare, colliding form is only the EXACT token with nothing after it but a
    // non-identifier character (space, quote, end of string) — never another `-`.
    //
    // A token starts at whitespace, a quote, a backtick, `{` or `(`; its variants are everything up
    // to the last `:` before the utility, so `[&>*]:` and `data-[x=y]:` are read whole.
    const re = new RegExp(`(?<![^\\s"'\`{(])((?:(?:[^\\s"'\`\\[\\]]|${BRACKETED})*:)?!?)border-${side}(!?)(?![\\w-])`, "g");
    for (const m of text.matchAll(re)) {
      found.push({ side, index: m.index + m[1].length, variant: m[1], important: m[2] === "!" });
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

const escapeRe = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whether `text` already fixes a bare collision at `side` with an explicit SIDE-SPECIFIC color
 * utility — `border-{side}-[color:...]`, `border-{side}-[...]` (a bare arbitrary value also
 * renders as a color here, since width/style take a scale key not a bracket) or a named color
 * utility `border-{side}-{token}` where `{token}` is not a bare digit (`border-b-2` is a width).
 * SIDE-SPECIFIC only — a GENERIC `[border-color:...]` or unprefixed `border-{token}` utility sits
 * EARLIER in the compiled stylesheet than the bare collision and loses to it, confirmed against
 * the compiled output, so it does not count as a fix here.
 *
 * AND THE SAME VARIANT CHAIN. Tailwind emits every variant rule after the unprefixed ones, so a
 * `md:border-r` repaints red from `md` up over a plain `border-r-[color:...]`, and a `md:`
 * override does nothing below `md` for a plain `border-r`. Each bare token needs an override
 * spelled with exactly its own variants, and its own `!`: `border-r!` is `!important`, which a
 * plain override loses to.
 *
 * DELIBERATELY CONSERVATIVE. A stronger override beside a plain bare token (`md:border-r
 * md:border-r-[color:...]!`) is safe in the browser and is still reported, and so are the legacy
 * prefix and the suffix spelling of `!` against each other. Telling those apart means modelling
 * Tailwind's importance order, which the five-line fix (write the override with the bare token's
 * own variants and `!`) does not need; `src` holds no such token (it holds no `!` form at all), so
 * the strictness costs nothing today and a guard that errs toward a report is the safe side.
 */
function hasSideOverride(text, side, variant, important) {
  const re = new RegExp(`(?<![^\\s"'\`{(])${escapeRe(variant)}border-${side}-(?=\\[|[a-zA-Z])(?:[^\\s"'\`\\[\\]]|${BRACKETED})*`, "g");
  return [...text.matchAll(re)].some((m) => m[0].endsWith("!") === important);
}

/**
 * A stylesheet's class strings are its `@apply` statements, one span each. Comments are blanked
 * to spaces rather than cut, so every offset still lands on the same line.
 */
function cssSpans(text) {
  const blanked = text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
  return [...blanked.matchAll(/@apply\b[^;}]*/g)].map((m) => ({ start: m.index, text: m[0] }));
}

/**
 * Every bare collision in `text` with no companion side-specific override — the set a caller
 * should give an explicit color to. One entry per (side, string-span) pair: a file is scanned
 * SPAN BY SPAN (each class-string literal in isolation) because a fix co-located in a different
 * className on the same file does not reach this one.
 */
export function unresolvedCollisions(text, kind = "js") {
  // A nested template literal's text is covered by two spans — the outer template's full raw
  // text (which includes the interpolation verbatim) and the inner template's own span — so the
  // same physical collision can surface twice at the identical offset. Deduped by (side, offset).
  const seen = new Set();
  const out = [];
  for (const span of kind === "css" ? cssSpans(text) : scan(text)) {
    for (const { side, index, variant, important } of bareCollisions(span.text)) {
      if (!hasSideOverride(span.text, side, variant, important)) {
        const offsetInFile = span.start + index;
        const key = `${side}:${offsetInFile}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ side, offsetInFile });
      }
    }
  }
  return out;
}

/** `offsetInFile` to a 1-based line number, for a readable report. */
export function lineAt(text, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) if (text[i] === "\n") line++;
  return line;
}

const SOURCE = /\.(tsx?|css)$/;
const TEST = /\.test\.tsx?$/;

async function sourceFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await sourceFiles(full)));
    else if (SOURCE.test(entry.name) && !TEST.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * Every unresolved collision under `root`, as `{ path, side, line }`. `.ts` and `.css` are read
 * as well as `.tsx`: a class string in a constants module or an `@apply` reaches the same
 * stylesheet. The script and the shipped-tree test both call this, so they cannot disagree about
 * which files are the tree.
 */
export async function collisionFindings(root = "src") {
  const files = await sourceFiles(root);
  const findings = [];
  for (const path of files) {
    const source = await readFile(path, "utf8");
    for (const { side, offsetInFile } of unresolvedCollisions(source, path.endsWith(".css") ? "css" : "js")) {
      findings.push({ path, side, line: lineAt(source, offsetInFile) });
    }
  }
  return { files: files.length, findings };
}
