import { describe, expect, it } from "vitest";
import { ABOUT_REGIONS, TOOL_REGIONS } from "./about-locators.mjs";
import { PAGE_FRAMES, PAGE_VIEWPORTS, samePixels, toolCrop, visibleRegion } from "./about-page-frames.mjs";

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

  it("keeps a tall control whole when the frame has the room", () => {
    const c = toolCrop({ x: 500, y: 200, width: 100, height: 500 }, view);
    expect(c.height).toBeGreaterThanOrEqual(548);
    expect(c.halo[1]).toBeGreaterThan(0);
    expect(c.halo[1] + c.halo[3]).toBeLessThan(1);
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
  it("tells a changed digit apart on a full phone capture", () => {
    const a = { width: 780, height: 1688, channels: 4, data: Buffer.alloc(780 * 1688 * 4, 100) };
    const b = { ...a, data: Buffer.from(a.data) };
    for (let i = 0; i < 150; i += 1) b.data[(1000 + i) * 4] = 230;
    expect(samePixels(a, b)).toBe(false);
  });
});

describe("visibleRegion: a sliver is not in frame", () => {
  const phone = { width: 390, height: 844 };
  const tabBar = { x: 0, y: 770, width: 390, height: 74 };
  it("passes a region wholly on the frame, its box the region's", () => {
    const r = visibleRegion({ x: 20, y: 100, width: 350, height: 120 }, phone, [tabBar]);
    expect(r.ok).toBe(true);
    expect(r.share).toBe(1);
    expect(r.box!.y).toBeCloseTo(100, 5);
    expect(r.box!.height).toBeCloseTo(120, 5);
  });
  it("fails a region whose most part sits behind the tab bar (p-deck-analysis-read's findings)", () => {
    const r = visibleRegion({ x: 16, y: 805, width: 358, height: 200 }, phone, [tabBar]);
    expect(r.ok).toBe(false);
  });
  it("fails a region on the frame but mostly covered by the tab bar", () => {
    const r = visibleRegion({ x: 16, y: 760, width: 358, height: 80 }, phone, [tabBar]);
    expect(r.ok).toBe(false);
    expect(r.share).toBeLessThan(0.2);
  });
  it("fails a region mostly below the frame's edge, though its top shows", () => {
    expect(visibleRegion({ x: 16, y: 700, width: 358, height: 300 }, phone, []).ok).toBe(false);
  });
  it("clips the box to what shows, and passes a region taller than the frame that fills much of it", () => {
    const tall = visibleRegion({ x: 16, y: 120, width: 358, height: 1400 }, phone, [tabBar]);
    expect(tall.ok).toBe(true);
    expect(tall.box!.y + tall.box!.height).toBeLessThanOrEqual(tabBar.y + 1400 / 20);
  });
  it("passes a region with only an edge under chrome", () => {
    expect(visibleRegion({ x: 16, y: 700, width: 358, height: 90 }, phone, [tabBar]).ok).toBe(true);
  });
  it("has nothing to show for a region off the frame or with no box", () => {
    expect(visibleRegion({ x: 0, y: 900, width: 100, height: 40 }, phone, []).box).toBeNull();
    expect(visibleRegion(null, phone, []).ok).toBe(false);
  });
});
