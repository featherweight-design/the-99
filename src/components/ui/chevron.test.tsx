import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Chevron, CHEVRON_CLASS } from "./chevron";

describe("Chevron", () => {
  it("draws a menu as ▾, turned 180 degrees when open, at the shared 13px size, hidden from the accessibility tree", () => {
    const { container, rerender } = render(<Chevron />);
    const span = container.firstElementChild!;
    expect(span.textContent).toBe("▾");
    expect(span.getAttribute("aria-hidden")).toBe("true");
    expect(span.className).toContain(CHEVRON_CLASS);
    expect(span.className).not.toContain("rotate-180");
    expect(CHEVRON_CLASS).toContain("text-[13px]");
    rerender(<Chevron open className="ml-auto" />);
    const open = container.firstElementChild!;
    expect(open.textContent).toBe("▾");
    expect(open.className).toContain("rotate-180");
    expect(open.className).toContain("ml-auto");
    expect(open.getAttribute("data-open")).toBe("true");
  });

  it("draws a disclosure as ▸, turned 90 degrees to ▾ when open", () => {
    const { container, rerender } = render(<Chevron kind="disclosure" />);
    expect(container.firstElementChild!.textContent).toBe("▸");
    expect(container.firstElementChild!.className).not.toContain("rotate-90");
    rerender(<Chevron kind="disclosure" open />);
    expect(container.firstElementChild!.className).toContain("rotate-90");
  });

  it("animates the turn on the quick motion and snaps under reduced motion", () => {
    const { container } = render(<Chevron />);
    expect(container.firstElementChild!.className).toContain("transition-transform");
    expect(container.firstElementChild!.className).toContain("motion-reduce:transition-none");
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
  it("makes the quick length every transition utility's default, on the shared curve", () => {
    expect(css).toMatch(/--motion-quick:\s*200ms/);
    expect(css).toMatch(/--default-transition-duration:\s*var\(--motion-quick\)/);
    expect(css).toMatch(/--default-transition-timing-function:\s*var\(--motion-ease\)/);
  });
  it("animates .anim-gentle-in on those tokens, in that order, holding through the delay", () => {
    expect(css).toMatch(/\.anim-gentle-in \{ animation: gentle-in var\(--motion-duration\) var\(--motion-ease\) var\(--motion-delay\) both; \}/);
  });
});
