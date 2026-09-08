import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { discoverCopy } from "../../lib/copy/lanes";
import { PENDING_OPACITY } from "./pending";
import { ScopeControl as RackScope } from "./rack/scope-control";

// One contract (#338). A flip whose answer comes from the server leaves the
// control it was made on inert for the whole round-trip unless the control says
// otherwise: it renders the value it is heading for as its selected one and dims
// itself while it waits — the control alone, never the list, which the discovery
// table rules out in as many words.
//
// This covered three controls until the two-lane split. The availability segment
// went with `FilterBar` and does not navigate any more; the page header's
// `I own` / `To play` toggle went with the split itself, which made the scope a
// route and the nav its switch. What is left is the rack's scope control, the
// one control on either lane whose flip can still reach the server. Everything
// else on the rack narrows a list already in memory and has nothing to wait for.
describe("controls with a flip in flight", () => {
  // It inherits what the sort menu had, because it is the control that replaced
  // it: the trigger dims and the mark takes the chevron's slot, so the rack
  // keeps one glyph's width at both states.
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
  // one.
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
    render(<RackScope value="new" onChange={vi.fn()} wide showGlosses={false} />);
    const trigger = screen.getByRole("button", { name: discoverCopy.scope.somethingNew });
    expect(trigger.getAttribute("aria-busy")).toBeNull();
    expect(trigger.style.opacity).toBe("");
    expect(document.querySelector("[data-pending-mark]")).toBeNull();
  });
});
