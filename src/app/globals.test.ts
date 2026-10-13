import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// import.meta.url, not __dirname: Vitest runs tests as ESM.
const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "globals.css"), "utf8");

/**
 * Every `@layer <name> { … }` block in source order, matched by counting braces
 * rather than by regex: a layer holding more than one rule contains inner `}`,
 * and a lazy regex stops at the first of them.
 */
function layerBlocks(source: string): { name: string; body: string }[] {
  const blocks: { name: string; body: string }[] = [];
  const opener = /@layer\s+([\w-]+)\s*\{/g;
  let match: RegExpExecArray | null;

  while ((match = opener.exec(source)) !== null) {
    let depth = 1;
    let i = opener.lastIndex;
    while (i < source.length && depth > 0) {
      if (source[i] === "{") depth += 1;
      else if (source[i] === "}") depth -= 1;
      i += 1;
    }
    blocks.push({ name: match[1], body: source.slice(opener.lastIndex, i - 1) });
    opener.lastIndex = i;
  }
  return blocks;
}

/** The stylesheet with every `@layer` block removed — what stays is unlayered. */
function unlayered(source: string): string {
  let out = source;
  for (const block of layerBlocks(source)) out = out.replace(block.body, "");
  return out.replace(/@layer\s+[\w-]+\s*\{\s*\}/g, "");
}

describe("global focus treatment", () => {
  // Unlayered rules outrank every layered one regardless of specificity, so an
  // unlayered :focus-visible cannot be overridden by `focus-visible:outline-none`
  // (Tailwind's utilities layer). That produced the doubled focus ring on every
  // field wrapped in a focus-within container, and survived several fixes aimed
  // at the components instead of the cascade.
  it("declares :focus-visible inside a cascade layer so components can override it", () => {
    const base = layerBlocks(css).find((b) => b.name === "base");
    expect(base, "globals.css should declare an @layer base block").toBeDefined();
    expect(base!.body).toContain(":focus-visible");
  });

  it("has no unlayered :focus-visible rule", () => {
    expect(unlayered(css)).not.toMatch(/(^|\})\s*:focus-visible\s*\{/);
  });

  it("scans layer bodies by brace depth, not to the first closing brace", () => {
    const [only] = layerBlocks("@layer base { a { color: red; } b { color: blue; } }");
    expect(only.name).toBe("base");
    expect(only.body).toContain("b {");
  });
});

describe("display-face fallback metrics", () => {
  // `next/font/google` emits a metric-matched `<Family> Fallback` @font-face for
  // each family it can find in Next's bundled capsize table, so headings hold
  // their size during `font-display: swap`. A family missing from that table
  // gets no fallback at all and snaps on first paint. Reading the table here
  // rather than trusting the build's warning means a seventh theme picking an
  // unlisted face fails in CI instead of shipping the shift.
  const metricsPath = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../node_modules/next/dist/server/capsize-font-metrics.json",
  );
  const families = new Set(
    Object.values(
      JSON.parse(readFileSync(metricsPath, "utf8")) as Record<string, { familyName?: string }>,
    ).map((entry) => entry.familyName),
  );

  /** `--font-chakra-petch` → `Chakra Petch`, the family `next/font` declares. */
  function familyOf(variable: string): string {
    return variable
      .replace(/^--font-/, "")
      .split("-")
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(" ");
  }

  const faces = [...css.matchAll(/--font-display-face:\s*([^;]+);/g)].map((m) => m[1].trim());

  it("finds a display face for every theme", () => {
    expect(faces.length).toBe(6);
  });

  it("gives every display face a metric-matched fallback", () => {
    const unmatched = faces.filter((face) => {
      const variable = face.match(/var\((--font-[a-z-]+)\)/)?.[1];
      if (!variable) return true;
      // Either Next can build the fallback itself, or globals.css declares one
      // and the face list names it — a bare `var()` with neither is the bug.
      if (families.has(familyOf(variable))) return false;
      const fallback = `${familyOf(variable)} Fallback`;
      return !(
        face.includes(fallback) &&
        new RegExp(`@font-face\\s*\\{[^}]*font-family:\\s*"${fallback}"`).test(css)
      );
    });
    expect(unmatched).toEqual([]);
  });
});

describe("animation utilities", () => {
  // The reduced-motion block is scoped to a class list rather than a blanket
  // `* { animation: none }` precisely so that adding an animation forces an
  // explicit static-fallback decision. Nothing enforced that until this test:
  // a new `.anim-*` could silently skip the block and keep moving for users who
  // asked it not to.
  const reducedMotionBlock = css.match(
    /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/,
  );
  // Empty string rather than `!`, so a regex that stops matching fails as a
  // readable assertion instead of a TypeError.
  const reducedMotionBody = reducedMotionBlock?.[1] ?? "";
  const declaredUtilities = () =>
    new Set([...css.matchAll(/^\.(anim-[\w-]+)\s*\{/gm)].map((m) => m[1]));
  const exemptedUtilities = () =>
    [...reducedMotionBody.matchAll(/\.(anim-[\w-]+)/g)].map((m) => m[1]);

  it("declares a prefers-reduced-motion block", () => {
    expect(reducedMotionBlock).not.toBeNull();
  });

  it("lists every .anim-* utility in the reduced-motion block", () => {
    const declared = declaredUtilities();
    expect(declared.size).toBeGreaterThan(0);
    const exempted = new Set(exemptedUtilities());
    expect([...declared].filter((c) => !exempted.has(c))).toEqual([]);
  });

  it("references only real utilities in the reduced-motion block", () => {
    const declared = declaredUtilities();
    expect(exemptedUtilities().filter((c) => !declared.has(c))).toEqual([]);
  });
});

// A chart's bars draw once on mount (motion plan E3): transform only, on the shared tokens.
describe("the bar grow", () => {
  it("grows on transform from zero, never on width or height", () => {
    expect(css).toMatch(/@keyframes grow-x \{\s*from \{ transform: scaleX\(0\); \}\s*\}/);
    expect(css).toMatch(/@keyframes grow-y \{\s*from \{ transform: scaleY\(0\); \}\s*\}/);
  });
  it("runs on the shared beat, length and curve", () => {
    for (const axis of ["x", "y"]) {
      expect(css).toContain(`.anim-grow-${axis} { animation: grow-${axis} var(--motion-duration) var(--motion-ease) var(--motion-delay) both; }`);
    }
  });
});

// Every loading skeleton breathes (Hugh, 2026-10-12) on opacity alone, so it costs no layout or paint.
describe("the skeleton breathe", () => {
  it("animates opacity and nothing else, gently, looping on the in-out curve", () => {
    const frames = css.match(/@keyframes skeleton-breathe \{([\s\S]*?)\n\}/)?.[1] ?? "";
    // One frame, at the midpoint, at 0.55: from full and back to full on either side.
    expect(frames.trim()).toBe("50% { opacity: 0.55; }");
    expect(css).toContain(".anim-skeleton { animation: skeleton-breathe 1.4s ease-in-out infinite; }");
  });
});
