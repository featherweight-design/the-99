# 🎨 Design Pipeline Status

Living tracker of every design-track ticket + its position in the pipeline (workshop → handoff → readiness audit → build). Updated **optimistically** as items move between stages — the tracker is the answer to "what's ready for eng to pick right now?" and stays fresh only if maintained in the same PR as the state change.

> **Pipeline workflow reference:** `docs/superpowers/design-pipeline.md`

## System layers (not tickets — everything below builds on these)

| Layer | Handoff | Landed |
|---|---|---|
| Brand system — Palette A "Table Candlelight," Cinzel + IBM Plex, logomark, tokens | `design/design_handoff_the99_brand/` | refreshed 2026-07-24 (PR #54) |
| Voice — Kitchen Table (locked, verbatim in the richness README) | `design/design_handoff_the99_richness/README.md` | locked 2026-07-20 |

The READINESS exemption is narrow: it covers only a handoff that ships no surfaces and names no states. The richness pass ships per-surface mocks, so it was audited like a feature and sits in ✅ Shipped below rather than here.

---

## Legend

| Symbol | Meaning |
|---|---|
| 🟢 | Ready for implementation (handoff landed AND readiness verdict ✅ Green or 🟡 Yellow — Yellow's gaps are closed eng-side in the plan PR; plan PR / build not yet started) |
| 🟡 | Awaiting Design addendum — audit verdict was 🟠 Orange (small Design round-trip needed before flipping Green) |
| 📐 | Brief locked, awaiting Claude Design handoff production (mocks, components) |
| 🎨 | Design in flight (workshop / handoff iteration / audit) |
| 🚦 | Paused (mid-workshop; awaiting Hugh input or external dependency) |
| 🕰️ | Backlog — labelled `type: design`, design cycle not started (no workshop, no brief). Ranked; the top of this list is what Design picks up next |
| ✅ | Fully implemented + shipped |

**Every `type: design` ticket sits in exactly one state above.** A ticket that fits none of them is a gap in this legend, not a ticket to file under the closest match — add it here as an unplaced row and say why, so the mismatch is visible instead of absorbed.

---

## 🟢 Ready for implementation (design complete, verdict Green or Yellow)

| # / vertical | Handoff | Verdict | Notes |
|---|---|---|---|
| **#42** Design: Import existing decks (Moxfield) | `design/design_handoff_the99_deck_import/` | 🟢 Green (R2, post-audit) | Plan at `docs/superpowers/plans/2026-08-04-deck-import-plan.md`. Nineteen states at both breakpoints, rebased onto #158's add panel. The R2 audit ratified all three #158-opened calls (row-scoped combobox in an inline expander rather than the global bar; owned-only overridden off because matching runs against Scryfall, not the collection; unresolved rows outside both counts with the banner carrying the caveat) and closed every blocker without a redraw. Two audit corrections landed in R2: Design's "the parser can't tell failures 9 and 10 apart" was inverted — `parsePasteList` (`src/lib/manabox/paste.ts:38-40`) falls through to `quantity = 1` for any non-blank line, so gibberish yields rows that fail at *match*, not zero rows, and state 9's copy was rewritten from a parse failure to a match failure (`unparseable` → `noneMatched`). The completion-reveal collision was ruled 2026-08-04: suppress `shouldCelebrate()` on import-arrival, let it fire on the player's first own add. **Partially gated on build order — the plan's PRs 1–6 (schema, import pipeline, Moxfield fetch, entry surface, commander picker, counts + unresolved group) can start now; PRs 7–9 wait on #158's PR 6, because `quick-add-bar.tsx` does not exist yet and the arrival chrome sits inside the shell #158 rewrites** |
| **#176** Design: Consider's unowned tile variant | `design/design_handoff_the99_add_panel/` | ⏳ Needs Design | Raised mid-build on #175. The handoff calls a non-owned tile "not applicable in Consider (every suggestion is owned)", but `getDeckSuggestions()` has appended up to 5 unowned EDHREC staples since #25. Today an unowned staple signals itself only by the *absence* of the green dot, which is `aria-hidden`. Two questions for Design: does Consider keep surfacing unowned staples, and if so what does that tile look like and does the locked provenance string (`{n} cards you already own`) change |

---

## 🟡 Awaiting Design addendum (audit Orange, one light Design pass to flip Green)

Holds items whose readiness verdict was 🟠 Orange — per `design-pipeline.md`, Orange means a small Design round-trip; a 🟡 Yellow verdict proceeds straight to plan PR and lands in 🟢 above.

| # / handoff | Verdict PR | Blockers to close | Effort |
|---|---|---|---|

_Currently empty — #52's R1 Orange was closed by its R2 revision (✅ shipped below), and #105's by its R3 (shipped below)._

---

## 📐 Brief locked, awaiting Claude Design handoff production

| Rank | Ticket | Brief | Path to eng handoff | Why this rank |
|---|---|---|---|---|

_Currently empty — #42's R2 handoff landed and its audit came back Green, so it sits in 🟢 above._

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

One ranked queue. Ranks 1–12 are v1 polish follow-ups against already-shipped surfaces; ranks 13–17 are post-v1 features ordered by the roadmap tracker (#44). Rank 13 sorts ahead of the other post-v1 work because both of its eng dependencies have already shipped. The per-surface brand + richness refresh tickets and #35 shipped ahead of everything here.

This list previously ran as two — a "Backlog" and a "Ready for design" — but the legend gave them the same definition (`type: design`, not yet workshopped), so nothing could be sorted between them by rule. The split was really a priority band, which the Rank column now carries.

| Rank | Ticket | Adjacency / notes |
|---|---|---|
| 1 | **#140** Design: Inline error state for refused deck mutations | Ratification, not net-new design — the UI is **already live on `main`** (PR #139), which is why it outranks the rest. Five refusal strings need Design's sign-off or a rewrite; they are listed on the ticket |
| 2 | **#148** Design: ratify the richness pass interpretive calls | Ratification, same class as #140 — the UI is **already live on `main`** (PRs #66, #144, #145, #146). Three calls on the 99/99 completion reveal (band not surface, dismissible-only, a derived mobile composition) plus two invented strings the mock did not supply: a mobile empty-builder caption, and the guided banner's directive, which the mock's richness line would otherwise have deleted |
| 3 | **#182** Design: ratify the Add panel run's interpretive calls | Ratification, same class as #140 and #148 — the UI is **already live on `main`** (PRs #170, #171, #174, #175, #180, #181). Twelve calls in four groups: copy the build wrote or changed (including a LAND-vs-LANDS conflict between `mix.ts:74` and the locked copy file, and four em dashes still inside that lock), three figures shipped without a unit or a stated baseline, six canvas-vs-README divergences where eng followed the canvas, and one finding eng declined and confirmed wrong so it is not re-raised |
| 4 | **#172** Design: quick-add bar has no drawn state for a failed search | Same class as #140 and #148 — the UI ships in the #158 run, so this is the one state Design has not drawn rather than net-new work. The Add panel handoff draws quick-add's no-results state but nothing for `searchCards` itself failing, and the two are different claims: "nothing in the pile by that name" is about the collection, which a 500 has not earned. PR 4 ships the honest-but-silent behaviour (the list simply does not open) pending a drawn state. The `degraded` block in the same handoff is the nearest precedent but is sized for a panel, not a one-line bar, so this is a placement call |
| 5 | **#179** Design: mobile decklist has no way to remove a card | Same class as #172 — surfaced by the #158 run's Gate 5 reverse pass, and a gap in the drawn design rather than the build. `decks.md:1278` is titled "Row — remove ✕ button (desktop only)" and gives `—` for every mobile value, so a phone user can add cards to a deck and never take one out. Needs a call on the mobile affordance: swipe-to-remove, a row overflow menu, or an edit mode. Read with **#178** (the desktop remove has no optimistic path), which is the eng half of the same row |
| 6 | **#183** Design: mobile empty-builder caption clipped behind the sticky quick-add bar | Cold-eyes review's highest finding on the #158 run, shipped unfixed because both ends are locked — the caption is in the handoff's copy file and the bar's position is on the canvas, so padding the scroll region, moving the caption or hiding the bar on the empty state is a layout call rather than an edit. Read with **#177**: a general rule about what owns the bottom of a phone viewport answers both |
| 7 | **#184** Design: Consider's `consider →` links duplicate the cell and are sub-44px | Two cold-eyes findings, one fix. Five identical links diverge from the canvas's cell-is-the-link model used everywhere else, and as bare text links they miss the 44px tap minimum the run already resolved in favour of once (#182). Making the tile the target closes both, but needs a drawn hover/pressed state the shelf does not have |
| 8 | **#185** Design: no undo after removing a card from a deck | Gate 5 reverse pass. Removal is immediate and final, and #181's optimistic path made the row vanish fast enough that a mis-click is easy to make and hard to notice. Undo is the likely answer but has no home — toasts are not a pattern this app uses. Read with **#179** (mobile has no remove at all) and the now-closed **#178**: the three are one row's full lifecycle |
| 9 | **#177** Design: `/decks/new` Create button sits under the mobile tab bar | Same walk. `Create deck →` is occluded by the fixed bottom tab bar at phone width and is genuinely un-hittable, so deck creation has no mobile path at all. Eng could pad the page, but where a primary CTA lives against a fixed bottom bar is a placement call the mock does not answer, and the same collision will recur on every surface that pins a CTA low |
| 10 | **#159** Design: narrowing the commander recommendations | Same walk. The list offers no way in beyond scroll order — no filter by colour, mechanic, popularity or obscurity. Adjacent to **#52** (windowing — design shipped, eng ticket still open), which changes how much of the list is on screen but not how the user aims at it; whoever picks these up should read them together |
| 11 | **#160** Design: deck completeness guidance (lands, curve, multi-copy adds) | Same walk. Two halves: the builder never says how many lands a deck wants or how the curve looks, and adding several copies of a basic takes one click per copy. The second half is the eng-side "bulk add" from the feedback batch, held here because the affordance is a design question — a stepper on the row, a quantity field in the modal, or a lands-specific control |
| 12 | **#62** Design: Issue Inspector handoff reconciliation | Two copies of the #36 handoff exist; the mocks are byte-identical, and the nested README documents a footer (`View only · fix in export & re-upload`) present in neither mock nor `src/`. Needs a call on canonical location + whether that footer ships |
| 13 | **#130** + **#131** + **#132** Design: recommendations you can interrogate and act on — pre-populate a deck from recommendations · make Role Coverage explanatory and inspectable · suggest and add unowned cards | Post-v1. **One design cycle, not three** — Hugh flagged them as groupable when he filed them, and they share a premise: a recommendation the user cannot interrogate or act on is decoration. #131 is the seam; it needs #132's unowned cards to have anything to recommend beyond the collection, and it is where #130's "why was this picked" reasoning would surface. Split apart, each brief answers a third of one question. Both eng dependencies have now shipped — #127 landed the card-detail modal wiring #131's inspection gap needs, and #129 fixed the "Owned only" toggle under #132 — so nothing blocks this but a workshop. Open for #132: whether #44 already scopes it |
| 14 | **#9** Design: Win/loss tracking for decks (incl. per-game strength/weakness notes — one combined brief) | Post-v1; extends the deck page from #8; unlocks the tuning tier |
| 15 | **#43** Design: Cross-check recommendations against committed cards | Post-v1; touches #7 recs + #8 builder; value scales with deck count, so it sorts behind #42 (now 📐 above) |
| 16 | **#10** Design: Deck tuning suggestions from play results | Post-v1; LLM tier; blocked on #9's data model — needs accumulated play data |
| 17 | **#151** Design: per-deck printing override for a card's art | Post-v1. **Split out of #42** at the 2026-08-02 workshop — #42 had inherited it from #105 on the reasoning that a deck-level override needs a deck to attach to, but it is unrelated to import (import is getting a deck in; this is how a deck looks once it is there) and #42's brief was already large. Last because it is polish: `card_art_preferences` is keyed `(user_id, oracle_id)` and `deck_cards` has no printing column, so it needs new storage and a new read path for no functional gain |

### Rank 7 — open questions carried into the workshop

Kept here rather than in the table cell, since one cycle covers three tickets:

- **#130** — "Build this deck" drops the user into an empty deck at the moment of highest intent. Full auto-fill vs. opt-in per role vs. a reviewable "suggested starting 30"; what happens when the user owns too few cards for a role; how an auto-added card reads differently from a chosen one.
- **#131** — three gaps as one piece of work: no reasoning behind a grouping's picks, no way to open a recommended card, and no path from "good fit" to acting on it.
- **#132** — the All / Shopping split promises a buying workflow that cannot happen, because every recommendation path is scoped to the collection. Needs recommendations that reach outside it, and a way to add an unowned card.

---

## ✅ Shipped

The first six shipped against the pre-richness baseline; **#51** then applied brand tokens + the richness pass across all four v1 surfaces, so shipped UI and the current handoff mocks no longer diverge. Three interpretive calls on the 99/99 completion reveal — band rather than full surface, dismissible-only rather than a ~4s timer, and a derived mobile composition — are recorded in `docs/superpowers/design-tables/decks.md` §Completion Reveal. Those, plus two strings invented where the mock supplied none, await Design ratification as **#148** (backlog rank 2).

| # / vertical | Handoff | Shipped |
|---|---|---|
| **#5** App shell — nav, auth chrome, empty/first-run states | `design/design_handoff_the99_appshell/` | 2026-07-19 (PR #15) |
| **#6** Collection — CSV upload flow + collection view | `design/design_handoff_the99_collection/` | 2026-07-19 (PR #18) |
| **#7** Commander recommendations — ranked, explainable list | `design/design_handoff_the99_commanders/` | 2026-07-19 (PR #21) |
| **#8** Decks — list, create-from-commander, and deck builder | `design/design_handoff_the99_decks/` | 2026-07-19 (PR #25) |
| **#36** Issue Inspector — full-list "Show all X unmatched" modal | `design/design_handoff_the99_issue_inspector/` | 2026-07-20 (PR #50) |
| **#105** Per-printing art selection | `design/design_handoff_the99_printing_picker/` | 2026-07-31 (PR #109) |
| **#51** Richness pass — shell **#58**, collection **#59**, commanders **#60**, decks **#61** | `design/design_handoff_the99_richness/` | 2026-08-02 (PRs #66, #144, #145, #146) |
| **#35** Branded user menu (eng **#13**) | `design/design_handoff_the99_user_menu/` | 2026-08-03 (PRs #156, #164) |
| **#158** Deck builder Add panel overhaul | `design/design_handoff_the99_add_panel/` | 2026-08-05 (PRs #170, #171, #174, #175, #180, #181) — six planned PRs plus a reserved polish PR. The 340px suggestions column is gone; Consider is a full view with shelves ordered by what the deck lacks, and a sticky quick-add bar carries search. The owned-only default flipped `false` → `true` as ruled pre-build. Twelve interpretive calls await ratification as **#182**; three new design gaps the run surfaced are **#183** (mobile caption clipped behind the sticky bar), **#184** (Consider's `consider →` links) and **#185** (no undo on removal) |
| **#52** Commanders · list windowing | `design/design_handoff_the99_commanders_windowing/` | 2026-08-03 (PR #165) — the *design* is fully shipped; eng ticket **#52** stays open for the server-side half (EDHREC fanout still runs for every candidate before first render) |
