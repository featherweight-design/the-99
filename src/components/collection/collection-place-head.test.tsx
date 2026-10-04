import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ComponentProps, MouseEvent, ReactNode } from "react";
import { CollectionPlaceHead, placeFromPathname, type CollectionPlace } from "./collection-place-head";
import { collectionTabsCopy } from "../../lib/copy/collection";

let pathname = "/collection";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

// The real Link's own click handler returns before calling `onNavigate` at all when it finds
// no AppRouterContext (`if (!router) return;`), so a test with no router provider would never
// exercise it. This mock renders a plain <a> and fires onNavigate on click instead, keeping
// every existing assertion (href, aria-current, data-testid, text) on the real DOM shape.
vi.mock("next/link", () => ({
  default: ({
    href,
    onNavigate,
    children,
    ...rest
  }: ComponentProps<"a"> & { href: string; onNavigate?: (e: MouseEvent) => void; children: ReactNode }) => (
    <a href={href} onClick={(e) => onNavigate?.(e)} {...rest}>
      {children}
    </a>
  ),
  // PendingReporter (inside each tab's Link) reads this; always idle is fine here — this file
  // is not testing the pending overlay, only the optimistic highlight.
  useLinkStatus: () => ({ pending: false }),
}));

const refreshCollectionHeader = vi.fn();
vi.mock("../../app/collection/actions", () => ({
  refreshCollectionHeader: (...args: unknown[]) => refreshCollectionHeader(...args),
}));

beforeEach(() => {
  // Pending forever by default, so every existing test's synchronous assertions read the
  // seed props untouched; a test exercising the refresh resolves it explicitly.
  refreshCollectionHeader.mockReset().mockReturnValue(new Promise(() => {}));
});
afterEach(() => {
  pathname = "/collection";
});

const OWNED = { totalCards: 4492, uniqueCards: 2926 };
const EMPTY = { totalCards: 0, uniqueCards: 0 };

const PATH_FOR: Record<CollectionPlace, string> = {
  cards: "/collection",
  sets: "/collection/sets",
  proxies: "/collection/proxies",
};

function head(current: CollectionPlace, stats = OWNED, lastUpdatedLabel: string | null = null) {
  pathname = PATH_FOR[current];
  return render(<CollectionPlaceHead stats={stats} lastUpdatedLabel={lastUpdatedLabel} />);
}

function strip() {
  return screen.getByRole("navigation", { name: collectionTabsCopy.regionAria });
}

function tabNames() {
  return within(strip())
    .getAllByRole("link")
    .filter((a) => a.getAttribute("href") !== "/collection/replace")
    .map((a) => a.textContent);
}

describe("placeFromPathname", () => {
  it("names exactly the three routes the group's layout mounts on", () => {
    expect(placeFromPathname("/collection")).toBe("cards");
    expect(placeFromPathname("/collection/sets")).toBe("sets");
    expect(placeFromPathname("/collection/proxies")).toBe("proxies");
  });

  it("names nothing past them", () => {
    expect(placeFromPathname("/collection/sets/4ed")).toBeNull();
    expect(placeFromPathname("/collection/replace")).toBeNull();
    expect(placeFromPathname("/collection/replace/summary/u1")).toBeNull();
  });
});

describe("the place strip", () => {
  it("is a nav of plain links, one per route, with no query on any of them", () => {
    head("cards");
    const links = within(strip()).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/collection",
      "/collection/sets",
      "/collection/proxies",
      "/collection/replace",
    ]);
    // Place navigation, not ARIA tabs (E10).
    expect(within(strip()).queryAllByRole("tab")).toEqual([]);
  });

  it.each([
    ["cards", collectionTabsCopy.cards],
    ["sets", collectionTabsCopy.sets],
    ["proxies", collectionTabsCopy.proxies],
  ] as const)("marks %s as the current page, and only it", (place, name) => {
    head(place);
    const current = within(strip())
      .getAllByRole("link")
      .filter((a) => a.getAttribute("aria-current") === "page");
    expect(current.map((a) => a.textContent)).toEqual([name]);
  });

  it("leaves Sets out, not disabled, on an empty collection", () => {
    head("cards", EMPTY);
    expect(tabNames()).toEqual([collectionTabsCopy.cards, collectionTabsCopy.proxies]);
  });

  it("keeps the current route's own tab even then (E10)", () => {
    head("sets", EMPTY);
    expect(tabNames()).toEqual([
      collectionTabsCopy.cards,
      collectionTabsCopy.sets,
      collectionTabsCopy.proxies,
    ]);
  });
});

describe("the title block", () => {
  it("makes Collection the h1 on /collection alone (E11)", () => {
    head("cards");
    expect(screen.getByRole("heading", { level: 1, name: "Collection" })).toBeTruthy();
  });

  it.each(["sets", "proxies"] as const)("leaves the h1 to %s's own section name", (place) => {
    head(place);
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByText("Collection").tagName).toBe("P");
  });

  it("keeps the stats line on an empty collection, so the strip does not move", () => {
    head("proxies", EMPTY);
    expect(screen.getByText("0 cards · 0 unique")).toBeTruthy();
  });

  it("says when the collection was last updated, on every route", () => {
    head("sets", OWNED, "today");
    expect(screen.getByText("4,492 cards · 2,926 unique · last updated today")).toBeTruthy();
  });

  it("offers Replace only when there is a collection to replace", () => {
    // Two copies: the phone's link in the strip and the desktop button by the title.
    const { unmount } = head("cards");
    expect(screen.getAllByRole("link", { name: /Replace/ })).toHaveLength(2);
    unmount();
    head("cards", EMPTY);
    expect(screen.queryAllByRole("link", { name: /Replace/ })).toEqual([]);
  });
});

// The layout that mounts this once fetches its two props on its own first mount only, and
// does not re-run on a sibling navigation — so a collection change made in another tab or on
// another device would otherwise leave the header's counts, and Sets/Replace's visibility,
// stuck at whatever they were on arrival (round 2, #1222).
describe("refreshing the two figures", () => {
  it("does not re-read on mount — the layout's own props are already fresh", async () => {
    head("cards", OWNED);
    // Give any accidental effect a tick to fire before asserting it never did (round 5):
    // repeating the exact read the layout just made would cost a server-action round trip
    // and two database reads on every entry into these routes.
    await waitFor(() => expect(refreshCollectionHeader).not.toHaveBeenCalled());
  });

  it("re-reads when the reader switches tabs within the mounted strip", async () => {
    refreshCollectionHeader.mockResolvedValue({ stats: EMPTY, lastUpdatedLabel: null });
    const { rerender } = head("cards", OWNED);
    pathname = "/collection/sets";
    rerender(<CollectionPlaceHead stats={OWNED} lastUpdatedLabel={null} />);
    await waitFor(() => expect(refreshCollectionHeader).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(tabNames()).toEqual([
      collectionTabsCopy.cards,
      collectionTabsCopy.sets,
      collectionTabsCopy.proxies,
    ]));
  });

  it("re-reads on window focus, the same cross-tab trigger DeltaStrip polls on", async () => {
    refreshCollectionHeader.mockResolvedValue({ stats: EMPTY, lastUpdatedLabel: null });
    head("cards", OWNED);
    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(refreshCollectionHeader).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(tabNames()).toEqual([collectionTabsCopy.cards, collectionTabsCopy.proxies]));
  });

  it("leaves the header exactly as it was when a refresh fails", async () => {
    refreshCollectionHeader.mockRejectedValue(new Error("offline"));
    head("cards", OWNED);
    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(refreshCollectionHeader).toHaveBeenCalledTimes(1));
    expect(screen.getByText("4,492 cards · 2,926 unique")).toBeTruthy();
  });

  it("applies only the latest of two in-flight reads", async () => {
    let resolveFirst: (v: { stats: typeof OWNED; lastUpdatedLabel: null }) => void = () => {};
    refreshCollectionHeader
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValueOnce({ stats: EMPTY, lastUpdatedLabel: null });
    const { rerender } = head("cards", OWNED);
    pathname = "/collection/sets";
    rerender(<CollectionPlaceHead stats={OWNED} lastUpdatedLabel={null} />);
    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(refreshCollectionHeader).toHaveBeenCalledTimes(2));
    // The stale first read (the tab switch) resolves last; it must not overwrite the
    // second's (the focus) answer. Read the stats line rather than tabNames: Sets stays
    // visible on its own route even when empty (E10), so it cannot tell the two states
    // apart here.
    resolveFirst({ stats: OWNED, lastUpdatedLabel: null });
    await waitFor(() => expect(screen.getByText("0 cards · 0 unique")).toBeTruthy());
  });
});

function currentTestId(): string | undefined {
  return within(strip())
    .getAllByRole("link")
    .find((a) => a.getAttribute("aria-current") === "page")
    ?.getAttribute("data-testid")
    ?.replace("collection-tab-", "");
}

function pressTab(place: CollectionPlace) {
  fireEvent.click(screen.getByTestId(`collection-tab-${place}`));
}

// A press must move the underline and aria-current to the pressed tab at once, not once its
// content has loaded — pathname (the mocked prop driving `current`) is NEVER changed by these
// presses alone, so any movement proves the optimistic state, not a real commit (#1222 follow-up,
// Hugh's ruling).
describe("optimistic tab highlight", () => {
  it("moves aria-current to the pressed tab before the pathname commits", () => {
    const { rerender } = head("cards");
    pressTab("sets");
    rerender(<CollectionPlaceHead stats={OWNED} lastUpdatedLabel={null} />);
    expect(currentTestId()).toBe("sets");
  });

  it("a second press before the first lands overwrites the target rather than stacking", () => {
    const { rerender } = head("cards");
    pressTab("sets");
    rerender(<CollectionPlaceHead stats={OWNED} lastUpdatedLabel={null} />);
    pressTab("proxies");
    rerender(<CollectionPlaceHead stats={OWNED} lastUpdatedLabel={null} />);
    expect(currentTestId()).toBe("proxies");
  });

  it("reconciles to whatever the pathname actually commits to, not necessarily the press", () => {
    const { rerender } = head("cards");
    pressTab("sets");
    rerender(<CollectionPlaceHead stats={OWNED} lastUpdatedLabel={null} />);
    expect(currentTestId()).toBe("sets");
    // The real navigation lands somewhere else entirely — a race with another press, or a
    // route the reader typed. The optimistic guess is discarded in favor of the real pathname.
    pathname = "/collection/proxies";
    rerender(<CollectionPlaceHead stats={OWNED} lastUpdatedLabel={null} />);
    expect(currentTestId()).toBe("proxies");
  });

  it("reconciles back to the starting tab after a real round trip, with no stuck guess", () => {
    // A Back that genuinely lands the reader on the tab they started from still passes
    // through a REAL commit to get there — Next never re-commits the identical pathname
    // without an intervening navigation, so there is no state where pendingPlace and the
    // live pathname can disagree forever; the effect above fires on every actual commit,
    // whichever route it resolves to.
    const { rerender } = head("cards");
    pressTab("sets");
    rerender(<CollectionPlaceHead stats={OWNED} lastUpdatedLabel={null} />);
    pathname = "/collection/sets";
    rerender(<CollectionPlaceHead stats={OWNED} lastUpdatedLabel={null} />);
    expect(currentTestId()).toBe("sets");
    pressTab("cards");
    rerender(<CollectionPlaceHead stats={OWNED} lastUpdatedLabel={null} />);
    pathname = "/collection";
    rerender(<CollectionPlaceHead stats={OWNED} lastUpdatedLabel={null} />);
    expect(currentTestId()).toBe("cards");
  });
});

describe("rendered on an unrecognised path", () => {
  it("throws rather than guessing", () => {
    pathname = "/collection/replace";
    expect(() => render(<CollectionPlaceHead stats={OWNED} lastUpdatedLabel={null} />)).toThrow(
      /unrecognised path/,
    );
  });
});
