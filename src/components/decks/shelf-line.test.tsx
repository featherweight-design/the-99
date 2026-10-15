import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ShelfLine, ShelfTrigger, shelfSegments } from "./shelf-line";
import { ALL_DECKS, UNFILED, shelfCounts, type Shelf } from "../../lib/decks/folder-view";
import type { DeckFolderWithCount } from "../../lib/decks/folders";

const folders: DeckFolderWithCount[] = [
  { id: "f1", name: "Commander night", createdAt: new Date("2026-09-01"), deckCount: 2 },
  { id: "f2", name: "Cube night", createdAt: new Date("2026-09-02"), deckCount: 1 },
];
const decks = [
  { folderId: "f1" },
  { folderId: "f1" },
  { folderId: "f2" },
  { folderId: null },
];
const counts = () => shelfCounts(decks, folders);

describe("shelfSegments", () => {
  it("orders All decks, folders by the list's own order, then Unfiled last", () => {
    expect(shelfSegments(folders, counts()).map((s) => s.label)).toEqual([
      "All decks",
      "Commander night",
      "Cube night",
      "Unfiled",
    ]);
  });

  it("omits Unfiled until the first folder exists", () => {
    // A bucket equal to the whole list is a distinction without a difference.
    const alone = shelfCounts([{ folderId: null }], []);
    expect(shelfSegments([], alone).map((s) => s.label)).toEqual(["All decks"]);
  });

  it("counts each shelf from the loaded decks, empty folders included", () => {
    const withEmpty: DeckFolderWithCount[] = [
      ...folders,
      { id: "f3", name: "Draft pile", createdAt: new Date("2026-09-03"), deckCount: 0 },
    ];
    const segments = shelfSegments(withEmpty, shelfCounts(decks, withEmpty));
    expect(segments.map((s) => s.count)).toEqual([4, 2, 1, 0, 1]);
  });
});

describe("ShelfLine", () => {
  const line = (shelf: Shelf = ALL_DECKS, onSelect = vi.fn(), onCreate = vi.fn()) =>
    render(
      <ShelfLine
        folders={folders}
        counts={counts()}
        shelf={shelf}
        onSelect={onSelect}
        onCreate={onCreate}
      />,
    );

  it("marks the selected segment with aria-current and nothing else", () => {
    line("f1");
    expect(screen.getByRole("button", { name: /Commander night, 2 decks/ }))
      .toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /All decks, 4 decks/ }))
      .not.toHaveAttribute("aria-current");
  });

  it("carries the count in every accessible name", () => {
    line();
    expect(screen.getByRole("button", { name: "Unfiled, 1 deck" })).toBeInTheDocument();
  });

  it("hands the shelf back on click", () => {
    const onSelect = vi.fn();
    line(ALL_DECKS, onSelect);
    fireEvent.click(screen.getByRole("button", { name: /Cube night/ }));
    expect(onSelect).toHaveBeenCalledWith("f2");
    fireEvent.click(screen.getByRole("button", { name: /Unfiled/ }));
    expect(onSelect).toHaveBeenCalledWith(UNFILED);
  });

  it("spends no accent on the selected segment", () => {
    // Decision 3: accent stays reserved for in-use and to-buy, and stays the
    // chassis's own "this filter is on" — which is what keeps the two lines
    // from reading as the same kind of control.
    const { container } = line("f1");
    // The ground is on the segment's wrapper now, since the selected segment
    // also carries its own actions.
    const selected = screen.getByRole("button", { name: /Commander night, 2 decks/ });
    expect(selected.parentElement?.className).toContain("var(--elevated)");
    expect(container.innerHTML).not.toContain("--accent");
  });

  it("offers New folder at the trailing edge", () => {
    const onCreate = vi.fn();
    line(ALL_DECKS, vi.fn(), onCreate);
    fireEvent.click(screen.getByRole("button", { name: /New folder/ }));
    expect(onCreate).toHaveBeenCalled();
  });

  it("draws no shelf menu — rename and delete are a later slice", () => {
    line("f1");
    expect(screen.queryByRole("button", { name: /Actions for/ })).toBeNull();
  });
});

describe("ShelfTrigger", () => {
  it("names the shelf and its count, and says it opens a dialog", () => {
    render(<ShelfTrigger label="Cube night" count={3} open={false} onOpen={() => {}} />);
    const trigger = screen.getByRole("button", { name: /Folder: Cube night, 3 decks/ });
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("prints the name in a title's register, not a control's", () => {
    // One of the four carriers keeping the level out of the filter register
    // (decision 11): 15px semibold, where a filter trigger is 12.5px medium.
    render(<ShelfTrigger label="Cube night" count={3} open={false} onOpen={() => {}} />);
    expect(screen.getByRole("button", { name: /Folder: Cube night/ }).className)
      .toContain("text-[15px]");
  });

  it("turns its chevron with the trigger's own expanded state", () => {
    const { rerender } = render(<ShelfTrigger label="Cube night" count={3} open={false} onOpen={() => {}} />);
    const chevron = () => screen.getByRole("button", { name: /Folder: Cube night/ }).querySelector("[data-chevron]");
    expect(chevron()?.getAttribute("data-open")).toBe("false");
    rerender(<ShelfTrigger label="Cube night" count={3} open onOpen={() => {}} />);
    expect(chevron()?.getAttribute("data-open")).toBe("true");
  });

  it("carries no shelf menu beside it", () => {
    render(<ShelfTrigger label="All decks" count={12} open={false} onOpen={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});
