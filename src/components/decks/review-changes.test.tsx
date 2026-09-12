// §Surfaces 2 — the review page. What is asserted here is what the player can
// read off the two columns before the one irreversible click: which cards move,
// which way, by how many copies, and what each one will cost. The page's one
// write is the pull, and `pull-control.test.tsx` owns what that control does —
// asserted here is only which rows are given one.

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { Availability } from "../../lib/decks/availability";
import { COMMITTED } from "./__fixtures__/draft-state";
import { ReviewChanges } from "./review-changes";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const STATE = COMMITTED;

type Row = Parameters<typeof ReviewChanges>[0]["rows"]["in"][number];

const row = (over: Partial<Row> = {}): Row => ({
  oracleId: "o1", name: "Sol Ring", typeLine: "Artifact", cardTypeGroup: "Artifacts",
  role: "ramp" as const, owned: true, quantity: 1, auto: false,
  printedName: null, printedSetCode: null, printedCollectorNumber: null,
  cmc: 1, direction: "in" as const, from: 0, to: 1, bucket: "free" as const, ...over,
});

/** A card sleeved in one other deck. The flags are the guards `pullCandidate`
 *  reads: a mature, unpending, non-commander claim is the releasable one. */
const claimed = (over: Partial<Availability["claims"][number]> = {}): Availability =>
  ({
    free: 0,
    claims: [
      {
        id: "holder",
        name: "Kykar",
        quantity: 1,
        mature: true,
        pending: false,
        commander: false,
        ...over,
      },
    ],
  }) as unknown as Availability;

describe("ReviewChanges", () => {
  it("groups both columns by card type and heads each with its count", () => {
    render(
      <ReviewChanges
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row()], out: [row({ oracleId: "o2", name: "Mox", direction: "out", from: 1, to: 0 })] }}
        state={STATE}
      />,
    );
    // Twice each, and one markup: the phone segment and the desktop direction
    // header carry the same string at the two widths.
    expect(screen.getAllByText(deckVersioningCopy.review.groupIn(1))).toHaveLength(2);
    expect(screen.getAllByText(deckVersioningCopy.review.groupOut(1))).toHaveLength(2);
    // The type is said once over the rows that share it, never per row — the
    // whole of what dropping the row's own label bought.
    expect(screen.getAllByText("Artifacts")).toHaveLength(2);
    expect(screen.queryByText("Artifact")).toBeNull();
  });

  it("files a quantity move as one row carrying from → to, never a bare name", () => {
    render(
      <ReviewChanges deckId="d" deckName="Korvold" rows={{ in: [row({ from: 1, to: 2 })], out: [] }} state={STATE} />,
    );
    expect(screen.getByText(/1 → 2/)).toBeTruthy();
  });

  // A whole add and a whole cut are what the column heading already says, so a
  // `0 → 1` beside them would restate the column the row is standing in.
  it("says nothing about copies on a card arriving or leaving whole", () => {
    render(<ReviewChanges deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }} state={STATE} />);
    expect(screen.queryByText(/\d+ → \d+/)).toBeNull();
  });

  it("puts the availability word in the accessible name, not only in colour", () => {
    render(
      <ReviewChanges
        deckId="d"
        deckName="Korvold"
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
    render(<ReviewChanges deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }} state={STATE} />);
    expect(
      screen.getByRole("button", { name: /Sol Ring/ }).getAttribute("aria-describedby"),
    ).toBeNull();
  });

  it("states the out column's rule once, and offers no per-row toggle", () => {
    render(
      <ReviewChanges
        deckId="d"
        deckName="Korvold"
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
    render(<ReviewChanges deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }} state={STATE} />);
    expect(screen.getByText(deckVersioningCopy.review.heading(1, 1))).toBeTruthy();
    expect(screen.getByText(deckVersioningCopy.review.lede(2))).toBeTruthy();
  });

  // The offer belongs to the adds: a pull answers "where does this copy come
  // from", and a card leaving the deck is not being sought for it.
  it("offers a pull on a sleeved add and on no removal", () => {
    render(
      <ReviewChanges
        deckId="d"
        deckName="Korvold"
        rows={{
          in: [row({ bucket: "claimed", availability: claimed() })],
          out: [
            row({
              oracleId: "o2", name: "Mox", direction: "out", from: 1, to: 0,
              bucket: "claimed", availability: claimed(),
            }),
          ],
        }}
        state={STATE}
      />,
    );
    expect(screen.getAllByRole("button", { name: deckVersioningCopy.review.pull })).toHaveLength(1);
  });

  // A card nobody has sleeved has no holder to pull from, and a free copy needs
  // nothing pulled — in both cases the buy tag or nothing is the whole row.
  it("offers no pull on a row with no sleeved holder", () => {
    render(
      <ReviewChanges
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row(), row({ oracleId: "o2", name: "Mox", bucket: "unowned" })], out: [] }}
        state={STATE}
      />,
    );
    expect(screen.queryByRole("button", { name: deckVersioningCopy.review.pull })).toBeNull();
  });

  // The guards are the server's, so the row says which obstacle it hit rather
  // than drawing a control that can only fail. `pull-control.test.tsx` covers
  // both arms; this is the wiring — the row reads the claim's flags at all.
  it("draws the guard rather than the offer on a commander's copy", () => {
    render(
      <ReviewChanges
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row({ bucket: "claimed", availability: claimed({ commander: true }) })], out: [] }}
        state={STATE}
      />,
    );
    expect(screen.queryByRole("button", { name: deckVersioningCopy.review.pull })).toBeNull();
    expect(
      screen.getByText(deckVersioningCopy.review.commanderGuardA11y("Kykar", "Sol Ring")),
    ).toBeTruthy();
  });

  // One column is nothing to switch between, so the phone control is absent —
  // and its absence is what keeps the desktop columns from being drawn twice.
  it("offers the phone segments only when both columns have rows", () => {
    // The segment is labelled by the column heading itself, figure and all, so
    // the page has one name for a direction rather than a chip's and a
    // heading's.
    const segment = deckVersioningCopy.review.groupIn(1);
    const { unmount } = render(
      <ReviewChanges deckId="d" deckName="Korvold" rows={{ in: [row()], out: [] }} state={STATE} />,
    );
    expect(screen.queryByRole("button", { name: segment })).toBeNull();
    unmount();
    render(
      <ReviewChanges
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row()], out: [row({ oracleId: "o2", name: "Mox", direction: "out", from: 1, to: 0 })] }}
        state={STATE}
      />,
    );
    expect(screen.getByRole("button", { name: segment })).toBeTruthy();
  });

  // The one way off this page that is neither a commit nor a discard, and it
  // names the deck: a bare "Back" would ask the reader to remember which deck
  // they were editing to know where it goes.
  it("links back to the deck by name", () => {
    render(
      <ReviewChanges deckId="d7" deckName="Korvold" rows={{ in: [row()], out: [] }} state={STATE} />,
    );
    const back = screen.getByRole("link", { name: /Korvold/ });
    expect(back.getAttribute("href")).toBe("/decks/d7");
  });

  // Every chip is counted off the state rather than off the rows beside it — the
  // banner, this strip and the commit sheet's buy block are one purchase with
  // three appearances — and the purchase rides on the to-buy chip because a
  // count of copies and what those copies cost are one fact.
  it("chips the purchase with its total, and draws no chip for a nought", () => {
    render(
      <ReviewChanges
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row()], out: [] }}
        state={{ ...STATE, buyCount: 3, total: "$28.40", pullableCount: 0 }}
      />,
    );
    expect(screen.getByText(deckVersioningCopy.review.chipBuy)).toBeTruthy();
    expect(screen.getByText("3")).toBeTruthy();
    expect(screen.getByText("$28.40")).toBeTruthy();
    // No pull is on the table, so the chip standing for one is absent rather
    // than drawn at zero.
    expect(screen.queryByText(deckVersioningCopy.review.chipPullable)).toBeNull();
    // Nor is the out chip, with no column behind it.
    expect(screen.queryByText(deckVersioningCopy.review.chipOut)).toBeNull();
  });

  // The pair goes inside the row the card is already named on. A caption under
  // the row printed the name a second time, which is the one thing the row it
  // hangs off has never failed to say.
  it("carries the recount inside the row without naming the card twice", () => {
    render(
      <ReviewChanges
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row({ from: 3, to: 1 })], out: [] }}
        state={STATE}
      />,
    );
    expect(screen.getByText(/3 → 1/)).toBeTruthy();
    expect(screen.queryByText(/Sol Ring 3 → 1/)).toBeNull();
  });

  // Desktop only: at 390px the segmented pair is the direction, and the lede
  // describes pulls the reader can see on the list below it.
  it("heads each column with its direction and its breakdown", () => {
    render(
      <ReviewChanges
        deckId="d"
        deckName="Korvold"
        rows={{ in: [row()], out: [] }}
        state={STATE}
      />,
    );
    expect(
      screen.getByText(deckVersioningCopy.review.groupInBreakdown(0, 0, 0)),
    ).toBeTruthy();
  });
});
