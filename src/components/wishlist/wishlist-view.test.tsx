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
  cardDetailCopy: { triggerAria: (name: string) => `View details for ${name}` },
  CardDetailTrigger: ({ name, ariaLabel, children }: { name: string; ariaLabel?: string; children: ReactNode }) => (
    <button type="button" aria-label={ariaLabel ?? name} data-card={name}>
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
    expect(within(tiles[0]!).getByTestId("wishlist-tile-caption")).toHaveTextContent("have 1 of 2");
    expect(within(tiles[0]!).getByRole("button", { name: "View details for Sol Ring, have 1 of 2" })).toBeInTheDocument();
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

  it("draws the server's list as it stands after a refresh, with nothing held over", () => {
    const { rerender } = view({ tiles: [tile(), tile({ oracleId: ARCANE, name: "Arcane Signet" })] });
    expect(screen.getAllByTestId("wishlist-tile")).toHaveLength(2);
    rerender(<WishlistView tiles={[tile({ want: 4 })]} notices={[]} hasFriend={false} />);
    const tiles = screen.getAllByTestId("wishlist-tile");
    expect(tiles).toHaveLength(1);
    expect(within(tiles[0]!).getByTestId("wishlist-tile-caption")).toHaveTextContent("have 1 of 4");
  });

  it("sorts by name on request, newest first otherwise", () => {
    view({ tiles: [tile(), tile({ oracleId: ARCANE, name: "Arcane Signet", addedAt: "2026-10-01T00:00:00.000Z" })] });
    const names = () => screen.getAllByTestId("wishlist-tile").map((t) => within(t).getByRole("button").getAttribute("data-card"));
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

  it("draws a notice a later refresh brings, after an earlier strip was dismissed", () => {
    const { rerender } = view({ notices: notices.slice(0, 1) });
    fireEvent.click(within(screen.getByRole("status")).getByRole("button", { name: wishlistCopy.page.dismiss }));
    expect(screen.queryByRole("status")).toBeNull();
    rerender(<WishlistView tiles={[]} notices={notices} hasFriend={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("Collected since you last looked: Arcane Signet. It’s left your wishlist.");
  });

  it("is not drawn with nothing collected", () => {
    view();
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("the search", () => {
  it("turns Add to wishlist into the stepper in place, and refreshes the list from the server", async () => {
    m.search.mockResolvedValue({ ok: true, results: [{ oracleId: SOL, name: "Sol Ring", imageUri: null, owned: 1, want: null }] });
    m.add.mockResolvedValue({ ok: true, status: "wanted", want: 2, have: 1 });
    view();
    const list = await search("sol");
    expect(m.search).toHaveBeenCalledWith("sol");
    expect(within(list).getByText(wishlistCopy.page.search.have(1))).toBeInTheDocument();
    const press = within(list).getByRole("button", { name: wishlistCopy.page.search.add });
    press.focus();
    await act(async () => fireEvent.click(press));
    expect(m.add).toHaveBeenCalledWith(SOL);
    const stepper = within(list).getByTestId("want-stepper");
    expect(within(stepper).getByLabelText(wishlistCopy.details.want)).toHaveTextContent("2");
    expect(within(stepper).getByRole("button", { name: wishlistCopy.details.more })).toHaveFocus();
    expect(within(list).queryByRole("button", { name: wishlistCopy.page.search.add })).toBeNull();
    expect(m.refresh).toHaveBeenCalled();
    // Escape from the stepper's press (where Add left focus) closes the panel and puts focus back in the field.
    fireEvent.keyDown(within(stepper).getByRole("button", { name: wishlistCopy.details.more }), { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("wishlist-results")).toBeNull());
    expect(screen.getByRole("searchbox", { name: /search/i })).toHaveFocus();
  });

  it("floors the stepper at one more than held, so a step cannot remove the line", async () => {
    m.search.mockResolvedValue({ ok: true, results: [{ oracleId: SOL, name: "Sol Ring", imageUri: null, owned: 1, want: 2 }] });
    view({ tiles: [tile()] });
    const list = await search("sol");
    const fewer = within(list).getByRole("button", { name: wishlistCopy.details.fewer });
    expect(fewer).toHaveAttribute("aria-disabled", "true");
    await act(async () => fireEvent.click(fewer));
    expect(m.setWant).not.toHaveBeenCalled();
    expect(within(list).getByTestId("want-stepper")).toBeInTheDocument();
  });

  it("moves the floor with what a write answers the collection holds, so the next step still cannot remove the line", async () => {
    // The collection grew from 1 to 3 while the results stood; a step to 5 answers have 3, so − stops at 4.
    m.search.mockResolvedValue({ ok: true, results: [{ oracleId: SOL, name: "Sol Ring", imageUri: null, owned: 1, want: 4 }] });
    m.setWant
      .mockResolvedValueOnce({ ok: true, status: "wanted", want: 5, have: 3 })
      .mockResolvedValueOnce({ ok: true, status: "wanted", want: 4, have: 3 });
    view({ tiles: [tile()] });
    const list = await search("sol");
    await act(async () => fireEvent.click(within(list).getByRole("button", { name: wishlistCopy.details.more })));
    const fewer = within(list).getByRole("button", { name: wishlistCopy.details.fewer });
    expect(fewer).not.toHaveAttribute("aria-disabled");
    await act(async () => fireEvent.click(fewer));
    expect(m.setWant).toHaveBeenLastCalledWith(SOL, 4);
    expect(within(list).getByRole("button", { name: wishlistCopy.details.fewer })).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps the line when the first press is − after the collection grew: the server floors it, the row follows", async () => {
    // The row read owned 1 and want 4; the collection is at 3 now. − sends 3, and the server answers the floored 4.
    m.search.mockResolvedValue({ ok: true, results: [{ oracleId: SOL, name: "Sol Ring", imageUri: null, owned: 1, want: 4 }] });
    m.setWant.mockResolvedValue({ ok: true, status: "wanted", want: 4, have: 3 });
    view({ tiles: [tile()] });
    const list = await search("sol");
    await act(async () => fireEvent.click(within(list).getByRole("button", { name: wishlistCopy.details.fewer })));
    expect(m.setWant).toHaveBeenCalledWith(SOL, 3);
    expect(within(list).getByTestId("want-stepper")).toBeInTheDocument();
    expect(within(list).getByRole("status", { name: wishlistCopy.details.want })).toHaveTextContent("4");
    expect(within(list).getByRole("button", { name: wishlistCopy.details.fewer })).toHaveAttribute("aria-disabled", "true");
  });

  it("names each stepper by its card, and puts focus back in the field when a held answer takes the stepper away", async () => {
    // The collection reached the want elsewhere while the result stood: the write answers `held` and the line goes.
    m.search.mockResolvedValue({ ok: true, results: [{ oracleId: SOL, name: "Sol Ring", imageUri: null, owned: 1, want: 2 }] });
    m.setWant.mockResolvedValue({ ok: true, status: "held", want: 3, have: 3 });
    view({ tiles: [tile()] });
    const list = await search("sol");
    expect(within(list).getByRole("group", { name: "Sol Ring" })).toBeInTheDocument();
    const more = within(list).getByRole("button", { name: wishlistCopy.details.more });
    more.focus();
    await act(async () => fireEvent.click(more));
    expect(within(list).getByRole("button", { name: wishlistCopy.page.search.add })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: /search/i })).toHaveFocus();
  });

  it("leaves focus in the field when the reader typed on before a slow Add landed", async () => {
    m.search.mockResolvedValue({ ok: true, results: [{ oracleId: SOL, name: "Sol Ring", imageUri: null, owned: 1, want: null }] });
    let land: (v: unknown) => void = () => {};
    m.add.mockImplementation(() => new Promise((resolve) => (land = resolve)));
    view();
    const list = await search("sol");
    const press = within(list).getByRole("button", { name: wishlistCopy.page.search.add });
    press.focus();
    fireEvent.click(press);
    const field = screen.getByRole("searchbox", { name: /search/i });
    field.focus();
    fireEvent.change(field, { target: { value: "sol r" } });
    await act(async () => land({ ok: true, status: "wanted", want: 2, have: 1 }));
    await screen.findByTestId("want-stepper");
    expect(field).toHaveFocus();
  });

  it("does not let a stepper from an earlier Add take focus when the search opens again", async () => {
    m.search.mockResolvedValue({ ok: true, results: [{ oracleId: SOL, name: "Sol Ring", imageUri: null, owned: 1, want: null }] });
    m.add.mockResolvedValue({ ok: true, status: "wanted", want: 2, have: 1 });
    view();
    const list = await search("sol");
    await act(async () => fireEvent.click(within(list).getByRole("button", { name: wishlistCopy.page.search.add })));
    const field = screen.getByRole("searchbox", { name: /search/i });
    fireEvent.keyDown(field, { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("wishlist-results")).toBeNull());
    field.focus();
    fireEvent.change(field, { target: { value: "s" } });
    await screen.findByTestId("want-stepper");
    expect(field).toHaveFocus();
  });

  it("never draws a count no write saved when two steps overlap and both fail", async () => {
    m.search.mockResolvedValue({ ok: true, results: [{ oracleId: SOL, name: "Sol Ring", imageUri: null, owned: 1, want: 2 }] });
    const settles: ((v: unknown) => void)[] = [];
    m.setWant.mockImplementation(() => new Promise((resolve) => settles.push(resolve)));
    view({ tiles: [tile()] });
    const list = await search("sol");
    const stepper = within(list).getByTestId("want-stepper");
    const more = within(stepper).getByRole("button", { name: wishlistCopy.details.more });
    fireEvent.click(more);
    fireEvent.click(more);
    expect(m.setWant.mock.calls).toEqual([[SOL, 3], [SOL, 4]]);
    expect(within(stepper).getByLabelText(wishlistCopy.details.want)).toHaveTextContent("4");
    await act(async () => settles[0]!({ ok: false, reason: "invalid" }));
    // The older write failing leaves the newer one in view.
    expect(within(stepper).getByLabelText(wishlistCopy.details.want)).toHaveTextContent("4");
    await act(async () => settles[1]!({ ok: false, reason: "invalid" }));
    expect(within(stepper).getByLabelText(wishlistCopy.details.want)).toHaveTextContent("2");
  });

  it("lets a fresh search answer stand over a count an earlier write settled", async () => {
    m.search.mockResolvedValueOnce({ ok: true, results: [{ oracleId: SOL, name: "Sol Ring", imageUri: null, owned: 1, want: 2 }] });
    m.setWant.mockResolvedValue({ ok: true, status: "wanted", want: 3, have: 1 });
    view({ tiles: [tile()] });
    let list = await search("sol");
    await act(async () => fireEvent.click(within(list).getByRole("button", { name: wishlistCopy.details.more })));
    expect(within(list).getByLabelText(wishlistCopy.details.want)).toHaveTextContent("3");
    // The card was collected elsewhere since: the next answer says it is off the list.
    m.search.mockResolvedValueOnce({ ok: true, results: [{ oracleId: SOL, name: "Sol Ring", imageUri: null, owned: 3, want: null }] });
    fireEvent.change(screen.getByRole("searchbox", { name: /search/i }), { target: { value: "sol r" } });
    await waitFor(() => expect(m.search).toHaveBeenCalledTimes(2));
    list = await screen.findByRole("list", { name: /./ });
    await waitFor(() => expect(within(list).getByRole("button", { name: wishlistCopy.page.search.add })).toBeInTheDocument());
    expect(within(list).queryByTestId("want-stepper")).toBeNull();
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
