import { describe, expect, it } from "vitest";
import { ABOUT_REGIONS, TOOL_REGIONS } from "./about-locators.mjs";
import { PAGE_FRAMES, PAGE_VIEWPORTS, samePixels, toolCrop } from "./about-page-frames.mjs";

describe("the About pages' frames", () => {
  const named = new Map<string, "phone" | "desktop">();
  for (const r of Object.values(ABOUT_REGIONS)) {
    named.set(r.phone.capture, "phone");
    if (r.desktop) named.set(r.desktop.capture, "desktop");
  }
  for (const t of Object.values(TOOL_REGIONS)) named.set(t.capture, "desktop");

  it("frames every capture a region or a tool crop names, at that capture's width, and nothing else", () => {
    expect(Object.keys(PAGE_FRAMES).sort()).toEqual([...named.keys()].sort());
    for (const [capture, width] of named) expect(PAGE_FRAMES[capture].width, capture).toBe(width);
  });

  it("reaches every frame by a route or a fixture deck's view", () => {
    const views = ["your-deck", "shopping", "stats", "notes", "analysis", "games", "versions"];
    for (const [capture, f] of Object.entries(PAGE_FRAMES)) {
      expect(Boolean(f.path) !== Boolean(f.deck), capture).toBe(true);
      if (f.deck) {
        expect(["played", "fresh"], capture).toContain(f.deck);
        expect(views, capture).toContain(f.view);
      }
    }
  });

  it("takes Home without the feed exactly for the Home section's captures (Ready to build is the feed-off Home)", () => {
    const home = new Set(
      Object.entries(ABOUT_REGIONS)
        .filter(([region]) => region.startsWith("home/home/"))
        .flatMap(([, r]) => [r.phone.capture, r.desktop!.capture]),
    );
    const off = Object.entries(PAGE_FRAMES).filter(([, f]) => f.feed === "off").map(([c]) => c);
    expect(off.sort()).toEqual([...home].sort());
  });
});

describe("toolCrop", () => {
  const view = PAGE_VIEWPORTS.desktop;
  it("cuts a 3:2 crop inside the frame, and maps the control into it", () => {
    for (const rect of [
      { x: 10, y: 10, width: 60, height: 30 },
      { x: 1200, y: 860, width: 90, height: 30 },
      { x: 400, y: 300, width: 1200, height: 100 },
      { x: 500, y: 400, width: 100, height: 40 },
    ]) {
      const c = toolCrop(rect, view);
      expect(c.left).toBeGreaterThanOrEqual(0);
      expect(c.top).toBeGreaterThanOrEqual(0);
      expect(c.left + c.width).toBeLessThanOrEqual(view.width);
      expect(c.top + c.height).toBeLessThanOrEqual(view.height);
      expect(Math.abs(c.height - (c.width * 2) / 3)).toBeLessThanOrEqual(1);
      const [x, y, w, h] = c.halo;
      for (const n of [x, y, x + w, y + h]) expect(n >= 0 && n <= 1).toBe(true);
      // The control's left edge lands where the halo says, when the crop holds it.
      if (rect.x >= c.left) expect(c.left + x * c.width).toBeCloseTo(rect.x, 5);
    }
  });

  it("centres a small control", () => {
    const c = toolCrop({ x: 500, y: 400, width: 100, height: 40 }, view);
    expect(c.width).toBe(650);
    expect(c.halo[0] + c.halo[2] / 2).toBeCloseTo(0.5, 2);
    expect(c.halo[1] + c.halo[3] / 2).toBeCloseTo(0.5, 2);
  });
});

describe("samePixels: an unchanged screen is not written again", () => {
  const img = (fill: number, n = 100, ch = 4) => ({ width: n, height: 1, channels: ch, data: Buffer.alloc(n * ch, fill) });
  it("holds identical pictures and noise within the tolerance the same", () => {
    expect(samePixels(img(100), img(100))).toBe(true);
    expect(samePixels(img(100), img(105))).toBe(true);
  });
  it("tells a changed pixel, a changed size and a missing file apart from the same picture", () => {
    const b = img(100);
    b.data[8] = 200;
    expect(samePixels(img(100), b)).toBe(false);
    expect(samePixels(img(100), img(100, 99))).toBe(false);
    expect(samePixels(null, img(100))).toBe(false);
  });
});
