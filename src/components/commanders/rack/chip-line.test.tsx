import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { defaultParams } from "@/lib/commanders/lane-params";
import { ChipLine } from "./chip-line";

const noop = () => {};

describe("ChipLine", () => {
  it("holds its height with nothing active, and says so", () => {
    render(<ChipLine params={defaultParams("owned")} lane="owned" onChange={noop} wide />);
    expect(screen.getByText("no filters — nothing to clear")).toBeInTheDocument();
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

  it("collapses past one line to a dashed +N rather than wrapping", () => {
    render(
      <ChipLine
        params={{
          q: "druid",
          colors: ["b", "g"],
          match: "exactly",
          avail: "free",
          order: "name",
          scope: "bestfit",
        }}
        lane="owned"
        onChange={noop}
        wide={false}
      />,
    );
    expect(screen.getByText("+3")).toBeInTheDocument();
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
