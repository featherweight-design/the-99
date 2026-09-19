# Plan — `New` and `Draft`: the phase tests first

**Handoff:** `design/design_handoff_the99_deck_statuses_pending/` (R6) · **Verdict:** 🟡 Yellow and
ready, in that folder's `READINESS.md`. The verdict's errata section governs where it contradicts a
document.

**This round replaces what #730 shipped.** Both deck-state marks are retired. The phase becomes two
WORDS at the top of the status cascade, because a mark with no word anywhere is a signal the
product owner could not read — and the plate measured ~39 near-neutral units at `Building`, the
commonest work-in-progress deck.

```
built === 0 && lastCommittedAt === null   → New        (per the verdict, not R6's looser snippet)
lastCommittedAt === null                  → Draft      (redefined: was 0 matched)
built > bodySize                          → Over
built < bodySize                          → Building   (now: committed, and short)
unresolvedCount > 0                       → Unresolved
not covered, or unfunded > 0              → To buy
otherwise                                 → Complete
```

**Two PRs.** The vocabulary is one atomic change — a pill, a cascade, a facet and the copy that
names them cannot land apart without a build in between that lies about a deck. The About
correction is severable and is the smaller half.

| PR | What | Files (est.) |
| --- | --- | --- |
| 1 | The cascade, the treatments, the facet, and the retirement of both marks | 16 |
| 2 | The About entries, and the acceptance walk | 6 |

---

## PR 1 — The vocabulary

### Task 1.1 — `statusPill()` takes the phase, and cannot be asked without it

`src/lib/decks/status.ts`. Two new tests ahead of the five, per the cascade above.

**`hasVersion` is REQUIRED, not optional.** R6 prices it as "one optional argument"; optional is
the wrong shape here. A caller that forgets it would get the old cascade silently, which is a
deck reading `Complete` when it has never been committed — the exact defect this round exists to
end. Required makes every call site answer at compile time, and there are only two.

The docstring's table is the vocabulary's source of truth and is rewritten whole: seven values,
the phase tests first, and `Building` restated as *committed and short* rather than the catch-all
it has been.

### Task 1.2 — `StatusPill`, the copy, and the order

- `src/lib/decks/status.ts`: the union gains `New`.
- `src/lib/copy/refresh.ts`: `status` gains `new: 'New'` ABOVE `draft`, in cascade order — the
  object is read top-to-bottom by anyone learning the vocabulary.
- `src/lib/decks/filter.ts`: `STATUS_ORDER` gains `New` at the head. That list serialises
  `?status=`, so its order is the column's order and the URL's canonical order at once.

### Task 1.3 — The treatments

`src/lib/decks/status-style.ts`.

- `STATUS_TOKEN` gains `New: "--fg-faint"`; `Building` moves to `--fg`.
- `PILL_EXCEPTION` keeps exactly one member: `Draft` at 14% with the **dashed** border.
  `Building`'s exception is deleted — it takes the flat 18% rule.
- **`New` is drawn at 16% of `--fg-faint` with a `--fg-muted` label and a solid edge**, which is
  the exception `Draft` used to hold. Since only `Draft` keeps an exception entry, `New`'s alphas
  are its own row in the map rather than an inherited default — state it explicitly or the flat
  rule will give it 18% and the wrong label.
- **Delete `DeckStateMarks`, the `hollow`/`pending` arguments, and `statusBarStyle`'s
  `provisional`.** Every mark from #730 goes with them.

### Task 1.4 — The surfaces stop drawing marks

`status-pill.tsx` (drop `hollow`, `pending`, `announceMark` and the `sr-only` span),
`deck-card.tsx`, `resume-decks.tsx`, `spine-desktop.tsx`, `spine-mobile.tsx`,
`builder-spine.tsx`, `builder-shell.tsx`.

- The deck page's phase LINE (`data-deck-phase`, `Not committed yet` under the bar) goes: the pill
  now says it in a word, and two statements of one fact is what the round is removing.
- `builder-shell.tsx` passes `hasVersion` to `statusPill()` — it has `draft.version` and the
  versions rail already.
- **KEEP the detail-row change figure** (`1 change since v1`). Ruling 4 is confirmed twice: the
  pending fact gets no mark, and that figure is how it is stated.

### Task 1.5 — The list read

`src/lib/decks/read.ts` passes `hasVersion: row.lastCommittedAt !== null` into `statusPill()`.
No query moves: `lastCommittedAt` already ships on both list reads, which is why the phase costs
nothing.

### Task 1.6 — The facet

`src/lib/decks/filter.ts`, `deck-filter-column.tsx`, `decks-view.tsx`, `deck-filter-sheet.tsx`.

- Status grows to seven rows in cascade order. **No footer count follows it** — `/decks` passes
  `footerStatus={false}`, so the `N of N` string R6 names is never drawn on this route.
- `Deck state` drops to ONE row. `uncommitted` leaves `STATE_ORDER` and `DeckState`; ticking
  `New` + `Draft` in Status is that filter exactly, and a facet duplicating two status rows is a
  control that can only disagree with them.
- A stale `?state=uncommitted` is dropped by `readList` as an unknown value, so no migration is
  owed. `?status=draft` stays valid and selects a different set — stated in the PR body rather
  than discovered.
- The surviving row's label is `Edited since last version` (`/copy-review`, not Design).

### Task 1.7 — Tests, and the mutations that prove them

`status.test.ts`, `status-style.test.ts`, `filter.test.ts`, `deck-card.test.tsx`,
`resume-decks.test.tsx`, `builder-spine.test.tsx`, `decks-view.test.tsx`, `deck-filters.test.ts`.

Cases that must exist, each named for the defect it catches:

- A 99-card, fully-owned, never-committed deck reads **`Draft`**, not `Complete`.
- A 104-card never-committed deck reads **`Draft`**, not `Over` — the overrule, pinned.
- A committed deck cut to **zero** cards reads `Building`, not `New` — the verdict's contradiction.
- An empty never-committed deck reads `New`.
- A committed deck at each of the five count states reads exactly what it reads today.
- `Draft` is the only value carrying a dashed edge; `Building` carries the flat rule.

Mutation-check each: revert, confirm red, restore. **Restore from a scratchpad copy, never
`git checkout`.**

### Task 1.8 — The probe

`scripts/probe-deck-state-marks.mjs` is rewritten as the seven-plate check rather than deleted —
it already signs in, builds fixtures and reads resolved styles.

- **No mark anywhere**: no chip on any surface draws a `2px` left border, and no bar draws
  `opacity: 0.5`. A build that left one behind fails.
- The seven plates' resolved fills and labels at both widths, `Draft` dashed and alone in that.
- `New` against `Draft` in greyscale — the dash is what separates them, so it is what to assert.
- The wide chassis row still does not wrap with the Status panel a row taller.

Rename to `probe:deck-statuses` and update `package.json`, the inventories and `AGENTS.md`.

---

## PR 2 — About, and the acceptance walk

### Task 2.1 — The entries

`src/lib/copy/about.ts`, per `ADDENDUM-about-new-and-draft.md`:

- `versions` key 3 becomes the `Draft` sentence. Still three keys.
- `statuses` loses the caption sentence added in #733 and returns to its shipped caption, keeping
  its four keys.
- **`ABOUT_VERSION` does NOT move**, and the hash is re-pinned at 5. This is a correction of a
  page two days old, not news; a second interruption inside a week teaches nobody anything. The
  entry count is unchanged at 35 — R6 says 33, which was wrong before this round and is errata.

### Task 2.2 — The figure

`src/components/about/figures.tsx`: the three-reading `StateMark` rows go with the marks they
drew. The `versions` legend returns to its three rows.

### Task 2.3 — The walk

Re-run `docs/superpowers/inventories/deck-state-marks.json` and `deck-state-facet.json` against
the new vocabulary, and correct both — the marks inventory is named for a feature that no longer
exists. Its `/about` precondition stands and is why the first walk photographed `/about` in every
cell.

---

## Not in scope

- The pending-changes data: the count, the version number and the gated read are built, proven and
  untouched.
- `/about`'s missing *amended* state, which is why a corrected entry cannot be announced without
  interrupting every account. Design's, and unresolved.
