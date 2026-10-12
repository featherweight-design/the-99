// One printing on the tile, the hover preview and card details (Hugh, 2026-10-12). Card details always
// resolves server-side (deck pick, then the printing the player owns, then the catalog's), so a hover
// preview that reads `cards.image_uri` shows a different printing from the card the same row opens: the
// Top-off list did exactly that, and the chain's own docstring said it was covered.
//
// This COMPUTES the hover surfaces by import: every component that imports `usePreviewRow` must be named
// below with the module that feeds it its art, and that module must call a resolver that applies the
// chain. A new hover surface fails until it is added here, which is the point: nobody has to remember.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The calls that apply the chain, or read the printing a version recorded (the version diff's own rule). */
export const RESOLVERS = new Set([
  "chainArt", "resolveOwnedPrintings", "resolveDeckOwnedPrintings", "withOwnedCardArt", "readRecordedPrintingArt",
]);

/** Components that draw a hover preview, mapped to the module whose read supplies the art they hand it. */
const FEEDERS: Record<string, string> = {
  "components/decks/decklist-row.tsx": "lib/decks/read.ts",
  "components/decks/suggestion-card.tsx": "lib/decks/tuning-read.ts",
  "components/decks/suggestion-line.tsx": "lib/decks/tuning-read.ts",
  "components/decks/mana-improve-door.tsx": "app/decks/mana-actions.ts",
  "components/decks/stand-ins-sheet.tsx": "lib/swaps/gather.ts",
  "components/decks/top-off-list.tsx": "app/decks/[id]/page.tsx",
  "components/decks/update-diff-row.tsx": "lib/decks/draft-state.ts",
  "components/decks/notes/note-tags.tsx": "lib/decks/notes-read.ts",
  "components/decks/synopsis-text.tsx": "lib/synopsis/read.ts",
  "components/decks/version-diff.tsx": "lib/decks/versions.ts",
  "components/decks/benchmark-ledger.tsx": "lib/decks/read.ts",
  // Tokens are their own bug batch's, and precons their own lane's: named so the list stays complete, not checked.
  "components/decks/token-makers.tsx": "",
};

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Files that IMPORT `usePreviewRow` as a binding: a comment naming it is not a hover surface. */
export function hoverSurfaces(files: Record<string, string>): string[] {
  return Object.entries(files)
    .filter(([path, src]) => !/\.test\.tsx?$/.test(path) && /import\s*\{[^}]*\busePreviewRow\b[^}]*\}\s*from/.test(src))
    .map(([path]) => path)
    .sort();
}

/** A real call to a resolver: a comment or a string that names one makes none. */
export function usesResolver(src: string): boolean {
  const file = ts.createSourceFile("feeder.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found = false;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : "";
      if (RESOLVERS.has(name)) found = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

describe("the hover-art guard's own failure paths", () => {
  it("finds a component that imports usePreviewRow and ignores one that only mentions it", () => {
    expect(hoverSurfaces({
      "components/a.tsx": `import { usePreviewRow } from "./hover-preview";`,
      "components/b.tsx": `// borrowed from usePreviewRow\nexport const x = 1;`,
      "components/a.test.tsx": `import { usePreviewRow } from "./hover-preview";`,
    })).toEqual(["components/a.tsx"]);
    expect(hoverSurfaces({ "components/c.tsx": `import { HoverPreviewProvider, usePreviewRow } from "./hover-preview";` })).toEqual(["components/c.tsx"]);
  });

  it("calls a feeder that reads cards.image_uri with no resolver unresolved", () => {
    expect(usesResolver(`const rows = await db.select({ imageUri: cards.imageUri }).from(cards);`)).toBe(false);
    expect(usesResolver(`const art = await chainArt(userId, null, ids);`)).toBe(true);
  });

  it("does not take a comment or a string that names a resolver for a call to it", () => {
    expect(usesResolver(`// call chainArt(userId, null, ids) here\nconst note = "resolveOwnedPrintings(";\nexport const x = 1;`)).toBe(false);
  });
});

describe("every hover preview shows the printing card details opens", () => {
  const files: Record<string, string> = {};
  for (const path of walk(SRC)) {
    if (/\.tsx?$/.test(path)) files[relative(SRC, path)] = readFileSync(path, "utf8");
  }

  it("names every component that draws a hover preview", () => {
    expect(hoverSurfaces(files)).toEqual(Object.keys(FEEDERS).sort());
  });

  for (const [component, feeder] of Object.entries(FEEDERS)) {
    if (feeder === "") continue;
    it(`${component} is fed by ${feeder}, which applies the chain`, () => {
      expect(files[feeder], `${feeder} does not exist`).toBeDefined();
      expect(usesResolver(files[feeder])).toBe(true);
    });
  }
});
