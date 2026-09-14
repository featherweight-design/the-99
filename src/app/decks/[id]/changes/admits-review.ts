// Who the review page is for, as a decision the route can be tested on. The
// route itself reads the deck, the draft and the header before it can ask this,
// so the question is extracted rather than exercised through the page.

export type ReviewAdmission = {
  /** Rows in the draft — `changeCount(state)`. Every card the draft moved is
   *  one, basics included, so this is the whole test of whether there is
   *  anything to read. */
  changes: number;
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
 * Rows admit a visit on their own: that is a review, and the reader may have
 * arrived from anywhere. A draft with no row at all is nothing to read — no
 * row, no cost — so the page is admitted only as the commit CTA arriving, which
 * is what the banner promises the link does, and only where a commit is a thing
 * the server would accept.
 *
 * That leaves the brew: the absence of a version is not enough, because
 * `commitDeckVersion` refuses a v1 over an unfinished list, and a page offering
 * a commit the server will refuse is worse than a redirect. A deck that HAS a
 * version and no row has nothing pending, so nothing is offered either.
 */
export function admitsReview(a: ReviewAdmission): boolean {
  if (a.changes > 0) return true;
  if (!a.wantsCommit) return false;
  return !a.hasVersion && a.firstCommitReady;
}
