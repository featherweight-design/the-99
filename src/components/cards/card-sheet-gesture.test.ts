import { describe, expect, it } from "vitest";

import {
  SHEET,
  SWIPE,
  bandOffset,
  clampSheetTop,
  lockAxis,
  pageDecision,
  sheetSnap,
  startsAtSystemEdge,
  velocity,
} from "./card-sheet-gesture";

// Each boundary is asserted from both sides: a constant that drifts by one in either direction
// fails one of the pair.
describe("lockAxis (R1 lock: 10px, then 1.5x)", () => {
  it("chooses nothing inside the lock distance", () => {
    expect(lockAxis(6, 7)).toBeNull();
    expect(lockAxis(9.9, 0)).toBeNull();
  });

  it("locks at exactly the lock distance", () => {
    expect(lockAxis(SWIPE.lockPx, 0)).toBe("x");
    expect(lockAxis(0, -SWIPE.lockPx)).toBe("y");
  });

  it("is horizontal only when |dx| beats 1.5 x |dy|", () => {
    expect(lockAxis(16, 10)).toBe("x");
    expect(lockAxis(15, 10)).toBe("y");
    expect(lockAxis(-30, 12)).toBe("x");
  });
});

describe("startsAtSystemEdge (16px either side)", () => {
  it("gives a drag starting within 16px of either edge to the system", () => {
    expect(startsAtSystemEdge(16, 390)).toBe(true);
    expect(startsAtSystemEdge(374, 390)).toBe(true);
  });

  it("keeps a drag starting just inside that", () => {
    expect(startsAtSystemEdge(17, 390)).toBe(false);
    expect(startsAtSystemEdge(373, 390)).toBe(false);
  });
});

describe("bandOffset", () => {
  it("follows the finger 1:1 toward a side with a neighbor", () => {
    expect(bandOffset(-120, true, true)).toBe(-120);
    expect(bandOffset(80, true, false)).toBe(80);
  });

  it("rubber-bands at 0.3x toward a side with none", () => {
    expect(bandOffset(100, false, true)).toBeCloseTo(30);
    expect(bandOffset(-100, true, false)).toBeCloseTo(-30);
  });

  it("never travels past 40px at an end", () => {
    expect(bandOffset(400, false, true)).toBe(SWIPE.endMaxPx);
    expect(bandOffset(-400, true, false)).toBe(-SWIPE.endMaxPx);
  });
});

describe("pageDecision (25% of the band, or a 0.5px/ms flick of at least 24px)", () => {
  const width = 390;

  it("pages a slow drag that crosses 25% of the band", () => {
    expect(pageDecision(-97.5, 0, width, true, true)).toBe("next");
    expect(pageDecision(97.5, 0, width, true, true)).toBe("prev");
  });

  it("returns a slow drag just short of 25%", () => {
    expect(pageDecision(-97, 0.1, width, true, true)).toBeNull();
  });

  it("pages a fast short drag", () => {
    expect(pageDecision(-24, -0.5, width, true, true)).toBe("next");
  });

  it("returns a fast drag under 24px, and a drag just under the flick speed", () => {
    expect(pageDecision(-23, -2, width, true, true)).toBeNull();
    expect(pageDecision(-40, -0.49, width, true, true)).toBeNull();
  });

  it("does not page a flick whose speed runs the other way", () => {
    expect(pageDecision(-40, 0.8, width, true, true)).toBeNull();
  });

  it("stops at both ends", () => {
    expect(pageDecision(-200, -1, width, true, false)).toBeNull();
    expect(pageDecision(200, 1, width, false, true)).toBeNull();
  });
});

describe("velocity", () => {
  it("reads the last 100ms, not the whole drag", () => {
    const samples = [
      { t: 0, x: 0, y: 0 },
      { t: 400, x: 10, y: 0 },
      { t: 450, x: 30, y: 0 },
      { t: 500, x: 60, y: 0 },
    ];
    expect(velocity(samples).vx).toBeCloseTo(50 / 100);
  });

  it("is zero for a single sample", () => {
    expect(velocity([{ t: 10, x: 5, y: 5 }])).toEqual({ vx: 0, vy: 0 });
  });
});

describe("the sheet's two snaps", () => {
  const teaserTop = 812 - SHEET.teaserHeight;

  it("never follows the finger past either snap", () => {
    expect(clampSheetTop(10, SHEET.fullTop, teaserTop)).toBe(SHEET.fullTop);
    expect(clampSheetTop(700, SHEET.fullTop, teaserTop)).toBe(teaserTop);
    expect(clampSheetTop(300, SHEET.fullTop, teaserTop)).toBe(300);
  });

  it("snaps a slow release to the nearer state", () => {
    const mid = (SHEET.fullTop + teaserTop) / 2;
    expect(sheetSnap(mid - 1, 0, SHEET.fullTop, teaserTop)).toBe("full");
    expect(sheetSnap(mid + 1, 0, SHEET.fullTop, teaserTop)).toBe("teaser");
  });

  it("follows a flick whichever snap is nearer", () => {
    expect(sheetSnap(teaserTop - 20, -0.5, SHEET.fullTop, teaserTop)).toBe("full");
    expect(sheetSnap(SHEET.fullTop + 20, 0.5, SHEET.fullTop, teaserTop)).toBe("teaser");
  });
});
