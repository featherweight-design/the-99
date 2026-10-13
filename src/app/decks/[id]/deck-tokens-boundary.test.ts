// The page end of the tokens boundary: the deck page reads the deck's tokens ONLY while the switch is on,
// and hands what it read to `DeckTokensProvider`, outermost, so the decklist's group has something to draw.
// The page loads too much to render in a unit test, so this reads its source as a syntax tree, as
// `how-it-works-boundary.test.ts` does. A deleted provider, a read the switch does not gate, or a wrap that
// is built and never returned each fail it. The group's side is `tokens-group.test.tsx` and the mount in
// `decklist.test.tsx`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const PAGE = join(process.cwd(), "src/app/decks/[id]/page.tsx");
const text = readFileSync(PAGE, "utf8");
const src = ts.createSourceFile(PAGE, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function providers(): { attrs: Record<string, string>; inReturn: boolean }[] {
  const out: { attrs: Record<string, string>; inReturn: boolean }[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(src) === "DeckTokensProvider") {
      const attrs: Record<string, string> = {};
      for (const a of node.openingElement.attributes.properties) {
        if (!ts.isJsxAttribute(a)) continue;
        const init = a.initializer;
        attrs[a.name.getText(src)] = init && ts.isJsxExpression(init) && init.expression ? init.expression.getText(src) : "";
      }
      let p: ts.Node | undefined = node.parent;
      while (p && !ts.isReturnStatement(p) && !ts.isSourceFile(p)) p = p.parent;
      out.push({ attrs, inReturn: !!p && ts.isReturnStatement(p) });
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  return out;
}

describe("the deck page hands the decklist its tokens", () => {
  it("wraps the page once, in the value it returned, with this deck's id and the read", () => {
    const ps = providers();
    expect(ps).toHaveLength(1);
    expect(ps[0].attrs.deckId).toBe("id");
    expect(ps[0].attrs.read).toBe("deckTokens");
    expect(ps[0].inReturn).toBe(true);
  });

  it("starts the read only when the switch is on, never unconditionally", () => {
    expect(text).toMatch(/const tokensRead = deckTokensEnabled\(env\)\s*\?/);
    expect(text.match(/loadDeckTokens\(/g)).toHaveLength(1);
  });
});
