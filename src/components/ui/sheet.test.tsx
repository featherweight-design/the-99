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
  fireEvent.pointerDown(handle, { clientY: 0, pointerId: 1 });
  fireEvent.pointerMove(handle, { clientY: distance, pointerId: 1 });
  fireEvent.pointerUp(handle, { clientY: distance, pointerId: 1 });
};

const handle = () => document.querySelector("[aria-hidden]")!;

/** The live drag offset in px — 0 when the panel is not displaced. */
const offset = () => {
  const style = screen.getByRole("dialog").getAttribute("style") ?? "";
  return Number(/translateY\((-?\d+)px\)/.exec(style)?.[1] ?? 0);
};

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
    expect(offset()).toBe(0);
  });

  it("lets a route keep its own handle and offset", () => {
    // The routes differ to the pixel — 36px round under 9px here, 38px at 2px
    // radius under 12px on /decks and /collection — and a shell that imposed one
    // would move every heading on two routes by 9px.
    render(
      <Sheet
        {...props}
        open
        handleClassName="flex touch-none justify-center pt-[12px] pb-0"
        handleBarClassName="h-[4px] w-[38px] rounded-[2px]"
      />,
    );
    const wrapper = handle() as HTMLElement;
    expect(wrapper.className).toContain("pt-[12px]");
    expect(wrapper.firstElementChild?.className).toContain("w-[38px]");
  });

  it("never dismisses on a cancelled gesture, however far it travelled", () => {
    // A cancel is the gesture being TAKEN AWAY — a scroll claiming it, a system
    // interaction — not a drag completing. Sharing the up handler meant a cancel
    // past the threshold closed a sheet the reader never let go of.
    const onDismiss = vi.fn();
    const releasePointerCapture = vi.fn();
    render(<Sheet {...props} open onDismiss={onDismiss} />);
    const h = handle() as HTMLElement;
    h.setPointerCapture = vi.fn();
    h.releasePointerCapture = releasePointerCapture;
    fireEvent.pointerDown(h, { clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(h, { clientY: 200, pointerId: 1 });
    fireEvent.pointerCancel(h, { clientY: 200, pointerId: 1 });
    expect(onDismiss).not.toHaveBeenCalled();
    // And it does NOT ask for the release: `pointercancel` is the user agent
    // ending the pointer, so capture is already gone and asking again throws
    // `NotFoundError` on a cancelled touch.
    expect(releasePointerCapture).not.toHaveBeenCalled();
    expect(offset()).toBe(0);
  });

  it("captures the pointer, so a drag off the handle still reports", () => {
    // The handle is 4px tall and a drag is mostly vertical, so the pointer
    // leaves it almost immediately. Without capture, move and up stop arriving
    // and the sheet sticks part-way down with no way to finish or cancel.
    const setPointerCapture = vi.fn();
    const releasePointerCapture = vi.fn();
    render(<Sheet {...props} open />);
    const h = handle() as HTMLElement;
    h.setPointerCapture = setPointerCapture;
    h.releasePointerCapture = releasePointerCapture;
    drag(h, 80);
    expect(setPointerCapture).toHaveBeenCalledWith(1);
    expect(releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it("stops the entrance animation while dragging", () => {
    // The default panel arrives under `anim-sheet-in`, which animates
    // `transform` for 180ms, and a CSS animation outranks a normal inline
    // transform — so a drag begun in that window moved nothing.
    render(<Sheet {...props} open />);
    fireEvent.pointerDown(handle(), { clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(handle(), { clientY: 30, pointerId: 1 });
    expect(screen.getByRole("dialog").getAttribute("style")).toContain("animation: none");
  });

  it("ends the entrance animation at first touch, and keeps it ended", () => {
    // Suppressing on the offset let a drag back to the origin restart the
    // keyframe mid-gesture; suppressing on the gesture let RELEASING a
    // sub-threshold drag restart it on the way back to zero. Same bug, asked at
    // a different moment — so the answer is not a moment. A sheet a reader has
    // touched has arrived, and an entrance plays once.
    render(<Sheet {...props} open />);
    const style = () => screen.getByRole("dialog").getAttribute("style") ?? "";
    fireEvent.pointerDown(handle(), { clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(handle(), { clientY: 40, pointerId: 1 });
    expect(style()).toContain("animation: none");
    fireEvent.pointerMove(handle(), { clientY: 0, pointerId: 1 });
    expect(style()).toContain("animation: none");
    // Released under the threshold: the sheet stays, and so does the suppression.
    fireEvent.pointerUp(handle(), { clientY: 10, pointerId: 1 });
    expect(style()).toContain("animation: none");
    expect(offset()).toBe(0);
  });

  it("forgets the touch when the sheet closes, so the next open animates", () => {
    const { rerender } = render(<Sheet {...props} open />);
    fireEvent.pointerDown(handle(), { clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(handle(), { clientY: 5, pointerId: 1 });
    rerender(<Sheet {...props} open={false} />);
    rerender(<Sheet {...props} open />);
    expect(screen.getByRole("dialog").getAttribute("style") ?? "").not.toContain("animation");
  });

  it("follows the pointer mid-drag", () => {
    render(<Sheet {...props} open />);
    fireEvent.pointerDown(handle(), { clientY: 0 });
    fireEvent.pointerMove(handle(), { clientY: 40 });
    expect(offset()).toBe(40);
  });

  it("never follows the pointer upward", () => {
    render(<Sheet {...props} open />);
    fireEvent.pointerDown(handle(), { clientY: 60 });
    fireEvent.pointerMove(handle(), { clientY: 10 });
    expect(offset()).toBe(0);
  });

  it("does not hold the page — every caller already does", () => {
    // The deck and collection sheets lock through `useDialogA11y`, which locks
    // by default; the rack and `filter-panel` call `useScrollLock` themselves.
    // A lock here was a second counted lock per sheet rather than a fix.
    render(<Sheet {...props} open />);
    expect(document.body.style.overflow).toBe("");
  });

  it("ignores a second pointer, and measures only its own", () => {
    // A second touch overwrote the origin, so lifting the FIRST measured from
    // the second's start and could dismiss a sheet nobody dragged far.
    const onDismiss = vi.fn();
    render(<Sheet {...props} open onDismiss={onDismiss} />);
    const h = handle();
    fireEvent.pointerDown(h, { clientY: 0, pointerId: 1 });
    fireEvent.pointerDown(h, { clientY: 300, pointerId: 2 });
    fireEvent.pointerMove(h, { clientY: 320, pointerId: 2 });
    expect(offset()).toBe(0);
    fireEvent.pointerUp(h, { clientY: 10, pointerId: 1 });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("does not take a reopened sheet's first move as a drag", () => {
    // Closed mid-drag, the old pointer is still down. Its move must not reach a
    // fresh handle as though it had pressed there.
    const onDismiss = vi.fn();
    const { rerender } = render(<Sheet {...props} open onDismiss={onDismiss} />);
    fireEvent.pointerDown(handle(), { clientY: 0, pointerId: 1 });
    rerender(<Sheet {...props} open={false} onDismiss={onDismiss} />);
    rerender(<Sheet {...props} open onDismiss={onDismiss} />);
    fireEvent.pointerMove(handle(), { clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(handle(), { clientY: 200, pointerId: 1 });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("carries no gesture across a close", () => {
    // A caller that keeps this mounted and flips `open` mid-drag would reopen to
    // a stale offset, with the next gesture measured from the old coordinate.
    const { rerender } = render(<Sheet {...props} open />);
    fireEvent.pointerDown(handle(), { clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(handle(), { clientY: 50, pointerId: 1 });
    expect(offset()).toBe(50);
    rerender(<Sheet {...props} open={false} />);
    rerender(<Sheet {...props} open />);
    expect(offset()).toBe(0);
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

describe("Sheet — header drag (opt-in)", () => {
  const header = (
    <div>
      <h2>Import issues</h2>
      <button type="button">Close</button>
      <div role="tablist">
        <span role="tab" tabIndex={0}>
          Unmatched
        </span>
      </div>
      <div data-sheet-nodrag="">
        <span>kept out</span>
      </div>
    </div>
  );

  it("starts a drag from the header's own text", () => {
    const onDismiss = vi.fn();
    render(<Sheet {...props} open onDismiss={onDismiss} header={header} headerDrag />);
    drag(screen.getByText("Import issues"), 80);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("follows the pointer from the header, like the handle", () => {
    render(<Sheet {...props} open header={header} headerDrag />);
    const title = screen.getByText("Import issues");
    fireEvent.pointerDown(title, { clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(title, { clientY: 40, pointerId: 1 });
    expect(offset()).toBe(40);
  });

  it("never starts a drag from a control inside the header", () => {
    const onDismiss = vi.fn();
    render(<Sheet {...props} open onDismiss={onDismiss} header={header} headerDrag />);
    drag(screen.getByRole("button", { name: "Close" }), 200);
    drag(screen.getByRole("tab"), 200);
    drag(screen.getByText("kept out"), 200);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(offset()).toBe(0);
  });

  it("keeps the header in the accessibility tree", () => {
    // The handle's wrapper is aria-hidden; the header's must not be.
    render(<Sheet {...props} open header={header} headerDrag />);
    expect(screen.getByRole("heading", { name: "Import issues" })).toBeInTheDocument();
    expect(screen.getByText("Import issues").closest("[aria-hidden]")).toBeNull();
  });

  it("is off by default: a header drag moves nothing", () => {
    const onDismiss = vi.fn();
    render(<Sheet {...props} open onDismiss={onDismiss} header={header} />);
    drag(screen.getByText("Import issues"), 200);
    expect(onDismiss).not.toHaveBeenCalled();
    expect(document.querySelector("[data-sheet-drag]")).toBeNull();
  });
});

describe("Sheet — held height (opt-in)", () => {
  const panel = () => screen.getByRole("dialog");

  it("takes the height it is given and keeps it whatever the body does", () => {
    const { rerender } = render(
      <Sheet {...props} open height={488}>
        <p>short</p>
      </Sheet>,
    );
    expect(panel().style.height).toBe("488px");
    rerender(
      <Sheet {...props} open height={488}>
        {Array.from({ length: 200 }, (_, i) => (
          <p key={i}>row {i}</p>
        ))}
      </Sheet>,
    );
    expect(panel().style.height).toBe("488px");
  });

  it("keeps the height through a drag", () => {
    render(<Sheet {...props} open height={488} />);
    fireEvent.pointerDown(handle(), { clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(handle(), { clientY: 30, pointerId: 1 });
    expect(panel().style.height).toBe("488px");
    expect(offset()).toBe(30);
  });

  it("is off by default: no inline height, no inline style at all", () => {
    render(<Sheet {...props} open />);
    expect(panel().getAttribute("style")).toBeNull();
  });
});
