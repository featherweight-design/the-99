# About · Social line entries (addendum)

Account 2, 2026-10-15. Status: **awaiting Hugh's audit**. Not a handoff yet: on approval this folder
goes to `main` as `design/design_handoff_the99_about/addendum-social-line/` by PR.

Four About entries for the Social line, drawn on the per-entry template (§8 of the R3 canvas,
`STATES-about-r3.md` §G), each at 1300 and 390 over the shipped `/about` in Kamigawa. They batch at
the line's launch (AGENTS.md, "a multi-round feature line batches its About entries").

| Board | Entry | Id | Chapter, position | Route · opens | Switch | Specimen |
|---|---|---|---|---|---|---|
| `Friends.dc.html` | Friends and pods | `friends` | 04, after `log-findings` | /friends | SOCIAL_FRIENDS_ENABLED | `PodCard`, shipped |
| `Wishlist.dc.html` | Keeping a wishlist | `wishlist` | 01, last, after `collection-history` | /collection/wishlist | SOCIAL_WISHLIST_ENABLED | wishlist tiles (E1) |
| `Spares.dc.html` | When a friend has a spare | `friend-spares` | 03, after `stand-ins` | /decks · opens a deck’s Shopping filter | SOCIAL_FRIENDS_ENABLED | two Shopping rows + the friends section (E2) |
| `Opponents.dc.html` | Who you played against | `opponents` | 04, after `friends` | /decks · opens a deck’s Games tab | SOCIAL_GAMES_ENABLED | `GameMatchups`, shipped |

`Main.dc.html` holds the order and grouping calls and the gaps. `about · social line.ts` holds the
four entry objects as they go into `aboutEntries`, with their line switches.

## The calls

1. **Not one group.** Each entry sits in the chapter of the surface it teaches, beside the entries a
   reader meets there. A fifth "Friends" chapter was weighed and rejected: three of the four entries
   live on surfaces other chapters already own (Collection, Shopping, Games).
2. **Order:** wishlist ends 01; spares follow Cheaper stand-ins in 03 (the same modal); friends,
   then opponents, follow "What your games are telling you" in 04 (friends first, since seating a
   friend needs one).
3. **No version bump.** Each follows its own switch, so `since: 14` and the content hash re-pins.
   `AboutSwitch` gains SOCIAL_FRIENDS_ENABLED, SOCIAL_WISHLIST_ENABLED and SOCIAL_GAMES_ENABLED.
   Lines that need another switch carry it in `captionLineSwitches` / `keySwitches`.
4. **Specimens reuse shipped parts, no new visuals.** `PodCard` and `GameMatchups` render as they
   are. Two parts are being built in Social R2's plan and need exporting unchanged: E1, the
   wishlist tile (R2 PR 4), and E2, the stand-ins modal's friends section (R2 PR 8).

## Gaps

- G1 · `/collection/wishlist` is assumed as the Wishlist tab's route; use whatever R2 PR 4 ships.
- G2 · E1 and E2 above.
- G3 · fixtures and art: `fixtures.friendsPod`, `fixtures.wishlist`, `fixtures.friendSpares`,
  `fixtures.matchups`, named on each board. Art is from the fixtures' `imageUri`.
- G4 · chapter 04's sub-line may want a word for friends; left as shipped.
- G5 · faces use the commander-image focus from Social R3 G9.
- G6 · copy is final for audit; `/copy-review` sets it as usual.

## Reading the boards

Exports are committed unchanged. Images on the boards are canvas assets (`/_blob/…`), so they show
on the canvas and not when a `.dc.html` is opened from disk.
