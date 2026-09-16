import { describe, expect, it } from "vitest";

import { globalTokens, localTokens, undeclaredIn, usedTokens } from "./tokens.mjs";

// Every case here is a shape that defeated a version of this parser, and every
// failure mode it has is a SILENT PASS — the check prints "no undeclared
// tokens" and measures nothing. That is the same hazard as the bug it exists
// to catch, one level up, which is why the parser is pinned rather than trusted.
describe("usedTokens", () => {
  it("reads a plain reference", () => {
    expect(usedTokens("color: var(--fg-muted);")).toEqual(["--fg-muted"]);
  });

  it("does not report a read that carries a default", () => {
    // `var(--bob-duration, 3s)` is `.anim-bob` letting a caller tune it and
    // animating at 3s when nobody does. Nothing to declare, and a typo inside
    // one renders visibly at the fallback rather than silently at nothing.
    expect(usedTokens("animation: bob var(--bob-duration, 3s) linear;")).toEqual([]);
    expect(usedTokens("color: var(--fg, #fff);")).toEqual([]);
  });

  it("checks a var() nested inside a fallback, which is load-bearing", () => {
    // `var(--primary, var(--fallback))` drops the whole declaration when BOTH
    // are unset, so the inner name is a real dependency. The version that
    // matched a whole balanced expression with `[^)]*` stopped at the first
    // `)` and saw neither name.
    expect(usedTokens("color: var(--primary, var(--fallback));")).toEqual(["--fallback"]);
  });

  it("does not read a token out of a comment either", () => {
    // The declaration side was swept first and the read side was left, which
    // is the instance-not-class mistake: CSS never evaluates a comment, so a
    // note explaining this guard — `// var(--does-not-exist)` — would have
    // failed CI over prose.
    expect(usedTokens("// var(--does-not-exist)\ncolor: var(--fg);")).toEqual(["--fg"]);
    expect(usedTokens("/* var(--gone) */")).toEqual([]);
  });

  it("resolves both branches of an interpolated read", () => {
    // The first version's regex stopped at the `$` and produced the stem `--`,
    // which was then filtered away as noise — so `top-off-list.tsx` named two
    // real tokens and NEITHER was checked.
    const source = '`1px solid var(--${inert ? "border" : "border-strong"})`';
    expect(usedTokens(source).sort()).toEqual(["--border", "--border-strong"]);
  });

  it("skips an interpolation it cannot resolve rather than inventing one", () => {
    // A stem with a trailing dash and no literal to complete it. Reporting
    // `--fg-` would be a false finding; reporting nothing is honest.
    expect(usedTokens("color: `var(--fg-${tone})`;")).toEqual([]);
    expect(usedTokens("color: `var(--${compute()})`;")).toEqual([]);
  });
});

describe("declarations", () => {
  it("reads a CSS declaration and a quoted style-object key", () => {
    expect([...globalTokens("--fg: #fff;")]).toContain("--fg");
    expect([...localTokens('{ "--row-bg": "var(--surface)" }')]).toContain("--row-bg");
  });

  it("does not take a declaration out of a comment", () => {
    // Prose is where a retired token name survives longest, and a comment
    // declaring one let a real read of it pass — a false negative in the
    // guard's own failure mode.
    expect([...localTokens("// --ghost-token: the old name\nconst a = 1;")]).toEqual([]);
    expect([...localTokens("/* --ghost-block: gone */")]).toEqual([]);
  });

  it("reads a next/font variable, which is declared in no stylesheet", () => {
    expect([...globalTokens('{ variable: "--font-plex-mono" }')]).toContain("--font-plex-mono");
  });
});

describe("undeclaredIn", () => {
  const GLOBAL = ["--fg: #fff; --surface: #000;"];

  it("reports a token nothing declares", () => {
    const misses = undeclaredIn([{ path: "a.tsx", source: "var(--surface-2)" }], GLOBAL);
    expect(misses).toEqual([{ file: "a.tsx", token: "--surface-2" }]);
  });

  it("accepts a token the reading file declares for its own subtree", () => {
    const source = '<div style={{ "--row-bg": "red" }}><Seam c="var(--row-bg)" /></div>';
    expect(undeclaredIn([{ path: "row.tsx", source }], GLOBAL)).toEqual([]);
  });

  it("does NOT let one component resolve against another's local token", () => {
    // The version that unioned every file's declarations passed this, so a new
    // component could read `--row-bg` with the property unset in its subtree
    // and the check would agree with it.
    const files = [
      { path: "row.tsx", source: '{ "--row-bg": "red" }' },
      { path: "other.tsx", source: "var(--row-bg)" },
    ];
    expect(undeclaredIn(files, GLOBAL)).toEqual([{ file: "other.tsx", token: "--row-bg" }]);
  });

  it("lets a stylesheet resolve against a component's declaration", () => {
    // A rule selects by class and the element carrying it is drawn by a
    // component, so the two are the same element by construction —
    // `art-wash.tsx` sets the property inline, `globals.css` reads it back.
    const files = [
      { path: "art.tsx", source: '{ "--art-wash-reduced-opacity": 0.3 }' },
      { path: "globals.css", source: ".art-wash-art { opacity: var(--art-wash-reduced-opacity); }" },
    ];
    expect(undeclaredIn(files, GLOBAL, new Set(["globals.css"]))).toEqual([]);
  });

  it("still checks the stylesheet's own misspellings", () => {
    // The asymmetry above is not a pass for anything `globals.css` names.
    const files = [{ path: "globals.css", source: "a { color: var(--fgg); }" }];
    expect(undeclaredIn(files, GLOBAL, new Set(["globals.css"]))).toEqual([
      { file: "globals.css", token: "--fgg" },
    ]);
  });
});
