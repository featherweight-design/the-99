# Design table: Jottings (deck notes, R1)

**Commit to `docs/superpowers/design-tables/jottings.md`.** Mobile = 390, desktop = 900, from `md` up (as `builder-tabs.tsx` and `games-panel.tsx`). Values not listed are as shipped.

## Placement

| Property | Mobile | Desktop |
|---|---|---|
| mount | first child of the `deck` panel (`builder-shell.tsx`), before the phone toolbar row and the decklist | first child of the `deck` panel, before the decklist |
| panel pad | 14 16 (as the panel) | 18 30 |
| gap to the decklist | 16, then 1px `--border` rule, then 16 | 18 · rule · 18 |
| gate | `DECK_JOTTINGS_ENABLED` | same |

## Component: JottingsBlock

| Property | Mobile | Desktop |
|---|---|---|
| stack | flex column, gap 8 | gap 6 |
| heading | button, min-h 28 (44 hit), `▾`/`▸` mono 9 + `h2` mono 10 uppercase .14em `--fg-faint` | min-h 24 |
| heading note | mono 10 `--fg-locked`: `jottings.head.note` (`oldest first`) or `.noteEmpty` with no jottings | same |
| list | `ul`, gap 4 | same |
| show all | `Show all N` mono 11 `--fg-muted`, min-h 44, after 6 rows | min-h 30 |
| open state | `localStorage` `the99:jottings-open:{deckId}`, default open | same |

## Component: JottingRow

| Property | Mobile | Desktop |
|---|---|---|
| shell | `li`, radius 9, `--surface`, 1px `--border`, pad 10 10 10 12, min-h 48, gap 12, align start | pad 7 8 7 12, min-h 40, gap 11 |
| box | `input type=checkbox` sr-only + 22×22 drawn box, radius 5, 1px `--border-strong`; hit area is the 44 cell | 18×18, mt 2 |
| box selected | `--elevated` fill, 1px `--fg-locked`, ✓ mono 12 `--fg-muted` | ✓ 11 |
| text | 14 / 1.5 `--fg`, `overflow-wrap:anywhere`, no clamp | 13.5 |
| date | under text, mono 10 `--fg-locked` | right, mono 10.5, pt 5, nowrap |
| actions | `⋯` 44×44 `--fg-muted` → anchored panel `Edit` · `Delete` | ✎ and × 28×28 `--fg-locked`, hover `--fg` / `--danger` |
| done row | no fill, text `--fg-faint`, tags `--fg-muted` | same |
| format | `formatJottingDate`: `d MMM`, + ` yyyy` outside the current year; done `done d MMM` | same |

## Component: JottingTag (inline)

| Property | Value |
|---|---|
| element | `button` inline, no padding, `font: inherit`, 500, `--fg` |
| held | `border-bottom: 1px solid var(--fg-faint)` |
| not held | `1px dashed var(--fg-faint)` |
| unresolved | `span`, plain `--fg-body`, no underline |
| done | `--fg-muted`, underline `--fg-locked` |
| press | `useCardDetail().open(oracleId)` with the deck's provider |
| hover (desktop) | shipped card hover preview |
| focus | 2px `--accent` ring, offset 2 |
| aria | `{Name}, card details` |

## Component: JottingInput (add and edit)

| Property | Mobile | Desktop |
|---|---|---|
| field | `input type=text`, min-h 48, pad 11 13, radius 8, `--surface-sunken`, 1px `--border-strong`, focus `--accent` | min-h 40, pad 9 12 |
| text | 14 / 1.5 | 13.5 |
| placeholder | `jottings.add.placeholderShort` `--fg-faint` | `jottings.add.placeholder` |
| add button | hairline, h 48, pad 0 16, 14 / 500; disabled `--fg-disabled` | h 40, pad 0 14, 12.5 |
| hint | none | mono 10 `--fg-locked` `jottings.add.hint` / `.hintTyping` |
| counter | mono 10, right, from focus; `--warning` at 120; `n / 140` | same |
| maxLength | 140 rendered characters (tags count as their names); enforced in the action and `deck_notes_body_length_check` on the rendered length | same |
| enterkeyhint | `enter` | — |
| edit buttons | `Save` bone `PRIMARY` h 44 · `Cancel` hairline h 44 | h 32 |
| error | `MutationError` | same |

## Component: CardTagPicker

| Property | Mobile | Desktop |
|---|---|---|
| trigger | `[[` before the caret, with no `]]` after it | same |
| panel | `ANCHORED_PANEL_CLASS`, full field width, top 54; page scrolls the field under the deck bar | 440 wide, top 46 |
| role | `listbox`, field `aria-controls` + `aria-activedescendant` | same |
| section head | mono 9.5 uppercase .14em `--fg-faint`, pad 8 12 4 | same |
| sections | `In this deck` (local, from the first letter) · `Any card` (`searchCards` picker mode, from 2 letters, 150ms, deck matches removed) | same |
| row | min-h 48, pad 4 12, gap 10; thumb 24×34; name 13.5 (match 600); meta mono 10 `--fg-faint` | min-h 42 |
| limits | 4 visible, 5 per section | 5 per section |
| active | `--elevated` | same |
| footer | none | mono 10 `--fg-locked` `jottings.picker.keys`, top 1px `--border` |

## Storage

| Property | Value |
|---|---|
| table | `deck_notes` per lock 1 |
| body | text with tags stored as `[[oracleId|Name at pick]]`; render resolves the id to the current name, then falls back to the stored name as plain text |
| caps | rendered length ≤ 140 (check constraint on a generated rendered-length or in the action; engineering's call, G4); ≤ 100 rows per deck (action check + count in the insert) |
| order | open: `created_at asc`; done: `done_at desc` |
