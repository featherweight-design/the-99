# The 99 — Card line item parity (design handoff, R1)

**One cross-cutting ruling on six rows that already ship.** Source of truth:
`docs/superpowers/specs/2026-09-07-card-line-item-parity-design.md`.
`design/design_handoff_the99_deck_tuning/` is the structural sibling — same folder convention, same
copy-export shape, same READINESS format.

File: `The 99 - Card Row Parity.dc.html` (canvas — pan/zoom). Read
`FLOOR-what-every-card-row-carries.md` for Q1 in full, `STATES-card-rows.md` for the
six-by-two-by-four matrix as a table, `card-rows · copy strings.ts` for the three new strings,
`READINESS.md` for what blocks a green.

**The one-line summary:** *a card row owes you its name and whether you can play it.* Two elements,
both widths, every row with an oracle id. Everything else is that surface's own business.

## What Design read

The brief, all six row components, `ui/ownership-dot.tsx`, `ui/availability-marker.tsx` and
`commanders/availability-dot.tsx` were read from the repo at `main`. Local `src/` in this project
holds only `components/shell/nav.tsx`, so **nothing here is traced from a project file** — every
geometry figure below is quoted from the component that ships it. Where this handoff and a
component disagree, **the component wins and the tables here are what to correct.**

## Two corrections to the brief's own findings

Both of the brief's no-design-opinion-needed findings hold. Each needs one amendment before eng
acts on it.

**1 · Mana appears in two rows, not one — and they draw different things.**
`rows-view.tsx` draws **colour identity** from `colorIdentity`. `card-search-row.tsx:5` imports
`CostPips` from `suggestion-tile` and draws **mana cost** from `result.manaCost`, in a fixed 34px
desktop slot, `aria-hidden`, with the comment that the slot is fixed so the ownership column stays
on one vertical line. So the add-panel search row — the brief's example of a row where a reader is
choosing between candidates and has no mana — already has mana, and has the more useful of the two.
Q2 is therefore not "should pips spread" but "are these one affordance or two". They are two.

**2 · The private dot is no longer private to the row.**
The brief cites `synergy-row.tsx:33`. It now lives in `commanders/availability-dot.tsx` as
`AvailabilityDot` + `availabilityDotState` + `LegendPip`, with a docblock arguing it *cannot* be
`ui/ownership-dot`. The finding is unchanged — solid vs dashed for unowned, plus a third colour —
but the fix is a **merge of two modules** and it takes the commander legends with it.

## The four calls

| # | Question | Called |
|---|---|---|
| 1 | Is there a floor, and how far does it reach? | **Name + one availability slot. Both widths. Every row with an oracle id.** `unresolved-row` is exempt by data, not density. |
| 2 | Do mana pips generalise? | **Neither affordance generalises.** Identity pips stay on `/collection`; cost pips stay on the search row. |
| 3 | Which ownership dot is correct? | **The shared one: dashed for unowned.** Committed joins it as an opt-in third state. |
| 4 | Canonical row metrics? | **44px phone / 34px desktop, radius 7px both widths, gap 9/10, pad 8–4 / 9.** One exception: 52px phone with a meta line. |

### 1 · The floor is two elements, and it is a slot rather than a component

**Name + availability.** The name because it is what the row stands for; availability because it is
the one fact that changes what the reader does next, and it is already computed wherever an oracle
id is.

The availability half is specified as **one slot holding exactly one of `BuyTag` or
`AvailabilityMarker`** — never neither, and never both, with one named exception. That framing
matters more than naming two components, because the two are complementary rather than alternative:
`BuyTag` speaks about a card you have none of, the marker speaks about the copies you have. Between
them they cover every card, so a row with the slot can never be silent.

**The one exception is real and it already ships:** an owned card on the Shopping list whose copies
are spoken for draws the over glyph *and* a `2nd copy` tag. Both facts are true and they are
different facts — you own it, and buying another is still the move.

**`unresolved-row` is exempt, and the reason is data.** It carries no oracle id. Owned, unowned,
committed and over-committed are all properties of *your copies of a known card*, and this row has
no card. A dashed dot there would assert "you do not own this" about something the app cannot
identify — a claim, not a placeholder. Its three redundant signals (warning left rule, `?` in the
dot's slot, `unmatched` tag) already say what it is, and the `?` keeps the dot's 7/8px slot so the
name stays on one vertical line with the card rows above and below it.

**Two rows do not get a dot, deliberately.** `rows-view` states ownership as `×1` in `--accent`,
which is *more* than a dot says — it gives the count. `card-search-row` states it in words,
`×1 owned` / `not owned`, in `--warning` when unowned. Both are stronger than a dot and both stay.
A dot beside a word that says the same thing is a second voice for one fact.

| Row | Name | Availability slot today | After |
|---|---|---|---|
| `collection/rows-view.tsx` | ✓ | marker, count-only, inline after the name | unchanged |
| `decks/decklist-row.tsx` | ✓ | marker + `BuyTag` | unchanged — this row is the reference |
| `decks/card-search-row.tsx` | ✓ | marker, joins the meta line / ownership cell | unchanged |
| `decks/unresolved-row.tsx` | ✓ | — | **exempt** (no oracle id) |
| `decks/update-diff-row.tsx` | ✓ | hand-rolled `buy` pill only | **gains the slot**; pill → `BuyTag`, marker added |
| `commanders/synergy-row.tsx` | ✓ | — | **slice A** dot merge now, **slice B** marker with the aggregate |

### 2 · Two mana affordances, and neither generalises

**Colour identity stays on `/collection`.** Identity is a *filter facet* there: the reader has just
narrowed twenty thousand cards by colour and the pips are the receipt. The 54px track and the
four-plus shingling are already solved exactly once, and R5's ring rules are untouched by this
handoff.

**Cost pips stay on the search row.** Cost is the *choice between candidates*: eight near-identical
names, and what each costs to cast is the differentiator. It already ships.

**Refused: identity pips on a decklist, a diff row or a synergy list.** Every card on a decklist is
already inside the commander's identity — that is the format. A pip track there is 54px spent to
restate a constraint the deck cannot violate, on the surfaces with the least room and the most
trailing controls. At 375px it would displace the availability slot, which is the one element the
floor requires.

### 3 · Dashed, and three states in one component

**The shared dot is correct.** Dashed is this app's shipped vocabulary for absence: the add panel's
spent slot, the diff's *we cannot name these* plate, and `--border-dashed` as a token. A solid
hollow ring reads as a *state of something present* — the same vocabulary the availability marker's
soft diamond uses — which is exactly the confusion to avoid on a row that draws both.

**Committed belongs in the shared component.** It is a fact about your copy of a card, not about
synergy: the same card in a decklist is equally committed, and `decklist-row` already shows it
through the marker. But it enters as an **opt-in third state, not a default** — a caller without
the aggregate keeps passing `owned` alone and gets two states. `availability-dot.tsx` retires;
`LegendPip` moves into `ui/ownership-dot.tsx` with it.

**Committed is filled, not a third shape.** A committed card *is* owned, so it keeps the filled
disc at `--avail-hard-fg` and moves hue only. Hollow stays reserved for absence, and it costs no
width — which is what the private dot got right and should keep.

**The legend renders the dot rather than naming its colour.** That call is already made and
ratified in `availability-dot.tsx`, because `--avail-hard-fg` is redefined by all six themes and
"amber" is true of one. It survives the merge unchanged.

### 4 · One shell, two content strategies

| Property | Canonical | Was |
|---|---|---|
| min-height | **44px phone / 34px desktop** | 44/34, 44/44, 52/44 |
| min-height, meta-line variant | **52px phone / 34px desktop** | already shipping on Shopping rows |
| border-radius | **7px, both widths** | 6/7, 7, 8 |
| padding | **8px left / 4px right phone · 9px desktop** | 8–4, 8, 12–6, 12 |
| gap | **9px phone / 10px desktop** | 9/10 on four rows, 10 flat on two |
| background | `--surface-rail` in a list · `--surface` on a page | both, inconsistently |
| hover (desktop) | `--elevated-hover`, and `--row-bg` swaps with it | three rows do this, three do not |
| over-committed | **`inset 0 0 0 1px var(--avail-over-border)`** | inset ring on one row, real border on one |
| name type | 12.5px phone / 13.5px desktop, `--fg` | 11.5–13.5 |

**Radius 7 at both widths.** 6 versus 7 is invisible at 375px and a responsive radius is a token
nobody can hold in their head. 8px on a 34px row reads as a pill, and the three rows using it are
the three tallest — which is the drift, not the intent.

**The over-committed tint is an inset ring, never a border.** `decklist-row`'s reason generalises:
a real border adds 2px to one row and shunts every row below it. `rows-view` uses a border today
and changes.

**Two content strategies, not two shells.** Five rows are flex — slots left to right, the name
taking the slack. `rows-view` stays a grid, because a browse list is read down its columns and a
flex row cannot hold a set code on one vertical line. It adopts the shell (radius, gap, hover,
ring) and keeps its template.

## Rejected

- **A `CardRow` component that owns the whole row.** Six surfaces, six trailing controls, two
  layout strategies and three different ownership statements. A component that abstracted all of
  that would take a `variant` prop with six values, which is a switch statement with a JSX costume.
  **The shell is a shared class string and a shared slot contract, not a shared component.**
- **A dot on every row, for symmetry.** Two rows say ownership better in words or a count. Symmetry
  is not the goal; a reader knowing whether they can play the card is.
- **Availability as a new column.** Ruled out already by `card-availability.md` design 3.1 and kept
  ruled out here: the marker joins an existing cell or an existing meta line. No row's grid
  template changes, no row grows in height.
- **A third radius for "utility" rows.** The distinction the brief offers — browsing rows versus
  narrow utility rows — is a good question about the *floor* and a bad basis for *metrics*. A row
  is a row; the reader does not know which category the code put it in.
- **Reviving the deck name in count-only markers.** #354 settled it and this handoff does not
  reopen it. The claiming decks are named in the card modal's allocation receipt.

## Engineering ledger

1. `ui/ownership-dot.tsx` gains a third state. Suggested shape: `state?: "owned" | "committed" |
   "unowned"` alongside the existing `owned: boolean`, or `committed?: boolean` — eng's call, so
   long as **existing two-state callers need no edit**. `LegendPip` moves here.
2. `commanders/availability-dot.tsx` deletes. `availabilityDotState` moves with it or becomes a
   caller-side one-liner; the `Dot` suffix in the type name stays, for the reason its docblock
   gives (`AvailabilityState` in `lib/decks/availability` shares the member name `free`).
3. `update-diff-row.tsx`: `OwnedDot` deletes, the hand-rolled `buy` pill deletes, `BuyTag` and
   `AvailabilityMarker` come in. `DiffRowCard` gains `availability`, which means the diff query
   joins the same rollup the decklist reads. **This is the one data change in the handoff.**
4. `synergy-row.tsx`: slice A is the dot swap and radius. Slice B is the marker and it is blocked on
   the commander route reading decks — the same aggregate `design_handoff_the99_commander_explained`
   flagged as slice B. **Do not ship a guessed over state from `committedTo`**: that field is one
   deck name; over-committed is arithmetic across every finished list.
5. `rows-view.tsx`: radius 8 → 7, and the over branch's `border` → `box-shadow` inset ring. The
   `--row-bg` plumbing and the pip rings are untouched.
6. `unresolved-row.tsx`: radius only.
7. Shell metrics land as one exported class string (or two — flex and grid) rather than six
   hand-typed copies, so the next row cannot drift.
