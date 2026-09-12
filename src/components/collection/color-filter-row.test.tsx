import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ColorFilterRow } from "./color-filter-row";

describe("ColorFilterRow", () => {
  it("renders one pip per WUBRG colour", () => {
    render(<ColorFilterRow selected={[]} onToggle={() => {}} />);
    expect(screen.getAllByRole("switch")).toHaveLength(5);
  });

  it("checks exactly the selected pip", () => {
    render(<ColorFilterRow selected={["R"]} onToggle={() => {}} />);
    expect(screen.getByRole("switch", { name: "Filter by R" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Filter by W" })).not.toBeChecked();
  });

  it("reports the colour that was toggled", () => {
    const onToggle = vi.fn();
    render(<ColorFilterRow selected={[]} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("switch", { name: "Filter by U" }));
    expect(onToggle).toHaveBeenCalledWith("U");
  });

  it("labels the row so the pips are not five unexplained circles", () => {
    render(<ColorFilterRow selected={[]} onToggle={() => {}} />);
    expect(screen.getByText("COLOR")).toBeInTheDocument();
  });
});
