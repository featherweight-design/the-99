// The Hidden list's row, as the page hands it to the client (design_handoff_the99_hide_commander README §3, the
// Hidden board). Pure and client-safe: the rules that decide where a row links and which list an Unhide puts it
// back in live here, apart from the read (`hidden-list.ts`), so a test can pin them without a database.

/**
 * The list an Unhide puts the commander back in, which the Undo row names: For you for one the reader owns,
 * Discover for one they do not. Null when NEITHER list would show it (READINESS Y3): a commander a deck is built
 * around (built commanders are out of both lists, `notBuiltBy`), one the catalog no longer calls commander-legal,
 * or an unowned one the offline index holds nothing for (no `commander_support` row, so not a Discover candidate).
 * Saying "back in Discover" of any of those would send the reader to a list that does not hold it.
 */
export type HiddenLane = "foryou" | "discover" | null;

export type HiddenRow = {
  oracleId: string;
  name: string;
  colorIdentity: string[];
  /** The card face, as Help me choose's result row draws its thumb. */
  imageUri: string | null;
  /** When it was hidden, ISO: the row's *Hidden Oct 31*. */
  hiddenAt: string;
  lane: HiddenLane;
  /** Where the row opens: the commander's page, or a built commander's deck. Null when neither resolves. */
  href: string | null;
};

export function hiddenLane(f: { built: boolean; owned: boolean; legal: boolean; candidate: boolean }): HiddenLane {
  if (f.built || !f.legal) return null;
  // For you's population is owned, legal and unbuilt (`loadOwnedHiddenNameMatches` holds it to the same).
  if (f.owned) return "foryou";
  // Discover's is legal, unbuilt and unowned, and only what the index measures (`discoverCandidates`).
  return f.candidate ? "discover" : null;
}

/**
 * The row's press. A built commander opens its deck: its commander page resolves nowhere once a deck is built
 * around it (`store.ts`), so a link there would 404 (READINESS Y3). Otherwise the page, at the slug the list used
 * before the hide (`loadHiddenSlugs`). Neither: no link, and the row is drawn without one rather than with a 404.
 */
export function hiddenRowHref(f: { deckId: string | null; slug: string | null }): string | null {
  if (f.deckId) return `/decks/${f.deckId}`;
  return f.slug ? `/commanders/${f.slug}` : null;
}

/**
 * `Oct 31`: the day a commander was hidden, month first, never the year (READINESS Y11: a list that never expires
 * crosses years, and the order already says which is newer). en-US, because en-GB writes `Sept`.
 *
 * `timeZone` is `"UTC"` for the server's draw and the first client render, and the reader's own (`undefined`)
 * once the page has hydrated, so the two first renders agree (the friends list's rule, `lib/social/when.ts`).
 */
export function hiddenDay(at: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone }).format(at);
}
