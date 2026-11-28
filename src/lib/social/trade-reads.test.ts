// Friend trades' reads (PR 4): every statement names the viewer as a party AND joins the live friendship to the other
// party in the same statement, every column is qualified by its alias, and the sheet hands back the round's
// `offered_at` at millisecond precision, the `seenAt` a counter and an answer compare against.
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: { execute: vi.fn() } }));
vi.mock("./spares", () => ({ loadFriendSpares: vi.fn(async () => []) }));
vi.mock("../decks/price-query", () => ({ loadPrices: vi.fn() }));

import { db } from "../../db";
import { loadPrices } from "../decks/price-query";
import { isThirdPartyName } from "../person-name/brand";
import { loadFriendSpares } from "./spares";
import {
  loadOfferedTo, loadTrade, loadTradeRows, loadTradesWith, offeredToQuery, tradeRowsQuery, tradesWaitingQuery, tradesWaitingWith,
  tradeViewCardsQuery, tradeViewQuery,
} from "./trade-reads";
import { tradeOpenFloor } from "./trade-rules";

const NOW = new Date("2026-11-27T12:00:00Z");
const T = "2b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const A = "0b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const B = "1b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const C = "3b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const PF = "6b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const PV = "5b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const SEEN = "2026-11-26T09:30:00.123Z";

const render = (q: SQL) => {
  const { sql, params } = new PgDialect().sqlToQuery(q);
  return { q: sql.replace(/\s+/g, " "), params };
};
const exec = vi.mocked(db.execute);
const rows = (r: unknown[]) => ({ rows: r }) as never;

/** The statement reads only the viewer's trades, through the live friendship to the other party. */
function expectScoped(q: string, t: string, fl: string) {
  expect(q).toContain(`(${t}.proposer_user_id = $`);
  expect(q).toContain(`or ${t}.recipient_user_id = $`);
  expect(q).toMatch(new RegExp(`join "friend_links" ${fl} on ${fl}\\.user_id = \\$\\d+ and ${fl}\\.friend_user_id = case when ${t}\\.proposer_user_id = \\$\\d+ then ${t}\\.recipient_user_id else ${t}\\.proposer_user_id end`));
}

const head = (over: Record<string, unknown> = {}) => ({
  id: T, status: "open", round: 1, proposer_user_id: "v", recipient_user_id: "f", created_at: "2026-11-26T09:30:00.123Z",
  ended_by_user_id: null, proposer_marked_at: null, recipient_marked_at: null, from_request_id: null,
  offered_at: SEEN, friend_user_id: "f", public_id: PF, display_name: "Colin",
  commander_oracle_id: null, commander_name: null, commander_art: null, own_public_id: PV, ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  // Every card still spare by default: the viewer ("v") sees the friend's, the friend ("f") sees the viewer's.
  vi.mocked(loadFriendSpares).mockImplementation(async (receiver, ids) =>
    ids.map((id) => ({ oracleId: id, spare: 1, friend: { publicId: receiver === "v" ? PF : PV } })) as never);
  vi.mocked(loadPrices).mockResolvedValue({ prices: new Map() } as never);
});

describe("the statements", () => {
  it("reads the sheet's head through the party and the friendship, offered_at to the millisecond", () => {
    const { q, params } = render(tradeViewQuery("v", T));
    expectScoped(q, "vtr", "vfl");
    expect(q).toContain(`to_char(date_trunc('milliseconds', vrd.offered_at) at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as offered_at`);
    expect(q).toContain("join \"trade_rounds\" vrd on vrd.trade_id = vtr.id and vrd.round = vtr.round");
    expect(q).toContain("join \"social_profiles\" vfp on vfp.user_id = vfl.friend_user_id");
    expect(q).toContain("vfp.public_id::text as public_id");
    expect(q).toContain("where vtr.id = $");
    expect(params).toContain(T);
  });

  it("reads the cards again through the party and the friendship, the current and previous rounds only", () => {
    const { q } = render(tradeViewCardsQuery("v", T));
    expect(q).toContain("ctc.round in (ctr.round, ctr.round - 1)");
    expect(q).toContain("(ctr.proposer_user_id = $");
    expect(q).toMatch(/exists \(select 1 from "friend_links" cfl where cfl\.user_id = \$\d+ and cfl\.friend_user_id = case when ctr\.proposer_user_id/);
  });

  it("lists only the viewer's uncleared trades, the current round's cards aliased in the subquery", () => {
    const { q, params } = render(tradeRowsQuery("v", null, NOW));
    expectScoped(q, "ltr", "lfl");
    expect(q).toContain("(case when ltr.proposer_user_id = $");
    expect(q).toContain("then ltr.proposer_cleared_at else ltr.recipient_cleared_at end) is null");
    expect(q).toContain("where ltc.trade_id = ltr.id and ltc.round = ltr.round");
    expect(q).not.toContain("lfp.public_id = $");
    expect(params.at(-1)).toBe(200);
    // Live trades sort ahead of ended ones, so the 200 cap never drops a trade still waiting on someone.
    expect(q).toContain("order by (ltr.status = 'accepted' or (ltr.status = 'open' and ltr.created_at > $");
    expect(params).toContain(tradeOpenFloor(NOW).toISOString());
    expect(render(tradeRowsQuery("v", PF, NOW)).q).toContain("and lfp.public_id = $");
  });

  it("finds the viewer's own side of open, unexpired trades for the picker's already-offered mark", () => {
    const { q, params } = render(offeredToQuery("v", [A, B], NOW));
    expectScoped(q, "otr", "ofl");
    expect(q).toContain("otr.status = 'open' and otr.created_at > $");
    expect(q).toContain("otc.side = (case when otr.proposer_user_id = $");
    expect(q).toMatch(/otc\.oracle_id in \(\$\d+::uuid, \$\d+::uuid\)/);
    expect(params).toContain(tradeOpenFloor(NOW).toISOString());
  });

  it("reads the strip's waiting facts through the friendship", () => {
    const { q } = render(tradesWaitingQuery("v"));
    expectScoped(q, "wtr", "wfl");
    expect(q).toContain("wtr.status in ('open', 'accepted')");
  });
});

describe("loadTrade", () => {
  it("refuses a malformed id before any read", async () => {
    expect(await loadTrade("v", "nope", "manapool", NOW)).toBeNull();
    expect(exec).not.toHaveBeenCalled();
  });

  it("is null for a trade the viewer cannot reach", async () => {
    exec.mockResolvedValueOnce(rows([]));
    expect(await loadTrade("v", T, "manapool", NOW)).toBeNull();
    expect(exec).toHaveBeenCalledTimes(1);
  });

  it("hands back the round's offered_at as seenAt, the sides from the viewer's seat, and what they may press", async () => {
    exec.mockResolvedValueOnce(rows([head({ round: 2, recipient_user_id: "v", proposer_user_id: "f" })]));
    exec.mockResolvedValueOnce(rows([
      { round: 1, side: "proposer", oracle_id: A, name: "Arcane Signet", image_uri: null },
      { round: 1, side: "recipient", oracle_id: C, name: "Cultivate", image_uri: null },
      { round: 2, side: "proposer", oracle_id: A, name: "Arcane Signet", image_uri: null },
      { round: 2, side: "recipient", oracle_id: B, name: "Brainstorm", image_uri: "b.jpg" },
    ]));
    const view = await loadTrade("v", T, "manapool", NOW);
    expect(view?.offeredAt).toBe(SEEN);
    // Round 2 is the recipient's (the viewer's) own counter.
    expect(view?.state).toBe("yours");
    expect(view?.cards.yours).toEqual([{ oracleId: B, name: "Brainstorm", imageUri: "b.jpg" }]);
    expect(view?.cards.theirs.map((c) => c.oracleId)).toEqual([A]);
    expect(view?.cards.previous?.yours.map((c) => c.oracleId)).toEqual([C]);
    expect(view?.can.withdraw).toBe(true);
    expect(view?.can.accept).toBe(false);
    expect(view?.friend.publicId).toBe(PF);
    expect(isThirdPartyName(view?.friend.displayName)).toBe(true);
    expect(JSON.stringify(view)).not.toContain('"f"');
  });

  it("marks the cards no longer spare, each as its receiver sees it, and holds Yes", async () => {
    exec.mockResolvedValueOnce(rows([head({ proposer_user_id: "f", recipient_user_id: "v" })]));
    exec.mockResolvedValueOnce(rows([
      { round: 1, side: "proposer", oracle_id: A, name: "Arcane Signet", image_uri: null },
      { round: 1, side: "recipient", oracle_id: B, name: "Brainstorm", image_uri: null },
    ]));
    // The viewer still sees B as their own spare from the friend's seat; A is gone from the friend.
    vi.mocked(loadFriendSpares).mockImplementation(async (receiver) =>
      (receiver === "f" ? [{ oracleId: B, spare: 1, friend: { publicId: PV } }] : []) as never);
    const view = await loadTrade("v", T, "manapool", NOW);
    expect(view?.gone).toEqual([A]);
    expect(view?.state).toBe("look");
    expect(view?.can.accept).toBe(false);
    expect(view?.can.decline).toBe(true);
  });

  it("reads no spares for an ended trade, and draws bare totals when prices fail", async () => {
    exec.mockResolvedValueOnce(rows([head({ status: "declined", ended_by_user_id: "f" })]));
    exec.mockResolvedValueOnce(rows([{ round: 1, side: "proposer", oracle_id: A, name: "Arcane Signet", image_uri: null }]));
    vi.mocked(loadPrices).mockRejectedValue(new Error("down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const view = await loadTrade("v", T, "manapool", NOW);
    expect(view?.state).toBe("ended");
    expect(view?.prices).toEqual({});
    expect(loadFriendSpares).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

const listRow = (over: Record<string, unknown> = {}) => ({
  id: T, status: "open", round: 1, proposer_user_id: "f", recipient_user_id: "v", created_at: "2026-11-26T09:30:00Z",
  ended_by_user_id: null, proposer_marked_at: null, recipient_marked_at: null, at: "2026-11-26T09:30:00Z",
  cards: [{ side: "proposer", oracle_id: A, name: "Arcane Signet" }, { side: "recipient", oracle_id: B, name: "Brainstorm" }],
  friend_user_id: "f", public_id: PF, display_name: "Colin", commander_oracle_id: null, commander_name: null, commander_art: null,
  ...over,
});

describe("the rows", () => {
  it("sorts what waits on the reader first and names the cards from the reader's seat", async () => {
    const mine = "7b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
    exec.mockResolvedValueOnce(rows([
      listRow({ id: mine, proposer_user_id: "v", recipient_user_id: "f", at: "2026-11-27T09:00:00Z" }),
      listRow(),
    ]));
    exec.mockResolvedValueOnce(rows([{ public_id: PV }]));
    const { rows: out, rest, restWaiting } = await loadTradeRows("v", { limit: 1 }, NOW);
    expect(out.map((r) => r.id)).toEqual([T]);
    expect(out[0].row.state).toBe("offer");
    expect(out[0].theirs).toEqual(["Arcane Signet"]);
    expect(out[0].yours).toEqual(["Brainstorm"]);
    expect(rest).toBe(1);
    expect(restWaiting).toBe(0);
  });

  it("holds a new trade with a friend while the reader's own offer to them waits (Q10)", async () => {
    exec.mockResolvedValueOnce(rows([listRow({ proposer_user_id: "v", recipient_user_id: "f" })]));
    exec.mockResolvedValueOnce(rows([{ public_id: PV }]));
    const out = await loadTradesWith("v", PF, NOW);
    expect(out.held).toBe(true);
    expect(out.waiting).toBe(false);
  });

  it("refuses a malformed friend id before any read", async () => {
    expect(await loadTradesWith("v", "x", NOW)).toEqual({ rows: [], held: false, waiting: false });
    expect(exec).not.toHaveBeenCalled();
  });
});

describe("loadOfferedTo", () => {
  it("groups the open offers per card, and reads nothing for no valid ids", async () => {
    expect(await loadOfferedTo("v", ["nope"], NOW)).toEqual({});
    expect(exec).not.toHaveBeenCalled();
    exec.mockResolvedValueOnce(rows([
      { oracle_id: A, trade_id: T, created_at: "2026-11-25T12:00:00Z", public_id: PF, display_name: "Colin", commander_oracle_id: null, commander_name: null, commander_art: null, friend_user_id: "f" },
    ]));
    const out = await loadOfferedTo("v", [A, A], NOW);
    expect(out[A]).toHaveLength(1);
    expect(out[A][0].daysLeft).toBe(12);
    expect(JSON.stringify(out)).not.toContain('"f"');
  });
});

describe("tradesWaitingWith", () => {
  it("names the friends whose trade waits on the reader", async () => {
    exec.mockResolvedValueOnce(rows([
      { ...listRow(), public_id: PF },
      { ...listRow({ proposer_user_id: "v", recipient_user_id: "f" }), public_id: PV },
    ]));
    expect(await tradesWaitingWith("v", NOW)).toEqual(new Set([PF]));
  });
});
