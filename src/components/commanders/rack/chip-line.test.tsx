import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultParams } from "@/lib/commanders/lane-params";
import { ChipLine } from "./chip-line";

const noop = () => {};

describe("ChipLine", () => {
  // The disabled `Clear` beside no chips already says there is nothing to clear,
  // so the row holds its height and says nothing.
  it("holds its height with nothing active, without narrating the empty row", () => {
    const { container } = render(
      <ChipLine params={defaultParams("owned")} lane="owned" onChange={noop} wide />,
    );
    expect(screen.queryAllByTestId("filter-chip")).toHaveLength(0);
    expect(container.firstElementChild).toHaveClass("min-h-[22px]");
    expect(container.textContent).toBe("Clear");
  });

  it("keeps Clear present and inert rather than removing it", () => {
    render(<ChipLine params={defaultParams("owned")} lane="owned" onChange={noop} wide />);
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
  });

  it("orders chips by control, search first", () => {
    render(
      <ChipLine
        params={{ ...defaultParams("owned"), q: "druid", colors: ["b", "g"] }}
        lane="owned"
        onChange={noop}
        wide
      />,
    );
    const chips = screen.getAllByTestId("filter-chip").map((c) => c.textContent);
    expect(chips[0]).toContain('"druid"');
  });

  // One chip per control is about chips, not swatches: the label collapses two
  // pips to "2 colours", and the swatches inside that one chip say which two.
  it("draws a swatch per lit hue inside the single colour chip", () => {
    render(
      <ChipLine
        params={{ ...defaultParams("owned"), colors: ["b", "g"] }}
        lane="owned"
        onChange={noop}
        wide
      />,
    );
    const chip = screen.getByTestId("filter-chip");
    expect(chip).toHaveTextContent("2 colours");
    expect(chip.querySelectorAll("span[style*='background']")).toHaveLength(2);
  });

  // Four is the most either lane can produce, and the phone shows all four: a
  // chip hidden behind a count is a filter the reader cannot see is on.
  it("shows every chip on the phone, wrapping rather than collapsing", () => {
    const { container } = render(
      <ChipLine
        params={{
          q: "druid",
          colors: ["b", "g"],
          match: "exactly",
          avail: "free",
          order: "name",
        }}
        lane="owned"
        onChange={noop}
        wide={false}
      />,
    );
    expect(screen.getAllByTestId("filter-chip")).toHaveLength(4);
    expect(screen.queryByText(/^\+\d/)).not.toBeInTheDocument();
    expect(container.firstElementChild).toHaveClass("flex-wrap");
  });

  it("clears every control at once, back to the lane's defaults", async () => {
    const onChange = vi.fn();
    render(
      <ChipLine
        params={{ ...defaultParams("owned"), colors: ["b"] }}
        lane="owned"
        onChange={onChange}
        wide
      />,
    );
    screen.getByRole("button", { name: "Clear" }).click();
    expect(onChange).toHaveBeenCalledWith(defaultParams("owned"));
  });
});
