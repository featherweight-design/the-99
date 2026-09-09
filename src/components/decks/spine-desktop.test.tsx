import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { SpineDesktop } from "./spine-desktop";
import { deck, props } from "./spine-fixtures";

// The band's `Card details` pill reads the card-detail context, so the header
// can only be rendered inside it.
function renderSpine(ui: React.ReactElement) {
  return render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>{ui}</CardDetailProvider>,
  );
}

describe("SpineDesktop", () => {
  it("washes the band at 168 with the commander's art crop", () => {
    const { container } = renderSpine(<SpineDesktop {...props} />);
    const wash = container.querySelector<HTMLElement>('[aria-hidden="true"].absolute');
    expect(wash?.style.height).toBe("168px");
  });

  it("colours the bar by status, not by percentage", () => {
    const { container } = renderSpine(<SpineDesktop {...props} status="To buy" />);
    const fill = container.querySelector<HTMLElement>("[data-testid='spine-bar-fill']");
    expect(fill?.style.background).toBe("var(--accent)");
    expect(fill?.style.width).toBe(`${(62 / 99) * 100}%`);
  });

  it("clamps the bar at 100% past 99 and keeps the over figure", () => {
    const { container } = renderSpine(
      <SpineDesktop
        {...props}
        counts={{ built: 104, ownedCount: 100, toBuyCount: 4 }}
        status="Over"
      />,
    );
    const fill = container.querySelector<HTMLElement>("[data-testid='spine-bar-fill']");
    expect(fill?.style.width).toBe("100%");
    // The exact figure, not /5/: the trim line below also names the same number.
    expect(screen.getByText("+5")).toBeTruthy();
  });

  it("swaps the actions slot for the rename hint while editing", () => {
    renderSpine(<SpineDesktop {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Rename deck" }));
    expect(screen.getByLabelText("Deck name")).toBeTruthy();
    expect(screen.getByText("↵ save · esc cancel")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Export" })).toBeNull();
  });

  // Both Save and Cancel refuse the mousedown, for opposite reasons: Cancel so
  // the blur does not save the edit it is refusing, Save so the blur does not
  // send the same rename the click is about to send.
  it("neither action lets the field's blur fire first", () => {
    renderSpine(<SpineDesktop {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Rename deck" }));
    for (const name of [/Save/, "Cancel"]) {
      const down = fireEvent.mouseDown(screen.getByRole("button", { name }));
      expect(down).toBe(false);
    }
  });

  it("holds the field's box across every editing state", () => {
    renderSpine(<SpineDesktop {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Rename deck" }));
    const field = screen.getByLabelText("Deck name") as HTMLInputElement;
    const box = [field.style.width, field.style.height];
    expect(box).toEqual(["352px", "29px"]);

    // save-disabled: cleared name
    fireEvent.change(field, { target: { value: "" } });
    expect(screen.getByRole("button", { name: /Save/ }).getAttribute("aria-disabled")).toBe("true");
    expect([field.style.width, field.style.height]).toEqual(box);

    // and the hint row is present in every state, so no row is ever added
    expect(screen.getByTestId("spine-rename-hint")).toBeTruthy();
  });

  it("drops the Card details pill when the commander has no crop", () => {
    const bare = { ...deck, commander: { ...deck.commander, artCropUri: null } };
    renderSpine(<SpineDesktop {...props} deck={bare} />);
    expect(screen.queryByRole("button", { name: "View card details" })).toBeNull();
  });
});
