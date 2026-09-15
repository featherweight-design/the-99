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
