// Ask in place (Hugh's ruling 2026-10-27, the menu-home plan's product call 8): a trade match's press on Home (What's
// new's rows and the lead) and on /friends (Waiting on you) opens the card's spares sheet over the page, that friend
// first, with Ask, and navigates nowhere. The loader fills the sheet until the card's spares land; once asked the press
// says Requested, from the asks read or from the Ask itself. Without the provider (spare requests off) it is the link.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AskStateLine } from "../../lib/social/spare-requests";
import type { FeedView } from "../../lib/feed/home";
import type { TradeMatchRow } from "../../lib/social/waiting";
import { feedCopy } from "../../lib/copy/feed";
import { socialCopy, spareCopy } from "../../lib/copy/social";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { FeedItemRow } from "../feed/feed-item";
import { LeadStory } from "../home/lead-story";
import { WaitingOnYou } from "./waiting-on-you";
import { useState } from "react";
import { TradeAskFrame, TradeAskProvider } from "./trade-ask";

const m = vi.hoisted(() => ({ ask: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }), usePathname: () => "/" }));
vi.mock("../../app/friends/spare-actions", () => ({ askSpareAction: m.ask, askInsteadAction: vi.fn(), answerSpareAction: vi.fn(), refreshFriendsAction: m.refresh }));
vi.mock("../../app/feed-dismiss-actions", () => ({ dismissFeedItemAction: vi.fn() }));

const GHALTA = "00000000-0000-4000-8000-0000000000c1";
const COLIN = { publicId: "00000000-0000-4000-8000-000000000002", displayName: "Colin" };
const NOW = "2026-10-27T12:00:00.000Z";
const CARDS = [{ oracleId: GHALTA, name: "Ghalta, Primal Hunger", imageUri: null }];
const AS_OF = new Date("2026-10-26T00:00:00Z");
const PRICES = { [GHALTA]: { cents: 210, foilCents: null, etchedCents: null, asOf: AS_OF } };
const friend = (name: string, publicId: string, spare: number) => ({ oracleId: GHALTA, friend: { publicId, displayName: name, commander: null, pods: ["Walk pod"] }, spare });
// Ana holds more than Colin, so the shipped order would put her first: Colin first proves the row's friend leads.
const READ = [friend("Ana", "p-ana", 3), friend("Colin", COLIN.publicId, 1)];
const item: FeedView = {
  key: "item:0f4b1c9e-1d2a-4c3b-8e5f-6a7b8c9d0e1f", kind: "trade-match", at: NOW, unseen: true,
  card: { oracleId: GHALTA, name: "Ghalta, Primal Hunger", image: null, art: null, colorIdentity: ["G"] },
  friend: COLIN, href: `/friends/${COLIN.publicId}?spare=${GHALTA}`, opens: null, outbound: null, name: null, setSize: null,
  owned: null, drop: null, combo: null, answer: null, askable: true,
} as unknown as FeedView;
const trade: TradeMatchRow = {
  key: item.key, kind: "trade-match", createdAt: new Date(NOW), unseen: true,
  card: { oracleId: GHALTA, name: "Ghalta, Primal Hunger", imageUri: null },
  friend: { ...COLIN, commander: null }, pods: ["Walk pod"], askable: true,
};
const open = (state: AskStateLine["state"]): AskStateLine => ({
  id: "req-1", oracleId: GHALTA, holder: COLIN, state, daysLeft: state === "open" ? 14 : null, createdAt: NOW, answeredAt: null,
});

const fetchMock = vi.fn();
let asks: AskStateLine[] = [];
let releaseSpares: () => void = () => {};
beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (url: string) => {
    if (url.startsWith("/api/spare-requests")) return { ok: true, json: async () => ({ asks }) };
    await new Promise<void>((ok) => { releaseSpares = ok; });
    return { ok: true, json: async () => ({ spares: READ }) };
  });
  m.ask.mockReset();
  m.ask.mockResolvedValue({ ok: true, id: "req-new" });
  m.refresh.mockReset();
  m.refresh.mockResolvedValue(undefined);
  asks = [];
  window.history.replaceState(null, "", "/");
});
afterEach(async () => {
  cleanup();
  vi.unstubAllGlobals();
  await new Promise((r) => setTimeout(r, 0));
});

const inProvider = (children: React.ReactNode) => (
  <CardDetailProvider>
    <TradeAskProvider cards={CARDS} prices={PRICES} newestAsOf={AS_OF}>{children}</TradeAskProvider>
  </CardDetailProvider>
);
const sheet = () => screen.getByRole("dialog", { name: spareCopy.modalTitleSpares });

describe("What's new's row", () => {
  it("opens the sheet in place: the loader until the spares land, then that friend first with Ask, and no navigation", async () => {
    await act(async () => { render(inProvider(<ul><FeedItemRow item={item} now={NOW} /></ul>)); });
    const press = screen.getByRole("button", { name: `${feedCopy.home.press.tradeMatchAsk("Colin")} ›` });
    expect(press.tagName).toBe("BUTTON");
    expect(document.querySelector("a[href*='?spare=']")).toBeNull();
    await act(async () => { fireEvent.click(press); });
    expect(within(sheet()).getByRole("status")).toHaveTextContent(spareCopy.loadingHeading);
    expect(within(sheet()).getByText(socialCopy.friendPage.spares.onWishlist)).toBeInTheDocument();
    await act(async () => { releaseSpares(); });
    expect(within(sheet()).queryByRole("status")).toBeNull();
    const names = within(sheet()).getAllByText(/^(Colin|Ana)$/).map((n) => n.textContent);
    expect(names[0]).toBe("Colin");
    expect(window.location.pathname).toBe("/");
  });

  it("says Requested once the friend is asked, from the sheet's Ask, with no reload", async () => {
    await act(async () => { render(inProvider(<ul><FeedItemRow item={item} now={NOW} /></ul>)); });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Ask Colin/ })); });
    await act(async () => { releaseSpares(); });
    const colinAsk = within(sheet()).getAllByRole("button", { name: /^Ask/ })[0];
    await act(async () => { fireEvent.click(colinAsk); });
    expect(m.ask).toHaveBeenCalledWith(expect.objectContaining({ friendPublicId: COLIN.publicId, oracleId: GHALTA, standalone: true, deckId: null }));
    const row = document.querySelector("[data-trade-ask-press]")!;
    expect(row.querySelector("[data-trade-ask=requested]")).toHaveTextContent(spareCopy.request.requested);
  });

  it("says Requested from its first paint when the asks read holds an open ask, and Accepted after a yes", async () => {
    asks = [open("open")];
    await act(async () => { render(inProvider(<ul><FeedItemRow item={item} now={NOW} /></ul>)); });
    expect(document.querySelector("[data-trade-ask=requested]")).not.toBeNull();
    cleanup();
    asks = [open("yes")];
    await act(async () => { render(inProvider(<ul><FeedItemRow item={item} now={NOW} /></ul>)); });
    expect(document.querySelector("[data-trade-ask=accepted]")).toHaveTextContent(`✓ ${spareCopy.request.accepted}`);
  });

  it("stays the link without the provider, and when the item is not askable", async () => {
    render(<ul><FeedItemRow item={item} now={NOW} /></ul>);
    expect(screen.getByRole("link", { name: /Ask Colin/ })).toHaveAttribute("href", item.href);
    cleanup();
    render(inProvider(<ul><FeedItemRow item={{ ...item, askable: false }} now={NOW} /></ul>));
    expect(screen.getByRole("link", { name: /See Colin/ })).toHaveAttribute("href", item.href);
  });
});

describe("the lead story", () => {
  it("opens the same sheet, and a Requested label takes the filled button's ink", async () => {
    asks = [open("open")];
    await act(async () => { render(inProvider(<LeadStory item={item} now={NOW} />)); });
    const press = document.querySelector<HTMLElement>("[data-trade-ask-press]")!;
    expect(press.querySelector("[data-trade-ask=requested] i")!.className).toMatch(/bg-current/);
    // Named for the friend as well as the state (pre-open pass): the lead's button has no title to describe it.
    expect(press).toHaveAccessibleName(`${feedCopy.home.press.tradeMatchAsk("Colin")}, ${spareCopy.request.requested}`);
    await act(async () => { fireEvent.click(press); });
    expect(sheet()).toBeInTheDocument();
  });
});

describe("Waiting on you", () => {
  it("opens the sheet in place from the trade match's press, at both widths' presses", async () => {
    await act(async () => { render(inProvider(<WaitingOnYou rows={[trade]} now={new Date(NOW)} />)); });
    const presses = document.querySelectorAll<HTMLElement>("[data-trade-ask-press]");
    expect(presses).toHaveLength(2);
    expect(document.querySelector("a[href*='?spare=']")).toBeNull();
    await act(async () => { fireEvent.click(presses[1]); });
    expect(sheet()).toBeInTheDocument();
  });

  it("keeps its link without the provider", () => {
    render(<WaitingOnYou rows={[trade]} now={new Date(NOW)} />);
    expect(screen.getAllByRole("link", { name: /Ask Colin/ })[0]).toHaveAttribute("href", `/friends/${COLIN.publicId}?spare=${GHALTA}`);
  });
});

describe("the frame (Copilot round 1, #2288)", () => {
  function Held() {
    const [n, setN] = useState(0);
    return <button type="button" onClick={() => setN(n + 1)}>{`held ${n}`}</button>;
  }

  it("keeps the page under it mounted when the payload goes, so the visit's state survives", async () => {
    const payload = { cards: CARDS, prices: PRICES, newestAsOf: AS_OF };
    const { rerender } = render(<CardDetailProvider><TradeAskFrame payload={payload}><Held /></TradeAskFrame></CardDetailProvider>);
    fireEvent.click(screen.getByRole("button", { name: "held 0" }));
    await act(async () => { rerender(<CardDetailProvider><TradeAskFrame payload={null}><Held /></TradeAskFrame></CardDetailProvider>); });
    expect(screen.getByRole("button", { name: "held 1" })).toBeInTheDocument();
  });

  it("with no payload, a trade match's press stays its link", async () => {
    await act(async () => { render(<CardDetailProvider><TradeAskFrame payload={null}><ul><FeedItemRow item={item} now={NOW} /></ul></TradeAskFrame></CardDetailProvider>); });
    expect(screen.getByRole("link", { name: /Ask Colin/ })).toHaveAttribute("href", item.href);
  });

  it("reads the asks again when asksVersion moves, so a withdrawn ask stops saying Requested", async () => {
    asks = [open("open")];
    const payload = { cards: CARDS, prices: PRICES, newestAsOf: AS_OF };
    const page = (v: string) => <CardDetailProvider><TradeAskFrame payload={payload} asksVersion={v}><ul><FeedItemRow item={item} now={NOW} /></ul></TradeAskFrame></CardDetailProvider>;
    const { rerender } = render(page("req-1:open:0"));
    await act(async () => {});
    expect(document.querySelector("[data-trade-ask=requested]")).not.toBeNull();
    asks = [];
    await act(async () => { rerender(page("")); });
    expect(document.querySelector("[data-trade-ask=requested]")).toBeNull();
    expect(screen.getByRole("button", { name: `${feedCopy.home.press.tradeMatchAsk("Colin")} ›` })).toBeInTheDocument();
  });
});

describe("/friends' redraw and a late read (Copilot round 2, #2288)", () => {
  const payload = { cards: CARDS, prices: PRICES, newestAsOf: AS_OF };
  async function askColin(refreshFriends: boolean) {
    await act(async () => {
      render(<CardDetailProvider><TradeAskFrame payload={payload} refreshFriends={refreshFriends}><ul><FeedItemRow item={item} now={NOW} /></ul></TradeAskFrame></CardDetailProvider>);
    });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /Ask Colin/ })); });
    await act(async () => { releaseSpares(); });
    await act(async () => { fireEvent.click(within(sheet()).getAllByRole("button", { name: /^Ask/ })[0]); });
  }

  it("redraws /friends after an Ask there, so Your requests lists it", async () => {
    await askColin(true);
    expect(m.refresh).toHaveBeenCalledTimes(1);
  });

  it("redraws nothing after an Ask on Home", async () => {
    await askColin(false);
    expect(m.refresh).not.toHaveBeenCalled();
  });

  it("drops a read that lands after a newer one, so a withdrawn ask is not put back", async () => {
    const pending: Array<(rows: AskStateLine[]) => void> = [];
    fetchMock.mockImplementation(async (url: string) => {
      if (url.startsWith("/api/spare-requests")) {
        const rows = await new Promise<AskStateLine[]>((ok) => pending.push(ok));
        return { ok: true, json: async () => ({ asks: rows }) };
      }
      return { ok: true, json: async () => ({ spares: READ }) };
    });
    const page = (v: string) => <CardDetailProvider><TradeAskFrame payload={payload} asksVersion={v}><ul><FeedItemRow item={item} now={NOW} /></ul></TradeAskFrame></CardDetailProvider>;
    const { rerender } = render(page("a"));
    await act(async () => {});
    await act(async () => { rerender(page("b")); });
    expect(pending).toHaveLength(2);
    await act(async () => { pending[1]([]); });
    await act(async () => { pending[0]([open("open")]); });
    expect(document.querySelector("[data-trade-ask=requested]")).toBeNull();
  });
});
