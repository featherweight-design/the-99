# READINESS — In-flight feedback for control flips that fetch (re-ruling R1)

**Self-assessed: 🟢 Green. One open item, and it is a 14 px judgement at 390 px, not a ruling.**

The deliverable is a ruling plus three document edits. The visible half — `PendingLabel`, the
0.55 dim, the never-disabled control — is already shipped (PRs #411, #416). What this adds to the
product is **one copy state on a line that already exists** and the deletion of a ticket.

## Not blocking — nothing here waits on anything

- **No new component.** No `RegionLoader`. No new token, hex, motion class, empty state or modal.
- **The pending flag exists** and is already false for the client-side toggles and for a
  cache-served repeat flip, so the "does this need a treatment" branch is already in the code.
- **The gate is one timer.** `PENDING_GATE_MS = 500`, cleared on settle.
- **The list region is not touched at all** — no wrapper, no overlay, no `aria-busy`, no pointer
  trap. This is a subtraction from the region-loader estimate, not an addition.

## Needs a decision — one item, cheap either way

1. **390 px: transient line loss, or 14 px spent permanently?** Every pending participle is shorter
   than the clause it replaces, so at 390 px the two-line subtitle collapses to one while a flip is
   in flight and the list moves **up** about 14 px, then back. Drawn as-is, because a two-line
   `min-height` spends those pixels on every reader forever to avoid a shift that lasts 2 s on one
   press, and §7.2 already accounts for every pixel above the first row. If it reads badly on
   device, the fix is a `min-height` at 390 px only — one line of CSS, no redraw.

## Called, not asked — flagged for the record

2. **The prohibition is kept and its reason replaced.** The three documents' *conclusion* was right
   for the wrong reason. Anyone re-opening this should argue with the new reason — the outgoing rows
   are the previous answer and are still pressable — and not with the old one.
3. **No escalation tier at 2,870 ms.** A described wait does not also need an apology, and a third
   element arriving at 2 s lands just before the reward. Gap 2 says what would re-open it: a
   duration histogram showing p95 above ~4 s.
4. **The participles are bare** (`counting…`, `re-ranking…`, `re-reading…`), one string each, both
   widths. The pressed control is showing a crown where its label was; the sentence does not need to
   restate the object. Longer strings also break the never-longer-than-the-clause constraint, which
   is what keeps the list from being pushed down.
5. **The pending clause replaces, never appends.** Appending a fourth clause is the reflow this
   ruling exists to prevent.
6. **One gate for all three fetching controls.** Per-control thresholds make the product feel
   different depending on which knob you touched.
7. **The client-side controls get no mark.** The owned-scope availability toggle and the colour pips
   have nothing to wait for; a mark that fires for 0 ms is a flicker.
8. **Nothing is announced mid-flight.** `PendingLabel`'s accessible name plus one settle message.
   Two announcements per press is a stutter.
9. **The `LoadingScreen` boundary is a content test, not a route test.** Outgoing rows → in place;
   no outgoing rows → the shipped route skeleton. That test is the answer to the region-loader
   ticket, and the answer is that the region loader is `LoadingScreen`, which already exists.

## Not blocking, and worth reading before estimating

10. **Three document edits ship with the code**, verbatim from `RULING-in-flight-feedback.md`:
    `CONTROLS-four-above-one-list.md:114-115`, `The 99 - Commander Discovery.dc.html:588`, and
    `CONTROLS-six-above-one-list.md:246`. Without them the wrong reason is still on file in three
    places and this comes back.
11. **A flip during a flip is not specified** (gap 4). Controls are never disabled, so it is
    reachable. Design's expectation: the second press supersedes and the crown and the pending clause
    both move to the second control.
12. **`Score against` × discovery is still the discovery handoff's gap 1.** If it is disabled under
    discovery rather than re-ranking, the collection clause has no pending state and the table loses
    a row. Nothing else changes.
13. **Scroll offset on arrival is out of scope** (gap 5) — a navigation question. Worth a look in the
    same PR since the reader will meet it in the same second.
14. **The window reset stays on arrival, not on press.** A flip that fails must leave the reader
    where they were.

## Not blocking

- `prefers-reduced-motion`: the crown stops pulsing and sits static at 0.7. The ruling is unchanged
  under it — the subtitle clause was never motion.
- Contrast: the pending clause sits at `--fg-faint` on `--surface`, exactly as the settled subtitle
  does; the participle is not dimmer than the words beside it. The 0.55 control dim applies to a
  control whose label has been replaced by a mark, not to reading copy.
- Nowhere in the canvas is there a skeleton row, a dimmed list, a spinner, a progress bar, a toast,
  a dash, a reserved gap or a second loader component.
- Every figure is consistent with §0: 3,342 indexed, 3,100 unbuilt, 242 owned, 2,805 cards.
  Timings quoted are the measured ones: ~270 ms warm, 2,870 ms worst case, 500 ms gate.
