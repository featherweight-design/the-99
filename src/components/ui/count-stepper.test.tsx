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

describe("CountStepper, the cell size", () => {
  it("draws a bordered group of 44px cells on a phone and 40px ones from md, the figure's cell at least 44px, and greys a bounded end", () => {
    const onStep = vi.fn();
    render(<CountStepper layout="row" size="cell" {...props} onStep={onStep} moreOff />);
    const group = screen.getByTestId("count-stepper-row");
    expect(group.getAttribute("data-size")).toBe("cell");
    expect(group.className).toContain("border-[color:var(--border-strong)]");
    for (const name of ["Fewer", "More"]) {
      const b = screen.getByRole("button", { name });
      expect(b.className).toContain("h-[44px] w-[44px]");
      expect(b.className).toContain("md:h-[40px] md:w-[40px]");
    }
    const figure = screen.getByRole("textbox", { name: "Count" }).closest("label")!;
    expect(figure.className).toContain("min-w-[44px]");
    const more = screen.getByRole("button", { name: "More" });
    expect(more.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(more);
    expect(onStep).not.toHaveBeenCalled();
  });

  it("leaves the shipped row line as it was", () => {
    render(<CountStepper layout="row" {...props} />);
    expect(screen.getByTestId("count-stepper-row").getAttribute("data-size")).toBeNull();
    expect(screen.getByRole("button", { name: "More" }).getAttribute("aria-disabled")).toBeNull();
  });
});
