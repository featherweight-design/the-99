// Every `var(--token)` a component names must be a token some theme declares.
//
// This exists because `browse-figure.tsx` shipped a card-art wash built from
// `--surface-2` and `--surface-3`. Neither has ever existed — the palette calls
// them `--surface-raised`, `--elevated` and `--surface-sunken` — so the
// gradient resolved to nothing and five card tiles rendered as voids with a
// count badge floating over empty space.
//
// Nothing caught it. TypeScript does not read class strings, the linter does
// not resolve CSS variables, and jsdom computes no styles, so every unit test
// passed. A screenshot is what found it, which is not a thing that scales to
// 35 figures.
//
// A missing token FAILS SILENTLY by design: that is what a CSS custom property
// does when it is unset and has no fallback. Silence is the whole hazard.
import { readFile } from "node:fs/promises";

/**
 * `--foo` on the left of a `:` declares `foo`. Read from the stylesheet AND
 * from source, because a component may declare a token of its own on an
 * element and read it back down the subtree — `--row-bg` on a decklist row,
 * `--zoom-w` on the card modal. Those are local by design and are not misses.
 */
export function declaredTokens(...sources) {
  const found = new Set();
  for (const text of sources) {
    for (const m of text.matchAll(/["']?(--[a-zA-Z0-9-]+)["']?\s*:/g)) found.add(m[1]);
    // `next/font` declares its variables in a config object, not in CSS:
    // `variable: "--font-plex-mono"` is what puts the name on <html>.
    for (const m of text.matchAll(/variable:\s*["'](--[a-zA-Z0-9-]+)["']/g)) found.add(m[1]);
  }
  return found;
}

/**
 * Every token a source file READS. `var(--x, fallback)` is deliberately
 * included: a fallback makes the miss survivable, not correct, and the one
 * that motivated this had no fallback at all.
 */
export function usedTokens(source) {
  return (
    [...source.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)]
      .map((m) => m[1])
      // `var(--fg-${tone})` leaves `--fg-` behind. A token name never ends in a
      // dash, so that is an interpolation and not a reference this can resolve.
      .filter((token) => !token.endsWith("-"))
  );
}

export async function findUndeclared(cssPath, files) {
  const sources = await Promise.all(files.map((f) => readFile(f, "utf8")));
  const declared = declaredTokens(await readFile(cssPath, "utf8"), ...sources);
  const misses = [];
  for (const [i, file] of files.entries()) {
    const source = sources[i];
    for (const token of new Set(usedTokens(source))) {
      if (!declared.has(token)) misses.push({ file, token });
    }
  }
  return misses;
}
