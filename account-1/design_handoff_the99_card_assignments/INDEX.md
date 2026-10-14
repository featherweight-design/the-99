# INDEX — assigning a contested copy

**Read in this order.**

| File | What it is |
|---|---|
| `The 99 - Card Assignments (R2).dc.html` | **The canvas. Start here.** Ten frames — the two verbs, the summary, the contested row's every state, the two demands, both doors, the seam with the replace flow, all six themes, the contract. |
| `README.md` | The decisions log, with the reasoning behind each. 15 numbered decisions, the frame table, component notes, engineering notes, open questions, gap report. |
| `STATES-assignments.md` | The state matrix. **A** is the summary route (15 states), **B** is `ContestedCardRow` (26 states). |
| `card-assignments · copy strings.ts` | Every string, with the reasoning in comments — including what is deliberately absent and why. |
| `READINESS.md` | **🟠 amber.** Five blocking items, what is ratified, metrics, contrast, accessibility, and what is deliberately not designed. |
| `The 99 - Card Assignments (R1).dc.html` | Kept for the diff only. **Drawn without the spec — do not read as a design record.** |
| `brand/` | The locked brand sheet, copied in for self-containment. |
| `The 99 - Card Assignments (R2) - standalone.html` | The canvas as one offline file, for sharing outside the project. |

---

## What this gates

**PRs 3 and 4** of `docs/superpowers/specs/2026-09-14-card-assignments-design.md`. PRs 1 and 2 (the
migration, the reservation term, the arrivals diff, `summary_payload`, the confirm's idempotency and
the `/decks` invalidation fix) carry no design gate and can proceed now.

## The five things that need a ruling before build

1. **The marker becomes a tap target** — `availability-marker.tsx` rules it never is, and the
   deck-page door depends on it. The only shipped ruling this handoff contradicts.
2. **The assignment action must return a named refusal cause** — three drawable causes, each with
   its own sentence and redraw. A generic failure means the spec's *"reported on the row rather than
   swallowed"* goes unmet.
3. **A refusal response must carry the row's fresh state** — arrivals, claimants, allocation — from
   the transaction that refused. One round trip.
4. **`claims[].commander` must be per copy, not per claim** — or the folded commander-plus-list-copy
   row is undrawable and has to go fully inert, hiding a legal choice.
5. **`IssueInspector` must be reachable after the confirm**, or the header's issues line keeps its
   counts and drops its link.

## Three things flagged, not fixed

- **The canvas is drawn on the retired brass `#C9A24B`.** Low Sun's real accent is `#CF8745`.
  Inherited with this folder's brand sheet; the same rebase is already filed against
  `design_handoff_the99_appshell`. **Build from frame 9 and `globals.css`, not frames 1–8.**
- **In Oil Haze, `--accent` as small text is 4.39:1** — so `Back to first committed` fails in one
  theme. Every accent link in that theme inherits it, so it is not this feature's to fix.
- **`review.lede` is wrong by two** on `/changes`, and **`review.bucketFreeNote` says "in the box"**,
  which `availability.ts` bans. Both raised, neither edited.
