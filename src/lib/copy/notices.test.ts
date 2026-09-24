import { describe, expect, it } from "vitest";

import { deckNoticesCopy as c } from "./notices";

describe("deck notices copy", () => {
  it("counts notices and cards in the singular and the plural", () => {
    expect([c.tag.spoken.unread(1), c.tag.spoken.unread(3)]).toEqual([
      "1 notice since this deck was analyzed",
      "3 notices since this deck was analyzed",
    ]);
    expect([c.tag.spoken.notLegal(1), c.tag.spoken.notLegal(2)]).toEqual([
      "1 card not legal in this deck",
      "2 cards not legal in this deck",
    ]);
  });

  it("is the handoff's sentence without the press", () => {
    expect(c.tag.spoken.unread(3)).toBe("3 notices since this deck was analyzed");
    expect(c.tag.notLegal).toBe("Not legal");
  });
});
