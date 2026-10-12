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
  "components/decks/deck-card-tile.tsx": "lib/decks/read.ts",
  "components/decks/suggestion-tile.tsx": "lib/decks/suggestions-read.ts",
  "components/decks/cuts-panel.tsx": "lib/decks/cuts-read.ts",
  // The shared name trigger itself draws the box; each CALLER that passes `preview` is a surface of its own:
  "components/cards/card-detail-provider.tsx": "",
  "components/decks/lean-line.tsx": "lib/decks/read.ts",
  "components/decks/receipt-modal.tsx": "lib/decks/read.ts",
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

/** True when some `CardDetailTrigger` in the file hands `preview`: an opt-in call site of the shared trigger. */
function passesPreview(src: string): boolean {
  const file = ts.createSourceFile("row.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found = false;
  const visit = (node: ts.Node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(file) === "CardDetailTrigger"
      && node.attributes.properties.some((a) => ts.isJsxAttribute(a) && a.name.getText(file) === "preview")) found = true;
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

/**
 * Files that draw a hover preview: IMPORT `usePreviewRow` as a binding (a comment naming it is not a surface), or pass
 * `preview` to the shared trigger. The second is how a name or a plate previews, and each such call site hands the
 * trigger an `imageUri` its own loader chose, so each is a surface to feed-check like any other.
 */
export function hoverSurfaces(files: Record<string, string>): string[] {
  return Object.entries(files)
    .filter(([path, src]) => !/\.test\.tsx?$/.test(path)
      && (/import\s*\{[^}]*\busePreviewRow\b[^}]*\}\s*from/.test(src) || passesPreview(src)))
    .map(([path]) => path)
    .sort();
}

/** A real call to a resolver: a comment or a string that names one makes none. */
export function callsAnyOf(src: string, names: ReadonlySet<string>): boolean {
  const file = ts.createSourceFile("feeder.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found = false;
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : "";
      if (names.has(name)) found = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

export const usesResolver = (src: string) => callsAnyOf(src, RESOLVERS);

describe("the hover-art guard's own failure paths", () => {
  it("finds a component that passes `preview` to the shared trigger, so its art source gets checked too", () => {
    expect(hoverSurfaces({
      "components/a.tsx": `import { CardDetailTrigger } from "../cards/card-detail-provider";\nexport const A = () => <CardDetailTrigger oracleId="x" name="X" imageUri="u" preview>X</CardDetailTrigger>;`,
      "components/b.tsx": `import { CardDetailTrigger } from "../cards/card-detail-provider";\nexport const B = () => <CardDetailTrigger oracleId="x" name="X">X</CardDetailTrigger>;`,
    })).toEqual(["components/a.tsx"]);
  });

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

  // The Top-off candidates arrive from the cached synergy read with the catalog's printing; the page must
  // APPLY the chain's map to them, not only read it (a read whose result is never used passes the check below).
  it("the deck page applies the chain's art to the Top-off candidates it hands the list", () => {
    expect(callsAnyOf(files["app/decks/[id]/page.tsx"], new Set(["withChainArt"]))).toBe(true);
  });

  for (const [component, feeder] of Object.entries(FEEDERS)) {
    if (feeder === "") continue;
    it(`${component} is fed by ${feeder}, which applies the chain`, () => {
      expect(files[feeder], `${feeder} does not exist`).toBeDefined();
      expect(usesResolver(files[feeder])).toBe(true);
    });
  }
});

// ---- Every card ROW has BOTH a hover preview and a press that opens card details (Hugh, 2026-10-12) ----

const PRESS_BINDINGS = ["CardDetailTrigger", "useCardDetail", "FullCardTrigger"];

const importsBinding = (src: string, name: string) =>
  new RegExp(`import\\s*(?:type\\s*)?\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from`).test(src);

/** Opens card details: imports the trigger or the hook as a binding (a comment naming one is not a press). */
export function hasPress(src: string): boolean {
  return PRESS_BINDINGS.some((name) => importsBinding(src, name));
}

/**
 * Draws a preview: imports `usePreviewRow` (a row that previews as a whole), or EVERY `CardDetailTrigger` in the file
 * hands `preview` (a name or a plate that is the row). One trigger without it leaves the file short, so a file
 * cannot hide an unpreviewed name behind one that has it.
 */
export function hasHover(src: string): boolean {
  if (importsBinding(src, "usePreviewRow")) return true;
  const file = ts.createSourceFile("row.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let triggers = 0;
  let withPreview = 0;
  const visit = (node: ts.Node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(file) === "CardDetailTrigger") {
      triggers += 1;
      if (node.attributes.properties.some((a) => ts.isJsxAttribute(a) && a.name.getText(file) === "preview")) withPreview += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return triggers > 0 && withPreview === triggers;
}

/** Rows with one half and not the other, excluding the named exceptions. */
export function rowGaps(files: Record<string, string>, exceptions: ReadonlySet<string>) {
  const gaps: { path: string; missing: "hover" | "press" }[] = [];
  for (const [path, src] of Object.entries(files)) {
    if (/\.test\.tsx?$/.test(path) || !path.endsWith(".tsx") || DEFINES_PRESS.has(path) || exceptions.has(path)) continue;
    const press = hasPress(src);
    const hover = hasHover(src);
    if (press && !hover) gaps.push({ path, missing: "hover" });
    if (hover && !press) gaps.push({ path, missing: "press" });
  }
  return gaps.sort((a, b) => a.path.localeCompare(b.path));
}

/** The modules that DEFINE the press and the preview. */
const DEFINES_PRESS = new Set([
  "components/cards/card-detail-provider.tsx",
  "components/commanders/full-card-trigger.tsx",
  "components/decks/hover-preview.tsx",
]);

/**
 * Rows still owed a half, each named so the list can only shrink: a surface shipping its half leaves it here
 * (the test below fails while a row sits here with both halves). Anything NOT here that has one half and not
 * the other fails the build. Tokens are their own bug batch's and precons their own lane's: neither reaches
 * this guard.
 */
const OWED = new Set<string>([
  "components/cards/fits-picker.tsx",
  "components/collection/browser.tsx",
  "components/commanders/coverage-chip.tsx",
  "components/commanders/synergy-row.tsx",
  "components/decks/change-commander-sheet.tsx",
  "components/decks/mana-sections.tsx",
  "components/decks/notices-body.tsx",
  "components/decks/proxy-list-view.tsx",
  "components/decks/upgrade-path.tsx",
  "components/intake/choose-row.tsx",
  "components/intake/read-as-bar.tsx",
  "components/sets/set-grid-view.tsx",
]);

/**
 * Triggers that are a card's HEADER or a door, not a row in a list: the commander's own title, the doors that
 * open a swap or a printing sheet, the pull sheet's head. A press and no preview is what they are.
 */
const NOT_A_ROW = new Set<string>([
  "components/commanders/detail.tsx",
  "components/decks/change-commander-door.tsx",
  "components/decks/got-it-door.tsx",
  "components/decks/pull-control.tsx",
  "components/decks/spine-desktop.tsx",
  "components/decks/spine-mobile.tsx",
  "components/decks/stand-in-door.tsx",
]);

describe("the row guard's own failure paths", () => {
  it("calls a component with a press and no preview a gap, and one with both clean", () => {
    const press = `import { CardDetailTrigger } from "../cards/card-detail-provider";\nexport const A = () => <CardDetailTrigger oracleId="x" name="X">X</CardDetailTrigger>;`;
    const both = `import { CardDetailTrigger } from "../cards/card-detail-provider";\nexport const A = () => <CardDetailTrigger oracleId="x" name="X" preview>X</CardDetailTrigger>;`;
    const hoverOnly = `import { usePreviewRow } from "./hover-preview";\nexport const A = () => null;`;
    expect(rowGaps({ "components/a.tsx": press }, new Set())).toEqual([{ path: "components/a.tsx", missing: "hover" }]);
    expect(rowGaps({ "components/a.tsx": both }, new Set())).toEqual([]);
    expect(rowGaps({ "components/a.tsx": hoverOnly }, new Set())).toEqual([{ path: "components/a.tsx", missing: "press" }]);
  });

  it("calls a file short when one trigger has `preview` and another does not", () => {
    const mixed = `import { CardDetailTrigger } from "../cards/card-detail-provider";\nexport const A = () => <p><CardDetailTrigger oracleId="a" name="A" preview>A</CardDetailTrigger><CardDetailTrigger oracleId="b" name="B">B</CardDetailTrigger></p>;`;
    expect(rowGaps({ "components/a.tsx": mixed }, new Set())).toEqual([{ path: "components/a.tsx", missing: "hover" }]);
  });

  it("does not take a comment, a string or a different element's `preview` for a half", () => {
    const comment = `// uses CardDetailTrigger and usePreviewRow\nexport const A = () => <Other preview />;`;
    expect(hasPress(comment)).toBe(false);
    expect(hasHover(comment)).toBe(false);
  });
});

describe("every card row has a hover preview and a press that opens card details", () => {
  const files: Record<string, string> = {};
  for (const path of walk(SRC)) {
    if (/\.tsx$/.test(path)) files[relative(SRC, path)] = readFileSync(path, "utf8");
  }

  it("has no row with one half and not the other, beyond the ones named as owed", () => {
    expect(rowGaps(files, new Set([...OWED, ...NOT_A_ROW]))).toEqual([]);
  });

  it("names only rows that still owe a half", () => {
    const stale = [...OWED, ...NOT_A_ROW].filter((path) => !(path in files && rowGaps({ [path]: files[path] }, new Set()).length > 0));
    expect(stale).toEqual([]);
  });
});
