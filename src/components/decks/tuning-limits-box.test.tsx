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

  it("the Set trigger reads Set: Any with nothing chosen", () => {
    renderBox();
    expect(screen.getByText("Set: Any")).toBeTruthy();
  });

  it("toggles owned-only via the two-way control", () => {
    const { onOwnedOnlyChange } = renderBox();
    fireEvent.click(screen.getByRole("radio", { name: "Only cards I own" }));
    expect(onOwnedOnlyChange).toHaveBeenCalledWith(true);
  });

  it("Any card is selected by default, Only cards I own once ownedOnly is true", () => {
    renderBox({ ownedOnly: true });
    expect(screen.getByRole("radio", { name: "Only cards I own" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "Any card" })).toHaveAttribute("aria-checked", "false");
  });
});
