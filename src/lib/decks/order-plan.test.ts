import { describe, expect, it } from "vitest";
import { planReorder, type OrderRow } from "./order-plan";

const row = (id: string, folderId: string | null, sortPosition: number | null, day = 1): OrderRow => ({
  id,
  folderId,
  sortPosition,
  createdAt: new Date(2026, 0, day),
});
const ids = (plan: ReturnType<typeof planReorder>) => plan?.map((p) => p.id);

describe("planReorder", () => {
  // Current Custom order: a, b, c, d, e.
  const rows = [row("a", "F", 0), row("b", null, 1), row("c", "F", 2), row("d", null, 3), row("e", "F", 4)];

  it("numbers the whole set 0..n-1 in the order given", () => {
    const plan = planReorder(rows, ["e", "d", "c", "b", "a"]);
    expect(plan).toEqual([
      { id: "e", position: 0 },
      { id: "d", position: 1 },
      { id: "c", position: 2 },
      { id: "b", position: 3 },
      { id: "a", position: 4 },
    ]);
  });

  it("permutes one folder's decks among their own slots and leaves the rest in place (C8)", () => {
    // F holds slots 0, 2, 4. Reverse them; b and d stay at 1 and 3.
    const plan = planReorder(rows, ["e", "c", "a"]);
    expect(ids(plan)).toEqual(["e", "b", "c", "d", "a"]);
    expect(plan?.map((p) => p.position)).toEqual([0, 1, 2, 3, 4]);
  });

  it("works on the unfiled shelf", () => {
    expect(ids(planReorder(rows, ["d", "b"]))).toEqual(["a", "d", "c", "b", "e"]);
  });

  it("materializes unarranged decks in the order the player sees (nulls first, newest first)", () => {
    const fresh = [row("old", null, null, 1), row("new", null, null, 5), row("n1", null, 0, 3)];
    // Seen as: new, old, n1. Moving n1 to the top of the whole set:
    expect(ids(planReorder(fresh, ["n1", "new", "old"]))).toEqual(["n1", "new", "old"]);
    // A shelf-wide permutation of the unfiled decks reads slots from that seen order.
    const inFolder = [row("old", "F", null, 1), row("new", "F", null, 5), row("x", null, 0, 3)];
    expect(ids(planReorder(inFolder, ["old", "new"]))).toEqual(["old", "new", "x"]);
  });

  it("refuses a list mixing shelves even when its length matches the first id's shelf", () => {
    // Two in folder G and two unfiled: [g1, u1] is two long, as G is, but u1 is not G's.
    const mixed = [row("g1", "G", 0), row("u1", null, 1), row("g2", "G", 2), row("u2", null, 3)];
    expect(planReorder(mixed, ["g1", "u1"])).toBeNull();
    expect(planReorder(mixed, ["g2", "g1"])).not.toBeNull();
  });

  it("refuses a partial shelf, an id that is not the caller's, a duplicate, and an empty list", () => {
    expect(planReorder(rows, ["a", "c"])).toBeNull();
    expect(planReorder(rows, ["a", "c", "e", "zzz"])).toBeNull();
    expect(planReorder(rows, ["a", "a", "c"])).toBeNull();
    expect(planReorder(rows, ["b", "a"])).toBeNull();
    expect(planReorder(rows, [])).toBeNull();
  });
});
