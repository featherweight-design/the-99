// The picker at 1300: an anchored panel, placed by `useAnchoredPanel`. jsdom has no layout, so the width
// query is pinned to desktop and the placement is whatever the hook computes from zero rects.
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { gameSeatsCopy } from "../../lib/copy/game-seats";
import type { ThirdPartyName } from "../../lib/person-name";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";
import { SeatPicker } from "./seat-picker";

vi.mock("../ui/use-is-desktop", () => ({ useIsDesktop: () => true }));
const friends = vi.hoisted(() => ({ list: [] as { publicId: string; displayName: ThirdPartyName; commanderArt: string | null; deckCount: number; withheld?: boolean }[] }));
vi.mock("../../app/decks/[id]/opponent-actions", () => ({
  searchOpponentCommandersAction: async () => [],
  listPickerFriendsAction: async () => friends.list,
  listFriendDecksAction: async () => [],
}));

// A browser will not focus an element under `visibility: hidden`; jsdom will. The panel is hidden until it is
// placed, so without this the test would pass on a focus the browser refuses.
const realFocus = HTMLElement.prototype.focus;
vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(function (this: HTMLElement, options?: FocusOptions) {
  const hidden = this.closest<HTMLElement>('[role="dialog"]')?.style.visibility === "hidden";
  if (!hidden) realFocus.call(this, options);
});

describe("SeatPicker at desktop width", () => {
  it("focuses the search once the panel is placed, and holds the panel to the viewport so its list can scroll", async () => {
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    render(<SeatPicker anchor={anchor} onClose={() => {}} onPick={() => {}} seated={new Set()} />);
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveAttribute("aria-label", gameSeatsCopy.picker.title);
    // Held to the room under its anchor (`useAnchoredPanel`): jsdom's anchor sits at 0 on a 768px viewport, so the
    // panel hangs from the top margin (8px), with 8px kept at the foot. Never the old whole-viewport cap, which covered the trigger.
    await waitFor(() => expect(dialog.style.maxHeight).toBe(`${window.innerHeight - 8 - 8}px`));
    expect(dialog.className).toContain("flex-col");
    await waitFor(() => expect(screen.getByRole("searchbox")).toHaveFocus());
    anchor.remove();
  });

  // Copilot round 3: under `maxHeight` a search field AND a foot fixed around the list left the rows no room on a
  // short window, and the panel clipped the foot. Only the head stays put; the rows and the foot are ONE body.
  function bodyOf(dialog: HTMLElement) {
    const bodies = dialog.querySelectorAll<HTMLElement>("[data-seat-body]");
    expect(bodies).toHaveLength(1);
    const body = bodies[0];
    expect(body.className).toContain("overflow-y-auto");
    expect(body.className).toContain("min-h-0");
    // The only scroller in the panel: a nested one would put the foot back under a list of its own.
    expect(dialog.querySelectorAll('[class*="overflow-y-auto"]')).toHaveLength(1);
    return body;
  }

  it("keeps the search outside the scroll body and the foot inside it, on the friends list", async () => {
    friends.list = [];
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    render(<SeatPicker anchor={anchor} onClose={() => {}} onPick={() => {}} seated={new Set()} />);
    const dialog = screen.getByRole("dialog", { hidden: true });
    const search = await screen.findByRole("searchbox", { hidden: true });
    const body = bodyOf(dialog);
    expect(body.contains(search)).toBe(false);
    const foot = await screen.findByText(gameSeatsCopy.picker.footAnyone);
    expect(body.contains(foot)).toBe(true);
    expect(body.contains(dialog.querySelector("ul"))).toBe(true);
    anchor.remove();
  });

  it("keeps the friend's header outside the scroll body and the foot inside it, on a friend's decks", async () => {
    friends.list = [{ publicId: "p1", displayName: named("Rowan"), commanderArt: null, deckCount: 0 }];
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    render(<SeatPicker anchor={anchor} onClose={() => {}} onPick={() => {}} seated={new Set()} openAt={{ publicId: "p1", name: "Rowan" }} />);
    const dialog = screen.getByRole("dialog", { hidden: true });
    const back = await screen.findByRole("button", { name: gameSeatsCopy.picker.back, hidden: true });
    const body = bodyOf(dialog);
    expect(body.contains(back)).toBe(false);
    const foot = await screen.findByText(plain(gameSeatsCopy.picker.footNoDecks(named("Rowan"))));
    // The friend's name is another reader's: the foot that carries it opts out of autocapture on its own span.
    expect(foot.className).toBe("ph-no-capture");
    expect(body.contains(foot)).toBe(true);
    expect(body.contains(dialog.querySelector("ul"))).toBe(true);
    anchor.remove();
  });

  it("marks a friend's name on the list row and in the header, each on the element that holds it", async () => {
    friends.list = [{ publicId: "p1", displayName: named("Rowan"), commanderArt: null, deckCount: 2 }];
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    const { unmount } = render(<SeatPicker anchor={anchor} onClose={() => {}} onPick={() => {}} seated={new Set()} />);
    const row = (await screen.findByText("Rowan", { selector: ".ph-no-capture" })).closest("button")!;
    expect(row.textContent).toContain("RO");
    unmount();
    render(<SeatPicker anchor={anchor} onClose={() => {}} onPick={() => {}} seated={new Set()} openAt={{ publicId: "p1", name: named("Rowan") }} />);
    const heading = await screen.findByRole("heading", { level: 3, name: plain(gameSeatsCopy.picker.theirDecks(named("Rowan"))), hidden: true });
    expect(heading.querySelector(".ph-no-capture")?.textContent).toBe(plain(gameSeatsCopy.picker.theirDecks(named("Rowan"))));
    anchor.remove();
  });

  it("gives the three rows under a friend's decks the dashed slot: ?, the search glyph, the friend's initials", async () => {
    friends.list = [{ publicId: "p1", displayName: named("Peter Quill"), commanderArt: null, deckCount: 0, withheld: true }];
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    render(<SeatPicker anchor={anchor} onClose={() => {}} onPick={() => {}} seated={new Set()} openAt={{ publicId: "p1", name: "Peter Quill" }} />);
    const notListed = await screen.findByRole("button", { name: new RegExp(gameSeatsCopy.picker.notListed), hidden: true });
    const rows = [...notListed.closest("ul")!.querySelectorAll("button")];
    const slots = rows.map((b) => b.querySelector<HTMLElement>("[data-seat-slot]"));
    expect(slots).toHaveLength(3);
    expect(slots.every((s) => s?.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(slots[0]!.textContent).toBe("?");
    expect(slots[1]!.querySelector("[data-search-icon]")).not.toBeNull();
    expect(slots[2]!.textContent).toBe("PQ");
    anchor.remove();
  });
});
