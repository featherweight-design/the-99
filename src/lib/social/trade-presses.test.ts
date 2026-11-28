// The spares sheet's Trade presses over a deck or All shopping (friend trades PR 8, Ask D1): `loadTradePresses`.
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: { execute: vi.fn() } }));
vi.mock("./spares", () => ({ loadFriendSpares: vi.fn(async () => []), loadFriendSpareList: vi.fn() }));
vi.mock("./access", () => ({ resolveFriend: vi.fn(), loadFriend: vi.fn() }));
vi.mock("../decks/price-query", () => ({ loadPrices: vi.fn() }));

import { db } from "../../db";
import { resolveFriend } from "./access";
import { loadFriendSpareList } from "./spares";
import { TRADE_PRESS_FRIENDS, loadTradePresses, tradePressQuery } from "./trade-reads";
import { tradeOpenFloor } from "./trade-rules";

const NOW = new Date("2026-11-27T12:00:00Z");
const F1 = "6b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const F2 = "7b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const STRANGER = "8b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const PV = "5b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b";
const render = (q: SQL) => new PgDialect().sqlToQuery(q);
const exec = vi.mocked(db.execute);
const rows = (r: unknown[]) => ({ rows: r }) as never;
const trade = (over: Record<string, unknown>) => ({
  id: "t", status: "open", round: 1, proposer_user_id: "v", recipient_user_id: "f1", created_at: NOW.toISOString(),
  ended_by_user_id: null, proposer_marked_at: null, recipient_marked_at: null, public_id: F1, ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
});

describe("tradePressQuery", () => {
  it("reads only the viewer's live trades, through the friendship, for the asked friends", () => {
    const { sql, params } = render(tradePressQuery("v", [F1, F2]));
    const q = sql.replace(/\s+/g, " ");
    expect(q).toContain("(ptr.proposer_user_id = $");
    expect(q).toMatch(/join "friend_links" pfl on pfl\.user_id = \$\d+ and pfl\.friend_user_id = case when ptr\.proposer_user_id = \$\d+ then ptr\.recipient_user_id else ptr\.proposer_user_id end/);
    expect(q).toContain("join \"social_profiles\" pfp on pfp.user_id = pfl.friend_user_id");
    expect(q).toContain("ptr.status in ('open', 'accepted')");
    expect(q).toMatch(/pfp\.public_id in \(\$\d+::uuid, \$\d+::uuid\)/);
    expect(params).toEqual(expect.arrayContaining(["v", F1, F2]));
  });
});

describe("loadTradePresses", () => {
  it("reads nothing for ids that are not uuids", async () => {
    expect(await loadTradePresses("v", ["nope", 7, null])).toEqual({});
    expect(exec).not.toHaveBeenCalled();
    expect(resolveFriend).not.toHaveBeenCalled();
  });

  it("caps the friends asked about", async () => {
    vi.mocked(resolveFriend).mockResolvedValue(null);
    exec.mockResolvedValue(rows([]));
    const many = Array.from({ length: TRADE_PRESS_FRIENDS + 4 }, (_, i) => `${String(i).padStart(8, "0")}-2f4e-4b1a-9a3e-1c2d3e4f5a6b`);
    await loadTradePresses("v", many, NOW);
    expect(resolveFriend).toHaveBeenCalledTimes(TRADE_PRESS_FRIENDS);
  });

  it("answers per friend: the cap, the wants by name and the live count; a non-friend is left out", async () => {
    vi.mocked(resolveFriend).mockImplementation(async (_v, id) => (id === F1 ? "f1" : id === F2 ? "f2" : null));
    exec.mockImplementation(((q: SQL) => {
      const text = render(q).sql;
      if (text.includes("ptr")) {
        return Promise.resolve(rows([
          trade({ id: "a" }),
          trade({ id: "b", status: "accepted", proposer_user_id: "f1", recipient_user_id: "v" }),
          // Expired: open in the row, but past its 14 days, so it neither holds the cap nor counts.
          trade({ id: "c", public_id: F2, recipient_user_id: "f2", created_at: new Date(tradeOpenFloor(NOW).getTime() - 1000).toISOString() }),
        ]));
      }
      return Promise.resolve(rows([{ public_id: PV }]));
    }) as never);
    vi.mocked(loadFriendSpareList).mockImplementation(async (friend) => ({
      lines: friend === "f1"
        ? [{ oracleId: "x", name: "Lathliss", onWishlist: true }, { oracleId: "y", name: "Sol Ring", onWishlist: false }]
        : [],
    }) as never);
    const out = await loadTradePresses("v", [F1, F2, STRANGER, F1], NOW);
    expect(out).toEqual({
      [F1]: { held: true, wants: ["Lathliss"], open: 2 },
      [F2]: { held: false, wants: [], open: 0 },
    });
    // The reader's spares as each friend sees them, with that friend's wishlist.
    expect(loadFriendSpareList).toHaveBeenCalledWith("f1", PV, true);
    expect(loadFriendSpareList).not.toHaveBeenCalledWith(null, expect.anything(), expect.anything());
  });

  it("answers nothing without the reader's own profile", async () => {
    vi.mocked(resolveFriend).mockResolvedValue("f1");
    exec.mockResolvedValue(rows([]));
    expect(await loadTradePresses("v", [F1], NOW)).toEqual({});
  });
});
