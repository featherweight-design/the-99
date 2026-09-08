import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { EMPTY_FILTERS } from "../../lib/decks/filter";
import { DeckFilterColumn } from "./deck-filter-column";
import { DeckFilterSheet } from "./deck-filter-sheet";

function props(over = {}) {
  return {
    filters: EMPTY_FILTERS,
    onChange: vi.fn(),
    sort: "lastPlayed" as const,
    onSortChange: vi.fn(),
    shown: 6,
    total: 6,
    ...over,
  };
}

describe("DeckFilterColumn", () => {
  it("renders all six statuses whether or not any deck has them", () => {
    render(<DeckFilterColumn {...props()} />);
    for (const label of ["Draft", "Building", "Over", "Unresolved", "To buy", "Complete"]) {
      expect(screen.getByRole("checkbox", { name: label })).toBeInTheDocument();
    }
  });

  it("shows no per-row counts", () => {
    render(<DeckFilterColumn {...props()} />);
    expect(screen.getByRole("checkbox", { name: "Draft" }).textContent).toBe("Draft");
  });

  it("toggles a status on without disturbing the others", () => {
    const onChange = vi.fn();
    render(
      <DeckFilterColumn
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
      <DeckFilterColumn
        {...props({ filters: { ...EMPTY_FILTERS, statuses: ["Draft"] }, onChange })}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Draft" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ statuses: [] }));
  });

  it("summarises what is on, and hides Clear when nothing is", () => {
    const { rerender } = render(<DeckFilterColumn {...props()} />);
    expect(screen.getByText("all statuses on")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();

    rerender(
      <DeckFilterColumn {...props({ filters: { ...EMPTY_FILTERS, statuses: ["Draft"] } })} />,
    );
    expect(screen.getByText("1 status on")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });

  it("gives every colour swatch an accessible name", () => {
    render(<DeckFilterColumn {...props()} />);
    expect(screen.getByRole("checkbox", { name: "White" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Green" })).toBeInTheDocument();
  });

  it("clears every filter but never the sort", () => {
    const onChange = vi.fn();
    const onSortChange = vi.fn();
    render(
      <DeckFilterColumn
        {...props({
          filters: { statuses: ["Draft"], colours: ["R"], played: "never", search: "krenko" },
          onChange,
          onSortChange,
          sort: "name",
        })}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onChange).toHaveBeenCalledWith(EMPTY_FILTERS);
    expect(onSortChange).not.toHaveBeenCalled();
  });
});

describe("DeckFilterSheet", () => {
  it("mounts nothing when closed", () => {
    const { container } = render(
      <DeckFilterSheet {...props()} open={false} onDismiss={vi.fn()} autoFocusSearch={false} />,
    );
    expect(container).toBeEmptyDOMElement();
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

  it("offers the three sort orders, one of them pressed", () => {
    render(<DeckFilterSheet {...props()} open onDismiss={vi.fn()} autoFocusSearch={false} />);
    const group = screen.getByRole("group", { name: "Sort" });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(within(group).getByRole("radio", { checked: true })).toHaveAccessibleName(
      "last played",
    );
  });

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
