# The 99 — In-flight feedback for control flips that fetch (design handoff, re-ruling R1)

**Unblocks the region-loader work.** Source of truth for the premise correction:
`src/components/commanders/list-nav.ts:110-113`, and the measured 270 ms / 2,870 ms window.
Re-rules the motion clause of three documents — `design_handoff_the99_discovery/`,
`design_handoff_the99_commanders_plane/`, and the discovery canvas itself. Read those for the
controls; read `design_handoff_the99_richness/README.md` for the locked voice.

File: `The 99 - In-Flight Feedback.dc.html` (canvas — pan/zoom). The ruling in full, with the
three document amendments, is `RULING-in-flight-feedback.md`.

**The one-line summary:** *the list stays because it is the previous answer, not because nothing
is being fetched — and past 500 ms the subtitle clause the pressed control owns becomes its own
participle.*

**Not gated.** The in-control half is shipped (`PendingLabel`, PRs #411, #416). Everything drawn
here is one copy state on an existing line plus three document edits.

---

## The correction

Three rulings forbid animating, dimming or skeleton-ing the list on a control flip, all three
because both flips are *"state changes over data already on the client."* That is true of **one**
control. Scope, sort and discovery availability are server round-trips
(`list-nav.ts:110-113` — only the active `(sort, avail)` pair is ranked, so the other ordering does
not exist until it is asked for). Only the owned-scope availability toggle, and the colour pips,
are client-side.

**The prohibition survives the correction; its reason is replaced.** The list is left alone because
the rows on screen are the previous answer, correctly rendered and still pressable — not because
nothing is being fetched.

## The calls

| # | Call | Answer |
|---|---|---|
| 1 | List treatment during a real fetch | **None, and stated for the fetching case.** No skeleton, no dim, no transition, no `aria-busy`, no `pointer-events: none`. The outgoing rows are true and stay pressable. |
| 2 | Under 500 ms | **The shipped in-control crown, alone.** A warm flip (~270 ms) shows nothing else, at either width. An element that appears and leaves in 270 ms is a flash. |
| 3 | Past 500 ms | **One subtitle clause becomes its own participle.** Each fetching control owns exactly one of the subtitle's three clauses; that clause is replaced — never appended — in `--fg-faint` with one static `…`. |
| 4 | Escalation | **None at any duration.** No spinner, no progress bar, no "taking a moment" line, no animated ellipsis. The crown is the only moving thing. |
| 5 | Announcement | **Nothing mid-flight.** Pending clause `aria-hidden`; the shipped live region speaks once on settle. |
| 6 | Failure | **The outgoing sentence returns whole.** The route error path owns the page; the subtitle is not a status bar. |
| 7 | Boundary with `LoadingScreen` | **Outgoing content or not.** Content → in place. None (first paint, cold shared URL, reload) → `LoadingScreen`, still the only skeleton. No third component. |

## The three clauses

| Pressed control | Fetch | Clause it owns | In flight |
|---|---|---|---|
| Scope | server | `3,100 commanders you have not built` | `counting…` |
| Sort | server | `ranked by best fit` | `re-ranking…` |
| Availability, discovery | server | `read against 2,805 cards` | `re-reading…` |
| Availability, owned scope | **client** | same clause, updates instantly | **no pending state** |
| Colour pips | client | none | **no pending state** |

Every participle is shorter than the clause it replaces at every width, so the wrap point can only
move earlier and the list is never pushed down. That is a copy constraint, and it is testable.

## States delivered

| # | Frame | Desktop | Phone |
|---|---|---|---|
| A1 | Which flips fetch — the four controls with and without a pending mark | ✓ | ✓ |
| B1 | Moment 1 — press, 0 ms: crown in place of the label, list untouched | ✓ | ✓ |
| B2 | Moment 2 — warm arrival at ~270 ms: nothing else ever appeared | ✓ | — |
| B3 | Moment 3 — past the 500 ms gate: one clause is a participle | ✓ | ✓ |
| C1 | The three sentences, side by side, against the settled sentence | ✓ | ✓ |
| D1 | Rejected treatments, drawn: skeleton, dimmed list, region loader, count-row spinner | ✓ | — |
| E1 | The `LoadingScreen` boundary — outgoing content vs. none | ✓ | — |
| F1 | Timings, tokens, a11y and motion contract | ✓ | ✓ |
| G1 | The three document amendments, strike and replace | ✓ | — |

## Component notes

**No new component.** No new token, no new hex, no new motion class, no new empty state.

| Piece | Spec |
|---|---|
| **`PendingLabel`** | Shipped, unchanged (`src/components/ui/pending-mark.tsx`). Three brass diamonds, small–large–small (4/6/4 px, `rotate(45deg)`, 3 px gap), standing where the pressed control's label was — the control is the same width waiting as idle. Opacity pulse 0.35 → 1 → 0.35 over 1,200 ms, `ease-in-out`, `prefers-reduced-motion` → static at 0.7. Control at `PENDING_OPACITY` 0.55, **never disabled**. |
| **Pending subtitle clause** | The existing subtitle, mono 12 px `--fg-faint` (10.5 px phone), unchanged in every respect except that one clause's text is the participle. No colour change, no weight change, no italics. One static `…`. `aria-hidden` on the clause. |
| **Gate** | `PENDING_GATE_MS = 500`, one constant, all three fetching controls. A threshold on the pending flag, not a delay on the fetch. |
| **List region** | Untouched. No wrapper, no overlay, no `aria-busy`, no pointer trap. |
| **Count line** | Holds its outgoing figures and rewrites with the list. Never a dash. |

## Notes for engineering

- **The pending flag already exists** and is already false for the two client-side controls and for
  a repeat flip served from cache — so "does this need a treatment?" is a question the code has
  already answered. Do not add a second flag.
- **The gate is one `setTimeout` on the flag becoming true**, cleared on settle. If it fires, the
  subtitle takes the participle; if the fetch beats it, nothing rendered.
- **The subtitle is assembled from three clauses**, not formatted as one string — see
  `in-flight · copy strings.ts` for the assembler. The pending participle substitutes at the clause
  the pressed control owns.
- **On settle the whole sentence rewrites at once**, from the arriving payload. No clause-by-clause
  settling, no transition on the text.
- **On failure, call the assembler with `null`** — the outgoing sentence returns verbatim.
- **`shown` still resets to `REVEAL_STEP` on arrival**, per the discovery handoff. It does not reset
  on press; a flip that fails must leave the reader where they were.
- **Nothing new is announced.** The pending clause is `aria-hidden` and the shipped live region is
  debounced to one message per settle.
- **Three document edits ship with this**, exactly as written in `RULING-in-flight-feedback.md`, so
  the next reader of those files does not re-derive the wrong reason.

## Gap report

1. **390 px loses a subtitle line while waiting.** Because the participles are shorter, the two-line
   subtitle collapses to one and the list moves **up** ~14 px for the duration. Judged better than a
   reserved height (a fixed two-line subtitle spends 14 px permanently to avoid a transient shift on
   one press). If it reads badly on device, the fix is a `min-height` at 390 px only.
2. **2,870 ms is the measured worst case, not a p95.** This ruling refuses an escalation tier on the
   basis that a described wait needs no apology. If the p95 turns out to sit above ~4 s, the refusal
   is worth re-opening — with a duration histogram, not an opinion.
3. **`Score against` × discovery is still gap 1 of the discovery handoff.** This document assumes it
   re-ranks (and therefore fetches, and therefore owns the collection clause). If it is instead
   disabled under discovery, the third clause has no pending state and this table loses a row.
4. **A flip during a flip is not drawn.** The controls are never disabled, so a reader can press
   sort while scope is in flight. Expected: the second press supersedes, the crown moves to the
   second control, and the subtitle's pending clause moves with it. That is one line of state, but
   it is not specified in the brief and the ordering of two in-flight requests is engineering's.
5. **Scroll position on arrival is unspecified.** A reader who has scrolled 40 rows into the
   outgoing list and flips sort gets a new ranking under an old scroll offset. The shipped window
   reset makes the list shorter than their offset in many cases. Out of scope here — it is a
   navigation question, not a feedback question — but it is the second thing a reader will notice.
6. **No treatment for a fetch that returns the same list.** An availability flip that changes
   nothing visible (no free-vs-owned difference in the top 25) settles with the sentence rewritten
   and the rows identical, which can read as a press that did nothing. The subtitle's collection
   clause is the only evidence. Accepted; flagged.

## Files
- `The 99 - In-Flight Feedback.dc.html` — the canvas (this handoff's deliverable).
- `RULING-in-flight-feedback.md` — the ruling in full, with the three document amendments.
- `in-flight · copy strings.ts` — three strings, the gate constant, the subtitle assembler.
- `README.md` — this file.
- `READINESS.md` — self-assessed readiness and the one open item.
- `brand/` — the locked brand sheet + brand README, copied in for self-containment.
- `support.js` — runtime for the HTML reference; not production code.
