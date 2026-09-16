// The guard on /about's content. Four pins, and the reason each exists is the
// same: this page is the one place in the app whose job is telling a reader
// what exists and where, so a wrong line here is worse than a wrong line
// anywhere else.
//
// What no guard can catch is a feature shipping with no entry written at all.
// That is a rule in three places rather than a check — see AGENTS.md §Design
// pipeline. Between R2 and R4 of the design round, two features reached `main`
// with no entry; the mechanism that fixes that is process, and this file only
// covers the half a machine can read.

import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ABOUT_VERSION, aboutCopy, aboutEntries, aboutMenuCopy } from "./about";
import pin from "./about.version.json";

const APP_DIR = join(process.cwd(), "src", "app");

/** Everything a reader sees, walked rather than listed.
 *
 *  Listing the fields by hand is how this guard first shipped, and it covered
 *  `aboutEntries` alone — so the page title, the chapter headings, the NEW
 *  badge, the dismiss and the account-menu row could all be rewritten without
 *  the pin moving, while the test's own name promised otherwise. A walk cannot
 *  drift from the object that way: a field added to `aboutCopy` tomorrow is in
 *  the hash the moment it exists.
 *
 *  Functions are called rather than skipped, with 1 and 2, because every one of
 *  them is a sentence with a number in it and the singular branch is a separate
 *  string a reader meets. `dismissDestination` takes a route and gets the same
 *  treatment: the result is nonsense prose, but it is deterministic nonsense
 *  that changes when the template does, which is all the hash asks of it.
 *
 *  Comments and formatting stay outside: a typo fix in a code comment is not a
 *  change to the page, and a guard that fired on one would be re-pinned
 *  reflexively until it meant nothing. */
function visibleStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (typeof value === "number") return [String(value)];
  if (typeof value === "function") {
    return [1, 2].map((n) => String((value as (arg: unknown) => unknown)(n)));
  }
  if (Array.isArray(value)) return value.flatMap(visibleStrings);
  if (value && typeof value === "object") {
    return Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([key, v]) => [key, ...visibleStrings(v)]);
  }
  return [];
}

function contentHash(): string {
  const shape = [
    visibleStrings(aboutEntries),
    visibleStrings(aboutCopy),
    visibleStrings(aboutMenuCopy),
  ];
  return createHash("sha256").update(JSON.stringify(shape)).digest("hex");
}

/** `/collection?avail=inuse,over` is a real destination; its query is not part
 *  of the file tree. Strip it before resolving, and keep it in the link. */
function pathOf(route: string): string {
  return route.split("?")[0];
}

describe("about content", () => {
  it("has not changed without a deliberate bump or re-pin", () => {
    // Failing here is the guard working. Two ways out, and both are a decision:
    // add an entry or rewrite a caption, and bump ABOUT_VERSION so every reader
    // sees the page again; or fix a typo, and re-pin the hash on its own.
    expect(contentHash()).toBe(pin.hash);
    expect(ABOUT_VERSION).toBe(pin.version);
  });

  it("claims no entry from a future version", () => {
    for (const e of aboutEntries) {
      expect(e.since, `${e.id} is since ${e.since}`).toBeLessThanOrEqual(ABOUT_VERSION);
      expect(e.since, `${e.id} is since ${e.since}`).toBeGreaterThan(0);
    }
  });

  it("links only routes that exist, and none that is dynamic", () => {
    for (const e of aboutEntries) {
      const path = pathOf(e.route);
      expect(path.startsWith("/"), `${e.id} links ${e.route}`).toBe(true);

      // A `[slug]` is a filesystem pattern, not an href: this page holds no id
      // to substitute into one, so a link built from it is a guaranteed 404.
      // The rule is that the entry names the list route that reaches the
      // feature and says where it opens once you are there.
      expect(path.includes("["), `${e.id} links the pattern ${path}`).toBe(false);

      const segments = path.split("/").filter(Boolean);
      const file = join(APP_DIR, ...segments, "page.tsx");
      expect(existsSync(file), `${e.id} links ${path}, which has no page.tsx`).toBe(true);
    }
  });

  it("is a set of distinct entries, each with somewhere to go", () => {
    const ids = aboutEntries.map((e) => e.id);
    const titles = aboutEntries.map((e) => e.title);
    expect(new Set(ids).size, "duplicate id").toBe(ids.length);
    expect(new Set(titles).size, "duplicate title").toBe(titles.length);
    for (const e of aboutEntries) {
      expect(e.route, `${e.id} has no route`).toBeTruthy();
      // Rule 3 of the copy file: zero keys is a finished answer, four is the
      // ceiling the annotation grammar can draw.
      expect(e.keys.length, `${e.id} has ${e.keys.length} keys`).toBeLessThanOrEqual(4);
    }
  });
});

// Rule 2 of the copy file — a specimen draws its strings from the surface's own
// copy file at render time, never retyped here — is deliberately NOT pinned.
// The obvious check, "no other copy module is imported into the entry block",
// matched the word `import` inside 'An import replaces what is there' and
// failed on prose. Any cheap form of it measures the wrong thing; it stays a
// review rule, and the page's figures enforce it in build by mounting the real
// component rather than a retyped copy of one.

describe("every entry is drawn, not just described", () => {
  // The handoff's unit is a FIGURE WITH A CAPTION — R2's whole pivot away from
  // R1 was Design saying a page of paragraphs cannot teach a fit score, a
  // doubled diamond or a dashed cell, and R3's own heading reads "thirty-two
  // entries, thirty-two figures".
  //
  // What shipped was five figures and a comment in `figures.tsx` calling the
  // map "partial on purpose". That comment is an argument; this is a test,
  // which is the difference. The gap was invisible to every gate the feature
  // passed: a diff shows what was added, review reads the diff, and the
  // contact-sheet inventory photographed the figures that existed — so it
  // confirmed the scope back to its author.
  //
  // `NOT_YET_DRAWN` is a ledger that must shrink to empty. An entry is removed
  // from it when its figure lands; nothing is ever added.
  // Empty. Every entry on the page is drawn.
  const NOT_YET_DRAWN = new Set<string>([]);

  it("registers no figure under a name no entry has", async () => {
    // Without this, a typo pairs with the ledger to hide itself: `brows` in
    // FIGURES and `browse` on the ledger satisfies both the count and the
    // undrawn check, and the entry stays wordless.
    const { FIGURES } = await import("../../components/about/figures");
    const ids = new Set(aboutEntries.map((e) => e.id));
    expect(Object.keys(FIGURES).filter((k) => !ids.has(k))).toEqual([]);
  });

  it("has a figure for every entry, or names it in the ledger", async () => {
    const { FIGURES } = await import("../../components/about/figures");
    const undrawn = aboutEntries.filter((e) => !(e.id in FIGURES)).map((e) => e.id);
    // Nothing may go undrawn without being on the ledger. A new entry that
    // arrives with neither a figure nor a line here fails immediately, which
    // is the case the rule in AGENTS.md cannot enforce on its own.
    expect(undrawn.filter((id) => !NOT_YET_DRAWN.has(id))).toEqual([]);
  });

  it("keeps no stale names on the ledger", () => {
    // A figure that lands must take its entry off the list, or the ledger
    // stops measuring how far there is left to go.
    const ids = new Set(aboutEntries.map((e) => e.id));
    expect([...NOT_YET_DRAWN].filter((id) => !ids.has(id))).toEqual([]);
  });

  it("reports how much of the page is still words", async () => {
    const { FIGURES } = await import("../../components/about/figures");
    const drawn = aboutEntries.filter((e) => e.id in FIGURES).length;
    // Not an assertion about the number — a place for it to be READ. The
    // feature shipped reporting "four composition plates" outstanding when the
    // real figure was twenty-nine.
    expect(drawn + NOT_YET_DRAWN.size).toBe(aboutEntries.length);
  });
});
