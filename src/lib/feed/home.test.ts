import { describe, expect, it, vi, beforeEach } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const marks = vi.hoisted(() => ({ seen: vi.fn(), notice: vi.fn() }));
vi.mock("../../db", () => ({ db: {} }));
vi.mock("./prefs", async (importOriginal) => ({ ...(await importOriginal<typeof import("./prefs")>()), markFeedSeen: marks.seen }));
vi.mock("../social/trade-match", () => ({ noticeTradeMatches: marks.notice }));
// The reader owns Sai in another printing: the row draws the chain's picture, the one card details opens.
vi.mock("../cards/chain-art", () => ({ chainArt: async () => new Map([["c1", "sai-owned.jpg"]]) }));

import { comboPieces, feedCardsQuery, homeFeedAfter, loadHomeFeed, preconCommandersQuery, preconOwnedQuery, setCardsQuery, splitLead, toViews, type FeedView } from "./home";
import type { FeedItem } from "./read";

const ON = { HOME_FEED_ENABLED: "true", PRECONS_ENABLED: "true", SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const NOW = new Date("2026-10-22T12:00:00Z");
const text = (q: SQL) => new PgDialect().sqlToQuery(q).sql;

/** An executor that refuses every call: proves a path reads nothing. */
const refusing = {
  execute: () => {
    throw new Error("read");
  },
  select: () => {
    throw new Error("read");
  },
} as never;

/** An executor answering the prefs read with `kinds` and each execute by the table its statement reads. */
function fake(kinds: Record<string, string>, rows: { feed?: unknown[]; sets?: unknown[]; cards?: unknown[] }) {
  return {
    select: () => ({ from: () => ({ where: async () => [{ feedKinds: kinds }] }) }),
    execute: vi.fn(async (q: SQL) => {
      const s = text(q);
      if (s.includes("as unseen")) return { rows: rows.feed ?? [] };
      if (s.includes('from "printings" sp')) return { rows: rows.sets ?? [] };
      if (s.includes('from "cards" fc')) return { rows: rows.cards ?? [] };
      return { rows: [] };
    }),
  } as never;
}

const row = (o: Record<string, unknown>) => ({
  code: null, name: null, file_name: null, oracle_id: null, variant_id: null, friend_public_id: null, friend_name: null, data: {}, unseen: true, ...o,
});

describe("loadHomeFeed", () => {
  it("reads nothing and answers null with HOME_FEED_ENABLED off: Home as shipped", async () => {
    expect(await loadHomeFeed("u1", {} as NodeJS.ProcessEnv, NOW, refusing)).toBeNull();
  });

  it("answers the opt-in while every kind the reader can be offered is off, reading no feed", async () => {
    const q = fake({}, {});
    const feed = await loadHomeFeed("u1", ON, NOW, q);
    expect(feed).toEqual({ chosen: false, offer: ["new-set", "new-precon", "price-drop", "trade-match", "combo"] });
    expect((q as unknown as { execute: ReturnType<typeof vi.fn> }).execute).not.toHaveBeenCalled();
  });

  it("keeps the offer for a reader who chose nothing until the default-on kind has an item", async () => {
    const SPARE = { ...ON, SPARE_REQUESTS_ENABLED: "true" } as NodeJS.ProcessEnv;
    const empty = await loadHomeFeed("u1", SPARE, NOW, fake({}, {}));
    expect(empty).toMatchObject({ chosen: false });
    const ask = row({ kind: "spare-request", key: "item:s", created_at: "2026-10-22T10:00:00Z", friend_public_id: "p1", friend_name: "Peter" });
    const feed = await loadHomeFeed("u1", SPARE, NOW, fake({}, { feed: [ask] }));
    expect(feed?.chosen && feed.lead?.key).toBe("item:s");
  });

  it("draws each item with its card, the lead out of the list", async () => {
    const q = fake(
      { "new-set": "2026-10-01T00:00:00Z", "price-drop": "2026-10-01T00:00:00Z", "trade-match": "2026-10-01T00:00:00Z" },
      {
        feed: [
          row({ kind: "price-drop", key: "item:1", created_at: "2026-10-22T10:00:00Z", oracle_id: "c1", data: { fromCents: 640, toCents: 310 } }),
          row({ kind: "trade-match", key: "item:2", created_at: "2026-10-21T10:00:00Z", oracle_id: "c2", friend_public_id: "p1", friend_name: "Colin" }),
          row({ kind: "new-set", key: "set:sos", created_at: "2026-10-20T10:00:00Z", code: "sos", name: "Secrets", unseen: false }),
        ],
        sets: [{ code: "sos", size: 288, oracle_id: "c9", name: "Mythic", image: "set.jpg", art: "set-art.jpg" }],
        cards: [
          { oracle_id: "c1", name: "Sai", image: "sai.jpg", art: "sai-art.jpg" },
          { oracle_id: "c2", name: "Ghalta", image: "ghalta.jpg", art: "g-art.jpg" },
        ],
      },
    );
    const feed = await loadHomeFeed("u1", ON, NOW, q);
    if (!feed?.chosen) throw new Error("expected a chosen feed");
    // The trade match leads (priority over the newer price drop) and leaves the list.
    expect(feed.lead?.key).toBe("item:2");
    expect(feed.lead?.href).toBe("/friends/p1");
    expect(feed.items.map((i) => i.key)).toEqual(["item:1", "set:sos"]);
    expect(feed.unseen).toBe(2);
    expect(feed.items[0]).toMatchObject({ card: { name: "Sai", image: "sai-owned.jpg" }, opens: "c1", drop: { fromCents: 640, toCents: 310 } });
    expect(feed.items[1]).toMatchObject({ card: { name: "Mythic", image: "set.jpg" }, setSize: 288, href: "/collection/sets/sos", unseen: false });
  });
});

const view = (o: Partial<FeedView>): FeedView => ({
  key: "k", kind: "new-set", at: "2026-10-22T00:00:00Z", unseen: true, card: null, friend: null, href: null, opens: null,
  name: null, setSize: null, owned: null, drop: null, combo: null, ...o,
});

describe("splitLead (the lead-story pick)", () => {
  it("leads with the first unseen item by priority, never a seen one, and counts every unseen item", () => {
    const views = [
      view({ key: "set", kind: "new-set", at: "2026-10-22T11:00:00Z" }),
      view({ key: "drop", kind: "price-drop", at: "2026-10-22T10:00:00Z" }),
      view({ key: "combo-seen", kind: "combo", at: "2026-10-22T09:00:00Z", unseen: false }),
      view({ key: "precon", kind: "new-precon", at: "2026-10-22T08:00:00Z" }),
    ];
    const feed = splitLead(views, ["new-set"]);
    if (!feed.chosen) throw new Error("chosen");
    expect(feed.lead?.key).toBe("drop");
    expect(feed.items.map((i) => i.key)).toEqual(["set", "combo-seen", "precon"]);
    expect(feed.unseen).toBe(3);
  });

  it("draws no lead when nothing is unseen, and keeps every item in the list", () => {
    const feed = splitLead([view({ key: "a", unseen: false }), view({ key: "b", unseen: false })], ["new-set"]);
    if (!feed.chosen) throw new Error("chosen");
    expect(feed.lead).toBeNull();
    expect(feed.items).toHaveLength(2);
  });

  it("takes the newer of two unseen items of the leading kind", () => {
    const feed = splitLead(
      [view({ key: "old", kind: "trade-match", at: "2026-10-20T00:00:00Z" }), view({ key: "new", kind: "trade-match", at: "2026-10-21T00:00:00Z" })],
      ["trade-match"],
    );
    expect(feed.chosen && feed.lead?.key).toBe("new");
  });
});

describe("toViews", () => {
  const empty = { sets: new Map(), precons: new Map(), owned: new Map(), cards: new Map() };
  it("names a combo by its pieces and the one the write added, and opens the first piece", () => {
    const item = {
      kind: "combo", key: "item:c", createdAt: NOW, unseen: true, oracleId: "b", variantId: "v", friend: null,
      data: { cards: [{ oracleId: "a", name: "Thassa’s Oracle" }, { oracleId: "b", name: "Demonic Consultation" }], added: ["b"] },
    } as FeedItem;
    expect(toViews([item], empty)[0]).toMatchObject({ opens: "a", combo: { pieces: ["Thassa’s Oracle", "Demonic Consultation"], added: "Demonic Consultation" } });
  });

  it("refuses a combo whose data is not two named pieces", () => {
    expect(comboPieces({ cards: [{ oracleId: "a", name: "A" }] })).toBeNull();
  });

  it("gives a spare request (a later round) no press", () => {
    const item = { kind: "spare-request", key: "item:s", createdAt: NOW, unseen: true, oracleId: null, variantId: null, friend: { publicId: "p", displayName: "Peter" }, data: {} } as FeedItem;
    expect(toViews([item], empty)[0]).toMatchObject({ href: null, opens: null, friend: { displayName: "Peter" } });
  });
});

describe("setCardsQuery", () => {
  it("qualifies every column on its aliases", () => {
    const s = text(setCardsQuery(["sos"]));
    expect(s).toContain('from "printings" sp');
    expect(s).toContain("sc.oracle_id = sp.oracle_id");
    expect(s).toContain("ss.card_count as size");
  });
});

describe("homeFeedAfter", () => {
  beforeEach(() => {
    marks.seen.mockReset();
    marks.notice.mockReset();
  });

  it("writes nothing with the feed off", async () => {
    await homeFeedAfter("u1", {} as NodeJS.ProcessEnv, NOW)();
    expect(marks.seen).not.toHaveBeenCalled();
    expect(marks.notice).not.toHaveBeenCalled();
  });

  it("marks the feed seen at the render's clock and notices trade matches, each failing alone", async () => {
    marks.seen.mockRejectedValue(new Error("down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await homeFeedAfter("u1", ON, NOW)();
    expect(marks.seen).toHaveBeenCalledWith("u1", ON, NOW);
    expect(marks.notice).toHaveBeenCalledWith("u1", ON);
    err.mockRestore();
  });
});

describe("preconOwnedQuery", () => {
  it("sums what a precon needs of each card across its printings BEFORE capping at what the reader holds", () => {
    const q = text(preconOwnedQuery("u1", ["f"])).replace(/\s+/g, " ");
    // Two rows of five Plains need ten between them: capped per (file, card) after the sum, never per row.
    expect(q).toContain("group by po.file_name, po.oracle_id) pn");
    expect(q).toContain("sum(least(pn.need, coalesce(oc.n, 0)))::int as owned");
    // The copies the ingest could not map are part of the deck, though never owned.
    expect(q).toContain("(sum(pn.need) + max(pr.unmapped_count))::int as total");
    expect(q).toContain('join "precons" pr on pr.file_name = pn.file_name');
  });
});

describe("the feed's card lookups carry the card's colour identity", () => {
  it("so a card with no art can draw its identity gradient", () => {
    expect(text(setCardsQuery(["sos"]))).toContain("sc.color_identity as identity");
    expect(text(preconCommandersQuery(["f"]))).toContain("pcc.color_identity as identity");
    expect(text(feedCardsQuery(["c"]))).toContain("fc.color_identity as identity");
  });
});
