import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DraftState } from "../../lib/decks/draft-shape";
import { COMMIT_RECEIPT_HASH, DISCARD_RECEIPT_HASH, DRAFT_ANNOUNCER_ID } from "./draft-announcer";
import { PendingBanner } from "./pending-banner";

afterEach(() => {
  // Lives outside React's tree, so `cleanup` does not take it: an announcement
  // left behind would be read as the next test's.
  document.getElementById(DRAFT_ANNOUNCER_ID)?.remove();
});

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
  pricedCopies: adds,
});

describe("PendingBanner", () => {
  it("draws the version line on a clean committed deck", () => {
    render(<PendingBanner state={empty} />);
    expect(screen.getByText(copy.versionLine(2, "1 Sep 2026"))).toBeTruthy();
  });

  // A draft with changes is the to-do card's pending row now (`PendingRow`), and a
  // version line over it would say the deck matches a version it does not.
  it.each([[3, 0], [0, 1]])("gives way to the to-do card's row over a draft (+%i / −%i)", (a, r) => {
    const { container } = render(<PendingBanner state={withChanges(a, r)} />);
    expect(container.firstChild).toBeNull();
  });

  // A commit navigates, and a navigation leaves focus on the body. The version
  // line is the answer the reader came back for, so the commit sheet hands the
  // page a hash and the line takes focus off it.
  it("takes focus on the version line when a commit lands it here", () => {
    history.replaceState(null, "", `/decks/d${COMMIT_RECEIPT_HASH}`);
    render(<PendingBanner state={empty} />);
    expect(document.activeElement).toBe(screen.getByText(copy.versionLine(2, "1 Sep 2026")));
    // And the hash goes, so a reload or a back-forward return does not re-fire a
    // receipt for a commit minutes old.
    expect(window.location.hash).toBe("");
  });

  // A discard made from the review page navigates for the same reason and after
  // the more destructive of the two acts, so it lands on the same line.
  it("takes focus on the version line when a discard lands it here", () => {
    history.replaceState(null, "", `/decks/d${DISCARD_RECEIPT_HASH}`);
    render(<PendingBanner state={empty} />);
    expect(document.activeElement).toBe(screen.getByText(copy.versionLine(2, "1 Sep 2026")));
    expect(window.location.hash).toBe("");
  });

  it("leaves focus alone on a version line nobody just committed", () => {
    history.replaceState(null, "", "/decks/d");
    render(<PendingBanner state={empty} />);
    expect(document.activeElement).toBe(document.body);
  });

  // `Commit as v1` is drawn in the header beside `Export`, so a deck with no
  // version leaves this strip with nothing to say.
  it("says nothing at all on a versionless deck", () => {
    const { container } = render(<PendingBanner state={{ ...empty, version: null }} />);
    expect(container.firstChild).toBeNull();
  });
});
