# Journey lifecycle — Deck import (#42)

Gate 5, run at PR 7 of 9, the first point at which the journey is reachable end
to end: entry surface → parse/match → deck created → arrival on `/decks/[id]`.

**How this was exercised.** There is no browser gate on this repo — no
Playwright, and `/decks` sits behind Clerk — so every pass below was run through
the component test harness (`src/components/decks/arrival-chrome.test.tsx`,
`import-entry.test.tsx`, `unresolved-group.test.tsx`) plus reading of the code
paths. Where a pass needs a real browser, a real session, or seeded staging
data, it is marked **NOT EXERCISED** rather than ticked. Nothing below claims a
browser observation that was not made.

---

## Forward — import a list with unmatched lines, land on the deck, use the jump

| Step | Result |
|---|---|
| Paste a list with some unmatched lines, submit | `importDeck` writes the deck plus `deck_unresolved_rows` (PRs 1–3) |
| Entry surface navigates | `router.push('/decks/<id>?imported=1')` — `import-entry.tsx`, asserted in `import-entry.test.tsx` |
| Deck page reads provenance | `searchParams.imported === "1"` → `arrivedFromImport` prop |
| Arrival strip | **suppressed** — the strip's copy says "nothing needs your attention", which an import that came up short contradicts. Verified: *"is suppressed when the import came up short"* |
| Unresolved banner | renders above the coverage strip and the tab pair, with the line count in both viewport sentences. Verified at both widths |
| Spine | unchanged — no extra figure, no second bar, no "97 + 2". `BuilderSpine` is not touched by this PR |
| `Take a look →` | scrolls to `#unresolved-group`. Verified with a `scrollIntoView` spy |

A **clean** import (zero unresolved) takes the other branch: the arrival strip
renders and the banner does not. Verified.

**Not exercised:** the actual smoothness/offset of the scroll in a browser, and
the strip's `--brass` dismiss hover, which is a CSS `:hover` with no jsdom
equivalent.

---

## Reverse — dismiss the strip

| Question | Answer |
|---|---|
| Does the strip go? | Yes, immediately — `useLocalFlag` is a `useSyncExternalStore` over `localStorage`, and the write notifies its own listeners synchronously |
| Does the surface return to a genuinely pre-action state? | Yes. The strip is a sibling band with no layout it shares; removing it leaves spine → coverage strip → tabs, byte-identical to a non-import visit to the same deck |
| Is anything else changed by the dismissal? | No. The dismissal writes one key and nothing reads it but the strip. In particular it does **not** touch the celebration flag |
| Does it survive storage being blocked? | Yes — Safari private mode throws on both read and write; the session-scoped fallback set keeps the strip dismissable and degrades to "shows again next visit". Verified: *"stays dismissable when storage throws"* |

**One asymmetry, deliberate:** dismissal is one-way. There is no undo, because
the strip is gone on the next visit regardless and an undo would be a control
for restoring a line of prose.

---

## Repeat — import, delete the deck, import the same list again

This is the pass that matters, and the one where #70's nudge bug would recur in
a new costume.

**Two flags are in play, and both must die with the deck:**

1. **The celebration one-shot** — `celebrationKey(deckId)` =
   `the99:celebrated:<deckId>`.
2. **The arrival dismissal** — retired by deck messages PR 4a (2026-10-22). It was
   `arrivalDismissKey(deckId)` = `the99:import-arrival-dismissed:<deckId>`; a receipt now lasts the
   visit it arrived with (`useVisitReceipts`), its ✕ hides it for the visit and nothing is stored, so
   there is no key left to collide. The reasoning below is kept for the record.

**The verification.** Deck ids are `uuid("id").primaryKey().defaultRandom()` in
`src/db/schema.ts` §decks. `defaultRandom()` is Postgres `gen_random_uuid()`,
which is v4 — 122 random bits, and never derived from row contents. Nothing in
the import path passes an id: `importDeck` inserts without one and reads back
what the database assigned. So two imports of byte-identical text, with the
same commander and the same deck name, produce two different ids, and therefore
two different keys for both flags. A stale entry left behind by a deleted deck
is inert: it names an id that will not recur.

The counterfactual is what makes this worth writing down. Had the dismissal
been keyed to anything the two imports share — a hash of the pasted list, the
deck name, the commander oracle id, or a single global
`the99:import-arrival-dismissed` — the second import would have landed on a deck
with no arrival strip at all, silently, and the player would have no way to tell
the import had worked. That is exactly the shape of the #70 bug.

Both directions are asserted:

- *"returns for a new deck built from the same list"* — a dismissal written for
  `deck-1` does not suppress the strip on `deck-2`.
- *"is keyed per deck — a second finished deck gets its own reveal"*
  (`builder-celebration.test.tsx`, pre-existing) — the same property for the
  celebration flag.
- A mutation that collapses `arrivalDismissKey` to a constant kills three tests.

**A third flag that is not a flag.** `arrivedFromImport` itself is deliberately
*not* persisted anywhere. It is a query param on one navigation. A schema column
would have made "just imported" a permanent property of the deck, and the strip
is required to be gone on the next visit whether or not it was dismissed — so
the correct lifetime is exactly one navigation, which is what a param gives.

**NOT EXERCISED:** the delete-then-reimport sequence against a real database.
There is no seeded staging data in this environment and `/decks` is behind
Clerk. The argument above is a code-and-schema argument plus a test at the
component boundary, not an observed round trip.

---

## Resume — reload mid-journey, and a second tab

| Scenario | Behaviour | Verified how |
|---|---|---|
| Reload with `?imported=1` still in the URL | The strip re-renders **unless it was dismissed**, in which case the persisted key keeps it down | Code path + dismissal test; **the reload itself is NOT EXERCISED in a browser** |
| Reload after navigating away and back (no param) | No strip. `arrivedFromImport` is false, and so is the celebration suppression | *"is absent on an ordinary visit to the same deck"* |
| Second tab on the same deck, one dismisses | The other settles: `useLocalFlag` subscribes to `storage` events, filtered to this key so unrelated decks do not re-render every open builder | Code path, inherited from `useCelebrated`; **NOT EXERCISED across real tabs** — jsdom does not emit cross-document `storage` events |
| Server render / hydration | The server snapshot is `true` ("assume dismissed"), so neither the SSR pass nor hydration contains a strip. A returning player cannot catch a flash of one | Code path; the same contract `useCelebrated` has shipped with |
| Mid-journey reload on the entry surface (before the deck exists) | Out of scope for this gate — nothing was written, and PR 4 owns that state | — |

### The one interaction worth flagging

Leaving `?imported=1` in the URL means a refresh re-renders the strip for a
player who has not dismissed it, and a bookmarked URL would claim an import that
happened days ago. Both were weighed against sweeping the param with a
`router.replace`, and the sweep loses: stripping the param clears
`arrivedFromImport` on the very next render, which un-suppresses the 99/99
reveal on a deck the player did not build — the exact outcome the suppression
ruling of 2026-08-04 exists to prevent, and a one-shot moment that cannot be
given back. The residual costs are bounded: the strip is dismissible, the
dismissal persists, and a deck URL is only openable by its owner
(`getDeckDetail(id, userId)`). The reasoning is recorded in a comment on the
prop in `src/app/decks/[id]/page.tsx`.

---

## Addendum — the resolution journey (PR 8), run at PR 9

The gate above was written at PR 7, before the `Couldn't identify` rows could be
*answered*. PR 8 added a second journey with its own lifecycle, and two of this
run's most substantive bugs were found in it — both invisible on a single
forward pass, which is the whole argument for this gate.

**Forward.** Expand a row → search (unfiltered, owned-only overridden off) →
pick → the line goes and the card joins the 99. `resolution-expander.test.tsx`
and `unresolved-group.test.tsx` drive the real components; `import-actions.test.ts`
drives the real Drizzle builders against a fake that records the emitted SQL.

**Reverse.** `Delete this line` drops the row and the deck's total shrinks
100 → 99 — the intent, not a side effect. Collapse (`Esc`, or `Leave it for now`
on the phone) returns focus to the row that opened the expander and resets the
per-row owned-only override, so the next row opens in the drawn default rather
than inheriting the previous row's hidden state.

**Repeat — where both bugs were.** Resolving unmounts the row, so there is no
redo of one line. The dangerous case is *cross-action*, and it failed twice:

1. **Client.** Resolve and delete each held their own `useDeckMutation` latch, so
   each stopped itself repeating but neither saw the other. Both could answer one
   line; whichever `DELETE` landed first claimed it and the loser drew
   `unresolved row not found` as an error on a row that was already gone. Closed
   with one shared `answeredRef` (`resolution-expander.tsx:91`).
2. **Server.** `resolveUnresolvedRow` read the row and deleted it at the end of
   the transaction, so two concurrent resolves could both see it — harmless for
   the singleton insert, but the basic-land branch adds the line's `quantity` and
   would have added it twice. Closed by claiming the row with
   `DELETE ... RETURNING quantity` (`import-actions.ts:226`). `deleteUnresolvedRow`
   already had this shape; resolve was the outlier.

Both have regression tests and both tests were mutation-tested.

**Resume.** A reload mid-resolution loses the expander, which is correct —
nothing was committed, and the unresolved rows come back from the server intact.
Two sessions answering the same line: the second's transaction throws
`unresolved row not found`, surfacing as the mutation's error state rather than a
silent divergence.

**Mutation feedback — the one row that needs Hugh's device.** Every mutation here
goes through `useDeckMutation` + `useOptimisticDeckCards`, and the override clears
on the **server value changing**, not on mutation success — the ordering that
stops the override dropping before the new HTML lands and flashing the old state.
That is the "I'm going!" bug's fix applied preventatively, asserted by checking
the optimistic count before the server prop moves. **What was not measured is the
real gap between click and paint on a throttled connection.** A fast local machine
hides that class entirely, and no throttled run was possible in this environment.
It is the single line in this document most worth thirty seconds of Hugh's time.

---

## Verdict

Forward, reverse and repeat hold at the level this environment can test.
Resume holds by construction and is the least directly exercised of the four —
the cross-tab and reload behaviours are inherited from a mechanism already in
production (`useCelebrated`) rather than newly written, which is why the
extraction into `useLocalFlag` was done as a shared hook rather than a copy.
