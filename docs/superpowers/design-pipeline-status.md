# 🎨 Design Pipeline Status

Living tracker of every design-track ticket + its position in the pipeline (workshop → handoff → readiness audit → build). Updated **optimistically** as items move between stages — the tracker is the answer to "what's ready for eng to pick right now?" and stays fresh only if maintained in the same PR as the state change.

> **Pipeline workflow reference:** `docs/superpowers/design-pipeline.md`

## System layers (not tickets — everything below builds on these)

| Layer | Handoff | Landed |
|---|---|---|
| Brand system — Palette A "Table Candlelight," Cinzel + IBM Plex, logomark, tokens | `design/design_handoff_the99_brand/` | refreshed 2026-07-24 (PR #54) · **two decisions amended 2026-09-01** — colour and display face are now per-theme, see 🟢 below |
| Voice — Kitchen Table (locked, verbatim in the richness README) | `design/design_handoff_the99_richness/README.md` | locked 2026-07-20 |

**The brand layer was amended on 2026-09-01, and the amendment shipped on
2026-09-02.** The six-theme visual system turns "one palette, Cinzel display"
into "six palettes, one display face each." Its handoff landed and audited 🟢
Green on 2026-09-01 and now sits in ✅ Shipped
below, so `design/design_handoff_the99_themes/TOKEN-TABLE.md` is authoritative
for colour and display face; the brand README still governs everything else in
the layer (logomark, WUBRG-as-tags-only, type scale, spacing). Anything drawn
from here on should treat colour and display face as per-theme, and should name
tokens rather than hexes — Palette A survives as the default theme, Gilded
Stone, with revised surfaces and a renamed accent family (`--brass*` becomes
`--accent*`).

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
| **#286** Black mana pip illegible on the dark canvas | `design/design_handoff_the99_amendments/` (R3) | 🟢 Green | Amendment 1 of four. `--b` → `#98748F`. One CSS file, six declarations. R1 and R2 both failed `contract.test.ts:145`'s 0.10 accent-separation gate (0.064 and 0.087); R3 clears at 0.115 |
| **#280** A deck can pass 99 cards with nothing on screen saying so | same handoff | 🟢 Green | Amendment 3. Fifth `statusPill` value `Over`, two-segment bar, trim line. **Must land before #277** |
| **#287** Commanders detail: "Full card" opens the bare lightbox | same handoff | 🟢 Green | Amendment 4. Deletes `lightbox.tsx` (282 lines) + its test; `full-card-trigger.tsx` calls the already-mounted `CardDetailProvider`. `Full card` → `Card details` |
| **#277** A deck cannot be updated by re-importing its list | same handoff | 🟡 Yellow | Amendment 2, and the only real build — one route, three components, 24 states. Yellow on build order alone: **blocked behind #280**, because `add-validation.ts:42` would silently drop cards past 99. Both Product questions were answered on 2026-09-05 (no undo; the "added by hand" marker is deleted) |
| **#288** Price on the buy tag | `design/design_handoff_the99_decks/` (`ADDENDUM-README.md`, R1) | 🟢 Green | Unbuilt. The UI half of the ManaPool price ingest, whose backend shipped on PR #291 with no UI of its own; this is the first design for putting those prices on screen. One tag, four tails — `buy · $45.00` / `buy · $2.10 foil` / `buy · sold out` / today's bare `buy` — plus one deck-level total on the Shopping header carrying its own denominator. Zero new marks, hues or tokens; the shipped Decks handoff is unedited. Ruled: the tag never becomes a link, and a store link-out belongs in the export dialog if Product ever wants one |
| **#220** Design: commander discovery — one ranked list, two sorts (covers **#213** + **#214**) | `design/design_handoff_the99_discovery/` (R1) | 🟢 Green | Audited 2026-09-05. All eight brief rulings satisfied by the drawing. The one ruling Design asked for is taken eng-side in Design's favour — `Score against` re-ranks under discovery rather than switching off — and four corrections are recorded below rather than sent back, because none of them changes what is drawn. **Handoff merged as PR #298; implementation began the same day** against `docs/superpowers/plans/2026-09-05-commander-discovery.md`, eleven phases, one PR each, starting with PR #301 |

Spec: `docs/superpowers/specs/2026-09-05-four-amendments-design.md`. All four of the amendments
came out of the eleven-item batch triaged on 2026-09-05, whose five code-side fixes shipped in
PR #289. #220's source of truth is `docs/superpowers/design-briefs/2026-09-05-commander-discovery.md`.

### #220 — the ruling Design asked for, and four corrections carried eng-side

**The ruling.** `READINESS.md` item 1 asks whether `Score against` stays available under the
discovery scope, since the free re-rank works today only because both rankings arrive in one
render over 242 commanders. **It re-ranks** — the flip becomes a fetch, exactly as the sort flip
already is. A control that silently switches off when you change scope makes the two scopes feel
like two pages, which ruling 1 spent its whole argument avoiding, and the canvas already draws it
available, so this costs no redraw. Its companion, gap 2, is taken as drawn: **the `↓N from M`
delta is suppressed under discovery.** The delta is a statement about a 0–100 score, and the
discovery fit column prints `127 of 264` instead — reusing the shipped string there would annotate
one figure with a change in a different one. A delta expressed in card counts is a follow-up, not
a gate.

**Correction 1 — the discovery population is 3,334, not 3,100.** Ruling 2 sets the universe to
every indexed commander minus the ones already built: 3,342 − 8. The canvas labels it `3,100
commanders you have not built`, which is the count of commanders the player does not *own* — a
different figure. Ruling 2 is unambiguous and the canvas is internally inconsistent with 3,100
anyway, since frame A2 draws an **owned** row under Something new, which a strictly-unowned
population could never contain. The copy module is already correct (`subtitlePlay` takes the count
as an argument); only the illustrative figure is wrong. **Nothing hard-codes 3,100.**

**Correction 2 — price is keyed by printing, not by oracle id, and #288 has landed.** The handoff
was written with the ManaPool ingest in flight and expects "read from #288's table by oracle id,
left-joined" with "stock is a boolean". `printing_prices` is keyed on `scryfall_id`
(`src/db/schema.ts:94-112`) and carries no boolean. A commander's figure is the cheapest live
printing, and "live" is defined by the table's own rule: compare the row's `as_of` to the newest
`as_of` in the table.

**Correction 3 — that rule makes every drawn price state reachable, and closes gap 7.** The feed
omits out-of-stock cards rather than zeroing them, and the ingest upserts and never deletes, so a
row at the newest mark always has stock and a sold-out printing lingers with a frozen `as_of`.
Therefore: absent from the table → state 4, the slot and its hairline do not render; present but
behind the mark → **state 3, `not stocked`**, hollow dot, no figure; at the mark → states 1/2. The
weekly cadence gap 7 asked about is 09:00 UTC Monday, and no stale figure is ever printed, so the
slot needs no as-of word after all. No new state, no redraw.

**Correction 4 — there is no "finished" deck.** `decks` carries `filled`, not a completion flag
(`src/db/schema.ts:165-177`), and ruling 8 turns on having built anything at all. The novelty sort
unlocks on the first deck; the copy strings saying "a finished deck" want "a deck". A copy edit,
run through `/copy-review` rather than back to Design.

Everything else the handoff claims about shipped code was verified against `src/`: `REVEAL_STEP`
is 25, the inert `Order: Fit ↓ · fixed` label sits where the sort control wants to go
(`commanders-view.tsx:507-512`, mobile `:629`), `Showing {filtered.length} of {active.length}` is
indeed the one string missing `toLocaleString` (`:520`), `RecCard`'s grid is `40px 100px 1fr 236px`
with a decorative `--border-strong` diamond under the rank numeral (`rec-card.tsx:298`, `:319`),
the `absent` note ships without a Retry (`:460-474`), and `createDeck` validates legality without
requiring ownership (`actions.ts:181-192`), so discovery's ending is already live.

---

## 🔨 Implementation in flight

Design is complete and the build has started, but not every planned PR has merged. An item leaves 🟢 the moment its
first implementation PR lands and reaches ✅ only when the last one does.

| # / vertical | Handoff | Progress | Notes |
|---|---|---|---|

_Currently empty — the six-theme visual system completed 2026-09-02 and now sits in ✅ Shipped below. The Add panel addendum was the occupant before it. It completed 2026-08-09 with all six planned PRs merged (#201, #202, #204, #205, #206, #207, #208) and now sits in ✅ Shipped._

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

_Currently empty — **#220 left this queue on 2026-09-05**, the same day it entered it. Its handoff
landed and audited 🟢 Green at R1, so it now sits in 🟢 above._

---

## 🎨 In flight

| Ticket | Stage | Notes |
|---|---|---|

_Currently empty — #286 and #287 moved to 🟢 on 2026-09-05 when the four-amendments handoff
audited Green at R3, taking #277 and #280 with them._

**The legend gap these rows exposed is still open.** #286 and #287 are `type: design` **and**
`type: bug`, and the legend has no state for a design defect against an already-shipped surface:
🕰️ means a design cycle that has not started, which understates a live defect, and 🟢 means a
handoff has landed, which was not yet true while they sat here. They passed through 🎨 because
design was genuinely being produced for them. The next defect of this class will hit the same
gap, and it is worth closing rather than resolving case by case.

---

## 🚦 Paused (mid-workshop)

_Currently empty._

---

## 🕰️ Backlog (design cycle not started)

One ranked queue. **#130 + #131 left this queue on 2026-09-01** — promoted to rank 1 on 2026-08-29 when the recommendation-engine intake established #130 as a *precondition* for #213 and #214 rather than a peer (both terminate in "start a deck", and an empty deck lands them in exactly the disappointment #130 describes), workshopped the same week, and shipped on 2026-09-02 (PRs #249, #263) — it now sits in ✅ Shipped. #132 closed as already-shipped. Ranks 1–8 are v1 polish follow-ups against already-shipped surfaces; ranks 9–15 are post-v1 features ordered by the roadmap tracker (#44). **#220, #221 and #222 were written into the ranked rows on 2026-09-02.** The 2026-08-30 intake call below placed them "at the bottom" and assigned ranks 12–14, but the rows themselves were never added, so those numbers were left describing an older, longer list and collided with #151's. **#220 then left this queue on 2026-09-05** — workshopped, handed off and audited 🟢 Green that
same day, now in 🟢 above — and #221 and #222 moved up behind it. The rows below carry the live ranks; prose and the intake table do not. Five former ranks left this queue on 2026-08-08 — #183, #177, #179, #185 and #184 were answered together by the Add panel addendum, which completed on 2026-08-09 and now sits in ✅ Shipped with #176. The per-surface brand + richness refresh tickets and #35 shipped ahead of everything here.

**Audited 2026-09-05** — ledger at `docs/superpowers/backlog/audit-2026-09-05.md`, which carries the
evidence behind every verdict and makes the next audit incremental. All 15 rows survived: **nothing
here has shipped**, and no ticket's premise has died, so nothing was closed. What the audit did find
is six stale bodies, three of them stale because part of the ask shipped underneath the ticket while
it waited. Those issue bodies were refreshed on GitHub, and the four rows below that had drifted with
them — ranks 2, 3, 7 and 8 — are corrected here to match. Two `DECIDE` questions came out of it and
are still open: whether #160 shrinks to "curve display" alone, and whether rank 4 gets filed as a
ticket or folds into #182's batch.

This list previously ran as two — a "Backlog" and a "Ready for design" — but the legend gave them the same definition (`type: design`, not yet workshopped), so nothing could be sorted between them by rule. The split was really a priority band, which the Rank column now carries.

| Rank | Ticket | Adjacency / notes |
|---|---|---|
| 1 | **#140** Design: Inline error state for refused deck mutations | Ratification, not net-new design — the UI is **already live on `main`** (PR #139), which is why it outranks the rest. Five refusal strings need Design's sign-off or a rewrite; they are listed on the ticket |
| 2 | **#148** Design: ratify the richness pass interpretive calls | Ratification, same class as #140 — the UI is **already live on `main`** (PRs #66, #144, #145, #146). **Four calls, not five** (audited 2026-09-05): three on the 99/99 completion reveal (band not surface, dismissible-only, a derived mobile composition) plus the guided banner's directive, which the mock's richness line would otherwise have deleted. The fifth — a mobile empty-builder caption the mock did not supply — closed itself by deletion rather than by ratification when `captionFor`/`captionForMobile` collapsed into one string, so it needs no verdict |
| 3 | **#182** Design: ratify the Add panel run's interpretive calls | Ratification, same class as #140 and #148 — the UI is **already live on `main`** (PRs #170, #171, #174, #175, #180, #181). Twelve calls in four groups, of which **four have closed themselves since filing** (audited 2026-09-05): the LAND-vs-LANDS conflict is resolved — `mix.ts` now ships the singular `label: "Land"` the locked copy file asks for — and all three baseline-free figures now name their baseline on screen, the lift relabelled "vs. all decks" by PR #275. The em dash count on the ticket was wrong: five sit inside customer-facing strings, not four, and the other nine are in code comments. What remains is the six canvas-vs-README divergences where eng followed the canvas, plus one finding eng declined and confirmed wrong so it is not re-raised |
| 4 | **Design: ratify the availability marker's place on a decklist row** (ticket not yet filed — surfaced at #43 close-out) | Ratification, same class as #140, #148 and #182 — the UI ships in the #43 run. The design table's §3.1 appends the marker to a row's `×N owned` string on the shared meta line, but the shipped decklist row draws neither: there is no meta line and no owned count, so there is nothing for the joiner to append to. The build put the marker inline between the card name and the buy tag instead. §3.1's hard constraints were verified to hold either way — no new grid column, no change to the 34px/44px row height — so this is a placement call Design should ratify or redraw, not a defect |
| 5 | **#242** Design: the filter panels' listbox conflicts with the checkbox group 15.10 draws | Ratification, same class as #140, #148, #182 and rank 4 — the UI is **already live on `main`**, and the conflict was surfaced rather than built in PR #240. Design table 15.10 asks the shared `FilterPanel` option list to be a checkbox group; it ships as `role="listbox" aria-multiselectable`. That is load-bearing: the panel's search field is a `role="combobox"` with `aria-controls`/`aria-activedescendant`, and WAI-ARIA 1.2 requires a combobox popup be a `listbox`/`tree`/`grid`/`dialog`, so a checkbox group would break type-to-narrow. Affects Color, Type, Set and Availability together; Sort is single-select and unaffected. Two ways out: amend 15.10 to a multi-select listbox (eng's recommendation — the pattern is correct and nothing changes on screen), or redraw the search affordance so it no longer owns the list's keyboard focus. The half that did not depend on the role already shipped: the `, selected` tail is gone from all four panels, since the row's `aria-selected` already says it |
| 6 | **#172** Design: quick-add bar has no drawn state for a failed search | Same class as #140 and #148 — the UI ships in the #158 run, so this is the one state Design has not drawn rather than net-new work. The Add panel handoff draws quick-add's no-results state but nothing for `searchCards` itself failing, and the two are different claims: "nothing in the pile by that name" is about the collection, which a 500 has not earned. PR 4 ships the honest-but-silent behaviour (the list simply does not open) pending a drawn state. The `degraded` block in the same handoff is the nearest precedent but is sized for a panel, not a one-line bar, so this is a placement call |
| 7 | **#159** Design: narrowing the commander recommendations | Same walk, but **narrower than the ticket claimed** (audited 2026-09-05). The body's "one list, no way in beyond scroll order" premise was never accurate: colour pips shipped with the surface itself in PR #21, and two more controls have landed since — the `Score against` toggle and the `?avail=free` filter, both from the #43 run. The remaining ask is mechanic/theme and popularity only. Adjacent to **#52** (windowing — design shipped, eng ticket still open), which changes how much of the list is on screen but not how the user aims at it; whoever picks these up should read them together |
| 8 | **#160** Design: deck completeness guidance (lands, curve, multi-copy adds) | Same walk. Two halves: the builder never says how many lands a deck wants or how the curve looks, and adding several copies of a basic takes one click per copy. The second half is the eng-side "bulk add" from the feedback batch, held here because the affordance is a design question — a stepper on the row, a quantity field in the modal, or a lands-specific control. **Half of this shipped underneath the ticket** (audited 2026-09-05): the land target is advisory and on screen, and the last-31 strip now places cards in bulk both ways — an owned-only fill and a buying top-up — including a real mana base after PR #272. What is genuinely unbuilt is a curve surface and a *user-driven* multi-copy control. **Open question for Hugh: is the remainder still worth a design cycle, or does this shrink to "curve display" alone?** |
| 9 | **#62** Design: Issue Inspector handoff reconciliation | Two copies of the #36 handoff exist; the mocks are byte-identical, and the nested README documents a footer (`View only · fix in export & re-upload`) present in neither mock nor `src/`. Needs a call on canonical location + whether that footer ships |
| 10 | **#9** Design: Win/loss tracking for decks (incl. per-game strength/weakness notes — one combined brief) | Post-v1; extends the deck page from #8; unlocks the tuning tier |
| 11 | **#10** Design: Deck tuning suggestions from play results | Post-v1; LLM tier; blocked on #9's data model — needs accumulated play data |
| 12 | **#151** Design: per-deck printing override for a card's art | Post-v1. **Split out of #42** at the 2026-08-02 workshop — #42 had inherited it from #105 on the reasoning that a deck-level override needs a deck to attach to, but it is unrelated to import (import is getting a deck in; this is how a deck looks once it is there) and #42's brief was already large. Last because it is polish: `card_art_preferences` is keyed `(user_id, oracle_id)` and `deck_cards` has no printing column, so it needs new storage and a new read path for no functional gain |
| 13 | **#221** Design: audit a built deck's commander and offer alternatives | Post-v1. Covers **#215**. Reads against #220's ranked list — the same scoring surfaced from inside a finished deck rather than from the collection — so whoever picks these up should read them together |
| 14 | **#222** Design: which of my decks does this card fit | Post-v1. Covers **#218**. An addendum to `design/design_handoff_the99_collection/` rather than a handoff of its own, and adjacent to the #43 availability marker it would sit beside on the same rows and tiles |

---

## 🧭 Recommendation intake (2026-08-29) — resolved 2026-08-30

The 2026-08-29 intake filed five `type: feature` tickets, four of which ship UI and were therefore gated on a handoff that no ranked design row covered. They sat in an ❓ Unplaced table rather than being stretched into 🕰️, because the legend says every state is exhaustive and a ticket fitting none is a gap in the legend.

**Hugh's call (2026-08-30): companion `type: design` tickets, entering the ranked backlog at the bottom.** The alternative — widening the legend to admit `type: feature` rows — was declined because it makes 🕰️ mean two different things at once. Three tickets cover the four features:

This table records the mapping as filed. **The rank column is historical — the ranked lists above are authoritative** and these numbers are not maintained as items move between states.

| Feature ticket | Design ticket | Rank as filed |
|---|---|---|
| **#213** Recommend commanders I don't own but have the 99 for | **#220** | 13 |
| **#214** Recommend a deck I haven't tried — novelty engine | **#220** (same cycle) | 13 |
| **#215** Audit a built deck's commander and suggest a better one | **#221** | 14 |
| **#218** Show which of my decks a collection card would fit | **#222** | 15 |
| **#216** Redundancy scoring · **#217** 99-level card swaps | none — deferred | — |

#216 and #217 ship no UI and are explicitly future work, so they need no design row.

**Not blocked meanwhile.** The shared foundation these sit on is entirely backend/data, and per `AGENTS.md` backend work proceeds without a handoff, so it was built while these rows waited. **It merged as PR #244 on 2026-09-02** — the EDHREC parser widening, the commander support index, the commander engine classifier and the land colour-production check — so **#220, #221 and #222 are unblocked**. The plan's fifth component, the ManaPool price ingest, was not in that merge and is tracked as the unplaced row below.

---

## ❓ Unplaced — eng-only components this tracker has no state for

The legend is exhaustive for `type: design` tickets, and a design ticket fitting none of its states is a gap in the legend rather than a ticket to file under the nearest match. This table records the other half of that rule: a component that carries no design ticket at all, and so has no row anywhere above even while it is real, planned and buildable.

The gap is structural, not a one-off. The tracker is the answer to "what is ready for eng to pick right now?", but it indexes only design tickets — so a backend component that lives in a merged spec and plan with no GitHub issue is invisible to any scan that starts here. That is exactly how the ManaPool ingest went unnoticed until Hugh asked after it on 2026-09-05. Widening the tracker to admit eng-only rows would repeat the 2026-08-30 objection (it makes each state mean two things at once), so these sit apart until Hugh rules on where they belong.

| Component | Source | Status | Why unplaced |
|---|---|---|---|
| **ManaPool price ingest** (Component C of the recommendation foundation) | `docs/superpowers/specs/2026-08-29-recommendation-foundation-design.md` §5 · plan tasks 8–10 | Issue **#288** filed 2026-09-05; built on PR **#291**. Its UI half now has a handoff and sits in 🟢 Ready above | Ships no UI, so no handoff and no `type: design` ticket ever existed. It was the one component of the five-part foundation left out of PR #244 |

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
| **#183** + **#177** + **#179** + **#185** + **#184** + **#176** Add panel addendum | `design/design_handoff_the99_add_panel/ADDENDUM-README.md` | 2026-08-09 (PRs #201, #202, #204, #205, #206, #207, #208) — all six planned PRs merged. The spine was decision 1, a bottom-of-viewport ownership rule (shell tab bar owns the true edge; one route dock per route sits above it; content reserves the stack), which answered **#183** and **#177** together as the two tickets predicted. **#176** was ruled A by Hugh on 2026-08-06** — unowned EDHREC staples keep reaching Consider, marked with the shipped `buy` tag and gathered into a trailing shelf. Three non-blocking items still go back to Design at **R4**: the `RECOMMENDED_MIX.land` singular-label correction, whether the `Owned only` axis in Consider should be re-read now that ruling A gives it two values, and whether the undo row's deliberately long life reads as clutter in a 99-row list |
| **#43** Cross-check recommendations against cards committed to decks | `design/design_handoff_the99_availability/` (+ `ADDENDUM-2-README.md`) | 2026-09-01 (PRs #223, #224, #225, #226, #227, #228, #229, #230, #231, #232, #234, #235, then the round-out #239, #240, #241) — ten planned tasks plus the reserved polish PR, then a three-PR round-out split by blast radius. One marker with four states (`free` renders nothing, deliberately) across the decklist row, both comboboxes, Consider tiles, `/collection` rows, tiles and card detail, plus the `Score against` toggle on `/commanders`, the `Availability ▾` filter and its `?avail=` round-trip, and the deck-level over-committed roll-up. There is no feature flag — the task order was the dependency chain, so the vertical went live with Task 4. Journeys A–D are walked and recorded in `docs/superpowers/journey-lifecycle-card-availability.md`; plan at `docs/superpowers/plans/2026-08-13-card-availability-plan.md`. **The design is not fully ratified.** Ten items go back to Design as ratifications: six in `ADDENDUM-2-READINESS.md` under "Resolved engineering-side" (§6's supply-vs-claims wording, the missing count-only `hardAria`, the `[Complete]` pill §3 draws that `hardDecks` cannot carry, the `Showing N of 1,418` denominator, self-exclusion extending to the add panel, and the canvas's unqualified `free = owned − hard`), its items 8–10 (the `none free` and `also in` vocabulary sweep, `cards scanned` as the header noun, and the accepted phone truncation on over-committed rows), and the countless `overAria` key raised by PR #225. **Item 11 is the one open Design ask, not a ratification:** five mana pips overrun their `/collection` row grid track at both widths (40px phone and 54px desktop against roughly 67px and 81px of pips). It predates availability entirely and needs a grid call — widen the track, wrap, or cap the pips with an overflow affordance. Two further ratify rows sit in 🕰️ below as rank 4 (the marker's placement on a decklist row) and **#242** (design table 15.10's checkbox group against the shipped `role="listbox"`) |
| **Six-theme visual system** (system layer; ticket not filed — arose from the 2026-08-31 palette workshop) | `design/design_handoff_the99_themes/` | 2026-09-02 (PRs #246, #248, #249, #250, #251, #252) — all six planned PRs merged. Six user-selectable themes — Gilded Stone (Amonkhet, the amended default), Neon Rain (Kamigawa), Moonlit (Innistrad), Oil and Iron (New Phyrexia), Screen Glow (Duskmourn), Rune Frost (Kaldheim) — each a 35-key `[data-theme]` block plus one display face, with the crab/kaiju character layer retired and its ten empty and loading states redrawn around the three-diamond crown already in `completion-reveal.tsx`. R1's two blockers were both closed inside the audit rather than by Design: §8.2's fifth column is `--fg-faint`, not `--fg-muted` (read as muted it failed the 4.5:1 floor in four of six themes), and the §8.5 accent-area budget is an eyes-on heuristic rather than a CI check, since painted area is not statically computable. R2 then drew the mobile pass (shell at rest, the picker's 390px sheet at a 44px minimum, five empty states at 390px) and ruled the Metamorphous single-weight question. **Three rulings were taken before the build:** Rune Frost pins display weight to 400 and disables synthetic bold (`font-synthesis-weight: none`, one rule in `@layer base`) because uniform stroke dilation is wrong for a high-contrast decorative face at the 15–18px sizes where most of its 32 sites sit; all six theme names ship as drawn; and the build ran as one continuous epic — a PR per phase, merged autonomously. **Two things eng must not re-derive:** the chroma budget is measured *after* 8-bit quantisation, because clamping in OKLCH and rounding afterwards re-introduces chroma (five values in this system bust the budget that way), and `--font-display` must gain one level of indirection — Tailwind 4's `@theme inline` substitutes literally, so a `[data-theme]` block redefining it does nothing. Non-blocking residuals, still open: `--fg-locked` lands at 3.02–3.05:1 in all six with zero headroom, so any future darkening of a `--surface` breaks all six at once; the contract carries 30 WUBRG pip keys to express one decision (only Oil and Iron's green moves); Moonlit's `--avail-hard-fg` is identical to its `--accent` and wants a comment or it reads as a copy-paste error; and Rune Frost is worth one look on real Windows hardware, which no pass in this run performed. Plan: `docs/superpowers/plans/2026-09-01-theme-system-plan.md` — 18 tasks, six phases, six PRs |
| **#130** + **#131** Recommendations you can act on — pre-populate a deck from recommendations · make Role Coverage explanatory and inspectable | `design/design_handoff_the99_recommendations/` | 2026-09-02 (PRs #249, #263) — audited 🟡 Yellow at R3 (PR #237). The §0 blocker recorded on this row cleared when the recommendation-engine foundation merged as PR #244, and the vertical shipped the same week. Hugh's live feedback on the shipped build is what produced the synergy-discovery brief (PR #270) now sitting in 🟢 above, and the 37-copies-of-one-basic mana base the fill produced (PR #272) |
| **Synergy discovery, and the last 31** (from live feedback on the shipped #130/#131 build; no ticket filed) | `design/design_handoff_the99_synergy_discovery/` | 2026-09-03 (PR #275, single-PR build off the plan at `docs/superpowers/plans/2026-09-03-synergy-discovery-plan.md`) — audited **🟢 Green at R1** the same day (PR #274). The EDHREC Synergy panel is now a synergy ranking with a type-facet strip and an uncapped disclosure; rows are selectable on both the commander and deck surfaces and ride into the build on `?select=`; and the deck builder gained the last-31 strip — an owned-only fill beside an explicitly-labelled buying top-up, both placing `auto` cards. **The one ruling Design requested was taken eng-side in Design's favour:** the 99/99 completion reveal is suppressed when the last card was placed by a fill, and only when that fill actually placed a card. Copilot ran 18 rounds; the three findings that would have shipped broken were the fill claiming a 99 another tab had reached, the outage sentence speaking for a commander EDHREC simply does not index, and the toolbar gate that hid the kept-note along with the sweep button. Gap report: `docs/superpowers/gap-report-synergy-discovery.md`; property table: `docs/superpowers/design-tables/synergy-discovery.md` |
