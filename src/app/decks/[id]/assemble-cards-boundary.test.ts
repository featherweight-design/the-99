// The page end of `assembleDeckCards` (`src/lib/decks/assemble-cards.ts`): the deck's rows and commanders reach the
// builder through that one function, and the suggestions are priced through its `priceRow`, so the rows the page draws
// and the rows the landing demo's exporter assembles cannot drift apart. The page loads too much to render in a unit
// test, so this reads its source as a syntax tree, as `how-it-works-boundary.test.ts` does. The assembly itself is
// `assemble-cards.test.ts`. Assembling the rows inline again (a `cards` built by hand, a `deckComboFields` or
// `priceFor` call back on the page) fails it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const PAGE = join(process.cwd(), "src/app/decks/[id]/page.tsx");
const src = ts.createSourceFile(PAGE, readFileSync(PAGE, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function calls(name: string): ts.CallExpression[] {
  const out: ts.CallExpression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && node.expression.getText(src) === name) out.push(node);
    ts.forEachChild(node, visit);
  };
  visit(src);
  return out;
}

/** Every variable declaration's name, as source text (a destructuring pattern reads as its pattern). */
function declarations(): ts.VariableDeclaration[] {
  const out: ts.VariableDeclaration[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node)) out.push(node);
    ts.forEachChild(node, visit);
  };
  visit(src);
  return out;
}

const bound = (decl: ts.VariableDeclaration): string[] =>
  ts.isObjectBindingPattern(decl.name)
    ? decl.name.elements.map((e) => e.name.getText(src))
    : [decl.name.getText(src)];

describe("the deck page assembles its rows through assembleDeckCards", () => {
  it("calls it once, with the loaded detail, price read and combo map, and binds what it returns", () => {
    const [call, ...more] = calls("assembleDeckCards");
    expect(call).toBeDefined();
    expect(more).toHaveLength(0);
    expect(call.arguments).toHaveLength(1);
    const arg = call.arguments[0];
    expect(ts.isObjectLiteralExpression(arg)).toBe(true);
    const props = (arg as ts.ObjectLiteralExpression).properties.map((p) => p.getText(src)).sort();
    expect(props).toEqual(["deckId: id", "detail", "inDeckCombos", "priced"]);
    let p: ts.Node = call.parent;
    while (p && !ts.isVariableDeclaration(p)) p = p.parent;
    expect(bound(p as ts.VariableDeclaration).sort()).toEqual(["cards", "commander", "partner"]);
  });

  it("declares cards, commander and partner nowhere else", () => {
    const names = declarations().flatMap(bound);
    for (const name of ["cards", "commander", "partner"]) expect(names.filter((n) => n === name)).toHaveLength(1);
  });

  it("hands the builder the assembled rows", () => {
    expect(src.getFullText()).toMatch(/deck=\{\{\s*\.\.\.detail,\s*cards,\s*commander,\s*partner\s*\}\}/);
  });

  it("prices the suggestions through priceRow, and attaches no price or combo field itself", () => {
    expect(calls("priceRow").map((c) => c.arguments.map((a) => a.getText(src)))).toEqual([["s", "priced", "id"]]);
    expect(calls("priceFor")).toHaveLength(0);
    expect(calls("deckComboFields")).toHaveLength(0);
  });
});
