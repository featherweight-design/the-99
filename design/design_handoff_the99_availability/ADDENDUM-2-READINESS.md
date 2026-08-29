# READINESS — Card availability (#43), addendum 2

**Verdict: 🟢 Green.** R2's single blocker is closed with a rule that generalises rather than a
patch, all four corrections are landed in the canvas as well as the ledger, and the new surfaces
are drawn at both widths. Nothing is waiting on Design.

Addendum 2 extends the #43 marker to the two surfaces the original brief left out of scope:
`/collection` (states 1–5) and deck detail (states 6–9). The deck **index** stays untouched per
locked decision 2.

## No-reopen, verified byte-for-byte

R1's `README.md`, `ADDENDUM-README.md`, `READINESS.md`, `ADDENDUM-READINESS.md` and both earlier
canvases are **identical** to the versions merged at `e80e931`. The R3 drop adds exactly two files
(`ADDENDUM-2-README.md`, `The 99 - Card Availability Addendum 2.dc.html`) and extends
`availability · copy strings.ts` with the `collection` and `deckRollup` blocks. No existing copy
key was renamed or edited. Two rounds running, nothing upstream disturbed.

## The R2 blocker, and what R3 answers

**The ask.** No pass had drawn a *finished* deck's own decklist. Commander being singleton,
opening a `Complete` deck would render `0 free — in <this deck>` on nearly every nonland row —
inverting "silence is most of the app" on the one surface where a finished deck is the success
state.

**The answer — §6, "A deck never claims a card against itself."** On a deck's own list the marker
excludes that deck. One rule, both severities, no special case. Three consequences Design draws
rather than asserts:

| | |
|---|---|
| **`0 free` is not a cut warning** | A cut *releases* a card. Warning on it would be the only place the marker discourages a move, and locked rule 1 is that we never block. A marker that argues against an action is a soft block. |
| **The hard state is unreachable inside a finished deck** | A genuine conflict is over-commitment and presents as `short 1`. The loud state survives self-exclusion, which is the proof the rule drops noise rather than signal. |
| **No exclusion off-decklist** | `/collection` and the commander surfaces have no current deck and compute against everything. *"The marker is relative to where you stand, and only a decklist is somewhere to stand."* |

Drawn as state 9: inside Atraxa 99/99 `Complete`, four of six rows silent, one `short 1 — also in
Kykar`, one `1 in a brew`, and the over-committed roll-up still firing. A cross-surface ledger
beside it shows the same card three ways.

## Corrections landed

All four from the R2 audit, confirmed **in the canvas** and not only in the corrections table:
Free `1,187` → `1,186` (the four counts now sum to 1,418) · phone `Showing 63` → `Showing 61` ·
"fifth dropdown" → "fourth on desktop, fifth on phone" · shipped `COLOR` label restored beside
the desktop pip row.

## Resolved engineering-side — Design to ratify, not to redraw

**1. §6's rule sentence understates its own arithmetic.** The prose says the marker "scores
against every deck **except that one**" — claims-exclusion. The drawn outcomes require excluding
the current deck's copies from **supply as well as claims**. Worked against state 9, with
`ownClaim` the current deck's own quantity and `free = (owned − ownClaim) − (hard − ownHardClaim)`:

| Card | owned | ownClaim | hard | free | State | Canvas |
|---|---|---|---|---|---|---|
| Smothering Tithe | 1 | 1 | 1 | 0 | free | *silent* ✓ |
| Rhystic Study | 1 | 1 | 1 | 0 | free | *silent* ✓ |
| Arcane Signet | 1 | 1 | 2 | −1 | over | `short 1 — also in Kykar` ✓ |
| Sol Ring | 4 | 1 | 1 | 3 | free | *silent* ✓ |
| Mind Stone | 2 | 1 | 1 | 1 (soft 1) | soft | `1 in a brew` ✓ |
| Cyclonic Rift | 1 | 1 | 1 | 0 | free | *silent* ✓ |

Six of six. Claims-exclusion alone gives Arcane Signet `free === 0` and renders `0 free — in
Kykar`, contradicting the drawing. Implemented to the drawing; **the wording is what needs
ratifying, not the behaviour.**

One further consequence: under this model `free === 0` from a self-excluded vantage means
"exactly enough for everyone, including this deck" — silence. So the `hard` state is genuinely
unreachable on a deck's own list, exactly as §6 claims, including for multi-copy cards. An earlier
draft of this audit flagged that sentence as an overreach; **it isn't, and the flag is withdrawn.**

**2. The copy file has no count-only `hardAria`.** `/collection` is count-only in the accessible
name as well as the label, and the addendum's own `rowAria` example ends *"…, no free copies"* —
which is the first clause of `marker.hardAria`. Implemented by slicing that clause rather than
re-typing the phrase, so the copy file stays authoritative. A dedicated key would be tidier if
Design is touching the file anyway; not worth a round on its own.

**3. §3 draws a status pill the marker cannot carry.** Card detail is drawn as `×1 · ◆ 0 free — in
Atraxa [Complete]`. `Availability.hardDeckNames` is names only, and `statusPill()` needs the *other*
deck's `built` / `ownedCount` / `unresolvedCount`, none of which the aggregate returns. Deriving
"Complete" from `hard > 0` would render a guess in the shape of a fact — the one thing a claim about
another list must not do. **Implemented without the pill.** The clause is honest and complete on its
own. Ratify the omission, or fund widening `hardDeckNames` to `{ name, pill }[]`, which ripples
through every marker caller and is a Task 1 change, not a collection-page one.

**4. `Showing N of 1,418` has a denominator the shipped page does not use.** With a filter active,
`chip-row.tsx` renders `Showing <rows> of <total quantity>` — the `2,933`-shaped figure, not the
`1,418` unique total. The *numerator* agrees exactly: `In use` really does show `61`, because rows
are per-card and so are the menu's counts. Only the denominator differs, and it differs because the
fixture collection is drawn with the unique figure in that slot. Addendum 2 changes no result-count
copy and says so twice ("no grid changes on either collection view"; the chips "reuse the shipped
chip row"), so the shipped variants stay. **The drawing is what needs ratifying, not the behaviour.**

**5. §6 is written about the decklist; the add panel needs the same rule.** Self-exclusion is stated
for "a deck's own decklist", and the add panel's search results are mostly cards the deck has no
claim on, where the rule is a no-op. But a card already on the list comes back from search too, one
panel away from its own row — and without exclusion it reads `0 free — in <this deck>` in the panel
while rendering silent in the decklist behind it. Same card, same deck, two answers, no scroll
between them. §6's own reason is that inside a list the card *is* built with, which is no less true
in the panel you are adding from. **Implemented with exclusion on both surfaces.** The cost is a
`deckId` parameter on `searchCards`, whose file already lives under `src/app/decks/[id]/` — making
an existing scoping explicit, not adding coupling. Ratify the extension, or say where the seam
should fall instead.

## Decisions taken 2026-08-27, outside the design cycle

**Gap §2 — deck-name length budget.** Design declined to set one twice, correctly: *"the name is
the most useful half of the string."* Resolved as **the name is the only part allowed to
truncate** — the marker renders as a `flex-none` prefix plus a `truncate min-w-0` name, with the
full name in `title` and always in the accessible name. This is not a new rule; it is Addendum 2
§1's own pattern for the collection name cell ("the chip is `flex: none`; the name is the flexible
half") applied to the marker's two halves. No character counting, no breakpoint hook, no magic
number. Gap §2 is closed.

**The receipt's second clause.** Recorded here because an earlier engineering note raised it as an
open question: it is not one. Canvas state A is labelled "Everything I own (default)" and draws
`34 of your cards fit · 12 already in use`. The clause renders in both modes. The apparent cost
objection was an artefact of deriving `inUse` from the difference between two ranking runs; it is
directly computable from the availability map in one query.

## Open, non-blocking

- **Gap §1 — no over-committed aggregate on `/collection`.** Deliberate: the collection page is an
  inventory, not a to-do list, and the deck with the problem shows it. Accepted.
- **Gap §2 — the filter menu's counts before first paint.** All four counts come from the same
  page-level join; the loading shape is unspecified. Drawn as if resolved.
- **Gap §3 — `detailSoftNote` and `detailOverNote` are written but only the hard note is drawn.**
  Same rules; low risk.
- **Gap §4 — `?avail=` now means two things**: single-value ranking mode on `/commanders`,
  multi-value filter on `/collection`. Defensible (same concept, no shared reader), but it will
  bite during a future "share this view" feature.
- **Gap §6 — the 98th-card cliff**, inherited from locked decision 2. The soft roll-up can vanish
  and the red line appear on a single add; that transition isn't drawn.
- **Gap §7 — self-exclusion means one card reads differently on two decklists.** By design, drawn
  side by side, and the one place two surfaces disagree about one card. A support conversation
  could start there.
- **Gap §8 — `softHeadingAfterOver` assumes the counts never overlap**, which self-exclusion
  preserves. If the exclusion rule is ever relaxed, that "more" becomes wrong before anything else.
- **R1 gap §10 (a commander can vanish on the flip)** and **§11 (two degraded reads co-occurring)**
  carry forward unchanged from the R2 verdict.

## Unchanged and still verified

Silence end to end · nothing blocked · nothing asserting physical location · one status vocabulary
(`statusPill()`; `decks.status` stays dead and the plan drops it) · AA without colour · zero net
motion · no new dependency · no new tokens or hues · no grid changes on either collection view ·
`owned > 0` guard intact.

Locked decision 2 holds: **no roll-up and no badge on the deck index**, and the status pill keeps
meaning card count and nothing else.
