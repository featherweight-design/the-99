import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: { execute: vi.fn(), transaction: vi.fn() } }));
vi.mock("./spares", () => ({ loadFriendSpares: vi.fn(async () => []) }));
vi.mock("./access", () => ({ resolveFriend: vi.fn() }));
vi.mock("./feed-write", () => ({ recordFeedItem: vi.fn(async () => true) }));

import { db } from "../../db";
import { resolveFriend } from "./access";
import { recordFeedItem } from "./feed-write";
import { loadFriendSpares } from "./spares";
import { TRADE_ROUND_MAX, tradeOpenFloor } from "./trade-rules";
import {
  answerTrade, answerTradeQuery, clearTradeQuery, counterQuery, counterTrade, markTradedQuery, proposeInsertQuery, proposeTrade,
  rescindTradeQuery, reviseRoundQuery, reviseTrade, roundInsertQuery, sidesOf, storedCards, tradeCapQuery, tradeHeadQuery,
  tradeLockQuery, withdrawTrade, withdrawTradeQuery,
} from "./trades";

const NOW = new Date("2026-11-27T12:00:00Z");
const FLOOR = tradeOpenFloor(NOW).toISOString();
const T = "2b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const A = "0b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const B = "1b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const C = "3b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const REQ = "4b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const PV = "5b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const PF = "6b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";

const render = (q: SQL) => {
  const { sql, params } = new PgDialect().sqlToQuery(q);
  return { q: sql.replace(/\s+/g, " "), params };
};

/** Every conditional statement: the viewer is a party, and the friendship to the other party still stands, FOR SHARE. */
function expectHeld(q: string, t: string, fl: string) {
  expect(q).toContain(`(${t}.proposer_user_id = $`);
  expect(q).toContain(`or ${t}.recipient_user_id = $`);
  expect(q).toMatch(new RegExp(`exists \\(select 1 from "friend_links" ${fl} where ${fl}\\.user_id = \\$\\d+ and ${fl}\\.friend_user_id = case when ${t}\\.proposer_user_id = \\$\\d+ then ${t}\\.recipient_user_id else ${t}\\.proposer_user_id end for share\\)`));
}

describe("the statements, aliased and qualified", () => {
  it("the pair's lock is one key whichever side writes", () => {
    const ab = render(tradeLockQuery("a", "b"));
    expect(ab.q).toBe("select pg_advisory_xact_lock(hashtextextended($1, 0))");
    expect(ab.params).toEqual(["trade:a:b"]);
    expect(render(tradeLockQuery("b", "a")).params).toEqual(["trade:a:b"]);
  });

  it("the head joins both profiles and the live friendship", () => {
    const { q } = render(tradeHeadQuery("v", T));
    expect(q).toContain('from "trades" htr join "social_profiles" hpp on hpp.user_id = htr.proposer_user_id');
    expect(q).toContain("hfl.friend_user_id = case when htr.proposer_user_id = $");
    expect(q).toContain("where htr.id = $");
  });

  it("the cap reads the pair's open trades, either way round", () => {
    const { q, params } = render(tradeCapQuery("v", "f"));
    expect(q).toContain("where ctr.status = 'open' and ((ctr.proposer_user_id = $1 and ctr.recipient_user_id = $2) or (ctr.proposer_user_id = $3 and ctr.recipient_user_id = $4))");
    expect(params).toEqual(["v", "f", "f", "v"]);
  });

  it("a propose writes the trade, round 1 and its cards in one statement", () => {
    const { q, params } = render(proposeInsertQuery("v", "f", [{ side: "proposer", oracleId: A }, { side: "recipient", oracleId: B }], null, NOW));
    expect(q).toContain('insert into "trades" (proposer_user_id, recipient_user_id, offered_by_user_id, round, from_request_id, created_at)');
    expect(q).toContain('insert into "trade_rounds" (trade_id, round, offered_at) select t.id, 1,');
    expect(q).toContain("(values ($7, $8::uuid), ($9, $10::uuid)) as v(side, oracle_id)");
    expect(params.slice(0, 3)).toEqual(["v", "f", "v"]);
    expect(params.slice(6)).toEqual(["proposer", A, "recipient", B]);
  });

  it("a counter: the non-author, open, unexpired, at the round seen, below the cap", () => {
    const { q, params } = render(counterQuery("v", T, 3, NOW));
    expect(q).toContain("set round = ctr.round + 1, offered_by_user_id = $1");
    expect(q).toContain("and ctr.offered_by_user_id <> $");
    expect(q).toContain("ctr.status = 'open' and ctr.created_at > $");
    expect(q).toMatch(/ctr\.round = \$\d+ and ctr\.round < \$\d+/);
    expect(params).toContain(FLOOR);
    expect(params).toContain(3);
    expect(params).toContain(TRADE_ROUND_MAX);
    expectHeld(q, "ctr", "cfl");
  });

  it("a counter's round casts its number", () => {
    expect(render(roundInsertQuery(T, 2, [{ side: "recipient", oracleId: A }], NOW)).q).toMatch(/select r\.trade_id, \$\d+::int, v\.side, v\.oracle_id/);
  });

  it("a revise: the author's own open offer at the round seen", () => {
    const { q, params } = render(reviseRoundQuery("v", T, 2, NOW));
    expect(q).toContain('update "trade_rounds" rvr set offered_at = $1::timestamptz from "trades" rtr where rvr.trade_id = rtr.id and rvr.round = rtr.round');
    expect(q).toContain("rtr.offered_by_user_id = $");
    expect(q).toContain("rtr.status = 'open' and rtr.created_at > $");
    expect(params).toContain(FLOOR);
    expectHeld(q, "rtr", "rfl");
  });

  it("Yes and No: the non-author, open, unexpired, at the round seen; No ends it by the viewer", () => {
    const yes = render(answerTradeQuery("v", T, 1, "yes", NOW));
    expect(yes.q).toContain("set status = 'accepted', answered_at = $1::timestamptz where atr.id");
    expect(yes.q).toContain("atr.offered_by_user_id <> $");
    expect(yes.q).toContain("atr.status = 'open' and atr.created_at > $");
    expect(yes.params).toContain(FLOOR);
    expectHeld(yes.q, "atr", "afl");
    const no = render(answerTradeQuery("v", T, 1, "no", NOW));
    expect(no.q).toContain("set status = 'declined', answered_at = $1::timestamptz, ended_at = $2::timestamptz, ended_by_user_id = $3");
    expect(no.params[2]).toBe("v");
  });

  it("a withdraw: the author's open, unexpired offer at the round seen", () => {
    const { q, params } = render(withdrawTradeQuery("v", T, 1, NOW));
    expect(q).toContain("set status = 'withdrawn', ended_at = $1::timestamptz, ended_by_user_id = $2");
    expect(q).toContain("wtr.offered_by_user_id = $");
    expect(q).toContain("wtr.status = 'open' and wtr.created_at > $");
    expect(params).toContain(FLOOR);
    expectHeld(q, "wtr", "wfl");
  });

  it("a rescind: either side of an accepted trade, no floor", () => {
    const { q, params } = render(rescindTradeQuery("v", T, NOW));
    expect(q).toContain("xtr.status = 'accepted'");
    expect(params).not.toContain(FLOOR);
    expectHeld(q, "xtr", "xfl");
  });

  it("a mark sets the viewer's own mark and traded when the other is set, only once", () => {
    const { q } = render(markTradedQuery("v", T, NOW));
    expect(q).toContain("proposer_marked_at = case when mtr.proposer_user_id = $");
    expect(q).toMatch(/status = case when case when mtr\.proposer_user_id = \$\d+ then mtr\.recipient_marked_at else mtr\.proposer_marked_at end is not null then 'traded' else mtr\.status end/);
    expect(q).toMatch(/mtr\.status = 'accepted' and case when mtr\.proposer_user_id = \$\d+ then mtr\.proposer_marked_at else mtr\.recipient_marked_at end is null/);
    expectHeld(q, "mtr", "mfl");
  });

  it("a clear: an ended trade, a derived-expired open one included, written expired as it goes", () => {
    const { q, params } = render(clearTradeQuery("v", T, NOW));
    expect(q).toContain("status = case when ltr.status = 'open' then 'expired' else ltr.status end");
    expect(q).toContain("ltr.status in ('traded', 'declined', 'withdrawn', 'rescinded', 'expired') or (ltr.status = 'open' and ltr.created_at <= $");
    expect(q).not.toContain("'accepted'");
    expect(params).toContain(FLOOR);
    expectHeld(q, "ltr", "lfl");
  });
});

describe("sides", () => {
  it("yours is the viewer's spare, theirs the friend's, whichever role the viewer has", () => {
    const sides = { yours: [A], theirs: [B] };
    expect(storedCards("recipient", sides)).toEqual([{ side: "recipient", oracleId: A }, { side: "proposer", oracleId: B }]);
    expect(sidesOf("recipient", storedCards("recipient", sides))).toEqual(sides);
    expect(sidesOf("proposer", storedCards("recipient", sides))).toEqual({ yours: [B], theirs: [A] });
  });
});

/** A transaction whose statements answer by what they say. */
function txAnswering(answer: (q: string) => { rows: unknown[]; rowCount?: number }) {
  const tx = { execute: vi.fn(async (s: SQL) => answer(render(s).q)) };
  vi.mocked(db.transaction).mockImplementation((async (f: (t: typeof tx) => unknown) => f(tx)) as never);
  return tx;
}
const LINKS = { rows: [{ user_id: "f" }, { user_id: "v" }] };
const sent = (tx: { execute: ReturnType<typeof vi.fn> }) => tx.execute.mock.calls.map((c) => render((c as unknown as [SQL])[0]).q);

/** Every card asked for is spare, as its receiver sees it: the viewer sees PF's, the friend sees PV's. */
function allSpare(except: string[] = []) {
  vi.mocked(loadFriendSpares).mockImplementation(async (receiver, ids) =>
    ids.filter((id) => !except.includes(id)).map((oracleId) => ({ oracleId, friend: { publicId: receiver === "v" ? PF : PV } as never, spare: 1 })));
}

function head(over: Record<string, unknown> = {}) {
  return {
    id: T, status: "open", round: 1, proposer_user_id: "f", recipient_user_id: "v", offered_by_user_id: "f",
    proposer_public_id: PF, recipient_public_id: PV, ...over,
  };
}

beforeEach(() => {
  vi.mocked(db.execute).mockReset();
  vi.mocked(db.transaction).mockReset();
  vi.mocked(recordFeedItem).mockClear();
  vi.mocked(resolveFriend).mockResolvedValue("f");
  allSpare();
});

describe("proposeTrade", () => {
  const SIDES = { theirs: [A], yours: [B] };
  const respond = (cap: unknown[] = []) => txAnswering((q) => {
    if (q.includes("from \"friend_links\" sfl")) return LINKS;
    if (q.includes("from \"trades\" ctr")) return { rows: cap };
    if (q.startsWith("with t as")) return { rows: [{ id: T }] };
    return { rows: [] };
  });

  it("locks the pair, then both friendships, then reads the cap, then writes and tells the friend", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [{ public_id: PV }] } as never);
    const tx = respond();
    expect(await proposeTrade("v", PF, SIDES, null, NOW)).toEqual({ ok: true, id: T });
    const qs = sent(tx);
    expect(qs[0]).toContain("pg_advisory_xact_lock");
    expect(qs[1]).toContain('from "friend_links" sfl');
    expect(qs[2]).toContain('from "trades" ctr');
    expect(qs[3]).toMatch(/^with t as/);
    expect(recordFeedItem).toHaveBeenCalledWith(tx, {
      userId: "f", kind: "trade", dedupeKey: `${T}:1:offer`, friendUserId: "v", data: { trade: T, round: 1, event: "offer" }, now: NOW,
    });
  });

  it("reads each side's cards as its receiver sees them", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [{ public_id: PV }] } as never);
    respond();
    await proposeTrade("v", PF, SIDES, null, NOW);
    expect(vi.mocked(loadFriendSpares).mock.calls).toEqual(expect.arrayContaining([["v", [A]], ["f", [B]]]));
  });

  it("a card no longer spare refuses before any write", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [{ public_id: PV }] } as never);
    allSpare([B]);
    expect(await proposeTrade("v", PF, SIDES, null, NOW)).toEqual({ ok: false, reason: "not-spare" });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("an unanswered offer of the viewer's to this friend holds a new one back (Q10)", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [{ public_id: PV }] } as never);
    respond([{ status: "open", created_at: NOW.toISOString(), proposer_user_id: "v", recipient_user_id: "f", round: 1 }]);
    expect(await proposeTrade("v", PF, SIDES, null, NOW)).toEqual({ ok: false, reason: "held" });
    expect(recordFeedItem).not.toHaveBeenCalled();
  });

  it("the friend's own open offer does not hold the viewer back", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [{ public_id: PV }] } as never);
    respond([{ status: "open", created_at: NOW.toISOString(), proposer_user_id: "f", recipient_user_id: "v", round: 1 }]);
    expect(await proposeTrade("v", PF, SIDES, null, NOW)).toEqual({ ok: true, id: T });
  });

  it("a friendship gone under the lock refuses", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [{ public_id: PV }] } as never);
    txAnswering(() => ({ rows: [] }));
    expect(await proposeTrade("v", PF, SIDES, null, NOW)).toEqual({ ok: false, reason: "not-friend" });
  });

  it("from a request: the request's card goes on the viewer's side, and a second trade from it is used", async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce({ rows: [{ public_id: PV }] } as never)
      .mockResolvedValueOnce({ rows: [{ oracle_id: C }] } as never);
    const tx = respond();
    await proposeTrade("v", PF, SIDES, REQ, NOW);
    const insert = tx.execute.mock.calls.map((c) => render((c as unknown as [SQL])[0])).find((r) => r.q.startsWith("with t as"))!;
    expect(insert.params).toContain(REQ);
    expect(insert.params).toEqual(expect.arrayContaining(["proposer", C]));

    vi.mocked(db.execute)
      .mockResolvedValueOnce({ rows: [{ public_id: PV }] } as never)
      .mockResolvedValueOnce({ rows: [{ oracle_id: C }] } as never);
    txAnswering((q) => {
      if (q.includes("sfl")) return LINKS;
      if (q.startsWith("with t as")) throw Object.assign(new Error("dup"), { cause: { code: "23505", constraint: "trades_from_request_once" } });
      return { rows: [] };
    });
    expect(await proposeTrade("v", PF, SIDES, REQ, NOW)).toEqual({ ok: false, reason: "used" });
  });

  it("a unique violation on any other constraint is not read as used", async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce({ rows: [{ public_id: PV }] } as never)
      .mockResolvedValueOnce({ rows: [{ oracle_id: C }] } as never);
    txAnswering((q) => {
      if (q.includes("sfl")) return LINKS;
      if (q.startsWith("with t as")) throw Object.assign(new Error("dup"), { code: "23505", constraint: "some_other_key" });
      return { rows: [] };
    });
    await expect(proposeTrade("v", PF, SIDES, REQ, NOW)).rejects.toThrow("dup");
  });

  it("a request that is not the viewer's Yes to this friend refuses", async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce({ rows: [{ public_id: PV }] } as never)
      .mockResolvedValueOnce({ rows: [] } as never);
    expect(await proposeTrade("v", PF, SIDES, REQ, NOW)).toEqual({ ok: false, reason: "gone" });
  });

  it("malformed sides or ids change nothing", async () => {
    expect(await proposeTrade("v", PF, { theirs: [], yours: [B] }, null, NOW)).toEqual({ ok: false, reason: "gone" });
    expect(await proposeTrade("v", "nope", SIDES, null, NOW)).toEqual({ ok: false, reason: "not-friend" });
    expect(await proposeTrade("v", PF, SIDES, "nope", NOW)).toEqual({ ok: false, reason: "gone" });
    expect(db.execute).not.toHaveBeenCalled();
  });
});

describe("counterTrade", () => {
  it("writes the next round and tells the friend, keyed on that round", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [head()] } as never);
    const tx = txAnswering((q) => {
      if (q.includes("sfl")) return LINKS;
      if (q.startsWith('update "trades" ctr')) return { rows: [{ id: T, round: 2 }] };
      return { rows: [] };
    });
    expect(await counterTrade("v", T, 1, { theirs: [A], yours: [B] }, NOW)).toEqual({ ok: true, round: 2 });
    const round = tx.execute.mock.calls.map((c) => render((c as unknown as [SQL])[0])).find((r) => r.q.startsWith("with r as"))!;
    // The viewer is the recipient: their own card is stored on the recipient's side.
    expect(round.params).toEqual(expect.arrayContaining(["recipient", B, "proposer", A]));
    expect(recordFeedItem).toHaveBeenCalledWith(tx, expect.objectContaining({ userId: "f", dedupeKey: `${T}:2:counter`, data: { trade: T, round: 2, event: "counter" } }));
  });

  it("the author, or a stale round, cannot counter", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [head({ offered_by_user_id: "v", proposer_user_id: "v", recipient_user_id: "f" })] } as never);
    expect(await counterTrade("v", T, 1, { theirs: [A], yours: [B] }, NOW)).toEqual({ ok: false, reason: "gone" });
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [head({ round: 2 })] } as never);
    expect(await counterTrade("v", T, 1, { theirs: [A], yours: [B] }, NOW)).toEqual({ ok: false, reason: "gone" });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("a statement that changed nothing writes no round and tells nobody", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [head()] } as never);
    const tx = txAnswering((q) => (q.includes("sfl") ? LINKS : { rows: [] }));
    expect(await counterTrade("v", T, 1, { theirs: [A], yours: [B] }, NOW)).toEqual({ ok: false, reason: "gone" });
    expect(sent(tx).some((q) => q.startsWith("with r as"))).toBe(false);
    expect(recordFeedItem).not.toHaveBeenCalled();
  });
});

describe("answerTrade", () => {
  it("Yes re-checks the round's cards and refuses a gone one", async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce({ rows: [head()] } as never)
      .mockResolvedValueOnce({ rows: [{ side: "proposer", oracle_id: A }, { side: "recipient", oracle_id: B }] } as never);
    allSpare([A]);
    expect(await answerTrade("v", T, 1, "yes", NOW)).toEqual({ ok: false, reason: "not-spare" });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("Yes tells the author accept; No tells decline without reading cards", async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce({ rows: [head()] } as never)
      .mockResolvedValueOnce({ rows: [{ side: "proposer", oracle_id: A }] } as never);
    const answered = (q: string) => (q.includes("sfl") ? LINKS : q.startsWith('update "trades" atr') ? { rows: [{ id: T, round: 1, offered_by_user_id: "f" }] } : { rows: [] });
    let tx = txAnswering(answered);
    expect(await answerTrade("v", T, 1, "yes", NOW)).toEqual({ ok: true });
    expect(recordFeedItem).toHaveBeenCalledWith(tx, expect.objectContaining({ userId: "f", dedupeKey: `${T}:1:accept` }));

    vi.mocked(recordFeedItem).mockClear();
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [head()] } as never);
    tx = txAnswering(answered);
    expect(await answerTrade("v", T, 1, "no", NOW)).toEqual({ ok: true });
    expect(db.execute).toHaveBeenCalledTimes(3);
    expect(recordFeedItem).toHaveBeenCalledWith(tx, expect.objectContaining({ userId: "f", dedupeKey: `${T}:1:decline` }));
  });
});

describe("reviseTrade", () => {
  const mine = head({ proposer_user_id: "v", recipient_user_id: "f", offered_by_user_id: "v", proposer_public_id: PV, recipient_public_id: PF });

  it("refuses while every card on the offer is still spare (only in Needs a look)", async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce({ rows: [mine] } as never)
      .mockResolvedValueOnce({ rows: [{ side: "proposer", oracle_id: B }, { side: "recipient", oracle_id: A }] } as never);
    expect(await reviseTrade("v", T, 1, { theirs: [A], yours: [C] }, NOW)).toEqual({ ok: false, reason: "gone" });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it("rewrites the round's cards in place and tells nobody", async () => {
    vi.mocked(db.execute)
      .mockResolvedValueOnce({ rows: [mine] } as never)
      .mockResolvedValueOnce({ rows: [{ side: "proposer", oracle_id: B }, { side: "recipient", oracle_id: A }] } as never);
    allSpare([B]);
    const tx = txAnswering((q) => (q.includes("sfl") ? LINKS : q.startsWith('update "trade_rounds" rvr') ? { rows: [{ round: 1 }], rowCount: 1 } : { rows: [] }));
    expect(await reviseTrade("v", T, 1, { theirs: [A], yours: [C] }, NOW)).toEqual({ ok: true });
    const qs = sent(tx);
    expect(qs.findIndex((q) => q.startsWith('delete from "trade_cards" dtc'))).toBeGreaterThan(qs.findIndex((q) => q.startsWith('update "trade_rounds"')));
    expect(qs.some((q) => q.startsWith('insert into "trade_cards"'))).toBe(true);
    expect(recordFeedItem).not.toHaveBeenCalled();
  });
});

describe("withdrawTrade", () => {
  it("tells nobody, and a statement that changed nothing is gone", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [head({ offered_by_user_id: "v", proposer_user_id: "v", recipient_user_id: "f" })] } as never);
    txAnswering((q) => (q.includes("sfl") ? LINKS : q.startsWith('update "trades" wtr') ? { rows: [{ id: T }], rowCount: 1 } : { rows: [] }));
    expect(await withdrawTrade("v", T, 1, NOW)).toEqual({ ok: true });
    expect(recordFeedItem).not.toHaveBeenCalled();

    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [head()] } as never);
    txAnswering((q) => (q.includes("sfl") ? LINKS : { rows: [], rowCount: 0 }));
    expect(await withdrawTrade("v", T, 1, NOW)).toEqual({ ok: false, reason: "gone" });
  });

  it("a trade the viewer cannot see (not a party, or no longer friends) is gone", async () => {
    vi.mocked(db.execute).mockResolvedValueOnce({ rows: [] } as never);
    expect(await withdrawTrade("v", T, 1, NOW)).toEqual({ ok: false, reason: "gone" });
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
