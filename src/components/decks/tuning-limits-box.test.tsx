import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { parseCapDollars, TuningLimitsBox } from "./tuning-limits-box";

const sets = [{ code: "hob", name: "The Hobbit" }, { code: "hoc", name: "The Hobbit Commander" }];

function renderBox(overrides: Partial<Parameters<typeof TuningLimitsBox>[0]> = {}) {
  const onCapChange = vi.fn();
  const onSetsChange = vi.fn();
  const onOwnedOnlyChange = vi.fn();
  render(
    <TuningLimitsBox
      sets={sets}
      capDollars={null}
      onCapChange={onCapChange}
      selectedSets={[]}
      onSetsChange={onSetsChange}
      ownedOnly={false}
      onOwnedOnlyChange={onOwnedOnlyChange}
      {...overrides}
    />,
  );
  return { onCapChange, onSetsChange, onOwnedOnlyChange };
}

describe("parseCapDollars", () => {
  it("accepts a whole dollar figure in range, $ and commas stripped", () => {
    expect(parseCapDollars("$1,500")).toBe(1500);
    expect(parseCapDollars("25")).toBe(25);
  });

  it("refuses zero, a fraction, and past the cap", () => {
    expect(parseCapDollars("0")).toBeNull();
    expect(parseCapDollars("12.50")).toBeNull();
    expect(parseCapDollars("100001")).toBeNull();
  });
});

describe("TuningLimitsBox (H35 PR 2, \"Kept for this deck\")", () => {
  it("draws the heading and an empty cap field with the placeholder", () => {
    renderBox();
    expect(screen.getByText("Kept for this deck")).toBeTruthy();
    expect(screen.getByLabelText("Most per card")).toHaveValue("");
  });

  it("types digits only, strips everything else, and reports the parsed dollars", () => {
    const { onCapChange } = renderBox();
    const field = screen.getByLabelText("Most per card");
    fireEvent.change(field, { target: { value: "$1,500abc" } });
    expect(field).toHaveValue("1500");
    expect(onCapChange).toHaveBeenCalledWith(1500);
  });

  it("reports null once the field is cleared", () => {
    const { onCapChange } = renderBox({ capDollars: 25 });
    fireEvent.change(screen.getByLabelText("Most per card"), { target: { value: "" } });
    expect(onCapChange).toHaveBeenCalledWith(null);
  });

  // A non-empty invalid value ($0, over the cap) is a draft still being typed, not a request
  // to clear the limit — nothing saves until it is fixed or emptied (pre-open review round 1).
  it("does not save a non-empty invalid cap as no cap", () => {
    const { onCapChange } = renderBox({ capDollars: 25 });
    const field = screen.getByLabelText("Most per card");
    fireEvent.change(field, { target: { value: "0" } });
    expect(field).toHaveValue("0");
    expect(onCapChange).not.toHaveBeenCalled();
    fireEvent.change(field, { target: { value: "100001" } });
    expect(onCapChange).not.toHaveBeenCalled();
  });

  // A revalidated prop (another tab's save) must redraw the field even after the initial mount
  // (pre-open review round 1) — `capDraft` is seeded once, not forever.
  it("redraws the draft when capDollars changes from outside, not just at mount", () => {
    const { rerender } = render(
      <TuningLimitsBox
        sets={sets} capDollars={25} onCapChange={vi.fn()} selectedSets={[]} onSetsChange={vi.fn()}
        ownedOnly={false} onOwnedOnlyChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Most per card")).toHaveValue("25");
    rerender(
      <TuningLimitsBox
        sets={sets} capDollars={50} onCapChange={vi.fn()} selectedSets={[]} onSetsChange={vi.fn()}
        ownedOnly={false} onOwnedOnlyChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Most per card")).toHaveValue("50");
  });

  it("the Set trigger reads Set 0 with nothing chosen, matching the sizer's widest form", () => {
    renderBox();
    expect(screen.getByText("Set 0")).toBeTruthy();
  });

  // jsdom's default matchMedia reports phone (vitest.setup.ts) — the Set control must follow
  // that real breakpoint rather than always forcing the desktop popover (pre-open review round
  // 1): a forced-desktop panel skips the sheet's focus trap, scroll lock and Back dismissal.
  it("opens the Set control as a phone sheet under the default (narrow) breakpoint", () => {
    renderBox();
    fireEvent.click(screen.getByText("Set 0"));
    expect(screen.getByRole("dialog", { name: "Filter by printed-in set" })).toHaveAttribute("aria-modal", "true");
  });

  it("toggles owned-only via the two-way control", () => {
    const { onOwnedOnlyChange } = renderBox();
    fireEvent.click(screen.getByRole("radio", { name: "Only cards I own" }));
    expect(onOwnedOnlyChange).toHaveBeenCalledWith(true);
  });

  // Focus follows the new choice (pre-open review round 1), the same shape as `PoolRadios` —
  // without it, a second arrow press or a Space re-selects the option that is now unchecked.
  it("moves focus to the newly selected option on an arrow press", () => {
    const { onOwnedOnlyChange } = renderBox();
    const any = screen.getByRole("radio", { name: "Any card" });
    const own = screen.getByRole("radio", { name: "Only cards I own" });
    any.focus();
    fireEvent.keyDown(any, { key: "ArrowRight" });
    expect(onOwnedOnlyChange).toHaveBeenCalledWith(true);
    expect(own).toHaveFocus();
  });

  it("Any card is selected by default, Only cards I own once ownedOnly is true", () => {
    renderBox({ ownedOnly: true });
    expect(screen.getByRole("radio", { name: "Only cards I own" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Any card" })).toHaveAttribute("aria-checked", "false");
  });
});
