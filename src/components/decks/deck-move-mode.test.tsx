import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

const stub = vi.hoisted(() => ({ result: true, throws: false, calls: [] as unknown[][] }));

vi.mock("../../app/decks/folder-actions", () => ({
  moveDeckAction: async (...args: unknown[]) => {
    stub.calls.push(args);
    if (stub.throws) throw new Error("connection terminated");
    return stub.result;
  },
}));

const { MoveMode } = await import("./deck-move-mode");

const folders = [
  { id: "f1", name: "Commander night" },
  { id: "f2", name: "Cube night" },
];

beforeEach(() => {
  stub.result = true;
  stub.throws = false;
  stub.calls = [];
  say.mockClear();
  onCreate.mockClear();
  onRefused.mockClear();
});

const say = vi.fn();
const onCreate = vi.fn();
const onRefused = vi.fn();

const mode = (currentId: string | null, onMoved = vi.fn()) =>
  render(
    <MoveMode
      deckId="d1"
      deckName="Atraxa"
      folders={folders}
      currentId={currentId}
      onMoved={onMoved}
      onCreate={onCreate}
      say={say}
      onRefused={onRefused}
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
        deckId="d1"
        deckName="Atraxa"
        folders={[]}
        currentId={null}
        onMoved={vi.fn()}
        onCreate={onCreate}
        say={say}
        onRefused={onRefused}
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

  it("files a deck and reports the shelf it landed on", async () => {
    const onMoved = vi.fn();
    mode(null, onMoved);
    fireEvent.click(screen.getByRole("button", { name: "Cube night" }));
    await waitFor(() => expect(onMoved).toHaveBeenCalledWith({ id: "f2", name: "Cube night" }));
    expect(stub.calls[0]).toEqual(["d1", "f2"]);
  });

  it("unfiles through the same control, with null", async () => {
    const onMoved = vi.fn();
    mode("f1", onMoved);
    fireEvent.click(screen.getByRole("button", { name: "Unfiled" }));
    await waitFor(() => expect(onMoved).toHaveBeenCalledWith({ id: null, name: null }));
    expect(stub.calls[0]).toEqual(["d1", null]);
  });

  it("does nothing when the current destination is tapped again", () => {
    mode("f1");
    fireEvent.click(screen.getByRole("button", { name: "Commander night, current" }));
    expect(stub.calls).toEqual([]);
  });

  it("announces a move through a region that outlives this mode", async () => {
    // Hoisted deliberately: the panel returns to its menu on success, and a
    // region unmounted in the same commit as its text is never read.
    mode(null);
    fireEvent.click(screen.getByRole("button", { name: "Commander night" }));
    await waitFor(() => expect(say).toHaveBeenCalledWith("Filed under Commander night."));
  });

  it("announces an unfiling in its own words", async () => {
    // "Unfiled under Unfiled" is not a sentence, which is why there are two.
    mode("f1");
    fireEvent.click(screen.getByRole("button", { name: "Unfiled" }));
    await waitFor(() => expect(say).toHaveBeenCalledWith("Unfiled."));
  });

  it("reverts, announces nothing and reports nothing when the move is refused", async () => {
    // `false` means "not yours, or gone" — not a crash, and not a success.
    stub.result = false;
    const onMoved = vi.fn();
    mode(null, onMoved);
    fireEvent.click(screen.getByRole("button", { name: "Cube night" }));
    await waitFor(() => expect(stub.calls).toHaveLength(1));
    expect(onMoved).not.toHaveBeenCalled();
    expect(say).not.toHaveBeenCalled();
    // The action revalidates on its false path for a reason: what this list
    // shows is what went stale.
    expect(onRefused).toHaveBeenCalled();
  });

  it("reports nothing until the action has answered", async () => {
    // The receipt belongs to the menu above, and it may not claim a move the
    // server has not confirmed.
    const onMoved = vi.fn();
    mode(null, onMoved);
    fireEvent.click(screen.getByRole("button", { name: "Cube night" }));
    expect(onMoved).not.toHaveBeenCalled();
    await waitFor(() => expect(onMoved).toHaveBeenCalled());
  });

  it("says a thrown move failed, where a refused one says nothing", async () => {
    // `false` is a conflict the reader cannot act on; a rejection is a failure
    // they can, and silence would leave them believing the move landed.
    stub.throws = true;
    mode(null);
    fireEvent.click(screen.getByRole("button", { name: "Cube night" }));
    await waitFor(() => expect(say).toHaveBeenCalledWith("That did not save. Try again."));
    expect(onRefused).toHaveBeenCalled();
  });

  it("refuses a second click while the first move is in flight", async () => {
    // Both clicks are dispatched in ONE act(), so the transition has not
    // re-rendered between them and `disabled` cannot have taken effect — which
    // is exactly the window the synchronous ref guard exists for.
    mode(null);
    act(() => {
      screen.getByRole("button", { name: "Cube night" }).click();
      screen.getByRole("button", { name: "Commander night" }).click();
    });
    await waitFor(() => expect(stub.calls).toHaveLength(1));
    expect(stub.calls[0]).toEqual(["d1", "f2"]);
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
    expect(stub.calls).toEqual([]);
  });
});
