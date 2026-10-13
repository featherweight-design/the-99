// The deck page prices its rows through the deck's printing picks (deck printings PR 3). The rule
// itself is `priceFor`'s and is unit tested beside it; what only this file can say is that the
// page's one price read carries the deck's held picks, and that the rows and both commanders (and
// so the Shopping strip and the Money card, which read the rows) take their figure through
// `priceFor` rather than the oracle-keyed map, which would ignore every pick.
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

function declaration(name: string): ts.VariableDeclaration | undefined {
  let found: ts.VariableDeclaration | undefined;
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(src) === name) found = node;
    ts.forEachChild(node, visit);
  };
  visit(src);
  return found;
}

describe("the deck page's prices", () => {
  it("passes this deck's held picks to its one price read", () => {
    const [read, ...more] = calls("loadPrices");
    expect(read).toBeDefined();
    expect(more).toHaveLength(0);
    expect(read.arguments).toHaveLength(2);
    expect(read.arguments[1].getText(src)).toBe("await readHeldPricePicks(userId, [id], env)");
  });

  it("prices each row and both commanders through priceFor, for this deck", () => {
    const withPrice = declaration("withPrice");
    expect(withPrice).toBeDefined();
    const body = withPrice!.initializer!.getText(src);
    expect(body).toContain("priceFor(priced, id, card.oracleId)");
    expect(body).not.toContain(".prices.get(");
    // The rows and both commanders take their price from it.
    for (const use of ["detail.cards.map(withPrice)", "withPrice(detail.commander)", "withPrice(detail.partner)"]) {
      expect(src.getText()).toContain(use);
    }
  });
});
