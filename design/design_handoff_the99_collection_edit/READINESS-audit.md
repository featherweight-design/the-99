# Readiness audit — collection edit R1 (sub-projects 1+2)

Eng audit, 2026-10-09. Verdict: **ORANGE** — one substantive design call is still open and
must go back to Hugh before build; everything else is engineering-resolvable or already settled.

## Verified against source of truth

- Brief `docs/superpowers/design-briefs/2026-10-06-collection-foundation.md` (origin/main, already
  carries the 2026-10-09 rulings), plan `docs/superpowers/plans/2026-10-09-collection-write-path.md`,
  roadmap `docs/superpowers/plans/2026-10-06-collection-home-roadmap.md`.
- **PR #1304 is merged** (`gh pr view 1304`: mergedAt 2026-10-09T16:32:53Z). READINESS.md's
  "Blocking #1, PR #1304 unmerged" is stale as of this audit — the brief on `origin/main` already
  reads as the handoff assumed. Not a live blocker.
- One handoff covers sub-projects 1+2 (ruling 12): confirmed, both README and brief agree.
- Every player action is one history entry: confirmed in STATES' Must-nots (B8, C3) and the
  README's "Notes for engineering."
- First import into an empty collection skips Replace/Add (A6): confirmed, matches brief's
  2026-10-09 exception.
- Empty collection offers Add cards beside the upload, both `/collection`'s empty state (B0b) and
  Home's first-run step one (B0c): confirmed at both widths.
- Short-deck warning runs inside the save and names the decks; confirm re-checks (E4–E6): confirmed
  against brief §E and write-path plan Decision 5 (check runs inside the transaction, under the
  lock; a changed answer redraws rather than going through stale).
- A card reduced to zero is removed, not shown as 0 (C8, D): confirmed against write-path plan
  Decision 1 step 5 (zero rows are deleted, never stored at `quantity = 0`).
- Revert links that aged out past 90 days are drawn as absent (F1, README point 8): confirmed.
- Duplicates mean the exact same card, printing and finish (B5, README §B): confirmed, matches
  the brief exactly.
- Switch-off state matches `main` exactly (G): confirmed, no slots reserved for absent controls.
- Surfaces A–G: every state in STATES-collection-edit.md draws at both 390 and desktop unless
  explicitly noted single-width (a handful of in-sheet list states, B2/B3/B4/B5, which is
  reasonable — the sheet's own width/structure is already drawn at both widths in B0/B1).
- The three "Design's call" items the brief delegates (§B desktop sheet shape, §C owning-vs-art
  separation, §F where History lives) are each made and recorded in the README.
- Tokens: every `var(--…)` referenced across the four `.dc.html` canvases exists in
  `src/app/globals.css` (checked by hand — `check:tokens` does not scan `design/`).
- Copy: no em dashes and no British spellings found in the shipped `collectionEditCopy` object or
  the About entries' copy (the one em dash hit is a source-file comment, not a player-facing
  string; the STATES table's `—` cells are "no must-not" placeholders, not copy).
- About entries: all five use valid `chapter`/`width` enum values, 0–4 `keys`, and `since: 12`
  with no immediate `ABOUT_VERSION` bump — correctly deferred per AGENTS.md's batching rule. The
  per-entry template fields (title, route, `opens` where the link doesn't land on the page itself,
  caption, up to four key lines) are all present.

## Findings

1. **[Design, open] The phone-strip trade (README "Open 1" / READINESS "Blocking 2") is
   unresolved.** Taking History as a fourth tab moves the phone's Upload control into the Add
   sheet's first line; the alternative keeps History off the phone strip (reached from Cards) and
   keeps a standalone `↻ Replace` control. Design states a preference (the tab) but has not had
   Hugh's ruling. This is the one item that is "drawn, not decided" rather than "engineering can
   just build it" — it changes what's in the phone tab strip across A, B and F. **Needs Hugh's
   call before build.**

2. **[eng-resolvable] `importCaptionLineSwitches` quotes the wrong apostrophe.** The existing
   `import` entry's caption line in `src/lib/copy/about.ts` reads `…it doesn't add to it.` with a
   straight apostrophe (`'`). The addendum's `about · collection edit entries.ts` quotes the same
   line with a curly apostrophe (`’`) as the lookup key for `captionLineSwitches`. `captionLineSwitches`
   matches by exact literal text (`visible.ts`'s `resolveLine`), so as written this key will never
   match and the stale line will never hide once `COLLECTION_EDIT_ENABLED` is on. Fix: copy the
   literal string from `about.ts`, not a re-typed one.

3. **[eng-resolvable, open] The negated-switch syntax the addendum proposes doesn't exist yet.**
   README "Open 1" asks for a `'!COLLECTION_EDIT_ENABLED'` key in `captionLineSwitches`, but
   `src/lib/about/visible.ts`'s resolver indexes `SWITCHES` directly by the key
   (`SWITCHES[sw](env)`) with no negation handling — passing a `!`-prefixed name today would look
   up a nonexistent switch. Either `visible.ts` needs a negation feature built, or (the addendum's
   own fallback) the line gets rewritten at the bump and the switch-off case is accepted as
   momentarily wrong. This is Hugh's call per the addendum's own "Open," but it's a small, named
   one and doesn't block the rest of R1.

4. **[Plan mismatch] READINESS.md item 4 asks for a measurement the write-path plan doesn't
   contain.** It says the Replace-revert deck-check's latency on a ~4,000-row delta will be
   "measured in the write-path plan (#1300)." The plan's only pre-UI measurement commitment
   (Decision 4, "To measure before the UI PR") is the *score recompute* cost after a one-card
   edit — not the deck-check's latency for a large delta (Decision 5, which the §E long-list rule
   depends on). This isn't blocking — READINESS already flags it "Not blocking" — but the plan as
   approved does not supply what the handoff says it will, and whoever picks up PR 1 of the write
   path should add that measurement rather than assume #1300 already covers it.

5. **[cosmetic, eng-resolvable] Naming drift.** The handoff's "Notes for engineering" calls the
   single write function `applyCollectionDelta` (the brief sketch's name); the approved write-path
   plan names it `applyCollectionChange`. No functional difference — trivial to reconcile when
   implementing.

## Not re-litigated

- READINESS.md's items 5–8 (the `edited` tag needing a ledger-derived read, the 80% overlap
  threshold being a judgement, the reserved/ghosted `From Shopping` tag, and Undo-as-revert being
  one more dialog than a pure undo) are each already correctly self-flagged as non-blocking and
  are not design defects.
- The rename `Replace collection` → `Upload a file` (README "Open 2" / READINESS "Blocking 3") is
  explicitly a copy-review call per the handoff itself, not a Hugh design call, and doesn't gate
  this verdict.
