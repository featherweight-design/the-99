import { describe, expect, it } from "vitest";
import { ABOUT_SECTIONS } from "../../src/lib/copy/about-pages";
import { TOOLS } from "../../src/lib/discovery/tools";
import { ABOUT_REGIONS, TOOL_REGIONS, fromPage } from "./about-locators.mjs";

describe("the About pages' region map (ABOUT_REGIONS)", () => {
  const labels = ABOUT_SECTIONS.flatMap((s) => s.labels.map((l) => ({ section: s, label: l })));
  const WIDTHS = ["phone", "desktop"] as const;

  it("names every label region, and nothing else", () => {
    expect(Object.keys(ABOUT_REGIONS).sort()).toEqual(labels.map((x) => x.label.region).sort());
  });

  it("files each label at each width under a capture its own section lists for that width", () => {
    for (const { section, label } of labels) {
      const r = ABOUT_REGIONS[label.region];
      for (const w of WIDTHS) {
        const at = r[w];
        expect(at, `${label.region} ${w}`).not.toBeNull();
        expect(section.captures[w], `${label.region} ${w}`).toContain(at!.capture);
        expect(at!.locator.trim().length, `${label.region} ${w}`).toBeGreaterThan(0);
      }
    }
  });

  it("shoots no capture a section lists without one of its labels on it", () => {
    for (const s of ABOUT_SECTIONS) {
      for (const w of WIDTHS) {
        const held = new Set(s.labels.map((l) => ABOUT_REGIONS[l.region][w]?.capture));
        for (const c of s.captures[w]) expect(held, `${s.id} ${w} ${c}`).toContain(c);
      }
    }
  });

  it("names a phone capture p-… and a desktop capture d-…, never the other width's", () => {
    for (const [region, r] of Object.entries(ABOUT_REGIONS)) {
      expect(r.phone.capture, region).toMatch(/^p-/);
      expect(r.desktop?.capture, region).toMatch(/^d-/);
    }
  });

  it("resolves a header or rail locator from the page, and any other inside <main>", () => {
    expect(fromPage("header [data-help-button='header']:visible")).toBe(true);
    expect(fromPage("aside [data-help-button='rail']")).toBe(true);
    expect(fromPage("#panel-deck aside")).toBe(false);
    expect(fromPage("asides")).toBe(false);
    expect(fromPage("[data-feed-lead]")).toBe(false);
  });

  it("crops every tool's desktop card from a desktop capture the pages shoot", () => {
    const shot = new Set(ABOUT_SECTIONS.flatMap((s) => s.captures.desktop));
    expect(Object.keys(TOOL_REGIONS).sort()).toEqual(TOOLS.map((t) => t.id).sort());
    for (const [tool, t] of Object.entries(TOOL_REGIONS)) {
      expect(shot, tool).toContain(t.capture);
      expect(t.locator.trim().length, tool).toBeGreaterThan(0);
    }
  });
});
