import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { PENDING_OPACITY } from "./pending";
import { ScopeControl } from "./scope-control";

// One contract (#338). Every flip on the scope toggle is a server round-trip,
// and before this the screen was inert for its whole duration: the segment
// stayed unselected and nothing said a request was out. The control now renders
// the value it is heading for as its selected one and dims itself while it
// waits — the control alone, never the list, which the discovery table rules out
// in as many words.
//
// This covered three controls until the filter rack replaced two of them. The
// availability segment and the sort menu went with `FilterBar` and `SortMenu`,
// and the rack's own controls carry no pending affordance, so what is left is
// the contract as the surviving control keeps it.
describe("controls with a flip in flight", () => {
  it("selects the scope being navigated to, not the one still rendered", () => {
    render(<ScopeControl scope="owned" pending="play" onChange={vi.fn()} />);
    const group = screen.getByRole("radiogroup");
    expect(group.getAttribute("aria-busy")).toBe("true");
    expect(group.style.opacity).toBe(String(PENDING_OPACITY));
    expect(
      screen.getByRole("radio", { name: discoveryCopy.scope.playAria }).getAttribute("aria-checked"),
    ).toBe("true");
  });

  // The dim was the whole signal until now, and a dimmed control reads as one
  // that has been switched off rather than one that is waiting. The mark is the
  // crown pulsing on the app's one loading animation, and it rides the selected
  // segment — which is already the segment the reader pressed, because the
  // control goes optimistic the moment they press it.
  it("pulses the loading mark on the control that is waiting", () => {
    render(<ScopeControl scope="owned" pending="play" onChange={vi.fn()} />);
    const playing = screen.getByRole("radio", { name: discoveryCopy.scope.playAria });
    expect(playing.querySelector("[data-pending-mark]")).not.toBeNull();
  });

  // The mark stands where the label was rather than beside it. The label keeps
  // its box, so the segment is the same width waiting as idle — a mark that took
  // room of its own would widen the pressed segment and shove its neighbour.
  it("hides the waiting segment's label without giving up its box", () => {
    render(<ScopeControl scope="owned" pending="play" onChange={vi.fn()} />);
    const playing = screen.getByRole("radio", { name: discoveryCopy.scope.playAria });
    expect(playing.textContent).toContain(discoveryCopy.scope.play);
    expect(screen.getByText(discoveryCopy.scope.play).closest(".opacity-0")).not.toBeNull();
  });

  // The other half: a control with nothing in flight is byte-identical to what
  // shipped. `aria-busy="false"` on an idle control would be noise in the
  // accessibility tree.
  it("is unmarked and undimmed with nothing in flight", () => {
    render(<ScopeControl scope="owned" onChange={vi.fn()} />);
    const group = screen.getByRole("radiogroup");
    expect(group.getAttribute("aria-busy")).toBeNull();
    expect(group.style.opacity).toBe("");
    expect(document.querySelector("[data-pending-mark]")).toBeNull();
  });
});
