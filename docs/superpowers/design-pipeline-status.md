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
| 🔨 | Implementation in flight — design is done and the build has started, but not every planned PR has merged |
| 🚦 | Paused (mid-workshop; awaiting Hugh input or external dependency) |
| 🕰️ | Backlog — labelled `type: design`, design cycle not started (no workshop, no brief). Ranked; the top of this list is what Design picks up next |
| ✅ | Fully implemented + shipped |

**Every `type: design` ticket sits in exactly one state above.** A ticket that fits none of them is a gap in this legend, not a ticket to file under the closest match — add it here as an unplaced row and say why, so the mismatch is visible instead of absorbed.

---

## 🟢 Ready for implementation (design complete, verdict Green or Yellow)

| # / vertical | Handoff | Verdict | Notes |
|---|---|---|---|
| **#43** Design: Cross-check recommendations against cards committed to decks | `design/design_handoff_the99_availability/` | **🟢 Green at R3** (audited 2026-08-13) | One marker, four states (`free` renders nothing, deliberately), across four surfaces at both breakpoints, plus the `Score against` toggle — `Everything I own` / `What's free`, persisted in the URL as `?avail=`. R1 audited 🟡 Yellow on a provenance blocker: it was drawn against sibling handoffs rather than `src/`, and four of its claims were wrong — there is no light theme (one `:root`, no `color-scheme`), brass is AAA rather than sub-AA, `rowOwned` is at `decks-builder.ts:197` not `:158`, and `#1A160F` is `--surface-rail` while rows and tiles are `--surface #1E1A15`. All four are corrected and landed in R3's `README.md`. The R2 addendum then made the three rulings the audit asked for, each verified against `main`: the rank numeral **recomputes** under `What's free` from a second **global** rank map built before any colour filter, so `commanders-view.tsx:90-95`'s shipped `filtering never renumbers` invariant survives verbatim; flipping the toggle **resets the reveal window** to `REVEAL_STEP`, the same class of event as a filter change; and `rowAria` is **extended, not replaced** — the shipped 3-arg signature plus one optional trailing `availability` string, so a free card produces the byte-identical shipped name and no Consider row loses its `typeLine`. Gap §6 (failed availability read) is closed by reusing the shipped `DegradedBanner` on `/commanders` and disabling the `What's free` segment, while the builder surfaces fail genuinely quiet. **Two residuals for the plan to carry, neither blocking:** the main canvas's implementation-notes panel still says "get a light-theme pair there" and "brass is not AA as small text", both of which `README.md` now contradicts — the README wins; and the R3 contrast figures drift ~5% high (brass is ~7.0:1 on `--surface`, not the stated 7.5:1 — still AAA, but with less headroom than claimed). Gaps §7 and §9 were closed engineering-side during the audit. Open non-blocking: §10 a commander can vanish on the flip, §11 two degraded reads co-occurring. **Addendum 2 (audited 🟢 Green 2026-08-27, `ADDENDUM-2-READINESS.md`)** extends the marker to the two surfaces the brief left out — `/collection` (rows, tiles, card detail, an `Availability ▾` filter with live counts on a new multi-value `?avail=` param) and deck detail (a two-line "Card commitments" roll-up, over-committed always above soft). Its R2 blocker — no pass had drawn a *finished* deck's own decklist, which in a singleton format would have lit up nearly every nonland row — is closed by §6, "a deck never claims a card against itself", drawn as state 9. Five items resolved engineering-side for Design to ratify rather than redraw: §6's prose describes claims-exclusion but the drawn outcomes require excluding the deck's copies from **supply as well** (`free = (owned − ownClaim) − (hard − ownHardClaim)`, verified 6/6 against state 9); the copy file has no count-only `hardAria` for `/collection`; §3 draws a `[Complete]` status pill the marker cannot carry, since `hardDeckNames` is names only and deriving it from `hard > 0` would render a guess as fact; `Showing N of 1,418` uses the unique total where the shipped `chip-row.tsx` uses summed quantity (the numerator agrees exactly, the denominator does not); and §6's self-exclusion is written for the decklist but must extend to the add panel, or the same card reads two ways one panel apart. One further doc-sync item goes back with them: the canvas still calls `free = owned − hard` "inherited unchanged" when that is now the off-decklist case only. The README's §6-before-§5 ordering was fixed in place as a pure move — bodies and heading numbers untouched, since the numbers are the anchors every reference here and in the plan resolves against. **Gap §2 (deck-name length budget) is now closed**: the name is the only part allowed to truncate — `flex-none` prefix plus `truncate min-w-0` name, full name in the accessible name and never in a `title`. **One further ratify item raised 2026-08-30 by Task 3 (the marker component):** the copy file also has no *countless* `overAria` key, so an over-committed card from a degraded read that returns counts without names currently has its deck count sliced off the key that does exist, the same workaround already flagged for `hardAria`. **Row 3.6 is settled, not a ratify item:** Task 3 first read "no title-on-marker" as forbidding only an *explanatory* tooltip, then dropped the `title` outright — the marker root sets no `aria-label`, so `markerAria` already carries the full deck name into the row's accessible name and the `title` served nothing but a sighted mouse user, on an element row 3.6 gives no hover and no tap target. The copy persona forbids native `title=` independently, so no reading is left open |

---

## 🔨 Implementation in flight

Design is complete and the build has started, but not every planned PR has merged. An item leaves 🟢 the moment its
first implementation PR lands and reaches ✅ only when the last one does.

| # / vertical | Handoff | Progress | Notes |
|---|---|---|---|
| **#183** + **#177** + **#179** + **#185** + **#184** + **#176** Design: Add panel addendum | `design/design_handoff_the99_add_panel/ADDENDUM-README.md` | 1 of 6 PRs merged (#201) | The six follow-ups the #158 run left open, drawn as one addendum against the locked R2 handoff and merged as PR #199. **Verdict was 🟡 Yellow on one product question (#176), ruled A by Hugh on 2026-08-06** — unowned EDHREC staples keep reaching Consider, marked with the shipped `buy` tag and gathered into a trailing shelf — so the addendum is unblocked in full and Design ratifies the verdict flip at R4. Its spine is decision 1, a bottom-of-viewport ownership rule (shell tab bar owns the true edge; one route dock per route sits above it; content reserves the stack) which answers #183 and #177 together, as the two tickets predicted it would. Plan at `docs/superpowers/plans/2026-08-08-add-panel-addendum-plan.md`, briefing at `docs/superpowers/plans/2026-08-08-add-panel-addendum-briefing.md`; six PRs, epic-run's preconditions met. The plan carries **five corrections** to the addendum's code claims, each verified directly against `main` — most consequentially that `/decks/new`'s Create button is *already* in the sticky footer and is occluded by a z-index collision rather than misplaced, and that the addendum's instruction to delete `RECOMMENDED_MIX.land`'s singular label is wrong (three live consumers). Three non-blocking items go back to Design at **R4**: that singular-label correction, whether the `Owned only` axis in Consider should be re-read now that ruling A gives it two values, and whether the undo row's deliberately long life reads as clutter in a 99-row list |

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

_Currently empty — #43's handoff was produced, audited 🟢 Green at R3 and moved to 🟢 above on 2026-08-13._

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

One ranked queue. Ranks 1–7 are v1 polish follow-ups against already-shipped surfaces; ranks 8–11 are post-v1 features ordered by the roadmap tracker (#44). Rank 8 sorts ahead of the other post-v1 work because both of its eng dependencies have already shipped. Five former ranks left this queue on 2026-08-08 — #183, #177, #179, #185 and #184 were answered together by the Add panel addendum and sit in 🔨 above with #176. The per-surface brand + richness refresh tickets and #35 shipped ahead of everything here.

This list previously ran as two — a "Backlog" and a "Ready for design" — but the legend gave them the same definition (`type: design`, not yet workshopped), so nothing could be sorted between them by rule. The split was really a priority band, which the Rank column now carries.

| Rank | Ticket | Adjacency / notes |
|---|---|---|
| 1 | **#140** Design: Inline error state for refused deck mutations | Ratification, not net-new design — the UI is **already live on `main`** (PR #139), which is why it outranks the rest. Five refusal strings need Design's sign-off or a rewrite; they are listed on the ticket |
| 2 | **#148** Design: ratify the richness pass interpretive calls | Ratification, same class as #140 — the UI is **already live on `main`** (PRs #66, #144, #145, #146). Three calls on the 99/99 completion reveal (band not surface, dismissible-only, a derived mobile composition) plus two invented strings the mock did not supply: a mobile empty-builder caption, and the guided banner's directive, which the mock's richness line would otherwise have deleted |
| 3 | **#182** Design: ratify the Add panel run's interpretive calls | Ratification, same class as #140 and #148 — the UI is **already live on `main`** (PRs #170, #171, #174, #175, #180, #181). Twelve calls in four groups: copy the build wrote or changed (including a LAND-vs-LANDS conflict between `mix.ts:74` and the locked copy file, and four em dashes still inside that lock), three figures shipped without a unit or a stated baseline, six canvas-vs-README divergences where eng followed the canvas, and one finding eng declined and confirmed wrong so it is not re-raised |
| 4 | **Design: ratify the availability marker's place on a decklist row** (ticket not yet filed — surfaced at #43 close-out) | Ratification, same class as #140, #148 and #182 — the UI ships in the #43 run. The design table's §3.1 appends the marker to a row's `×N owned` string on the shared meta line, but the shipped decklist row draws neither: there is no meta line and no owned count, so there is nothing for the joiner to append to. The build put the marker inline between the card name and the buy tag instead. §3.1's hard constraints were verified to hold either way — no new grid column, no change to the 34px/44px row height — so this is a placement call Design should ratify or redraw, not a defect |
| 5 | **#172** Design: quick-add bar has no drawn state for a failed search | Same class as #140 and #148 — the UI ships in the #158 run, so this is the one state Design has not drawn rather than net-new work. The Add panel handoff draws quick-add's no-results state but nothing for `searchCards` itself failing, and the two are different claims: "nothing in the pile by that name" is about the collection, which a 500 has not earned. PR 4 ships the honest-but-silent behaviour (the list simply does not open) pending a drawn state. The `degraded` block in the same handoff is the nearest precedent but is sized for a panel, not a one-line bar, so this is a placement call |
| 6 | **#159** Design: narrowing the commander recommendations | Same walk. The list offers no way in beyond scroll order — no filter by colour, mechanic, popularity or obscurity. Adjacent to **#52** (windowing — design shipped, eng ticket still open), which changes how much of the list is on screen but not how the user aims at it; whoever picks these up should read them together |
| 7 | **#160** Design: deck completeness guidance (lands, curve, multi-copy adds) | Same walk. Two halves: the builder never says how many lands a deck wants or how the curve looks, and adding several copies of a basic takes one click per copy. The second half is the eng-side "bulk add" from the feedback batch, held here because the affordance is a design question — a stepper on the row, a quantity field in the modal, or a lands-specific control |
| 8 | **#62** Design: Issue Inspector handoff reconciliation | Two copies of the #36 handoff exist; the mocks are byte-identical, and the nested README documents a footer (`View only · fix in export & re-upload`) present in neither mock nor `src/`. Needs a call on canonical location + whether that footer ships |
| 9 | **#130** + **#131** + **#132** Design: recommendations you can interrogate and act on — pre-populate a deck from recommendations · make Role Coverage explanatory and inspectable · suggest and add unowned cards | Post-v1. **One design cycle, not three** — Hugh flagged them as groupable when he filed them, and they share a premise: a recommendation the user cannot interrogate or act on is decoration. #131 is the seam; it needs #132's unowned cards to have anything to recommend beyond the collection, and it is where #130's "why was this picked" reasoning would surface. Split apart, each brief answers a third of one question. Both eng dependencies have now shipped — #127 landed the card-detail modal wiring #131's inspection gap needs, and #129 fixed the "Owned only" toggle under #132 — so nothing blocks this but a workshop. Open for #132: whether #44 already scopes it |
| 10 | **#9** Design: Win/loss tracking for decks (incl. per-game strength/weakness notes — one combined brief) | Post-v1; extends the deck page from #8; unlocks the tuning tier |
| 11 | **#10** Design: Deck tuning suggestions from play results | Post-v1; LLM tier; blocked on #9's data model — needs accumulated play data |
| 12 | **#151** Design: per-deck printing override for a card's art | Post-v1. **Split out of #42** at the 2026-08-02 workshop — #42 had inherited it from #105 on the reasoning that a deck-level override needs a deck to attach to, but it is unrelated to import (import is getting a deck in; this is how a deck looks once it is there) and #42's brief was already large. Last because it is polish: `card_art_preferences` is keyed `(user_id, oracle_id)` and `deck_cards` has no printing column, so it needs new storage and a new read path for no functional gain |

### Rank 9 (#130 + #131 + #132) — open questions carried into the workshop

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
| **#42** Import existing decks (Moxfield) | `design/design_handoff_the99_deck_import/` | 2026-08-06 (PRs #189, #190, #192–#197) — nine planned PRs; PR 3 became spike **#191** after Moxfield URL fetch proved blocked by Cloudflare bot protection, so paste and file import shipped without it |
