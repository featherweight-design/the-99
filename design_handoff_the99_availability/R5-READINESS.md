# READINESS — Card availability (#43), R5

**Verdict: 🟢 Green.** All ten §*Resolved engineering-side* items are answered — items 2, 8, 9 and
11 in R4, items 1, 3, 4, 5, 6 and 10 here — plus the pip-ring follow-up and item 4's expansion.
**No decision is waiting on anyone.** #43 closes.

R4's blocker is closed by reading the doc at `origin/main`. No canvas is edited, no file replaced,
no copy file touched.

## What lands

| Item | Answer |
|---|---|
| **1** | Behaviour ratified. **§6's rule sentence changes** — a deck's own copies count for neither side of the sum. The withdrawn flag stays withdrawn, and `free === 0` self-excluded means "enough for everyone", so `none free` there would be *false*, not merely unreachable. |
| **3** | **Omission ratified.** Don't widen `hardDeckNames` — the clause already carries the severity. §3's drawing is recorded stale; amend the design table's card-detail row. |
| **4** | **Shipped denominator ratified.** The `1,418` captions are a fixture artefact in three places. Menu counts and denominator are different bases by design; if ever unified, move the denominator's base. |
| **5** | **Extension ratified**, with the seam named once: *the vantage point is the deck you are editing, not the surface you are looking at.* `deckId` on `searchCards` is that sentence in code. |
| **6** | **Qualify the callout** as the off-decklist case, and promote the never-recompute warning above the formula. |
| **10** | **Accepted truncation ratified.** No character budget. The clipping half is the non-load-bearing half, and the over state always has the roll-up above it. |
| **11 follow-up** | **Both shadows coexist, unconditionally** — outset first in `var(--pip-ring)`, inset unchanged. The ring gates itself; no four-plus switch, no sibling-aware primitive. |
| **2 + expansion** | **Two count-only siblings, structure ratified**, wording eng-side. Same suffix for both. |

## Withdrawn

- **`R4 · copy diff.ts`** — item 8's sweep already ships with the ratified wording, so the patch
  targets strings that no longer exist in that form. Left in place, marked dead. Items 8 and 9 are
  eng-owned; acknowledged.
- **R4's proposed `overAriaCountOnly` string.** The structural ask stands; the phrasing was not
  Design's to write.
- **R4's rationale for the outset pip ring** (`--b` against the surface). The ring is ratified as
  drawn; the reason is replaced by R5 §1 — a row-coloured ring cannot separate a pip from the row,
  and the shipped inset rim already does that job. Written before `rows-view.tsx` was readable. **R5
  governs where the two disagree**; the 1px is unchanged.

## Corrections to R4, on the record

- **`ADDENDUM-2-READINESS.md` exists** and has since the addendum-2 round. R4 reported it absent
  from this project's tree, which was true of the tree and false of the repo — the wrong conclusion
  to draw from a truncated checkout. Read directly from `origin/main` this pass.
- **The local working tree is still one file** (`src/components/shell/nav.tsx`), so every source
  claim in R5 is cited to the repo rather than the checkout. Worth resolving before R6: two of the
  last three passes have spent a round on something already shipped.
- **Future passes are new files only.** R5 adds three; nothing existing is edited or replaced.

## Open, non-blocking — carried forward unchanged

Addendum 2's gaps §1–§8 and R1's §10/§11 stand as written; nothing in this pass touches them.
Two notes added:

- **The `--pip-ring` hover plumbing is the single failure mode in item 11.** A hard-coded
  `--surface` looks correct at rest and shows a hairline on hover at four-plus pips — worth one
  glance in review rather than a comment in the code.
- **Menu counts vs. the result denominator use different bases in one screen** (item 4). Honest and
  individually right; recorded so a future "share this view" or export pass doesn't discover it as a
  bug.

## Unchanged and still verified

Silence end to end · nothing blocked · nothing asserting physical location · one status vocabulary ·
AA without colour · zero net motion · no new dependency · no new tokens or hues · no grid changes
(item 11's shingle takes no width the row didn't already have).

R2's decision 5, R3's self-exclusion rule and the Gap §2 resolution stand as written. Item 5
generalises §6's scope; it does not reopen it.
