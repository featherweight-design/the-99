// One printing on the row, the hover preview and card details (Hugh, 2026-10-12). A TILE draws no hover preview at all
// (its art is already about the size of one), and a row that carries prose previews on its name and thumbnail only; the
// guards for both are below, and everything in this first half is about the ROWS that do preview. Card details always
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
  // The same reads that throw rather than swallow, for a caller that must tell "failed" from "owns none".
  "readOwnedPrintings", "readDeckOwnedPrintings",
]);

/** Components that draw a hover preview, mapped to the module whose read supplies the art they hand it. */
const FEEDERS: Record<string, string> = {
  "components/decks/decklist-row.tsx": "lib/decks/read.ts",
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
  // Role Coverage's cards carry the printing the player owns (`resolveOwnedPrintings` on the commander page and on its retry).
  "components/commanders/coverage-chip.tsx": "app/commanders/[slug]/page.tsx",
  // The deck's own rows are the art: the path's and the mana patterns' names are cards in the deck.
  "components/decks/upgrade-path.tsx": "lib/decks/read.ts",
  "components/decks/mana-sections.tsx": "lib/decks/read.ts",
  "components/intake/read-as-bar.tsx": "lib/intake/rows.ts",
  // The deck's own printing for a matched card or a half it holds, the reader's copy for the rest (`resolveDeckOwnedPrintings`).
  "components/decks/change-commander-sheet.tsx": "lib/commander-change/candidates.ts",
  // The combo's other piece previews the printing card details open outside a deck's own page: the reader's owned copy, else the catalog's (`withPartnerArt`).
  "components/cards/fits-picker.tsx": "lib/swaps/fits.ts",
  // Every card Find a deck's read names (its sentence, its cut, the deck's commanders): the printing card details
  // opens outside a deck's page, the reader's owned copy else the catalog's (`pickCards`).
  "components/cards/read-row.tsx": "lib/swaps/fits-read-run.ts",
  // Every card a notice names, down the chain card details uses (`loadDeckNotices`).
  "components/decks/notices-body.tsx": "lib/notices/read.ts",
  // The button a row or tile IS: the owner (browser.tsx) passes each row's art from its own loader.
  "components/ui/preview-button.tsx": "",
  // The collection's own rows ARE the printing they draw: the collection list resolves its art per owned
  // printing (browse.ts), so there is no feeder to chain.
  "components/collection/rows-view.tsx": "",
  "components/decks/proxy-list-view.tsx": "lib/decks/proxy-list.ts",
  "components/decks/cart/cart-line.tsx": "lib/decks/cart-read.ts",
  "components/intake/choose-row.tsx": "lib/intake/rows.ts",
  "components/commanders/synergy-row.tsx": "app/commanders/[slug]/page.tsx",
  "components/decks/cart/cart-deck-group.tsx": "lib/decks/cart-read.ts",
  // Tokens are not cards: a token row previews the printing it is pictured with (`assembleDeckTokens`), which is the one
  // its card details open on (`loadTokenDetail`), so there is no owned-printing chain to apply. Named so the list stays complete.
  "components/decks/token-makers.tsx": "",
  "components/decks/token-row.tsx": "",
  "components/decks/lineup/shared-card.tsx": "lib/lineup/load.ts",
  "components/decks/lineup/collection-card.tsx": "lib/lineup/collection-read.ts",
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
      && (/import\s*\{[^}]*\b(?:usePreviewRow|PreviewButton)\b[^}]*\}\s*from/.test(src) || passesPreview(src)))
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

const PRESS_BINDINGS = ["CardDetailTrigger", "useCardDetail", "useCardDetailIfAny", "FullCardTrigger"];

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
  "components/ui/preview-button.tsx",
]);

/**
 * Rows whose two halves live in two files: the OWNER opens card details (`useCardDetail`) and mounts the
 * `HoverPreviewProvider`; each CHILD is the row or tile and draws the preview with `PreviewButton`, taking its press
 * from the owner as `onOpen`. Each half is checked where it lives, so neither file passes on the other's word.
 */
const COMPOSED_ROWS: Record<string, string[]> = {
  "components/collection/browser.tsx": ["components/collection/rows-view.tsx"],
};

/**
 * TILE views: a card drawn as its art at about the size of the hover preview, so the preview shows the reader what is
 * already in front of them (Hugh, 2026-10-12). They keep the press that opens card details and draw NO hover. A tile
 * that regains one fails below, and so does a row that is listed here and no longer a tile.
 */
const TILE_VIEWS = [
  "components/decks/deck-card-tile.tsx",
  "components/decks/suggestion-tile.tsx",
  "components/decks/read-only-card-tile.tsx",
  "components/collection/grid-view.tsx",
  "components/sets/set-cell.tsx",
  // The grid that owns the cells: it opens card details for them and mounts no provider.
  "components/sets/set-grid-view.tsx",
];

const HOVER_BINDINGS = ["usePreviewRow", "PreviewButton", "HoverPreviewProvider"];

/** Tags that are a row's own shell: a hover handler spread on one of them previews for the WHOLE row. */
const ROW_SHELL_TAGS = new Set(["li", "article", "div", "tr", "section", "ul", "p"]);

/**
 * The elements that carry a `usePreviewRow` result as their own handlers while being a row's shell: `const h =
 * usePreviewRow(...)` then `<li {...h}>`. Such a row previews wherever the pointer is on it, which covers any prose in
 * it (the reason under a proposed cut). A handler on a name, a thumbnail or a button is not found here.
 */
export function wholeRowHover(src: string): string[] {
  const file = ts.createSourceFile("row.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const handlers = new Set<string>();
  const collect = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isCallExpression(node.initializer)
      && ts.isIdentifier(node.initializer.expression) && node.initializer.expression.text === "usePreviewRow") handlers.add(node.name.text);
    ts.forEachChild(node, collect);
  };
  collect(file);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && ROW_SHELL_TAGS.has(node.tagName.getText(file))) {
      for (const a of node.attributes.properties) {
        if (ts.isJsxSpreadAttribute(a) && ts.isIdentifier(a.expression) && handlers.has(a.expression.text)) found.push(node.tagName.getText(file));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

/**
 * Plain rows that preview as a whole row: a line of data with no prose to cover (a decklist row, a diff row, a stand-in
 * row, a ledger line). A row that carries descriptive text previews on its name and thumbnail ONLY, and is not listed
 * here; when unsure it is not listed (Hugh, 2026-10-12). Adding a file is a decision that shows up in a diff.
 */
const WHOLE_ROW_OK: Record<string, string> = {
  "components/decks/decklist-row.tsx": "the decklist row: name, cost and marks on one line",
  "components/decks/top-off-list.tsx": "a Consider row: type, cost, availability and synergy figures, no paragraph",
  "components/decks/update-diff-row.tsx": "a draft diff row: name, tag and figures on one or two lines",
  "components/decks/version-diff.tsx": "a version diff row: one line, name and cost",
  "components/decks/benchmark-ledger.tsx": "a ledger line: name, one truncated clause and a figure; the row is the one button",
  "components/decks/stand-ins-sheet.tsx": "a stand-in row and its replacing line: name, price and availability",
  "components/decks/token-makers.tsx": "a maker line: a name and nothing else",
};

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

  it("finds a handler spread on a row's own shell and not one on a name, a thumbnail or a button", () => {
    const shell = `import { usePreviewRow } from "./hover-preview";\nexport function R({ c }) { const h = usePreviewRow(c.imageUri); return <article {...h}><button>{c.name}</button></article>; }`;
    const name = `import { usePreviewRow } from "./hover-preview";\nexport function R({ c }) { const h = usePreviewRow(c.imageUri); return <article><span {...h}><button>{c.name}</button></span><button {...h}>x</button></article>; }`;
    expect(wholeRowHover(shell)).toEqual(["article"]);
    expect(wholeRowHover(name)).toEqual([]);
    // Spread of something that is not a usePreviewRow result, and a result spread nowhere.
    expect(wholeRowHover(`export function R({ p }) { return <li {...p} />; }`)).toEqual([]);
    expect(wholeRowHover(`export function R({ c }) { const h = usePreviewRow(c.imageUri); return <li />; }`)).toEqual([]);
  });

  it("finds a tile that previews through only one of its triggers, which `hasHover` would miss", () => {
    const one = `import { CardDetailTrigger } from "../cards/card-detail-provider";\nexport const A = () => <p><CardDetailTrigger oracleId="a" name="A" preview>A</CardDetailTrigger><CardDetailTrigger oracleId="b" name="B">B</CardDetailTrigger></p>;`;
    expect(hasHover(one)).toBe(false);
    expect(passesPreview(one)).toBe(true);
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

  it("has no row with one half and not the other, beyond the headers and doors", () => {
    const composed = new Set(Object.entries(COMPOSED_ROWS).flatMap(([owner, children]) => [owner, ...children]));
    expect(rowGaps(files, new Set([...NOT_A_ROW, ...composed, ...TILE_VIEWS]))).toEqual([]);
  });

  it("tile views draw no hover preview, only the press (a tile already shows the art at preview size)", () => {
    for (const tile of TILE_VIEWS) {
      expect(files[tile], `${tile} does not exist`).toBeDefined();
      const bound = HOVER_BINDINGS.filter((name) => importsBinding(files[tile], name));
      expect(bound, `${tile} draws a hover preview`).toEqual([]);
      // ANY trigger opting in is a hover: `hasHover` wants every one to, which is the row guard's rule, not a tile's.
      expect(passesPreview(files[tile]), `${tile} passes \`preview\` to a trigger`).toBe(false);
    }
  });

  it("previews a whole row only for the plain rows named for it, so a row with prose previews on its name and thumbnail", () => {
    const whole = Object.entries(files)
      .filter(([path, src]) => !/\.test\.tsx$/.test(path) && wholeRowHover(src).length > 0)
      .map(([path]) => path)
      .sort();
    expect(whole.filter((path) => !(path in WHOLE_ROW_OK))).toEqual([]);
    expect(Object.keys(WHOLE_ROW_OK).filter((path) => !whole.includes(path))).toEqual([]);
  });

  it("composed rows: the owner mounts the provider and opens details, each child draws the preview", () => {
    for (const [owner, children] of Object.entries(COMPOSED_ROWS)) {
      expect(importsBinding(files[owner], "HoverPreviewProvider"), `${owner} mounts no provider`).toBe(true);
      expect(hasPress(files[owner]), `${owner} opens no card details`).toBe(true);
      for (const child of children) {
        expect(importsBinding(files[child], "PreviewButton"), `${child} draws no preview`).toBe(true);
      }
    }
  });

  it("names only triggers that still are a header or a door", () => {
    const stale = [...NOT_A_ROW].filter((path) => !(path in files && rowGaps({ [path]: files[path] }, new Set()).length > 0));
    expect(stale).toEqual([]);
  });
});

// ---- ONE opening printing for a card the reader does not own (PR D, Hugh 2026-10-12) ----
//
// Card details opens an unowned card on the printing `openingScryfallId` picks (the oracle's own when the shop
// carries it, else the cheapest live one). A preview that drew `cards.image_uri` showed another printing for the
// cards it matters for. The rule lives in `lib/cards/opening-printing.ts` alone: card details and `chainArt`'s
// fallback apply it, and a surface that previews a card goes through `chainArt`. A module that reads the
// primitives itself is a surface resolving its own printing, so it must be named here, which is a decision that
// shows up in a diff rather than a habit.

const OPENING_MODULE = "opening-printing";

/** The modules that may import the primitives, each with why. */
const OPENING_USERS: Record<string, string> = {
  "lib/cards/chain-art.ts": "the fallback every `chainArt` caller gets",
  "lib/collection/card-detail.ts": "the press itself: the printing the modal opens on",
  "lib/intake/rows.ts": "Help me choose's commander rows read the whole opening art beside the owned printing",
  "app/commanders/[slug]/page.tsx": "the synergy panel's unowned cards, beside its owned-printing read",
  "lib/decks/proxy-list.ts": "a proxy row names the set and rarity of the printing it draws, so it takes the whole printing",
};

/**
 * Source files (ts and tsx) that import the module in ANY value form: named, namespace or default import, a
 * re-export, a dynamic `import()` or a `require`. Not the primitives by name, so `import * as opening` or a lazy
 * `await import(...)` cannot reach them unlisted. Tests and the module itself aside.
 */
export function openingImporters(files: Record<string, string>): string[] {
  const reaches = new RegExp(`(?:\\bfrom\\s*|\\bimport\\s*\\(\\s*|\\brequire\\s*\\(\\s*|^\\s*import\\s+)["'][^"']*${OPENING_MODULE}["']`, "m");
  return Object.entries(files)
    .filter(([path]) => !/\.test\.tsx?$/.test(path) && path !== "lib/cards/opening-printing.ts")
    .filter(([, src]) => reaches.test(src))
    .map(([path]) => path)
    .sort();
}

describe("the opening-printing guard's own failure paths", () => {
  it("finds a module reaching the primitives by any import form, and ignores a test, a comment and a sibling module", () => {
    expect(openingImporters({
      "lib/a.ts": `import { loadOpeningArt } from "../cards/opening-printing";`,
      "lib/b.ts": `import { openingScryfallId, liveCents } from "./opening-printing";`,
      "lib/ns.ts": `import * as opening from "../cards/opening-printing";`,
      "lib/dyn.ts": `export const f = async () => (await import("../cards/opening-printing")).loadOpeningArt([]);`,
      "lib/req.ts": `const o = require("../cards/opening-printing");`,
      "lib/bare.ts": `import "../cards/opening-printing";`,
      "lib/reexp.ts": `export { loadOpeningArt } from "../cards/opening-printing";`,
      "lib/multi.ts": `import {\n  loadOpeningArt,\n} from "../cards/opening-printing";`,
      "lib/c.test.ts": `import { loadOpeningArt } from "../cards/opening-printing";`,
      "lib/d.ts": `// loadOpeningArt from opening-printing\nexport const x = 1;`,
      "lib/e.ts": `import { somethingElse } from "../cards/opening-printing-other";`,
    })).toEqual(["lib/a.ts", "lib/b.ts", "lib/bare.ts", "lib/dyn.ts", "lib/multi.ts", "lib/ns.ts", "lib/reexp.ts", "lib/req.ts"]);
  });
});

describe("one opening printing", () => {
  const sources: Record<string, string> = {};
  for (const path of walk(SRC)) {
    if (/\.tsx?$/.test(path)) sources[relative(SRC, path)] = readFileSync(path, "utf8");
  }

  it("is read only by the modules named for it, so a surface cannot resolve its own", () => {
    expect(openingImporters(sources).filter((path) => !(path in OPENING_USERS))).toEqual([]);
  });

  it("names only modules that still import it", () => {
    const importers = new Set(openingImporters(sources));
    expect(Object.keys(OPENING_USERS).filter((path) => !importers.has(path))).toEqual([]);
  });
});

// ---- Find a deck: every card named inline previews and opens (Hugh, 2026-10-12) ----
//
// The read's marks take their press from the view (`onOpenCard`), not from `CardDetailTrigger`, so the row guard
// above cannot see them. This holds them directly: every `Mark` hands an `imageUri`, the mark IS a `PreviewButton`,
// and the view mounts the provider both it and the free list's reason line draw from.
/** Named exceptions: a card whose name opens it but never previews it, and why. */
const INLINE_NO_HOVER: Record<string, string> = {
  readCard: "the card the read is for: its image is already on screen, in the view's head and the details under it",
};

/** Every JSX element of `tag` in the file, and whether it passes `attr`. */
function elementsOf(src: string, tag: string, attr: string): boolean[] {
  const file = ts.createSourceFile("row.tsx", src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: boolean[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(file) === tag) {
      out.push(node.attributes.properties.some((a) => ts.isJsxAttribute(a) && a.name.getText(file) === attr));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return out;
}

describe("Find a deck's inline card names", () => {
  it("calls a Mark with no imageUri a gap", () => {
    expect(elementsOf(`const A = () => <p><Mark id="a" name="A" imageUri={null} /><Mark id="b" name="B" /></p>;`, "Mark", "imageUri")).toEqual([true, false]);
  });

  const row = readFileSync(join(SRC, "components/cards/read-row.tsx"), "utf8");
  const view = readFileSync(join(SRC, "components/cards/fits-view.tsx"), "utf8");

  it("hands every Mark its art, and draws the mark as a PreviewButton", () => {
    const marks = elementsOf(row, "Mark", "imageUri");
    expect(marks.length).toBeGreaterThanOrEqual(3);
    expect(marks.every(Boolean)).toBe(true);
    expect(elementsOf(row, "PreviewButton", "imageUri")).toContain(true);
  });

  it("previews under the view's own provider", () => {
    expect(importsBinding(view, "HoverPreviewProvider")).toBe(true);
    expect(elementsOf(view, "HoverPreviewProvider", "waitForMove")).toEqual([true]);
  });

  it("withholds the preview only for the exceptions named here", () => {
    for (const name of Object.keys(INLINE_NO_HOVER)) expect(row).toMatch(new RegExp(`id === ${name} \\? null`));
    // No other id is turned away: the one place art is withheld names only the listed exceptions.
    expect([...row.matchAll(/id === (\w+) \? null/g)].map((m) => m[1]).sort()).toEqual(Object.keys(INLINE_NO_HOVER).sort());
  });
});
