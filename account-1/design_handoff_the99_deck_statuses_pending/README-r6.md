# R6 — `New` and `Draft`: the phase tests first

`design/design_handoff_the99_deck_statuses_pending/` · R6 · 2026-09-19

Canvas turn **`6a`**. Supersedes R5. Written in answer to two review questions, both of which were
right.

---

## Question 1 — "`To build` could transition into `To buy`"

Yes, and the transition is the symptom of something worse.

**R5's value could never reach the deck it was written for.** `To build` sat below `To buy` in the
cascade, so it only fired when every card was already owned. The deck in the brief — 99 cards, some
not yet bought — read `To buy`, exactly as it did before the round. Commit it and it *stays*
`To buy`, because committing does not buy anything. That is the nonsense the review caught.

**And it is structural, not a slip.** One pill is one ordered cascade. A value placed below
`To buy` can only occupy the gap the other six leave, which is the full, owned, resolved deck — the
one deck that needed no help. **Placing the phase last guarantees it describes the wrong decks.**
Any fix that keeps it there is cosmetic.

This is the third round to exclude the same deck: R1's ruling 3 by name, R4 by measuring badly,
R5 by precedence.

## Question 2 — "What's the resistance to `New` and `Draft`?"

I wrote that the new value "does not want the word." **The real reason was the rename cascade** —
`StatusPill`, `refreshCopy.status`, the URL value, the filter row, the About key line — and I
presented that implementation cost as vocabulary logic. It should have been a line item to price,
not an argument to see through. Priced below.

On the merits the proposal wins outright: **a draft is a draft at any length.** Every other tool
means it that way and none requires a document to be empty first. `New` is then the honest word for
a deck that has a commander and nothing else.

---

## The cascade — two phase tests, then the five count tests unchanged

```
built === 0 && lastCommittedAt === null   → New          ← new member
lastCommittedAt === null                  → Draft        ← redefined: was 0 matched
built < bodySize                          → Building     ← now means: committed, and short
built > bodySize                          → Over
unresolvedCount > 0                       → Unresolved
not covered, or unfunded > 0              → To buy
otherwise                                 → Complete
```

Nothing below the phase moves. The five count tests are written **in their shipped order** —
`status.ts` puts `Building` before `Over`, and this document follows it rather than redrawing it,
because that file's header says the order is load-bearing and a handoff that rearranges it invites
the reader to rebuild it wrong. (The two conditions are mutually exclusive, so behaviour is
identical either way; the point is that the document must not diverge from the source it cites.)

**Both phase tests are gated on the version, including the first.** `New` is *0 cards **and** no
v1*, not 0 cards alone — so a committed deck cut to nothing falls through to `Building`, which is
exactly what it is: a real deck, currently short, by 99. Ungated, the loudest lie in the
vocabulary would return — a deck with four versions and a game log reading `New`. R2 raised this
case and R5 ruled on it by name; R6's first draft dropped it, and this is the correction.

**`Building` gets sharper.** It now means exactly one thing — *a committed deck currently short of
its body size*, i.e. you cut cards and have not refilled, up to and including cutting all of them.
Real, rare, actionable. Today it is the catch-all every half-finished idea falls into.

**Still derivable:** three counts plus `lastCommittedAt === null`, which already ships on both list
reads (READINESS item 10). `statusPill()` gains one optional argument and two tests at the top.

## The treatment

| Value | When | Token | Fill / label / border |
|---|---|---|---|
| **New** | 0 cards, never committed | `--fg-faint` | 16% · `--fg-muted` · solid |
| **Draft** | 1+ cards, never committed | `--fg-body` | 14% · `--fg-body` · **dashed** |
| **Building** | committed, now short — including cut to 0 | **`--fg`** | **18% · `--fg` · solid** |
| Over | committed, past the body size | `--danger` | 18% · `--danger` · solid |
| Unresolved | committed, a line unnamed | `--warning` | 18% · `--warning` · solid |
| To buy | committed, cards to buy | `--accent` | 18% · `--accent` · solid |
| Complete | committed, owned, resolved | `--success` | 18% · `--success` · solid |

**The dash moves to `Draft`, and this is the change I would defend hardest.** A dashed edge has
meant *provisional* since the refresh, and it is the one status signal surviving greyscale and
colour blindness. It sat on `Building` because `Building` was where unfinished decks lived. They
live in `Draft` now, so the dash goes with them: the signal did not change meaning — the meaning
moved and the signal followed.

`Building` takes `--fg` at the flat 18% — R5's one surviving finding, reused where it now belongs.
A committed deck sitting short is a real deck in an odd state, so it takes a solid edge and the
brightest neutral. `--success` is still refused for anything but `Complete`; no hue is re-spent.

---

## What this costs — the honest ledger

1. **An uncommitted deck loses its count word in the pill.** A 104-card idea reads `Draft`, not
   `Over`. The figure survives in the detail row, and the ruling that makes this right is the one
   R2 reached and R5 forgot: **while a draft is open the count facts are transient** — they
   describe the editing, not the deck.
2. **It contradicts the brief's ruling 1**, which said `Over`, `Unresolved` and `To buy` keep
   winning. I am overruling it because R5 obeyed it and could not then reach the deck in question.
   **This is the one thing in R6 to push back on**, and it is yours to call.
3. **Is this #357 again?** No, and the distinction is direction. `Playable` **overclaimed** — it
   said *ready* about a deck needing fifteen cards bought. `Draft` **underclaims**: it says
   *provisional* about a deck that is provisional, and nobody ever took a table to a draft.

## The rename, priced

- **One new member, one redefinition, no deletions.** `StatusPill` gains `New`; `Draft` keeps its
  key and changes its threshold. `refreshCopy.status` gains `new: 'New'` above `draft`.
- **The URL value is the one migration.** `?status=draft` now selects a different set than it did
  yesterday. Nothing breaks — it is a valid value returning valid decks — so no redirect is owed,
  but a saved filter means something new and that should be **stated rather than discovered**.
- **`PILL_EXCEPTION`'s two entries are re-keyed, not edited in place.** This is the step most
  likely to be built wrong, so it is written as a diff:

  ```
  - Draft:    { fillAlpha: "16%", label: "--fg-muted" }
  - Building: { fillAlpha: "14%", label: "--fg-body", borderStyle: "dashed" }
  + New:      { fillAlpha: "16%", label: "--fg-muted" }
  + Draft:    { fillAlpha: "14%", label: "--fg-body", borderStyle: "dashed" }
  ```

  Both existing entries shift down one slot and `Building` is **removed**, taking the flat rule
  (18% of `--fg`, label `--fg`) like the four signal-coloured values. Adding a dash to the existing
  `Draft` entry instead would ship `Draft` at the wrong alpha *and* the wrong label, and leave
  `New` with no exception at all — which is the one change this document says it would defend
  hardest, lost in the build.
- `STATUS_TOKEN` gains `New: "--fg-faint"`, `Draft` becomes `"--fg-body"`, and `Building` becomes
  `"--fg"`.

## The facet

- **Status: seven rows**, in cascade order — `New`, `Draft`, `Building`, `Over`, `Unresolved`,
  `To buy`, `Complete`. Header reads `7 of 7`.
- **`Deck state` drops to one row.** `No version yet` is **deleted**: `New` + `Draft` ticked in
  Status *is* that filter now, exactly, and a facet duplicating two status rows is a control that
  can only disagree with them. `Edited since last version` stays.
- `?state=pending` survives; `?state=uncommitted` is retired with its row.

## About

Spec: `design_handoff_the99_about/ADDENDUM-deck-state-marks.md`, copied into this folder as
`ADDENDUM-about-new-and-draft.md`. The entry is drawn on `6a`.

`versions` key 3 becomes the `Draft` sentence — *"a deck you have never
committed reads New until it has cards, then Draft — commit v1 and it takes the status its list
earns."* `statuses` stays at
its four-key cap (the keys teach thresholds, not one value each) and its caption sentence stays
deleted. **`ABOUT_VERSION` still does not move** — the reasoning at R5 is unchanged and stronger
now that this is the second correction in two days.

## Unchanged from R5

- Pending changes gets **no mark** (ruling 4, confirmed twice).
- Both R4 deck-state marks stay retired; no wordless signals anywhere.
- The probes: `New` against `Draft` in greyscale — though the dash now separates them, which is
  most of that risk gone — and the contact sheet asserting seven plates.
