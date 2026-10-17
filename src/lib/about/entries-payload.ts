import { fillAllowance, type AboutEntry, type AboutScreen, type DeckView } from "../copy/about";

/**
 * What the "?" panel reads of an entry (discovery R2·1b, R2 gap 6): its words and its place, never a specimen.
 * `caption` has the reader's own daily allowance filled in, as the About page fills it.
 */
export type EntryPayload = {
  id: string;
  title: string;
  caption: string;
  keys: string[];
  screen: AboutScreen;
  view?: DeckView;
};

/** The payload for entries `visibleEntries` already resolved for the reader, in their order. */
export function entriesPayload(entries: readonly AboutEntry[], creditLimit: number): EntryPayload[] {
  return entries.map((e) => ({
    id: e.id,
    title: e.title,
    caption: fillAllowance(e.caption, creditLimit),
    keys: [...e.keys],
    screen: e.screen,
    ...(e.view ? { view: e.view } : {}),
  }));
}
