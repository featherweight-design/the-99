/**
 * Card scanning addendum: the scanner while it gets ready (account 2, 2026-11-15). New strings, for /copy-review.
 * Goes under `collectionEditCopy.scan` as `loading`. See README.md beside this file.
 */
/** As shipped in `src/lib/copy/wishlist.ts`. */
type CopyPart = { text: string; strong?: true };

/** One decimal, a trailing .0 dropped: 7.2, 18. */
const mb = (x: number) => String(Math.round(x * 10) / 10);

export const loading = {
  /** L1: the first open on this device, the models downloading. */
  title: "Getting the scanner ready",
  /** L1 and L2: under the bar. */
  firstLine: "The first time on this device, the scanner downloads what it needs to read cards. After that it opens in a moment.",
  /** L1 and L2: the figure under the bar, the done figure bold. */
  size: (done: number, total: number): CopyPart[] => [{ text: mb(done), strong: true }, { text: ` of ${mb(total)} MB` }],
  /** L2: every byte in; the runtime and warm-up finishing. */
  almost: "Almost ready",
  /** L4: a cached reopen not ready after 400ms. Also names L4's bar. */
  reopen: "Starting the scanner",
  /** The L1/L2 bar's accessible name. */
  barLabel: "Scanner download",
};
