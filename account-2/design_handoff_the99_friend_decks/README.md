# The 99 — friend decks and the hide switch (design handoff · R2)

Account 2, 2026-10-22. Brief: Hugh's prompt in the project chat (a friend's deck opens; a deck can hide from friends).
Builds on `design/design_handoff_the99_menu_home/` and the friend page shipped in #2186/#2193.
Canvas: https://claude.ai/artifact/Lp7STLn5477dNk36vRbPwr

**Status: R2, awaiting Hugh's audit.** R2 answers Hugh's R1 feedback: no deck status for friends, card details left as shipped (Add to wishlist where it already is), and Settings defaults that hide drafts and building decks, plus a global switch. Every string is a placeholder for `/copy-review`. Orange dashed outlines mark what is new against the shipped page.

## Calls

**1 · A friend’s deck opens, read-only.** Every tile on a friend’s Decks tab is now a press. It opens the deck at `/friends/{publicId}/decks/{deckId}`: under the friend, so the back link is theirs, the Friends slot stays lit, and the friendship is what reads it. Not under `/decks`: that route is yours and edits. The page is the **open precon page’s anatomy**, the app’s one read-only deck list, with the owner’s grouping (by type, A–Z, commander first).

**2 · What a viewer may still do.** **Open card details** (a row is the press; Prev and Next page through Colin’s list in order). **Wishlist a card** from the details’ shipped Wishlist box. **See what they own**: the row’s dot, “You own N of M of its cards”, and each group’s “you own N of M”. Switch **List / Cards** and get the hover preview, as on a precon. Nothing else: no ✕, stepper, buy tag, auto tag, proxy, lock, to-do card, tabs, notes, Update, Export or ⋯. **R2:** card details are the shipped ones, untouched: Add to wishlist stays in the full sheet (swipe up on a phone) and in the desktop details column, where it already is.

**3 · Design’s calls.** **R2: no status.** A friend’s tile and deck page drop the status pill, the bar and the to-buy figure: “To buy” is Colin’s errand, not yours. They show the card count alone. **Price and buy tags: not shown.** They are Colin’s figures, and the read-only row draws none. Card details keep the card’s catalog price, which is nobody’s. **The viewer’s own marks: shown**; “do I have this?” is why you open a friend’s deck. The dot means *your* collection here, so a one-line key says so. **URL**: under the friend’s page (call 1).

**4 · Hidden from friends.** A checkbox row in the deck’s **⋯ menu**, above Delete. It is one menu (`DeckCardOverflow`), so the deck page header and the /decks tile both get it. A press ticks it, saves, and closes the menu. No confirm, since it undoes the same way. On: a quiet **Hidden from friends** mark in the header’s chips row, and on /decks the glyph in the tile’s chips row, explained in the /decks key. Off by default; drawn only with `SOCIAL_FRIENDS_ENABLED`. Hiding changes nothing about spares: the deck’s cards still count as in use.

**4b · R2: defaults and the global switch, in Settings.** /settings gains **Your decks**, after Spares: **Friends can see my decks** (on) and under it **Include drafts and decks I’m building** (**off by default**). So out of the box friends see Complete, To buy and Over decks, never Draft or Building. The per-deck row still hides any one deck. A deck Settings already hides shows its ⋯ row ticked and locked, with “Set in Settings ›” under it (the press opens Settings). The /decks glyph marks only a deck hidden on its own: the Settings rule is stated once, not on every draft.

**5 · The privacy line, and absence.** /friends now reads **“Friends can open your full decks and see their lists. Change this in Settings.”**, changing with Settings (Privacy board). A hidden deck is simply absent for friends: no tile, the Decks count drops, nothing says one is hidden. Its link is the app’s 404, the same page a deleted deck gives, so the two can’t be told apart. **Confirmed.**

**6 · The friend’s tile: the /decks tile, read-only.** The tile becomes the owner’s /decks tile without the ⋯: the same art band (248 tall in a cell of 330 or wider, 168 under), 1 column on a phone and 3 at 1300 (was a 120px band, 4 across). The band is about the art crop’s own 1.37:1, so the commander stays in frame. **The commander line drops the name when the deck’s name repeats it** (whole, or the part before the comma) and shows the colour alone.

**7 · Carried over from prompt 13.** Waiting on you: `--fg-faint` for the time and a seen row’s kind is **ratified** (the board’s `--fg-locked` was a slip). **Under an hour reads “just now”**, not “0h ago”. No face: the initials tile, as built. No art: the card’s identity gradient at card shape, the collection grid’s rule. Home feed: **“You added X.” is ratified**; the board’s “Your last upload added” was wrong once hand adds and Mark bought made pairs too.

## Gaps for engineering

- **G1 · The friend deck read.** `loadFriendDeck(viewer, publicId, deckId)` behind `resolveFriend`, the grant read again after the reads (as `loadFriendDecks` does). Returns null for a hidden deck, a deck that isn’t theirs, or a lapsed friendship. Cards come with the viewer’s ownership joined from the viewer’s collection and the owner’s printing for card details. No prices, no notes, no folder.
- **G2 · The switches.** `decks.hidden_from_friends`, boolean, default false, written by one deck action from the menu; and two account prefs, `friends_see_decks` (default true) and `friends_see_unfinished` (default false; unfinished = Draft or Building, from `lib/decks/status.ts`). Filtered in `loadFriendDecks` and G1, so both agree in one place. A failed write is a toast: “We couldn’t change that. Your deck is unchanged.”
- **G3 · The tile needs an id.** `FriendDeck` gains the deck’s id (the tab’s comment says nothing carries one today), to build the link. The tile’s art keeps `commanderArtCropUri`.
- **G4 · Other places a deck name reaches a friend.** Tonight’s table and R3’s logged games name the deck a friend played against. Recommended: they keep it, since it was shown at the table. **Hugh to confirm**: the ruling says “entirely”.
- **G5 · The Jaws image.** Engineering checks its source. Whatever it finds, a tile with no art crop draws the commander gradient (as the /decks tile does), never the full card image, which is what puts “LEGENDARY CREAT…” in the band.
- **G6 · Not drawn.** Card view (`ReadOnlyCardTile`, as the precon). The About entry for this line comes with its own round.

## Boards

| File | What |
|---|---|
| `Main.dc.html` | Main · the round, calls, gaps |
| `Friend-Deck.dc.html` | 1 · A friend’s deck, opened (phone, desktop, card details) |
| `States.dc.html` | 4 · Long lists, empty, gone |
| `Tiles.dc.html` | 5 · The friend’s deck tile and the art crop |
| `Hide-Switch.dc.html` | 2 · Hidden from friends (⋯ menu, header mark, /decks tile and key) |
| `Privacy.dc.html` | 3 · The privacy line and absence |
| `Carry-Overs.dc.html` | Carried over from prompt 13 (Waiting on you, Home feed) |

Open the `.dc.html` files next to `support.js` and `art/`. `scratch-gen/` holds the generator: `fdk.py` and `boards.py` are this round, `kit.py`, `parts.py` and `render.py` come from menu_home's scratch-gen. `python3 build.py` writes `out/`; `python3 build.py blob <dir>` writes the canvas copy using `blobs.json`.
