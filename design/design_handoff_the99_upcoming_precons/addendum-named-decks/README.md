# Addendum A2 · Announced lists every named deck (#2981)

Account 2, 2026-11-20. Canvas: https://claude.ai/artifact/Um5JvHD8ZuAjWBLZuvxV8c (Main, Options, Phone, Desktop).
Builds on this handoff (STATES T2, rule 1, addendum A1) and `design_handoff_the99_announcements` (STATES 3.1, 3.2,
`NonePlate`, `WaitingRow`). Locked by the brief: every deck in the set is listed, even with no commander or art; a
non-English scan shows as it is until Scryfall replaces it.

## Calls

1. **Named deck tile.** `PreconTile`'s shell and size, dashed edge, transparent fill (dashed = nothing to open). Art box:
   sunken, the brand's three diamonds, `commander not revealed yet`. Caption: `list to come`, then the deck name. No dots,
   no press, no hover. Replaces the none plate whenever the set has deck names; the plate stays only for a set with no
   names and no reveals (T2). When its list posts, it becomes the shipped early tile in the same slot; decks keep the
   Collecting post's order.
2. **Revealed commanders (option A, recommended).** A strip under the deck grid in the same dashed block, under
   `Revealed so far · not matched to a deck yet`: the shipped `RevealedStrip` cards (76 x 106 / 84 x 117), each opening
   card details. A commander leaves once a posted list names it (`waitingCommanders`); the strip goes when empty. Never
   guess a match. Option B (one grid, sub-line `revealed · deck not known`) drawn for comparison.
3. **Count.** Names known, no list: `4 decks`. Lists posting: shipped `1 of 4 lists so far`, promised taken from the
   names. All: `All 4 lists`. No names: shipped. Rows line 2: `4 decks · Jace and Sai revealed`.
4. **`N more lists to come`** retired once every deck name is known; kept only when a decklist post promises more lists
   than names known.

Rows view: opened set row lists each named deck as a dashed row (plate thumb with the mark, `list to come`), then
waiting commanders as the shipped `WaitingRow`, line now `revealed · deck not known yet`.
Filters: named decks match by deck name; a color filter drops them (no colors yet). Fold (A1) counts deck tiles only;
the strip never folds.

## Gaps

- G1 Fixture: code `NAU`, date and commander art are stand-ins (Scryfall blocked); deck names are Wizards'.
- G2 Matching a posted list to a named deck: normalized name match, else a new tile (engineering).
- G3 Copy DRAFT for /copy-review: `commander not revealed yet`, `list to come`, `Revealed so far · not matched to a deck
  yet`, `N decks`, `revealed · deck not known yet`.

Generator: `account-2/design_handoff_the99_upcoming_precons/addendum-named-decks/scratch-gen/` on `design-assets` (5e30a7d).
