# The 99 — Partner commanders (design handoff · R2)

Serves **#364**. Governing spec: `docs/superpowers/specs/2026-09-08-partner-commanders-design.md`
on branch `design/partner-commanders` (PR #465). **§6 is the only section addressed to Design**, and
this document answers its four items and stops.

Files:
- `The 99 - Partner Commanders.dc.html` — the deliverable. Canvas (pan/zoom), with a **theme prop**
  (all six themes) and a **showRejected prop** for reading it without the rejected options.
- `partners · copy strings.ts` — four new strings, three reused by reference.
- `READINESS.md` — self-assessment.
- `brand/` — the locked brand sheet. **Not a colour source** (see the wash handoff's note on this).

Decisions continue the numbering from `design_handoff_the99_deck_details_wash/` (11–15), so partner
decisions are **16–21**. Every colour is `var(--*)`; two inherited literals remain and are named in
the canvas's palette comment.

The **§4 ceiling is assumed throughout**: a pair deck is 98, and every count drawn reads against 98.

---

## R2 · what changed, and why

**#473 merged at 2026-09-09 00:42, about seven hours before R1 drew.** It replaced the deck header's
commander thumb with a full-bleed `ArtWash` at both widths — `spine-desktop.tsx:79-84`
(`left-portrait`, `band={168}`, type at a 254px inset) and `spine-mobile.tsx:63-68` (`cover`, 2.2:1).
R1's `72×100 / 48×67 / 75×54` were `builder-spine.tsx:294` as it read at `0ba88f2`.

| R1 decision | R2 |
|---|---|
| **16** — shingled cluster, primary in front | **Withdrawn.** There is no thumb to shingle. Replaced by **22**. |
| **17** — the size step is the surface's floor | **Narrowed** to the picker, the one surface that still draws thumbs. |
| **18** — the caption takes both names | **Survives, re-anchored.** New insets, new arithmetic, one reversal: the identity label now *stays* on the desktop line. |
| **19** — short names on the resume row | Stands. Extended by **23**. |
| **20** — the picker's second slot | Untouched. |
| **21** — no diptych, primary-only art | Untouched, and now **also the header's** argument — see **22**. |
| — | **22** *(new)* — the header carries no portrait-level pair signal. |
| — | **23** *(new)* — the resume count is atomic; the to-buy clause is droppable. |

**One R1 claim is withdrawn outright.** R1 said the pair carried order three ways — reading order,
z-order and size. Two of those were properties of the shingle. **R2 carries order in words alone**,
which is why the ordering constraint is now trivially satisfied rather than carefully preserved: a
sentence cannot be symmetric.

---

## The ordering constraint — answered, and there is no tension to note

The brief asks that any symmetric treatment be flagged rather than quietly shipped. **Nothing here is
symmetric, and no ordering was traded away.** The one treatment that would have been — a two-up
diptych in the wash — is declined on independent structural grounds (decision 21), so symmetry never
had to be weighed against the fixed order at all.

Everywhere the pair is drawn together it carries **three independent order signals**: the primary is
first in reading order, in front in z-order, and one step larger. Any one surviving is enough, which
matters because the mobile spine's size step is only 4px (see decision 17).

---

## 22 · The header states the pair in words and the count, not in art

**§6 asked for two portraits in the spine. The ruling is one**, and it is the same argument that
closed 21, at a larger size. `ArtWash`'s portrait width *is* `band × 1.37`: at `band={168}` that is
**230px**, with the mask end at 58%, the four horizontal scrim stops at 0 / 134 / 230 / 240px, the
type inset at 254 and — unlike the resume row — a **vertical** scrim keyed to type sitting over art.
If a diptych was a third strategy on a 72px band, it is a third strategy on a 168px one. The
argument did not weaken with scale; it gained a layer.

`spine-desktop.tsx`'s own first line is *the commander's art is the band now*. A band is a single
field of one image. **The pair is stated in the caption, in full, and in the `/ 98`** — the same two
carriers the desktop rail uses, on a surface where the caption has 644px instead of 200.

### The partner gets the one thing declining the portrait costs it: its printing

`FullCardTrigger` opens *the* commander's printing from the band. A pair has two printings and one
band. **So the partner's name in the caption is its trigger** — the band stays the primary's, and the
second card opens from the word that names it. That keeps the affordance where the information
already is, costs no geometry, and is the app's own vocabulary: the thumb #473 removed was a card
trigger too. Drawn as an underline on the partner's name only — **not the primary's**, whose trigger
is the 230px of art beside it.

### The two non-diptych treatments, both rejected

| Treatment | Why not |
|---|---|
| **A partner thumb on flat ground** (past the 240px stop, where no scrim needs re-keying — the one placement that works geometrically) | #473's whole move was deleting the discrete card object from this header. Reintroducing a 44×61 card for the second commander says *the band is the primary's portrait* and *portraits are how commanders are shown* — contradictory claims 60px apart — and puts a hard-edged rectangle back on the surface that spent a handoff removing them. |
| **The partner as the ambient layer** (swap the full-bleed .2 layer's crop; no stop, mask or alpha changes, so the contrast test is unaffected) | At .2 nobody can identify the card. It buys atmosphere, not information — while changing what the ambient layer *means* for every `left-portrait` band in the app, from "the same crop, softened" to "possibly a different card." A contract change paying for a signal no one can read. |

## 17 · The size step, now the picker's rule alone

The picker is the only surface in this handoff that still draws card thumbs, so it is the only place
this survives: **primary 44×62, partner 38×54** — one step smaller, and the step is the surface's own
floor rather than a fixed ratio, which would breach a target floor on a narrow surface and vanish on
a wide one. The primary never changes size, so a single-commander sidebar is pixel-identical to today.

## 18 · The caption takes both names — re-anchored to the wash

`{commander.name} · {colorLabel(...)}` becomes `{primary} + {partner}`, inside the caption row that
already exists at `gap:10` under the title, holding pips, name and status pill. **No row is added and
no badge appears** — the count reads 98, and a reader who can see why does not need to be told.

**Desktop keeps the identity label. R1 said it moves; that was measured against the old thumb row.**
At 11px mono the pair plus ` · Jeskai` is ~429px, and with pips, two gaps and the pill the row wants
**~547px of the 644** the type column has at 1180 (header − 254 inset − 24 padding − 18 gap − ~240
actions). It fits, so it stays.

**Mobile drops it, on new arithmetic.** The caption is no longer beside a thumb — it is centred on
the wash inside `left:18 right:18`, so it has **354px**, and `metaRow` is `flex-wrap`. Two names at
10px mono are ~336px: **they fit on their own line, and the pips and pill wrap below them.** Add
` · Jeskai` and it is ~390 > 354. So the label leaves — 18's conclusion survives — and the pips it
leaves behind are in the same row rather than a row below. The wrap costs ~22px inside a 177px band
whose caption block ends ~90px from the top: nothing is pushed off the art, and the 2.2:1 is untouched.

**Single-commander captions are unchanged at both widths.**

**The ordered shrink still applies, between 768 and ~1085px.** At 768 the type column is only ~232px
against the pair's ~370. `flex-wrap` spills the pips and pill to their own lines first; past that the
names must give. The mechanism, and the obvious wrong way to write it, are in 19.

**The joiner is ` + `**, and it now shares a line with `·`: `Ishai + Bruse Tarl · Jeskai`. That is the
strongest possible test of R1's choice and it passes — `+` joins two things of the same kind, `·`
separates two kinds. One glyph for both and the line would read as three commanders. (Not `//`,
assigned to two-faced cards by #363; not `&`, which reads as a unit rather than a sequence.)

## 19 · Full names where the deck is opened, short names where the line is shared

The **spine prints both names in full** wherever the row is wide enough — measured, that is **~1050px
of header** for the drawn pair (the caption needs ~443px of centre column: primary 175 + joiner 17 +
partner 171 + pill 62 + gap 8, and the column is what remains after the 122px cluster, two 18px gaps
and ~240px of actions). Between 768 and 1050px the partner ellipsises, correctly and by the
asymmetric rule below. §2's frame is drawn at 1180px for exactly this reason.

The **resume row prints short names**: the substring before the first comma, which is the identifying
half of a legend's name and the half a player says out loud. `commanderShortName`
(`builder-shell.tsx:278`) already computes it, so this is an existing helper applied to both halves.
A name with no comma is already short and returns whole.

`Ishai + Bruse Tarl` — 18 characters where the full pair is 55, and at the resume row's real width it
renders as `Ishai + Br…`. **That is the ruled state, not a degraded one:** ten characters that still
name both halves in order.

**The shrink order inverts, and it is one of two changes 19 and 23 make to the shipped line.**
Today the count is `flex-1 min-w-0` and the name is `flex 0 1 auto`, so the count absorbs the whole
deficit and **collapses to zero width** before the name loses a character — measured at exactly that
in the first drawing of this section. The component's comment states it as intent, and it was right
for one name. **It is wrong for two:** the count now carries the `98` that is the pair's other
signal, so it cannot be the first casualty. **The count becomes `flex-none`; the pair names become
the only shrinking child.** Four items do not fit 200px in any arrangement — pill 62 + two 14px gaps
+ pair ~100 + count ~44 — so this decides which character is cut, not whether one is. **What the count
is pinned AT is decision 23**, because the span has two forms and only the short one is 44px.

**Shortening is pair-only.** A single commander keeps its full `deck.commanderName` exactly as
shipped: the title is what disambiguates one name, and the pair is what disambiguates two. **No
existing row changes.**

**Two spans, ordered shrink, and the joiner leads the shrinking one**, so the `+` can never be the
character truncation eats — worst case `Ishai + Br…`, which still says *pair*. Written as an ordered
shrink (group `overflow-hidden`, both halves `min-w-0` + ellipsis, partner shrinking first), **never
as a `flex-none` primary** — see decision 18. The row's `sr-only` text names **both commanders in
full, primary first**: truncation is a layout compromise, never an information one.

## 23 · A figure is never partly truncated — the count is atomic, the clause is droppable

The span 19 pins has a second form (`resume-decks.tsx:139-145`): `86 / 98 · 3 to buy` when the
shopping roll-up has an entry for the deck. That is **~113px against the short form's 44**, and the
arithmetic is brutal:

```
62 pill + 28 gaps + 113 long-form count = 203 > 200
```

**The long form leaves negative room for a name** — not a short name, not a single name, no name. So
this cannot be answered by shrinking harder; something has to not render.

**The principle: a figure is never shown partially truncated.** `86 / 9…` is a lie in a way that
`Bruse Ta…` is not. The count therefore splits into **a pinned figure and a droppable clause**:

- **Pair decks never render the clause.** Deterministic, no measurement, one boolean. Not a new
  state either — the component's own comment says a deck with no roll-up entry *draws the count
  alone*, so count-alone already ships.
- **Single decks keep the clause**, and it becomes the only shrinking child there, so what gives is
  the clause's words and never the figure. **This fixes a latent bug**: today the count is the
  shrinking child, so a single deck with a long name already renders `86 / 98 · 3 t…`.

The clause is the right thing to lose because it is the **only item on the line printed elsewhere** —
the deck tile and the rail both carry to-buy, and Shopping owns it outright. The pair is printed
nowhere else on Home. The dropped clause is restored in the row's `sr-only` text.

**The trade, named rather than hidden:** if Product wants the clause on pair rows, the only thing
left to cut is the partner — the row would print `Ishai` alone. That deletes what #364 exists to
show, so Design declines it, but it is the alternative and it is one boolean away.

### The two rejected candidates, and why

At 200px, after the 64px pill, two 14px gaps and the pinned 44px count, **the name slot is ~64px —
ten characters.** All three candidates truncate; the question is only what those ten characters buy.

| Candidate | Ten characters render | Why not |
|---|---|---|
| **Short names, joined** | `Ishai + Br…` | **Ruled.** Both halves present, order intact, pair fact survives the ellipsis. |
| **Full names, truncated** | `Ishai, Oju…` | The pair fact is the *first* thing the ellipsis eats — the row loses exactly what #364 exists to show, spending the same pixels on a title instead of a second commander. |
| **Primary only, no indication** | `Ishai, Oju…` | Defensible, and §6 offers it — but it is **character-for-character identical to the row above**, so it pays that option's whole cost while additionally asserting, silently, that the deck has one commander. |

**The two rejected rows being indistinguishable is the finding, not a drawing accident.** A treatment
whose pair state renders exactly as its single state is not a truncation rule; it is the absence of
one.

A `+1` mark was drafted and dropped: it would sit inches from `overCopy.figure.delta`'s `+5`, which
means *cards to cut*, on a line that also prints a count.

## 20 · The second slot: absent, never disabled — and dashed means not settled

One slot, drawn once, serving `mode="create"` and `mode="import"`. Desktop: in the **Selected**
sidebar under the primary. Phone: in the **scrolling flow** beside the name field — the dock is
summary and button only, and its own comment says nothing else may live there or its height moves
under a thumb.

**State A — absent.** §6 lists this state as "disabled"; **the ruling is absent**, and the brief is
right to have re-scoped it. Nearly every commander in the game has no partner ability, so a disabled
second slot is permanent dead furniture on the app's most-travelled create path, advertising a
mechanic the chosen card does not have. The slot appears the moment `partnerAbility(oracleText)`
returns non-null for the primary and never before — which also covers "nothing picked yet" with no
extra state. **The `Commander` / `Partner` eyebrows appear with the slot**, so a single-commander
sidebar is unchanged.

**State B — empty and available.** A `38×54` plate at `1px dashed var(--border-dashed)`, the label
`Add a partner`, and a caption printing **the ability verbatim** from `partnerAbility()` — `Partner`,
`Partner—Father & son`, `Partner with Pir` — then the `canPair` count. That answers *why can this
deck have two?* in the card's own words rather than ours. **Optional throughout: Create is never
blocked on the second slot.**

**State C — the import proposal.** Both slots filled from the paste and both say so. The partner
plate keeps the dash and the caption reads `Proposed · from your list, line 2`, with `Change` (re-opens
the filtered list) and `Remove` (back to state B). An **illegally paired** declaration renders here
identically — §3 accepts it with a note, and that note is the importer's, not this slot's.

**Dashed means not settled**, and it is the app's existing vocabulary for it: `--border-dashed` on
soft claims, `Building`'s dashed pill. A dash is a line *style*, not an alpha fade, so it survives the
art-wash readability retirement and reads in greyscale. **The proposal is not accent-marked** —
refresh decision 3 reserves accent for *in use* and *to buy*, and a proposal is neither.

**Picking the partner re-heads the list**, and the shipped row is otherwise untouched — same
geometry, same radio, same meta line. The new strip above it does two jobs: it says which commander
you are pairing (the primary scrolls out of view on a phone) and it prints the `canPair` count, so a
filter returning 3 of 400 is visibly a filter and not a broken list.

## 21 · No diptych. The wash and the portrait are primary-only

**Rail (`deck-rail.tsx:123`) — primary art.** The spine is **26px wide**; half of it is 12px of card
frame with no face in it. The pair is stated instead by the **denominator the §4 ceiling already
changes**: `98` appears nowhere else in the app, needs no new node, and sits on the same line.

**Resume (`resume-decks.tsx:84`) — primary portrait, and this half is structural.** `ArtWash`'s
portrait width *is* `band × 1.37` — 99px at band 72 — and the mask end, all four horizontal scrim
stops and the 116px type inset are keyed to that number **in px**. Halving it to 49 is not a
parameter change; it invalidates every stop, and that handoff's own recorded regression is that a
fade not keyed to the portrait shows as a hard seam. **A diptych is a third strategy, not an
option** — and that document closed at *four surfaces, two strategies, one `<ArtWash>`*. At 49px the
crop is also 0.68:1 against `art_crop`'s 1.37:1: half the composition gone, which is the exact
failure that moved the band to 2.2:1 in the first place.

**The desktop rail row carries no pair signal, and that is accepted.** It prints the deck name and
the status word — no art, no count, no commander — so any pair mark would be the only commander fact
on a row that has deliberately never had one. The rail is a directory; the deck page is one tap away.

---

## What this handoff does not touch

Per §6's split, the eng-carried four are not redesigned here:

- **Pips and identity label** become the union from §2's colour rule; the pips are already a set. The
  canvas draws them as Jeskai to show where the label lands, not to respec them.
- **`commanderShortName`'s other callers** — the guided banner and two empty-state strings — stay
  singular on the primary. This handoff reuses the helper on the resume row and touches none of those
  three sentences.
- **Deck tiles on `/decks`** render no commander; nothing to widen.
- **Import state 12** (`import-no-commander.tsx`) is unchanged.

Also unchanged: `statusPillStyle` / `statusBarStyle` render verbatim (only the bar's denominator
moves, so a pair at 98 is Complete and full), and `/commanders` + `/discover` stay out of scope per
§1.

---

## Open items

1. **Ability labels are printed to players verbatim** (`Partner—Father & son`). Deliberate — the
   card's words beat ours — but it is the first place oracle text reaches our UI as a label, so
   Product should confirm rather than inherit it.
2. **The partner's name as a card trigger** (22) is a new affordance on a text run. It needs a focus
   style and a hit area that clears 44px on the mobile caption, where the name sits over the wash at
   10px. Eng call on whether that reuses `FullCardTrigger`'s internals or is a thin sibling.
3. **The to-buy clause dropping on pair rows** (23) is a Product-visible loss on Home. Design's
   reasoning is above; the one-boolean alternative is named there too.
4. **Two `FullCardTrigger`s per header.** The band is the primary's and the caption word is the
   partner's — worth one test for tab order and for the mobile band, where `bandTapTarget={false}`
   already means the band is not itself the target.
5. **Sequencing.** Per §7 this lands after both top-off branches merge. The only surface here that
   the ledger work touches is the header's count, and it reads the derived size either way.

### Closed since R1

- ~~`colorLabel` on four/five-colour unions~~ — never returns a raw code (`format.ts:44-60`: four
  colours reads *Non-red*, five reads *5-color*), so the union caption is already a word.
- ~~`shortCommanderName` reusable on the partner~~ — exported and pure at `decks-builder.ts:17`.
- ~~The 14px overlap's calibration~~ and ~~two overlapping `CardDetailTrigger`s~~ — both were
  properties of the withdrawn shingle.
