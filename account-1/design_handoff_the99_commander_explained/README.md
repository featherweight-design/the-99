# The 99 — Explaining the recommendation (design handoff, R3)

**Track 1, stage 2.** Source of truth:
`docs/superpowers/design-briefs/2026-09-06-explaining-the-recommendation.md` (verified against
`origin/main` at `20b8c1d`). Structural sibling: `design/design_handoff_the99_discovery/` — this
handoff mirrors its file set. Also read `design/design_handoff_the99_recommendations/` for the
page this extends, `design/design_handoff_the99_synergy_discovery/` for the synergy panel it
marks up, and `design/design_handoff_the99_commanders_plane/` for the most recent sibling's
exclusion-transparency pattern (gap 1 points at it).

File: `The 99 - Commander Explained.dc.html` (canvas — pan/zoom). Read
`PROSE-one-string-two-surfaces.md` for §5.3's generator contract, which is the one item that
cannot slip; `STATES-key-denominator-committed.md` for the full state matrix;
`design_handoff_the99_richness/README.md` for the locked voice before auditing copy.

**The one-line summary:** *the number becomes auditable by addition, and the page gains a
paragraph, a key, a mark and one sort control — none of which is a container.*

**Not gated.** §0 says so in as many words: the prose generator has an eng cost and no design
dependency, and the prose-absent state is drawn as a normal state throughout. Readiness may treat
this as ready-to-build.

---

## The calls

| # | Question | Answer |
|---|---|---|
| 4.2 | Where the paragraph lives, and how it reads | **Its own section between the Fit Hero and The Pool**, heading `Why this commander`, geometry character-for-character The Pool's paragraph. Sentence 1 at `--fg-body`; templated sentences 2–3 one step down at `--fg-muted`. **The tonal step is what makes prose-absent read as a paragraph rather than a truncation.** |
| 4.2 / 6.3 | Prose absent | **The heading stays, the templated sentences stand alone, and nothing apologises.** No skeleton, no note, no reserved height. A third state — no prose *and* no per-user figures — **unmounts the section entirely**. |
| 4.3 | A non-100 denominator | **`32` over `/40 measurable`**, in the slot `/100` already holds, same 16px mono `--fg-faint`. Same figure in `absent` and `degraded`. The bar **looks** unchanged at 80% of track — but keeping it there needs a denominator-aware `pct` in `format.ts` (decision 3b), and the legend's equation needs a rounding rule (1b). |
| 5.1 | Where the definitions live | **An inline disclosure inside the hero, below the legend**, opened by a dashed trigger in the legend row (28px chip desktop / 44px row phone) — `CoverageDisclosure`'s two geometries, third instance of one idiom. Not a tooltip (must-not 5), not a modal, not per-label popovers. |
| 5.1 | What the segment number says | **Raw points over that segment's weight** — `Pool 12/15 · Roles 20/25 · Synergy 42/60`. The three sum to the score, so the headline number is **auditable by addition**. |
| 5.2 / #346 | The committed-card mark | **The ownership dot's fill, swapped to `--avail-hard-fg`**, chip border to `--avail-hard` at 40%, plus a clause in the accessible name and one 10px legend line per panel. No new glyph, no new hue, **zero added width — and one new read**, which R1 got wrong (decision 6b). |
| 5.2 / #347 | Sorting Role Coverage | **One control for all four panels**, in the heading row. **Two options** — `Most played` (the shipped order, named for what it does) and `Availability`. Decision 7b: R2's third option named a field that does not exist. |
| 5.3 | The paragraph in the home hero card | **Sentence 1 only, clamped to two lines, the same stored string.** Specified as a length band plus a front-loading rule — see `PROSE-one-string-two-surfaces.md`. |
| 7 | Does the stack hold at 375px? | **Yes. No tabs, no accordion, no reordering.** +355px on a 2,246px body, and the need behind a reorder is met by one anchor. |

## States delivered

| # | Frame | Desktop | Phone (375) |
|---|---|---|---|
| A1 | Paragraph section — prose present, with the anchor | ✓ | ✓ |
| A2 | Paragraph section — prose absent | ✓ | ✓ |
| A3 | Nothing to say — section unmounts | described | ✓ |
| B1 | The length band, measured in both columns | ✓ | — |
| B2 | The front-loading rule — a pass and a fail | ✓ | — |
| B3 | Home hero card — prose present | ✓ | ✓ |
| B4 | Home hero card — prose absent (today's card) | — | ✓ |
| C1 | Fit Hero legend at points-over-weight, key closed | ✓ | ✓ |
| C2 | The key open | ✓ | ✓ |
| D1 | Hero at `/40 measurable` — **absent** | ✓ | ✓ |
| D2 | Hero at `/40 measurable` — **degraded**, with Retry | ✓ | — (same, note reflows) |
| E1 | Committed mark — role panel with a mixed set | ✓ | ✓ |
| E2 | Committed mark — the all-committed panel (Board Wipes), as anchor target | ✓ | ✓ |
| E3 | Committed mark — synergy panel, three dot states | — | ✓ |
| F1 | The sort trigger in the heading row | ✓ | ✓ |
| F2 | The menu open, with the unavailable option | ✓ | — (same menu) |
| G1 | The §7 height ledger | ✓ | — |
| G2 | The three rejected restructures | ✓ | — |
| H1 | All four new elements in six themes | ✓ | — |
| I1 | Token / a11y / motion contract | ✓ | — |

---

## Decisions log

### 1. §5.1 — the segment number is **raw points over the segment's weight**

This is the call that does the most work, so it gets stated as a property of the page rather than
a format: **after this change, the hero's number can be checked by adding the legend up.**
`12 + 20 + 42 = 74`. #342's complaint is that the app never says why; the shortest possible answer
to "why 74" is three numbers that make 74.

Two other readings were available and both are worse.

- **Share of the achieved total** — the shipped bug. Three figures that always sum to 100%, so a
  commander who maxes every component prints `Pool 15% / Roles 25% / Synergy 60%`, identical to a
  poor result. And `Pool 20%` reads as *you own a fifth of the pool*, which is a claim about the
  player's collection that the number is not about. This is what #366 reports.
- **Percent of the segment's own ceiling** (`Pool 80%`). Correct, and unhelpful. Three percentages
  that do *not* sum to the score reopen "which of these is the number", and they **hide the
  weights** — which are the thing the key exists to teach. That 60 of 100 points sit on an EDHREC
  list is the most surprising fact on this page and the one a player most needs in order to read
  the score honestly. Points print the weight; percentages hide it.

Points also **survive §4.3 without a second format**: drop synergy and `12/15 + 20/25` still sums
to the printed `32/40`. A percentage-of-ceiling legend would need the denominator explained twice.

The legend row's geometry does not change — same 24px gap, same 10px swatch at radius 3, same 13px
label, same 12px mono figure. Only the string changes **in the legend** — but see 1b, because making
the equation true is a numeric change, and R1/R2 both said it was not.

### 1b. "Auditable by addition" is a numeric requirement, not a format

**Under today's arithmetic the key would print a false equation.** `score.ts:179-181` rounds each
segment to one decimal and rounds the total *separately*:

```
fitPool   = Math.round(poolFactor   * 15 * 10) / 10   // 12.4
fitRoles  = Math.round(roleCoverage * 25 * 10) / 10   // 20.4
fitSynergy= Math.round(overlapRatio * 60 * 10) / 10   // 42.4
score     = Math.round((fitPool + fitRoles + fitSynergy) * 10) / 10   // 75.2
```

The hero prints **75**. The legend prints `12/15 · 20/25 · 42/60`. The key closes
`12 + 20 + 42 = 75.` — in the one element on the page whose entire purpose is to be checkable
against the number above it.

**The rule: round each segment to an integer, and define the score as the sum of those integers.**

```
fitPool   = Math.round(poolFactor   * POOL_WEIGHT)
fitRoles  = Math.round(roleCoverage * ROLES_WEIGHT)
fitSynergy= edhrecTotal == null ? null : Math.round(overlapRatio * SYNERGY_WEIGHT)
score     = fitPool + fitRoles + (fitSynergy ?? 0)
```

Not the reverse. Rounding the total and apportioning a remainder puts an arbitrary point on one
segment, and the player cannot tell which. This way the equation is true **by construction at every
commander**, which is stronger than true on average, and it drops a decimal nothing ever displayed.

**The cost:** stored scores move by up to ±1.5, so it is a `commander_scores` backfill, and
combined with decision 3b it can reorder ties. The fallback, if that backfill is unwelcome, is to
print one decimal everywhere (`12.4 + 20.4 + 42.4 = 75.2`) — true, checkable, and four decimals of
noise in a 52px figure. Rejected, but honest.

### 2. §5.1 — the key is **an inline disclosure inside the hero**

Must-not 5 rules out hover, and the brief asks for something reachable *from the hero* at both
widths. Four homes were considered.

- **An inline disclosure below the legend, inside the existing hero card.** **Chosen.** It opens
  where the thing it explains is, it needs no new component, and it is the third instance of an
  idiom the page already teaches twice (`CoverageDisclosure`, the synergy disclosure): a dashed
  chip on desktop, a full-width 44px dashed row on phone. Must-not 1 holds — the bar, the gradient
  and their three tokens are untouched, and the panel opens *below* the legend.
- **A modal.** Covers the bar it is defining, on a 12px bar the player is looking at. Also the
  heaviest possible container for three sentences.
- **Per-label popovers.** Three triggers for one explanation, and the interesting part is the
  *relationship* between the three — which no single popover can hold.
- **Three permanent definitions in the hero.** ~300px of hero, on every commander, forever, for
  something read once. The disclosure is the same content, opt-in.

The three definitions each name their weight (`15 pts` / `25 pts` / `60 pts`) and the panel closes
on one line: **`12 + 20 + 42 = 74`**. That line is the key's actual job.

### 3. §4.3 — the bar was already telling the truth; only the caption lied

The shipped fill is `width: fit.pct%`, and with synergy absent `fit.pct` *is* `(pool+roles)/40`
rescaled — the honest proportion of what was measured. **The drawn geometry is identical to what
ships**: same 80% of track, same two segments, same two ramp tokens.

### 3b. But the bar only *stays* at 80% if `format.ts` changes

**R1 and R2 both said the bar was a no-op. It is not, and the reason is one line.**
`format.ts:27` computes:

```
const pct = Math.min(s.score, 100);
```

That returned the right proportion *because of the rescale* — `score` was already
`(pool+roles)/40 × 100`. Delete the rescale and `score` is a raw 32, so **the same bar renders at
32% of track**. Every `/40` frame in this handoff draws 80%, and 80% is correct — but only once
`fitSegments` receives the denominator and computes:

```
const pct = 100 * s.score / measurableTotal;
```

So `measurableTotal` has to travel with the score rather than be derived at the hero — which is
also what decision 3's list consequence (gap 1) needs. **The appearance is unchanged and must-not 1
holds; the claim about cost was wrong.** The honest total: two strings, one deletion, one rounding
rule (1b), and one change in `format.ts`.

### 3c. The score is also a sort key — raising this, not resolving it

`recommend.ts:214` sorts on `score` via `byScoreThenOracleId`, and `store.ts:182` orders the
persisted list by `desc(commanderScores.score)`. Once a no-synergy commander stores **32** instead
of a rescaled **80**, it does not merely print differently — **it falls down the ranking**, taking
the owned list's order and the home hero's first item with it.

This handoff has been framing §4.3 purely as display comparability. It is also a recommendation
change, and there is a real argument either way:

- **Let it fall.** A commander EDHREC cannot see has genuinely less evidence behind it, and ranking
  it beside one that earned 80 of 100 measured points is the fabricated comparability §4.3 exists to
  remove — in the ranking as well as in the caption.
- **Keep the order.** A data gap that is not the player's fault should not bury a commander their
  collection genuinely fits, and the ranking is what the whole product is for.

**Both are defensible and neither is a design call** — it decides what the app recommends, not how
it looks. **Hugh's to answer.** If the ranking must not move, the shape is a separate `rankScore`
that keeps the rescale for ordering while `score` + `measurableTotal` carry the honest pair for
display. That is more code than §4.3 implies, and it belongs in the estimate rather than in a
follow-up.

**`/40 measurable`**, at the same 16px mono `--fg-faint` as `/100`. The word is what stops `/40`
reading as a truncated hundred, and it says the right thing: the ceiling moved, the score is not
partial.

**What keeps it from reading as a broken render is that three signals agree**: two legend entries
(not a greyed third), two bar segments, and one sentence in the shipped note naming 40 as the whole
score available. A partial render disagrees with itself.

**`absent` and `degraded` print the same figure** — scope-independent, no branching by arrival,
§4.3 as written. **They also share one note geometry:** `detail.tsx:186-191` renders a single note
for both non-`ok` hero states, so the two differ in their **clause alone**. Absent's is flat;
degraded's is *"until it returns"* — one word carrying the whole difference between a ceiling that
moved and a ceiling that is missing.

R1 described two hero geometries (`2px --fg-faint` vs `3px --warning`) and drew an inline Retry in
the hero, calling both unchanged. **Neither is shipped.** That rule-weight distinction belongs to
`coverage-section.tsx` (`:344` absent / `:372` degraded), and the page's only Retry is
`coverage-section.tsx:411`. **`FitHero` has no Retry and does not gain one** — a second one there
would be a new control retrying the same fetch. The hero states the condition; **Role Coverage owns
the recovery**, and a successful retry there re-renders the hero at `/100`.

**One shipped element is deleted:** the `Synergy —` placeholder chip. It exists to explain a
missing third of a hundred; at `/40` there is no missing third, so a greyed swatch asserts an
absence the denominator has already accounted for. It is also the one element in the hero below
AA (9.5px `--fg-locked`).

**Worth stating for the audit:** a successful Retry takes the visible score from 32 to 74. That is
the honest outcome of two different denominators, and it is exactly why both print theirs.

### 4. §4.2 — the paragraph's two tones are what make prose-absent work

Sentence 1 is generated and sits at `--fg-body`. Sentences 2 and 3 are templated and sit one step
down at `--fg-muted`. That step is doing three jobs at once:

1. It distinguishes written prose from computed prose without a label, a byline or an icon.
2. It puts the per-user figures in the same ink as The Pool's boilerplate, which is what they are.
3. **It is why removing sentence 1 leaves a paragraph rather than a fragment** — the remaining text
   already started at its own natural weight. Draw the section in one tone and the absent case
   starts mid-thought.

Every figure prints its denominator and steps to `--fg` 600: `34 of her 100`, never a bare 34 —
the same rule the discovery row follows.

**Nothing else is in the section.** No price, no card names, no buy prompt, no chip, no icon, no
"generated by" byline, no confidence score, no thumbs-up. Must-not 4, and each of those facts is a
live element further down the page.

### 5. §4.2 sentence 3 is **the page's own way in**, which is also the §7 answer

Sentence 3 names the weakest role and nothing else — and **that role name is the section's only
link, pointing at that role's panel.** Accent ink on a `1px --accent-shadow` rule: the shipped
Retry treatment, not a new one.

This is the cheapest possible answer to the structural half of §7, and a better one than a
reordering, because it is right for *this* commander rather than for the average one. A page that
says "board wipes are where you are thinnest" and takes you to the board wipes does not need its
sections rearranged on a hypothesis about which two a player acts on.

Target: `id` on the role `<section>`, `scroll-margin-top` for the sticky chrome, and a one-shot
`:target` ring in `--accent-dim` so arrival is legible. Ordinary `<a href="#…">` — no
`scrollIntoView`, no smooth scroll, no focus management beyond the browser's.

### 6. §5.2 / #346 — the mark is **the dot it already has**

Every chip and row carries a `--success` ownership dot. A committed card swaps that fill to
`--avail-hard-fg` and the chip's border to `--avail-hard` at 40% — the pair the availability
receipt already spends on `N already in use`, which is the same fact.

**"Owned" and "owned and spent" are two values of one property, so they belong in one channel.** A
second element beside the dot makes them two facts and forces the player to learn that a card can
be green and amber at once. The swap also costs **zero width**, which is load-bearing on a chip row
capped at twelve.

Where the mark lands hardest: **Board Wipes, 2 owned, both committed, 8 short.** Before the mark
that panel looks like a player two-thirds of the way to nothing. After it the panel says the true
thing — *you have no board wipes available for this deck* — without a sentence. That is #346's
whole value, and it is why the mark had to be readable at a glance rather than in a tooltip.

**Rejected:** a strikethrough (says the card is gone; it is not, it is yours and in use); dimming
(collides with `--fg-locked`, which already means "no figure"); a deck-name pill (60–110px per chip
on a twelve-chip row); excluding committed cards (loudest option, wrong answer — a committed card
is evidence the commander fits, which is what this page is arguing).

**One legend line per panel**, mono 10px `--fg-locked`, in the exact slot `chipNoFigureLegend`
occupies and on the same condition: only where a visible chip actually carries the mark. It carries
the count, so colour is never the only channel. The accessible name gains `, already in
{deck}` — naming the deck costs nothing in a name and answers the immediate question.

The page's own exclusion rule (`page.tsx:36-40`) keeps the panels from disagreeing: an owned card
drawn in a role list is not repeated in the synergy panel, so a committed card is marked in exactly
one place and no count is double-stated. **This handoff adds a state to that rule, not a new rule.**

### 6b. The mark is free to draw and it is **not** free to feed — R1 said otherwise

R1 claimed the flag "resolved in the same pass `page.tsx:36-40` already makes over deck membership".
**That is wrong in every clause.** The correction, because three frames, four panel legends,
`chipAria` and sentence 2's count all depend on it:

- That pass is over **role lists** — `Object.values(commander.roleCards).flat()` — and it supplies
  the synergy panel's exclusion set. It has nothing to do with decks.
- **The detail route never reads decks.** It imports `resolveCommanderSlug`, `getRankedList`,
  `scoreOneCommander` and `readSynergyCards`; there is no `loadAvailability` on this path.
- `scoreOneCommander` loads the collection pool and the EDHREC cache and nothing else.
- **Neither carrier has a slot for it.** `RoleCard` is `{ oracleId, name, inclusionPct }`; the
  synergy card carries `owned` alone.

So **README's "nothing added here makes a request" was false**, and the section was estimated against
the wrong cost. What the mark actually needs:

> **One aggregate over this user's deck membership** returning a set of oracle ids plus one deck name
> each, joined against ids the page already holds. One query, not one per chip. It does not touch
> `scoreOneCommander`. The same set answers all ten rendered surfaces **and** sentence 2's committed
> count — which is what keeps those two consistent (gap 7).

plus **one field on each of two carrier types**. That is a modest read and a real one, and it means
**the mark cannot ship in the same slice as the denominator, the key and the sort**, which need no
data change at all. The visual argument above is unaffected — the dot swap is still the right mark,
and it is still zero added width. Only the estimate and the sequencing change. READINESS items 1–2.

In the synergy panel the mark *completes* a set rather than adding to one — that panel already
draws a hollow dot for unowned, so the three states are filled / amber / hollow, all fill-or-stroke
on one circle.

### 7. §5.2 / #347 — **one sort control, four panels**

Four triggers is four times the chrome for one question, and the question is not per-role: a player
asking *what can I actually field* asks it of the whole role list. Four controls also make four
states to hold, and nobody wants ramp by rank and draw by availability.

It takes the heading row, right-aligned, at the discovery handoff's sort-trigger geometry (30px
`--surface-sunken` on `1px --border-strong`, caret in `--accent`; 38px full-width on phone). It
costs **one row**, and only because the sub-caption already occupied the other half of it.

### 7b. Two options, not three — R2's third named a field that does not exist

**`RoleCard` is `{ oracleId, name, inclusionPct }`. There is no rank.** And the shipped order
already *is* inclusion-descending: `score.ts:144` applies `byInclusionThenName` (`:89-96` —
inclusion desc, nulls last, then name) to every panel in which any card carries a figure. So R2's
*EDHREC rank* and *Inclusion figure* would have returned **the same array** whenever figures
existed — two rows, one behaviour, and a menu inviting the player to choose between them.

Worse in the other branch: when no card in a panel has a figure, `:144`'s guard deliberately leaves
the list in **pool order** (collection insertion order) precisely so an all-null panel is never
given an alphabetical ranking it did not earn. Labelling that "EDHREC rank" says the one thing the
shipped guard exists to avoid saying.

| Option | Sub-line | Note |
|---|---|---|
| **Most played** | Highest EDHREC inclusion first. The order that ships. | Default, always selectable. |
| — no figures | No EDHREC figures on this commander — the list is in collection order. | Same option; **the sub-line names the fallback** rather than the row being struck through. |
| **Availability** | Free to use first, then the ones already in a deck. | Needs slice B's committed flag. **Absent until then** — see below. |

**Availability is not drawn as disabled; it is not drawn at all until slice B lands.** An option
whose ordering key the page cannot compute is worse than an absent one, and unlike *Inclusion
figure* there is no honest reason-line for it that does not describe an unbuilt feature.

Which has a consequence worth stating: **in slice A the menu would have one option, so the control
does not ship in slice A.** It arrives with the mark. That is the second thing R2 drew as free that
is not.

**It stays a menu** — for the two sub-lines, not for a disabled row. Ruling 8's justification is
gone with the option that needed it, so **if eng prefers a segmented control once *Availability* is
the only addition, that is a reasonable trade** and the sub-lines move to the panel note.

**The real cost is the feature.** With caps of 12 desktop / 6 phone, a sort changes *which* cards
are visible — and *Availability* is precisely the sort that puts the usable cards in the visible
six. Counts, baselines and the score never move; nothing else on the page reads the sort. Section F
draws the same eleven ramp cards under both orders to make that concrete.

Section-level state, one value for four panels, **not URL-mirrored** — it is a reading preference
inside one section, and `?sort=` already means the ranking on `/commanders`. Expanded panels stay
expanded through a sort.

### 8. §5.3 — one string, two surfaces (summary; full contract in `PROSE-one-string-two-surfaces.md`)

**The home card prints sentence 1 and only sentence 1, clamped to two lines, from the same stored
string.** No second variant, no shortened form, no summary. Sentences 2–3 stay on the detail page:
the home card's completeness row already carries sentence 2's fact in figures, and a gap you cannot
act on from the dashboard is a worse sentence there than no sentence.

That makes the generator contract two rules, not one length:

- **A band** — one sentence, **110–160 characters**, hard cap 190 enforced at index build.
- **A front-loading rule** — **the claim lands inside the first 55 characters**, and everything
  after the first comma is elaboration that is safe to lose. The narrowest column (375px home card)
  shows **~58 characters** in two lines; no length reconciles 58 with 160, so the second rule is not
  a length. *(R1 measured that column at 233px and set the threshold at 70; the shipped column is
  ~183px once the dashboard padding, the 84px art column and the info area's padding come off 375 —
  corrected, and it is now the tightest constraint in the contract.)*

Both are checkable at generation time with no model in the loop (character count, sentence count,
comma position). **A string that fails is rejected, never truncated**, and that commander falls to
the prose-absent state — which is already drawn as normal.

Rejected: a short second string for the home card. It doubles the review surface, guarantees the
two drift, and turns one ~$5 re-backfill into two.

### 9. §7 — the stack holds, and the ledger says why

| Section | Ships (375px) | After | Δ |
|---|---|---|---|
| art header band | 236 | 236 | — |
| Fit Hero (+ key trigger, + rank line) | 214 | 293 | +79 |
| **Why this commander** | 0 | 148 | +148 |
| The Pool | 96 | 96 | — |
| Role Coverage heading (+ sort) | 48 | 96 | +48 |
| four role panels (+ legend ×4) | 1,004 | 1,068 | +64 |
| EDHREC Synergy (+ legend) | 648 | 664 | +16 |
| **scrolling body** | **2,246** | **2,601** | **+355** |

+16%, approximate, measured off the drawn frames at 375px with the mock figures. **The shape
matters more than the number: no addition is a container.** One paragraph, one trigger, one control
row, five ten-pixel legend lines that render only where needed. The key's open panel adds ~300px
more and is the only thing here that does — opt-in, once, and it collapses.

Three restructures were rejected, drawn in section G:

- **Tabs over the three evidence sections.** Tidy, and it breaks the page's argument: the hero
  claims a number and the sections are its evidence, so tabs make two-thirds of the evidence
  invisible at any moment — a player can never see that 60 of the 100 points came from one place.
  It also collides directly with the key, which teaches exactly that relationship, and adds a
  fourth navigation idiom to a page with a back link, disclosures and a facet strip.
- **The four role panels as an accordion.** The cheapest 750px available, and it costs the one
  comparison the section exists for: *which role am I thinnest in* is a question about four panels
  at once. Collapse three and the answer moves from a glance to four taps. The panels also already
  contain disclosures — `Show all 11` inside *Board Wipes, collapsed* is a disclosure inside a
  disclosure, and `aria-expanded` starts meaning two things.
- **Reordering so the acted-on sections lead.** Assumes something we do not know (which two a
  player acts on), breaks the committed table's section order for a hypothesis, and makes The Pool's
  explanatory sentence — the precedent §4.2 leans on — arrive after the sections it introduces. The
  need behind it is real and met by decision 5's anchor.

---

## Component notes

Hexes live only in `globals.css`. **No new token, no new hex, no new motion class, no new modal, no
new empty state, no new component** — one new *element*, the key panel, built from disclosure
furniture already on the page.

| Component | Spec |
|---|---|
| **Paragraph section** | Between Fit Hero and The Pool. `h2` Cinzel 600 20px `--fg`; body 13.5px / 1.6 / `max-width 640`, 8px below the heading — The Pool's paragraph spec exactly. Sentence 1 `--fg-body`; sentences 2–3 `--fg-muted`; figures `--fg` 600. Section gap 32px desktop / 16px phone, as shipped. |
| **— the anchor** | Sentence 3's clause only. `--accent` on `1px --accent-shadow` bottom rule (the shipped Retry ink). Plain `<a href="#{role}">`. |
| **— prose absent** | Heading + sentences 2–3. No note, no skeleton, no reserved height. |
| **— nothing to say** | Section unmounts. No heading, no gap. |
| **Home-card paragraph** | Between the name and the completeness row, `margin-top 10px`. 13px / 1.55 `--fg-muted`, `max-width 420` (the completeness row's cap), `-webkit-line-clamp: 2`. Prose absent → element unmounts; card is today's card. |
| **Segment legend** | Geometry unchanged: 24px gap, 10px swatch radius 3, 13px sans label, 12px mono figure. String becomes `{points}` `--fg` + `/{weight}` `--fg-faint`. |
| **Key trigger** | Desktop: 28px dashed `--border-strong` chip, `margin-left:auto` in the legend row, mono 11px `--accent`; 44px effective target via negative-margin padding. Phone: full-width 44px dashed row, mono 12px `--accent`. `aria-expanded` + `aria-controls`. |
| **Key panel** | Inside the hero, below the legend, above a `1px --border` rule at 14px. Desktop: three equal columns, 18px gap. Phone: stacked, 14px gap. Per definition: swatch + name (13.5px 600 `--fg`) + `{N} pts` (mono 10.5px `--fg-faint`, right) + body 12.5px / 1.55 `--fg-muted`. Closing line mono 11px `--fg-faint`. |
| **Score denominator** | `/40 measurable` in the `/100` slot, mono 16px `--fg-faint`. Figure unchanged: mono 600 52px `--fg`, `line-height .9`. Phone: the rank / best-fit clause drops to its own line at 6px. |
| **— absent note** | Shipped geometry (`--elevated-hover`, `1px --border-strong`, `border-left 2px --fg-faint`, radius 8, `⚠` `--fg-faint`, body 12.5px `--fg-muted`) plus one appended clause naming 40. |
| **— degraded note** | **The same shipped hero-note geometry as absent** (`detail.tsx:186-191` has one), plus one appended clause ending *until it returns*. **No Retry in the hero** — the page's only Retry stays at `coverage-section.tsx:411`. |
| **— deleted** | The `Synergy —` placeholder chip in the legend row. |
| **Committed chip** | `CoverageChip` unchanged except: dot fill `--success → --avail-hard-fg`, border `color-mix(--success 40%, --bg) → color-mix(--avail-hard 40%, --bg)`. Phone `CoverageRow`: same swap at 7px. Synergy row: same swap at 7px on the **owned** dot; the hollow-unowned dot keeps its shipped `1px` stroke and is not touched. |
| **Committed legend** | One line per panel, mono 10px `--fg-locked`, in `chipNoFigureLegend`'s slot and on the same visible-chip condition. **Both its figures count visible chips against `COVERAGE_CAP`** — `3 of the 12 shown`, never the role's 17, which would explain dots the cap is hiding. |
| **Anchor target** | `id` on the role `<section>`, `scroll-margin-top`, one-shot `:target` outline `1px --accent-dim`. |
| **Coverage sort trigger** | Desktop: heading row, right-aligned, 30px, `--surface-sunken` on `1px --border-strong`, radius 8, `padding 0 12px`, mono 12px `--fg`, caret `▾` `--accent`. Phone: 38px, full width, under the sub-caption; caret right. |
| **Coverage sort menu** | The discovery handoff's sort menu, verbatim: `--surface-rail` on `1px --border-strong`, radius 10, 6px pad, width 340px. Option 11/12px pad, radius 7, 6px diamond (filled `--accent` selected, `1.5px --border-strong` otherwise), label 13.5px 600, sub-line mono 10.5px `--fg-faint`. Selected row `--elevated-hover`. **Two options, no disabled row** — decision 7b. |

## Notes for engineering

- **`score.ts:172-184` loses the rescale.** `fitSynergy == null` returns the raw
  `pool + roles` sum and a `measurableTotal` of 40; otherwise the sum and 100. Both travel to the
  hero — **the denominator is data, not a render-time branch**, because the list needs it too
  (gap 1).
- **`fitSegments` gains each segment's weight** so the legend can print `12/15` without the hero
  re-deriving the weight table. **The three weights are inline literals**, not constants — `* 15`,
  `* 25` and `* 60` appear once each inside `scoreCommander` (`score.ts:179-181`). R2 called them
  constants. Naming them (`POOL_WEIGHT` / `ROLES_WEIGHT` / `SYNERGY_WEIGHT`) is part of this work,
  because the key prints them and `fitSegments` returns them, so three call sites would otherwise
  each carry their own copy of the number.
- **`segPct` is deleted.** It is the function #366 reports, and nothing replaces it.
- **`format.ts:27` changes.** `pct` becomes `100 * score / measurableTotal`; `fitSegments` takes the
  denominator. Without this the bar drops to 32% the moment the rescale goes — decision 3b.
- **Segment rounding changes and `commander_scores` needs a backfill** — decision 1b. Scores move by
  up to ±1.5.
- **The score is a sort key** (`recommend.ts:214`, `store.ts:182`). Deleting the rescale re-ranks the
  owned list and can change the home hero's first commander. **This needs a product decision before
  the estimate closes** — decision 3c.
- **The paragraph is a stored column on `commander_support`** — read with the commander, no fetch,
  no stream, no Suspense boundary. Versioned by a hash of its inputs plus a prompt version (§4.1);
  a `null` is the prose-absent state and needs no flag of its own.
- **The generator enforces the §5.3 contract at write time** and rejects rather than truncates. The
  three checks are character count, sentence count and first-comma position; see
  `PROSE-one-string-two-surfaces.md` for the exact predicates.
- **The templated clauses need two figures the page already has** (`edhrecOwnedCount`,
  `edhrecTotal`) plus **the weakest role** — `argmin` over `roleCounts[role] - ROLE_TARGETS[role]`,
  ties broken by `ROLE_ORDER`, no new query. **Sentence 2's committed count is the exception**: it
  comes from decision 6b's read, the same one the mark needs, which is deliberate — one source keeps
  the sentence and the dots from disagreeing.
- **Sentence 3 takes a subject-form role map, not `ROLE_NOUNS`.** `coverage-section.tsx:26-31` ships
  `ROLE_NOUNS` singular and attributive (`wipes: "board wipe"`) for "No board wipe cards in your
  pool"; dropped into this sentence it reads *"board wipe are where you are thinnest"*. The copy
  module adds `ROLE_SUBJECTS` and leaves the shipped map alone.
- **Prose figures spell out.** `committed` and the role `target` go through `spellOut`, not `n()` —
  "twelve of those", "a ten-source baseline". Labels and legends keep digits.
- **The committed flag is a boolean per card plus one deck name, and it needs a NEW read** — see
  decision 6b. One aggregate over deck membership per request, not one lookup per chip, and one added
  field on `RoleCard` and on the synergy card. `page.tsx:36-40` does not supply it; that pass is over
  role lists.
- **The accessible name gains a SUFFIX, not a replacement.** The shipped names are
  `recommendations.ts:32-35`: `View details for {name}. In {pct}% of decks.` / `… No EDHREC figure.`
  / `undefined` when `showFigures` is false (falling through to `cardDetailCopy.triggerAria`). R2
  misquoted the first as `Sol Ring, 94% inclusion` and supplied a whole-string replacement, which
  dropped the affordance clue and left the third branch uncovered. The correct change is
  ` Already in {deck}.` appended to whichever of the three the chip computed.
- **The deck name is the first deck**, not a list. A card in three decks reads *already in Grixis
  Reanimator* — severity, not inventory, the rule the availability receipt already follows. Same
  source as sentence 2's count, so the two cannot drift.
- **The coverage sort is a client-side reorder** of arrays already in the payload. `Most played` is
  the incoming order (no work — `score.ts:144` already sorted it, or deliberately did not);
  `Availability` sorts free-before-committed and falls back to that incoming order. **A sort never
  re-caps or re-counts** — `COVERAGE_CAP` (12 desktop / 6 phone, `coverage-chip.tsx:24`) slices
  after the sort, which is the whole point.
- **The key's open state is one boolean in `FitHero`**, which becomes a client component. It has no
  other client-side need, so this is the smallest possible conversion — and `FitHero` is already
  rendered twice (phone and desktop), so **the two instances hold independent state**, which is
  correct: only one is visible.
- **Live region:** `CoverageSection` gets **its own `aria-live="polite"` node**; there is no shared
  page region to borrow (`synergy-selection.tsx:222-243` owns its announcement and derives it wholly
  from pick state). One message, for the sort only. The key does not announce — its content is the
  panel it reveals, which `aria-controls` names.
- **Copy** lives in `src/lib/copy/` — see `commander-explained · copy strings.ts`. It adds an
  `explainedCopy` block, **edits two shipped strings** (`recommendationsCopy` synergy notes gain
  their appended clause) and deletes none.

## Gap report

1. **The owned list is now openly sorting across two scales, and nothing on it says so.** §4.3 names
   this consequence and leaves the row to another handoff. The right shape exists — the plane
   handoff's exclusion line — and the count is available (`n commanders scored out of 40`). **Not
   drawn here; it is the first follow-on.** A player comparing a 74 and a 32 in one list with no
   note is a smaller lie than the fabricated 100, but it is the same kind.
2. **The paragraph's third sentence names a role; the *page* does not rank the four gaps.** `argmin`
   over `count - target` is a reasonable weakest-role rule and it is not the same as *the gap that
   costs you the most*. Board wipes at 2/10 and ramp at 8/10 are both short by the same 2 in a
   different reading. If eng weights the gaps differently, **the sentence and the anchor point at a
   different panel than the section's own emphasis**, and this needs a ruling.
3. **`/40 measurable` has no answer for a future third denominator.** If any component ever becomes
   optional besides synergy, the string is still correct but the *word* stops being informative —
   two different `/40`s could mean different missing components. Fine today; worth knowing the
   string is doing the work of a set, not a number.
4. **The committed mark says nothing about how many copies you own.** A player with two Sol Rings,
   one committed, gets an amber dot and no way to know the second is free. The collection knows the
   quantity; the role panel does not print it, and this handoff does not add it. The honest read of
   the amber dot is *at least one copy is spent*.
5. **`--avail-hard-fg` equals `--accent` in exactly one theme, and the mark's clearance against
   `--success` is unmeasured.** R1 overstated the first and mis-stated the second. Against
   `globals.css`: the collision is **Innistrad alone** (`#8AAFA1` for both, which that handoff
   records as deliberate); New Phyrexia is not a case (`#77A9A0` dot, `#52827A` accent) and neither
   is Duskmourn (`#54ADDD` against `#49A9DC` — close, distinct). Innistrad is safe structurally
   rather than numerically: **nothing in a role panel or the synergy panel paints a dot or a chip
   border in `--accent`** — a fact about the current panels, not a contract, so a future
   accent-coloured element inside one would collide.
   The pair that matters is **`--avail-hard-fg` against `--success`**, which do sit side by side in
   one row. **R1's "ΔE 0.13" was wrong and argued against the mark** — a ΔE that small means
   indistinguishable. The tightest pair is Innistrad, `#8AAFA1` against `#679F5F`: separated in hue
   rather than lightness, which is the separation a 7px dot can least afford. **ΔE00 for all six
   pairs is owed, and Innistrad is the one that could fail.** If it does, the fix is a token, not a
   redraw — the legend carries the count in words and the accessible name states the deck, so the
   panel reads correctly either way.
6. **A prose length band cannot be enforced against meaning, and it does not even catch every
   back-loaded sentence.** The comma predicate passes a sentence that opens with a subordinate
   clause — *"Built around cheap draw, recursion and a graveyard nobody else is using, Kess decks win
   by casting the same spell three times"* has its first break at 23 and does not reach its claim until 73. Catching
   that needs syntax, not position; the prompt should require the sentence to open with its subject.
   Nor can any check catch a sentence that fits, front-loads, and says something trivially true of
   every commander (*"Kess decks tend to play good cards"*). Review before ship is §4.1 constraint
   1's mitigation, and ~3,300 paragraphs is a real review queue nobody has costed.
   **And 55 characters is a short leash** — about nine words at 375px, five of which go on setup. If
   the generator cannot reliably be commander-specific inside it, the honest answer is a shorter
   home-card treatment (one clamped line, or none), not a looser threshold. Worth reopening before
   the backfill runs, not after.
7. **Sentence 2's "already in" figure and the committed mark are the same fact, counted twice.**
   *Twelve of those are already in your Grixis Reanimator list* and twelve amber dots further down
   are consistent — but only if both count the same set. If the paragraph counts across all decks
   and the mark shows the first deck, a player counting dots gets a different twelve.
8. **The coverage sort is not persisted and the anchor is.** Arriving from the paragraph's link
   lands on a panel in whatever order the section last rendered — which for a first visit is EDHREC
   rank, so the anchor may land on a panel whose visible six are all committed. Availability-first
   *on arrival from the anchor* was considered and rejected as too clever; flagged instead.
9. **~$5 per re-backfill is cheap enough to iterate and expensive enough to notice.** §4.1 makes a
   prompt revision a deliberate act. Nothing in this handoff makes the prose *reviewable in place* —
   there is no admin surface, no per-commander flag, no way for Hugh to reject one paragraph without
   a regeneration. Out of scope, and it is the operational gap behind constraint 1.

10. **The ranking consequence of §4.3 is unresolved and it is not ours** — decision 3c, and it is
    the one item that could change what the app recommends rather than how it reads. Listed as a gap
    as well as a decision because if the answer is "keep the order", a `rankScore` appears in the
    estimate that no document currently carries.

11. **The rounding rule changes stored scores, and nothing here specifies the migration.** Decision
    1b makes the equation true by construction; it also moves every stored score by up to ±1.5 and
    can reorder ties. Whether that backfill runs with the index build or as a one-off is eng's, but
    **no document says which, and the two have different blast radii** against a list users have
    already seen.

12. **This handoff is now two slices and it is drawn as one.** The denominator, the key and the sort
    need no data change; the mark needs a new read and two carrier fields. The canvas does not
    separate them visually, and the committed dot appears in E, F and H frames as though it were
    contemporaneous with the rest. **Nothing here is wrong to build — it is wrong to estimate as one
    unit.** And the split is sharper than R2 thought: with *Availability* gone, slice A's menu would
    hold a single option, so **the whole sort control moves to slice B** (decision 7b).

## Files
- `The 99 - Commander Explained.dc.html` — the canvas (this handoff's deliverable).
- `README.md` — this file.
- `PROSE-one-string-two-surfaces.md` — §5.3's generator contract in full: the band, the
  front-loading rule, the predicates, and the measurements behind them.
- `STATES-key-denominator-committed.md` — the state matrix: hero × synergy state, prose × figures,
  the mark across five panels, and the sort's availability.
- `commander-explained · copy strings.ts` — the copy block, production-final.
- `READINESS.md` — self-assessed readiness and what blocks a green.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
