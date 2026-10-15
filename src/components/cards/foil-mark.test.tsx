import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { foilMarkCopy, foilSpoken } from "../../lib/copy/foil-mark";
import { OPEN_DELAY_MS } from "./fact-tooltip";
import { FOIL_MARK_PX, FoilGlint, FoilMark } from "./foil-mark";

function pointer(fine: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({
    matches: q.includes("pointer: fine") ? fine : false,
    media: q, onchange: null, addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("FoilMark", () => {
  it("is a 12px star filled from its own gradient, which reads the glint tokens", () => {
    const { container } = render(<FoilMark finish="foil" />);
    const svg = screen.getByTestId("foil-mark");
    expect(FOIL_MARK_PX).toBe(12);
    expect(svg.getAttribute("width")).toBe("12");
    expect(svg.getAttribute("height")).toBe("12");
    expect(svg.getAttribute("viewBox")).toBe("0 0 16 16");
    const stops = [...container.querySelectorAll("stop")].map((s) => s.getAttribute("stop-color"));
    expect(stops).toEqual(["a", "b", "c", "d", "e"].map((k) => `var(--foil-glint-${k})`));
    const id = container.querySelector("linearGradient")!.id;
    expect(container.querySelector("path")!.getAttribute("fill")).toBe(`url(#${id})`);
    expect(svg.getAttribute("class")).toContain("flex-none");
  });

  it("gives every instance its own gradient id, so two on a page never share a fill", () => {
    const { container } = render(<><FoilMark finish="foil" /><FoilMark finish="etched" /></>);
    const ids = [...container.querySelectorAll("linearGradient")].map((g) => g.id);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every((i) => !i.includes(":"))).toBe(true);
  });

  it("is one glint for foil and etched, told apart by its name alone", () => {
    const { container } = render(<><FoilMark finish="foil" /><FoilMark finish="etched" /></>);
    expect(screen.getByRole("img", { name: "foil" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "etched foil" })).toBeInTheDocument();
    const paths = [...container.querySelectorAll("path")].map((p) => p.getAttribute("d"));
    expect(paths[0]).toBe(paths[1]);
  });

  it("is hidden from a screen reader where the surface says the finish itself", () => {
    render(<FoilMark finish="foil" silent />);
    const svg = screen.getByTestId("foil-mark");
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.getAttribute("role")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });
});

describe("FoilGlint", () => {
  it("says the finish's sentence on hover under a fine pointer", async () => {
    pointer(true);
    render(<FoilGlint finish="etched" />);
    fireEvent.pointerEnter(screen.getByTestId("foil-mark"));
    expect(await screen.findByText(foilMarkCopy.tooltip.etched, undefined, { timeout: OPEN_DELAY_MS + 500 })).toBeInTheDocument();
  });

  it("speaks the box's own copies for a precon, one or many", async () => {
    pointer(true);
    render(<FoilGlint finish="foil" precon={{ quantity: 2 }} />);
    fireEvent.pointerEnter(screen.getByTestId("foil-mark"));
    expect(await screen.findByText(foilMarkCopy.tooltip.preconMany, undefined, { timeout: OPEN_DELAY_MS + 500 })).toBeInTheDocument();
  });

  it("draws no tooltip under a coarse pointer, and the glint stays", async () => {
    pointer(false);
    render(<FoilGlint finish="foil" />);
    fireEvent.pointerEnter(screen.getByTestId("foil-mark"));
    await new Promise((r) => setTimeout(r, OPEN_DELAY_MS + 150));
    expect(screen.queryByText(foilMarkCopy.tooltip.foil)).toBeNull();
    expect(screen.getByTestId("foil-mark")).toBeInTheDocument();
  });
});

describe("foilSpoken", () => {
  it("is the clause a name takes, and nothing for a card with no finish", () => {
    expect(foilSpoken("foil")).toBe(", foil");
    expect(foilSpoken("etched")).toBe(", etched foil");
    expect(foilSpoken(undefined)).toBe("");
  });
});
