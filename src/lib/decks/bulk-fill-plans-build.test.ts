import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { topOffBuild } from "./bulk-fill-plans";

// Engine plan A4b: a top-off fills a deck the way it was built.
describe("topOffBuild", () => {
  it("hands the plan the deck's stored themes and join", () => {
    expect(topOffBuild({ answerThemes: ["Planeswalkers"], answerThemeJoin: "any" }))
      .toEqual({ build: { themes: ["Planeswalkers"], join: "any" } });
  });

  it("hands nothing for a deck that asked no theme", () => {
    expect(topOffBuild({ answerThemes: [], answerThemeJoin: "all" })).toEqual({});
  });
});
