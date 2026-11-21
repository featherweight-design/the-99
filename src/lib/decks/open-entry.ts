// The hand-off from the press that opens a deck to the deck page's loading skeleton (handoff
// `design_handoff_the99_deck_flip_skeleton`, A). `loading.tsx` takes no props, so a press writes the destination's header
// facts here, sessionStorage like the flip trail, and the skeleton reads them after mount. One entry at a time, for one
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
  /** The commander line: the name on the copy owned (`commanderDisplayName`), and the partner's after it. */
  commander: string;
  /** Both commanders' colours in WUBRG order (`deckIdentity`). */
  identity: string[];
  artCropUri: string | null;
  status: StatusPill;
  built: number;
  /** A partner deck's body is 98 (`deckBodySize`), so the count's denominator needs the fact, not the name. */
  partner: boolean;
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
    commander: d.partnerName ? `${commander} + ${d.partnerName}` : commander,
    identity: deckIdentity(d.commanderColorIdentity, d.partnerColorIdentity),
    artCropUri: d.commanderArtCropUri,
    status: d.statusPill,
    built: d.built,
    partner: d.partnerName !== null,
  };
}

export function parseOpenEntry(raw: string | null, now: number): OpenEntry | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<OpenEntry> | null;
    if (!v || typeof v.to !== "string" || typeof v.at !== "number" || !v.facts || typeof v.facts.id !== "string") return null;
    if (now - v.at > OPEN_TTL_MS || v.facts.id !== v.to) return null;
    return v as OpenEntry;
  } catch {
    return null;
  }
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
