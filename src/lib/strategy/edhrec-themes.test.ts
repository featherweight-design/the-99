import { describe, expect, it } from "vitest";
import { focusThemeSlugs } from "./edhrec-themes";

describe("focusThemeSlugs", () => {
  it("names a theme's EDHREC slugs, a creature type's plural, and nothing for no focus", () => {
    expect(focusThemeSlugs("counters")).toEqual(["plus-1-plus-1-counters", "counters"]);
    expect(focusThemeSlugs("typal:Dragon")).toEqual(["dragons"]);
    expect(focusThemeSlugs(null)).toEqual([]);
  });

  it("names the slugs of the type-line and keyword strategies, and the mapped themes", () => {
    expect(focusThemeSlugs("planeswalkers")).toEqual(["planeswalkers"]);
    expect(focusThemeSlugs("proliferate")).toEqual(["proliferate"]);
    expect(focusThemeSlugs("sagas")).toEqual(["sagas"]);
    expect(focusThemeSlugs("evasion")).toEqual(["flying", "unblockable"]);
  });

  it("keeps the commander page for a focus EDHREC has no theme for", () => {
    expect(focusThemeSlugs("protection")).toEqual([]);
  });
});
