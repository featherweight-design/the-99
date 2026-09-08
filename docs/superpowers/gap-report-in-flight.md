# Gap Report — In-flight feedback for control flips that fetch (R2)

**Handoff:** `design/design_handoff_the99_in_flight` (R2)
**Verified against:** `src/components/commanders/page-header.tsx`, `discovery-view.tsx`,
`commanders-view.tsx`, `list-nav.ts`, `src/lib/copy/commander-discovery.ts`,
`src/lib/discovery/list-wiring.test.ts`
**Widths:** 390px and 1280px
**Date:** 2026-09-07

## Verdict

**🟢 Green.** R1's one blocking finding is closed correctly, and no new blocking finding
replaces it. Two residual corrections are recorded below; both are eng-resolvable and
neither is a design call, so this does not go back to Design for a round-trip — Design is
asked to ratify them, not to redraw.

## R1's blocker, and how R2 closes it

R1 ruled on a **three-clause** subtitle and assigned `re-reading…` to `read against N
cards`. That clause is the one part of the sentence that is invariant under an
availability flip, and the invariant is locked and tested at
`src/lib/discovery/list-wiring.test.ts:110-114`:

```ts
// "read against N cards" names the collection. Scoping it to the free pool
// would make the number move when a deck is built.
expect(got.cardsRead).toBe(2);
```

R2 counts four clauses, retires `re-reading…`, gives clause 3 no pending state at all
(ruling 4c), and moves the availability participle onto the clause that actually changes:

| # | Clause (discovery, defaults) | Owner | In flight |
|---|---|---|---|
| 1 | `3,100 commanders you have not built` | scope (server) | `counting…` |
| 2 | `ranked by best fit` | sort (server) | `re-ranking…` |
| 3 | `read against 2,805 cards` | **nobody** | **never** |
| 4 | `free cards only` / `every card you own` | availability (server) | `re-scoring…` |

The never-longer-than-what-it-replaces constraint holds at the tightest measurement:
`re-scoring…` is 11 characters against the 15 of `free cards only`, clause 4's shortest
form. So the wrap point can only move earlier and the list can only move up, which is
what the 390px open item in `READINESS.md` is about.

## Corrections made on port — Design to ratify, not redraw

**Correction 1 — "two participles under `I own`" is one.**
`RULING-in-flight-feedback.md` and the header comment of `in-flight · copy strings.ts`
both state *"Two participles are reachable under `I own`, three under `To play`."*
`commanders-view.tsx:284-294` passes `onAvailChange={setAvail}` and **no `availPending`**:
under the owned scope, availability is a pure client-side swap over data already on the
client, with nothing to wait for. Design's own ruling 7 says exactly this ("the
client-side controls get no mark"), so the sentence contradicts the ruling two pages
above it rather than adding to it. **Exactly one participle — `counting…` — is reachable
under `I own`.** Recorded as a doc-sync slip; the code follows ruling 7.

**Correction 2 — `ordering` is always present; only its pending-ness is scope-dependent.**
The R2 assembler types `ordering?: string; // absent under the owned scope — no sort
control there` and runs `.filter(Boolean)`. Taken literally that deletes `ranked by fit`
from the shipped owned-scope subtitle (`src/lib/copy/commander-discovery.ts:50-51`), which
is a copy regression no drawing asks for. The true statement is narrower: the owned scope
has no sort *control*, so clause 2 there can never go pending. **On port, `ordering` is a
required field and `pending === 'sort'` is unreachable under the owned scope.**

## Verified, not assumed

- **All three pending flags already exist and are already wired.**
  `discovery-view.tsx:114-116` holds `scopeNav`/`sortNav`/`availNav`; their `pending` is
  already passed to the scope control (`:512`), the sort menu (`:257`) and the
  availability control (`:530`). This handoff adds the 500 ms gate and the subtitle
  clause, not the plumbing.
- **A cache-served repeat flip does not go pending.** `useDiscoveryCache` writes the URL
  with `history.replaceState` rather than routing, so no transition starts and
  `useParamNav`'s `isPending` never flips. READINESS's claim holds.
- **Search is correctly excluded.** `discovery-view.tsx:404` computes a fifth in-flight
  boolean from the `findExcludedMatches` action, but that action filters client-side and
  never gates the visible list. R2 names it as explicit no-treatment (ruling 12b), which
  is the right call and closes R1's second non-blocking note.
- **The no-scope arm of the header is untouched.** `page-header.tsx:66-68` renders
  `N cards scanned · ranked by fit`, has no controls above it, and gains no pending state.
- **The three amendment targets exist verbatim** at the quoted line numbers in
  `CONTROLS-four-above-one-list.md`, `The 99 - Commander Discovery.dc.html` and
  `CONTROLS-six-above-one-list.md`.

## Open item, carried not closed

READINESS §"Needs a decision" item 1 — the ~14px transient line loss at 390px — is drawn
as-is and stays that way. It is a judgement to make on a device, not a blocker, and the
fallback (a `min-height` at 390px only) is one line of CSS.

## Sequencing

Another agent is mid-flight on the Commanders and Discover views under
`design/design_handoff_the99_refresh`. Its Conformance table (`README.md:69-77`) commits
to *"Every figure stays. Search moves in with the filters"* — a `filter-bar.tsx` change.
This work is `page-header.tsx` plus copy modules, so the two do not collide, but the plan
lands after that work settles regardless.
