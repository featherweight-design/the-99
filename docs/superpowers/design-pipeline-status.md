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
| **#5** Design: App shell — nav, auth chrome, empty/first-run states | `design/design_handoff_the99_appshell/` | 🟡 Yellow (2026-07-18) | Rail + bottom tabs; home = dashboard / first-run checklist. Eng-side in plan PR: commander payload fields, paste-list action, un-gate `/`, focus states. CSV-format copy drift routed to #6; guided-flow steps 2–3 are #7/#8 first-run states. |

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

_Currently empty._

---

## 🎨 In flight

| Ticket | Stage | Notes |
|---|---|---|
| **#6** Design: Collection — CSV upload flow + collection view | Handoff prompt with Design | Workshop 2026-07-18: browse scope is search + color/type/set filters + sorting (collection query API to be built to match); card detail view in scope (image, oracle text — container is Design's call); uploads remain full-replace, no merge in v1. Inherits from #5 audit: resolve dropzone CSV-format copy vs ManaBox-only parser. |

---

## 🚦 Paused (mid-workshop)

_Currently empty._

---

## 🕰️ Backlog (design cycle not started)

Ranked by build order. Backend for each v1 surface proceeds ahead of design per the UI gate.

| Rank | Ticket | Adjacency / notes |
|---|---|---|
| 1 | **#7** Design: Commander recommendations — ranked, explainable list | Consumes collection data; per-commander EDHREC-degraded state must be designed |
| 2 | **#8** Design: Decks — list, create-from-commander, and deck builder | Largest surface (suggestions panel, search, role counters, gaps/shopping list, export); entry point lives on #7's list |
| 3 | **#9** Design: Win/loss tracking for decks | Post-v1; extends the deck page from #8 |
| 4 | **#10** Design: Deck tuning suggestions from play results | Post-v1; blocked on #9's data model |

---

## ⏳ Ready for design (not yet workshopped)

_Currently empty — all open design tickets are ranked in the Backlog above; each moves to 🎨 when its workshop starts._
