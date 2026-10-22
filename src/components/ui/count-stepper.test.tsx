import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CountStepper } from "./count-stepper";

const props = { count: 3, fewerLabel: "Fewer", moreLabel: "More", countLabel: "Count", onStep: vi.fn(), onType: vi.fn() };

describe("CountStepper on a coarse pointer", () => {
  it("makes the row's three parts 44px slots: both buttons and the figure", () => {
    render(<CountStepper layout="row" {...props} />);
    for (const name of ["Fewer", "More"]) expect(screen.getByRole("button", { name }).className).toContain("pointer-coarse:w-[44px]");
    const figure = screen.getByRole("textbox", { name: "Count" });
    expect(figure.className).toContain("pointer-coarse:min-w-[44px]!");
    expect(figure.closest("label")?.className).toContain("pointer-coarse:py-[12px]");
  });

  it("leaves the band's figure as drawn", () => {
    render(<CountStepper layout="band" {...props} />);
    expect(screen.getByRole("textbox", { name: "Count" }).className).not.toContain("pointer-coarse");
  });

  it("keeps a press on the figure's padding from reaching the row", () => {
    const onRow = vi.fn();
    render(
      <div onClick={onRow}>
        <CountStepper layout="row" {...props} />
      </div>,
    );
    fireEvent.click(screen.getByRole("textbox", { name: "Count" }).closest("label")!);
    expect(onRow).not.toHaveBeenCalled();
  });
});
