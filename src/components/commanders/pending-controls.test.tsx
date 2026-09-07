import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { availabilityCopy } from "../../lib/copy/availability";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { FilterBar } from "./filter-bar";
import { PENDING_OPACITY } from "./pending";
import { ScopeControl } from "./scope-control";
import { SortMenu } from "./sort-menu";

// One contract, three controls (#338). Every flip on the discovery scope is a
// server round-trip, and before this the screen was inert for its whole
// duration: the segment stayed unselected and nothing said a request was out.
// Each control now renders the value it is heading for as its selected one and
// dims itself while it waits — the control alone, never the list, which the
// discovery table rules out in as many words.
describe("controls with a flip in flight", () => {
  const bar = (availPending: "all" | "free" | null) => (
    <FilterBar
      colors={[]}
      onToggleColor={vi.fn()}
      onClearColors={vi.fn()}
      avail="free"
      availPending={availPending}
      onAvailChange={vi.fn()}
      availOk
      wasWindowed={false}
      shown={25}
      filteredTotal={4}
      activeTotal={4}
      order={{ desktop: null, mobile: null }}
    />
  );

  it("selects the scope being navigated to, not the one still rendered", () => {
    render(<ScopeControl scope="owned" pending="play" onChange={vi.fn()} />);
    const group = screen.getByRole("radiogroup");
    expect(group.getAttribute("aria-busy")).toBe("true");
    expect(group.style.opacity).toBe(String(PENDING_OPACITY));
    expect(
      screen.getByRole("radio", { name: discoveryCopy.scope.playAria }).getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("selects the availability mode being navigated to", () => {
    render(bar("all"));
    const group = screen.getAllByRole("radiogroup")[0];
    expect(group.getAttribute("aria-busy")).toBe("true");
    expect(
      screen.getAllByRole("radio", { name: availabilityCopy.ranking.allAria })[0]
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("names the ordering being navigated to on the trigger", () => {
    render(<SortMenu sort="fit" pending="new" hasDecks onChange={vi.fn()} />);
    const trigger = screen.getByRole("button", {
      name: discoveryCopy.sort.triggerAria(discoveryCopy.sort.new),
    });
    expect(trigger.getAttribute("aria-busy")).toBe("true");
    expect(trigger.style.opacity).toBe(String(PENDING_OPACITY));
  });

  // The other half: a control with nothing in flight is byte-identical to what
  // shipped. `aria-busy="false"` on every idle control would be noise in the
  // accessibility tree, and the owned scope's availability flip is a client-side
  // swap that is never pending at all.
  it("is unmarked and undimmed with nothing in flight", () => {
    const { rerender } = render(<ScopeControl scope="owned" onChange={vi.fn()} />);
    const group = screen.getByRole("radiogroup");
    expect(group.getAttribute("aria-busy")).toBeNull();
    expect(group.style.opacity).toBe("");

    rerender(bar(null));
    for (const g of screen.getAllByRole("radiogroup")) {
      expect(g.getAttribute("aria-busy")).toBeNull();
    }
  });
});
