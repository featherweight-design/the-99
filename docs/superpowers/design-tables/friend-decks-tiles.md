# Design Property Table — Friend decks: a friend's tile and the Decks tab (PR 3)

Source: `design/design_handoff_the99_friend_decks/Tiles.dc.html`, `States.dc.html`, README call 6 and G5 (R2). Copy is
structure only here; the words are `/copy-review`'s.

| Element | Phone 390 | Desktop 1300 |
|---|---|---|
| Tab line | mono 11 `--fg-faint`, mt 12; key `lineOpen(name)` | same |
| Grid | 1 column, gap 12, mt 12 | 3 columns, gap 14 |
| Tile | r14, 1px `--border`, `--surface-inset`, overflow hidden, `@container` | same |
| Art band | 248 at a cell ≥330 (168 under), `ArtWash` cover | same |
| Deck name | display 600, 17/1.15 `--fg`, truncate, ink shadow | 15 |
| Commander line | mono 10.5/1.25 `--fg-body`; name truncates, colour stays; dropped when the deck name repeats the commander (whole or before the comma, folding case and punctuation), colour alone with no `· `; a pair names both | same |
| Footer | border-top 1px `--border`, padding 10 13 12, "N cards" mono 11 `--fg-muted` | same |
| Press | the whole tile, to `/friends/{publicId}/decks/{deckId}` | same |
| No art crop | the commander gradient (G5), never the full card image | same |
| Absent | ⋯, status pill, bar, to-buy figure, prices, buy tags | same |
| Empty tab | dashed box (shipped); body `emptyBodyOpen(name)` | same |
