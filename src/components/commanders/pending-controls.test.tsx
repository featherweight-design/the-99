import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { discoverCopy, filterCopy } from "../../lib/copy/lanes";
import { PENDING_OPACITY } from "./pending";
import { OrderControl } from "./rack/order-control";
import { ORDER_OPTIONS } from "./rack/order-options";

// One contract (#338). A flip whose answer comes from the server leaves the
// control it was made on inert for the whole round-trip unless the control says
// otherwise: it renders the value it is heading for as its selected one and dims
// itself while it waits — the control alone, never the list, which the discovery
// table rules out in as many words.
//
// This covered three controls until the two-lane split. The availability segment
// went with `FilterBar` and does not navigate any more; the page header's
// `I own` / `To play` toggle went with the split itself, which made the lane a
// route and the nav its switch; and the scope control was folded into order,
// which is what carries the contract now. Only two of discover's five orders can
// reach the server — the other three, and every other control on either rack,
// arrange a list already in memory and have nothing to wait for.
describe("controls with a flip in flight", () => {
  const trigger = (label: string) =>
    screen.getByRole("button", { name: filterCopy.order.trigger(label) });

  // It inherits what the sort menu had, because it is the control that absorbed
  // it: the trigger dims and the mark takes the chevron's slot, so the rack
  // keeps one glyph's width at both states.
  it("dims the rack's order trigger and puts the mark in the chevron's slot", () => {
    render(
      <OrderControl
        value="new"
        options={ORDER_OPTIONS.discover}
        onChange={vi.fn()}
        wide
        pending
      />,
    );
    const el = trigger(discoverCopy.order.somethingNew);
    expect(el.getAttribute("aria-busy")).toBe("true");
    expect(el.style.opacity).toBe(String(PENDING_OPACITY));
    expect(el.querySelector("[data-pending-mark]")).not.toBeNull();
    expect(el.textContent).not.toContain("▾");
  });

  // The other half: a control with nothing in flight is byte-identical to what
  // shipped. `aria-busy="false"` on an idle control would be noise in the
  // accessibility tree.
  it("is unmarked and undimmed with nothing in flight", () => {
    render(
      <OrderControl
        value="new"
        options={ORDER_OPTIONS.discover}
        onChange={vi.fn()}
        wide
      />,
    );
    const el = trigger(discoverCopy.order.somethingNew);
    expect(el.getAttribute("aria-busy")).toBeNull();
    expect(el.style.opacity).toBe("");
    expect(document.querySelector("[data-pending-mark]")).toBeNull();
  });

  // The three client-side orders never set it, so the contract cannot fire on a
  // flip that was answered out of memory.
  it("stays idle on an order the server was never asked for", () => {
    render(
      <OrderControl
        value="popularity"
        options={ORDER_OPTIONS.discover}
        onChange={vi.fn()}
        wide
      />,
    );
    expect(trigger(discoverCopy.order.popularity).getAttribute("aria-busy")).toBeNull();
  });
});
