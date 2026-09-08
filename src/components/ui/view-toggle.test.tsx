import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ViewToggle, type ViewToggleOption } from "./view-toggle";

type View = "a" | "b";

const OPTIONS: readonly [ViewToggleOption<View>, ViewToggleOption<View>] = [
  { value: "a", glyph: "≣", label: "A view" },
  { value: "b", glyph: "▦", label: "B view" },
];

describe("ViewToggle", () => {
  it("names each segment by its label, never its glyph", () => {
    render(<ViewToggle options={OPTIONS} value="a" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "A view" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "B view" })).toBeInTheDocument();
    expect(screen.queryByText("≣")).toHaveAttribute("aria-hidden", "true");
  });

  it("marks the selected segment pressed", () => {
    render(<ViewToggle options={OPTIONS} value="b" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "B view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("reports the segment pressed", () => {
    const picked: string[] = [];
    render(<ViewToggle options={OPTIONS} value="a" onChange={(v) => picked.push(v)} />);
    fireEvent.click(screen.getByRole("button", { name: "B view" }));
    expect(picked).toEqual(["b"]);
  });

  // The two surfaces are one control, so the metrics are asserted here and
  // nowhere else — a second surface hand-typing them is the drift this
  // component exists to prevent.
  it("draws 44px segments on the phone and 32px on the desktop", () => {
    render(<ViewToggle options={OPTIONS} value="a" onChange={() => {}} />);
    for (const name of ["A view", "B view"]) {
      expect(screen.getByRole("button", { name })).toHaveClass(
        "w-[44px]",
        "h-[44px]",
        "md:w-[32px]",
        "md:h-[32px]",
      );
    }
  });

  // Accent is spent elsewhere in the builder's bar; selected reads as bone on
  // `--elevated` with a ring, the same skin the grouping pills already draw.
  it("never fills the selected segment with accent", () => {
    const { container } = render(
      <ViewToggle options={OPTIONS} value="a" onChange={() => {}} />,
    );
    expect(container.innerHTML).not.toContain("--accent");
  });
});
