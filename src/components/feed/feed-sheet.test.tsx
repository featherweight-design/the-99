import { describe, expect, it } from "vitest";
import { kindCounts, sheetGroups } from "./feed-sheet";
import type { FeedView } from "../../lib/feed/home";

const NOW = "2026-10-22T12:00:00.000Z";
const at = (hoursAgo: number) => new Date(Date.parse(NOW) - hoursAgo * 3_600_000).toISOString();
const view = (key: string, hoursAgo: number, kind: FeedView["kind"] = "new-set"): FeedView => ({
  key, kind, at: at(hoursAgo), unseen: false, card: null, friend: null, href: null, opens: null, outbound: null, name: key,
  setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false,
});

describe("sheetGroups", () => {
  it("splits at 24 hours and seven days, keeping feed order", () => {
    const g = sheetGroups([view("a", 1), view("b", 23), view("c", 24), view("d", 24 * 7 - 1), view("e", 24 * 7), view("f", 24 * 30)], NOW);
    expect(g.today.map((i) => i.key)).toEqual(["a", "b"]);
    expect(g.week.map((i) => i.key)).toEqual(["c", "d"]);
    expect(g.earlier.map((i) => i.key)).toEqual(["e", "f"]);
  });
});

describe("kindCounts", () => {
  it("lists only kinds present, with counts", () => {
    const k = kindCounts([view("a", 1), view("b", 2), view("c", 3, "price-drop")]);
    expect(k.map((x) => [x.kind, x.n]).sort()).toEqual([["new-set", 2], ["price-drop", 1]]);
  });
});
