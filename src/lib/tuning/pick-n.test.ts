import { describe, expect, it } from "vitest";

import { pickState } from "./pick-n";

describe("pickState", () => {
  const six = (chosen: number, answered = chosen) => pickState({ named: 6, needed: 3, chosen, answered });

  it("is exact when the run named no more than the deck needed", () => {
    expect(pickState({ named: 3, needed: 3, chosen: 0, answered: 0 }).phase).toBe("exact");
    expect(pickState({ named: 2, needed: 3, chosen: 1, answered: 1 }).phase).toBe("exact");
    expect(pickState({ named: 15, needed: 15, chosen: 0, answered: 0 }).phase).toBe("exact");
  });

  it("is open with six named for three and nothing answered", () => {
    expect(six(0)).toEqual({ phase: "open", named: 6, needed: 3, chosen: 0, answered: 0, open: 6, others: 6, past: 0 });
  });

  it("is choosing while fewer are cut than needed, a keep included", () => {
    expect(six(0, 1).phase).toBe("choosing");
    expect(six(2).phase).toBe("choosing");
  });

  it("is enough at exactly three cut, and the other three stay", () => {
    expect(six(3)).toMatchObject({ phase: "enough", others: 3, open: 3, past: 0 });
    expect(six(3, 5)).toMatchObject({ phase: "enough", others: 3, open: 1 });
  });

  it("is past once a fourth is cut, and says by how many", () => {
    expect(six(4)).toMatchObject({ phase: "past", past: 1, others: 2 });
    expect(six(6)).toMatchObject({ phase: "past", past: 3, others: 0, open: 0 });
  });

  it("never counts more chosen or answered than were named", () => {
    expect(pickState({ named: 4, needed: 1, chosen: 9, answered: 9 })).toMatchObject({ chosen: 4, answered: 4, open: 0 });
  });
});
