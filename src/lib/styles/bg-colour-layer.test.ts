import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A Tailwind `bg-[radial-gradient(...),var(--surface-sunken)]` compiles to ONE `background-image`
 * whose last layer is a colour. A colour is not an image, so the browser drops the whole
 * declaration and the element paints nothing (Invites PR 4: card 2's fan, the card backs). The
 * colour belongs in its own `bg-[color:...]` class. jsdom cannot see this, so the source is read.
 */
const TRAILING_COLOUR = /bg-\[[a-z-]*gradient\([^\]]*\),var\(--[a-z-]+\)\]/;

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return sources(p);
    return /\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) ? [p] : [];
  });
}

describe("background layers", () => {
  it("never end a gradient list with a colour var inside one arbitrary bg class", () => {
    const bad = sources(join(process.cwd(), "src")).filter((f) => TRAILING_COLOUR.test(readFileSync(f, "utf8")));
    expect(bad).toEqual([]);
  });

  it("catches the shape it guards", () => {
    expect(TRAILING_COLOUR.test('bg-[radial-gradient(18px_18px_at_50%_46%,red,transparent),var(--surface-sunken)]')).toBe(true);
    expect(TRAILING_COLOUR.test("bg-[color:var(--surface-sunken)] bg-[image:radial-gradient(a,b)]")).toBe(false);
  });
});
