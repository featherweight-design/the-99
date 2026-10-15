import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Lock } from "./lock";

afterEach(cleanup);

const svg = (c: HTMLElement) => c.querySelector("svg")!;

describe("Lock", () => {
  it.each([["sm", "9", "12"], ["md", "11", "14"], ["lg", "12", "15"]] as const)("%s is %sx%s and decorative", (size, w, h) => {
    const { container } = render(<Lock size={size} />);
    expect(svg(container).getAttribute("width")).toBe(w);
    expect(svg(container).getAttribute("height")).toBe(h);
    expect(svg(container).getAttribute("viewBox")).toBe(`0 0 ${w} ${h}`);
    expect(svg(container).getAttribute("aria-hidden")).toBe("true");
  });

  it("draws the keyhole as a hole in the body (evenodd), except at sm, which has none", () => {
    for (const size of ["md", "lg"] as const) {
      const body = render(<Lock size={size} />).container.querySelector("[data-lock-part=body]")!;
      expect(body.getAttribute("fill-rule")).toBe("evenodd");
      expect((body.getAttribute("d")!.match(/Z/g) ?? []).length, size).toBe(2);
      cleanup();
    }
    const sm = render(<Lock size="sm" />).container.querySelector("[data-lock-part=body]")!;
    expect((sm.getAttribute("d")!.match(/Z/g) ?? []).length).toBe(1);
  });

  it("takes its ink from `ink`, else from its parent", () => {
    const { container } = render(<Lock size="lg" ink="var(--fg-locked)" />);
    expect(svg(container).style.color).toBe("var(--fg-locked)");
    cleanup();
    expect(svg(render(<Lock />).container).style.color).toBe("");
  });

  it("lifts the right leg when open at md and lg, and has no open state at sm", () => {
    for (const size of ["md", "lg"] as const) {
      const closed = render(<Lock size={size} />).container.querySelector("[data-lock-part=shackle]")!.getAttribute("d")!;
      cleanup();
      const { container } = render(<Lock size={size} open />);
      expect(container.querySelector("[data-lock-part=shackle]")!.getAttribute("d"), size).not.toBe(closed);
      expect(svg(container).getAttribute("data-lock-state")).toBe("open");
      cleanup();
    }
    const { container } = render(<Lock size="sm" open />);
    expect(svg(container).getAttribute("data-lock-state")).toBe("closed");
  });
});
