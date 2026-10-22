import { readFile } from "node:fs/promises";
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

import { existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ABOUT_SCREENS, ABOUT_VERSION, ALLOWANCE_SLOT, DECK_VIEWS, aboutCopy, aboutMenuCopy, aboutSheetCopy, fillAllowance } from "./about";
import { aboutEntries } from "./about-entries";
import pin from "./about.version.json";

const APP_DIR = join(process.cwd(), "src", "app");

/**
 * A route segment may be satisfied by a literal directory OR by a route group — `(name)`,
 * invisible in the URL — holding it, at any depth. `/collection/sets` is `page.tsx`'s own
 * route since the collection-surfaces route-group restructure (sets-tab persistence fix), via
 * `collection/(list)/sets/page.tsx` rather than `collection/sets/page.tsx`, and a resolver
 * that only tries the literal path reports a page that exists as missing.
 */
function resolvesToPage(dir: string, segments: string[]): boolean {
  if (!existsSync(dir)) return false;
  if (segments.length === 0 && existsSync(join(dir, "page.tsx"))) return true;
  const head = segments[0];
  const rest = segments.slice(1);
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const isGroup = entry.name.startsWith("(") && entry.name.endsWith(")");
    // A route group never consumes a segment, whether one remains or the path has already
    // ended — `page.tsx` for `/collection` can sit inside `collection/(list)/page.tsx` just
    // as directly as inside `collection/page.tsx`.
    if (isGroup && resolvesToPage(join(dir, entry.name), segments)) return true;
    if (head !== undefined && entry.name === head && resolvesToPage(join(dir, entry.name), rest)) {
      return true;
    }
  }
  return false;
}

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
    visibleStrings(aboutSheetCopy),
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
      expect(
        resolvesToPage(APP_DIR, segments),
        `${e.id} links ${path}, which has no page.tsx`,
      ).toBe(true);
    }
  });

  it("is a set of distinct entries, each with somewhere to go", () => {
    const ids = aboutEntries.map((e) => e.id);
    const titles = aboutEntries.map((e) => e.title);
    expect(new Set(ids).size, "duplicate id").toBe(ids.length);
    // An entry and the one it is drawn in place of (`replaces`) are never drawn together, so they alone may share a
    // title: the replacement is left out of the count, and it must replace an entry that exists.
    for (const e of aboutEntries) if (e.replaces) expect(ids, `${e.id} replaces`).toContain(e.replaces);
    const counted = aboutEntries.filter((e) => !e.replaces).map((e) => e.title);
    expect(new Set(counted).size, "duplicate title").toBe(counted.length);
    expect(titles.length - counted.length).toBe(2);
    for (const e of aboutEntries) {
      expect(e.route, `${e.id} has no route`).toBeTruthy();
      // Rule 3 of the copy file: zero keys is a finished answer, four is the
      // ceiling the annotation grammar can draw.
      expect(e.keys.length, `${e.id} has ${e.keys.length} keys`).toBeLessThanOrEqual(4);
    }
  });
});

// Two documents state the entry count in their own words. A number a reader is asked to trust
// should fail when it stops being true, so this reads the documents and compares them to the source.
describe("the documents that count the entries", () => {
  it.each(["docs/superpowers/design-tables/about.md", "docs/superpowers/gap-report-about.md"])("%s states the count the code has", async (doc) => {
    const text = await readFile(join(process.cwd(), doc), "utf8");
    expect(text).toContain(`The code has ${aboutEntries.length}`);
  });
});

describe("the credits entry", () => {
  // The caption holds a slot for the reader's own limit (admin PR 9c), never a fixed number.
  const caption = aboutEntries.find((e) => e.id === "credits")?.caption ?? "";
  it("holds the reader’s limit as a slot, not a number", () => {
    expect(caption).toContain(`You get ${ALLOWANCE_SLOT}, and each one comes back`);
    expect(caption).not.toMatch(/You get (five|ten|three|\d+),/);
  });
  it.each([
    [1, "one"],
    [5, "five"],
    [10, "ten"],
    [12, "12"],
  ])("fills a limit of %i as %s", (limit, spelled) => {
    const filled = fillAllowance(caption, limit);
    expect(filled).toContain(`You get ${spelled}, and each one comes back 24 hours after you use it.`);
    expect(filled).not.toContain(ALLOWANCE_SLOT);
  });
});

describe("every entry's place (discovery R2, E8)", () => {
  it("names one screen, and a view exactly when the screen is a deck", () => {
    for (const e of aboutEntries) {
      expect(ABOUT_SCREENS, e.id).toContain(e.screen);
      if (e.screen === "deck") expect(DECK_VIEWS, e.id).toContain(e.view);
      else expect(e.view, e.id).toBeUndefined();
    }
  });

  it("covers all 22 places the Reference lists, so no screen is drawn empty by accident", () => {
    const places = new Set(aboutEntries.map((e) => (e.view ? `${e.screen}/${e.view}` : e.screen)));
    expect(places.size).toBe(ABOUT_SCREENS.length - 1 + DECK_VIEWS.length);
    expect(places.size).toBe(22);
  });
});

