// The phone layering rule (#177): the shell tab bar owns the true bottom edge
// at z-40, so a route dock pinned to `bottom-0` at a lower z is drawn over.
// jsdom lays nothing out, so these assert the two halves of the rule that
// survive without layout — where the footer is pinned, and that the scrolling
// column reserves the footer's height rather than assuming a constant. The
// clearance itself is measured at runtime by `scripts/probe-bottom.mjs`.
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../app/decks/actions", () => ({ createDeck: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { CreatePicker } = await import("./create-picker");

const commanders = [
  {
    oracleId: "oracle-1",
    name: "Greta, Sweettooth Scourge",
    colorIdentity: ["B", "G"],
    imageUri: null,
    poolCount: 42,
  },
];

describe("CreatePicker — phone bottom stack", () => {
  it("pins the footer above the tab bar, not on the bottom edge", () => {
    const { container } = render(<CreatePicker legalCommanders={commanders} />);
    const footer = container.querySelector("div.fixed");

    expect(footer).toHaveClass("bottom-[80px]");
    expect(footer).not.toHaveClass("bottom-0");
    expect(screen.getAllByRole("button", { name: /create deck/i }).some((b) =>
      footer?.contains(b),
    )).toBe(true);
  });

  it("reserves the footer's measured height under the commander list", () => {
    const { container } = render(<CreatePicker legalCommanders={commanders} />);
    const column = container.querySelector(".pb-\\[var\\(--picker-reserve\\)\\]");

    expect(column).not.toBeNull();
    // Nothing has been measured in jsdom, so the reserve is the breathing room
    // alone. The point of the assertion is that the value is a variable.
    expect((column as HTMLElement).style.getPropertyValue("--picker-reserve")).toBe("12px");
  });
});
