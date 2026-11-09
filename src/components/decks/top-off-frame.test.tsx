import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { topOffCopy } from "../../lib/copy/top-off";
import { BulkControl, TopOffFrame, sameSelection, type TopOffFrameProps } from "./top-off-frame";

// No module mock on purpose: the frame draws from props alone (no server action, no hover preview, no bar measuring).

afterEach(cleanup);

const props = (over: Partial<TopOffFrameProps> = {}): Omit<TopOffFrameProps, "children"> => ({
  listId: "list-1",
  capLineId: "list-1-cap",
  isDesktop: true,
  openSlots: 5,
  bodySize: 99,
  poolSize: 12,
  untouched: 9,
  tickedCount: 3,
  declinedHere: 0,
  atCap: false,
  inflight: false,
  bulk: { collection: null, best: null },
  onClearTicks: vi.fn(),
  onRestoreAll: vi.fn(),
  emptyNote: null,
  buyCount: 0,
  buyTotal: null,
  onCommit: vi.fn(),
  onCancel: vi.fn(),
  errorMessage: null,
  ...over,
});

describe("the Top off frame draws from props alone", () => {
  it("draws the head, the group around its children and the commit row, and reports the presses", () => {
    const p = props();
    render(<TopOffFrame {...p}><p data-testid="row">a row</p></TopOffFrame>);
    expect(document.getElementById("list-1")).not.toBeNull();
    expect(screen.getByRole("group", { name: topOffCopy.list.groupAria("12", "5") }).contains(screen.getByTestId("row"))).toBe(true);
    expect(document.body.textContent).toContain(topOffCopy.list.head("3", "5", "12", "9").split(" · ")[0]);
    fireEvent.click(screen.getByRole("button", { name: topOffCopy.list.clearTicks }));
    expect(p.onClearTicks).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: topOffCopy.commit.addAria("3", "97", 99) }));
    expect(p.onCommit).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: topOffCopy.commit.cancel }));
    expect(p.onCancel).toHaveBeenCalledTimes(1);
  });

  it("disables the presses in flight, and draws no restore-all, bulk pair or refusal until it is handed them", () => {
    render(<TopOffFrame {...props({ inflight: true })}>{null}</TopOffFrame>);
    expect(screen.getByRole("button", { name: topOffCopy.commit.inFlight("3") })).toBeDisabled();
    expect(screen.queryByRole("button", { name: topOffCopy.list.restoreAll("2") })).toBeNull();
    expect(document.querySelector("[data-bulk-fill]")).toBeNull();
    expect(screen.queryByTestId("top-off-refusal")).toBeNull();
  });

  it("draws the bulk pair, the restore press, the empty note, the cap line and the refusal it is handed", () => {
    const onPress = vi.fn();
    const onRestoreAll = vi.fn();
    render(
      <TopOffFrame
        {...props({
          tickedCount: 5,
          atCap: true,
          declinedHere: 2,
          onRestoreAll,
          emptyNote: "nothing ticked",
          bulk: { collection: { label: "Select 4 from my collection", ariaLabel: "collection aria", note: "a note", onPress }, best: null },
          errorMessage: "Deck is full.",
        })}
      >
        {null}
      </TopOffFrame>,
    );
    fireEvent.click(screen.getByRole("button", { name: "collection aria" }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-bulk-fill='best']")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: topOffCopy.list.restoreAllAria("2") }));
    expect(onRestoreAll).toHaveBeenCalledTimes(1);
    expect(screen.getByText("nothing ticked")).not.toBeNull();
    expect(document.getElementById("list-1-cap")?.textContent).toBe(topOffCopy.list.cap);
    expect(screen.getByTestId("top-off-refusal").textContent).toContain("Deck is full.");
  });

  it("hands the rows' group to the wrapper it is given", () => {
    const wrapRows = vi.fn((group: React.ReactNode) => <section data-testid="wrap">{group}</section>);
    render(<TopOffFrame {...props({ wrapRows })}><p>row</p></TopOffFrame>);
    expect(screen.getByTestId("wrap").querySelector("[data-top-off-rows]")).not.toBeNull();
  });
});

describe("the helpers the frame carries", () => {
  it("compares two selections as sets, never by length or order", () => {
    expect(sameSelection(["a", "b"], ["b", "a"])).toBe(true);
    expect(sameSelection(["a", "b"], ["a", "c"])).toBe(false);
    expect(sameSelection(["a"], ["a", "b"])).toBe(false);
  });

  it("puts the concession in the accessible name and hides the visible note", () => {
    const onPress = vi.fn();
    render(<BulkControl pool="best" label="Select 2" ariaLabel="Select 2, concedes x" note="concedes x" disabled={false} onPress={onPress} />);
    fireEvent.click(screen.getByRole("button", { name: "Select 2, concedes x" }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-bulk-concession='best']")?.getAttribute("aria-hidden")).toBe("true");
  });
});
