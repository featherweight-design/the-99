// Every `var(--token)` a component or stylesheet names must resolve to a token
// something declares.
//
// This exists because `browse-figure.tsx` shipped a card-art wash built from
// `--surface-2` and `--surface-3`. Neither has ever existed — the palette calls
// them `--surface-raised`, `--elevated` and `--surface-sunken` — so the
// gradient resolved to nothing and five card tiles rendered as voids with a
// count badge floating over empty space.
//
// Nothing caught it. TypeScript does not read class strings, the linter does
// not resolve CSS variables, and jsdom computes no styles, so every unit test
// passed. A screenshot is what found it, which does not scale to 35 figures.
//
// WHAT THE GUARD IS ABOUT IS SILENCE. An unset custom property with no fallback
// contributes nothing and reports nothing — the declaration simply drops. Two
// consequences, both of which the first version got wrong:
//
//   * A read WITH a fallback is a parameter with a default, not a miss.
//     `var(--bob-duration, 3s)` in `globals.css` is `.anim-bob` letting a
//     caller tune it and animating at 3s when nobody does. There is nothing to
//     declare. A typo inside a fallback read still renders — visibly, at the
//     fallback — which is the opposite of the failure this is for.
//   * A token a component declares on its OWN element is declared for that
//     file's subtree and nowhere else. Treating every local declaration as
//     globally valid let any component read `--row-bg` with the property unset
//     in its subtree and still pass.

/** `--foo` on the left of a `:` declares `foo`. */
function declarationsIn(text) {
  const found = new Set();
  for (const m of text.matchAll(/["']?(--[a-zA-Z0-9-]+)["']?\s*:/g)) found.add(m[1]);
  // `next/font` declares its variables in a config object, not in CSS:
  // `variable: "--font-plex-mono"` is what puts the name on <html>.
  for (const m of text.matchAll(/variable:\s*["'](--[a-zA-Z0-9-]+)["']/g)) found.add(m[1]);
  return found;
}

/** Declared for the whole app: the stylesheet, plus the font variables. */
export function globalTokens(...sources) {
  const found = new Set();
  for (const text of sources) for (const t of declarationsIn(text)) found.add(t);
  return found;
}

/** Declared by one file, for its own subtree only. */
export function localTokens(source) {
  return declarationsIn(source);
}

/**
 * Every token a source READS and depends on resolving.
 *
 * A read with a fallback is excluded — see the note above; it has a default and
 * cannot fail silently.
 */
export function usedTokens(source) {
  const used = [];
  // `[^)]*` after the name is what distinguishes `var(--x)` from
  // `var(--x, 3s)`: the second capture is the comma and whatever follows it.
  for (const m of source.matchAll(/var\(\s*(--[a-zA-Z0-9-]*)(\$\{([^}]*)\})?([^)]*)\)/g)) {
    const [, stem, , expr, tail] = m;
    if (tail.trimStart().startsWith(",")) continue; // a default, not a dependency

    // A plain reference. `var(--fg-${tone})` leaves the stem `--fg-` when the
    // brace is further along, and a token name never ends in a dash — so a
    // trailing dash is an interpolation this cannot resolve, and is skipped
    // rather than reported.
    if (!expr) {
      if (!stem.endsWith("-")) used.push(stem);
      continue;
    }

    // An interpolation. `var(--${inert ? "border" : "border-strong"})` names
    // two real tokens and the first regex matched NEITHER — it stopped at the
    // `$` and produced the stem `--`, filtered away as noise. Both branches
    // were outside the check, so a typo in either would have shipped exactly
    // the way `--surface-2` did.
    //
    // Every string literal in the expression is a candidate suffix. An
    // expression with no literal yields nothing, which is honest — this cannot
    // evaluate arbitrary code and does not pretend to.
    for (const lit of expr.matchAll(/["'`]([A-Za-z0-9-]+)["'`]/g)) used.push(`${stem}${lit[1]}`);
  }
  return used;
}

/**
 * `files` are checked for reads. `globalSources` declare for everyone; each
 * file additionally declares for itself.
 *
 * `stylesheets` are the one asymmetry, and it is not a loophole. A rule in
 * `globals.css` selects by class, and the element carrying that class is drawn
 * by a component — so a component setting a property inline and the stylesheet
 * reading it back are THE SAME ELEMENT by construction. `art-wash.tsx` sets
 * `--art-wash-reduced-opacity` on the layer and `globals.css` reads it inside a
 * `prefers-reduced-transparency` query on `.art-wash-art`, which is that layer.
 *
 * The reverse must not hold, and does not: one component reading another
 * component's local token has no such guarantee, and is exactly the case the
 * global-union version passed over.
 */
export function undeclaredIn(files, globalSources, stylesheets = new Set()) {
  const global = globalTokens(...globalSources);
  const componentDeclared = new Set();
  for (const { path, source } of files) {
    if (stylesheets.has(path)) continue;
    for (const token of localTokens(source)) componentDeclared.add(token);
  }

  const misses = [];
  for (const { path, source } of files) {
    const local = localTokens(source);
    const reachable = stylesheets.has(path) ? componentDeclared : null;
    for (const token of new Set(usedTokens(source))) {
      if (global.has(token) || local.has(token)) continue;
      if (reachable?.has(token)) continue;
      misses.push({ file: path, token });
    }
  }
  return misses;
}
