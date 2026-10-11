import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { AnalysisRing } from "./analysis-ring";

const CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

describe("AnalysisRing", () => {
  it("waves all five marks, each on its own stagger, only while busy", () => {
    const { getByTestId, rerender } = render(<AnalysisRing busy testId="ring" />);
    const marks = [...getByTestId("ring").querySelectorAll<HTMLElement>(".anim-at-wave")];
    expect(marks.map((m) => m.style.animationDelay)).toEqual(["0s", "0.16s", "0.32s", "0.48s", "0.64s"]);
    rerender(<AnalysisRing busy={false} testId="ring" />);
    expect(getByTestId("ring").querySelectorAll(".anim-at-wave")).toHaveLength(0);
  });

  // jsdom computes no animation, so the stylesheet is the property: a mark waiting out its stagger
  // delay must hold the wave's low ink (`backwards`), and reduced motion must hold it still at full ink.
  it("holds a waiting mark at the wave's first keyframe, and still at full ink under reduced motion", () => {
    const base = CSS.match(/^\.anim-at-wave\s*\{([^}]*)\}/m);
    expect(base?.[1]).toMatch(/animation:\s*at-wave[^;]*\bbackwards\b/);
    expect(CSS).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.anim-at-wave\s*\{\s*animation:\s*none;\s*opacity:\s*1;\s*\}/);
  });
});
