import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const CSS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "globals.css"), "utf8");
const token = (name: string) => new RegExp(`--${name}:\\s*([^;]+);`).exec(CSS)?.[1].trim();

// E9 (small-polish R2 §3): a Show more's new items fade in at the beat plus 40ms times their place in the batch (capped at 11
// by `revealOf`), so the whole batch is in by 100 + 40 * 11 + 200 = 740ms.
describe("E9: staggered Show more", () => {
  it("fades in on the quick length and shared curve, after the beat plus the stagger, holding at 0 until then", () => {
    expect(token("motion-stagger")).toBe("40ms");
    expect(CSS).toMatch(/\.anim-reveal \{\s*animation: reveal-in var\(--motion-quick\) var\(--motion-ease\) calc\(var\(--motion-delay\) \+ var\(--motion-stagger\) \* var\(--reveal-n, 0\)\) backwards;\s*\}/);
    // Opacity only: no rise, no scale.
    expect(CSS).toMatch(/@keyframes reveal-in \{\s*from \{ opacity: 0; \}\s*\}/);
  });

  it("is in by 740ms for the last of a batch", () => {
    const beat = parseInt(token("motion-delay")!, 10);
    const stagger = parseInt(token("motion-stagger")!, 10);
    const quick = parseInt(token("motion-quick")!, 10);
    expect(beat + stagger * 11 + quick).toBe(740);
  });

  it("shortens to 100ms with no wait under reduced motion", () => {
    const reduced = CSS.slice(CSS.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(/\.anim-reveal \{ animation: reveal-in 100ms var\(--motion-ease\) backwards; \}/);
  });
});
