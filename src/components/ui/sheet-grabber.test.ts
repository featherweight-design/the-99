import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { twMerge } from "tailwind-merge";
import { describe, expect, it } from "vitest";

// A phone sheet's grabber is `SheetGrabber`. A sheet that draws its own 3x-4x px by 4px bar drifts from it
// (spacing, ink, desktop visibility) the next time one of them changes. The scan reads each whole file and
// takes every quoted class string (wrapped across lines, a template literal, ink in any order) that carries a 4px
// height and a 30-49px or w-10 width, so a new bar fails unless it is listed here with the reason it differs.
const SRC = join(__dirname, "..", "..");
const OWNER = "components/ui/sheet-grabber.tsx";

/** file -> [bars it draws, why it is not `SheetGrabber`]. A listed file must still draw exactly that many. */
const ALLOWED: Record<string, [number, string]> = {
  "components/decks/shelf-sheet.tsx": [1, "36 wide, 9px top margin, always a sheet"],
  "components/decks/precons/precon-link-dialogs.tsx": [1, "36 wide"],
  "components/decks/precons/start-precon.tsx": [1, "36 wide"],
  "components/ui/sheet.tsx": [1, "the Sheet shell's own draggable 36 wide handle (HANDLE_BAR)"],
  "components/ui/filter-panel.tsx": [1, "36 wide"],
  "components/commanders/rack/filter-sheet.tsx": [1, "36 wide"],
  "components/ui/set-list-sheet.tsx": [1, "38 wide"],
  "components/collection/filter-sheet.tsx": [1, "38 wide, a Sheet handleBarClassName"],
  "components/collection/issue-inspector.tsx": [1, "38 wide, a Sheet handleBarClassName"],
  "components/decks/deck-filter-sheet.tsx": [1, "38 wide, a Sheet handleBarClassName"],
  "components/decks/cart/cart-filter-sheet.tsx": [1, "38 wide, dashed ink"],
  "components/decks/got-it-confirm.tsx": [1, "36 wide, dashed ink"],
  "components/about/reference/creator-note.tsx": [1, "dashed ink, 8px top margin"],
  "components/shell/account-menu.tsx": [1, "40 wide but no md:hidden (a phone-only menu)"],
  "components/cards/card-modal-sheet.tsx": [1, "36 wide, inside the interactive grip button"],
};

const BAR_HEIGHT = /(?<![\w-])h-(?:\[4px\]|1)(?![\w\[-])/;
const BAR_WIDTH = /(?<![\w-])w-(?:\[(?:3\d|4\d)px\]|10)(?![\w\]-])/;
const HEIGHT_G = new RegExp(BAR_HEIGHT.source, "g");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}

/** The bars a source text draws, as line numbers. */
function barsIn(text: string): number[] {
  // The class string around each 4px height: bounded by the nearest quote or backtick either side (no
  // pairing, so an apostrophe in a comment elsewhere cannot unbalance it).
  return [...text.matchAll(HEIGHT_G)]
    .filter((m) => {
      const start = Math.max(text.lastIndexOf('"', m.index), text.lastIndexOf("'", m.index), text.lastIndexOf("`", m.index));
      const ends = ['"', "'", "`"].map((q) => text.indexOf(q, m.index)).filter((i) => i >= 0);
      return BAR_WIDTH.test(text.slice(start + 1, Math.min(...ends, text.length)));
    })
    .map((m) => text.slice(0, m.index).split("\n").length);
}

describe("sheet grabber", () => {
  const found = new Map<string, number[]>();
  for (const f of walk(SRC)) {
    const rel = relative(SRC, f);
    if (rel === OWNER) continue;
    const bars = barsIn(readFileSync(f, "utf8"));
    if (bars.length) found.set(rel, bars);
  }

  it("is drawn inline only by the listed sheets", () => {
    const bad = [...found].filter(([f]) => !ALLOWED[f]).map(([f, l]) => `${f}:${l.join(",")}`);
    expect(bad, `Inline sheet grabber bar found. Use <SheetGrabber /> from components/ui/sheet-grabber (pass className/barClassName for the spacing), or list the file in ALLOWED with the reason it differs:\n${bad.join("\n")}`).toEqual([]);
  });

  it("lists only files that still draw the bar they are excused for", () => {
    const stale = Object.entries(ALLOWED)
      .filter(([f, [n]]) => (found.get(f)?.length ?? 0) !== n)
      .map(([f, [n]]) => `${f}: expected ${n}, found ${found.get(f)?.length ?? 0}`);
    expect(stale, `ALLOWED is stale; update or drop the entry:\n${stale.join("\n")}`).toEqual([]);
  });

  it("matches wrapped, reordered and template-literal bars", () => {
    expect(barsIn('x = "rounded-full\n  w-[40px] bg-[color:var(--border-strong)]\n h-[4px]"')).toHaveLength(1);
    expect(barsIn("x = `${a} h-[4px] w-[38px]`")).toHaveLength(1);
    expect(barsIn('x = "h-[40px] w-[40px]"')).toHaveLength(0);
  });

  it("gives a dialog caller the geometry its inline bar had (admin confirm frame: no top pad, no gap)", () => {
    expect(twMerge("flex flex-none justify-center pt-[9px] md:hidden", "pt-0")).toBe("flex flex-none justify-center md:hidden pt-0");
    expect(twMerge("mb-[4px] h-[4px] w-[40px] rounded-full bg-[color:var(--border-strong)]", "mb-0")).toBe(
      "h-[4px] w-[40px] rounded-full bg-[color:var(--border-strong)] mb-0",
    );
  });
});
