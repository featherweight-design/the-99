# Amendment 5 — Shopping reads availability (#281)

`design/design_handoff_the99_amendments/` · 2026-09-05 · **R1, new files only.**

Extends the four-amendment package with a fifth. **Nothing in R1–R3 is reopened**, no existing
file in this folder is edited, and no string in a shipped copy module is rewritten. Read
alongside `design_handoff_the99_availability/ADDENDUM-2-README.md` §6 and its R5 correction —
that rule is the whole reason this amendment is a read rather than a computation.

Canvas: `The 99 - Shopping Availability (R1).dc.html` · states:
`STATES-shopping-availability.md` · copy: `shopping-availability · copy strings.ts`.

**Verdict: 🟢 Green on the three open calls. One item for eng that is not a call** (the spent
slot, decision 7) and **one string this amendment cannot own** (the export dialog's Shopping
tab, decision 8).

---

## The defect, in one line

`decklist.tsx:118` builds the Shopping list as `cards.filter(c => !c.owned && !isBasicLand(...))`,
and `grouping.ts:100` builds its count as `built − ownedCount`. **Both ask "do you own one?"
when the question is "have you got one to spare?"** — so a card whose single copy is sleeved
into a finished deck is hidden from the shopping list of the deck that also wants it. The
availability map already answers the real question, per card, on this very list.

**What this amendment costs: one filter predicate, one group, one tag word, three count strings.**
No query, no prop threading, no new token, no new component. `DeckDetailCard.availability` is
already on every row (`grouping.ts:36`) and `decklist-row.tsx:129` already derives the state from
it with `selfExcluded: true`.

> **The constraint, restated as the headline it is owed** (Addendum 2 §6 / R5 §6):
> **never recompute `free` from `owned − hard`.** That formula is the *off-decklist* case. On a
> deck's own list, `free = (owned − ownClaim) − (hard − ownHardClaim)` — the query computes it
> from the vantage it was given, and Shopping is standing inside the deck. Read `availability.free`
> and pass it to `availabilityState(a, { selfExcluded: true })`, which is what the row beside it
> already does.

---

## The three calls

### 1 · Does a "you own it, but not spare" card enter Shopping? → **Yes, and exactly one state does.**

**The system already calls it a shopping decision, in its own copy.**
`availabilityCopy.deckSummary.body` ends *"Nothing's broken here — it's a shopping decision."*
A surface named Shopping that omits the cards the copy sends there is the contradiction, not the
inclusion.

**One state enters and the other two cannot**, which is what keeps this from being a widening:

| state on this deck's list | enters Shopping | why |
|---|---|---|
| `free` | no | nothing wanted, nothing to buy |
| `soft` — `1 in a brew` | **no** | *"Nothing to sort out yet — none of those lists is finished either. Whichever you sleeve first gets them."* A purchase is not the resolution; sleeving is. Buying here would sell a card against a conflict that may never happen. |
| `hard` — `none free` | **unreachable** | Addendum 2 §6: inside a deck's own list a second finished claim on one copy *is* over-commitment. `free === 0` from a self-excluded vantage means "exactly enough for everyone, including this deck" — and R5 §2 notes that `none free` there would not merely be quiet, it would be **false**. |
| `over` — `short 1 — also in Atraxa` | **yes** | Finished lists want more copies than exist. The only ways out are buy one, or cut one. The first is Shopping's whole subject. |

So the amendment is **one predicate**: `!c.owned || availabilityState(c.availability, { selfExcluded: true }) === "over"`,
with basics excluded exactly as today.

**The two halves cannot overlap, by construction.** `availabilityState`'s first guard is
`owned <= 0 → free` (availability.ts:74), so an unowned card can never be `over`. The guard that
keeps the marker off cards you don't own is the same guard that keeps the new group disjoint from
the old ones — no de-duplication anywhere.

### 2 · How does the row read against a card you simply don't own? → **Same row, one word different, in a group of its own.**

**Same row shape.** The shipped 52px-phone / 34px-desktop Shopping row, the same EDHREC meta line,
the same `✕`. Nothing about the *purchase* is different: you are going to a shop for one card.

**Three things already distinguish it and they were all built by #43:** the ownership dot is
**solid green — it must not lie, you do own this card**; the availability marker renders in
`--avail-over-fg`; and the row carries the shipped over tint
(`inset 0 0 0 1px var(--avail-over-border)`, `decklist-row.tsx:170`). **The loudest row treatment
in the app already means exactly this**, so the distinction costs zero new visual language.

**A Shopping row is a `nameless` host — the marker is count-only here.** It reads a bare
`short 1`, not `short 1 — also in Atraxa`. The clause's prefix is ~120px and never truncates by
contract (`availability-marker.tsx`: *"the floor is what keeps 'truncates' from meaning
'vanishes'"*), and this row also carries the EDHREC figure, the tag and a 44px `✕` — at 390px, and
inside the 2-up desktop grid, there is no width left for a name that would still read as a name.
So the surface takes the `nameless` flag the component already ships for `/collection` and every
chip, and `markerAria` drops to `overAriaCountOnly` so both halves agree — Addendum 2 §3's rule
applied to a second surface rather than a new one. **The name is not lost:** the All-view row one
tab away states it, and the summary band above names the claiming lists.

**One word changes: the tag.** `buy` becomes **`2nd copy`** — same `BuyTag` geometry, same amber
plate, because the act is the same kind of act and the severity is already carried by the marker
a few pixels to its left. Two tag skins in one list would say "different urgency" about two rows
that want the same trip.

**And the rows sit in their own group, pinned last.** Not mixed into the role groups — see the
knock-on below, which is what decides it. Header: `SPOKEN FOR · 2 · already in the deck`, using
the shipped Shopping-group header style (mono 10px `--accent` label, mono 10px `--fg-faint`
clause) with the clause slot carrying **why this group closes nothing** instead of arithmetic it
cannot honour.

### 3 · Is the over-committed summary redundant now? → **No. It is the index, and it gains one link.**

Three reasons it survives the rows appearing:

- **It is the only thing that names *which* card and *why*.** `deckSummary.body` says *"Arcane
  Signet is on 2 finished lists and you own one."* The rows say `short 1 — also in Atraxa`, one
  per row, with no aggregate. A list is not a sentence.
- **The rows are behind a filter the player may never open.** `All` is the default. A summary
  that only repeats what the Shopping tab shows would be redundant; a summary that *sends* the
  player to the Shopping tab is the reason the tab gets opened at all.
- **Its other home has no Shopping to be redundant with.** The deck card on `/decks` is outside
  the builder entirely. **It gains nothing and changes in no way.**

**So: one text link, in the builder's over band only.** `See them in Shopping` — accent, mono,
trailing the body on desktop, its own line under the body at 390px. It flips the decklist's
filter (client state, no `?filter=` param, matching `GroupToggle`'s URL-free locality) and
**does not scroll**: the list is directly below the band, and the `Shopping N` pill going active
is the receipt. The band stays a static `<section>` — no live region, no alert, no dismiss, per
Addendum 2.

**The summary's own sentences are untouched.** `availabilityCopy.deckSummary.*` and
`deckRollup.*` are not edited, not extended and not re-worded by this amendment; the link string
lives in the Shopping block, because that is what it points at.

---

## The knock-on, ruled: **no group-header arithmetic changes at all**

`decklist.tsx:150` computes `from = roleCounts[role]` over **owned cards only**, and draws
`{n} · closes {from}→{to}` where `to = from + n`. Its own comment names the failure mode this
amendment could have caused: *"the baseline would draw arithmetic the list cannot honour: `5 ·
closes 9→10`, or, past a role already covered, the backwards `3 · closes 12→10`."*

**A spoken-for card is already counted in `from`.** It is an owned card in this deck, so
`computeRoleCounts` has already tallied it. Buying a second copy **closes nothing** — the role
was covered the moment the card was sleeved. Dropping a contested Arcane Signet into the Ramp
group would make `n` count a card `from` already counts, and `from + n` would over-shoot by one
in a clause the player can check against the role strip on the same screen.

Hence the separate group, and hence:

| figure | today | after |
|---|---|---|
| Role group header `{n} · closes {from}→{to}` | owned-only `from`, unowned `n` | **byte-identical.** Contested rows are not in these groups. |
| Spoken-for group header | — | `2 · already in the deck` — the clause slot says why there is no arithmetic |
| `Shopping N` pill | `cardCopies(unowned non-basics)` | `cardCopies(unowned + contested non-basics)` — **the pill counts the list it opens**, which is the rule its own source comment already states |
| Shopping intro | `{n} cards this deck wants that your collection does not have.` | **unchanged when nothing is contested.** Otherwise the split form: `10 cards this deck wants that your collection can't cover — 8 you don't own, and 2 you own but can't spare.` |
| Shopping footer | `{n} cards to buy · {auto} auto` | **unchanged when nothing is contested.** Otherwise `10 cards · 8 to buy · 2 a 2nd copy · 5 auto`, dropping the auto clause at 390px. |
| Spine caption `54 owned · 8 to buy` | `built − ownedCount` | **unchanged, deliberately** — see below |

**The spine caption does not move, and that is a decision rather than an omission.** It splits
`built` into two halves that must sum to `built`. A contested card is owned; counting it on the
right-hand side would count it twice and make `54 + 10 ≠ 62`. So the caption stays the deck's
*arithmetic* and the pill becomes the *list's* size, and **the two stop matching** — the pill
reads 10 where the caption reads 8. That divergence has shipped precedent in the same file: the
pill already differs from `toBuyCount` by any unowned basic land, for the same reason, with the
comment to prove the principle was chosen once already.

**The fill's expressive intro retires whenever a card is contested.**
`shopping.intro` — *"cards we reached past your collection for… every one is closing a specific
gap"* — is untrue of a row you already own and of a purchase that closes nothing. So `intro` is
gated on `spokenFor === 0`, and the split form takes over. `introUnfilled` is likewise
superseded, not edited.

---

## Decisions 4–8

**4 · Emptiness tightens for free, and the compliment gets safer.** `n === 0` now means "nothing
to buy *and* nothing contested", so *"Nothing to buy. Your shelf covered it."* can no longer fire
on a deck whose shelf demonstrably did not cover it. A deck with no unowned cards but one
contested card is **not** an empty list — it renders the Spoken-for group alone, under
`onlySpokenFor` copy.

**5 · The degraded read fails quiet, as the builder always has.** With `availability` null or
absent every row degrades to its free rendering (`grouping.ts:36`), so the contested rows are
simply not there and the list is today's list. **No banner** — R2's rule is that a banner is owed
only where the failure changes what a control means, and `/collection` already applies it. The
honest cost is stated in the gaps: a player mid-outage sees 8 where the truth is 10.

**6 · The card can leave the contest two ways, and Shopping shows only one of them.** Buying is
Shopping's subject; cutting is the other exit, and Addendum 2 §6 already ruled that we never
warn on a cut — *"a cut releases a card — it is the one action that makes a copy freer."* So there
is **no "cut it instead" control** in the group, no advice line, and no `--danger`. The `✕` the
row already carries is that exit, unlabelled and unhurried.

**7 · The spent slot must follow the list (for eng, not a call).** `decklist.tsx:139` keeps a
removed card's undo row only when `filter === "all" || !spentSlot.owned`. A contested card is
owned, so removing one from the Shopping view would make the row vanish with **no undo receipt**
— the one case #185 exists to prevent. The condition becomes "the Shopping list was showing this
card", i.e. the same predicate as the filter itself. One expression, in the file this amendment
already edits.

**8 · Export copies the list, so it copies these rows too.** The export dialog's `Shopping list`
tab and `Copy shopping list` are outside this folder's copy files, and its heading count
(`8 cards you don't own`) is now wrong twice over. Named here rather than rewritten: the fix is
the same split the footer takes, and Design will draw it on request. **Until then the export
under-reports by the contested count** — logged as gap 6 because it is the one place the two
surfaces can disagree in front of the player.

---

## Engineering

- `decklist.tsx` — the filter predicate; the new group after `otherShoppingCards`; the spent-slot
  condition (decision 7); `spokenFor` and the split intro/footer selection. `shoppingCount`
  follows the predicate with no other edit, and every figure stays on `cardCopies` for the reason
  its comment gives.
- `decklist-row.tsx` — `BuyTag` gains the `2nd copy` word on a contested row: one ternary on the
  state the row already computes at :129. **And the marker takes `nameless` in the Shopping
  view**, which is the flag it already accepts — one prop, no component change. The dot, the tint
  and the over ring are untouched.
- `buy-tag.tsx` — one optional `word` prop, defaulting to `addPanelCopy.unowned.tag`. **No new
  plate, no new variant.**
- `builder-spine.tsx` — the over band gains the link; `RollupBands` takes one `onShowShopping?`
  callback threaded from `BuilderShell`, which already owns `filter`. Absent callback = no link,
  which is what keeps the deck card's copy of the band untouched.
- `recommendations.ts` — the six new Shopping strings in
  `shopping-availability · copy strings.ts`. **Nothing deleted, nothing re-worded.**
- Tests worth naming: `decklist.test.ts` (the predicate, the disjointness, the basics assertion),
  `builder-spine.test.tsx` (the link's presence keyed on the callback), and one unit test that a
  deck with `spokenFor === 0` produces today's intro and footer **byte-for-byte** — that is the
  assertion this whole amendment's safety rests on.

## Gap report

1. **The pill and the spine caption disagree on screen** — `Shopping 10` above `54 owned · 8 to
   buy`. Both are right about different questions and neither can move. Precedent exists (unowned
   basics), but this makes the gap two cards wide instead of zero for most players.
2. **Nothing prices the second copy.** The app has no pricing, so a list that now mixes "acquire
   a card" with "acquire a duplicate" cannot say that the duplicate is often the cheaper trip.
3. **The group counts copies; the summary counts cards.** An "any number" card (Relentless Rats,
   Nazgûl) at quantity 3 makes the header read `3` where the band reads `1 card here is spoken for
   twice`. Both follow their surface's shipped convention; they will look like a bug once.
4. **A row can appear here because of something the player did to another deck.** Finishing a brew
   promotes its soft claims to hard, which can push a card in *this* deck to `over` — the Shopping
   list grows by one with no action taken on this deck and no announcement. Deliberate (silence is
   the default) and undrawn.
5. **The 98th-card cliff is inherited** (Addendum 2 gap 6). A single add elsewhere can move a card
   from soft to over, so the list can gain a row on one card's worth of arithmetic. Not drawn.
6. **The export's Shopping tab under-reports** until decision 8 is drawn — the only place two
   surfaces in the same feature disagree about the same list.
7. **An over-99 deck compounds amendment 3's gap 3.** At 104 the Shopping list already offers cards
   for slots that do not exist; it now also offers second copies for them.
8. **No aggregate anywhere says "of your 10, two are duplicates".** The footer's clause is the
   whole answer, at 10.5px in the quietest colour on the surface.
9. **The same card reads two ways one tab apart** — `short 1 — also in Atraxa` in All, bare
   `short 1` in Shopping. Forced by the row's width budget and consistent with `/collection`'s
   count-only rule, but it is a third vantage-shaped difference in a system that already has two
   (Addendum 2 gap 7).

## Files

- `The 99 - Shopping Availability (R1).dc.html` — the canvas: the list at both widths, the row
  ledger, the counts before/after, the summary-as-index, the four empty/covered states, the
  rejected shapes, and the decisions ledger.
- `STATES-shopping-availability.md` — every state of the Shopping view across the two counts,
  both widths, plus what is *not* a state.
- `shopping-availability · copy strings.ts` — the six additions, each naming what it supersedes
  and what it must never edit.
- `AMENDMENT-5-READINESS.md` — verdict, what carries forward, what an audit should check first.

**New files only.** `README.md`, `READINESS.md`, the R3 canvas, the four earlier copy files and
every document in `design_handoff_the99_availability/` are untouched.
