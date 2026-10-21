import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CountStepper } from "./count-stepper";

const props = { count: 3, fewerLabel: "Fewer", moreLabel: "More", countLabel: "Count", onStep: vi.fn(), onType: vi.fn() };

describe("CountStepper on a coarse pointer", () => {
  it("makes the row's three parts 44px slots: both buttons and the figure", () => {
    render(<CountStepper layout="row" {...props} />);
    for (const name of ["Fewer", "More"]) expect(screen.getByRole("button", { name }).className).toContain("pointer-coarse:w-[44px]");
    const figure = screen.getByRole("textbox", { name: "Count" });
    expect(figure.className).toContain("pointer-coarse:min-w-[44px]!");
    expect(figure.className).toContain("pointer-coarse:h-[44px]");
  });

  it("leaves the band's figure as drawn", () => {
    render(<CountStepper layout="band" {...props} />);
    expect(screen.getByRole("textbox", { name: "Count" }).className).not.toContain("pointer-coarse");
  });
});
