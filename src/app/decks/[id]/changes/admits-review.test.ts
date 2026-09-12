import { describe, expect, it } from "vitest";
import { admitsReview, type ReviewAdmission } from "./admits-review";

// A committed deck mid-edit with one card moved: the ordinary visit.
const REVIEWING: ReviewAdmission = {
  changes: 1,
  basicsChanged: false,
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

  // Both empty-column cases below draw two blank columns, which is what the
  // banner promises the review link never lands on.
  it("admits a basics-only draft only as the commit CTA", () => {
    const basics = { ...REVIEWING, changes: 0, basicsChanged: true };
    expect(admitsReview(basics)).toBe(false);
    expect(admitsReview({ ...basics, wantsCommit: true })).toBe(true);
  });

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

  // A moved basic land is a difference FROM a version, so a brew has nothing to
  // have moved from and the loader never sets the flag on one. If it did, the
  // readiness test is still the answer: v1 is the commit on offer.
  it("keeps the readiness test on a brew that reports moved basics", () => {
    const brew = {
      ...REVIEWING,
      changes: 0,
      hasVersion: false,
      basicsChanged: true,
      wantsCommit: true,
    };
    expect(admitsReview({ ...brew, firstCommitReady: false })).toBe(false);
    expect(admitsReview({ ...brew, firstCommitReady: true })).toBe(true);
  });
});
