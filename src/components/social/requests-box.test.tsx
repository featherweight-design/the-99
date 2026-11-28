// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { historyCopy } from "../../lib/copy/request-history";
import { tradeCopy } from "../../lib/copy/trades";
import type { TradeListRow } from "../../lib/social/trade-reads";
import { RequestsBox, type BoxTrades } from "./requests-box";

vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));
// The rows and the sheet host are their own suites; here a row is its id, and a press records what it opened.
const opened = vi.fn();
vi.mock("./trade-rows", () => ({
  TradeRows: ({ rows, onOpen }: { rows: { id: string }[]; onOpen: (id: string) => void }) => (
    <ul>{rows.map((r) => <li key={r.id}><button type="button" onClick={() => onOpen(r.id)}>{`row ${r.id}`}</button></li>)}</ul>
  ),
}));
vi.mock("./trade-sheet-host", () => ({ useTradeSheet: () => ({ open: opened, pending: null }) }));

const b = historyCopy.box;
const NO_TRADES: BoxTrades = { rows: [], rest: 0, restWaiting: 0, now: new Date("2026-11-27T12:00:00Z") };
const tradeRow = (id: string, waitsOnYou = false) =>
  ({ id, friend: { publicId: `f-${id}`, displayName: "Colin" }, row: { waitsOnYou } }) as unknown as TradeListRow;
const box = (o: Partial<Parameters<typeof RequestsBox>[0]> = {}) => (
  <RequestsBox waiting={<p>waiting rows</p>} mine={<p>my rows</p>} waitingCount={0} mineCount={0} unseenAnswer={false} history={false} trades={NO_TRADES} {...o} />
);
const tradesTab = () => screen.getByRole("tab", { name: new RegExp(tradeCopy.listTab) });

afterEach(cleanup);

describe("RequestsBox", () => {
  it("opens on Waiting on you when anything waits, else on Your requests (also when both are empty)", () => {
    const a = render(box({ waitingCount: 2, mineCount: 1 }));
    expect(screen.getByRole("tab", { name: new RegExp(b.waiting) }).getAttribute("aria-selected")).toBe("true");
    a.unmount();
    const c = render(box({ waitingCount: 0, mineCount: 3 }));
    expect(screen.getByRole("tab", { name: new RegExp(b.mine) }).getAttribute("aria-selected")).toBe("true");
    c.unmount();
    render(box());
    expect(screen.getByRole("tab", { name: new RegExp(b.mine) }).getAttribute("aria-selected")).toBe("true");
  });

  it("keeps both lists mounted and shows only the chosen tab", () => {
    render(box({ waitingCount: 1, mineCount: 1 }));
    expect(screen.getByText("waiting rows").closest("[hidden]")).toBeNull();
    expect(screen.getByText("my rows", { exact: true }).closest("[hidden]")).not.toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: new RegExp(b.mine) }));
    expect(screen.getByText("waiting rows").closest("[hidden]")).not.toBeNull();
    expect(screen.getByText("my rows").closest("[hidden]")).toBeNull();
  });

  it("draws a tab's empty state only when it has no rows, and the foot link only with a history", () => {
    const a = render(box());
    expect(screen.getByText(b.mineEmpty.title)).toBeTruthy();
    expect(screen.queryByRole("link", { name: b.history })).toBeNull();
    a.unmount();
    render(box({ waitingCount: 1, history: true }));
    expect(screen.queryByText(b.waitingEmpty.title)).toBeNull();
    expect(screen.getByRole("link", { name: b.history }).getAttribute("href")).toBe("/friends/requests");
  });

  it("puts the diamond on Your requests only for an answer not yet seen", () => {
    const a = render(box({ mineCount: 1, unseenAnswer: true }));
    expect(screen.getByRole("tab", { name: new RegExp(b.mine) }).querySelector(".rotate-45")).not.toBeNull();
    a.unmount();
    render(box({ mineCount: 1 }));
    expect(screen.getByRole("tab", { name: new RegExp(b.mine) }).querySelector(".rotate-45")).toBeNull();
  });

  it("opens on Trades when no ask waits and a trade does, and counts every trade on its tab", () => {
    render(box({ mineCount: 1, trades: { ...NO_TRADES, rows: [tradeRow("a", true), tradeRow("b")], rest: 4, restWaiting: 0 } }));
    expect(tradesTab().getAttribute("aria-selected")).toBe("true");
    expect(tradesTab().textContent).toContain("6");
  });

  it("draws No trades yet with no trade, and the foot names the rest, the waiting ones first", () => {
    const a = render(box());
    fireEvent.click(tradesTab());
    expect(screen.getByText(tradeCopy.empty.listTitle)).toBeTruthy();
    expect(screen.queryByTestId("trades-more")).toBeNull();
    a.unmount();
    const c = render(box({ trades: { ...NO_TRADES, rows: [tradeRow("a")], rest: 8, restWaiting: 2 } }));
    fireEvent.click(tradesTab());
    expect(screen.getByTestId("trades-more").textContent).toBe(tradeCopy.row.moreWaiting(2, 8));
    // A trade is history too: the foot's link stands without a request history.
    expect(screen.getByRole("link", { name: b.history })).toBeTruthy();
    c.unmount();
    render(box({ trades: { ...NO_TRADES, rows: [tradeRow("a")], rest: 1, restWaiting: 0 } }));
    fireEvent.click(tradesTab());
    expect(screen.getByTestId("trades-more").textContent).toBe(tradeCopy.row.more(1));
  });

  it("opens a pressed trade over the page through the host, with its friend", () => {
    opened.mockClear();
    render(box({ trades: { ...NO_TRADES, rows: [tradeRow("a")] } }));
    fireEvent.click(tradesTab());
    fireEvent.click(screen.getByRole("button", { name: "row a" }));
    expect(opened).toHaveBeenCalledWith("f-a", { kind: "trade", id: "a" }, "trade:a");
  });
});
