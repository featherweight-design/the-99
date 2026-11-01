// The page end of the deck page's provider boundary: the deck page must wrap its shell in
// `GotItProvider` and render THAT wrap on both paths. The page loads too much to render in a unit
// test, so this reads its source as a syntax tree, as `deeper-looks-boundary.test.ts` does. A deleted
// wrap, or a wrap built and never rendered, fails it. The sheet's side is `provenance-panel.test.tsx`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const PAGE = join(process.cwd(), "src/app/decks/[id]/page.tsx");
const src = ts.createSourceFile(PAGE, readFileSync(PAGE, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

/** Every `<GotItProvider …>` element: its children and the variable it is assigned to. */
function wrapElements(): { children: string; boundTo: string | null }[] {
  const out: { children: string; boundTo: string | null }[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(src) === "GotItProvider") {
      let p: ts.Node = node.parent;
      while (p && !ts.isVariableDeclaration(p) && !ts.isSourceFile(p)) p = p.parent;
      const boundTo = p && ts.isVariableDeclaration(p) ? p.name.getText(src) : null;
      out.push({ children: node.children.map((c) => c.getText(src)).join("").trim(), boundTo });
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  return out;
}

/** How many times an identifier is READ (not declared) in the page. */
function reads(name: string): number {
  let n = 0;
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && node.text === name && !(ts.isVariableDeclaration(node.parent) && node.parent.name === node)) n += 1;
    ts.forEachChild(node, visit);
  };
  visit(src);
  return n;
}

describe("the deck page wraps its shell", () => {
  it("wraps the shell once, in GotItProvider", () => {
    const els = wrapElements();
    expect(els).toHaveLength(1);
    expect(els[0].children).toBe("{shell}");
  });

  it("renders that wrap on both paths, never the bare shell", () => {
    const [el] = wrapElements();
    expect(el.boundTo).toBe("bought");
    // `tooled` reads `bought` once, inside SwapToolsProvider (always mounted since SWAP_TOOLS_ENABLED retired).
    expect(reads("bought")).toBe(1);
    // The bare shell is read once, by the wrap alone.
    expect(reads("shell")).toBe(1);
  });
});
