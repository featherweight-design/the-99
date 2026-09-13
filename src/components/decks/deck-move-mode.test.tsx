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
});

const mode = (currentId: string | null, onMoved = vi.fn()) =>
  render(
    <MoveMode
      deckId="d1"
      deckName="Atraxa"
      folders={folders}
      currentId={currentId}
      onMoved={onMoved}
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
    ]);
  });

  it("offers Unfiled alone when no folder exists", () => {
    render(
      <MoveMode deckId="d1" deckName="Atraxa" folders={[]} currentId={null} onMoved={vi.fn()} />,
    );
    expect(screen.getAllByRole("button")).toHaveLength(1);
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

  it("announces a move through its own region", async () => {
    const { container } = mode(null);
    fireEvent.click(screen.getByRole("button", { name: "Commander night" }));
    await waitFor(() =>
      expect(container.querySelector("[aria-live='polite']")?.textContent).toBe(
        "Filed under Commander night.",
      ),
    );
  });

  it("announces an unfiling in its own words", async () => {
    // "Unfiled under Unfiled" is not a sentence, which is why there are two.
    const { container } = mode("f1");
    fireEvent.click(screen.getByRole("button", { name: "Unfiled" }));
    await waitFor(() =>
      expect(container.querySelector("[aria-live='polite']")?.textContent).toBe("Unfiled."),
    );
  });

  it("reverts, announces nothing and reports nothing when the move is refused", async () => {
    // `false` means "not yours, or gone" — not a crash, and not a success.
    stub.result = false;
    const onMoved = vi.fn();
    const { container } = mode(null, onMoved);
    fireEvent.click(screen.getByRole("button", { name: "Cube night" }));
    await waitFor(() => expect(stub.calls).toHaveLength(1));
    expect(onMoved).not.toHaveBeenCalled();
    expect(container.querySelector("[aria-live='polite']")?.textContent).toBe("");
  });
});
