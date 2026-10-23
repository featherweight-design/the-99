# About · friend decks, and calls on what shipped (addendum)

Account 2, 2026-10-22. Status: **R1, with call 2 at R2, for Hugh's review.** Addendum to `design/design_handoff_the99_friend_decks/` (#2203,
READINESS G6 deferred its entry here), with calls on the shipped lines of spare requests (#2221, #2230), push (#2219) and
menu and Home. Checked against main at `6560671`. Canvas (account 2): https://claude.ai/artifact/VGwkbjxhv51y1yMuzAYWS8

`FRIEND_DECKS_ENABLED` stays off in production until this entry ships (#2228).

## Boards

| File | What |
|---|---|
| `Main.dc.html` | The entry and the six calls with their verdicts, the edits to shipped entries |
| `E1-Friend-Decks.dc.html` | The entry opened in the shipped Reference at 1300 and 390 (Neon Rain), its picture in six themes, line switches, gaps |
| `Jaws-Tile.dc.html` | Call 2: the band's rule for full-art and borderless printings, on a friend's tile and the owner's |
| `Calls.dc.html` | Calls 3 to 6: the accepted mark in six themes, the tooltip in the 640 modal, #2230's differences, push landings, string fixes, walk notes |

`about · friend decks.ts` holds the entry object, the edits to shipped entries and the locator.

## The calls

1. **About entry: drawn.** One entry, `friend-decks`, *Your friends' decks*, on Friends, chapter 04, right after
   `friends`, following `FRIEND_DECKS_ENABLED`, `since: 16` (switched: no bump). One caption covers the four things: a
   friend's deck opens read-only with your own dots; Settings › Your decks by its two boxes' shipped names; Hidden from
   friends in the ⋯ menu; the game log's "A deck not listed" (that paragraph follows `SOCIAL_GAMES_ENABLED`). The halo is
   the /friends privacy line, `[data-decks-seen]`, already on main. Picture: main's own `friends` capture with that line
   set as the switch draws it (`scratch-gen/fdframes.py`), standing in for the recapture. Not picked: a friend's deck
   page as the picture, which needs a new capture screen, a friend fixture and a screen for `/friends/{publicId}/**`.
   Two shipped entries take a switched key each: `friends` key 2 and `opponents` key 3 (in the `.ts`).
2. **Jaws' tile: R2, cut the shark out of the poster.** R1's card on a gradient was rejected (awkward, read as broken).
   SLD 2175's art crop is the whole poster, words included, but the poster has clean water in it. A printing whose art
   carries the card's words gets a **crop box set by hand on its full card image** (fractions of the card); one with no
   box yet draws the identity gradient, never the words. Two boxes for Jaws, from Hugh's image of the card: **1 · the
   swimmer and the shark** (0.008, 0.234, 0.654, 0.551; recommended) and **2 · the jaws** (0.212, 0.460, 0.767, 0.731).
   Pick one. Drawn at 390, 1300, the owner's /decks and the 168 band, beside the shipped fault and the fallback.
3. **Spare requests: ratified.** The accepted tick in `var(--bg)` is dark on green in all six themes (every `--bg` is
   dark; 6.3 to 6.7:1). The ⓘ tooltip opening upward in the 640 modal. #2230's 11 shared-component differences: the
   shipped view switch, key items and buy tag win (the boards' were kit drift); the 2 spacing ones too; the phone's 25px
   head gap is the shipped sticky band. Declined inside the cooldown over Ask instead.
4. **Push landings (D4): ratified.** Seen is a cursor; only Home and /friends move theirs. Set, precon and friend-page
   landings mark nothing; opening Home closes every delivered notification. **Correction owed in the push handoff:** call
   5 and G5 lose "marks that item seen", and `about · push.ts` key 3 reads *A tap opens what it's about. Opening Home
   marks your news seen.*
5. **Stale lines: fixed in the handoff PR.** "Your last upload added Demonic Consultation. Neither is in a deck yet." on
   the menu and Home boards Feed-Kinds, Home-Directions, Home-States and Menu becomes the shipped "You added Demonic
   Consultation." (text only). The menu and Home About README's friendPillStyle line names `FRIEND_DECKS_ENABLED`: the pill
   draws only with it off; with it on a friend's tile shows the card count alone (#2220).
6. **Walk notes: ratified.** Sign-in marks the feed seen (it is the Home visit after sign-in, which draws first). The
   first-run tour covering the opt-in row on a phone (the tour comes first; the opt-in waits on Home). Friend inventories
   naming unlinked friends on a fresh fork is tooling: seed first (`scripts/seed-r2-friend-fixture.mts`).

## Gaps

- A1 · Version: `since: 16`, no bump. Count 79 to 80 (`design-tables/about.md`, `gap-report-about.md`); re-pin the hash.
- A2 · Place: after `friends` in `aboutEntries`.
- A3 · Locator: `'friend-decks': { screen: 'friends', locator: '[data-decks-seen]' }`, scope main.
- A4 · Capture: `friends` with `FRIEND_DECKS_ENABLED` on and default rules; the line is one line longer.
- A5 · Optional: `screenForPath` maps `/friends/{publicId}/**` to `friends`, so the ? on a friend's pages finds this entry.
- A6 · Release: `FRIEND_DECKS_ENABLED` leaves `ALL_FEATURES_EXCLUDED` with the entry.
- J1 to J3 (Jaws-Tile board): a `printing_art_crops` catalog table (printing id, box); a boxed band draws the full card
  image scaled to the box, then `ArtWash`, everywhere a commander band draws; `full_art`, or `borderless` without
  `textless`, with no box draws the gradient.

## Reading the boards

Exports are committed unchanged. Images are canvas assets (`/_blob/…`), so they show on the canvas and not from disk;
the six pictures are also in `art/`. The generators stay on `design-assets` in `scratch-gen/` (kit, parts, sr, fdk, la,
akit copied from the push round; `fdframes.py` makes the pictures from a main checkout, `aboutfd.py` the entry board,
`boards.py` the rest). Local build: copy the earlier rounds' `art/` into `scratch-gen/art`, then `python3 build.py local`
and `python3 render.py $PWD/out <names>`.
