// The page end of the deeper-looks boundary: the deck page must hand BuilderShell the flag read
// on the server. The page loads too much to render in a unit test, so this reads its source as a
// syntax tree: the `<BuilderShell>` element must carry `deeperLooks={helpMeChooseEnabled()}`. A
// deleted prop, a literal, or the flag read anywhere but that mount fails it. The shell's side is
// `builder-shell-deeper-looks.test.tsx`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const PAGE = join(process.cwd(), "src/app/decks/[id]/page.tsx");

/** Every attribute on every `<BuilderShell …>` in the file, as `name → initializer source`. */
function shellAttributes(): Record<string, string>[] {
  const src = ts.createSourceFile(PAGE, readFileSync(PAGE, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: Record<string, string>[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && node.tagName.getText(src) === "BuilderShell") {
      const attrs: Record<string, string> = {};
      for (const a of node.attributes.properties) {
        if (!ts.isJsxAttribute(a)) continue;
        const init = a.initializer;
        attrs[a.name.getText(src)] = init && ts.isJsxExpression(init) && init.expression ? init.expression.getText(src) : init?.getText(src) ?? "true";
      }
      out.push(attrs);
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
  return out;
}

describe("the deck page hands BuilderShell the deeper-looks flag", () => {
  it("passes deeperLooks={helpMeChooseEnabled()} on its one BuilderShell", () => {
    const shells = shellAttributes();
    expect(shells).toHaveLength(1);
    expect(shells[0].deeperLooks).toBe("helpMeChooseEnabled()");
  });
});
