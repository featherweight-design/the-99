# Build prompt · Friend decks and the hide switch (R2)

Paste into Claude Code on your machine. PR #2203 is merged.

---

Build the friend decks feature: a friend's deck opens read-only, decks can be hidden from friends, and Settings holds the defaults. Start with `design/design_handoff_the99_friend_decks/README.md`, then `READINESS.md`. Open each `.dc.html` with `support.js` beside it. Work in a worktree under `.worktrees/`, as AGENTS.md says. Every string is a placeholder for /copy-review. Every cross-user read lives in `src/lib/social/` (`check:social-reads`).

Plan it as separate PRs in this order, behind one switch you add to `src/lib/switches/registry.ts` (needs `SOCIAL_FRIENDS_ENABLED`):

1. **The store and the reads (G1 to G3).**
   - Add `decks.hidden_from_friends` (boolean, default false) and two account prefs: `friends_see_decks` (default true) and `friends_see_unfinished` (default false). "Unfinished" means Draft or Building, as `lib/decks/status.ts` defines them.
   - Apply all three filters in ONE place that both `loadFriendDecks` and a new `loadFriendDeck(viewer, publicId, deckId)` share.
   - `loadFriendDeck` sits behind `resolveFriend` and re-reads the grant after its reads, as `loadFriendDecks` does. It returns null for a hidden deck, a deck that isn't that friend's, or a lapsed friendship. Cards come with the VIEWER's ownership and the owner's printing. No prices, notes or folder.
   - `FriendDeck` gains the deck id.
   - Cache: friend data stays keyed on `friendGeneration(viewer)`. New per-user columns and prefs need the purge test and `check:list-cache` to pass.
2. **The friend's tiles and deck page (Friend-Deck, Tiles and States boards).**
   - **Tiles:** the friend's Decks tab uses the owner's `/decks` tile (`deck-card.tsx`) read-only, without the ⋯.
     - It has the `ArtWash` cover band: 248 tall at a cell of 330 or wider, 168 under. It shows 1 column on a phone and 3 at 1300.
     - The card count is the only figure: no status pill, bar or to-buy figure.
     - The commander line shows only the colour when the deck name repeats the commander (the whole name, or the part before the comma). A pair always names both.
     - A tile with no art crop draws the commander gradient, never the full card image. Check where the Jaws image comes from (G5).
   - **Deck page:** `/friends/[publicId]/decks/[deckId]` reuses the open precon page's read-only anatomy (`open-precon-view.tsx`) with the owner's grouping.
     - The eyebrow reads "Colin's deck · read-only" with the friend's face.
     - It has the "You own N of M" band, the "Your collection" key line, List / Cards, and the basics dashed line.
     - Rows open the shipped card details, UNCHANGED: Add to wishlist stays where it ships.
     - The empty draft state is a dashed box. Anything that doesn't resolve is the shipped 404.
   - Reword the friend's empty Decks body.
3. **The owner's controls (Hide-Switch and Privacy boards).**
   - **Menu row:** "Hidden from friends" is a checkbox row above Delete in `DeckCardOverflow`, so the deck header and the `/decks` tile both get it.
     - A press ticks it, saves and closes the menu, with no confirm. A failed save shows the toast "We couldn't change that. Your deck is unchanged."
     - When it's on, the header chips row shows a "Hidden from friends" mark, the `/decks` tile shows the glyph, and `DecksMarkKey` gains an item.
     - A deck that Settings already hides shows the row ticked and locked, with "Set in Settings ›" (it opens `/settings`). Such a deck gets no tile glyph.
   - **Settings:** `/settings` gets a "Your decks" section after Spares, with the two checkboxes. The second one dims while the first is off.
   - **Privacy line:** `socialCopy.page.decksSeen` becomes three strings, chosen by the two prefs, with "Settings" as a link. The About key takes the default string.
   - Hiding never changes spares. Tonight's table and logged games keep a hidden deck's name (G4, Hugh's ruling).
4. **Carry-overs from prompt 13** (small, can ride any PR above).
   - Waiting on you: an age under an hour reads "just now", not "0h ago". A row with no art draws the card's `identityGradient` at card shape.
   - The `--fg-faint` labels and "You added X." are ratified as built.

Card view and the About entry are not drawn (G6). The About entry comes with the social line's About batch.
