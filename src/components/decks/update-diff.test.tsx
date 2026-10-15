// The diff (#277, states 9–11 and 14–16). What is tested here is what the
// player can and cannot get the surface to do: the Keep decision, the row cap,
// the group that unmounts at zero, the wholesale exit, and the single-apply
// guard. Nothing here writes, so the assertions are all about what `onApply`
// is handed.

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deckImportCopy } from "../../lib/copy/deck-import";
import type { DeckUpdatePreview } from "../../app/decks/update-actions";
import { UpdateDiff } from "./update-diff";
import { cardDetailCopy } from "../cards/card-detail-provider";

const copy = deckImportCopy.update.diff;

function row(id: string, over: Partial<DeckUpdatePreview["out"][number]> = {}) {
  return {
    oracleId: id,
    name: `Card ${id}`,
    sourceLine: null,
    typeLine: "Creature",
    quantity: 1,
    auto: true,
    owned: true,
    availability: null,
    ...over,
  };
}

function preview(over: Partial<DeckUpdatePreview> = {}): DeckUpdatePreview {
  return {
    ok: true,
    deckName: "Kykar, Wind's Fury",
    built: 91,
    lineCount: 106,
    notes: [],
    existingUnresolvedCount: 2,
    out: [row("out-1"), row("out-2")],
    lockedOut: [],
    in: [row("in-1", { sourceLine: 4 })],
    fewer: [],
    more: [],
    unchanged: [row("same-1")],
    unresolved: [],
    noChange: false,
    version: null,
    ...over,
  };
}

function renderDiff(over: Partial<DeckUpdatePreview> = {}, props: Partial<{ applying: boolean }> = {}) {
  const onApply = vi.fn();
  const onCancel = vi.fn();
  const onImportAsNew = vi.fn();
  const { container } = render(
    <UpdateDiff
      preview={preview(over)}
      applying={props.applying ?? false}
      onApply={onApply}
      onCancel={onCancel}
      onImportAsNew={onImportAsNew}
    />,
  );
  return { onApply, onCancel, onImportAsNew, container };
}

describe("UpdateDiff", () => {
  // The whole point of the surface: it shows and does not write. A player who
  // reads it and walks away has changed nothing.
  it("writes nothing until the apply is clicked", () => {
    const { onApply } = renderDiff();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("hands back the kept oracle ids, and only those", () => {
    const { onApply } = renderDiff();
    fireEvent.click(screen.getByRole("button", { name: copy.keepAria("Card out-1") }));
    fireEvent.click(screen.getByRole("button", { name: copy.applyAria("1", "1", "Kykar, Wind's Fury") }));
    expect(onApply).toHaveBeenCalledWith(["out-1"]);
  });

  // Locked (never cut), Hugh 2026-09-25: a locked card starts KEPT, and the player can still untick it.
  it("starts a locked card kept", () => {
    const { onApply } = renderDiff({ lockedOut: ["out-2"] });
    expect(screen.getByRole("button", { name: copy.keepAria("Card out-2") }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: copy.applyAria("1", "1", "Kykar, Wind's Fury") }));
    expect(onApply).toHaveBeenCalledWith(["out-2"]);
  });

  it("lets the player untick a locked card, which then leaves", () => {
    const { onApply } = renderDiff({ lockedOut: ["out-2"] });
    fireEvent.click(screen.getByRole("button", { name: copy.keepAria("Card out-2") }));
    fireEvent.click(screen.getByRole("button", { name: copy.applyAria("1", "2", "Kykar, Wind's Fury") }));
    expect(onApply).toHaveBeenCalledWith([]);
  });

  it("takes a keep back on a second click", () => {
    const { onApply } = renderDiff();
    const keep = screen.getByRole("button", { name: copy.keepAria("Card out-1") });
    fireEvent.click(keep);
    fireEvent.click(keep);
    fireEvent.click(screen.getByRole("button", { name: copy.applyAria("1", "2", "Kykar, Wind's Fury") }));
    expect(onApply).toHaveBeenCalledWith([]);
  });

  it("keeps every removal at once", () => {
    const { onApply } = renderDiff();
    fireEvent.click(screen.getByRole("button", { name: copy.keepAll("2") }));
    fireEvent.click(screen.getByRole("button", { name: copy.applyAria("1", "0", "Kykar, Wind's Fury") }));
    expect(onApply).toHaveBeenCalledWith(["out-1", "out-2"]);
  });

  // The landing figure is the sentence the player checks before the one
  // irreversible click, so it has to move with each Keep rather than after.
  it("recomputes the landing count as removals are kept", () => {
    renderDiff();
    expect(screen.getByText(copy.summary("0", "90"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.keepAria("Card out-1") }));
    expect(screen.getByText(copy.summary("1", "91"))).toBeInTheDocument();
  });

  // `applying` is only true on the render after the transition starts, so the
  // guard that matters is the synchronous one — two clicks in one tick.
  it("reaches the server once however fast the apply is double-clicked", () => {
    const { onApply } = renderDiff();
    const apply = screen.getByRole("button", { name: copy.applyAria("1", "2", "Kykar, Wind's Fury") });
    fireEvent.click(apply);
    fireEvent.click(apply);
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  // Disabling the button while it is the control holding focus would blur the
  // thing the player is standing on. `aria-busy` says the same and does not.
  it("marks the apply busy rather than disabling it", () => {
    renderDiff({}, { applying: true });
    const apply = screen.getByRole("button", { name: copy.applyAria("1", "2", "Kykar, Wind's Fury") });
    expect(apply).toHaveAttribute("aria-busy", "true");
    expect(apply).not.toBeDisabled();
  });

  it("does not apply twice when a click lands during an apply", () => {
    const { onApply } = renderDiff({}, { applying: true });
    fireEvent.click(screen.getByRole("button", { name: copy.applyAria("1", "2", "Kykar, Wind's Fury") }));
    expect(onApply).not.toHaveBeenCalled();
  });
});

describe("UpdateDiff groups", () => {
  // State 15. An empty group draws nothing rather than an empty block with a
  // zero in its heading.
  it("omits the going-in group when nothing goes in", () => {
    renderDiff({ in: [] });
    expect(screen.queryByRole("heading", { name: /Going in/ })).not.toBeInTheDocument();
  });

  it("omits the coming-out group when nothing comes out", () => {
    renderDiff({ out: [] });
    expect(screen.queryByRole("heading", { name: /Coming out/ })).not.toBeInTheDocument();
  });

  it("omits the unnamed group when the list has no unnamed lines", () => {
    renderDiff({ unresolved: [] });
    expect(screen.queryByRole("heading", { name: /cannot name/ })).not.toBeInTheDocument();
  });

  // On a versioned deck the paste lands in the draft, so the preview has to say
  // so — the groups below it otherwise read as a write to the committed list.
  it("says a versioned paste lands in the draft, and says it only then", () => {
    renderDiff({ version: 3 });
    expect(screen.getByText(copy.draftPasteNotice(3))).toBeInTheDocument();
  });

  it("says nothing about drafts on a deck that has never committed", () => {
    renderDiff({ version: null });
    expect(screen.queryByText(/pending changes, not the committed deck/)).not.toBeInTheDocument();
  });

  it("caps a long group at four rows and discloses the remainder", () => {
    const many = Array.from({ length: 7 }, (_, i) => row(`out-${i}`));
    renderDiff({ out: many });
    expect(screen.queryByText("Card out-4")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.showMore("3") }));
    expect(screen.getByText("Card out-4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.showFewer }));
    expect(screen.queryByText("Card out-4")).not.toBeInTheDocument();
  });

  it("points the group disclosure at the rows it expands", () => {
    renderDiff({ out: Array.from({ length: 7 }, (_, i) => row(`out-${i}`)) });
    const trigger = screen.getByRole("button", { name: copy.showMore("3") });
    const id = trigger.getAttribute("aria-controls");
    expect(id).toBeTruthy();
    // The container holds the first four rows at rest, so it is named in both
    // states rather than only while expanded.
    expect(document.getElementById(id as string)).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(
      screen.getByRole("button", { name: copy.showFewer }).getAttribute("aria-controls"),
    ).toBe(id);
  });

  it("names the unchanged rows only once they exist", () => {
    renderDiff({ unchanged: [row("same-1"), row("same-2")] });
    const trigger = () => screen.getByRole("button", { name: /Show/ });
    expect(trigger()).not.toHaveAttribute("aria-controls");
    fireEvent.click(trigger());
    const id = trigger().getAttribute("aria-controls");
    expect(id).toBeTruthy();
    expect(document.getElementById(id as string)).toBeInTheDocument();
  });

  it("shows no disclosure when a group fits under the cap", () => {
    renderDiff();
    expect(screen.queryByRole("button", { name: /Show the other/ })).not.toBeInTheDocument();
  });

  // The unchanged group is collapsed to nothing at rest, so its control names
  // the whole set rather than a remainder.
  it("hides the unchanged rows behind a disclosure that names the whole set", () => {
    renderDiff({ unchanged: [row("same-1"), row("same-2")] });
    expect(screen.queryByText("Card same-1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.unchangedDisclosure("2") }));
    expect(screen.getByText("Card same-1")).toBeInTheDocument();
  });

  // Product's 2026-09-05 ruling. `auto === false` is as true of a previous
  // import's rows as of a hand-add, so a removal the app did not place gets the
  // same sentence and no marker of its own — the group cannot claim the player
  // put a card there when nothing records who did.
  it("says the same thing about a removal the app did not place", () => {
    renderDiff({ out: [row("out-1", { auto: false })] });
    expect(screen.getAllByText(copy.outBody).length).toBeGreaterThan(0);
    expect(screen.queryByText("you added this")).not.toBeInTheDocument();
  });

  it("splits the going-in group by what the player owns", () => {
    renderDiff({ in: [row("in-1", { owned: true }), row("in-2", { owned: false })] });
    expect(screen.getByText(copy.inMeta("1", "1"))).toBeInTheDocument();
  });

  // The floor gives every row one availability slot occupant and never two:
  // the buy tag when the card is unowned, the marker when it is owned, and
  // nothing at all when an owned card has no claims competing for it.
  it("draws the buy tag only on a row that needs buying", () => {
    const buyIn = (owned: boolean) => {
      const { container } = renderDiff({ in: [row("in-1", { owned })] });
      return Array.from(container.querySelectorAll("span")).filter(
        (s) => s.textContent === "buy",
      );
    };
    expect(buyIn(false)).toHaveLength(1);
    expect(buyIn(true)).toHaveLength(0);
  });

  // The slot sits on the name's side of the fixed columns, so a row losing its
  // tag widens the name rather than shifting the line number — the alignment the
  // old reserved-width pill was there to protect. Anchored on the source line
  // since #389 took the per-row type label off the row; it is the only fixed
  // column left.
  it("puts the availability slot before the source line, not after it", () => {
    const { container } = renderDiff({ in: [row("in-1", { owned: false, sourceLine: 4 })] });
    const buy = Array.from(container.querySelectorAll("span")).find(
      (s) => s.textContent === "buy",
    )!;
    const sourceLine = container.querySelector("span[class*='min-w-[54px]']")!;
    expect(buy.compareDocumentPosition(sourceLine)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  // #389, step 4b. The type was on every row when it is a property of a group of
  // them; grouped, it is said once, and the width it held funds the cost track.
  // Both mountings of the row group by type and neither labels a row — if one of
  // them still did, the row would have forked.
  it("heads a group by card type rather than labelling every row", () => {
    renderDiff({ out: [row("out-1", { typeLine: "Artifact" }), row("out-2", { typeLine: "Artifact" })] });
    expect(screen.getAllByText("Artifacts")).toHaveLength(1);
    expect(screen.queryByText("Artifact")).not.toBeInTheDocument();
  });

  it("heads one group per card type, in the decklist's order", () => {
    renderDiff({
      in: [],
      out: [row("out-1", { typeLine: "Island" }), row("out-2", { typeLine: "Creature — Bird" })],
    });
    const headings = Array.from(document.querySelectorAll("span"))
      .map((s) => s.textContent)
      .filter((t) => t === "Creatures" || t === "Lands");
    expect(headings).toEqual(["Creatures", "Lands"]);
  });

  // The rollup was read with `excludeDeckId`, so a removal reaches `free === 0`
  // by having its own claim subtracted and is not competed for at all. An
  // addition is not on the deck yet, so the same figures there are a genuine
  // claim by some other finished deck.
  it("reads free === 0 as self-explained on a removal and hard on an addition", () => {
    const spokenFor = {
      owned: 1,
      hard: 1,
      soft: 0,
      free: 0,
      claims: [{ id: "d2", name: "Atraxa", quantity: 1, mature: true, pending: false, commander: false, senior: true }],
    };
    const namesClaimant = (group: "out" | "in") => {
      const { container } = renderDiff({
        [group]: [row(`${group}-1`, { owned: true, availability: spokenFor })],
      });
      return container.textContent!.includes("Atraxa");
    };
    expect(namesClaimant("out")).toBe(false);
    expect(namesClaimant("in")).toBe(true);
  });

  it("keeps the auto slot's width on a removal the app did not place", () => {
    const { container } = renderDiff({ out: [row("out-1", { auto: false })] });
    const marker = Array.from(container.querySelectorAll("span")).find(
      (s) => s.textContent === "auto",
    );
    expect(marker).toBeDefined();
    expect(marker!.className).toContain("invisible");
  });
});

describe("UpdateDiff card detail", () => {
  // Every other deck surface opens the modal from the card's name; the update
  // flow is its own route, so it mounts its own provider or the rows are dead
  // text on the one screen where the player most needs to reread a card.
  it("opens each named row's card from its name", () => {
    renderDiff({ unchanged: [row("same-1")] });
    fireEvent.click(screen.getByRole("button", { name: copy.unchangedDisclosure("1") }));
    for (const id of ["out-1", "in-1", "same-1"]) {
      expect(
        screen.getByRole("button", { name: cardDetailCopy.triggerAria(`Card ${id}`) }),
      ).toBeInTheDocument();
    }
  });

  // An unmatched line has no oracle id to open — that is what makes it
  // unmatched — so it stays plain text rather than a trigger that cannot fire.
  it("leaves an unnamed line as text", () => {
    renderDiff({ unresolved: [{ rawName: "Sol Rng", sourceLine: 12, quantity: 1 }] });
    // `closest`, not `tagName`: the name could be wrapped in a span inside a
    // trigger and still pass a tag check on the element the query returns.
    expect(screen.getByText("Sol Rng").closest("button")).toBeNull();
  });
});

describe("UpdateDiff state 14", () => {
  // A removal share past three quarters means the paste is probably a different
  // deck. The flow says so and opens the other door — and blocks nothing.
  it("offers the import-as-new exit when the list replaces most of the deck", () => {
    const many = Array.from({ length: 8 }, (_, i) => row(`out-${i}`));
    const { onImportAsNew, onApply } = renderDiff({ built: 10, out: many });
    expect(screen.getByText(copy.wholesaleNote("1", "8"))).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: copy.importAsNew }));
    expect(onImportAsNew).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: copy.applyAria("1", "8", "Kykar, Wind's Fury") }));
    expect(onApply).toHaveBeenCalled();
  });

  // `built` is a copy count, so the share has to be one too. Measured in rows,
  // the deck this note exists for — a list that dropped a whole mana base —
  // counts as a handful of rows and never trips the threshold.
  it("measures the share in copies, so one multi-copy row can trip it", () => {
    renderDiff({ built: 20, out: [row("out-1", { quantity: 16 })] });
    expect(screen.getByRole("button", { name: copy.importAsNew })).toBeInTheDocument();
  });

  // The note is the one sentence about magnitude rather than about the groups,
  // and it says "cards". Counted in rows it would read "1 out" of a deck of
  // twenty — and disagree with the threshold that raised it, which is a share
  // of `built` and so a share of copies.
  it("states the note's figures in copies", () => {
    renderDiff({ built: 20, out: [row("out-1", { quantity: 16 })] });
    expect(screen.getByText(copy.wholesaleNote("1", "16"))).toBeInTheDocument();
  });

  // What the note says is that the list looks like a different deck, which is
  // true of the paste however many rows the player rescues from it.
  it("does not withdraw the note as removals are kept", () => {
    const many = Array.from({ length: 8 }, (_, i) => row(`out-${i}`));
    renderDiff({ built: 10, out: many });
    fireEvent.click(screen.getByRole("button", { name: copy.keepAll("8") }));
    expect(screen.getByRole("button", { name: copy.importAsNew })).toBeInTheDocument();
  });

  it("says nothing about wholesale replacement on an ordinary diff", () => {
    renderDiff();
    expect(screen.queryByRole("button", { name: copy.importAsNew })).not.toBeInTheDocument();
  });

  // Guards the divide in the share test: an empty deck has no share to exceed.
  it("does not call an empty deck a wholesale replacement", () => {
    renderDiff({ built: 0, out: [] });
    expect(screen.queryByRole("button", { name: copy.importAsNew })).not.toBeInTheDocument();
  });
});

describe("UpdateDiff notes", () => {
  it("surfaces a clamped quantity, the one non-fatal note this flow shows", () => {
    renderDiff({
      notes: [{ kind: "quantityClamped", name: "Sol Ring", requested: 4, sourceLine: 12 }],
    });
    expect(screen.getByText(deckImportCopy.notes.quantityClamped(1))).toBeInTheDocument();
  });

  // The line is kept out of the 99, so the deck is a card shorter than the list
  // the player pasted and this note is the only account of where it went.
  it("says a commander line past the second was left out", () => {
    renderDiff({
      notes: [
        { kind: "thirdCommanderDeclared", name: "Ishai, Ojutai Dragonspeaker", sourceLine: 4 },
        { kind: "thirdCommanderDeclared", name: "Tymna the Weaver", sourceLine: 5 },
      ],
    });
    expect(
      screen.getByText(deckImportCopy.notes.thirdCommanderDeclared(2)),
    ).toBeInTheDocument();
  });

  // Sideboard, maybeboard, a commander duplicated into the 99 — all dropped in
  // silence, the rule the shipped import already holds to.
  it("says nothing about the sections the parser drops", () => {
    renderDiff({
      notes: [{ kind: "sectionSkipped", section: "sideboard", lineCount: 15 }],
    });
    expect(screen.queryByText(/sideboard/i)).not.toBeInTheDocument();
  });
});

describe("UpdateDiff provenance", () => {
  it("counts lines read against cards matched, at both widths", () => {
    renderDiff();
    expect(
      screen.getByText(copy.provenance("106", "Kykar, Wind's Fury", "91")),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.provenanceMobile("106", "91"))).toBeInTheDocument();
  });

  it("prints where the deck stands and where it lands", () => {
    renderDiff();
    expect(screen.getByText(copy.landing("91", "90"))).toBeInTheDocument();
  });

  // `built` is a sum of quantities, so the landing figure has to be one too.
  // Counting a twelve-copy removal as one card is how a deck lands at 99 on
  // the screen and at 88 in the database.
  it("counts multi-copy rows in copies, not rows", () => {
    renderDiff({
      built: 91,
      out: [row("out-1", { quantity: 12 })],
      in: [row("in-1", { quantity: 4, sourceLine: 4 })],
      unchanged: [],
    });
    expect(screen.getByText(copy.landing("91", "83"))).toBeInTheDocument();
  });

  // Hugh, 2026-10-15: Plains 6 → 3 beside three cards going in read `3 in, 0 out` over a deck
  // that stayed at 99. A drop is copies out and a rise is copies in, so the figures add up.
  const plains = { ...row("plains", { name: "Plains", typeLine: "Basic Land — Plains", quantity: 3 }), from: 6, to: 3 };
  const goingIn = [row("in-1"), row("in-2"), row("in-3")];

  it("counts a dropped count as copies out, in the chips, the heading and the button", () => {
    renderDiff({ built: 99, out: [], in: goingIn, fewer: [plains] });
    expect(screen.getByText(copy.landing("99", "99"))).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: copy.outHeading("3") })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: copy.inHeading("3") })).toBeInTheDocument();
    expect(screen.getByText(copy.apply("3", "3"))).toBeInTheDocument();
  });

  it("draws the drop in the out group with both figures and the out group's own body", () => {
    renderDiff({ built: 99, out: [], in: goingIn, fewer: [plains] });
    const group = screen.getByRole("heading", { name: copy.outHeading("3") }).parentElement
      ?.parentElement as HTMLElement;
    expect(within(group).getByText(copy.recountedItem("", "6", "3").trim())).toBeInTheDocument();
    expect(within(group).getByText(copy.outBodyFewer)).toBeInTheDocument();
  });

  it("keeps the plain out body when no count drops", () => {
    renderDiff();
    expect(screen.getByText(copy.outBody)).toBeInTheDocument();
    expect(screen.queryByText(copy.outBodyFewer)).toBeNull();
  });

  it("counts a raised count as copies in, drawn in the in group", () => {
    const island = { ...row("island", { name: "Island", typeLine: "Basic Land — Island", quantity: 9 }), from: 7, to: 9 };
    renderDiff({ built: 91, out: [], in: [], more: [island] });
    const group = screen.getByRole("heading", { name: copy.inHeading("2") }).parentElement
      ?.parentElement as HTMLElement;
    expect(within(group).getByText(copy.recountedItem("", "7", "9").trim())).toBeInTheDocument();
    expect(screen.getByText(copy.landing("91", "93"))).toBeInTheDocument();
    expect(screen.getByText(copy.apply("2", "0"))).toBeInTheDocument();
  });

  it("keeping a drop keeps the deck's count, and hands its id to the apply", () => {
    const { onApply } = renderDiff({ built: 99, out: [], in: goingIn, fewer: [plains] });
    fireEvent.click(screen.getByRole("button", { name: copy.keepAria("Plains") }));
    expect(screen.getByText(copy.apply("3", "0"))).toBeInTheDocument();
    expect(screen.getByText(copy.summary("1", "102"))).toBeInTheDocument();
    fireEvent.click(screen.getByText(copy.apply("3", "0")));
    expect(onApply).toHaveBeenCalledWith(["plains"]);
  });

  // Round 2: the heading counts copies, so the disclosure under it counts the copies it hides.
  it("names the hidden copies, not the hidden rows, under a copy-counted heading", () => {
    const drops = ["a", "b", "c", "d", "e"].map((id) => ({
      ...row(id, { name: `Basic ${id}`, typeLine: "Basic Land", quantity: 3 }), from: 6, to: 3,
    }));
    renderDiff({ built: 99, out: [], in: [], fewer: drops });
    expect(screen.getByRole("heading", { name: copy.outHeading("15") })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: copy.showMore("3") })).toBeInTheDocument();
  });

  it("no longer prints the new-counts line", () => {
    const { container } = renderDiff({ fewer: [plains] });
    expect(container.textContent).not.toContain("new counts");
  });

  it("names how many unresolved lines the new list replaces", () => {
    renderDiff({
      unresolved: [{ rawName: "Sol Rng", sourceLine: 12, quantity: 1 }],
      existingUnresolvedCount: 2,
    });
    const group = screen.getByRole("heading", { name: copy.unnamedHeading("1") }).parentElement
      ?.parentElement as HTMLElement;
    expect(within(group).getByText(copy.unnamedBody("2"))).toBeInTheDocument();
  });
});
