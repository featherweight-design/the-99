# Readiness — friend decks and the hide switch

**Verdict: Green.** R2 approved by Hugh 2026-10-22 ("Everything else here LGTM"). G4 ruled by Hugh the same day.
Nothing below blocks the build; each open item has a drawn default.

## For Hugh

1. **About entry.** Opening a friend's deck and the hide controls are a feature on the social line; per the batching
   rule the entry comes with the line's About round, not here (G6).
2. **Copy** is placeholder throughout, for `/copy-review`: the three privacy-line variants, the Settings section,
   the menu row, the friend's empty Decks body and the deck page's eyebrow.

## For engineering

1. **The friend's deck page (G1).** `/friends/[publicId]/decks/[deckId]`, read by a new `loadFriendDeck(viewer,
   publicId, deckId)` in `src/lib/social/` behind `resolveFriend`, the grant read again after the reads, as
   `loadFriendDecks` does. Null (the app's 404) for a hidden deck, a deck that isn't theirs, or a lapsed friendship.
   Cards come with the VIEWER's ownership joined from the viewer's collection and the owner's printing for card
   details. No prices, no notes, no folder.
2. **Anatomy.** The open precon page's read-only layout (`open-precon-view.tsx`: `DecklistGroup` / `DecklistRow`
   `readOnly`, the own band, List / Cards, the basics dashed line) with the owner's deck-page grouping. Eyebrow
   "Colin's deck · read-only" with the friend's face. Rows open the shipped card details, unchanged (Add to wishlist
   stays in the full sheet on phone and in the desktop details column). No ✕, buy tag, auto tag, price or ⋯.
3. **No status for friends.** A friend's tile and deck page show the card count only: no status pill, no bar, no
   to-buy figure. `socialCopy.friendPage.decks.figure` and the status read leave the friend surfaces.
4. **The friend's tile.** The owner's `/decks` tile (`deck-card.tsx`) read-only, without the ⋯: the `ArtWash` cover band
   (248 at a cell of 330 or wider, 168 under), 1 column on a phone, 3 at 1300. The commander line shows the colour
   alone when the deck name repeats the commander (whole, or the part before the comma); a pair always names both.
   A tile with no art crop draws the commander gradient, never the full card image (G5: check the Jaws source).
   `FriendDeck` gains the deck id for the link (G3).
5. **Hidden from friends (G2).** `decks.hidden_from_friends` (boolean, default false), one checkbox row above Delete in
   `DeckCardOverflow`, so the deck header and the `/decks` tile both get it. A press ticks, saves and closes; no
   confirm; failure toast "We couldn't change that. Your deck is unchanged." On: a "Hidden from friends" mark in the
   header chips row, the glyph in the `/decks` tile chips row, and a `DecksMarkKey` item. Gated on
   `SOCIAL_FRIENDS_ENABLED`. Hiding never changes spares.
6. **Settings defaults (G2).** `/settings` gains "Your decks" after Spares: "Friends can see my decks" (default on) and
   "Include drafts and decks I'm building" (default off; unfinished = Draft or Building from `lib/decks/status.ts`).
   Two account prefs, filtered with the per-deck flag in ONE place that `loadFriendDecks` and `loadFriendDeck` share.
   A deck the Settings rule hides shows its ⋯ row ticked and locked with "Set in Settings ›" (opens `/settings`); the
   `/decks` glyph marks only a deck hidden on its own.
7. **Privacy line.** `socialCopy.page.decksSeen` becomes three strings chosen by the two prefs (default / drafts
   included / decks off), with "Settings" linking to `/settings`. The About key #2196 carries takes the default.
8. **Absence.** A hidden deck is simply absent: no tile, the Decks count drops, the link is the shipped 404. With
   "Friends can see my decks" off the friend sees the shipped empty Decks state (body reworded).
9. **G4, ruled.** Tonight's table and logged games keep a hidden deck's name: the player chose to use it.
10. **Cache.** Any cached page drawing friend decks keys `friendGeneration(viewer)` as today; the owner's own prefs and
    flag bump the owner's stamp through the usual trigger.

## Carried over from prompt 13

Waiting on you: `--fg-faint` for the time and a seen row's kind is ratified; under an hour reads "just now"; no face
draws the initials tile; no art draws the card's identity gradient at card shape. Home feed: "You added X." ratified.

## Not drawn

Card view (`ReadOnlyCardTile`, as the precon) and the About entry (G6).
