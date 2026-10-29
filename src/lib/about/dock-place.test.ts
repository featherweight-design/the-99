import { describe, expect, it } from "vitest";
import { DOCK_GAP, dockPlace } from "./dock-place";

// A 390x844 phone: tab bar 74, so a 100px dock at the foot spans 658..758. `top` is where the top dock's CSS puts it
// at the tap (132: 12px under a back bar ending at 120); `topEdge` is what holds the screen's top.
const FOOT = { top: 658, bottom: 758 };
const AT = { foot: FOOT, top: 132, topEdge: 120 };

describe("dockPlace: a low region gets the dock at the top (Small items 3 item 6)", () => {
  it("keeps the foot while the region's bottom edge is at or above the foot dock's top edge", () => {
    expect(dockPlace({ ...AT, region: { top: 400, bottom: 440 } })).toEqual({ at: "foot" });
    expect(dockPlace({ ...AT, region: { top: 618, bottom: 658 } })).toEqual({ at: "foot" });
  });

  it("goes to the top once the region's bottom passes the foot dock's top, with no floor while the CSS clears the bars", () => {
    expect(dockPlace({ ...AT, region: { top: 620, bottom: 659 } })).toEqual({ at: "top", floor: null });
    expect(dockPlace({ ...AT, region: { top: 700, bottom: 730 } })).toEqual({ at: "top", floor: null });
    // Header away, no back bar: the CSS puts it at 12 and nothing holds the top.
    expect(dockPlace({ region: { top: 700, bottom: 730 }, foot: FOOT, top: 12, topEdge: 0 })).toEqual({ at: "top", floor: null });
  });

  it("floors it at a header still in the page, which the CSS cannot see (Small items 4 item 3)", () => {
    const low = { region: { top: 700, bottom: 730 }, foot: FOOT };
    // At the page's top: --header-offset is 0, so the CSS says 12 (or 59 with the back bar), but the header ends at 79.
    expect(dockPlace({ ...low, top: 12, topEdge: 79 })).toEqual({ at: "top", floor: 79 });
    expect(dockPlace({ ...low, top: 59, topEdge: 126 })).toEqual({ at: "top", floor: 126 });
    // Scrolled 30px: the header in the page ends at 49.
    expect(dockPlace({ ...low, top: 12, topEdge: 49 })).toEqual({ at: "top", floor: 49 });
    // Exactly 12px under it already: no floor.
    expect(dockPlace({ ...low, top: 91, topEdge: 91 - DOCK_GAP })).toEqual({ at: "top", floor: null });
  });

  it("keeps the foot for a region so tall the top dock would cover it too", () => {
    // Top dock would span 132..232; the region runs 200..700.
    expect(dockPlace({ ...AT, region: { top: 200, bottom: 700 } })).toEqual({ at: "foot" });
    // Its top just clears the top dock's foot: the top is free.
    expect(dockPlace({ ...AT, region: { top: 232, bottom: 700 } })).toEqual({ at: "top", floor: null });
    // The floor counts: under a header in the page at 126, the top dock spans 138..238.
    expect(dockPlace({ region: { top: 232, bottom: 700 }, foot: FOOT, top: 59, topEdge: 126 })).toEqual({ at: "foot" });
  });
});
