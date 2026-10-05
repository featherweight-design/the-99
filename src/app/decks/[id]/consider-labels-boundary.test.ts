// The page end of the Consider filter (card labels item 7): the labels are read AFTER the cached
// suggestions payload resolves, outside every `cacheForUser` entry, in the same wave as the price,
// availability and facts reads, and the filter is applied to the list the tiles render. The page loads
// too much to render in a unit test, so this reads its source as a syntax tree, as
// `how-it-works-boundary.test.ts` does. The rule and the switch are `consider.test.ts` and
// `consider-labels.test.ts`.
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

const enclosingCalls = (node: ts.Node): string[] => {
  const out: string[] = [];
  for (let p = node.parent; p; p = p.parent) if (ts.isCallExpression(p)) out.push(p.expression.getText(src));
  return out;
};

describe("the deck page's Consider filter", () => {
  it("reads the labels once, outside every cache entry, in the wave beside the facts read", () => {
    const [read, ...more] = calls("considerLabels");
    expect(read).toBeDefined();
    expect(more).toHaveLength(0);
    const around = enclosingCalls(read);
    expect(around).not.toContain("cacheForUser");
    expect(around).not.toContain("loadDeckSuggestions");
    expect(around).toContain("Promise.all");
    const wave = calls("Promise.all").find((c) => c.getText(src).includes("considerLabels("));
    expect(wave?.getText(src)).toContain("loadCandidateFacts(");
  });

  it("asks only for the rendered suggestions' ids", () => {
    const arg = calls("considerLabels")[0].arguments[0].getText(src);
    expect(arg).toMatch(/suggestionIds:\s*suggestions\.map\(\(s\) => s\.oracleId\)/);
  });

  it("filters the list the tiles render, through the read the wave returned", () => {
    const [apply] = calls("applyConsiderLabels");
    expect(apply.arguments.map((a) => a.getText(src))).toEqual(["suggestions", "considerRead"]);
    let p: ts.Node = apply.parent;
    while (p && !ts.isVariableDeclaration(p)) p = p.parent;
    expect((p as ts.VariableDeclaration).name.getText(src)).toBe("pricedSuggestions");
  });
});
