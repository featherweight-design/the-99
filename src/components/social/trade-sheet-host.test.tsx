// Make it a trade (friend trades A1, A2): the feed's press shows only on a Yes to an ask, never to an offer or a No, and
// only under a `TradeSheetHost`. A press reads the friend's sheet once, however quickly it is pressed again.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedView } from "../../lib/feed/home";
import { tradeCopy } from "../../lib/copy/trades";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";
import { FeedAskBack, TradeSheetHost } from "./trade-sheet-host";

const actions = vi.hoisted(() => ({ openTradeSheetAction: vi.fn() }));
vi.mock("../../app/friends/trade-actions", () => actions);
vi.mock("../../app/friends/spare-actions", () => ({}));
vi.mock("./trade-sheet", () => ({ TradeSheet: () => <div data-testid="sheet" /> }));

const ITEM: FeedView = {
  key: "item:1", kind: "spare-request", at: "2026-10-22T10:00:00.000Z", unseen: true,
  card: { oracleId: "lathliss", name: "Lathliss, Dragon Queen", image: "l.jpg", art: "l-art.jpg", colorIdentity: ["R"] },
  friend: { publicId: "pub-peter", displayName: named("Peter") }, href: null, opens: null, outbound: null, name: null, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false,
  ask: { id: "req-1", spare: 2, copies: 1, deckName: named("Dragons of Tarkir"), daysLeft: 13 },
};
const press = () => screen.queryByRole("button", { name: plain(tradeCopy.askBackAria(named("Peter"))) });

beforeEach(() => actions.openTradeSheetAction.mockReset());
afterEach(cleanup);

describe("FeedAskBack", () => {
  it("shows on a Yes to an ask, under a host", () => {
    render(<TradeSheetHost><FeedAskBack item={ITEM} answered="yes" size="row" /></TradeSheetHost>);
    expect(press()).toBeTruthy();
  });

  it("draws nothing on a No, on a Yes to an offer, or without a host", () => {
    render(<TradeSheetHost><FeedAskBack item={ITEM} answered="no" size="row" /></TradeSheetHost>);
    expect(press()).toBeNull();
    cleanup();
    const offer: FeedView = { ...ITEM, ask: { ...ITEM.ask!, offer: { want: 1 } } };
    render(<TradeSheetHost><FeedAskBack item={offer} answered="yes" size="row" /></TradeSheetHost>);
    expect(press()).toBeNull();
    cleanup();
    render(<FeedAskBack item={ITEM} answered="yes" size="row" />);
    expect(press()).toBeNull();
  });

  it("reads the sheet once for two presses before the first lands", async () => {
    let land: (v: unknown) => void = () => {};
    actions.openTradeSheetAction.mockReturnValue(new Promise((r) => { land = r; }));
    render(<TradeSheetHost><FeedAskBack item={ITEM} answered="yes" size="row" /></TradeSheetHost>);
    const button = press()!;
    act(() => { fireEvent.click(button); fireEvent.click(button); });
    expect(actions.openTradeSheetAction).toHaveBeenCalledTimes(1);
    expect(actions.openTradeSheetAction).toHaveBeenCalledWith("pub-peter");
    await act(async () => { land({ friend: {}, held: false, theirSpares: [], yours: [], offered: [], prices: {} }); });
    expect(screen.getByTestId("sheet")).toBeTruthy();
  });
});
