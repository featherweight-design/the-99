import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cubicBezier, MOTION, MOTION_EASE_POINTS } from "./motion";

const css = readFileSync(join(__dirname, "../../app/globals.css"), "utf8");
const token = (name: string) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();

describe("MOTION", () => {
  it("carries the numbers globals.css declares", () => {
    expect(token("motion-delay")).toBe(`${MOTION.delayMs}ms`);
    expect(token("motion-duration")).toBe(`${MOTION.durationMs}ms`);
    expect(token("motion-ease")).toBe(`cubic-bezier(${MOTION_EASE_POINTS.join(", ")})`);
  });
});

describe("cubicBezier", () => {
  it("runs from 0 to 1, symmetric about the middle for the motion curve", () => {
    expect(MOTION.ease(0)).toBe(0);
    expect(MOTION.ease(1)).toBe(1);
    expect(MOTION.ease(0.5)).toBeCloseTo(0.5, 4);
    expect(MOTION.ease(0.2) + MOTION.ease(0.8)).toBeCloseTo(1, 4);
    // Gentle at both ends: slower than linear near the start.
    expect(MOTION.ease(0.1)).toBeLessThan(0.1);
  });
  it("is the identity for the linear curve, and matches a known point of ease", () => {
    const linear = cubicBezier(0, 0, 1, 1);
    for (const x of [0.1, 0.33, 0.7]) expect(linear(x)).toBeCloseTo(x, 4);
    // CSS `ease` at 50% progress is about 0.8024.
    expect(cubicBezier(0.25, 0.1, 0.25, 1)(0.5)).toBeCloseTo(0.8024, 3);
  });
});
