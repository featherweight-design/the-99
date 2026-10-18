import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// iOS Safari zooms the page when a text input under 16px takes focus, and a layout built on the 390px
// arithmetic goes with it. An input that draws a smaller size writes 16px beside it for a touch screen:
// `text-[16px] [@media(pointer:fine)]:text-[14px]` (a fine pointer, so an iPad is covered whatever its width).
// Read from the parse tree: the field's OWN className is what counts. A size set only on a parent, or a
// field that sets none, is outside what this can see.
const FIELDS = new Set(["input", "textarea", "select", "SearchField", "TextField"]);
const NOT_TEXT = /type\s*=\s*\{?["'](hidden|checkbox|radio|file|range|submit|button)["']/;

const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });

/** A size token: its variant chain (`md:`, `[@media(pointer:fine)]:`...) and the pixel size. */
const SIZE = /(?<![\w[-])((?:[\w[\]():@-]+:)*)text-\[(\d+(?:\.\d+)?)px\]/g;

/**
 * `file:line` of each field that draws a size under 16px where a touch screen reaches it: a BARE size (a phone), or
 * one under a breakpoint (`md:text-[12px]`, which an iPad past `md` gets) without the `[@media(pointer:fine)]:`
 * guard. `text-[16px] [@media(pointer:fine)]:md:text-[12px]` is the convention.
 */
export function subSixteenFields(file: string, text?: string): string[] {
  const sf = ts.createSourceFile(file, text ?? readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found: string[] = [];
  const visit = (n: ts.Node) => {
    if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && FIELDS.has(n.tagName.getText()) && !NOT_TEXT.test(n.attributes.getText())) {
      const cls = n.attributes.properties.find((a): a is ts.JsxAttribute => ts.isJsxAttribute(a) && a.name.getText() === "className");
      const written = cls?.initializer?.getText() ?? "";
      const sizes = [...written.matchAll(SIZE)].map((m) => ({ variants: m[1], px: Number(m[2]) }));
      // The touch answer beside a smaller bare size is a 16px that a phone gets: bare, or under the app's `touch:`
      // variant. `md:text-[16px]`, a fine-pointer-only 16px or `placeholder:text-base` leave the phone at the small one.
      const phone16 = sizes.some((s) => s.px >= 16 && (s.variants === "" || s.variants === "touch:")) || /(?<![\w:[-])text-base(?![\w-])|touch:text-base/.test(written);
      const unguarded = sizes.some((s) => s.px < 16 && s.variants === "") && !phone16;
      const wide = sizes.some((s) => s.px < 16 && /(^|:)(sm|md|lg|xl|2xl):/.test(s.variants) && !s.variants.includes("[@media(pointer:fine)]:"));
      if (unguarded || wide) found.push(`${file}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

describe("no text input under 16px on a touch screen", () => {
  it("no field draws a bare size under 16px", () => {
    const offenders = walk(join(process.cwd(), "src")).flatMap((p) => subSixteenFields(p));
    expect(offenders).toEqual([]);
  });

  it("sees a bare size and a size next to a 16px padding, and passes the pointer-fine pair", () => {
    const bad = `export const A = () => <SearchField className="text-[14px]" />;`;
    const good = `export const A = () => <SearchField className="text-[16px] [@media(pointer:fine)]:text-[14px]" />;`;
    const hidden = `export const A = () => <input type="checkbox" className="text-[12px]" />;`;
    const md = `export const A = () => <input className="text-[16px] md:text-[12px]" />;`;
    const padded = `export const A = () => <textarea className="p-[14px_16px] text-[13px]" />;`;
    expect(subSixteenFields("a.tsx", bad)).toEqual(["a.tsx:1"]);
    expect(subSixteenFields("a.tsx", md)).toEqual(["a.tsx:1"]);
    const mdFine = `export const A = () => <input className="text-[16px] [@media(pointer:fine)]:md:text-[12px]" />;`;
    expect(subSixteenFields("a.tsx", mdFine)).toEqual([]);
    expect(subSixteenFields("a.tsx", padded)).toEqual(["a.tsx:1"]);
    expect(subSixteenFields("a.tsx", good)).toEqual([]);
    expect(subSixteenFields("a.tsx", hidden)).toEqual([]);
    // A 16px that only a wide or fine-pointer screen gets does not protect the phone's 15px (CreatePreFilled's old classes).
    const wide = `export const A = () => <TextField className="text-[15px] md:text-[16px]" />;`;
    const fine = `export const A = () => <TextField className="text-[15px] [@media(pointer:fine)]:text-[16px]" />;`;
    const placeholder = `export const A = () => <TextField className="text-[15px] placeholder:text-base" />;`;
    const touch = `export const A = () => <SearchField className="text-[15px] touch:text-base" />;`;
    expect(subSixteenFields("a.tsx", wide)).toEqual(["a.tsx:1"]);
    expect(subSixteenFields("a.tsx", fine)).toEqual(["a.tsx:1"]);
    expect(subSixteenFields("a.tsx", placeholder)).toEqual(["a.tsx:1"]);
    expect(subSixteenFields("a.tsx", touch)).toEqual([]);
  });
});
