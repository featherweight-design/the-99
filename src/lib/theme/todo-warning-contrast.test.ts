// The to-do card's warning rows (deck messages A4 and A6), in the inks the component draws, read
// from its source, in every theme:
// - The mark's `--danger` on its own danger tint is held to 3:1, not 4.5: it is aria-hidden, and
//   its figure is repeated in words by the row's title, so it is a decorative duplicate (ruled for
//   the handoff's READINESS gate, 2026-10-22). `--danger` cannot reach 4.5 there in any theme.
// - The `--avail-over-fg` title on the card's `--surface-rail` is text, so 4.5.
// - A warning that is the next step (only the over row) draws its title in `--fg`, which must clear
//   4.5 on the next step's 7% accent tint, where `--avail-over-fg` does not.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrast, parseHex } from "./color";
import { parseThemeBlocks } from "./parse-css";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const THEMES = parseThemeBlocks(readFileSync(join(SRC, "app", "globals.css"), "utf8"));
const CARD = readFileSync(join(SRC, "components", "decks", "todo-card.tsx"), "utf8");
const TEXT = 4.5;
const DECORATIVE = 3;

/** `color-mix(in srgb, a w%, b)`: the tint as the browser composites it. */
function mix(a: string, w: number, b: string): string {
  const x = parseHex(a);
  const y = parseHex(b);
  return `#${x.map((v, i) => Math.round(v * w + y[i] * (1 - w)).toString(16).padStart(2, "0")).join("")}`;
}

describe("the to-do card's warning inks", () => {
  it("are drawn as this test measures them", () => {
    expect(CARD).toContain('"bg-[color:color-mix(in_srgb,var(--danger)_16%,var(--bg))] text-[color:var(--danger)]"');
    expect(CARD).toContain('warning && !next ? "text-[color:var(--avail-over-fg)]" : "text-[color:var(--fg)]"');
    expect(CARD).toContain("bg-[color:var(--surface-rail)]");
    expect(CARD).toContain("bg-[color:color-mix(in_srgb,var(--accent)_7%,var(--surface-rail))]");
  });

  it.each([...THEMES.keys()])("clear their floors in %s", (name) => {
    const t = THEMES.get(name)!;
    const v = (k: string) => t.get(k)!;
    const mark = contrast(v("danger"), mix(v("danger"), 0.16, v("bg")));
    const title = contrast(v("avail-over-fg"), v("surface-rail"));
    const titleNext = contrast(v("fg"), mix(v("accent"), 0.07, v("surface-rail")));
    if (process.env.PRINT_CONTRAST) console.log(name, mark.toFixed(2), title.toFixed(2), titleNext.toFixed(2));
    expect(mark, `${name}: --danger on its tint`).toBeGreaterThanOrEqual(DECORATIVE);
    expect(title, `${name}: --avail-over-fg on --surface-rail`).toBeGreaterThanOrEqual(TEXT);
    expect(titleNext, `${name}: --fg on the next step's tint`).toBeGreaterThanOrEqual(TEXT);
  });
});
