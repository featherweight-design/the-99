import { describe, expect, it } from "vitest";

import {
  MIN_SHELF_CSS,
  SHEET,
  bandOffset,
  clampSheetTop,
  lockAxis,
  pageDecision,
  safeInsetBottom,
  sheetSnap,
  startsAtSystemEdge,
  velocity,
} from "./card-sheet-gesture";

// Each boundary is asserted from both sides, in LITERALS: a test that reads the constant it is
// testing cannot see that constant drift.
describe("lockAxis (R1 lock: 10px, then 1.5x)", () => {
  it("chooses nothing inside the lock distance", () => {
    expect(lockAxis(6, 7)).toBeNull();
    expect(lockAxis(9.9, 0)).toBeNull();
  });

  it("locks at exactly the lock distance", () => {
    expect(lockAxis(10, 0)).toBe("x");
    expect(lockAxis(0, -10)).toBe("y");
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
    expect(bandOffset(400, false, true)).toBe(40);
    expect(bandOffset(-400, true, false)).toBe(-40);
    // Just under the cap, the 0.3x still governs.
    expect(bandOffset(133, false, true)).toBeCloseTo(39.9);
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

  it("leaves out a sample just older than 100ms", () => {
    const samples = [
      { t: 0, x: 0, y: 0 },
      { t: 399, x: 0, y: 0 },
      { t: 500, x: 50, y: 0 },
    ];
    // The window opens at t 400, so the t 399 sample is out and the last sample stands alone.
    expect(velocity(samples)).toEqual({ vx: 0, vy: 0 });
  });

  it("is zero for a single sample", () => {
    expect(velocity([{ t: 10, x: 5, y: 5 }])).toEqual({ vx: 0, vy: 0 });
  });
});

describe("the sheet's two snaps", () => {
  it("are y 64 and a 280px teaser", () => {
    expect(SHEET.fullTop).toBe(64);
    expect(SHEET.teaserHeight).toBe(280);
  });

  const teaserTop = 812 - 280;

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
    expect(sheetSnap(teaserTop - 20, -0.5, 64, teaserTop)).toBe("full");
    expect(sheetSnap(64 + 20, 0.5, 64, teaserTop)).toBe("teaser");
  });

  it("does not count a release just under the flick speed as a flick", () => {
    expect(sheetSnap(teaserTop - 20, -0.49, 64, teaserTop)).toBe("teaser");
    expect(sheetSnap(64 + 20, 0.49, 64, teaserTop)).toBe("full");
  });
});

// The min snap (Hugh, 2026-10-13): below the teaser, the shelf at its title row alone.
describe("the sheet's min snap", () => {
  const height = 844;
  const teaserTop = height - SHEET.teaserHeight;
  const minTop = height - SHEET.minHeight;

  it("is the title row and its grip, 72 tall", () => {
    expect(SHEET.minHeight).toBe(72);
  });

  it("lets the finger take the sheet down to it, and no further", () => {
    expect(clampSheetTop(820, SHEET.fullTop, minTop)).toBe(minTop);
    expect(clampSheetTop(700, SHEET.fullTop, minTop)).toBe(700);
  });

  it("settles a slow release on the nearest of the three", () => {
    const lower = (teaserTop + minTop) / 2;
    expect(sheetSnap(lower + 1, 0, SHEET.fullTop, teaserTop, minTop)).toBe("min");
    expect(sheetSnap(lower - 1, 0, SHEET.fullTop, teaserTop, minTop)).toBe("teaser");
    expect(sheetSnap(SHEET.fullTop + 10, 0, SHEET.fullTop, teaserTop, minTop)).toBe("full");
  });

  // A flick moves one snap from where the sheet was let go, never two.
  it("flicks down from the teaser to min, and up from min to the teaser", () => {
    expect(sheetSnap(teaserTop + 20, 0.5, SHEET.fullTop, teaserTop, minTop)).toBe("min");
    expect(sheetSnap(minTop - 20, -0.5, SHEET.fullTop, teaserTop, minTop)).toBe("teaser");
  });

  // The mirror of full stopping at the teaser: a drag from min reaches the teaser at most, however
  // hard or far it is flicked up (pre-open pass: at 844 tall a 220px flick passed the teaser to full).
  it("flicks up from min to the teaser, never past it to full", () => {
    expect(sheetSnap(teaserTop - 12, -0.9, SHEET.fullTop, teaserTop, minTop, true)).toBe("teaser");
    expect(sheetSnap(SHEET.fullTop + 10, 0, SHEET.fullTop, teaserTop, minTop, true)).toBe("teaser");
  });

  it("flicks down from full to the teaser, not past it", () => {
    expect(sheetSnap(SHEET.fullTop + 20, 0.5, SHEET.fullTop, teaserTop, minTop)).toBe("teaser");
  });

  it("is two snaps, as shipped, where there is no min to reach", () => {
    expect(sheetSnap(teaserTop + 20, 0.5, SHEET.fullTop, teaserTop)).toBe("teaser");
    expect(sheetSnap(teaserTop - 20, -0.5, SHEET.fullTop, teaserTop)).toBe("full");
  });
});

describe("the min shelf's safe-area inset", () => {
  it("is the 72px shelf plus the bottom inset, 0 where there is none", () => {
    expect(MIN_SHELF_CSS).toBe("(72px + env(safe-area-inset-bottom, 0px))");
  });

  it("measures 0 where the platform reports no inset", () => {
    expect(safeInsetBottom()).toBe(0);
  });

  it("measures the padding the browser resolves from env()", () => {
    const real = window.getComputedStyle;
    window.getComputedStyle = (() => ({ paddingBottom: "34px" }) as CSSStyleDeclaration) as typeof window.getComputedStyle;
    try {
      expect(safeInsetBottom()).toBe(34);
    } finally {
      window.getComputedStyle = real;
    }
  });
});
