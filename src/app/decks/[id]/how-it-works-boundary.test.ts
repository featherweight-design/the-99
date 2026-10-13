// The page end of the how-it-works boundary: the deck page must wrap its shell in
// `DeckPageSwitches` with the flag read on the server, and render THAT wrap. The page loads too
// much to render in a unit test, so this reads its source as a syntax tree, as
// `deeper-looks-boundary.test.ts` does. A deleted wrap, a literal, or a wrap built and never
// rendered each fail it. The sheet's side is `provenance-panel.test.tsx`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const PAGE = join(process.cwd(), "src/app/decks/[id]/page.tsx");
const src = ts.createSourceFile(PAGE, readFileSync(PAGE, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

/** Every `<DeckPageSwitches …>` element: its attributes and the variable it is assigned to. */
function switchElements(): { attrs: Record<string, string>; children: string; boundTo: string | null }[] {
  const out: { attrs: Record<string, string>; children: string; boundTo: string | null }[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(src) === "DeckPageSwitches") {
      const attrs: Record<string, string> = {};
      for (const a of node.openingElement.attributes.properties) {
        if (!ts.isJsxAttribute(a)) continue;
        const init = a.initializer;
        attrs[a.name.getText(src)] = init && ts.isJsxExpression(init) && init.expression ? init.expression.getText(src) : init?.getText(src) ?? "true";
      }
      let p: ts.Node = node.parent;
      while (p && !ts.isVariableDeclaration(p) && !ts.isSourceFile(p)) p = p.parent;
      const boundTo = p && ts.isVariableDeclaration(p) ? p.name.getText(src) : null;
      out.push({ attrs, children: node.children.map((c) => c.getText(src)).join("").trim(), boundTo });
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

describe("the deck page hands DeckPageSwitches the how-it-works flag", () => {
  it("wraps the shell once, with howItWorks={howItWorksEnabled(env)}", () => {
    const els = switchElements();
    expect(els).toHaveLength(1);
    expect(els[0].attrs.howItWorks).toBe("howItWorksEnabled(env)");
    expect(els[0].children).toBe("{shell}");
  });

  it("renders that wrap on both paths, never the bare shell", () => {
    const [el] = switchElements();
    expect(el.boundTo).not.toBeNull();
    // `tooled` reads it inside SwapToolsProvider and as the fallback: two reads.
    expect(reads(el.boundTo!)).toBe(2);
    // The bare shell is read once, by the wrap alone.
    expect(reads("shell")).toBe(1);
  });
});
