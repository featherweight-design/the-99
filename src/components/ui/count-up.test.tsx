// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { COUNT_UP_DELAY_MS, COUNT_UP_MS, CountUp, easeInOut } from "./count-up";

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const visible = (c: HTMLElement) => c.querySelector("[data-count-up]")?.textContent;
const twin = (c: HTMLElement) => c.querySelector(".sr-only")?.textContent;

function reduce(on: boolean) {
  window.matchMedia = ((q: string) => ({ matches: on && q.includes("reduce"), addEventListener() {}, removeEventListener() {}, media: q })) as never;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"] });
  reduce(false);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("CountUp", () => {
  it("holds its timing to the motion tokens", () => {
    expect(css).toContain(`--motion-delay: ${COUNT_UP_DELAY_MS}ms;`);
    expect(css).toContain(`--motion-duration: ${COUNT_UP_MS}ms;`);
    expect(css).toContain("--motion-ease: cubic-bezier(0.45, 0, 0.55, 1);");
    expect(easeInOut(0)).toBeCloseTo(0, 3);
    expect(easeInOut(1)).toBeCloseTo(1, 3);
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 2);
  });

  it("starts at 0, waits the beat, counts to the figure, and the real value is in the twin throughout", () => {
    const { container } = render(<CountUp value={312} text={(n) => `${n} cards`} />);
    expect(twin(container)).toBe("312 cards");
    expect(visible(container)).toBe("0 cards");
    act(() => void vi.advanceTimersByTime(COUNT_UP_DELAY_MS - 10));
    expect(visible(container)).toBe("0 cards");
    act(() => void vi.advanceTimersByTime(COUNT_UP_MS / 2 + 10));
    const mid = Number.parseInt(visible(container) ?? "", 10);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(312);
    expect(twin(container)).toBe("312 cards");
    act(() => void vi.advanceTimersByTime(COUNT_UP_MS));
    expect(visible(container)).toBe("312 cards");
  });

  it("hides the moving digits from assistive tech", () => {
    const { container } = render(<CountUp value={40} />);
    expect(container.querySelector("[data-count-up]")?.getAttribute("aria-hidden")).toBe("true");
    expect(container.querySelector(".sr-only")?.hasAttribute("aria-hidden")).toBe(false);
  });

  it("does not count a figure under 10", () => {
    const { container } = render(<CountUp value={7} text={(n) => `${n} cards`} />);
    expect(container.textContent).toBe("7 cards");
    expect(container.querySelector("[data-count-up]")).toBeNull();
  });

  it("counts from the old figure when the value changes", () => {
    const { container, rerender } = render(<CountUp value={100} />);
    act(() => void vi.advanceTimersByTime(1000));
    expect(visible(container)).toBe("100");
    rerender(<CountUp value={200} />);
    expect(visible(container)).toBe("100");
    act(() => void vi.advanceTimersByTime(COUNT_UP_DELAY_MS + COUNT_UP_MS / 2));
    const mid = Number.parseInt(visible(container) ?? "", 10);
    expect(mid).toBeGreaterThan(100);
    expect(mid).toBeLessThan(200);
    act(() => void vi.advanceTimersByTime(COUNT_UP_MS));
    expect(visible(container)).toBe("200");
  });

  it("shows the final figure at once under reduced motion", () => {
    reduce(true);
    const { container } = render(<CountUp value={312} />);
    expect(visible(container)).toBe("312");
  });
});
