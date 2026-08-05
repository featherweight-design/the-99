import { describe, expect, it } from "vitest";
import { addPanelCopy, decksBuilderCopy, shortCommanderName } from "./decks-builder";

describe("shortCommanderName", () => {
  it("takes the name up to the first comma", () => {
    expect(shortCommanderName("Korvold, Fae-Cursed King")).toBe("Korvold");
  });

  it("leaves a comma-less name alone", () => {
    expect(shortCommanderName("Sisay")).toBe("Sisay");
  });
});

describe("addPanelCopy.builderEmpty", () => {
  it("reproduces the handoff's single builder-empty caption verbatim", () => {
    expect(addPanelCopy.builderEmpty.caption("Korvold")).toBe(
      "Ninety-nine slots, zero filled. Type a name below, or take the ninety-nine we’ve already picked out — Korvold eats everything anyway.",
    );
  });

  // Standing guard against the defect class Design found unprompted: a string
  // naming a construct that exists at only one width. "below" is deliberately
  // not on this list — the quick-add bar really is below the copy at both
  // widths. What is banned is naming a column, a panel or a sheet.
  it("names no layout construct that exists at only one width", () => {
    const caption = addPanelCopy.builderEmpty.caption("Korvold").toLowerCase();
    for (const phrase of ["on the right", "on the left", "column", "panel", "sheet", "tap away"]) {
      expect(caption).not.toContain(phrase);
    }
  });

  it("serves one caption to both widths", () => {
    expect(addPanelCopy.builderEmpty).not.toHaveProperty("captionFor");
    expect(addPanelCopy.builderEmpty).not.toHaveProperty("captionForMobile");
  });

  // The sheet this opened no longer exists; the Consider tab and the quick-add
  // bar are both live entrances on the same screen.
  it("carries no CTA", () => {
    expect(addPanelCopy.builderEmpty).not.toHaveProperty("cta");
  });
});

describe("decksBuilderCopy", () => {
  it("reproduces the mock's completion caption verbatim", () => {
    expect(decksBuilderCopy.completion.caption("Korvold")).toBe(
      "Korvold is fed — 99 of 99, all owned. Try not to let it get to your head at the table.",
    );
  });
});
