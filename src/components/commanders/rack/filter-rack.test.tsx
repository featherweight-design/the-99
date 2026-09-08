import { render, screen } from "@testing-library/react";
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

function renderRack(lane: Lane, params: LaneParams = defaultParams(lane), shown = 148) {
  return render(
    <FilterRack
      params={params}
      lane={lane}
      onChange={() => {}}
      shown={shown}
      total={148}
      excludedByExactly={null}
    />,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("FilterRack", () => {
  it("leads the discover rack with scope, and gives the owned rack none", () => {
    stubWidth(true);
    renderRack("discover", defaultParams("discover"), 3301);
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
    renderRack("discover", defaultParams("discover"), 3301);
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
