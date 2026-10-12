import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Chevron, CHEVRON_CLASS } from "./chevron";

describe("Chevron", () => {
  it("draws ▾ closed and ▴ open at the shared 13px size, hidden from the accessibility tree", () => {
    const { container, rerender } = render(<Chevron />);
    const span = container.firstElementChild!;
    expect(span.textContent).toBe("▾");
    expect(span.getAttribute("aria-hidden")).toBe("true");
    expect(span.className).toBe(CHEVRON_CLASS);
    expect(CHEVRON_CLASS).toContain("text-[13px]");
    rerender(<Chevron open className="ml-auto" />);
    expect(container.firstElementChild!.textContent).toBe("▴");
    expect(container.firstElementChild!.className).toBe(`${CHEVRON_CLASS} ml-auto`);
  });
});

// The motion rule (bug batch 2026-10-12): a beat of delay, then ease-in-out, from shared tokens.
describe("the shared motion tokens", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
  it("declares the delay, the duration and an ease-in-out curve", () => {
    expect(css).toMatch(/--motion-delay:\s*100ms/);
    expect(css).toMatch(/--motion-duration:\s*320ms/);
    expect(css).toMatch(/--motion-ease:\s*cubic-bezier\(0\.45, 0, 0\.55, 1\)/);
  });
  it("animates .anim-gentle-in on those tokens, in that order, holding through the delay", () => {
    expect(css).toMatch(/\.anim-gentle-in \{ animation: gentle-in var\(--motion-duration\) var\(--motion-ease\) var\(--motion-delay\) both; \}/);
  });
});
