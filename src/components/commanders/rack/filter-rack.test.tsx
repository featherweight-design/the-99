import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultParams, type Lane, type LaneParams } from "@/lib/commanders/lane-params";
import { FilterRack } from "./filter-rack";

function stubWidth(wide: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: wide,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

function renderRack(
  lane: Lane,
  params: LaneParams = defaultParams(lane),
  shown = 148,
  total = 148,
  scopePending = false,
) {
  return render(
    <FilterRack
      params={params}
      lane={lane}
      onChange={() => {}}
      shown={shown}
      total={total}
      excludedByExactly={null}
      scopePending={scopePending}
    />,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("FilterRack", () => {
  it("leads the discover rack with scope, and gives the owned rack none", () => {
    stubWidth(true);
    renderRack("discover", defaultParams("discover"), 3301, 3301);
    expect(screen.getByRole("group", { name: "Scope" })).toBeInTheDocument();
  });

  it("gives the owned rack no scope control", () => {
    stubWidth(true);
    renderRack("owned");
    expect(screen.queryByRole("group", { name: "Scope" })).not.toBeInTheDocument();
  });

  it("gives the owned rack availability, and the discover rack none", () => {
    stubWidth(true);
    const { unmount } = renderRack("owned");
    expect(screen.getByRole("radiogroup", { name: "Score against" })).toBeInTheDocument();
    unmount();
    renderRack("discover", defaultParams("discover"), 3301, 3301);
    expect(screen.queryByRole("radiogroup", { name: "Score against" })).not.toBeInTheDocument();
  });

  it("reads the order options off the lane", () => {
    stubWidth(true);
    renderRack("owned");
    expect(screen.getByRole("button", { name: "Order · Fit" })).toBeInTheDocument();
  });

  // The phone row is search · order · `Filters` in 390px. Order gives up its
  // label there so search keeps the width, but not its name: the trigger still
  // announces which order is on.
  it("draws the phone order trigger as a glyph that keeps its accessible name", () => {
    stubWidth(false);
    const { container } = renderRack("owned");
    const trigger = screen.getByRole("button", { name: "Order · Fit" });
    expect(trigger).not.toHaveTextContent(/Fit/);
    expect(container.querySelector('path[d="M5 5h10M6.5 10h7M8.5 15h3"]')).toBeInTheDocument();
  });

  // Discover's three orders all sound plausible; the glosses say what each one
  // actually sorts on. Fit and Name need no such line and are drawn without one.
  it("glosses the discover order menu and leaves the owned menu bare", () => {
    stubWidth(true);
    const { unmount } = renderRack("discover", defaultParams("discover"), 3301, 3301);
    fireEvent.click(screen.getByRole("button", { name: "Order · Popularity" }));
    expect(screen.getByText("most decks tracked first")).toBeInTheDocument();
    expect(screen.getByText("newest printing first")).toBeInTheDocument();
    unmount();

    renderRack("owned");
    fireEvent.click(screen.getByRole("button", { name: "Order · Fit" }));
    expect(screen.getByRole("menu", { name: "Order" })).toHaveTextContent(/^FitName$/);
  });

  it("badges the Filters trigger with the active control count, below 1024px", () => {
    stubWidth(false);
    renderRack("owned", { ...defaultParams("owned"), colors: ["b"], match: "exactly" }, 31);
    expect(screen.getByRole("button", { name: "Filters" })).toHaveTextContent("2");
  });

  it("shows no badge with nothing off default", () => {
    stubWidth(false);
    renderRack("owned");
    expect(screen.getByRole("button", { name: "Filters" })).not.toHaveTextContent(/\d/);
  });

  it("keeps search on the persistent row, outside the sheet", () => {
    stubWidth(false);
    renderRack("owned");
    expect(screen.getByRole("searchbox")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mounts one treatment at a time, never both", () => {
    stubWidth(true);
    renderRack("owned");
    expect(screen.getAllByRole("searchbox")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Filters" })).not.toBeInTheDocument();
  });

  it("does not restate the reveal control's own count", () => {
    stubWidth(true);
    renderRack("owned");
    expect(screen.queryByText(/more below/)).not.toBeInTheDocument();
  });
});

// The in-flight ruling, in tests. Its substance is a negative — the rack is told
// to do NOTHING while a scope flip is out, beyond the crown the control already
// wears — and the natural implementation of a pending flag is to reach for the
// nearest count. These lock the nothing.
describe("FilterRack while a scope flip is in flight", () => {
  it("holds the result line's sentence verbatim, with no busy state", () => {
    stubWidth(true);
    const { unmount } = renderRack("discover", defaultParams("discover"), 3301, 3301);
    const settled = screen.getByText("3,301 commanders").textContent;
    unmount();

    const { container } = renderRack("discover", defaultParams("discover"), 3301, 3301, true);
    // Same sentence, not an ellipsis, a dash, a blank or an appended clause: the
    // rows on screen are the previous answer and their count is still true.
    const waiting = screen.getByText("3,301 commanders");
    expect(waiting.textContent).toBe(settled);
    expect(waiting).not.toHaveAttribute("aria-busy");
    // One busy node on the whole rack, and it is the scope trigger.
    const busy = container.querySelectorAll("[aria-busy]");
    expect(busy).toHaveLength(1);
    expect(busy[0]).toBe(
      screen.getByRole("group", { name: "Scope" }).querySelector("button"),
    );
  });

  it("marks scope and nothing else", () => {
    stubWidth(true);
    const { container } = renderRack("discover", defaultParams("discover"), 3301, 3301, true);
    expect(container.querySelectorAll("[data-pending-mark]")).toHaveLength(1);
    const scope = screen.getByRole("group", { name: "Scope" });
    expect(scope.querySelector("[data-pending-mark]")).toBeInTheDocument();
    // Order sorts rows already held, on both lanes. It looks like scope, which
    // is exactly why the absence is asserted.
    expect(screen.getByRole("button", { name: "Order · Popularity" })).not.toHaveAttribute(
      "aria-busy",
    );
  });

  it("gives the owned lane no pending state at all", () => {
    stubWidth(true);
    const { container } = renderRack("owned", defaultParams("owned"), 148, 148, true);
    expect(container.querySelectorAll("[data-pending-mark]")).toHaveLength(0);
    expect(container.querySelectorAll("[aria-busy]")).toHaveLength(0);
    expect(screen.getByRole("radiogroup", { name: "Score against" })).not.toHaveAttribute(
      "aria-busy",
    );
  });

  it("marks the pressed scope option in the sheet and holds the footer count", () => {
    stubWidth(false);
    renderRack("discover", defaultParams("discover"), 3301, 3301, true);
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    const scope = screen.getByRole("radiogroup", { name: "Scope" });
    expect(scope).toHaveAttribute("aria-busy", "true");
    // The mark rides the selected option only — selection is optimistic, so the
    // pressed row is already the one the reader asked for.
    expect(scope.querySelectorAll("[data-pending-mark]")).toHaveLength(1);
    const pressed = screen.getByRole("radio", { name: "Best fit" });
    expect(pressed.querySelector("[data-pending-mark]")).toBeInTheDocument();

    // The footer is the result line's sentence in another voice. It holds too.
    expect(
      screen.getByRole("button", { name: "Show 3,301 commanders" }),
    ).toBeInTheDocument();
  });
});
