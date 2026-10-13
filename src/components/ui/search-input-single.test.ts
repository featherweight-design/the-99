import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// One search field (Hugh, 2026-10-13): a hand-rolled `<input type="search">` is how the deck list, the precon
// list and two admin lists ended up with no clear, a different icon and Safari's own ✕. `SearchField` in
// `ui/text-field.tsx` is the only place that draws one. Read from the parse tree, so the input's OWN `type`
// is what counts, not whatever follows it in the file.
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });

function rawSearchInputs(file: string, text?: string): number[] {
  const sf = ts.createSourceFile(file, text ?? readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const lines: number[] = [];
  const visit = (n: ts.Node) => {
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && n.tagName.getText() === "input") {
      const type = n.attributes.properties.find((a): a is ts.JsxAttribute => ts.isJsxAttribute(a) && a.name.getText() === "type");
      // `type="search"` and `type={"search"}` (or a template literal) are the same attribute.
      const init = type?.initializer && ts.isJsxExpression(type.initializer) ? type.initializer.expression : type?.initializer;
      if (init && (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) && init.text === "search") {
        lines.push(sf.getLineAndCharacterOfPosition(n.getStart()).line + 1);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return lines;
}

describe("no hand-rolled search input", () => {
  it("draws type=\"search\" only inside the shared SearchField", () => {
    const offenders = walk(join(process.cwd(), "src"))
      .filter((p) => !p.endsWith("ui/text-field.tsx"))
      .flatMap((p) => rawSearchInputs(p).map((l) => `${p}:${l}`));
    expect(offenders).toEqual([]);
  });

  // Failure paths, as text: nothing is written under src.
  it("finds a raw search input however far its type sits from the tag", () => {
    const pad = "data-x=\"" + "y".repeat(400) + "\" ";
    expect(rawSearchInputs("f.tsx", `export const A = () => <input ${pad} type="search" />;`)).toHaveLength(1);
  });

  it("finds the braced forms of the same attribute", () => {
    expect(rawSearchInputs("f.tsx", `export const A = () => <input type={"search"} />;`)).toHaveLength(1);
    expect(rawSearchInputs("f.tsx", "export const A = () => <input type={`search`} />;")).toHaveLength(1);
  });

  it("does not blame a SearchField that follows a plain input", () => {
    expect(rawSearchInputs("f.tsx", `export const A = () => (<><input type="text" /><SearchField type="search" /></>);`)).toEqual([]);
  });
});
