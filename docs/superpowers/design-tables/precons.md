# Design table: Commander precons (R2)

Committed from `design/design_handoff_the99_precons/design-tables/precons.md` (R2). Build errata from `READINESS-audit.md` apply: the URL mirrors through `mirrorUrl`, not `replaceState`; the arrival is the shipped `ArrivalStrip`; every total is the kept count, never a literal 100. Mobile = 390, desktop = 900, from `md` up (the /decks lines follow `decks-view.tsx`'s `sm`). Values not listed are as shipped (`decks-view.tsx`, `create-picker.tsx`, `help-me-choose-door.tsx`, `decklist-group.tsx`, `decklist-group-header.tsx`, `decklist-row.tsx`).

## R2 change: /decks head on a phone

| Property | Mobile |
|---|---|
| container | grid `minmax(0,1fr) minmax(0,1fr)` (one column when the cart line is absent), gap 8, pad 12 16 4, between the button row and the shelf trigger |
| cell | min-h 52, radius 10, 1px `--border-strong`, `--surface`, pad 7 8 7 12, gap 6; the whole cell is the link |
| cart cell | ring as the approved line; title `cart.entry.titlePhone` = `Shop all decks` 13.5 / 500; meta mono 10.5 `--fg-muted` `307 · $843.99`, nowrap |
| precon cell | title `precons.door.linePhone` = `Precons` 13.5 / 500; meta mono 10.5 `precons.door.lineMetaPhone(n)` = `181 decklists` (n, the rows shown: twins folded), nowrap |
| chevron | `›` 16 `--fg-muted` |
| cost | +68px over today (two cells), +60px (one) |

## Change: /decks head

| Property | Mobile | Desktop |
|---|---|---|
| container | flex column, gap 8, pad 14 16 12 | grid `minmax(0,1fr) minmax(0,1fr)`, gap 12, pad 0 22 16 |
| order | cart line, then precon line | same, left to right |
| precon line | the cart line's box: min-h 56, radius 10, 1px `--border-strong`, `--surface`, pad 9 14, **no ring** | same |
| title | `precons.door.line` 14 / 500 `--fg` | same |
| meta | `precons.door.lineMeta(n, newest)` mono 11 `--fg-muted` | same |
| chevron | `›` 18 `--fg-muted`; the whole line is the link to `/decks/precons` | same |
| alone | full width | half-width cell (grid unchanged) |

## Component: PreconDoor (create picker)

| Property | Value |
|---|---|
| shape | `HelpMeChooseDoor` verbatim (box, head, body, CTA classes) |
| position | after `HelpMeChooseDoor`, before the search; first when `helpDoor` is off |
| copy | `precons.door.head` / `.body` / `.cta` |
| href | `/decks/precons?from=new` |
| gate | `preconDoor` prop, the page passes `PRECONS_ENABLED` |

## Route: /decks/precons

| Property | Mobile | Desktop |
|---|---|---|
| header | pad 12 16 12, border-bottom; back mono 11 `--fg-faint` (`‹ Decks`, or `‹ New deck` with `from=new`); h1 display 24; sub mono 11 `--fg-faint` `precons.list.subPhone` | pad 16 22 16; sub `precons.list.sub` |
| chassis | `FilterChassis` compact: search 44, then pips 30 + sort 44 | wide: search (flex) · `ColourPips` 26 · sort 36 |
| search | name, any commander, set code; placeholder `precons.list.search` | same |
| result line | `precons.list.result(shown, total, order)` (total, the rows shown: 181 with twins folded) | same |
| URL | `q`, `colour`, `sort=owned`; `mirrorUrl` as `decks-view` | same |
| years | gap 22, pad 16 16 24 | pad 18 22 8 |
| year head | display 17 + mono 11 `--fg-faint` count; border-bottom 1px `--border`, pb 7 | same |
| more | mono 10.5 `--fg-faint` `precons.list.moreYear` (drawn only on the canvas; the page lists all rows) | same |

## Component: PreconRow

| Property | Mobile | Desktop |
|---|---|---|
| shell | create picker row: radius 10, `--surface-rail`, 1px `--border`, pad 10 8 10 12, min-h 44, gap 11; whole row is the link | radius 11, pad 11 12 11 15, gap 14 |
| thumb | `CommanderThumb` 34 × 48 (first commander) | same |
| name | display 14.5 / 1.3 `--fg`, wraps | 16 |
| figure | mono 12 / 500 `--fg`, `precons.row.own(n, m)`; the `you own` lead mono 10 `--fg-faint` | 13 |
| commander | mono 11 / 1.5 `--fg-muted`, joined with ` + `, wraps | same |
| meta | pips 9 (WUBRG_COLOR, C `--fg-faint`), mono 10.5 `--fg-faint` `SET · month` | pips 11 |
| built | mono 10.5 `--fg-muted` `precons.row.built(deck, n)`; deck name `--fg`, underline 55% `--accent` offset 3; links to the deck | same |
| twin | mono 10.5 `--fg-faint` `precons.row.twin` | same |
| unmapped | mono 10.5 `--fg-faint` `precons.row.unmapped(n)` | same |
| chevron | `›` 18 `--fg-muted`, centred | same |

## Route: /decks/precons/[fileName]

| Property | Mobile | Desktop |
|---|---|---|
| header | pad 12 16 14, gap 12, border-bottom | pad 16 22 18 |
| eyebrow | MONO_LABEL 9.5 `precons.open.eyebrow` | same |
| thumbs | 46 × 64 each, gap 6 (two for a pair) | 56 × 78 |
| title | display 22 / 1.15 | 26 |
| commander | 13.5 `--fg-body`, ` + ` for a pair | same |
| meta | pips + mono 11 `--fg-faint` `ident · SET · set name · release` | same |
| start | dock: fixed above the tab bar, pad 10 16 12, top 1px `--border`, `--bg`; summary mono 10.5 `--fg-faint` `precons.open.dock`; `PrimaryButton` h 48 | header right, `PrimaryButton` h 40, pad 0 18 |
| own box | radius 10, 1px `--border`, `--surface-sunken`, pad 11 13, gap 8 | pad 12 16 |
| own line | 14 `--fg-body`, figure mono 15 / 600 `--fg`; basics mono 10.5 `--fg-faint` | same |
| bar | h 3, radius 2, track `--border-strong`, fill `--fg-muted` at owned share | same |
| sentences | built / twin / unmapped 12.5 / 1.55 `--fg-body`; pair line mono 10.5 `--fg-faint` | same |
| list note | mono 10.5 `--fg-faint` `precons.open.listNotePhone` | `precons.open.listNote` |
| groups | `DecklistGroup` `readOnly`, by type, gap 16 | gap 20, 2-col rows |
| group note | `precons.group.own(o, t)`; Lands + `precons.group.basics(n)`; commander group `own1` / `ownBoth` / `ownNeither` | same (header's right note) |
| group count | the cards in the group; Lands includes basics | same |

## Change: DecklistRow `readOnly`

| Property | Mobile | Desktop |
|---|---|---|
| shell | as shipped, min-h 44 | min-h 36 |
| dot | owned `--success` fill; not owned 1px dashed `--fg-faint` | same |
| right slot | mono 10 `--fg-faint` printing `SET number` (the precon's) in place of the buy tag | same |
| absent | buy tag, lock, claim, price pick, I got it, overflow menu, quick-add | same |
| press | card details on the precon's printing, deck actions absent | + `HoverPreviewProvider` |

## Component: BasicsLine

| Property | Value |
|---|---|
| position | foot of Lands, after its rows |
| box | margin-top 4, pad 8 9, radius 7, 1px dashed `--border-dashed` |
| text | `Wastes ×15` 13 `--fg-muted`; multiple joined ` · `; tag mono 10 `--fg-faint` `precons.group.basicTag` |

## Component: StartPreconDialog

| Property | Mobile | Desktop |
|---|---|---|
| shell | bottom sheet, radius 16 16 0 0, `--surface`, pad 10 18 18, gap 16, grabber | modal 500, radius 14, pad 24 24 20, ✕ 36 |
| title | display 20 `precons.start.title(name)` | same |
| lead | 13 / 1.5 `--fg-body` `precons.start.lead` | same |
| commander | `--surface-sunken` box, thumb 34 × 48, display 15, mono 10.5 `ident · 99 cards beside it` (98 for a pair) | same |
| name | MONO_LABEL `precons.start.nameLabel`; `TextField` 16px (iOS) / 14px; prefilled `name`, `DECK_NAME_MAX` | same |
| facts | rows pad 9 0, border-bottom; key 12.5 `--fg-muted`, value mono 11 `--fg-body` right | same |
| built note | S1b sentence, 12.5 `--fg-body`, above the facts | same |
| buttons | `Cancel` / `Start the deck`, h 46, flex 1 each | h 40, right-aligned |
| action | server action `createDeckFromPrecon(fileName, name)` (G8); redirects to `/decks/[id]?from=precon` | same |

## Change: arrival strip (`?from=precon`)

| Property | Value |
|---|---|
| shell | the import arrival strip: radius 10, 1px `--border-strong`, `--surface-rail`, pad 11 4 11 14, ✕ 44 |
| head | 13.5 / 600 `precons.arrival.head(name)` |
| body | 12.5 / 1.55 `--fg-body` `precons.arrival.body(own, of, toBuy)` or `bodyAll` |
| meta | mono 10.5 `--fg-faint` `precons.arrival.meta(set)` |
| lifetime | until dismissed or the first commit, per deck |

## Upcoming precons (R2): the Announced group's head and set row

From `design/design_handoff_the99_upcoming_precons/` (R2, `R2 - Precons.dc.html` C1–C3, Q1–Q3; plan
`2026-10-14-upcoming-precons.md`, E6). The R1 rows (set block, revealed card, strip, none plate, `new` tag, jump,
precon tile `new`) are that handoff's own table, `design-tables/upcoming-precons.md`, built as drawn. Behind
`UPCOMING_PRECONS_ENABLED`. Built in `announced-group.tsx`, `announced-parts.tsx`, `announced-row.tsx`.

### Component: AnnouncedGroup head (C1–C3)

| Property | Mobile (390) | Desktop (900) |
|---|---|---|
| place | above the newest year, Newest order only; hidden under Most owned and when no set survives the filters | same |
| element | `<h2>` holding a `<button aria-expanded aria-controls="announced-sets">`; the section is `#announced` | same |
| box | full width, min-h 44, 1px `--border` bottom rule, no fill | min-h 34, pad-bottom 7 |
| label | `upcoming.heading` = `Announced`, display 17 `--fg` | same |
| count | mono 11 `--fg-faint`: closed `upcoming.countNext(n, next)` = `2 sets · next Nov 13` (the next set still to come; `upcoming.count(n)` when every set is out); open `upcoming.count(n)` = `2 sets` | same |
| `new` | the `new` tag after the count while any shown set is news | same |
| chevron | `▸` closed, `▾` open, mono 12 `--fg-muted`, at the right | same |
| default | closed. Opens by itself when a set is news (unseen, arrived within 30 days) or the address is `#announced`; otherwise this browser's last press (`the99:precons:announced`, `open` or `closed`) | same |
| motion | row-track collapse, 160ms ease-out; none under reduced motion. Closed, the region is `inert` and hidden | same |
| focus | 2px `--accent` outline, 2px offset, 4px radius | same |
| gap to first year | 22 | 22 |

### Component: AnnouncedRow (rows view, Q2–Q3)

| Property | Mobile (390) | Desktop (900) |
|---|---|---|
| shell | 1px dashed `--border-dashed`, radius 10, no fill | radius 11 |
| press | an `<h3>` holding a `<button aria-expanded>` over the row, pad 10 8 10 12, gap 11; none (and no chevron) with nothing revealed | pad 11 12 11 15, gap 14 |
| thumb | the first revealed card, `CommanderThumb` `list` (34 × 48), as `PreconRow`'s; the empty plate (`--surface-sunken`, 1px `--border`) with none | same |
| line 1 | name display 14.5 `--fg`, the `new` tag beside it; right: `upcoming.until(c)` = `in 30 days` (or `upcoming.outShort` = `out`) mono 11 `--fg-body`, then the chevron `--fg-faint` | name 16, when 12 |
| line 2 | mono 11 `--fg-muted`, one line: `upcoming.more(first, n)` = `Christine Chapel, Combat Medic and 14 more`; every name with one or two; `upcoming.noneRow` = `No commanders revealed yet` | same |
| line 3 | mono 10.5 `--fg-faint`: the set's dots (9px; its commanders' identities), then `TRC · Nov 13, 2026` | dots 11px |
| opened | the set's strip under a 1px dashed `--border-strong` rule, pad 12 0 12 12, one row scrolling sideways, bleeding to the right edge | pad 12 15 14, wraps |
| default | closed every visit | same |
