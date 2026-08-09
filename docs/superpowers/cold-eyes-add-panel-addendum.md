# Cold-eyes review — Add panel addendum (#158 addendum)

Fired after the five build PRs merged (#202, #204, #205, #206 and #201), the point at which the
whole Add-panel vertical is reachable end to end: `/decks/:id` → coverage strip → a cell →
Consider → a shelf → Add.

## Capture — a real screenshot reel this time

The deck-import review recorded "no screenshot sweep possible" as a real gap. It is now closed.
`scripts/audit-sweep.mjs` ships in this PR: it signs a real session in through `window.Clerk`,
walks a route manifest at 390×844 and 1280×900, and writes a full-page screenshot plus an
overflow report per route × viewport under `audit-output/<runId>/`.

Nine routes captured, both widths, 18 screenshots. Two findings from the heuristic half:

| Route | Width | Hits | Verdict |
|---|---|---|---|
| collection | phone | 11 | Out of scope — the filter toolbar is a deliberate horizontal scroller, which the heuristic cannot tell from a leak. Worth a look on its own. |
| commanders | desktop | 50 | False positive — clipped single digits in `font-display`, a glyph-height artifact. |
| every builder route | both | 0 | Clean. |

The credential path was the one real obstacle: `.env`'s `E2E_AUDIT_USER_*` values belong to a
different project and match no user in this Clerk instance. The instance does hold
`alpha-test+clerk_test@the99.app`, which signs in by fixed test code rather than by password,
so the script now treats the password as optional and takes the code path. Documented in its
header.

## The critic's findings, verified one by one

A subagent was given the reel, the handoff, the locked vocabulary and the voice rules, and
nothing else — no plan, no diffs, no PR bodies. Fifteen ranked findings came back.

| # | Finding | Verdict |
|---|---|---|
| 1 | Home's "MOST COMPLETE DECK" shows a commander and reads `3/259` while the deck list says `0/99` | **Real — out of scope, escalated** |
| 2 | Two under-target cells show a bare `—` while the hint promises "A cell under target opens its shelf below" | **Real — now closed in full.** The cell stopped being a control in #207; the hint is deleted here (see below) |
| 3 | "Owned only" is on while five unowned cards render | Not a defect — the #176 ruling, and the toolbar's split provenance line says so |
| 4 | The onboarding card restates the header's count and commander | **Real — out of scope, escalated** |
| 5 | The worked-example callout hardcodes "a deck sitting at 8" against a deck at 0 | **Real — escalated.** Already on the follow-up list |
| 6 | Export is desktop-only | False positive — the phone Export is `md:hidden` on the active branch; only the *disabled* empty-deck variant is desktop-only |
| 7 | Em-dashes in the rationale bodies | Rejected with the lock named — `decks-builder.ts:95-99` records these as quoted, not authored, and says they must not be "fixed" |
| 8 | The empty state restates what is visible three times over | **Real — out of scope, escalated** |
| 9 | "Golgari only" has no affordance | **Real — out of scope, escalated** |
| 10 | `buy` needs a word of consequence | Escalated — a Design call. (The copy lock cited here was lifted the same day; the copy pass still left it, because what it wants is an affordance, not a better word) |
| 11 | Tiles repeat "Fills ramp · rec 10" under a heading that said it | **Real — escalated.** `suggest.ts:95` composes it; the shelf heading above already carries both figures |
| 12 | Card names truncate at 390px | Not a defect — a deliberate two-line clamp, documented at `suggestion-tile.tsx:242-246`, and the full name is one tap away |
| 13 | `0 to buy` / `0 cards built` teach nothing | Escalated |
| 14 | No exit from import | False positive — the app shell wraps every route |
| 15 | Small tap targets on `consider →` | False positive — the whole 62px cell is the control after #184; the caption is inside it |

Ten of the fifteen are real; only one is inside this epic's scope, and it is fixed below. That
ratio is the honest cost of a cold reviewer: it sees the whole app, not the ticket.

## What this PR fixes

**The dead shelf link.** `buildShelves` drops a role shelf with no *owned* suggestions, while
the coverage strip made every *short* cell a control. A deck short of removal with nothing owned
to offer therefore drew a button that switched tabs and scrolled nowhere — silently, because
`scrollToShelf` no-ops on a missing element. `rolesWithShelves` is now exported from the panel,
computed once in the shell, and the cell's `onSeeShelf` is gated on it. A short cell with no
shelf falls back to the same figure a met cell uses.

This is finding 2's first half. Its second half — that the desktop hint now over-promises for
those cells — is copy, and the addendum's copy file is locked. It goes to Design. *(Historical.
The lock was lifted the same day and the hint was deleted rather than reworded; the postscript
below is what actually happened.)*

## Postscript, 2026-08-08 — finding 2's second half, closed

Hugh ruled that copy is `copy-review`'s to decide rather than Design's, which released the lock
on `strip.hint`. A copy pass over the eleven escalated findings then resolved it by deletion
rather than rewording: an openable cell prints `consider →` in brass and an inert one prints an
aria-hidden dash, so the control already labels itself at both widths. The hint was a
desktop-only generalisation over a set the cells no longer all belong to. Deleted, with design
table rows E9 and S16 superseded.

Four of the other escalated findings were **withdrawn on inspection**, which is worth recording
because each looked solid from the reel alone:

- **5** — `mix.ts:83-87` already documents this string as deliberately hypothetical; it was
  de-personalised once before, and interpolating it would reintroduce the bug that comment
  describes.
- **8** — the Consider empty state is the only thing on screen besides three decorative
  diamonds. Nothing restates anything.
- **13** — half of it is real and fixed here (the spine caption is gated on `built > 0`); the
  `/decks` half has its own empty state and never renders at zero.
- The `#E0913C` token drift named alongside these is the repo-wide convention, in ~30 places
  across 15 files, not drift in two.

**1** and **4** are home-surface defects and are fixed in their own PR: the hero is labelled
"Most complete deck" but renders a *commander's* EDHREC coverage, and the "Recommended" header
below it has no content at all.
