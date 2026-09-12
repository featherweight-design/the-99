import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultParams, type Lane, type LaneParams } from "@/lib/commanders/lane-params";
import { FilterRack } from "./filter-rack";
import { filterCopy } from "@/lib/copy/lanes";

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
  orderPending = false,
  excludedByExactly: number | null = null,
) {
  return render(
    <FilterRack
      params={params}
      lane={lane}
      onChange={() => {}}
      shown={shown}
      total={total}
      excludedByExactly={excludedByExactly}
      orderPending={orderPending}
    />,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("FilterRack", () => {
  it("preserves a non-default ranking when the sheet's own Clear is pressed", () => {
    // Forced compact and actually opened, because the first version of this
    // test guarded on `queryByRole` and could pass without ever reaching the
    // sheet — in wide it matched the chassis's Clear instead, and in compact it
    // matched nothing at all.
    stubWidth(false);
    const seen: LaneParams[] = [];
    render(
      <FilterRack
        params={{ ...defaultParams("owned"), order: "name", colors: ["r"] }}
        lane="owned"
        onChange={(next) => seen.push(next)}
        shown={4}
        total={148}
        excludedByExactly={null}
        orderPending={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: filterCopy.sheet.trigger }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Clear" }));
    expect(seen.length).toBeGreaterThan(0);
    for (const next of seen) expect(next.order).toBe("name");
  });
  it("passes the Exactly aside through to the chassis result line", () => {
    const { container } = renderRack(
      "owned",
      { ...defaultParams("owned"), colors: ["u", "b"], match: "exactly" },
      2,
      148,
      false,
      6,
    );
    const result = container.querySelector("[data-chassis-row='result']");
    expect(result?.textContent).toContain("2 of 148 commanders match");
    expect(result?.textContent).toContain("Exactly excludes 6 that Any would show");
  });

  it("draws no aside when nothing is excluded", () => {
    const { container } = renderRack("owned");
    expect(container.querySelector("[data-chassis-row='result']")?.textContent)
      .not.toContain("Exactly excludes");
  });

  // The two rankings are order values now, not a control of their own, so
  // discover's rack carries no second single-select beside order.
  it("opens the discover rack on the fit ranking, as an order", () => {
    stubWidth(true);
    renderRack("discover", defaultParams("discover"), 3301, 3301);
    expect(screen.getByRole("button", { name: "Order · Best fit" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Order · / })).toHaveLength(1);
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

  // Discover's five orders all sound plausible; the glosses say what each one
  // actually sorts on. Fit and Name need no such line and are drawn without one.
  it("glosses the discover order menu and leaves the owned menu bare", () => {
    stubWidth(true);
    const { unmount } = renderRack("discover", defaultParams("discover"), 3301, 3301);
    fireEvent.click(screen.getByRole("button", { name: "Order · Best fit" }));
    // The two rankings lead, and are glossed like the rest: they are the only
    // options that change which commanders the list holds.
    expect(screen.getByText("most of its support list already owned")).toBeInTheDocument();
    expect(screen.getByText("farthest from the archetypes you have built")).toBeInTheDocument();
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
// to do NOTHING while a ranking flip is out, beyond the crown the control already
// wears — and the natural implementation of a pending flag is to reach for the
// nearest count. These lock the nothing.
describe("FilterRack while a ranking flip is in flight", () => {
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
    // One busy node on the whole rack, and it is the order trigger.
    const busy = container.querySelectorAll("[aria-busy]");
    expect(busy).toHaveLength(1);
    expect(busy[0]).toBe(screen.getByRole("button", { name: "Order · Best fit" }));
  });

  it("marks order and nothing else", () => {
    stubWidth(true);
    const { container } = renderRack("discover", defaultParams("discover"), 3301, 3301, true);
    expect(container.querySelectorAll("[data-pending-mark]")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "Order · Best fit" }).querySelector("[data-pending-mark]"),
    ).toBeInTheDocument();
    // The pips narrow a list already in memory whatever is in flight, so they
    // stay live and unmarked.
    expect(screen.getByRole("group", { name: "Colour identity" })).not.toHaveAttribute(
      "aria-busy",
    );
  });

  // Nothing on the owned lane reaches the server, so its rack is never given the
  // flag: `CommandersView` ships every ranking in one payload.
  it("gives the owned lane no pending state at all", () => {
    stubWidth(true);
    const { container } = renderRack("owned");
    expect(container.querySelectorAll("[data-pending-mark]")).toHaveLength(0);
    expect(container.querySelectorAll("[aria-busy]")).toHaveLength(0);
  });

  // Order is on the persistent row behind the scrim, not in the sheet, so the
  // sheet has nothing to mark — and the pending flag must not be plumbed into it
  // looking for something.
  it("puts no busy state in the sheet, and holds the footer count", () => {
    stubWidth(false);
    const { container } = renderRack("discover", defaultParams("discover"), 3301, 3301, true);
    fireEvent.click(screen.getByRole("button", { name: "Filters" }));

    const sheet = screen.getByRole("dialog");
    expect(sheet.querySelectorAll("[aria-busy]")).toHaveLength(0);
    expect(sheet.querySelectorAll("[data-pending-mark]")).toHaveLength(0);
    // One mark on the whole rack still, and it is out on the row behind.
    expect(container.querySelectorAll("[data-pending-mark]")).toHaveLength(1);

    // The footer is the result line's sentence in another voice. It holds too.
    expect(
      screen.getByRole("button", { name: "Show 3,301 commanders" }),
    ).toBeInTheDocument();
  });
});
