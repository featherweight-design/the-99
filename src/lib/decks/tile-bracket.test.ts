import { describe, expect, it } from "vitest";

import { tileBracket } from "./read";

describe("tileBracket", () => {
  it("draws nothing for an unread deck", () => {
    expect(tileBracket(null, null)).toBeNull();
  });

  // The column's check admits shapes no writer produces; the tile fails closed on them rather
  // than handing `verdictHead` a range it throws on.
  it("draws nothing for a stored range no writer produces", () => {
    expect(tileBracket([1, 3], null)).toBeNull();
    expect(tileBracket([5, 4], null)).toBeNull();
  });

  it("carries a declaration only when it answers the range", () => {
    expect(tileBracket([1, 2], 2)).toEqual({ permits: [1, 2], answered: 2 });
    expect(tileBracket([3], 3)).toEqual({ permits: [3], answered: null });
  });
});
