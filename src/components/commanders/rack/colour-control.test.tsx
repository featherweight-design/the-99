import { render, screen } from "@testing-library/react";
// `vi` is not imported: the plan's version of this file imported it and never
// used it, which lints as an unused binding. The six assertions are otherwise
// verbatim.
import { describe, expect, it } from "vitest";
import { ColourControl } from "./colour-control";

const noop = () => {};

describe("ColourControl", () => {
  it("renders the colour-match control with no pip lit, greyed rather than absent", () => {
    render(
      <ColourControl
        colors={[]}
        match="contains"
        onColorsChange={noop}
        onMatchChange={noop}
        wide
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Color match" });
    expect(group).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps the greyed control focusable", () => {
    render(
      <ColourControl colors={[]} match="exactly" onColorsChange={noop} onMatchChange={noop} wide />,
    );
    expect(screen.getByRole("radio", { name: "Exactly these" })).not.toHaveAttribute("disabled");
  });

  it("remembers the mode while greyed, so re-lighting a pip restores it", () => {
    render(
      <ColourControl colors={[]} match="exactly" onColorsChange={noop} onMatchChange={noop} wide />,
    );
    expect(screen.getByRole("radio", { name: "Exactly these" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("goes live once a pip is lit", () => {
    render(
      <ColourControl colors={["b"]} match="contains" onColorsChange={noop} onMatchChange={noop} wide />,
    );
    expect(screen.getByRole("radiogroup", { name: "Color match" })).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  // The explainer is gone at both widths. It only ever rendered while the mode
  // was greyed, so it appeared and vanished on the first pip tap and took the
  // sheet's height with it.
  it("carries no explainer at either width", () => {
    const { rerender } = render(
      <ColourControl colors={[]} match="contains" onColorsChange={noop} onMatchChange={noop} wide={false} />,
    );
    expect(screen.queryByText(/decides how the pips combine/)).not.toBeInTheDocument();
    rerender(
      <ColourControl colors={[]} match="contains" onColorsChange={noop} onMatchChange={noop} wide />,
    );
    expect(screen.queryByText(/decides how the pips combine/)).not.toBeInTheDocument();
  });

  it("does not mount two subtrees at one breakpoint", () => {
    render(
      <ColourControl colors={["b"]} match="contains" onColorsChange={noop} onMatchChange={noop} wide />,
    );
    expect(screen.getAllByRole("radiogroup", { name: "Color match" })).toHaveLength(1);
  });
});
