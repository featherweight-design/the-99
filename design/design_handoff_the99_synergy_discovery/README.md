# The 99 — Synergy discovery, and the last 31 (design handoff, R1)

**Track 2, stage 1.** Source of truth:
`docs/superpowers/design-briefs/2026-09-02-synergy-discovery-and-the-last-31.md`.
This brief extends exactly the surfaces `design/design_handoff_the99_recommendations/` drew;
that handoff's `README.md` + `ADDENDUM-README.md` are the structural sibling, and its
`recommendations · copy strings.ts` is the copy-export convention.

File: `The 99 - Synergy Discovery.dc.html` (canvas — pan/zoom). Read
`design_handoff_the99_richness/README.md` for the locked voice before auditing the copy,
`DENSITY-synergy-panel.md` for the §7.1 density call, and `STATES-fill-controls.md` for the
§7.5 matrix in full.

**The one-line summary:** *two figures, and only one of them is the ranking.*
Synergy is signed points in brass and it sorts the list. Inclusion is an unsigned percentage in
neutral and it is context. The panel becomes a 44px row list at both widths; the deck surface
gets a last-31 strip holding two adds, with the shipped sweep left where it is.

**Not gated.** §0's ingest landed — 3,342 commanders, 879,329 support-card rows, every row
carrying both figures. What is missing is a read path on the commander route plus a join to
`cards.type_line`. Readiness may treat this as ready-to-build.

---

## The six §7 calls

| # | Call | Answer |
|---|---|---|
| 7.1 | Density at ~260 cards | **One column of 44px rows, both widths.** Plain overflow. See `DENSITY-synergy-panel.md`. |
| 7.2 | Progressive-disclosure ladder | **One facet strip + one disclosure.** Two mechanisms, not a ladder. |
| 7.3 | Ownership per card | **Filled dot vs. hollow ring**, both already on this panel. No dashed border, no ownership filter. |
| 7.4 | Select into build + the button | **34/44px `+` → `✓` toggle**; a third promise string branches, the two locked ones are untouched. |
| 7.5 | Where the fill controls live | **Two rows, separated by a rule.** Adds in a last-31 strip; the sweep stays in the toolbar. |
| 7.6 | Cannot reach 99 | The owned control **never promises 99**; stopping short reuses `fill.provenanceShort` verbatim. |

## States delivered

| # | Frame | Desktop | Phone |
|---|---|---|---|
| A1 | Synergy row anatomy, six slots | ✓ | ✓ |
| A2 | The four §5 figure cases in one column | ✓ | — (same rule) |
| A3 | Panel at rest — headline, facet strip, 10 rows, disclosure | ✓ | ✓ (6 rows) |
| A4 | `All` facet expanded — 258 rows, 480px scroller | ✓ | — (same construct) |
| A5 | Ruling 3's exclusion, drawn as a rule | ✓ | — |
| A6 | Absent vs. degraded, and the per-row null beside them | ✓ | — (same strings) |
| A7 | Selection: 0, 7 owned, 7 with 2 unowned | ✓ | ✓ (sticky bar) |
| A8 | Selection lifetime | ✓ | — |
| B1 | The deck at 68 — provenance, last-31 strip, toolbar, rows | ✓ | ✓ |
| B2 | Shallow pool (state 2) | ✓ | — |
| B3 | Owned fill in flight (state 3) | ✓ | — |
| B4 | Reached 99 (state 4) | ✓ | — |
| B5 | Stopped short — §7.6 (state 5) | ✓ | — |
| B6 | Nothing auto left (state 7) | ✓ | — |
| B7 | A refused write (state 10) | ✓ | — |
| B8 | The synergy shelf in Consider | ✓ | — (shipped grid, 2 cols) |
| C | Token / a11y / motion contract | ✓ | ✓ |

---

## Decisions log

### 1. §7.1 — the panel is **one column of 44px rows at both widths**, plain overflow
Three shapes were available and two are wrong for reasons in the data contract, not in taste.

**Tiles are out because there is no image.** §5's contract lists oracle id, inclusion, synergy,
type line and owned quantity. No `image_uri`. A `SuggestionTile` with no art is the 0.55-opacity
gradient fallback — and 260 of them is a wall of placeholders. Adding an image join to make tiles
possible is inventing a data requirement to justify a layout.

**Two columns are out because a rank order cannot be read in columns.** At 900px the right column
fits two 440px lists, which halves the scroll — and immediately raises "is rank 2 to the right of
rank 1, or below it?" A synergy ranking whose reading order is ambiguous is not a ranking.

**So: rows, one column, 44px, at both widths.** This is `CoverageRow`'s geometry taken whole. It
also settles the sibling handoff's open gap 2 (28px pointer-only desktop chips) for this panel by
construction: the desktop target here is 44px, the same as the phone's, so the question does not
recur.

The row carries six slots: dot, name, type, synergy, inclusion, toggle. At 390px the **type line
yields first** — it is one tap away on the card detail — and the two figures drop to a meta line,
making the row 52px. That is the recommendations addendum's Shopping row exactly (A2), reused.

### 2. §5 — **synergy is signed points in brass; inclusion is an unsigned percentage in neutral**
This is the constraint the brief says must not be drawn away, so it gets four differences, not one:

| | Synergy | Inclusion |
|---|---|---|
| Unit | points, **signed** (`+47 pts`, `−5 pts`) | percent, unsigned (`31%`) |
| Colour | `--accent` | `--fg-faint` |
| Role | **the sort key** | secondary context |
| Column | left of inclusion, wider | hard right |

Points is not an invention: `suggestion-tile.tsx`'s `Evidence` already renders lift as
`+N pts vs. all decks`, and the recommendations handoff drew that line. EDHREC hands synergy back
as a fraction; the product already states it in points. Ruling 2 is satisfied — nothing is derived,
the figure is only formatted.

**Inclusion is deliberately dimmer than the name here**, which inverts the sibling handoff's chip
rule ("the number is the claim, the name is the subject"). There the chip carried one figure and it
was the claim. Here the brass column is the claim, and a bright inclusion percentage would compete
with it for exactly the reading §5 forbids.

**Negative synergy is `--fg-locked`, never `--danger`.** A card played less often here than in
decks generally is a fact about a matchup, not a fault in the card.

**No bar per row.** The sibling handoff's reasoning holds and gets stronger: 40 bars in a wrap is a
texture, and 258 bars in a column is a chart nobody asked for. The tile keeps its bar because a
tile has air around it; the row does not get one.

### 3. §7.2 — **one facet strip, one disclosure.** Not a ladder of reveals
Ruling 1 fixes the order and leaves the shape open. Three shapes were considered:

- **Two stacked reveals** (creatures, then "show other types") — the second reveal is a control
  whose only job is to admit the first one was a subset. And it makes lands, which are 56 of 258,
  reachable only behind two clicks.
- **Named type groups, all rendered** — six headed groups down the page reintroduces exactly the
  multi-list shape ruling 1 deleted, with six lists instead of two.
- **One facet strip defaulting to Creatures** — the emphasis is a default, not a wall; every other
  type is one click; `All` is one click. **Chosen.**

Ruling 1's phrasing does the deciding: *creatures are the emphasis, not the whole panel.* A default
is an emphasis. A gate is a whole panel.

Facet counts are **post-exclusion** (see decision 4), so `Creatures 66` is the number of rows that
exist. The headline's `of top 258` is what EDHREC associates. Those two disagree on purpose and
the headline is the one ruling 1 locked.

### 4. §6 ruling 3 — the exclusion is **silent**, and its counts move with the collection
Excluded: owned cards Role Coverage already draws for ramp / draw / removal / wipes. Kept:
everything else, including unowned role staples — Mana Crypt is ramp, unowned, and drawn.

**No "12 hidden" note and no toggle to reveal them.** A player cannot act on the fact that a card
appears elsewhere on the same page, and a count of hidden things invites a control to show them,
which is the ownership audit returning through the side door.

**The brief's own example cannot appear in this panel.** Sol Ring at 80% inclusion with no synergy
is the card §5 uses to make its point — and when you own it, ruling 3 removes it, because Role
Coverage draws it. The canvas makes the same point with **Command Tower** (82% / `+1 pt`, a land,
not one of the four roles). An *unowned* Sol Ring would stay.

One consequence worth stating: `classifyRoles` can class a creature as ramp or draw, so a handful
of creatures drop out of the default facet and `Creatures 66` is collection-dependent. That is the
rule working.

### 5. §7.3 — ownership is **filled dot vs. hollow ring**, and nothing else
Both marks already ship *on this panel*: `OwnedChip`'s 6px `--success` dot and `MissingChip`'s
hollow 1px `--fg-locked` ring. Merging the two lists does not require new vocabulary, it requires
putting the existing two in one slot.

**The dashed border does not survive the merge.** `MissingChip`'s dashed outline works when
unowned cards are in their own headed block; interleaved at 258 rows, roughly three quarters of the
rows are dashed and the list reads as a dashed texture with solid interruptions.

**No ownership filter on the facet strip.** That is the audit ruling 1 deleted, rebuilt as a
control. Ownership is per-row information; the headline states the aggregate; the collection is
a page of its own.

Not colour alone: filled vs. hollow is a shape difference, the count is in the headline, and the
word is in the row's accessible name.

### 6. §7.4 — a **`+` → `✓` toggle**, and a third promise string
The affordance is a 34px (desktop) / 44px (phone) square button at the row's end, `+` at rest and
`✓` when selected. Selecting also changes the **row** — `--elevated-hover` fill,
`--accent-shadow` border — because at 44px inside a 480px scroller a single changed glyph is not
enough to scan a selection by.

Two adjacent targets, the name and the toggle, is the arrangement `AutoTag` already ships on a
decklist row: the thing that looks like a label is the thing that changes state, and inspection
touches nothing.

**The copy tension resolves without touching ruling 6.** §7.4 notes the button promises "We'll fill
68 of the 99", which stops being true on the first selection; ruling 6 locks `stickyPromise` and
`seedNote`. Both hold because **the locked strings are the zero-selection copy and the new one is
a branch**: nothing is edited, nothing is deleted, and the default page is byte-identical. Two new
keys, one per width.

**The button label never changes and never takes a count.** The promise line under it holds the
arithmetic; a badge on the face prints the same number twice.

**Selecting an unowned card is allowed and named.** The row said so (hollow ring); the promise line
adds `2 you don't own yet` in `--warning`. Ruling 5 requires buying to be *explicit*, not
impossible — and a hand-made selection with an ownership mark on every row is the most explicit
buying in the product.

### 7. Selection lifetime — **page state, no tray** (ruling 4)
Cleared by navigating to another commander, by `Clear selection`, and by the build. **Not restored
by back-navigation** — a selection the player does not remember making is worse than an empty one
they can redo. **Survives facet changes and expansion**, which is the one thing the facet strip
must not reset. **Not capped**: 40 selections is a legitimate use of this panel, the promise line
reports `99 of the 99` honestly, and only past 99 does the count clamp and say so.

### 8. §7.5 — the three controls live in **two rows, separated by a rule**
Two of them add cards and the third removes 68 of them. In one toolbar they are three ghost buttons
of related shape, one of which undoes the other two.

- **Owned fill** and **buying top-up** sit in a **last-31 strip** directly under the provenance
  line — they are about the open slots, which is what that line just described.
- **`Clear all auto`** stays *exactly* where it ships: right-aligned in the decklist toolbar
  beside the All / Shopping filter. Nothing that shipped moves.

Three weights in order: **brass outline** (add, owned, main action) → **neutral ghost with a
`--warning` count** (add, buying) → **neutral ghost, a rule and a row away** (remove).

**Rejected: brass-solid on the owned fill.** It would out-shout `Build this deck`, the only solid
brass button on the previous screen, and make reaching 99 look like the app's goal. Ruling 6 says
the opposite. **Rejected: a segmented owned/buy control** — it reads as a filter, and one half
spends money.

At 390px the two adds stack full-width at 44px (the add-panel addendum's mobile CTA rule) and the
sweep still does not join them; it stays on the filter row, which is what keeps the opposites apart
once the strip is a single column.

### 9. §7.6 — the owned control **states what it can place**, and short is not failure
The label is `Fill 24 from my collection`, never "fill the rest": the pool frequently runs out, so
"the rest" is a promise the control cannot keep. When it stops short, the strip's line reads:

> *92 of 99. Your collection ran out 7 short — you own what you own, EDHREC knows what it knows,
> and that is everything we have.*

The clause after the dash is **lifted verbatim from the shipped `fill.provenanceShort`**, which
already says this exact thing about the 68-card fill. Saying it differently about the last 31 would
be two voices for one fact. The owned control is then **absent, not disabled** — the sweep's
shipped precedent at zero — and the top-up is the way forward.

### 10. Surface B needs **no new component**, and one shipped condition is now wrong
`SuggestionTile` already draws both figures differently: `Evidence` renders inclusion as a bar
plus a percentage and synergy as `+N pts vs. all decks`. Surface A's row is that distinction
ported to a list, not a new idea — which is why there is no new tile, no new shelf component and no
new panel. One shelf is added to `buildShelves`, ordered by synergy instead of by gap, sorting
above the unowned append and below the coverage shelves.

**But the lift line is gated on `suggestion.owned`** (`suggestion-tile.tsx`; design table §8-6
already flags this as unresolved). On a shelf whose entire ordering *is* synergy, hiding the figure
on unowned tiles means the second tile in the row cannot show why it is second.

**Called: the lift line prints regardless of ownership.** This closes §8-6 rather than deferring it
a third time. The open question was whether the gate was about ownership or about thinner data for
a card you do not have — and §0 answers it: all 879,329 rows carry both figures.

---

## Component notes

Hexes live only in `globals.css`. **No new token, no new hex, no new motion class, no new empty
state, no new modal.**

| Component | Spec |
|---|---|
| **Synergy row (desktop)** | `--surface` on `1px --border`, radius 8px, min-height 44px, padding `0 6px 0 12px`, gap 10px. Slots: dot 7px · name 13.5px `--fg` ellipsed `flex:auto;min-width:0` · type mono 10px `--fg-locked` 150px ellipsed · synergy mono 11.5px `--accent` 64px right tabular · inclusion mono 11px `--fg-faint` 46px right tabular · toggle 34×34. |
| **Synergy row (phone)** | Same fill and border, min-height **52px**. Name 13.5px over a meta line: mono 10px, `+N pts` in `--accent` then `· edhrec N%` in `--fg-faint`. Type line dropped. Toggle 44×44. |
| **— absent figure** | Em dash mono, `--fg-locked`, `aria-hidden`. Each figure absent **independently**; a null synergy never suppresses a real inclusion. |
| **— negative synergy** | Mono 11.5px `--fg-locked`, minus sign U+2212, tabular. Never `--danger`. |
| **Ownership mark** | Owned: 7px filled `--success` (`OwnedChip`'s dot at the row's size). Unowned: 7px `1px --fg-locked` ring, transparent fill (`MissingChip`'s dot verbatim). |
| **Select toggle** | 34×34 desktop / 44×44 phone, radius 7px, `1px --border-strong`, glyph mono `--fg-faint`. Selected: `1px --accent`, glyph `--accent`, fill `color-mix(--accent 10%, transparent)`, glyph `✓`. `aria-pressed`. |
| **Selected row** | Fill `--elevated-hover`, border `--accent-shadow`. No transition. |
| **Facet strip** | Mono 11.5px pills, height 30px (32px phone), padding `0 11px`, radius 999px, `--surface-raised` on `1px --border`; count in `--fg-locked`. Selected: `1px --accent`, label `--fg`, count `--accent`. `All` takes the dashed `--border-strong` treatment when unselected — it is a scope, not a type. Horizontal scroller at 390px. |
| **Figure legend** | Mono 10px `--fg-locked`, one line, once per panel, above the header row. `+pts` in `--accent`. |
| **Column header row** | Mono 9.5px `--fg-locked`, `letter-spacing .14em`, uppercase; `synergy` in `--accent`. Desktop only. |
| **Disclosure** | `CoverageDisclosure` geometry: dashed `--border-strong`, mono 12px `--accent`, full-width 44px row at both widths here (not a chip — the list it opens is a column). `Show all N {facet}` → `Show fewer`. |
| **Expanded container** | `max-height: 480px; overflow-y: auto`. **No expanded item cap** — see `DENSITY-synergy-panel.md`. |
| **Promise line (selection)** | Mono 10.5px, `--fg-body`; total in `--fg`; unowned clause in `--warning`. Under `Build this deck` at desktop, in the sticky bar at phone. `Clear selection · N` mono 11px `--accent` beneath. |
| **Last-31 strip** | `--surface-rail` on `1px --border-strong`, radius 10px, padding `14px 16px`. Heading mono 10.5px `--accent` uppercase `letter-spacing .14em`; sub-clause mono 10.5px `--fg-faint`. Sits between the provenance line and the toolbar rule. Unmounts at 0 open slots. |
| **Owned fill control** | `1px --accent`, transparent, label 13px 600 `--accent`, radius 8px, `10px 16px`; 44px full-width at phone. In flight: border `--accent-shadow`, label `--fg-faint`, `fill.fillingRows`. Absent at 0 owned candidates. |
| **Buying top-up** | `GhostButton` (§404 secondary): `1px --border-strong`, label 13px `--fg`; count mono 11px `--warning` on its face. Absent at 0 unowned candidates. |
| **`Clear all auto`** | **Unchanged.** Toolbar, right-aligned, mono 12px, absent at 0. |
| **Shortfall line** | The shipped provenance shape — `--surface-sunken`, `1px --border`, `border-left 3px --accent`, radius 9px, 20px `i` disc, body 12.5px `--fg-body`. Not `--warning`: running out of cards is not an outage. |
| **Refusal** | Shipped `MutationError` under the clicked control, as `AutoTag` stacks its own. The other control stays enabled. |
| **Consider synergy shelf** | `ShelfSection` unmodified. Heading `Synergy · {commander}`, meta `ranked by synergy · N to consider`. `SHELF_CAP` 12 applies. |
| **Tile lift line** | Unchanged geometry (mono 9.5px `--accent-shadow`), **one condition removed**: no longer gated on `owned`. |

## Notes for engineering

- **The read path is the work.** `SynergyPanel` currently takes `overlapOwned` / `overlapMissing`
  — two arrays of names off `c.overlapOwned` (`detail.tsx:309`, `:342`). It needs
  `cards: { oracleId, name, typeLine, cardType, inclusionPct, synergy, owned }[]`, ordered by
  synergy descending with absent last, from `commander_support_cards` joined to
  `cards.type_line` (`schema.ts:31`).
- **`OwnedChip` and `MissingChip` both die.** They are inert `<span>`s
  (`role-card-list.tsx:3-24`, `detail.tsx:21-47`) and neither survives the merge. Their *dots*
  survive, in the new row.
- **`CardDetailProvider` is already mounted on this route** (`detail.tsx:370`) and
  `CardDetailTrigger` is already wired to the coverage chips (`coverage-chip.tsx:49-84`). The
  synergy cards were simply never wired to it. Siblings = the **selected facet's** ordered oracle
  ids, so Prev/Next pages the visible ranking, not the whole 258.
- **No Add control in the modal on this route** — the modal must not assume a deck. That derived
  constraint carries over from the recommendations handoff unchanged.
- **`cardType` is a derived column, not the type line.** The `All` facet prints the card type
  alone and the facet strip groups on it; both need a coarse bucket
  (creature / instant-sorcery / artifact / enchantment / land / other), which is a parse of
  `type_line` and should be computed once server-side, not per row in the client.
- **The exclusion runs server-side, before the facet counts.** Client-side exclusion means the
  counts are computed twice from two different lists.
- **Selection carries into `createDeck`** as an array of oracle ids on the existing
  `/decks?commander=` entry. Everything it places is `auto` (ruling 7), and the 68-card fill
  must not double-place a selected card — dedupe before `planFill`, or the selected card is
  spent twice and the deck lands at 98.
- **The 68 baseline is unchanged** (ruling 6). `planFill` is untouched; `FILL_BASELINE_TOTAL`
  stays derived.
- **Two new server actions**, one per fill control. The owned one iterates the ranked support list
  filtered to `owned`, in colour, not in deck, singleton-legal, stopping at 99 or at pool
  exhaustion and returning a shortfall count. The buying one is the same iteration without the
  `owned` filter. Both write `auto = true`.
- **`addCardToDeck` already validates, enforces singletons and caps at 99**
  (`actions.ts:332-381`) — the per-card Add on the Consider shelf needs nothing new.
- **The unowned top-up here is NOT `getDeckSuggestions`' `slice(0, 5)`.** That flat slice
  (`actions.ts:106`, `:153`) is the 68-card fill's top-up and the recommendations addendum
  already corrected the record on it. The last-31 top-up is a new iteration over the ranked support
  list with no role bounding at all — the roles are already met, which is the whole point of the
  last 31.
- **`suggestion-tile.tsx`: remove `&& suggestion.owned` from the lift line's condition.** One
  clause, and it closes design table §8-6.
- **`consider-panel.tsx`: one shelf key added** to `ShelfKey` / `buildShelves`, sorted by
  synergy, placed above the unowned append. `rolesWithShelves` is untouched — the synergy shelf
  has no role and no coverage cell pointing at it.
- **`role-counter-strip.tsx` / `role-counter-cell.tsx`: untouched.** The last 31 is not a role
  and gets no cell.
- **Live region:** the selection count and both fills announce on the existing region. One message
  per settle, debounced. Twelve fast toggles is one announcement.
- **Copy** lives in `src/lib/copy/` — see `synergy-discovery · copy strings.ts`. It adds a
  `synergyCopy` block and **edits nothing**: the two `REPLACES`-shaped entries in that file are
  both additions beside a kept string, per ruling 6.
- **Mock data:** Kykar, Wind's Fury, continuous with the recommendations and add-panel handoffs
  (Jeskai, 68-card fill, 7 in Shopping, the same role arithmetic 10 + 10 + 8 + 3 + 37 = 68). Card
  names, types and colour identities are real. **Synergy and inclusion figures are plausible and
  fabricated** — do not read them as EDHREC values. The §0 figures that *are* real, and are quoted
  as such in `DENSITY-synergy-panel.md`, are The Chief Warg's: 258 support cards, 66 creatures,
  56 lands, synergy 0–0.83.

## Gap report

1. **The 99/99 celebration collision is back.** `shouldCelebrate` fires at 99/99. The 68-card
   fill deliberately stopped at 68, so the recommendations pass introduced no collision — this pass
   does, because reaching 99 in two clicks is the feature. The kaiju reveal will fire on a deck the
   player did not build card by card. This is the same defect the deck-import handoff flagged
   (#42), from a second direction, and it now has two callers. **Needs a ruling, not a redraw.**
2. **The facet buckets are a taxonomy decision with no source.** Six buckets is Design's split of
   `type_line`. Planeswalkers, battles and multi-type cards (artifact creatures, enchantment
   creatures) have no stated home. Drawn: an artifact creature is a **creature** — the facet
   answers "what supports this commander", and a creature that is also an artifact is still a
   creature. Not verified against the real distribution of any commander's 258.
3. **Selection is not persisted, by ruling.** A player who selects fifteen cards, follows a card
   detail link away from the page and comes back has lost them. Ruling 4 forbids the tray that
   would fix it. Worth knowing before the first support ticket.
4. **The dedupe between selection and the 68-card fill is not free.** If a selected card is also
   what `planFill` would have placed for ramp, the deck must not hold it twice and must not land
   at 98. Design's expectation is that the selection is placed first and the fill runs against the
   reduced pool, which means the fill's role counts can come out *different* from the
   zero-selection case — and the provenance line's arithmetic has to reflect that. Not drawn,
   because it is arithmetic rather than layout, but it is not nothing.
5. **480px of scroller at 258 rows is a judgement, not a measurement.** See
   `DENSITY-synergy-panel.md`. One constant.
6. **No search inside the panel.** At 258 rows a player looking for one specific card has the
   facet strip and their eyes. The quick-add search on the deck surface covers the "I know what I
   want" case; on the commander page there is no equivalent, and this handoff does not add one.
   Deliberate — a search field above a ranked list invites people to stop reading the ranking —
   but it is the most likely thing to be asked for.
7. **The buying top-up has no ceiling and no cost.** It will happily add 31 cards the player does
   not own. There is no price data anywhere in the product, so it cannot say what that costs. If
   pricing ever lands, this control is where it lands first.
8. **Two entry points for one job, by ruling 4, taken knowingly.** Nothing here mitigates it and
   nothing should: the risk is a player who selects on the commander page, forgets, and then uses
   the deck-page fill. They end up with a deck holding both — which is a correct deck, just not the
   one they pictured. Flagged because the audit will notice it.

## Files
- `The 99 - Synergy Discovery.dc.html` — the canvas (this handoff's deliverable).
- `README.md` — this file.
- `DENSITY-synergy-panel.md` — the §7.1 density / max-render recommendation.
- `STATES-fill-controls.md` — the §7.5 states matrix, all eleven states × three controls.
- `synergy-discovery · copy strings.ts` — the copy block, production-final.
- `READINESS.md` — self-assessed readiness and what blocks a green.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
