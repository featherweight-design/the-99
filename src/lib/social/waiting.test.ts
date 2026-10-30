// `/friends`' Waiting on you reads the feed's trade matches against the Friends badge's cursor, draws each with the
// friend's face and the pods their share reaches the reader through, and drops a row whose grant or card is gone. A
// spare request waiting on the reader's answer comes from `loadIncomingAsks`, not the feed, and leads the section.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  execute: vi.fn(),
  where: vi.fn(),
  grants: vi.fn(),
  feedQuery: vi.fn(),
  kinds: vi.fn(),
  asks: vi.fn(),
}));
vi.mock("./spare-requests", () => ({ loadIncomingAsks: m.asks }));
vi.mock("../../db", () => ({
  db: { execute: m.execute, select: () => ({ from: () => ({ where: m.where }) }) },
}));
vi.mock("./spares", () => ({ spareGrantDetailsQuery: m.grants }));
vi.mock("../feed/flag", () => ({ availableFeedKinds: m.kinds }));
vi.mock("../feed/read", async (actual) => ({ ...(await actual<typeof import("../feed/read")>()), feedQuery: m.feedQuery }));

import { loadWaitingOnYou } from "./waiting";

const NOW = new Date("2026-10-22T12:00:00Z");
const ENV = { SOME: "env" } as unknown as NodeJS.ProcessEnv;
const row = (key: string, oracle: string, friend: string, hoursAgo: number, unseen = true) => ({
  kind: "trade-match", key, created_at: new Date(NOW.getTime() - hoursAgo * 3_600_000).toISOString(),
  code: null, name: null, file_name: null, oracle_id: oracle, variant_id: null,
  friend_public_id: friend, friend_name: "stored name", data: {}, unseen,
});

beforeEach(() => {
  m.asks.mockReset().mockResolvedValue([]);
  m.kinds.mockReset().mockReturnValue(["new-set", "trade-match", "price-drop"]);
  m.feedQuery.mockReset().mockReturnValue("QUERY");
  m.execute.mockReset().mockResolvedValue({ rows: [row("item:1", "ghalta", "pub-colin", 5), row("item:2", "sol", "pub-gone", 2)] });
  m.grants.mockReset().mockResolvedValue([
    { userId: "user_colin", publicId: "pub-colin", displayName: "Colin", commanderOracleId: "sai", commanderName: "Sai", commanderArt: "https://art/sai.jpg", pods: ["Thursday pod"] },
  ]);
  m.where.mockReset().mockResolvedValue([
    { oracleId: "ghalta", name: "Ghalta, Primal Hunger", imageUri: "https://cards/ghalta.jpg" },
    { oracleId: "sol", name: "Sol Ring", imageUri: null },
  ]);
});

describe("loadWaitingOnYou", () => {
  it("reads only the trade matches, measured against the Friends badge's cursor", async () => {
    await loadWaitingOnYou("user_viewer", ENV, NOW);
    expect(m.kinds).toHaveBeenCalledWith(ENV);
    expect(m.feedQuery).toHaveBeenCalledWith("user_viewer", ["trade-match"], NOW, "friends_seen_at");
  });

  it("draws a match with its card, the friend's face and pods from the live grant, and drops one whose grant is gone", async () => {
    expect(await loadWaitingOnYou("user_viewer", ENV, NOW)).toEqual([{
      key: "item:1", kind: "trade-match", createdAt: new Date(NOW.getTime() - 5 * 3_600_000), unseen: true,
      card: { oracleId: "ghalta", name: "Ghalta, Primal Hunger", imageUri: "https://cards/ghalta.jpg" },
      friend: { publicId: "pub-colin", displayName: "Colin", commander: { oracleId: "sai", name: "Sai", artCropUri: "https://art/sai.jpg" } },
      pods: ["Thursday pod"],
      askable: false,
    }]);
  });

  it("marks a match askable only with friends on for the reader", async () => {
    const rows = await loadWaitingOnYou("user_viewer", { ...ENV, SOCIAL_FRIENDS_ENABLED: "true" }, NOW);
    expect(rows.map((r) => (r.kind === "trade-match" ? r.askable : null))).toEqual([true]);
  });

  it("reads nothing while the trade-match kind is off for the reader", async () => {
    m.kinds.mockReturnValue(["new-set"]);
    m.feedQuery.mockReturnValue(null);
    expect(await loadWaitingOnYou("user_viewer", ENV, NOW)).toEqual([]);
    expect(m.feedQuery).toHaveBeenCalledWith("user_viewer", [], NOW, "friends_seen_at");
    expect(m.execute).not.toHaveBeenCalled();
    expect(m.grants).not.toHaveBeenCalled();
  });

  it("reads no grant and no card when the feed holds no match", async () => {
    m.execute.mockResolvedValue({ rows: [] });
    expect(await loadWaitingOnYou("user_viewer", ENV, NOW)).toEqual([]);
    expect(m.grants).not.toHaveBeenCalled();
    expect(m.where).not.toHaveBeenCalled();
  });

  describe("spare requests (PR 3d)", () => {
    const ask = (id: string, hoursAgo: number) => ({
      id, oracleId: "lathliss", card: { name: "Lathliss, Dragon Queen", imageUri: null }, copies: 1, deckName: "Dragons of Tarkir",
      spare: 2, asker: { publicId: "pub-peter", displayName: "Peter", commander: null },
      createdAt: new Date(NOW.getTime() - hoursAgo * 3_600_000), daysLeft: 13,
    });

    it("reads the asks waiting on the reader with their own switches, whatever the feed offers", async () => {
      m.kinds.mockReturnValue([]);
      m.feedQuery.mockReturnValue(null);
      m.asks.mockResolvedValue([ask("req-1", 2)]);
      const rows = await loadWaitingOnYou("user_viewer", ENV, NOW);
      expect(m.asks).toHaveBeenCalledWith("user_viewer", ENV, NOW);
      expect(rows).toEqual([{ key: "req-1", kind: "spare-request", createdAt: ask("req-1", 2).createdAt, unseen: true, ask: ask("req-1", 2) }]);
    });

    it("puts every request ahead of a NEWER trade match, newest first within", async () => {
      m.asks.mockResolvedValue([ask("req-new", 6), ask("req-old", 30)]);
      // The trade match (item:1) is 5 hours old: newer than both asks, and still after them.
      const rows = await loadWaitingOnYou("user_viewer", ENV, NOW);
      expect(rows.map((r) => r.key)).toEqual(["req-new", "req-old", "item:1"]);
    });
  });
});
