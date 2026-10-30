// The ✕ on What's new, its lead story and Waiting on you (Hugh's ruling 2026-10-27): each surface ends its action line
// with the ✕ (small items board `Dismiss-X`), 44px on a phone and 32px from desktop with a 44px coarse hit, the press hides the item at once under the key the server
// keeps (Home's own key; an ask by `ask:<request id>`), the count follows, and a failed write brings the row back with
// the toast.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ dismiss: vi.fn() }));
vi.mock("../../app/feed-dismiss-actions", () => ({ dismissFeedItemAction: m.dismiss }));
vi.mock("../../app/settings/feed-actions", () => ({ saveFeedKinds: vi.fn() }));
vi.mock("../../app/friends/spare-actions", () => ({ answerSpareAction: vi.fn() }));
vi.mock("../cards/card-detail-provider", () => ({ useCardDetailIfAny: () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/" }));

import { WhatsNew } from "../home/whats-new";
import { LeadSlot } from "../home/lead-story";
import { HeldLeadProvider } from "../home/held-lead";
import { nextDismiss } from "./dismiss";
import { WaitingOnYou } from "../social/waiting-on-you";
import { FeedItemRow } from "./feed-item";
import type { FeedView, HomeFeed } from "../../lib/feed/home";
import type { WaitingRow } from "../../lib/social/waiting";
import { feedCopy } from "../../lib/copy/feed";
import { socialCopy } from "../../lib/copy/social";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";

const d = feedCopy.home.dismiss;
const w = socialCopy.waiting;
const NOW = "2026-10-22T12:00:00.000Z";
const view = (n: number, o: Partial<FeedView> = {}): FeedView => ({
  key: `set:s${n}`, kind: "new-set", at: new Date(Date.parse(NOW) - (n + 1) * 3_600_000).toISOString(), unseen: true,
  card: null, friend: null, href: `/collection/sets/s${n}`, opens: null, name: `Set ${n}`, setSize: null, owned: null, drop: null, combo: null,
  answer: null, askable: false, outbound: null, ...o,
});
const feed = (items: FeedView[], lead: FeedView | null = null): HomeFeed => ({
  chosen: true, on: ["new-set"], items, unseen: items.filter((i) => i.unseen).length + (lead?.unseen ? 1 : 0), lead,
});
const titleOf = (n: number) => feedCopy.home.title.newSet(`Set ${n}`);

beforeEach(() => {
  m.dismiss.mockReset();
  m.dismiss.mockResolvedValue({ ok: true });
});
afterEach(cleanup);

describe("the ✕ itself", () => {
  it("ends the action line: in flow at ml-auto, 44px on a phone, 32px from desktop with a 44px coarse hit, named for the item", () => {
    const onDismiss = vi.fn();
    render(<ul><FeedItemRow item={view(1)} now={NOW} onDismiss={onDismiss} /></ul>);
    const x = screen.getByRole("button", { name: plain(d.aria(titleOf(1))) });
    const cls = x.className.split(/\s+/);
    for (const c of ["ml-auto", "h-[44px]", "w-[44px]", "md:h-[32px]", "md:w-[32px]", "mr-[-10px]", "md:mr-[-6px]", "relative", "pointer-coarse:after:h-[44px]", "pointer-coarse:after:w-[44px]"]) {
      expect(cls).toContain(c);
    }
    expect(cls).not.toContain("absolute");
    expect(x.parentElement!.hasAttribute("data-feed-actions")).toBe(true);
    fireEvent.click(x);
    expect(onDismiss).toHaveBeenCalledWith(x);
  });

  it("is not drawn without a dismiss, and no text column keeps a reserve for it", () => {
    const { container, rerender } = render(<ul><FeedItemRow item={view(1)} now={NOW} /></ul>);
    expect(container.querySelector("[data-feed-dismiss]")).toBeNull();
    rerender(<ul><FeedItemRow item={view(1)} now={NOW} onDismiss={() => {}} /></ul>);
    expect(screen.getByText(titleOf(1)).parentElement!.className).not.toMatch(/pr-\[/);
    expect(container.querySelector("[data-feed-actions]")!.className).not.toMatch(/pr-\[/);
  });

  it("ends the lead's action line with its ✕, with no reserve on the text column", () => {
    const { container } = render(<LeadSlot lead={view(9, { key: "item:0f4b1c9e-1d2a-4c3b-8e5f-6a7b8c9d0e1f" })} now={NOW} />);
    expect(screen.getByRole("heading", { level: 3 }).parentElement!.className).not.toMatch(/pr-\[/);
    const line = container.querySelector("[data-lead-actions]")!;
    expect(line.lastElementChild!.hasAttribute("data-feed-dismiss")).toBe(true);
    // The phone's nudge holds the ✕ on the first line's end (`.d4n.ph .ld .la .x4`).
    expect(line.lastElementChild!.className.split(/\s+/)).toEqual(expect.arrayContaining(["mt-[-2px]", "md:mt-0"]));
  });
});

describe("What's new on Home", () => {
  it("hides the row at once, sends Home's key, and takes it off the new count", async () => {
    render(<WhatsNew feed={feed([view(1), view(2)])} now={NOW} />);
    expect(screen.getByText(feedCopy.home.newCount(2), { exact: false })).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: plain(d.aria(titleOf(1))) })); });
    expect(m.dismiss).toHaveBeenCalledWith("set:s1");
    expect(screen.queryByText(titleOf(1))).toBeNull();
    expect(screen.getByText(titleOf(2))).toBeInTheDocument();
    expect(screen.getByText(feedCopy.home.newCount(1), { exact: false })).toBeInTheDocument();
  });

  it("rings the next ✕ (2px accent, radius 8) even after a pointer press", async () => {
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { cb(0); return 0; });
    render(<WhatsNew feed={feed([view(1), view(2)])} now={NOW} />);
    const second = screen.getByRole("button", { name: plain(d.aria(titleOf(2))) });
    expect(second.className.split(/\s+/)).toEqual(expect.arrayContaining(["rounded-[8px]", "focus-visible:outline-transparent", "focus-visible:shadow-[0_0_0_2px_var(--accent)]"]));
    // A transparent outline, never none: forced-colors mode drops the shadow and paints the outline in a system color.
    expect(second.className).not.toContain("focus-visible:outline-none");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: plain(d.aria(titleOf(1))) })); });
    expect(document.activeElement).toBe(second);
    // The ring rides a marker, since :focus-visible does not match after a pointer press; blur clears it.
    expect(second).toHaveAttribute("data-ring");
    expect(second.className.split(/\s+/)).toContain("data-[ring]:shadow-[0_0_0_2px_var(--accent)]");
    act(() => { second.blur(); });
    expect(second).not.toHaveAttribute("data-ring");
    raf.mockRestore();
  });

  it("lands on the section's head when its last row goes and the section stays", async () => {
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { cb(0); return 0; });
    render(<WhatsNew feed={feed([view(1)])} now={NOW} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: plain(d.aria(titleOf(1))) })); });
    expect(document.activeElement?.id).toBe("home-whats-new");
    // The head takes focus plainly: no forced ring after a pointer press.
    expect(document.getElementById("home-whats-new")).not.toHaveAttribute("data-ring");
    raf.mockRestore();
  });

  it("brings the row back with the toast when the write fails", async () => {
    m.dismiss.mockResolvedValue({ ok: false, reason: "off" });
    render(<WhatsNew feed={feed([view(1)])} now={NOW} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: plain(d.aria(titleOf(1))) })); });
    expect(screen.getByText(titleOf(1))).toBeInTheDocument();
    expect(screen.getByText(d.failed)).toBeInTheDocument();
  });
});

describe("the lead story", () => {
  it("leaves the slot at once on its ✕, under its own key", async () => {
    const lead = view(9, { key: "item:0f4b1c9e-1d2a-4c3b-8e5f-6a7b8c9d0e1f" });
    render(<LeadSlot lead={lead} now={NOW} />);
    expect(screen.getByText(titleOf(9))).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: plain(d.aria(titleOf(9))) })); });
    expect(m.dismiss).toHaveBeenCalledWith(lead.key);
    expect(screen.queryByText(titleOf(9))).toBeNull();
  });
});

describe("where focus goes (Copilot round 1, #2285)", () => {
  const scope = (html: string) => {
    document.body.innerHTML = `<section data-dismiss-scope>${html}</section>`;
    return [...document.querySelectorAll<HTMLButtonElement>("[data-feed-dismiss]")];
  };
  afterEach(() => { document.body.innerHTML = ""; });

  it("crosses from Today's last row into Earlier's first", () => {
    const [, last, first] = scope(`<ul><li><button data-feed-dismiss></button></li><li><button data-feed-dismiss></button></li></ul>
      <ul><li><button data-feed-dismiss></button></li></ul>`);
    expect(nextDismiss(last)).toBe(first);
  });

  it("passes over a ✕ disabled while an answer is out, and goes back when nothing follows", () => {
    const [a, b, c] = scope(`<ul><li><button data-feed-dismiss></button></li><li><button data-feed-dismiss></button></li>
      <li><button data-feed-dismiss disabled></button></li></ul>`);
    expect(nextDismiss(a)).toBe(b);
    expect(nextDismiss(b)).toBe(a);
    expect(nextDismiss(c)).toBe(b);
  });

  it("finds nothing outside a scope, or with no other ✕ in it", () => {
    const [only] = scope(`<button data-feed-dismiss></button>`);
    expect(nextDismiss(only)).toBeNull();
    document.body.innerHTML = `<button data-feed-dismiss></button>`;
    expect(nextDismiss(document.querySelector<HTMLElement>("button")!)).toBeNull();
  });
});

describe("the lead and the count (Copilot round 1, #2285)", () => {
  it("takes an unseen lead off What's new's count with the story, and puts it back when the write fails", async () => {
    const lead = view(9, { key: "item:0f4b1c9e-1d2a-4c3b-8e5f-6a7b8c9d0e1f" });
    const both = () => (
      <HeldLeadProvider>
        <LeadSlot lead={lead} now={NOW} />
        <WhatsNew feed={feed([view(1)], lead)} now={NOW} />
      </HeldLeadProvider>
    );
    const { unmount } = render(both());
    expect(screen.getByText(feedCopy.home.newCount(2), { exact: false })).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: plain(d.aria(titleOf(9))) })); });
    expect(screen.getByText(feedCopy.home.newCount(1), { exact: false })).toBeInTheDocument();
    unmount();

    m.dismiss.mockResolvedValue({ ok: false, reason: "off" });
    render(both());
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: plain(d.aria(titleOf(9))) })); });
    expect(screen.getByText(titleOf(9))).toBeInTheDocument();
    expect(screen.getByText(feedCopy.home.newCount(2), { exact: false })).toBeInTheDocument();
  });
});

describe("Waiting on you", () => {
  const NOW_D = new Date(NOW);
  const trade: WaitingRow = {
    key: "item:aaaaaaaa-1d2a-4c3b-8e5f-6a7b8c9d0e1f", kind: "trade-match", createdAt: new Date(NOW_D.getTime() - 3_600_000), unseen: true,
    card: { oracleId: "ghalta", name: "Ghalta, Primal Hunger", imageUri: null },
    friend: { publicId: "pub-colin", displayName: named("Colin"), commander: null }, pods: [named("Thursday pod")], askable: false,
  };
  const ask = {
    key: "bbbbbbbb-1d2a-4c3b-8e5f-6a7b8c9d0e1f", kind: "spare-request", createdAt: new Date(NOW_D.getTime() - 7_200_000), unseen: true,
    ask: {
      id: "bbbbbbbb-1d2a-4c3b-8e5f-6a7b8c9d0e1f", card: { oracleId: "sol", name: "Sol Ring", imageUri: null },
      asker: { publicId: "pub-ana", displayName: named("Ana"), commander: null }, spare: 2, copies: 1, deckName: null, daysLeft: 13, createdAt: new Date(NOW_D.getTime() - 7_200_000),
    },
  } as unknown as WaitingRow;

  it("hides a trade match under its feed key and an ask under ask:<request id>, the head counting what is left", async () => {
    render(<WaitingOnYou rows={[ask, trade]} now={NOW_D} />);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(w.head(2));
    const rows = screen.getAllByTestId("waiting-row");
    await act(async () => { fireEvent.click(within(rows[1]).getByRole("button", { name: /^Hide/ })); });
    expect(m.dismiss).toHaveBeenCalledWith(trade.key);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(w.head(1));
    await act(async () => { fireEvent.click(within(screen.getAllByTestId("waiting-row")[0]).getByRole("button", { name: /^Hide/ })); });
    expect(m.dismiss).toHaveBeenLastCalledWith("ask:bbbbbbbb-1d2a-4c3b-8e5f-6a7b8c9d0e1f");
    expect(screen.queryAllByTestId("waiting-row")).toHaveLength(0);
  });

  it("ends each row's action line with its ✕, after the presses, with no reserve on the text column", () => {
    render(<WaitingOnYou rows={[ask, trade]} now={NOW_D} />);
    for (const title of [plain(w.askTitle(named("Ana"), "Sol Ring")), plain(w.tradeTitle(named("Colin"), "Ghalta, Primal Hunger"))]) {
      expect(screen.getByText(title).parentElement!.className).not.toMatch(/pr-\[/);
    }
    const [askRow, tradeRow] = screen.getAllByTestId("waiting-row");
    expect(within(askRow).getByRole("button", { name: /^Hide/ }).previousElementSibling!.getAttribute("data-testid")).toBe("spare-answer");
    const tradeX = within(tradeRow).getAllByRole("button", { name: /^Hide/ });
    expect(tradeX).toHaveLength(1);
    expect(tradeX[0].previousElementSibling!.textContent).toContain("Colin");
  });
});
