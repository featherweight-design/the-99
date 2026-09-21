# Readiness audit — the declaration, R7 (Round 3 of 5)

**Verdict: 🟡 Yellow.** Audited 2026-09-21 against `main`. **R7 answers all three of the R3
audit's Design items**, and answers them well. Yellow because every item the last two audits asked
engineering to read off the code is still in the package saying the opposite, one new card draws a
sentence its own reading cannot produce, and the chip rule is contradicted by its only asset.

## The three items

**1 · The precedence ruling is drawn (§3c) — ANSWERED.** *When both readings are true, the version
row wins.* Drawn as a struck "not this" card beside the ruled one, at both widths, with the test
stated identically in three places — the handoff, the state matrix and the copy file's own comment.
*Stated, not deleted* survives, because the row is the statement.

**2 · The single-bracket draft is drawn — ANSWERED.** Both widths, in the order mark → reading →
lean → superseded line, with no chips. (Its sentence is wrong — see below — but the composition
that was asked for is there.)

**3 · §3b's ranks 1 and 2 — ANSWERED, and the correction is right.** Rank 1 draws one path, rank 2
draws two, neither carries a tick, and the ticks arrive at rank 3. Verified against the files.

## A finding of mine, withdrawn

**The chip collision is two wide, not three.** My R3 audit read it against R6's rule — *sheds the
mid ring and the ornaments* — under which 1, 2 and 3 all reduce to the bare inner diamond. R7
rewrote the rule: *sheds the mid ring, and each rank keeps its own distinguisher at a heavier
weight.* Under that, rank 3 keeps its ticks and the collision is 1-vs-2. Design is right and the
finding is withdrawn.

**But the rule is under-specified, and its own asset disproves it.** The one shipped chip —
rank 5's — is two paths: it sheds the mid ring **and the four ticks**. Read literally, §3b's
sentence gives rank 5 six. What actually ships is *keep only the newest ornament*, which is nowhere
stated. Two consequences: **rank 4's chip is undefined** (ticks, per the sentence, or studs alone,
per the example — and either way ranks 3 and 4 both put four marks at the cardinal points, which is
the same legibility question the 1-vs-2 collision asks and is unasked), and **ranks 1–4 have no
chip assets at all**, so a 22px mark is derived from prose whose only worked example contradicts it.

Minor, same area: the chip file keeps a 17px numeral while the README argues the silhouettes carry
the meaning at 22px *"where the numeral is already gone"*. Both cannot be true of that file.

## One new Design item

**§3a's single-bracket card draws a sentence its reading cannot produce.** The card reads `[4]` and
says *"It leans Optimized rather than cEDH: … and nothing here tutors both halves."* Three things
are wrong at once: the lean never chooses between 4 and 5; *nothing tutors both halves* is the
`drawOnly` reason, whose verdict is `[3]`; and the control reads `why` where the copy file gives
`see the reasoning`. **The question:** is the card meant to be `[4]` with a reachable lean, or
`[3]` with a draw-only one? The composition ruling holds either way.

## Carried, and still not applied

Each is settled by reading the code; `STATES` and the copy file are authoritative per Design's own
precedence convention.

- **The skip, for the fourth round running** — in the handoff twice (the ask row still specifies a
  text-weight control; a build guardrail still says not to re-ask after one), in the README three
  times, in READINESS three times, and in a live canvas annotation. The README even instructs
  clicking a control that appears nowhere in the canvas. `STATES` is clean. There is no skip.
- **The lean's verdict is still `[4,5]`** where the code resolves it to `[4]`.
- **The lean's third precondition is still missing** in all three files that state it. It needs the
  deck to hold combos, so a `[3]` or `[4]` deck with none draws no lean.
- **`CardRef` image uris** are still instructed in the README and listed as a data dependency,
  while the same READINESS file withdraws them.
- **Six em dashes** in shipping strings.
- **The handoff withdraws R5's mechanism sentence and then restates it** twelve lines later as
  current guidance.
- **`versionChange` still calls the draft "this version".**
- **The command-zone `found by` reading** is still absent.

## Two things the package bills that already shipped

Both landed in #792 and can come off the engineering list: the receipts arrive keyed per combo
piece (the README still calls this *"the one data-shape change this round adds"*), and
`lean.decidedBy` names which combo decided the verdict — which is also the rule §D needs for
choosing what the modal draws, so it is recorded rather than designed.

## A timing note, not an error

READINESS argues for an in-flight reading on the grounds that a declaration busts the profile
cache. **That is true on `main` today and stops being true when #797 lands** — after it, the
declaration is handed to the verdict at the draw and the cached profile survives the write. Re-decide
whether an in-flight state is owed once that merges, rather than drawing one for a cost being
removed.

## Two smaller corrections for the build

- §3c draws the version sentence in the opposite order to the copy file. The copy file wins.
- The version row's date has no copy string and no stated source. `deck_versions.committed_at` is
  the source; the format is undrawn.
- `bracketFace()` returns `"4 Optimized"` and claims every verdict face draws both. Round 3 rules
  names alone. Do not reach for it when building the face.

## Coverage

Both widths for the ask, the five sub-line readings, the lean, drift's four shapes, the draft
out-of-range state, the single-bracket draft, the precedence ruling, and the mark set at 40/28/22.

Prose only: the reasoning modal at 390, the `drawOnly` modal body, the command-zone reading, chip
forms for ranks 1–4, and every in-flight or failed reading for the write — see the timing note.

Housekeeping, stale for the third round: the handoff still says the canvas is *sections 1a–1f*
(it is 1a–1f, 2a, 3a, 3b, 3c), and two of the three files still carry an R6 version header while
the README narrates none of R7's changes.

## Notes for the plan

- **The migration is still the one genuinely new schema item**, and it lands ahead of any UI:
  `deck_versions.declared_bracket` with the same 1–5 check, **plus the version's `permits`
  snapshot**, both copied at commit only when the declaration is inside that version's permits.
  Without the snapshot the version comparison costs a second profile build per load.
- **Drop from the plan:** the skip, the receipts reshape, the `CardRef` image-uri change.
- **Sequence against #797** — it changes `slotDeck`'s signature and takes the declaration off the
  profile and the fingerprint. Land it first, or write the call site to the new shape.
- `declaredOutsidePermits` still carries two meanings — the draft comparison and the version
  observation. It needs to name which, or go.
