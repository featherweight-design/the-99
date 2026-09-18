import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EMPTY_FILTERS } from "../../lib/decks/filter";
import { DeckFilterSheet } from "./deck-filter-sheet";

/**
 * The desktop column is gone — `decks-view.tsx` mounts the shared
 * `FilterChassis`, which is what returns its 262px to the deck grid. The
 * behaviours it used to carry did not go with it: the sheet draws the same six
 * statuses, the same swatches and the same Clear, so these cases follow them
 * there rather than being deleted with the component.
 *
 * The chassis's own wide-form panels are covered in `decks-view.test.tsx`.
 */
function props(over = {}) {
  return {
    filters: EMPTY_FILTERS,
    onChange: vi.fn(),
    shown: 6,
    total: 6,
    ...over,
  };
}

describe("Deck filters — the sheet the chassis opens on the phone", () => {
  // Two cases left with the column rather than moving to the sheet: it printed
  // a "1 status on" / "all statuses on" summary above its Clear, and the
  // handoff's §3.3 retires that line along with the column's two footer
  // Clears. The chassis states what is on in its chip row instead, where every
  // dimension reports itself rather than statuses alone.

  it("renders all six statuses whether or not any deck has them", () => {
    render(<DeckFilterSheet open {...props()} onDismiss={() => {}} autoFocusSearch={false} />);
    for (const label of ["Draft", "Building", "Over", "Unresolved", "To buy", "Complete"]) {
      expect(screen.getByRole("checkbox", { name: label })).toBeInTheDocument();
    }
  });

  it("shows no per-row counts", () => {
    render(<DeckFilterSheet open {...props()} onDismiss={() => {}} autoFocusSearch={false} />);
    expect(screen.getByRole("checkbox", { name: "Draft" }).textContent).toBe("Draft");
  });

  it("toggles a status on without disturbing the others", () => {
    const onChange = vi.fn();
    render(
      <DeckFilterSheet
        open
        onDismiss={() => {}} autoFocusSearch={false}
        {...props({ filters: { ...EMPTY_FILTERS, statuses: ["Over"] }, onChange })}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Draft" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ["Draft", "Over"] }),
    );
  });

  it("toggles a status back off", () => {
    const onChange = vi.fn();
    render(
      <DeckFilterSheet
        open
        onDismiss={() => {}} autoFocusSearch={false}
        {...props({ filters: { ...EMPTY_FILTERS, statuses: ["Draft"] }, onChange })}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Draft" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ statuses: [] }));
  });

  // The sheet draws `ColourPips` now, the same control the wide form uses —
  // a `switch` rather than the old swatch's `checkbox`, so the phone and the
  // desktop stop disagreeing about what this filter even is.
  it("gives every colour pip an accessible name", () => {
    render(<DeckFilterSheet open {...props()} onDismiss={() => {}} autoFocusSearch={false} />);
    expect(screen.getByRole("switch", { name: "White" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Green" })).toBeInTheDocument();
  });

  // "Clears every filter but never the sort" moved to `decks-view.test.tsx`.
  // The sheet no longer takes sort state at all, so asserting `onSortChange`
  // went uncalled here would assert nothing: the prop is not in its contract,
  // and the real claim is about what the view does to the URL.
  it("clears every filter it owns", () => {
    const onChange = vi.fn();
    render(
      <DeckFilterSheet
        open
        onDismiss={() => {}}
        autoFocusSearch={false}
        {...props({
          filters: {
            statuses: ["Draft"], states: ["pending"], colours: ["R"], played: "never",
            search: "krenko",
          },
          onChange,
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS);
  });
});

describe("DeckFilterSheet", () => {
  it("mounts nothing when closed", () => {
    const { container } = render(
      <DeckFilterSheet {...props()} open={false} onDismiss={vi.fn()} autoFocusSearch={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("stacks above the phone tab bar", () => {
    // The tab bar is `z-40` and paints after the sheet, so a sheet at the same
    // layer loses: the bar covers the footer and Clear cannot be clicked at all.
    // Only a laid-out page shows that, which is why the class is asserted here.
    const { container } = render(
      <DeckFilterSheet {...props()} open onDismiss={vi.fn()} autoFocusSearch={false} />,
    );
    expect(container.firstElementChild).toHaveClass("z-50");
  });

  it("carries the live match count and a dismiss-only button", () => {
    const onDismiss = vi.fn();
    const onChange = vi.fn();
    render(
      <DeckFilterSheet
        {...props({ shown: 3, onChange })}
        open
        onDismiss={onDismiss}
        autoFocusSearch={false}
      />,
    );
    expect(screen.getByText("3 of 6 match")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show 3 decks" }));
    expect(onDismiss).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("dismisses on Escape without undoing anything", () => {
    const onDismiss = vi.fn();
    const onChange = vi.fn();
    render(
      <DeckFilterSheet
        {...props({ filters: { ...EMPTY_FILTERS, statuses: ["Draft"] }, onChange })}
        open
        onDismiss={onDismiss}
        autoFocusSearch={false}
      />,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  // The sheet's sort group is retired by §3.4: the chassis gives sort its own
  // trailing slot on both forms, so the phone no longer reaches it through the
  // filter sheet and a second copy here would be two controls for one value.
  // `deck-sort-menu.test.tsx` covers the surviving one.
  it("singularises its dismiss button", () => {
    render(
      <DeckFilterSheet {...props({ shown: 1 })} open onDismiss={vi.fn()} autoFocusSearch={false} />,
    );
    expect(screen.getByRole("button", { name: "Show 1 deck" })).toBeInTheDocument();
  });

  it("hands back the same value the column would for the same tick", () => {
    const onChange = vi.fn();
    render(
      <DeckFilterSheet
        {...props({ filters: { ...EMPTY_FILTERS, statuses: ["Over"] }, onChange })}
        open
        onDismiss={vi.fn()}
        autoFocusSearch={false}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Draft" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ statuses: ["Draft", "Over"] }),
    );
  });
});

describe("DeckFilterSheet mounting", () => {
  it("runs no effects while closed", () => {
    // The body owns a focus trap and a debounced announcement. Mounted while
    // closed, the trap runs against a hidden panel and the announcement fires
    // where nothing can read it — which is what moving the gate into `Sheet`
    // quietly did until review caught it.
    const { container } = render(
      <DeckFilterSheet
        open={false}
        filters={EMPTY_FILTERS}
        onChange={() => {}}
        shown={3}
        total={9}
        onDismiss={() => {}}
        autoFocusSearch={false}
      />,
    );
    expect(container).toBeEmptyDOMElement();
    // The lock belongs to `useDialogA11y` inside the body, so a body that never
    // mounts is also a page that was never held.
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

describe("DeckFilterSheet drag-to-dismiss", () => {
  it("dismisses on a drag past the threshold", () => {
    // The route's own wiring, not the shell's. `sheet.test.tsx` proves the shell
    // in isolation, so dropping `onDismiss` or the handle props here would leave
    // every existing test green while /decks quietly lost the gesture.
    const onDismiss = vi.fn();
    render(
      <DeckFilterSheet
        open
        filters={EMPTY_FILTERS}
        onChange={() => {}}
        shown={3}
        total={9}
        onDismiss={onDismiss}
        autoFocusSearch={false}
      />,
    );
    const handle = document.querySelector('[role="dialog"] [aria-hidden]')!;
    fireEvent.pointerDown(handle, { clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 90, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 90, pointerId: 1 });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
