# Deck page loading skeleton (flip and open)

Approved by Hugh 2026-11-21 (R1): "Can we keep these both as options based on the technical considerations? A is ideal, but B is a good fall back." Then: "This loading state should also be shown when opening a deck." Builds on the shipped flip strip (`design_handoff_the99_deck_flip_order/`, `src/components/decks/deck-flip-strip.tsx`).

Boards: `Main` (the calls), `Today` (what a flip shows now), `OptionA` (the build), `OptionB` (its fallback), `Open` (opening by a link). Frames are renders of the shipped shell, `SpineMobile` / `SpineDesktop` and `DeckFlipStrip` with the shipped CSS (kaldheim, main 728de56); the body skeleton is drawn in the app's classes and skeleton tokens. `scratch-gen/` holds the render script and stubs. Round history: design-assets `account-2/design_handoff_the99_deck_flip_skeleton/`.

## Today
`src/app/decks/[id]/loading.tsx` draws the shared crown `LoadingScreen` ("Shuffling up / counting the 99…"). On a flip the strip, header and place in the list vanish until the next deck lands.

## 1 · Where it shows
Every open of the reader's own deck at `/decks/[id]`: a flip (‹ › or ← →), a deck tile, a link, a reload. Precons (`/decks/precons/…`), friend decks and the deck's sub-routes (`changes`, `import`) keep their own loading screens.

| Entry | Header facts in hand | Draws |
|---|---|---|
| Flip (strip or keys) | yes, from the flip list | **A**, strip with the new place (`3 of 5`), live |
| Deck tile on /decks (`DeckCard`) | yes, the tile's deck | **A**, strip with its place (the list is written as today) |
| Deck tile on Home (`ResumeDecks`) | yes | **A**, strip row held with `‹ All decks`; count and arrows land with the page |
| Anything else (card rows, history, notification, link, reload) | no | **B**, strip row held with `‹ All decks` |

A deck whose facts are present but whose art crop is null draws A with the shipped no-crop band.

## 2 · A · The header lands at once (the build)
- Header = the shipped band at each width, fed from the facts: commander art crop, deck name, colour identity + commander line (partner too), status chip, count `built / 99`, and the actions (the same on every deck). Bracket chip and notice tag arrive with the page; no shape is held for them. Rename pencil and actions are inert until the page lands.
- Strip = the shipped `DeckFlipStrip`, live on a flip: a further press re-targets.
- Neighbour art is preloaded with the strip's existing prefetch, so a flip paints the band at once.

## 3 · B · All shapes (A's fallback)
The same skeleton with the band at its shipped height on `--surface-sunken`, no art; name and commander line as bars; status and count as shapes; corner buttons hidden. Strip row and actions stay real. If the header facts cannot reach the loading screen at all, B ships alone (say so in the PR).

## 4 · The body (both)
`aria-hidden`, on the shipped 1.4s `anim-skeleton` pulse (still under reduced motion), shipped `BAR` and `--surface-*` tokens:
- To-do card shell: heading bar + count bar, one step row (eyebrow, title, phone second line, button shape), foot bar.
- Mix: caption bar, five cells (phone: centred label/number/foot; desktop: label, number, track, foot), why bar.
- Tab row in real words (`Your deck`, `Analysis`, `Consider`, `Games`, `Versions`), the kept `?tab=` underlined, counts as small bars.
- Your deck: sub-tab chassis and tool shapes (phone two rows; desktop one row), a type heading bar, card rows at the one-line row height (9 phone, 6 desktop). Other tabs: plain rows after the tab row.
- sr-only `role=status`: `Opening <deck name>` (B: `Opening your deck`). Carries `StallWatch` and `data-loading-screen` like the precons skeleton.
- Landing replaces it in place at the top, no fade; the tab is kept as today.

## Copy (DRAFT)
`Opening <deck name>` · `Opening your deck`.
