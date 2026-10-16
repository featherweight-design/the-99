import { describe, expect, it } from "vitest";
import { placeBubble } from "./moment-bubble";

const phone = { width: 390, height: 844, bottomInset: 74 };
const desk = { width: 1280, height: 900, bottomInset: 0 };
const box = (left: number, top: number, w = 80, h = 32) => ({ left, top, right: left + w, bottom: top + h });

describe("placeBubble", () => {
  it("sits 10px below its control, centred on it, 300 wide at desktop", () => {
    const s = placeBubble(box(600, 200), { height: 80 }, desk, "below");
    expect(s).toMatchObject({ side: "below", top: 242, width: 300, left: 490, nib: 150 });
  });

  it("is the screen less 16px a side at 390, at most 358", () => {
    expect(placeBubble(box(100, 200), { height: 80 }, phone, "below").width).toBe(358);
    expect(placeBubble(box(100, 200), { height: 80 }, { ...phone, width: 360 }, "below").width).toBe(328);
  });

  it("clamps 16px from the edge and keeps the nib on the control", () => {
    const s = placeBubble(box(1200, 200, 60), { height: 80 }, desk, "below");
    expect(s.left).toBe(1280 - 16 - 300);
    expect(s.left + s.nib).toBe(1230);
  });

  it("flips above when below would cross the phone's tab bar", () => {
    const s = placeBubble(box(100, 640), { height: 90 }, phone, "below");
    expect(s).toMatchObject({ side: "above", top: 640 - 10 - 90 });
  });

  it("sits to the right of a rail slot, nib on the left", () => {
    const s = placeBubble(box(10, 300, 62, 56), { height: 70 }, desk, "right");
    expect(s).toMatchObject({ side: "right", left: 82 });
    expect(s.top + s.nib).toBe(328);
  });
});
