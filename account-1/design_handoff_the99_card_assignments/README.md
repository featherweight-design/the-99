# The 99 — Assigning a contested copy (design handoff, R2)

**Gates PRs 3 and 4** of `docs/superpowers/specs/2026-09-14-card-assignments-design.md`
(read at `main`, commit-of-record `b734d741bb5f`). Also read: `src/lib/copy/availability.ts`,
`src/components/ui/availability-marker.tsx`, `src/lib/copy/deck-versioning.ts` §review.
Voice: Kitchen Table.

Canvas: `The 99 - Card Assignments (R2).dc.html`. R1 is kept for the diff.

> **R1 was drawn without the spec.** It is in the repo, not in this project's tree, and R1 said so
> and proceeded anyway. That was the wrong call — nine things changed on reading it, one of them a
> whole deleted frame. **Do not read R1 as a design record; read it as the diff.**

---

## The primary design call (survives from R1, and the spec asks for it)

> "The two verbs must read as different things: `Pull it` takes the card out of the other deck's
> sleeves and cuts them a version, while claiming says the copy is this deck's and leaves the other
> list alone. **Distinguishing them is copy on a new surface, and therefore a Design call.**"

| | `Pull it` (shipped) | Giving a new copy (this handoff) |
|---|---|---|
| What moves | the card, out of another deck's list | one `card_assignments` reservation |
| The other deck | **list changes, new version cut** | list and version untouched; **it still bills the purchase** |
| Reversible | no, except by rebuilding that deck | **yes, same tap** |
| Shape | one bordered button on a row | a list of decks, no button |

**The new action gets no verb-button.** Anything shaped like `Pull it` and sitting beside it will
be read as its sibling. Instead **the deck names are the control** — one option per committed
claimant, each stating what it gets, under a heading that carries the verb (`Give the new copy to`).
A chooser cannot be mistaken for a button that takes something away.

**The trade is drawn, not implied.** A pick always has a loser and the row names it: the displaced
deck's outcome flips from `gets it` to `buys it · $32.90` on the same tap. This is the spec's
*"it still bills the purchase"* rendered on screen. A chooser that lit up only the winner would be
the same silence the ticket is about.

---

## Vocabulary rulings

1. **The word `claim` appears in no string.** It is engineering's word (`revalidateClaims`,
   `senior_hard`) and in a player's ear it is adversarial — it sounds like taking a card off
   somebody, which is what `Pull it` does and this does not. Rejected with it: `Take it` (a pull,
   harder), `Reserve` / `Assign` (clerical), `Mine` (every card is yours — the app's premise).
2. **No sentence says where a card physically is.** `availability.ts`: *"we describe LISTS, never
   boxes, binders or sleeves."* R1's `cards in the box` heading is out — it reads `in your
   collection` — and nothing here is *sleeved*, *cardboard*, or *in the shop*. ⚠ **Conflict
   flagged:** the shipped `review.bucketFreeNote` says *"in the box already"*, so the rule is
   already broken once on a neighbouring surface.
3. **`spoken for` is retired from this feature.** `spokenForTwice` ships on two surfaces and means
   **over-committed**. R1's `The copy is spoken for` heading would have made one phrase mean two
   things one route apart. It reads `Nothing to choose here`.
4. **`holds` / `wants` considered and rejected.** `detailClaimHolds` / `detailClaimWants` carry the
   app's model in two verbs — *finished lists hold, unfinished lists want*. Borrowing them for
   allocation would make `wants it` mean *committed but lost the copy* on this row and *not
   committed at all* on the next. **Allocation is a third axis and gets a third pair:** `gets it`
   and `buys it`.
5. **One word is borrowed deliberately:** `still short`, from `marker.over`'s `short N`. A contested
   arrival **is** the over state, so section heading and marker say the same thing about the same
   card.
6. **And one register:** `detailOverNote`'s *"Nothing's broken. It's a shopping decision."* The
   contested section closes on *"It's a shopping decision — and this is where you say whose."*

---

## What reading the spec changed

| # | Change |
|---|---|
| 1 | **R1's frame 6 deleted.** It argued the brief's *"the other deck's buy state is untouched"* could not be true. The spec agrees with the drawing and never made the claim: *"The losing deck does not change. Its committed version still lists the card, **it still bills the purchase**, and no new version is cut."* R1 spent a frame arguing with a paraphrase. |
| 2 | **A third money section.** The diff classifies each `(deckId, oracleId)` pair as **gone, reduced, or raised/new**. R1 had no home for *reduced* → new `Partly covered` section. |
| 3 | **Two demands, one card.** Money reads **draft** demand (`loadDeckBuyRows`, live `deck_cards`); contention reads **committed** claims (`loadAvailability`, version-shaped). *"The two figures can legitimately disagree about a card, and the summary's copy must not imply otherwise."* New frame 6. |
| 4 | **Four refusal causes, three drawable** — added *the card is that deck's own commander*, which R1 ruled unreachable. A stale payload reaches it. |
| 5 | **Commander *and* list copy on one row.** A folded claim is part commander, part list card; only the commander half is protected. R1's "the whole row goes inert" would have hidden a legal choice. |
| 6 | **Brews claim and cannot be listed.** Assignments are refused for decks with no committed version, so the supply line counts **committed decks** and a footnote names the brew. |
| 7 | **The second door is two surfaces** — `/decks/[id]/changes` **and the deck page marker**. R1 drew one. |
| 8 | **`in the box` and `spoken for` retired** (vocabulary rulings 2 and 3). |
| 9 | **`holds`/`wants` considered and rejected** (ruling 4). |

**Carried from R1 unchanged:** no verb-button · deck names are the control · no `claim` in any
string · **nothing is brass** while the default stands · two ways back · optimistic on success,
authoritative on refusal · the summary renders for an empty result · commit order, never re-sorted,
own deck never promoted · the contested section never truncates · no motion.

---

## Decisions log

### 1. Three sections, decision last, and **no prices at all**

The diff classifies each pair three ways — gone, reduced, raised — but **without prices, *reduced*
and *raised* tell a player the same thing: this deck still has to buy this card.** So the UI groups
by what the player must do, and keeps the classification as a quiet reason on the row
(`1 of 2 arrived` / `not in the new list`). **Three headings for two outcomes was the arithmetic
showing through the interface.**

1. `No longer to buy · 14` — arrived, purchase cleared.
2. `Still to buy · 8` — partly arrived *or* gone from the collection; either way, still owed.
3. `Still short · 3` — the decision.

**No prices and no totals anywhere on this page.** A cleared purchase has no honest figure — the app
cannot know what was paid, or whether anything was, since a card can arrive from a booster, a trade
or a gift. And a figure for what is *still* owed is real but **not actionable here**: this is a
receipt, and the place to act on a price is the deck's Shopping list, which the note points at.

**Dropping the totals fixed a defect rather than only simplifying.** A right-aligned figure on a
heading rule, directly under the previous section's last row, **reads as that list's bottom total**
— found in review on the seam where the upper list had no `Show all` row between them. Spacing
reduced it; having nothing to misread removes it.

### 2. The lede says what the page is for, and the default rule is stated once

**The lede was explaining the implementation.** *"No deck's list was edited and no version was cut"*
is true and is not a fact a player needs — nobody suspected their decks had been rewritten until we
said so. It now says what the page is doing: **"Here's what your decks still need after the update —
and, where one copy has to cover two decks, which one gets it."**

**The default rule gets one sentence, in the section that holds the decision:** *"More decks need
these than copies arrived. The deck that committed the card first gets it, unless you say
otherwise."* That is the only place it is explained, and **"unless you say otherwise" is the whole
licence to change it** — without that clause the rule reads as policy.

⚠ **"committed the card first", not "the oldest deck".** The ordering is `deck_version_cards.since`
**per card**, so a newer deck can outrank an older one on a card it sleeved earlier. *Oldest deck* is
a different and wrong rule.

### 2b. The copy survives the draft/committed disagreement — four rules
1. Money sections say `to buy`; the contested section says `committed`. **No section says both.**
2. No section is described as a subset of another, and none claims to be exhaustive.
3. Where a card *does* appear in both, the contested row says so — **the one cross-reference on the
   page.** Silence there is what would look like a bug.
4. The header's money clause is scoped to decks, never a total or a count of cards — the two reads
   would each produce a different one.

### 3. The mark is what makes the row a chooser — and it states allocation, not authorship

**A defect found in review.** Taking the button away kept the chooser from reading as a sibling of
`Pull it`, and left a list of decks with outcomes beside them — which reads as a **table**. Nothing
said *tap me*.

The fix is an adoption, not an invention. `filter-panel.tsx` ships the single-select row and rules
on it: *"Round for single-select: the shape is the affordance, and a square tick on a one-of-many
list promises you can have two."* Geometry unchanged — 16px desktop / 18px phone, gap 11/12, 1px
ring, inner dot 6/7px.

**Four states, and the split is the design:**

| State | Mark |
|---|---|
| Has a copy, by default | **filled, neutral** (`--fg-body`) |
| Has a copy because you picked it | **filled, `--accent`** |
| No copy | **empty ring** (`--fg-faint`) |
| Inert (a commander's copy) | filled, dimmed, on a dashed row + `commander` plate |

**The mark states allocation; `--accent` and the footer sentence state authorship.** That is what
lets the group have a current value without making seniority look like a preference the player
expressed — nothing is accent until a pick.

### 3c. The `your call` plate is withdrawn — asked in review, and it does not earn its place

**The question was: under what situation wouldn't it be the user's call?** Answer: the default —
seniority allocated the copies before the player touched anything. That distinction is real. **But
it is an argument for distinguishing chosen from default, not for a chip.**

A picked row carried **five** signals for one bit of state: accent border, accent mark fill, the
plate, the footer sentence, and `Back to first committed`. **The plate was the weakest of the five.**
Its stated job was *words, never colour alone* — but **the footer sentence already is that word
carrier, and a better one: it names the deck.** The plate said *something here was chosen*; the
sentence says *you chose Kinnan Ramp*.

It also cost width where there was least: a `flex:none` plate ate the deck name's share in the 345px
deck-page panel, competing with `this deck`.

**The trade, and it is not free: the footer is required wherever the chooser appears** — all three
surfaces, both doors in frame 7, and the 390px frame (where the sentence takes its own line above
the link rather than sharing a `space-between` row). Dropping the plate without that would have left
authorship on **hue alone** — the rule this feature will not break. **Four carriers, one of them
words, on every surface.**

**One exception, and it is a ruling rather than an omission: a refusal note supersedes the footer.**
In refusal (b) the holder has that copy *because the player picked it* — which is why the second pick
had nothing left to reserve — so the rule would give it an undo hint. It doesn't, because the refusal
already says it better: *"Take it off Atraxa Counters first"* names the deck and the way back in one
sentence. **Authorship is still carried in words, which is the rule's actual requirement**, and
stacking a second instruction under a refusal would put two competing ones on one row.

A bonus: it simplifies the accessible model. `aria-checked` already means *you chose this*, and an
unchecked option with a filled mark means *it holds a copy by default* — so the two facts map onto
native radio state with nothing bolted on.

**More than one mark can be filled and only one can be brass.** Two copies and three decks means two
allocated; a pick reserves **one** copy for one deck. So `aria-checked` is true for the brass option
only, the neutral fills are `aria-hidden`, and each option's outcome carries the allocation into its
accessible name.

⚠ **One deliberate divergence, and it is a contrast one.** The shipped empty ring is
`--border-dashed`, under 1.5:1 on a row ground — defensible inside a dialog the player has just
opened, but this chooser sits inline on a page of receipts where the mark is the only thing inviting
a tap. The ring takes **`--fg-faint`** — 4.72:1 in Low Sun, and a text-ramp token that clears the
floor **in all six themes by construction**, so nothing is minted and nothing needs per-theme
tuning. The divergence is from one token to another, not from the palette (decision 13).

### 3b. The shape follows the cap — round at one copy, square above it

Asked in review, and the answer reverses what R2 first ruled.

**One copy is a one-of-many**, so the mark is **round** and ticking a second deck moves the first.
**Two copies means a player really can give two decks a copy**, so the mark is **square** and the
heading carries the limit: `2 of 2 given`. That is `filter-panel.tsx`'s own logic rather than a
departure from it — the component carries both modes and chooses by `selectionMode`. Its ruling is
that a square tick *promises you can have two*; above one copy, **you can**.

**R2 first ruled it round everywhere and wrote down the condition that would void it** — *"if a
player is ever allowed to allocate several copies across decks in one gesture"*. **Two copies
arriving at once is that gesture**, and the model always supported it: `card_assignments` is one row
per deck, so N copies is N reservations of one copy each. **The cap is what keeps the square tick
honest** — unlimited, it would promise three.

**And no stepper, because no deck is ever given two.** A deck wanting three lands takes one tick
like every other claimant — **the chooser allocates copies across decks, never within one.** That is
what keeps the row free of quantities, and why `gets 1 of 2` is gone.

### 4. Two ways back, because a toggle is not discoverable
`Tap Lotleth Aggro again to undo this.` teaches it; `Back to first committed` does it without
needing to be taught. Clearing is a **delete**, and a cleared row must be indistinguishable from
one never touched.

### 5. The commander guard is per copy, never per row
The spec: *"a chooser that renders a commander holder as unpickable protects the screen and not the
arithmetic."* Phase 1 takes commander copies off the top, so the drawing agrees with a number that
was already true. **A folded claim renders inert for its commander half and live for the rest** —
`keeps 1 · gets 1 more`, with the heading narrowing to `Give the spare copy to`. The row goes inert
only when no option can be chosen at all, and only then does the heading stop asking
(`Nothing to choose here`).

No "you could pull it instead" route: `Pull it` refuses a commander too, and lifting that belongs
to #470. **A route that cannot help is worse than an absent one.**

### 6. Refusals: three drawn, one not
Every refusal sentence does four things in order — names deck and card, gives the cause, says
**nothing moved**, states what is true now. The spec's reason for the third clause is the row's own:
*"the row's default allocation is still the truth and the player needs to know their pick did not
take."*

- **(a) the deck no longer asks** — that option is gone, counts corrected, no way forward offered
  (the row is about to disappear).
- **(b) nothing left to reserve** — allocation redrawn; names the one way forward, which is **not a
  retry**: reservations resolve on `(created_at, deck_id)`, so tapping again cannot win. *"Take it
  off Atraxa Counters first."*
- **(c) the card is that deck's own commander** — the row redraws as the inert state *and* says why.
- **(d) the deck is not this user's** — **not drawn.** A player cannot reach it from their own
  decks; drawing a state for a request they cannot make would be drawing an attack. Falls back to
  the transport treatment.

The row redraws from the refusal's own fresh state — the write already re-reads ownership, the
committed claim and the supply in one transaction, so the response can carry all three. **One round
trip.** The message persists until the row changes or the page reloads; no toast, no timeout.

### 7. The summary renders even when all four sections are empty
Skipping to `/collection` makes the app's most destructive action the only one with no receipt, and
makes the flow's ending depend on data the player cannot see. A player who typed `REPLACE` is owed
a sentence. It still states the file delta (`12 cards differ`) so "nothing moved" reads as a fact
about decks. **It is also the state a broken idempotency lands on** — the spec's `confirmUpload`
short-circuit returns the *stored* summary; if a player sees this after a real import, that broke.

### 8. Nothing on the summary needs saving, and it says so
Every pick writes immediately; `Done` is a route. A page of consequences must not look like a form.
The money sections are the frozen payload; **only the contested section is live, and a pick must not
move a figure above it.**

### 9. The second door: the chooser is never in a decklist row, and the deck page takes the compact option
On `/changes` the row keeps name + one availability slot + `Pull it`; **the chooser hangs below as a
panel** with the app's brass-violet left rule. Two geometries, two meanings; the card-row floor is
held rather than bent. The caption `no list changes` is the one place the distinction is spelt out
on these surfaces — a caption, not a warning, because giving is the safe action.

**The deck page's panel takes the two-line option at every width, and that is a ruling rather than a
fallback.** It hangs inside the decklist column at **345px — within a hair of the phone option's own
336px** — and a one-line option there spends 274px on mark, stamp and outcome, plus 33px of gaps and
20px of padding, leaving the deck name **18px**. So the name takes its own line and the stamp joins the outcome beneath it: **one compact
form, used wherever the column is narrow rather than wherever the window is.** The `this deck` tag
becomes a plate sharing the name's line as a `flex:none` sibling, so the ellipsis can only ever eat
the deck name — the marker's own split, and the reason it has one.

### 10. On the deck page, the marker is the trigger ⚠
`marker.overAlsoIn` already renders `short 1, also in Sidisi Graveyard` on a deck's own list — the
shortage and who has it. A contested arrival is exactly that state, so the row needs no new label
and no new slot, and **only the over state is ever a trigger** (`free` renders nothing;
`soft`/`hard` have nothing to allocate). Closed by default, one open at a time, never reflows the
list.

**This contradicts a shipped ruling and needs ratifying.** `availability-marker.tsx` is emphatic
that the marker *"has no hover, no focus ring and is never a tap target"*. It is the one shipped
component R2 asks to change. The alternative — a second control beside the marker — is what the
card-row floor exists to refuse.

### 11. `this deck` is named, never promoted
It sits in commit order with the rest. **The order is the explanation of the default**; promoting
your own deck would hide why it lost.

### 12. Order never changes on a pick
Oldest commit first, always. A list that re-sorts under a finger turns a correction into a second
mistake.

### 13. Six themes, no per-theme variant — and two themes that make one rule load-bearing

Frame 9 draws the **after-a-pick** row in all six `[data-theme]` blocks, from real tokens.

**Every mark value is a token, so the mark themes for free** — neutral fill `--fg-body`, picked fill
`--accent`, empty ring `--fg-faint`, inert fill `--fg-faint` on a dashed row, dot always `--bg`.
Nothing in the feature needs a per-theme variant: no geometry changes and no state is drawn
differently.

**Two themes turn *words, never colour alone* from a floor into the thing holding the row up.** In
Canopy the accent (`#A3C445`) and `--success` (`#6FA368`) are both greens, so the picked fill and
the `gets it` word land in the same hue family. In Low Sun the accent (`#CF8745`) and `--warning`
(`#DEAA29`) are a hue apart — the only theme whose warning is not `#E0913C`. **On those two, hue
cannot tell a pick from an outcome; the `your call` word can.**

Oil Haze is the quietest pick (low-chroma teal), so the plate does most of the work there. First
Frost has the narrowest ink ramp, so the mark carries more of the row's structure.

**The one thing to re-measure after any surface change** is the empty ring against `--surface` —
`globals.css` records that the text ramp holds almost no headroom in any theme.

### 15. The seam with the shipped replace flow — and the defect it found

**The summary does not replace `ReviewScreen`, and the two are on opposite sides of the destructive
action.** `ReviewScreen` is step 2: it reports **problems with the file** (`unmatched names` in
`--warning`, `parse errors` in `--danger`, `IssueInspector` behind them) while the player can still
walk away. The summary is what `confirmUpload` lands on: it reports **consequences for decks**, and
by then the decision is made. **The only shipped line it replaces is `replace-flow.tsx:39`'s
`router.push("/collection")`.**

**But an unmatched name is a card that did not arrive** — so a deck listing it keeps billing it and
it lands in `Still to buy` like any other. The reason clause said `not in the new list`, which is
true of the *parsed* list and **misleading about why**. The two cases have different remedies: a card
you genuinely don't own, buy it; a card whose CSV line didn't match, **fix the file — you already own
it.** Collapsing them sends a player shopping for a card in their own box, which is **this ticket's
silent consequence one step upstream.**

So:

1. **A third reason clause** — `name didn't match`, in `--warning` rather than the neutral ink the
   other two take, because it is the one reason a player can still act on. Parse errors get their
   own clause on the same rule.
2. **One line under the header** carrying the counts, the consequence for decks, and a route back to
   the file. **Absent when the upload was clean**, like every other section.
3. **The summary names counts and never re-lists issues.** `IssueInspector` is a tabbed, searchable,
   virtualised surface built for that reading, and it already did the job at the moment it could
   still change the decision. Re-listing after the confirm is a second copy, not a second chance.
4. **The line reads *you saw them before you confirmed*, on purpose** — the summary must not imply
   the app has just discovered something, or a clean replace reads as a failed one.

⚠ **To ratify:** the route back needs `IssueInspector` reachable **after** the confirm. The rows live
on `csv_uploads`, which the spec is already adding `summary_payload` to, so the data is there — but
nothing reads it post-confirm today. **If that is more than PR 3 can carry, the line keeps its
counts and drops its link.**

### ⚠ 14. This canvas is drawn on the retired brass

Frames 1–8 use `#C9A24B` throughout. **Low Sun's real accent is `#CF8745`** and its `--bg` is
`#14110E`, not `#100D0A`. That is **inherited, not new** — it arrives with this folder's brand
sheet, and the same rebase is already filed against `design_handoff_the99_appshell`. **Build from
frame 9 and `globals.css`, never from the hexes in frames 1–8.** Nothing in the feature's reasoning
depends on which accent is in force: every ruling is about *which token*, not which hue.

---

## Frames delivered

| # | Frame | Desktop | Phone |
|---|---|---|---|
| 1 | The two actions + four vocabulary rulings, and **1b · the mark** | ✓ | — |
| 2 | Summary, four sections | ✓ | — |
| 3 | Summary — no contention · nothing to report | ✓ | — |
| 4 | Summary at 390 (incl. a row mid-choice) | — | ✓ |
| 5 | Contested row: default · after a pick · commander holds the only copy · commander + list copy · three refusals | ✓ | ✓ (in 4) |
| 6 | Two demands, one card | ✓ | — |
| 7 | The second door — `/changes` and the deck page marker | ✓ | — |
| 8 | The seam with the shipped replace flow | ✓ | — |
| 9 | The picked row in **all six themes**, from `globals.css` | ✓ | — |
| 10 | The contract | ✓ | — |

## Component notes

| Component | Spec |
|---|---|
| **`ContestedCardRow`** | Card name 13.5/600 + mono supply line (`1 copy arrived · 2 committed decks`), brass uppercase heading, one option per **committed** claimant. Each option leads with the **round single-select mark** (decision 3). `role=radiogroup` labelled by the heading. 44px desktop / **52px two-line phone**. **The selected option is also the clear control.** Identical on all three surfaces. |
| **The mark** | `filter-panel.tsx`'s single-select mark, geometry unchanged: 16px desktop / 18px phone, gap 11/12, 1px ring, inner dot 6/7px. Four states per decision 3, **all token-only**: neutral fill `--fg-body`, picked fill `--accent`, empty ring `--fg-faint`, inert fill `--fg-faint` on a dashed row, dot always `--bg`. No mark value is a literal, so it themes for free. |
| **Compact option** | The two-line 52px form: mark 18px, name over outcome, stamp on the outcome line, `this deck` as a `flex:none` plate on the name line. **Used at 390px *and* in the deck-page panel at any width** — the trigger is the column, not the viewport. |
| **Outcome words** | Mono 11px, word before hue, **three forms**: `gets it` · `buys it` · `keeps it`. **No quantities and no prices.** |
| **Supply line** | `1 new copy · 2 decks need it` / `2 new copies · 3 decks need it`. No quantity arithmetic — a deck that wants three lands still reads as one claimant. |
| **The footer** | One sentence naming the chosen deck (`Tap Kinnan Ramp again to undo this.`) + `Back to first committed`, a borderless accent link at 34px with a 44px target. **Both exist only while a pick is live, and the footer is required on every surface the chooser appears on** — it is the feature's only non-colour carrier of authorship. |
| **Refusal note** | In-row, `--danger` left rule on `#1A1310`, full-opacity ink, no icon, no dismiss, no retry button. One shape, three causes. |
| **`Still to buy`** | Amber dot, deck name, and a reason clause (`1 of 2 arrived` / `not in the new list`) — the only place the diff's third class survives. **No price.** |
| **`still short` chip** | Added to the shipped `/changes` count strip beside `can be pulled`. |
| **Marker disclosure** | Over state only, on a deck's own list, **drawn exactly as `OverGlyph` ships** — two 6px `--danger` diamonds overlapping by 1px, the front one with a 1px left border in the colour behind the marker, label `--avail-over-fg` (`#E9917A`). The doubling is semantic (*"two lists want the one you have"*). **No accent is spent.** ⚠ Needs the ruling in decision 10. |

## Notes for engineering

- **Committed claimants only** — `loadAvailability`'s `claims` filtered to `mature`. A brew is never
  a pickable option; the supply line counts the options drawn and the footnote carries the brew.
- **The commander guard reads `claims[].commander`, per copy** — inert for the commander half, live
  for the rest. Phase 1 of the supply model is the authority; the drawing follows it.
- **Refusals must be named** — three drawable causes. A single generic failure collapses them into
  the transport treatment and *"reported on the row rather than swallowed"* goes unmet.
- **A refusal response carries the row's fresh state** from the transaction that refused. One round
  trip.
- **Optimistic on success, authoritative on refusal.** The displaced deck's outcome is computed
  client-side on the optimistic hop or the trade lags the tap.
- **Picking the held deck deletes the row**, not writes "first committed" as a choice.
- **The per-option date is `deck_version_cards.since`, per card** — not the version's own date. If
  the drawn date and the ordering can disagree, drop the date.
- **The money sections are the stored `summary_payload` and must not drift.**
- **Every pick revalidates every claimant's `/decks/[id]` and `/changes` in pattern form.**
- **Two live-region messages, never more:** one per settled pick, naming both sides
  (`Lotleth Aggro gets Fauna Shaman. Sidisi Graveyard buys it, $32.90.`), one per refusal, verbatim.
  **No motion anywhere.**
- **Focus:** after a pick, the option tapped; after a refusal, the message; on the deck page, the
  marker trigger.

## Open questions (both need a ruling before PR 4)

1. **The marker becomes a tap target** — decision 10. The only shipped ruling R2 contradicts.
2. **"in the box"** — `availability.ts` bans asserting physical location; `review.bucketFreeNote`
   does it. R2 obeys the ban and flags the conflict.

## Gap report

1. **No bulk allocation.** Ten contested cards is ten choices. Correct first shipment, obvious
   second want.
2. **The contested section has no windowing.** Money sections truncate at four; this one never does.
3. **No surface shows a reservation at rest.** Assignments are inert without a shortage, so a player
   cannot review past picks — consistent with the spec's no-expiry, but *"a row nobody can see is
   worse than no row"* is the spec's own worry.
4. **`review.lede` is now wrong by two** on `/changes` — *"nothing here is a decision except the
   pulls"* omits the puts-back (#390) and the gives. Flagged, not edited.
5. **Two players, one collection** is out of scope; refusal (b) is where it would show.

## Files
- `The 99 - Card Assignments (R2).dc.html` — the canvas. **Start here.**
- `The 99 - Card Assignments (R1).dc.html` — kept for the diff. Drawn without the spec.
- `README.md` · `STATES-assignments.md` · `card-assignments · copy strings.ts` · `READINESS.md`
- `brand/` — the locked brand sheet, copied in for self-containment.
