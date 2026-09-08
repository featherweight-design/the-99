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
        showHint={false}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Colour match" });
    expect(group).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps the greyed control focusable", () => {
    render(
      <ColourControl colors={[]} match="exactly" onColorsChange={noop} onMatchChange={noop} wide showHint={false} />,
    );
    expect(screen.getByRole("radio", { name: "Exactly these" })).not.toHaveAttribute("disabled");
  });

  it("remembers the mode while greyed, so re-lighting a pip restores it", () => {
    render(
      <ColourControl colors={[]} match="exactly" onColorsChange={noop} onMatchChange={noop} wide showHint={false} />,
    );
    expect(screen.getByRole("radio", { name: "Exactly these" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("goes live once a pip is lit", () => {
    render(
      <ColourControl colors={["b"]} match="contains" onColorsChange={noop} onMatchChange={noop} wide showHint={false} />,
    );
    expect(screen.getByRole("radiogroup", { name: "Colour match" })).not.toHaveAttribute(
      "aria-disabled",
    );
  });

  it("carries the explainer in the sheet only", () => {
    const { rerender } = render(
      <ColourControl colors={[]} match="contains" onColorsChange={noop} onMatchChange={noop} wide={false} showHint />,
    );
    expect(
      screen.getByText("Pick a colour and this decides how the pips combine."),
    ).toBeInTheDocument();
    rerender(
      <ColourControl colors={[]} match="contains" onColorsChange={noop} onMatchChange={noop} wide showHint={false} />,
    );
    expect(
      screen.queryByText("Pick a colour and this decides how the pips combine."),
    ).not.toBeInTheDocument();
  });

  it("does not mount two subtrees at one breakpoint", () => {
    render(
      <ColourControl colors={["b"]} match="contains" onColorsChange={noop} onMatchChange={noop} wide showHint={false} />,
    );
    expect(screen.getAllByRole("radiogroup", { name: "Colour match" })).toHaveLength(1);
  });
});
