# The 99 — Design Pipeline

The 99 runs a structured design pipeline: every consumer-facing UI ships from a workshopped design brief, a readiness-audited handoff, and a Copilot-reviewed implementation plan — before any UI code is written. This document is the canonical reference for the workflow.

Adopted 2026-07-18 from the Concert Crawl design pipeline (`concert-crawl/docs/superpowers/design-pipeline.md`), adapted for this repo. Even though The 99 is a smaller app, it gets the same design foundation.

---

## Hard rules

1. **No UI is built without Design mocks.** API, DB, server actions, and pure-logic work may proceed ahead of design; pages and components may not.
2. **Mobile + desktop parity is non-negotiable.** Every behavior and state ships on both surfaces in the same PR; visual presentation may differ, the capability set may not.
3. **Every designed state must be reachable** before UI work starts — the triggering data exists in the server contract and is actually computed, not stubbed.
4. **Design owns design decisions.** Handoff briefs state the problem and technical requirements; they never pre-decide layouts, control shapes, state lists, or mobile patterns.

---

## The two tracks

**Track 1 — design done, build pending:**

1. Design Readiness Review (audit → verdict in `READINESS.md`)
2. Green/Yellow → plan PR (workshopped with Hugh) → Copilot review loop → merge → implementation
3. Orange/Red → addendum or new design ticket → Track 2

**Track 2 — design needed:**

1. Ticket workshop with Hugh (problem framing, scope)
2. Handoff prompt written per the template below
3. Claude Design produces the handoff (iterative review with Hugh)
4. Merged handoff lands in `design/design_handoff_<feature>/`
5. Design Readiness Review as a parity gate → Track 1

Both tracks converge on the same plan-PR-and-Copilot-review step. The Copilot merge bar and cadence follow the standing review policy applied across all of Hugh's projects (maintained in user-scope agent instructions, outside this repo): request a review after opening and after every push, fix all valid findings, and merge only once a clean or Low/Nit-only round lands on the latest push.

---

## Design Readiness Review

The gate between a design handoff and its plan PR. Audits the design folder against seven dimensions and outputs a verdict.

### Audit dimensions

| Dimension | What we check |
|-----------|---------------|
| 🗺️ **Scope clarity** | Boundary defined? Non-goals stated? Open questions logged? |
| 🎭 **State coverage** | Loading / error / empty / auth states? Edge cases? Mobile + desktop parity? |
| 🔌 **Data contract** | Backend exists to support this? Schema / server-action gaps? Props / types clear? Every named state reachable? |
| 🧱 **Codebase fit** | Uses the brand tokens (`design/design_handoff_the99_brand/README.md`)? Leverages existing components? Follows repo conventions? |
| ♿ **Cross-cutting** | A11y addressed (contrast per the brand sheet, focus, semantics)? Performance implications? |
| ⏰ **Drift from reality** | Designed before schema/plan changes? Referenced screens / data still accurate? |
| 📝 **Decision log** | Key decisions documented in the handoff README? Locked vs. tentative clearly marked? |

### Verdicts

| Verdict | Meaning | Next step |
|---------|---------|-----------|
| ✅ **Green** | Ready as-is | Move to plan PR |
| 🟡 **Yellow** | Ready with eng-side clarifications | Plan PR addresses gaps in implementation notes |
| 🟠 **Orange** | Small Design round-trip needed | Addendum ticket, light scope |
| 🔴 **Red** | Significant gaps | New design ticket, full Track 2 workshop |

### Output: READINESS.md

Lives at `design/design_handoff_<feature>/READINESS.md`.

```markdown
# Readiness Review — <Feature Name>

**Verdict:** ✅ Green / 🟡 Yellow / 🟠 Orange / 🔴 Red
**Audited:** YYYY-MM-DD
**Related ticket(s):** #N
**Plan PR target:** <repo-relative path or "TBD">

## Summary

One paragraph: what's ready, what's not, what we're doing about it.

## Per-dimension findings

### 🗺️ Scope clarity
- [✅/🟡/🟠/🔴] <observation>

(repeat for all seven dimensions)

## Gaps requiring Design round-trip (Orange/Red only)

- Gap 1: <description, what to ask Design>

## Eng-side clarifications (Yellow only)

- Item 1: <decision eng will make in plan PR>

## Decisions inherited

Anything locked in the handoff or via prior Hugh conversation that the plan PR must respect.
```

### When to run

- After merging any new handoff, before opening its plan PR (parity gate — applies even to handoffs produced through this workflow).
- Re-audit if the handoff changes after an addendum cycle.
- The brand handoff (`design_handoff_the99_brand`) is a system, not a feature — it doesn't get a READINESS.md; feature audits check *against* it instead.

---

## Handoff prompt template (Track 2 → Design)

The brief we hand to Claude Design when opening a design ticket. Keep it minimal — 2–4 short paragraphs' worth of content: problem + surfaces + technical hooks + ask. Design owns the decisions.

```markdown
## Problem (objective)

<One paragraph stating the user-visible problem, ideally with a real scenario.
No solution language.>

## App context (reminders for Design)

- Where this lives in the product
- Related features it interacts with
- Constraints from the existing system (brand system in design_handoff_the99_brand; mobile-first; Tailwind theme derived from the brand tokens)
- What user(s) this affects

## Technical requirements

- Data we have today (link to types / schema / plan sections)
- Data we don't have (and whether we'd build it for this)
- Auth requirements (all consumer surfaces are Clerk-authenticated)
- Performance / scale considerations (if any)

## Deliverables we expect

- Hi-fi mockups for required states
- Mobile + desktop both required
- Decisions log in the handoff README
- Component handoff with token references
```

**Key principles:** don't pre-decide page sizes, control shapes, state lists, or mobile patterns; describe the user pain, not the proposed remedy; include app-context reminders because Claude Design doesn't have codebase access.

---

## Roles & artifacts

| Role | Artifact | Lives at |
|------|----------|----------|
| Hugh + agent workshop | Design ticket | GitHub Issues |
| Design produces | Design handoff folder + README | `design/design_handoff_<feature>/` |
| Hugh + agent audit | Readiness Review | `design/design_handoff_<feature>/READINESS.md` |
| Hugh + agent workshop | Implementation plan | `docs/superpowers/plans/` (directory is introduced by each plan PR; the v1 plan PR #2 creates it) |
| Copilot reviews | Review threads on plan PR | GitHub PR |
| Eng builds | Implementation PR(s) | GitHub PR — references plan + handoff |

Traceability chain: design ticket → handoff folder → plan PR → implementation PR(s), cross-linked in PR bodies.

---

## Status snapshot (as of 2026-07-18)

- **Landed:** brand system handoff (`design_handoff_the99_brand`) — Palette A "Table Candlelight," type system, logomark, tokens.
- **v1 UI surfaces needing Track 2 tickets** (from the v1 plan — `docs/superpowers/plans/2026-07-18-the-99-v1.md`, landing via plan PR #2, in review; backend for each proceeds ahead of design per the UI gate):
  1. Collection — upload flow (CSV preview/confirm) + collection table
  2. Commander recommendations — ranked, explainable list
  3. Decks — list, create-from-commander, deck builder (suggestions panel, search, role counters, gaps/shopping list, export)
  4. App shell — nav, auth chrome, empty/first-run states
