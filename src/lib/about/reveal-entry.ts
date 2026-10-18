/**
 * The ONE way a link on the page already showing the Reference reaches it (PR #2023 review, rounds 2 and 3). The ? panel's
 * links name the whole URL (`/about?tab=reference` or `…#<id>`): a fragment already in the address fires no
 * `hashchange`, an empty one names nothing, and the Reference's search would hide what they point at, so a press on one
 * while the Reference is up only closed the panel. The press says so here instead, and `ReferenceTab` answers: it
 * clears its search, then opens the entry where it stands and brings it into view, or, with no entry (`null`), goes to
 * the page's top. On a phone it moves the page only once the sheet that sent it has stepped off its history entry and
 * the page's scroll is put back. Nothing hears it on any other page. Client-only.
 */
export const REVEAL_ENTRY_EVENT = "the99:reveal-entry";

export function revealReferenceEntry(id: string | null): void {
  window.dispatchEvent(new CustomEvent<string | null>(REVEAL_ENTRY_EVENT, { detail: id }));
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
