# 🎨 Design Pipeline Status

Living tracker of every design-track ticket + its position in the pipeline (workshop → handoff → readiness audit → build). Updated **optimistically** as items move between stages — the tracker is the answer to "what's ready for eng to pick right now?" and stays fresh only if maintained in the same PR as the state change.

> **Pipeline workflow reference:** `docs/superpowers/design-pipeline.md`

---

## Legend

| Symbol | Meaning |
|---|---|
| 🟢 | Ready for implementation (handoff landed AND readiness verdict ✅ Green or 🟡 Yellow — Yellow's gaps are closed eng-side in the plan PR; plan PR / build not yet started) |
| 🟡 | Awaiting Design addendum — audit verdict was 🟠 Orange (small Design round-trip needed before flipping Green) |
| 📐 | Brief locked, awaiting Claude Design handoff production (mocks, components) |
| 🎨 | Design in flight (workshop / handoff iteration / audit) |
| 🚦 | Paused (mid-workshop; awaiting Hugh input or external dependency) |
| 🕰️ | Backlog (design cycle not started) |
| ⏳ | Ready for design (labelled `type: design`, not yet workshopped) |
| ✅ | Fully implemented + shipped |

---

## 🟢 Ready for implementation (design complete, verdict Green or Yellow)

| # / vertical | Handoff | Verdict | Notes |
|---|---|---|---|

_Currently empty._

---

## 🟡 Awaiting Design addendum (audit Orange, one light Design pass to flip Green)

Holds items whose readiness verdict was 🟠 Orange — per `design-pipeline.md`, Orange means a small Design round-trip; a 🟡 Yellow verdict proceeds straight to plan PR and lands in 🟢 above.

| # / handoff | Verdict PR | Blockers to close | Effort |
|---|---|---|---|

_Currently empty._

---

## 📐 Brief locked, awaiting Claude Design handoff production

| Rank | Ticket | Brief | Path to eng handoff | Why this rank |
|---|---|---|---|---|
| 1 | **#36** Design: Full-list "Show all X unmatched" experience | [`docs/superpowers/specs/2026-07-19-show-all-issues-modal-design.md`](../superpowers/specs/2026-07-19-show-all-issues-modal-design.md) | `design/design_handoff_the99_show_all_issues/` (once landed) | Workshopped 2026-07-19 (this PR). Modal replaces the current inline "Show all" expand on `/collection/replace/review`; view-only, Unmatched/Parse-errors tabs, filter. |

---

## 🎨 In flight

| Ticket | Stage | Notes |
|---|---|---|

_Currently empty — all four v1 UI surfaces (#5–#8) shipped 2026-07-19._

---

## 🚦 Paused (mid-workshop)

_Currently empty._

---

## 🕰️ Backlog (design cycle not started)

Ranked by build order per the post-v1 roadmap tracker (#44). A v1 visual-polish batch (Hugh's golden-path walkthrough list, forthcoming) plus #35/#36 run ahead of these features.

| Rank | Ticket | Adjacency / notes |
|---|---|---|
| 1 | **#9** Design: Win/loss tracking for decks (incl. per-game strength/weakness notes — one combined brief) | Post-v1; extends the deck page from #8; unlocks the tuning tier |
| 2 | **#42** Design: Import existing decks (Moxfield) | Post-v1; lands in #8's deck surfaces; reconciliation UX is the core |
| 3 | **#43** Design: Cross-check recommendations against committed cards | Post-v1; touches #7 recs + #8 builder; value scales with deck count, so after #42 |
| 4 | **#10** Design: Deck tuning suggestions from play results | Post-v1; LLM tier; blocked on #9's data model — last, needs accumulated play data |

---

## ⏳ Ready for design (not yet workshopped)

v1 polish follow-ups — sequenced ahead of the Backlog features above.

| Ticket | Notes |
|---|---|
| **#35** Design: Branded user menu replacing Clerk default | Desktop popover + mobile bottom-sheet; pairs with eng ticket #13 |

---

## ✅ Shipped

| # / vertical | Handoff | Shipped |
|---|---|---|
| **#5** App shell — nav, auth chrome, empty/first-run states | `design/design_handoff_the99_appshell/` | 2026-07-19 (PR #15) |
| **#6** Collection — CSV upload flow + collection view | `design/design_handoff_the99_collection/` | 2026-07-19 (PR #18) |
| **#7** Commander recommendations — ranked, explainable list | `design/design_handoff_the99_commanders/` | 2026-07-19 (PR #21) |
| **#8** Decks — list, create-from-commander, and deck builder | `design/design_handoff_the99_decks/` | 2026-07-19 (PR #25) |
