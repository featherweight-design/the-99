# The 99 — One commander image (design handoff · R1)

**Source of truth:** `docs/superpowers/design-briefs/2026-09-11-one-commander-image.md`, read at `main`.
It is not in this project — it lives in the repo, verified against `origin/main` at `a461112`.

**Mirrors:** `design_handoff_the99_deck_details_wash/` — same wash, same kind of amendment, and the most
recent Green on this system. Its R6 rulings are the B-series entries below.

Files:
- `The 99 - One Commander Image.dc.html` — the canvas. Pan/zoom, with a **theme prop**: switch it to
  check every band, plate, chip and thumb under all six themes. Rounds are stacked newest-first
  (`6a`…`1a`); earlier rounds carry a banner naming what supersedes them and what still stands.
- `STATES-commander-image.md` — the settled geometry for all fifteen renders, the ramp table, the
  chrome spec, and the six deck statuses. **This is the file to build from.**
- `READINESS.md` — self-assessment, implementation order, dependencies, risk register, open items.
- `commander-image · copy strings.ts` — the three cuts, the accessible names that become required, and
  two strings I proposed cutting and did not.
- `brand/` — the locked brand sheet. **Not a colour source** (see the mirror's README).

**Settled, in one paragraph.** Four band heights — 288 page headers, 248 the deck cell, 208 result
rows, 168 the resume cell — plus thumbs at 44×62 and 64×89 and the two card faces unchanged. Text at
the bottom edge everywhere, no top scrim anywhere, and `labelAt` in **pixels from the foot** so added
height becomes unveiled art rather than more darkness. Every control over art is an opaque
icon-only plate in a 44px target with a required `aria-label`; block chrome takes no plate, which is
why the rename pencil lives inline in the title's text run. All fifteen renders end with an empty top
edge.

Read `design_handoff_the99_art_wash/README.md` and the mirror's README first. Decisions are numbered
continuing from them; the brief's own decisions 1–7 are referred to by its numbering, and this
document's amendments are lettered **A1–A7** (art wash) and **B1–B8** (deck details wash) so the audit
can check them one at a time rather than re-deriving the wash.

---

## The answer in six numbers (settled in 3a, after two rounds of your review)

| | | |
|---|---|---|
| **288** | header band | a page header, one per screen — renders 01, 04, 09, 10 (10 needs ≥1200px of row) |
| **248** | cell band | a grid cell telling you which deck is which — render 08, **never in a column under ~330px** |
| **208** | row band | a full-width result row you scan down — renders 06, 07 |
| **168** | resume band | secondary home cell, three or four up — render 02 |
| **44×62** | row thumb | identifies a row you are choosing among — renders 03, 11, 15 |
| **64×89** | summary thumb | stands for a choice already made — renders 12, 13 |
| **card face** | 344 / 220, unchanged | the player is meant to read the printing — renders 05, 14 |

**Nothing is an aspect ratio. All fifteen grow.** One breakpoint survives, and it governs the desktop
portrait's *width* rather than any strategy: below ~1200px of row the deck header falls back to the
340px portrait at a 364 inset.

**The primitive's height union is four arms, not two.** R1 claimed a collapse to two and that was
wrong once 208 and 288 were settled. The simplification is real but it is not in the arm count — what
retires is every *mechanism*: the aspect ratios, the 104 floor, `labelEdge`, the top scrim, and the
hand-written vertical ramp column. Four plain numbers chosen per class beat three named bands that
each computed their own geometry.

---

## R4 — what your review settled

**The deck tile needed no compromise; I drew it at the wrong width.** A tile's shape is
`column ÷ 248`. Section A was drawn at a 320px column — a tablet width — where 248 really is nearly
square (1.29:1). The real desktop column is ~445px, where **248 is 1.79:1, wider than the 320×208 you
preferred**. One-up on a phone is 1.44:1. The only shape that fights the band is the **189px two-up
column at 640** (0.76:1), which is the same ~44% crop loss A2 flags, with the same fix: one-up below
~700px. Drawn in situ at both widths in 4a.

**288 for every page header** — the hero, both mobile headers, desktop deck details. You preferred it
on C and D and it's the clear winner on E; detail mobile (04) follows spine mobile because decision 1
won't let two mobile page headers differ.

**The Card details control becomes one icon, no words, in a bottom corner, on every render.** The
label was doing two jobs — naming the action and being visible against art — and the plate now does
the second, so the words are the redundant part. At 44px the icon *flanks* spine-mobile's centred
title instead of competing with it, which dissolves the one exception B7 had: **all fifteen renders
now have an empty top edge.** Two conditions: `aria-label="Card details"` becomes required rather
than nice, and icon-only applies to desktop too — "more tolerable at desktop" is exactly how one
control became three drawings.

**"Start this deck" is cut from Ready to build**, and "See the pool" takes the filled treatment since
it's the only action left.

**Something New loses its frame**, drawn on your own Riku and Kykar rows. Beyond the frame, the pair
shows the real defect: the framed version reserves a fixed 364px panel and then prints the name over
its bottom corner anyway — ink on art with no ramp to carry it, which is why Kykar's white wings
swallow the rank number there and hold it in the bled version.

## R6 — the real status set, and the pencil loses its plate

**Six statuses, read out of `src/lib/decks/status-style.ts` rather than guessed.** My earlier
"Trim 3" and "Empty" were inventions. The shipped set, with its exact tokens, alphas and border
styles — each chip in 5a now carries them verbatim:

| status | token | fill | label | border |
|---|---|---|---|---|
| Draft | `--fg-faint` | 16% | `--fg-muted` | solid |
| Building | `--fg-body` | 14% | `--fg-body` | **dashed** |
| Over | `--danger` | 18% | `--danger` | solid |
| Unresolved | `--warning` | 18% | `--warning` | solid |
| To buy | `--accent` | 18% | `--accent` | solid |
| Complete | `--success` | 18% | `--success` | solid |

Fill is `color-mix(in srgb, var(TOKEN) ALPHA, var(--bg))` — mixed into `--bg`, not into transparency,
so the plate is opaque at every alpha. The progress bar takes the **same token**, so the row is one
colour decision rather than two. Chips are drawn at the shipped tile geometry (22px tall, 6px radius,
8px padding, mono 10.5, tracking .06em). Cards are back at the 445px column.

**The pencil's plate is what made it float — and by §3.4's own rule it should never have had one.**
The boundary reads: the ramp protects the label block, plates protect what is above it. The pencil sits
*inside* the block on ground already held at 73%, so it needs no plate; I wrote that rule in R1 and
then drew it plated on both frames anyway. It also explains why the expand icon looks right on the same
surface — that one acts on the art and sits over art, so its plate is doing real work.

Two grounded options drawn:

- **a, recommended** — the glyph moves into the title's text run, unplated, `--fg-muted`, in a
  zero-width container so it never steals width from the name. Moves with the title when it wraps.
  **Desktop takes the same treatment**, which is the point: it stops being a control that lives in a
  corner. Hit area is spec, not drawing: `padding:15px; margin:-15px` around the ~14px glyph reaches
  44 without shifting the baseline.
- **b** — no glyph at all; a dashed underline on the name in `--border-dashed`, the app's own
  vocabulary for an unsettled claim (the empty partner slot, Building's chip). Quietest, and the only
  one with nothing floating by construction. **Take b and the "a bare tappable title is
  undiscoverable" objection goes away** — the underline is the affordance that was missing.

Either way the pencil is no longer a plated box on any surface.

**And one correction the drawings caught: `labelAt` is the block's MEASURED height, not its intended
one.** I costed the mobile deck header at 57px — one title line plus a meta row — but at 390px that
20px Cinzel title wraps to three lines in its ~302px column, so the real block is **83px**. Derived
from 57, the 73% hold lands where the block *ends* rather than where it starts, and the title's first
line sits on unscrimmed art: exactly the failure this round exists to remove, reintroduced by an
optimistic number. Every band is now derived from the wrapped height, so deck details mobile unveils
**57%**, not the 71% first claimed, and render 09's settled `labelAt` is **83**.

## R5 — the chip moves, the header un-centres

**Moving the status chip to the progress-bar row doesn't save a row — it converts one into art.** The
chip is a status and the bar is a status, so together they leave the block carrying identity alone:
deck name, commander, colour. That drops `labelAt` from **78 to 46**, and because the ramp is measured
in pixels from the block, all 32px come back as unveiled art: **54% → 73%**. Putting the chip inline
with the subtext would have saved the same row and bought none of it — the two plausible answers differ
by 19 points of visible commander. Drawn across four statuses (Complete, Building, Trim, Empty —
**inferred, not given**; correct me if the set is different).

**Deck details mobile un-centres.** Centring was inherited from when the title floated mid-band with no
block under it; at the foot it fights the left-aligned progress row directly beneath. Chip now sits
left of the subtext, as you asked.

**On the two controls: the hit boxes are safe, the semantics aren't.** 44px targets 8px apart are easy
to hit — but one icon acts on the *art* and one acts on the *name*, and side by side in a corner
nothing says which. Both options drawn:

- **i, as asked** — both right. Costs the title: 96px off the right wraps the name to two lines, block
  grows to 76, unveils **61%**.
- **ii, recommended** — pencil beside the name it renames, expand icon at the art's own corner. One
  gutter, title holds one line, block stays 57, unveils **71%**.

**"Do we even need the pencil?" Keep it.** A tappable title with no affordance is discoverable only by
accident — nothing distinguishes it from every other heading in the app that does nothing when tapped.
Tapping the name *should also* work, it costs nothing and rewards the guess, but it can't be the only
route. If you do want the pencil gone, the honest replacement is a chevron on the identity row opening a
deck-settings sheet (rename, commander, delete) — a real IA change, bigger than this round, and it
would give the tile's overflow menu somewhere to point.

**Option ii's one real flaw:** its inline pencil is drawn at 26px, under the 44 floor. Give it a 44px
hit area overflowing the 26px box — that's the actual trade between i and ii, not the alignment.

## The five calls

### §3.1 · The height — two, and what governs which

One number cannot serve fifteen, and the arithmetic says why. Commander detail's mobile band is
`1.6/1`, so it is **244px** at 390px wide. The deck tile's column runs **189px** at 640 and 435px at
1440. A single fixed height that is taller than 244 on a 189px column is a portrait box holding a
landscape crop — and decision 3 requires taller *everywhere*, so shrinking detail is not available
either.

**What governs which is not viewport or route — it is what the box is for**, and the question is
answerable without looking at a screen size:

- *Is the image the point of this box* — a page header, or a grid cell whose job is telling you which
  deck is which? → **feature band, 248**
- *Is it a full-width row you scan down?* → **row band, 208** — the one class priced by scroll
- *Is it a secondary cell on a page about something else?* → **resume band, 168**
- *Is it identifying a row you are choosing among?* → **thumb**
- *Is the player meant to read the printed card?* → **card face**
- *Does a wide portrait carry the layout?* → **288**, desktop deck details alone

`art_crop` is 1.37:1, so `168 × 1.37 = 230`, `208 × 1.37 = 285` and `248 × 1.37 = 340` — three portrait
widths derived from their heights.

**The 288 desktop band inverts that rule and is the only one that does.** Everywhere else the height is
chosen and the portrait follows. On deck details desktop the portrait's *shape* was chosen first, so
**560 is the chosen number and 288 follows it** — 288 is what keeps the crop from scaling past ~42%.
Deriving `288 × 1.37 = 395` here loses section E entirely, including the ≥1200px floor that comes with
the wide portrait.

**Stated cost, the only one — and it grew with the settled height.** At 248 on the deck grid's
narrowest 189px column the tile is `0.76 : 1` and shows 189 of the 340px the crop wants: **~44% of its
width is gone.** `center top` keeps the head, so what is lost is at the sides rather than the face,
but this is a real loss on the render you specifically asked to grow. **The fix belongs to the grid,
not the band:** one-up below ~700px gives a ~330px column at `1.33 : 1`, within a hair of the crop's
own shape. That is a change to the deck grid's columns and sits outside this round.

### §3.2 · The label block, per surface

Full fifteen-row table in the canvas. The rule under it: **a block states the thing's name, then at
most two facts, and never a fact the row below the divider repeats.** Four renders lose something,
eleven lose nothing — seven have no block at all and four were already at the floor.

**`labelAt` changes unit, and that is the round's load-bearing change.** It ships as a **percentage** —
`globals.css` names 55% on the commander hero and 57% on the deck spine — and becomes **pixels from
the foot**. A percentage is exactly what made a taller band scale its own darkness; pixels are what
make added height land on art. Note the trap: the settled **57** below is detail mobile in *px*, not
the deck spine's shipped 57%. Same digits, different unit, different surface.

**The consumer's signature must change with the unit, or the round ships the bug inverted.**
`bottomScrimStops(labelAt)` emits `[73, labelAt]`, and that second element is a gradient *position
percentage* — its own comment reads "the block's top edge as a percentage of band height". Hand it a px
value and `bottomScrimStops(46)` holds at **46%**, 114px down a 248 band, where every drawing in 3a
puts it at **81%** — the scrim landing almost exactly where this round is trying to remove it. A px
`labelAt` cannot produce a percentage position without the band height, so:

```
bottomScrimStops(labelAtPx, band) =
  [[0, 0],
   [0,  (band − 1.48·at) / band × 100],
   [73, (band − at)      / band × 100],
   [73, 100]]
```

The shipped `0.48` and `73` are unchanged (`1.48` is `at + 0.48·at` folded together). Emitting `px`
stops and keeping one argument works equally well — pick either, but do **not** leave the one-arg
percentage signature next to a px value.

Every value is settled in 3a:
**40** resume, **46** hero and both commander rows, **57** detail mobile, **66** spine mobile, **78**
the deck tile (the largest, because it carries the Complete pill), **flat** spine desktop.

### §3.3 · The deck rail's desktop gap — closed by removal, not by art

The anomaly is real: `deck-rail.tsx:95` records that desktop draws neither art nor a count while the
phone row draws both, which is exactly the shape of thing decision 1 forbids.

**But §5 removes the Your Decks rail, both frames, in the brief that lands next.** Adding a sixteenth
render to a component being deleted is the one change in this round guaranteed to be thrown away.
So: **render 03 is specced as a 44×62 thumb and flagged as expiring; desktop gains nothing.** If the
rail outlives the redesign, the thumb is its answer and desktop's gap returns as a one-line ticket.

### §3.4 · The plate — the two converge on the opaque one

```
background:      var(--bg)
border:          1px solid var(--border-strong)
border-radius:   7 square · 999 worded
backdrop-filter: — (retired)
```

`OVER_ART_PLATE`'s 72% was measured for a chip sitting where the *bottom* ramp is thin, and it held.
**Decision 5 moves the goalposts:** with the top scrim gone the top edge is the brightest, least
controlled region of the crop — `center top` puts the face there and the bottom ramp runs at zero
alpha above `labelAt × 0.48`. A 72% mix still passes 28% of a pure white pixel.

**Opaque takes the control out of the contrast problem entirely.** Ink on `var(--bg)` is the page's own
body contrast, which every theme already guarantees, so no plate on any of the fifteen needs a
per-theme measurement and none needs a scrim underneath. That is the argument for convergence, and it
is the argument decision 5 needs in order to be safe. The deck overflow's desktop treatment *is* this
plate already, so the convergence is one control adopting the other rather than a new drawing.

**The boundary, stated so the rule does not over-apply: the ramp protects the label block; plates
protect everything above it.** The rename pencil on spine-mobile therefore takes no plate — it sits
inside the block beside the 20px title, on ground held at 73%, and keeps `COVER_INK_SHADOW` like every
string around it.

### §3.5 · Both strategies survive, and viewport stops choosing

**The box's own aspect decides, at one threshold:**

| | |
|---|---|
| wider than **3:1** | `left-portrait` |
| **1.37** to **3:1** | `cover` |
| narrower than **1:1** | thumb plate, no wash |

Past roughly 3:1 a `cover` crop of a 1.37:1 image discards so much height the art reads as texture —
the art-wash round's own finding, reached by a five-art sweep. **This produces every render's current
strategy but one**, with no `md:` anywhere in the rule, which is what makes the deck spine's
breakpoint fork dissolve: renders 09 and 10 are the same class at the same height and differ only in
the crop their own box's aspect earns.

**The one flip: the resume row leaves `left-portrait`.** Two-up at 380–520px and 168px tall it is
2.3–3.1:1 — `cover` by the rule; and the home redesign reshaping that section to 3–4 items makes each
item narrower still, so the rule and the next brief agree. See **A4** — this is the round's largest
single reversal.

**Decision 1 is not reopened.** One treatment means one label edge, one height set, one plate rule,
one ramp function. `cover` and `left-portrait` are crops, and after this round neither is ever chosen
by a viewport.

---

## Decision 6 — every element at a top edge, and what carries each

The brief names three tenants and says finding the rest is part of the round. **There are four** — one
of which is not at a top edge at all, and one of which is retired rather than plated. Full fifteen-row
enumeration in the canvas; the live ones:

| Render | Tenant | Ruling |
|---|---|---|
| 04 `detail.tsx:253-256` | `IdentityPips` `top:14 right:16` | **retired from the band** — moves into the block beside the name |
| 04 `full-card-trigger.tsx` | `Card details` `top:56 right:16` | **moves** to bottom-right, on THE PLATE |
| 08 `deck-card-overflow.tsx:96-104` | `…` `top:8/10 right:8/10` | **plate** — and the *phone* control is the exposure |
| 09 `spine-mobile.tsx:133` | `FullCardTrigger` `top:13 right:16` | **plate**, stays top-right |
| 10 `spine-desktop.tsx` | `Card details` `left:16 bottom:14` | **checked, not a top-edge tenant** — takes THE PLATE, no move |

**Eleven renders have an empty top edge** once decision 2 lands. That is not a gap in the enumeration,
it is the enumeration's result, and it is what makes deleting the top scrim cheap.

Three things worth reading:

1. **The pips are retired, not plated.** Unplated pips over a pale crop is exactly the bug the scrim
   prevented — the brief is right. But five plated swatches in a corner is five plates for a
   decorative `aria-hidden` read, and every other band in the app already draws its pips *beside the
   name*. Moving them is cheaper than plating them and makes the surface match the other four.
2. **Two of the three `Card details` placements collapse.** `top:56 right:16` existed only to stack the
   pill below the pips. One rule: **bottom, on whichever side the block does not reach.** Top-right
   survives on spine-mobile alone, whose centred title and rename pencil hold both bottom corners.
3. **The deck tile's phone control is the round's one real exposure.** It is bare at 44px by ruling —
   "the drawn plate is desktop-only" — *because the top scrim was carrying it*. Delete the scrim and
   that glyph is `var(--fg)` on an unmodified crop. It takes the 26px plate centred inside the 44px
   target: hit area unchanged, drawn box matches desktop, target floor untouched.

---

## Decision 7 — what comes out

Small and specific, not a redesign of four surfaces:

- **Render 02, resume row.** Printed a status pill, the commander's name, the count *and* a to-buy
  clause into a 200px line. A 168px band shows the commander, so the name goes; the count says how far
  along, so the clause goes. Pill and count survive.
- **Render 08, deck tile.** The **pips** go, not the colour label — you kept the worded colour, and
  "Green" beside a green square is the same redundancy one layer down; the word is what survives at
  189px. R1 had this backwards. "all owned" and "never played" go too: the bar and the count say both.
- **Render 01, hero.** A condense rather than a cut: pips were pinned bottom-left and the fit chip
  bottom-right with the name at the top. With the label at the foot all three are one row, which is
  what makes `labelAt 63` arithmetic work.
- **Render 04, detail mobile.** The pips arrive from the top edge; nothing is cut.

Product owns three of these strings: the resume row's to-buy clause, the deck tile's "all owned", and
desktop's "99 owned · 0 to buy". None is invented here and each survives elsewhere — the roll-up on
Shopping, and the bar beside the count everywhere else.

---

## The primitive afterwards

```
height:    248 | 168
strategy:  "cover" | "left-portrait"
labelAt:   number            ← now required on BOTH strategies
artCropUri, colorIdentity

retired:   labelEdge · band: 168|148|72 · COVER_SCRIM_STOPS.top
           art-wash-scrim-cover-top (+ its reduced-transparency override)
           PORTRAIT_BANDS.vertical · PORTRAIT_BANDS.clearTo · OVER_ART_PLATE
```

Three union arms become two. **One ramp function serves both strategies**, but not with the shipped constants — R1 claimed an
identity that does not hold. `bottomScrimStops(labelAt)` does the same *shape* as `left-portrait`'s
hand-written `vertical` column: clear above, climb, hold to the foot. Re-derived in pixels, the 148
entry's `[0,0][0,38][78,55][78,100]` puts its hold at 55% of 148 — **`labelAt ≈ 67px`**, a ramp of
**0.38 × labelAt** and a **78** hold. We standardise on **0.48 and 73** (73 being the value the
exported constant and `wash-contrast.test.ts` already agree on). So deleting the column is a
deliberate re-drawing of two constants, **not a no-op** — and an implementer who reads R1's sentence
ships percentage semantics and rebuilds the bug.

**Accessibility consequence, and it is the round's second a11y item.** `globals.css` overrides only
`.art-wash-scrim-cover-top` for `prefers-reduced-transparency`, and its comment says why a
bottom-labelled band cannot be overridden: the stops come from a `labelAt` no stylesheet can see.
After decisions 2 and 5 **every** band is bottom-labelled, so that override retires and **no band in
the app keeps a stylesheet-reachable scrim** — the preference is carried by `.art-wash-art` opacity
alone on all fifteen renders, and the px-based `labelAt` makes that permanent. If reduced transparency
should reach the scrim too, the ramp must be emitted as a CSS variable rather than an inline gradient;
that is a change to the primitive this round has **not** specced.

| | portrait | maskEnd | clearTo | flat stop | sharp |
|---|---|---|---|---|---|
| 168 `left-portrait` | 230 | 58% | 133 | **240** (shipped) | .92 |
| 208 `left-portrait` | 285 | 58% | 165 | **300** (new) | .92 |
| 248 `left-portrait` | 340 | 58% | 197 | **356** (new) | .92 |

**There is no ambient layer.** The full-bleed `cover` copy at 0.28 was deleted from `art-wash.tsx`
because past the portrait's own width it was a second, differently-scaled print of the same picture
behind the first — it read as a double image. With art, the masked sharp portrait is the only art
layer; the full-bleed div carries the null-art identity gradient alone.

**The flat stop does not derive**, and `PORTRAIT_BANDS` says so in its own comment: each was drawn
against its own surface. Band 168 keeps its shipped **240**; the two new bands get two new drawn
values, chosen so the title column clears the mask's tail by ~15px.

**`clearTo` is derived, not a value:** `maskEnd% × width` to within a pixel on both bands sharing
`maskEnd: 58` — 58% of 230 is 133.4 against a shipped 134, and 58% of 203 is 117.7 against a shipped 118. It is the one column that does. Which is the honest reading of "the scrim's third stop": the crop runs clear to where its own mask
starts fading and not a pixel further. Stated with its exception — band 72 ships 58 where 62% of 99 is
61.4, 3px off its own rule, and band 72 retires. That is a reason to delete the column, not evidence
it was always derivable.

**The image-source rule, stated once:** `art_crop` where we print type over it, the card face where we
do not. The ban on `normal`/`large`/`png` exists because Magic's printed name and type line land in the
same band as *our* labels; a thumb carries no labels and the two big faces exist so the player can read
the printing. The ban stands exactly where its reason does.

**The thumb plate**, so the five renders that each invented one now share it:

```
63/88 · radius 6 · center top/cover
ground var(--elevated) under the art
ring   inset 0 0 0 1px rgba(0,0,0,.4)
```

The ring ships at **three alphas today** — `.35` in the partner slot, `.35` in the pre-filled thumb,
`.3` on both card faces — against `.4` on the pips and the bar track. One value: `.4`, which is
`IdentityPips`' own and already reused twice. `var(--elevated)` under the art is the partner slot's own
stated reasoning, adopted: a plate with nothing behind it flashes the card beneath through the radius
while the art loads. The card faces' shadow converges on `0 20px 50px rgba(0,0,0,.5)` — the 24px offset
was drift.

---

## Amendments to the ratified tables

Nine amended, seven standing, five constants retired. Each is stated individually in the canvas with
its verdict; the two to audit first:

- **A4 · the resume row's whole exception is deleted.** Band 72's `.95/.22` figures, its
  `--surface-inset` ground, the 116px type inset and decision 3's stated no-shadow exemption go
  together. That row carried the largest lift in the system precisely because nothing read on its art;
  a 168px `cover` band puts every string back on the wash, so every string takes `COVER_INK_SHADOW`.
- **B8 · `OVER_ART_PLATE = 72` retires**, with the hard-coded `72%` Tailwind class at
  `full-card-trigger.tsx:61`, the assertion that holds the two in step, and `backdrop-filter: blur(4px)`
  — one change, and the replacement needs no per-theme measurement at all.

Standing untouched: **A1** (`center top`, now load-bearing), **A7** (`art_crop` only; the
`encodeURIComponent` apostrophe fix), **B1** (R6 ruling 1 — plate while pending, `var(--bg)` when
absent), **B6** (no art and no identity → no wash, now extended to thumbs via `ART_STRIPES`).
**B5** is *superseded upward*, not overturned: the rank eyebrow keeps `var(--fg-body)`, and at
`labelAt 57` on a 248px band it sits inside a 73% hold rather than on the rising ramp its 5.06:1 was
measured against. The withdrawal of `#8FB8E6` stands absolutely.

---

## Open

1. **The 189px deck tile at 248 — the round's one real cost.** ~44% of the crop's width lost; the
   recommended fix is a one-up grid below ~700px, which is outside this round. One capture at 640.
2. **`labelAt` at 320px.** All six values are derived at a 390px reference against clamped blocks.
   Detail mobile's two-line name, spine mobile's two-line title and the deck tile's new three-line
   block at 78 are the three that could push past their own `labelAt`. All fail safe — ink lands *on*
   the hold, not above it — and none is measured.
3. **Whether the deck rail is really being removed.** §3.3's answer depends on it.
4. **The desktop deck header's narrow fallback is undrawn.** The old question (a 364px inset against
   the 768px breakpoint) is resolved and replaced: the portrait is 560 at a 592 inset and the floor is
   **~1200px**, not 768. Below it the header falls back to the 340px portrait at 364 — the one surface
   in the round with two geometries, and 3a drew only the wide one.
5. **Product: three strings.** The resume row's to-buy clause, the deck tile's "all owned", and
   desktop's "99 owned · 0 to buy". The colour label is *not* among them — it was kept, and the pips
   went instead.
6. **Borderless and extended-art printings, still undrawn.** Carried forward unchanged; their
   compositions sit lower in frame, which matters more now that the top scrim is gone.
