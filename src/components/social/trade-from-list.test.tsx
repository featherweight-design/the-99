// Trade from a deck or All shopping (friend trades FromDeck D2): the sheet asks for its friends' press facts in batches
// of TRADE_PRESS_FRIENDS, so a card more friends spare still gets Trade on every row.
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TRADE_PRESS_FRIENDS } from "../../lib/social/trade-from";
import { TradeFromList } from "./trade-from-list";

const m = vi.hoisted(() => ({ tradePressesAction: vi.fn(), byCard: new Map<string, { friend: { publicId: string } }[]>() }));
vi.mock("../../app/friends/trade-actions", () => ({ tradePressesAction: m.tradePressesAction }));
vi.mock("./spare-key-item", () => ({
  usePageSpares: () => ({ byCard: m.byCard, opened: null, close: () => {}, open: () => {} }),
}));
vi.mock("./trade-sheet-host", () => ({ useTradeSheet: () => ({ open: () => {}, pending: null }) }));

afterEach(() => {
  cleanup();
  m.tradePressesAction.mockReset();
});

describe("TradeFromList", () => {
  it("asks for every friend on the card, in batches the read takes", () => {
    const friends = Array.from({ length: TRADE_PRESS_FRIENDS + 2 }, (_, i) => ({ friend: { publicId: `f-${i}` } }));
    m.byCard.set("card-1", friends);
    m.tradePressesAction.mockResolvedValue({});
    render(
      <TradeFromList from={{ kind: "shopping" }} sheet={{ oracleId: "card-1", close: () => {}, reopen: () => {} }}>
        <div />
      </TradeFromList>,
    );
    const asked = m.tradePressesAction.mock.calls.map(([ids]) => ids as string[]);
    expect(asked.map((ids) => ids.length)).toEqual([TRADE_PRESS_FRIENDS, 2]);
    expect(asked.flat()).toEqual(friends.map((f) => f.friend.publicId));
  });
});
