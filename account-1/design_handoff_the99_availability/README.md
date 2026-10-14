# The 99 — Card availability (design handoff, R1)

Ticket **#43**. A stateful-UI pass: one availability concept expressed as a marker across four
existing surfaces, plus one new control. No new page, no new visual system, no new palette.

File: `The 99 - Card Availability.dc.html` (canvas — pan/zoom). Every state leads with the
phone, desktop beside it. Read `design_handoff_the99_richness/README.md` for the locked voice
before auditing the copy, and `design_handoff_the99_add_panel/README.md` for the Consider tile
and quick-add bar this pass annotates rather than changes.

## About the design files

The `.dc.html` in this bundle is a **design reference**, not production code. It is a single
annotated canvas — every state side by side with the reasoning cards, phone beside desktop — built
to be read and audited, not lifted. Implementation means recreating these states in the app's
existing Next.js/React surfaces using its own components, tokens and copy files; the only file here
meant to be pasted is `availability · copy strings.ts`.

**Fidelity: high.** Colours, type, spacing and copy are final. `support.js` is the canvas runtime
and is not production code.

Read `READINESS.md` first for the verdict and the one blocker.

**The one-line summary:** *one diamond, three fills, and mostly nothing.*
The marker is a 6px rotated square — the brand's crown diamond — plus a count plus a word.
**Hollow** when an unfinished brew wants the card, **solid brass** when nothing is free,
**doubled and red** when more finished decks want it than the player owns. Free is silent, and
silence is most of the app.

## States delivered

| # | State | Phone | Desktop |
|---|---|---|---|
| 1 | Marker — Free (silent), tile + row | ✓ | ✓ (identical atom; the anatomy table is the spec for both) |
| 2 | Marker — Wanted by a brew, tile + row | ✓ | ✓ |
| 3 | Marker — In use, tile + row | ✓ | ✓ |
| 4 | Marker — Over-committed, tile + row | ✓ | ✓ |
| 5 | Commanders list · `Everything I own` (default ranking) | ✓ | ✓ (state B drawn full; A differs only in active segment + verb) |
| 6 | Commanders list · `What's free` (re-ranked, with deltas) | ✓ | ✓ |
| 7 | Commander detail · receipt collapsed | ✓ | — (header identical; the delta is the collapsed body) |
| 8 | Commander detail · disclosure open | ✓ (filters) | ✓ (splits) |
| 9 | Consider tiles · all four states + unowned + in-deck, one shelf | ✓ 2-up | ✓ 6-up |
| 10 | Quick-add bar with `Owned only` unchanged beside it | — (bar is the shipped shape) | ✓ |
| 11 | Decklist rows · five rows, three of them silent | ✓ | ✓ |
| 12 | Decklist over-committed summary line | ✓ | ✓ |
| 13 | Quick-add search results carrying the marker | — (same rows, 16px type) | ✓ |

Plus the four-state anatomy table at both densities, and the a11y + token + motion contract.

Where a state is drawn once, it is drawn at the width where the distinction is legible and the
other width's delta is stated in the adjacent note card. No construct in this handoff exists at
one width only.

---

## Decisions log

Numbered to the brief's **Open for Design to call**, 1–7.

### 1. What the marker is → **a diamond, a count, and a word**

Not a dot. **The dot is already taken** — the ownership dot has sat top-right on every Consider
tile since #158, and a second dot on the same 168px tile is a puzzle rather than a signal. Not a
caption either: a caption cannot exist at tile density without eating the type line.

So the marker is the **crown diamond** — a 6px `<span>` rotated 45°, the brand's existing shape —
carrying a number and a word. Two densities, one atom:

- **Tile density (Consider).** A chip at `top-left` of the art: dark scrim, 1px border, 6px
  glyph, 8.5px mono label. Top-left because top-right is the ownership dot and bottom-left is
  the cost pips (#158's tile anatomy). The claiming deck's name does not fit here, so it moves
  to a caption line under the type line — a line that only exists when there is something to
  say.
- **Row density (decklist, quick add, detail).** Inline, appended to the shipped
  `×${qty} owned` string with a ` · ` joiner. It takes no column and no row height. The brief
  observed that a free count "would sit naturally beside a string that already carries a
  quantity"; that is exactly where it sits.

**Never a treatment on the row.** Dimming, striping or greying a row says *unavailable*, and
nothing here is unavailable — every card in this file can still be added. A chip annotates; a
treatment forbids. Locked constraint 1 says we may not forbid, so the visual language may not
imply it either. This is also why the in-deck tile keeps its greyscale-and-`✓` treatment and the
in-use tile does not: *in deck* really is a completed thing, *in use* is not.

### 2. How the two severities differ → **hollow vs solid, one glyph**

Same shape, different fill. Outline reads as provisional in every interface a player has ever
used; solid reads as settled. It needs no legend, it survives being 6px, and it makes the two
states obviously **the same concept at two confidences** rather than two unrelated badges.

The alternative — two colours of the same dot — fails the AA constraint on its own and fails
the "not two unrelated badges" constraint the brief names explicitly.

Colour follows fill rather than carrying it: soft is `--fg-muted`, hard is `--brass`. The soft
state is deliberately the quieter of the two in *both* channels, because a twelve-card sketch
claiming a card is the weakest evidence in the model.

### 3. Over-committed → **on the card, everywhere — plus one line in the deck**

**On the card**, because over-commitment is a fact about a *card*, not a deck: the same copy is
over-subscribed whether the player is looking at it in Kykar, in Consider, or on a commander
detail page. A card-level fact rendered in only one place is a fact the player cannot act on.

**And once at the top of the deck**, because a 99-row list will not surface a single red glyph
on row 61 by scrolling. The summary line is a count and a name, it renders only when the count
is above zero, and a deck with no over-committed cards has no line — silence holds. It is
styled as a tinted strip with the marker glyph as its bullet: **no icon-in-a-circle, no dismiss,
no retry**. #140's refusal pattern appears nowhere in this handoff, because nothing here was
refused.

**Not on the deck index.** The per-deck roll-up is explicitly out of scope, and the status pill
is untouched — the deck in state 12 reads `Building` because it has 48 cards, and
over-commitment does not change that. One status vocabulary, per locked decision 2.

The glyph is the solid diamond **doubled** — two overlapping 6px diamonds with a 1px background-
coloured seam. Third step in one progression rather than a new symbol, and the only state that
tints its container's border.

### 4. The toggle → **segmented, `Score against`, default `Everything I own`, persisted in the URL**

**Segmented, not a switch.** A switch implies a default-off setting with one true state; these
are two equally valid questions, and both labels stay visible so the player can see the
alternative exists — the entire point of a re-rank they have never met before.

**Default `Everything I own`.** A first-deck player has zero hard claims, so `What's free`
produces an identical list reached by a scarier road. Defaulting to the scarcity view also
breaks "silence is the default" on the surface with the most rows.

**Persists via `?avail=free`**, restored on return. URL state rather than a hidden preference:
shareable, back-buttonable, and it cannot silently outlive the session that set it — the failure
mode of a sticky sort nobody remembers flipping. It also matches the shipped colour filter,
which already maps 1:1 to `?c=` (commanders handoff, decision 2).

**The label is the anti-collision device.** `Score against` names the control's job as *ranking*.
Neither segment ever hides a commander; `Showing 24 of 24` is identical in both states, and
`Order: Fit ↓ · fixed` stays true — the order *rule* never changed, only what Fit is measured
against. This is what makes it structurally unlike `Owned only` — see 5.

**The delta is the argument.** `↓21` beside a re-ranked score is *why* the toggle exists. It
appears only in the `free` state, only where the score moved, and the desktop width buys the
anchor (`↓21 from 82`).

### 5. Two adjacent ownership controls → **they survive, because they never meet**

Plainly: **yes, they would collide** — `Owned only` and a hypothetical `Free only` in the same
390px bar are two checkboxes about the same noun, differing on a word the player has known for
four minutes. That is the collision the workshop flagged, and it is real.

**So the builder does not get a second control.** On the Add panel and the decklist, availability
is **annotation only**: every state is drawn, nothing is filtered by it, and `Owned only` keeps
its exact shipped meaning, position and default. Per-surface controls (locked decision 6) does
not mean *one control per surface* — it means the control goes where the question is asked, and
"what can I still build with" is asked on `/commanders`, not mid-build.

A `Free only` filter would also break "never block" by the back door: a default-on filter is a
block wearing a filter's clothes — the card is simply absent, with no marker to explain why.

If a second control ever does land in the builder, **the rename is the fix, not the layout**:
`Owned only` → `In my collection`, which separates the nouns before the toggles have to. Carried
to the gap report as §1, since it is the ruling the brief flagged as most likely to reopen.

### 6. Naming the locked-up cards → **annotation on the cards already shown, reached by the count**

A separate "in use" list would duplicate the matched-cards list: twelve of the thirty-four are
already on that page, and a player scrolling past both cannot tell whether they are looking at
twelve cards or twenty-four.

So **the receipt's second clause is the control.** `12 already in use` is a disclosure button.

- **Phone:** filters the list to those twelve, with a `show all 34` return.
- **Desktop:** splits the list into `In use — 12` / `Free to build with — 22`, both visible.

Same disclosure, same counts, same annotations; the phone shows one half at a time because two
columns of five-line rows do not fit under 400px. **This is the one structural delta in the
handoff** and it is flagged in-canvas rather than hidden — "parity" in this repo has meant *same
constructs*, not *same pixels*.

**The claiming deck's status pill rides along** in the expanded state. `Complete` beside Atraxa
is *why* Smothering Tithe reads solid rather than hollow. Locked decision 2 asked for the pill to
be the severity source; here it does that work visibly instead of only in the query.

### 7. The receipt line when nothing is in use → **the line stays, the clause goes**

`34 of your cards fit` always renders — it is not new, it is the existing fit receipt. `· 12
already in use` is a **suffix**, appended only when the count is above zero. Row height never
changes between players, so the list-rhythm problem the brief anticipated does not arise: a
silent row and a loud row are the same height, and the difference is a clause, not a line.

In the `What's free` state the first clause changes verb — `fit` → `are free` — so a number never
means two things depending on a control the player may have flipped a minute ago.

### Vocabulary: **kept `free` / `in use`**

The brief offered `available` as a one-word swap. Declined, and for a stronger reason than the
one given: `buy` and the availability marker appear **on the same tile** in state 9, four
millimetres apart. "Available" next to "buy" reads as *purchasable*, which is the one meaning
this marker must never carry. The copy file states the swap is all-surfaces-at-once if it is ever
made.

---

## Implementation notes

- **Surface 1 is drawn on the shipped commanders constructs, unmodified.** The colour filter is
  the Collection pip vocabulary from `The 99 - Commanders README.md` (§Color-identity filter):
  16px circles in the shipped WUBRG hexes, inactive `opacity .35`, selected
  `box-shadow 0 0 0 2px #C9A24B`, with `Includes ▾`, `Order: Fit ↓ · fixed` and
  `Showing N of 24`. The desktop card keeps its `40 / 100 / 1fr / 236`px grid, its Cinzel rank,
  its `aspect-ratio 63/88` art with pips inset bottom-left, its Plex Mono `34px` Fit figure with
  `/100`, and its three-segment fit bar (`#6E5B33` Pool · `#A9863E` Roles · `#C9A24B` Synergy)
  plus legend. The mobile tile keeps radius 11px, the 36×50 art thumb and the Plex Mono `20px`
  Fit figure pinned top-right.
- **The availability receipt is a new line, not a replacement.** It sits in the evidence column
  directly under the existing `own N of top M` synergy receipt, in the same Plex Mono treatment.
  `own N of top M` and the `receipts:` line are untouched. The `↓21` delta joins the Fit column
  under the segment legend, so nothing in the card's four-column rhythm moves.
- **The arithmetic is the brief's**, unchanged: `free = owned − hard`, hard from decks at 99
  (`Playable | Complete`), soft from decks under 99 (`Draft | Building`). Severity is read from
  `statusPill()` (`src/lib/decks/status.ts:15-24`) — no new field, no second vocabulary, and
  `decks.status` stays dead and should be dropped in the implementation PR as the brief directs.
- **The `owned > 0` guard is load-bearing in the drawing.** State 9 includes Teferi's Protection
  — unowned, `buy` treatment, **no availability marker of any kind**. Without the guard it would
  compute `free = 0 − 1 = −1` and render as the loudest state in the system for the most ordinary
  thing in the app. Any implementation that treats the marker as "render for every card in the
  list" reproduces that bug.
- **Four new tokens, all derived.** `--avail-soft` = `--fg-muted`; `--avail-hard` = `--brass`;
  `--avail-hard-fg` = `#E8CE93` (new — **not** because brass fails; see below); `--avail-over-fg` =
  `#E9917A` (new — the shipped danger red lifted for text). No new hues. The two new literals go
  in the same block as the existing danger colour in `src/app/globals.css`. **There is no light
  theme** — `globals.css` has one `:root` and no `color-scheme`, so these are single-value like
  every other token. *(R1 said "take a light-theme pair there"; corrected in R2.)*
- **Brass is AAA, and this pass is not a reason to stop using it as text.** `#C9A24B` is 7.5:1 on
  `--surface` and 7.84:1 on `--bg` — AAA for normal text. `--avail-hard-fg` exists for a **size**
  reason, not a hue one: the tile chip label is 8.5px mono on an `rgba(11,9,7,0.9)` scrim over card
  art, which is below the 14px threshold regardless of ratio. The glyph stays `--brass`. *(R1 wrote
  "brass itself is not AA as small text", which a reader could take as a general rule against brass
  text. It isn't one — corrected in R2.)*
- **The shipped `#C6533F` is used for glyph and border only, never for text**, per the richness
  pass's contrast rule (`README.md`, "Contrast & engagement").
- **No motion.** The marker never animates — not on appear, not on add. A card becoming committed
  is a fact arriving, and a fact that moves reads as an alert. Nothing joins the
  `prefers-reduced-motion` block; net motion change for this pass is zero.
- **No new dependency.** The glyph is two rotated `<span>`s, the chip is flexbox, the disclosure
  is `useState`. The doubled glyph's seam is a 1px border in the *container's* background colour —
  it must be repointed if the marker is ever placed on a surface other than the four here.
- **Copy** lives in `src/lib/copy/` — see `availability · copy strings.ts` in this folder, keyed
  and ready to paste, following `decks-builder.ts`'s shape. `quickAdd.rowOwned` (`:197`) is
  **unchanged**; the marker joins it rather than replacing it, and `rowAria` gains one optional
  trailing argument rather than a new signature (R2, §B).
- **Mock data:** card names, types and colour identities are real; a Jeskai player with four
  decks. Quantities are internally consistent arithmetic over a fabricated collection — Fit
  scores and the `↓21` / `↓27` deltas are **plausible but fabricated**, not model output.

## Accessibility contract

```
div[role=radiogroup][aria-labelledby=avail-rank-label]
  button[role=radio][aria-checked]                     ← Score against

button[aria-expanded][aria-controls=matched-cards]     ← "12 already in use"
section#matched-cards
  ul > li > (… existing row content …) + span.marker

span.marker
  span[aria-hidden=true].glyph
  span                                                 ← the number + word, always present
```

- **Colour is never the sole signal.** Glyph fill (hollow / solid / doubled) *and* a number *and*
  a word. Greyscale the file and all four states remain distinguishable.
- **The marker is text, not an image.** It reads inline in the row's existing description as a
  fourth, optional argument to the shipped `rowAria(name, typeLine, owned)` — never a replacement
  for it: `"Cyclonic Rift, Instant, owned, no free copies; this one is on your Atraxa list"`. A
  free card produces the exact shipped string. The diamond is `aria-hidden`; it decorates a string
  that is always present. *(R1 specified a 3-argument replacement that dropped the type line from
  every Consider row — respecified in R2, §B.)*
- **The ranking control is a `radiogroup`, not tabs** — it switches data, not panels — labelled by
  the `Score against` heading.
- **The disclosure is a real button** with `aria-expanded` / `aria-controls`, and toggling
  announces the new count on the page's existing live region. One region per page, not one per
  surface (the pattern #158 set).
- **Contrast**, against the real row/tile background `--surface #1E1A15` (R1 quoted these against
  `#1A160F`, which is `--surface-rail`; repointing costs about 2%, so every figure still clears
  AAA): `#E8CE93` ≈ 11.8:1 · AAA; `#E9917A` ≈ 7.6:1 · AAA; `#C6B79A` ≈ 9.2:1 · AAA; the brass
  glyph ≈ 7.5:1 · **AAA**. The 8.5px chip sits on a scrim darker than `--surface`, so its true
  ratios are higher again.
- **Tap targets:** the disclosure is 44px on phone. Nothing else in this pass is interactive —
  **the marker itself is never a target**, which is deliberate: a 6px glyph that responds to taps
  in a grid of 44px Add buttons is a mis-tap generator.

## Gap report

Things this handoff deliberately does **not** answer, for the audit:

1. **`Owned only` may need renaming, and this pass doesn't do it.** Decision 5 keeps the two
   controls apart rather than reconciling them, which works *today* because they never share a
   surface. The moment anything availability-shaped lands in the builder, `Owned only` →
   `In my collection` is the prerequisite. This is the brief's own open question 5, answered
   "survives, conditionally" rather than "survives."
2. **Deck names in the marker have no length budget.** `0 free — in Atraxa` fits; `0 free — in
   Kykar Spellslinger Tokens v3 (Budget)` does not. The drawing assumes short names. Truncation
   point, `title` attribute vs none, and whether the name is dropped entirely below some width
   are unresolved — a real product decision, since the name is the most useful half of the string.
3. **"Exactly one claiming deck" is drawn; two-to-many is specified but not drawn.**
   `hardMulti` (`0 free — across 3 decks`) is in the copy file and follows the same rules, but no
   state in the canvas exercises it. Low risk, non-zero.
4. **The receipt line's second clause competes with nothing yet.** On the commanders list it is
   the only optional clause on the row. If a later ticket adds a second (price, legality, deck
   count), the ` · ` chain needs an order and a truncation rule, and this pass sets neither.
5. **The soft threshold is the brief's proxy, and it will be wrong for someone.** A 98-card list
   is `Building` and therefore soft; a 99-card list of pure theory is `Playable` and therefore
   hard. That cliff is inherited from locked decision 2, not introduced here, but the first
   support ticket about it will be about the 98th card.
6. ~~**No empty/degraded state for the availability query.**~~ **Closed in R2.** `DegradedBanner`
   already ships on `/commanders`, so a failed availability read reuses it there and disables the
   `What's free` segment (a quiet failure would make a network error read as "nothing you own is
   committed"); on the builder surfaces it genuinely fails quiet, because the marker is pure
   annotation there and nothing changes meaning. Drawn in the addendum.
7. ~~**The decks and commanders design tables are not in this project.**~~ **Closed — verified
   engineering-side.** All tables are in the tree. Rows superseded: `commanders.md` §Evidence
   column, §"Order: Fit ↓ · fixed", §Filter pip row wrapper, §Fit column, §Score row; `decks.md`
   §Decklist Row; `add-panel.md` §4c / §4e / §4g.
8. **The collection page is where a player would look first.** Out of scope per the brief and
   correctly so, but worth saying from the drawing side: three of the four surfaces here annotate
   a *decision* the player is already making, while the collection page is the one surface where
   the marker would be the point. The follow-up ticket should inherit this marker unchanged.
9. ~~**The spec and source files were not in the project.**~~ **Closed — verified engineering-side.**
   Every token name, line reference and component shape in this document has been checked against
   `src/`. Four corrections came back and are landed above: no light theme, brass is AAA,
   `decks-builder.ts:197`, and `#1A160F` is `--surface-rail` not `--surface`. See
   `ADDENDUM-README.md` for the ledger. **Nothing in this handoff is reconstructed any more.**
10. **A commander can vanish on the flip.** Re-ranking resets the reveal window to batch 1, so a
   commander at rank 3 under `Everything I own` that lands at rank 60 under `What's free` drops out
   of view. That is the toggle telling the truth and the window count says there is more, but
   auto-revealing far enough to keep a previously-seen card visible would be a new windowing
   pattern. Accepted for R2; revisit if beta users report losing their place.
11. **Two degraded reads can co-occur.** EDHREC down *and* availability down should be one banner
   with two sentences and one `Retry now`, never two stacked banners. Specified, not drawn.

## Files
- `ADDENDUM-READINESS.md` — **R2 verdict: 🟢 Green.** Read this first; it supersedes `READINESS.md`.
- `ADDENDUM-README.md` — R2: the correction ledger and the three rulings the audit asked for.
- `READINESS.md` — the R1 verdict, kept for the record. Its one blocker is now closed.
- `The 99 - Card Availability.dc.html` — the canvas (this handoff's deliverable).
- `The 99 - Card Availability Addendum.dc.html` — R2: numeral ledger, window reset, degraded state.
- `availability · copy strings.ts` — the copy block for `src/lib/copy/`.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
