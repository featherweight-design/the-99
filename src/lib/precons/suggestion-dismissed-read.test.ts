import { describe, expect, it, vi } from "vitest";

const rows = vi.hoisted(() => ({ current: [] as { dismissed: string[] }[] }));
vi.mock("../../db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: () => Promise.resolve(rows.current) }) }) }) },
}));
import { dropDismissed, readDismissedSuggestions, suggestionDismissKey } from "./suggestion-dismissed";

describe("a saved dismissal on a fresh read", () => {
  const D1 = "7d0a1c1e-4d1a-4b9a-8d3c-2f7a5a9e1b11";
  const D2 = "8e1b2d2f-5e2b-4cab-9e4d-3a8b6baf2c22";
  const matches = [{ fileName: "A" }, { fileName: "B" }];

  it("suppresses the closed precon on that deck only, and no other precon", async () => {
    rows.current = [{ dismissed: [suggestionDismissKey(D1, "A"), suggestionDismissKey(D2, "B")] }];
    const closed = await readDismissedSuggestions("user_1", D1);
    expect([...closed]).toEqual(["A"]);
    expect(dropDismissed(matches, closed).map((m) => m.fileName)).toEqual(["B"]);
    // The same precon on another deck stays offered where it was not closed.
    const other = await readDismissedSuggestions("user_1", D2);
    expect(dropDismissed(matches, other).map((m) => m.fileName)).toEqual(["A"]);
  });

  it("finds it whichever case the deck's URL spells the id in", async () => {
    rows.current = [{ dismissed: [suggestionDismissKey(D1, "A")] }];
    const closed = await readDismissedSuggestions("user_1", D1.toUpperCase());
    expect(dropDismissed(matches, closed).map((m) => m.fileName)).toEqual(["B"]);
  });

  it("reads no row as nothing closed", async () => {
    rows.current = [];
    expect(dropDismissed(matches, await readDismissedSuggestions("user_1", D1))).toEqual(matches);
  });
});
