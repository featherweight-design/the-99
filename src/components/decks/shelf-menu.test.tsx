import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const stub = vi.hoisted(() => ({
  rename: null as null | (() => unknown),
  deleted: true as boolean,
  deleteThrows: false,
  calls: [] as unknown[][],
}));

vi.mock("../../app/decks/folder-actions", () => ({
  renameFolderAction: async (...args: unknown[]) => {
    stub.calls.push(["rename", ...args]);
    if (stub.rename) return stub.rename();
    return { ok: true, folder: { id: "f1", name: String(args[1]) } };
  },
  deleteFolderAction: async (...args: unknown[]) => {
    stub.calls.push(["delete", ...args]);
    if (stub.deleteThrows) throw new Error("connection terminated");
    return stub.deleted;
  },
}));

const { ShelfMenu } = await import("./shelf-menu");

const say = vi.fn();
const onRenamed = vi.fn();
const onDeleted = vi.fn();
const onGone = vi.fn();

beforeEach(() => {
  stub.rename = null;
  stub.deleted = true;
  stub.deleteThrows = false;
  stub.calls = [];
  say.mockClear();
  onRenamed.mockClear();
  onDeleted.mockClear();
  onGone.mockClear();
});

const menu = (deckCount = 4) =>
  render(
    <ShelfMenu
      folderId="f1"
      name="Commander night"
      deckCount={deckCount}
      onRenamed={onRenamed}
      onDeleted={onDeleted}
      onGone={onGone}
      say={say}
    />,
  );

const open = () => fireEvent.click(screen.getByRole("button", { name: "Actions for Commander night" }));

describe("ShelfMenu", () => {
  it("offers exactly Rename and Delete", () => {
    menu();
    open();
    const dialog = screen.getByRole("dialog");
    expect([...dialog.querySelectorAll("button")].map((b) => b.textContent)).toEqual([
      "Rename",
      "Delete",
    ]);
  });

  it("renames, announces the new name, and tells the route", async () => {
    menu();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    fireEvent.change(screen.getByLabelText("Folder name"), {
      target: { value: "Commander evening" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onRenamed).toHaveBeenCalledWith("Commander evening"));
    expect(say).toHaveBeenCalledWith("Commander evening, 4 decks");
    expect(stub.calls[0]).toEqual(["rename", "f1", "Commander evening"]);
  });

  it("will not save an unchanged name", () => {
    // R2: unchanged reverts. It also keeps the unique index from being asked
    // about a name this folder already holds.
    menu();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("will not save an empty one", () => {
    menu();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    fireEvent.change(screen.getByLabelText("Folder name"), { target: { value: "   " } });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("states a duplicate and keeps the typed value", async () => {
    stub.rename = () => ({ ok: false, reason: "duplicate" });
    menu();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    fireEvent.change(screen.getByLabelText("Folder name"), { target: { value: "Cube night" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "A folder named “Cube night” already exists.",
      ),
    );
    expect(screen.getByLabelText("Folder name")).toHaveValue("Cube night");
  });

  it("commits nothing on blur", () => {
    menu();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    const field = screen.getByLabelText("Folder name");
    fireEvent.change(field, { target: { value: "Commander evening" } });
    fireEvent.blur(field);
    expect(stub.calls).toEqual([]);
  });

  it("names the folder and promises its decks back, in that order", () => {
    menu(4);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText('Delete “Commander night”?')).toBeInTheDocument();
    expect(
      screen.getByText("Its 4 decks return to Unfiled. No deck is deleted."),
    ).toBeInTheDocument();
  });

  it("swaps one line on an empty folder, and still confirms", () => {
    menu(0);
    open();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByText("Nothing is filed here.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete folder" })).toBeInTheDocument();
  });

  it("deletes, and treats an already-gone folder as done", async () => {
    stub.deleted = false;
    menu();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete folder" }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    // No error surface: `false` means already gone, and the UI must not invent
    // a failure the query refused to (decision 25).
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("does not report a deletion that threw", async () => {
    // `false` is already-gone and is done; a rejection is an outage, and
    // treating it as done would walk the reader off to All decks reporting a
    // deletion that never happened.
    stub.deleteThrows = true;
    menu();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete folder" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it("says nothing when the rename is refused because the folder is gone", async () => {
    stub.rename = () => ({ ok: false, reason: "refused" });
    menu();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    fireEvent.change(screen.getByLabelText("Folder name"), { target: { value: "Anything" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    // Its own path: the route refreshes and rescues focus, and nothing is
    // announced as though a rename had happened.
    await waitFor(() => expect(onGone).toHaveBeenCalled());
    expect(say).not.toHaveBeenCalled();
    expect(onRenamed).not.toHaveBeenCalled();
  });

  it("focuses the first control on every mode change", () => {
    // The hook focuses on mount and this panel swaps its contents in place, so
    // without this the button the reader pressed is removed while the dialog
    // stays and focus falls to the body inside an aria-modal.
    menu();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Rename" }));
    expect(screen.getByLabelText("Folder name")).toHaveFocus();
  });

  it("cancels back to the menu rather than closing", () => {
    menu();
    open();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Keep it" }));
    expect(screen.getByRole("button", { name: "Rename" })).toBeInTheDocument();
    expect(stub.calls).toEqual([]);
  });
});
