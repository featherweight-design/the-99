import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { chainTo, clientGraph, directiveOf, valueImports } from "./client-graph.mjs";

// Copy modules that belong to the deck page's tools, and must stay out of the client bundle of the
// routes that only list or summarise decks. Each is a file a one-line import can drag in whole.
const DECK_PAGE_ONLY = [
  "src/lib/copy/deck-tuning.ts",
  "src/lib/copy/deck-tuning-games.ts",
  "src/lib/copy/tuning-hub.ts",
];
const LAYOUT = "src/app/layout.tsx";

// The only client files allowed to import the Tuning panels' strings (`deck-tuning.ts`) on the deck
// page: the panels and their parts. A new importer is a decision, so it is named here rather than
// discovered in a bundle report.
const PANEL_IMPORTERS = new Set([
  "src/components/decks/cuts-panel.tsx",
  "src/components/decks/mana-improve-door.tsx",
  "src/components/decks/manifest-rows.tsx",
  "src/components/decks/suggestion-card.tsx",
  "src/components/decks/suggestion-line.tsx",
  "src/components/decks/suggestion-lists.tsx",
  "src/components/decks/tuning-history.tsx",
  "src/components/decks/tuning-panel.tsx",
  "src/lib/tuning/gate.ts",
  "src/lib/tuning/presentation.ts",
]);

// A value import of `target`, found by the same AST walk the graph follows (so a side-effect import
// counts, and a type-only import or a mention in a comment does not).
function importsCopy(file: string, target: string): boolean {
  return valueImports(file, fs.readFileSync(file, "utf8")).includes(target.replace(/\.ts$/, "") + ".ts");
}

describe("client graph helpers", () => {
  it("reads the directive after a comment", () => {
    expect(directiveOf(`// note\n"use client";\nexport {}`)).toBe("client");
    expect(directiveOf(`"use server"\nexport {}`)).toBe("server");
    expect(directiveOf(`import "x";\n"use client";`)).toBeNull();
  });

  it("valueImports follows value and side-effect imports and skips type-only ones and comments", () => {
    const src = [
      `// import { x } from "../copy/deck-tuning";`,
      `import "../copy/deck-tuning";`,
      `import type { T } from "../copy/tuning-hub";`,
      `import { type U } from "../copy/deck-tuning-games";`,
    ].join("\n");
    expect(valueImports("src/lib/cards/a.ts", src)).toEqual(["src/lib/copy/deck-tuning.ts"]);
  });

  it("chainTo lists the route's client root first", () => {
    const via = new Map([["c", "b"], ["b", "a"]]);
    expect(chainTo("c", via)).toEqual(["a", "b", "c"]);
  });
});

describe("the startup graph keeps the deck page's copy on the deck page", () => {
  it("Home and /decks ship none of the deck tools' copy modules", { timeout: 30_000 }, () => {
    for (const page of ["src/app/page.tsx", "src/app/decks/page.tsx"]) {
      const { files, via } = clientGraph([LAYOUT, page]);
      for (const target of DECK_PAGE_ONLY) {
        const found = [...files].filter((f) => importsCopy(f, target));
        expect(found.map((f) => chainTo(f, via).join(" > ")), `${page} imports ${target}`).toEqual([]);
      }
    }
  });

  it("on the deck page, deck-tuning.ts is imported by the Tuning panels and their parts, and no other surface", { timeout: 30_000 }, () => {
    const { files, via } = clientGraph([LAYOUT, "src/app/decks/[id]/page.tsx"]);
    const found = [...files].filter((f) => importsCopy(f, "src/lib/copy/deck-tuning.ts"));
    expect(found.length, "the deck page reaches deck-tuning.ts through its panels, or this guard walks nothing").toBeGreaterThan(0);
    const strays = found.filter((f) => !PANEL_IMPORTERS.has(f)).map((f) => chainTo(f, via).join(" > "));
    expect(strays, "import the slice (deck-tuning-games.ts) instead of deck-tuning.ts").toEqual([]);
  });
});

describe("the About page's client bundle stays off the database", () => {
  it("no file the page ships to the browser reaches src/db", { timeout: 30_000 }, () => {
    // The figures draw shipped components over fixtures, and a fixture builder that imported a module which also
    // held a query (summarizeMatchups through games.ts) put `src/db` in the browser: `DATABASE_URL is not set`
    // on module evaluation and the whole page in its error boundary. jsdom never evaluates that module's db.
    const { files, via } = clientGraph([LAYOUT, "src/app/about/page.tsx"]);
    const found = [...files].filter((f) => f === "src/db/index.ts" || f.startsWith("src/db/"));
    expect(found.map((f) => chainTo(f, via).join(" > "))).toEqual([]);
  });
});

describe("the About entry list ships only with /about", () => {
  // `about-entries.ts` is ~1,500 lines of copy (discovery plan R2·1b, R2 gap 6). The "?" fetches the entries it needs
  // from `GET /api/about/entries`, so no page but `/about` may carry the list in its bundle. The rule names the entry
  // list, not `about.ts`, whose other copy the shell's account menu and the Analysis tab import on purpose.
  it("no page outside /about reaches about-entries.ts", { timeout: 60_000 }, () => {
    const pages = (fs.readdirSync("src/app", { recursive: true }) as string[])
      .map((f) => `src/app/${f.split("\\").join("/")}`)
      .filter((p) => p.endsWith("/page.tsx") && !p.startsWith("src/app/about/"));
    expect(pages.length, "the guard found no pages, so it checks nothing").toBeGreaterThan(10);
    const { files, via } = clientGraph([LAYOUT, ...pages]);
    const found = [...files].filter((f) => importsCopy(f, "src/lib/copy/about-entries.ts"));
    expect(found.map((f) => chainTo(f, via).join(" > "))).toEqual([]);
  });

  it("recognizes an import of the list, so a green above is not a matcher that never fires", () => {
    // `visible.ts` is a server module that imports the list by value; the walk above is the one the deck page's rule
    // relies on, and its failure path was run by importing the list into the shell's account menu.
    expect(importsCopy("src/lib/about/visible.ts", "src/lib/copy/about-entries.ts")).toBe(true);
  });
});

