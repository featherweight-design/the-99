// Home's lead story as a spare request (spare requests PR 3d; board `Friend-Side`, "Home · the lead story"): while
// its ask is answerable it draws the spare count and copies, Yes, No and the days left on the story itself; an
// answer turns it into the visit's receipt, focused; a failure is the shared toast with the story as it was. A spare
// request with no answerable ask, and every other kind, draw as shipped.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedView } from "../../lib/feed/home";
import { feedCopy } from "../../lib/copy/feed";
import { spareCopy } from "../../lib/copy/social";
import { LeadSlot, LeadStory } from "./lead-story";

const actions = vi.hoisted(() => ({ answerSpareAction: vi.fn() }));
vi.mock("../../app/friends/spare-actions", () => actions);
vi.mock("../cards/card-detail-provider", () => ({ useCardDetailIfAny: () => null }));

const r = spareCopy.request;
const NOW = "2026-10-22T12:00:00.000Z";
const LEAD: FeedView = {
  key: "item:1", kind: "spare-request", at: "2026-10-22T10:00:00.000Z", unseen: true,
  card: { oracleId: "lathliss", name: "Lathliss, Dragon Queen", image: "l.jpg", art: "l-art.jpg", colorIdentity: ["R"] },
  friend: { publicId: "pub-peter", displayName: "Peter" }, href: null, opens: null, name: null, setSize: null, owned: null, drop: null, combo: null,
  ask: { id: "req-1", spare: 2, copies: 1, deckName: "Dragons of Tarkir", daysLeft: 13 },
};

beforeEach(() => {
  actions.answerSpareAction.mockReset();
});
afterEach(cleanup);

describe("LeadStory, a spare request", () => {
  it("draws the ask with Yes, No and the days left on the story", () => {
    render(<LeadStory item={LEAD} now={NOW} />);
    const story = screen.getByRole("region");
    expect(within(story).getByRole("heading", { level: 3 }).textContent).toBe(feedCopy.home.title.spareRequest("Peter", "Lathliss, Dragon Queen"));
    expect(within(story).getByText("You have 2 spare. Peter wants 1 for Dragons of Tarkir.")).toBeTruthy();
    expect(within(story).getByRole("button", { name: r.yesAria("Peter", "Lathliss, Dragon Queen") })).toBeTruthy();
    expect(within(story).getByRole("button", { name: r.noAria("Peter", "Lathliss, Dragon Queen") })).toBeTruthy();
    expect(within(story).getByText("13 days left")).toBeTruthy();
  });

  it.each([
    ["yes", /^Yes,/, "You’re sparing Lathliss for Peter", r.sparingDetail("Peter", "Lathliss"), r.receiptKind.yes],
    ["no", /^No,/, "You’re keeping Lathliss", r.keepingDetail("Peter"), r.receiptKind.no],
  ] as const)("%s answers through the action and turns the story into its receipt, focused", async (answer, name, title, detail, kind) => {
    actions.answerSpareAction.mockResolvedValue({ ok: true });
    render(<LeadStory item={LEAD} now={NOW} />);
    const press = screen.getByRole("button", { name });
    press.focus();
    await act(async () => fireEvent.click(press));
    expect(actions.answerSpareAction).toHaveBeenCalledWith("req-1", answer);
    const story = screen.getByRole("region");
    expect(story.dataset.answered).toBe(answer);
    expect(within(story).getByRole("heading", { level: 3 }).textContent).toBe(title);
    expect(within(story).getByText(detail)).toBeTruthy();
    expect(within(story).getByText(kind)).toBeTruthy();
    expect(within(story).queryByRole("button")).toBeNull();
    expect(document.activeElement).toBe(within(story).getByTestId("spare-receipt-status"));
  });

  it("on a failed answer: the shared toast, and the story as it was", async () => {
    actions.answerSpareAction.mockResolvedValue({ ok: false, reason: "gone" });
    render(<LeadStory item={LEAD} now={NOW} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /^No,/ })));
    expect(screen.getByRole("alert").textContent).toContain(r.failed);
    expect(screen.getByRole("button", { name: /^Yes,/ })).toBeTruthy();
    expect(screen.getByRole("region").dataset.answered).toBeUndefined();
  });

  it("with no answerable ask, draws as shipped: the feed's line and no presses", () => {
    render(<LeadStory item={{ ...LEAD, ask: undefined }} now={NOW} />);
    expect(screen.getByText(feedCopy.home.line.spareRequest)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

// Any revalidation in an action re-renders the page it was pressed from: Home's lead moves on (the answered ask has left
// the feed) as the answer lands. The slot holds the answered story, receipt and all, for the visit.
// The pressed control is taken at the press: a reader who tabs elsewhere while the answer is out keeps their focus.
describe("focus after a slow answer", () => {
  it("does not pull back a reader who moved on while the action was out", async () => {
    let finish: (v: { ok: true }) => void = () => {};
    actions.answerSpareAction.mockReturnValue(new Promise((res) => { finish = res; }));
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    render(<LeadSlot lead={LEAD} now={NOW} />);
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

describe("LeadSlot", () => {
  const NEXT: FeedView = { ...LEAD, key: "item:2", kind: "trade-match", ask: undefined, href: "/friends/pub-colin",
    friend: { publicId: "pub-colin", displayName: "Colin" } };

  it("keeps the receipt when the redraw brings another lead, or none", async () => {
    actions.answerSpareAction.mockResolvedValue({ ok: true });
    const { rerender } = render(<LeadSlot lead={LEAD} now={NOW} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /^Yes,/ })));
    rerender(<LeadSlot lead={NEXT} now={NOW} />);
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("You’re sparing Lathliss for Peter");
    rerender(<LeadSlot lead={null} now={NOW} />);
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("You’re sparing Lathliss for Peter");
  });

  it("holds the story while the answer is in flight, so a redraw landing first cannot take it", async () => {
    let finish: (v: { ok: true }) => void = () => {};
    actions.answerSpareAction.mockReturnValue(new Promise((res) => { finish = res; }));
    const { rerender } = render(<LeadSlot lead={LEAD} now={NOW} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /^No,/ })));
    rerender(<LeadSlot lead={NEXT} now={NOW} />);
    await act(async () => finish({ ok: true }));
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("You’re keeping Lathliss");
  });

  it("lets the story go after a failed answer, so the next redraw's lead is drawn", async () => {
    actions.answerSpareAction.mockResolvedValue({ ok: false, reason: "gone" });
    const { rerender } = render(<LeadSlot lead={LEAD} now={NOW} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /^Yes,/ })));
    rerender(<LeadSlot lead={NEXT} now={NOW} />);
    expect(screen.getByRole("region").dataset.leadStory).toBe("trade-match");
  });

  it("draws nothing with no lead", () => {
    const { container } = render(<LeadSlot lead={null} now={NOW} />);
    expect(container.querySelector("[data-lead-story]")).toBeNull();
  });
});
