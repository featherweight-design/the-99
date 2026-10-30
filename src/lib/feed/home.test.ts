import { describe, expect, it, vi, beforeEach } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";

const marks = vi.hoisted(() => ({ seen: vi.fn(), notice: vi.fn(), asks: vi.fn(async (..._a: unknown[]): Promise<unknown[]> => []) }));
vi.mock("../../db", () => ({ db: {} }));
vi.mock("./prefs", async (importOriginal) => ({ ...(await importOriginal<typeof import("./prefs")>()), markFeedSeen: marks.seen }));
vi.mock("../social/trade-match", () => ({ noticeTradeMatches: marks.notice }));
vi.mock("../social/spare-requests", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../social/spare-requests")>()),
  loadIncomingAsks: marks.asks,
}));
// The reader owns Sai in another printing: the row draws the chain's picture, the one card details opens.
vi.mock("../cards/chain-art", () => ({ chainArt: async () => new Map([["c1", "sai-owned.jpg"]]) }));

import { comboPieces, feedCardsQuery, homeFeedAfter, loadHomeFeed, postLists, preconCommandersQuery, preconOwnedQuery, setCardsQuery, splitLead, toViews, withAnswerDetails, withListTargets, withLeadAsk, wizardsPostUrl, type FeedView, type HomeFeed } from "./home";
import type { IncomingAsk } from "../social/spare-requests";
import type { FeedItem } from "./read";
import { named } from "../person-name/mint";

const ON = { SOCIAL_FRIENDS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const NOW = new Date("2026-10-22T12:00:00Z");
const text = (q: SQL) => new PgDialect().sqlToQuery(q).sql;

/**
 * An executor answering the prefs read with `kinds` (and `prefs`: the declined list, the offer's ✕ stamp) and each
 * execute by the table its statement reads.
 */
function fake(kinds: Record<string, string>, rows: { feed?: unknown[]; sets?: unknown[]; cards?: unknown[]; lists?: unknown[] }, prefs: { declined?: string[]; offerClosedAt?: Date | null } = {}) {
  return {
    select: () => ({ from: () => ({ where: async () => [{ feedKinds: kinds, ...prefs }] }) }),
    execute: vi.fn(async (q: SQL) => {
      const s = text(q);
      if (s.includes("as unseen")) return { rows: rows.feed ?? [] };
      if (s.includes('from "printings" sp')) return { rows: rows.sets ?? [] };
      if (s.includes('from "cards" fc')) return { rows: rows.cards ?? [] };
      if (s.includes('from "wizards_announcements" pwa')) return { rows: rows.lists ?? [] };
      return { rows: [] };
    }),
  } as never;
}

const row = (o: Record<string, unknown>) => ({
  code: null, name: null, file_name: null, oracle_id: null, variant_id: null, friend_public_id: null, friend_name: null, data: {}, unseen: true, ...o,
});

describe("loadHomeFeed", () => {
  it("answers the offer alone while every kind the reader can be offered is off, reading no feed", async () => {
    const q = fake({}, {});
    // Friends off: spare requests (default on) follow friends since SPARE_REQUESTS_ENABLED retired, and trade matches need them.
    const feed = await loadHomeFeed("u1", { ...ON, SOCIAL_FRIENDS_ENABLED: "" } as NodeJS.ProcessEnv, NOW, q);
    expect(feed).toEqual({ chosen: false, offer: ["new-set", "new-precon", "price-drop", "combo"], on: [] });
    expect((q as unknown as { execute: ReturnType<typeof vi.fn> }).execute).not.toHaveBeenCalled();
  });

  it("with every kind off after a choice, answers the off box, never the offer, and reads no feed (small items 6, item 6)", async () => {
    const env = { ...ON, SOCIAL_FRIENDS_ENABLED: "" } as NodeJS.ProcessEnv;
    // The offer's ✕ saved an empty choice.
    const closed = fake({}, {}, { offerClosedAt: new Date("2026-10-20T00:00:00Z") });
    expect(await loadHomeFeed("u1", env, NOW, closed)).toEqual({ chosen: true, on: [], items: [], unseen: 0, lead: null });
    expect((closed as unknown as { execute: ReturnType<typeof vi.fn> }).execute).not.toHaveBeenCalled();
    // Every kind turned off in Settings.
    const declined = fake({}, {}, { declined: ["new-set", "new-precon", "price-drop", "combo"] });
    expect(await loadHomeFeed("u1", env, NOW, declined)).toEqual({ chosen: true, on: [], items: [], unseen: 0, lead: null });
  });

  describe("the offer line (announcements call 3)", () => {
    const SPARE = ON;
    // The default-on kind already on is not offered: an unticked box there would save it off.
    const OFFER = ["new-set", "new-precon", "price-drop", "trade-match", "combo"];
    const ask = () => row({ kind: "spare-request", key: "item:s", created_at: "2026-10-22T10:00:00Z", friend_public_id: "p1", friend_name: "Peter" });
    const ask2 = () => row({ kind: "spare-request", key: "item:t", created_at: "2026-10-21T10:00:00Z", friend_public_id: "p2", friend_name: "Max" });

    it("with nothing in the window, for a reader who never chose, names the kinds on for the quiet line (small items 5)", async () => {
      const feed = await loadHomeFeed("u1", SPARE, NOW, fake({}, {}));
      // `on`: spare requests already show here, so the quiet line over the offer line names them.
      expect(feed).toEqual({ chosen: false, offer: OFFER, on: ["spare-request"] });
    });

    it("stands with items in the window: the first item no longer ends it", async () => {
      const feed = await loadHomeFeed("u1", SPARE, NOW, fake({}, { feed: [ask(), ask2()] }));
      expect(feed?.chosen && feed.lead?.key).toBe("item:s");
      expect(feed?.chosen && feed.items.map((i) => i.key)).toEqual(["item:t"]);
      expect(feed?.chosen && feed.offer).toEqual(OFFER);
    });

    it("is gone once the reader has chosen: a kind stamped, or a default-on kind declined", async () => {
      const stamped = await loadHomeFeed("u1", SPARE, NOW, fake({ "new-set": "2026-10-01T00:00:00Z" }, { feed: [ask()] }));
      expect(stamped?.chosen && stamped.offer).toBeUndefined();
      const declined = await loadHomeFeed("u1", { ...SPARE, ANNOUNCEMENTS_ENABLED: "true" } as NodeJS.ProcessEnv, NOW, fake({}, {}, { declined: ["secret-lair"] }));
      expect(declined?.chosen && declined.offer).toBeUndefined();
    });

    it("is gone after its ✕, and the empty window is the quiet line alone (no offer line under it), while the default-on kinds stay on as for a reader who never chose", async () => {
      const feed = await loadHomeFeed("u1", SPARE, NOW, fake({}, { feed: [ask()] }, { offerClosedAt: new Date("2026-10-20T00:00:00Z") }));
      expect(feed?.chosen && feed.offer).toBeUndefined();
      expect(feed?.chosen && feed.on).toEqual(["spare-request"]);
      expect(feed?.chosen && feed.lead?.key).toBe("item:s");
      const empty = await loadHomeFeed("u1", SPARE, NOW, fake({}, {}, { offerClosedAt: new Date("2026-10-20T00:00:00Z") }));
      expect(empty).toEqual({ chosen: true, on: ["spare-request"], items: [], unseen: 0, lead: null });
    });
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
    expect(feed.lead?.href).toBe("/friends/p1/spares?spare=c2");
    expect(feed.items.map((i) => i.key)).toEqual(["item:1", "set:sos"]);
    expect(feed.unseen).toBe(2);
    // A price drop opens the card on Mana Pool (Hugh, 2026-10-27), by the card details link's builder, never its detail.
    expect(feed.items[0]).toMatchObject({
      card: { name: "Sai", image: "sai-owned.jpg" },
      outbound: "https://manapool.com/cards?q=Sai",
      opens: null,
      drop: { fromCents: 640, toCents: 310 },
    });
    expect(feed.items[1]).toMatchObject({ card: { name: "Mythic", image: "set.jpg" }, setSize: 288, href: "/collection/sets/sos", unseen: false });
  });
});

const view = (o: Partial<FeedView>): FeedView => ({
  key: "k", kind: "new-set", at: "2026-10-22T00:00:00Z", unseen: true, card: null, friend: null, href: null, opens: null, outbound: null,
  name: null, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false, ...o,
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
      kind: "combo", key: "item:c", createdAt: NOW, unseen: true, oracleId: "b", variantId: "v", friend: null, answer: null,
      data: { cards: [{ oracleId: "a", name: "Thassa’s Oracle" }, { oracleId: "b", name: "Demonic Consultation" }], added: ["b"] },
    } as FeedItem;
    expect(toViews([item], empty)[0]).toMatchObject({ opens: "a", combo: { pieces: ["Thassa’s Oracle", "Demonic Consultation"], added: "Demonic Consultation" } });
  });

  it("refuses a combo whose data is not two named pieces", () => {
    expect(comboPieces({ cards: [{ oracleId: "a", name: "A" }] })).toBeNull();
  });

  it("marks a trade match askable only with spare requests on for the reader, and no other kind", () => {
    const trade = { kind: "trade-match", key: "item:t", createdAt: NOW, unseen: true, oracleId: "g", variantId: null, friend: { publicId: "p", displayName: named("Colin") }, data: {} } as FeedItem;
    const price = { kind: "price-drop", key: "item:p", createdAt: NOW, unseen: true, oracleId: "g", variantId: null, friend: null, data: {} } as FeedItem;
    expect(toViews([trade, price], { ...empty, askable: true }).map((v) => v.askable)).toEqual([true, false]);
    expect(toViews([trade], empty)[0].askable).toBe(false);
  });

  it("gives a spare request (a later round) no press", () => {
    const item = { kind: "spare-request", key: "item:s", createdAt: NOW, unseen: true, oracleId: null, variantId: null, friend: { publicId: "p", displayName: named("Peter") }, data: {} } as FeedItem;
    expect(toViews([item], empty)[0]).toMatchObject({ href: null, opens: null, outbound: null, friend: { displayName: named("Peter") }, answer: null });
  });

  it("gives an answer to the reader's own ask its answer and a press to Your requests", () => {
    const item = { kind: "spare-request", key: "item:a", createdAt: NOW, unseen: true, oracleId: null, variantId: null, friend: { publicId: "p", displayName: named("Colin") }, data: { answer: "yes" }, answer: "yes" } as FeedItem;
    expect(toViews([item], empty)[0]).toMatchObject({ href: "/friends", answer: "yes", friend: { displayName: named("Colin") } });
  });
});

describe("withAnswerDetails", () => {
  const card = { oracleId: "jace", name: "Jace", image: null, art: null, colorIdentity: null };
  const colin = { publicId: "p_colin", displayName: named("Colin") };
  const spare = (publicId: string, displayName: string, n: number, oracleId = "jace") => ({ oracleId, spare: n, friend: { publicId, displayName: named(displayName) } as never });
  const feed = (...items: FeedView[]): HomeFeed => ({ chosen: true, on: ["spare-request"], lead: null, items, unseen: items.length });
  it("a Yes carries no names; a No names the OTHER friends offering the card, most spares first", () => {
    const out = withAnswerDetails(
      feed(view({ key: "y", kind: "spare-request", card, friend: colin, answer: "yes" }), view({ key: "n", kind: "spare-request", card, friend: colin, answer: "no" })),
      [spare("p_colin", "Colin", 9), spare("p_ann", "Ann", 1), spare("p_max", "Max", 3), spare("p_zed", "Zed", 5, "other")],
    );
    if (!out.chosen) throw new Error("chosen");
    expect(out.items[0].answerDetail).toEqual({ others: [], standalone: false });
    expect(out.items[1].answerDetail).toEqual({ others: [named("Max"), named("Ann")], standalone: false });
  });
  it("marks the answer to a standalone ask by its key, and only that one", () => {
    const out = withAnswerDetails(
      feed(view({ key: "y", kind: "spare-request", card, friend: colin, answer: "yes" }), view({ key: "y2", kind: "spare-request", card, friend: colin, answer: "yes" })),
      [], new Set(["y"]),
    );
    if (!out.chosen) throw new Error("chosen");
    expect(out.items.map((i) => i.answerDetail?.standalone)).toEqual([true, false]);
  });
  it("leaves every other item as it was", () => {
    const plain = view({ key: "s", kind: "new-set" });
    const out = withAnswerDetails(feed(plain), []);
    expect(out.chosen && out.items[0]).toBe(plain);
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

describe("a spare request leading Home (spare requests PR 3d)", () => {
  const SPARE = ON;
  const incoming = (o: Partial<IncomingAsk> = {}): IncomingAsk => ({
    id: "req-1", oracleId: "c1", card: { name: "Lathliss", imageUri: null }, copies: 1, deckName: named("Dragons"), spare: 2,
    asker: { publicId: "p1", displayName: named("Peter"), commander: null }, createdAt: NOW, daysLeft: 13, ...o,
  });
  const lead = view({ key: "item:s", kind: "spare-request", card: { oracleId: "c1", name: "Lathliss", image: null, art: null, colorIdentity: null }, friend: { publicId: "p1", displayName: named("Peter") } });
  const feedOf = (l: FeedView | null): HomeFeed => ({ chosen: true, on: ["spare-request"], items: [], unseen: 1, lead: l });

  it("attaches the lead's own ask, by card and asker", () => {
    const out = withLeadAsk(feedOf(lead), [incoming({ id: "other", oracleId: "c2" }), incoming({ id: "x", asker: { publicId: "p2", displayName: named("Ann"), commander: null } }), incoming()]);
    expect(out.chosen && out.lead?.ask).toEqual({ id: "req-1", spare: 2, copies: 1, deckName: named("Dragons"), daysLeft: 13 });
  });

  it("leaves the lead a line when its ask is gone or no longer offered (not among the incoming asks)", () => {
    const out = withLeadAsk(feedOf(lead), [incoming({ oracleId: "c2" })]);
    expect(out.chosen && out.lead?.ask).toBeUndefined();
  });

  it("reads the incoming asks only when a spare request leads", async () => {
    marks.asks.mockClear();
    marks.asks.mockResolvedValue([incoming()]);
    const ask = row({ kind: "spare-request", key: "item:s", created_at: "2026-10-22T10:00:00Z", oracle_id: "c1", friend_public_id: "p1", friend_name: "Peter" });
    const feed = await loadHomeFeed("u1", SPARE, NOW, fake({}, { feed: [ask], cards: [{ oracle_id: "c1", name: "Lathliss", image: null, art: null }] }));
    expect(marks.asks).toHaveBeenCalledWith("u1", SPARE, NOW, expect.anything());
    expect(feed?.chosen && feed.lead?.ask?.id).toBe("req-1");
    marks.asks.mockClear();
    const drop = row({ kind: "price-drop", key: "item:d", created_at: "2026-10-22T10:00:00Z", oracle_id: "c1", data: { fromCents: 2, toCents: 1 } });
    await loadHomeFeed("u1", ON, NOW, fake({ "price-drop": "2026-10-01T00:00:00Z" }, { feed: [drop] }));
    expect(marks.asks).not.toHaveBeenCalled();
  });
});

describe("a Wizards post", () => {
  const empty = { sets: new Map(), precons: new Map(), owned: new Map(), cards: new Map() };
  const URL_OK = "https://magic.wizards.com/en/news/announcements/foundations-commander-decklists";
  const post = (kind: "secret-lair" | "commander-decklists" | "wizards-news", over: Record<string, unknown> = {}) => ({
    kind, key: `post:${kind}`, createdAt: NOW, unseen: true,
    post: { title: "Foundations Commander: the decklists", excerpt: "Every card in three of the five decks.", hero: "https://images.ctfassets.net/h.jpg", url: URL_OK, promised: 5, lists: 3, ...over },
  }) as FeedItem;

  it("draws its title, summary and hero, out to the post, with no card and no lookup", () => {
    const [v] = toViews([post("commander-decklists")], empty);
    expect(v).toMatchObject({
      kind: "commander-decklists", card: null, href: null, opens: null, outbound: "/out/wizards/commander-decklists",
      post: { title: "Foundations Commander: the decklists", summary: "Every card in three of the five decks.", hero: "https://images.ctfassets.net/h.jpg", lists: { n: 3, of: 5 } },
    });
  });

  it("carries a null hero through for the plate, and no lists line on a kind that is not decklists", () => {
    const [v] = toViews([post("secret-lair", { hero: null, excerpt: null })], empty);
    expect(v.post).toEqual({ title: "Foundations Commander: the decklists", summary: null, hero: null, lists: null });
  });

  it("draws no press for an address off magic.wizards.com", () => {
    expect(toViews([post("wizards-news", { url: "https://evil.example/x" })], empty)[0].outbound).toBeNull();
    expect(toViews([post("wizards-news", { url: "http://magic.wizards.com/en/news/x" })], empty)[0].outbound).toBeNull();
  });

  it("presses through the app's own out route by the post's Contentful id, never the stored address (Announcements UI 3b)", () => {
    const item = { ...post("secret-lair"), key: "post:7aBc De/f" } as FeedItem;
    expect(toViews([item], empty)[0].outbound).toBe("/out/wizards/7aBc%20De%2Ff");
    // A key that names no post draws no press.
    expect(toViews([{ ...post("secret-lair"), key: "post:" } as FeedItem], empty)[0].outbound).toBeNull();
  });

  it("goes out only to an https page on magic.wizards.com", () => {
    expect(wizardsPostUrl(URL_OK)).toBe(URL_OK);
    for (const bad of ["http://magic.wizards.com/en/news/x", "https://magic.wizards.com.evil.com/x", "https://evil.com/?magic.wizards.com", "javascript:alert(1)", "", "not a url", "https://wizards.com/x"]) {
      expect(wizardsPostUrl(bad)).toBeNull();
    }
  });

  it("counts a decklists post's lists out of those promised: some, then all, never fewer than are stored", () => {
    expect(postLists("commander-decklists", { lists: 3, promised: 5 })).toEqual({ n: 3, of: 5 });
    expect(postLists("commander-decklists", { lists: 5, promised: 5 })).toEqual({ n: 5, of: 5 });
    expect(postLists("commander-decklists", { lists: 4, promised: null })).toEqual({ n: 4, of: 4 });
    expect(postLists("commander-decklists", { lists: 6, promised: 5 })).toEqual({ n: 6, of: 6 });
    expect(postLists("commander-decklists", { lists: 0, promised: 5 })).toBeNull();
    expect(postLists("secret-lair", { lists: 3, promised: 5 })).toBeNull();
  });

  it("reaches a reader who never chose, with ANNOUNCEMENTS_ENABLED on, and Wizards news never leads", async () => {
    const env = { ANNOUNCEMENTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    const data = { title: "Magic’s 2027 release schedule", excerpt: "Every set.", hero: null, url: URL_OK, promised: null, lists: 0 };
    const q = fake({}, { feed: [row({ kind: "wizards-news", key: "post:n1", created_at: NOW.toISOString(), name: data.title, data })] });
    const feed = await loadHomeFeed("u1", env, NOW, q);
    expect(feed).toMatchObject({ chosen: true, on: ["secret-lair", "commander-decklists", "wizards-news"], lead: null, unseen: 1 });
    // The post does not end the offer (announcements call 3): the kinds still off ride under it.
    expect(feed?.chosen && feed.offer).toEqual(["new-set", "new-precon", "price-drop", "combo"]);
    expect(feed?.chosen && feed.items.map((i) => [i.kind, i.outbound])).toEqual([["wizards-news", "/out/wizards/n1"]]);
  });

  it("gives a decklists post its See the lists beside Read the post, all posts from ONE read (Announcements UI 6b)", async () => {
    const env = { HOME_FEED_ENABLED: "true", ANNOUNCEMENTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    const data = { title: "Foundations Commander: the decklists", excerpt: "Every card.", hero: null, url: URL_OK, promised: 5, lists: 3 };
    const q = fake({}, {
      feed: [
        row({ kind: "commander-decklists", key: "post:d1", created_at: NOW.toISOString(), name: data.title, data, unseen: false }),
        row({ kind: "commander-decklists", key: "post:d2", created_at: NOW.toISOString(), name: data.title, data, unseen: false }),
        row({ kind: "secret-lair", key: "post:s1", created_at: NOW.toISOString(), name: "JAWS", data: { ...data, lists: 0 }, unseen: false }),
      ],
      lists: [
        { contentful_id: "d1", commander_id: "a", named: true, sets: [{ code: "fdc", setType: "commander", releasedAt: "2026-11-13", hasPrecons: false }] },
        // d2's only list declares no commander: no early page, so no See the lists.
        { contentful_id: "d2", commander_id: null, named: false, sets: [] },
      ],
    });
    const feed = await loadHomeFeed("u1", env, NOW, q);
    const views = feed?.chosen ? feed.items : [];
    expect(views.map((v) => [v.key, v.href, v.outbound])).toEqual([
      ["post:d1", "/decks/precons?sort=newest#announced-fdc", "/out/wizards/d1"],
      ["post:d2", null, "/out/wizards/d2"],
      ["post:s1", null, "/out/wizards/s1"],
    ]);
    const calls = (q as unknown as { execute: { mock: { calls: [SQL][] } } }).execute.mock.calls.map(([x]) => text(x));
    const reads = calls.filter((x) => x.includes('from "wizards_announcements" pwa'));
    expect(reads).toHaveLength(1);
  });

  it("offers nothing of Wizards' with ANNOUNCEMENTS_ENABLED off", async () => {
    const feed = await loadHomeFeed("u1", {} as unknown as NodeJS.ProcessEnv, NOW, fake({}, {}));
    expect(feed).toEqual({ chosen: false, offer: ["new-set", "new-precon", "price-drop", "combo"], on: [] });
  });
});

describe("withListTargets", () => {
  const view = (kind: FeedView["kind"], key: string): FeedView => ({
    key, kind, at: NOW.toISOString(), unseen: false, card: null, friend: null, href: null, opens: null, outbound: `/out/wizards/${key.slice(5)}`,
    post: { title: "t", summary: null, hero: null, lists: null }, name: null, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false,
  });

  it("sets a decklists post's href by its Contentful id and leaves every other item as it was", () => {
    const views = [view("commander-decklists", "post:d1"), view("secret-lair", "post:d1"), view("commander-decklists", "post:d2")];
    const out = withListTargets(views, new Map([["d1", "/decks/precons?q=FDC"]]));
    expect(out.map((v) => v.href)).toEqual(["/decks/precons?q=FDC", null, null]);
    expect(out.map((v) => v.outbound)).toEqual(["/out/wizards/d1", "/out/wizards/d1", "/out/wizards/d2"]);
    expect(out[1]).toBe(views[1]);
  });
});
