// The update arrival strip (#277, states 20, 22 and 24). A sibling of
// ArrivalStrip, and the differences between them are the whole test: this one's
// dismissal is not persisted, and its sentence is about what moved rather than
// how much arrived.

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { UpdateStrip } from "./update-strip";

const copy = deckImportCopy.update.arrival;

describe("UpdateStrip", () => {
  it("says what went in and what came out, at both widths", () => {
    render(<UpdateStrip arrival={{ in: 19, out: 6, kept: 0 }} />);
    expect(screen.getByText(copy.updated("19", "6"))).toBeInTheDocument();
    expect(screen.getByText(copy.updatedMobile("19", "6"))).toBeInTheDocument();
  });

  // The out figure is what actually left, so a kept removal is a third fact
  // rather than a correction to the second.
  it("names the removals the player kept", () => {
    render(<UpdateStrip arrival={{ in: 19, out: 6, kept: 1 }} />);
    expect(screen.getByText(copy.updatedWithKept("19", "6", "1"))).toBeInTheDocument();
  });

  it("drops the kept clause when nothing was kept", () => {
    render(<UpdateStrip arrival={{ in: 19, out: 6, kept: 0 }} />);
    expect(screen.queryByText(/you kept/)).not.toBeInTheDocument();
  });

  // The kept count is dropped below md for room, so the mobile sentence carries
  // only two figures however many the desktop one has.
  it("keeps the mobile sentence to two figures", () => {
    render(<UpdateStrip arrival={{ in: 19, out: 6, kept: 3 }} />);
    expect(screen.getByText(copy.updatedMobile("19", "6"))).toBeInTheDocument();
  });

  it("can be dismissed", () => {
    render(<UpdateStrip arrival={{ in: 19, out: 6, kept: 0 }} />);
    fireEvent.click(screen.getByRole("button", { name: copy.dismiss }));
    expect(screen.queryByText(copy.updated("19", "6"))).not.toBeInTheDocument();
  });

  // State 24. An update happens many times, so the dismissal is component state
  // and nothing else. A dismissal persisted per deck, which is what the import
  // strip does, would silence every update after the first.
  it("does not persist the dismissal", () => {
    const { unmount } = render(<UpdateStrip arrival={{ in: 19, out: 6, kept: 0 }} />);
    fireEvent.click(screen.getByRole("button", { name: copy.dismiss }));
    unmount();
    expect(localStorage.length).toBe(0);
    render(<UpdateStrip arrival={{ in: 19, out: 6, kept: 0 }} />);
    expect(screen.getByText(copy.updated("19", "6"))).toBeInTheDocument();
  });

  // State 20. The param said an update happened but carried nothing to print, so
  // the strip states the fact rather than rendering NaN.
  it("drops the figures when the arrival is countless", () => {
    render(<UpdateStrip arrival="countless" />);
    expect(screen.getAllByText(copy.updatedNoCounts)).toHaveLength(2);
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});
