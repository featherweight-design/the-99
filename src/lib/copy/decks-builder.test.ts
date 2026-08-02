import { describe, expect, it } from "vitest";
import { decksBuilderCopy, shortCommanderName } from "./decks-builder";

describe("shortCommanderName", () => {
  it("takes the name up to the first comma", () => {
    expect(shortCommanderName("Korvold, Fae-Cursed King")).toBe("Korvold");
  });

  it("leaves a comma-less name alone", () => {
    expect(shortCommanderName("Sisay")).toBe("Sisay");
  });
});

describe("decksBuilderCopy", () => {
  it("reproduces the mock's builder-empty caption verbatim", () => {
    expect(decksBuilderCopy.builderEmpty.captionFor("Korvold")).toBe(
      "Ninety-nine slots, zero filled. Suggestions are primed on the right — Korvold eats everything anyway.",
    );
  });

  it("points at the sheet rather than the right column on mobile", () => {
    expect(decksBuilderCopy.builderEmpty.captionForMobile("Korvold")).toBe(
      "Ninety-nine slots, zero filled. Suggestions are one tap away — Korvold eats everything anyway.",
    );
  });

  it("reproduces the mock's completion caption verbatim", () => {
    expect(decksBuilderCopy.completion.caption("Korvold")).toBe(
      "Korvold is fed — 99 of 99, all owned. Try not to let it get to your head at the table.",
    );
  });
});
