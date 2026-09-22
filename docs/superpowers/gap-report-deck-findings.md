# Gap report — the findings and their receipt (PR 4c)

**Sources.** `design_handoff_the99_verdict/` Turn 4 (§4b desktop, §4c 390, and the receipt drawing
"The receipt is a modal, and it shows the cards"), its `STATES-verdict.md` §C, §D and §F, and the
verdict addendum (`design_handoff_the99_verdict_addendum/`), which wins where the two disagree.
Every property below was read off the canvas's own inline styles and checked against the build.

**Verdict: 0 open gaps.** Four mismatches were found on the verify pass and fixed before opening.
Seven deliberate departures are recorded below, each with the ruling or measurement behind it.

## Fixed on the verify pass

1. `findings-block.tsx` — the list painted `--surface` at both widths, so on desktop the 10px
   gaps between tiles were surface rather than page. The phone's box is one surface; the
   desktop's tiles carry their own.
2. `receipt-modal.tsx` — behind a stacked card the receipt stepped its ground down to
   `--surface-sunken` but kept its `--border-strong` top edge. §5a draws `--border`.
3. `receipt-modal.tsx` — the combo foot's bottom padding: 12 against the canvas's 14.
4. `receipt-modal.tsx` — the steps block's label gap: 5 against the canvas's 6.

## Checked and matching

- **Desktop tiles** (§4b): five columns at a 10px gap; `--surface` ground, 1px border
  (`--border-strong` present, `--border` empty), radius 9, padding 12/14, gap 7. Count mono 600
  19px, line-height 1. Label 12px, 600 `--fg` present, 500 `--fg-muted` empty. Names 10.5px
  `--fg-muted`. Control mono 9.5px `--accent`, dotted underline, `align-self: flex-start`. Empty
  line 10.5px `--fg-disabled`; the empty mark and figure at opacity 0.35. `no limit` chip mono
  8.5px, 0.1em, uppercase, `--fg-faint`, `--border-strong`, fully round, 2/6.
- **Phone rows** (§4c): one box, `--border`, radius 11, `--surface`; a row pads 11/13/0 with a
  44px right-aligned rail; the line's gap 10, count 15px, label 12.5px; names 11.5px at
  line-height 1.5; control mono 10px with `→`. An empty row is one line at 11/13 and opacity 0.5.
- **Heading**: mono uppercase `--fg-faint`, 10px/0.16em desktop, 9.5px/0.14em phone.
- **Receipt, desktop**: 560px, `--surface-raised`, `--border-strong`, radius 14, the app's
  modal shadow; header 14/18 at gap 10, title display 700 16px, count mono 12px `--fg-faint`,
  close mono 14px `--fg-faint`; body 16/18; grid five columns at 9; tile radius 6 on
  `--border-strong`, name 10.5px `--fg-body` at 1.3.
- **Receipt, phone** (addendum §5a): a sheet from 52px, full width, top radius 14; header 13/16
  at gap 9, title 15px, count 11.5px; grid two columns at 11, body 14/16, name 11px.
- **Stacked** (§5a): card sheet from 96px with a top radius of 14; the receipt behind on
  `--surface-sunken` with its header at 0.55 and its title in `--fg-muted`.
- **Combo body**: plates 96px at gap 7; pair title display 700 17px at 1.25 with a 400
  `--fg-faint` `+`; tags mono 9.5px, 0.1em, uppercase, `--fg-body`, `--border-strong`, radius 5,
  4/9 at gap 6; field labels mono 9px, 0.14em, uppercase, `--fg-faint`; steps an `ol` at 17px
  indent, 12.5px `--fg-muted` at 1.5; foot `assembled in this list` mono 10.5px `--fg-faint`
  and `Commander Spellbook ↗` mono 10.5px `--accent` on a solid underline.
- **Provenance**: collapsed toggle mono 10px `--fg-faint`, dotted `--border-dashed`, with `▾`.

## Departures, each deliberate

1. **Fact marks are 16px, not the canvas's 13.** One size everywhere, ruled 2026-09-21 and
   recorded in `card-fact-mark.tsx`. The phone's names line indents 26px (16 + the line's 10px
   gap) where the canvas's is 23 (13 + 10), so the names still start under the label.
2. **No MarkKey on this tab** (addendum ruling 2). Every mark sits beside its fact's name.
3. **No fact mark on a receipt tile** (addendum ruling 2): the header names the fact.
4. **The stacked card sheet starts 44px below the receipt, not 12.** The addendum's prose says
   "12px lower"; its own §5a draws the receipt at 52 and the card at 96, and the prose's reason
   is "a visible strip of the receipt's own chrome" — 12px shows a hairline and no header. The
   drawing wins. The phone header is pinned to 43px so it fits the strip whole;
   `probe:verdict-findings` measured 46px before the pin, cut along its bottom edge.
5. **The stacked card modal drops its own backdrop.** The receipt has already dimmed the page,
   and a second wash would hide the strip the offset exists to show. The backdrop element stays
   and still takes a press, so pressing the strip dismisses the card, not the receipt.
6. **The receipt tile is 63/88, the app's card ratio, where the canvas drew 5/7** (0.716
   against 0.714). The art is a real card, not a placeholder plate.
7. **Back navigation is not wired.** Ruling 1 asks a hardware back on the card to land on the
   receipt. Neither the card modal nor the provider that opens it pushes a history entry, and the
   modal is opened from every card surface in the app — so back leaves the page today everywhere, as it does here. Adding
   history to this pair alone would make back behave differently on one tab than on every other
   surface that opens a card, and that is an app-wide decision rather than this PR's.

## Beyond the drawing, and why

- **Several combos.** The canvas draws one. A deck can assemble more, so the receipt draws one
  combo body per combo, each with its own foot and its own Spellbook link, and the finding names
  the first pair and counts the rest (`… · +1`).
- **Mana as a state** (R7) and **the prerequisites line** (R6), both ruled in Round 2's
  re-audit: `No mana needed` at zero, pips above it, `Commander Spellbook does not say` for
  null; `Needs` under the steps and absent when Spellbook sent nothing.
- **Provenance's open state** is not drawn beyond "a lead sentence, four rows, a closing line".
  It uses the tab's own type. The game-changer row links the WotC post the rules are read from
  and dates the last check, because the rules are a blog post and can move
  (`BRACKET_RULES_SOURCE` in `src/lib/bracket/sources.ts`).

## New copy, for `/copy-review`

`findings.*`, `receipt.*` and `provenance.*` in `src/lib/copy/deck-analysis.ts`. From the
handoff's copy file: the labels, `nothing in the list`, `no limit`, the names and pair builders,
`see the card(s)`, `Mana needed`, `Steps`, `assembled in this list`, the provenance toggle and
lead. Written here: `see the combos` (plural), `No mana needed` and
`Commander Spellbook does not say` (R7), `Needs` (R6), the two named close labels,
`Rules as published, checked {date}.`, and the provenance lead's second sentence, reworded
because the handoff's ("by reading your cards") is contradicted by the rows under it, two of
which combine Spellbook's estimate with our own reading.
