# Find a friend's spares · R1

Account 1, 2026-11-22. Status: **R1.1, Hugh's answers to Q1–Q3 applied (2026-11-22).** Hugh's brief asked for a PR, so this handoff is opened as one.
Canvas (Design type): https://claude.ai/artifact/CHPopaSBebABSorfEcLyud (Main, Spares, Wishlist).

Two gaps, one goal: finding a card a friend can spare. A friend's **Spares tab** (menu and Home PR 7, Ask from the signature
card round) gains search and filters, and the **Wishlist** tile gains the deck row's friend-spare press (Social R2 R3 `Spares`
S1–S4, spare requests calls 1–6). It reverses one Social R2 R3 ruling ("spare marker ... off wishlist tiles") at Hugh's ask.
Unchanged: **Wishlist stays separate from Shopping** (wishlist printing, Hugh 2026-11-22); store choice (#3200) only changes
which store's figure the tile's price line shows, and nothing here reads a price.

Read with: `design_handoff_the99_social_r2` (R3 section), `design_handoff_the99_spare_requests`, `design_handoff_the99_collection_filter`
and `design_handoff_the99_filter_chassis`, `design_handoff_the99_wishlist_printing`.

## Calls

1. **Spares tab: the Collection's filter frame.** Above the grid, under the friend strip:
   - From 1000px, the shipped wide `FilterChassis`: search, the colour pips (Any / Exactly), `Type ▾`, `Wanted ▾`, then Sort past
     the hairline; chips and the result line on row 2 (`25 spares`, `3 of 25 spares`).
   - Below 1000px, the Collection's compact head: search; then `Filters` (badge counts dimensions) · Sort · count; the chip
     shelf only while a filter is on. `Filters` opens the Collection's sheet with three groups: Wanted, Color identity, Type.
   - **Search reads name or type.** Every word of the query must start a word of the card's name or its type line (front face
     first, as Collection's type filter reads two-faced cards). `wizard` finds Ghoulcaller Gisa, Tam and Zimone; `saga` and
     `zombie` work the same. This is the matcher Collection's search is gaining: one function, both surfaces.
   - **Filters that matter on a friend's spares:** Wanted (`On your wishlist`, `A deck needs it`), Color identity, Type. Type
     counts respect the other filters, and a type at 0 dims (collection filter decision 5). Left out on purpose: Set (a spare's
     printing is not shared), Availability and price (both describe your copies, not the friend's).
   - **Sort:** `Wanted first` (default: the shipped order, wishlist cards first, now followed by cards a deck of yours needs, then
     by name), `Name`, `Most spares`.
   - **The tile** keeps the shipped Ask tile and caption, and gains one line under `on your wishlist`: the deck page's hollow
     missing dot with `a deck needs it` / `2 decks need it`, so the Wanted filter has something to see.
   - **The line under the frame** drops `Cards on your wishlist first.` (Sort says the order now) and keeps the pods and
     `Press one to ask for it.`
   - **No results:** the shared `ZeroState`: `No spares match “saga”.` / the body / `Keep only search` (only when a query and a
     filter are both on) and `Clear all filters`.
   - **Empty and not sharing:** the shipped tab, unchanged, with no frame.
   - Query, filters and sort mirror to the address through `mirrorUrl` (`?q=`, `?colors=`, `?types=`, `?wanted=`, `?sort=`), as
     Collection's do; `?spare=` landing is unchanged.
2. **Wishlist: the friend-spare press on the tile.**
   - The deck row's press (`OtherWaysPress`'s box): outlined 26px, the spare glyph in `--fact`, `TOUCH_HIT` to 44px on a coarse
     pointer. It sits over the caption's lower right, 6px in on the phone and 8px from `md`, as the tile press's **sibling**
     (a button holds no button). The caption's second and third lines make room (38px phone, 44px `md`) only on a tile with a press.
   - One friend: the glyph. **Two or more: the glyph and how many friends** (Q2). None: nothing, no slot.
   - The request marks are the deck row's (`MarkedSpareGlyph`): accent dot when requested, green tick when accepted.
   - The meta row (`9 wanted`) gains the Shopping key's own items, `friend has a spare` and `requested` / `accepted` when drawn,
     only once a tile draws a press.
   - **Pressing it opens the shipped spares-only modal** (`SparesSheet`): `Friends with a spare`, kicker `on your wishlist`, the
     card and its buy tag, then a row per friend with `Ask` / `Ask instead` / the status word. The press is ringed while open.
     An ask from here names no deck and asks for the copies the line still wants (want minus have).
   - **Loading:** the page draws exactly as shipped. One spares read for the tab's cards lands after it (the deck page's
     provider, batched by `MAX_SPARES_BATCH`); the presses and key fade in over 160ms (none under reduced motion). A failed read
     draws nothing. No friends: no read. A friend's wishlist on their page draws no press.
3. **A Wishlist filter or sort: one sort order, no filter.** A filter would hide the cards you still need to buy, and the press
   already marks the ones a friend has. The shipped desktop `Sort:` gains `Friends' spares`: tiles with a press first, most
   friends first, then newest. Before the read lands it sorts as Newest, and re-sorts once when it lands (only when chosen). The
   phone has no Sort today and gets none (Q3).
4. **Phone and desktop:** one design. The phone's differences are the shipped ones: the compact head and Filters sheet on the
   Spares tab, and no Sort on the Wishlist.

## Settled (Hugh, 2026-11-22)

- **Q1 · The Spares frame shows always**, on any list with a spare, for a consistent experience. Empty and not sharing draw none.
- **Q2 · Glyph plus count** for two or more friends (Hugh left it to best UX): a tile has room a deck row lacks, and the count
  says how many people you can ask before you open the modal.
- **Q3 · `Friends' spares` sort kept** (best UX): it gathers what you can get from a friend without hiding anything, and only
  moves tiles when chosen.

## Files

| File | What |
|---|---|
| `Main.dc.html` | The calls, the questions |
| `Spares.dc.html` | P1–P5 phone, D1–D6 desktop: rest, type search, Filters sheet, Wanted ▾, Type ▾, no results, empty |
| `Wishlist.dc.html` | W0–W3 phone, D1–D4 desktop: loading, loaded, opened, sorted |
| `STATES.md` · `copy strings.ts` · `READINESS.md` | Every state, every new string, the verdict |
| `art/ss-*.webp` | The frames (2x), rendered from main 14f9519 |
| `scratch-gen/` | How the frames were made (`HOW.md`). Reference only; never import. |
