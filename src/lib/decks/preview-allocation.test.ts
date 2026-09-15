import { describe, it, expect } from "vitest";
import { previewAllocation } from "./preview-allocation";
import type { ContestedClaimant } from "../collection/summary-read";

const AUG = Date.parse("2026-08-01T00:00:00Z");
const SEP = Date.parse("2026-09-01T00:00:00Z");
const OCT = Date.parse("2026-10-01T00:00:00Z");

function claimant(over: Partial<ContestedClaimant> & { deckId: string }): ContestedClaimant {
  return {
    deckName: over.deckId,
    quantity: 1,
    commanderCopies: 0,
    granted: 0,
    since: AUG,
    versionNumber: 1,
    allocated: 0,
    ...over,
  };
}

const allocOf = (rows: ContestedClaimant[]) =>
  Object.fromEntries(rows.map((r) => [r.deckId, r.allocated]));

describe("previewAllocation", () => {
  it("moves the copy to the deck just picked, and off the one that held it", () => {
    // The whole bug: the picked deck went accent while the previous holder stayed filled until
    // the server answered, so both marks read full for the length of a round trip.
    const rows = previewAllocation(
      [claimant({ deckId: "senior", since: AUG }), claimant({ deckId: "junior", since: SEP })],
      1,
      "junior",
    );
    expect(allocOf(rows)).toEqual({ senior: 0, junior: 1 });
  });

  it("gives the copy back to the senior deck when the pick is cleared", () => {
    const rows = previewAllocation(
      [claimant({ deckId: "senior", since: AUG }), claimant({ deckId: "junior", since: SEP })],
      1,
      null,
    );
    expect(allocOf(rows)).toEqual({ senior: 1, junior: 0 });
  });

  it("takes the displaced copy from the most junior holder, not the first drawn", () => {
    // Commit order is what the row draws; `since` is what the server allocates on. A fixture
    // whose two orders agree cannot tell the difference, so this one reverses them.
    const rows = previewAllocation(
      [
        claimant({ deckId: "drawn-first", since: OCT }),
        claimant({ deckId: "drawn-second", since: AUG }),
        claimant({ deckId: "picked", since: SEP }),
      ],
      2,
      "picked",
    );
    expect(allocOf(rows)).toEqual({ "drawn-first": 0, "drawn-second": 1, picked: 1 });
  });

  it("never moves a commander's copy, and never counts it against the supply in play", () => {
    // `inPlay` already excludes commander copies, so the commander keeps its own and the one
    // movable copy still goes to the pick.
    const rows = previewAllocation(
      [
        claimant({ deckId: "commander", quantity: 1, commanderCopies: 1, since: AUG }),
        claimant({ deckId: "list", since: SEP }),
      ],
      1,
      "list",
    );
    expect(allocOf(rows)).toEqual({ commander: 1, list: 1 });
  });

  it("gives a folded claimant its commander copy and lets the spare be taken away", () => {
    const rows = previewAllocation(
      [
        claimant({ deckId: "folded", quantity: 2, commanderCopies: 1, since: AUG }),
        claimant({ deckId: "other", since: SEP }),
      ],
      1,
      "other",
    );
    expect(allocOf(rows)).toEqual({ folded: 1, other: 1 });
  });

  it("never allocates more copies than are in play", () => {
    const rows = previewAllocation(
      [
        claimant({ deckId: "a", quantity: 2, since: AUG }),
        claimant({ deckId: "b", quantity: 2, since: SEP }),
      ],
      3,
      "b",
    );
    expect(rows.reduce((n, r) => n + r.allocated, 0)).toBe(3);
    expect(allocOf(rows)).toEqual({ a: 2, b: 1 });
  });

  it("never gives a deck more than it asked for", () => {
    const rows = previewAllocation([claimant({ deckId: "only", quantity: 1 })], 4, "only");
    expect(allocOf(rows)).toEqual({ only: 1 });
  });

  it("puts a deck that has not sleeved the card behind every deck that has", () => {
    const rows = previewAllocation(
      [claimant({ deckId: "unsleeved", since: null }), claimant({ deckId: "sleeved", since: OCT })],
      1,
      null,
    );
    expect(allocOf(rows)).toEqual({ unsleeved: 0, sleeved: 1 });
  });

  it("breaks a tie on deck id, the same tuple the claim query orders on", () => {
    const rows = previewAllocation(
      [claimant({ deckId: "b", since: AUG }), claimant({ deckId: "a", since: AUG })],
      1,
      null,
    );
    expect(allocOf(rows)).toEqual({ a: 1, b: 0 });
  });
});
