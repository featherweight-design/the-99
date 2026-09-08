# The 99 — In-flight feedback after the two-lane split (design handoff, re-ruling R3)

`design/design_handoff_the99_in_flight/` · 2026-09-08

**A re-placement, not a new surface.** R2's non-placement rulings hold; what did not survive
`#435` is *where the three participles live*. The answer is that they do not live anywhere —
**the crown the control already wears is the whole treatment**, and the result line holds its
outgoing count for the duration.

Mirrors `design/design_handoff_the99_commanders_discover/`, which is the build this must match:
same folder convention, same copy-export shape, same READINESS format, same refresh palette.

| File | What it holds |
|---|---|
| `The 99 - In-Flight Feedback.dc.html` | The deliverable. Control inventory, discover desktop at three moments, the cache hit, both lanes at 390px, the three rejected placements, the contract, the retirements. |
| `RULING-in-flight-feedback.md` | The ruling in full, including what must not happen. |
| `in-flight · copy strings.ts` | **Exports nothing.** Kept so the retirement is discoverable where the strings used to live. |
| `READINESS.md` | Self-assessed readiness and what is left to decide. |
| `brand/` | The locked brand sheet, copied in for self-containment. |

**Read first:** `docs/superpowers/gap-report-in-flight.md` on `design/in-flight-handoff` (PR #436).
R3 agrees with all of it except one line — see call 4.

---

## What changed under the drawing

`page-header.tsx` is now `PageHeader({ lane })`: fixed title, fixed gloss, no counts, no toggle.
Its own header comment states it — *"the scope is now the route, the nav is the switch, and the
counts the subtitle reported have moved onto the rack's result line."* R2's mechanism was *a
pending clause replaces the subtitle clause its control owns*. There are no clauses.

| Control | Owned | Discover | Where the work happens | Pending |
|---|---|---|---|---|
| **Scope** (`Best fit` / `Something new`) | absent | **leads the rack** | **server**, cache miss only | **sometimes** |
| Order | Fit · Name · Recent | Popularity · Name · Recent | client — `ordered()` sorts rows already held | never |
| Search | ✓ | ✓ | client — narrows on the keystroke; `findExcludedMatches` is a receipt, not a wait | never |
| Colour pips + match | ✓ | ✓ | client — a pure filter over the payload | never |
| Availability | ✓, client swap | absent, and not a greyed stand-in | client — both arrays already sent | never |

One `useTransition` on the whole surface, in `discovery-view.tsx`, feeding `scopePending` into
the rack. `commanders-view.tsx` holds none. **And the flag usually stays false**: `update()` asks
the payload cache first, so a scope already seen this visit never navigates. The flip that pends
is the *first* visit to a scope.

> **Correction to the brief.** The surviving server control is **Scope**, not Order —
> `filter-rack.tsx:106` is the only site passing `pending`, and `ordered()` sorts in memory on
> both lanes. The distinction matters for ruling 6: Order *looks* like scope and must not gain a
> crown by resemblance.

## The calls

| # | Call | Answer |
|---|---|---|
| 1 | Does the one surviving server control need copy beyond its crown? | **No — (a).** The crown replaces the label in its own box, at `PENDING_OPACITY` 0.55, never disabled, and the label already reads the destination because selection is optimistic. What made R2's participle free was a line that was going to change anyway; nothing on the rack has that shape. |
| 2 | What does the result line do? | **Holds** its outgoing sentence verbatim for the whole flip — and the sheet footer's copy of it. Rewrites once, on arrival. No pending form, no dash, no `aria-busy`. |
| 3 | (b) — a pending form on the result line | **Rejected**, and ruled on so it closes. Replace deletes a true count; append is the reflow R2 refused, on a line the rack promises not to resize; a dash breaks the omit-never-dash rule. Then the collision: that line is the rack's only live region, `aria-atomic`, debounced 300 ms so four keystrokes are heard once. A participle either announces mid-flight or must be hidden from the one node built to be heard. |
| 4 | The 500 ms gate | **Retired with the participle.** It gated the sentence; the crown was never gated and must not become gated — a press is acknowledged on the press. ⚠ The one line where R3 disagrees with the gap report's keep-list. |
| 5 | (c) — something else on the rack | **Rejected.** The rack is three rows, always all three, and does not change height when results change. A fourth row violates that at the worst moment; reserving its height spends a permanent empty row on a state the cache usually skips. That is a region loader with a smaller font. |
| 6 | The owned lane | **No pending state at all**, either width. Drawn so the absence is a ruling. |
| 7 | Announcement | **Nothing mid-flight.** Crown `aria-hidden`; the lane announcer speaks the re-rank once on settle; the result line speaks only for client narrowings. Two regions, two jobs, one message per press. |

Unchanged from R2 and restated in the ruling so the re-audit is one document: the list region is
never touched, client-side controls get no mark, no escalation tier at any duration, failure is
the route's, and the `LoadingScreen` boundary is a content test.

## States delivered

| # | Frame | Desktop | Phone |
|---|---|---|---|
| A | Control inventory across both lanes — where the one flag is | ✓ | ✓ |
| B1 | Discover at rest | ✓ | — |
| B2 | Discover pending — the diff is the trigger and nothing else | ✓ | — |
| B3 | Discover settled — count rewrites, announcer speaks once | ✓ | — |
| C1 | The cache hit — nothing pending at all, the common case | ✓ | — |
| C2 | Why the gate retires | ✓ | ✓ |
| D1 | Discover rack, 390px — scope is in the sheet, so the row shows nothing | — | ✓ |
| D2 | Discover sheet, 390px — the mark rides the pressed option | — | ✓ |
| D3 | Owned lane, 390px — no reachable pending state | — | ✓ |
| E | The three rejected placements, drawn | ✓ | — |
| F | The contract — timings, tokens, motion, a11y | ✓ | ✓ |
| G | Retirements + the two corrections | ✓ | — |

## Component notes

**No new component, no new token, no new hex, no new string.** Everything below ships.

| Piece | Spec |
|---|---|
| **`PendingMark`** | Three diamonds 8 / 11 / 8 px at `rotate(45deg)`, 5 px gap, 28 px box, `currentColor` — the crown at a control's text size. Opacity pulse 0.34 → 1 → 0.34 over 1,200 ms; `prefers-reduced-motion` static at 0.7. |
| **`PendingLabel`** | Label keeps its box, mark laid over it at `opacity-0` (not `visibility:hidden` — the accessible name is computed from that text). Control same width waiting as idle. |
| **Rack trigger, pending** | The mark takes the **chevron's** 28 px slot, not a slot beside the label; `PENDING_OPACITY` 0.55 on the trigger; `aria-busy`; brass border because the value is off default, not because it is waiting; **the menu still opens**. |
| **Sheet radiogroup, pending** | `aria-busy` + 0.55 on the group; the crown replaces the **selected** option's label only; the gloss under it holds. |
| **Result line** | Untouched. Mono 11 px, tabular, `--fg-muted`, `aria-hidden` visible node + `role=status` sr-only node, 300 ms debounce. **It holds its outgoing sentence and rewrites once.** |
| **Sheet footer count** | Same sentence, same rule. Holds. |
| **List region** | Untouched. No wrapper, overlay, `aria-busy` or pointer trap. |

## Notes for engineering

- **The visible work is deletion.** Three strings, `PENDING_GATE_MS`, and `discoverySubtitle()`.
  Nothing is added.
- **`scopePending` already carries the whole ruling.** It is false for every client control and
  for a cache-served flip, so "does this need a treatment" is a question the code has answered.
  Do not add a second flag, and do not derive one from `isPending` anywhere else.
- **The one thing to actively not do** is reach for the nearest count when the flag turns true.
  Ruling 2 is the reflex to resist; it is why "nothing" is written down.
- **The window reset stays on arrival**, keyed off the list, not on press — a flip that fails must
  leave the reader where they were.
- **Two live regions, both already correct.** The result line for client narrowings; the lane
  announcer for the re-rank and the reveal. Neither gains a message.
- **Search stays out of the inventory as an explicit no-treatment**, carried from R2: it fires
  `findExcludedMatches`, but the visible list narrows from data already held.

## Gap report

1. **The 2,870 ms worst case has not been re-measured against this build.** R2's window (~270 ms
   warm, 2,870 ms cold) predates the split and the payload cache. The ruling is duration-independent
   — there is no tier, so no threshold to get wrong — but if the cold path has got materially
   slower, gap 2 of R2 is the one that re-opens, not this one.
2. **What re-opens the escalation question:** a duration histogram of *cache-miss scope flips only*
   showing p95 above ~4 s. Not an opinion, and not the warm path, which the cache has removed
   from the sample entirely.
3. **A flip during a flip is still not specified.** Controls are never disabled and the trigger
   still opens its menu while a request is out, so it is reachable. Expected: the second press
   supersedes and the crown stays where the reader last pressed. One line of state; engineering's
   ordering call.
4. **`discovery-view.tsx` reconciles the scope the server actually ranked on** — `loadDiscovery`
   downgrades `new` to `bestfit` when there is no deck to measure novelty from. So a flip can
   settle with the control back on the value it started from, having done real work. The crown
   clears correctly, but nothing tells the reader why the scope bounced; `NoDecksBanner` is the
   nearest thing and it is not addressed to this. Out of scope here, worth a ticket.
5. **Scroll position on arrival is still unspecified**, as in R2 — a navigation question, not a
   feedback one, but the reader meets it in the same second.
6. **The result line at 320 px is unverified.** `2,847 commanders` fits; a long filtered sentence
   with the `Exactly` aside appended is the case to check, and it is not new to this ruling.
