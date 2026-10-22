// Hidden from friends on the deck page header (friend decks README 4): the mark in both spines' chips row, only for a
// deck hidden on its own, and the header's ⋯ menu handed the deck's status and the owner's rules.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { socialCopy } from "../../lib/copy/social";
import { props } from "./spine-fixtures";

vi.mock("../../app/decks/tuning-actions", () => ({ saveDeckHeader: vi.fn(async () => ({ ok: true })) }));
vi.mock("../../app/cards/tag-actions", () => ({ searchTagCards: async () => [] }));
vi.mock("../../app/decks/hide-actions", () => ({ setDeckHiddenFromFriendsAction: vi.fn(async () => ({ ok: true })) }));

const { SpineDesktop } = await import("./spine-desktop");
const { SpineMobile } = await import("./spine-mobile");
const { HiddenFromFriendsMark } = await import("./hidden-from-friends-mark");

const w = socialCopy.hideDeck;
const DEFAULTS = { seeDecks: true, seeUnfinished: false };
const spines = [["desktop", SpineDesktop], ["mobile", SpineMobile]] as const;

function draw(Spine: (typeof spines)[number][1], friendHide?: { hidden: boolean; prefs: typeof DEFAULTS }) {
  return render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
      <Spine {...props} friendHide={friendHide} />
    </CardDetailProvider>,
  );
}

describe("HiddenFromFriendsMark", () => {
  it("is the 14px glyph and the words, a mark and not a press", () => {
    const { container } = render(<HiddenFromFriendsMark />);
    const mark = container.querySelector("[data-hidden-from-friends]")!;
    expect(mark.textContent).toBe(w.mark);
    expect(mark.querySelector("svg")!.getAttribute("width")).toBe("14");
    expect(mark.querySelector("path:last-child")!.getAttribute("d")).toBe("M2.6 2.6l14.8 14.8");
    expect(container.querySelector("button, a")).toBeNull();
  });
});

describe.each(spines)("the %s header", (_, Spine) => {
  it("draws the mark in the chips row for a deck hidden on its own", () => {
    const { container } = draw(Spine, { hidden: true, prefs: DEFAULTS });
    const chips = container.querySelector("[data-spine-chips]") as HTMLElement;
    expect(within(chips).getByText(w.mark)).toBeTruthy();
  });

  it("draws no mark for a deck only Settings hides, nor with the switch off", () => {
    const hidden = draw(Spine, { hidden: false, prefs: { seeDecks: false, seeUnfinished: false } });
    expect(hidden.container.querySelector("[data-hidden-from-friends]")).toBeNull();
    hidden.unmount();
    const off = draw(Spine);
    expect(off.container.querySelector("[data-hidden-from-friends]")).toBeNull();
  });

  it("hands the menu the deck's status: a Building deck under the default rules is locked", () => {
    const { unmount } = draw(Spine, { hidden: false, prefs: DEFAULTS });
    fireEvent.click(screen.getByRole("button", { name: "Actions for Atraxa Superfriends" }));
    expect(screen.getByRole("link", { name: w.lockedAria }).getAttribute("href")).toBe("/settings");
    unmount();
    draw(Spine, { hidden: false, prefs: { seeDecks: true, seeUnfinished: true } });
    fireEvent.click(screen.getByRole("button", { name: "Actions for Atraxa Superfriends" }));
    expect(screen.getByRole("checkbox", { name: w.row }).getAttribute("aria-checked")).toBe("false");
  });

  it("draws no menu row with the switch off", () => {
    draw(Spine);
    fireEvent.click(screen.getByRole("button", { name: "Actions for Atraxa Superfriends" }));
    expect(screen.queryByText(w.row)).toBeNull();
  });
});
