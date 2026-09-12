// §Surfaces 2 — the review page. What is asserted here is what the player can
// read off the two columns before the one irreversible click: which cards move,
// which way, by how many copies, and what each one will cost. Nothing on this
// page writes, so there is no handler to spy on.

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { COMMITTED } from "./__fixtures__/draft-state";
import { ReviewChanges } from "./review-changes";

const STATE = COMMITTED;

type Row = Parameters<typeof ReviewChanges>[0]["rows"]["in"][number];

const row = (over: Partial<Row> = {}): Row => ({
  oracleId: "o1", name: "Sol Ring", typeLine: "Artifact", cardTypeGroup: "Artifacts",
  role: "ramp" as const, owned: true, quantity: 1, auto: false,
  printedName: null, printedSetCode: null, printedCollectorNumber: null,
  cmc: 1, direction: "in" as const, from: 0, to: 1, bucket: "free" as const, ...over,
});

describe("ReviewChanges", () => {
  it("groups both columns by card type and heads each with its count", () => {
    render(
      <ReviewChanges
        deckId="d"
        rows={{ in: [row()], out: [row({ oracleId: "o2", name: "Mox", direction: "out", from: 1, to: 0 })] }}
        state={STATE}
      />,
    );
    expect(screen.getByText(deckVersioningCopy.review.groupIn(1))).toBeTruthy();
    expect(screen.getByText(deckVersioningCopy.review.groupOut(1))).toBeTruthy();
    // The type is said once over the rows that share it, never per row — the
    // whole of what dropping the row's own label bought.
    expect(screen.getAllByText("Artifacts")).toHaveLength(2);
    expect(screen.queryByText("Artifact")).toBeNull();
  });

  it("files a quantity move as one row carrying from → to, never a bare name", () => {
    render(
      <ReviewChanges deckId="d" rows={{ in: [row({ from: 1, to: 2 })], out: [] }} state={STATE} />,
    );
    expect(screen.getByText(/1 → 2/)).toBeTruthy();
  });

  // A whole add and a whole cut are what the column heading already says, so a
  // `0 → 1` beside them would restate the column the row is standing in.
  it("says nothing about copies on a card arriving or leaving whole", () => {
    render(<ReviewChanges deckId="d" rows={{ in: [row()], out: [] }} state={STATE} />);
    expect(screen.queryByText(/→/)).toBeNull();
  });

  it("puts the availability word in the accessible name, not only in colour", () => {
    render(
      <ReviewChanges
        deckId="d"
        rows={{ in: [row({ bucket: "unowned" })], out: [] }}
        state={STATE}
      />,
    );
    const describedBy = screen
      .getByRole("button", { name: /Sol Ring/ })
      .getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)?.textContent).toBe(
      deckVersioningCopy.review.chipBuy,
    );
  });

  // A free copy is drawn as nothing — the availability marker returns null at
  // `free` on every surface in the app — so there is no colour for a word to be
  // the alternative to.
  it("describes nothing on a row the player already has a free copy of", () => {
    render(<ReviewChanges deckId="d" rows={{ in: [row()], out: [] }} state={STATE} />);
    expect(
      screen.getByRole("button", { name: /Sol Ring/ }).getAttribute("aria-describedby"),
    ).toBeNull();
  });

  it("states the out column's rule once, and offers no per-row toggle", () => {
    render(
      <ReviewChanges
        deckId="d"
        rows={{ in: [], out: [row({ direction: "out", from: 1, to: 0 })] }}
        state={STATE}
      />,
    );
    expect(screen.getByText(deckVersioningCopy.review.outNote(1))).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Keep/ })).toBeNull();
  });

  // The lede names the version the player is about to cut, not the one they are
  // standing on: the whole page exists to be read before that number exists.
  it("heads the page with the version behind it and the version ahead", () => {
    render(<ReviewChanges deckId="d" rows={{ in: [row()], out: [] }} state={STATE} />);
    expect(screen.getByText(deckVersioningCopy.review.heading(1, 1))).toBeTruthy();
    expect(screen.getByText(deckVersioningCopy.review.lede(2))).toBeTruthy();
  });

  // One column is nothing to switch between, so the phone control is absent —
  // and its absence is what keeps the desktop columns from being drawn twice.
  it("offers the phone segments only when both columns have rows", () => {
    // The segment carries its figure, so it is named "1 in" rather than "in" —
    // the count is the reason the control is worth reading before it is tapped.
    const segment = new RegExp(`${deckVersioningCopy.review.chipIn}$`);
    const { unmount } = render(
      <ReviewChanges deckId="d" rows={{ in: [row()], out: [] }} state={STATE} />,
    );
    expect(screen.queryByRole("button", { name: segment })).toBeNull();
    unmount();
    render(
      <ReviewChanges
        deckId="d"
        rows={{ in: [row()], out: [row({ oracleId: "o2", name: "Mox", direction: "out", from: 1, to: 0 })] }}
        state={STATE}
      />,
    );
    expect(screen.getByRole("button", { name: segment })).toBeTruthy();
  });
});
