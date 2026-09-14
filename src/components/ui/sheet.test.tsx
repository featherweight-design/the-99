import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sheet, SheetHeader } from "./sheet";

const props = {
  onDismiss: () => {},
  ariaLabel: "Filters",
  children: <button type="button">inside</button>,
};

/** A pointer gesture the handle can read. jsdom has no PointerEvent geometry. */
const drag = (handle: Element, distance: number) => {
  fireEvent.pointerDown(handle, { clientY: 0 });
  fireEvent.pointerMove(handle, { clientY: distance });
  fireEvent.pointerUp(handle, { clientY: distance });
};

const handle = () => document.querySelector("[aria-hidden]")!;

describe("Sheet", () => {
  it("renders nothing when closed", () => {
    // Not hidden: a hidden duplicate puts a second copy of every control in the
    // accessibility tree, which is the rule most easily lost in a rewrite.
    const { container } = render(<Sheet {...props} open={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is an aria-modal dialog carrying its label", () => {
    render(<Sheet {...props} open />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "Filters");
  });

  it("dismisses on the scrim", () => {
    const onDismiss = vi.fn();
    const { container } = render(<Sheet {...props} open onDismiss={onDismiss} />);
    fireEvent.click(container.querySelector('[role="presentation"]')!);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders the header slot above the scrolling body", () => {
    render(<Sheet {...props} open header={<p>up top</p>} />);
    const header = screen.getByText("up top");
    expect(header.parentElement?.className ?? "").not.toContain("overflow-y-auto");
  });

  it("dismisses on a drag past the threshold", () => {
    const onDismiss = vi.fn();
    render(<Sheet {...props} open onDismiss={onDismiss} />);
    drag(handle(), 80);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("snaps back under the threshold rather than dismissing", () => {
    const onDismiss = vi.fn();
    render(<Sheet {...props} open onDismiss={onDismiss} />);
    drag(handle(), 79);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).not.toHaveAttribute("style", expect.stringContaining("translateY"));
  });

  it("follows the pointer mid-drag", () => {
    render(<Sheet {...props} open />);
    fireEvent.pointerDown(handle(), { clientY: 0 });
    fireEvent.pointerMove(handle(), { clientY: 40 });
    expect(screen.getByRole("dialog").getAttribute("style")).toContain("translateY(40px)");
  });

  it("never follows the pointer upward", () => {
    render(<Sheet {...props} open />);
    fireEvent.pointerDown(handle(), { clientY: 60 });
    fireEvent.pointerMove(handle(), { clientY: 10 });
    expect(screen.getByRole("dialog").getAttribute("style") ?? "").not.toContain("translateY");
  });

  it("holds the page while it is up, and lets go when it closes", () => {
    const { rerender } = render(<Sheet {...props} open />);
    expect(document.body.style.overflow).toBe("hidden");
    rerender(<Sheet {...props} open={false} />);
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("draws no header of its own when the caller gives none", () => {
    // The deck sheet's header is a match sentence with no ✕; forcing one would
    // put two dismiss controls in a row.
    render(<Sheet {...props} open />);
    expect(screen.queryByRole("heading")).toBeNull();
  });

  it("puts the footer outside the scrolling body", () => {
    render(<Sheet {...props} open footer={<button type="button">done</button>} />);
    const body = screen.getByText("inside").parentElement!;
    expect(body.className).toContain("overflow-y-auto");
    expect(body).not.toContainElement(screen.getByText("done"));
  });

  it("hands keydown to the caller, which owns the focus policy", () => {
    const onKeyDown = vi.fn();
    render(<Sheet {...props} open onKeyDown={onKeyDown} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onKeyDown).toHaveBeenCalled();
  });
});

describe("SheetHeader", () => {
  const header = { title: "Filters", closeLabel: "Close filters", onDismiss: () => {} };

  it("shows a count beside the title, and hides a zero", () => {
    const { rerender } = render(<SheetHeader {...header} badge={3} />);
    expect(screen.getByRole("heading")).toHaveTextContent("Filters3");
    rerender(<SheetHeader {...header} badge={0} />);
    expect(screen.getByRole("heading")).toHaveTextContent(/^Filters$/);
  });

  it("dismisses from the close control", () => {
    const onDismiss = vi.fn();
    render(<SheetHeader {...header} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByLabelText("Close filters"));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
