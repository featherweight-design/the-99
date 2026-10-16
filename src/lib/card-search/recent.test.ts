// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { SIGNALS_LIMIT } from "./search";
import { clearRecent, pushRecent, readRecent, recentKey, RECENT_LIMIT, withRecent, type RecentCard } from "./recent";

const card = (n: number): RecentCard => ({ oracleId: `o-${n}`, name: `Card ${n}`, imageUri: null, flavorName: null });

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("recent cards", () => {
  it("keeps as many as one signals read answers", () => {
    expect(RECENT_LIMIT).toBe(SIGNALS_LIMIT);
  });

  it("puts the newest first, moves a repeat to the front and cuts at the limit", () => {
    let list: RecentCard[] = [];
    for (let i = 1; i <= RECENT_LIMIT + 2; i += 1) list = withRecent(list, card(i));
    expect(list).toHaveLength(RECENT_LIMIT);
    expect(list[0].oracleId).toBe(`o-${RECENT_LIMIT + 2}`);
    list = withRecent(list, card(5));
    expect(list[0].oracleId).toBe("o-5");
    expect(list.filter((c) => c.oracleId === "o-5")).toHaveLength(1);
  });

  it("stores only what draws the row, never the signals", () => {
    pushRecent("u1", { ...card(1), owned: 3 } as RecentCard);
    expect(JSON.parse(window.localStorage.getItem(recentKey("u1"))!)).toEqual([card(1)]);
  });

  it("is per reader, and Clear empties only the reader's own list", () => {
    pushRecent("u1", card(1));
    pushRecent("u2", card(2));
    clearRecent("u1");
    expect(readRecent("u1")).toEqual([]);
    expect(readRecent("u2")).toEqual([card(2)]);
  });

  it("reads a broken or foreign entry as empty, and drops entries that are not cards", () => {
    window.localStorage.setItem(recentKey("u1"), "{not json");
    expect(readRecent("u1")).toEqual([]);
    window.localStorage.setItem(recentKey("u1"), JSON.stringify([card(1), { oracleId: 7 }, null]));
    expect(readRecent("u1")).toEqual([card(1)]);
  });

  it("survives storage that throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readRecent("u1")).toEqual([]);
    expect(pushRecent("u1", card(1))).toEqual([card(1)]);
    expect(() => clearRecent("u1")).not.toThrow();
  });
});
