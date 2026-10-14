import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { ShelfSheet, pinnedOrder } from "./shelf-sheet";
import { ALL_DECKS, UNFILED } from "../../lib/decks/folder-view";
import type { ShelfSegment } from "./shelf-line";

const segments: ShelfSegment[] = [
  { shelf: ALL_DECKS, label: "All decks", count: 4 },
  { shelf: "f1", label: "Commander night", count: 2 },
  { shelf: "f2", label: "Cube night", count: 1 },
  { shelf: UNFILED, label: "Unfiled", count: 1 },
];

describe("pinnedOrder", () => {
  it("pins the current shelf and REMOVES it from the remainder", () => {
    // Errata E8: pinned-first plus an unfiltered list prints the shelf twice.
    expect(pinnedOrder(segments, "f2").map((s) => s.label)).toEqual([
      "Cube night",
      "All decks",
      "Commander night",
      "Unfiled",
    ]);
  });

  it("leaves the order alone when the current shelf is already first", () => {
    expect(pinnedOrder(segments, ALL_DECKS).map((s) => s.label)).toEqual([
      "All decks",
      "Commander night",
      "Cube night",
      "Unfiled",
    ]);
  });

  it("hands back the list unchanged when the shelf is not in it", () => {
    expect(pinnedOrder(segments, "gone")).toHaveLength(segments.length);
  });
});

describe("ShelfSheet", () => {
  const sheet = (shelf = "f1", onSelect = vi.fn(), onCreate = vi.fn()) =>
    render(
      <ShelfSheet
        segments={segments}
        shelf={shelf}
        onSelect={onSelect}
        onCreate={onCreate}
        onDismiss={vi.fn()}
      />,
    );

  it("is a modal dialog named Folders", () => {
    sheet();
    const dialog = screen.getByRole("dialog", { name: "Folders" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("pins the current shelf first and prints it once", () => {
    sheet("f2");
    const rows = screen.getAllByRole("button", { name: /\d+ decks?$/ });
    expect(rows[0]).toHaveAccessibleName("Cube night, 1 deck");
    expect(screen.getAllByText("Cube night")).toHaveLength(1);
  });

  it("marks one row and only one", () => {
    sheet("f1");
    const marked = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-current") === "true");
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveAccessibleName("Commander night, 2 decks");
  });

  it("hands the shelf back on tap", () => {
    const onSelect = vi.fn();
    sheet("f1", onSelect);
    fireEvent.click(screen.getByRole("button", { name: "Unfiled, 1 deck" }));
    expect(onSelect).toHaveBeenCalledWith(UNFILED);
  });

  it("offers New folder as its last row", () => {
    const onCreate = vi.fn();
    sheet("f1", vi.fn(), onCreate);
    fireEvent.click(screen.getByRole("button", { name: /New folder/ }));
    expect(onCreate).toHaveBeenCalled();
  });

  it("carries its own live region — the chassis's sits outside the modal", () => {
    // Errata E10. Without this, a shelf changed inside an aria-modal sheet is
    // announced nowhere, which is the hole `deck-filter-sheet` already had to
    // fill on this same route.
    const { container } = sheet();
    const region = container.querySelector("[aria-live='polite']");
    expect(region).toBeTruthy();
    expect(region).toHaveAttribute("aria-atomic", "true");
  });

  it("announces the shelf by name after the debounce", async () => {
    vi.useFakeTimers();
    try {
      const { container } = sheet("f1");
      const region = container.querySelector("[aria-live='polite']")!;
      expect(region.textContent).toBe("");
      await act(async () => {
        await vi.advanceTimersByTimeAsync(320);
      });
      // The NAME, not the result sentence: two shelves of the same size would
      // otherwise produce identical text and the second switch would be silent.
      expect(region.textContent).toBe("Commander night, 2 decks");
    } finally {
      vi.useRealTimers();
    }
  });

  it("carries no filter of any kind", () => {
    sheet();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText(/Status/)).toBeNull();
    expect(within(dialog).queryByRole("switch")).toBeNull();
  });
});
