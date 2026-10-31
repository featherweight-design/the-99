# The 99 · Add a card from anywhere (account 2, 2026-10-31)

Canvas: https://claude.ai/artifact/H7MN6m1GmYLqBVR8SQiN3D
Brief: `docs/superpowers/design-briefs/2026-10-31-add-card-from-anywhere.md` (Hugh's ruling locked).
Status: **R2.** Hugh picked C with D under it (2026-10-31) and asked how it reads beside the deck page's own search (the dock). R2 adds `Dock.dc.html`. Awaiting Hugh's review.

Every frame is drawn over the shipped app's own captures (about_visual `art/`, copper theme) at 390 and 1300, with the
header, tab bar, rail, search rows and sheets redrawn from `src/` (`shell/nav.tsx`, `card-search/search-row.tsx`,
`collection/add-cards-sheet.tsx`, `cards/card-modal.tsx`, `collection/edit-copies-sheet.tsx`). New parts carry a dashed
copper outline. Strings that are not shipped go through `/copy-review`.

| Board | What it holds |
|---|---|
| `Main.dc.html` | The four directions side by side, the recommendation, open questions |
| `A-Nav.dc.html` | A · Add as a sixth tab / a rail slot under Friends |
| `B-Header.dc.html` | B · a + beside search in the phone header / under search in the rail |
| `C-Search.dc.html` | C · a + on every search row, and an Add several row in the open search (recommended) |
| `D-Card.dc.html` | D · card details' Add to collection on every surface, not only /collection |
| `Dock.dc.html` | R2 · the dock stays the deck's search: new placeholder (DRAFT), one bridge press in its Owned-only empty state |
| `Shared.dc.html` | The pack (a list of five, scan route), saved, the way back; the calls every direction shares |

## The directions

- **A · Nav slot.** Six tabs at 390 (62.3px slots; `Commanders` 59.4px at 9px), 57.3px at 360 with the shipped 8.5px
  rule. Desktop: a 38px slot under Friends after a 24px rule. Opens the shipped sheet. Offline: stays; the sheet's search fails as shipped.
- **B · Header +.** 44px + between search and ?. Worst online case (install slot showing) is 378px, so the install
  slot's crowd rule gains one width: it steps aside below 379px while the + shows. The + steps aside offline (nothing it
  opens works offline; with the pill the header has 3.6px at 390). Desktop: a slot under search, above the rule; places move down 42px.
- **C · Search adds.** A 44px + (34px desktop) at the end of each search row, after the bookmark; the rest of the row
  still opens card details. `Add several cards` (the sheet's way-row shape) above Recent cards opens the sheet empty.
  ⌘↵ adds the active row (proposal). + opens Add cards with the card on the list, printing step open, no default.
  Done returns to the search as it was, the row ringed and reading ×1 owned. Offline / switch off: as shipped.
- **D · The card is the entry.** The receipt heading's `Add to collection` / `Edit copies` link drawn wherever card
  details opens (today: /collection only). Opens the shipped Edit copies sheet (`sheetSubNone`, new printing picker).
  Saved: receipt ×1, shipped toast with Undo, the deck row takes the owned dot.

## Calls every direction shares (open calls 3–6)

1. What opens: shell entries open the shipped Add cards sheet empty; search's + opens it with the card on the list;
   card details keeps the shipped Edit copies sheet. No new lighter step.
2. Per card and per list: both. D is the per-card floor under any shell entry.
3. After saving: the surface updates in place (search row ×1 owned, deck row's dot); a brief ring on the changed row is the only new piece.
4. Reach: every signed-in surface with the shell, a friend's deck included; not the public card page.
5. Switch off: every entry sits behind the collection edit switch; off, each surface is as shipped, no gap.

## R2 · the deck's dock

- The dock adds to the deck; search adds to the collection. The dock's placeholder becomes *Add to this deck by name · {identity} only* (DRAFT).
- No collection control on dock rows.
- With Owned only on and nothing owned matching, the shipped empty state gains *Add a card to your collection* (DRAFT) above *Search all cards instead*: it opens Add cards with the dock's query carried; Done returns to the dock as it was, the card now ×1 owned with the deck's Add.
- Owned only off: unowned rows as shipped; the row's name opens card details, where D's link is.
- Switch off: the shipped dock.

## Recommendation

**C, with D under it.** No room in the phone header, a bar full of places; search is already one press from every
screen and is where a reader finds the card they pulled. D closes the brief's named gap whichever is picked.
Not explored: an Add row in the account menu (Hugh's rule keeps rows out of the user menu).

## Open questions for Hugh

1. Which direction (A, B, C, D, or C with D)?
2. C's ⌘↵ keyboard add: keep or drop?
3. Reach: friend's deck yes, public card page no?

`scratch-gen/` holds the generator: `lib.py` plus one module per board; `python3 build.py out m:Main a:A-Nav …`, then
`node render.js <abs out> Main …` sets each board's preview size and reports broken images and overflow; `canvas.py`
swaps `art/` for the canvas's `/_blob/` urls (`blobs.json`).
