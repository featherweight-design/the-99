import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { moveDeckAction, createFolderAction, refresh } = vi.hoisted(() => ({
  moveDeckAction: vi.fn(),
  createFolderAction: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("../../app/decks/folder-actions", () => ({ moveDeckAction, createFolderAction }));
vi.mock("../../app/decks/actions", () => ({ deleteDeck: vi.fn(), renameDeck: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

const { useDeckShelfMove } = await import("./deck-shelf-move");
const { DeckCardOverflow } = await import("./deck-card-overflow");

const SHELF = { folders: [{ id: "f1", name: "Cube night" }], folderId: null, folderName: null };

// The deck page's header menu, fed the hook exactly as the spine feeds it.
function Header({ shelf = SHELF }: { shelf?: typeof SHELF }) {
  const { move, dialog, announced } = useDeckShelfMove("d1", shelf);
  return (
    <>
      <DeckCardOverflow deckId="d1" deckName="Atraxa" built={99} placement="header" move={move} />
      {dialog}
      <span role="status">{announced}</span>
    </>
  );
}

const trigger = () => screen.getByRole("button", { name: "Actions for Atraxa" });
const openMove = () => {
  fireEvent.click(trigger());
  fireEvent.click(screen.getByRole("button", { name: /^Move Atraxa/ }));
};
const moveRowName = () => {
  fireEvent.click(trigger());
  const name = screen.getByRole("button", { name: /^Move Atraxa/ }).textContent;
  fireEvent.click(trigger());
  return name;
};

// The refusal is taken back on the next task, outside the action.
const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

beforeEach(() => {
  moveDeckAction.mockReset();
  createFolderAction.mockReset();
  refresh.mockReset();
});

describe("the deck page's Move", () => {
  it("carries Move and Delete, files the deck on the press, and the row names the new shelf", async () => {
    moveDeckAction.mockResolvedValue(true);
    render(<Header />);
    fireEvent.click(trigger());
    const panel = trigger().parentElement!.querySelector("[id]")!;
    expect(Array.from(panel.querySelectorAll("button")).map((b) => b.textContent)).toEqual(["Move · Unfiled", "Delete"]);
    // Move is the first row here, so it draws no separator above itself.
    expect(screen.getByRole("button", { name: /^Move Atraxa/ }).className).toMatch(/first:border-t-0/);
    fireEvent.click(screen.getByRole("button", { name: /^Move Atraxa/ }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cube night" })));
    expect(moveDeckAction).toHaveBeenCalledWith("d1", "f1");
    expect(screen.getByRole("status").textContent).toBe("Filed under Cube night.");
    expect(moveRowName()).toBe("Move · Cube night");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("takes the shelf back on a refusal, and refreshes only when the write threw", async () => {
    moveDeckAction.mockResolvedValueOnce(false).mockRejectedValueOnce(new Error("x"));
    render(<Header />);
    openMove();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cube night" })));
    await flush();
    expect(moveRowName()).toBe("Move · Unfiled");
    expect(refresh).not.toHaveBeenCalled();
    openMove();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cube night" })));
    await flush();
    expect(moveRowName()).toBe("Move · Unfiled");
    expect(screen.getByRole("status").textContent).toBe("That did not save. Try again.");
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("makes a folder from move mode and files the deck into it, through the list's own dialog", async () => {
    moveDeckAction.mockResolvedValue(true);
    createFolderAction.mockResolvedValue({ ok: true, folder: { id: "f2", name: "Pauper" } });
    render(<Header />);
    openMove();
    fireEvent.click(screen.getByRole("button", { name: "New folder…" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Folder name" }), { target: { value: "Pauper" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Create" })));
    expect(createFolderAction).toHaveBeenCalledWith("Pauper");
    expect(moveDeckAction).toHaveBeenCalledWith("d1", "f2");
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "Folder name" })).toBeNull());
    expect(moveRowName()).toBe("Move · Pauper");
  });

  it("takes a fresh server shelf over its own prediction", async () => {
    moveDeckAction.mockResolvedValue(true);
    const { rerender } = render(<Header />);
    openMove();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cube night" })));
    rerender(<Header shelf={{ ...SHELF, folderId: null, folderName: null }} />);
    expect(moveRowName()).toBe("Move · Unfiled");
  });
});
