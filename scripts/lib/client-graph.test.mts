import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { chainTo, clientGraph, directiveOf } from "./client-graph.mjs";

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
  "src/lib/tuning/limits.ts",
  "src/lib/tuning/presentation.ts",
]);

function importsCopy(file: string, target: string): boolean {
  const name = target.replace(/^src\/lib\//, "").replace(/\.ts$/, "");
  return new RegExp(`from\\s+["'][^"']*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(fs.readFileSync(file, "utf8"));
}

describe("client graph helpers", () => {
  it("reads the directive after a comment", () => {
    expect(directiveOf(`// note\n"use client";\nexport {}`)).toBe("client");
    expect(directiveOf(`"use server"\nexport {}`)).toBe("server");
    expect(directiveOf(`import "x";\n"use client";`)).toBeNull();
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
    const strays = found.filter((f) => !PANEL_IMPORTERS.has(f)).map((f) => chainTo(f, via).join(" > "));
    expect(strays, "import the slice (deck-tuning-games.ts) instead of deck-tuning.ts").toEqual([]);
  });
});
