# STATES — the card mark

Four surfaces, drawn at **390px** and at desktop. `—` means the position draws nothing, which is a
state and not an omission.

**Three facts, one order, always:** game changer (bolt) → mass land denial (peak stripped) → extra
turns (turn again). Fixed, so a reader scanning a column compares like with like.

**Overruled 2026-09-21 by Hugh, on the built surface** (the two rows below carry it): the mark is
**16x16 on every surface** and the size is not a per-mount figure, and **all three labels are
lowercase**. What shipped was four sizes across six mounts and one title-cased member of a set of
three — the same fact reading as a different mark depending on the list, and `Game Changer` reading
as a different KIND of thing beside its two neighbours. The Game Changer list keeps its own name
where it is named AS a list, which is the tooltip's sentence and nowhere else.

**Ordering rule, every surface: copies first, mark last.**

## The mark

| | Value |
|---|---|
| glyphs | bolt · peak stripped · turn again — solid, 16px viewBox |
| container | **none** |
| ink | `--fact` `#8FA6BE`, theme-independent |
| glow | `filter: drop-shadow(0 0 3px color-mix(in srgb, var(--fact) 45%, transparent))` — outside the box model |
| sizes | **16 everywhere** — modal, decklist row, collection row, tile and key alike (overruled 2026-09-21; was 16 modal · 14 decklist row · 14 / 13 collection row · 12 tile) |
| glow radius | **3px everywhere** (the per-mount 2.5 / 2 went with the per-mount sizes; one size takes one glow). The interpolation space is `srgb` as shipped, not `oklab` |
| floor | **Retired 2026-09-21.** There is one size and nothing shrinks the glyph, so nothing reaches a floor; the rule it protected — no dot, no dash, no initial in the mark's place — is kept by there being one size to keep. |
| target | never |

## Matrix 1 — the decklist row, `/decks/[id]`

| State | 390px | desktop |
|---|---|---|
| **unmarked** | — | — |
| **one fact** | `Armageddon ×2 ⛰` — inline, after the count | same |
| **two facts** | `Nexus of Fate ⚡ ↻` — both inline, fixed order | same |
| **marked land** (no meta line) | inline after the name, row stays **44px** | inline, row stays 34px |
| **marked + Shopping** | mark inline; `edhrec 24%` unaffected on the meta line | same |
| **marked + draft-touched** | mark drawn; the accent inset edge unchanged | same |
| **marked, densest** | dot · name · `×2` · **⛰** · pips · `short 1` · `$` · `✕` | same |

**The row never grows and the meta line is never touched.** At 16px the mark costs ~20px of the
name cell, which the cell has at both widths — measured on the build rather than argued: a marked
row and an unmarked one on this surface both draw 52px at 390 and at 1300 (`probe:card-mark`).
`hasMetaLine` gains no clause; a marked land needs no exception.

**Orthogonal to everything.** The mark composes with the pass mark, pending-change edge, over ring,
proxy `P`, buy tag and undo receipt — it describes the card, they describe the deck's copy of it.
There is no combination in which it is suppressed.

## Matrix 2 — the collection tile, `/collection` (card view)

| State | meta line | name line |
|---|---|---|
| **unmarked** | — (or chip / `×N`) · `SET · rarity` | name |
| **marked, ordinary card** | **⛰** · `SET · rarity` | name |
| **marked, multi-copy** | **⛰** · `SET · rarity` | name · `×3` |
| **marked + chip** | `short 1` · **⛰** · `SET · rarity` | name · `×2` |
| **marked, two facts** | `⚡ ↻` · `SET · rarity` | name |
| **marked, no art** | ⛰ · `SET · rarity` | name; art draws the identity gradient |

**Nothing yields.** The rarity stays at both widths and the chip never outranks the mark, with the
count on the name line. Both of the word version's yield rules are deleted.

The 12px arithmetic this paragraph used to carry — chip ~66px + glyph 12px + set line ~54px inside
a 157px caption — is retired with the per-mount sizes rather than restated at 16, because the sum
was never the measurement. **Measured** on the built phone tile, 2026-09-21: the meta line is
155px, three 16px glyphs and the `SET · rarity` trail occupy 24→84px and 163→179px, and the line's
`scrollWidth` equals its `clientWidth` — nothing overflows, with ~79px unused between the last
glyph and the trail. `probe:card-mark` reads a marked tile and an unmarked one at 300px at both
widths, with no mark colliding with the pips, the set line or the count.

**One case is NOT measured and is not claimed here:** a tile drawing the availability chip AND
three facts. No card in the reference collection carries two facts at all, and no tile on that
account draws a chip, so the densest caption the design permits cannot be produced on it. The
arithmetic says it is tight (chip ~66px + three glyphs 60px + gaps + trail against 155px); that is
a reason to measure it when such a card exists, not a fit anyone should certify from a sum.

**The count lives on the name line** on this surface, so the meta line reads `short 1 ⛰` and the
name line reads `Armageddon ×2`.

## Matrix 3 — the collection row, `/collection` (rows view)

| State | 390px | desktop |
|---|---|---|
| **unmarked** | — | — |
| **one fact** | after the name, before the availability marker | same |
| **two facts** | both after the name, fixed order | same |
| **marked + over-committed** | mark, then `◆◆ short 1`; over ring unchanged | same |

**The type line is not used.** The mark stays on the name line at both widths — one position across
every surface in the app.

## Matrix 4 — the card modal

| State | Block |
|---|---|
| **unmarked** | **absent.** No heading, no empty state, no reserved height. |
| **one fact** | heading `In the bracket rules`, glyph at 16px + the fact's name in plain text |
| **two or three** | same heading, one line each, fixed order |

Placement: the oracle column, **after the oracle text, before the availability receipt**. Chrome is
`AvailabilityDetail`'s verbatim — radius 10, `--bg` on 1px `--border`, mono 10px `0.1em` uppercase
`--fg-faint` heading, `mt 16 / 22px`.

**No provenance.** Round 2 owns the detection sentence and its slot.

## Matrix 5 — the key (`MarkKey`)

| State | Entries |
|---|---|
| **deck detail, collection grid** | `$ to buy` · `P proxy` · `⚡ game changer` · `⛰ mass land denial` · `↻ extra turns` |

Always all five, never conditional on what is on screen — the key is a vocabulary, not a legend of
the current page. Glyph entries render in `--fact`, lit, at **16px** — the key draws the same mark
the cards do, which is the whole point of a key, and the 11px here was a per-mount figure retired
with the rest on 2026-09-21. The words beside them stay mono 10 / 10.5px.

## Matrix 6 — the hover tooltip

| State | Behaviour |
|---|---|
| **pointer-fine, hover on a mark** | tooltip after **400ms**, above the mark, left-aligned to it; instant out |
| **row near the viewport top** | flips below the mark |
| **two marks on one row** | two independent tooltips, one at a time — never merged |
| **touch / coarse pointer** | **no tooltip at all**; the key and the modal carry the words |
| **keyboard** | not focusable; the mark's `aria-label` already speaks the fact |

Chrome: `--elevated` plate, 1px `--border-strong`, radius 6, 12px `--fg-body`, single line, no
wrap, `0 4px 12px rgba(0,0,0,.45)`. Strings in `cardMarkCopy.tooltip`.

**The tooltip is an enhancement, not the gloss** — it cannot be the only place a fact is explained,
because half the app's surfaces never show it.

## The empty case is the whole design for most cards

No surface reserves width, height or a position. An unmarked decklist row is the row that ships
today, to the pixel; an unmarked tile keeps `SET · rarity`; an unmarked modal has no block.
**Absence is not drawn**, because §2's detection is partial and a drawn absence would read as a
cleared check.

## Colour is never the only carrier

| Fact | Colour | The other carrier |
|---|---|---|
| game changer | `--fact` (shared) | the **bolt** silhouette, and the key |
| mass land denial | `--fact` (shared) | the **peak** silhouette, and the key |
| extra turns | `--fact` (shared) | the **arrow** silhouette, and the key |

The ink is shared across all three, so it can only mean *a bracket fact is present* — it never
distinguishes one fact from another. That job is the silhouette's alone, and it survives
monochrome, colour blindness and every theme.

## Accessibility

- **Each mark carries its fact's name as its accessible name** (`aria-label`, from
  `cardMarkCopy`), so a screen reader never depends on the key.
- **The collection tile is one `<button>` whose accessible name is its text content**, and the meta
  line precedes the name line — so the drawn glyph is `aria-hidden` and an sr-only sibling is
  placed **after** `nameSpoken`.
- **The collection row's `<button>` carries an explicit `aria-label`**, so the mark joins it as a
  clause after the availability clause.
- **The decklist row** composes nothing: the name is its own trigger and the mark sits beside it.
- **No `title`, no target, no focus.** Inert like the chip, the `$`, the `P` and the `//`. The
  hover tooltip is a positioned element on pointer-fine devices and is purely redundant — its
  sentence names the same fact the `aria-label` already speaks.
- **The glow is decorative** and carries nothing: every fact survives it being removed.

## Zero net motion

Nothing transitions or animates: not the mark appearing, not the modal block mounting, not the
glow — which is a static shadow, never a pulse.
