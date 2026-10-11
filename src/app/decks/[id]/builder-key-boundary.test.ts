// The deck page must key `BuilderShell` by deck id. A client navigation from one deck to another
// reuses the page's element tree, and without the key the builder's state (its tab, the list's
// Stats panel) carries to the next deck: the providers around it are keyed only while their
// switches are on. The page loads too much to render in a unit test, so this reads its source as a
// syntax tree, as `how-it-works-boundary.test.ts` does. Deleting the key, or keying it on anything
// but the deck's id, fails it.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const PAGE = join(process.cwd(), "src/app/decks/[id]/page.tsx");
const src = ts.createSourceFile(PAGE, readFileSync(PAGE, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

/** The `key` attribute of every `<BuilderShell>` the page renders, as source text (null: none). */
function builderShellKeys(): (string | null)[] {
  const keys: (string | null)[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      if (node.tagName.getText(src) === "BuilderShell") {
        const key = node.attributes.properties.find((a) => ts.isJsxAttribute(a) && a.name.getText(src) === "key");
        const init = key && ts.isJsxAttribute(key) ? key.initializer : undefined;
        keys.push(init && ts.isJsxExpression(init) && init.expression ? init.expression.getText(src) : null);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  return keys;
}

describe("the deck page keys its builder", () => {
  it("renders one BuilderShell, keyed by the deck id", () => {
    expect(builderShellKeys()).toEqual(["id"]);
  });
});
