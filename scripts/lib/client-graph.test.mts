import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { chainTo, clientGraph, directiveOf, valueImports } from "./client-graph.mjs";

// Modules that belong to the Tuning tools, and must stay out of the client bundle of every route that
// does not open them. The tools are loaded on demand (`tuning-tools.tsx`, a dynamic `import()`, which is
// a lazy chunk and not part of the startup graph), and each of these is a file a one-line static import
// can drag back in whole.
const TUNING_TOOLS = [
  "src/lib/copy/deck-tuning.ts",
  "src/lib/copy/tuning-hub.ts",
  "src/components/decks/tuning-hub.tsx",
  "src/components/decks/tuning-panel.tsx",
  "src/components/decks/cuts-panel.tsx",
  "src/components/decks/mana-balance-panel.tsx",
  "src/components/decks/mana-improve-door.tsx",
  "src/components/decks/tuning-history.tsx",
];
// The game note and the Games tab's pointer: the deck page's Games panel draws them, Home and /decks do not.
const GAMES_COPY = "src/lib/copy/deck-tuning-games.ts";
const LAYOUT = "src/app/layout.tsx";
const ROUTES = {
  home: "src/app/page.tsx",
  decks: "src/app/decks/page.tsx",
  deck: "src/app/decks/[id]/page.tsx",
};

// A value import of `target`, found by the same AST walk the graph follows (so a side-effect import
// counts, and a type-only import, a dynamic import or a mention in a comment does not).
function imports(file: string, target: string): boolean {
  return valueImports(file, fs.readFileSync(file, "utf8")).includes(target);
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

  it("valueImports does not follow a dynamic import, which is a lazy chunk", () => {
    expect(valueImports("src/lib/cards/a.ts", `const m = () => import("../copy/deck-tuning");`)).toEqual([]);
  });

  it("chainTo lists the route's client root first", () => {
    const via = new Map([["c", "b"], ["b", "a"]]);
    expect(chainTo("c", via)).toEqual(["a", "b", "c"]);
  });
});

describe("the startup graph keeps the Tuning tools off the routes that do not open them", () => {
  for (const [name, page] of Object.entries(ROUTES)) {
    it(`${name} ships none of the Tuning tools or their copy`, { timeout: 30_000 }, () => {
      const { files, via } = clientGraph([LAYOUT, page]);
      // Not vacuous: the walk reaches the page's own client code.
      expect(files.size, `${page} walked nothing`).toBeGreaterThan(50);
      for (const target of TUNING_TOOLS) {
        const found = [...files].filter((f) => imports(f, target));
        expect(found.map((f) => chainTo(f, via).join(" > ")), `${page} imports ${target}`).toEqual([]);
        expect(files.has(target), `${page} ships ${target}`).toBe(false);
      }
    });
  }

  it("Home and /decks ship none of the game note's copy", { timeout: 30_000 }, () => {
    for (const page of [ROUTES.home, ROUTES.decks]) {
      const { files, via } = clientGraph([LAYOUT, page]);
      const found = [...files].filter((f) => imports(f, GAMES_COPY));
      expect(found.map((f) => chainTo(f, via).join(" > ")), `${page} imports ${GAMES_COPY}`).toEqual([]);
    }
  });

  it("the deck page still ships the shell that loads the tools, so the guard is looking at the right graph", { timeout: 30_000 }, () => {
    const { files } = clientGraph([LAYOUT, ROUTES.deck]);
    expect(files.has("src/components/decks/builder-shell.tsx")).toBe(true);
    expect(files.has("src/components/decks/tuning-tools.tsx")).toBe(true);
  });
});
