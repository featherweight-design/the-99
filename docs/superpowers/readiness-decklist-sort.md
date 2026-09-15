# READINESS — Ordering the deck list (handoff R1)

**Verdict: 🟢 Green.** Build starts now. Two calls are open and neither blocks: both are Hugh's,
both are one string or one decision wide, and R1 draws a shippable answer to each.

- **Handoff:** `design/design_handoff_the99_decklist_sort/` (R1, 2026-09-14)
- **Brief:** `docs/superpowers/design-briefs/2026-09-14-ordering-the-deck-list.md` (PR #631)
- **Audited:** 2026-09-14 against `origin/main` at `0e008f2b`
- **Design self-assessment:** 🟢 Green with one copy call and one figure to re-measure. **Upheld.**

## What was checked, and against what

Every load-bearing claim was read against the shipped tree rather than taken on trust. R1's own
numbers hold up unusually well — two of the three I expected to be approximations were exact.

| Claim | Source | Result |
|---|---|---|
| The spacer is `flex-1` with no minimum | `group-toggle.tsx:139` | **Exact.** `<span className="flex-1" aria-hidden />` |
| `clear-auto.tsx` already wraps the bulk pair as one child, for this reason | `clear-auto.tsx:113-119` | **True**, and the quoted comment is verbatim |
| The view well is 70×36 desktop / 94×48 phone | `view-toggle.tsx:48,67-70` | **Exact.** `p-[2px]` + `gap-[2px]` + 2×32 = 70×36; 2×44 = 94×48 |
| `renderFooter` returns null for single-select on desktop | `filter-panel.tsx:744` | **True** |
| `leadingGlyph` exists and exactly one mount uses it | `filter-panel.tsx:61,571`, `filter-bar.tsx:439` | **True** |
| Page scroll dismisses and returns focus **without** scrolling the trigger back | `filter-panel.tsx:308` | **True.** `close({ preventScroll: true })` on the capture-phase scroll listener |
| The accessible name carries the whole order despite the dropped prefix | `filter-panel.tsx:861-886` | **True**, and this is the finding I went looking for and did not find. Under single-select with a hint, `oneName` composes `"Name · A–Z"`, so the trigger announces `Sort the deck list, Name · A–Z, collapsed`. Decision 7's claim is exact |
| Finding 1 — the permanent accent border | `filter-panel.tsx:930-931` | **Real.** `selected.length > 0` is unconditional under single-select |
| Finding 2 — the sheet badge reading `1` | `filter-panel.tsx:1010-1013` | **Real**, same condition |
| `the99:deck-view` is one key for every deck | `group-toggle.tsx:16` | **True**, and the quoted reasoning is verbatim |
| `price.ts:168-190` ships fail-quiet ranking | `price.ts` | **True** — PR #629, no live figure sorts last and equal, name then id |

## The two findings in `filter-panel.tsx` are real, and worth taking

Both are live on `/collection` today and neither is introduced by this mount. Both are one-line
fixes conditioning the branch on `selectionMode === "multi"`, and both improve `/collection`:
an always-lit accent border there distinguishes `Sort` from nothing and reads as a filter that is
on, and a badge counting a single-select's one selection counts nothing.

They belong in this build rather than in a follow-up, because this row has a **stated rule about
accent** that the borrowed branch breaks on arrival: *"No accent fill anywhere on the builder's
control bar: selection here is said with the bone-on-elevated skin, never with a coloured ground"*
(`group-toggle.tsx:105-110`). Shipping the mount without the fix ships a control that contradicts
the comment two lines above it.

Finding 3 — the trigger at 36px beside a 38px well — is **accepted as drawn**, and R1 is right
that the row already mixes 27px pills with a 38px well under `items-center`.

## Errata — carried here, and these win over the handoff

Five. None blocking; all of them things an implementer would otherwise copy forward.

1. **The draft note is quoted with its pre-#631 wording.** R1's README says the slot holds
   `n of these are not in vN yet`. The shipped string is `n of these differ from vN`
   (`deck-versioning.ts:104-105`). This is my error reaching Design, not theirs: the handoff prompt
   carried the stale form, and the brief was corrected in review after the prompt was written.
   Nothing measured depends on it — both notes are desktop-only.
2. **`STATES-decklist-sort.md:47` still carries the superseded desktop figure.** It reads
   *"Desktop widest state (D1) is 953 of 1008"*, which README and READINESS both correct to
   **1006 of 1008 — 2px spare**. The states file is the document an implementer reads while
   building, so the dead figure is the dangerous copy of the two. **1006 is the figure of record.**
3. **The 390px arithmetic uses 96 for the view well; the shipped component computes 94.** Two
   pixels, in the direction of safety, inside a budget argued off 13. The arrangement line is
   343 of 358, not 345.
4. **Cluster 2 is one child only when the note is the KEPT note.** `clear-auto.tsx` wraps the kept
   note with the bulk pair, but the *draft* note is a separate flex child of the toolbar
   (`group-toggle.tsx:149-153`), at 11.5px rather than 11px, and it brings its own 10px gap. R1's
   cluster table lists "note" inside cluster 2 without that distinction.
5. **README's decision list runs 1–14, then 16, then 15.** Cosmetic; the content is unaffected.

## The measurement eng must take before believing the desktop line

R1 measured D1 — `All`, auto cluster present, **kept** note — at 1006 of 1008. Erratum 4 is why
that is not necessarily the tightest state: with a *draft* note the row carries one more flex child
and one more 10px gap, at a slightly larger type size, and the margin being defended is two pixels.

**Measure the draft-note variant in a browser before the PR closes**, and if it wraps, spend one of
the two fallbacks R1 already names (`By role`'s idle `px-[6px]` → 0 at phone for 12px; the desktop
`md:` gap 10 → 9 for 5px). Both are one token. The 390px arrangement line wants the same treatment
— R1 says so itself, its three governing widths being computed from the type stack rather than read
off a render.

This is an eng task, not a redraw: the fallbacks are chosen, the order to spend them in is stated,
and either outcome ships the same drawing.

## Open for Hugh — two calls, neither blocking

**1. The mana-value labels.** R1 draws `Curve up` / `Curve down` and asks for a second opinion,
having watched its own first argument dissolve: the pair was chosen to avoid colliding with the
shipped `Cheapest to cast`, and then `Price` lost its money words to `Lowest` / `Highest`, so the
collision went away. What remains in favour is that it abbreviates a sentence this same deck
already shows on its diff. What is against it is that *up* means *cheap first* only once you know
the curve chart's axis. The live alternative is the shipped `Cheapest to cast`, whose blocker is
its reverse — `Dearest to cast` is the word just retired for being British, `Priciest to cast` is a
coinage.

**2. The Ascending / Descending menu group.** A comparable control puts three keys, a divider, then
a checked direction pair in one menu. Taking it reopens **two** locked decisions at once — §2.2
(direction is re-pick, no new affordance) and §2.3 (each key names its own two directions) — in a
component `/collection` shares, and collapses six labels to two. R1 draws the ruled shape and
argues the alternative in its §6b rather than quietly taking it, which is the right call for a
handoff to have made.

Neither answer changes the build's shape: (1) is one string pair in the copy block, (2) would be a
redraw and a brief amendment if taken.

## What this hands engineering

One mount of `FilterPanel` with four props, one copy block with three pure helpers, **one
structural change** to `group-toggle.tsx` (the three arrangement children into one `flex-none`
wrapper, plus the desktop hairline), and **two one-line fixes** in `filter-panel.tsx`.

Not costed by Design, and correctly so: the sort itself. `grouping.ts:210`/`:227` sorts
alphabetically inside each group and `decklist.tsx:366` sorts by price; making those take a key and
a direction is eng's call on shape. Design's only constraint is that the order applies **within**
the groups, never across them.
