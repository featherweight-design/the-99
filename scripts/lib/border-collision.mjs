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
 * A bare colliding utility, found anywhere in the stripped source — `\bborder-b\b` and
 * `\bborder-r\b`, never `border-b-2`/`border-b-0`/`border-b-[...]`/`border-bottom-*`, all of
 * which are distinct identifiers a word-boundary match already excludes. Each match's offset is
 * kept so a caller can check for a companion override nearby without re-deriving positions.
 */
function bareCollisions(text) {
  const found = [];
  for (const side of COLLIDING_SIDES) {
    // `\b` alone matches mid-token: "border-b-0" contains "border-b" at a word boundary (the
    // following "-" is non-word), so a plain `\bborder-b\b` wrongly flags the WIDTH utility
    // `border-b-0`/`md:border-b-0` — a different, unambiguous utility with no color collision at
    // all. The bare, colliding form is only the EXACT token with nothing after it but a
    // non-identifier character (space, quote, end of string) — never another `-`.
    const re = new RegExp(`(?<![\\w-])border-${side}(?![\\w-])`, "g");
    for (const m of text.matchAll(re)) found.push({ side, index: m.index });
  }
  return found.sort((a, b) => a.index - b.index);
}

/**
 * Whether `text` already fixes a bare collision at `side` with an explicit SIDE-SPECIFIC color
 * utility — `border-{side}-[color:...]`, `border-{side}-[...]` (a bare arbitrary value also
 * renders as a color here, since width/style take a scale key not a bracket) or a named color
 * utility `border-{side}-{token}` where `{token}` is not a bare digit (`border-b-2` is a width).
 * SIDE-SPECIFIC only — a GENERIC `[border-color:...]` or unprefixed `border-{token}` utility sits
 * EARLIER in the compiled stylesheet than the bare collision and loses to it, confirmed against
 * the compiled output, so it does not count as a fix here.
 */
function hasSideOverride(text, side) {
  return new RegExp(`\\bborder-${side}-(\\[|[a-zA-Z])`).test(text);
}

/**
 * Every bare collision in `text` with no companion side-specific override — the set a caller
 * should give an explicit color to. One entry per (side, string-span) pair: a file is scanned
 * SPAN BY SPAN (each class-string literal in isolation) because a fix co-located in a different
 * className on the same file does not reach this one.
 */
export function unresolvedCollisions(text) {
  // A nested template literal's text is covered by two spans — the outer template's full raw
  // text (which includes the interpolation verbatim) and the inner template's own span — so the
  // same physical collision can surface twice at the identical offset. Deduped by (side, offset).
  const seen = new Set();
  const out = [];
  for (const span of scan(text)) {
    for (const { side, index } of bareCollisions(span.text)) {
      if (!hasSideOverride(span.text, side)) {
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
