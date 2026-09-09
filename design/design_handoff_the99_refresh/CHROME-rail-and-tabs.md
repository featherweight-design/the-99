# Chrome — the rail, the tab bar, and one retired adjudication

`design/design_handoff_the99_refresh/` · 2026-09-07

## The rail, desktop

62px, `--surface-rail`, 1px `--border` on the right.

- **Diamond**, 26px, rotated 45°, 1.5px `--accent`. Top, 16px below it before the first item.
- **Four items**, 38px square, 10px radius, 4px gap. Active: `--elevated` fill, `--fg` icon.
  Rest: `--fg-faint` icon, no fill. Icons are 19px, `currentColor`, 1.5px stroke, round caps.
- **Avatar**, 30px circle, `--surface` on a `--border-strong` hairline, pinned to the bottom.

Order is `src/components/shell/nav.tsx`'s `ITEMS`, unchanged: **Home · Collection · Commanders ·
Decks**. Locked items keep today's behaviour — `--fg-faint`, non-interactive — and the icon is
locked with them.

## The retired adjudication

`nav.tsx:20` reads:

> `// Adjudication #1: no <Mark> icons inside rail nav items — Diamond + label ONLY.`

**This refresh retires it, on client instruction.** The reason the ruling existed still holds where
it was made — the Mark inside a nav row was a second logo — but a 19px stroke glyph is not the Mark,
and at 62px the rail has no room for labels. Two consequences to handle in code:

1. The rail is now **icon-only at desktop width**. Every item needs an `aria-label` and a tooltip;
   the label text does not disappear from the accessible name.
2. The diamond stays, once, at the top. It is the app mark, not a nav item. Do not repeat it per row.

If the ruling is reinstated instead, the rail widens to hold labels and the icons come out — those
are the two coherent options. A 62px rail with labels is not one of them.

## The tab bar, phone

Bottom, `--bg`, 1px `--border` top, 8px padding with 14px bottom for the home indicator.

- Four items, `flex:1`, 52px tall, 12px radius, icon over a 9px mono label at 0.06em.
- Active: `--surface-inset` fill, `--fg`. Rest: `--fg-faint`.
- Same four icons, same order as the rail. **Slots must not transpose between the two** — this was
  caught in review once already.

## Targets and floors

| | Desktop | Phone |
|---|---|---|
| Buttons | 32px tall | 44px |
| Icon-only controls | 32px (26px on tile art) | 44px |
| Filter chips / facets | 32px tall | **44px** |
| Sort and view controls | 32px tall | **44px** |
| Body copy | 12.5–13px | 13.5–14px |
| Mono data | 10.5–13px | 10.5–12.5px |

**The phone column is a floor, not a starting point.** Every row of it is 44px, including rows whose
desktop twin is 32px — a control that measures 32px at 390px wide is under the floor even when its
desktop value is correct. The two bold rows were added in R3 because the shipped facet strip and
coverage-sort read their heights unprefixed and inherited the desktop number.

The 26px `…` on a deck tile is the one sub-32px target at desktop, and it sits inside a tile that is
itself clickable, so the small target is a shortcut rather than the only route. **That exemption does
not generalise.** It rests on there being a second, larger route to the same action; a facet chip, a
sort control and a submit each have no second route, so none of them may sit under the floor.

## Hairline pill — two variants, and only two

**Default.** Every action pill in the app: header buttons, row actions, dialog secondaries,
the `Order` and category controls, Import, Clear, Add.

| Property | Desktop | Phone |
|---|---|---|
| height | 32px | 44px |
| side padding | **14px** | **16px** |
| border | 1px `--border-strong` | 1px `--border-strong` |
| radius | 8px | 10px |
| label | 12.5px, weight 500 | 14px, weight 500 |

**Dense chip.** The facet strip only — a horizontally scrolling row of many chips, where the
default's side padding costs a visible chip per screen.

| Property | Desktop | Phone |
|---|---|---|
| height | 32px | **44px** |
| side padding | 12px | **12px** |
| border | 1px `--border-strong` | 1px `--border-strong` |
| radius | 8px | 10px |
| label | 12.5px, weight 500 | **13px, weight 500** |

The height floor is identical in both — that is the accessibility number and it does not flex. Only
padding and label shrink, and only where many chips compete for one row. **A control that is not in
a scrolling chip row uses the default; there is no third variant.** If a surface seems to need one,
it is a signal that the surface has too many controls, not that the table is short a row.

14px/16px is the ratified default padding. The R2 frames drew 13px on desktop; **the frames were
wrong and have been corrected** — the constant does not move to match a drawing that was off by a
pixel.

## Filter surfaces

| | Desktop | Phone |
|---|---|---|
| Container | 262px persistent column, `--surface-rail` | Sheet over a 74% `--bg` scrim, 22px top radius |
| Search | Top of the column, 34px | Top of the sheet, 44px |
| Behaviour | Filters on tick | Filters on tap |
| Commit | None. **Clear** only | Button dismisses; **Clear** clears |
| Active filters | Rows highlighted in place | Removable chips under the header |

The sheet's primary button says `Show N decks` and only closes the sheet — the filtering already
happened. Swiping the sheet away loses nothing.

## Locked chrome — first run

While the collection is unread, Collection, Commanders and Decks are inert in both the rail and the
tab bar: `#4A4033` icon and label, no fill, no hover, not focusable as links. The rail adds a 34px
`--border` divider under the fourth item and a 14×16 padlock glyph below it, once — not per row.
Home stays fully active and is the only route.

Dimming alone is not the affordance: each locked item keeps its accessible name plus the reason
(`firstRun.lockedItemAria` — *"Decks — unlocks once a collection is read"*), and the two locked
checklist cards state their unlock condition in visible copy. Nothing on this screen is disabled
without saying why.

## Header actions — Decks

Desktop, left to right: view toggle, `Sort · …`, **Import** (hairline), **New deck** (bone fill).
Import is a peer, not an overflow item — it is a first-session route and it does not survive being
hidden. Phone puts **New deck** and **Import a deck** full-width side by side under the header row,
New deck first, both 44px. The header keeps this shape at zero decks; only the grid below changes.
