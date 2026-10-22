// The ⋯ menu's Hidden from friends row (friend decks README 4 and 4b): drawn only with the switch on (the prop), above
// Delete; unticked and ticked write the other value and close the menu; a deck the owner's Settings already hide draws
// the row ticked and locked, and its press opens Settings without writing; a refusal is the shared toast.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { socialCopy } from "../../lib/copy/social";
import type { StatusPill } from "../../lib/decks/status";
import type { FriendDeckPrefs } from "../../lib/social/deck-visibility-rule";

const { setDeckHiddenFromFriendsAction } = vi.hoisted(() => ({ setDeckHiddenFromFriendsAction: vi.fn() }));
vi.mock("../../app/decks/hide-actions", () => ({ setDeckHiddenFromFriendsAction }));
vi.mock("../../app/decks/actions", () => ({ deleteDeck: vi.fn(), renameDeck: vi.fn() }));
vi.mock("../../app/decks/export-actions", () => ({ readDeckExport: vi.fn() }));

const { DeckCardOverflow } = await import("./deck-card-overflow");

const DEFAULTS: FriendDeckPrefs = { seeDecks: true, seeUnfinished: false };
const w = socialCopy.hideDeck;

function open(friends?: { hidden: boolean; statusPill: StatusPill; prefs: FriendDeckPrefs }, placement: "tile" | "header" = "tile") {
  render(<DeckCardOverflow deckId="d1" deckName="Atraxa" built={99} placement={placement} friends={friends} />);
  fireEvent.click(screen.getByRole("button", { name: "Actions for Atraxa" }));
}

const row = () => screen.getByRole("checkbox", { name: w.row });

beforeEach(() => {
  setDeckHiddenFromFriendsAction.mockReset();
  setDeckHiddenFromFriendsAction.mockResolvedValue({ ok: true });
});

describe("DeckCardOverflow — Hidden from friends", () => {
  it("draws no row while the switch is off for the reader", () => {
    open(undefined);
    expect(screen.queryByText(w.row)).toBeNull();
    expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();
  });

  it("sits directly above Delete, on a tile and in the header", () => {
    for (const placement of ["tile", "header"] as const) {
      const { unmount } = render(
        <DeckCardOverflow deckId="d1" deckName="Atraxa" built={99} placement={placement} friends={{ hidden: false, statusPill: "Complete", prefs: DEFAULTS }} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Actions for Atraxa" }));
      expect(row().nextElementSibling).toBe(screen.getByRole("button", { name: "Delete" }));
      unmount();
    }
  });

  it("unticked: a press hides the deck and closes the menu", async () => {
    open({ hidden: false, statusPill: "Complete", prefs: DEFAULTS });
    expect(row().getAttribute("aria-checked")).toBe("false");
    fireEvent.click(row());
    expect(setDeckHiddenFromFriendsAction).toHaveBeenCalledWith("d1", true);
    expect(screen.queryByRole("checkbox", { name: w.row })).toBeNull();
    await act(async () => {});
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("ticked: the box is filled, and a press shows the deck again", () => {
    open({ hidden: true, statusPill: "Complete", prefs: DEFAULTS });
    expect(row().getAttribute("aria-checked")).toBe("true");
    expect(row().querySelector("[data-hide-box]")!.className).toContain("bg-[color:var(--accent)]");
    fireEvent.click(row());
    expect(setDeckHiddenFromFriendsAction).toHaveBeenCalledWith("d1", false);
  });

  it("locked when the owner's Settings hide every deck: ticked, and the press opens Settings without writing", () => {
    open({ hidden: false, statusPill: "Complete", prefs: { seeDecks: false, seeUnfinished: false } });
    expect(screen.queryByRole("checkbox", { name: w.row })).toBeNull();
    const link = screen.getByRole("link", { name: w.lockedAria });
    expect(link.getAttribute("href")).toBe("/settings");
    expect(link.textContent).toContain(w.locked);
    expect(link.querySelector("[data-hide-box]")!.className).toContain("bg-[color:var(--fg-locked)]");
    fireEvent.click(link);
    expect(setDeckHiddenFromFriendsAction).not.toHaveBeenCalled();
  });

  it("locked on an unfinished deck while drafts are not included", () => {
    open({ hidden: false, statusPill: "Draft", prefs: DEFAULTS });
    expect(screen.getByRole("link", { name: w.lockedAria })).toBeTruthy();
  });

  // Close-out: a deck hidden on its own stays a ticked checkbox whatever Settings says, so its flag can be cleared.
  it("never locked on a deck hidden on its own, even one Settings also hides: a press clears its flag", () => {
    open({ hidden: true, statusPill: "Draft", prefs: { seeDecks: false, seeUnfinished: false } });
    expect(screen.queryByRole("link", { name: w.lockedAria })).toBeNull();
    expect(row().getAttribute("aria-checked")).toBe("true");
    fireEvent.click(row());
    expect(setDeckHiddenFromFriendsAction).toHaveBeenCalledWith("d1", false);
  });

  it("not locked on a finished deck", () => {
    open({ hidden: false, statusPill: "Complete", prefs: DEFAULTS });
    expect(screen.queryByRole("link", { name: w.lockedAria })).toBeNull();
    expect(row()).toBeTruthy();
  });

  it("not locked on a draft once drafts are included", () => {
    open({ hidden: false, statusPill: "Building", prefs: { seeDecks: true, seeUnfinished: true } });
    expect(screen.queryByRole("link", { name: w.lockedAria })).toBeNull();
    expect(row()).toBeTruthy();
  });

  it("says so in a toast when the write is refused", async () => {
    setDeckHiddenFromFriendsAction.mockResolvedValue({ ok: false, reason: "invalid" });
    open({ hidden: false, statusPill: "Complete", prefs: DEFAULTS });
    fireEvent.click(row());
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain(w.failed));
  });

  it("says so in a toast when the write throws", async () => {
    setDeckHiddenFromFriendsAction.mockRejectedValue(new Error("network"));
    open({ hidden: true, statusPill: "Complete", prefs: DEFAULTS });
    fireEvent.click(row());
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain(w.failed));
  });
});
