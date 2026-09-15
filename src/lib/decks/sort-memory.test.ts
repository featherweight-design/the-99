import { describe, expect, it } from "vitest";
import {
  DECK_SORT_STORAGE_KEY,
  DEFAULT_DECK_SORT,
  isStoredDeckSort,
  parseDeckSort,
  serialiseDeckSort,
  withLaneOrder,
} from "./sort-memory";

// The wire format `useStoredView` holds. Its own tests cover the store; none of
// them know this shape, and `Decklist` leans on the round trip to reject a
// value that no longer parses while keeping both lanes' orders apart.
describe("the stored shape", () => {
  it("writes both lanes in one value", () => {
    expect(serialiseDeckSort(DEFAULT_DECK_SORT)).toBe("all:name:asc|shopping:price:desc");
  });

  it("reads back exactly what it wrote", () => {
    const memory = {
      all: { key: "mana", direction: "desc" },
      shopping: { key: "name", direction: "asc" },
    } as const;
    expect(parseDeckSort(serialiseDeckSort(memory))).toEqual(memory);
  });

  it("keeps one key, and it is the one the hook uses", () => {
    expect(DECK_SORT_STORAGE_KEY).toBe("the99:deck-sort");
  });
});

describe("what it refuses", () => {
  it("falls back to the defaults on an absent value", () => {
    expect(parseDeckSort(null)).toEqual(DEFAULT_DECK_SORT);
  });

  // `price` is not a question on `All` — it is absent from that lane's panel,
  // so a stored value naming it would select a row the reader cannot see.
  it("refuses a key the lane does not offer", () => {
    expect(parseDeckSort("all:price:desc|shopping:price:desc").all)
      .toEqual({ key: "name", direction: "asc" });
    expect(isStoredDeckSort("all:price:desc|shopping:price:desc")).toBe(false);
  });

  it("refuses a lane that does not exist and a direction that is not one", () => {
    expect(isStoredDeckSort("sideboard:name:asc|shopping:price:desc")).toBe(false);
    expect(isStoredDeckSort("all:name:sideways|shopping:price:desc")).toBe(false);
  });

  // A half-written value reads as absence rather than as half a preference: the
  // guard rejects anything the parse does not reproduce, so the caller's
  // defaults stand for BOTH lanes rather than one lane silently resetting.
  it("treats a missing lane as absence", () => {
    expect(isStoredDeckSort("all:mana:desc")).toBe(false);
    expect(parseDeckSort("all:mana:desc")).toEqual({
      all: { key: "mana", direction: "desc" },
      shopping: DEFAULT_DECK_SORT.shopping,
    });
  });

  it("takes the last word when a lane is written twice", () => {
    expect(parseDeckSort("all:name:asc|all:mana:desc|shopping:price:desc").all)
      .toEqual({ key: "mana", direction: "desc" });
  });

  // EVERY combination, generated rather than listed: a hand-written list leaves
  // out the ones nobody thought of, and `nextDeckSortState` can produce all of
  // them — every key reverses, including the two the first version of this test
  // omitted (`shopping:name:desc` and `shopping:mana:asc`).
  it("accepts every canonical value it can produce", () => {
    const lane = (keys: readonly string[]) =>
      keys.flatMap((key) => ["asc", "desc"].map((d) => `${key}:${d}`));
    const allOrders = lane(["name", "mana"]);
    const shoppingOrders = lane(["name", "price", "mana"]);
    expect(allOrders).toHaveLength(4);
    expect(shoppingOrders).toHaveLength(6);

    for (const all of allOrders) {
      for (const shopping of shoppingOrders) {
        expect(isStoredDeckSort(`all:${all}|shopping:${shopping}`)).toBe(true);
      }
    }
  });
});

// The point of holding both lanes in one value: changing the order of one list
// must not disturb the other, because they answer different questions.
describe("changing one lane", () => {
  it("leaves the other lane's order alone", () => {
    const memory = parseDeckSort("all:name:asc|shopping:price:desc");
    const next = serialiseDeckSort({ ...memory, all: { key: "mana", direction: "asc" } });
    expect(next).toBe("all:mana:asc|shopping:price:desc");
    expect(parseDeckSort(next).shopping).toEqual({ key: "price", direction: "desc" });
  });
});

// The one write path. It had three lives inside `Decklist` and drew a finding
// in each; the cases below are those findings, plus the ones they implied.
describe("withLaneOrder", () => {
  it("changes the named lane and leaves the other exactly as stored", () => {
    expect(withLaneOrder("all:name:asc|shopping:price:desc", "all", { key: "mana", direction: "desc" }))
      .toBe("all:mana:desc|shopping:price:desc");
    expect(withLaneOrder("all:mana:desc|shopping:price:desc", "shopping", { key: "name", direction: "asc" }))
      .toBe("all:mana:desc|shopping:name:asc");
  });

  it("starts from the defaults when nothing is stored", () => {
    expect(withLaneOrder(null, "shopping", { key: "mana", direction: "asc" }))
      .toBe("all:name:asc|shopping:mana:asc");
  });

  // A half-damaged value reads as ABSENCE on screen — the hook rejects it, so
  // both lanes show their defaults. Merging into its parse would resurrect an
  // All preference the reader cannot see and was never offered.
  it("does not resurrect a lane from a value the guard rejects", () => {
    expect(isStoredDeckSort("all:mana:desc")).toBe(false);
    expect(withLaneOrder("all:mana:desc", "shopping", { key: "name", direction: "asc" }))
      .toBe("all:name:asc|shopping:name:asc");
  });

  it("refuses a key the target lane does not offer, by never storing one", () => {
    // `price` under All is not reachable through the panel; if it ever were, the
    // value written would still have to survive its own guard.
    const written = withLaneOrder(null, "all", { key: "name", direction: "desc" });
    expect(isStoredDeckSort(written)).toBe(true);
  });
});
