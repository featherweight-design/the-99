# Design Brief — One filter chassis

**Workshop:** 2026-09-11, Hugh + agent. No ticket — scoped from a direct request ("consistent
filters throughout the app"). This brief is the source of truth the Claude Design handoff prompt
points at.

**Verified against `origin/main` at `a461112` on 2026-09-11.** Every `file:line` below was read on
that commit, not recalled.

The app filters on four routes across three implementations. They disagree on chassis, on where the
controls sit, on what a colour selector looks like, and on whether filtering costs you horizontal
room — and the two routes that share an implementation still hand it a different control set. This
brief asks for one chassis all four mount.

---

## §1 The four routes, as they stand

| Surface | Chassis | Dimensions | Colour control |
|---|---|---|---|
| `/commanders` | Horizontal rack, mobile sheet — `src/components/commanders/rack/filter-rack.tsx:37` | search, colour, availability, order | `rack/colour-control.tsx:27` |
| `/discover` | **The same `FilterRack`**, mounted by `commanders/discovery-view.tsx:560` | search, colour, order — **no availability**: `filter-rack.tsx:109` mounts `AvailabilityControl` only when `lane === "owned"`, and the tests assert its absence on discover. The order control offers different options here, two of which decide what the lane is ranked on | `rack/colour-control.tsx:27` |
| `/decks` | **Desktop sidebar column** + mobile sheet — `src/components/decks/deck-filter-column.tsx:135`, `deck-filter-sheet.tsx:114` | search, status, colour, played-window — **sort is not in the column**: desktop mounts `DeckSortMenu` separately in the toolbar (`decks-view.tsx:173`), and only the mobile sheet carries it alongside the filters | `deck-filter-column.tsx:107` (`ColourSwatch`) |
| `/collection` | Horizontal bar — `src/components/collection/filter-bar.tsx:58` | search, Type, Set, Color, **Availability** (`filter-bar.tsx:229-261`), Sort, view toggle | `collection/color-pip.tsx:5` |

**Four routes, three implementations.** `/commanders` and `/discover` mount one `FilterRack` in one
control order — search, colour, optionally availability, then order (`filter-rack.tsx:98-120`). What
differs is the control *set* and the options inside one control: availability is gated on the owned
lane, deliberately, with `:107-108` recording that discover mounts nothing there rather than a
greyed stand-in, and the order control offers different options per lane. **Placement is not the
problem on these two** — they are the one pair in the app that already agrees on where things sit,
which is why §3.5 asks whether the remaining difference is still worth keeping rather than asking
Design to reconcile a layout.

**Three colour controls for one concept.** That is the clearest evidence the surfaces were never
designed as a system.

**The `/decks` sidebar is the layout cost.** Every surface spends *some* room on filtering — the
collection bar takes a horizontal strip above its content — but `/decks` is the only one with a
dedicated sidebar, so it is the only one paying in **width** rather than height. It pays it on the
surface whose content, deck art, most wants the width.

---

## §2 Decisions locked in the workshop

1. **A new chassis, drawn for all four routes.** Not an adoption of the collection bar or the
   commanders rack. Both are working answers drawn for their own surface's dimensions, and neither
   was drawn against `/decks`'s five, which is the density the shared frame has to survive. **The
   rejection is about dimensions, not layout**: an earlier draft said the rack costs `/decks` its
   horizontal room, and that was wrong — `FilterRack` is a full-width wrapping row
   (`filter-rack.tsx:91-121`) and would cost vertical space, not width. The width on `/decks` is lost
   because `DeckFilterColumn` is a **sibling of the deck content** inside a `sm:flex-row`
   (`decks-view.tsx:223-231`); that is what decision 4 removes, and any chassis mounted above the
   content returns it.
2. **Shared chassis and shared controls; per-surface dimensions.** The surfaces genuinely
   filter different things — status and played-window are deck-only, Type is collection-only. The
   consistency being bought is the frame, the control vocabulary, the panel behaviour and the sort
   affordance, not a forced-identical dimension set.
3. **Set filtering comes to `/commanders`.** The one dimension being added rather than rearranged.
   **Its matching rule is not yet settled — see §6.**
4. **The `/decks` sidebar goes.** The width it returns belongs to deck art. See the sibling brief
   `2026-09-11-one-commander-image.md`, which spends it.
5. **Real mana symbols replace the abstract swatches.** Recognisability beat bespoke: these are the
   symbols the player already reads on the cards in their hand, so they are not redrawn for this app.
   **They ship as Scryfall's own full-colour SVGs, drawn as images** — not masked, and not a webfont.
   See §4, which was rewritten after opening the endpoint and which changes what Design has to solve.

## §3 What Design is being asked to call — open

- **§3.1 The chassis itself.** Where the frame sits relative to content, how a dimension opens, what
  an active filter looks like at rest, and how the whole thing collapses on a phone. This is the
  substance of the handoff.
- **§3.2 Density at five dimensions.** `/decks` carries the most (search, status, colour,
  played-window, sort). If the chassis reads well there it reads everywhere; the brief asks Design to
  draw `/decks` first and prove the others against it.
- **§3.3 Result and clear affordances.** `/commanders` and `/discover` have `rack/result-line.tsx`;
  `/decks` and `/collection` do not state their result count the same way. One answer, applied
  everywhere.
- **§3.4 Whether sort belongs in the chassis at all.** Sort is not a filter, and the app currently
  answers this two ways on one route: `/decks` puts sort in the toolbar on desktop
  (`decks-view.tsx:173`) and inside the filter sheet on mobile. Design may separate sort from
  filtering or keep them together, but one answer has to hold on every route and at both widths.

- **§3.5 What separates `/commanders` from `/discover`.** They share a component and one control
  order; what differs is the control *set* (availability is owned-lane only) and the options inside
  the order control. Design calls whether that difference is still meaningful under one chassis, or
  whether the two lanes converge. Placement is not at issue on this pair.
---

## §4 Constraint — the symbols are full-colour artwork, and that changes the mechanism

**This section was rewritten after opening the endpoint. The earlier version inferred the answer from
a neighbouring one and inferred it wrongly.**

The set-collections audit established that `svgs.scryfall.io/sets/*.svg` is a bare `<path>` with no
`fill`, renders black on every theme, and needs `mask-image` with a token background
(`docs/superpowers/readiness-set-collections.md` finding 1). That is true, and it is about **set
icons**.

**Mana symbols are a different endpoint and a different kind of asset.**
`svgs.scryfall.io/card-symbols/W.svg` is a `<circle fill='#F8F6D8'>` — the cream mana-pip ground —
with the symbol drawn over it in a darker path. Hybrid symbols carry two: `WU.svg` opens with a blue
`#C1D7E9` half and a cream `#F8F6D8` half. These are finished, multi-colour illustrations that
already carry Magic's own canonical pip colours.

**So they are used as images, not as masks.** A single token-coloured mask cannot preserve a
two-tone hybrid pip, and flattening a white pip to one colour would destroy the thing that makes it
recognisable. The consequences for Design:

- **These assets are theme-independent.** A white mana symbol is cream in all six themes, because
  that is what the symbol *is*. This is the one place in the app where ink does not take a `var(--*)`
  colour, and it is correct here.
- **The design problem moves to the surround.** Since the pip cannot adapt, the chassis around it
  must — selected and unselected states, focus rings, and the ground the pip sits on all have to work
  against a fixed cream-and-black palette in six themes, the darkest and lightest included.
- **A webfont is still out**, but for a plainer reason than the masking one: these are colour assets,
  and a font would give monochrome glyphs.

## §5 Dependency — set collections owns the colour control first, and this brief changes it under them

`docs/superpowers/readiness-set-collections.md` finding 2 records that `filter-bar.tsx` builds the
desktop pip row inline and the mobile Color panel separately, and that the set-collections build
must extract a parameterised colour control to mount it on a second surface. **That extraction has
not happened yet** — it is Task 9 of `docs/superpowers/plans/2026-09-11-set-collections.md:967`, and
`filter-bar.tsx` still builds both variants inline today. The plan's own constraint (`:38`) is that
it must come out parameterised, never taking an `isSetPage` flag.

**Engineering note, not Design's problem — Task 9 cannot pass as written.** Its test expects five
elements matching `getByRole("button")`, named `/red/i` and `/blue/i`, carrying `aria-pressed`.
`color-pip.tsx:17-21` emits `role="switch"` with `aria-checked` and an accessible name of
`Filter by R`, so a verbatim extraction — which the same task requires — fails all three
assertions. The task needs its test rewritten against the real API before it runs, and this brief
names it because §5 treats Task 9 as the prerequisite that produces the first shared control.

**This is a collision, and it needs a decision before the chassis is drawn.** The set-collections
handoff does not merely consume that extracted control — it locks its behaviour. `README.md:345`
reads "The colour filter is mounted, not forked. Same component, same URL key, same lit/unlit
rule", and `:55` specifies the set pages' colour filter as "`filter-bar.tsx`'s pip row mounted
verbatim". Those set pages are **not** among this brief's four routes.

So decision 5 — abstract swatches out, Scryfall's full-colour symbols in — cannot be contained to
four routes. Either the set pages inherit a control whose appearance changed after their handoff
went Green, or the control forks, which that handoff explicitly forbids. **The brief takes the first
branch**: there is one colour control in the app, the set pages mount it, and its appearance changes
for them too. What that costs is a ratification, **and a measurement nobody has made yet**. The set
pages' colour well is drawn in that handoff's own property table; `STATES-set-grid.md` enumerates
the pages' fifteen states rather than the control's contrast, and `readiness-set-collections.md`
carries no contrast figure for the swatch at all — its audited figures are for `--fg-locked` and
`--border-dashed`. So there is no prior number to compare against: a fixed cream pip on
`--surface-sunken` needs a fresh contrast check in all six themes, and Design should run it as part
of drawing the pip rather than assuming the set pages inherit a verified result.

**That build goes first.** It is Green and planned (`docs/superpowers/plans/2026-09-11-set-collections.md`)
while this brief is not yet drawn. The extraction it performs is the first shared control; this
chassis then adopts and replaces it rather than racing it. Design does not need to design around
this — it is an engineering sequencing note — but the extracted control is the thing Design's colour
treatment lands on.

---

## Out of scope

**`src/components/ui/cost-pips.tsx` is not in this handoff.** It draws mana cost on decklist rows and
card rows as coloured circles with numerals, and it is being worked in a separate track. Whether the
cost pips adopt the same symbol glyphs is a real question and a good one — it is deferred so the two
tracks do not collide on one file. Design should draw the filter pips as if that answer will
eventually be yes, so the two can converge without a redraw.


---

## §6 Open — what "filter commanders by set" actually matches

The decision to add set filtering to `/commanders` was locked without a matching rule, and the data
model does not supply an obvious one. Commander rows come from `cards`, which is **oracle-level** —
`src/db/schema.ts:56-58` states outright that it holds "one arbitrary printing per oracle_id and
therefore cannot answer 'which art does this collection actually own?'". Set code lives on
`printings.setCode` (`:65`), and a commander may have many printings across many sets. So "is this
commander in Dominaria United?" has at least three defensible answers:

1. **Any printing.** The commander is offered if it was ever printed in the selected set. Widest, and
   ignores what the player owns.
2. **An owned printing.** The commander is offered only if a copy the player owns is from that set.
   Narrowest, and the only one that answers "what can I build from this set's cards".
3. **The representative printing.** Whatever `cards` happens to carry. Cheapest, and **wrong** — the
   row is arbitrary by the schema's own admission, so the same commander would appear or vanish based
   on which printing the ingest happened to pick.

**Engineering's read is that (2) is the direction, but it is a new rule for this surface rather than
an established one.** The printed-name work (PRs #509–#511) established that the app names and draws
a card as *the copy the player owns* — on deck and collection surfaces. It did **not** reach the
commander list: `src/lib/recs/recommend.ts:153,175` still selects `cards.imageUri` and
`cards.artCropUri`, which are oracle-level by construction. So every render in the commander lane
today shows an arbitrary printing's art, and an owned-printing set filter would be the first
printing-aware behaviour on that surface — needing a printing-aware query, and an answer for what
the row then draws and names. That is a larger change than "add a filter", and it is the reason
this section is open rather than decided.

**This brief does not close it, because the choice is visible.** Under (2) a set filter on
`/discover` — whose population is every indexed commander the player has **neither built around nor
owns**, the two exclusions together partitioning the index with `/commanders`
(`src/lib/discovery/candidates.ts:362-364`) — can never match on an owned printing, because by
definition it holds none. That is either a reason to scope the dimension to the owned lane or a
reason to pick (1) there. Design should call
whether the control appears on both lanes and what it means on each. **There is a second half to the
same question**: whichever printing satisfies the match is not necessarily the one whose art the row
draws, and a row that matches on a set while showing another set's art is a visible contradiction.
