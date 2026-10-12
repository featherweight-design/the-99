import { afterEach, describe, expect, it, vi } from "vitest";
import { reveal } from "./reveal";

function media(reduce: boolean) {
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: reduce && q === "(prefers-reduced-motion: reduce)" }));
}

describe("reveal", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("scrolls smoothly by default", () => {
    media(false);
    const el = document.createElement("div");
    el.scrollIntoView = vi.fn();
    reveal(el);
    expect(el.scrollIntoView).toHaveBeenCalledWith({ block: "start", behavior: "smooth" });
  });

  it("jumps under reduced motion", () => {
    media(true);
    const el = document.createElement("div");
    el.scrollIntoView = vi.fn();
    reveal(el, "nearest");
    expect(el.scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "auto" });
  });

  it("does nothing without an element", () => {
    expect(() => reveal(null)).not.toThrow();
  });
});
