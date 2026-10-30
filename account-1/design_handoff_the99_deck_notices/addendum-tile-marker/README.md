# Addendum — the tile's notice marker

**Canvas:** `The 99 - Tile Marker Addendum.dc.html` · frame `Tile Marker.dc.html` · strings in
`tile-marker · copy strings.ts`.
**Ruling (Hugh, 2026-09-24):** the deck header keeps the full tag and the Notices sheet. The /decks tile shows
only a marker. **Amends parent `HANDOFF.md` §1 and §1a for the tile only.** Nothing else in the parent changes.
No About entry.

## 1 · The marker (`NoticeTag` on the tile → `NoticeMark`)

| | |
|---|---|
| Place | the tag's slot, unchanged: after `BracketChip`, or after `StatusPillBadge` with no chip. Gap 8 |
| Size | 18 × 18 circle, centred in the 22 / 24 chips row |
| Ground | 1px hairline of the ink at 70%; `color-mix(in oklab, var(ink) 14%, var(--surface-inset))` (H5) |
| Glyph | `!`, IBM Plex Mono 600 12px, in the ink. A graphic, so 3:1; measures 3.5:1 on the tint |
| Ink | `--danger` when any legality entry stands (read or unread). `--fact` for unread data |
| Both | ONE mark, `--danger`. Never two marks |
| Read data | nothing, as today |
| Read legality | the same red mark. The tile never drew the dot distinction legibly at 18px, so it drops it; the header keeps it |

**Why `--fact` for data, where the ruling says red.** The ruling was about the *Not legal* chip. A red `!` on
"the Game Changer list moved" tells the player the deck is broken. Same glyph, the ink that means card
facts. **Hugh to confirm** (READINESS 1); if red everywhere is wanted, the key drops to one entry and nothing else
moves.

## 2 · Tooltip (desktop)

The shipped `FactTooltip` with `sentence`: pointer-fine only, 400ms, portalled, flip rules unchanged,
`aria-hidden`. Sentences in the copy file. One box per mark; *both* is one sentence naming both counts.

**Engineering:** the tile's `<Link>` overlays the footer (`absolute inset-0`, last in the DOM), so the mark
never receives the pointer. Lift only the mark's wrapper above it (`relative z-10`) and forward its click to
the tile's href (`router.push`), so a click on the mark still opens the deck. No `tabIndex`, no role.

## 3 · How the meaning is found without hover: a key on /decks

The existing `MarkKey`, one new mount (`DecksMarkKey`), as the **first full-width item of the tile list**:
`col-span-full` in the `sm:grid-cols-3` grid, the first child of the phone's flex column. **Both widths**, as
the card marks' key: the key is what explains the mark, the tooltip is extra.

- Entries: `! not legal in this deck` (red sample), `! notices since analyzed` (`--fact` sample). The real mark
  at 18px as the sample, aria-hidden, beside its word.
- **Conditional**, like `buy` and `proxy`: an entry is drawn only when a tile in the CURRENT shelf and filter
  draws that mark; the line is absent when none does. Computed from `shown`, so filtering re-evaluates it.
- `regionAria`: *Deck marks*.
- Rejected: **tap opens a tooltip** (the tile is one link; a tap that does not open the deck is a control nobody
  asked for); **a first-run hint** (gone after one view, so it doesn't meet "findable"); **a word beside the mark**
  (that's the chip Hugh cut).

## 4 · Spoken

Unchanged in shape: the tile link's name carries `noticeSpoken`. **One change**: when a deck has both kinds, the
name says both (`1 card not legal in this deck, 3 notices since this deck was analyzed`). The summary
(`summary-sql.ts`) currently returns only the winning kind; it needs `dataUnread` alongside a legality
kind. The mark is `aria-hidden`.

## 5 · Footer and the yield

#939's footer is not touched: rows 22/24 · 14 · 14, gap 9, padding 11/13, 92 / 94. The mark fits inside the
chips row.

**The range yield almost disappears.** `YIELD` was sized for `Not legal` (≈90px) and `● 99` (≈40px). The mark
is 18. From the live measurements (404.5 from `md`, 386.3 below, 354.3 beside `● 99`), the widest row with
the mark needs ≈ 333px from `md` and ≈ 320 below. That's at or under the 330 band floor, where the row
wraps anyway. **Re-run `probe:notices-tile` with the mark. If both land ≤ 330, delete `YIELD` and the
`face={false}` branch.** Otherwise keep one window at the measured width.

## Checked on the canvas

1a/1b: none · not legal · data · both · no chip · widest (Unresolved + range + mark) at 340 and 358. §2 the three
tooltips. §3 the key at 390 (both entries) and 1300 (one). §4 guides across the three rows, with and without.
§5 the spoken names.
