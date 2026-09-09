# READINESS — Top off the last 31 (Addendum R1)

**Verdict: 🟢 Green.** Buildable as drawn, with two engineering amendments below — one an
arithmetic correction to a number the addendum itself flagged as unmeasured, one a plumbing
detail the addendum's own instruction cannot be satisfied literally. Neither is a design call
and neither returns to Design; both are recorded here for ratification in whatever round
touches this surface next.

`ADDENDUM-READINESS.md` in this folder is Design's self-assessment. This file is the
engineering verdict and is the one that gates the build.

---

## Premises verified against the shipped tree

Every claim the addendum makes about shipped code was checked at `a7036b3`. All ten hold.

| Claim | Where | Result |
|---|---|---|
| The decline is a bare `×`, an 18px slot at desktop and a 36px right-edge column at phone | `top-off-list.tsx:744-759` | ✅ |
| The column header reserves `w-[18px]` for that slot | `top-off-list.tsx:448` | ✅ |
| Synergy is `w-[88px]`, Decks is `w-[52px]` | `top-off-list.tsx:446-447`, `:720`, `:729` | ✅ |
| `list.declineAria` reads `Set {name} aside` and is marked `ENG-INVENTED` | `src/lib/copy/top-off.ts:159-164` | ✅ ratification is verbatim |
| `commit.slotsStayOpen` carries `hidden md:block` and so never reaches a phone | `top-off-list.tsx:597-604` | ✅ |
| `dock.retired` is `order-1 md:hidden` and prints unconditionally at phone | `top-off-list.tsx:532-537` | ✅ demoting it to rung 3 is a real change |
| `list.cap` renders after all rows, guarded on `atCap`, carrying `capLineId` | `top-off-list.tsx:498-506` | ✅ |
| `capLineId` is the `aria-describedby` of every inert tick box | `top-off-list.tsx:662` | ✅ |
| `commit.consequence` prints at zero ticks | `top-off-list.tsx:592-594` | ✅ open item 2 is real |
| Both bulk controls share one `BULK_BUTTON_CLASS`, take no `--danger`, and one `busy` flag disables the pair | `clear-auto.tsx:31-32`, `:57` | ✅ |

The inline-confirm precedent the addendum ratifies also ships as described, in
`game-history-row.tsx:108-132`.

One correction, immaterial to the ruling: the addendum calls the deck row's remove glyph
"byte-identical" to the candidate list's. It is not — the deck row uses `✕` (U+2715,
`decklist-row.tsx:432`) and the candidate list uses `×` (U+00D7). They are visually
confusable at 13px, which is the whole of the argument, so the conclusion stands unchanged.

---

## Amendment 1 — the narrowed figure columns were measured against the wrong string

The addendum's own gap report, item 3, names this as "the thing to check before merging" and
checks `+147`. The string the row actually renders is not a bare figure. `synergyCopy.figure.synergy`
is `` `+${pts} pts` `` (`src/lib/copy/synergy-discovery.ts:54`), so the four-character case on
screen is `+147 pts` — eight characters.

IBM Plex Mono, which `--font-mono` resolves to, has a 0.6em advance width. At the row's
`md:text-[12px]` that is 7.2px per character:

- `+47 pts` — 7 chars, 50.4px, fits the proposed 56px
- `+147 pts` — 8 chars, 57.6px, **over the proposed 56px**

Three-digit synergy is reachable: `synergyPts` is EDHREC's fraction multiplied by 100 and
rounded (`src/app/commanders/[slug]/synergy-read.ts:77`), so the ceiling case `+100 pts` is
the same eight characters. The negative form uses U+2212, which carries the same advance.

**The fix, which preserves every invariant the addendum sets:** Synergy narrows 88 → **60**
rather than 56, and Decks narrows 52 → **36** rather than 40. The Decks column's widest string
is `100%`, four characters at `md:text-[11px]` = 26.4px, so 36px is still comfortable. That
recovers 28 + 16 = 44px against the 42px the decline slot spends, so the name column still
gains its 2px, the parity floor still pays nothing, and the slot count is unchanged at three.

## Amendment 2 — the cap line cannot keep one id in two homes

The addendum instructs that `list.cap` render at both widths, that it move to the pinned bar
at phone and the selection head at desktop, and that `capLineId` must not be dropped from
either — the instruction is explicit that neither home may be `md:hidden`.

Those three cannot all hold as written. The commit bar and the selection head are different
DOM parents, so two homes means two elements, and two elements cannot carry the same id. Giving
each its own id leaves the inert tick boxes describing an element that is `display: none` at
that width, which screen readers do not reliably announce.

**The fix is already this repo's convention.** `src/components/ui/use-min-width.ts` exists for
exactly this call, and its own header comment says so: the choice is made in JS rather than with
a `hidden md:block` pair. The cap line renders once, into whichever home the current width
selects, and keeps its single `capLineId`. Design's intent — the cap is described at both
widths, and the id survives — is satisfied; only the mechanism differs.

---

## Not blocking

- **`commit.nothingTickedAllDeclined` carries an em dash.** This is a copy question, not a
  design one, and goes to `/copy-review` rather than back to Design. The surface already ships
  the same construction in `commit.slotsStayOpen`, so the likely outcome is that it stays.
- **The addendum canvas does not carry the retired `#C9A24B` brass.** Verified: its single
  occurrence of that hex is inside a prose note about the debt, not a value. The locked canvas
  still carries 94 of them, and the addendum's request to fold this folder into
  `design_handoff_the99_appshell/`'s existing rebase pass rather than give it its own is the
  right call.
- **Open items 2, 4, 5, 6, 7 and 8** in the addendum's gap report are all accepted as stated.
  Item 5 in particular — that a server-side inverse mutation making keep-all undoable would
  retire the confirm entirely — is the better fix and should be what a future round wants if
  the confirm proves irritating.

## Scope this unblocks

Eleven new copy keys, two edits, three ratifications. Touches `top-off-list.tsx`,
`clear-auto.tsx`, `src/lib/copy/top-off.ts` and `src/lib/copy/recommendations.ts`.

It answers #478 outright and pre-ratifies the confirm that #476 asks for, so two of the four
issues filed at the close of the #360 run are unblocked. It also settles five items that were
recorded in the tracker as deliberately unfiled: the undrawn decline trigger, the undrawn
all-declined state, the missing 390px short form for the door note, `commit.slotsStayOpen`
never reaching a phone, and `list.cap` explaining a cap 167 rows from where it is disobeyed.
