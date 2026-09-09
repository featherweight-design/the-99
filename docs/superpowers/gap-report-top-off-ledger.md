# Gap report — the provenance ledger (#359)

PR 4 of the "top off the last 31" run. Covers §13 (the ledger), §14 (the pass mark on
decklist rows) and the ledger/mark rows of the state coverage table in
`docs/superpowers/design-tables/top-off.md`.

Design-review ran all three agents. Agent 2 returned **9 visual gaps and 2 state gaps**;
Agent 3 confirmed **0 remaining**.

## Gaps found and fixed

| # | Where | Design | Was | Now |
|---|---|---|---|---|
| 1 | `provenance-line.tsx` container | `margin-bottom: 12px`, both widths | `mb-[10px]` | `mb-[12px]` |
| 2 | The mark control's colour | `--accent` on the **newest** line, `--fg-faint` otherwise | keyed on the pressed state instead | keyed on `newest \|\| marked` |
| 3 | The mark control's dashed rule | `--accent-shadow` on the newest line | same defect | same fix |
| 5 | §13e phone controls row | `margin-top: 7px` when the row holds one control | `mt-[8px]` always | `mt-[7px]` for the seed, `mt-[8px]` otherwise |
| 6 | §13f legacy line | `gap: 10px` | absent | added |
| 7 | §13f legacy line | `padding: 0 10px`, no vertical padding at either width | phone added `py-[8px]` | removed; the 34px minimum carries a single line and a wrapped one grows the box |
| 8 | §13f legacy sentence | `12.5px` at both widths | `12px` on phone | `text-[12.5px]`, unbranched |
| 9 | The undo button | `inline-flex`, `align-items: center` | inherited from the button element | stated explicitly |
| 10 | §13 recount sentences | lead with what the pass **placed** | led with what it still holds | `live + kept + removed`; the undo and the mark's aria name still count survivors |
| 11 | State n | the mark clears when a new pass lands | only cleared when the marked pass disappeared | `builder-shell.tsx` also clears on the newest pass id changing |

## Accepted departures

Each of these is a place the implementation knowingly differs from the table. None is an
open gap.

1. **Two theme tokens stand in for raw hexes.** §13a's `#181410` ships as
   `var(--surface-sunken)` and §13d's `#4A4033` as `var(--border-strong)`. The hexes are one
   channel off those tokens in the default theme and have no answer at all in the other
   five, and `src/lib/theme/no-hex.test.ts` forbids naming them anyway.

2. **§14's `border-left: 3px solid var(--accent)` ships as an inset `box-shadow`.** A real
   3px border on a decklist row would shunt that row's contents sideways relative to its
   neighbours. The over-tint ring directly above it in the same file already uses an inset
   shadow for the same reason. **No Errata entry exists for this** — worth one on the next
   handoff pass.

3. **Gap 4 — the phone's right-hand money figure is not implemented.** The canvas draws
   `$42.80` opposite the label on a phone top-off line. Every buy figure in this ledger is a
   count of cards rather than a sum of money, there is no copy key for a currency figure in
   the `ledger` block, and line 2's own sentence already states the buy count. Implementing
   it would mean coining a copy string the design table does not carry.

4. **A recount replaces the base sentence rather than joining it.** "68 cards · 5 now yours"
   is what the pass holds now; appending it to "68 cards — the roles and the mana base, 7 to
   buy." would state the same 68 twice and quote a buy figure for cards that have left.

5. **`ledger.passRecountedAllKept` has no render site.** `summariseFillPasses` drops any
   pass with `live === 0`, and every card being kept is exactly that case. The key is left in
   place rather than deleted: it is quoted verbatim in the merged design table, and the
   drop rule is the thing that would have to change for it to appear.

6. **The seed's reversal renders as two width-gated spans in one mount.** §13e puts it
   opposite the label on the phone and §13d puts it in the undo column on desktop. These are
   different parents, so `md:contents` cannot serve both; the string is not duplicated in the
   accessibility tree because only one span is displayed at a time.

7. **`docs/superpowers/design-tables/recommendations.md` (lines 337-339, 560) still
   documents `fill.provenance*`**, which this PR deletes. That table describes the arrival
   strip as it was before #359 replaced its provenance sentence with the ledger. Left as the
   historical record of that round rather than rewritten here.

## Copy review (Gate 7)

Run over the diff in propose mode. The whole `ledger` block is quoted verbatim in the merged
design table and is therefore frozen; this diff adds one string and deletes four.

- `ledger.markedRow` — A11y, exempt from cuts, matches §14's wording. KEEP.
- `fill.provenance` / `.provenanceMobile` / `.provenanceAllOwned` / `.provenanceShort` —
  deleted with the surface they described. `rg -F` finds no live consumer; `deck-import.ts`
  has its own unrelated `provenanceMobile`.
- One low defect found and fixed in this PR: the `sr-only` mark phrase was the marked row's
  first child, so a screen reader read "from top-off 1" before the card's name. It now
  follows the name and the auto tag.

## Sibling sweep (Gate 3)

`rg` over the four deleted copy keys returns only documentation, design handoffs and the
unrelated `deck-import.ts` key. No other surface still renders a deck-wide provenance
sentence.

## Forced-state runtime (Gate 2)

`scripts/probe-ledger.mjs` drives every state the table names in a real browser at 1280 and
390, against a fixture deck at 99/99. All eleven assertions pass at both widths. See the PR
body for the transcript.
