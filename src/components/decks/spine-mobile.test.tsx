import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { SpineMobile } from "./spine-mobile";
import { overCopy, renameCopy } from "../../lib/copy/decks-builder";
import { deckDescriptionCopy } from "../../lib/copy/deck-description";
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
    // Two spans on a single commander too: the name truncates and the colour
    // does not, because a shared `truncate` ellipsised away the three-character
    // half rather than the fifty-character one.
    const single = screen.getByText("Atraxa, Praetors’ Voice").parentElement!;
    expect(single.textContent?.replace(/\u00a0/g, " ")).toBe("Atraxa, Praetors’ Voice · Non-red");
    const colour = screen.getByText(/Non-red/);
    expect(colour.style.flex).toBe("0 0 auto");
  });

  // Decision 18's ordered shrink, behind the status chip: the chip leads this
  // row because it is the one child whose width never changes, and the names
  // follow it and give first.
  it("leads the row with the pips, not the status pill, and shrinks the partner first", () => {
    const { container } = renderSpine(<SpineMobile {...props} deck={pairDeck} />);
    const row = screen.getByText("Atraxa, Praetors’ Voice").parentElement!.parentElement!;
    // The pill moved to the chips row (Analysis tab handoff §1); the meta row carries none.
    expect(row.textContent).not.toContain("Building");
    expect(container.querySelector("[data-spine-chips]")!.textContent).toContain("Building");
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
    fireEvent.click(screen.getByRole("button", { name: deckDescriptionCopy.description.pencilAria(props.deck.name) }));
    expect(band.textContent).not.toContain("Atraxa, Praetors’ Voice");
    expect(screen.getByText(/Atraxa, Praetors’ Voice/)).toBeTruthy();
  });

  // Both actions refuse the mousedown, for opposite reasons: Cancel so the blur
  // does not save the edit it is refusing, Save so the blur does not send the
  // same rename the tap is about to send.
  it("neither action lets the field's blur fire first", () => {
    renderSpine(<SpineMobile {...props} />);
    fireEvent.click(screen.getByRole("button", { name: deckDescriptionCopy.description.pencilAria(props.deck.name) }));
    for (const name of [/Save/, "Cancel"]) {
      expect(fireEvent.mouseDown(screen.getByRole("button", { name }))).toBe(false);
    }
  });

  // R6 ruling 4. The header is reachable from list contexts, so the label has
  // to say which deck is about to be renamed.
  it("names the deck in the rename trigger's accessible name", () => {
    renderSpine(<SpineMobile {...props} />);
    expect(
      screen.getByRole("button", { name: deckDescriptionCopy.description.pencilAria(props.deck.name) }),
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
  // shifting the title's baseline. Its holder is 14px in flow — a zero-width one
  // put the whole 44px box past the text, where the band clips it — and it needs
  // no spacer opposite, because the block reads from the left rather than being
  // centred.
  it("draws the rename trigger inline, unplated, at a 44px hit area", () => {
    renderSpine(<SpineMobile {...props} />);
    const trigger = screen.getByRole("button", { name: deckDescriptionCopy.description.pencilAria(props.deck.name) });
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
    // In FLOW, straight after the heading, and baseline-aligned: the heading is
    // a non-atomic inline box, so the glyph continues on its last line at any
    // line count. No positioning, no measurement, no fallback state.
    expect(holder.className).toContain("inline-flex");
    expect(holder.className).not.toContain("absolute");
    expect(holder.style.verticalAlign).toBe("baseline");
    // Beside the heading, not inside it: within the heading its `aria-label`
    // joined the heading's own accessible name, so heading navigation announced
    // the control and then the control announced itself again.
    expect(holder.closest("h1")).toBeNull();
    expect(holder.previousElementSibling?.tagName).toBe("H1");
    // And it wins the hit test over the row below, whose own controls come later
    // in the DOM — the 15px of hit padding reaches past the title line. `z-[1]`
    // on an absolutely positioned box does the same job `relative` did on an
    // in-flow one: both make it a positioned element with a stacking order of
    // its own, rather than one ordered by document position.
    expect(holder.className).toContain("z-[1]");
  });

  // No spacer. It existed only to balance the pencil's flow width so a CENTRED
  // title stayed on the band's centre; the block reads from the left now, and a
  // leading spacer would push the title off the block's own edge for nothing.
  it("draws no spacer opposite the pencil, because the title is left-aligned", () => {
    const { container } = renderSpine(<SpineMobile {...props} />);
    const block = container.querySelector<HTMLElement>("[data-wash-label]")!;
    const spacers = Array.from(block.querySelectorAll<HTMLElement>('span[aria-hidden="true"]'));
    expect(spacers.filter((el) => el.style.width === "20px")).toHaveLength(0);
    expect(spacers.filter((el) => el.style.width === "44px")).toHaveLength(0);
    expect(block.className).toContain("items-start");
  });
});

describe("SpineMobile — the block the ramp is keyed to", () => {
  // `labelAtPx` is only true if the block is the height it was measured at, and
  // the pill is the tallest thing in its meta row. Padding over an inherited line
  // box made it 23px and the block one pixel past the ramp keyed to it, and
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
  it("states the 288 band and the 143px three-line block it measured", () => {
    const { container } = renderSpine(<SpineMobile {...props} />);
    const wash = container.querySelector("[data-art-wash-band]")!;
    expect(wash).toHaveAttribute("data-art-wash-band", "288");
    expect(wash).toHaveAttribute("data-art-wash-label-at", "143");
    expect((wash as HTMLElement).style.height).toBe("288px");
  });

  // The intent line sits inside the same block, so a deck with one keys the ramp to the taller
  // block: up to four 12.5/1.5 lines and their gap on top of the 143.
  it("keys the ramp to the taller block when the deck has an intent line", () => {
    const { container } = renderSpine(<SpineMobile {...props} deck={{ ...props.deck, intent: "go wide and win late" }} />);
    const wash = container.querySelector("[data-art-wash-band]")!;
    expect(wash).toHaveAttribute("data-art-wash-label-at", "224");
  });

  // The meta row inside that block is ONE row: a pair's two names and five pips are wider than
  // the caption, and a wrapping row would grow the block past the ramp keyed to it.
  it("never lets the meta row wrap to a second line", () => {
    const { container } = renderSpine(<SpineMobile {...props} />);
    const meta = container.querySelector("[data-wash-label] [data-spine-meta]")!;
    expect(meta.className).toContain("flex-nowrap");
  });

  // THE CHIPS ROW (Analysis tab handoff §1): the pill left the meta row for a line of its own
  // under it, followed by the bracket chip, in the order desktop draws.
  it("draws the status pill on its own row under the commander line", () => {
    const { container } = renderSpine(<SpineMobile {...props} />);
    const block = container.querySelector("[data-wash-label]")!;
    const meta = block.querySelector("[data-spine-meta]")!;
    const chips = block.querySelector("[data-spine-chips]")!;
    expect(chips.textContent).toContain("Building");
    expect(meta.textContent).not.toContain("Building");
    expect(meta.compareDocumentPosition(chips) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    // The RIGHT alone, now that the block reads from the left: a centred block
    // had to pad both sides to clear that corner without moving its centre.
    expect(Number.parseInt(block.style.paddingRight, 10)).toBeGreaterThanOrEqual(40);
    expect(block.style.paddingLeft).toBe("");
  });

  // The pips are back, between the chip and the names — the same adjacency
  // desktop draws. They cost about eleven characters of the commander's name at
  // 390px, and the colour stays worded beside them: a grid cell cannot afford
  // both, a page header can.
  it("leads the meta row with the identity pips, before the names", () => {
    const { container } = renderSpine(<SpineMobile {...props} />);
    const meta = container.querySelector<HTMLElement>("[data-spine-meta]")!;
    const pips = meta.querySelectorAll('span[aria-hidden="true"] > span.rounded-\\[2px\\]');
    expect(pips.length).toBeGreaterThan(0);
    // The pips lead; the names come last and are the only child that shrinks. The status
    // pill is no longer here — it opens the chips row below.
    expect(meta.textContent).not.toContain("Building");
    expect(meta.children[0].contains(pips[0])).toBe(true);
    // The colour is still a word, which is the only form a screen reader gets —
    // the pips are `aria-hidden`.
    expect(meta.textContent).toContain("Non-red");
  });

  // The UNION, not the primary's identity. A pair deck's pips have to include a
  // colour only its partner brings, and the single-commander fixture above
  // cannot tell `deckIdentity(primary, partner)` from `primary` alone.
  it("draws a pair's pips from both commanders' colours", () => {
    const { container } = renderSpine(
      <SpineMobile
        {...props}
        deck={{
          ...pairDeck,
          commander: { ...pairDeck.commander, colorIdentity: ["W"] },
          partner: { ...pairDeck.partner!, colorIdentity: ["R"] },
        }}
      />,
    );
    const meta = container.querySelector<HTMLElement>("[data-spine-meta]")!;
    const pips = meta.querySelectorAll('span[aria-hidden="true"] > span.rounded-\\[2px\\]');
    // Two swatches: one for each commander's colour. The primary alone would
    // draw one.
    expect(pips).toHaveLength(2);
  });

  // The band reads from the left: title, then the chip and the commander under
  // it. It was centred, which is what the mocks were compared against and what
  // this pins so it cannot drift back.
  it("left-aligns the band's whole block, title and meta row alike", () => {
    const { container } = renderSpine(<SpineMobile {...props} />);
    const block = container.querySelector<HTMLElement>("[data-wash-label]")!;
    expect(block.className).toContain("items-start");
    expect(block.className).not.toContain("items-center");

    const heading = container.querySelector<HTMLElement>("h1")!;
    expect(heading.style.textAlign).toBe("left");
    // `inline`, and unclamped. A clamp needs an atomic box, whose width is the
    // whole available width once its text wraps — which is what put the glyph at
    // the far right of a two-line name. An inline heading wraps as ordinary text
    // and the glyph follows its last line at any line count.
    expect(heading.style.display).toBe("inline");
    expect(heading.style.webkitLineClamp).toBe("");

    const meta = container.querySelector<HTMLElement>("[data-spine-meta]")!;
    expect(meta.className).toContain("justify-start");
    expect(meta.className).not.toContain("justify-center");
  });

  // The field replaces the title in place, so it takes the title's alignment.
  it("left-aligns the rename field, like the title it replaces", () => {
    renderSpine(<SpineMobile {...props} />);
    fireEvent.click(screen.getByRole("button", { name: deckDescriptionCopy.description.pencilAria(props.deck.name) }));
    expect(screen.getByLabelText(renameCopy.fieldAria).className).toContain("text-left");
  });

  // The pencil follows the title's TEXT, not the heading's box. A flex sibling
  // sat after that box, and a wrapped heading's box is full width — so a
  // two-line name pushed the glyph to the far right of the band while a
  // one-line name kept it beside the words. jsdom lays nothing out, so the
  // declaration is what is assertable, and the declaration is the whole fix:
  // an unclamped inline heading, an inline holder after it in flow, and no flex
  // row between them.
  it("keeps the glyph on the title's last line at any line count", () => {
    const { container } = renderSpine(
      <SpineMobile
        {...props}
        deck={{ ...props.deck, name: "HD Tune — A Very Long Deck Name That Keeps Going" }}
      />,
    );
    const heading = container.querySelector<HTMLElement>("h1")!;
    const holder = container
      .querySelector<HTMLElement>('button[aria-label^="Edit name"]')!
      .parentElement!;
    // Siblings in one inline flow: the heading is `display: inline` and
    // unclamped, so its text wraps as ordinary content and the glyph after it
    // continues on its last line — whether that is line one or line three.
    expect(heading.style.display).toBe("inline");
    expect(heading.style.webkitLineClamp).toBe("");
    expect(heading.style.overflow).toBe("");
    // An unbroken name breaks mid-word rather than running past the block: an
    // inline element takes no `min-w-0`, so this is the only thing holding it.
    expect(heading.style.overflowWrap).toBe("anywhere");
    expect(holder.className).toContain("inline-flex");
    expect(holder.className).not.toContain("absolute");
    // A non-breaking space before it, so a line break never falls between the
    // name and its own control.
    expect(holder.parentElement!.textContent).toContain("\u00a0");
    // The heading's accessible name is still the deck's name alone: the control
    // is its sibling, not its child.
    expect(heading.textContent).toBe("HD Tune — A Very Long Deck Name That Keeps Going");
    expect(heading.querySelector("button")).toBeNull();
  });
});
