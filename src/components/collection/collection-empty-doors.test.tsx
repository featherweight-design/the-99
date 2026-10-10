import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const settle = vi.fn();
vi.mock("../../app/collection/edit-actions", () => ({ settleCollectionWrite: (...a: unknown[]) => settle(...a) }));

// The sheet is exercised by its own tests; here it only has to open, report a save, and close.
let sheetProps: { onSaved?: (n: number) => void; onClose: () => void } | null = null;
vi.mock("./add-cards-sheet", () => ({
  AddCardsSheet: (p: { onSaved?: (n: number) => void; onClose: () => void }) => {
    sheetProps = p;
    return <div role="dialog" aria-label="Add cards sheet" />;
  },
}));

const { CollectionEmptyDoors } = await import("./collection-empty-doors");

describe("CollectionEmptyDoors", () => {
  beforeEach(() => {
    settle.mockReset();
    sheetProps = null;
  });

  it("draws two equal doors: an upload link and an add button", () => {
    render(<CollectionEmptyDoors />);
    const upload = screen.getByRole("link", { name: /Upload a file/ });
    expect(upload.getAttribute("href")).toBe("/collection/replace");
    expect(screen.getByRole("button", { name: /Add cards/ })).toBeTruthy();
    // Equal, and neither is the accent primary.
    const add = screen.getByRole("button", { name: /Add cards/ });
    expect(upload.className).toBe(add.className);
    expect(add.className).not.toMatch(/bg-\[color:var\(--accent\)\]/);
    expect(add.className).toContain("bg-[color:var(--surface)]");
  });

  it("opens the Add cards sheet from the add door", () => {
    render(<CollectionEmptyDoors />);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Add cards/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("closing without saving leaves the page alone", () => {
    render(<CollectionEmptyDoors />);
    fireEvent.click(screen.getByRole("button", { name: /Add cards/ }));
    act(() => sheetProps!.onClose());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(settle).not.toHaveBeenCalled();
  });

  it("settles the write (a fresh page) only when the sheet closes after a save, so the saved state is not unmounted under the reader", () => {
    render(<CollectionEmptyDoors />);
    fireEvent.click(screen.getByRole("button", { name: /Add cards/ }));
    act(() => sheetProps!.onSaved!(3));
    expect(settle).not.toHaveBeenCalled();
    act(() => sheetProps!.onClose());
    expect(settle).toHaveBeenCalledTimes(1);
  });
});
