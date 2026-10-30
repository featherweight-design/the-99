// Home, direction B (menu and Home PR 6): every Home state the feed draws, and the boundary at the mount. With no
// `feed` the Dashboard is Home as shipped: Ready to build, no lead and no What's new.
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/" }));
vi.mock("../../app/friends/actions", () => ({ createInviteAction: vi.fn() }));
vi.mock("../social/use-invite-watch", () => ({ useInviteWatch: vi.fn() }));
vi.mock("../../app/settings/feed-actions", () => ({ saveFeedKinds: vi.fn() }));
const spare = vi.hoisted(() => ({ answerSpareAction: vi.fn() }));
vi.mock("../../app/friends/spare-actions", () => spare);
vi.mock("../cards/card-detail-provider", () => ({
  CardDetailProvider: ({ children }: { children: React.ReactNode }) => <div data-card-detail-provider>{children}</div>,
  useCardDetailIfAny: () => null,
}));
vi.mock("../push/push-landing", () => ({ PushLanding: () => <i data-push-landing /> }));
import { Dashboard } from "./dashboard";
import type { FeedView, HomeFeed } from "../../lib/feed/home";
import type { CommanderListItem } from "../../lib/recs/recommend";
import { named } from "../../lib/person-name/mint";

const NOW = "2026-10-22T12:00:00.000Z";
const READY = {
  shown: [{ oracleId: "o1", slug: "atraxa", name: "Atraxa, Praetors' Voice", colorIdentity: ["W"], imageUri: null, score: 74, measurableTotal: 100, colorPoolSize: 92 } as unknown as CommanderListItem],
  moreCount: 0,
  floor: null,
};
const BASE = {
  stats: { totalCards: 1284, uniqueCards: 900 },
  lastUpdated: new Date("2026-10-20T00:00:00Z"),
  ready: READY,
  inUse: new Map(),
  decks: [],
  commitments: { inUse: 312, overCommitted: 3 },
  shopping: { byDeck: new Map(), total: { copies: 18, cents: 9480, pricedCopies: 18 } },
  friends: {
    you: { displayName: "Hugh", commander: null },
    friends: [{ publicId: "p1", displayName: named("Colin"), commander: { oracleId: "x", name: "X", artCropUri: "colin.jpg" } }],
    links: [],
    games: false,
    friendPages: true,
    invites: null,
  },
  now: NOW,
};

const view = (n: number, o: Partial<FeedView> = {}): FeedView => ({
  key: `k${n}`, kind: "new-set", at: new Date(Date.parse(NOW) - (n + 1) * 3_600_000).toISOString(), unseen: false,
  card: null, friend: null, href: `/collection/sets/s${n}`, opens: null, outbound: null, name: `Set ${n}`, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false, ...o,
});
const LEAD = view(0, {
  kind: "trade-match", unseen: true, key: "lead", name: null, href: "/friends/p1",
  card: { oracleId: "g", name: "Ghalta, Primal Hunger", image: "g.jpg", art: "g-art.jpg", colorIdentity: ["G"] }, friend: { publicId: "p1", displayName: named("Colin") },
});
const chosen = (items: FeedView[], o: Partial<Extract<HomeFeed, { chosen: true }>> = {}): HomeFeed => ({ chosen: true, on: ["new-set", "trade-match"], items, unseen: 0, lead: null, ...o });

const readyToBuild = () => screen.queryByText("92 of your cards fit");

describe("Home with the feed switch off: the boundary at the mount", () => {
  it("is Home as shipped: Ready to build, no lead, no What's new, no card-detail provider", () => {
    const { container } = render(<Dashboard {...BASE} />);
    expect(readyToBuild()).toBeInTheDocument();
    expect(container.querySelector("[data-lead-story]")).toBeNull();
    expect(container.querySelector("[data-whats-new]")).toBeNull();
    expect(container.querySelector("[data-card-detail-provider]")).toBeNull();
  });

  it("is the same with feed={null}, the page's value while the switch is off", () => {
    const { container } = render(<Dashboard {...BASE} feed={null} />);
    expect(readyToBuild()).toBeInTheDocument();
    expect(container.querySelector("[data-whats-new]")).toBeNull();
  });
});

describe("Home, direction B", () => {
  it("a normal day: the lead story on top with the friend's face, then What's new without the lead; Ready to build leaves", () => {
    const { container } = render(<Dashboard {...BASE} feed={chosen([view(1, { unseen: true }), view(2)], { lead: LEAD, unseen: 2 })} />);
    expect(readyToBuild()).toBeNull();
    const lead = container.querySelector("[data-lead-story=trade-match]")!;
    // The About capture finds the lead by this attribute (about-locators.mjs).
    expect(lead).toHaveAttribute("data-feed-lead");
    expect(lead).toHaveTextContent("Colin has a spare Ghalta, Primal Hunger");
    expect(lead.querySelector("[data-lead-face] [data-face=art]")).not.toBeNull();
    expect(lead.querySelector('[data-commander-thumb="lead"]')).not.toBeNull();
    expect(screen.getByRole("link", { name: "See Colin’s spares" })).toHaveAttribute("href", "/friends/p1");
    const list = container.querySelector("[data-whats-new=items]")!;
    expect(list.querySelectorAll("[data-feed-item]")).toHaveLength(2);
    expect(list).not.toHaveTextContent("Ghalta");
    expect(screen.getByText("· 2 new")).toBeInTheDocument();
    // The lead heads the main column, before the resume slot and What's new.
    const order = [...container.querySelectorAll("[data-lead-story], [data-whats-new]")].map((e) => e.hasAttribute("data-lead-story"));
    expect(order).toEqual([true, false]);
  });

  it("orders the phone's blocks: resume, What's new, Friends, Commitments", () => {
    const { container } = render(<Dashboard {...BASE} feed={chosen([view(1)])} />);
    const ordered = (el: Element) => el.closest('[class^="order-"], [class*=" order-"]');
    const orderOf = (el: Element | null) => Number(/(?:^|\s)order-(\d)/.exec(el?.className ?? "")?.[1]);
    const whatsNew = container.querySelector("[data-whats-new]");
    const friends = ordered(container.querySelector("#home-friends-head")!);
    const commitments = ordered(screen.getByText("Commitments"));
    expect(orderOf(whatsNew)).toBe(3);
    expect(orderOf(friends)).toBe(4);
    expect(orderOf(commitments)).toBe(5);
  });

  it("a busy feed: five shown and Show all N", () => {
    render(<Dashboard {...BASE} feed={chosen(Array.from({ length: 9 }, (_, i) => view(i + 1)), { lead: LEAD, unseen: 1 })} />);
    expect(screen.getByRole("button", { name: "Show all 9" })).toBeInTheDocument();
  });

  it("empty with kinds on: no lead, the quiet line naming the kinds", () => {
    const { container } = render(<Dashboard {...BASE} feed={chosen([])} />);
    expect(container.querySelector("[data-lead-story]")).toBeNull();
    expect(container.querySelector("[data-whats-new=quiet]")).toHaveTextContent("You hear about new sets and trade matches here.");
  });

  it("nothing in the window, never chosen: no lead, the quiet line, then the offer line (small items 5)", () => {
    const { container } = render(<Dashboard {...BASE} feed={{ chosen: false, offer: ["new-set", "combo"], on: ["spare-request"] }} />);
    expect(container.querySelector("[data-lead-story]")).toBeNull();
    expect(container.querySelector("[data-whats-new=quiet]")).toHaveTextContent("You hear about friends asking for your spares here.");
    expect(container.querySelector("[data-whats-new=quiet] [data-feed-offer=closed]")).not.toBeNull();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("every kind off: no lead, the offer line alone", () => {
    const { container } = render(<Dashboard {...BASE} feed={{ chosen: false, offer: ["new-set", "combo"], on: [] }} />);
    expect(container.querySelector("[data-lead-story]")).toBeNull();
    expect(container.querySelector("[data-whats-new=offer] [data-feed-offer=closed]")).not.toBeNull();
    expect(container.querySelector("[data-feed-quiet]")).toBeNull();
  });
});

// Spare requests PR 3d, Copilot round 1: an answered spare request is held in the lead's place for the visit, and the
// action's redraw moves the server's lead on. That new lead has already left the list (`splitLead`), so What's new
// draws it as a row while the receipt holds the slot: never drawn nowhere, never marked seen unread.
describe("Home holding an answered spare request", () => {
  const ASK = view(0, {
    kind: "spare-request", unseen: true, key: "ask", name: null, href: null,
    card: { oracleId: "l", name: "Lathliss, Dragon Queen", image: null, art: null, colorIdentity: ["R"] },
    friend: { publicId: "p1", displayName: named("Colin") },
    ask: { id: "req-1", spare: 2, copies: 1, deckName: null, daysLeft: 13 },
  });
  const OTHER = view(2, { key: "set-2" });

  it("draws a lead the held receipt displaces as a What's new row, beside the receipt", async () => {
    spare.answerSpareAction.mockResolvedValue({ ok: true });
    const { container, rerender } = render(<Dashboard {...BASE} feed={chosen([OTHER], { lead: ASK, unseen: 2, on: ["spare-request", "trade-match", "new-set"] })} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /^Yes,/ })));
    // The redraw: the answered ask has left the feed, and the trade match is the server's lead now, out of the list.
    rerender(<Dashboard {...BASE} feed={chosen([OTHER], { lead: LEAD, unseen: 1 })} />);
    const lead = container.querySelector<HTMLElement>("[data-lead-story]")!;
    expect(lead.dataset.leadStory).toBe("spare-request");
    expect(within(lead).getByRole("heading", { level: 3 }).textContent).toBe("You’re sparing Lathliss for Colin");
    const list = container.querySelector<HTMLElement>("[data-whats-new]")!;
    expect(list.querySelector('[data-feed-item="trade-match"]')).not.toBeNull();
    expect(within(list).getByText("Colin has a spare Ghalta, Primal Hunger")).toBeTruthy();
  });

  it("before any answer, the server's lead is the lead and is not repeated in the list", () => {
    const { container } = render(<Dashboard {...BASE} feed={chosen([OTHER], { lead: LEAD, unseen: 1 })} />);
    expect(container.querySelector<HTMLElement>("[data-lead-story]")!.dataset.leadStory).toBe("trade-match");
    expect(container.querySelector('[data-whats-new] [data-feed-item="trade-match"]')).toBeNull();
  });
});

describe("a push's landing on Home (push PR 5): the boundary at the mount", () => {
  it("mounts the landing inside the feed's card-detail provider when push is on", () => {
    const { container } = render(<Dashboard {...BASE} feed={chosen([view(1)])} pushVisit="v1" />);
    expect(container.querySelector("[data-card-detail-provider] [data-push-landing]")).not.toBeNull();
  });

  it("mounts nothing with push off, or with no feed", () => {
    expect(render(<Dashboard {...BASE} feed={chosen([view(1)])} />).container.querySelector("[data-push-landing]")).toBeNull();
    expect(render(<Dashboard {...BASE} feed={chosen([view(1)])} pushVisit={null} />).container.querySelector("[data-push-landing]")).toBeNull();
    expect(render(<Dashboard {...BASE} feed={null} pushVisit="v1" />).container.querySelector("[data-push-landing]")).toBeNull();
  });
});
