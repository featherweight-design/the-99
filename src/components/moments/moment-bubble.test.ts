import { describe, expect, it } from "vitest";
import { bubbleWidth, placeBubble } from "./moment-bubble";

// The phone's bounds stop above its 74px tab bar.
const phone = { top: 0, left: 0, right: 390, bottom: 844 - 74 };
const desk = { top: 0, left: 0, right: 1280, bottom: 900 };
const box = (left: number, top: number, w = 80, h = 32) => ({ left, top, right: left + w, bottom: top + h });

describe("placeBubble", () => {
  it("sits 10px below its control, centred on it, 300 wide at desktop", () => {
    const s = placeBubble(box(600, 200), { height: 80 }, desk, false, "below");
    expect(s).toMatchObject({ side: "below", top: 242, width: 300, left: 490, nib: 150 });
  });

  it("is the screen less 16px a side at 390, at most 358", () => {
    expect(bubbleWidth(phone, true)).toBe(358);
    expect(bubbleWidth({ ...phone, right: 360 }, true)).toBe(328);
  });

  it("clamps 16px from the edge and keeps the nib on the control", () => {
    const s = placeBubble(box(1200, 200, 60), { height: 80 }, desk, false, "below");
    expect(s.left).toBe(1280 - 16 - 300);
    expect(s.left + s.nib).toBe(1230);
  });

  it("flips above when below would cross the phone's tab bar", () => {
    const s = placeBubble(box(100, 640), { height: 90 }, phone, true, "below");
    expect(s).toMatchObject({ side: "above", top: 640 - 10 - 90 });
  });

  it("stays inside a modal's box, which clips it, as well as the viewport", () => {
    const modal = { top: 100, left: 400, right: 880, bottom: 700 };
    const s = placeBubble(box(820, 560, 40), { height: 90 }, modal, false, "below");
    expect(s.side).toBe("above");
    expect(s.left + s.width).toBeLessThanOrEqual(880 - 16);
  });

  it("sits to the right of a rail slot, nib on the left", () => {
    const s = placeBubble(box(10, 300, 62, 56), { height: 70 }, desk, false, "right");
    expect(s).toMatchObject({ side: "right", left: 82 });
    expect(s.top + s.nib).toBe(328);
  });
});
