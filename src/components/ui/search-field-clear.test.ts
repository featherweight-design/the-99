import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// One clear for every search field (Hugh, 2026-10-13). The ✕ is `SearchField`'s own `onClear`; a field that
// does not pass it has no way to empty its box in one tap, which is how /collection's ✕ and its neighbours
// came to differ. Computed from the tree rather than listed, so a new field fails here until it opts in.
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });

function searchFieldsWithoutClear(file: string): string[] {
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  // Only the primitive: a file that imports `SearchField` from ui/text-field, not a local component of that name.
  const imports = sf.statements.some(
    (s) =>
      ts.isImportDeclaration(s) &&
      /(^|\/)text-field$/.test((s.moduleSpecifier as ts.StringLiteral).text) &&
      /\bSearchField\b/.test(s.importClause?.getText() ?? ""),
  );
  if (!imports) return [];
  const bad: string[] = [];
  const visit = (n: ts.Node) => {
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText() === "SearchField") {
      const has = n.attributes.properties.some((a) => ts.isJsxAttribute(a) && a.name.getText() === "onClear");
      // `{...props}` spreads cannot be read; a field built from one names onClear in the spread's own file.
      const spread = n.attributes.properties.some((a) => ts.isJsxSpreadAttribute(a));
      if (!has && !spread) bad.push(`${file}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return bad;
}

describe("every SearchField passes onClear", () => {
  it("has no field under src that cannot clear itself", () => {
    const root = join(process.cwd(), "src");
    expect(walk(root).flatMap(searchFieldsWithoutClear)).toEqual([]);
  });

  it("sees a field that omits it (the guard's own failure path)", () => {
    const tmp = join(process.cwd(), "src/components/ui/__guard-fixture.tsx");
    const body =
      'import { SearchField } from "./text-field";\nexport const A = () => <SearchField aria-label="x" value="" onChange={() => {}} />;\n';
    // Written and removed within the test: the walk above never sees it, only this call does.
    writeFileSync(tmp, body);
    try {
      expect(searchFieldsWithoutClear(tmp)).toHaveLength(1);
    } finally {
      unlinkSync(tmp);
    }
  });
});
