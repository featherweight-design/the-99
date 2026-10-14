# The 99 — The card mark (design handoff, R1)

**Source of truth:** `docs/superpowers/design-briefs/2026-09-19-the-card-mark.md`, read in full on
`main`. §2's facts-about-the-facts are binding, and §3's constraints are drawn as written.

`design_handoff_the99_card_captions/` is the structural sibling: it moved modifiers across both
card views and the row's densest state was its whole subject. `design_handoff_the99_deck_analysis/`
(Round 0, 🟡 Yellow) is cited for the bracket mark and is **not reopened**.

**The shipped answer: `3d` — three solid glyphs, bare, one shared ink, lit.**

**Files.** `The 99 - The Card Mark.dc.html` (canvas — three turns of exploration, newest at top;
`3d` is the adopted option and everything above Turn 3 is history). `STATES-card-mark.md` is the
state matrix, `card-mark · copy strings.ts` the strings, `CONTRAST-the-card-mark.md` the
measurement §3 asks for before the build, `READINESS.md` the one dependency.

**The one-line summary:** *one ink says a bracket fact is present, the glyph says which one, and
the key already on the page says what it means.*

## What Design read

The brief, and six components at `main`: `ui/card-tile-caption.tsx`, `collection/grid-view.tsx`,
`collection/rows-view.tsx`, `decks/decklist-row.tsx`, `cards/card-modal.tsx`, `ui/cost-pips.tsx`.
Plus Round 0's `HANDOFF.md` for the bracket mark's final geometry and palette. **Where a component
and this handoff disagree, the component wins** and these tables are what to correct.

## The four calls

| # | Question (§5) | Called |
|---|---|---|
| **A** | The mark itself | **Three glyphs, one ink, no container.** Bolt · peak stripped · turn again, solid, `--fact` `#8FA6BE`, with a 3px drop-shadow glow in the same ink at 45%. |
| **B** | Where it appears, and where it does not | **Decklist row, collection row, collection tile, card modal.** Not on the art, not on a deck tile or band, not on Home. **Glossed by `MarkKey`**, which gains three entries. |
| **C** | The modal's fuller treatment | **Its own block, `In the bracket rules`, glyph + its name per line.** No provenance — Round 2 designs that slot. |
| **D** | The empty case | **Absence is the design.** No reserved width, no placeholder, no dash, no count. |

---

## A · Three solid glyphs, one ink, bare

### The glyphs

| Fact | Glyph | Why |
|---|---|---|
| Game Changer | **bolt** | Force arriving from outside the board. The one fact with no picture of its own, so it takes the nature register's most legible sign. |
| Mass land denial | **peak, stripped** | A solid mountain with the growth marks lifted off above it — the ground, emptied. |
| Extra turns | **turn again** | A near-closed circle with a solid arrowhead: the round coming back around. |

All three are **mass, not outline**. That is a legibility decision at 12px and it is also what makes
the glow work: a filled silhouette throws the halo outward off a clean edge, where an outline glyph
scatters it through its own gaps and reads as blur.

**Three subjects, three silhouettes** — sky, ground, time; jagged, low-and-wide, round. The set is
told apart before it is read, which is the property three letters in identical boxes could not have.

### The ink, and why there is only one

`--fact: #8FA6BE`, **theme-independent**, exactly as the WUBRG pips and Round 0's Ignition ramp are.

- **One ink for the class, not three.** The colour says *a bracket fact is present*; the glyph says
  which one. That is a single new token instead of the three-hue set Round 0 ruled unsafe across
  six theme accents — and it means **colour is never the only carrier**.
- **Cool, because every status ink on these surfaces is warm.** `--warning` to buy,
  `--avail-over-fg` over-committed, `--accent` draft-touched, `--danger` short. A cool slate reads
  as *informational* against all of them, and against six warm theme accents.
- **Not `--fg`.** Bone was drawn and rejected in review: at 13px on a name line `--fg` *is* the
  card-name colour, so the mark joins the title instead of annotating it.

### No container, and the rule that buys

| | Boxed | Bare |
|---|---|---|
| `$`, `P`, `short 1`, `×N` | ✓ | |
| the card mark | | ✓ |

**Boxed means "about your copies". Bare means "about the card".** That distinction is free as long
as the mark stays uncontained, and it is erased the moment it takes the slot box. A circle was
drawn too and is worse than the box: the ring competes with the ownership dot at the row's other
end — two circles, one of them meaningful.

### Sizes

| Register | Glyph | Glow |
|---|---|---|
| Card modal block | **16px** | 3px @ 45% |
| Decklist row, both widths | **14px** | 2.5px @ 45% |
| Collection row, desktop / phone | **14 / 13px** | 2.5px @ 45% |
| Collection tile, both widths | **12px** | 2px @ 45% |

**12px is the floor.** Below it the mark is not drawn and nothing takes its place — the same shape
of rule as the bracket mark's 20px floor, reached the other way: a numeral survives shrinking, a
glyph past its floor does not.

The glow is `filter: drop-shadow(...)` and is **outside the box model** — it costs no layout, adds
no height, and shifts nothing beside it.

### Rejected

- **The word spelled out** (`Game Changer`, `mass land denial`, `extra turns`) — the first
  direction, superseded: `$`/`P` already establish the symbol pattern and `MarkKey` already exists
  to gloss it.
- **Letters `G L T`** — the cheapest option, and the hardest to tell apart in a column.
- **Three inks, one per fact** — see above.
- **A struck-through or negated glyph for mass land denial.** Would be the fourth negation mark on
  a surface that already has a dashed ownership dot, a dashed proxy edge and an over diamond.
- **A count or roll-up** (`2 flags`) — invents a category the rules do not have; §3 forbids
  thresholds.
- **Any positive claim.** No tick, no `clean`, no `no MLD`. §2: detection on two of the three is
  partial, so absence is not evidence.

---

## B · Placement, surface by surface

### Ordering rule, both surfaces

**Copies first, mark last.** Name and count stay one unbroken phrase about your copy; the mark
trails as the annotation it is.

- **Row:** `Armageddon ×2 ⛰`
- **Tile:** meta line `short 1 ⛰`, name line `Armageddon ×2`

The tile's count therefore **moves down to the name line**. Both surfaces now read in the same
order and the mark lands at the same depth in each.

### The decklist row — inline after the count, both widths

The 390px row is the binding case: ownership dot, name, `//`, `×2`, cost pips, `short 1`, buy tag,
44px `✕`. At ~14px the mark costs about 18px of the name cell — **so it goes inline at both widths
and the meta line is not touched.** `hasMetaLine` gains no clause, no row grows, and a marked land
(44px, no meta line) takes the mark inline exactly like any other row.

> This is the payoff of the symbol over the word. The word version needed the meta line, a
> Lands-row exception and a tile yield rule. **A 14px glyph needs none of the three.**

### The collection row — after the name, before the availability marker

Desktop's `52px 1fr 90px 150px 92px 18px` and the phone's `38px 1fr 76px auto` both have room in
the name cell for 14px. **The type line is not used** — the mark stays on the name line at both
widths, which keeps it in one place across every surface in the app.

### The collection tile — the meta line's left group, and nothing yields

Caption height is fixed by ruling (`CARD_TILE_CAPTION_H`, 56/50px) and a third line is forbidden.
The mark sits in the **meta line's left group**, after the availability chip.

**Nothing is dropped and nothing is outranked.** `SET · rarity` keeps its rarity at both widths;
the chip and the mark coexist on the 17px line (chip ~66px + glyph 12px + set ~54px inside a 157px
caption, with the count now on the name line). The word version's two yield rules are **both
deleted**.

### Where it deliberately does not appear

- **On the art.** Card captions' call D emptied it and the bottom scrim went with it.
- **On a deck tile or the deck band.** That altitude is the bracket mark's (Round 0).
- **On Home.**
- **On Consider tiles and the Add panel's search rows.** Out of this round's payload (§4), listed
  as severable — not refused.

---

## C · The modal says the name, and stops there

One block in the oracle column, **after the oracle text, before the availability receipt**, in
`AvailabilityDetail`'s chrome verbatim: radius 10, `--bg` on 1px `--border`, mono 10px `0.1em`
uppercase heading in `--fg-faint`.

- **Heading: `In the bracket rules`.** True of all three, invents no threshold, names no number,
  says nothing about *this deck*.
- **Body: one line per fact — the glyph at 16px, then its name in plain text.** The modal is the
  one surface with room to spell it out, so it does; this is where a player who ignored the key
  learns the vocabulary.
- **Nothing else.** No provenance, no source names, no count, no link.

**Provenance waits** — the three detection sentences are fixed constants and Round 2 designs their
slot. Drawing one here would hand Round 2 a slot it did not design.

**The block is absent on an unmarked card**, as `AvailabilityDetail` is.

---

## C2 · The hover tooltip

One sentence per mark, on pointer-fine devices only.

| Fact | Tooltip |
|---|---|
| Game Changer | *This card is on the Game Changer list.* |
| Mass land denial | *This card counts as mass land denial.* |
| Extra turns | *This card takes extra turns.* |

**Chrome:** `--elevated` plate, 1px `--border-strong`, radius 6, 12px `--fg-body`, one line, no
wrap. Positioned above the mark and left-aligned to it, flipping below when the row is near the
top of the viewport. 400ms delay in, instant out.

**It is an enhancement, never the gloss.** It does not exist on a phone, so `MarkKey` still carries
the vocabulary and the modal still spells all three out. A tooltip-only explanation would be the
retired deck-status design with a desktop escape hatch.

**Two facts, two tooltips** — each mark owns its own sentence and its own box, shown one at a time.
Never one merged line: the facts are independent and a merged sentence would imply they add up to
something, which is Round 2's question.

**Not the native `title` attribute** — unstyleable, ~1s OS delay, and announced redundantly over
the aria-label the mark already carries. **No tap equivalent:** tapping the row opens the modal,
which says all of it.

---

## D · The key is what makes a wordless mark legal

`MarkKey` gains three entries and becomes five:

`$ to buy` · `P proxy` · `⚡ Game Changer` · `⛰ mass land denial` · `↻ extra turns`

Each new entry is **the glyph in `--fact`, lit, followed by the fact's own name**. The three
strings are quoted, never paraphrased — `Game Changer` title case as a proper noun naming
membership of WotC's published list, the other two lowercase as the rules' own descriptions.

**This is the answer to §3's ruling.** The deck-status marks shipped wordless *and unglossed*; the
key is the component that exists to stop that recurring. It sits above both the decklist and the
collection grid, so the gloss is on the same screen as every mark it explains.

**And the gloss is never the only route:** each mark carries its fact's name as its accessible
name, so a screen reader user never depends on the key, and the modal spells all three out.

---

## What this asks of engineering

**Yes, we want the mark on collection tiles** — §4 asks directly. `/collection` in card view is
where *which of my cards are Game Changers?* gets asked, so the browse list payload needs the two
joined flags (Tier B).

**If that slips, the slip is clean and partial:** `game_changer` already rides the card row
everywhere, so the tile and both rows ship with the bolt alone and the other two glyphs arrive
later at call sites that already exist.

## Engineering ledger

| # | Change | Kind |
|---|---|---|
| 1 | **New `CardFactMark`** — three inline SVGs, one `--fact` ink, size from the caller, glow via `filter` | new |
| 2 | **New token `--fact: #8FA6BE`**, identical in all six themes | new |
| 3 | **`decklist-row.tsx`** — mark inline after the count, both widths; no change to `hasMetaLine` | additive |
| 4 | **`collection/rows-view.tsx`** — mark after the name; one clause added to the row's `aria-label` | additive |
| 5 | **`collection/grid-view.tsx`** — mark in the meta line after the chip; **count moves to the name line**; `metaTrail` unchanged | additive |
| 6 | **`card-modal.tsx`** — one block between oracle text and `AvailabilityDetail`, `null` when no fact | additive |
| 7 | **`MarkKey`** — three entries | additive |
| 7b | **Tooltip** on `CardFactMark` — positioned element, pointer-fine only, 400ms in | additive |
| 8 | **Browse list payload** widened with the two joined flags (§4) | data, Tier B |
| 9 | *Severable:* same mark on Consider tiles and Add-panel search rows | severable |

## Refused

- **A word on any dense surface.** The modal and the key carry the words; the surfaces carry glyphs.
- **A second or third ink.**
- **Any container** — box, circle, pill, plate.
- **Any positive or completeness claim** (§2).
- **A third caption line, or any data-dependent height.**
- **Anything on the art.**
- **A tap target**, and the native `title` attribute. The tooltip is a positioned element on
  pointer-fine devices; the mark takes no focus and no tap.
- **Motion.** Zero net motion; the glow is static.
- **Provenance in the modal.** Round 2 owns it.
