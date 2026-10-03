import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

// A picker: the move, its announcement and its outcomes are the view's
// (`decks-view.test.tsx` covers them against a deferred action).
const { MoveMode } = await import("./deck-move-mode");

const folders = [
  { id: "f1", name: "Commander night" },
  { id: "f2", name: "Cube night" },
];

beforeEach(() => {
  onMove.mockClear();
  onCreate.mockClear();
});

const onMove = vi.fn();
const onCreate = vi.fn();

const mode = (currentId: string | null) =>
  render(
    <MoveMode
      deckName="Atraxa"
      folders={folders}
      currentId={currentId}
      onMove={onMove}
      onCreate={onCreate}
    />,
  );

describe("MoveMode", () => {
  it("offers Unfiled first, then every folder — one control for both directions", () => {
    mode(null);
    const rows = screen.getAllByRole("button");
    expect(rows.map((r) => r.textContent)).toEqual([
      "Unfiled",
      "Commander night",
      "Cube night",
      "New folder…",
    ]);
  });

  it("offers Unfiled alone when no folder exists", () => {
    render(
      <MoveMode
        deckName="Atraxa"
        folders={[]}
        currentId={null}
        onMove={onMove}
        onCreate={onCreate}
      />,
    );
    // `Unfiled` and `New folder…`, which is STATES M4 exactly.
    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Unfiled",
      "New folder…",
    ]);
  });

  it("marks the current destination and says so in its name", () => {
    mode("f1");
    expect(screen.getByRole("button", { name: "Commander night, current" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cube night" })).toBeInTheDocument();
  });

  it("hands the view the shelf it chose, on the press", () => {
    mode(null);
    fireEvent.click(screen.getByRole("button", { name: "Cube night" }));
    expect(onMove).toHaveBeenCalledWith({ id: "f2", name: "Cube night" });
  });

  it("unfiles through the same control, with null", () => {
    mode("f1");
    fireEvent.click(screen.getByRole("button", { name: "Unfiled" }));
    expect(onMove).toHaveBeenCalledWith({ id: null, name: null });
  });

  it("does nothing when the current destination is tapped again", () => {
    mode("f1");
    fireEvent.click(screen.getByRole("button", { name: "Commander night, current" }));
    expect(onMove).not.toHaveBeenCalled();
  });

  it("refuses a second click before the panel has closed", () => {
    // Both clicks are dispatched in ONE act(), so nothing has re-rendered
    // between them — which is exactly the window the synchronous ref guard
    // exists for.
    mode(null);
    act(() => {
      screen.getByRole("button", { name: "Cube night" }).click();
      screen.getByRole("button", { name: "Commander night" }).click();
    });
    expect(onMove).toHaveBeenCalledTimes(1);
    expect(onMove).toHaveBeenCalledWith({ id: "f2", name: "Cube night" });
  });

  it("focuses the current destination on entering the mode", () => {
    mode("f1");
    expect(screen.getByRole("button", { name: "Commander night, current" })).toHaveFocus();
  });

  it("focuses Unfiled when the deck is unfiled", () => {
    mode(null);
    expect(screen.getByRole("button", { name: "Unfiled, current" })).toHaveFocus();
  });

  it("offers New folder… as the last destination", () => {
    mode(null);
    fireEvent.click(screen.getByRole("button", { name: /New folder/ }));
    expect(onCreate).toHaveBeenCalled();
    expect(onMove).not.toHaveBeenCalled();
  });
});
