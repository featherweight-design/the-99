import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const stub = vi.hoisted(() => ({ result: true, calls: [] as unknown[][] }));

vi.mock("../../app/decks/folder-actions", () => ({
  moveDeckAction: async (...args: unknown[]) => {
    stub.calls.push(args);
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
  stub.calls = [];
  say.mockClear();
  onCreate.mockClear();
});

const say = vi.fn();
const onCreate = vi.fn();

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
  });

  it("offers New folder… as the last destination", () => {
    mode(null);
    fireEvent.click(screen.getByRole("button", { name: /New folder/ }));
    expect(onCreate).toHaveBeenCalled();
    expect(stub.calls).toEqual([]);
  });
});
