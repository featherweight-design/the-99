# READINESS — Deck-state marks (R4)

**Verdict: 🟡 Yellow.** Audited 2026-09-18 against `main` at `12e2e858`. No Design round-trip is
owed: every open item is either superseded text inside this folder or eng-side data work. Nothing
needs a drawing that does not exist.

`4a` is the live answer. `3a`, `2a` and `1a` are superseded and are kept as the record.

## What R4 ships

Two marks, two axes, one box.

| Reading | Plate | Edge |
| --- | --- | --- |
| A plan — no committed v1 | `--bg`, no status tint, fully opaque | — |
| A deck — v1 exists | the status token at its own alpha | — |
| A deck, mid-tinker | the status token at its own alpha | 2px `--fg` left rule |

Neither is a `StatusPill` member. `STATUS_ORDER`, `STATUS_COPY_KEY` and `statusPill()` are
untouched, and the pill keeps its count-based value at every reading. The two marks are mutually
exclusive by definition — the edge requires a version, the hollow plate means there is none.

## Errata — this section governs over anything it contradicts

R4 supersedes R1–R3, and four places in this folder still carry the earlier answer. An
implementer reading top-down would build the wrong thing at each of them. Where this ledger and a
document disagree, the ledger is the build value.

1. **`README.md` §Decisions 3** ("a deck with no committed version takes no mark") is **reversed**
   by R4 — that deck is precisely what the hollow plate is for. Its strikethrough note covers only
   the Draft/Building carve-outs, not the headline.
2. **`README.md` §Decisions 4** names `--accent` for the rule. R3 corrected it to **`--fg`**, and
   the reason is structural: `STATUS_TOKEN["To buy"]` *is* `--accent`, so an accent edge collides
   with that one pill by construction in all six themes. The retired-chip comment in
   `deck-statuses-pending · copy strings.ts` repeats the superseded `--accent` and is wrong in the
   same way.
3. **`README.md` §Decisions 5** draws the facet as `Changes` with one row. R4 ships **`Deck state`
   with two rows** — `Not committed yet` and `Has pending changes` — serialised as
   `?state=uncommitted,pending`. `STATES-pending-mark.md` §D state 24 still describes `pending=1`
   as the only truthy form and is superseded with it.
4. **`STATES-pending-mark.md` §A** prints the pill labels lower case in rows 1 and 3–7
   (`complete`, `over`, `to buy`, `building`, `draft`, `unresolved`). R3 correction 1 rules them
   **Title case, verbatim from `refreshCopy.status`** — `'Draft' 'Building' 'Over' 'Unresolved'
   'To buy' 'Complete'`. The canvas is corrected; this table was not.
5. **`STATES-pending-mark.md` §A row 2** puts the change figure in `--accent`. The canvas and
   `README.md` §"Where the figure goes" both draw **`--fg-faint`**, which is the build value. The
   `--accent` reading is R2 residue, kept alive by a rationale ("one mark read top to bottom") that
   R3 retired when it moved the rule to `--fg`.
6. **`README.md` structure.** `## R1 — the original pass, kept for the record` carries no content,
   and the R4 section is nested beneath that heading. R1's text is not in the record it claims to
   keep. Navigational only; no build value turns on it.

## Findings this folder will keep drawing, and why they stay

Review round 1 on the handoff PR landed three findings on Design's own documents: the lower-case
labels in `STATES-pending-mark.md` §A, the superseded `?pending=` shape in its state 24, and
`README.md`'s source paths written without their `src/` prefix (plus one typo, "unre-run"). All
three are real, and none is edited here. A handoff is a non-engineer's drawing package and the
record of what they decided; the errata ledger above is how a contradiction in one is answered,
because it governs the build without rewriting somebody else's document. The paths resolve — this
repository has exactly one `status-style.ts` — and the casing and the facet shape are already
items 4 and 3 of that ledger.

## Unruled states, and the rule that covers them

Three surfaces are stated rather than drawn. §0 row A ("a plan, any of the six values") is general
and applies to each; none needs Design.

7. **Home's resume row with a plan.** §B tabulates the pending mark only. Apply §0 A: the plate
   takes `--bg`, the word and ink are unchanged. There is no keyline to reconcile — see the
   pre-existing defect below.
8. **The deck page's progress track.** §0 row D shows the bar as `—`, but `src/components/decks/spine-desktop.tsx` and
   `src/components/decks/spine-mobile.tsx` both draw `statusBarStyle`. Apply §0 A's 50% opacity there as on the tile.
9. **The mobile spine's hollow plate on the wash** (§0 state E) is argued from the art-wash
   amendment and not drawn. The argument holds — the plate mixes into `--bg` rather than into
   transparency — but it is a measurement, so it is a probe rather than a review claim.

## Verified against the code

- `--fg` and `--surface-inset` are declared by all six themes (`src/app/globals.css`).
- The `--accent` collision is real: `STATUS_TOKEN["To buy"] === "--accent"` (`src/lib/decks/status-style.ts`).
- `statusPillStyle(status)` takes one argument, so hollow is one more argument and not a branch.
- The pill sits in the tile **footer** on `var(--surface-inset)` (`src/components/decks/deck-card.tsx`), not on art.
  R4's ⚠ — that a `--bg` plate reads as slightly recessed there — is a real measurement to take.
- `refreshCopy.status` is Title case, six strings (`src/lib/copy/refresh.ts`).
- About: `versions` carries 2 keys, `statuses` carries 4 (the template cap), 33 entries,
  `ABOUT_VERSION = 4`.

## Data

10. **The primary mark needs no new query.** `DeckListItem.lastCommittedAt` already ships on both
    list reads via `lastCommittedSql` (`src/lib/decks/read.ts`), and is null exactly when no version exists.
    R4's `versionCount > 0` ask is already satisfied; the plate costs nothing.
11. **The secondary mark is the whole data cost, and gap 2 stands.** There is no
    `hasPendingChanges` on the list read; the draft diff runs on the deck page alone today.
    **The cheap proxy is wrong**: `lastEditedAt > lastCommittedAt` reports a deck as pending for
    ever after a discard, because a discard moves `last_edited_at` by design (pinned by
    `scripts/probe-touched.ts`). Ruled: **a real per-deck diff in the list query**, not a persisted flag — a
    stored boolean is correct only while every draft write path remembers it, and a missed one
    lies silently. Measure it against the route budget once it is in.

## Rulings taken at the audit

- **Both marks ship in one build.** The plate is free and answers the bigger question; the rule is
  the original ask. Splitting them would ship half a vocabulary.
- **The About entry is amended on `versions`, and `ABOUT_VERSION` moves.** Design's addendum
  argued the amendment without a bump. The amendment is right — the marks are a second reading of
  the draft/commit model that entry already teaches, and a 34th entry would split one question
  across two — but the bump is owed: the plate changes what every deck badge means on three
  surfaces, which is a capability change and not a restyle. Entry count stays 33, no `NEW` plate
  is spent, `since` stays `1` on both touched entries. The specimen is the one drawn on `4a`: a
  `Complete` badge in all three readings, with `36 changes since v2` beneath the third.

## Carried out of scope

- **`statusKeylineStyle` is dead code.** Only `src/lib/decks/status-style.test.ts` reads it; no component
  renders a keyline. About's `resume` caption still tells the reader "the keyline on the left is
  the deck's status in the same six colours as its badge", which is describing something the app
  no longer draws. Pre-existing, unrelated to these marks, and worth its own ticket rather than a
  passenger on this one.
- The banner, the commit sheet, the review page, Discard and the game-log stamp stay with
  `design_handoff_the99_deck_versioning/`. This handoff changes nothing in them.

## Measured after the build — one observation for the next design round

The feature shipped across #727, #730, #732 and #733, and the close-out contact sheet
(`docs/superpowers/inventories/deck-state-marks.json`) measured one thing worth handing back to
Design rather than fixing eng-side, because it is a ruling and not a defect.

**The hollow plate is weakest at exactly the two values whose token is already a text colour.**
Measured in the app, on the deck tile:

| Reading | Plate, resolved |
| --- | --- |
| A plan (any status) | `rgb(20, 17, 14)` — `--bg` |
| A deck at `Building` | `srgb(0.173, 0.158, 0.138)` ≈ `rgb(44, 40, 35)` |

That is a near-neutral step of about 39 units on a 0–255 scale. It is a real difference and the
probe asserts it, but against `Building` and `Draft` — the two statuses drawn at 14% and 16% of a
TEXT colour rather than 18% of a signal one — it is the quietest the contrast ever gets, while
against `Over`, `Unresolved`, `To buy` and `Complete` the filled plate carries a hue and the pair
separates easily.

R4's argument for the plate ("filled against hollow separates them at a glance") is therefore
true of four values and marginal on two. Nothing here is drawn wrongly, and no table is
contradicted — this is a note for whoever next opens this handoff, with the figures already taken.

**Also measured, and behaving as drawn:** the edge resolves to `2px rgb(237, 230, 216)` (`--fg`) at
both widths, a plan's bar draws at `opacity: 0.5` where a deck's draws at 1, and the hollow plate
is fully opaque on the mobile spine's wash.

## One consequence of the version bump, for the same reader

`ABOUT_VERSION` moved to 5 in #733, which is what puts `/about` back in front of every account.
`/about` has no "amended" state — `since` is the version an entry FIRST appeared in — so the
returning reader is interrupted and then shown a page with nothing marked. The three ways out are
in that PR's body; the one that needs a drawing is an `amended` treatment, which is Design's.

---

# READINESS — R6, `New` and `Draft` (2026-09-19)

**Verdict: 🟡 Yellow, and READY.** Audited against `main` at `3306ce1a`. Yellow by the legend's
letter — every finding below is an eng-side clarification — and nothing returns to Design. The
drawing is complete and implementable as it stands.

This file was DELETED by the R6 drop and is restored here. It is the eng record of what the R4
build measured, and those measurements are what R5 and R6 are written against.

## What R6 ships

The phase tests FIRST, as two words rather than two marks:

```
built === 0                   → New          (new member)
lastCommittedAt === null      → Draft        (redefined: was 0 matched)
built > bodySize              → Over
built < bodySize              → Building     (now: committed, and short)
unresolvedCount > 0           → Unresolved
not covered, or unfunded > 0  → To buy
otherwise                     → Complete
```

Both R4 marks stay retired. Pending changes gets no mark — confirmed twice, and the detail row's
`1 change since v1` already carries it.

## The one contradiction, and how eng resolves it

**`New`'s cascade test and `New`'s definition disagree, and the definition is right.** R6's
treatment table defines `New` as "0 cards, **never committed**"; its cascade tests `built === 0`
alone, ahead of the version test. A committed deck cut back to zero cards therefore reads `New` —
a deck with a v1, five games logged and a version rail, announcing itself as new.

Build the table's rule: `built === 0 && lastCommittedAt === null → New`. A committed deck emptied
to nothing then falls through to `built < bodySize → Building`, which R6 defines as *committed and
short* — exactly what that deck is. No other value moves.

## Errata — this section governs where it contradicts a document

1. **"Header reads `7 of 7`" does not render on this route.** `/decks` passes
   `footerStatus={false}` to every `FilterPanel` it mounts, so `copy.footerSelected` — the
   `N of N` string — is never drawn there. The same claim was corrected once already in #732.
   Nothing is owed: add the seventh row and no count follows it.
2. **"The count stays at 33"** — `/about` holds **35** entries. Immaterial to R6, which adds and
   removes none, but the figure is wrong in the addendum as written.
3. **Both copy-strings files in this folder describe retired values.**
   `deck-statuses-pending · copy strings.ts` is R4's two marks; `to-build · copy strings.ts` is
   R5's value. R6's copy spec is the prose in `README-r6.md`, and that is what to build from.
4. **R6 ships no per-surface states matrix.** `STATES-to-build.md` is R5's and is banner-marked
   superseded. Acceptable rather than a gap: R6 adds no mark and no new geometry, so `New` and
   `Draft` draw exactly as the six values already do on the tile, the resume row and both spines.
   It does mean the per-surface behaviour is inherited rather than drawn, and the contact sheet
   is what proves it.
5. **"`statusPill()` gains one optional argument" — build it REQUIRED.** R6 prices the phase
   flag as optional, which is the wrong shape for this argument: a call site that omitted it
   would silently get the old five-test cascade, and the deck it would misreport is exactly the
   one this round exists for — a never-committed 99 reading `Complete`. Required makes every
   caller answer at compile time, and there are two. The plan's Task 1.1 carries this.
6. **The facet's row labels are renamed in passing.** R6 names `No version yet` (deleted) and
   `Edited since last version`; what shipped is `Not committed yet` and `Has pending changes`.
   The deletion is structural and is R6's to rule; the surviving row's wording is copy content
   and goes through `/copy-review` rather than back to Design.

## The open call R6 flags, ruled here

R6 overrules the brief's ruling 1: `Draft` now outranks `Over`, `Unresolved` and `To buy` for an
uncommitted deck, so a 104-card idea reads `Draft` rather than `Over`.

**Accepted**, with the measurement R6 did not have. The risk is that the pill stops discriminating
on an account where little is committed:

| Database | Decks with no version | Committed |
| --- | --- | --- |
| `production` | 4 of 8 | 4 |
| `local-dev` | 34 of 34 | 0 |

`local-dev`'s 34 is an artefact of probe fixtures, which never commit. On the real account the
split is even, so the pill keeps its information. The count facts also survive in the detail row
and the unresolved badge, which is what makes the loss a change of emphasis rather than of data.

**This is the product owner's call and it has been made** — the ask that opened this round was "a
draft is a draft, whatever its length". If the split ever moves hard toward uncommitted, the
figure above is the one to re-measure.

## Verified against the code

- `lastCommittedAt` already ships on both list reads (`listDecksWithStats`), so the phase test
  costs no query — the same finding as item 10 above, still true.
- `statusPill()` has exactly two call sites: `read.ts` for the list and `builder-shell.tsx` for
  the deck page. Both can answer the version question — the shell reads `draft.version` and the
  versions rail already.
- `PILL_EXCEPTION` holds `Draft` and `Building` today; R6 moves the dash to `Draft` and returns
  `Building` to the flat rule, so the exception map keeps one member.
- `?status=draft` remains a valid value selecting a different set, so no redirect is owed.

## The close-out walk (2026-09-19)

Both inventories were re-run against the shipped vocabulary. Nothing to fix, and one measurement
worth recording because it is the cost this round accepted, seen live.

**The seven rows draw in cascade order with no footer count**, phase first, at both widths.
**The four words are legible side by side** on `/decks`: `New` with `created today`, `Draft` at
five cards, `Building` on a committed deck of the same length, and `Building` again on the edited
one with `1 change since v1` beneath it. No mark anywhere, on any surface.

**The Draft-dominance figure, on screen.** The Status panel on the dev account reads
`New 3 · Draft 33 · Over 0 · Building 2 · Unresolved 0 · To buy 0 · Complete 0` — 33 of 38 decks
in one value, and the grid behind it is a column of identical `Draft` pills. That is the risk the
verdict named and accepted, and it is worth seeing rather than only reading: on an account where
little is committed the pill carries little, and the detail row does the work.

It remains an artefact of the fixtures rather than a defect — probe decks never commit, and
production is 4 of 8 — but the shape is now on record with a picture behind it. **If the
production split ever moves hard toward uncommitted, this is the measurement to re-take**, and the
question to re-ask is whether `Draft` should yield to a count word once a list is at its body size.

