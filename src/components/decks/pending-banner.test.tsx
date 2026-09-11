import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DraftState } from "../../lib/decks/draft-shape";
import { PendingBanner } from "./pending-banner";

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
});

describe("PendingBanner", () => {
  it("is absent on a clean committed deck — the version line is all that remains", () => {
    render(<PendingBanner state={empty} deckId="d" total={99} bodySize={99} />);
    expect(screen.queryByText(deckVersioningCopy.pending.label)).toBeNull();
    expect(
      screen.getByText(deckVersioningCopy.pending.versionLine(2, "1 Sep 2026")),
    ).toBeTruthy();
  });

  it("names the changes at or below INLINE_CHANGE_MAX and links to the review page", () => {
    render(<PendingBanner state={withChanges(2, 1)} deckId="d" total={99} bodySize={99} />);
    // Substring, because the sign and the remove hint share the line's element.
    expect(screen.getByText("Add 0", { exact: false })).toBeTruthy();
    expect(screen.getByText("Cut 0", { exact: false })).toBeTruthy();
    // A link, not a button: the sheet is on the review page and the banner
    // navigates to it with `?commit=1`. One commit surface, two entry points.
    expect(
      screen.getByRole("link", { name: deckVersioningCopy.pending.commitCta(3) }),
    ).toHaveProperty("href", expect.stringContaining("/decks/d/changes?commit=1"));
    expect(
      screen.getByRole("link", { name: deckVersioningCopy.pending.reviewLink }),
    ).toBeTruthy();
  });

  it("states counts and one money sentence above INLINE_CHANGE_MAX", () => {
    render(<PendingBanner state={withChanges(19, 17)} deckId="d" total={99} bodySize={99} />);
    expect(screen.queryByText("Add 0", { exact: false })).toBeNull();
    expect(
      screen.getByText(deckVersioningCopy.pending.counts(19, 17), { exact: false }),
    ).toBeTruthy();
    expect(
      screen.getByText(deckVersioningCopy.pending.money(19, 19, 19, "$12.00"), { exact: false }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: deckVersioningCopy.pending.reviewCta(36) }),
    ).toBeTruthy();
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
        total={99}
        bodySize={99}
      />,
    );
    expect(screen.queryByText(deckVersioningCopy.pending.moneyNone)).toBeNull();
    // The change account itself is not in doubt, so it is still stated.
    expect(
      screen.getByText(deckVersioningCopy.pending.counts(19, 17), { exact: false }),
    ).toBeTruthy();
  });

  // Unfree rows with no price is a purchase with no figure. The review page one
  // click away names the rows; the banner says neither sentence.
  it("draws no money sentence when rows are unfree and nothing could be priced", () => {
    render(
      <PendingBanner
        state={{ ...withChanges(19, 17), total: null }}
        deckId="d" total={99} bodySize={99}
      />,
    );
    expect(screen.queryByText(deckVersioningCopy.pending.moneyNone)).toBeNull();
  });

  it("says the commit asks for nothing only on a real zero", () => {
    render(
      <PendingBanner
        state={{ ...withChanges(19, 17), unfreeCount: 0, buyCount: 0, total: null }}
        deckId="d" total={99} bodySize={99}
      />,
    );
    expect(screen.getByText(deckVersioningCopy.pending.moneyNone, { exact: false })).toBeTruthy();
  });

  it("offers Commit as v1 on a versionless deck that has reached a full body", () => {
    render(
      <PendingBanner state={{ ...empty, version: null }} deckId="d" total={99} bodySize={99} />,
    );
    expect(
      screen.getByRole("link", { name: deckVersioningCopy.pending.firstCommitCta }),
    ).toBeTruthy();
  });

  it("says nothing at all on a versionless deck that is still short", () => {
    const { container } = render(
      <PendingBanner state={{ ...empty, version: null }} deckId="d" total={41} bodySize={99} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("prints the body count in --warning when the draft is over, and blocks nothing", () => {
    render(<PendingBanner state={withChanges(3, 0)} deckId="d" total={101} bodySize={99} />);
    expect(screen.getByText("101 / 99")).toBeTruthy();
    // Still offered, and still a live link: an over-size draft is something the
    // player is mid-way through fixing, and refusing the commit strands them.
    expect(
      screen.getByRole("link", { name: deckVersioningCopy.pending.commitCta(3) }),
    ).toBeTruthy();
  });

  it("prints the from → to pair on a quantity move, not a bare name", () => {
    const state = withChanges(1, 0);
    state.addChanges[0] = { oracleId: "a0", from: 1, to: 2 };
    render(<PendingBanner state={state} deckId="d" total={99} bodySize={99} />);
    expect(
      screen.getByText(deckImportCopy.update.diff.recountedItem("Add 0", "1", "2"), {
        exact: false,
      }),
    ).toBeTruthy();
  });

  it("still offers the commit on a basics-only draft, which no list can name", () => {
    render(
      <PendingBanner
        state={{ ...empty, basicsChanged: true }}
        deckId="d"
        total={99}
        bodySize={99}
      />,
    );
    expect(screen.getByText(deckVersioningCopy.pending.label)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: deckVersioningCopy.pending.commitCta(3) }),
    ).toBeTruthy();
  });
});
