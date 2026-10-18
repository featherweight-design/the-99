// The account menu's credit chip (M1b): its count is text on the chip's own tint, drawn over the menu (the popover's
// --surface-raised, the phone sheet's --surface). It must clear WCAG's 4.5:1 in every theme, in the inks the component
// actually uses, read from its source so a change there is a change here.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrast, parseHex } from "./color";
import { parseThemeBlocks } from "./parse-css";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const THEMES = parseThemeBlocks(readFileSync(join(SRC, "app", "globals.css"), "utf8"));
const CHIP = readFileSync(join(SRC, "components", "shell", "credit-chip.tsx"), "utf8");
const FLOOR = 4.5;

/** `color-mix(in srgb, a w%, transparent)` over `ground`: the tint as the browser composites it. */
function tint(a: string, w: number, ground: string): string {
  const x = parseHex(a);
  const y = parseHex(ground);
  return `#${x.map((v, i) => Math.round(v * w + y[i] * (1 - w)).toString(16).padStart(2, "0")).join("")}`;
}

/** The token named by `const <name> = warn ? "text-[color:var(--A)]" : "text-[color:var(--B)]"`. */
function inks(name: string): { warn: string; rest: string } {
  const m = new RegExp(`const ${name} = warn \\? "text-\\[color:var\\(--([a-z-]+)\\)\\]" : "text-\\[color:var\\(--([a-z-]+)\\)\\]"`).exec(CHIP);
  if (!m) throw new Error(`credit-chip.tsx no longer declares ${name} as this test reads it`);
  return { warn: m[1], rest: m[2] };
}

describe("the credit chip's count", () => {
  const count = inks("countInk");

  it("is drawn in the ink this test measures", () => {
    expect(CHIP).toMatch(/data-chip-count className=\{`[^`]*\$\{countInk\}`\}/);
  });

  it.each([...THEMES.keys()])("clears 4.5:1 on its tint over both menu grounds in %s", (name) => {
    const t = THEMES.get(name)!;
    for (const ground of ["surface-raised", "surface"]) {
      const held = tint(t.get("accent")!, 0.16, t.get(ground)!);
      expect(contrast(t.get(count.rest)!, held), `${name}: --${count.rest} on the accent tint over --${ground}`).toBeGreaterThanOrEqual(FLOOR);
      const expiring = tint(t.get("warning")!, 0.14, t.get(ground)!);
      expect(contrast(t.get(count.warn)!, expiring), `${name}: --${count.warn} on the warning tint over --${ground}`).toBeGreaterThanOrEqual(FLOOR);
    }
  });
});
