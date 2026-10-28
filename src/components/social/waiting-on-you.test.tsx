// Waiting on you (menu and Home PR 7, board `Friends` 2a to 2c): absent when empty, a head counting every row, and a
// trade match drawn as its title, detail, time and a link to the friend's Spares tab; only an unseen row is marked.
// A spare request (PR 3d, board `Friend-Side`) draws Yes, No and the days left, and turns into its receipt on an answer.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { placeReceipts, WaitingOnYou, type Receipt } from "./waiting-on-you";
import { FEED_SHOWN } from "../feed/show-all";
import { socialCopy, spareCopy } from "../../lib/copy/social";
import { feedCopy } from "../../lib/copy/feed";
import type { SpareRequestRow, WaitingRow } from "../../lib/social/waiting";

const actions = vi.hoisted(() => ({ answerSpareAction: vi.fn() }));
vi.mock("../../app/friends/spare-actions", () => actions);

const w = socialCopy.waiting;
const NOW = new Date("2026-10-22T12:00:00Z");
const ROW: WaitingRow = {
  key: "item:1", kind: "trade-match", createdAt: new Date(NOW.getTime() - 5 * 3_600_000), unseen: true,
  card: { oracleId: "ghalta", name: "Ghalta, Primal Hunger", imageUri: null },
  friend: { publicId: "pub-colin", displayName: "Colin", commander: null },
  pods: ["Thursday pod"],
  askable: false,
};

afterEach(cleanup);

describe("WaitingOnYou", () => {
  it("is absent when nothing waits", () => {
    const { container } = render(<WaitingOnYou rows={[]} now={NOW} />);
    expect(container.innerHTML).toBe("");
  });

  it("heads the section with every row it shows, seen or not", () => {
    render(<WaitingOnYou rows={[ROW, { ...ROW, key: "item:2", unseen: false }]} now={NOW} />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(w.head(2));
    expect(screen.getAllByTestId("waiting-row")).toHaveLength(2);
  });

  it("shows the five newest, then Home's Show all N, which shows every row in place; the head counts them all", () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({ ...ROW, key: `item:${i}`, createdAt: new Date(NOW.getTime() - (i + 1) * 3_600_000) }));
    render(<WaitingOnYou rows={rows} now={NOW} />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(w.head(7));
    expect(screen.getAllByTestId("waiting-row")).toHaveLength(5);
    expect(screen.getByText(feedCopy.home.more(2))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: feedCopy.home.showAll(7) }));
    expect(screen.getAllByTestId("waiting-row")).toHaveLength(7);
    expect(screen.queryByRole("button", { name: feedCopy.home.showAll(7) })).toBeNull();
  });

  it("draws no footer at five or fewer", () => {
    render(<WaitingOnYou rows={Array.from({ length: 5 }, (_, i) => ({ ...ROW, key: `item:${i}` }))} now={NOW} />);
    expect(screen.queryByText(feedCopy.home.more(0))).toBeNull();
    expect(screen.queryByRole("button", { name: /show all/i })).toBeNull();
  });

  it("draws a trade match: title, detail with the pods, time, and a link to the friend's Spares tab", () => {
    render(<WaitingOnYou rows={[ROW]} now={NOW} />);
    const row = screen.getByTestId("waiting-row");
    expect(within(row).getByText(w.tradeTitle("Colin", "Ghalta, Primal Hunger"))).toBeTruthy();
    expect(within(row).getByText(w.tradeDetail("Colin", ["Thursday pod"]))).toBeTruthy();
    // The age once, after the kind on the kicker line at both widths (small items R1b: `Trade match · 5h ago`).
    const age = within(row).getByText("5h ago");
    expect(age.previousElementSibling?.textContent).toBe(w.kind["trade-match"]);
    expect(age.className).toContain("before:content-['·']");
    // /friends keeps `--fg-faint` for the time (its PR 7b contrast ruling), not the board's `--fg-locked`.
    expect(age.className).toContain("--fg-faint");
    // One link, on the action line before the ✕, at both widths.
    const link = within(row).getByRole("link", { name: w.seeSpares("Colin") });
    expect(link.getAttribute("href")).toBe("/friends/pub-colin?spare=ghalta");
    expect(link.parentElement!.nextElementSibling?.hasAttribute("data-feed-dismiss")).toBe(true);
  });

  it("names the link Ask {friend} when the landing opens the card's sheet with Ask (spare requests on)", () => {
    render(<WaitingOnYou rows={[{ ...ROW, askable: true }]} now={NOW} />);
    const row = screen.getByTestId("waiting-row");
    const links = within(row).getAllByRole("link", { name: w.askFriend("Colin") });
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) expect(l.getAttribute("href")).toBe("/friends/pub-colin?spare=ghalta");
    expect(within(row).queryByRole("link", { name: w.seeSpares("Colin") })).toBeNull();
  });

  // A 30-character name must not clip the phone's link: it wraps there, and holds one line only from desktop.
  it("lets the phone's link wrap, and keeps it on one line only from desktop", () => {
    render(<WaitingOnYou rows={[ROW]} now={NOW} />);
    for (const link of screen.getAllByRole("link")) {
      expect(link.className).not.toMatch(/(^|\s)whitespace-nowrap/);
      expect(link.className).toContain("[overflow-wrap:anywhere]");
    }
  });

  it("marks an unseen row, and only that one", () => {
    render(<WaitingOnYou rows={[ROW, { ...ROW, key: "item:2", unseen: false }]} now={NOW} />);
    const [unseen, seen] = screen.getAllByTestId("waiting-row");
    expect(unseen.hasAttribute("data-unseen")).toBe(true);
    expect(within(unseen).getByText(w.unseen)).toBeTruthy();
    expect(seen.hasAttribute("data-unseen")).toBe(false);
    expect(within(seen).queryByText(w.unseen)).toBeNull();
  });
});

const r = spareCopy.request;
const ASK: SpareRequestRow = {
  key: "req-1", kind: "spare-request", createdAt: new Date(NOW.getTime() - 2 * 3_600_000), unseen: true,
  ask: {
    id: "req-1", oracleId: "lathliss", card: { name: "Lathliss, Dragon Queen", imageUri: null }, copies: 1,
    deckName: "Dragons of Tarkir", spare: 2, asker: { publicId: "pub-peter", displayName: "Peter", commander: null },
    createdAt: new Date(NOW.getTime() - 2 * 3_600_000), daysLeft: 13,
  },
};
const ASK2: SpareRequestRow = {
  ...ASK, key: "req-2",
  ask: { ...ASK.ask, id: "req-2", oracleId: "giada", card: { name: "Giada, Font of Hope", imageUri: null }, deckName: null, spare: 1,
    asker: { publicId: "pub-chris", displayName: "Chris", commander: null }, daysLeft: 14 },
};

describe("WaitingOnYou, spare requests", () => {
  beforeEach(() => {
    actions.answerSpareAction.mockReset();
  });

  it("draws the ask: kind, title, the spare count and the copies for the deck, Yes, No and the days left", () => {
    render(<WaitingOnYou rows={[ASK]} now={NOW} />);
    const row = screen.getByTestId("waiting-row");
    expect(row.dataset.kind).toBe("spare-request");
    expect(within(row).getByText(w.kind["spare-request"])).toBeTruthy();
    expect(within(row).getByText(feedCopy.home.title.spareRequest("Peter", "Lathliss, Dragon Queen"))).toBeTruthy();
    expect(within(row).getByText("You have 2 spare. Peter wants 1 for Dragons of Tarkir.")).toBeTruthy();
    expect(within(row).getByRole("button", { name: r.yesAria("Peter", "Lathliss, Dragon Queen") }).textContent).toBe("Yes");
    expect(within(row).getByRole("button", { name: r.noAria("Peter", "Lathliss, Dragon Queen") }).textContent).toBe("No");
    expect(within(row).getByText("13 days left")).toBeTruthy();
    expect(row.hasAttribute("data-unseen")).toBe(true);
  });

  it("drops the deck clause when the ask names no deck", () => {
    render(<WaitingOnYou rows={[ASK2]} now={NOW} />);
    expect(screen.getByText("You have 1 spare. Chris wants 1.")).toBeTruthy();
  });

  it("Yes answers through the action and turns the row into the sparing receipt, focused, the head counting what still waits", async () => {
    actions.answerSpareAction.mockResolvedValue({ ok: true });
    render(<WaitingOnYou rows={[ASK, ASK2]} now={NOW} />);
    const yes = within(screen.getAllByTestId("waiting-row")[0]).getByRole("button", { name: r.yesAria("Peter", "Lathliss, Dragon Queen") });
    yes.focus();
    await act(async () => fireEvent.click(yes));
    expect(actions.answerSpareAction).toHaveBeenCalledWith("req-1", "yes");
    const receipt = screen.getByTestId("waiting-receipt");
    expect(receipt.dataset.answer).toBe("yes");
    expect(within(receipt).getByText(r.receiptKind.yes)).toBeTruthy();
    expect(within(receipt).getByText("You’re sparing Lathliss for Peter")).toBeTruthy();
    expect(within(receipt).getByText(r.sparingDetail("Peter", "Lathliss"))).toBeTruthy();
    expect(within(receipt).queryByRole("button")).toBeNull();
    expect(document.activeElement).toBe(within(receipt).getByTestId("spare-receipt-status"));
    // The receipt keeps the row's place, first; the head counts the one ask still waiting.
    expect(screen.getByTestId("waiting-on-you").querySelector("li")).toBe(receipt);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(w.head(1));
  });

  it("Show all names what the head counts, never the visit's receipts", async () => {
    actions.answerSpareAction.mockResolvedValue({ ok: true });
    const asks = Array.from({ length: 7 }, (_, i): SpareRequestRow => ({ ...ASK, key: `req-${i}`, ask: { ...ASK.ask, id: `req-${i}` } }));
    render(<WaitingOnYou rows={asks} now={NOW} />);
    await act(async () => fireEvent.click(screen.getAllByRole("button", { name: /^Yes,/ })[0]));
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(w.head(6));
    expect(screen.getByRole("button", { name: feedCopy.home.showAll(6) })).toBeTruthy();
    expect(screen.getByText(feedCopy.home.more(2))).toBeTruthy();
  });

  it("moves focus to the first row Show all reveals", () => {
    const asks = Array.from({ length: 7 }, (_, i): SpareRequestRow => ({ ...ASK, key: `req-${i}`, ask: { ...ASK.ask, id: `req-${i}` } }));
    render(<WaitingOnYou rows={asks} now={NOW} />);
    fireEvent.click(screen.getByRole("button", { name: feedCopy.home.showAll(7) }));
    const sixth = screen.getAllByTestId("waiting-row")[FEED_SHOWN];
    expect(document.activeElement).toBe(within(sixth).getByRole("button", { name: /^Yes,/ }));
  });

  it("keeps the receipt in place when the action's redraw drops the answered ask", async () => {
    actions.answerSpareAction.mockResolvedValue({ ok: true });
    const { rerender } = render(<WaitingOnYou rows={[ASK, ASK2]} now={NOW} />);
    await act(async () => fireEvent.click(screen.getAllByRole("button", { name: /^No,/ })[0]));
    rerender(<WaitingOnYou rows={[ASK2]} now={NOW} />);
    const items = screen.getByTestId("waiting-on-you").querySelectorAll("li");
    expect(items[0].dataset.testid).toBe("waiting-receipt");
    expect(within(items[0] as HTMLElement).getByText("You’re keeping Lathliss")).toBeTruthy();
    expect(within(items[0] as HTMLElement).getByText(r.keepingDetail("Peter"))).toBeTruthy();
    expect(items[1].dataset.kind).toBe("spare-request");
  });

  it("stays on the page, receipt alone, once the last ask is answered", async () => {
    actions.answerSpareAction.mockResolvedValue({ ok: true });
    const { rerender } = render(<WaitingOnYou rows={[ASK]} now={NOW} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /^Yes,/ })));
    rerender(<WaitingOnYou rows={[]} now={NOW} />);
    expect(screen.getByTestId("waiting-receipt")).toBeTruthy();
  });

  it.each(["a refusal", "a thrown action"])("on %s: the shared toast, and the row unchanged", async (label) => {
    if (label === "a refusal") actions.answerSpareAction.mockResolvedValue({ ok: false, reason: "gone" });
    else actions.answerSpareAction.mockImplementation(() => Promise.reject(new Error("network")));
    render(<WaitingOnYou rows={[ASK]} now={NOW} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /^Yes,/ })));
    expect(screen.getByRole("alert").textContent).toContain(r.failed);
    expect(screen.queryByTestId("waiting-receipt")).toBeNull();
    expect(screen.getByRole("button", { name: /^Yes,/ })).toBeTruthy();
  });

  it("keeps the failure toast when the last row left while its answer was out", async () => {
    let finish: (v: { ok: false; reason: string }) => void = () => {};
    actions.answerSpareAction.mockReturnValue(new Promise((res) => { finish = res; }));
    const { rerender } = render(<WaitingOnYou rows={[ASK]} now={NOW} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /^Yes,/ })));
    // A redraw while the answer is out drops the row (the friend's spare went), then the answer is refused.
    rerender(<WaitingOnYou rows={[]} now={NOW} />);
    await act(async () => finish({ ok: false, reason: "gone" }));
    expect(screen.getByRole("alert").textContent).toContain(r.failed);
  });

  it("takes one answer at a time", async () => {
    let finish: (v: { ok: true }) => void = () => {};
    actions.answerSpareAction.mockReturnValue(new Promise((res) => { finish = res; }));
    render(<WaitingOnYou rows={[ASK, ASK2]} now={NOW} />);
    await act(async () => fireEvent.click(screen.getAllByRole("button", { name: /^Yes,/ })[0]));
    for (const b of screen.getAllByRole("button", { name: /^(Yes|No),/ })) expect((b as HTMLButtonElement).disabled).toBe(true);
    await act(async () => finish({ ok: true }));
    expect(actions.answerSpareAction).toHaveBeenCalledTimes(1);
  });
});

// The pressed control is taken at the press: a reader who tabs elsewhere while the answer is out keeps their focus.
describe("focus after a slow answer", () => {
  it("does not pull back a reader who moved on while the action was out", async () => {
    let finish: (v: { ok: true }) => void = () => {};
    actions.answerSpareAction.mockReturnValue(new Promise((res) => { finish = res; }));
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    render(<WaitingOnYou rows={[ASK]} now={NOW} />);
    const yes = screen.getByRole("button", { name: /^Yes,/ });
    yes.focus();
    await act(async () => fireEvent.click(yes));
    elsewhere.focus();
    await act(async () => finish({ ok: true }));
    expect(screen.getByTestId("spare-receipt-status")).toBeTruthy();
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });
});

describe("placeReceipts", () => {
  const receipt = (row: SpareRequestRow, index: number): Receipt => ({ row, answer: "yes", index });
  it("puts each receipt back where its row stood, and past the end when the list is shorter", () => {
    const out = placeReceipts([ROW], new Map([["req-1", receipt(ASK, 0)], ["req-2", receipt(ASK2, 5)]]));
    expect(out.map((o) => (o.kind === "row" ? o.row.key : `receipt:${o.receipt.row.key}`))).toEqual(["receipt:req-1", "item:1", "receipt:req-2"]);
  });
});
