// The Hidden row's rules: where Unhide says it went (READINESS Y3), where the row opens, and its date (Y11).
import { describe, expect, it } from "vitest";
import { hiddenDay, hiddenLane, hiddenRowHref } from "./hidden-row";
import { hiddenListCopy } from "../copy/commanders-hidden";

const base = { built: false, owned: false, legal: true, candidate: true, ranked: false };

describe("hiddenLane", () => {
  it("puts an owned commander back in For you and an unowned one in Discover", () => {
    expect(hiddenLane({ ...base, owned: true, ranked: true })).toBe("foryou");
    expect(hiddenLane(base)).toBe("discover");
  });

  // Neither list would show it, so naming one would be false.
  it("names no list for a built commander, one no longer legal, or an unowned one the index lacks", () => {
    expect(hiddenLane({ ...base, owned: true, ranked: true, built: true })).toBeNull();
    expect(hiddenLane({ ...base, built: true })).toBeNull();
    expect(hiddenLane({ ...base, owned: true, ranked: true, legal: false })).toBeNull();
    expect(hiddenLane({ ...base, candidate: false })).toBeNull();
  });

  // For you draws its rankable stored scores, not every owned legal unbuilt card: one it has not ranked (no stored
  // score, or a set being recomputed) is in neither list, and an index row does not make an owned one a Discover row.
  it("names no list for an owned commander For you has not ranked", () => {
    expect(hiddenLane({ ...base, owned: true, ranked: false })).toBeNull();
    expect(hiddenLane({ ...base, owned: true, ranked: false, candidate: true })).toBeNull();
  });

  // Discover's default order is the fit ranking, which excludes no candidate: the novelty floor is the `new` order's.
  it("puts an unowned index candidate back in Discover whatever its support", () => {
    expect(hiddenLane({ ...base, candidate: true })).toBe("discover");
  });

  it("picks the refused line by the same lane", () => {
    expect(hiddenListCopy.undoRow.refused(hiddenLane({ ...base, owned: true, ranked: true }))).toBe(
      "Couldn’t hide that again. Hide it from For you.",
    );
    expect(hiddenListCopy.undoRow.refused(hiddenLane(base))).toBe("Couldn’t hide that again. Hide it from Discover.");
    expect(hiddenListCopy.undoRow.refused(hiddenLane({ ...base, owned: true, ranked: false }))).toBe(
      "Couldn’t hide that again.",
    );
  });

  it("draws each lane's Undo row line", () => {
    expect(hiddenListCopy.undoRow.label("Ghalta", "foryou")).toBe("Ghalta back in For you");
    expect(hiddenListCopy.undoRow.label("Ghalta", "discover")).toBe("Ghalta back in Discover");
    expect(hiddenListCopy.undoRow.label("Ghalta", null)).toBe("Ghalta unhidden");
  });
});

describe("hiddenRowHref", () => {
  it("opens a built commander's deck, never its page (which 404s)", () => {
    expect(hiddenRowHref({ deckId: "d1", slug: "ghalta" })).toBe("/decks/d1");
  });
  it("opens the page at its slug, or nothing when no list resolves one", () => {
    expect(hiddenRowHref({ deckId: null, slug: "ghalta-primal-hunger" })).toBe("/commanders/ghalta-primal-hunger");
    expect(hiddenRowHref({ deckId: null, slug: null })).toBeNull();
  });
});

describe("hiddenDay", () => {
  it("writes the month and day, never the year", () => {
    expect(hiddenDay(new Date("2026-10-31T15:00:00Z"), "UTC")).toBe("Oct 31");
    expect(hiddenDay(new Date("2025-09-02T15:00:00Z"), "UTC")).toBe("Sep 2");
  });
  it("reads the day in the zone it is given", () => {
    const late = new Date("2026-11-01T02:00:00Z");
    expect(hiddenDay(late, "UTC")).toBe("Nov 1");
    expect(hiddenDay(late, "America/Los_Angeles")).toBe("Oct 31");
  });
  it("says it as the row does", () => {
    expect(hiddenListCopy.hiddenOn(hiddenDay(new Date("2026-10-31T15:00:00Z"), "UTC"))).toBe("Hidden Oct 31");
  });
});
