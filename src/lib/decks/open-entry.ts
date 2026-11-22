// The hand-off from the press that opens a deck to the deck page's loading skeleton (handoff
// `design_handoff_the99_deck_flip_skeleton`, A). `loading.tsx` takes no props, so a press writes the destination's header
// facts here, sessionStorage like the flip trail, and the skeleton reads them (after mount on a first paint, so the server never draws them). One entry at a time, for one
// deck: it is ignored when it names another deck or is older than a moment, and the landed page clears it. Storage is a
// convenience: with none, or with an entry that does not fit, the skeleton draws its shapes alone (B).

import type { DeckListItem } from "./read";
import type { StatusPill } from "./status";
import { deckIdentity } from "./format";
import { commanderDisplayName } from "../cards/printed-name";

export const OPEN_KEY = "the99:decks:open";

/** An entry older than this was left by a press that never landed; a later open must not inherit it. */
export const OPEN_TTL_MS = 60 * 1000;

/** The header facts a deck's loading skeleton draws, from a list row. */
export type OpenFacts = {
  id: string;
  name: string;
  /** The commander's name on the copy owned (`commanderDisplayName`). */
  commander: string;
  /** The partner's name, drawn as the loaded header's own second half of the commander line. Null for a lone commander; absent on an entry from an older build. */
  partnerName?: string | null;
  /** Both commanders' colours in WUBRG order (`deckIdentity`). */
  identity: string[];
  artCropUri: string | null;
  /** The commander's own colours, which the art's no-crop gradient draws (the loaded header passes the commander's, not the pair's). Absent on an entry from an older build: the pair's `identity` stands in. */
  artIdentity?: string[];
  status: StatusPill;
  built: number;
  /** A partner deck's body is 98 (`deckBodySize`), so the count's denominator needs the fact, not the name. */
  partner: boolean;
  /** The deck's description (`decks.intent`), so the header's tagline row is there from the first frame and the name does not move when the page lands. Absent on an entry from an older build: no row. */
  intent?: string | null;
};

export type OpenPlace = { k: number; n: number; caption: string | null };

export type OpenEntry = {
  /** The deck id the entry is for. */
  to: string;
  facts: OpenFacts;
  /** The deck's place in the list the press came from, or null when it carried none (Home): the strip row is held. */
  place: OpenPlace | null;
  at: number;
};

export function openFactsOf(d: DeckListItem): OpenFacts {
  const commander = commanderDisplayName({ name: d.commanderName, printedName: d.commanderPrintedName });
  return {
    id: d.id,
    name: d.name,
    commander,
    partnerName: d.partnerName,
    identity: deckIdentity(d.commanderColorIdentity, d.partnerColorIdentity),
    artCropUri: d.commanderArtCropUri,
    artIdentity: d.commanderColorIdentity,
    status: d.statusPill,
    built: d.built,
    partner: d.partnerName !== null,
    intent: d.intent,
  };
}

export function parseOpenEntry(raw: string | null, now: number): OpenEntry | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<OpenEntry> | null;
    if (!v || typeof v.to !== "string" || typeof v.at !== "number" || !v.facts || typeof v.facts.id !== "string") return null;
    const f = v.facts;
    // Every field the skeleton draws: an entry from an older build must fall back to shapes, not throw in the fallback.
    if (typeof f.name !== "string" || typeof f.commander !== "string" || typeof f.built !== "number" || typeof f.status !== "string" || typeof f.partner !== "boolean") return null;
    if (!Array.isArray(f.identity) || !f.identity.every((c) => typeof c === "string")) return null;
    // Optional, so an older entry stays valid; a malformed one is dropped to the deck's identity.
    if (f.artIdentity !== undefined && (!Array.isArray(f.artIdentity) || !f.artIdentity.every((c) => typeof c === "string"))) delete f.artIdentity;
    if (f.partnerName !== undefined && f.partnerName !== null && typeof f.partnerName !== "string") delete f.partnerName;
    if (f.intent !== undefined && f.intent !== null && typeof f.intent !== "string") delete f.intent;
    if (now - v.at > OPEN_TTL_MS || v.facts.id !== v.to) return null;
    return v as OpenEntry;
  } catch {
    return null;
  }
}

/** The one-based place after stepping `step` (-1 or +1) from `k` in a list of `n`, wrapping at both ends. */
export function placeAfter(k: number, n: number, step: number): number {
  return ((k - 1 + step + n) % n) + 1;
}

export function writeOpenEntry(facts: OpenFacts, place: OpenPlace | null): void {
  try {
    window.sessionStorage.setItem(OPEN_KEY, JSON.stringify({ to: facts.id, facts, place, at: Date.now() } satisfies OpenEntry));
  } catch {
    // No storage: the skeleton draws its shapes alone.
  }
}

export function clearOpenEntry(): void {
  try {
    window.sessionStorage.removeItem(OPEN_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** The raw entry, for `useSyncExternalStore`: a string compares by value, so the snapshot is stable between reads. */
export function readOpenRaw(): string | null {
  try {
    return window.sessionStorage.getItem(OPEN_KEY);
  } catch {
    return null;
  }
}
