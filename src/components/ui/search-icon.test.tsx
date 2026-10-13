import { render } from "@testing-library/react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SearchIcon } from "./search-icon";

describe("SearchIcon", () => {
  it("starts the handle clear of the lens: outer stroke edge plus the round cap", () => {
    const { container } = render(<SearchIcon />);
    const circle = container.querySelector("circle")!;
    const path = container.querySelector("path")!;
    const stroke = Number(container.querySelector("svg")!.getAttribute("stroke-width"));
    const [cx, cy, r] = ["cx", "cy", "r"].map((a) => Number(circle.getAttribute(a)));
    const m = /^M([\d.]+)\s+([\d.]+)L/.exec(path.getAttribute("d")!)!;
    const start = Math.hypot(Number(m[1]) - cx, Number(m[2]) - cy);
    // the cap reaches stroke/2 back toward the lens, the lens's edge reaches stroke/2 out
    expect(start - stroke / 2).toBeGreaterThan(r + stroke / 2);
  });

  it("is sized by its prop, and decorative", () => {
    const { container } = render(<SearchIcon size={18} />);
    const svg = container.querySelector("svg")!;
    expect(svg.getAttribute("width")).toBe("18");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
  });

  // Every search field had its own copy: a character here, a 14px drawing there.
  it("leaves no ⌕ character standing in any component under src", () => {
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((f) => {
        const p = join(d, f);
        return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(f) && !/\.test\./.test(f) ? [p] : [];
      });
    const offenders = walk(join(process.cwd(), "src")).filter((p) => {
      const s = readFileSync(p, "utf8");
      return /⌕/.test(s.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, ""));
    });
    expect(offenders).toEqual([]);
  });
});
