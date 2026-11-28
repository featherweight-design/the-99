// Make it a trade (friend trades A1, A2): the feed's press shows only on a Yes to an ask, never to an offer or a No, and
// only under a `TradeSheetHost`. A press reads the friend's sheet once, however quickly it is pressed again.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedView } from "../../lib/feed/home";
import { tradeCopy } from "../../lib/copy/trades";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";
import { tradeHref } from "../../lib/social/trade-from";
import { FeedAskBack, TradeSheetHost, useTradeSheet } from "./trade-sheet-host";

const actions = vi.hoisted(() => ({ openTradeSheetAction: vi.fn() }));
vi.mock("../../app/friends/trade-actions", () => actions);
vi.mock("../../app/friends/spare-actions", () => ({}));
const nav = vi.hoisted(() => ({ push: vi.fn(), leave: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: nav.push }) }));
vi.mock("../../lib/a11y/dialog", () => ({ leaveDialogsForNavigation: nav.leave }));
vi.mock("./trade-sheet", () => ({
  TradeSheet: ({ held, onOpen, back }: { held: boolean; onOpen: (o: unknown) => void; back?: { onBack: () => void } }) => (
    <div data-testid="sheet" data-held={String(held)}>
      <button type="button" onClick={() => onOpen({ kind: "trade", id: "t-1" })}>sent</button>
      {back ? <button type="button" onClick={back.onBack}>back</button> : null}
    </div>
  ),
}));

const ITEM: FeedView = {
  key: "item:1", kind: "spare-request", at: "2026-10-22T10:00:00.000Z", unseen: true,
  card: { oracleId: "lathliss", name: "Lathliss, Dragon Queen", image: "l.jpg", art: "l-art.jpg", colorIdentity: ["R"] },
  friend: { publicId: "pub-peter", displayName: named("Peter") }, href: null, opens: null, outbound: null, name: null, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false,
  ask: { id: "req-1", spare: 2, copies: 1, deckName: named("Dragons of Tarkir"), daysLeft: 13 },
};
const press = () => screen.queryByRole("button", { name: plain(tradeCopy.askBackAria(named("Peter"))) });

beforeEach(() => { actions.openTradeSheetAction.mockReset(); nav.push.mockReset(); nav.leave.mockReset(); });
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

  it("reads the friend's sheet again when it moves on after a send, so the cap is current", async () => {
    const data = (held: boolean) => ({ friend: {}, held, theirSpares: [], yours: [], offered: [], prices: {} });
    actions.openTradeSheetAction.mockResolvedValueOnce(data(false)).mockResolvedValueOnce(data(true));
    render(<TradeSheetHost><FeedAskBack item={ITEM} answered="yes" size="row" /></TradeSheetHost>);
    await act(async () => { fireEvent.click(press()!); });
    expect(screen.getByTestId("sheet").dataset.held).toBe("false");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "sent" })); });
    expect(actions.openTradeSheetAction).toHaveBeenCalledTimes(2);
    expect(actions.openTradeSheetAction).toHaveBeenLastCalledWith("pub-peter");
    expect(screen.getByTestId("sheet").dataset.held).toBe("true");
  });
});

// FromDeck D2 to D4: a sheet opened from a deck's spares sheet.
const DECK = "66666666-6666-4666-8666-666666666666";
function FromDeckPress({ back }: { back: () => void }) {
  const host = useTradeSheet()!;
  return (
    <button type="button" onClick={() => host.open("pub-peter", { kind: "new" }, "trade:pub-peter", { back, from: { kind: "deck", deckId: DECK } })}>
      trade
    </button>
  );
}
const sheetData = { friend: {}, held: false, theirSpares: [], yours: [], offered: [], prices: {} };

describe("TradeSheetHost from a deck", () => {
  it("draws Back on a new sheet, which closes it and reopens the spares sheet", async () => {
    actions.openTradeSheetAction.mockResolvedValue(sheetData);
    const back = vi.fn();
    render(<TradeSheetHost><FromDeckPress back={back} /></TradeSheetHost>);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "trade" })); });
    fireEvent.click(screen.getByRole("button", { name: "back" }));
    expect(back).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("sheet")).toBeNull();
  });

  it("sends Open the trade to the friend's Spares tab, named for the deck, releasing the sheet's history first", async () => {
    actions.openTradeSheetAction.mockResolvedValue(sheetData);
    render(<TradeSheetHost><FromDeckPress back={vi.fn()} /></TradeSheetHost>);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "trade" })); });
    fireEvent.click(screen.getByRole("button", { name: "sent" }));
    expect(nav.leave).toHaveBeenCalledTimes(1);
    expect(nav.push).toHaveBeenCalledWith(tradeHref("pub-peter", "t-1", { kind: "deck", deckId: DECK }));
    expect(nav.leave.mock.invocationCallOrder[0]).toBeLessThan(nav.push.mock.invocationCallOrder[0]);
    expect(screen.queryByTestId("sheet")).toBeNull();
    expect(actions.openTradeSheetAction).toHaveBeenCalledTimes(1);
  });

  it("reopens the spares sheet when the read fails, so the reader is not left with nothing", async () => {
    const back = vi.fn();
    actions.openTradeSheetAction.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("down"));
    render(<TradeSheetHost><FromDeckPress back={back} /></TradeSheetHost>);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "trade" })); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "trade" })); });
    expect(back).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId("sheet")).toBeNull();
  });
});
