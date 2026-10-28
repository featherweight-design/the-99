Build the About entry for friend decks from design/design_handoff_the99_about/addendum-friend-decks/ (PR #2241). Read its README first; READINESS is GREEN.

1. Add the `friend-decks` entry from `about · friend decks.ts` to src/lib/copy/about-entries.ts, right after `friends`. It takes `switch: FRIEND_DECKS_ENABLED` and `since: 16`, with no ABOUT_VERSION bump. It has two caption line switches (SOCIAL_WISHLIST_ENABLED and SOCIAL_GAMES_ENABLED) and a key switch on key 4 (SOCIAL_GAMES_ENABLED).
2. Turn `friends` key 2 and `opponents` key 3 into keySwitches pairs (!FRIEND_DECKS_ENABLED / FRIEND_DECKS_ENABLED), the way #2228 did for whats-new.
3. In scripts/lib/about-locators.mjs, add 'friend-decks': { screen: 'friends', locator: '[data-decks-seen]' } with scope main.
4. Recapture `friends` in all six themes with FRIEND_DECKS_ENABLED on and the default rules. Update the count from 79 to 80 in design-tables/about.md and gap-report-about.md, then re-pin the content hash.
5. Optional (A5): have screenForPath map /friends/{publicId}/** to `friends`.
6. Take FRIEND_DECKS_ENABLED out of ALL_FEATURES_EXCLUDED.

The push handoff's tap/seen lines were also corrected in this PR. Use "A tap opens what it’s about. Opening Home marks your news seen." if the push About entry is not built yet. Jaws' tile needs no change.
