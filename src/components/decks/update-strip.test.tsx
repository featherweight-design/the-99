// The update arrival strip (#277, states 20, 22 and 24). A sibling of
// ArrivalStrip, and the difference between them is the whole test: its sentence is
// about what moved rather than how much arrived. Its ✕ is the shell's to hold
// (`use-visit-receipts.test.tsx`).

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { UpdateStrip } from "./update-strip";

const copy = deckImportCopy.update.arrival;

describe("UpdateStrip", () => {
  it("says what went in and what came out, in one sentence at every width", () => {
    render(<UpdateStrip arrival={{ in: 19, out: 6, kept: 0 }} onDismiss={() => {}} />);
    expect(screen.getByText(copy.updated("19", "6"))).toBeInTheDocument();
  });

  // The out figure is what actually left, so a kept removal is a third fact
  // rather than a correction to the second.
  it("names the removals the player kept", () => {
    render(<UpdateStrip arrival={{ in: 19, out: 6, kept: 1 }} onDismiss={() => {}} />);
    expect(screen.getByText(copy.updatedWithKept("19", "6", "1"))).toBeInTheDocument();
  });

  it("drops the kept clause when nothing was kept", () => {
    render(<UpdateStrip arrival={{ in: 19, out: 6, kept: 0 }} onDismiss={() => {}} />);
    expect(screen.queryByText(/you kept/)).not.toBeInTheDocument();
  });

  it("hands its ✕ to the shell", () => {
    const onDismiss = vi.fn();
    render(<UpdateStrip arrival={{ in: 19, out: 6, kept: 0 }} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: copy.dismiss }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(localStorage.length).toBe(0);
  });

  // State 20. The param said an update happened but carried nothing to print, so
  // the strip states the fact rather than rendering NaN.
  it("drops the figures when the arrival is countless", () => {
    render(<UpdateStrip arrival="countless" onDismiss={() => {}} />);
    expect(screen.getByText(copy.updatedNoCounts)).toBeInTheDocument();
    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});
