// Links into the retired Reference and Tools tabs, sent to the page that now holds their content (About visual build,
// plan `2026-10-27-about-visual.md`, PR 6a; Review Focus 3). Pure.
//
// `/about?tab=reference#<entry>` goes to `/about/<area>#<section>` through the label or rule whose `legacy` list holds
// `<entry>` (a rule's section is the section listing it), first in page order. `#new`, an entry no unit holds and the
// bare Reference go to the `/about` index, and so does `/about?tab=tools`. Anything else is returned unchanged.
//
// EVERY link the app builds into the Reference goes through here: no file under `src/` but this one (and the Reference
// tab's own files, until it retires) spells `tab=reference` (`legacy-href.test.ts`).
//
// LIGHT, like `question-landing.ts`: the Home arrivals banner and the credits copy ship this to the browser, so it
// imports no About copy (`about-pages.ts`). Its one table is written out here, and `legacy-href.test.ts` derives it
// from `ABOUT_SECTIONS` and `ABOUT_RULES` and fails on any drift.

const INDEX = "/about";

/**
 * Every legacy entry id a unit holds, to `<area>/<section>`: a label's own section, or the first section in page order
 * listing a rule that holds it.
 */
export const LEGACY_SECTIONS: Readonly<Record<string, `${string}/${string}`>> = {
  "getting-help": "home/home",
  "about-rebuilt": "home/home",
  "ready-to-build": "home/home",
  "availability": "home/home",
  "commitments": "home/home",
  "whats-new": "home/whats-new",
  "browse": "collection/cards",
  "sets": "collection/cards",
  "collection-history": "collection/cards",
  "wishlist": "collection/cards",
  "collection-add": "collection/cards",
  "card-scan": "collection/cards",
  "card-search": "collection/cards",
  "decklist-marks": "collection/cards",
  "commander-availability": "collection/cards",
  "remove-card": "collection/cards",
  "post-import": "collection/cards",
  "import": "collection/upload",
  "upload-choice": "collection/upload",
  "upload-choice@COLLECTION_SYNC_ENABLED": "collection/upload",
  "commander-lane": "commanders/for-you",
  "discover": "commanders/for-you",
  "help-me-choose": "commanders/for-you",
  "fit-score": "commanders/for-you",
  "new-deck": "decks/your-decks",
  "deck-import": "decks/your-decks",
  "statuses": "decks/your-decks",
  "decks-stats": "decks/your-decks",
  "precons": "decks/your-decks",
  "card-marks": "decks/your-deck",
  "locked-cards": "decks/your-deck",
  "roles": "decks/your-deck",
  "informed-build": "decks/your-deck",
  "review-and-commit": "decks/your-deck",
  "auto-fill": "decks/your-deck",
  "deck-analysis": "decks/analysis",
  "suggested-changes": "decks/analysis",
  "suggested-changes@SUGGESTED_CHANGES_V2_ENABLED": "decks/analysis",
  "proposed-cuts": "decks/analysis",
  "mana-balance": "decks/analysis",
  "credits": "decks/analysis",
  "buying-credits": "decks/analysis",
  "versions": "decks/versions",
  "undo-removal": "decks/versions",
  "log-a-game": "decks/games",
  "log-findings": "decks/games",
  "opponents": "decks/games",
  "deck-stats": "decks/stats",
  "notes": "decks/notes",
  "shopping": "shopping/deck-shopping",
  "stand-ins": "shopping/deck-shopping",
  "friend-spares": "shopping/deck-shopping",
  "friend-spares@SPARE_REQUESTS_ENABLED": "shopping/deck-shopping",
  "buy-tag": "shopping/deck-shopping",
  "shopping-got-it": "shopping/deck-shopping",
  "proxies": "shopping/deck-shopping",
  "deck-tokens": "shopping/deck-shopping",
  "all-decks-cart": "shopping/all-decks",
  "friends": "friends/friends",
  "invites": "friends/friends",
  "friend-decks": "friends/friends",
  "rule-zero": "friends/friends",
};

/** The section holding a legacy entry id, as `<area>/<section>`, or null. */
export function legacySection(entry: string): `${string}/${string}` | null {
  return Object.hasOwn(LEGACY_SECTIONS, entry) ? LEGACY_SECTIONS[entry] : null;
}

export function legacyHref(href: string): string {
  const hashAt = href.indexOf("#");
  const beforeHash = hashAt === -1 ? href : href.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : href.slice(hashAt + 1);
  const queryAt = beforeHash.indexOf("?");
  const path = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  if (path !== INDEX || queryAt === -1) return href;
  const tab = new URLSearchParams(beforeHash.slice(queryAt + 1)).get("tab");
  if (tab === "tools") return INDEX;
  if (tab !== "reference") return href;
  // Entry ids are plain slugs, so the fragment is read as written: an encoded one names no entry.
  const section = hash ? legacySection(hash) : null;
  if (section === null) return INDEX;
  const slash = section.indexOf("/");
  return `/about/${section.slice(0, slash)}#${section.slice(slash + 1)}`;
}
