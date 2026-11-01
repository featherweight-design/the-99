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
        <button type="button" onClick={() => p.onSaved?.(1)}>save</button>
        <button type="button" onClick={() => p.onClose()}>done</button>
        <button type="button" onClick={() => p.onClose(true)}>history</button>
      </div>
    );
  },
}));

const { AddCardsHost, useAddCards } = await import("./add-cards-host");
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
function mount() {
  const view = render(
    <AddCardsHost totalCards={4492}>
      <Grab />
    </AddCardsHost>,
  );
  return view;
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
    view.rerender(
      <AddCardsHost totalCards={4492}>
        <Grab />
      </AddCardsHost>,
    );
    expect(sheet()).toBeNull();
    await waitFor(() => expect(settle).toHaveBeenCalledTimes(1));
    await act(async () => new Promise((r) => setTimeout(r, 20)));
    expect(onClosed).not.toHaveBeenCalled();
  });

  it("opens one sheet at a time", async () => {
    mount();
    act(() => {
      open({ initialQuery: "a" });
      open({ initialQuery: "b" });
    });
    await waitFor(() => expect(sheet()).toBeTruthy());
    expect(screen.getAllByRole("dialog", { name: "Add cards" })).toHaveLength(1);
    expect(sheetProps).toHaveBeenLastCalledWith(expect.objectContaining({ initialQuery: "a" }));
  });
});
