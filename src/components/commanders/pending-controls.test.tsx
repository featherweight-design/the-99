import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { discoverCopy } from "../../lib/copy/lanes";
import { PENDING_OPACITY } from "./pending";
import { ScopeControl } from "./scope-control";
import { ScopeControl as RackScope } from "./rack/scope-control";

// One contract (#338). Every flip on the scope toggle is a server round-trip,
// and before this the screen was inert for its whole duration: the segment
// stayed unselected and nothing said a request was out. The control now renders
// the value it is heading for as its selected one and dims itself while it
// waits — the control alone, never the list, which the discovery table rules out
// in as many words.
//
// This covered three controls until the filter rack replaced two of them. The
// availability segment went with `FilterBar` and does not navigate any more; the
// sort menu's half of the contract moved to the rack's scope control, which is
// now the one control on either lane whose flip can reach the server. Everything
// else on the rack narrows a list already in memory and has nothing to wait for.
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

  // The rack's scope control inherits what the sort menu had, because it is the
  // control that replaced it: the trigger dims and the mark takes the chevron's
  // slot, so the rack keeps one glyph's width at both states.
  it("dims the rack's scope trigger and puts the mark in the chevron's slot", () => {
    render(<RackScope value="new" onChange={vi.fn()} wide showGlosses={false} pending />);
    // The trigger carries no aria-label: its two glyph spans are aria-hidden,
    // so the label it shows is the whole of its accessible name.
    const trigger = screen.getByRole("button", { name: discoverCopy.scope.somethingNew });
    expect(trigger.getAttribute("aria-busy")).toBe("true");
    expect(trigger.style.opacity).toBe(String(PENDING_OPACITY));
    expect(trigger.querySelector("[data-pending-mark]")).not.toBeNull();
    expect(trigger.textContent).not.toContain("▾");
  });

  // The sheet renders pills rather than a trigger, so the mark rides the picked
  // one — the same place it rides on the lane toggle above.
  it("marks the picked pill in the sheet, not the whole group", () => {
    render(<RackScope value="new" onChange={vi.fn()} wide={false} showGlosses pending />);
    const group = screen.getByRole("radiogroup");
    expect(group.getAttribute("aria-busy")).toBe("true");
    const picked = screen.getByRole("radio", { name: discoverCopy.scope.somethingNew });
    const other = screen.getByRole("radio", { name: discoverCopy.scope.bestFit });
    expect(picked.querySelector("[data-pending-mark]")).not.toBeNull();
    expect(other.querySelector("[data-pending-mark]")).toBeNull();
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
