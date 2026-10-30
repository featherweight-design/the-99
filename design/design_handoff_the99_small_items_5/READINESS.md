# Readiness: small items 5

**Verdict: Green.** Approved by Hugh on 2026-10-30 ("This all LGTM"), the recommended call on every item. Nothing below blocks the build, and the three items are independent.

## For Hugh

1. **Copy.** New or changed strings for `/copy-review`:
   - *tag a card* (now in every tag box; shipped already in Suggested changes v2)
   - *Add a note* (the deck notes placeholder, replacing *Add a note. Type [[ to tag a card.* and *Add a note · [[ tags a card*)
2. **About.** No About change: nothing here adds a feature a reader looks up.

## For engineering, by item

1. **Tag a card.**
   - One shared framed box with the foot (key, *tag a card*, counter), lifted from `TuningNotesField framed`; used by `DeckDescriptionField`, `DescribingInPlace`, Help me choose's Anything else?, `NoteField` (add and edit), the deck page header description (`spine-desktop.tsx`, `spine-mobile.tsx`) and the game-log note.
   - The key: 24px drawn, 44px hit box on a coarse pointer by padding (amends the shipped framed box), lit while a tag is open.
   - Counter always drawn; each box keeps its cap and warn mark.
   - `TagHelpRow`'s button and the intake header's 28px button go; ⓘ tips stay where they are.
   - Deck notes: the action row is Add (+ Cancel in edit) only; the deck notes R4 key and the shipped counter/key in the row go.
2. **Precon page header art.** The open precon head uses 64×89 below `md` and 84×117 from `md` (`CommanderThumb` sizes), radius 6.
3. **Empty What's new.** Never chosen and nothing in the window: `Quiet` (shipped copy) + the offer line; `OptIn` retires. The offer line is the same component the rows state uses.

## Errata

- `design_handoff_the99_deck_notes/ERRATUM-tag-control.md`: the tag key and counter move into the field's foot.
- `design_handoff_the99_announcements/ERRATUM-offer-empty.md`: the empty, never-chosen box draws the quiet line and the offer line.
