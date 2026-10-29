import { describe, expect, it } from "vitest";
import { DOCK_GAP, dockPlace } from "./dock-place";

// A 390x844 phone: tab bar 74, so a 100px dock at the foot spans 658..758; the back bar's bottom is at 120.
const FOOT = { top: 658, bottom: 758 };

describe("dockPlace: a low region gets the dock at the top (Small items 3 item 6)", () => {
  it("keeps the foot while the region's bottom edge is at or above the foot dock's top edge", () => {
    expect(dockPlace({ region: { top: 400, bottom: 440 }, foot: FOOT, topEdge: 120 })).toEqual({ at: "foot" });
    expect(dockPlace({ region: { top: 618, bottom: 658 }, foot: FOOT, topEdge: 120 })).toEqual({ at: "foot" });
  });

  it("goes to the top, 12px under the bar holding the top of the screen, once the region's bottom passes the foot dock's top", () => {
    expect(dockPlace({ region: { top: 620, bottom: 659 }, foot: FOOT, topEdge: 120 })).toEqual({ at: "top", top: 120 + DOCK_GAP });
    expect(dockPlace({ region: { top: 700, bottom: 730 }, foot: FOOT, topEdge: 120 })).toEqual({ at: "top", top: 132 });
  });

  it("sits 12px under whatever is on screen: the header alone, or the screen's top with the header away", () => {
    expect(dockPlace({ region: { top: 700, bottom: 730 }, foot: FOOT, topEdge: 79 })).toEqual({ at: "top", top: 91 });
    expect(dockPlace({ region: { top: 700, bottom: 730 }, foot: FOOT, topEdge: 0 })).toEqual({ at: "top", top: 12 });
    expect(dockPlace({ region: { top: 700, bottom: 730 }, foot: FOOT, topEdge: -40 })).toEqual({ at: "top", top: 12 });
  });

  it("clears the notch: with no bar on screen it sits 12px under the top safe-area inset; a bar's edge below the inset wins", () => {
    const low = { region: { top: 700, bottom: 730 }, foot: FOOT };
    // No inset: unchanged.
    expect(dockPlace({ ...low, topEdge: 0, safeTop: 0 })).toEqual({ at: "top", top: 12 });
    expect(dockPlace({ ...low, topEdge: 120, safeTop: 0 })).toEqual({ at: "top", top: 132 });
    // A 47px notch, nothing on screen.
    expect(dockPlace({ ...low, topEdge: 0, safeTop: 47 })).toEqual({ at: "top", top: 59 });
    expect(dockPlace({ ...low, topEdge: -40, safeTop: 47 })).toEqual({ at: "top", top: 59 });
    // The header on screen ends at 79, below the inset.
    expect(dockPlace({ ...low, topEdge: 79, safeTop: 47 })).toEqual({ at: "top", top: 91 });
  });

  it("keeps the foot for a region so tall the top dock would cover it too", () => {
    // Top dock would span 132..232; the region runs 200..700.
    expect(dockPlace({ region: { top: 200, bottom: 700 }, foot: FOOT, topEdge: 120 })).toEqual({ at: "foot" });
    // Its top just clears the top dock's foot: the top is free.
    expect(dockPlace({ region: { top: 232, bottom: 700 }, foot: FOOT, topEdge: 120 })).toEqual({ at: "top", top: 132 });
  });
});
