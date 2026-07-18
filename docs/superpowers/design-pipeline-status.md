# 🎨 Design Pipeline Status

Living tracker of every design-track ticket + its position in the pipeline (workshop → handoff → readiness audit → build). Updated **optimistically** as items move between stages — the tracker is the answer to "what's ready for eng to pick right now?" and stays fresh only if maintained in the same PR as the state change.

> **Pipeline workflow reference:** `docs/superpowers/design-pipeline.md`

---

## Legend

| Symbol | Meaning |
|---|---|
| 🟢 | Ready for implementation (handoff landed AND readiness verdict Green — plan PR / build not yet started) |
| 🟡 | Audit complete, verdict Yellow — needs a light Design addendum pass to flip Green |
| 📐 | Brief locked, awaiting Claude Design handoff production (mocks, components) |
| 🎨 | Design in flight (workshop / handoff iteration / audit) |
| 🚦 | Paused (mid-workshop; awaiting Hugh input or external dependency) |
| 🕰️ | Backlog (design cycle not started) |
| ⏳ | Ready for design (labelled `type: design`, not yet workshopped) |
| ✅ | Fully implemented + shipped |

---

## 🟢 Ready for implementation (design complete, Green)

| # / vertical | Handoff | Verdict | Notes |
|---|---|---|---|

_Currently empty._

---

## 🟡 Awaiting Design addendum (audit Yellow, one light pass to flip Green)

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

_Currently empty._

---

## 🚦 Paused (mid-workshop)

_Currently empty._

---

## 🕰️ Backlog (design cycle not started)

Ranked by build order. #5 (app shell) blocks all other UI builds — every surface renders inside it. Backend for each v1 surface proceeds ahead of design per the UI gate.

| Rank | Ticket | Adjacency / notes |
|---|---|---|
| 1 | **#5** Design: App shell — nav, auth chrome, empty/first-run states | Blocker — all other UI surfaces render inside this frame; first-run flow points at Collection upload |
| 2 | **#6** Design: Collection — CSV upload flow + collection view | First real user action (ManaBox CSV → preview → confirm); feeds everything downstream |
| 3 | **#7** Design: Commander recommendations — ranked, explainable list | Consumes collection data; per-commander EDHREC-degraded state must be designed |
| 4 | **#8** Design: Decks — list, create-from-commander, and deck builder | Largest surface (suggestions panel, search, role counters, gaps/shopping list, export); entry point lives on #7's list |
| 5 | **#9** Design: Win/loss tracking for decks | Post-v1; extends the deck page from #8 |
| 6 | **#10** Design: Deck tuning suggestions from play results | Post-v1; blocked on #9's data model |

---

## ⏳ Ready for design (not yet workshopped)

_Currently empty — all open design tickets are ranked in the Backlog above; each moves to 🎨 when its workshop starts._
