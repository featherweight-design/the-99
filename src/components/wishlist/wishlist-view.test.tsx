import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { wishlistCopy } from "../../lib/copy/wishlist";

// Collection › Wishlist's view: the tiles and their caption, the meta and friends lines, the empty state, the collected
// strip's dismiss, and the search's Add turning into the stepper, with a failed step put back under a toast.
const m = vi.hoisted(() => ({
  search: vi.fn(),
  add: vi.fn(),
  setWant: vi.fn(),
  dismiss: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh }) }));
vi.mock("../../app/collection/wishlist/actions", () => ({
  searchWishlistCardsAction: m.search,
  addToWishlistAction: m.add,
  setWishlistWantAction: m.setWant,
  dismissCollectedAction: m.dismiss,
}));
// Card details is its own surface, tested on its own: here a tile only has to be a press that names its card.
vi.mock("../cards/card-detail-provider", () => ({
  CardDetailProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  CardDetailTrigger: ({ name, children }: { name: string; children: ReactNode }) => (
    <button type="button" aria-label={name}>
      {children}
    </button>
  ),
}));

import { WishlistView, type WishlistViewTile } from "./wishlist-view";

const SOL = "11111111-1111-4111-8111-111111111111";
const ARCANE = "22222222-2222-4222-8222-222222222222";
const tile = (over: Partial<WishlistViewTile> = {}): WishlistViewTile => ({
  oracleId: SOL, name: "Sol Ring", imageUri: "https://img/sol", want: 2, have: 1, addedAt: "2026-10-14T00:00:00.000Z", ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  m.dismiss.mockResolvedValue({ ok: true, dismissed: 1 });
});
afterEach(() => vi.useRealTimers());

const view = (over: Partial<Parameters<typeof WishlistView>[0]> = {}) =>
  render(<WishlistView tiles={[]} notices={[]} hasFriend={false} {...over} />);

async function search(q: string) {
  fireEvent.change(screen.getByRole("searchbox", { name: /search/i }), { target: { value: q } });
  return screen.findByRole("list", { name: /./ });
}

describe("the list", () => {
  it("draws the empty state, and no meta line, with nothing on the list", () => {
    view();
    expect(screen.getByText(wishlistCopy.page.emptyTitle)).toBeInTheDocument();
    expect(screen.getByText(wishlistCopy.page.emptyBody)).toBeInTheDocument();
    expect(screen.queryByText(wishlistCopy.page.meta(0))).toBeNull();
  });

  it("draws a tile per line with its want and have, and the count wanted", () => {
    view({ tiles: [tile(), tile({ oracleId: ARCANE, name: "Arcane Signet", want: 3, have: 0 })] });
    const tiles = screen.getAllByTestId("wishlist-tile");
    expect(tiles).toHaveLength(2);
    expect(within(tiles[0]!).getByTestId("wishlist-tile-caption")).toHaveTextContent("want 2 · have 1");
    expect(within(tiles[0]!).getByRole("button", { name: "Sol Ring" })).toBeInTheDocument();
    expect(screen.getByText(wishlistCopy.page.meta(2))).toBeInTheDocument();
    expect(screen.queryByTestId("wishlist-empty")).toBeNull();
  });

  it("says friends can see it only when the reader has a friend", () => {
    const { unmount } = view({ tiles: [tile()] });
    expect(screen.queryByText(wishlistCopy.page.friendsLine)).toBeNull();
    unmount();
    view({ tiles: [tile()], hasFriend: true });
    expect(screen.getByText(wishlistCopy.page.friendsLine)).toBeInTheDocument();
  });

  it("sorts by name on request, newest first otherwise", () => {
    view({ tiles: [tile(), tile({ oracleId: ARCANE, name: "Arcane Signet", addedAt: "2026-10-01T00:00:00.000Z" })] });
    const names = () => screen.getAllByTestId("wishlist-tile").map((t) => within(t).getByRole("button").getAttribute("aria-label"));
    expect(names()).toEqual(["Sol Ring", "Arcane Signet"]);
    fireEvent.change(screen.getByRole("combobox", { name: wishlistCopy.page.sort.label }), { target: { value: "name" } });
    expect(names()).toEqual(["Arcane Signet", "Sol Ring"]);
  });
});

describe("the collected strip", () => {
  const notices = [
    { oracleId: SOL, name: "Sol Ring", collectedAt: "2026-10-15T10:00:00.123Z" },
    { oracleId: ARCANE, name: "Arcane Signet", collectedAt: "2026-10-15T11:00:00.456Z" },
  ];

  it("names what left, and its ✕ hides it at once and forgets exactly the notices it drew", () => {
    view({ notices });
    const strip = screen.getByRole("status");
    expect(strip).toHaveTextContent("Collected since you last looked: Sol Ring and Arcane Signet. They’ve left your wishlist.");
    fireEvent.click(within(strip).getByRole("button", { name: wishlistCopy.page.dismiss }));
    expect(screen.queryByRole("status")).toBeNull();
    expect(m.dismiss).toHaveBeenCalledWith([
      { oracleId: SOL, collectedAt: "2026-10-15T10:00:00.123Z" },
      { oracleId: ARCANE, collectedAt: "2026-10-15T11:00:00.456Z" },
    ]);
  });

  it("is not drawn with nothing collected", () => {
    view();
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("the search", () => {
  it("turns Add to wishlist into the stepper in place, and the new line shows as a tile", async () => {
    m.search.mockResolvedValue({ ok: true, results: [{ oracleId: SOL, name: "Sol Ring", imageUri: null, owned: 1, want: null }] });
    m.add.mockResolvedValue({ ok: true, status: "wanted", want: 2, have: 1 });
    view();
    const list = await search("sol");
    expect(m.search).toHaveBeenCalledWith("sol");
    expect(within(list).getByText(wishlistCopy.page.search.have(1))).toBeInTheDocument();
    await act(async () => fireEvent.click(within(list).getByRole("button", { name: wishlistCopy.page.search.add })));
    expect(m.add).toHaveBeenCalledWith(SOL);
    const stepper = within(list).getByTestId("want-stepper");
    expect(within(stepper).getByLabelText(wishlistCopy.details.want)).toHaveTextContent("2");
    expect(within(stepper).getByRole("button", { name: wishlistCopy.details.more })).toHaveFocus();
    expect(within(list).queryByRole("button", { name: wishlistCopy.page.search.add })).toBeNull();
    expect(m.refresh).toHaveBeenCalled();
    // Escape closes the panel, and the grid behind holds the new line.
    fireEvent.keyDown(screen.getByRole("searchbox", { name: /search/i }), { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("wishlist-results")).toBeNull());
    expect(screen.getAllByTestId("wishlist-tile")).toHaveLength(1);
  });

  it("draws the stepper straight away for a card already on the list", async () => {
    m.search.mockResolvedValue({ ok: true, results: [{ oracleId: SOL, name: "Sol Ring", imageUri: null, owned: 1, want: 3 }] });
    view({ tiles: [tile({ want: 3 })] });
    const list = await search("sol");
    expect(within(list).getByText(wishlistCopy.page.search.haveOnList(1))).toBeInTheDocument();
    expect(within(within(list).getByTestId("want-stepper")).getByLabelText(wishlistCopy.details.want)).toHaveTextContent("3");
  });

  it("puts the old count back and says so when a step fails", async () => {
    m.search.mockResolvedValue({ ok: true, results: [{ oracleId: SOL, name: "Sol Ring", imageUri: null, owned: 1, want: 2 }] });
    let fail!: () => void;
    m.setWant.mockReturnValue(new Promise((resolve) => (fail = () => resolve({ ok: false, reason: "invalid" }))));
    view({ tiles: [tile()] });
    const list = await search("sol");
    const count = () => within(within(list).getByTestId("want-stepper")).getByLabelText(wishlistCopy.details.want);
    fireEvent.click(within(list).getByRole("button", { name: wishlistCopy.details.more }));
    expect(count()).toHaveTextContent("3");
    expect(m.setWant).toHaveBeenCalledWith(SOL, 3);
    await act(async () => fail());
    expect(count()).toHaveTextContent("2");
    expect(screen.getByRole("alert")).toHaveTextContent(wishlistCopy.details.failedSet);
  });

  it("says an add failed, and keeps the press", async () => {
    m.search.mockResolvedValue({ ok: true, results: [{ oracleId: SOL, name: "Sol Ring", imageUri: null, owned: 0, want: null }] });
    m.add.mockRejectedValue(new Error("offline"));
    view();
    const list = await search("sol");
    await act(async () => fireEvent.click(within(list).getByRole("button", { name: wishlistCopy.page.search.add })));
    expect(screen.getByRole("alert")).toHaveTextContent(wishlistCopy.details.failedAdd);
    expect(within(list).getByRole("button", { name: wishlistCopy.page.search.add })).toBeInTheDocument();
  });
});
