// An answer to the reader's own ask, opened over Home (small items item 3, board `Spare-Answer-Sheet`): the press opens
// that one request in a sheet rather than going to /friends, which marks it seen (the diamond and the count drop at
// once); Clear removes the request, closes the sheet and takes the item with it, focus on the next item's ✕; a failed
// Clear keeps the sheet with the shared toast; a refused open goes to /friends as the press used to.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ open: vi.fn(), close: vi.fn(), dismiss: vi.fn(), push: vi.fn() }));
vi.mock("../../app/friends/spare-actions", () => ({ openAnswerAction: m.open, closeSpareAction: m.close, askSpareAction: vi.fn(), answerSpareAction: vi.fn() }));
vi.mock("../../app/feed-dismiss-actions", () => ({ dismissFeedItemAction: m.dismiss }));
vi.mock("../../app/settings/feed-actions", () => ({ saveFeedKinds: vi.fn() }));
vi.mock("../cards/card-detail-provider", () => ({
  useCardDetailIfAny: () => null,
  useCardDetail: () => ({ registerSheet: () => () => {}, openOracleId: null, pendingOracleId: null, revealing: false }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: m.push }), usePathname: () => "/" }));

import { WhatsNew } from "./whats-new";
import * as seen from "../shell/answer-seen";
import * as dialogs from "../../lib/a11y/dialog";
import { feedCopy } from "../../lib/copy/feed";
import { spareCopy } from "../../lib/copy/social";
import type { FeedView, HomeFeed } from "../../lib/feed/home";
import type { YourRequest } from "../../lib/social/your-requests";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";

const s = spareCopy.request.mine;
const NOW = "2026-10-22T12:00:00.000Z";
const COLIN = { publicId: "pub-colin", displayName: named("Colin") };
const answer = (key: string, o: Partial<FeedView> = {}): FeedView => ({
  key, kind: "spare-request", at: "2026-10-22T09:00:00.000Z", unseen: true,
  card: { oracleId: "jace", name: "Jace, Multiverse Architect", image: null, art: null, colorIdentity: ["U"] },
  friend: COLIN, href: "/friends", opens: null, outbound: null, name: null, setSize: null, owned: null, drop: null, combo: null,
  answer: "yes", askable: false, answerDetail: { others: [], standalone: false }, ...o,
});
const feed = (items: FeedView[]): HomeFeed => ({ chosen: true, on: ["spare-request"], items, unseen: items.filter((i) => i.unseen).length, lead: null });
const request = (o: Partial<YourRequest> = {}): YourRequest => ({
  id: "44444444-4444-4444-8444-444444444444", oracleId: "jace", card: { name: "Jace, Multiverse Architect", imageUri: null }, copies: 1,
  deckName: null, deckId: null, standalone: false, holder: { publicId: "pub-colin", displayName: named("Colin"), commander: null },
  state: "yes", daysLeft: null, createdAt: new Date("2026-10-20T00:00:00Z"), answeredAt: new Date("2026-10-22T09:00:00Z"), seenAt: null,
  cleared: false, unseen: false, othersWithSpare: [], canAskAgain: false, ...o,
});
const A = "item:0f4b1c9e-1d2a-4c3b-8e5f-6a7b8c9d0e1f";
const B = "item:1a4b1c9e-1d2a-4c3b-8e5f-6a7b8c9d0e1f";
const press = () => screen.getAllByRole("button", { name: `${feedCopy.home.press.answer} ›` })[0];

beforeEach(() => {
  vi.resetAllMocks();
  m.open.mockResolvedValue({ ok: true, request: request(), counted: true });
  m.close.mockResolvedValue({ ok: true, closed: "cleared" });
  m.dismiss.mockResolvedValue({ ok: true });
});
afterEach(cleanup);

describe("the answer sheet over Home", () => {
  it("opens the one request by the item's key, titled Your request, with Clear and the way to the whole list", async () => {
    render(<WhatsNew feed={feed([answer(A)])} now={NOW} />);
    await act(async () => { fireEvent.click(press()); });
    expect(m.open).toHaveBeenCalledWith(A);
    expect(m.push).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(s.sheet.title)).toBeInTheDocument();
    expect(within(dialog).getByText("Colin can spare Jace, Multiverse Architect")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: plain(s.clearAria(named("Colin"), "Jace, Multiverse Architect")) }).textContent).toBe(s.sheet.clear);
    expect(within(dialog).getByRole("link", { name: s.sheet.all }).getAttribute("href")).toBe("/friends#your-requests");
    // No ✕ on the row and no Ask instead: the sheet's own close is the only other press.
    expect(within(screen.getByTestId("answer-sheet-row")).queryByTestId("your-request-close")).toBeNull();
  });

  it("hands focus back to the press when the sheet closes, even if the press never took it (Safari)", async () => {
    render(<WhatsNew feed={feed([answer(A)])} now={NOW} />);
    const opener = press();
    (document.activeElement as HTMLElement | null)?.blur();
    await act(async () => { fireEvent.click(opener); });
    await act(async () => { fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: s.sheet.close })); });
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("drops the item's diamond and its place in the count once opened", async () => {
    const { container } = render(<WhatsNew feed={feed([answer(A), answer(B, { answer: "no" })])} now={NOW} />);
    expect(container.querySelectorAll("[data-feed-unseen]")).toHaveLength(2);
    await act(async () => { fireEvent.click(press()); });
    expect(container.querySelectorAll("[data-feed-unseen]")).toHaveLength(1);
    expect(document.getElementById("home-whats-new")!.textContent).toContain(feedCopy.home.newCount(1));
  });

  it("Clear removes the request, closes the sheet, takes the item with it and lands on the next item's ✕", async () => {
    render(<WhatsNew feed={feed([answer(A), answer(B, { answer: "no" })])} now={NOW} />);
    await act(async () => { fireEvent.click(press()); });
    await act(async () => { fireEvent.click(screen.getByTestId("answer-sheet-clear")); });
    expect(m.close).toHaveBeenCalledWith(request().id);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(m.dismiss).toHaveBeenCalledWith(A);
    expect(screen.getAllByRole("button", { name: `${feedCopy.home.press.answer} ›` })).toHaveLength(1);
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(document.activeElement?.getAttribute("data-feed-dismiss")).not.toBeNull();
  });

  it("a Clear that lands after the sheet closed still takes the item off, but leaves focus where the reader put it", async () => {
    let reply!: (v: unknown) => void;
    m.close.mockReturnValue(new Promise((r) => { reply = r; }));
    render(<WhatsNew feed={feed([answer(A), answer(B, { answer: "no" })])} now={NOW} />);
    await act(async () => { fireEvent.click(press()); });
    await act(async () => { fireEvent.click(screen.getByTestId("answer-sheet-clear")); });
    await act(async () => { fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: s.sheet.close })); });
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    elsewhere.focus();
    await act(async () => { reply({ ok: true, closed: "cleared" }); });
    await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
    expect(m.dismiss).toHaveBeenCalledWith(A);
    expect(screen.getAllByRole("button", { name: `${feedCopy.home.press.answer} ›` })).toHaveLength(1);
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });

  it("a failed Clear keeps the sheet and shows the shared toast", async () => {
    m.close.mockResolvedValue({ ok: false, reason: "gone" });
    render(<WhatsNew feed={feed([answer(A)])} now={NOW} />);
    await act(async () => { fireEvent.click(press()); });
    await act(async () => { fireEvent.click(screen.getByTestId("answer-sheet-clear")); });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(m.dismiss).not.toHaveBeenCalled();
    expect(screen.getByText(spareCopy.request.failed)).toBeInTheDocument();
  });

  it("a refused open goes to /friends, as the press used to", async () => {
    m.open.mockResolvedValue({ ok: false });
    render(<WhatsNew feed={feed([answer(A)])} now={NOW} />);
    await act(async () => { fireEvent.click(press()); });
    expect(m.push).toHaveBeenCalledWith("/friends");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("the answer sheet's edges", () => {
  it("a press on the item's picture opens the sheet, never a trip to /friends", async () => {
    const { container } = render(<WhatsNew feed={feed([answer(A)])} now={NOW} />);
    const picture = container.querySelector<HTMLElement>("[data-feed-picture]")!;
    expect(picture.tagName).not.toBe("A");
    await act(async () => { fireEvent.click(picture); });
    expect(m.open).toHaveBeenCalledWith(A);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("an open that returns after its item was dismissed opens nothing and goes nowhere", async () => {
    let reply!: (v: unknown) => void;
    m.open.mockReturnValue(new Promise((r) => { reply = r; }));
    render(<WhatsNew feed={feed([answer(A), answer(B, { answer: "no" })])} now={NOW} />);
    await act(async () => { fireEvent.click(press()); });
    const first = document.querySelector<HTMLElement>("[data-feed-dismiss]")!;
    await act(async () => { fireEvent.click(first); });
    await act(async () => { reply({ ok: true, request: request() }); });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(m.push).not.toHaveBeenCalled();
  });

  it("announces the answer to the Friends badge only when the badge counted it", async () => {
    const spy = vi.spyOn(seen, "announceAnswerSeen");
    render(<WhatsNew feed={feed([answer(A)])} now={NOW} />);
    await act(async () => { fireEvent.click(press()); });
    expect(spy).toHaveBeenCalledTimes(1);
    cleanup();
    spy.mockClear();
    m.open.mockResolvedValue({ ok: true, request: request(), counted: false });
    render(<WhatsNew feed={feed([answer(A)])} now={NOW} />);
    await act(async () => { fireEvent.click(press()); });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("an open that returns while another sheet is up opens nothing and goes nowhere, but the answer still reads seen", async () => {
    const up = vi.spyOn(dialogs, "dialogsUp").mockReturnValue([document.body]);
    const announced = vi.spyOn(seen, "announceAnswerSeen");
    const { container } = render(<WhatsNew feed={feed([answer(A)])} now={NOW} />);
    await act(async () => { fireEvent.click(press()); });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(m.push).not.toHaveBeenCalled();
    // The server marked it seen all the same, so the diamond and the Friends badge still drop.
    expect(container.querySelectorAll("[data-feed-unseen]")).toHaveLength(0);
    expect(announced).toHaveBeenCalledTimes(1);
    announced.mockRestore();
    up.mockRestore();
  });
});
