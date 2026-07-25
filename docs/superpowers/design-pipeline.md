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

## Voice & tone — locked

The 99's voice ("Kitchen Table") was locked 2026-07-20 and is **not re-opened per ticket**. The canonical statement lives in the "Voice snapshot (locked — verbatim)" section of `design/design_handoff_the99_richness/README.md`. A handoff prompt's **Copy → Voice rule** slot points at that section rather than reproducing it; deliberately not restated here either, because a second copy is a second thing to drift.

The same handoff locks the character layer that carries the voice visually — the crab, and the kaiju it stares down — along with where character is and isn't allowed to appear. Surface work inherits both; neither is a per-ticket decision.

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

Both tracks converge on the same plan-PR-and-Copilot-review step. The Copilot merge bar and cadence: request a review after opening and after every push, fix all valid findings, and merge only once a clean or Low/Nit-only round lands on the latest push.

---

## Design Readiness Review

The gate between a design handoff and its plan PR. Audits the design folder against seven dimensions and outputs a verdict.

### Audit dimensions

| Dimension | What we check |
|-----------|---------------|
| 🗺️ **Scope clarity** | Boundary defined? Non-goals stated? Open questions logged? |
| 🎭 **State coverage** | Loading / error / empty / auth states? Edge cases? Mobile + desktop parity? |
| 🔌 **Data contract** | Backend exists to support this? Schema / server-action gaps? Props / types clear? Every named state reachable? |
| 🧱 **Codebase fit** | Uses the brand tokens (`design/design_handoff_the99_brand/README.md`) and the richness baseline (`design/design_handoff_the99_richness/README.md`)? Leverages existing components? Follows repo conventions? |
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
- The exemption is narrow: only a handoff shipping **no surfaces and naming no states** — tokens, type, logomark, voice — skips the audit. The brand handoff (`design/design_handoff_the99_brand/`) qualifies, and feature audits check *against* it instead. Anything shipping per-surface mocks is a feature for audit purposes however system-wide its intent, so the richness pass got a READINESS like any other.

---

## Handoff prompt template (Track 2 → Design)

The brief we hand to Claude Design when opening a design ticket. Design owns visual system decisions and lands the mock reliably from the brand files on its own — what needs your specificity is the **interaction model, entry/exit, copy intent, and locked-vs-open scope**. The more of that you lock, the less Design has to guess and the fewer iteration rounds it costs.

This template was revised 2026-07-20 based on Claude Design's own post-mortem on The 99's early rounds (missed IA calls) and the concert-crawl handoffs that landed 🟢 Green on round 1. Do not skip sections — if any bullet feels light, tell Design to restate its assumptions before it builds.

```markdown
### Feature / surface + route

<One line — the thing being designed and where it lives (route or component slot).>

### Where it lives in the flow (entry → this → exit)

- **Entry:** <the exact trigger — link/button/keyboard/URL — name it, don't imply it>
- **This surface:** <what the surface itself contains, at a shape level>
- **Exit:** <how the user leaves — dismiss, navigate, blocking or non-blocking of the caller>

### Design system / files to build from

- Brand tokens: `design/design_handoff_the99_brand/`
- Richness pass (character layer, density dials, animation posture, contrast floor): `design/design_handoff_the99_richness/` — `The 99 - App Shell v2.dc.html` and `The 99 - Surfaces v2.dc.html` are the current visual baseline, not the v1 mocks
- Adjacent shipped surfaces to match: `design/design_handoff_the99_<feature>/`

### Interaction model

- **CTAs and what each does** — one CTA or many? Name each and its effect.
- **Actionable vs view-only** — call it out explicitly. View-only surfaces do not get a "Done" button.
- **Dismiss / navigation** — Escape, backdrop, close control? Where does focus go after?
- **Any modal-state rules** — filter reset on tab switch, form clear on close, etc.

### Data contract

- Field shape from the server (`SomeType.field: type` — link the type)
- Where in the codebase the type is defined
- Whether new data is needed (default: no)
- **Treat every count and label in your mocks as real production data.** Do not use placeholder counts that could ship as-is (e.g. "Showing 12 of 12" over 3 rows).

### States to cover (name all — do not skip)

- Loading / error / empty / edge — name each one
- For any list with multiple sections: state BOTH empty-tab directions explicitly
- Long-list case if scale matters

### Copy

- **Lift copy verbatim into a copy file** (eng-side call for exact path — usually `src/lib/copy/…`). Every string in the surface — header, labels, placeholders, empty states, per-row text — appears as final production copy in the mock, not paraphrased later.
- **Voice rule** — one line (e.g. "terse, mono for data, no reassurance fluff") or point to a precedent handoff whose voice this should match.

### Locked (do not propose alternatives)

<Everything already decided — pattern, tabs, sort order, adjacent flows, brand tokens.>

### Open — propose options

<The specific things you want Design to explore — density, close-affordance shape, filter treatment, mobile pattern where both make sense, etc.>

### Viewports + a11y baseline

- Mobile + desktop parity, both ship in the same PR
- Focus trap / Escape / first-focusable rules if it's a modal
- ARIA semantics for the pattern (tabs, dialog, listbox, etc.)
- Contrast per the brand sheet

### Deliverables

- Hi-fi mockups for both viewports covering **every** state above
- Prefer a single component with variant props over separate components (per concert-crawl's shipped pattern)
- Component handoff with brand-token references
- Decisions log in the handoff README, marking locked vs tentative
- Copy exported as strings ready to paste into eng's copy file
- Any max-rendered / density recommendation eng needs to pick virtualization vs plain overflow

**If any bullet feels light, restate interaction and copy assumptions in chat before building — cheaper to correct a bullet list than a mockup.**
```

### Key principles

- **Interaction + copy = your job. Visual system = Design's.** Don't pre-decide brand-native visual choices; do decide behavior and words.
- **Lock explicitly, open explicitly.** Anything not marked locked is fair game for Design to explore. Anything not marked open won't be revisited.
- **Name every state.** Design covers what you name. Unnamed states get missed.
- **Name entry and exit up front.** If the trigger isn't in the brief, it'll be added in round 2.
- **Real copy in mocks.** Numeric counts and labels in the mock should be production-ready; ambiguity in "is this real?" costs a round.
- **Meta-tip:** for light briefs, tell Design to restate its interaction/copy assumptions before building. Costs one message, saves a round.

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

## Status snapshot (as of 2026-07-24)

Ticket-by-ticket state lives in `docs/superpowers/design-pipeline-status.md`. This section covers the system layers everything builds on, plus the places shipped UI currently diverges from them — the context a handoff author needs before writing a prompt.

- **Brand system** (`design/design_handoff_the99_brand/`) — Palette A "Table Candlelight," Cinzel + IBM Plex, logomark, tokens. Refreshed 2026-07-24 (PR #54); `support.js` is a runtime dependency of the `.dc.html` previews.
- **Richness pass** (`design/design_handoff_the99_richness/`) — landed 2026-07-24 (PR #54), from design ticket #51. Adds the crab/kaiju character layer, per-surface density dials, animation posture, texture, and a contrast floor on top of the locked brand base. Merges into the existing surface property tables as the new baseline rather than replacing them. It ships per-surface mocks, so it was audited like a feature — 🟡 Yellow, `design/design_handoff_the99_richness/READINESS.md` — and the four refresh tickets (#58–#61) are sequenced by one plan PR off that verdict.
- **Voice** — locked; see the Voice & tone section above.
- **v1 UI surfaces** (#5 app shell, #6 collection, #7 commanders, #8 decks) all shipped 2026-07-19 against the pre-richness baseline. Each has a follow-up ticket to apply brand tokens + the richness pass; until those land, shipped UI and the handoff mocks diverge.
- **Issue Inspector** (#36) shipped 2026-07-20 (PR #50). Two handoff copies now exist — the Yellow-verified standalone `design/design_handoff_the99_issue_inspector/` that drove the implementation, and a collection-nested duplicate whose mock is byte-identical. The nested README documents a footer that appears in neither mock nor `src/`. Canonical location and that footer are unresolved; tracked in #62.
