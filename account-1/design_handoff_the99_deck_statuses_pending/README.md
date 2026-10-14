> **SUPERSEDED 2026-09-19 by R5** — `README-r5.md` and `STATES-to-build.md` in this folder.
> Both deck-state marks described below (the hollow plate, the 2px `--fg` edge) shipped on
> 2026-09-18 and were retired the next day: they were the only wordless signals in the deck list,
> and the plate measured ~39 near-neutral units against `Building`. The state they signalled is now
> a seventh status value, **`To build`**. Kept as the record of what was decided and why.

# The 99 — Deck statuses · pending changes (design handoff, R4)

An addendum to the locked six-value vocabulary, not a new surface. No brief; the five rulings the
ask left to Design are called below.

Sources of truth read in full at `main`:
`design/design_handoff_the99_refresh/STATES-deck-statuses.md` (the six values and their per-value
table) and `design/design_handoff_the99_deck_versioning/STATES-pending.md` (the pending banner
already drawn on the deck page). Code read at `main`: `lib/decks/status.ts`,
`lib/decks/status-style.ts`, `lib/decks/filter.ts`, `components/decks/status-pill.tsx`,
`deck-card.tsx`, `deck-filter-column.tsx`, `spine-mobile.tsx`, `components/home/resume-decks.tsx`,
`lib/copy/deck-versioning.ts`.

Files: `The 99 - Deck Statuses · Pending (R1).dc.html` (canvas — pan/zoom; `4a` is R4 and the live answer; `3a`, `2a`
and `1a` are kept and marked superseded), `STATES-pending-mark.md` (the per-surface matrix),
`deck-statuses-pending · copy strings.ts`.

---

---

## R3 — the rule is `--fg`, and the labels are Title case

Two corrections, both from material supplied after R2.

### Correction 1 · the labels are Title case

`refreshCopy.status` is `'Draft' 'Building' 'Over' 'Unresolved' 'To buy' 'Complete'` — one source,
six strings, printed verbatim by the pill. R1 and R2 drew them lower case, which was **invented, not
read**. Every chip in the canvas is corrected, superseded turns included.

### Correction 2 · "brass" is one theme, not the app — and `--accent` collides

`--accent` is a **per-theme hue**: brass in Low Sun / Amonkhet (#CF8745), and hot pink, lime, teal,
violet and blue in Neon Rain / Kamigawa, Canopy / Ixalan, Oil Haze / New Phyrexia, Witching Hour /
Eldraine and First Frost / Kaldheim. R1 and R2 both argued from the brass,
which is simply the palette I was drawing in.

Worse than parochial — it collides. `STATUS_TOKEN["To buy"] = "--accent"`, so an accent rule on a
`To buy` pill is an accent edge on an accent plate under an accent label: the mark reading as a
heavier border of the pill's own colour, on the one value it most needs to be separable from. Not a
palette accident in one theme — **true by construction in all six.**

**The rule is `--fg`.**

- It is the one ink in the palette that is neither a status token nor a hue — the near-white each
  theme defines as its brightest reading colour — so it **cannot collide with a status by
  construction**, which is precisely the property `--accent` lacked.
- It is the highest contrast available, which a 2px signal needs more than a 22px plate does, and in
  greyscale it is the lightest edge on the chip — still distinct from Building's dash, a line
  *style* at hairline weight.
- **What it gives up, stated:** the literal colour tie to the decklist's `--accent` row rule. The
  shared meaning was always the *geometry* — a 2px left rule — and the two sit on different grounds:
  a flat row there, a coloured plate here. The detail figure keeps `--accent`, so the accent still
  appears in the pair.

The sweep is drawn in the canvas: six values × six themes, clean row above and marked row below,
each card on its own `--bg`.

### Open, not decided

Your status sheet reads `87 of 99`; `refresh.ts`'s header states the convention as `99 / 99` and
the tile builds `\`${built} / ${bodySize}\``. The chips are drawn at the shipped geometry (22px,
mono 10.5, radius 6) rather than at the sheet's scale, which I will not read a pixel value off. Both
are yours to settle; neither changes a ruling.

## R2 — one chip. The rule goes on the pill.

R1 drew a second worded chip beside the status. **It is withdrawn**, and two questions from review
are why.

### "When would a Draft ever be pending?"

By cutting a committed deck to nothing, and only that way. Rare — and it is the state where the
pill lies loudest: `draft` on a deck holding a committed 99-card v2. **R1's reason for excluding it
was false**: it said a deck at 0 has never committed a version, and `built` is the *draft's* count,
not the version's. The exclusion is withdrawn; the mark applies to all six values.

### "When would Building ever come into play?"

Constantly — it is the commonest draft there is. Cut three, add three: between the cuts and the adds
the deck is at 96, which is `Building`. Add first and it is at 102, which is `Over`.

**Which is the finding this pass turns on: the count pill goes transient while a draft is open.**
One deck flips *Complete → Building → Over → Complete* over the course of one edit. Mid-draft the
pill is reporting the editing, not the deck. Nothing is blocked either way — `STATES-pending.md`
state 6 already rules that a committed 101 commits fine and the banner says nothing extra about it.

### The pass

1. **The mark is a 2px left rule on the status pill itself** (`--accent` here; corrected to `--fg`
   in R3 — see above). One chip. The pill's word,
   fill and hairline are untouched at every value; Building keeps its dash, which now meets the
   rule on the same box and still reads as two facts (a line *style* against a line *weight*).
   It costs 2px and displaces nothing, anywhere.
2. **The words move to the detail row**, which is already the slot for "the one figure that explains
   the status" — and while a draft is open that figure is `36 changes since v2`, in `--accent` so
   the rule above and the line below are one mark read top to bottom. Never a glyph without a word
   on a surface that has room for one.
3. **The change figure outranks the count figures — reversing R1.** `2 over` mid-draft is the
   transience above, not a fact to act on. The change figure is the thing the reader did not know.
4. **`Unresolved` is the one exception and keeps `2 lines unresolved`.** An unnamed line is not
   transient and not a consequence of editing — it is a card we cannot even price, which is why the
   shipped cascade already ranks it above shopping. Its brass edge still says there is a draft.
5. **Home's resume row gets the edge and no figure**, because it has no detail slot and needs none:
   the stamp on its first line already reads `edited 2h ago`, and `touchedBy` returns the edit as
   the winning act for exactly the decks this mark is about. The edge says *not committed*, the
   stamp says *when*. R1's dropped to-buy clause comes back.

### What the pass retires

- **The 330px collapse rule** and the derived 168px measurement it stood on — gap 1 closes by
  deletion rather than by probe.
- **The resume row's ~58px and its dropped clause** (gap 3) and the mobile spine's width worry
  (gap 4). Three of five gaps go with the second box.
- **`pending` as visible copy.** It survives in every accessible name and as the `Has pending
  changes` filter row — a label read once, not a chip read on every tile.

Unchanged from R1: ruling 1 (not a seventh value), ruling 2 (`Draft` is not renamed), ruling 4's
token argument, ruling 5 (the `Changes` facet). **Gap 2 — no `hasPendingChanges` on the list read —
still stands and is now the only blocker.**

---

## R1 — the original pass, kept for the record

---

## R4 — the axis that was actually wanted

R1–R3 drew "the draft differs from the committed version". The state the product owner needs is
**"this deck has never been committed at all"**, and the two are not the same thing:

| | v1 exists | No v1 |
|---|---|---|
| What it is | committed once, bought, sleeved, played — **a deck** | might get bought, might get scrapped — **a plan** |
| Uncommitted work on it | tinkering | the whole thing |
| Lifetime | hours | weeks, months, or forever |

**One boolean, and `statusPill()` has never been able to see it.** It reads counts and ownership
only, so a 99-card plan and a sleeved deck mid-swap are *literally the same input* — both `To buy`.
That is the defect, and it is not the pending-changes defect.

### Two mistakes in R1–R3, named

1. **I drew the sub-state and called it the state.** Pending changes is a property of decks that
   *have* a v1. Ruling 3 then excluded the no-v1 case by name — precisely the case in question.
2. **I marked the transient thing.** A draft lasts hours; a plan lasts months. The louder treatment
   belongs to the state that is on screen longer and answers the bigger question.

### The pass: a filled chip is a deck, a hollow chip is a plan

**The phase drops the pill's status tint.** The word, the ink, the hairline, the height and
Building's dash are all untouched; only the plate changes. Three readings in one box:

| Reading | Plate | Edge |
|---|---|---|
| A plan — no v1 | `--bg` (no tint) | — |
| A deck — v1 exists | the status token at its own alpha | — |
| A deck, mid-tinker | the status token at its own alpha | 2px `--fg` left rule (R3's mark) |

- **The two marks cannot collide — by definition, not convention.** The edge means "differs from
  the version", which requires a version; the hollow plate means there is none. **No deck can ever
  show both.**
- **Still not a seventh value.** A plan can be any of the six, so the phase does not partition them
  and cannot be a row in `STATUS_ORDER`. Ruling 1 survives; what changes is which axis gets the
  louder treatment.
- **The `Draft` hope, honoured without the rename.** `Draft` cannot mean "not committed" — it
  means nought cards — but the hollow plate *is* that meaning, applied to all six values at once.
- **The progress bar follows the plate** at 50% opacity, so a provisional deck reads as one object
  rather than a hollow chip beside a solid bar.

### Hollow is not transparent — the trap

The art-wash amendment rules the plate **opaque**: the fill mixes into `--bg`, never into
transparency. A literally transparent chip breaks that on the mobile spine, where the pill sits on
the wash. **So hollow means the plate takes `--bg` itself** — the colour the tint was already
mixing into, at 0%. Fully opaque, one rule, and `statusPillStyle` changes by one argument rather
than gaining a branch.

⚠ To probe: on the card footer the ground is `--surface-inset`, so a `--bg` plate reads as slightly
recessed rather than flat. Intended, but measure it.

### Where the words are

- **Not in the tile's detail row.** That slot holds `31 to buy · $284.10` — the figure you open a
  plan to see. A permanent `not committed yet` there would evict it on every plan you own.
- **On the deck page**, beside the existing `Commit as v1` offer, because a single page has no grid
  to teach the hollow plate by contrast.
- Plus the accessible name on every surface, and the filter row's label. The mark is never the only
  carrier.

### The facet, revised

The `Changes` heading becomes **`Deck state`** with two rows — `Not committed yet` and
`Has pending changes`. OR within the heading as everywhere else; the two are mutually exclusive, so
ticking both returns every deck that is not settled. `?state=uncommitted,pending`.

### Data

`versionCount > 0` on the deck list read — **cheaper than the `hasPendingChanges` flag gap 2 has
been asking for**, and it is the flag the bigger feature needs. Gap 2 stands for the secondary mark
only.

---

## The one-line answer

**Two marks on one box, on two axes, and neither is a status.** The plate says whether the deck is
real — tinted for a deck with a v1, `--bg` for a plan that has none. A 2px `--fg` left rule says a
real deck differs from its version. They are mutually exclusive by definition. Nothing in the six-value table changes, no token
family is taken, no chip is added, and the filter gains a heading rather than a row.

---

## Decisions

### 1 · Precedence — refused. The pill keeps its count-based value.

The six values partition **one** fact: how the matched count stands against the body size, and then
what is true at that size. `statusPill()` is a single ordered cascade over `built`,
`unresolvedCount` and `unfundedCount`. Pending is a different axis entirely — whether the list on
screen is the list that was committed — and a `Complete` deck with one swap is still ninety-nine
resolved, funded cards.

So the fact rides **beside** the pill and there is no precedence question to answer. Three costs of
the alternative, each fatal on its own:

- It **deletes a true fact to state another one**. A finished deck mid-swap would stop saying it is
  finished.
- It breaks the facet. `STATUS_ORDER` is what serialises to `?status=`, what `filterDecks` compares
  `statusPill` against, and what the header's `6 of 6` asserts. A seventh member makes that count a
  claim about a set that no longer exists.
- It makes the pill **non-derivable from the three counts**, which is the property
  `status-style.ts` and `statusPill()` are both written around.

### 2 · The name — `pending`. `Draft` is not renamed.

`Draft` is a shipped threshold (0 matched) on four surfaces, a member of the `StatusPill` union, a
`refreshCopy.status` key and a URL value. Renaming it to free a word is a migration paid for by
this addendum's convenience.

The mark reads **`pending`** — the app's own vocabulary (`pending.label`, "Pending changes: not yet
a version"). The review page **retired** a bare `pending` in favour of `deck in draft`, and that is
worth stating rather than stepping over: there the tag sat beside a **card** name and was read as a
pending change to *that card*, on a row where the card was not being touched. Here the subject is
the deck, the mark sits against the deck's own status, and nothing else is on the line — the
ambiguity that retired it cannot arise. `deck in draft` would say *deck* on the deck's own card.

Full form lives in the accessible name: **`pending changes, not yet a version`**.

### 3 · A deck with no committed version takes no mark. *(R2: the Draft/Building carve-outs below are withdrawn — see §R2.)*

Pending is defined **against** a version. A brew has nothing to differ from, so the mark would be
permanently on and would say nothing — and `STATES-pending.md` state 1 already rules that a brew
below a full body has no versioning footprint at all, "not even the Versions tab". Such a deck
stays `Draft` or `Building`, and at a full body the spine's `Commit as v1` offer is the signal.
Condition for the mark: **a committed version exists, and the draft differs from it.**

### 4 · Colour — no new hue. The 2px `--accent` rule, moved.

`--danger`, `--warning`, `--accent` and `--success` are spoken for as **fill-and-label pairs**;
`--fg-faint` and `--fg-body` are the two text-colour exceptions with their own alphas.

The mark takes **`--fg-body` ink on `--fg-body` at 14% mixed into `--bg`** — Building's exception,
because the mark's token is a text colour for the same reason Building's is — inside the one opaque
`1px solid var(--border-strong)` hairline the art-wash amendment ruled for every pill. Its own
signal is a **2px `--accent` left rule**, which is *the decklist's existing pending mark* moved
from the row's left edge to the mark's own.

Why that does not re-spend brass: the rule is a **geometry**, not a fill-and-label pair. `To buy`
owns brass as a plate with a brass word on it; this owns brass as an edge on a neutral plate. The
two never read as the same thing, and the app already means *pending* by exactly this rule one
scroll down the same page.

**Greyscale.** Three distinguishable edges now carry the vocabulary: solid 1px (four statuses),
dashed 1px (Building), 2px left rule (pending). The mark survives desaturation on its edge, as
Building's dash does, and its plate at 14% is distinguishable from the 18% plates beside it.

### 5 · The filter facet — its own heading, one row, immediately below Status.

Not a seventh Status row, for the reason in decision 1. It gets a heading of its own —
**`Changes` · `Has pending changes`** — directly beneath Status: adjacency says the two are read
together, the heading boundary says they are different questions. Within a heading values OR,
across headings they AND, exactly as every other facet, so `Complete` + pending is one tick in each
and an AND between them.

- **One boolean, not a pair.** No `Clean` row — it is the unticked state of this one, and a two-row
  heading whose second row negates the first is a control that cannot say anything.
- `?pending=1`, absent when off. `activeFilterCount` gains one: a **value**, which is what the
  phone badge counts.
- The heading takes `--accent` while the box is ticked and `--fg-faint` while it is not — a
  single-row facet at the other headings' ink reads as a stray checkbox.
- The Status header's `6 of 6` is untouched.

---

## Two findings the ask did not anticipate

### The pill is no longer on the art.

The brief's constraint — "the pill sits on card art" — describes the previous round. Shipped
`deck-card.tsx` moved the chip **off** the band into the footer beside the bar, which is what
dropped `labelAtPx` from 78 to 46 and "turned 32px of darkness back into art". The mark therefore
lands on **flat ground** on the deck card, on Home's resume row and in the desktop spine. The one
surface where it is genuinely on a wash is the **mobile spine's meta row**.

It obeys the amendment there regardless — the plate mixes into `--bg`, never into transparency, and
it inherits `textShadow: none` from `statusPillStyle`'s stated exception, because the band it sits
in puts a cover shadow on the block around it. The 2px rule is `--accent` at full opacity and needs
no protection at all.

### Under a 330px cell the word cannot be paid for, so it collapses.

`Unresolved` + `pending` is ~168px at 10.5px mono; the footer of a 189px cell has ~174px before the
bar and the count get a pixel, and the bar is the element that would give. **Below the tile's
existing `@min-[330px]` container query the mark collapses onto the pill's own left edge** — the
same 2px rule, no second box, no width taken — and the word survives in the tile's accessible name.
This is the card-rows floor applied as written: an addition that cannot name what it displaced does
not ship, and this one displaces nothing.

Everywhere with room — the 248-band card, the resume row, both spines, the review page — draws the
worded form.

## Where the figure goes

The mark says *that* the draft differs; the **detail row** says by how much, in the banner's own
string: `36 changes since v2`, `--fg-faint`. It ranks **above** the proxy fallback and **never**
displaces a warning figure — `Over` keeps `2 over` and `Unresolved` keeps `2 lines unresolved`,
which are facts about the deck the reader opened the tile for. So the figure appears on `Complete`,
`Building` and `To buy` tiles and nowhere else, and `detailFor`'s existing rank order absorbs it
without a new branch shape.

## Out of scope

The banner, the commit sheet, the review page, Discard and the game-log stamp — all drawn in
`design_handoff_the99_deck_versioning/`. This addendum adds nothing to them and changes nothing in
them.

## The About page

Amended, not extended — `design_handoff_the99_about/ADDENDUM-deck-state-marks.md`, drawn on the R4
canvas. One key line appended to the `versions` entry (chapter 03, 2 → 3 keys) covering both marks
in the order a deck lives them, and one sentence appended to the `statuses` caption stating both
boundaries. **Not** a key line on `statuses`: that entry is at the
template's four-key cap and its four keys are the six values — a fifth would restate the
seventh-value mistake in prose. The entry count stays 33, no `NEW` plate is spent, and `since`
stays `1` on both.

## Gaps for the audit *(R2 closes 1, 3 and 4 by deletion — see §R2)*

1. **The 168px figure is derived, not measured.** Computed from the shipped 10.5px mono advance and
   the footer's stated padding; the 330px collapse threshold depends on it. Re-measure with the
   longest pairing written into every tile at 640px before ruling R1 closed.
2. **The server flag does not exist.** `DeckListItem` has no `hasPendingChanges`, and the draft diff
   is computed on the deck page today. `/decks`, Home and the facet each need it on the list read —
   the same missing flag `STATES-pending.md` state 20 already records for the pull guard.
3. **Resume row arithmetic unre-run.** The mark costs that meta line ~58px; the name is the child
   that gives, per its existing ordered shrink, and the to-buy clause is dropped on a marked row as
   it already is on a pair row. `pnpm probe:home` has not been run against it.
4. **The mobile spine's `labelAtPx=115` is asserted unchanged** — the row is `flex-nowrap` and the
   mark is `flex-none`, so nothing wraps — but not probed.
5. **No ruling on the `Versions` tab count** beside a marked deck; the tab is out of scope and its
   own handoff owns it.
