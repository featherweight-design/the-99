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
  friend: { publicId: "pub-peter", displayName: "Peter" }, href: null, opens: null, outbound: null, name: null, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false,
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

  it.each([
    ["refused", () => Promise.resolve({ ok: false, reason: "gone" })],
    ["thrown", () => Promise.reject(new Error("network"))],
  ])("keeps a %s answer's failure toast when the lead changed while it was out", async (_, outcome) => {
    let fail: () => void = () => {};
    actions.answerSpareAction.mockReturnValue(new Promise((res, rej) => { fail = () => void outcome().then(res, rej); }));
    const { rerender } = render(<LeadSlot lead={LEAD} now={NOW} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /^Yes,/ })));
    // The server's lead moves on, then goes, while the answer is out.
    rerender(<LeadSlot lead={NEXT} now={NOW} />);
    await act(async () => fail());
    expect(screen.getByRole("alert").textContent).toContain(spareCopy.request.failed);
    rerender(<LeadSlot lead={null} now={NOW} />);
    expect(screen.getByRole("alert").textContent).toContain(spareCopy.request.failed);
  });

  it("draws nothing with no lead", () => {
    const { container } = render(<LeadSlot lead={null} now={NOW} />);
    expect(container.querySelector("[data-lead-story]")).toBeNull();
  });
});

describe("LeadStory, a Wizards post (announcements board Lead-Story)", () => {
  const URL_OK = "https://magic.wizards.com/en/news/announcements/jaws";
  const POST: FeedView = {
    ...LEAD, key: "post:jaws", kind: "secret-lair", card: null, friend: null, ask: undefined, outbound: URL_OK,
    post: { title: "Secret Lair x JAWS is live", summary: "Five full-art cards.", hero: "https://images.ctfassets.net/jaws.jpg", lists: null },
  };

  it("draws the hero landscape (a phone band at -1.5deg, 272x153 at -3deg from md) over its blurred hero, never the card", () => {
    const { container } = render(<LeadStory item={POST} now={NOW} />);
    const hero = container.querySelector("[data-lead-hero]")!;
    expect(hero.className).toMatch(/(^|\s)h-\[164px\](\s|$)/);
    expect(hero.className).toContain("-rotate-[1.5deg]");
    expect(hero.className).toMatch(/md:h-\[153px\] md:w-\[272px\] md:-rotate-3/);
    expect(hero.querySelector("img")!.getAttribute("src")).toBe("https://images.ctfassets.net/jaws.jpg");
    expect(container.querySelector("[data-commander-thumb]")).toBeNull();
    expect(container.querySelector("[data-lead-blur]")).not.toBeNull();
    // On a phone the hero stands above the words; from md beside them.
    expect(container.querySelector("[data-lead-story]")!.className).toMatch(/flex-col .*md:flex-row/);
  });

  it("presses out to the post with the filled button, its words the post's own", () => {
    render(<LeadStory item={POST} now={NOW} />);
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Secret Lair x JAWS is live");
    expect(screen.getByText("Five full-art cards.")).toBeTruthy();
    const press = screen.getByRole("link");
    expect(press).toHaveAttribute("href", URL_OK);
    expect(press).toHaveAttribute("target", "_blank");
    expect(press.className).toContain("bg-[color:var(--accent)]");
    expect(press.textContent).toMatch(/^Read on Wizards/);
  });

  it("draws its ✕ on a post (feed_dismissals admits post: keys)", () => {
    render(<LeadStory item={POST} now={NOW} onDismiss={() => {}} />);
    expect(screen.getByRole("button", { name: /Hide/ })).toBeInTheDocument();
  });

  it("drops the hero band, and the blur, when the hero fails or there is none", () => {
    const { container } = render(<LeadStory item={POST} now={NOW} />);
    fireEvent.error(container.querySelector("[data-lead-hero] img")!);
    expect(container.querySelector("[data-lead-hero]")).toBeNull();
    expect(container.querySelector("[data-lead-blur]")).toBeNull();
    cleanup();
    const none = render(<LeadStory item={{ ...POST, post: { ...POST.post!, hero: null } }} now={NOW} />);
    expect(none.container.querySelector("[data-lead-hero]")).toBeNull();
    expect(none.container.querySelector("img")).toBeNull();
  });

  it("gives a decklists lead its mono lists line and Read the post", () => {
    const { container } = render(<LeadStory item={{ ...POST, kind: "commander-decklists", post: { ...POST.post!, lists: { n: 3, of: 5 } } }} now={NOW} />);
    expect(container.querySelector("[data-lead-lists]")!.textContent).toBe("3 of 5 lists so far");
    expect(screen.getByRole("link").textContent).toMatch(/^Read the post/);
  });
});
