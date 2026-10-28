import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ABOUT_RULES, ABOUT_SECTIONS } from "../copy/about-pages";
import { LEGACY_SECTIONS, legacyHref, legacySection } from "./legacy-href";

describe("legacyHref (Review Focus 3)", () => {
  it("sends a Reference entry to the page section that now holds it", () => {
    expect(legacyHref("/about?tab=reference#credits")).toBe("/about/decks#analysis");
    expect(legacyHref("/about?tab=reference#locked-cards")).toBe("/about/decks#your-deck");
    expect(legacyHref("/about?tab=reference#stand-ins")).toBe("/about/shopping#deck-shopping");
  });

  it("sends what's new, a cut entry and an unknown hash to the index", () => {
    expect(legacyHref("/about?tab=reference#new")).toBe("/about");
    // `push` was cut (audit row 83): no unit holds it.
    expect(legacyHref("/about?tab=reference#push")).toBe("/about");
    expect(legacyHref("/about?tab=reference#nothing-here")).toBe("/about");
    expect(legacyHref("/about?tab=reference#%E0%A4%A")).toBe("/about");
  });

  it("sends the bare Reference and the retired Tools tab to the index", () => {
    expect(legacyHref("/about?tab=reference")).toBe("/about");
    expect(legacyHref("/about?tab=tools")).toBe("/about");
  });

  it("leaves anything else unchanged", () => {
    for (const href of ["/about", "/about/decks#analysis", "/decks?tab=reference", "/credits", "https://example.com/about?tab=reference"]) {
      expect(legacyHref(href)).toBe(href);
    }
  });

  it("holds exactly the table the About pages derive, so the light copy cannot drift (Copilot round 1)", () => {
    // A label's own section, or the first section in page order listing a rule that holds the id.
    const derived: Record<string, string> = {};
    for (const s of ABOUT_SECTIONS) {
      const here = [...s.labels.flatMap((l) => l.legacy), ...s.rules.flatMap((id) => ABOUT_RULES[id].legacy)];
      for (const id of here) if (!Object.hasOwn(derived, id)) derived[id] = `${s.area}/${s.id}`;
    }
    expect(LEGACY_SECTIONS).toEqual(derived);
  });

  it("imports no About copy, so the banner and the credits copy ship none of it", () => {
    const text = fs.readFileSync("src/lib/about/legacy-href.ts", "utf8");
    expect(text).not.toMatch(/^import\s(?!type\b)/m);
  });

  it("maps every id in every unit's legacy list to a page section that exists", () => {
    const ids = new Set<string>();
    for (const s of ABOUT_SECTIONS) for (const l of s.labels) for (const id of l.legacy) ids.add(id);
    for (const r of Object.values(ABOUT_RULES)) for (const id of r.legacy) ids.add(id);
    expect(ids.size).toBeGreaterThan(30);
    for (const id of ids) {
      const s = legacySection(id);
      expect(s, id).not.toBeNull();
      const [area, section] = legacyHref(`/about?tab=reference#${id}`).slice("/about/".length).split("#");
      expect(ABOUT_SECTIONS.some((x) => x.area === area && x.id === section), id).toBe(true);
    }
  });
});

describe("no link the app builds names the Reference", () => {
  // The Reference tab's own files may (it still draws until PR 7b); `legacy-href.ts` holds the mapping; anything else
  // that spells `tab=reference` must hand it to `legacyHref(...)`.
  const ALLOWED = new Set([
    "src/lib/about/legacy-href.ts",
    "src/lib/about/reveal-entry.ts",
    "src/components/about/reference/reference-tab.tsx",
    "src/components/about/reference/entry-frame.tsx",
    "src/components/about/reference/creator-note.tsx",
  ]);
  /** The code alone: comments say where a link used to go, and a `legacyHref("…")` call is the mapping itself. */
  const code = (text: string) =>
    text
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/legacyHref\(\s*["'`][^"'`]*["'`]\s*\)/g, "");
  const walk = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      return e.isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
    });

  it("only legacy-href.ts and the Reference's own files spell tab=reference outside a legacyHref call", () => {
    const strays = walk("src")
      .map((f) => f.split(path.sep).join("/"))
      .filter((f) => !ALLOWED.has(f))
      .filter((f) => {
        const text = code(fs.readFileSync(f, "utf8"));
        return /tab=reference/.test(text);
      });
    expect(strays).toEqual([]);
  });

  it("would catch a builder that spells it", () => {
    expect(/tab=reference/.test(code("// a comment naming /about?tab=reference\nconst x = `/about?tab=reference#${id}`;"))).toBe(true);
    expect(/tab=reference/.test(code('// /about?tab=reference\nconst y = legacyHref("/about?tab=reference#credits");'))).toBe(false);
  });
});
