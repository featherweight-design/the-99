import { fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { SetListSheet, type SetListSheetCopy } from "./set-list-sheet";

const copy: SetListSheetCopy = {
  panelAriaLabel: "Sets",
  sheetTitle: "Sets",
  footerSelected: (n, total) => `${n} of ${total}`,
  searchPlaceholder: "Search sets",
  searchAriaLabel: "Search sets",
  none: "No sets",
  empty: (q) => `No sets match ${q}`,
  optionAriaUnavailable: (name) => `${name}, none`,
  announceMatches: (n) => `${n} sets`,
  announceResult: (shown, total) => `${shown} of ${total}`,
  done: "Done",
};

const options = [
  { code: "blb", label: "Bloomburrow", count: 4, disabled: false },
  { code: "mh3", label: "Modern Horizons 3", count: 2, disabled: false },
];

function Sheet({ onDismiss }: { onDismiss: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <SetListSheet
      copy={copy}
      onDismiss={onDismiss}
      options={options}
      selected={selected}
      onToggle={(code) => setSelected((s) => (s.includes(code) ? s.filter((c) => c !== code) : [...s, code]))}
      shown={6}
      total={6}
      returnFocusTo={createRef<HTMLButtonElement>()}
    />
  );
}

// One rule for a search field that picks from a list (DECK INPUT UX, Hugh 2026-10-12).
describe("the set list sheet's search", () => {
  it("clears a typed search on the first Escape and closes the sheet on the next", () => {
    const onDismiss = vi.fn();
    render(<Sheet onDismiss={onDismiss} />);
    const field = screen.getByRole("searchbox", { name: "Search sets" });
    fireEvent.change(field, { target: { value: "bloom" } });
    fireEvent.keyDown(field, { key: "Escape" });
    expect(field).toHaveValue("");
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("clears the search after a pick and keeps the sheet open", () => {
    const onDismiss = vi.fn();
    render(<Sheet onDismiss={onDismiss} />);
    const field = screen.getByRole("searchbox", { name: "Search sets" });
    fireEvent.change(field, { target: { value: "bloom" } });
    fireEvent.click(screen.getByRole("switch", { name: /Bloomburrow/ }));
    expect(field).toHaveValue("");
    expect(screen.getByText("Modern Horizons 3")).toBeTruthy();
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
