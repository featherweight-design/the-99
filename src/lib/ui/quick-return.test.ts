// Quick return's rules (card search handoff call 3): away past the header, back on 12px up, away again on 8px down,
// frozen under a sheet, held away while a field has focus, and blind to the app's own scrolls.
import { describe, expect, it } from "vitest";
import { headerOffset, INITIAL, quickReturnStep, type QuickReturnInput, type QuickReturnState } from "./quick-return";

const H = 79;
const run = (ys: number[], over: Partial<QuickReturnInput> = {}, from: QuickReturnState = INITIAL) =>
  ys.reduce((s, y) => quickReturnStep(s, { y, height: H, locked: false, fieldFocus: false, programmatic: false, ...over }), from);

describe("quickReturnStep", () => {
  it("sits in the page at the top and while the scroll is within its height", () => {
    expect(run([10, 40, 79]).mode).toBe("page");
  });

  it("is away once scrolled past it", () => {
    expect(run([40, 80]).mode).toBe("away");
  });

  it("comes back after 12px up from the lowest point, and not after 11", () => {
    expect(run([400, 600, 589]).mode).toBe("away");
    expect(run([400, 600, 588]).mode).toBe("shown");
  });

  it("measures the 12px from the lowest point, not from where the scroll last turned", () => {
    expect(run([400, 600, 595, 598, 588]).mode).toBe("shown");
  });

  it("goes away again after 8px down from the highest point while back, and not after 7", () => {
    const back = run([400, 600, 580]);
    expect(run([570, 577], {}, back).mode).toBe("shown");
    expect(run([570, 578], {}, back).mode).toBe("away");
  });

  it("stays back as the reader scrolls up into the top, and is in the page at 0", () => {
    const back = run([400, 600, 580]);
    expect(run([300, 50], {}, back).mode).toBe("shown");
    expect(run([300, 0], {}, back).mode).toBe("page");
  });

  it("returns to the page when scrolled back within its height while away", () => {
    expect(run([90, 85, 70]).mode).toBe("page");
  });

  it("reads an iOS rubber band below the top as the top", () => {
    expect(run([400, -20]).mode).toBe("page");
  });

  it("moves nothing while a scroll lock is held", () => {
    const away = run([400, 600]);
    expect(run([100], { locked: true }, away)).toEqual(away);
  });

  it("does not come back while a page field has focus, and a returned header goes", () => {
    expect(run([400, 600, 500], { fieldFocus: true }).mode).toBe("away");
    const back = run([400, 600, 580]);
    expect(run([581], { fieldFocus: true }, back).mode).toBe("away");
  });

  it("does not take the app's own scroll as the reader's, either way", () => {
    expect(run([400, 600, 300], { programmatic: false }).mode).toBe("shown");
    const away = run([400, 600]);
    expect(run([300], { programmatic: true }, away).mode).toBe("away");
    const back = run([400, 600, 580]);
    expect(run([900], { programmatic: true }, back).mode).toBe("shown");
  });

  it("measures travel from where the app's scroll left the page", () => {
    const moved = run([300], { programmatic: true }, run([400, 600]));
    expect(run([290], {}, moved).mode).toBe("away");
    expect(run([288], {}, moved).mode).toBe("shown");
  });

  it("an app scroll that lands within the header's height puts it in the page, never away over its empty room", () => {
    expect(run([40], { programmatic: true }, run([400, 600])).mode).toBe("page");
    expect(run([40], { programmatic: true }, run([400, 600, 580])).mode).toBe("shown");
  });

  it("a long downward app scroll from the page past the header lands away, not back", () => {
    expect(run([2000], { programmatic: true }).mode).toBe("away");
  });
});

describe("headerOffset", () => {
  it("is the header's height only while it is back over the page", () => {
    expect(headerOffset("shown", H)).toBe(H);
    expect(headerOffset("away", H)).toBe(0);
    expect(headerOffset("page", H)).toBe(0);
  });
});
