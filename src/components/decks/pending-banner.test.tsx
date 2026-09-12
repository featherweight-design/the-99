import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { priceCopy } from "../../lib/copy/price";
import type { DraftState } from "../../lib/decks/draft-shape";
import { PendingBanner } from "./pending-banner";

const copy = deckVersioningCopy.pending;

const empty: DraftState = {
  // Every field of `DeckVersion`, not only the four the banner prints: the
  // fixture is typed, so a partial literal does not compile.
  version: {
    id: "v",
    number: 2,
    committedAt: new Date("2026-09-01T00:00:00Z"),
    note: null,
    commanderOracleId: "cmd",
    partnerOracleId: null,
    commanderSince: new Date("2026-08-01T00:00:00Z"),
    partnerSince: null,
  },
  adds: [],
  addChanges: [],
  removes: [],
  basicsChanged: false,
  names: new Map(),
  costs: new Map(),
  prices: new Map(),
  pullFrom: new Map(),
  claimsKnown: true,
  buyCount: 0,
  unfreeCount: 0,
  pullableCount: 0,
  total: null,
  pricedCopies: 0,
  newestAsOf: null,
  manaValue: 3.1,
  manaValueBefore: 3.4,
};

const withChanges = (adds: number, removes: number): DraftState => ({
  ...empty,
  adds: Array.from({ length: adds }, (_, i) => ({
    oracleId: `a${i}`,
    needed: 1,
    shortfall: 1,
    bucket: "unowned" as const,
    heldBy: [],
  })),
  addChanges: Array.from({ length: adds }, (_, i) => ({
    oracleId: `a${i}`,
    from: 0,
    to: 1,
  })),
  removes: Array.from({ length: removes }, (_, i) => ({
    oracleId: `r${i}`,
    from: 1,
    to: 0,
  })),
  names: new Map([
    ...Array.from({ length: adds }, (_, i) => [`a${i}`, `Add ${i}`] as const),
    ...Array.from({ length: removes }, (_, i) => [`r${i}`, `Cut ${i}`] as const),
  ]),
  costs: new Map([
    ...Array.from({ length: adds }, (_, i) => [`a${i}`, "{2}{U}"] as const),
    ...Array.from({ length: removes }, (_, i) => [`r${i}`, "{1}{B}"] as const),
  ]),
  prices: new Map(
    Array.from({ length: adds }, (_, i) => [`a${i}`, "$4.00"] as const),
  ),
  buyCount: adds,
  unfreeCount: adds,
  pullableCount: 0,
  total: adds > 0 ? "$12.00" : null,
  // Fully covered, so the money line prints the figure alone. Left at 0 beside a
  // real total this would describe partial coverage and draw the `pricedClause`
  // no assertion below carries.
  pricedCopies: adds,
});

describe("PendingBanner", () => {
  it("is absent on a clean committed deck — the version line is all that remains", () => {
    render(<PendingBanner state={empty} deckId="d" />);
    expect(screen.queryByText(copy.label)).toBeNull();
    expect(screen.getByText(copy.versionLine(2, "1 Sep 2026"))).toBeTruthy();
  });

  it("names the changes at or below INLINE_CHANGE_MAX and links to the review page", () => {
    render(<PendingBanner state={withChanges(2, 1)} deckId="d" />);
    expect(screen.getByText("Add 0")).toBeTruthy();
    expect(screen.getByText("Cut 0")).toBeTruthy();
    // A link, not a button: the sheet is on the review page and the banner
    // navigates to it with `?commit=1`. One commit surface, two entry points.
    expect(screen.getByRole("link", { name: copy.commitCta(3) })).toHaveProperty(
      "href",
      expect.stringContaining("/decks/d/changes?commit=1"),
    );
    expect(screen.getByRole("link", { name: copy.reviewLink })).toBeTruthy();
  });

  // Same box, same label, same counts at both densities — the names replace the
  // money sentence, not the account of how many changes there are.
  it("states the counts at or below INLINE_CHANGE_MAX as well", () => {
    render(<PendingBanner state={withChanges(2, 1)} deckId="d" />);
    // Two runs, not one: each side carries its own colour, so each is its own
    // element and the joined string never appears in the document.
    expect(screen.getByText(copy.counts(2, 0))).toBeTruthy();
    expect(screen.getByText(copy.counts(0, 1))).toBeTruthy();
  });

  it("draws the holding deck and the price on an add, and neither on a remove", () => {
    const state = withChanges(1, 1);
    state.adds[0] = {
      ...state.adds[0],
      bucket: "claimed",
      heldBy: [{ id: "d2", name: "Kess Storm" }],
    };
    // The hint reads `pullFrom`, not `heldBy` — a holder a pull is refused from
    // is in the latter and never the former.
    state.pullFrom = new Map([["a0", "Kess Storm"]]);
    render(<PendingBanner state={state} deckId="d" />);
    expect(screen.getByText(copy.addPullHint("Kess Storm"))).toBeTruthy();
    // One tile, on the add: a remove is a copy going back in the pool and has
    // nothing to buy.
    expect(screen.getAllByText("$4.00")).toHaveLength(1);
    expect(screen.getByText(copy.removeHint)).toBeTruthy();
  });

  // A deck with pending changes of its own, or holding the card as its commander,
  // is a mature claimant the server refuses a pull from. Naming it in the hint
  // offers an act that fails, so an empty `pullFrom` draws no hint at all.
  it("offers no pull when the holder is not releasable", () => {
    const state = withChanges(1, 0);
    state.adds[0] = {
      ...state.adds[0],
      bucket: "claimed",
      heldBy: [{ id: "d2", name: "Kess Storm" }],
    };
    render(<PendingBanner state={state} deckId="d" />);
    expect(screen.queryByText(copy.addPullHint("Kess Storm"))).toBeNull();
  });

  it("states counts and one money sentence above INLINE_CHANGE_MAX", () => {
    const { container } = render(
      <PendingBanner state={withChanges(19, 17)} deckId="d" />,
    );
    expect(screen.queryByText("Add 0")).toBeNull();
    expect(screen.getByText(copy.counts(19, 0))).toBeTruthy();
    expect(screen.getByText(copy.counts(0, 17))).toBeTruthy();
    expect(screen.getByText(copy.since(36, 2))).toBeTruthy();
    // The figure is a mono run inside the sentence, so the assertion is on the
    // whole rendered sentence rather than one element's own text.
    expect(container.textContent).toContain(copy.money(19, 19, 19, "$12.00"));
    expect(screen.getByRole("link", { name: copy.reviewCta(36) })).toBeTruthy();
  });

  // A long draft is the one most expensive to leave uncommitted, so the commit
  // is offered at both densities — demoted to a secondary, never withdrawn.
  it("still offers the commit above INLINE_CHANGE_MAX", () => {
    render(<PendingBanner state={withChanges(19, 17)} deckId="d" />);
    expect(screen.getByRole("link", { name: copy.commitCta(3) })).toHaveProperty(
      "href",
      expect.stringContaining("/decks/d/changes?commit=1"),
    );
  });

  // The free-copy sentence is a claim about the claim model. A read that failed
  // knows nothing about free copies, and saying "this commit asks for nothing"
  // over a purchase the player will actually be charged for is the one lie this
  // banner must not tell.
  it("draws no money sentence when the claims could not be read", () => {
    render(
      <PendingBanner
        state={{
          ...withChanges(19, 17),
          claimsKnown: false, unfreeCount: 0, buyCount: 0, total: null,
        }}
        deckId="d"
      />,
    );
    expect(screen.queryByText(copy.moneyNone)).toBeNull();
    // The change account itself is not in doubt, so it is still stated.
    expect(screen.getByText(copy.counts(19, 0))).toBeTruthy();
  });

  // Unfree rows with no price is a purchase with no figure. The review page one
  // click away names the rows; the banner says neither sentence.
  it("draws no money sentence when rows are unfree and nothing could be priced", () => {
    render(
      <PendingBanner
        state={{ ...withChanges(19, 17), total: null }}
        deckId="d"
      />,
    );
    expect(screen.queryByText(copy.moneyNone)).toBeNull();
  });

  // $12.00 over four of nineteen copies is a real figure and not the purchase.
  // Stated bare it reads as the whole bill, so the coverage travels with it.
  it("names the coverage when only some copies could be priced", () => {
    render(
      <PendingBanner
        state={{ ...withChanges(19, 17), pricedCopies: 4 }}
        deckId="d"
      />,
    );
    expect(
      screen.getByText(priceCopy.strip.pricedClause(4, 19), { exact: false }),
    ).toBeTruthy();
  });

  // $0.00 is a price the feed gave, not the absence of one, so it prints as a
  // figure rather than falling through to the no-figure branch. The reader is the
  // reason: a card stocked at nothing is still a card to obtain.
  it("prints a real $0.00 total rather than withholding the figure", () => {
    const { container } = render(
      <PendingBanner
        state={{ ...withChanges(19, 17), total: "$0.00" }}
        deckId="d"
      />,
    );
    expect(container.textContent).toContain(copy.money(19, 19, 19, "$0.00"));
    expect(screen.queryByText(copy.moneyNone)).toBeNull();
  });

  it("says the commit asks for nothing only on a real zero", () => {
    render(
      <PendingBanner
        state={{ ...withChanges(19, 17), unfreeCount: 0, buyCount: 0, total: null }}
        deckId="d"
      />,
    );
    expect(screen.getByText(copy.moneyNone, { exact: false })).toBeTruthy();
  });

  // `Commit as v1` is drawn in the spine beside `Export`, so a deck with no
  // version leaves this banner with nothing to say.
  it("says nothing at all on a versionless deck", () => {
    const { container } = render(
      <PendingBanner state={{ ...empty, version: null }} deckId="d" />,
    );
    expect(container.firstChild).toBeNull();
  });

  // The body count is the hero's figure (states A6/A7): the banner reads no card
  // count of its own, and blocks nothing when the draft is over size.
  it("states no body count of its own, and blocks nothing when the draft is over", () => {
    render(<PendingBanner state={withChanges(3, 0)} deckId="d" />);
    expect(screen.getByRole("link", { name: copy.commitCta(3) })).toBeTruthy();
  });

  it("prints the from → to pair on a quantity move, not a bare name", () => {
    const state = withChanges(1, 0);
    state.addChanges[0] = { oracleId: "a0", from: 1, to: 2 };
    render(<PendingBanner state={state} deckId="d" />);
    expect(
      screen.getByText(deckImportCopy.update.diff.recountedItem("Add 0", "1", "2")),
    ).toBeTruthy();
  });

  it("still offers the commit on a basics-only draft, which no list can name", () => {
    render(
      <PendingBanner
        state={{ ...empty, basicsChanged: true }}
        deckId="d"
      />,
    );
    expect(screen.getByText(copy.label)).toBeTruthy();
    expect(screen.getByRole("link", { name: copy.commitCta(3) })).toBeTruthy();
  });
});
