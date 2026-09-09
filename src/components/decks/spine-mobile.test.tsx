import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { SpineMobile } from "./spine-mobile";
import { props } from "./spine-fixtures";

function renderSpine(ui: React.ReactElement) {
  return render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>{ui}</CardDetailProvider>,
  );
}

describe("SpineMobile", () => {
  it("never draws the owned line", () => {
    renderSpine(<SpineMobile {...props} />);
    expect(screen.queryByText(/owned ·/)).toBeNull();
  });

  it("moves the meta row below the divider while editing", () => {
    const { container } = renderSpine(<SpineMobile {...props} />);
    const band = container.querySelector("[data-testid='spine-band']")!;
    expect(band.textContent).toContain("Atraxa, Praetors’ Voice");
    fireEvent.click(screen.getByRole("button", { name: "Rename deck" }));
    expect(band.textContent).not.toContain("Atraxa, Praetors’ Voice");
    expect(screen.getByText(/Atraxa, Praetors’ Voice/)).toBeTruthy();
  });

  it("colours the bar by status", () => {
    const { container } = renderSpine(<SpineMobile {...props} status="Complete" />);
    const fill = container.querySelector<HTMLElement>("[data-testid='spine-bar-fill']");
    expect(fill?.style.background).toBe("var(--success)");
  });
});
