// The Something wrong? row on About's index (flyer trial PR 5; Report-Phone R2, Report-Desktop D2): drawn only for a reader
// with Report a problem on, and its press opens the form.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../app/feedback-actions", () => ({ sendProblemReport: vi.fn() }));

import { reportCopy as copy } from "../../../lib/copy/report";
import { AboutIndex } from "./about-index";

describe("AboutIndex, Report a problem", () => {
  it("draws no row by default or with the switch off", () => {
    const { rerender } = render(<AboutIndex tiles={[]} />);
    expect(document.querySelector("[data-about-report]")).toBeNull();
    rerender(<AboutIndex tiles={[]} reportable={false} />);
    expect(screen.queryByText(copy.aboutTitle)).toBeNull();
  });

  it("draws the title, the line and the press with the switch on, and the press opens the form", () => {
    render(<AboutIndex tiles={[]} reportable />);
    expect(screen.getByText(copy.aboutTitle)).toBeTruthy();
    expect(screen.getByText(copy.aboutLine)).toBeTruthy();
    expect(screen.queryByTestId("report-what")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: copy.aboutPress }));
    expect(screen.getByTestId("report-what")).toBeTruthy();
  });
});
