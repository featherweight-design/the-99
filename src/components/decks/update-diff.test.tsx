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
    in: [row("in-1", { sourceLine: 4 })],
    unchanged: [row("same-1")],
    unchangedDelta: 0,
    unresolved: [],
    noChange: false,
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

  // An owned row dropped the buy pill entirely, so its type line sat where
  // an unowned row's did not. The slot is reserved rather than removed.
  it("keeps the buy slot's width on a row that needs no buying", () => {
    const { container } = renderDiff({ in: [row("in-1", { owned: true })] });
    const buy = Array.from(container.querySelectorAll("span")).find(
      (s) => s.textContent === "buy",
    );
    expect(buy).toBeDefined();
    expect(buy!.className).toContain("invisible");
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
    expect(screen.getByText("Sol Rng").tagName).not.toBe("BUTTON");
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
      unchangedDelta: 0,
    });
    expect(screen.getByText(copy.landing("91", "83"))).toBeInTheDocument();
  });

  // A quantity the diff reconciles without naming still moves the deck, and the
  // figure compared to 99 is the one place that has to admit it.
  it("carries the silently reconciled quantities into the landing figure", () => {
    renderDiff({ built: 91, out: [], in: [], unchangedDelta: -3 });
    expect(screen.getByText(copy.landing("91", "88"))).toBeInTheDocument();
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
