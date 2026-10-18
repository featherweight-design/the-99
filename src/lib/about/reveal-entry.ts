/**
 * Opens a Reference entry on the page already showing it (PR #2023 review, round 2). A link to the fragment already in
 * the address fires no `hashchange`, and the ? panel's links name the whole URL (`/about?tab=reference#<id>`), so a
 * press on one while the Reference is up reached nothing: the entry stayed shut, or hidden by a search. The press says
 * so here instead, and `ReferenceTab` answers as it answers a hash: it clears its search, opens the entry where it
 * stands and brings it into view. Nothing hears it on any other page. Client-only.
 */
export const REVEAL_ENTRY_EVENT = "the99:reveal-entry";

export function revealReferenceEntry(id: string): void {
  window.dispatchEvent(new CustomEvent<string>(REVEAL_ENTRY_EVENT, { detail: id }));
}

/** The entry a same-page link names: its decoded fragment, or null for none (or a malformed one). */
export function entryOfHref(href: string): string | null {
  const at = href.indexOf("#");
  if (at < 0 || at === href.length - 1) return null;
  try {
    return decodeURIComponent(href.slice(at + 1));
  } catch {
    return null;
  }
}
