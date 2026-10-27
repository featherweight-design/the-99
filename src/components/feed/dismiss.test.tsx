// The ✕ on What's new, its lead story and Waiting on you (Hugh's ruling 2026-10-27): each surface draws Your requests'
// bare ✕ at the row's top right with its 44px coarse hit, the press hides the item at once under the key the server
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
  it("is Your requests' bare ✕: 36px at the row's top right, a 44px coarse hit, named for the item", () => {
    const onDismiss = vi.fn();
    render(<ul><FeedItemRow item={view(1)} now={NOW} onDismiss={onDismiss} /></ul>);
    const x = screen.getByRole("button", { name: d.aria(titleOf(1)) });
    for (const c of ["absolute", "top-[6px]", "right-[4px]", "h-[36px]", "w-[36px]", "pointer-coarse:after:h-[44px]", "pointer-coarse:after:w-[44px]"]) {
      expect(x.className.split(/\s+/)).toContain(c);
    }
    expect(x.closest("li")!.className).toMatch(/(^|\s)relative(\s|$)/);
    fireEvent.click(x);
    expect(onDismiss).toHaveBeenCalledWith(x);
  });

  it("is not drawn without a dismiss, and keeps the whole text column and the desktop column clear of it when drawn", () => {
    const { container, rerender } = render(<ul><FeedItemRow item={view(1)} now={NOW} /></ul>);
    expect(container.querySelector("[data-feed-dismiss]")).toBeNull();
    rerender(<ul><FeedItemRow item={view(1)} now={NOW} onDismiss={() => {}} /></ul>);
    expect(container.querySelector("[data-feed-age-desktop]")!.parentElement!.className).toMatch(/md:pr-\[34px\]/);
    // The title's own column, not the kicker alone (Copilot round 3): a long title's first line runs beside the ✕.
    const column = screen.getByText(titleOf(1)).parentElement!.className.split(/\s+/);
    expect(column).toContain("pr-[30px]");
    expect(column).toContain("md:pr-0");
  });

  it("keeps the lead's whole text column clear of its ✕", () => {
    render(<LeadSlot lead={view(9, { key: "item:0f4b1c9e-1d2a-4c3b-8e5f-6a7b8c9d0e1f" })} now={NOW} />);
    const lead = screen.getByRole("heading", { level: 3 }).parentElement!.className.split(/\s+/);
    expect(lead).toContain("pr-[28px]");
    expect(lead).toContain("md:pr-[20px]");
  });
});

describe("What's new on Home", () => {
  it("hides the row at once, sends Home's key, and takes it off the new count", async () => {
    render(<WhatsNew feed={feed([view(1), view(2)])} now={NOW} />);
    expect(screen.getByText(feedCopy.home.newCount(2), { exact: false })).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: d.aria(titleOf(1)) })); });
    expect(m.dismiss).toHaveBeenCalledWith("set:s1");
    expect(screen.queryByText(titleOf(1))).toBeNull();
    expect(screen.getByText(titleOf(2))).toBeInTheDocument();
    expect(screen.getByText(feedCopy.home.newCount(1), { exact: false })).toBeInTheDocument();
  });

  it("lands on the section's head when its last row goes and the section stays", async () => {
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => { cb(0); return 0; });
    render(<WhatsNew feed={feed([view(1)])} now={NOW} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: d.aria(titleOf(1)) })); });
    expect(document.activeElement?.id).toBe("home-whats-new");
    raf.mockRestore();
  });

  it("brings the row back with the toast when the write fails", async () => {
    m.dismiss.mockResolvedValue({ ok: false, reason: "off" });
    render(<WhatsNew feed={feed([view(1)])} now={NOW} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: d.aria(titleOf(1)) })); });
    expect(screen.getByText(titleOf(1))).toBeInTheDocument();
    expect(screen.getByText(d.failed)).toBeInTheDocument();
  });
});

describe("the lead story", () => {
  it("leaves the slot at once on its ✕, under its own key", async () => {
    const lead = view(9, { key: "item:0f4b1c9e-1d2a-4c3b-8e5f-6a7b8c9d0e1f" });
    render(<LeadSlot lead={lead} now={NOW} />);
    expect(screen.getByText(titleOf(9))).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: d.aria(titleOf(9)) })); });
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
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: d.aria(titleOf(9)) })); });
    expect(screen.getByText(feedCopy.home.newCount(1), { exact: false })).toBeInTheDocument();
    unmount();

    m.dismiss.mockResolvedValue({ ok: false, reason: "off" });
    render(both());
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: d.aria(titleOf(9)) })); });
    expect(screen.getByText(titleOf(9))).toBeInTheDocument();
    expect(screen.getByText(feedCopy.home.newCount(2), { exact: false })).toBeInTheDocument();
  });
});

describe("Waiting on you", () => {
  const NOW_D = new Date(NOW);
  const trade: WaitingRow = {
    key: "item:aaaaaaaa-1d2a-4c3b-8e5f-6a7b8c9d0e1f", kind: "trade-match", createdAt: new Date(NOW_D.getTime() - 3_600_000), unseen: true,
    card: { oracleId: "ghalta", name: "Ghalta, Primal Hunger", imageUri: null },
    friend: { publicId: "pub-colin", displayName: "Colin", commander: null }, pods: ["Thursday pod"], askable: false,
  };
  const ask = {
    key: "bbbbbbbb-1d2a-4c3b-8e5f-6a7b8c9d0e1f", kind: "spare-request", createdAt: new Date(NOW_D.getTime() - 7_200_000), unseen: true,
    ask: {
      id: "bbbbbbbb-1d2a-4c3b-8e5f-6a7b8c9d0e1f", card: { oracleId: "sol", name: "Sol Ring", imageUri: null },
      asker: { publicId: "pub-ana", displayName: "Ana", commander: null }, spare: 2, copies: 1, deckName: null, daysLeft: 13, createdAt: new Date(NOW_D.getTime() - 7_200_000),
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

  it("keeps each row's whole text column clear of its ✕ on a phone", () => {
    render(<WaitingOnYou rows={[ask, trade]} now={NOW_D} />);
    for (const title of [feedCopy.home.title.spareRequest("Ana", "Sol Ring"), w.tradeTitle("Colin", "Ghalta, Primal Hunger")]) {
      expect(screen.getByText(title).parentElement!.className.split(/\s+/)).toContain("pr-[30px]");
    }
  });
});
