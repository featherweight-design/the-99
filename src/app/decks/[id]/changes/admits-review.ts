// Who the review page is for, as a decision the route can be tested on. The
// route itself reads the deck, the draft and the header before it can ask this,
// so the question is extracted rather than exercised through the page.

export type ReviewAdmission = {
  /** Named rows in the draft — `changeCount(state)`. A basics-only edit is 0. */
  changes: number;
  basicsChanged: boolean;
  /** False for a brew, which has no version to diff against. */
  hasVersion: boolean;
  /** The spine's `Commit as v1` test: body size reached, nothing unresolved. */
  firstCommitReady: boolean;
  /** `?commit=1` — the banner's CTA, or the spine's `Commit as v1`. */
  wantsCommit: boolean;
};

/**
 * Whether a visit to `/decks/[id]/changes` has anything to show.
 *
 * A committed or discarded draft leaves the page with nothing to review, and a
 * bare empty state would read as a bug — the deck page is where the version line
 * is, so that is where a refused visit goes.
 *
 * Named rows admit a visit on their own: that is a review, and the reader may
 * have arrived from anywhere. The two empty-column cases do not, because there
 * is nothing on either to read — no row, no cost — so they are admitted only as
 * the commit CTA arriving, which is what the banner promises the link does.
 *
 * A brew is the stricter of those two: the absence of a version is not enough,
 * because `commitDeckVersion` refuses a v1 over an unfinished list, and a page
 * offering a commit the server will refuse is worse than a redirect.
 */
export function admitsReview(a: ReviewAdmission): boolean {
  if (a.changes > 0) return true;
  if (!a.wantsCommit) return false;
  // `hasVersion` guards the basics branch because a moved basic land is a
  // difference FROM a version — a brew has nothing to have moved from. So a
  // versionless draft is answered by the readiness test whatever it reports
  // about its lands, and never admitted on a flag that cannot mean anything.
  if (a.hasVersion) return a.basicsChanged;
  return a.firstCommitReady;
}
