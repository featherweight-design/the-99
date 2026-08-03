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

describe("animation utilities", () => {
  // The reduced-motion block is scoped to a class list rather than a blanket
  // `* { animation: none }` precisely so that adding an animation forces an
  // explicit static-fallback decision. Nothing enforced that until this test:
  // a new `.anim-*` could silently skip the block and keep moving for users who
  // asked it not to.
  const reducedMotionBlock = css.match(
    /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/,
  );

  it("declares a prefers-reduced-motion block", () => {
    expect(reducedMotionBlock).not.toBeNull();
  });

  it("lists every .anim-* utility in the reduced-motion block", () => {
    const declared = new Set(
      [...css.matchAll(/^\.(anim-[\w-]+)\s*\{/gm)].map((m) => m[1]),
    );
    expect(declared.size).toBeGreaterThan(0);
    const exempted = new Set(
      [...reducedMotionBlock![1].matchAll(/\.(anim-[\w-]+)/g)].map((m) => m[1]),
    );
    expect([...declared].filter((c) => !exempted.has(c))).toEqual([]);
  });

  it("references only real utilities in the reduced-motion block", () => {
    const declared = new Set(
      [...css.matchAll(/^\.(anim-[\w-]+)\s*\{/gm)].map((m) => m[1]),
    );
    const exempted = [...reducedMotionBlock![1].matchAll(/\.(anim-[\w-]+)/g)].map((m) => m[1]);
    expect(exempted.filter((c) => !declared.has(c))).toEqual([]);
  });
});
