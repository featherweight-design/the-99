// Home, direction B (menu and Home PR 6): every Home state the feed draws, and the boundary at the mount. With no
// `feed` the Dashboard is Home as shipped: Ready to build, no lead and no What's new.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/" }));
vi.mock("../../app/friends/actions", () => ({ createInviteAction: vi.fn() }));
vi.mock("../social/use-invite-watch", () => ({ useInviteWatch: vi.fn() }));
vi.mock("../../app/settings/feed-actions", () => ({ saveFeedKinds: vi.fn() }));
vi.mock("../cards/card-detail-provider", () => ({
  CardDetailProvider: ({ children }: { children: React.ReactNode }) => <div data-card-detail-provider>{children}</div>,
  useCardDetailIfAny: () => null,
}));
import { Dashboard } from "./dashboard";
import type { FeedView, HomeFeed } from "../../lib/feed/home";
import type { CommanderListItem } from "../../lib/recs/recommend";

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
    friends: [{ publicId: "p1", displayName: "Colin", commander: { oracleId: "x", name: "X", artCropUri: "colin.jpg" } }],
    links: [],
    games: false,
    friendPages: true,
    invites: null,
  },
  now: NOW,
};

const view = (n: number, o: Partial<FeedView> = {}): FeedView => ({
  key: `k${n}`, kind: "new-set", at: new Date(Date.parse(NOW) - (n + 1) * 3_600_000).toISOString(), unseen: false,
  card: null, friend: null, href: `/collection/sets/s${n}`, opens: null, name: `Set ${n}`, setSize: null, owned: null, drop: null, combo: null, ...o,
});
const LEAD = view(0, {
  kind: "trade-match", unseen: true, key: "lead", name: null, href: "/friends/p1",
  card: { oracleId: "g", name: "Ghalta, Primal Hunger", image: "g.jpg", art: "g-art.jpg" }, friend: { publicId: "p1", displayName: "Colin" },
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

  it("nothing chosen: no lead, the inline opt-in", () => {
    const { container } = render(<Dashboard {...BASE} feed={{ chosen: false, offer: ["new-set", "combo"] }} />);
    expect(container.querySelector("[data-lead-story]")).toBeNull();
    expect(container.querySelector("[data-whats-new=opt-in]")).not.toBeNull();
    expect(screen.getAllByRole("checkbox")).toHaveLength(2);
  });
});
