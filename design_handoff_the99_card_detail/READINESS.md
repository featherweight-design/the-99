# Readiness — card detail R2

**Self-assessed: 🟢 Green.** R1's three Amber blocks were cleared in review — geometry confirmed
against `card-modal.tsx` (including the compact header at :344), the brief's §2 confirmed as
transcribed, the errata carried into the spec. R2 answers the two items that came back and reopens
nothing else.

## R2 — the two items

| # | Item | Ruled |
|---|---|---|
| 1 | **The compact art header** (`card-modal.tsx:344`) was not drawn, and R1 placed both new elements in it | **Drawn** — canvas §1b, `STATES` §1b, README §3b. **The tag survives and moves** into the name block; **the `⤢` is withheld** at the same threshold as the shipped flip control; **the gesture is kept**, because zoom's affordance was never its glyph. The thumb gains the shipped 2px `--accent` focus ring, and the zoom it opens is the full one. *Rejected:* zoom unavailable while the picker is open — withholding a mark is visual, withholding a gesture is functional. |
| 2 | **Never-stocked contradicted itself** — canvas drew it as silence, prose put it under `no stock` | **Ruled in one line:** the tag prints `no stock` when the store answered and the answer was no (*sold out* and *never stocked* alike); it prints nothing only when **nothing reached us**. The line is *who was silent*, not *what the answer was* — which makes both ancestors right instead of picking one. Canvas §2 and all four prose files now agree; the prose was the correct side. |

**Consequent narrowing:** gap 2's contrast risk (`--fg-locked` on `--bg`, ~3.2:1) bears on the **tag
path only** — the silent state has nothing to contrast. Recorded in the gap report.

## The four locked decisions — where each is honoured

| §2 | Honoured at |
|---|---|
| The owned card shows its **selected printing's** price | Canvas §1 desktop frame; `STATES` §1 — the tag re-reads on every pick, and four things now move together |
| The unowned card shows **a price at all** | Canvas §1 phone frame — drawn *as* the unowned case, deliberately, because it is the one with no printing region |
| Zoom is **the whole card as if held**, not an art-only lightbox | Canvas §3; README §3.2 — whole card at 372×520 / 318×444, caption, nothing else |
| The flip animates **inside the zoomed view** | Canvas §4; README §3.4 and Amendment 3 — and nowhere else |

## The four amendments — one line each, for a one-by-one audit

| # | Document | The amendment |
|---|---|---|
| 1 | printing picker R3, decisions 2 + 3 | Art column gains one element; a pick moves **four** things, not three. Three-signal table untouched. |
| 2 | full card R1, gap 4 | **Gap 4 closed**, in the form it predicted: a zoom on the modal's own art, for every card. Nothing else reopened. |
| 3 | card surfaces R2, rulings 6 + 9 | **Zero net motion amended in one place only:** inside the zoom the flip turns. Outside it, the ratified swap stands. Ruling 9's ordering unchanged and now gates this too. |
| 4 | link-out R3 | **By exclusion:** the price does not join the pinned row and is not a second door to Mana Pool. R3's rule untouched. |
| — | availability R5 / set collections R3 | **Not amended.** Read and reused. The availability block ships as-is; the buy tag is borrowed, not redefined. |

## The three R1 blocks, cleared

1. ~~The brief is not in the tree.~~ **Cleared** — §2 confirmed as transcribed, §4's four documents
   confirmed as the four in the ledger.
2. ~~`globals.css:524-536` was not read.~~ **Cleared** — carried into the spec as errata.
3. ~~`card-modal.tsx` was not read.~~ **Cleared** — geometry confirmed, and the one region the
   relayed read had missed (the compact header at :344) is now drawn.

## What carries forward, non-blocking

- **`no stock` contrast** — `--fg-locked` on `--bg`, ~3.2–3.6:1 at 10px, phyrexia the floor. Shipped
  treatment, inherited; measure in build. If it fails, the fix belongs to the tag everywhere, not
  here. **Bears on the tag path only** — silence has nothing to contrast.
- **Three `Escape` stages** when zoom + printing region are both open. Correct and consistent, one
  more than full-card's gap 6 anticipated.
- **The 320ms flip** is the one number in this handoff worth an opinion. Argued in
  `MOTION-no-token-set.md`; cheap to change, and the axis does not move with it.
- **`no stock` covering two facts.** Ruled (R2 item 2); the two stay distinguished in the accessible
  name only, as `set-cell` does. Revisit only if the feed ever carries the distinction as a field.
- **The compact header's focus ring** is now load-bearing where it was decorative — it is the only
  evidence the thumb is pressable. Worth one explicit check in build.

## What this handoff does not touch

The availability block · the pip ring · the vantage-point rule · the buy tag's own definition · the
printing picker's three selection signals · the pinned row and its link · `Full card` → `Card
details` · the 262→180px art trade · the `//` mark · the hover preview · every route the modal is
mounted on.

## Ship order

1. **Price tag.** Independent of everything else; ships alone. Needs the per-printing price selector
   and **both header layouts** — full and compact — from the first commit.
2. **Zoom.** Independent of the flip; ships alone, with the control absent on every card. **The
   compact header's silent thumb and its focus ring ship with it**, not after.
3. **Flip.** **After** card surfaces ruling 9's data work (`layout` column, back-face image storage,
   catalog re-seed). Never before, and never from the `//` heuristic.
