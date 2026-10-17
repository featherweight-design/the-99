import { describe, expect, it } from "vitest";
import { aboutEntries } from "../../src/lib/copy/about-entries";
import { REQUIRED_SHOTS } from "../../src/lib/about/shots";
import { ABOUT_LOCATORS } from "./about-locators.mjs";

const frameOf = (e: (typeof aboutEntries)[number]) => (e.screen === "deck" ? `deck-${e.view}` : e.screen);

describe("the About locator map", () => {
  it("names every About entry, and nothing else", () => {
    expect(Object.keys(ABOUT_LOCATORS).sort()).toEqual(aboutEntries.map((e) => e.id).sort());
  });

  it("files each entry under its own screen's frame, a frame the set captures", () => {
    for (const e of aboutEntries) {
      const l = ABOUT_LOCATORS[e.id];
      expect(l.screen, e.id).toBe(frameOf(e));
      expect(REQUIRED_SHOTS, e.id).toContain(l.screen);
      expect(l.locator.trim().length, e.id).toBeGreaterThan(0);
    }
  });
});
