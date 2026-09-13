import { describe, expect, it } from "vitest";
import { readBuilderView } from "./builder-view";

describe("readBuilderView", () => {
  it("takes the tab a URL names", () => {
    expect(readBuilderView("consider")).toBe("consider");
    expect(readBuilderView("games")).toBe("games");
    expect(readBuilderView("deck")).toBe("deck");
  });

  // The parameter is reader-supplied: an absent, repeated or invented value has
  // to land on the deck rather than on a tab that does not exist.
  it("falls back to the deck for anything it does not recognise", () => {
    expect(readBuilderView(undefined)).toBe("deck");
    expect(readBuilderView("shopping")).toBe("deck");
    expect(readBuilderView("")).toBe("deck");
    expect(readBuilderView(["consider", "games"])).toBe("deck");
  });
});
