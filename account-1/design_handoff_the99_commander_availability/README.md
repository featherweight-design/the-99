# The 99 — Commander availability (design handoff, R1)

**Source of truth:** `docs/superpowers/design-briefs/2026-09-15-owned-is-not-available.md`, read in
full on `feat/commander-availability-brief`. **The eight rulings in §3 are drawn as written and not
reopened** — including that the page draws the app's existing five readings and invents no sixth,
that the dot drops to ownership-only with the marker carrying severity, that Role Coverage takes a
count-only marker and never a deck name, that the committed border tint retires, and that the
synergy panel's unowned rows take a **priced** tag.

`design_handoff_the99_card_captions/` is the structural sibling: the same shape of round — marks
moving onto a dense tile, four calls, a measured arithmetic section — and it landed Green at R1.
`design_handoff_the99_availability/` is the system this adds a surface to; its R3/R4/R5 rulings are
cited and not reopened.

File: `The 99 - Commander Availability.dc.html` (canvas — pan/zoom). `STATES-commander-availability.md`
is the five readings × three geometries as a table, `commander-availability · copy strings.ts` the
strings and the reuse manifest, `READINESS.md` the dependencies and the one thing R1 could not
verify.

**The one-line summary:** *the dot says owned, the marker says what that is worth, and both open
items resolve by subtraction — the marker gains no option and the legend loses two keys.*

## What Design read

The brief on its branch, and eight files at `main`: `ui/availability-marker.tsx`,
`commanders/coverage-chip.tsx`, `commanders/coverage-section.tsx`, `commanders/synergy-row.tsx`,
`decks/buy-tag.tsx`, `lib/copy/availability.ts`, `lib/copy/commander-explained.ts`, and
`docs/superpowers/design-tables/card-availability.md`. Every geometry figure in the canvas is quoted
from the component that ships it. **Where a component and this handoff disagree, the component
wins** and these tables are what to correct.

Nothing here changes what a reading means. The marker is `AvailabilityMarker density="row" nameless`,
the tag is `BuyTag variant="row"`, the dot is `OwnershipDot`, the slot is the `AvailabilitySlot`
pattern at `decks/update-diff-row.tsx:225`. **No new marker option and no new component.**

## The five calls

| # | Question (brief §4) | Called |
|---|---|---|
| **4.1** | The aria coupling | **No divergence to ratify and no third option.** The chip, the coverage row and the synergy row all carry a computed accessible name on their own control; the marker draws `nameless` with `spoken={false}` and says nothing. The deck name rides the label it already rides, now via `markerAria(a)` name-bearing instead of a `committedTo` suffix. |
| **4.2** | The legend | **Three keys become one, with two forms.** Four of the five readings print glyph + number + word and legend themselves. The dot is the only mark that is a colour without a word: `Owned and available.` while no marker is on screen (today's string, byte-identical), `Owned.` once one is. The synergy panel adds the shipped `Not owned.`; `dotCommitted` is deleted. |
| **4.3** | The sort sub-line | **`Free to use first, then wanted by a brew, then in use, then over-committed.`** Four buckets in the `/collection` filter's own four words, severity order, no counts, no `subNoFigures` twin. |
| **4.4** | Marker type on the chip | **The marker is a figure, so it takes the figure's size.** Mono **10.5px / 600 / 0.02em** on the chip against an 11.5px name and a 10.5px plate; mono **11.5px** on the phone row against 13.5px/11.5px. Glued to the name at 6px, left of the plate; padding, height and radius untouched. |
| **4.5** | The About entry | **“When a card you own isn't free”** — chapter 02, plate width, three key lines, `since: 1`. Drawn on the About R4 §8 template artboard, fields in order. |

One call the brief left open by omission, taken here: **the synergy row's marker is count-only too**
(§1, third note). The slot holds a priced tag at one reading and a marker at three, and a
name-bearing marker at ~120px would size the slot to its one truncating occupant. One vocabulary on
one page also means one width — the slot is **88px at every reading**.

---

## 4.1 · The coupling is not violated, because the marker is not the speaker

The item reads "a visible count-only label with a spoken deck name" as a departure from
`card-availability.md` §2/§3. It is not one. `markerAria` is consulted **only when a caller passes
`spoken`**, and the marker's own documentation names the callers that do not: surfaces whose
enclosing control already carries an accessible name that replaces everything beneath it. The two
comboboxes are the shipped instances. **The chip is the third, and the two rows are the fourth and
fifth.**

- `CoverageChip` is a `CardDetailTrigger` — a button whose `aria-label` is computed by `chipAria`
  and already ends `Already in ${deck.name}.` (`commander-explained.ts:261`).
- `SynergyRow` carries `rowAria` on the `<li>`, likewise suffixed today.
- So the deck name never travelled through the marker on this page, and it does not start now.

**What changes is the sentence, not the plumbing.** One clause about `committedTo` becomes four
clauses about availability, and their words come from `markerAria(a)` called *name-bearing* beside a
marker drawn *nameless*. Two calls, two explicit argument sets, one source of wording.

What the coupling actually forbids is **one component drawing a count and speaking a name from the
same call** — because then an edit to the drawn form silently reshapes the spoken one, which is the
bug R5 §8 fixed by giving the count-only forms dedicated keys. Two calls are not that.

**Refused — the chip loses the spoken name.** A regression against what ships, for a rule that does
not bind here, and it would make the card modal the only route to a fact sighted readers get in a
sentence.

**Refused — a third marker option.** A `speakName` flag would let a future caller draw a count and
announce a deck *on a surface with nothing behind it that names decks* — the exact case `nameless`
exists to prevent, on eight surfaces, permanently. Paying that to solve a problem this page does not
have is the worst of the three.

**The cost, named:** `explainedCopy.committed.ariaSuffix` is deleted with `committedTo`;
`chipAria` (`coverage-chip.tsx:58`) and `rowAria` (`synergy-row.tsx:83`) import `markerAria`
instead. Three call sites, one deleted string, no signature change on the marker. A free card still
produces the shipped accessible name byte for byte, because `markerAria` returns `null` at `free`.

## 4.2 · The legend: four readings stop needing one

Every marker is **glyph + number + word** by contract (`card-availability.md` 17.19), and the priced
tag leads with the word `buy`. `1 in a brew` legends itself; so do `none free`, `short 2`, and
silence. **No other surface in the app legends the marker** — not the decklist, not `/collection`,
not the roll-up — and this page does not get to be the exception.

What is left is the dot: the one mark here that is a colour with no word beside it.

| Where | Key | Drawn when |
|---|---|---|
| Role Coverage | `● Owned and available.` | no marker anywhere in the four panels — **today's string, unchanged** |
| Role Coverage | `● Owned.` | any marker on screen — "and available" is now false of a neighbouring chip |
| Synergy panel | `● Owned.` · `○ Not owned.` | always; it is the only panel with both dots |
| — | ~~`◆ Owned, already in a deck.`~~ | **deleted** with `LegendPip`, `AvailabilityDot`, `availabilityDotState` |

**Conditional is the shipped mechanism, not a new one.** `DotKey` (`coverage-section.tsx:73`)
already reads every card in every role and draws its second entry only when a second state exists;
`anyMarker` replaces `anyCommitted` one line lower and picks the string. It still reads all four
panels rather than the chips a cap happens to show, so expanding a panel cannot change the key.

**Why the free form is kept verbatim.** The honest word for an ownership-only dot is `Owned.`, and
shipping it unconditionally would repaint a free player's page for no gain. Keeping both forms is the
only version in which **a player whose collection covers their decks sees nothing new and nothing
changed** — the round's one unusual constraint, and the reason the free state is drawn twice in §2
of the canvas rather than left as the matrix's last cell.

**Refused — five keys for five readings.** A wrapping mono paragraph above four panels restating
words printed twelve times below it, and to be complete it would have to name silence. A key entry
for the free state is the one thing the free state cannot have.

**Refused — three keys, reworded.** Any three-key set collapses two readings into one clause, and
every way of doing that either counts or hedges. `Owned, spoken for.` over both soft and hard is the
best of them, and it is the same false certainty the brief filed this round about.

**Refused — a key for the priced tag.** The word `buy` and a price are the key.

## 4.4 · Density, and a correction to the brief's cost figure

The marker sets no size of its own, and `card-availability.md` §3.4 rules that density rides the
meta line. The chip has no meta line; it has a **figure**, and the marker is the same class of thing
— a count with a glyph on it. `update-diff-row.tsx:259` hit this exactly and answered it with an
explicit size matched to its neighbour.

| | Chip (desktop) | Coverage row (phone) |
|---|---|---|
| name | mono 11.5px `--fg-body` (shipped) | 13.5px `--fg` (shipped) |
| figure | mono 10.5px `--fg` on `--elevated` plate (shipped) | mono 11.5px `--fg` (shipped) |
| **marker** | **mono 10.5px / 600 / `0.02em`** | **mono 11.5px / 600 / `0.02em`** |
| join | **6px**, inside the name group | 6px, inside the marker |
| outer gap | the chip's shipped `gap: 8` | the row's shipped `gap: 9` |
| order | dot · name · **marker** · plate | dot · name · **marker** · figure |
| unchanged | `0 4px 0 10px`, 28px, radius 999 | 44px floor, `0 12px`, single line |
| seam | `#221D16` (`--surface-raised`) | `#1E1A15` (`--surface`) |

Weight 600 where the plate is 400: the plate has a filled ground to give it presence and the marker
has none. **Refused: 11.5px** (two equal mono runs in one pill — the marker reads as a second card
name) and **8.5px** (the tile density's size, set for a scrim over art; on a 28px pill beside a
10.5px figure it reads as a footnote to the chip rather than a fact about the card).

**Gap 1 — the brief's §3 growth estimate is low.** Ruling 3 says the chip grows "roughly 40px" in
non-free states. Measured at 10.5px mono (Plex Mono advance 0.6em), glyph + 6px join + label + the
chip's 8px gap:

| Reading | Label | Chip 10.5px | Row 11.5px |
|---|---|---|---|
| soft | `1 in a brew` | **+89px** | +99px |
| hard | `none free` | **+77px** | +85px |
| over | `short 2` | **+69px** | +76px |
| free | — | 0 | 0 |

40px buys about four mono characters; the shortest count-only form is seven. **The decision is
unaffected and stands** — the name-bearing alternative is ~120px and truncates — but a contended
12-chip panel falls from about five chips per line to **three**, not four, and anyone re-deriving a
chip-per-line budget from ruling 3's figure will be wrong. No component or copy change follows;
this is a correction to the argument, not to the call.

## The synergy slot

One `AvailabilitySlot` before the toggle, **88px, flex-none, right-aligned**, at every reading:
a priced `BuyTag variant="row" reserveSlot` when unowned, the count-only marker when owned and
contended, **nothing** when free. Sizing it to the widest occupant rather than to its content is
what keeps the toggle column still while a reader scans down — `update-diff-row.tsx:225`'s own rule,
reused rather than re-derived.

Phone puts the marker on the existing meta line beside `+8 · 14%`, at that line's own 10px, per
ruling 5. **52px unchanged, no second line, no new row.** Desktop row type: mono 11px, the inclusion
figure's size — its nearest neighbour.

The over state keeps its shipped container tint, `#6B3226`, on all three geometries: it is the one
severity loud enough to touch a container, and ruling 4 has just freed the border it lands on.
**The chip's free border — `color-mix(--success 40%, --bg)` — stays exactly as it ships**; ruling 4
retires only the committed branch of `chipBorder` / `rowBorder`, and repainting the free branch would
change every chip on a free player's page.

## Engineering ledger

| # | Change | Kind |
|---|---|---|
| 1 | **`AvailabilityMarker`** — no change. Called `density="row" nameless spoken={false}` on all three geometries, with the `seam` prop set per host (`#221D16` chip, `#1E1A15` rows, `#211C15` selected synergy row). | reuse |
| 2 | **`coverage-chip.tsx`** — `chipBorder` / `rowBorder` lose their committed branch and gain the over tint; the dot becomes `OwnershipDot owned`; the name and marker become one `gap-6` group; `chipAria` calls `markerAria(a)` in place of `committed.ariaSuffix`. `RoleCard` gains `availability`. | swap |
| 3 | **`coverage-section.tsx`** — `DotKey` reads `anyMarker` instead of `anyCommitted`, draws `OwnershipDot`, and picks between the two dot strings. `LegendPip` import deletes. | swap |
| 4 | **`synergy-row.tsx`** — one 88px slot before the toggle at desktop; the marker joins the meta line at phone; dot becomes `OwnershipDot owned={card.owned}`; `rowAria` calls `markerAria(a)`. | additive |
| 5 | **`BuyTag`** — one new call site, no change. `variant="row"`, priced, `reserveSlot` so the figures align down the list. | reuse |
| 6 | **`copy/commander-explained.ts`** — `committed.dotCommitted` and `committed.ariaSuffix` **delete**; `dotFree` keeps its string and gains `dotOwned`; `coverageSort.availability.sub` rewrites to the four-bucket sentence. | swap + delete |
| 7 | **`ownership-dot.tsx`** — `AvailabilityDot`, `availabilityDotState` and `LegendPip` **delete**, not deprecate. `OwnershipDot` gains nothing; the key draws it at 6px with the inline baseline offset `LegendPip` carried. | delete |
| 8 | **Severable:** the coverage sort's `Availability` option ships in this round (ruling 7). Its comparator orders on `availabilityState`, not `committedTo`. One sentence of copy, one comparator, no drawing of its own beyond the menu row in §6. | severable |

## Gap report

1. **The brief's ~40px chip growth is measured at 69–89px.** Decision unaffected; the cost figure
   should be corrected in §3 ruling 3 before anyone budgets chips-per-line from it. Above.
2. **The desktop synergy row's fixed columns now total ~382px** (150 type + 64 synergy + 46
   inclusion + 88 slot + 34 toggle, before gaps). At the narrowest desktop panel the type column is
   the first thing to shrink, and Design has not specified a floor for it — flagged rather than
   ruled, because the panel's responsive bounds were not read this round.
3. **`RoleCard` has no `availability` field yet.** Ledger 2 assumes the page's one
   `loadAvailability` call is joined onto the role cards before they reach the chip. §7 of the brief
   plans the read; nothing here specifies the join's shape, which is eng's.
4. **The key's pip is unverified against `OwnershipDot`'s box.** `LegendPip` carried inline baseline
   offsets this handoff has not read; if `OwnershipDot` at 6px sits on a different baseline the key
   needs the offset restored. One line either way, but it is unread.
5. **Sold-out and price-absent synergy rows are drawn only as the priced case.** `BuyTag` already
   ships `sold out` in the figure slot and renders no tail when the feed is silent, so both fall out
   of the component — but the 88px slot was measured against `buy · $4.50` and not against
   `buy · sold out` (~8 characters in the reserved figure slot). Eng should check the wider form
   before fixing 88px in place.
6. **Degraded availability on this page is not drawn.** The brief's §7 says the read is never cached
   and `card-availability.md` 10.5 says builder surfaces fail quiet. Role Coverage already owns a
   degraded note and the page's only Retry, for EDHREC. Whether an availability failure joins that
   note or stays silent is a real question this round did not answer, and it is the one thing R1
   would put on the next brief rather than call alone.

## Refused, across all five calls

- **A sixth reading.** Ruling 1, and the vocabulary is the app's.
- **Any deck name in a drawn label on this page.** The card modal names every claimant, with links.
- **A new marker option, density, or prop.** Three ratified options already cover it.
- **A legend for anything that prints its own word.** Marker, tag and count all do.
- **A key entry for the free state**, or any glyph, word, empty span or reserved width for it — with
  the single named exception of the synergy slot, which is a column and empty on every row.
- **A word for severity on the dot.** Ruling 2; the dot is two states and stays two.
- **Counts in the key or the sub-line.** The existing rule, unrevised.
- **Motion.** Zero net motion is locked; nothing transitions, including a marker appearing after the
  availability read resolves.
- **A tap target on any mark.** Marker, tag, dot and figure are all inert; the chip itself is the
  only control, unchanged.
- **The `/commanders` list row and `/discover`.** Ruling 8, out of scope, untouched.
- **The Canopy `--success` clash.** §5 of the brief; it ships ahead of and separately from this
  round and needs no handoff surface. Design owes six values, not a drawing.
