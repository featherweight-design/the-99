import * as React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AddCardsSheetProps } from "./add-cards-sheet";
import { COLLECTION_SAVED_EVENT } from "./edit-toast";

// Add a card from anywhere, PR 2: the shell's Add cards host (READINESS O5).
const settle = vi.fn(async () => {});
vi.mock("../../app/collection/edit-actions", () => ({ settleCollectionWrite: () => settle() }));
let pathname = "/decks/abc";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
// The sheet has its own tests; here it is a stand-in that reports its props and offers each way out.
const sheetProps = vi.fn();
vi.mock("./add-cards-sheet", () => ({
  AddCardsSheet: (p: Extract<AddCardsSheetProps, { mode: "add" }>) => {
    sheetProps(p);
    return (
      <div role="dialog" aria-label="Add cards">
        <button type="button" onClick={() => p.onSaved?.(2)}>save</button>
        <button type="button" onClick={() => p.onClose()}>done</button>
        <button type="button" onClick={() => p.onClose(true)}>history</button>
      </div>
    );
  },
}));

const { AddCardsHost, useAddCards } = await import("./add-cards-host");
const { CollectionEditScope } = await import("../cards/collection-edit-scope");
type Open = NonNullable<ReturnType<typeof useAddCards>>;

const grabbed: { open: Open | null } = { open: null };
function Grab() {
  const o = useAddCards();
  React.useEffect(() => {
    grabbed.open = o;
  });
  return null;
}
// What the host hands its children, as of the last commit.
const open = (o: Parameters<Open>[0]) => grabbed.open!(o);
// The shell mounts the host inside the collection edit scope (shell.tsx).
const tree = (total = 4492) => (
  <CollectionEditScope>
    <AddCardsHost totalCards={total}>
      <Grab />
    </AddCardsHost>
  </CollectionEditScope>
);
function mount() {
  return render(tree());
}
const sheet = () => screen.queryByRole("dialog", { name: "Add cards" });
const press = (name: string) => act(async () => screen.getByRole("button", { name }).click());

beforeEach(() => {
  pathname = "/decks/abc";
  grabbed.open = null;
  settle.mockClear();
  sheetProps.mockClear();
});
afterEach(() => cleanup());

describe("AddCardsHost", () => {
  it("is null outside a host", () => {
    render(<Grab />);
    expect(grabbed.open).toBeNull();
  });

  it("opens the shipped sheet with scan, the collection's size and what the opener carried, then says it is drawn", async () => {
    mount();
    const onOpened = vi.fn();
    act(() => open({ initialQuery: "ghalta", onOpened }));
    // Not in the same commit: the opener's dialog leaves the history first.
    expect(sheet()).toBeNull();
    await waitFor(() => expect(sheet()).toBeTruthy());
    expect(onOpened).toHaveBeenCalledTimes(1);
    expect(sheetProps).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: "add", scan: true, totalCards: 4492, initialQuery: "ghalta", initialCard: undefined }),
    );
  });

  it("tells the opener once the sheet has closed, unsaved: nothing is settled", async () => {
    mount();
    const onClosed = vi.fn();
    act(() => open({ onClosed }));
    await waitFor(() => expect(sheet()).toBeTruthy());
    await press("done");
    expect(sheet()).toBeNull();
    await waitFor(() => expect(onClosed).toHaveBeenCalledWith({ saved: false }));
    expect(settle).not.toHaveBeenCalled();
  });

  it("settles a save once the sheet closes, and the collection head hears it", async () => {
    mount();
    const onClosed = vi.fn();
    const heard = vi.fn();
    window.addEventListener(COLLECTION_SAVED_EVENT, heard);
    act(() => open({ onClosed }));
    await waitFor(() => expect(sheet()).toBeTruthy());
    await press("save");
    expect(settle).not.toHaveBeenCalled();
    await press("done");
    await waitFor(() => expect(onClosed).toHaveBeenCalledWith({ saved: true }));
    expect(settle).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(heard).toHaveBeenCalledTimes(1));
    window.removeEventListener(COLLECTION_SAVED_EVENT, heard);
  });

  it("does not bring the opener back when the sheet closed on the way to another route", async () => {
    mount();
    const onClosed = vi.fn();
    act(() => open({ onClosed }));
    await waitFor(() => expect(sheet()).toBeTruthy());
    await press("save");
    await press("history");
    await waitFor(() => expect(settle).toHaveBeenCalledTimes(1));
    await act(async () => new Promise((r) => setTimeout(r, 20)));
    expect(onClosed).not.toHaveBeenCalled();
  });

  it("closes with a navigation, still settling a save, and tells the opener nothing", async () => {
    const view = mount();
    const onClosed = vi.fn();
    act(() => open({ onClosed }));
    await waitFor(() => expect(sheet()).toBeTruthy());
    await press("save");
    pathname = "/collection/replace";
    view.rerender(tree());
    expect(sheet()).toBeNull();
    await waitFor(() => expect(settle).toHaveBeenCalledTimes(1));
    await act(async () => new Promise((r) => setTimeout(r, 20)));
    expect(onClosed).not.toHaveBeenCalled();
  });

  it("opens one sheet at a time, and tells a dropped ask's opener at once so it comes back", async () => {
    mount();
    const first = vi.fn();
    const second = vi.fn();
    const took: boolean[] = [];
    act(() => {
      took.push(open({ initialQuery: "a", onClosed: first }));
      took.push(open({ initialQuery: "b", onClosed: second }));
    });
    expect(took).toEqual([true, false]);
    expect(second).toHaveBeenCalledWith({ saved: false });
    await waitFor(() => expect(sheet()).toBeTruthy());
    expect(screen.getAllByRole("dialog", { name: "Add cards" })).toHaveLength(1);
    expect(sheetProps).toHaveBeenLastCalledWith(expect.objectContaining({ initialQuery: "a" }));
    expect(first).not.toHaveBeenCalled();
    // While the sheet is up, too.
    const third = vi.fn();
    act(() => {
      took.push(open({ onClosed: third }));
    });
    expect(took[2]).toBe(false);
    expect(third).toHaveBeenCalledWith({ saved: false });
    // Once it has closed, the host takes asks again.
    await press("done");
    await waitFor(() => expect(first).toHaveBeenCalledWith({ saved: false }));
    act(() => {
      took.push(open({}));
    });
    expect(took[3]).toBe(true);
  });

  it("opens nothing on the public card page, signed in or not (READINESS E6)", async () => {
    pathname = "/card/sol-ring";
    mount();
    const onOpened = vi.fn();
    act(() => {
      open({ onOpened });
    });
    await act(async () => new Promise((r) => setTimeout(r, 20)));
    expect(sheet()).toBeNull();
    expect(onOpened).not.toHaveBeenCalled();
  });

  it("opens nothing over another live modal, such as a page's own sheet", async () => {
    mount();
    const page = document.createElement("div");
    page.setAttribute("role", "dialog");
    page.setAttribute("aria-modal", "true");
    document.body.appendChild(page);
    const onClosed = vi.fn();
    act(() => {
      open({ onClosed });
    });
    await act(async () => new Promise((r) => setTimeout(r, 20)));
    expect(sheet()).toBeNull();
    // The opener closed itself for the sheet: it hears the drop and comes back.
    expect(onClosed).toHaveBeenCalledWith({ saved: false });
    page.remove();
    // The ask was dropped, not held: a later one opens.
    act(() => open({}));
    await waitFor(() => expect(sheet()).toBeTruthy());
  });

  it("carries the copies a save added into the next open until the shell's figure moves", async () => {
    const view = mount();
    act(() => open({}));
    await waitFor(() => expect(sheet()).toBeTruthy());
    await press("save");
    await press("done");
    await waitFor(() => expect(sheet()).toBeNull());
    // The shell has not redrawn (a settle that failed, or a reply still on its way): the next sheet still counts them.
    await act(async () => new Promise((r) => setTimeout(r, 20)));
    act(() => open({}));
    await waitFor(() => expect(sheet()).toBeTruthy());
    expect(sheetProps).toHaveBeenLastCalledWith(expect.objectContaining({ totalCards: 4494 }));
    // Once the shell draws the settled figure, that is the one used, with nothing added twice.
    view.rerender(tree(4494));
    expect(sheetProps).toHaveBeenLastCalledWith(expect.objectContaining({ totalCards: 4494 }));
    view.rerender(tree(4500));
    expect(sheetProps).toHaveBeenLastCalledWith(expect.objectContaining({ totalCards: 4500 }));
  });
});
