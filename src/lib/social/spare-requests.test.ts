import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: { execute: vi.fn(), transaction: vi.fn(), select: vi.fn() } }));
vi.mock("./spares", () => ({ loadFriendSpares: vi.fn(async () => []), loadOwnOffered: vi.fn(async () => new Map()) }));
vi.mock("./access", () => ({ resolveFriend: vi.fn() }));
vi.mock("./feed-write", () => ({ recordFeedItem: vi.fn(async () => true) }));

import {
  answerQuery, answerSpareRequest, askForSpare, askInsteadForSpare, askLockQuery, clearQuery, closeSpareRequest, expireStaleQuery,
  incomingAsksQuery, loadAskStates, loadIncomingAsks, loadMyAsks, lockFriendshipQuery, markAnswersSeen, markAnswersSeenQuery,
  markAnswerSeenQuery, myAsksQuery, ownDeckQuery, unseenAnswersCount, unseenAnswersCountQuery, waitingAsksCount, waitingAsksCountQuery, withdrawForInsteadQuery,
  withdrawQuery,
} from "./spare-requests";
import { loadFriendSpares, loadOwnOffered } from "./spares";
import { resolveFriend } from "./access";
import { declineFloor, openFloor, shownFloor } from "./spare-request-rules";
import { named } from "../person-name/mint";

const NOW = new Date("2026-10-22T12:00:00Z");
const CARD = "0b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const REQ = "1b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const ON = { SOCIAL_FRIENDS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const render = (q: SQL) => {
  const { sql, params } = new PgDialect().sqlToQuery(q);
  return { q: sql.replace(/\s+/g, " "), params };
};

describe("the switch", () => {
  it("with friends off, nothing is read or written", async () => {
    const { db } = await import("../../db");
    for (const env of [{}, { SOCIAL_FRIENDS_ENABLED: "false" }] as unknown as NodeJS.ProcessEnv[]) {
      expect(await askForSpare("a", REQ, CARD, env, NOW)).toEqual({ ok: false, reason: "off" });
      expect(await answerSpareRequest("h", REQ, "yes", env, NOW)).toEqual({ ok: false, reason: "off" });
      expect(await loadIncomingAsks("h", env, NOW)).toEqual([]);
      expect(await loadMyAsks("a", env, NOW)).toEqual([]);
      expect(await closeSpareRequest("a", REQ, env, NOW)).toEqual({ ok: false, reason: "off" });
      expect(await askInsteadForSpare("a", REQ, REQ, CARD, env, NOW)).toEqual({ ok: false, reason: "off" });
    }
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("a malformed request id or answer changes nothing", async () => {
    const { db } = await import("../../db");
    expect(await answerSpareRequest("h", "nope", "yes", ON, NOW)).toEqual({ ok: false, reason: "gone" });
    expect(await answerSpareRequest("h", REQ, "maybe", ON, NOW)).toEqual({ ok: false, reason: "gone" });
    expect(db.execute).not.toHaveBeenCalled();
  });
});

describe("askLockQuery", () => {
  it("serializes one asker's asks for one card, in the transaction, keyed on both", () => {
    const { q, params } = render(askLockQuery("a", CARD));
    expect(q).toBe("select pg_advisory_xact_lock(hashtextextended($1, 0))");
    expect(params).toEqual([`spare-ask:a:${CARD}`]);
  });
});

describe("lockFriendshipQuery", () => {
  const { q } = render(lockFriendshipQuery("a", "b"));
  it("locks both directed rows for share, in the purge's (user_id, friend_user_id) order", () => {
    expect(q).toMatch(/\(sfl\.user_id = \$1 and sfl\.friend_user_id = \$2\) or \(sfl\.user_id = \$3 and sfl\.friend_user_id = \$4\)/);
    expect(q).toMatch(/order by sfl\.user_id, sfl\.friend_user_id for share$/);
  });
});

describe("expireStaleQuery", () => {
  const { q, params } = render(expireStaleQuery("a", CARD, NOW));
  it("writes expired over the asker's open asks for the card at or before the floor, nothing else", () => {
    expect(q).toMatch(/update "spare_requests" xsr set status = 'expired' where xsr\.asker_user_id = \$1 and xsr\.oracle_id = \$2 and xsr\.status = 'open' and \(xsr\.created_at <= \$3::timestamptz/);
  });
  it("... and over one to someone no longer a friend, read on the row's own two ids", () => {
    expect(q).toMatch(/or not exists \(select 1 from "friend_links" xfl where xfl\.user_id = xsr\.asker_user_id and xfl\.friend_user_id = xsr\.holder_user_id\)\)$/);
    expect(params).toEqual(["a", CARD, openFloor(NOW).toISOString()]);
  });
});

describe("answerQuery", () => {
  const { q, params } = render(answerQuery("h", REQ, "no", NOW));
  it("answers only the holder's own open, unexpired ask", () => {
    expect(q).toMatch(/where asr\.id = \$3 and asr\.holder_user_id = \$4 and asr\.status = 'open' and asr\.created_at > \$5::timestamptz/);
    expect(params.slice(0, 5)).toEqual(["no", NOW.toISOString(), REQ, "h", openFloor(NOW).toISOString()]);
  });
  it("only while the holder still holds the friendship, read on the row's own two ids", () => {
    expect(q).toMatch(/exists \(select 1 from "friend_links" afl where afl\.user_id = asr\.holder_user_id and afl\.friend_user_id = asr\.asker_user_id for share\)/);
    expect(q).toMatch(/returning asr\.id, asr\.asker_user_id, asr\.oracle_id, asr\.standalone$/);
  });
});

describe("answerSpareRequest tells the asker", () => {
  const ROW = { id: REQ, asker_user_id: "a", oracle_id: CARD };
  const run = async (rows: unknown[]) => {
    const { db } = await import("../../db");
    const { recordFeedItem } = await import("./feed-write");
    const tx = { execute: vi.fn(async () => ({ rows, rowCount: rows.length })) };
    vi.mocked(db.transaction).mockImplementation((async (f: (t: typeof tx) => unknown) => f(tx)) as never);
    vi.mocked(recordFeedItem).mockClear();
    return { tx, recordFeedItem };
  };
  it("an answer that lands writes the asker's item in the same transaction, marked with the answer, keyed on the request", async () => {
    const { tx, recordFeedItem } = await run([ROW]);
    expect(await answerSpareRequest("h", REQ, "yes", ON, NOW)).toEqual({ ok: true });
    expect(recordFeedItem).toHaveBeenCalledTimes(1);
    expect(recordFeedItem).toHaveBeenCalledWith(tx, {
      userId: "a", kind: "spare-request", dedupeKey: REQ, oracleId: CARD, friendUserId: "h", data: { answer: "yes" }, now: NOW,
    });
  });
  it("locks both friendship rows in the purge's order BEFORE the answer, as every ask path does", async () => {
    const { tx } = await run([ROW]);
    await answerSpareRequest("h", REQ, "yes", ON, NOW);
    const sent = tx.execute.mock.calls.map((c) => render((c as unknown as [SQL])[0]).q);
    expect(sent[0]).toMatch(/^select aar\.asker_user_id from "spare_requests" aar where aar\.id = \$1 and aar\.holder_user_id = \$2$/);
    expect(sent[1]).toBe(render(lockFriendshipQuery("h", "a")).q);
    expect(sent[2]).toMatch(/^update "spare_requests" asr set status/);
  });
  it("a No is marked no", async () => {
    const { recordFeedItem } = await run([ROW]);
    await answerSpareRequest("h", REQ, "no", ON, NOW);
    expect(vi.mocked(recordFeedItem).mock.calls[0][1].data).toEqual({ answer: "no" });
  });
  it("the answer to a standalone ask is marked standalone, so Home's Yes line leaves out the buy press", async () => {
    const { recordFeedItem } = await run([{ ...ROW, standalone: true }]);
    await answerSpareRequest("h", REQ, "yes", ON, NOW);
    expect(vi.mocked(recordFeedItem).mock.calls[0][1].data).toEqual({ answer: "yes", standalone: true });
  });
  it("a request that is not the holder's tells nobody, and takes no lock", async () => {
    const { tx, recordFeedItem } = await run([]);
    expect(await answerSpareRequest("h", REQ, "yes", ON, NOW)).toEqual({ ok: false, reason: "gone" });
    expect(tx.execute).toHaveBeenCalledTimes(1);
    expect(recordFeedItem).not.toHaveBeenCalled();
  });
  it("an answer whose conditional UPDATE changed no row (answered, expired or withdrawn meanwhile) tells nobody", async () => {
    const { tx, recordFeedItem } = await run([ROW]);
    tx.execute
      .mockResolvedValueOnce({ rows: [ROW], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{}, {}], rowCount: 2 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    expect(await answerSpareRequest("h", REQ, "yes", ON, NOW)).toEqual({ ok: false, reason: "gone" });
    expect(tx.execute).toHaveBeenCalledTimes(3);
    expect(recordFeedItem).not.toHaveBeenCalled();
  });
});

describe("incomingAsksQuery", () => {
  const { q, params } = render(incomingAsksQuery("h", NOW));
  it("the holder's open, unexpired asks, joined to the live friendship, never a Clerk id out", () => {
    expect(q).toMatch(/join "friend_links" ifl on ifl\.user_id = isr\.holder_user_id and ifl\.friend_user_id = isr\.asker_user_id/);
    expect(q).toMatch(/where isr\.holder_user_id = \$1 and isr\.status = 'open' and isr\.created_at > \$2::timestamptz/);
    expect(q).toMatch(/^select isr\.id, isr\.oracle_id, isr\.created_at, isr\.copies, isp\.public_id::text as public_id, isp\.display_name,/);
    expect(q).not.toMatch(/asker_user_id as|asker_user_id,/);
    expect(params).toEqual(["h", openFloor(NOW).toISOString()]);
  });
  it("draws the card, the asker's face, and the asker's deck NAME only for the asker's own deck, every column aliased", () => {
    expect(q).toContain(`join "cards" ic on ic.oracle_id = isr.oracle_id`);
    expect(q).toContain(`left join "decks" idk on idk.id = isr.deck_id and idk.user_id = isr.asker_user_id`);
    expect(q).toContain(`left join "cards" icc on icc.oracle_id = isp.commander_oracle_id`);
    expect(q).toContain("ic.name as card_name, ic.image_uri as card_image, idk.name as deck_name");
  });
});

describe("loadIncomingAsks (G3: a card the holder no longer offers leaves Waiting on you)", () => {
  const row = (id: string, card: string) => ({
    id, oracle_id: card, created_at: "2026-10-20T12:00:00Z", copies: 2, public_id: "p1", display_name: "Ann",
    card_name: "Sol Ring", card_image: null, deck_name: "Dragons", commander_oracle_id: null, commander_name: null, commander_art: null,
  });
  it("keeps only asks for cards the holder still offers, with the holder's spare count and the days left", async () => {
    const { db } = await import("../../db");
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [row("r1", CARD), row("r2", REQ)] } as never);
    vi.mocked(loadOwnOffered).mockResolvedValueOnce(new Map([[CARD, 3]]));
    const asks = await loadIncomingAsks("h", ON, NOW);
    expect(vi.mocked(loadOwnOffered).mock.calls.at(-1)).toEqual(["h", [CARD, REQ], ON]);
    expect(asks.map((a) => [a.id, a.spare, a.copies, a.deckName, a.daysLeft])).toEqual([["r1", 3, 2, named("Dragons"), 12]]);
    expect(asks[0].asker).toEqual({ publicId: "p1", displayName: named("Ann"), commander: null });
  });

  it("the waiting count loads nothing past a zero count, and agrees with the filtered list past one", async () => {
    const { db } = await import("../../db");
    vi.mocked(loadOwnOffered).mockClear();
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [{ n: 0 }] } as never);
    expect(await waitingAsksCount("h", ON, NOW)).toBe(0);
    expect(loadOwnOffered).not.toHaveBeenCalled();
    vi.mocked(db.execute)
      .mockResolvedValueOnce({ rows: [{ n: 2 }] } as never)
      .mockResolvedValueOnce({ rows: [row("r1", CARD), row("r2", REQ)] } as never);
    vi.mocked(loadOwnOffered).mockResolvedValueOnce(new Map([[REQ, 1]]));
    expect(await waitingAsksCount("h", ON, NOW)).toBe(1);
  });
});

describe("the asker's ✕ (G1)", () => {
  it("withdraws only the asker's own OPEN, unexpired ask", () => {
    const { q, params } = render(withdrawQuery("a", REQ, NOW));
    expect(q).toBe(`update "spare_requests" wdr set status = 'withdrawn' where wdr.id = $1 and wdr.asker_user_id = $2 and wdr.status = 'open' and wdr.created_at > $3::timestamptz returning wdr.id`);
    expect(params).toEqual([REQ, "a", openFloor(NOW).toISOString()]);
  });

  it("clears an answered or expired ask from the asker's list, never deleting it, writing an open one past its days expired", () => {
    const { q, params } = render(clearQuery("a", REQ, NOW));
    expect(q).toMatch(/^update "spare_requests" csr set asker_cleared_at = \$1::timestamptz, status = case when csr\.status = 'open' then 'expired' else csr\.status end/);
    expect(q).toMatch(/where csr\.id = \$2 and csr\.asker_user_id = \$3 and csr\.asker_cleared_at is null and \(csr\.status in \('yes', 'no', 'expired'\) or \(csr\.status = 'open' and csr\.created_at <= \$4::timestamptz\)\) returning csr\.id$/);
    expect(q).not.toMatch(/delete/);
    expect(params).toEqual([NOW.toISOString(), REQ, "a", openFloor(NOW).toISOString()]);
  });

  it("tries the withdraw first, then the clear, and says which landed", async () => {
    const { db } = await import("../../db");
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [{ id: REQ }], rowCount: 1 } as never);
    expect(await closeSpareRequest("a", REQ, ON, NOW)).toEqual({ ok: true, closed: "withdrawn" });
    vi.mocked(db.execute)
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as never)
      .mockResolvedValueOnce({ rows: [{ id: REQ }], rowCount: 1 } as never);
    expect(await closeSpareRequest("a", REQ, ON, NOW)).toEqual({ ok: true, closed: "cleared" });
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [], rowCount: 0 } as never).mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    expect(await closeSpareRequest("a", REQ, ON, NOW)).toEqual({ ok: false, reason: "gone" });
    vi.mocked(db.execute).mockClear();
    expect(await closeSpareRequest("a", "nope", ON, NOW)).toEqual({ ok: false, reason: "gone" });
    expect(db.execute).not.toHaveBeenCalled();
  });
});

describe("Ask instead (G1: one transaction)", () => {
  it("withdraws only the asker's own open, unexpired ask for THIS card to ANOTHER friend", () => {
    const { q, params } = render(withdrawForInsteadQuery("a", REQ, CARD, "h2", NOW));
    expect(q).toBe(`update "spare_requests" isr set status = 'withdrawn' where isr.id = $1 and isr.asker_user_id = $2 and isr.oracle_id = $3 and isr.status = 'open' and isr.created_at > $4::timestamptz and isr.holder_user_id <> $5 returning isr.id`);
    expect(params).toEqual([REQ, "a", CARD, openFloor(NOW).toISOString(), "h2"]);
  });

  /** A transaction over a script of results, which rolls back (rejects) whenever its body throws. */
  async function scripted(results: unknown[], prior: unknown[] = []) {
    const { db } = await import("../../db");
    const ran: SQL[] = [];
    const seen = { rolledBack: false, inserted: [] as Record<string, unknown>[], priorWhere: [] as SQL[] };
    const tx = {
      execute: vi.fn(async (s: SQL) => { ran.push(s); return results.shift(); }),
      select: () => ({ from: () => ({ where: async (w: SQL) => { seen.priorWhere.push(w); return prior; } }) }),
      insert: () => ({ values: (v: Record<string, unknown>) => { seen.inserted.push(v); return { returning: async () => [{ id: "new" }] }; } }),
    };
    vi.mocked(db.transaction).mockImplementationOnce((async (fn: (t: unknown) => Promise<unknown>) => {
      try { return await fn(tx); } catch (e) { seen.rolledBack = true; throw e; }
    }) as never);
    vi.mocked(resolveFriend).mockResolvedValueOnce("h2");
    vi.mocked(loadFriendSpares).mockResolvedValueOnce([{ oracleId: CARD, friend: { publicId: REQ, displayName: named("Hope"), commander: null, pods: [] }, spare: 2 }]);
    return Object.assign(ran, { seen });
  }
  const FRIENDS = { rows: [{ user_id: "a" }, { user_id: "h2" }] };

  it("refuses `gone`, writing nothing more, when the first ask is not there to withdraw", async () => {
    const ran = await scripted([{ rows: [] }, FRIENDS, { rows: [], rowCount: 0 }]);
    expect(await askInsteadForSpare("a", REQ, REQ, CARD, ON, NOW)).toEqual({ ok: false, reason: "gone" });
    expect(ran).toHaveLength(3);
  });

  it("a refusal of the new ask (here, that friend's No inside the cooldown) rolls the withdraw back", async () => {
    const no = [{ holderUserId: "h2", status: "no", createdAt: new Date("2026-10-15T00:00:00Z"), answeredAt: new Date("2026-10-16T00:00:00Z") }];
    const ran = await scripted([{ rows: [] }, FRIENDS, { rows: [{ id: REQ }], rowCount: 1 }, { rows: [] }, FRIENDS, { rows: [] }], no);
    expect(await askInsteadForSpare("a", REQ, REQ, CARD, ON, NOW)).toEqual({ ok: false, reason: "declined" });
    // The withdraw ran, then the ask's own lock, friendship and expire: the refusal threw, so the transaction rolled back.
    expect(render(ran[2]).q).toMatch(/set status = 'withdrawn'/);
    expect(ran.seen.rolledBack).toBe(true);
  });

  it("reads every prior ask for the cooldown, cleared ones included (a cleared No still holds that friend back)", async () => {
    const no = [{ holderUserId: "h2", status: "no", createdAt: new Date("2026-10-15T00:00:00Z"), answeredAt: new Date("2026-10-16T00:00:00Z") }];
    const ran = await scripted([{ rows: [] }, FRIENDS, { rows: [{ id: REQ }], rowCount: 1 }, { rows: [] }, FRIENDS, { rows: [] }], no);
    await askInsteadForSpare("a", REQ, REQ, CARD, ON, NOW);
    expect(ran.seen.priorWhere.length).toBeGreaterThan(0);
    for (const w of ran.seen.priorWhere) expect(render(w).q).not.toMatch(/asker_cleared_at/);
  });

  it("lands the new ask after the withdraw, with the copies capped at the friend's spare count", async () => {
    // askLock, friendship, deck, withdraw; then askIn: askLock, friendship, deck (re-entrant), expire.
    const DECK = { rows: [{ id: CARD }] };
    const ran = await scripted([{ rows: [] }, FRIENDS, DECK, { rows: [{ id: REQ }], rowCount: 1 }, { rows: [] }, FRIENDS, DECK, { rows: [] }]);
    expect(await askInsteadForSpare("a", REQ, REQ, CARD, ON, NOW, { copies: 7, deckId: CARD })).toEqual({ ok: true, id: "new" });
    expect(ran.seen.rolledBack).toBe(false);
    // Shopping's and the cart's asks are stored for a list: never standalone.
    expect(ran.seen.inserted[0]).toMatchObject({ copies: 2, deckId: CARD, standalone: false });
    // One lock order: friendship (the purge's order), then the deck, then request rows (a deck delete's order).
    const qs = ran.map((q) => render(q).q);
    expect(qs[2]).toBe(`select odk.id from "decks" odk where odk.id = $1 and odk.user_id = $2 for key share`);
    const friendLock = (q: string) => q.includes("friend_links") && / for share$/.test(q.trim());
    expect(qs.findIndex(friendLock)).toBeGreaterThan(-1);
    expect(qs.findIndex(friendLock)).toBeLessThan(qs.findIndex((q) => q.includes("for key share")));
    expect(qs.findLastIndex(friendLock)).toBeLessThan(qs.findLastIndex((q) => q.includes("for key share")));
    expect(qs.findIndex((q) => q.includes("for key share"))).toBeLessThan(qs.findIndex((q) => q.includes("'withdrawn'")));
    expect(qs.findLastIndex((q) => q.includes("for key share"))).toBeLessThan(qs.findIndex((q) => q.includes("'expired'")));
  });

  it("stores no deck the asker does not own (or one a delete took first)", async () => {
    const ran = await scripted([{ rows: [] }, FRIENDS, { rows: [] }, { rows: [{ id: REQ }], rowCount: 1 }, { rows: [] }, FRIENDS, { rows: [] }, { rows: [] }]);
    expect(await askInsteadForSpare("a", REQ, REQ, CARD, ON, NOW, { copies: 1, deckId: CARD })).toEqual({ ok: true, id: "new" });
    expect(ran.seen.inserted[0]).toMatchObject({ copies: 1, deckId: null });
  });

  it("stores an ask from a friend's Spares tab as standalone, and nothing but a literal true as one", async () => {
    const tab = () => scripted([{ rows: [] }, FRIENDS, { rows: [{ id: REQ }], rowCount: 1 }, { rows: [] }, FRIENDS, { rows: [] }]);
    let ran = await tab();
    expect(await askInsteadForSpare("a", REQ, REQ, CARD, ON, NOW, { copies: 1, deckId: null, standalone: true })).toEqual({ ok: true, id: "new" });
    expect(ran.seen.inserted[0]).toMatchObject({ deckId: null, standalone: true });
    ran = await tab();
    expect(await askInsteadForSpare("a", REQ, REQ, CARD, ON, NOW, { copies: 1, deckId: null, standalone: "yes" })).toEqual({ ok: true, id: "new" });
    expect(ran.seen.inserted[0]).toMatchObject({ standalone: false });
  });
});

describe("ownDeckQuery", () => {
  it("the asker's own deck, by id and owner", () => {
    const { q, params } = render(ownDeckQuery("a", CARD));
    expect(q).toBe(`select odk.id from "decks" odk where odk.id = $1 and odk.user_id = $2 for key share`);
    expect(params).toEqual([CARD, "a"]);
  });
});

describe("myAsksQuery", () => {
  const { q, params } = render(myAsksQuery("a", NOW));
  it("the asker's asks to current friends since the shown floor, naming the holder by public id", () => {
    expect(q).toMatch(/join "friend_links" mfl on mfl\.user_id = msr\.asker_user_id and mfl\.friend_user_id = msr\.holder_user_id/);
    expect(q).toMatch(/where msr\.asker_user_id = \$1 and msr\.created_at > \$2::timestamptz and msr\.status <> 'withdrawn' and msr\.asker_cleared_at is null order by/);
    expect(q).not.toMatch(/asker_user_id,|holder_user_id,|holder_user_id as/);
    expect(params).toEqual(["a", shownFloor(NOW).toISOString()]);
  });
  it("keeps a cleared No inside its cooldown only when asked (Shopping's per-card read, never the list)", () => {
    const { q, params } = render(myAsksQuery("a", NOW, [CARD], true));
    expect(q).toMatch(/and \(msr\.asker_cleared_at is null or \(msr\.status = 'no' and msr\.answered_at > \$3::timestamptz\)\) and msr\.oracle_id = any\(\$4::uuid\[\]\) order by/);
    expect(params[2]).toBe(declineFloor(NOW).toISOString());
  });
  it("narrowed to the cards asked about, for the Shopping read", () => {
    const { q, params } = render(myAsksQuery("a", NOW, [CARD]));
    expect(q).toMatch(/and msr\.asker_cleared_at is null and msr\.oracle_id = any\(\$3::uuid\[\]\) order by/);
    expect(params[2]).toEqual([CARD]);
  });
});

const base = { copies: 1, card_name: "Sol Ring", card_image: null, deck_name: null, commander_oracle_id: null, commander_name: null, commander_art: null };

describe("loadMyAsks", () => {
  const OTHER = "2b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
  it("derives each ask's state and drops what the list no longer shows", async () => {
    const { db } = await import("../../db");
    vi.mocked(db.execute).mockResolvedValueOnce({
      rows: [
        { ...base, id: "r1", oracle_id: CARD, status: "open", created_at: "2026-10-20T12:00:00Z", answered_at: null, public_id: "p1", display_name: "Fay" },
        { ...base, id: "r2", oracle_id: CARD, status: "open", created_at: "2026-10-01T12:00:00Z", answered_at: null, public_id: "p1", display_name: "Fay" },
        { ...base, id: "r3", oracle_id: CARD, status: "no", created_at: "2026-09-26T12:00:00Z", answered_at: "2026-10-01T12:00:00Z", public_id: "p2", display_name: "Gus" },
        { ...base, id: "r4", oracle_id: CARD, status: "withdrawn", created_at: "2026-10-21T12:00:00Z", answered_at: null, public_id: "p2", display_name: "Gus" },
      ],
    } as never);
    vi.mocked(loadFriendSpares).mockResolvedValueOnce([{ oracleId: CARD, friend: { publicId: "p1", displayName: named("Fay"), commander: null, pods: [] }, spare: 1 }]);
    const asks = await loadMyAsks("a", ON, NOW);
    expect(asks.map((x) => [x.id, x.state, x.daysLeft])).toEqual([["r1", "open", 12], ["r2", "expired", null]]);
    expect(asks[0].holder).toEqual({ publicId: "p1", displayName: named("Fay"), commander: null });
  });

  it("an open ask reads unavailable when the holder no longer offers the card, unneeded when the asker no longer wants it (G3)", async () => {
    const { db } = await import("../../db");
    vi.mocked(db.execute).mockResolvedValueOnce({
      rows: [
        { ...base, id: "r1", oracle_id: CARD, status: "open", created_at: "2026-10-20T12:00:00Z", answered_at: null, public_id: "p1", display_name: "Fay" },
        { ...base, id: "r2", oracle_id: OTHER, status: "open", created_at: "2026-10-20T12:00:00Z", answered_at: null, public_id: "p2", display_name: "Gus" },
      ],
    } as never);
    // Fay still offers CARD; Gus no longer offers OTHER.
    vi.mocked(loadFriendSpares).mockResolvedValueOnce([{ oracleId: CARD, friend: { publicId: "p1", displayName: named("Fay"), commander: null, pods: [] }, spare: 1 }]);
    const asks = await loadMyAsks("a", ON, NOW, { stillNeeded: new Set([OTHER]) });
    expect(vi.mocked(loadFriendSpares).mock.calls.at(-1)).toEqual(["a", [CARD, OTHER]]);
    expect(asks.map((x) => [x.id, x.state])).toEqual([["r1", "unneeded"], ["r2", "unavailable"]]);
  });
});

describe("loadAskStates (GET /api/spare-requests)", () => {
  it("refuses an empty batch, one past the cap, or a non-id, before reading", async () => {
    const { db } = await import("../../db");
    vi.mocked(db.execute).mockClear();
    expect(await loadAskStates("a", [], ON, NOW)).toBeNull();
    expect(await loadAskStates("a", Array(201).fill(CARD), ON, NOW)).toBeNull();
    expect(await loadAskStates("a", [CARD, "nope"], ON, NOW)).toBeNull();
    expect(db.execute).not.toHaveBeenCalled();
  });

  it("serves each shown ask's state by public id, never a Clerk id, with dates as ISO strings", async () => {
    const { db } = await import("../../db");
    vi.mocked(db.execute).mockResolvedValueOnce({
      rows: [{ ...base, id: "r3", oracle_id: CARD, status: "no", created_at: "2026-10-10T12:00:00Z", answered_at: "2026-10-11T12:00:00Z", public_id: "p2", display_name: "Gus" }],
    } as never);
    expect(await loadAskStates("a", [CARD], ON, NOW)).toEqual([{
      id: "r3", oracleId: CARD, holder: { publicId: "p2", displayName: named("Gus") }, state: "no", daysLeft: null,
      createdAt: "2026-10-10T12:00:00.000Z", answeredAt: "2026-10-11T12:00:00.000Z",
    }]);
    expect(render(vi.mocked(db.execute).mock.calls.at(-1)![0] as SQL).q).toMatch(/msr\.status = 'no' and msr\.answered_at >/);
  });
});

describe("the Friends badge's spare-request queries", () => {
  it("waiting: the holder's open, unexpired asks from current friends", () => {
    const { q, params } = render(waitingAsksCountQuery("h", NOW));
    expect(q).toMatch(/join "friend_links" wfl on wfl\.user_id = wsr\.holder_user_id and wfl\.friend_user_id = wsr\.asker_user_id/);
    expect(q).toMatch(/where wsr\.holder_user_id = \$1 and wsr\.status = 'open' and wsr\.created_at > \$2::timestamptz and not exists \(/);
    // A hidden ask (✕) is not counted: the holder's own feed item for it carries the dismissal.
    expect(q).toMatch(/where dfi\.user_id = wsr\.holder_user_id and dfi\.kind = 'spare-request' and dfi\.dedupe_key = wsr\.id::text and dfi\.data ->> 'answer' is null\)$/);
    expect(params).toEqual(["h", openFloor(NOW).toISOString()]);
  });

  it("unseen answers: answered after the reader's Friends cursor, inside the shown window, to current friends", () => {
    const { q, params } = render(unseenAnswersCountQuery("a", NOW));
    expect(q).toMatch(/join "friend_links" ufl on ufl\.user_id = usr\.asker_user_id and ufl\.friend_user_id = usr\.holder_user_id/);
    expect(q).toMatch(/usr\.status in \('yes', 'no'\) and usr\.asker_cleared_at is null and usr\.answered_at > \$2::timestamptz/);
    expect(q).toMatch(/and usr\.answered_at > coalesce\( \(select uup\.friends_seen_at from "user_prefs" uup where uup\.user_id = \$3\), '-infinity'::timestamptz\)/);
    // An answer opened one by one (the answer sheet over Home) is seen whatever the cursor says.
    expect(q).toContain("and (usr.asker_seen_at is null or usr.answered_at > usr.asker_seen_at)");
    expect(params).toEqual(["a", openFloor(NOW).toISOString(), "a"]);
  });

  it("seen: an upsert that writes only while an unseen answer exists and never moves the cursor back", () => {
    const { q } = render(markAnswersSeenQuery("a", NOW));
    expect(q).toMatch(/^insert into "user_prefs" as mup \(user_id, friends_seen_at\) select \$1, \$2::timestamptz where exists \(select 1 from "spare_requests" usr/);
    expect(q).toMatch(/on conflict \(user_id\) do update set friends_seen_at = excluded\.friends_seen_at where mup\.friends_seen_at is null or mup\.friends_seen_at < excluded\.friends_seen_at$/);
  });

  it("off, nothing is read or written", async () => {
    const { db } = await import("../../db");
    vi.mocked(db.execute).mockClear();
    expect(await waitingAsksCount("h", {} as NodeJS.ProcessEnv, NOW)).toBe(0);
    expect(await unseenAnswersCount("a", {} as NodeJS.ProcessEnv, NOW)).toBe(0);
    expect(await markAnswersSeen("a", {} as NodeJS.ProcessEnv, NOW)).toBe(false);
    expect(db.execute).not.toHaveBeenCalled();
  });
});

describe("markAnswerSeenQuery (small items item 3)", () => {
  it("marks ONE answer of the reader's own, only while that answer is unseen by the mark", () => {
    const { sql, params } = new PgDialect().sqlToQuery(markAnswerSeenQuery("a", "44444444-4444-4444-8444-444444444444", NOW));
    const q = sql.replace(/\s+/g, " ");
    expect(q).toBe(
      "update \"spare_requests\" asr set asker_seen_at = $1::timestamptz where asr.id = $2::uuid and asr.asker_user_id = $3 and asr.status in ('yes', 'no') and asr.asker_seen_at is null",
    );
    expect(params).toEqual([NOW.toISOString(), "44444444-4444-4444-8444-444444444444", "a"]);
  });
});
