import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { PutBackControl } from "./put-back-control";

const CARD = { oracleId: "o1", name: "Mox Diamond" };
const control = () =>
  screen.getByRole("button", { name: deckVersioningCopy.restore.ctaA11y(CARD.name) });

describe("PutBackControl", () => {
  it("names the card, because the two visible words repeat down the column", () => {
    render(<PutBackControl card={CARD} onRestore={vi.fn()} />);
    expect(control()).toHaveTextContent(deckVersioningCopy.restore.cta);
  });

  it("hands the card up rather than writing", () => {
    const onRestore = vi.fn();
    render(<PutBackControl card={CARD} onRestore={onRestore} />);
    fireEvent.click(control());
    // The list owns the write, because the row is what leaves.
    expect(onRestore).toHaveBeenCalledWith(CARD);
  });

  // The whole row is a button that opens the card. Without this, putting a card
  // back also opens it.
  it("does not let the click reach the row", () => {
    const rowClick = vi.fn();
    render(
      <div onClick={rowClick}>
        <PutBackControl card={CARD} onRestore={vi.fn()} />
      </div>,
    );
    fireEvent.click(control());
    expect(rowClick).not.toHaveBeenCalled();
  });

  // Structural, and it is here rather than in the browser probe for a reason:
  // the control's box hugs its label at both widths, so a centred label and a
  // right-aligned one render within a pixel of each other and no measurement
  // can tell them apart. The property matters against `Pull` in the column
  // beside it — ruling 17b — where a centred label goes visibly inboard.
  it("right-aligns its label, and reserves a 44px target on the phone", () => {
    render(<PutBackControl card={CARD} onRestore={vi.fn()} />);
    const className = control().className;
    expect(className).toContain("justify-end");
    expect(className).not.toContain("justify-center");
    expect(className).toContain("min-w-[44px]");
    expect(className).toContain("min-h-[44px]");
    expect(className).toContain("md:min-h-[34px]");
  });

  // Borderless, unlike `PullControl` beside it. R3 withdrew the demotion that
  // would have matched them, so the difference is ratified rather than drift.
  it("carries no border and no fill", () => {
    render(<PutBackControl card={CARD} onRestore={vi.fn()} />);
    expect(control().className).toContain("border-0");
    expect(control().className).toContain("bg-transparent");
  });
});
