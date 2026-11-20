// The ⋯ menu's Hidden from friends row (friend decks README 4 and 4b): drawn only with the switch on (the prop), above
// Delete; unticked and ticked write the other value and close the menu; a deck the owner's Settings already hide draws
// the row replaced by a block that says why and one row per way out (draft hidden row, #2988), writing nothing; a refusal is the
// shared toast.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { socialCopy } from "../../lib/copy/social";
import type { DeckFriendsHide } from "./deck-card-overflow";
import type { StatusPill } from "../../lib/decks/status";
import type { FriendDeckPrefs } from "../../lib/social/deck-visibility-rule";

const { setDeckHiddenFromFriendsAction } = vi.hoisted(() => ({ setDeckHiddenFromFriendsAction: vi.fn() }));
vi.mock("../../app/decks/hide-actions", () => ({ setDeckHiddenFromFriendsAction }));
vi.mock("../../app/decks/actions", () => ({ deleteDeck: vi.fn(), renameDeck: vi.fn() }));
vi.mock("../../app/decks/export-actions", () => ({ readDeckExport: vi.fn() }));

const { DeckCardOverflow } = await import("./deck-card-overflow");

const DEFAULTS: FriendDeckPrefs = { seeDecks: true, seeUnfinished: false };
const w = socialCopy.hideDeck;

type Hide = { hidden: boolean; statusPill: StatusPill; prefs: FriendDeckPrefs; built?: number; size?: number; canCommit?: boolean };
const full = (f?: Hide): DeckFriendsHide | undefined => (f ? { built: 99, size: 99, canCommit: false, ...f } : undefined);

function open(friends?: Hide, placement: "tile" | "header" = "tile") {
  render(<DeckCardOverflow deckId="d1" deckName="Atraxa" built={99} placement={placement} friends={full(friends)} />);
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
        <DeckCardOverflow deckId="d1" deckName="Atraxa" built={99} placement={placement} friends={full({ hidden: false, statusPill: "Complete", prefs: DEFAULTS })} />,
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

  const noWrite = () => expect(setDeckHiddenFromFriendsAction).not.toHaveBeenCalled();

  it("the owner's Settings hide every deck: says so, no checkbox, one way out, nothing written", () => {
    open({ hidden: false, statusPill: "Complete", prefs: { seeDecks: false, seeUnfinished: false } });
    expect(screen.queryByRole("checkbox", { name: w.row })).toBeNull();
    expect(document.querySelector("[data-hide-from-friends=why]")!.textContent).toContain(w.why.seeDecksOff);
    expect(screen.queryByRole("link", { name: new RegExp(w.commit) })).toBeNull();
    const link = screen.getByRole("link", { name: w.settingsAria(w.settings.all) });
    expect(link.getAttribute("href")).toBe("/settings#settings-decks-see");
    expect(link.textContent).toContain(w.inSettings);
    fireEvent.click(link);
    noWrite();
  });

  // The README table, row by row (draft hidden row #2988).
  it.each([
    ["a full, resolved Draft", { statusPill: "Draft", built: 99, size: 99, canCommit: true }, w.why.draftReady, true, "drafts", "unfinished"],
    ["a short Draft", { statusPill: "Draft", built: 40, size: 99, canCommit: false }, w.why.draftShort(40, 99), false, "drafts", "unfinished"],
    ["a Draft past its size", { statusPill: "Draft", built: 104, size: 99, canCommit: false }, w.why.draftFull, false, "drafts", "unfinished"],
    ["a New deck", { statusPill: "New", built: 0, size: 99, canCommit: false }, w.why.empty, false, "drafts", "unfinished"],
    ["a Building deck", { statusPill: "Building", built: 97, size: 99, canCommit: false }, w.why.building(97, 99), false, "building", "unfinished"],
  ] as const)("%s: the line, the Commit row only where it can commit, and the exact Settings box", (_name, deck, line, commit, label, target) => {
    open({ hidden: false, prefs: DEFAULTS, ...deck });
    expect(screen.queryByRole("checkbox", { name: w.row })).toBeNull();
    expect(document.querySelector("[data-hide-from-friends=why]")!.textContent).toContain(line);
    const offer = document.querySelector<HTMLAnchorElement>("[data-hide-from-friends=commit]");
    expect(offer !== null).toBe(commit);
    if (offer) expect(offer.getAttribute("href")).toBe("/decks/d1/changes?commit=1");
    const link = screen.getByRole("link", { name: w.settingsAria(w.settings[label]) });
    expect(link.getAttribute("href")).toBe(`/settings#settings-decks-${target}`);
    noWrite();
  });

  it("every way out is a link and the block is not a control", () => {
    open({ hidden: false, statusPill: "Draft", prefs: DEFAULTS, canCommit: true });
    const why = document.querySelector("[data-hide-from-friends=why]")!;
    expect(why.tagName).toBe("DIV");
    expect(why.querySelector("a, button, [role=checkbox]")).toBeNull();
    expect(document.querySelectorAll("[data-hide-from-friends] a, a[data-hide-from-friends]").length).toBe(2);
  });

  // Close-out: a deck hidden on its own stays a ticked checkbox whatever Settings says, so its flag can be cleared.
  it("never explained on a deck hidden on its own, even one Settings also hides: a press clears its flag", () => {
    open({ hidden: true, statusPill: "Draft", prefs: { seeDecks: false, seeUnfinished: false } });
    expect(document.querySelector("[data-hide-from-friends=why]")).toBeNull();
    expect(row().getAttribute("aria-checked")).toBe("true");
    fireEvent.click(row());
    expect(setDeckHiddenFromFriendsAction).toHaveBeenCalledWith("d1", false);
  });

  it("not explained on a finished deck", () => {
    open({ hidden: false, statusPill: "Complete", prefs: DEFAULTS });
    expect(document.querySelector("[data-hide-from-friends=why]")).toBeNull();
    expect(row()).toBeTruthy();
  });

  it("not explained on a draft once drafts are included", () => {
    open({ hidden: false, statusPill: "Building", prefs: { seeDecks: true, seeUnfinished: true } });
    expect(document.querySelector("[data-hide-from-friends=why]")).toBeNull();
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
