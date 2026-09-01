# Journey lifecycle — Card availability (#43)

Gate 5 of the epic-run, fired the moment Journey A became reachable end to end: PR #226
mounted the marker on the decklist row, both comboboxes and the Consider tile, and there is
no flag in front of it, so that merge is what turned the vertical on. Run mid-epic rather
than at the end, which is the whole point of the gate — Tasks 5–10 are still unbuilt and
can be amended against what this found.

Run against **local dev**, not staging. This repo has no `apps/e2e` audit sweep against a
seeded staging database, so the capture is the documented Playwright fallback: a throwaway
script signing in through `window.Clerk` with a `+clerk_test` address on the public root
page. Both viewports (1280×900, 390×844). Screenshots landed in `audit-output/` and are not
committed.

Local dev is the *fastest* environment this app runs in, which is what makes the mutation
feedback sub-check below meaningful: a gap visible here is worse everywhere else.

## Fixture

Four decks on the Neon local-dev branch, owned by the unattended sign-in's user, shaped to
the briefing's walk script:

| Deck | Size | Why it exists |
|---|---|---|
| Atraxa Superfriends | 99 | mature, so its claims are **hard** |
| Korvold Treasure Sacrifice Value Engine | 99 | mature, and a deliberately long name for the truncation case |
| Kitchen table brew | 40 | the deck under test; its own claims are self-excluded |
| Weekend jank | 13 | immature, so its claims are **soft** |

State distribution on the brew: **31 silent, 6 over, 3 soft**. That satisfies the briefing's
smoke signal — at least three of five rows carry no marker — and it is the check that says
the feature loaded rather than that it did nothing.

## Journey A — the brew decklist

| Pass | Result |
|---|---|
| Forward | ✅ |
| Reverse | ✅ |
| Repeat | ✅ |
| Resume | ✅ |
| Mutation feedback | ✅ 71 ms under 400 ms latency |

- **Forward** ✅ — searching `Accursed Centaur` in the add panel draws
  `×1 owned · 0 free — in Atraxa Superfriends`; adding it moves the row to
  `short 1 — also in Atraxa Superfriends`. No confirmation dialog fires. A `page.on("dialog")`
  listener was armed for the whole walk precisely to catch #140's refusal pattern
  reappearing, and it never fired, which is the ruled behaviour: availability annotates, it
  never forbids.
- **Reverse** ✅ — removing the card returns the panel row to `0 free — in Atraxa Superfriends`,
  the pre-action string exactly. Not a hollow state: the figure went back to what it was,
  not to blank.
- **Repeat** ✅ — add → remove → add again produced byte-identical marker text on both
  passes. Nothing about the marker is keyed to a dismissal, a "seen" flag or localStorage,
  so the #70 failure class has no surface here to attach to.
- **Resume** ✅ — a full reload holds `short 1 — also in`, `1 in a brew`,
  `short 2 — 2 decks want it`. Nothing was component-state only.

**Mutation feedback sub-check** ✅. CDP network emulation at 400 ms latency / 400 kbps, then
timing the click-to-first-visible-change gap: **71 ms**, with the deck counts and the row's
`✓ In deck` state among the first things to move. An optimistic path exists and Recurring
Defect Class 12 does not apply to this surface.

## Journey D — filtering the collection by availability

Reachable as of Task 10. Walked with `scripts/probe-collection-filter.mjs` at 390×844 and
1300×900, against a dev server running the `AVAIL_FORCE=1` seam stub. Full readings in
`gate2-forced-states-card-availability-task10.md`.

1. **Forward.** Open `Availability ▾`, tick `Free` and `Wanted by a brew`. The URL becomes
   `?avail=free,brew`, two chips appear, the trigger counts the selection, and the result
   line falls from `2,472` to `1,240`. The four menu counts sum to the unique total, so the
   partition holds on the real collection and not only in the unit tests.
2. **Reverse.** One chip ✕ leaves `?avail=brew` and `617 results` — it removed exactly the
   state it names and nothing else. `Clear all` returns the URL to a bare `/collection`,
   empties the chip row, restores `2,472 results`, and puts the trigger back to its
   collapsed label. No hollow state: the pre-action surface is the post-clear surface.
3. **Repeat.** Re-selecting the state that was just removed puts it back
   (`?avail=brew,free`) with both chips. Nothing about the selection is keyed to a
   dismissal or a one-time flag, so there is no `eventId`-versus-`userEventId` failure
   shape available here — the whole selection lives in the URL.
4. **Resume.** Reloading on `?avail=free,brew` restores both chips and the same count from
   the URL alone. A second tab opened on that URL lands on the same state for the same
   reason. Nothing is held in component state that the URL does not already carry.

**Mutation feedback.** Not applicable: no mutation is reachable from this journey. Every
control rewrites client state and a query string, so there is no server round trip to feel
slow and no optimistic path to need.

## Journeys B, C

Not walked. B needs Task 8 (commander detail disclosure and the deck roll-up), C needs
Tasks 5–7 (the second score). Each is walked when the task that makes it reachable lands,
not retroactively at the end of the epic.

## Cold-eyes review

Two context-starved critic subagents, split desktop and phone, given only the screenshot
reel, the three design handoffs and the copy binding — and explicitly denied the plan, the
diffs and `src/`. Findings triaged as follows.

**Fixed in this run:**

1. **The card name collapsed to one character on a phone decklist row.** A 390px over-committed
   row rendered `A ◆◆ short 1 — also in Atraxa Superfriends`. The marker's prefix is
   `flex-none` and the card name is `flex-1`, which is `basis: 0` — so the name only ever got
   space the marker had not already claimed, and the marker claimed all of it. The row named
   no card at all, on the one state the design makes loudest. Fixed by basing the name on its
   own text (`flex: 1 1 auto`) and giving the marker `flex-shrink: 4`, so the marker yields
   down to its own floor before the name yields anything. That is the half Design nominated
   to yield (ADDENDUM-2-READINESS, decisions of 2026-08-27), stated as an order of yielding.

   A fixed `min-w-[14ch]` floor was the first fix and is the one to avoid: a floor cannot
   itself yield, so it bought the name back at 375px and 390px by pushing the remove ✕ off
   the right edge at 320px. Measured widths for the card name on an over-committed row,
   after the change: 82px at 320, 87px at 375, 88px at 390, with nothing overflowing at any
   of the three.
2. **The marker's deck name truncated to nothing, leaving a dangling preposition.** On the
   phone search row the meta line read `◆◆ short 1 — also in` with no object and no ellipsis.
   `truncate min-w-0` lets the half shrink to zero width, at which point there is not even an
   ellipsis to admit something was cut. Floored at `min-w-[6ch]`, the narrowest width that
   still reads as an abbreviated name.

**Rejected — already planned, not defects:** the missing deck-level over-committed roll-up is
Task 8; markers and the `Availability ▾` filter on `/collection` are Tasks 9 and 10. Both
critics flagged them as omissions because neither was allowed to read the plan, which is the
cost of starving the context and worth paying.

**Rejected — verified false:** one critic read the finished decklist as rendering zero rows
from a screenshot that was blank below the fold. Probing the live DOM found 274 lines of
card rows. A tiling artifact, not a bug.

**Rejected — not eng's call:** the vocabulary and redundancy findings (`0 free` reading as a
price next to `0 to buy`; `1 in a brew` versus `1 copy is on an unfinished deck` naming one
state twice; whether `short 1` is self-explanatory) are all against strings frozen in a
merged handoff. Carried to the close-out report for Hugh rather than edited here.

## Known limit

On an over-committed row the card name is always abbreviated at phone width — `Abstruse
Archaic` draws as roughly thirteen characters at all of 320, 375 and 390. The row is
genuinely too narrow to hold a full card name and a full `short 1 — also in <deck>` at once,
and nothing overflows, so this is the row spending its width rather than a defect. If Design
later wants the whole name on this state, the lever is the count-only marker form that
Addendum 2 §3 already ships for `/collection` — which needs a breakpoint rule Design has
twice declined to set. Recorded rather than invented.
