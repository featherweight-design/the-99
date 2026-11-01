// The page end of a Try it landing's remount (discovery R2, E11): `LandingKeyed` must wrap every piece of this deck's
// own client state, the builder and each deck-local provider around it (Change commander, swap tools, I got it), and
// the page must render THAT wrap, so a same-deck `?tool=` lands as an arrival does. The page loads too much to render
// in a unit test, so this reads its source as a syntax tree, as `how-it-works-boundary.test.ts` does.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const PAGE = join(process.cwd(), "src/app/decks/[id]/page.tsx");
const src = ts.createSourceFile(PAGE, readFileSync(PAGE, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

/** The variable a JSX element named `tag` is assigned to, and its children's text, for each such element. */
function elements(tag: string): { boundTo: string | null; children: string }[] {
  const out: { boundTo: string | null; children: string }[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(src) === tag) {
      let p: ts.Node = node.parent;
      while (p && !ts.isVariableDeclaration(p) && !ts.isSourceFile(p)) p = p.parent;
      out.push({
        boundTo: p && ts.isVariableDeclaration(p) ? p.name.getText(src) : null,
        children: node.children.map((c) => c.getText(src)).join("").trim(),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  return out;
}

/** How many times an identifier is read as a JSX child or a returned expression in the page. */
function reads(name: string): number {
  let n = 0;
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && node.text === name && !ts.isVariableDeclaration(node.parent)) n += 1;
    ts.forEachChild(node, visit);
  };
  visit(src);
  return n;
}

describe("the deck page's landing remount", () => {
  it("wraps the whole deck-local stack once, outside every deck provider", () => {
    const keyed = elements("LandingKeyed");
    expect(keyed).toHaveLength(1);
    expect(keyed[0].children).toBe("{page}");
    // `page` is the outermost deck-local wrap: Change commander around swap tools around I got it around the builder.
    const text = src.getFullText();
    expect(text).toMatch(/const page = \(\n    <ChangeCommanderProvider/);
    expect(text).toMatch(/const tooled = <SwapToolsProvider deckId=\{id\} deckName=\{detail\.name\} storedLimitCents=\{shoppingLimit\}>\{bought\}<\/SwapToolsProvider>;/);
    expect(text).toMatch(/const bought = <GotItProvider key=\{id\} deckId=\{id\}>/);
  });

  it("renders the wrap, never the stack bare", () => {
    expect(elements("LandingKeyed")[0].boundTo).toBe("landed");
    // `page` is read once, by the wrap alone; `landed` is what the page returns, wrapped in the tokens provider.
    expect(reads("page")).toBe(1);
    expect(reads("landed")).toBe(1);
  });
});

describe("a Try it on a deck that is gone", () => {
  it("lands on /decks, with no ?tool and so no halo, before the page falls to not-found", () => {
    const text = src.getFullText();
    const redirectAt = text.indexOf('if (!detail && query[TOOL_PARAM] !== undefined) redirect("/decks");');
    const notFoundAt = text.indexOf("if (!detail) notFound();");
    expect(redirectAt).toBeGreaterThan(-1);
    expect(notFoundAt).toBeGreaterThan(redirectAt);
  });
});
