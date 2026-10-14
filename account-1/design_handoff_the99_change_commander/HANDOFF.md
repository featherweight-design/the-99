# Change commander — handoff package (R1)

**Canvas:** `The 99 - Change Commander.dc.html` (pan/zoom; `theme` in Tweaks).
**Brief:** `docs/superpowers/design-briefs/2026-09-24-alternate-commander.md` (main). §2 rulings and §5 are
taken as locked; this package answers §4's seven calls. Behind `CHANGE_COMMANDER_ENABLED` (§7).
No About entry this round.

Read with `STATES-change-commander.md`, `change-commander - copy strings.ts`, `READINESS.md`.

---

## 1 · The door (§3.1, §4.1)

> **R2 supersedes the placement below.** See the canvas §R2: R2-A (a plate on the art beside *Card details*,
> ⇄ at 15px `--fg`) or R2-B (an *Edit deck ▾* menu). The table below is R1, kept for reference.

First in the header's action row, both widths.

| | Desktop (`spine-desktop.tsx` action row) | Phone (`spine-mobile.tsx` button row) |
|---|---|---|
| Element | `GhostButton`, h 32, px 14, sans 12.5/600 | the row's ghost, min-h 44, px 9, mono 11 |
| Glyph | `⇄` mono 12, `--fg-faint`, gap 7, aria-hidden | `⇄`, gap 6 |
| Label | `Change commander` · pair `Change pair` | same |
| Order | Change commander · Update from a list · Export (Export stays the one filled button) | same, centred, wraps |
| Shown | whenever the deck has a commander, empty list included | same |

Phone fit: the three buttons measure ~352 of the row's 358px for a single; the pair's label is shorter.
Below that, the row's existing `flex-wrap` takes a second line; no truncation.

**Not on the commander line.** `spine-mobile.tsx:77`: the meta row is `flex-nowrap` and counted as one line
by `labelAtPx`; on desktop the names already ellipsise under ~1085px of row, and a pair's partner name is a
44px `CardDetailTrigger`.

## 2 · The list (§3.2, §4.2–4.5, §4.7)

A `ModalChrome` body. **Needs a 700 slot** (already in `WIDTH_CLASS`). No `mark`. Title
`Change commander` / `Change pair`; aside the deck's name. Ground `--surface-raised`. Phone: sheet from 52,
43px header, as every body. `backLabel` defaults to the title, so a card opened from a name reads
`← Change commander`.

### 2.1 Body, top to bottom (padding 16 18 22, gap 16)

1. **Lede** sans 13.5/1.55 `--fg-body` (`copy.lede`), then **counted note** mono 10.5 `--fg-faint`
   (`copy.counted(n)`): the denominator, and that basics and universal staples are left out. Said once here
   so no row repeats it.
2. **Groups**: `Yours · n` then `To buy · n`. Heading mono 10.5 uppercase 0.16em `--fg-faint`, right note
   mono 10 `--fg-locked`, rule `1px --elevated` under, as the review columns' headings. A group with no rows
   is not drawn. With no Yours, the line `You own none of them yet.` (mono 11 `--fg-muted`) sits above To buy.
3. **Show more** under To buy only: `Show 8 more` mono 11 accent dotted, then `n left` `--fg-faint`, 44px.

### 2.2 A row

`[thumb 56×41] gap 12 [column]`, padding 11 0, rule `1px --border` under.

- **Thumb**: art crop, radius 6, `1px --border-strong`. A pair splits it 28/28 with a `1px --bg` seam.
  Presentational; not a target.
- **One line per half**: the name, sans 14/600 `--fg`, `1px --border-strong` rule under (the partner
  trigger's affordance), a `CardDetailTrigger`; then its mark, gap 9, wrapping under the name when it must.
  A pair's second line starts `+` in `--fg-faint`. Siblings for Prev/Next: every name in the list, in order.
- **Marks** (exactly one per half):
  - free — 6px `--success` dot + `free` mono 10.5 `--fg-body` (ruling 4 asks the list to say it);
  - held — `AvailabilityMarker` row density, verbatim (`◆ none free, in {deck}`, `--avail-hard-fg`);
  - to buy — `BuyTag variant="row"` with price;
  - in this deck — `in this deck · trades places` mono 10.5 `--fg-muted`. Replaces the availability mark:
    the deck's own copy is the one that moves.
- **Figure line** (flex, wrap, space-between, margin-top 2): the figure mono 12 `--fg-body`, dotted
  `--fg-faint` underline, `▾`/`▴` 10px — a button, 36px tall with a 44px hit area by the chip's
  `after:` inset. With no deck data: `no deck data` `--fg-faint`, not a button. Right: **Choose**, ghost,
  h 36 (44 hit), sans 12.5/600.

### 2.3 What the figure counts (§4.4)

Inline under the row, indented 68 (the thumb + gap): `--surface-sunken` plate, radius 9, `1px --border`,
padding 11 13 13. Caption mono 10 uppercase `The {n} {short}'s decks run`. Names in a grid, 3 columns
desktop / 2 phone, sans 12.5 `--fg-body`, each a `CardDetailTrigger`, alphabetical. One row open at a time;
opening another closes the first. Inline because a nested view would make the card modal a third layer.

### 2.4 Order (§4.7)

`group(owned) → figure desc → name asc`, no-deck-data last in its group.
**Yours** = every half owned (free, held, or in this deck). **To buy** = any half to buy. So a held single
sorts in Yours; a pair with one half to buy sorts in To buy whatever its figure. Price never orders.

### 2.5 Length (§4.3)

Yours: whole. To buy: first **8**; `Show 8 more` appends 8 each press, focus to the first new row.
Engineering may cap the query at the index's natural ceiling; the count in the heading is the whole group.

## 3 · The confirm (§3.3)

**Choose replaces the body in the same sheet**; title unchanged. `← All candidates` (mono 11 `--fg-faint`,
top) and `Back to the list` restore the list with scroll and the open row kept. × and Escape cancel.

1. **Plates**: two columns centred, gap 14, glyph between (`→`, or `⇄` for a trade), mono 18 `--fg-faint`.
   Each: label mono 10 uppercase 0.12em (`--warning` out, `--success` in), then `ReceiptTile`-style full
   cards (63/88, radius 8) at **120** desktop / **104** phone; a pair side draws two at **84 / 68**, gap 6.
   Names under, 11.5 `--fg-body`. Each plate opens the card.
2. Rule, then the **sentence** sans 14/1.6 `--fg` (`copy.confirm.*`).
3. **Buy line** when a half is to buy: sentence + `BuyTag` (the pair's is the sum of its halves to buy, §6).
4. **Where it lands**, mono 10.5 `--fg-faint`: pending changes and Discard, or the brew line.
5. **Actions**: `Make {short} commander` (`Make {a} and {b} commanders`), bone, 44; `Back to the list`,
   ghost. Desktop in a row; phone stacked at the sheet's foot.

**Failed**: the confirm stays; a danger line mono 11 above the actions (`copy.confirm.failed`), and the primary
reads `Try again`. While writing, the primary reads `Changing…` at .6, never disabled.

On success the sheet closes, the page refreshes under the new commander, and focus lands on the banner's
commander line (announce `copy.announced`).

## 4 · After the swap (§3.4)

**Header**: the new commander's crop is the band (both geometries), name + pips on the commander line.
The deck's name is untouched. The bracket chip is absent (the reading is dirty, as after any edit).

**Pending banner** (`pending-banner.tsx`): a commander change is **one change** in `changeCount` and its own
`NameLine` variant, first in the list:

| slot | value |
|---|---|
| glyph | `⇄` mono 12 `--accent` (13px column) |
| name | `{old} → {new}`; a pair `{a} & {b} → {c} & {d}` (`history.commanderPair`) |
| hint | `commander` / `commanders` mono 10 `--fg-locked` |
| price | the `PRICE_TILE` when the new commander (or a half) is to buy |

**Counts mode (>6 changes):** the banner as shipped (counts, *since*, money sentence, *Review n changes ·
Commit · Discard*), plus one sentence above the money line: `⇄ {new} replaces {old} as commander.` in the
money sentence's style (`--accent` glyph).

No +/− figure is drawn for a lone swap (it moved no card). A trade adds its two card lines as ordinary +/−
lines, hints `from the command zone` / `to the command zone` in place of `removeHint`, and the header's
`+1 / −1`.

**Review page** (`review-changes.tsx`): a **Commander** section first under the header/lede, above
`ChangedStrip`, the chips and the columns. Heading as a column heading, ink `--accent`; right note
(`copy.review.note*`). Two rows, `was` and `now` (mono 10 `--fg-faint`, 30px), thumb 48×35, name 13.5
(`--fg-muted` was / `--fg` now), and the `BuyTag` on `now` when it is to buy. Rows on `--surface`,
`1px --border`, radius 8, min-h 48. A trade's cards stay in *Coming in* / *Going out* with the
command-zone hints. `heading(n)` counts the commander change as one. The footer's `back in the pool`
counts an old commander that leaves.

## 5 · Token use

No new tokens. `--accent` on the ⇄ and the review heading is the brass rule's (a state of this deck).
`--success`/`--warning` only as the diff's in/out. Buy and held are their components' own.

---

## R3 (2026-09-25)

- **Mana value** (Hugh): `CostPips` at 13 (no track, uncapped) followed by `sheet.manaValueRel`, mono 11
  `--fg-muted`, in one wrapping line between the halves and the figure. A pair draws both halves' runs joined by
  `+` and compares the sum. Never orders, filters or groups. In the confirm: pips under each side, plus the comparison on the side coming in.
- **Card details:** the existing `CardModal`, unchanged, with `stacked` and `backLabel="Change commander"`,
  opened by every candidate name and by the confirm's plates. The sheet registers through `ModalChrome` as the receipt does. Siblings are the list in drawn order.
- **List failure** uses the Analysis tab's 2c composition: the swap mark 56px at 0.3, display 21 heading, body
  13.5, bone **Try again** 44. **Swap failure**: the danger line moves **below** the actions.
- **The door, R3-E (recommended):** one joined plate on the art. Desktop: `⛶ Card details │ ⇄ Change commander`,
  26px tall, hairline divider `--border-strong`, each half its own 44px-tall target. Phone: a 26px-wide
  vertical pair (⇄ over ⛶), 53 tall. Raise its bottom inset to 23 so the lower half's target clears 44. The action
  row stays as shipped. The swap icon is an inline SVG path (two arrows), centred, 15–16px, `currentColor`.
