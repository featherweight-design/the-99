import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ArrangeDecks } from "./arrange-decks";
import type { DeckListItem } from "../../lib/decks/read";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const deck = (id: string, name: string, over: Partial<DeckListItem> = {}): DeckListItem => ({
  id,
  name,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  commanderName: `${name} Commander`,
  commanderColorIdentity: ["U"],
  commanderImageUri: null,
  commanderArtCropUri: null,
  partnerName: null,
  partnerColorIdentity: null,
  folderId: null,
  folderName: null,
  built: 96,
  ownedCount: 96,
  toBuyCount: 0,
  unresolvedCount: 0,
  pendingChanges: 0,
  versionNumber: null,
  statusPill: "Draft",
  bracket: null,
  lastPlayedAt: null,
  lastEditedAt: new Date("2026-09-01T00:00:00Z"),
  lastCommittedAt: null,
  inUseElsewhere: 0,
  proxiedCount: 0,
  ...over,
});

const DECKS = [deck("a", "Alpha"), deck("b", "Bravo"), deck("c", "Charlie")];

function setup(over: { shelfLabel?: string | null; onDone?: (ids: string[]) => Promise<boolean> } = {}) {
  const onDone = over.onDone ?? vi.fn(async () => true);
  const onCancel = vi.fn();
  render(<ArrangeDecks decks={DECKS} shelfLabel={over.shelfLabel ?? null} onDone={onDone} onCancel={onCancel} />);
  return { onDone, onCancel };
}
const names = () => screen.getAllByRole("listitem").map((li) => within(li).getByText(/^(Alpha|Bravo|Charlie)$/).textContent);
const handle = (name: string) => screen.getByRole("button", { name: `Move ${name}` });
// Desktop and phone each draw Cancel and Done; one is display:none by CSS only, so take the first.
const press = (label: string) => fireEvent.click(screen.getAllByRole("button", { name: label })[0]);

afterEach(() => {
  cleanup();
  push.mockClear();
});

describe("ArrangeDecks", () => {
  it("draws the heading, one row per deck and a 44x52 handle on each", () => {
    setup();
    expect(screen.getByRole("heading", { name: "Arrange decks" })).toBeInTheDocument();
    expect(screen.getByText("ALL DECKS · 3")).toBeInTheDocument();
    expect(names()).toEqual(["Alpha", "Bravo", "Charlie"]);
    expect(handle("Alpha").className).toContain("h-[52px]");
    expect(handle("Alpha").className).toContain("w-[44px]");
    expect(handle("Alpha").style.touchAction).toBe("none");
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getAllByText(/Draft · 96 \/ 99/)).toHaveLength(3);
  });

  it("names the folder and carries its note on a shelf", () => {
    setup({ shelfLabel: "Simic" });
    expect(screen.getByRole("heading", { name: "Arrange Simic" })).toBeInTheDocument();
    expect(screen.getByText("FOLDER · SIMIC · 3")).toBeInTheDocument();
    expect(screen.getByText(/Moves these decks among themselves/)).toBeInTheDocument();
  });

  it("lifts on Space, moves on the arrows, drops on Space, and says where it is", () => {
    setup();
    fireEvent.keyDown(handle("Alpha"), { key: " " });
    expect(screen.getByRole("status")).toHaveTextContent("Alpha lifted, 1 of 3");
    fireEvent.keyDown(handle("Alpha"), { key: "ArrowDown" });
    expect(names()).toEqual(["Bravo", "Alpha", "Charlie"]);
    expect(screen.getByRole("status")).toHaveTextContent("Alpha, 2 of 3");
    fireEvent.keyDown(handle("Alpha"), { key: " " });
    expect(screen.getByRole("status")).toHaveTextContent("Alpha dropped, 2 of 3");
    // Dropped: the arrows no longer move it.
    fireEvent.keyDown(handle("Alpha"), { key: "ArrowDown" });
    expect(names()).toEqual(["Bravo", "Alpha", "Charlie"]);
  });

  it("does not move past either end", () => {
    setup();
    fireEvent.keyDown(handle("Alpha"), { key: " " });
    fireEvent.keyDown(handle("Alpha"), { key: "ArrowUp" });
    expect(names()).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("puts a lift back on Escape", () => {
    setup();
    fireEvent.keyDown(handle("Charlie"), { key: " " });
    fireEvent.keyDown(handle("Charlie"), { key: "ArrowUp" });
    fireEvent.keyDown(handle("Charlie"), { key: "ArrowUp" });
    expect(names()).toEqual(["Charlie", "Alpha", "Bravo"]);
    fireEvent.keyDown(handle("Charlie"), { key: "Escape" });
    expect(names()).toEqual(["Alpha", "Bravo", "Charlie"]);
  });

  it("Done saves the order as ids", async () => {
    const { onDone } = setup();
    fireEvent.keyDown(handle("Alpha"), { key: " " });
    fireEvent.keyDown(handle("Alpha"), { key: "ArrowDown" });
    fireEvent.keyDown(handle("Alpha"), { key: "ArrowDown" });
    press("Done");
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(["b", "c", "a"]));
  });

  it("keeps the draft up and says so when the save is refused", async () => {
    setup({ onDone: vi.fn(async () => false) });
    press("Done");
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn’t save the order");
    expect(screen.getAllByRole("button", { name: "Done" })[0]).not.toBeDisabled();
  });

  it("Cancel with nothing changed leaves at once", () => {
    const { onCancel } = setup();
    press("Cancel");
    expect(onCancel).toHaveBeenCalledOnce();
  });

  describe("the leave guard", () => {
    function change() {
      fireEvent.keyDown(handle("Alpha"), { key: " " });
      fireEvent.keyDown(handle("Alpha"), { key: "ArrowDown" });
      fireEvent.keyDown(handle("Alpha"), { key: " " });
    }

    it("asks on Cancel with a changed order; Keep arranging stays, Discard leaves", () => {
      const { onCancel } = setup();
      change();
      press("Cancel");
      expect(onCancel).not.toHaveBeenCalled();
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Keep arranging" }));
      expect(screen.queryByRole("alertdialog")).toBeNull();
      expect(names()).toEqual(["Bravo", "Alpha", "Charlie"]);
      press("Cancel");
      fireEvent.click(screen.getByRole("button", { name: "Discard" }));
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it("asks before an in-app link is followed, and Discard then follows it", () => {
      setup();
      const link = document.createElement("a");
      link.href = "/collection";
      link.textContent = "Collection";
      document.body.appendChild(link);
      change();
      fireEvent.click(link);
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Discard" }));
      expect(push).toHaveBeenCalledWith("/collection");
      link.remove();
    });

    it("does not intercept a link while nothing has changed", () => {
      setup();
      const link = document.createElement("a");
      link.href = "/collection";
      document.body.appendChild(link);
      const proceeded = fireEvent.click(link);
      expect(proceeded).toBe(true);
      expect(screen.queryByRole("alertdialog")).toBeNull();
      link.remove();
    });
  });
});
