# The 99 — The commander row says how a deck plays · R1 handoff package

**PR #664's spec**, `docs/superpowers/specs/2026-09-15-commander-row-play-style-design.md`, read in
full on `refs/pull/664/head` (not on `main`). Voice: Kitchen Table.

The seven locked decisions in §Decisions are drawn as written and not reopened. The one item the
spec left to Design — the **`Nothing new`** state — is called in §4 of the canvas and §D below.

## Start here

| Read | For |
|---|---|
| **`The 99 - Commander Row (R1) - standalone.html`** | The canvas, self-contained — opens in any browser, no server. Pan/zoom. **Start here.** |
| `The 99 - Commander Row (R1).dc.html` | The canvas source (needs `support.js` beside it). Both widths, all five states, the gap-line templates, the height arithmetic, the About entry. |
| `READINESS.md` | **Green on the call, amber on three figures.** What R1 could not measure and who measures it. |
| `STATES-commander-row.md` | The matrix — five states × two widths, the slot-independence grid, the rules they generate from, copy and aria per state. |
| `commander-row · copy strings.ts` | The new strings as one `commanderRowCopy` block, the reuse manifest, and the retirement list `check:copy-drift` will trip on. |
| `brand/` | The locked brand sheet, copied in so this folder stands alone. |

Structural sibling: `design_handoff_the99_undo_removal/` — the same shape of round: one surface, one
ruling, a states matrix generated from stated rules.

## The answer in one line

*Two sentences and three figures, and the second sentence always says something.* One component on
two routes, and **nothing in the composition can be read off ownership** — the constraint that killed
`not in your collection` and the constraint every state below is checked against.

## D · `Nothing new` — the call

**It is a copy swap in the gap line's own slot, and it asserts the overlap instead of a gap:**

> You already play every mechanic this commander leans on.

Same slot, same ink, same measure, same line count. **No new geometry, no glyph, no chip, no colour,
no reordering** — which is what makes the locked "row height never varies" decision survive a fifth
state rather than be re-argued by it.

Three things it deliberately is not:

- **Not celebrated.** No brass, no ✓, no praise. On `/commanders` a broad collection hits this state
  constantly; a row that congratulates the reader every fifth row is noise, and under
  `Something new` the same fact is the reason the row ranks last.
- **Not the tag list read backwards.** `unplayedLabels` is empty here — there are no names to print,
  and inverting the line to name *played* mechanics would need a field the spec's measured payload
  does not ship, and would re-import the tribal noise §Problem 1 removed.
- **Not lane- or deck-aware.** It names no deck and no collection state beyond *play / do not play*,
  so it reads identically on both routes. A line that said *your Goblins deck already does this*
  would reopen the ruling that cut the nearest-deck clause.

### The finding that came with it: `Nothing new` has two causes, and only one of them is this state

The spec's condition — *every mechanic tag already played* — is silently true of a commander with
**no mechanic tags at all**, which is the Glarb case after the classifier runs: every one of its tags
is a creature type, so the mechanic set is empty and `unplayedLabels` is empty for a completely
different reason.

**Called: the state is decided on the classifier's output, not on the raw tag count.**

- mechanic set **empty** → the shipped `No tag data` note, i.e. the spec's `No tags` state, whose
  condition is **redefined from `tags` empty to *mechanic* tags empty**.
- mechanic set **non-empty and fully played** → the new line.

The redefinition is the whole fix and it costs nothing: both branches already exist, and one boolean
decides between them. Left unmade, a Glarb-shaped commander prints *you already play every mechanic
this commander leans on* about a commander with no mechanics on file — the sentence this spec exists
to prevent, one layer down.

## What engineering is buying

**One component, one new string, one branch, and six fields deleted.**

- `rec-card.tsx` + `discovery-row.tsx` collapse; `FitBar`, `RoleChips`, `ReceiptLine`, `OverlapTrack`,
  `TagSentence` and the `show fewer` trigger lose their last caller on these rows.
- The Fit chip, `ArtWash`, `IdentityPips` and `PriceSlot` are **reused unchanged** — the chip keeps
  `commandersCopy.row.fitDenominator` and its `measurableTotal` form, so the `40/40` ruling needs no
  new copy.
- `labelAtPx` drops to **one value for one band**, because there is now one row and one block under
  the wash.
- No new component, no new marker option, no client state — the disclosure went with the tag list, so
  the row stops being `"use client"`.

Gaps: `READINESS.md`. Every string: `commander-row · copy strings.ts`.
