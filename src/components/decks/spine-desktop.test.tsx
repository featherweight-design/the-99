import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { SpineDesktop } from "./spine-desktop";
import { overCopy, renameCopy } from "../../lib/copy/decks-builder";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
import { deck, pairDeck, props } from "./spine-fixtures";

const saveDeckHeader = vi.hoisted(() => vi.fn(async () => ({ ok: true as const })));
vi.mock("../../app/decks/tuning-actions", () => ({ saveDeckHeader }));

// The band's `Card details` pill reads the card-detail context, so the header
// can only be rendered inside it.
function renderSpine(ui: React.ReactElement) {
  return render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>{ui}</CardDetailProvider>,
  );
}

describe("SpineDesktop", () => {
  // The header band, 288, and TWO portrait geometries on it: 560 above ~1200px
  // of row and 340 below. Both mounted, one shown by a media query — the wash's
  // stops are inline gradients computed from numbers, so no stylesheet can
  // switch them, and this component and its phone twin are already arranged this
  // way for the same reason.
  it("washes a 288 band, at 560 above 1200px of row and 340 below", () => {
    const { container } = renderSpine(<SpineDesktop {...props} />);
    const washes = Array.from(
      container.querySelectorAll<HTMLElement>('[aria-hidden="true"].absolute'),
    ).filter((el) => el.hasAttribute("data-art-wash-band"));
    expect(washes).toHaveLength(2);
    for (const wash of washes) {
      expect(wash.style.height).toBe("288px");
      expect(wash.getAttribute("data-art-wash-band")).toBe("288");
    }

    const widths = washes.map(
      (w) => w.querySelector<HTMLElement>(".art-wash-art")?.style.width ?? "",
    );
    expect(widths).toEqual(["560px", "340px"]);

    // One of the two is drawn at a time, and the breakpoint is the row's width
    // rather than a device: at 560 the portrait crowds a narrower title column.
    const holders = washes.map((w) => w.parentElement!.className);
    expect(holders[0]).toContain("hidden @min-[1200px]:block");
    expect(holders[1]).toContain("@min-[1200px]:hidden");
  });

  // The title column's inset moves with the portrait: 592 clears the 560px
  // portrait's 584px flat stop and 364 clears the 340px one's 356. Ink before the
  // flat stop stands on the crop rather than on the row's ground, which is what
  // makes a band with no vertical ramp safe.
  // A CONTAINER query, not a viewport one. This header is the flex sibling of a
  // 62px desktop rail, so a 1200px viewport is a ~1138px row — and the handoff's
  // floor is 1200px OF ROW. A viewport query picked the 560px portrait for a row
  // that cannot hold it.
  it("switches on the row's own width rather than the viewport's", () => {
    const { container } = renderSpine(<SpineDesktop {...props} />);
    const header = container.querySelector("header")!;
    expect(header.className).toContain("@container");
    expect(header.className).not.toMatch(/(?<!@)min-\[1200px\]/);
  });

  it("insets the title column past whichever flat stop is drawn", () => {
    const { container } = renderSpine(<SpineDesktop {...props} />);
    // `items-end`, not `items-center`: both columns sit at the band's foot.
    const column = container.querySelector<HTMLElement>(".relative.flex.items-end")!;
    expect(column.className).toContain("pl-[364px]");
    expect(column.className).toContain("@min-[1200px]:pl-[592px]");
    // `min-h-[288px]`, not `h-full`: the header states `minHeight`, and `h-full`
    // against an indefinite parent resolves to `auto` — which would leave
    // `items-center` centring the row in its own content height.
    expect(column.className).toContain("min-h-[288px]");
    expect(column.className).not.toContain("h-full");
    // A `padding` shorthand here would set `padding-left` inline and outrank both
    // classes, silently leaving the title over the portrait.
    expect(column.style.paddingLeft).toBe("");
    expect(column.style.paddingRight).toBe("24px");
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
    fireEvent.click(screen.getByRole("button", { name: deckDescriptionCopy.description.pencilAria(props.deck.name) }));
    expect(screen.getByLabelText("Deck name")).toBeTruthy();
    expect(screen.getByText("↵ save · esc cancel")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Export" })).toBeNull();
  });

  // Both Save and Cancel refuse the mousedown, for opposite reasons: Cancel so
  // the blur does not save the edit it is refusing, Save so the blur does not
  // send the same rename the click is about to send.
  it("neither action lets the field's blur fire first", () => {
    renderSpine(<SpineDesktop {...props} />);
    fireEvent.click(screen.getByRole("button", { name: deckDescriptionCopy.description.pencilAria(props.deck.name) }));
    for (const name of [/Save/, "Cancel"]) {
      const down = fireEvent.mouseDown(screen.getByRole("button", { name }));
      expect(down).toBe(false);
    }
  });

  it("holds the field's box across every editing state (H35: both fields, one width)", () => {
    renderSpine(<SpineDesktop {...props} />);
    fireEvent.click(screen.getByRole("button", { name: deckDescriptionCopy.description.pencilAria(props.deck.name) }));
    const field = screen.getByLabelText("Deck name") as HTMLInputElement;
    const box = [field.style.width, field.style.height];
    expect(box).toEqual(["100%", "29px"]);
    // Both fields, one width, 560 or the column's own — set on the wrapper, not the field.
    const wrapper = field.parentElement!;
    expect(wrapper.className).toContain("max-w-[560px]");

    // save-disabled: cleared name
    fireEvent.change(field, { target: { value: "" } });
    expect(screen.getByRole("button", { name: /Save/ }).getAttribute("aria-disabled")).toBe("true");
    expect([field.style.width, field.style.height]).toEqual(box);

    // and the hint row is present in every state, so no row is ever added
    expect(screen.getByTestId("spine-rename-hint")).toBeTruthy();
  });

  // Pre-open review round 3: the editor already shows the description as its own field, so the
  // saved tagline beneath it would read as a duplicate of whatever the draft just replaced.
  it("hides the saved tagline while the editor is open", () => {
    const { container } = renderSpine(<SpineDesktop {...props} deck={{ ...props.deck, intent: "Grind it out." }} />);
    expect(container.querySelector("[data-deck-intent]")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: deckDescriptionCopy.description.pencilAria(props.deck.name) }));
    expect(container.querySelector("[data-deck-intent]")).toBeNull();
  });

  // Pre-open review: Save/Cancel sit in a separate column from the fields, so the pair's blur
  // has to be caught above both columns or focus moving from the description field to Cancel
  // reads as "left the pair" and commits before Cancel is ever pressed.
  it("does not commit when focus moves from the description field to Cancel", () => {
    renderSpine(<SpineDesktop {...props} />);
    fireEvent.click(screen.getByRole("button", { name: deckDescriptionCopy.description.pencilAria(props.deck.name) }));
    const name = screen.getByLabelText("Deck name") as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Changed Name" } });
    const description = screen.getByLabelText(deckDescriptionCopy.description.fieldAria);
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    fireEvent.blur(description, { relatedTarget: cancelButton });
    fireEvent.click(cancelButton);
    expect(saveDeckHeader).not.toHaveBeenCalled();
  });

  // Pre-open review round 2: the editor's two halves sit in separate flex columns with the
  // partner's card-details trigger between them — focus moving there is genuinely OUTSIDE the
  // pair (unlike Cancel, above) and must still commit, not be silently swallowed by too wide a
  // boundary.
  it("commits when focus moves from the description field to the partner's card trigger", async () => {
    renderSpine(<SpineDesktop {...props} deck={pairDeck} />);
    fireEvent.click(screen.getByRole("button", { name: deckDescriptionCopy.description.pencilAria(pairDeck.name) }));
    const name = screen.getByLabelText("Deck name") as HTMLInputElement;
    fireEvent.change(name, { target: { value: "Changed Name" } });
    const description = screen.getByLabelText(deckDescriptionCopy.description.fieldAria);
    const partnerTrigger = screen.getByRole("button", { name: new RegExp(pairDeck.partner!.name) });
    fireEvent.blur(description, { relatedTarget: partnerTrigger });
    await vi.waitFor(() => expect(saveDeckHeader).toHaveBeenCalledWith(pairDeck.id, { name: "Changed Name" }));
  });

  // R6 ruling 4. The header is reachable from list contexts, so the label has
  // to say which deck is about to be renamed.
  it("names the deck in the rename trigger's accessible name", () => {
    renderSpine(<SpineDesktop {...props} />);
    expect(
      screen.getByRole("button", { name: deckDescriptionCopy.description.pencilAria(props.deck.name) }),
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

describe("SpineDesktop — the rename glyph", () => {
  // Desktop's pencil was a bordered 28px box revealed on `group-hover`, and only
  // its accessible name was covered — so a regression to that treatment would
  // have passed. It is the same inline unplated glyph the phone draws now, at the
  // same stated 44px target, always visible: a control revealed on hover has to
  // be discovered by accident, and there is no hover where the same glyph also
  // has to work on a phone.
  it("draws it inline, unplated and always visible, at a stated 44px target", () => {
    renderSpine(<SpineDesktop {...props} />);
    const trigger = screen.getByRole("button", { name: deckDescriptionCopy.description.pencilAria(props.deck.name) });
    expect(trigger.className).not.toContain("border");
    expect(trigger.className).not.toContain("opacity-0");
    expect(trigger.className).not.toContain("group-hover");
    expect(trigger.className).toContain("text-[color:var(--fg-muted)]");

    expect(trigger.style.boxSizing).toBe("content-box");
    expect([trigger.style.width, trigger.style.height]).toEqual(["14px", "14px"]);
    expect(trigger.style.padding).toBe("15px");
    expect(trigger.style.margin).toBe("-15px");

    // 14px in flow and 15px of overhang each side, which is what has to fit: the
    // title column is followed by the row's 18px gap before the actions, so 15
    // clears and a zero-width holder's 29 would not.
    const holder = trigger.parentElement as HTMLElement;
    expect(holder.style.width).toBe("14px");
    expect(holder.className).toContain("flex-none");
  });

  // The clamp is on the span, not the heading. A clamped box needs
  // `overflow: hidden`, and a heading shrink-wrapping a short name would clip the
  // glyph that starts after the text — painting nothing and answering nothing.
  // The heading holds the deck's name and nothing else: a clamped box clips, and
  // the control beside the title must not be inside a clipping box — nor inside
  // the heading's accessible name.
  it("keeps the heading's name the deck's name alone", () => {
    const { container } = renderSpine(<SpineDesktop {...props} />);
    const heading = container.querySelector("h1")!;
    expect(heading.textContent).toBe(props.deck.name);
    expect(heading.querySelector("button")).toBeNull();

    const clamped = heading.querySelector("[data-deck-title]") as HTMLElement;
    expect(clamped.style.overflow).toBe("hidden");
    expect(clamped.style.webkitLineClamp).toBe("2");
  });

  // The count is what the bar is a picture of, so they share a row and the
  // figure sits to the bar's right. The `x owned · y to buy` split under it is
  // cut — the fill and the figure carry it between them.
  it("puts the figure beside the bar and drops the owned/to-buy split", () => {
    const { container } = renderSpine(<SpineDesktop {...props} />);
    const fill = container.querySelector<HTMLElement>('[data-testid="spine-bar-fill"]')!;
    const row = fill.parentElement!.parentElement!;
    expect(row.className).toContain("items-center");
    expect(row.textContent).toContain("99");
    expect(container.textContent).not.toContain("owned ·");
  });

  // Desktop keeps the control's words: it sits in a wide empty corner of the
  // band with nothing to compete with. The phone is icon-only, which is what the
  // round cut them for.
  it("names the card-details control in words on desktop", () => {
    renderSpine(<SpineDesktop {...props} />);
    const control = screen.getByRole("button", { name: "View card details" });
    expect(control.textContent).toContain("Card details");
  });
});
