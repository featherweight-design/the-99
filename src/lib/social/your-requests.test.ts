import { PgDialect } from "drizzle-orm/pg-core";
// Your requests' read (spare requests PR 3d): ONE read of the stored asks (cleared Nos inside their cooldown included,
// for the retry rule, never returned), ONE friend-spares read for the open, expired and declined asks' cards, the buy list only
// with an open ask, the diamond from the Friends cursor, who else has a spare after a No, and Ask again's eligibility.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ shown: vi.fn(), buyRows: vi.fn(), spares: vi.fn(), prefs: vi.fn() }));
vi.mock("../../db", () => ({ db: { select: () => ({ from: () => ({ where: m.prefs }) }) } }));
vi.mock("./spare-requests", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./spare-requests")>()),
  readShownAsks: m.shown,
}));
vi.mock("../decks/availability-query", () => ({ loadDeckBuyRows: m.buyRows }));
vi.mock("./spares", () => ({ loadFriendSpares: m.spares, loadOwnOffered: vi.fn() }));

import { answerUnseen, loadYourRequests, answeredRequestIdQuery } from "./your-requests";
import type { ShownAsk } from "./spare-requests";

const ON = { SOCIAL_FRIENDS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const NOW = new Date("2026-10-22T12:00:00Z");
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

/** One stored ask as `readShownAsks` returns it. */
const stored = (id: string, status: ShownAsk["a"]["status"], o: {
  card?: string; holder?: string; createdAt?: Date; answeredAt?: Date | null; cleared?: boolean; standalone?: boolean;
  seenAt?: Date | null;
} = {}): ShownAsk => {
  const holder = o.holder ?? "Colin";
  const createdAt = o.createdAt ?? ago(2);
  const answeredAt = o.answeredAt ?? null;
  return {
    r: {
      id, oracle_id: o.card ?? "jace", status, created_at: createdAt, answered_at: answeredAt, copies: 1,
      public_id: `pub-${holder.toLowerCase()}`, display_name: holder, card_name: "Jace", card_image: null, deck_name: null,
      deck_id: null, cleared: o.cleared ?? false, standalone: o.standalone ?? false, commander_oracle_id: null, commander_name: null, commander_art: null,
      asker_seen_at: o.seenAt ?? null,
    } as ShownAsk["r"],
    a: { status, createdAt, answeredAt },
  };
};
const friend = (name: string) => ({ publicId: `pub-${name.toLowerCase()}`, displayName: name, commander: null, pods: [] });

beforeEach(() => {
  m.shown.mockReset().mockResolvedValue([]);
  m.buyRows.mockReset().mockResolvedValue([]);
  m.spares.mockReset().mockResolvedValue([]);
  m.prefs.mockReset().mockResolvedValue([]);
});

describe("answerUnseen", () => {
  const at = new Date("2026-10-21T00:00:00Z");
  it("is an answer after the cursor, or any answer with no cursor yet; never an open or expired ask", () => {
    expect(answerUnseen({ state: "yes", answeredAt: at }, null)).toBe(true);
    expect(answerUnseen({ state: "no", answeredAt: at }, new Date("2026-10-20T00:00:00Z"))).toBe(true);
    expect(answerUnseen({ state: "yes", answeredAt: at }, new Date("2026-10-22T00:00:00Z"))).toBe(false);
    expect(answerUnseen({ state: "open", answeredAt: null }, null)).toBe(false);
    expect(answerUnseen({ state: "expired", answeredAt: null }, null)).toBe(false);
  });

  it("is seen once the answer itself was opened after it landed, whatever the cursor (small items item 3)", () => {
    expect(answerUnseen({ state: "yes", answeredAt: at, seenAt: new Date("2026-10-21T01:00:00Z") }, null)).toBe(false);
    expect(answerUnseen({ state: "no", answeredAt: at, seenAt: at }, new Date("2026-10-20T00:00:00Z"))).toBe(false);
  });
});

describe("loadYourRequests", () => {
  it("reads nothing with spare requests off", async () => {
    expect(await loadYourRequests("u1", {} as NodeJS.ProcessEnv, NOW)).toEqual([]);
    expect(m.shown).not.toHaveBeenCalled();
  });

  it("reads the stored asks once, keeping cleared Nos for the retry rule", async () => {
    await loadYourRequests("u1", ON, NOW);
    expect(m.shown).toHaveBeenCalledTimes(1);
    expect(m.shown).toHaveBeenCalledWith("u1", NOW, { keepClearedDeclines: true });
  });

  it("reads no buy list and no spares when nothing is open or declined", async () => {
    m.shown.mockResolvedValue([stored("a", "yes", { answeredAt: ago(1) })]);
    await loadYourRequests("u1", ON, NOW);
    expect(m.buyRows).not.toHaveBeenCalled();
    expect(m.spares).not.toHaveBeenCalled();
  });

  it("reads every friend's spares ONCE for the open, expired and declined cards together, and the buy list as stillNeeded", async () => {
    m.shown.mockResolvedValue([
      stored("open", "open", { card: "sol" }),
      stored("gone", "open", { card: "bolt", holder: "Max" }),
      stored("no", "no", { card: "jace", answeredAt: ago(1) }),
      stored("old", "expired", { card: "ring", createdAt: ago(15) }),
    ]);
    m.spares.mockResolvedValue([{ oracleId: "sol", friend: friend("Colin"), spare: 1 }]);
    m.buyRows.mockResolvedValue([{ deckId: "d1", oracleId: "bolt", quantity: 1 }]);
    const rows = await loadYourRequests("u1", ON, NOW);
    expect(m.spares).toHaveBeenCalledTimes(1);
    expect(new Set(m.spares.mock.calls[0][1])).toEqual(new Set(["sol", "bolt", "jace", "ring"]));
    expect(m.buyRows).toHaveBeenCalledWith("u1");
    // Colin still offers Sol but no deck buys it: unneeded. Max no longer offers Bolt: unavailable (before unneeded).
    expect(rows.map((r) => [r.id, r.state])).toEqual([["open", "unneeded"], ["gone", "unavailable"], ["no", "no"], ["old", "expired"]]);
  });

  it("never reads an ask from a friend's Spares tab (standalone) as no longer needed", async () => {
    m.shown.mockResolvedValue([stored("tab", "open", { card: "sol", standalone: true }), stored("shop", "open", { card: "sol" })]);
    m.spares.mockResolvedValue([{ oracleId: "sol", friend: friend("Colin"), spare: 1 }]);
    m.buyRows.mockResolvedValue([]);
    const rows = await loadYourRequests("u1", ON, NOW);
    expect(rows.map((r) => [r.id, r.state])).toEqual([["tab", "open"], ["shop", "unneeded"]]);
    expect(rows.map((r) => [r.id, r.standalone])).toEqual([["tab", true], ["shop", false]]);
  });

  it("marks answers newer than the Friends cursor", async () => {
    m.prefs.mockResolvedValue([{ seenAt: ago(1) }]);
    m.shown.mockResolvedValue([stored("new", "yes", { answeredAt: ago(0.5) }), stored("old", "yes", { answeredAt: ago(2) })]);
    const rows = await loadYourRequests("u1", ON, NOW);
    expect(rows.map((r) => [r.id, r.unseen])).toEqual([["new", true], ["old", false]]);
  });

  it("reads an answer opened one by one as seen, whatever the cursor (the stored asker_seen_at, small items item 3)", async () => {
    m.prefs.mockResolvedValue([]);
    m.shown.mockResolvedValue([stored("opened", "yes", { answeredAt: ago(1), seenAt: ago(0.5) }), stored("not", "no", { answeredAt: ago(1) })]);
    const rows = await loadYourRequests("u1", ON, NOW);
    expect(rows.map((r) => [r.id, r.unseen])).toEqual([["opened", false], ["not", true]]);
  });

  it("after a No, names the OTHER friends with a spare of that card, most spares first", async () => {
    m.shown.mockResolvedValue([stored("a", "no", { answeredAt: ago(1) }), stored("b", "yes", { card: "sol", answeredAt: ago(1) })]);
    m.spares.mockResolvedValue([
      { oracleId: "jace", friend: friend("Colin"), spare: 3 },
      { oracleId: "jace", friend: friend("Max"), spare: 1 },
      { oracleId: "jace", friend: friend("Chris"), spare: 2 },
      { oracleId: "sol", friend: friend("Ann"), spare: 4 },
    ]);
    const rows = await loadYourRequests("u1", ON, NOW);
    expect(rows[0].othersWithSpare).toEqual(["Chris", "Max"]);
    expect(rows[1].othersWithSpare).toEqual([]);
  });

  describe("Ask again's eligibility (canAskAgain)", () => {
    const expired = (o: Parameters<typeof stored>[2] = {}) => stored("exp", "expired", { createdAt: ago(15), ...o });
    // Colin still offers the card: the default for these cases, since Ask again needs it (the write's `not-spare`).
    beforeEach(() => m.spares.mockResolvedValue([{ oracleId: "jace", friend: friend("Colin"), spare: 1 }]));

    it("is offered on an unanswered ask with nothing standing in the way", async () => {
      m.shown.mockResolvedValue([expired()]);
      expect((await loadYourRequests("u1", ON, NOW))[0].canAskAgain).toBe(true);
    });

    it("is refused once the holder no longer offers the card (used, kept back or no longer shared)", async () => {
      m.shown.mockResolvedValue([expired()]);
      m.spares.mockResolvedValue([{ oracleId: "jace", friend: friend("Max"), spare: 1 }]);
      const rows = await loadYourRequests("u1", ON, NOW);
      expect(new Set(m.spares.mock.calls[0][1])).toEqual(new Set(["jace"]));
      expect(rows[0].canAskAgain).toBe(false);
    });

    it("reads an ask still stored open past its window as expired, offered only while the holder offers", async () => {
      m.shown.mockResolvedValue([stored("aged", "open", { createdAt: ago(15) })]);
      const offered = await loadYourRequests("u1", ON, NOW);
      expect([offered[0].state, offered[0].canAskAgain]).toEqual(["expired", true]);
      m.spares.mockResolvedValue([]);
      const vanished = await loadYourRequests("u1", ON, NOW);
      expect([vanished[0].state, vanished[0].canAskAgain]).toEqual(["expired", false]);
    });

    it("is refused while a later No from the same friend is inside the cooldown, even one the reader cleared", async () => {
      m.shown.mockResolvedValue([stored("no", "no", { createdAt: ago(3), answeredAt: ago(2), cleared: true }), expired()]);
      const rows = await loadYourRequests("u1", ON, NOW);
      // The cleared No is read for the rule and never returned.
      expect(rows.map((r) => r.id)).toEqual(["exp"]);
      expect(rows[0].canAskAgain).toBe(false);
    });

    it("is refused while the card has an open ask, to anyone", async () => {
      m.shown.mockResolvedValue([stored("open", "open", { holder: "Max", createdAt: ago(1) }), expired()]);
      m.spares.mockResolvedValue([{ oracleId: "jace", friend: friend("Max"), spare: 1 }]);
      m.buyRows.mockResolvedValue([{ deckId: "d", oracleId: "jace", quantity: 1 }]);
      expect((await loadYourRequests("u1", ON, NOW)).find((r) => r.id === "exp")?.canAskAgain).toBe(false);
    });

    it("is offered when another friend's No is the only one", async () => {
      m.shown.mockResolvedValue([stored("no", "no", { holder: "Max", createdAt: ago(3), answeredAt: ago(2) }), expired()]);
      expect((await loadYourRequests("u1", ON, NOW)).find((r) => r.id === "exp")?.canAskAgain).toBe(true);
    });
  });
});

describe("answeredRequestIdQuery (small items item 3)", () => {
  it("names a request only through the reader's own ANSWER item, as the reader's own ask", () => {
    const { sql, params } = new PgDialect().sqlToQuery(answeredRequestIdQuery("user_1", "0f4b1c9e-1d2a-4c3b-8e5f-6a7b8c9d0e1f"));
    expect(sql).toContain("asr.id::text = afi.dedupe_key and asr.asker_user_id = afi.user_id");
    expect(sql).toContain("afi.user_id = $1 and afi.id = $2::uuid and afi.kind = 'spare-request'");
    expect(sql).toContain("afi.data ->> 'answer' is not null");
    expect(params).toEqual(["user_1", "0f4b1c9e-1d2a-4c3b-8e5f-6a7b8c9d0e1f"]);
  });
});
