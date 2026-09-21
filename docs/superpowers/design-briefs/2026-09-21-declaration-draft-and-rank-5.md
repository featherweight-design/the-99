# Round 3 follow-up (R2) — the draft state, and rank 5's mark

**Where:** `design/design_handoff_the99_declaration/` on `main`, with `READINESS-r2-audit.md`
beside it. Round 3's brief is `docs/superpowers/design-briefs/2026-09-20-the-declaration.md`;
the R1 follow-up is `2026-09-21-declaration-drift-addendum.md`, now largely superseded.

**R2 closed R1's Orange.** §2a's five-row shape matrix answers the drift question properly — the
downward move and the single-mark permitted side are both drawn, at both widths. Nothing there
needs revisiting.

**Two items remain, and only the first is a design question about this round.**

---

## §1 A declaration lives on a DRAFT, and the round draws no state for it

The two rulings of 2026-09-21 are each right and produce, together, a state neither anticipated.

*A declaration belongs to a version.* *Analysis runs on the draft, between versions.* The code
does exactly the second: the analysis reads `deck_cards` and the live commander columns, and it
reads the **live declaration** in the same query (`src/lib/profile/load.ts:77`).

So a player declares Core on a draft permitting `1 or 2`, then adds a Game Changer. The draft now
permits `4 or 5`. The declaration is outside it — and **no commit has happened, so there is no
earlier version to compare against.** §E's matrix is keyed on *this version* against *last
version*, and `versionChange.line` takes a previous version NUMBER that has no value here.

This is reachable before any commit on every declared deck, so it is not an edge. The package
states the opposite mechanism outright — *"a re-analysis produces a later version with its own
reading"* — and a re-analysis produces no version at all. The word *draft* appears nowhere in it.

**What to draw:** the block, while the draft reads differently from what is currently declared on
it. Is that the same two-line comparison under a different label, a return to the ask, or nothing
at all? And does *Declared Optimized for this version.* keep that wording on a draft that is not
yet a version?

Both widths, as always. Nothing else about the declaration is open.

---

## §2 Rank 5's mark is rank 4's mark with a 5 in it

Not a question — a reissue. The five marks live with the Round 0 frame, not with this round:
`design/design_handoff_the99_deck_analysis/assets/`. There,
`bracket-5-cedh.svg` and `bracket-4-optimized.svg` are
**byte-identical in every path**; the only differences are the numeral and a kerning nudge on the
text. Ranks 3 and 4 genuinely differ from each other, so this is rank 5 alone.

It matters because Round 2 draws the mark at **22px on a phone** and 28px beside a rung, where
the numeral is small and the silhouette is what a reader recognises. Two brackets sharing one
silhouette makes the mark decorative at exactly the sizes it is meant to carry meaning.

Engineering cannot invent the geometry, so the mark is owed before `BracketMark` is built from
those five files.

---

## §3 Already resolved — no redraw needed

Recorded so they are not re-opened: the lean explains `[4]` rather than `[4,5]` and fires only
when the deck holds a combo; the ask and the lean cannot co-occur; `CardRef` carries no image uri
and must not gain one; the withdrawn *"You said…"* sentence is still live in the copy file and
a `change what you said` control is still drawn on the canvas, both of which engineering will
read past. All are in `READINESS-r2-audit.md`.
