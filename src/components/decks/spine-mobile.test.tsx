import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { SpineMobile } from "./spine-mobile";
import { overCopy, renameCopy } from "../../lib/copy/decks-builder";
import { pairDeck, props } from "./spine-fixtures";

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

  // A deck is 100 cards including its commanders, so the denominator is the
  // body: 99 for a single commander and 98 for a pair.
  it("prints the body size as the denominator, 98 for a pair", () => {
    renderSpine(<SpineMobile {...props} />);
    expect(screen.getByText("/ 99")).toBeTruthy();
    cleanup();
    renderSpine(<SpineMobile {...props} deck={pairDeck} />);
    expect(screen.getByText("/ 98")).toBeTruthy();
  });

  // Decision 18. The caption is centred inside an 18px inset, so at 390 two
  // names are already the width of the row: the identity label is dropped for
  // a pair and kept for a single commander.
  it("states the pair without the identity label", () => {
    renderSpine(<SpineMobile {...props} deck={pairDeck} />);
    const group = screen.getByText("Atraxa, Praetors’ Voice").parentElement!;
    expect([...group.children].map((n) => n.textContent)).toEqual([
      "Atraxa, Praetors’ Voice",
      "+",
      "Kratos, God of War",
    ]);
    cleanup();
    renderSpine(<SpineMobile {...props} />);
    expect(screen.getByText(/Praetors’ Voice/).textContent).toBe(
      "Atraxa, Praetors’ Voice · Non-red",
    );
  });

  // Decision 18's ordered shrink, behind the status chip: the chip leads this
  // row because it is the one child whose width never changes, and the names
  // follow it and give first.
  it("leads the row with the chip and shrinks the partner first", () => {
    renderSpine(<SpineMobile {...props} deck={pairDeck} />);
    const row = screen.getByText("Atraxa, Praetors’ Voice").parentElement!.parentElement!;
    expect(row.firstElementChild!.textContent).toBe("Building");
    // And the row can shrink: without a zero minimum of its own, a `flex-nowrap`
    // row takes its content's min-content width as a floor, which is how a long
    // two-faced commander name drew outside the viewport.
    expect(row.className).toContain("min-w-0");

    const trigger = screen.getByRole("button", {
      name: "Show the printing for Kratos, God of War",
    });
    expect(trigger.style.flexShrink).toBe("1000");
    expect(trigger.style.textOverflow).toBe("ellipsis");
  });

  // The trigger is a 10px word inside a 10px caption, so the target is padding
  // the equal negative margin takes back out of the row. The rule that marks it
  // sits on the word rather than on that taller box.
  it("gives the partner's trigger a 44px target without moving the caption", () => {
    renderSpine(<SpineMobile {...props} deck={pairDeck} />);
    const trigger = screen.getByRole("button", {
      name: "Show the printing for Kratos, God of War",
    });
    expect(trigger.style.padding).toBe("22px 0px 9px");
    expect(trigger.style.margin).toBe("-22px 0px -9px");
    expect(trigger.style.borderBottom).toBe("");
    expect((trigger.firstElementChild as HTMLElement).style.borderBottom).toBe(
      "1px solid var(--border-strong)",
    );
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
  // The pencil is block chrome, and block chrome takes no plate: the ramp
  // protects the label block and plates protect what sits above it, and this
  // glyph is INSIDE the block on ground held at 73%. Its hit area is padding and
  // a negative margin rather than a box, so it clears the 44px floor without
  // shifting the title's baseline — and its holder is 14px in flow, balanced by
  // a 14px spacer opposite, because a zero-width holder put the whole 44px box
  // past the text where the band clips it.
  it("draws the rename trigger inline, unplated, at a 44px hit area", () => {
    renderSpine(<SpineMobile {...props} />);
    const trigger = screen.getByRole("button", { name: renameCopy.triggerAria(props.deck.name) });
    expect(trigger.className).not.toContain("border");
    expect(trigger.className).not.toContain("bg-");
    expect(trigger.className).toContain("text-[color:var(--fg-muted)]");

    // 14px of content plus 15px of padding each side is 44, with `content-box`
    // so the padding adds rather than absorbs. Stated rather than inferred from
    // the glyph: a 14px font size does not guarantee a 14px advance, and this app
    // draws six display faces.
    expect(trigger.style.padding).toBe("15px");
    expect(trigger.style.margin).toBe("-15px");
    expect(trigger.style.boxSizing).toBe("content-box");
    expect(trigger.style.width).toBe("14px");
    expect(trigger.style.height).toBe("14px");

    const holder = trigger.parentElement as HTMLElement;
    // 14px in flow, not zero: a zero-width holder puts the whole 44px border box
    // past the text, which is 29px beyond the block's right edge — clipped by the
    // band on a phone for exactly the long names that fill the column. Only the
    // 15px of hit padding overhangs now, which fits the block's 18px inset.
    expect(holder.style.width).toBe("14px");
    expect(holder.className).toContain("flex-none");
    // Beside the heading, not inside it: within the heading its `aria-label`
    // joined the heading's own accessible name, so heading navigation announced
    // the control and then the control announced itself again.
    expect(holder.closest("h1")).toBeNull();
    expect(holder.previousElementSibling?.tagName).toBe("H1");
    // And it wins the hit test over the row below, whose own controls come later
    // in the DOM — the 15px of hit padding reaches past the title line.
    expect(holder.className).toContain("relative");
    expect(holder.className).toContain("z-[1]");
  });

  // A 14px spacer, not the 44px one the old plated control needed: the row
  // centres title and glyph together, so the balance has to match the glyph's
  // own width. A 44px spacer would push the centred title off centre in the
  // other direction.
  it("balances the pencil with a spacer its own width, not the old 44px one", () => {
    const { container } = renderSpine(<SpineMobile {...props} />);
    const spacers = Array.from(container.querySelectorAll<HTMLElement>('span[aria-hidden="true"]'));
    expect(spacers.filter((el) => el.style.width === "44px")).toHaveLength(0);
    // 20px: the glyph's 14 plus the 6 that sets it off from the name. A spacer
    // that does not match the glyph's flow width leaves the centred title off
    // centre by the difference.
    expect(spacers.filter((el) => el.style.width === "20px").length).toBeGreaterThan(0);
  });
});

describe("SpineMobile — the block the ramp is keyed to", () => {
  // `labelAtPx` is only true if the block is the height it was measured at, and
  // the pill is the tallest thing in its meta row. Padding over an inherited line
  // box made it 23px and the block 91 against a ramp keyed to 90 — one pixel, and
  // the first pixels of a two-line title land on a rising ramp for it.
  it("states the pill's height rather than deriving it from padding", () => {
    renderSpine(<SpineMobile {...props} />);
    const pill = screen.getByText("Building");
    expect(pill.className).toContain("h-[22px]");
    expect(pill.className).not.toContain("py-[3px]");
  });

  // The heading is the deck's name and nothing else — no glyph in its text
  // content and no control in its accessible name — and `data-deck-title` marks
  // that name for anything reading it, which the browser probe does.
  it("keeps the heading's name the deck's name alone", () => {
    const { container } = renderSpine(<SpineMobile {...props} />);
    const heading = container.querySelector("h1")!;
    expect(heading.textContent).toBe(props.deck.name);
    expect(heading.querySelector("button")).toBeNull();
    expect(heading.querySelector("[data-deck-title]")!.textContent).toBe(props.deck.name);
  });
  // The band and the figure keyed to it, at this call site. The contrast table
  // and the primitive's own tests both stay green if this component drifts back
  // to the old geometry — the figures are only a contract where they are passed.
  it("states the 288 band and the 90px block it measured", () => {
    const { container } = renderSpine(<SpineMobile {...props} />);
    const wash = container.querySelector("[data-art-wash-band]")!;
    expect(wash).toHaveAttribute("data-art-wash-band", "288");
    expect(wash).toHaveAttribute("data-art-wash-label-at", "90");
    expect((wash as HTMLElement).style.height).toBe("288px");
  });

  // The row measured for that 90px block is ONE row. At 390px a pair's two
  // names, five 10px pips, the chip and two 8px gaps are wider than the caption,
  // so a wrapping row puts the chip on a second line and grows the block to
  // about 120px while the ramp still holds at 90 — the title's first line on a
  // climbing ramp, which is this round's own failure.
  it("never lets the meta row wrap to a second line", () => {
    const { container } = renderSpine(<SpineMobile {...props} />);
    const block = container.querySelector("[data-wash-label]")!;
    expect(block.querySelector(".flex-nowrap")).not.toBeNull();
    expect(block.querySelector(".flex-wrap")).toBeNull();
  });

  // Same row, figure to the right, for the same reason as desktop.
  it("puts the figure beside the bar", () => {
    const { container } = renderSpine(<SpineMobile {...props} />);
    const fill = container.querySelector<HTMLElement>('[data-testid="spine-bar-fill"]')!;
    const row = fill.parentElement!.parentElement!;
    expect(row.className).toContain("items-center");
    expect(row.textContent).toContain("/ 99");
  });

  // The control sits in this band's bottom-right corner, and its 44px target
  // reached into the meta row — a title running under it, and a tap that could
  // land on either. Both sides are padded so the title stays centred on the band
  // while clearing the corner.
  it("keeps the block clear of the card-details corner", () => {
    const { container } = renderSpine(<SpineMobile {...props} />);
    const block = container.querySelector<HTMLElement>("[data-wash-label]")!;
    expect(Number.parseInt(block.style.paddingRight, 10)).toBeGreaterThanOrEqual(40);
    expect(block.style.paddingLeft).toBe(block.style.paddingRight);
  });

  // No pips on this band. The chip and the names are what the phone's line
  // carries; five swatches beside them is what pushed it past the band's width.
  it("draws no identity pips in the phone band", () => {
    const { container } = renderSpine(<SpineMobile {...props} />);
    const block = container.querySelector<HTMLElement>("[data-wash-label]")!;
    // `IdentityPips` draws an `aria-hidden` span of squared swatches and no test
    // marker, so the pips are counted by what they actually are: the 10px
    // rounded blocks that component emits. Querying a marker nothing draws
    // passed whether or not the pips were there.
    expect(block.querySelectorAll('span[aria-hidden="true"] > span.rounded-\\[2px\\]')).toHaveLength(
      0,
    );
    expect(block.textContent).not.toContain("Naya");
  });
});
