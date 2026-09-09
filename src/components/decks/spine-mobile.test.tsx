import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { SpineMobile } from "./spine-mobile";
import { overCopy, renameCopy } from "../../lib/copy/decks-builder";
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
    fireEvent.click(screen.getByRole("button", { name: renameCopy.triggerAria(props.deck.name) }));
    expect(band.textContent).not.toContain("Atraxa, Praetors’ Voice");
    expect(screen.getByText(/Atraxa, Praetors’ Voice/)).toBeTruthy();
  });

  // Both actions refuse the mousedown, for opposite reasons: Cancel so the blur
  // does not save the edit it is refusing, Save so the blur does not send the
  // same rename the tap is about to send.
  it("neither action lets the field's blur fire first", () => {
    renderSpine(<SpineMobile {...props} />);
    fireEvent.click(screen.getByRole("button", { name: renameCopy.triggerAria(props.deck.name) }));
    for (const name of [/Save/, "Cancel"]) {
      expect(fireEvent.mouseDown(screen.getByRole("button", { name }))).toBe(false);
    }
  });

  // R6 ruling 4. The header is reachable from list contexts, so the label has
  // to say which deck is about to be renamed.
  it("names the deck in the rename trigger's accessible name", () => {
    renderSpine(<SpineMobile {...props} />);
    expect(
      screen.getByRole("button", { name: `Rename deck: ${props.deck.name}` }),
    ).toBeTruthy();
  });

  it("colours the bar by status", () => {
    const { container } = renderSpine(<SpineMobile {...props} status="Complete" />);
    const fill = container.querySelector<HTMLElement>("[data-testid='spine-bar-fill']");
    expect(fill?.style.background).toBe("var(--success)");
  });

  // R6 ruling 3. Past 99 the status is `Over`, whose bar is --danger. A
  // --warning figure beside a --danger bar paints one state in two alarm
  // colours, so every ink that reads out the state reads the token the bar reads.
  it("paints the over-99 readout in the status colour, not a second alarm colour", () => {
    const { container } = renderSpine(
      <SpineMobile
        {...props}
        counts={{ built: 104, ownedCount: 100, toBuyCount: 4 }}
        status="Over"
      />,
    );
    const fill = container.querySelector<HTMLElement>("[data-testid='spine-bar-fill']");
    expect(fill?.style.background).toBe("var(--danger)");
    expect(container.innerHTML).not.toContain("var(--warning)");
    expect(screen.getByText("104")).toHaveStyle({ color: "var(--danger)" });
    expect(screen.getByText("+5")).toHaveStyle({ color: "var(--danger)" });
  });

  // R7 ruling 3a. The trim line is the remedy rather than the readout, so its
  // bold lead is emphasis only and inherits the paragraph's var(--fg-body).
  it("leaves the trim line's bold lead at body colour", () => {
    const { container } = renderSpine(
      <SpineMobile
        {...props}
        counts={{ built: 104, ownedCount: 100, toBuyCount: 4 }}
        status="Over"
      />,
    );
    const lead = container.querySelector<HTMLElement>("p b");
    expect(lead?.textContent).toBe(overCopy.trim.lead("Five"));
    // An inherited colour is an absent inline style, not a computed one: jsdom
    // applies no stylesheet, so the assertion is that nothing overrides it.
    expect(lead?.style.color).toBe("");
  });

  // The phone has no hover, so the trigger is always visible — which is why it
  // must stay a full 44px target even after losing the box that used to draw it.
  it("keeps the rename trigger at a phone target with no box of its own", () => {
    renderSpine(<SpineMobile {...props} />);
    const trigger = screen.getByRole("button", { name: renameCopy.triggerAria(props.deck.name) });
    expect([trigger.style.width, trigger.style.height]).toEqual(["44px", "44px"]);
    expect(trigger.className).not.toContain("border");
    expect(trigger.className).not.toContain("bg-");
  });
});
