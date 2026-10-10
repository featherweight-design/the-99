import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

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
    refresh.mockReset();
    sheetProps = null;
  });

  it("draws two equal doors: an upload link and an add button", () => {
    render(<CollectionEmptyDoors />);
    const upload = screen.getByRole("link", { name: /Upload a file/ });
    expect(upload.getAttribute("href")).toBe("/collection/replace");
    expect(screen.getByRole("button", { name: /Add cards/ })).toBeTruthy();
    // Equal: neither is the accent primary button.
    expect(upload.className).toBe(screen.getByRole("button", { name: /Add cards/ }).className);
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
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes the page only when the sheet closes after a save, so the saved state is not unmounted under the reader", () => {
    render(<CollectionEmptyDoors />);
    fireEvent.click(screen.getByRole("button", { name: /Add cards/ }));
    act(() => sheetProps!.onSaved!(3));
    expect(refresh).not.toHaveBeenCalled();
    act(() => sheetProps!.onClose());
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
