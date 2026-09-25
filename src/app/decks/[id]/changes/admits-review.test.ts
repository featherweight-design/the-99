import { describe, expect, it } from "vitest";
import { admitsReview, type ReviewAdmission } from "./admits-review";
import { changeCount } from "../../../../lib/decks/draft-shape";
import { COMMITTED } from "../../../../components/decks/__fixtures__/draft-state";

// A committed deck mid-edit with one card moved: the ordinary visit.
const REVIEWING: ReviewAdmission = {
  changes: 1,
  hasVersion: true,
  firstCommitReady: false,
  wantsCommit: false,
};

describe("admitsReview", () => {
  it("admits a draft with named rows however the reader arrived", () => {
    expect(admitsReview(REVIEWING)).toBe(true);
    expect(admitsReview({ ...REVIEWING, wantsCommit: true })).toBe(true);
  });

  it("refuses a clean draft", () => {
    expect(admitsReview({ ...REVIEWING, changes: 0 })).toBe(false);
    // Including on the CTA: a draft with nothing in it has no version to cut,
    // and the deck page's own controls are the ones that stop offering.
    expect(admitsReview({ ...REVIEWING, changes: 0, wantsCommit: true })).toBe(false);
  });

  // A committed deck with no row has nothing pending — the CTA is not an
  // override. This is the case that used to be admitted for a basics-only
  // draft, and those lands are rows now, so a count of 0 over a version means
  // the deck matches it.
  it("refuses a committed deck with no rows, CTA or not", () => {
    const clean = { ...REVIEWING, changes: 0, firstCommitReady: true };
    expect(admitsReview(clean)).toBe(false);
    expect(admitsReview({ ...clean, wantsCommit: true })).toBe(false);
  });

  // The brew draws two blank columns, which is what the banner promises the
  // review link never lands on, so it is admitted only as the arriving CTA.
  it("admits a ready brew only as the commit CTA", () => {
    const brew = {
      ...REVIEWING,
      changes: 0,
      hasVersion: false,
      firstCommitReady: true,
    };
    expect(admitsReview(brew)).toBe(false);
    expect(admitsReview({ ...brew, wantsCommit: true })).toBe(true);
  });

  // The link is not a skeleton key. A hand-typed `?commit=1` over a 63-card brew
  // would otherwise reach a sheet offering a v1 the server then refuses.
  it("refuses an unfinished brew even on the CTA", () => {
    expect(
      admitsReview({
        ...REVIEWING,
        changes: 0,
        hasVersion: false,
        firstCommitReady: false,
        wantsCommit: true,
      }),
    ).toBe(false);
  });
});

describe("admitsReview on a commander-only draft", () => {
  it("admits the visit, because the moved commander is one change", () => {
    const changes = changeCount({
      ...COMMITTED,
      commander: {
        from: { commanderOracleId: "korvold", partnerOracleId: null },
        to: { commanderOracleId: "prosper", partnerOracleId: null },
      },
    });
    expect(admitsReview({ changes, hasVersion: true, firstCommitReady: false, wantsCommit: false }))
      .toBe(true);
  });
});
