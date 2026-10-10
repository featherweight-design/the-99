import { describe, expect, it } from "vitest";
import { collectionEditCopy as c } from "./collection-edit";

describe("a count of cards agrees in number", () => {
  it("never reads `1 cards`", () => {
    expect(c.upload.after(0, 1)).toBe("0 → 1 card");
    expect(c.upload.after(4492, 4380)).toBe("4,492 → 4,380 cards");
    expect(c.add.countsAfter(1, 1)).toBe("1 → 1 card");
    expect(c.add.countsAfter(2, 3)).toBe("2 → 3 cards");
    expect(c.upload.barAdd(1, 0, 1)).toContain("Your 1 card stays.");
    expect(c.upload.barAdd(2, 1, 5)).toContain("skipping 1 row.");
    expect(c.upload.barAdd(2, 3, 5)).toContain("skipping 3 rows.");
    expect(c.upload.barAdd(2, 0, 5)).toContain("Your 5 cards stay.");
  });
});
