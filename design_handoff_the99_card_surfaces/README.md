# The 99 — Card surfaces (design handoff, R2)

**Two briefs, one folder, because `decks/decklist-row.tsx` is in both.** Source of truth, in the
order the covering note gives them:

1. `docs/superpowers/specs/2026-09-07-deck-card-view-cluster-design.md` — #349 card view / list
   view, #350 mana cost on the row, #351 hover preview, #363 double-faced flip control. Its
   **Corrections** section governs.
2. `docs/superpowers/specs/2026-09-07-card-line-item-parity-design.md` — the six-row consistency
   ruling, whose Q2 the first brief supersedes for the decklist row.

`design_handoff_the99_deck_tuning/` is the structural sibling (same folder convention, same
copy-export shape, same READINESS format). `design_handoff_the99_card_rows/` is the **content**
sibling: its four calls are carried forward here, two of them amended.

File: `The 99 - Card Surfaces.dc.html` (canvas — pan/zoom). Read
`DENSITY-four-hundred-pixels.md` for the measured budget and the answered buy-tag call,
`STATES-card-surfaces.md` for the matrix as a table, `card-surfaces · copy strings.ts` for the new
strings, `READINESS.md` for the one remaining dependency.

**The one-line summary:** *most of #349 already ships on `/collection`, which is what frees the
400 pixels #350 needs.*

## What Design read

Both briefs and nine components at `main`: `decks/decklist-row.tsx`, `decks/decklist.tsx`,
`decks/group-toggle.tsx`, `decks/suggestion-tile.tsx`, `decks/card-search-row.tsx`,
`decks/unresolved-row.tsx`, `decks/update-diff-row.tsx`, `collection/rows-view.tsx`,
`collection/grid-view.tsx`, `commanders/synergy-row.tsx`, `ui/ownership-dot.tsx`,
`ui/availability-marker.tsx`, plus the relevant span of `collection/filter-bar.tsx` and
`collection/browser.tsx`. Local `src/` in this project holds only `components/shell/nav.tsx`, so
**nothing here is traced from a project file** — every geometry figure is quoted from the component
that ships it. **Where a component and this handoff disagree, the component wins** and these tables
are what to correct.

## Two findings the brief does not carry

**1 · The card view and its toggle both ship on `/collection`.** `browser.tsx:222–227` holds a
`ViewMode = "rows" | "grid"`; `grid-view.tsx` draws a 63/88 art tile at 2-up phone / 5-up desktop
with a quantity badge top-right and the availability chip top-left; `filter-bar.tsx:256–281` is a
two-segment `--surface-sunken` well with `≣` / `▦` glyphs at 28×24 phone / 30×28 desktop. The
brief's own survey says the Decks README describes a row "and nothing else", which is true, and
then treats the tile and the toggle as unspecified — they are specified one route over. **#349 is
an adoption with three deltas, not a design.**

**2 · `imageUri` is a full card image, not an art crop.** Both tile components set
`aspectRatio: 63/88` with `cover`, which is Scryfall's 488×680 exactly. That settles #351's content
question by arithmetic: at 252px of card width the printed cost renders at ~14px and the preview
needs no chrome; at a 148–159px tile it renders at ~8px, which is why `CostPips` exists on the
suggestion tile and why the deck tile keeps it. **One threshold — legible above roughly 200px of
card width — applied twice, instead of two aesthetic judgements.**

## The nine calls

| # | Question | Called |
|---|---|---|
| **1** | The card view tile | **Adopt `grid-view.tsx`'s tile whole; three deltas.** Ownership dot + cost pips bottom-left, set/rarity caption dropped, `✕` added to the caption. Art stays 63/88 and stays one click target. Grid is `auto-fill minmax(132px,1fr)` desktop — **not 5-up** — because the add panel opens. |
| **2** | The third control axis | **The shipped `/collection` well, at the bar's right end; the `Group` label retires to pay for it.** None of the four shapes CONTROLS rejected; the sunken well is why. Costs no wrapped line at 390px. |
| **3** | Pip metrics on the decklist row | **Desktop: 12px pips, 3px gap, a fixed 40px right-aligned track, shingling from three at −5px, capped at five slots with a `+N` generic pip.** Phone: 13px, plain, uncapped, on the meta line. |
| **4** | The phone meta line | **Pips, and whatever that view already owns. Nothing else joins.** All tab: pips alone. Shopping: `pips · edhrec 24%`. The marker stays on the primary row; the type line is refused. |
| **5** | The hover preview | **252×352, the card image alone, no chrome.** Opens left of the row, flips right without room, bounded by the decklist pane. 240ms in / 80ms out, 0ms row-to-row while open. Does not fade in. |
| **6** | The double-faced mark | **Not a corner glyph — a mono `//` after the name, at both row and tile.** Modal flip control on the art, bottom-right, 34/44px. Driven by the `layout` column only. |
| **parity 1** | The floor | **Stands, and it reaches the tile.** The slot is the marker chip when you own copies and **the collapsed `$` chip when you own none** (R2 call 2) — never empty on an unowned card. |
| **parity 2** (re-scoped) | Do pips reach `unresolved`, `update-diff`, `synergy`? | **No, to all three.** The rule: **cost pips go where the reader is choosing or paying, never where they are auditing.** |
| **parity 3 / 4** | The dot; the metrics | **Q3 unchanged.** Q4 **amended, not overruled**: 52px stops being an exception and becomes one of two phone heights. |

## R2 amendment · two calls, no re-draw

Neither call re-opens any of the nine R1 rulings. **They resolve to one drawing**, because the atom
call 1 produces is the atom call 2's hole needs.

### R2 · 1 — the buy tag collapses on the All tab; it does not leave

**Product said no to R1's ask, and was right.** Seeing which cards still need buying while browsing
the whole deck is the point of the tag. **R1's reasoning had a flaw worth naming**, because it is
the kind that recurs: R1 read the tag as a shopping *affordance* on the strength of ruling 1 calling
it one **on the tile**, and then applied that reading to the row. But a tile is a picture of a card
and a row is a line in a list you are working through. On the row the tag is a shopping **fact** —
and this handoff's own test, stated in call 1, is that facts stay and affordances go.

**Adopted, as counter-proposed:**

> **All tab: the tag collapses to a bare `$` in the same chip skin.**
> **Shopping: the full `buy $12.40`, unchanged.**

The word and the figure both go; the chip, its `--warning` ink, its `--accent-shadow` hairline, its
radius and its position do not. **Measured: 62px → 18px, so ~44px comes back** — more than the ~40px
R1's ask was chasing. The signal survives the collapse because **whether** to buy is a glyph and
**how much** is a number, and only the second one needs the width.

**So the 40px pip track ships and R1's 34px fallback is withdrawn.** The desktop worst case goes
from R1's 42–59px of card name to **~86–103px**, roughly fourteen characters at 13.5px — and the
worst case is no longer a $1,000 card you do not own, because a four-digit price cannot appear on
this tab any more. `DENSITY-four-hundred-pixels.md` carries the corrected ledger.

**Scope, so eng does not over-apply it:** the collapse is a property of **`decklist-row.tsx` under
`filter === "all"`**. `update-diff-row.tsx` keeps its full `BuyTag` — it is a different surface at
desktop width with no tab, and nothing there was tight.

**Sold-out is accepted as an edge case, on Product's call, and it holds up:** a card with no price
collapses to the same `$`, so *sold out* only reads on Shopping. It is rare, and a sold-out card is
still a card the player has to buy eventually. **One constraint on it: the chip must not restyle
itself for that case.** A second glyph meaning *unpurchasable* would put two marks in a slot R1
spent a whole ruling keeping to one — and it would be the app being loudest about the state the
player can do least about.

### R2 · 2 — the unowned tile's slot is filled by that same `$`

**R1 shipped a contradiction, and the audit is right to call it a defect.** Call 1 of R1 says the
floor reaches the tile and *the shipped chip is the slot*. But `AvailabilityMarker` only ever speaks
about copies you **own** — it returns `null` when you own none — and ruling 1 dropped `BuyTag` from
the tile. So the slot had no possible occupant in the one state where the floor matters most, and
`STATES` said so in three places while the prose claimed otherwise. **Unowned in card view was
carried by an 8px dashed stroke alone**, which card-rows' FLOOR doc rejects twice: zero occupants is
a defect, and the dot is not the floor.

**The collapsed `$` chip fills it**, top-left, at the shipped chip position and on the shipped
scrim. It is the reason the two calls are one amendment rather than two.

**Why it passes ruling 1 where the full tag did not.** Ruling 1 drops shopping *affordances* from
the tile. A bare `$` says **that** the card must be bought — a fact about the card, the same class
of fact as *you own none of these* — and says nothing about **what** it costs or **where** to get
it, which are the shopping view's job. It is also one glyph, so it cannot grow into a shopping UI
by accretion the way a tag with a figure in it can.

**Sizing: the money chip's glyph is 10.5px against the marker's 8.5px labels.** One glyph can afford
the size where two words cannot, and it needs it — at 8.5px a lone `$` reads as a speck rather than
a mark. Chip box, scrim, border and radius are identical, so the two occupants are visibly the same
slot.

**Owned stays empty, and that is not the same defect.** The marker returns `null` at `free` on every
surface in the app; nothing to say is not nothing to show. The floor is *name + one availability
slot*, and an owned card's slot has been legitimately silent since the marker shipped.

**Both widths, all four states, are redrawn on the canvas** — 148px desktop and 159px phone.

### Noted for eng, no action here

`design_handoff_the99_card_rows/` is on `main` and reconciles cleanly: 52px phone height, the
over-committed inset ring, radius 7 and the dot's three states all agree. **Its Q2 — cost pips stay
on one row — is superseded by this handoff's ruling 3**, per the card-view brief's Corrections
section. No design change; it is a precedence note.

### 1 · The tile is a delta list, not a drawing

**Three deltas on `grid-view.tsx`'s tile.** Add the ownership dot and the cost pips as one run at
the art's bottom-left, on the bottom scrim the tile already paints. Drop the set/rarity caption —
ruling 1 says art plus name plus the controls a reader needs, and a set code is neither. Add the
`✕` **to the caption, not the art**: 44×44 phone, 24×24 desktop revealed on tile hover, matching
the row's `--border-dashed` rest / `--fg-body` hover.

**Corner allocation: three used, one left empty.** Top-left the availability chip (shipped position
on both tile surfaces; it paints its own scrim, so it never depends on the art). Top-right the
quantity badge, `grid-view.tsx:56` verbatim, absent at one copy. Bottom-left the new dot + pips run.
**Bottom-right stays empty on purpose** — four marked corners is a frame, not a card — and keeping
the `✕` out of it is what leaves the art a single click target, which is `suggestion-tile`'s
*three targets and no more* rule.

**`auto-fill minmax(132px,1fr)` and not 5-up, because the add panel is 340–346px and opens.** The
tile column's width is not one number: a fixed 5-up would land 148px tiles with the panel closed
and 79px tiles with it open. Auto-fill re-flows to three or four columns and the tiles keep their
size, which is what *middle-weight* has to mean on a two-pane page. Phone stays 2-up at gap 12,
shipped and unchanged.

**The tile keeps its border tint where the row swapped to an inset ring.** The parity ruling's
reason was that a border adds 2px to one row and shunts every row below it; a grid tile carries a
1px border in every state, so there is nothing to shunt. **Radius 7 and the inset ring are row
rulings — do not unify the tile to them.** Tile radius stays 9/10.

**The floor reaches the tile.** Parity Q1's *name + one availability slot* is a property of a thing
standing for a card, not of a rectangle being wide. So the chip and the dot stay even though the buy
tag, the price and the auto tag go: **a player cannot use card view to escape knowing what a card
costs them.** That is the difference between dropping shopping *affordances* and dropping shopping
*facts*. One thing falls out of it: with the buy tag gone the tile's slot can never hold two things,
so the Shopping second-copy exception cannot occur in card view — the slot contract is stricter on
the tile, for free.

### 2 · The toggle is a shipped atom in a paid-for slot

**Adopt `filter-bar.tsx:256`** — `--surface-sunken` container, 1px `--border-strong`, radius 8,
pad 2, gap 2; segments radius 6; `≣` / `▦`. Only the two accessible names are this handoff's own
change, to `List view` / `Card view`, matching #349's own words.

**Segments are 44×44 phone / 32×32 desktop, and the active segment is bone on `--elevated`, not
accent** — both of those are refresh R2 rulings applied to `/collection` and the deck bar together.
R1 adopted the shipped 28×24 and the shipped accent fill and flagged the divergence; see
§ *Reconciled with refresh R2* below for the rulings and their reasons.

**Position: the bar's right end, after `By role`. The `Group` label retires to pay for it.** The
label is an inert desktop-only mono word announcing *Group* beside two pills that both open with
*By* — the same fact a third time. Losing it returns ~44px and gives the well the air it needs to
stop reading as a seventh pill.

**Why this is not a fifth rejected shape.** `design_handoff_the99_discovery/CONTROLS-four-above-one-list.md`
rejected four. This is none of them: not peers in one bar (a peer is a bare pill; this is a well
with icon segments, a different container that says *not a filter* before it is read as a control);
not a tab strip (tabs promise a panel swap, and this swaps the rendering of the same list with the
same filter and grouping applied); not extra segments on an existing strip (it shares no strip);
not a second bar (no new row, no second sticky surface, no vertical spend). **And it is the shipped
answer to the same question one route over** — reusing it is declining to invent a second vocabulary
for one idea.

**Measured at 390px: it costs no new line.** The bar wraps by contract already (`group-toggle.tsx`'s
comment). At the ruled 44×44 the grouping line measures By type 62 + By role 48 + well 94 + gaps 14
= **218px of 358**, so the well still lands on a line that already existed, with 140px to spare. The
line grows to 48px tall, absorbed by the bar's own `items-center` row. **The 44px floor costs no
wrapped line** — which is the check that made it affordable to grant.

**Four things deliberately not adopted.** Not the URL — `/collection` writes `?view=`, ruling 3
forbids it, and the repo's *a cache lives for one visit* rule agrees. Not the auto default —
`browser.tsx:227` resolves `null` to grid on desktop; **the deck page defaults to list at both
widths, always**, because browsing is looking and a decklist is being edited, so the editing surface
is the default. Not 5-up. **Not the 28×24 segments and not the accent fill** — see below. And **the
toggle is absent under Shopping rather than disabled**: a disabled control on the tab where it can
never apply is a puzzle; an absent one is a fact about the tab.

### Reconciled with refresh R2 · two rulings, one PR, both surfaces

`design_handoff_the99_refresh/` R2 was drawn in parallel with this handoff and sets chrome-wide
target and colour rules. Two points meet on the builder's bar. Both resolve the same way, and the
reason is the same: **R1's adoption argument was about *sameness*, never about *size* or *hue*.**
Nothing about the adoption is given up by changing both surfaces together — the rule sets the
values, and the adoption is what makes the change bilateral.

**1 · The phone target floor takes no exception. Both surfaces go to 44×44 phone / 32×32 desktop in
the same PR.**

`CHROME-rail-and-tabs.md` grants exactly one sub-floor exception and states its test: the 26px `…`
on a deck tile passes because *it sits inside a tile that is itself clickable, so the small target is
a shortcut rather than the only route.* **Apply that test to the view toggle and it fails.** The
toggle is the only route to card view — no gesture, no menu, and ruling 3 forbids persistence, so not
even a deep link. A control that is the sole route to a whole rendering of the page is the last place
to spend the floor.

**Desktop moves too**, 30×28 → 32×32: the shipped desktop figure also sits under R2's 32px icon-only
floor, and square is right for a glyph with no label to widen it. Container becomes 94×48 phone /
70×36 desktop.

**The one thing to check inside the PR:** `/collection`'s phone filter bar has to absorb +32px of
width and +24px of height on that control. If it cannot, that is a finding to bring back — **not a
licence to diverge**, because a divergence puts us back at two controls, which is the whole thing the
adoption bought.

**2 · Yes, the accent rule reaches the builder's bar. The bar is not exempt.** And the treatment
already ships six pixels away, so it is not a new design.

> **Selected state, pill and segment alike: `--fg` label on `--elevated` with a 1px
> `--border-strong` ring, 600 weight. Idle stays `--fg-faint` on transparent.**

That is verbatim what `group-toggle.tsx` already draws for the active `By type` / `By role` pill.
**The bar is internally inconsistent today**: its grouping pills say *selected* in bone-and-elevated,
its filter pills say it in accent. Unifying on the half that already obeys R2 removes a real
inconsistency and costs nothing to draw.

**The collision is real, not theoretical.** The Shopping tab is exactly where accent-as-*to buy*
lives on the rows, so an accent-filled control sits a few pixels from accent carrying its reserved
meaning, on the one screen where both appear at once.

**Noted, not ruled** — two consequences for whoever takes the PR. The Shopping pill's *idle*
`--warning` tint is accent's reserved meaning wearing *Unresolved*'s colour; the count beside it
already carries the fact, so Design's recommendation is that it becomes the same hairline pill as its
peers — but that is shipped behaviour beyond the active state, so it belongs to refresh R3 rather than
this ruling. And **the card view tile's desktop `✕` is 24×24**, which fails the same 32px floor for
the same reason the toggle does; 32×32 is the fix and it fits the caption row without changing the
tile.

### 3 · The track: shingling is borrowed, the cap is not

**The fan transfers; the ceiling does not.** `rows-view`'s shingling solves a *bounded* problem —
colour identity cannot exceed WUBRG, so five pips is a hard bound and one overlap rule solves it
forever. A mana cost has no bound: Progenitus is ten symbols. A fan alone still widens the track.

**Desktop: 12px pips, 8px mono numeral, gap 3px, a fixed 40px track, right-aligned, shingling from
three at −5px, capped at five slots.** The derivation is the track: three plain pips measure 42px
and burst it, which is what puts the shingle threshold at three rather than four; five fanned pips
measure exactly 40px, which is what makes the track 40 and not a rounder number. **At six or more
symbols the track draws four fanned pips plus the shared generic pip carrying `+N`** — the count of
symbols not drawn. That `+N` pip is **the only new atom in this handoff**.

**Position: between the name block and the availability slot.** That is the only place where the
pips of adjacent rows land on one vertical line — left of the marker and the buy tag, both of which
are conditional and variable in width. It is the same move `card-search-row` makes with its fixed
34px slot, for the reason its own comment gives. Right-alignment is honoured *within* the track, so
a one-pip cost and a five-pip cost end on the same vertical line.

**Phone: 13px, plain, uncapped, on the meta line.** No fan and no cap, because the meta line has
the room the primary row does not — a ten-symbol cost measures 157px on a 358px line whose only
other run is `edhrec 24%` at ~60px. **The two widths draw the same fact at two fidelities, and the
narrow one is the higher.** That is the payoff of ruling 7's extra 8px, and it is worth naming: the
meta line was created to make room, so it should be spent generously or not created.

**`CostPips` promotes out of `suggestion-tile.tsx` into the shared card components** per ruling 6,
gains the `sr-only` alternative, and gains `size` / `track` / `cap` so one component serves the
search row's 34px slot, the decklist's 40px track, the tile's 12px run and the phone meta line's
uncapped 13px.

### 4 · A meta line is not a shelf

**All tab: pips alone. Shopping: `pips · edhrec 24%`** — that line already exists there and the
figure already owns it (addendum A2). One line, two views, no third arrangement.

**The marker does not move down.** It is the floor's own slot; moving it below the name would make
the one required element the least prominent thing on the row, and on Shopping it would collide with
the figure already there. It stays on the primary row at both widths.

**The type line is refused.** The list is grouped: under *By type* the heading immediately above the
row already says it, and under *By role* the modal is one tap away. It is also the widest of the
three candidates and the only one whose absence a reader can resolve without scrolling.

Ruling 7 created the line to hold one thing that would not fit. **Every further fact that lands
there is a fact nobody decided to show — on a row that is one of ninety-nine.**

### 5 · The hover preview shows nothing but the card

**252×352, radius 12, 1px `--border-strong`, `0 18px 40px -12px rgba(0,0,0,0.72)`.** Anchored to
the row's vertical centre, 14px outboard. **Opens left of the row**, because the add panel docks
right; **flips right when there is not 252 + 14px to the left**, which is the case a right-column
row at a narrow desktop decides, so the rule is stated rather than left to eng. **Bounded by the
decklist pane, not the viewport** — it may overlap rows, since it is a transient, but never the
panel.

**240ms open, 80ms close, and 0ms row-to-row while already open.** The delay is what makes an
instant appearance calm rather than twitchy; the row-to-row rule is what stops a scan from feeling
gated. **It does not fade or scale in** — zero net motion is locked (card-availability row 3.7), and
the delay is doing the work a transition usually does.

**Trigger is the whole row, under `@media (hover: hover)`. `aria-hidden` entirely** — it duplicates
the row it is anchored to, and the modal serves the reader who needs more.

**Content: the card image, and nothing else.** Every fact the preview owes is already printed on the
thing it is showing; a name caption or a pip row would be the app restating Wizards' typography over
the top of it. **The rules text is not readable at ~6px and the preview does not pretend otherwise:**
hover answers *which card is this*, the modal answers *what does it do*, and the name is the modal's
trigger a few pixels away. **A two-faced card previews its front face only**, with no flip on hover —
a control inside a transient the reader cannot click into is not a control.

### 6 · The mark is the game's own notation

**Design is declining the corner glyph ruling 5 assumes**, and offering a mono `//` after the name
at both the row and the tile. A row has no corners, and on the tile all four are allocated or
deliberately empty. More decisively: **any invented mark at this scale is a 7–9px shape sitting a
few pixels from a 7px ownership dot**, and the app would then draw two small marks on one row
meaning two unrelated things. `//` is typographic, so it cannot be confused with a dot at any size —
and it is what the data already uses (`toCardRow`'s separator, Scryfall's `type_line`) and what the
card's real name already contains: `Delver of Secrets // Insectile Aberration`. **It is not a badge
about the card; it is the name's own punctuation, abbreviated.** Cost on the row: 11px plus a 6px
gap.

**The flip control: bottom-right of the modal's art block**, 34×34 desktop / 44×44 phone, radius 7,
on an `--bg` scrim at 86% with a `--border-strong` hairline. **Its accessible name is the other
face's name**, not "flip" — the reader wants to know what they are turning to. **The image swaps; it
does not animate.** It sits on the art rather than in the modal chrome so it cannot read as a
sibling of Prev/Next, and **Prev/Next resets to the front face**: a new card starts on its front.

**One constraint eng needs before the data work starts: the mark must be driven by the `layout`
column and never by the `//` heuristic.** Split and adventure cards carry the same separator and
have no back, so a heuristic-driven mark promises a flip on *Fire // Ice* that the modal cannot
deliver — and a control that is sometimes a lie is worse than a control that is late. **So #363 has
no partial ship:** the mark and the flip land together, after the column, the back-face image
storage and the re-seed.

### parity 2, re-scoped · one rule, three refusals

**Cost pips go where the reader is choosing or paying. They do not go where the reader is auditing.**

- **Choosing** — `card-search-row`. Eight near-identical names; what each costs is the
  differentiator. Ships since #196.
- **Paying** — `decklist-row`. Building a curve and deciding what to cut. This handoff.
- **Auditing** — `update-diff-row` (the question is keep or drop, which a cost does not answer; the
  type line and the auto marker already hold the desktop width), `synergy-row` (already answers the
  reader with two figures, and a cost would be a fourth run on a meta line that is holding a slot
  open for the marker), `unresolved-row` (no oracle id, so no card, so no cost).

So cost reaches **exactly two rows of six**, and colour identity stays on exactly one. Neither
affordance generalises, which is what card-rows R1 called and this handoff confirms from the other
direction.

### parity 4, amended · 52px stops being an exception

The canonical set is unchanged: **44px phone / 34px desktop, radius 7 both widths, gap 9/10, pad
8–4 / 9**, the over tint an inset ring, name 12.5/13.5px. What changes is the *status* of the
meta-line variant. Card-rows R1 named 52px as one exception, on Shopping. With pips on the All tab
it becomes **the height of any phone decklist row for a card with a mana cost** — so state it as two
values rather than a rule and an exception:

> **Phone: 44px without a meta line, 52px with one. Desktop: 34px flat.**

And the consequence that makes it safe: **a land has no mana cost, so no pips, so no meta line, so
it stays 44px.** Lands are their own group under *By type* and carry the `land` role under *By role*,
so **the height changes at a group boundary under both groupings and never inside a group.** The
reader sees two blocks of consistent rows, not a ragged list.

## Rejected

- **A bare CMC integer.** Already overruled by ruling 6; recorded here because the pip cap makes the
  integer look tempting again at six-plus symbols. It is not: `{W}{W}{U}{U}{B}{B}{R}{R}{G}{G}` and
  `{10}` are the same integer and different cards, and the deck's whole colour question lives in
  the difference.
- **Widening the track for long costs.** A variable track puts the pips of adjacent rows on
  different vertical lines, which is the exact failure `card-search-row`'s fixed slot exists to
  prevent.
- **Shingling on the phone meta line.** It has the room. Fanning there would be a constraint
  imported from a width that does not apply.
- **The type line on the phone meta line.** See call 4.
- **A corner glyph for two-faced cards.** See call 6.
- **The `✕` inside the tile's art.** A 44px target on a 159px picture, over the one region the
  reader is looking at, and it would make the art two click targets.
- **A fixed 5-up tile grid.** The add panel opens.
- **A view toggle that persists.** Ruling 3, and the repo's own cache rule.
- **Dropping the price from the All tab.** R1's ask; refused by Product, and the refusal was right —
  the tag is a fact on a row even though it is an affordance on a tile. It collapses instead.
- **The 34px fallback track.** Withdrawn: the collapse returns more width than the ask would have.
- **A sold-out variant of the `$` chip.** Two marks in a one-mark slot, and loudest about the state
  the player can do least about.
- **Leaving the unowned tile's slot empty.** A zero-occupant slot is a defect, and a dashed 8px
  stroke is not the floor.
- **The full `buy $12.40` on the tile.** Still refused by ruling 1 — the `$` is what survives the
  facts-not-affordances test.
- **An inherited exception to the 44px floor.** R2's own exception test refuses it — see above.
- **Diverging the two surfaces to keep `/collection` at 28×24.** That would trade one control for
  two, which is the only thing the adoption was for.
- **Restating the card's name or cost on the hover preview.** It is printed on the image at 252px.
- **Unifying the tile to radius 7 and the inset ring.** Those are row rulings with row reasons.

## Engineering ledger

1. **`CostPips` promotes** out of `suggestion-tile.tsx` into the shared card components, gains an
   `sr-only` alternative, and gains `size` / `track` / `cap` props. Four call sites: the search row
   (34px, shipped behaviour preserved), the decklist row (40px track), the tile (12px run), the
   phone meta line (13px, uncapped). **The `+N` generic pip is the one net-new drawing.**
2. **`decklist-row.tsx`** gains the track between the name block and the availability slot on
   desktop, and a meta line carrying the pips on phone — reusing the `hasShoppingMeta` branch's
   own shape, with the condition widened from *Shopping* to *Shopping or has a cost*.
2b. **`BuyTag` gains a collapsed density** — a bare `$`, same skin, no word and no figure — and
   `decklist-row.tsx` selects it under `filter === "all"`. One prop, one call site. **This is the
   whole of R2 call 1**, and it is also what fills the tile's slot in item 6.
3. **`group-toggle.tsx`**: the `Group` label deletes; the `/collection` view-toggle well arrives at
   the right end, rendered only when `filter === "all"`. Two new props (`view`, `onViewChange`).
   The All/Shopping pills' active fill goes from `--accent` to bone on `--elevated` with a
   `--border-strong` ring — the same class string the active grouping pill beside them already uses.
4. **`collection/filter-bar.tsx`**: segments 28×24 → 44×44 phone and 30×28 → 32×32 desktop; active
   fill `--accent` → bone on `--elevated`. **Ships in the same PR as item 3** — it is the same
   control on two surfaces, and splitting them is the one outcome both handoffs were avoiding.
5. **`decklist.tsx`** holds `view` as component state, defaulting to `"list"`, and renders the tile
   grid instead of the row groups under `"card"` — grouping unchanged, so the group headers stay.
6. **A deck card tile component**, built from `grid-view.tsx`'s tile with the three deltas. Not a
   fork of `suggestion-tile`: that one carries evidence bars, an Add button and a two-line clamped
   name it needs for grid alignment on a shelf. Its desktop `✕` is 32×32, not 24×24. **Its top-left
   slot renders the marker chip when `ownedCount > 0` and the collapsed `$` chip when it is zero** —
   so the slot is never empty on an unowned card (R2 call 2). Depends on item 2b.
7. **The hover preview**, desktop-only, one instance per decklist rather than one per row.
8. **#363** waits on the `layout` column, back-face image storage and the re-seed, then lands the
   `//` mark and the modal flip control together.
9. Everything in `design_handoff_the99_card_rows/README.md`'s ledger still applies and is not
   restated here.
