import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useVisualViewportFrame, VV_BOTTOM, VV_FRAME } from "./visual-viewport";

/** A visual viewport jsdom does not have: an EventTarget with the two figures the hook reads. */
function stubViewport(top: number, height: number) {
  const vv = Object.assign(new EventTarget(), { offsetTop: top, height, offsetLeft: 0, width: 390 });
  const add = vi.spyOn(vv, "addEventListener");
  const remove = vi.spyOn(vv, "removeEventListener");
  vi.stubGlobal("visualViewport", vv);
  return { vv, add, remove };
}

function Probe({ active }: { active?: boolean }) {
  return <div data-testid="probe" style={useVisualViewportFrame(active)} />;
}
const probe = () => document.querySelector<HTMLElement>("[data-testid=probe]")!;
const vars = () => ({ top: probe().style.getPropertyValue("--vv-top"), h: probe().style.getPropertyValue("--vv-h") });

describe("useVisualViewportFrame", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("hands the visual viewport's top and height to CSS, and follows its resize and scroll", () => {
    const { vv } = stubViewport(0, 800);
    render(<Probe />);
    expect(vars()).toEqual({ top: "0px", h: "800px" });
    // The keyboard opens: the visual viewport shrinks and pans; the layout viewport does not.
    act(() => {
      Object.assign(vv, { height: 420, offsetTop: 60 });
      vv.dispatchEvent(new Event("resize"));
    });
    expect(vars()).toEqual({ top: "60px", h: "420px" });
    act(() => {
      Object.assign(vv, { offsetTop: 140 });
      vv.dispatchEvent(new Event("scroll"));
    });
    expect(vars()).toEqual({ top: "140px", h: "420px" });
  });

  it("removes both listeners on unmount, and stops following", () => {
    const { vv, add, remove } = stubViewport(0, 800);
    const { unmount } = render(<Probe />);
    expect(add.mock.calls.map((c) => c[0]).sort()).toEqual(["resize", "scroll"]);
    unmount();
    expect(remove.mock.calls.map((c) => c[0]).sort()).toEqual(["resize", "scroll"]);
    // The very handlers it added, not a fresh closure that would leave the originals attached.
    for (const [type, fn] of add.mock.calls) expect(remove).toHaveBeenCalledWith(type, fn);
    expect(() => vv.dispatchEvent(new Event("resize"))).not.toThrow();
  });

  it("sets nothing and listens to nothing while inactive, and lets go when it turns inactive", () => {
    const { add, remove } = stubViewport(0, 800);
    const { rerender } = render(<Probe active={false} />);
    expect(vars()).toEqual({ top: "", h: "" });
    expect(add).not.toHaveBeenCalled();
    rerender(<Probe active />);
    expect(vars()).toEqual({ top: "0px", h: "800px" });
    rerender(<Probe active={false} />);
    expect(vars()).toEqual({ top: "", h: "" });
    expect(remove.mock.calls.map((c) => c[0]).sort()).toEqual(["resize", "scroll"]);
  });

  it("sets nothing without a visual viewport, so every class falls back to the layout viewport", () => {
    vi.stubGlobal("visualViewport", undefined);
    render(<Probe />);
    expect(vars()).toEqual({ top: "", h: "" });
  });

  it("frames at the phone alone, with fallbacks that are the layout viewport", () => {
    for (const cls of [...VV_FRAME.split(" "), VV_BOTTOM]) expect(cls.startsWith("max-md:")).toBe(true);
    expect(VV_FRAME).toContain("max-md:top-[var(--vv-top,0px)]");
    expect(VV_FRAME).toContain("max-md:h-[var(--vv-h,100%)]");
    expect(VV_BOTTOM).toBe("max-md:bottom-[calc(100%_-_var(--vv-top,0px)_-_var(--vv-h,100%))]");
  });
});
