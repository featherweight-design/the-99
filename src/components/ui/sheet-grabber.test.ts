import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// A phone sheet's grabber is `SheetGrabber`. A sheet that draws its own 40 x 4 bar in the strong border ink
// drifts from it (spacing, ink, desktop visibility) the next time one of them changes.
const SRC = join(__dirname, "..", "..");
const ALLOWED = new Set(["components/ui/sheet-grabber.tsx"]);
const INLINE_GRABBER = /h-\[4px\][^"`']*w-\[40px\][^"`']*var\(--border-strong\)|w-\[40px\][^"`']*h-\[4px\][^"`']*var\(--border-strong\)/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}

describe("sheet grabber", () => {
  it("is drawn only by ui/sheet-grabber.tsx", () => {
    const bad = walk(SRC)
      .filter((f) => !ALLOWED.has(relative(SRC, f)))
      .flatMap((f) => readFileSync(f, "utf8").split("\n").flatMap((l, i) => (INLINE_GRABBER.test(l) ? [`${relative(SRC, f)}:${i + 1}`] : [])));
    expect(bad, `Inline 40x4 sheet grabber found. Use <SheetGrabber /> from components/ui/sheet-grabber (pass className/barClassName for the spacing):\n${bad.join("\n")}`).toEqual([]);
  });
});
