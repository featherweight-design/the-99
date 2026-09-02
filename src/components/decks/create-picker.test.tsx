// The phone layering rule (#177): the shell tab bar owns the true bottom edge
// at z-40, so a route dock pinned to `bottom-0` at a lower z is drawn over.
// jsdom lays nothing out, so these assert the two halves of the rule that
// survive without layout — where the footer is pinned, and that the scrolling
// column reserves the footer's height rather than assuming a constant. The
// clearance itself is measured at runtime by `scripts/probe-bottom.mjs`.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { addPanelCopy } from "../../lib/copy/decks-builder";

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
    render(<CreatePicker legalCommanders={commanders} />);
    const footer = screen.getByTestId("create-picker-dock");

    expect(footer).toHaveClass("bottom-[var(--tabbar-h)]");
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

  it("carries only the summary and the button, so its height cannot move under a thumb", () => {
    const { container } = render(<CreatePicker legalCommanders={commanders} />);
    const footer = screen.getByTestId("create-picker-dock");

    expect(footer).toHaveTextContent(addPanelCopy.createPicker.dockSummaryEmpty);
    // The name field is the thing that used to live here. It belongs to the
    // scrolling flow now — in the dock it would resize on selection.
    expect(footer.querySelector("#picker-deck-name-mobile")).toBeNull();
    expect(container.querySelector("#picker-deck-name-mobile")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Greta/ }));
    expect(footer).toHaveTextContent(
      addPanelCopy.createPicker.dockSummary("Greta, Sweettooth Scourge", "Golgari"),
    );
    expect(footer.querySelector("#picker-deck-name-mobile")).toBeNull();
  });

  it("puts the relocated name field above the list, which scrolls without end", () => {
    const { container } = render(<CreatePicker legalCommanders={commanders} />);
    const name = container.querySelector("#picker-deck-name-mobile") as HTMLElement;
    const list = container.querySelector("ul") as HTMLElement;

    expect(name.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("drops the relocated name field when there is no commander to name a deck after", () => {
    const { container } = render(<CreatePicker legalCommanders={[]} />);
    expect(container.querySelector("#picker-deck-name-mobile")).toBeNull();
  });
});
