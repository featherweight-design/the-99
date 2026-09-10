import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { SpineDesktop } from "./spine-desktop";
import { overCopy, renameCopy } from "../../lib/copy/decks-builder";
import { deck, pairDeck, props } from "./spine-fixtures";

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

  // A deck is 100 cards including its commanders, so the denominator is the
  // body: 99 for a single commander and 98 for a pair.
  it("prints the body size as the denominator, 98 for a pair", () => {
    renderSpine(<SpineDesktop {...props} />);
    expect(screen.getByText("/ 99")).toBeTruthy();
    cleanup();
    renderSpine(<SpineDesktop {...props} deck={pairDeck} />);
    expect(screen.getByText("/ 98")).toBeTruthy();
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

  // R6 ruling 3. Past 99 the status is `Over`, whose bar is --danger. A
  // --warning figure beside a --danger bar paints one state in two alarm
  // colours, so every ink that reads out the state reads the token the bar reads.
  it("paints the over-99 readout in the status colour, not a second alarm colour", () => {
    const { container } = renderSpine(
      <SpineDesktop
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
      <SpineDesktop
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

  it("swaps the actions slot for the rename hint while editing", () => {
    renderSpine(<SpineDesktop {...props} />);
    fireEvent.click(screen.getByRole("button", { name: renameCopy.triggerAria(props.deck.name) }));
    expect(screen.getByLabelText("Deck name")).toBeTruthy();
    expect(screen.getByText("↵ save · esc cancel")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Export" })).toBeNull();
  });

  // Both Save and Cancel refuse the mousedown, for opposite reasons: Cancel so
  // the blur does not save the edit it is refusing, Save so the blur does not
  // send the same rename the click is about to send.
  it("neither action lets the field's blur fire first", () => {
    renderSpine(<SpineDesktop {...props} />);
    fireEvent.click(screen.getByRole("button", { name: renameCopy.triggerAria(props.deck.name) }));
    for (const name of [/Save/, "Cancel"]) {
      const down = fireEvent.mouseDown(screen.getByRole("button", { name }));
      expect(down).toBe(false);
    }
  });

  it("holds the field's box across every editing state", () => {
    renderSpine(<SpineDesktop {...props} />);
    fireEvent.click(screen.getByRole("button", { name: renameCopy.triggerAria(props.deck.name) }));
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

  // R6 ruling 4. The header is reachable from list contexts, so the label has
  // to say which deck is about to be renamed.
  it("names the deck in the rename trigger's accessible name", () => {
    renderSpine(<SpineDesktop {...props} />);
    expect(
      screen.getByRole("button", { name: `Rename deck: ${props.deck.name}` }),
    ).toBeTruthy();
  });

  // Decision 18. Four spans, not one string: the caption is an ordered shrink,
  // so the `+` and the identity label are their own non-shrinking children and
  // the space around them is the group's gap. Desktop is the width that keeps
  // the label — which for a pair is the union of both identities.
  it("states the pair in the caption and labels the union identity", () => {
    renderSpine(<SpineDesktop {...props} deck={pairDeck} />);
    const group = screen.getByText("Atraxa, Praetors’ Voice").parentElement!;
    expect([...group.children].map((n) => n.textContent)).toEqual([
      "Atraxa, Praetors’ Voice",
      "+",
      "Kratos, God of War",
      "· 5-color",
    ]);
  });

  // The band is one image, so the partner's printing opens from the word that
  // names it rather than from a second portrait — and it is the half that gives
  // when the column is too narrow for both names.
  it("opens the partner's printing from its name, and shrinks it first", () => {
    renderSpine(<SpineDesktop {...props} deck={pairDeck} />);
    const trigger = screen.getByRole("button", {
      name: "Show the printing for Kratos, God of War",
    });
    expect(trigger.textContent).toBe("Kratos, God of War");
    expect(trigger.style.borderBottom).toBe("1px solid var(--border-strong)");
    expect(trigger.style.flexShrink).toBe("1000");
    expect(trigger.style.textOverflow).toBe("ellipsis");

    // The primary ellipsises too — writing it `flex-none` overflows the group
    // and draws the names under the count.
    const primary = screen.getByText("Atraxa, Praetors’ Voice");
    expect(primary.style.textOverflow).toBe("ellipsis");
    expect(primary.style.minWidth).toBe("0px");
  });

  it("drops the Card details pill when the commander has no crop", () => {
    const bare = { ...deck, commander: { ...deck.commander, artCropUri: null } };
    renderSpine(<SpineDesktop {...props} deck={bare} />);
    expect(screen.queryByRole("button", { name: "View card details" })).toBeNull();
  });
});
