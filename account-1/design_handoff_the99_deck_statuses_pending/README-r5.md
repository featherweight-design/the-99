> **SUPERSEDED 2026-09-19 by R6** — `README-r6.md` in this folder. `To build` sat below `To buy`
> in the cascade, so it could only ever fire on a deck where every card was already owned — it
> could never reach a deck with cards left to buy, which is the deck it was written for. The phase
> now tests FIRST, as **`Draft`** (any cards, never committed), with **`New`** for the 0-card
> state. Kept as the record.

# R5 — `To build`: the seventh value, and the retirement of both marks

`design/design_handoff_the99_deck_statuses_pending/` · R5 · 2026-09-19

Audited against `main`. Supersedes R1–R4 on the vocabulary and the treatments. The canvas turn is
**`5a`**, at the top of `The 99 - Deck Statuses · Pending (R1).dc.html`; `4a`, `3a`, `2a` and `1a`
are kept as the record and marked superseded.

**The data is not in scope and nothing here asks it to move.** The pending count, the version
number, the gated list read and the `Deck state` facet are built and proven. This round changes
the vocabulary and the treatments only.

---

## What R4 got wrong — plainly, for the record

R4 shipped two marks on 2026-09-18: an untinted plate for a deck with no committed version, and a
2px `--fg` left rule for a committed deck whose draft had moved. **Both work as drawn. Both are
retired.** Two reasons, and the second is the one that should have stopped the round.

### 1 · They were the only wordless signals in the deck list

Six values, each a word, each in one pill, each with a label somewhere a reader can find it. R4
added two members to that vocabulary that say nothing anywhere — a plate that is a little darker,
an edge that is a little brighter. The product owner could not read them without a key, which is
the whole finding: **a signal the owner of the product cannot decode is not a signal.**

### 2 · R4 argued a contrast it had not measured

R4's case for the plate was "filled against hollow separates them at a glance". Measured in the
app after the build, on the deck tile:

| Reading | Plate, resolved |
|---|---|
| A plan (any status) | `rgb(20, 17, 14)` — `--bg` |
| A deck at `Building` | ≈ `rgb(44, 40, 35)` |

**~39 units on a 0–255 scale, near-neutral.** And weakest exactly where it mattered most: `Draft`
and `Building` are drawn from a *text* colour at 16% and 14%, where the other four carry a *hue* at
18% — so the commonest work-in-progress deck was the least legible case the feature had. The claim
was true of four values and marginal on two, and the two were the ones the feature was for.

The instructive part is the sequence. R3 refused to lock a 168px figure it had only derived, and
recorded it as a gap. R4 then shipped a contrast claim resting on no measurement at all.

> **The rule this round earns: a signal that can be measured is not ruled until it has been.**

### Also withdrawn with them

- R4's 50% bar opacity for a provisional deck. There is no provisional plate to match.
- The `DeckStateMarks` type and both arguments to `statusPillStyle`, which returns to one argument.
- R3's `--fg` edge and R2's second chip, already superseded, now formally dead.
- R1's **ruling 1** ("not a seventh value"). Overturned — see below. R1's rulings 2 and 5 are
  superseded in substance by rulings 3 and 5 here.

---

## Ruling 1 · Precedence — one rung, directly below `Complete`

`To build` is a seventh member of `StatusPill`, tested **after** `To buy` and **before**
`Complete`:

```
built === 0                   → Draft
built < bodySize              → Building
built > bodySize              → Over
unresolvedCount > 0           → Unresolved
not covered, or unfunded > 0  → To buy
lastCommittedAt === null      → To build      ← new
otherwise                     → Complete
```

**Why it outranks `Complete` and nothing else.** `Over`, `Unresolved` and `To buy` each name a fact
to act on — an illegal count, a card we cannot price, a card you must go and buy. Not having
sleeved it yet is the *last* thing standing between a legal, owned list and a table, so it is the
last test before `Complete`.

**Why not one rung higher.** #357 retired `Playable` for covering the last three rows at once and
rendering green, so a deck needing fifteen cards bought announced itself as ready. A value
outranking `To buy` would rebuild that defect from the other end: a shopping list hidden behind a
sleeving prompt. The existing six-value ordering is load-bearing and this round does not touch it.

**Derivable, and the boolean already ships.** `DeckListItem.lastCommittedAt` is on both list reads
via `lastCommittedSql` and is null exactly when no version exists (READINESS item 10).
`statusPill()` gains one optional argument and one test.

### Why R1's ruling 1 was wrong

R1 refused a seventh value because the six "partition one fact" — the matched count against the
body size — and pending changes was a different axis. That reasoning was right about *pending
changes* and wrong about *this*. The six do not partition a count; they partition **what stands
between this deck and a table**. For a full, owned, uncommitted list, what stands between it and a
table is that you have not built it. Same axis, same question, same pill.

---

## Ruling 2 · The treatment — `--fg`, at the flat 18%

| Value | Token | Pill fill | Pill label | Pill border | Bar |
|---|---|---|---|---|---|
| Draft | `--fg-faint` | token at 16% | `--fg-muted` | solid `--border-strong` | empty track |
| Building | `--fg-body` | token at 14% | `--fg-body` | **dashed** `--border-strong` | proportional |
| Over | `--danger` | token at 18% | `--danger` | solid `--border-strong` | full |
| Unresolved | `--warning` | token at 18% | `--warning` | solid `--border-strong` | full |
| To buy | `--accent` | token at 18% | `--accent` | solid `--border-strong` | full |
| **To build** | **`--fg`** | **token at 18%** | **`--fg`** | **solid `--border-strong`** | **full** |
| Complete | `--success` | token at 18% | `--success` | solid `--border-strong` | full |

Six rows unchanged. The seventh is the only new line, and it takes the **flat rule** rather than a
text-colour exception: `Draft` and `Building` are quietened because they are the two *unfinished*
states and their tokens are dim text colours. This is a finished list, and `--fg` is the brightest
ink each theme owns.

**Which makes it the loudest neutral in the set** — brighter than `Draft`, brighter than
`Building`, carrying the highest-contrast label of the seven. That is right for the one value whose
next action is *go and do the thing*, and it is the exact inverse of R4's defect: the retired plate
went 39 units **darker** and mute; this goes **brighter**, with bright ink.

**Nothing is re-spent.** `--success` is refused — green is the one word for playable and #357 is
the price of blurring it. `--danger`, `--warning` and `--accent` are spoken for; `--fg-faint` and
`--fg-body` are the two exceptions already taken. `--fg` is the only ink in the palette that is
neither a hue nor already a status — and it is the ink this round frees by retiring the edge.

`STATUS_TOKEN` gains one entry. `PILL_EXCEPTION` is untouched.

---

## Ruling 3 · `Draft` keeps the 0-card slot

**The question does not arise, because the new value does not want the word.** Every value in this
table is named for what stands in the way, and four name it as an action: *Add*, *Cut*, *Resolve*,
*Buy*. `To build` is the fifth, and it sits directly beside the one it rhymes with:

- **To buy** — you cannot sleeve it: cards are missing.
- **To build** — you *can* sleeve it: you have not.

So there is no rename and no cascade. `Draft` stays a `StatusPill` member, a `refreshCopy.status`
key, a URL value, a filter row and an About key line. A rename would have touched all of them to
buy a word this value does not need — and `Draft` is the honest word for nought cards: a named
commander and nothing else, which is exactly what `STATES-deck-statuses.md` draws.

The exact string is yours via `/copy-review`. If it moves, the ruling that holds is the **shape**:
a *to-* verb, parallel to `To buy`, one rung below it.

---

## Ruling 4 · Pending changes gets no mark — confirmed

**Confirmed, not conceded.** The fact is already stated *in words* on all three surfaces that carry
it: `1 change since v1` in the tile's detail row, the banner on the deck page, `edited 2h ago` on
Home's stamp. A mark would be a fourth telling, and the only wordless one — which is what this
round is retiring.

**The asymmetry is correct, not an inconsistency to fix.** Never-committed is a *state of the
deck*: it changes what the deck is, and states of the deck live in the pill. Edited-since-v1 is an
*event in its history*, and the history is what the detail row and the banner are for. One belongs
in the pill; the other never did.

The data behind it stays — the count is what the detail row prints.

---

## Ruling 5 · The facet — both rows stay, both relabelled

**Status gains a seventh row**, in cascade order between `To buy` and `Complete`, and the header
reads `7 of 7`. It is a value now, so it serialises to `?status=` like the other six and the count
keeps its contract with the grid.

**`Deck state` keeps both rows, because neither is what the status says:**

| Was | Now | Why |
|---|---|---|
| `Not committed yet` | **`No version yet`** | It catches a never-committed deck at *any* count; `To build` catches only the full, owned ones. The old label beside a status of nearly the same words would read as a duplicate of it. |
| `Has pending changes` | **`Edited since last version`** | States the fact rather than naming a mark that will not exist. |

Both are label changes on a built, proven facet. **`?state=uncommitted,pending` is unchanged**, so
no saved link breaks.

---

## About — corrected in place, and no second bump

Both entries amended for R4 carry text describing things that will not exist, and both must be
corrected in the same build. Spec: `design_handoff_the99_about/ADDENDUM-deck-state-marks.md`.

- **`versions` key 3** becomes: *"a full deck you have never committed reads **To build** until you
  commit v1 — it is a list, not a deck you can put on a table yet."* Still 3 keys.
- **The `statuses` caption sentence is deleted**, not rewritten. Its four keys teach the values, and
  the seventh is now simply one of them. Back to its shipped caption.

**`ABOUT_VERSION` does not move again.** It went to 5 on 2026-09-18 and put `/about` in front of
every account. Bumping a second time inside a week to correct our own copy spends the reader's
attention on our error — and `/about` has no *amended* state, so they would be interrupted and then
shown a page with nothing marked. **Correct in place at 5.**

The `amended` treatment that would make a bump honest is still owed and still Design's. It is not
this round.

---

## To measure before this is locked

0. **Done, at review: the chip widths.** R5's first draft carried `62px` and `~70px` for
   `To build` and `Unresolved` — both invented. Measured in the rendered page at 10.5px mono with
   IBM Plex Mono loaded, they are **73.5px** and **87.3px** (box width; text advances 50.4px and
   63.0px). The directional conclusion held — the wider is already carried at 189px — but the
   figures did not, in the document whose thesis is that they must. Corrected in the canvas and in
   `STATES-to-build.md`.
1. **`To build` against `Draft`, in greyscale.** Three neutral plates now sit in one vocabulary.
   `Building` has its dash; these two have only brightness — 18% of `--fg` against 16% of
   `--fg-faint`, with `--fg` against `--fg-muted` as labels. **This is the same class of claim R4
   shipped unmeasured**, so it is recorded as a probe and not as a ruling. Mitigation if it fails:
   the two never share a count — `0 / 99` against `99 / 99`, at opposite ends of a deck's life.
2. **All six themes.** `--fg` is declared by all six, but its distance from `--fg-faint` is not
   constant; First Frost has the narrowest neutral ramp in the set, so probe 1 runs there first.
3. **The contact sheet, not a review, is what catches this.**
   `docs/superpowers/inventories/deck-state-marks.json` becomes `deck-statuses.json` and asserts
   seven plates rather than two marks; `deck-state-facet.json` gains the seventh row and the two
   relabelled ones.

## Carried, unchanged

- `statusKeylineStyle` is still dead code, and About's `resume` caption still describes a keyline
  the app does not draw. Pre-existing, unrelated, still worth its own ticket.
- The banner, the commit sheet, the review page, Discard and the game-log stamp stay with
  `design_handoff_the99_deck_versioning/`.
