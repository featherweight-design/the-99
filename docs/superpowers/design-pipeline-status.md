# 🎨 Design Pipeline Status

Living tracker of every design-track ticket + its position in the pipeline (workshop → handoff → readiness audit → build). Updated **optimistically** as items move between stages — the tracker is the answer to "what's ready for eng to pick right now?" and stays fresh only if maintained in the same PR as the state change.

> **Pipeline workflow reference:** `docs/superpowers/design-pipeline.md`

## System layers (not tickets — everything below builds on these)

| Layer | Handoff | Landed |
|---|---|---|
| Brand system — Palette A "Table Candlelight," Cinzel + IBM Plex, logomark, tokens | `design/design_handoff_the99_brand/` | refreshed 2026-07-24 (PR #54) |
| Voice — Kitchen Table (locked, verbatim in the richness README) | `design/design_handoff_the99_richness/README.md` | locked 2026-07-20 |

The READINESS exemption is narrow: it covers only a handoff that ships no surfaces and names no states. The richness pass ships per-surface mocks, so it is audited like a feature and sits in 🟢 below rather than here.

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
| **#52** Commanders · list windowing | `design/design_handoff_the99_commanders_windowing/` | 🟡 Yellow (2026-07-25, R2) | R1 was 🟠 Orange; R2 closed both blockers — the window count now carries no total (`25 shown · 71 more below`) so it can't collide with the shipped `Showing 96 of 214`, and new state **1b** draws both figures together at desktop (1060px) + mobile (392px). Three eng-side notes in `READINESS.md`: the live-region announcement still uses the phrasing decision 5 forbids (apply decision 5's form); `REVEAL_STEP = 25 > 24` beta candidates means the control is unreachable, so the ticket needs an explicit verification path; focus-on-reveal goes on the `<li>` at index `shown - REVEAL_STEP`. |
| **#51** Richness pass — applied across the four v1 surfaces via ~~**#58** shell~~ (shipped), **#59** collection, **#60** commanders, **#61** decks | `design/design_handoff_the99_richness/` | 🟡 Yellow (2026-07-24) | One plan PR sequences all four: #58 → #59/#60 → #61. **#58 shipped 2026-07-25 (PR #66)** — it landed the `prefers-reduced-motion` pattern at `globals.css:166-173` and the global focus ring at `:133-135`, closing two of the seven eng-side decisions. #59/#60/#61 remain. Mobile composition for the 99/99 celebration may need a Design addendum. |
| **#35** Branded user menu (eng **#13**) | `design/design_handoff_the99_user_menu/` | 🟡 Yellow (2026-07-25) | All eight locked decisions in `docs/superpowers/specs/2026-07-25-branded-user-menu-design.md` honoured, including the three superseding `appshell.md`. All eleven cited tokens verified against `globals.css` at the exact hex; no new token. Six eng-side notes in `READINESS.md`: the popover email is **4.42:1** and fails AA (use `--fg-muted`, 8.48:1 — the README's 4.6:1 figure is wrong); the backdrop is specified `rgba(10,8,6,0.72)` but the shipped modals both use `rgba(8,6,4,0.72)`, so the stated "overlays never disagree" rationale inverts itself; the sheet's `#1E1A15` is `--surface` and should be tokenized; the top-anchored popover flip in decision 3 is **unreachable** (mobile triggers open the sheet, and the `/commanders` desktop header has no trigger) so skip that branch; the focus-ring citation `:130` is actually `:133-135`. |

---

## 🟡 Awaiting Design addendum (audit Orange, one light Design pass to flip Green)

Holds items whose readiness verdict was 🟠 Orange — per `design-pipeline.md`, Orange means a small Design round-trip; a 🟡 Yellow verdict proceeds straight to plan PR and lands in 🟢 above.

| # / handoff | Verdict PR | Blockers to close | Effort |
|---|---|---|---|

_Currently empty — #52's R1 Orange was closed by the R2 revision (see 🟢 above)._

---

## 📐 Brief locked, awaiting Claude Design handoff production

| Rank | Ticket | Brief | Path to eng handoff | Why this rank |
|---|---|---|---|---|

_Currently empty._

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

Ranked by build order per the post-v1 roadmap tracker (#44). The per-surface brand + richness refresh tickets and #35 run ahead of these features.

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
| **#62** Issue Inspector handoff reconciliation | `type: design`. Two copies of the #36 handoff exist; the mocks are byte-identical, and the nested README documents a footer (`View only · fix in export & re-upload`) present in neither mock nor `src/`. Needs a call on canonical location + whether that footer ships. |

---

## ✅ Shipped

All five shipped against the pre-richness baseline. The four v1 surfaces each have an open eng ticket to apply brand tokens + the richness pass — until those land, shipped UI and the current handoff mocks diverge.

| # / vertical | Handoff | Shipped |
|---|---|---|
| **#5** App shell — nav, auth chrome, empty/first-run states | `design/design_handoff_the99_appshell/` | 2026-07-19 (PR #15) |
| **#6** Collection — CSV upload flow + collection view | `design/design_handoff_the99_collection/` | 2026-07-19 (PR #18) |
| **#7** Commander recommendations — ranked, explainable list | `design/design_handoff_the99_commanders/` | 2026-07-19 (PR #21) |
| **#8** Decks — list, create-from-commander, and deck builder | `design/design_handoff_the99_decks/` | 2026-07-19 (PR #25) |
| **#36** Issue Inspector — full-list "Show all X unmatched" modal | `design/design_handoff_the99_issue_inspector/` | 2026-07-20 (PR #50) |
