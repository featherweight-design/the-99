// Discovery R2 and R3 (plan `2026-10-16-discovery-r2-r3.md`): the showcase, the "?" on every screen, the
// first-run tour and tools where the need is. Handoff: `design/design_handoff_the99_discovery_onboarding/`,
// copy from `discovery-r2 · copy strings.ts` after /copy-review. Each PR of the line adds the strings it ships.

import type { AboutScreen, DeckView } from './about';

/** Each screen's name as the Reference and the "?" print it (README-r2, "Screens: every entry's `screen`"). */
export const SCREEN_NAMES: Record<AboutScreen, string> = {
  home: 'Home',
  collection: 'Collection · Cards',
  'card-details': 'Card details',
  sets: 'Collection · Sets',
  proxies: 'Collection · Proxies',
  history: 'Collection · History',
  wishlist: 'Collection · Wishlist',
  upload: 'Upload a file',
  commanders: 'Commanders',
  discover: 'Discover',
  'new-deck': 'New deck and precons',
  decks: 'Decks',
  deck: 'A deck',
  friends: 'Friends',
  account: 'Account menu',
};

export const DECK_VIEW_NAMES: Record<DeckView, string> = {
  'your-deck': 'Your deck',
  shopping: 'Shopping',
  stats: 'Stats',
  notes: 'Notes',
  analysis: 'Analysis',
  games: 'Games',
  versions: 'Versions',
};

/** `A deck · Shopping`, or a screen with no view by its own name. */
export function screenName(place: { screen: AboutScreen; view?: DeckView }): string {
  const screen = SCREEN_NAMES[place.screen];
  return place.view ? `${screen} · ${DECK_VIEW_NAMES[place.view]}` : screen;
}
