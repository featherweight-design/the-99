import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// iOS Safari zooms the page when a text input under 16px takes focus, and a layout built on the 390px
// arithmetic goes with it. An input that draws a smaller size writes 16px beside it for a touch screen:
// `text-[16px] [@media(pointer:fine)]:text-[14px]` (a coarse pointer, so an iPad past `md` is covered too).
// Read from the parse tree: the field's OWN className is what counts. A size set only on a parent, or a
// field that sets none, is outside what this can see.
const FIELDS = new Set(["input", "textarea", "select", "SearchField", "TextField"]);
const NOT_TEXT = /type\s*=\s*\{?["'](hidden|checkbox|radio|file|range|submit|button)["']/;

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });

/** `file:line` of each field whose className names a size under 16px and no 16px at all. */
export function subSixteenFields(file: string, text?: string): string[] {
  const sf = ts.createSourceFile(file, text ?? readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (n: ts.Node) => {
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && FIELDS.has(n.tagName.getText()) && !NOT_TEXT.test(n.attributes.getText())) {
      const cls = n.attributes.properties.find((a): a is ts.JsxAttribute => ts.isJsxAttribute(a) && a.name.getText() === "className");
      const written = cls?.initializer?.getText() ?? "";
      const sizes = [...written.matchAll(/(?<![\w[-])(?:[\w:[\]()@-]+:)?text-\[(\d+(?:\.\d+)?)px\]/g)].map((m) => Number(m[1]));
      if (sizes.some((s) => s < 16) && !/16px|text-base/.test(written)) {
        found.push(`${file}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

describe("no text input under 16px on a touch screen", () => {
  it("every field that draws a size under 16px also names 16px", () => {
    const offenders = walk(join(process.cwd(), "src")).flatMap((p) => subSixteenFields(p));
    expect(offenders).toEqual([]);
  });

  it("sees a 14px field with no 16px, and passes the pointer-fine pair", () => {
    const bad = `export const A = () => <SearchField className="text-[14px]" />;`;
    const good = `export const A = () => <SearchField className="text-[16px] [@media(pointer:fine)]:text-[14px]" />;`;
    const hidden = `export const A = () => <input type="checkbox" className="text-[12px]" />;`;
    expect(subSixteenFields("a.tsx", bad)).toEqual(["a.tsx:1"]);
    expect(subSixteenFields("a.tsx", good)).toEqual([]);
    expect(subSixteenFields("a.tsx", hidden)).toEqual([]);
  });
});
