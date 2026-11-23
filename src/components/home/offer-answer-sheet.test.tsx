// The friend's answer to the reader's OFFER, opened over Home (You have it R2, board `Sheet`): the press on the
// offerer's item opens the request-history row in a sheet, marks nothing in the database, takes the diamond off, and
// has no Clear. A refused open goes to Request history.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ openOffer: vi.fn(), openAsk: vi.fn(), push: vi.fn() }));
vi.mock("../../app/friends/spare-actions", () => ({
  openOfferAnswerAction: m.openOffer, openAnswerAction: m.openAsk, closeSpareAction: vi.fn(), askSpareAction: vi.fn(), answerSpareAction: vi.fn(),
}));
vi.mock("../../app/feed-dismiss-actions", () => ({ dismissFeedItemAction: vi.fn() }));
vi.mock("../../app/settings/feed-actions", () => ({ saveFeedKinds: vi.fn() }));
vi.mock("../../app/friends/request-history-actions", () => ({ loadMoreHistoryAction: vi.fn() }));
vi.mock("../cards/card-detail-provider", () => ({
  useCardDetailIfAny: () => null,
  useCardDetail: () => ({ registerSheet: () => () => {}, openOracleId: null, pendingOracleId: null, revealing: false }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: m.push }), usePathname: () => "/" }));

import { WhatsNew } from "./whats-new";
import { feedCopy } from "../../lib/copy/feed";
import { historyCopy } from "../../lib/copy/request-history";
import { offerSheetCopy, spareCopy } from "../../lib/copy/social";
import type { FeedView, HomeFeed } from "../../lib/feed/home";
import type { HistoryEntry } from "../../lib/social/request-history";
import { named } from "../../lib/person-name/mint";

const NOW = "2026-10-22T12:00:00.000Z";
const KEY = "item:0f4b1c9e-1d2a-4c3b-8e5f-6a7b8c9d0e1f";
const item = (o: Partial<FeedView> = {}): FeedView => ({
  key: KEY, kind: "spare-request", at: "2026-10-22T09:00:00.000Z", unseen: true,
  card: { oracleId: "jace", name: "Jace, Multiverse Architect", image: null, art: null, colorIdentity: ["U"] },
  friend: { publicId: "pub-colin", displayName: named("Colin") }, href: "/friends/requests", opens: null, outbound: null, name: null, setSize: null,
  owned: null, drop: null, combo: null, answer: "yes", offer: true, askable: false, answerDetail: { others: [], standalone: false }, ...o,
});
const feed = (items: FeedView[]): HomeFeed => ({ chosen: true, on: ["spare-request"], items, unseen: items.filter((i) => i.unseen).length, lead: null });
const entry = (o: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: "44444444-4444-4444-8444-444444444444", oracleId: "jace", card: { name: "Jace, Multiverse Architect", imageUri: null }, copies: 2, deckName: null,
  other: { publicId: "pub-colin", displayName: named("Colin"), commander: null }, state: "yes",
  createdAt: new Date("2026-10-20T00:00:00Z"), endedAt: new Date("2026-10-22T09:00:00Z"), offer: true, ...o,
});
const press = () => screen.getByRole("button", { name: `${feedCopy.home.press.offerAnswer} ›` });

beforeEach(() => {
  vi.resetAllMocks();
  m.openOffer.mockResolvedValue({ ok: true, entry: entry() });
});
afterEach(cleanup);

describe("the offerer's answer sheet over Home", () => {
  it("names the item Your offer, and opens the offer by its key (never the ask's open)", async () => {
    render(<WhatsNew feed={feed([item()])} now={NOW} />);
    expect(screen.getByText(feedCopy.home.offerAnswerKicker)).toBeInTheDocument();
    await act(async () => { fireEvent.click(press()); });
    expect(m.openOffer).toHaveBeenCalledWith(KEY);
    expect(m.openAsk).not.toHaveBeenCalled();
    expect(m.push).not.toHaveBeenCalled();
  });

  it("Accepted: the row, its hand-over line and the meta, no Clear, and the foot goes to Request history", async () => {
    render(<WhatsNew feed={feed([item()])} now={NOW} />);
    await act(async () => { fireEvent.click(press()); });
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(offerSheetCopy.title)).toBeInTheDocument();
    const row = within(screen.getByTestId("offer-sheet-row"));
    expect(row.getByText(historyCopy.kind.yes)).toBeInTheDocument();
    expect(row.getByText(offerSheetCopy.yesDetail)).toBeInTheDocument();
    expect(row.getByText(/^Offered .+ · 2 copies$/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /clear/i })).toBeNull();
    expect(within(dialog).getByRole("link", { name: historyCopy.box.history }).getAttribute("href")).toBe("/friends/requests");
  });

  it("Declined: the no words, and nothing else changes", async () => {
    m.openOffer.mockResolvedValueOnce({ ok: true, entry: entry({ state: "no", copies: 1 }) });
    render(<WhatsNew feed={feed([item({ answer: "no" })])} now={NOW} />);
    await act(async () => { fireEvent.click(press()); });
    const row = within(screen.getByTestId("offer-sheet-row"));
    expect(row.getByText(historyCopy.kind.no)).toBeInTheDocument();
    expect(row.getByText(spareCopy.request.offer.answered.noLine)).toBeInTheDocument();
    expect(row.getByText(/^Offered .+ · 1 copy$/)).toBeInTheDocument();
  });

  it("takes the diamond off for the visit when it opens", async () => {
    const { container } = render(<WhatsNew feed={feed([item()])} now={NOW} />);
    expect(container.querySelector("[data-feed-unseen]")).not.toBeNull();
    await act(async () => { fireEvent.click(press()); });
    expect(container.querySelector("[data-feed-unseen]")).toBeNull();
  });

  it("a refused open goes to Request history", async () => {
    m.openOffer.mockResolvedValueOnce({ ok: false });
    render(<WhatsNew feed={feed([item()])} now={NOW} />);
    await act(async () => { fireEvent.click(press()); });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(m.push).toHaveBeenCalledWith("/friends/requests");
  });
});
