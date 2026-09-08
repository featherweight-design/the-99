# Gap Report — In-flight feedback for control flips that fetch (R3)

**Handoff:** `design/design_handoff_the99_in_flight` (R3, supersedes R2)
**Verified against:** `src/components/commanders/page-header.tsx`, `discovery-view.tsx`,
`commanders-view.tsx`, `rack/filter-rack.tsx`, `rack/filter-sheet.tsx`, `rack/select.tsx`,
`rack/scope-control.tsx`, `rack/result-line.tsx`, `ui/pending-mark.tsx`, `pending.ts`,
`src/lib/copy/lanes.ts`
**Widths:** 390px and 1280px
**Date:** 2026-09-08

## Verdict

**🟢 Green — ship.** R3 answers the placement question this report raised against R2, and it
answers it against the build that actually exists. Every claim in the ruling was re-checked
in `src/` rather than taken on trust, and every one holds. The net implementation is one
behaviour to preserve and nothing to build.

## R2's Orange, and why it closes

R2 was drawn on a `page-header.tsx` carrying a four-clause subtitle, and placed a pending
participle in the clause each fetching control owned. `#435` (*Split /commanders into two
lanes*, `3da8c52`) deleted that surface before the audit ran: the header is now
`PageHeader({ lane })`, a fixed title and gloss, and the counts moved onto the rack's result
line. All three participles were left homeless, and two had no owner left to be homeless for.

Deciding where the treatment went instead was a placement call on a surface Design had not
drawn, so the finding went back to Design rather than being improvised here. R3 is that
answer: **(a) — the crown the control already wears is the whole treatment.**

## Verified against the build

Each of R3's load-bearing claims, checked:

| R3 claims | Verified |
|---|---|
| Scope is the only control on either lane that can reach the server | `discovery-view.tsx` `update()` returns early when `next.scope === params.scope`, and again on a cache hit before `startNav` |
| Order never reached the server, before or after the split | `ordered()` sorts rows already held, on both lanes |
| The owned lane holds no transition and passes no flag | `commanders-view.tsx` — no `useTransition`, no `scopePending` |
| The crown is shipped and never gated | `select.tsx` renders `PendingMark` the moment `pending` is true; `PENDING_OPACITY` 0.55, `aria-busy`, never `disabled` |
| The label keeps its box | `PendingLabel` uses `opacity-0`, not `visibility: hidden`, so the accessible name survives the wait |
| The result line is the rack's only list-count live region | `result-line.tsx` — `role="status"`, `aria-atomic`, `ANNOUNCE_DELAY_MS` 300 |

## The five deletions are five things never built

R3's READINESS describes the visible work as deleting `counting…`, `re-ranking…`,
`re-scoring…`, `PENDING_GATE_MS` and `discoverySubtitle()`. **None of them exist in `src/`.**
They were R2's proposed API, drafted in the handoff's copy-strings file and never
implemented — the R2 plan that would have built them was withdrawn rather than merged. So
the deletion is already done, and the retirement note now shipping in
`in-flight · copy strings.ts` is the record of why they must not be re-added.

## The one sign-off R3 asks for

R3 disagrees with this report's earlier keep-list on exactly one line — *"one gate, 500 ms,
never tuned per control"* — and retires it.

**Signed off, and it costs nothing to sign.** The gate existed to stop a subtitle participle
flashing; there is no participle. The crown was never gated in the build, and gating it would
mean half a second of a control that looks untouched after a deliberate press — the complaint
`#338` and PRs #411/#416 were opened to answer. And the constant is not in `src/` to begin
with, so "keep it" would have meant introducing a value no code path reads.

## What ships from this branch

The R3 drop, this report, and four regression tests in
`src/components/commanders/rack/filter-rack.test.tsx` that lock the half of the ruling a
future implementer is most likely to undo by reflex:

1. **The result line holds.** With `scopePending` true, the sentence is byte-identical to the
   settled one, carries no `aria-busy`, and the rack's only busy node is the scope trigger.
2. **Scope is marked and nothing else.** Exactly one `[data-pending-mark]` on the rack, inside
   the Scope group; Order carries none.
3. **The owned lane has no pending state at all** — passing the flag to an owned rack produces
   no mark and no busy node anywhere.
4. **390px:** the mark rides the pressed scope option inside the sheet, the radiogroup takes
   `aria-busy`, and the footer's `Show 3,301 commanders` holds.

No product code changes. The treatment R3 rules on was already in the build; what was missing
was the guarantee that the next person to touch a pending flag would not reach for the nearest
count.

## Open, and not this ticket

- **The `/discover` correction button is dead.** `discovery-view.tsx`'s `correct()` calls
  `scopeNav.go("owned")` for a `scope` cause, but `useScopeNav` still models the pre-split
  `"owned" | "play"` values, so on `/discover` its `current` is always `"owned"` and the call
  early-returns. `#435` fallout, unrelated to in-flight feedback, and raised rather than fixed
  here.
- **The scope bounce** R3 flags (gap 4): `loadDiscovery` downgrades `new` to `bestfit` with no
  decks, so a flip can settle back on the value it started from having done real work. The
  crown clears correctly; nothing explains the outcome. Worth a ticket.
