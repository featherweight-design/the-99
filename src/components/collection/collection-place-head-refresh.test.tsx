import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const settle = vi.fn();
vi.mock("../../app/collection/edit-actions", () => ({ settleCollectionWrite: (...a: unknown[]) => settle(...a) }));
vi.mock("next/navigation", () => ({ usePathname: () => "/collection" }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useLinkStatus: () => ({ pending: false }),
}));
vi.mock("../../app/collection/actions", () => ({ refreshCollectionHeader: () => new Promise(() => {}) }));

// The sheet has its own tests; here it only has to open, report a save, and close.
let sheet: { onSaved?: (n: number) => void; onClose: () => void } | null = null;
vi.mock("./add-cards-sheet", () => ({
  AddCardsSheet: (p: { onSaved?: (n: number) => void; onClose: () => void }) => {
    sheet = p;
    return <div role="dialog" aria-label="Add cards sheet" />;
  },
}));

const { CollectionPlaceHead } = await import("./collection-place-head");

const stats = { uniqueCards: 3, totalCards: 5, sets: 2, lastUpdated: null } as never;

function open() {
  render(<CollectionPlaceHead stats={stats} lastUpdatedLabel="today" editEnabled />);
  fireEvent.click(screen.getByTestId("collection-add"));
}

describe("CollectionPlaceHead · the list refreshes when the Add sheet closes after a save", () => {
  beforeEach(() => {
    settle.mockReset();
    sheet = null;
  });

  it("settles the write on close after a save, not at the save", () => {
    open();
    act(() => sheet!.onSaved!(2));
    expect(settle).not.toHaveBeenCalled();
    act(() => sheet!.onClose());
    expect(settle).toHaveBeenCalledTimes(1);
  });

  it("leaves the route alone when the sheet closes unsaved", () => {
    open();
    act(() => sheet!.onClose());
    expect(settle).not.toHaveBeenCalled();
  });
});
