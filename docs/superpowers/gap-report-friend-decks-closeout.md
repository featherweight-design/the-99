# Gap report: friend decks, close-out (PR 6)

Handoff `design/design_handoff_the99_friend_decks/` (R2, Green). This is the line's close-out: `design-review`'s
verify pass against the WHOLE brief, `/copy-review` over the line's strings, the full contact sheet, and the About
deferral. PRs: #2206 (data and read), #2212 (friend's deck page), #2220 (friend tiles), #2223 (owner controls),
#2225 (game picker), and this one.

## Contact sheet

`docs/superpowers/inventories/friend-decks.json`, all 13 rows at 390 and 1300: **26 of 26 cells reached**, walked
against the brief. The scratch branch had the switches on for both accounts (`SOCIAL_FRIENDS_ENABLED`,
`FRIEND_DECKS_ENABLED`, `SOCIAL_GAMES_ENABLED`).

## Design review (whole brief)

The verify pass took the committed tables (`friend-decks-page.md`, `friend-decks-tiles.md`) as its checklist, plus
every README call, READINESS item and board except Carry-Overs (not this line). It found 2 visual gaps and 4 state
gaps, plus 1 structural item.

| # | Gap | Resolution |
|---|---|---|
| V1 | /friends privacy line: "Settings" drawn in the name line's accent, with a 4px top margin. The board draws a bare underline in the line's own faint ink, with 6px. | **Fixed** (`friends-head.tsx`), with a test. |
| V2 | Settings › Your decks: the boxes are the shared `ui/checkbox` (18px, radius 4) where the board draws 20px, radius 5. | **Kept.** It is the Settings page's own checkbox; the News section above draws the same one. The same call as PR 4's decision 1. |
| S1 | Viewer's switch on, owner's off: open tiles with no press, under "Open one to see its list". | **Fixed.** `loadFriendDecks(viewer, publicId, viewerOpen)` returns the open tile (`OpenFriendDeck`, with an id) only when BOTH switches are on. The tab draws open tiles only when the read carried ids, so a mixed pair gets the tab as it shipped. Tests, plus a mutation check. |
| S2 | Viewer's off, owner's on: the tab as it shipped, filtered by the owner's rules, under a line that still names drafts. | **Kept, documented** (`docs/agents/social.md`, Whose switch). The owner's privacy wins over the viewer's copy. Only per-account overrides can reach this state; the switch rolls out as one variable. |
| S3 | The friends About key still read "…never the lists" with friend decks on (READINESS 7). | **Fixed.** `keySwitches`: the old sentence needs `!FRIEND_DECKS_ENABLED`, and the privacy line's default sentence needs `FRIEND_DECKS_ENABLED`. Tests pin the swap and that the two sentences match word for word. |
| S4 | A deck hidden on its own that Settings also hides drew the LOCKED row, so its own flag could not be cleared. | **Fixed.** The lock applies only to a deck not hidden on its own (`deck-card-overflow.tsx`), with a test. |
| 5 | The open tile's read still carried the owner's status and to-buy figure (READINESS 3). | **Fixed** with S1. The open tile is `status: null, toBuy: null`, and the owner's Shopping is never read for it. |

## Copy review

All of the line's strings were placeholders for `/copy-review` (READINESS 2). Three were tightened:

- `decksSeenBy.finished`: "Friends can see your decks and their lists, except drafts and decks you're building."
- `decksSeenBy.all`: "Friends can see all your decks and their lists."
- `friendPage.decks.lineOpen`: "Newest first. Open one to see its list." The friend's name is already the heading.

Everything else was kept. Two locks were held:

- "A deck not listed": Hugh's ruling.
- Settings' "full and committed": a fact, fixed in #2223 round 3.

## About entry: deferred

Opening a friend's deck, and the hide controls, owe an About entry on the social line. Per READINESS G6 and the
batching rule, it comes with the line's About round, not this PR. **`FRIEND_DECKS_ENABLED` must not go on in
production until that entry ships.** It therefore stays in `ALL_FEATURES_EXCLUDED`, which now gives that reason, so
no All features account gets it either. Staging may run it on now.
