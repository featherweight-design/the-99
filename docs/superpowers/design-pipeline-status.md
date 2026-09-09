# 🎨 Design Pipeline Status

Living tracker of every design-track ticket + its position in the pipeline (workshop → handoff → readiness audit → build). Updated **optimistically** as items move between stages — the tracker is the answer to "what's ready for eng to pick right now?" and stays fresh only if maintained in the same PR as the state change.

> **Pipeline workflow reference:** `docs/superpowers/design-pipeline.md`

## System layers (not tickets — everything below builds on these)

| Layer | Handoff | Landed |
|---|---|---|
| Brand system — Palette A "Table Candlelight," Cinzel + IBM Plex, logomark, tokens | `design/design_handoff_the99_brand/` | refreshed 2026-07-24 (PR #54) · **two decisions amended 2026-09-01** — colour and display face are now per-theme, see ✅ below |
| Voice — Kitchen Table (locked, verbatim in the richness README) | `design/design_handoff_the99_richness/README.md` | locked 2026-07-20 |

**The brand layer was amended on 2026-09-01, and the amendment shipped on
2026-09-02.** The six-theme visual system turns "one palette, Cinzel display"
into "six palettes, one display face each." Its handoff landed and audited 🟢
Green on 2026-09-01 and now sits in ✅ Shipped
below, so `design/design_handoff_the99_themes/TOKEN-TABLE.md` is authoritative
for colour and display face; the brand README still governs everything else in
the layer (logomark, WUBRG-as-tags-only, type scale, spacing). Anything drawn
from here on should treat colour and display face as per-theme, and should name
tokens rather than hexes — Palette A survives as the default theme, with revised
surfaces and a renamed accent family (`--brass*` becomes `--accent*`).

**The theme layer was then amended again on 2026-09-06 (PR #371), and the theme
*names* in the original handoff are now stale.** Moonlit and Screen Glow were
retired for sitting 15° and 25° from Oil Haze and First Frost, replaced by
Canopy (`ixalan`) and Witching Hour (`eldraine`), and three survivors were
renamed into a weather-and-hour system. **`src/lib/theme/themes.ts` is the
registry of record** — the six shipped themes are Low Sun (`amonkhet`, the
default, formerly Gilded Stone), Neon Rain (`kamigawa`), Canopy (`ixalan`), Oil
Haze (`phyrexia`, formerly Oil and Iron), Witching Hour (`eldraine`) and First
Frost (`kaldheim`, formerly Rune Frost). Four of the six keys did not move, so
most persisted values need no migration. `design/design_handoff_the99_theme_replacement/`
(R6) carries the replacement's token blocks and supersedes the original
TOKEN-TABLE wherever the two disagree.

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
| 🚦 | Paused at any stage — awaiting Hugh's input, an external dependency, or a deliberate decision not to build yet. **Widened 2026-09-07**: this read "paused mid-workshop", which had no room for an item whose design and plan are both merged and whose build is deliberately deferred. #10 is the first of those, and stretching 🟢 to hold it would have made "ready for implementation" mean two things — one of which is "do not pick this up" |
| 🕰️ | Backlog — labelled `type: design`, design cycle not started (no workshop, no brief). Ranked; the top of this list is what Design picks up next |
| ✅ | Fully implemented + shipped |

**Every `type: design` ticket sits in exactly one state above.** A ticket that fits none of them is a gap in this legend, not a ticket to file under the closest match — add it here as an unplaced row and say why, so the mismatch is visible instead of absorbed.

---

## 🟢 Ready for implementation (design complete, verdict Green or Yellow)

| # / vertical | Handoff | Verdict | Notes |
|---|---|---|---|
| **UI refresh — Home, Decks and the chrome** — no ticket filed | `design/design_handoff_the99_refresh/` | 🟡 **Yellow**, audited 2026-09-07 at R2 | Scope was cut by client review from seven surfaces to two plus the navigation chrome; the other four are held to a conformance table rather than redesigned. Yellow's eight findings are all closed eng-side in the plan (`docs/superpowers/plans/2026-09-07-ui-refresh-home-decks.md`, merged with the handoff), which is what Yellow means here — none of them needed a Design round-trip. Nineteen tasks in six PRs, A–F: copy, chrome, data, Decks, Home, conformance. Three judgement calls are deliberately additions to the drawing and should be read as such — a phone footer on the deck rail, sort chips inside the phone filter sheet, and `READY_COUNT = 9`, which is inferred from the drawn frame's arithmetic rather than stated. Ticketless for the same reason as the card line-item parity brief: the work was scoped from a direct request |

**The rail head shipped on 2026-09-08**, drawn, audited and built the same day; it sits in ✅ Shipped
below. **The art wash amendment joined and left on 2026-09-08**, the same day it was drawn — it is an
amendment to a surface the refresh already shipped, not a new vertical, which is why it carries no
ticket — and it sits in ✅ Shipped below.
**#360 joined and left on 2026-09-08** — straight from 🕰️ Backlog through three design rounds and
into 🔨 below, where its plan and its first PR now sit. **The refresh joined on
2026-09-07.** **#10 left the same day** — not to
a build, but to 🚦 Paused below. Its design is Green, its plan is merged, and Hugh's call is that
now is not the time to build it; nothing about the work changed. It was the occupant before the
refresh. **#340** was the last one before it and left on 2026-09-06 when its build
started; it shipped on 2026-09-07 and sits in ✅ Shipped. The four amendments (**#286**, **#280**,
**#287**, **#277**) shipped between 2026-09-05 and 2026-09-06, in the drawn build order, and sit in
✅ Shipped. **#220** left on 2026-09-06 when its eleventh and last planned PR merged, **#9** later
the same day on PR #332, and **#330** the same day on PR #377.

---

## 🔨 Implementation in flight

Design is complete and the build has started, but not every planned PR has merged. An item leaves 🟢 the moment its
first implementation PR lands and reaches ✅ only when the last one does.

| # / vertical | Handoff | Progress | Notes |
|---|---|---|---|
| **#360** Design: give users real control over topping off a deck — folding **#359** and **#361** | `design/design_handoff_the99_top_off/` | **PR 1 of 6** — schema + seed pass | Six PRs planned (`docs/superpowers/plans/2026-09-08-top-off-the-last-31.md`), with the briefing beside it. PR 1 is the fill-pass tables and the seed pass, and ships no UI. The design's ruling is that the strip stops adding cards and starts opening a list: one door, `Choose the last 31`, and a provenance line that becomes a ledger with a real undo per pass. #359 closes with that undo, #361 by deletion. Five engineering corrections from the readiness doc are folded into the plan; the largest is that a fourth writer clears the `auto` flag (`update-actions.ts:355`), which the immutable membership record makes moot — live/kept/removed are derived at read time, so no writer of that flag needs to maintain a join |

_**#360** joined on 2026-09-08 when its first PR merged. **#340** was the last occupant and left on 2026-09-07, when its single PR (#398) merged and it moved to ✅ Shipped. #288 was the occupant before it, until 2026-09-06, when its single planned PR (#312) merged. The six-theme visual system completed 2026-09-02, and the Add panel addendum before it. It completed 2026-08-09 with all six planned PRs merged (#201, #202, #204, #205, #206, #207, #208) and now sits in ✅ Shipped._

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
| 1 | **Card line item parity** — no ticket filed | `docs/superpowers/specs/2026-09-07-card-line-item-parity-design.md` (merged PR #404) | Design answers the four open questions; the answers land as an amendment to the existing per-surface tables rather than a new handoff folder, since every surface involved already ships | Six components draw a card row and the six disagree about what a reader is told — mana pips appear in exactly one of them, and the ownership dot is drawn by two components that disagree about what an unowned card looks like. Eng cannot separate purposeful difference from drift by reading the code, which is why this is a brief and not a refactor ticket. It sits ticketless for the same reason #330 did: the work was scoped from a direct request, and inventing an issue to hold a row is worse than the row saying it has none |

**Two questions the #94 sweep raised are filed together as #412**, and belong to that
brief rather than to a cycle of their own. `collection/no-results.tsx` and `commanders/filtered-empty.tsx` are the same
empty state drawn twice with different geometry and voice; folding them changes what a
reader sees, so eng left both standing rather than pick one. And
`decks/card-search-row.tsx` is the one card row that still cannot open the card modal: it
is an `option` inside a `role="listbox"`, where a nested trigger conflicts with both the
combobox's click contract and its accessibility tree. Every other named card row now opens
the modal, and the modal shows the same availability everywhere it opens (PRs #405, #407).
Both questions were left unfiled at the batch's close-out and ticketed later the same day
(2026-09-07), so #412 answers the "no ticket filed" column above only for these two — the
brief itself is still ticketless.

**#10 left on 2026-09-07**, the same day it arrived — its brief merged on PR #392, Design delivered
all five surfaces at R2 within the day, and the handoff audited 🟢 Green. Its plan merged the same
day on PR #406, and it now sits in 🚦 Paused below rather than in 🟢 — the build is deferred on
timing, not on anything outstanding. **#340** and **#342** left on 2026-09-06 when Design delivered their handoffs. **#342** audited
🟡 Yellow at R3 on 2026-09-07, built the same day and now sits in ✅ Shipped. **#340**'s R6 handoff
audited 🟡 Yellow and it now sits in 🟢 above with its plan.

**#220 left this queue on 2026-09-05**, the same day it entered it — its handoff landed and audited
🟢 Green at R1, and the build ran through to 2026-09-06, so it now sits in ✅ Shipped below.

**#330 left it on 2026-09-06**, the day its handoff landed, audited 🟢 Green and shipped — it now
sits in ✅ below. The feature was scoped from a direct request with no issue behind it, so its row sat here
ticketless for a day rather than have one invented for it; Hugh then asked for the issue, and it
carries the four rulings that closed the spec's open questions.

---

## 🎨 In flight

| Ticket | Stage | Notes |
|---|---|---|
| **Ratification batch** — **#140**, **#148**, **#182**, **#242**, plus the unfiled availability-marker placement | **Verdicts returned 2026-09-07** — applied on PR #395, three items still open | These held ranks 1–5 of 🕰️ until this move; the queue has since renumbered behind them, so those numbers describe where they came from and not any current row. Sent as one prompt rather than five because every item is the same ask: UI already live on `main` that needs a yes or a one-line rewrite. No handoff folder came back — the deliverable was verdicts, and they landed as `VERDICTS-2026-09-07`. The unfiled marker item rode in #182's batch rather than being filed as its own ticket, which is what its own row proposed while it sat at the old rank 4 |

**A 2026-09-07 pass before the prompt went out found two of the five had drifted, and both ticket
bodies were corrected on GitHub.** #140's deck-full refusal string no longer exists — a deck may
pass 99 and reads as `Over` — so there are three refusal reasons rather than four, while a
remove-path fallback that was never on the ticket has appeared; the set is still five strings but
a different five. #182 lost two more calls to self-closure: its em dashes are the quoted
`RECOMMENDED_MIX` rationales that `docs/superpowers/design-tables/add-panel-addendum.md` §10
finding 8 already rules must not be "fixed", and the 44px mobile Add height is the *original*
table's accessibility contract being followed rather than a divergence from it — `add-panel.md`
states the 44px minimum at `:74`, `:267`, `:385` and `:581`. Eight calls became six.
#148 and #242 verified unchanged.

**Design's verdicts came back the same day, and one of them was wrong.** §2.4 ruled that
`commandersCopy.firstRun.directive` should be cut because the completion reveal already directs —
but that is a `/commanders` string gated on `decks.length === 0`, while the reveal is on
`/decks/[id]` at 99 built, so the two can never co-occur. Design accepted the correction and
reversed to a reword, and released the six strings it had been holding. **PR #395 applies what is
unambiguous:** three copy strings (#140's remove fallback, the commanders directive, #182's
worked example) and two contested `card-availability.md` rows (15.10 becomes a multi-select
listbox, 3.1 splits placement by surface). **Three verdicts are still open**, because acting on
them would mean guessing: §3.3's "99 means three things" collapse never enumerated its three
strings and one candidate is the completion reveal's own heading; two of #148's three add-panel
divergences do not match the record as filed, and the third is a real visual change to the
consider tile; and §3.4 item 4 — the quick-add row should open the shared Card Detail modal — is
feature work Design says to file, which has not been filed. **§3.4 item 4 now has an obstacle
rather than just an owner** (found by the #94 sweep, 2026-09-07): the quick-add row is an `option`
inside a `role="listbox"`, so a nested modal trigger fights the combobox's own click contract and
its accessibility tree. Every other named card row was given the modal on PRs #405 and #407; this
one needs Design to say how a reader reaches a card's detail from inside a listbox, which is a
different question from the one filed. That question is now **#412**, alongside the empty-state
fold; both sit with the parity brief in 📐 rather than taking a backlog rank of their own.

**Both handoff folders are on disk untracked and are not committed to `main`.** They arrived
during a concurrent run, so this tracker records their arrival without claiming them; whoever runs
the audit commits the folder in the same PR as the verdict.

**The legend gap the amendments exposed is still open.** #286 and #287 were `type: design` **and**
`type: bug`, and the legend has no state for a design defect against an already-shipped surface:
🕰️ means a design cycle that has not started, which understates a live defect, and 🟢 means a
handoff has landed, which was not yet true while they sat here. They passed through 🎨 because
design was genuinely being produced for them. The next defect of this class will hit the same
gap, and it is worth closing rather than resolving case by case.

---

## 🚦 Paused

| # / vertical | Where it got to | Paused | Notes |
|---|---|---|---|
| **#10** Deck tuning suggestions from play results | Spec, handoff and implementation plan all merged; no build PR opened | 2026-09-07, Hugh's call — "not the time to build this one, but we'll circle back" | Nothing is blocking it and nothing about it is unresolved: the brief merged on PR #392, Design delivered all five surfaces at R2 the same day, the handoff audited **🟢 Green at R2**, and the 18-task plan merged on PR #406 after four Copilot rounds. It is paused on timing alone, and it is the repo's first LLM tier, which is the reason to be deliberate about when it starts. **Everything needed to resume is on `main`**: spec `docs/superpowers/specs/2026-09-07-deck-tuning-suggestions-design.md`, plan `docs/superpowers/plans/2026-09-07-deck-tuning-suggestions.md`, gap report `docs/superpowers/gap-report-deck-tuning.md`, property table `docs/superpowers/design-tables/deck-tuning.md`, handoff `design/design_handoff_the99_deck_tuning/`. The plan's own shape when picked up again: tasks 1–2 are schema and copy, 3–5 add the two new inputs (a per-game note and a deck intent), 6–9 are the pure core (fingerprint, evidence pack, prompt, six validation rules), 10–12 hold the real risk (the model client, the durability contract, and the read/gate/ceiling), 13–16 are the surfaces, and 17–18 close out. **The three rulings most expensive to re-derive** are recorded in the plan and should not be re-litigated: a `pending` run row is committed in its own transaction before the model call and both outcome writes are guarded by `where status = 'pending'`, so zero rows affected means "I was reaped" and the result is discarded; the failure vocabulary is **five** classes, not four, because `interrupted` is written by the read-time reaper and is user-visible; and #9's presentation rules carry over whole — no percentage and no net figure ever reaches the screen, every count carries its own denominator, and `PATTERN_MIN = 3` stays a presentation threshold rather than a data gate. **#389** in 🕰️ below was filed out of this scoping and stays out of scope |

**The legend's 🚦 definition was widened on 2026-09-07 to admit this row.** It previously read
"paused mid-workshop", which described only an item Design had not finished with. #10 is the
opposite case — everything upstream of the build is done — and the alternative was to leave it in
🟢, where the tracker's own headline question ("what is ready for eng to pick right now?") would
have answered with a ticket nobody should pick up. Widening the state is the honest fix; a second
paused-at-a-different-stage state would split one idea across two rows.

---

## 🕰️ Backlog (design cycle not started)

One ranked queue. **#130 + #131 left this queue on 2026-09-01** — promoted to rank 1 on 2026-08-29 when the recommendation-engine intake established #130 as a *precondition* for #213 and #214 rather than a peer (both terminate in "start a deck", and an empty deck lands them in exactly the disappointment #130 describes), workshopped the same week, and shipped on 2026-09-02 (PRs #249, #263) — it now sits in ✅ Shipped. #132 closed as already-shipped. Ranks 1–3 are v1 follow-ups against already-shipped surfaces; ranks 4–8 are post-v1 features ordered by the roadmap tracker (#44). **#220, #221 and #222 were written into the ranked rows on 2026-09-02.** The 2026-08-30 intake call below placed them "at the bottom" and assigned ranks 12–14, but the rows themselves were never added, so those numbers were left describing an older, longer list and collided with #151's. **#220 then left this queue on 2026-09-05** — workshopped, handed off and audited 🟢 Green that
same day, and shipped on 2026-09-06 — and #221 and #222 moved up behind it. **#9 left the same way**, workshopped ahead of the queue and shipped on 2026-09-06 (PR #332); both now sit in ✅ Shipped. **#360 joined on 2026-09-06** as rank 9, moved to rank 4 the next day when the ratification band left, and **left this queue on 2026-09-08** — workshopped ahead of the queue, three design rounds in a day, and audited 🟢 Green; it now sits in 🟢 above, and everything behind it moved up one. **The five ratifications left this queue on 2026-09-07** — #140, #148, #182, #242 and the unfiled availability-marker placement went to Design as one prompt and now sit in 🎨. They were the whole of the old ranks 1–5, so everything behind them moved up five. **#10 then left on 2026-09-07** — workshopped ahead of the queue; its handoff and plan both landed the same day and it now sits in 🚦 Paused above — and **#389 joined the same day** at the bottom, filed out of #10's scoping. The rows below carry the live ranks; prose and the intake table do not. Five former ranks left this queue on 2026-08-08 — #183, #177, #179, #185 and #184 were answered together by the Add panel addendum, which completed on 2026-08-09 and now sits in ✅ Shipped with #176. The per-surface brand + richness refresh tickets and #35 shipped ahead of everything here.

**Audited 2026-09-05** — ledger at `docs/superpowers/backlog/audit-2026-09-05.md`, which carries the
evidence behind every verdict and makes the next audit incremental. All 15 rows audited that day
survived — **two have since shipped** (#220 and #9, both on 2026-09-06), #360 was added on 2026-09-06
and left for 🟢 on 2026-09-08, and **the five ratifications left for 🎨 on 2026-09-07**, so the table
now runs to 8. On the day,
**nothing in it had shipped** and no ticket's premise had
died, so nothing was closed. What the audit did find
is six stale bodies, three of them stale because part of the ask shipped underneath the ticket while
it waited. Those issue bodies were refreshed on GitHub, and the four rows that had drifted with
them — #148, #182, #159 and #160 — were corrected to match; the first two have since left this
queue, and the other two are now ranks 2 and 3. One of the audit's two `DECIDE` questions is
answered: **the unfiled availability-marker item folds into #182's batch** rather than being filed
as its own ticket, which is how it went to Design on 2026-09-07. Still open: whether #160 shrinks
to "curve display" alone.

This list previously ran as two — a "Backlog" and a "Ready for design" — but the legend gave them the same definition (`type: design`, not yet workshopped), so nothing could be sorted between them by rule. The split was really a priority band, which the Rank column now carries.

| Rank | Ticket | Adjacency / notes |
|---|---|---|
| 1 | **#172** Design: quick-add bar has no drawn state for a failed search | Same ratification class as the batch now in 🎨 — the UI ships in the #158 run, so this is the one state Design has not drawn rather than net-new work. The Add panel handoff draws quick-add's no-results state but nothing for `searchCards` itself failing, and the two are different claims: "nothing in the pile by that name" is about the collection, which a 500 has not earned. PR 4 ships the honest-but-silent behaviour (the list simply does not open) pending a drawn state. The `degraded` block in the same handoff is the nearest precedent but is sized for a panel, not a one-line bar, so this is a placement call |
| 2 | **#159** Design: narrowing the commander recommendations | Same walk, but **narrower than the ticket claimed** (audited 2026-09-05). The body's "one list, no way in beyond scroll order" premise was never accurate: colour pips shipped with the surface itself in PR #21, and two more controls have landed since — the `Score against` toggle and the `?avail=free` filter, both from the #43 run. The remaining ask is mechanic/theme and popularity only. Adjacent to **#52** (windowing — design shipped, eng ticket still open), which changes how much of the list is on screen but not how the user aims at it; whoever picks these up should read them together |
| 3 | **#160** Design: deck completeness guidance (lands, curve, multi-copy adds) | Same walk. Two halves: the builder never says how many lands a deck wants or how the curve looks, and adding several copies of a basic takes one click per copy. The second half is the eng-side "bulk add" from the feedback batch, held here because the affordance is a design question — a stepper on the row, a quantity field in the modal, or a lands-specific control. **Half of this shipped underneath the ticket** (audited 2026-09-05): the land target is advisory and on screen, and the last-31 strip now places cards in bulk both ways — an owned-only fill and a buying top-up — including a real mana base after PR #272. What is genuinely unbuilt is a curve surface and a *user-driven* multi-copy control. **Open question for Hugh: is the remainder still worth a design cycle, or does this shrink to "curve display" alone?** |
| 4 | **#62** Design: Issue Inspector handoff reconciliation | Two copies of the #36 handoff exist; the mocks are byte-identical, and the nested README documents a footer (`View only · fix in export & re-upload`) present in neither mock nor `src/`. Needs a call on canonical location + whether that footer ships |
| 5 | **#151** Design: per-deck printing override for a card's art | Post-v1. **Split out of #42** at the 2026-08-02 workshop — #42 had inherited it from #105 on the reasoning that a deck-level override needs a deck to attach to, but it is unrelated to import (import is getting a deck in; this is how a deck looks once it is there) and #42's brief was already large. Last because it is polish: `card_art_preferences` is keyed `(user_id, oracle_id)` and `deck_cards` has no printing column, so it needs new storage and a new read path for no functional gain |
| 6 | **#221** Design: audit a built deck's commander and offer alternatives | Post-v1. Covers **#215**. Reads against #220's ranked list — the same scoring surfaced from inside a finished deck rather than from the collection — so whoever picks these up should read them together |
| 7 | **#222** Design: which of my decks does this card fit | Post-v1. Covers **#218**. An addendum to `design/design_handoff_the99_collection/` rather than a handoff of its own, and adjacent to the #43 availability marker it would sit beside on the same rows and tiles |
| 8 | **#389** Design: deck versions — track how a deck's strategy changed over time | Post-v1, **filed 2026-09-07 while scoping #10** and explicitly out of its scope. #9 attaches games to a deck rather than to a version of it, so a deck refined mid-season has its old games counted against its new list. #10's deck-intent field is the first thing likely to want a history, and #10 keeps that door open by ruling the field mutable and forbidding anything from reading it as a historical record. Last because nothing is blocked on it |

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
| **ManaPool price ingest** (Component C of the recommendation foundation) | `docs/superpowers/specs/2026-08-29-recommendation-foundation-design.md` §5 · plan tasks 8–10 | Issue **#288** filed 2026-09-05; built on PR **#291**. Its UI half shipped 2026-09-06 on PR **#312** and sits in ✅ Shipped below | Ships no UI, so no handoff and no `type: design` ticket ever existed. It was the one component of the five-part foundation left out of PR #244 |

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
| **#42** Import existing decks (Moxfield) | `design/design_handoff_the99_deck_import/` | 2026-08-06 (PRs #189, #190, #192–#197) — nine planned PRs; PR 3 became spike **#191** after Moxfield URL fetch proved blocked by Cloudflare bot protection, so paste and file import shipped without it. **Ticket #42 is still open on GitHub**, the same shape as #52 above: the design is fully shipped and the ticket holds the one undelivered half — URL fetch — which no design decision can unblock |
| **#183** + **#177** + **#179** + **#185** + **#184** + **#176** Add panel addendum | `design/design_handoff_the99_add_panel/ADDENDUM-README.md` | 2026-08-09 (PRs #201, #202, #204, #205, #206, #207, #208) — all six planned PRs merged. The spine was decision 1, a bottom-of-viewport ownership rule (shell tab bar owns the true edge; one route dock per route sits above it; content reserves the stack), which answered **#183** and **#177** together as the two tickets predicted. **#176** was ruled A by Hugh on 2026-08-06** — unowned EDHREC staples keep reaching Consider, marked with the shipped `buy` tag and gathered into a trailing shelf. Three non-blocking items still go back to Design at **R4**: the `RECOMMENDED_MIX.land` singular-label correction, whether the `Owned only` axis in Consider should be re-read now that ruling A gives it two values, and whether the undo row's deliberately long life reads as clutter in a 99-row list |
| **#43** Cross-check recommendations against cards committed to decks | `design/design_handoff_the99_availability/` (+ `ADDENDUM-2-README.md`) | 2026-09-01 (PRs #223, #224, #225, #226, #227, #228, #229, #230, #231, #232, #234, #235, then the round-out #239, #240, #241) — ten planned tasks plus the reserved polish PR, then a three-PR round-out split by blast radius. One marker with four states (`free` renders nothing, deliberately) across the decklist row, both comboboxes, Consider tiles, `/collection` rows, tiles and card detail, plus the `Score against` toggle on `/commanders`, the `Availability ▾` filter and its `?avail=` round-trip, and the deck-level over-committed roll-up. There is no feature flag — the task order was the dependency chain, so the vertical went live with Task 4. Journeys A–D are walked and recorded in `docs/superpowers/journey-lifecycle-card-availability.md`; plan at `docs/superpowers/plans/2026-08-13-card-availability-plan.md`. **The design is not fully ratified.** Ten items go back to Design as ratifications: six in `ADDENDUM-2-READINESS.md` under "Resolved engineering-side" (§6's supply-vs-claims wording, the missing count-only `hardAria`, the `[Complete]` pill §3 draws that `hardDecks` cannot carry, the `Showing N of 1,418` denominator, self-exclusion extending to the add panel, and the canvas's unqualified `free = owned − hard`), its items 8–10 (the `none free` and `also in` vocabulary sweep, `cards scanned` as the header noun, and the accepted phone truncation on over-committed rows), and the countless `overAria` key raised by PR #225. **Item 11 is the one open Design ask, not a ratification:** five mana pips overrun their `/collection` row grid track at both widths (40px phone and 54px desktop against roughly 67px and 81px of pips). It predates availability entirely and needs a grid call — widen the track, wrap, or cap the pips with an overflow affordance. Two further ratify rows sit in 🕰️ below as rank 4 (the marker's placement on a decklist row) and **#242** (design table 15.10's checkbox group against the shipped `role="listbox"`) |
| **Six-theme visual system** (system layer; ticket not filed — arose from the 2026-08-31 palette workshop) | `design/design_handoff_the99_themes/` | 2026-09-02 (PRs #246, #248, #249, #250, #251, #252) — all six planned PRs merged. **The theme names below are the ones this run shipped and are now historical — five of the six changed on 2026-09-06 (two themes retired, three renamed); see the theme-replacement row further down.** Six user-selectable themes — Gilded Stone (Amonkhet, the amended default), Neon Rain (Kamigawa), Moonlit (Innistrad), Oil and Iron (New Phyrexia), Screen Glow (Duskmourn), Rune Frost (Kaldheim) — each a 35-key `[data-theme]` block plus one display face, with the crab/kaiju character layer retired and its ten empty and loading states redrawn around the three-diamond crown already in `completion-reveal.tsx`. R1's two blockers were both closed inside the audit rather than by Design: §8.2's fifth column is `--fg-faint`, not `--fg-muted` (read as muted it failed the 4.5:1 floor in four of six themes), and the §8.5 accent-area budget is an eyes-on heuristic rather than a CI check, since painted area is not statically computable. R2 then drew the mobile pass (shell at rest, the picker's 390px sheet at a 44px minimum, five empty states at 390px) and ruled the Metamorphous single-weight question. **Three rulings were taken before the build:** Rune Frost pins display weight to 400 and disables synthetic bold (`font-synthesis-weight: none`, one rule in `@layer base`) because uniform stroke dilation is wrong for a high-contrast decorative face at the 15–18px sizes where most of its 32 sites sit; all six theme names ship as drawn; and the build ran as one continuous epic — a PR per phase, merged autonomously. **Two things eng must not re-derive:** the chroma budget is measured *after* 8-bit quantisation, because clamping in OKLCH and rounding afterwards re-introduces chroma (five values in this system bust the budget that way), and `--font-display` must gain one level of indirection — Tailwind 4's `@theme inline` substitutes literally, so a `[data-theme]` block redefining it does nothing. Non-blocking residuals, still open: `--fg-locked` lands at 3.02–3.05:1 in all six with zero headroom, so any future darkening of a `--surface` breaks all six at once; the contract carries 30 WUBRG pip keys to express one decision (only Oil and Iron's green moves); Moonlit's `--avail-hard-fg` is identical to its `--accent` and wants a comment or it reads as a copy-paste error; and Rune Frost is worth one look on real Windows hardware, which no pass in this run performed. Plan: `docs/superpowers/plans/2026-09-01-theme-system-plan.md` — 18 tasks, six phases, six PRs |
| **#130** + **#131** Recommendations you can act on — pre-populate a deck from recommendations · make Role Coverage explanatory and inspectable | `design/design_handoff_the99_recommendations/` | 2026-09-02 (PRs #249, #263) — audited 🟡 Yellow at R3 (PR #237). The §0 blocker recorded on this row cleared when the recommendation-engine foundation merged as PR #244, and the vertical shipped the same week. Hugh's live feedback on the shipped build is what produced the synergy-discovery brief (PR #270) now sitting in 🟢 above, and the 37-copies-of-one-basic mana base the fill produced (PR #272) |
| **Synergy discovery, and the last 31** (from live feedback on the shipped #130/#131 build; no ticket filed) | `design/design_handoff_the99_synergy_discovery/` | 2026-09-03 (PR #275, single-PR build off the plan at `docs/superpowers/plans/2026-09-03-synergy-discovery-plan.md`) — audited **🟢 Green at R1** the same day (PR #274). The EDHREC Synergy panel is now a synergy ranking with a type-facet strip and an uncapped disclosure; rows are selectable on both the commander and deck surfaces and ride into the build on `?select=`; and the deck builder gained the last-31 strip — an owned-only fill beside an explicitly-labelled buying top-up, both placing `auto` cards. **The one ruling Design requested was taken eng-side in Design's favour:** the 99/99 completion reveal is suppressed when the last card was placed by a fill, and only when that fill actually placed a card. Copilot ran 18 rounds; the three findings that would have shipped broken were the fill claiming a 99 another tab had reached, the outage sentence speaking for a commander EDHREC simply does not index, and the toolbar gate that hid the kept-note along with the sweep button. Gap report: `docs/superpowers/gap-report-synergy-discovery.md`; property table: `docs/superpowers/design-tables/synergy-discovery.md` |
| **#288** Price on the buy tag | `design/design_handoff_the99_decks/` (R3) | 2026-09-06 (PR #308 · PR #312) |
| **#330** Link out to Mana Pool to buy the shopping list, and to buy one card | `design/design_handoff_the99_linkout/` (R3) | 2026-09-06 (PR #377, single-PR build off the spec at `docs/superpowers/specs/2026-09-05-manapool-checkout-design.md`) — audited **🟢 Green at R3** the same day. Two links, one primitive: the export dialog's Shopping tab carries the whole unowned list to `/add-deck` as a base64 payload, and the card modal opens the all-printings grid for one card. **The card link is keyed by the oracle card name, never the printing on screen** — the art you happen to be looking at must not narrow what you can buy, and the link is unconditional: owned or not, priced or not, and byte-identical from the deck builder, `/collection` and the commander page. No price-layer change; the link reads no price. **Three deviations from the canvas were taken eng-side under ENG-AUDIT 7 and are not gaps:** the export footer's button row and the card modal's nav row keep their shipped padding rather than the canvas's redraw, the primitive is `ExternalLink` after its file, and the sr-only *(opens in a new tab)* suffix lives in the component because no call site may vary it. One structural change to shipped code: the card modal's desktop nav row now wraps `‹ Prev · N of M · Next ›` in a right-aligned cluster so the link can take the leading edge, which it must, because `useDialogA11y` sets no `initialFocusRef` and the focus trap follows DOM order. Copilot ran two rounds, both 🟢 with zero comments. Gap report: `docs/superpowers/gap-report-manapool-linkout.md`; property table: `docs/superpowers/design-tables/manapool-linkout.md`. **R4 followed on 2026-09-06** (handoff PR #388, build PR below): the original feedback was that *Shopping* offers nothing to buy from, and R3 answered it inside Export, where nothing tells you a shopping list is hiding. R4 puts the link in the price strip under the Shopping filter. It dropped 🟡 Yellow on two facts, both confirmed in `ENG-AUDIT-R4.md` in the drawing's favour, which raises it 🟢 Green and supersedes `LINKOUT-R4-READINESS.md`. Two changes ride with it: the none-priced state now drops the price figure and the `0 of N priced` clause for `no prices from ManaPool for these`, because a fraction over nothing is arithmetic for a sentence the provenance line says outright; and one selector, `isShoppingCard`, now defines the list for the filter, the strip's link and the export dialog alike — the dialog previously composed its own `!owned` list, which carried unowned basics the filter refuses to show and dropped the spoken-for cards it puts front and centre, so the two links promised different baskets. Gap report: `docs/superpowers/gap-report-shopping-strip-linkout.md`; property table: `docs/superpowers/design-tables/shopping-strip-linkout.md` — 0 gaps at every width. **Still owed:** `/copy-review` on R3's two strings plus R4's `provenanceUnpriced` and the export dialog's `N cards · to buy`, all of which only reached `src/` with these PRs |
| **#9** Win/loss tracking for decks, including per-game strength/weakness notes | `design/design_handoff_the99_game_log/` (R1) | 2026-09-06 (PR #332, single-PR build off the plan at `docs/superpowers/plans/2026-09-05-deck-game-log.md`) — audited **🟢 Green at R1** on 2026-09-05 in one pass; spec at `docs/superpowers/specs/2026-09-05-deck-game-log-design.md` (PR #294). The deck builder gained a third tab: a fifteen-second log form (result, pod size, date, and marks against a fixed eight-axis vocabulary), a history list with an inline delete confirm, and an aggregate panel that sorts the axes into Keep, Fix and a single Mixed line. **The four corrections recorded on the 🟢 row were all taken as written** — shipped underline tabs over the canvas's pills, `--bg` for `--base`, vocabulary order for the N=1 axis list, and a generalised keyboard handler in `BuilderTabs`. **Three presentation rules are enforced by tests and must not be relaxed, because they are the feature's argument rather than styling:** no percentage and no net figure ever reaches the screen, so every count carries its own denominator (`3 of 3`); `PATTERN_MIN = 3` is exported once from the copy module and is a presentation threshold, never a data gate, so `summarizeGames` never sees it; and below that threshold the panel describes rather than makes a finding — at N=1 no element takes success or warning ink and the words Keep and Fix do not appear, since colour is the claim that a pattern exists. Copilot ran sixteen rounds. The four findings that would have shipped broken were a future-date guard that refused a legitimate log from a browser clock running seconds fast, a live region that announced two quick logs with the same stale record, radiogroups that did not answer the keyboard their role promises, and a cleared date field that left Save enabled and submitted an Invalid Date. Gap report: `docs/superpowers/gap-report-game-log.md`; property table: `docs/superpowers/design-tables/game-log.md`. **#9 stops at naming the gap** — what to do about it is #10's whole reason to exist, and `summarizeGames` is pure and tested without a database so #10 can build on the summary rather than re-read rows |
| **#286** + **#280** + **#287** + **#277** Four amendments | `design/design_handoff_the99_amendments/` (R3) | 2026-09-05 → 2026-09-06 (PRs #296, #297, #299, #300, plus the polish #318) — audited 🟢 Green at R3 (PR #295), except #277 at 🟡 Yellow on build order alone; spec at `docs/superpowers/specs/2026-09-05-four-amendments-design.md`. **The drawn build order was honoured**: #280 landed on PR #299 before #277 on PR #300, because `add-validation.ts` would otherwise have silently dropped cards past 99. `--b` moves to `#98748F` in all six theme blocks after R1 and R2 both failed `contract.test.ts`'s 0.10 accent-separation gate; the deck gains an `Over` status tested ahead of both the ownership test and the unresolved guard, with the progress bar re-scaled to the deck's own total so the amber remainder *is* the number to cut and `aria-valuemax` rising with it; `/commanders/[slug]`'s 282-line bespoke lightbox is deleted for the shared card modal, which is a strict superset but for art size; and a deck can be re-imported in place through `planDeckUpdate` (`src/lib/decks/update.ts`), which is pure for the same reason `import.ts` is — **the compare path reaches no write at all**, so a player who compares and walks away has changed nothing |
| **Theme replacement** (system layer; ticket not filed — arose from the shipped six-theme system) | `design/design_handoff_the99_theme_replacement/` (R6) | 2026-09-06 (PR #371) — Moonlit and Screen Glow retired for sitting 15° from Oil Haze and 25° from First Frost, which at UI sizes is not a second theme. Canopy (`ixalan`, Trirong 600) and Witching Hour (`eldraine`, Cormorant Garamond 600) take the two wide hue corridors and match the survivors' own 62° spread; R6's chroma refit lands with them. Three survivors are renamed into a weather-and-hour system, and because the plane prefix stays, **four of the six keys need no migration**. **Anyone persisted on a retired id is moved to its nearest survivor, never the default** — someone who chose Moonlit chose a cool desaturated theme, and dropping them into brass is the loudest wrong answer; they are told once, in the picker. `src/lib/theme/themes.ts` is the registry of record and this handoff supersedes `design/design_handoff_the99_themes/TOKEN-TABLE.md` wherever the two disagree. **Three calls were taken eng-side rather than sent back:** the two new themes take the vacated grid slots rather than the copy file's renamed-before-new order, which is annotation grouping and says nothing about layout — following it would move four chips a returning user knows the position of; the chip subtitle is an explicit `short` field on the registry rather than a colon-split rule, because that rule shortens Kamigawa and does nothing at all for Wilds of Eldraine, which then truncates mid-word; and the retirement notice's visuals are undrawn, so what shipped is eng-invented. **A browser pass found two defects the suite as it then stood could not have caught:** the account menu opened with the notice's ✕ focused — one Enter from dismissing a notice the user had not read — and dismissing it dropped focus on the body, outside the panel's own focus trap. **Both land on the checked theme chip, but by two different mechanisms, and neither one implies the other:** the opening case is the panel naming that chip as `initialFocusRef` (`src/components/shell/account-menu.tsx`), while the dismissal case is `dismissNotice` calling `chipRef.current?.focus()` directly (`src/components/shell/theme-picker.tsx`), because the ✕ unmounts with the notice it dismisses and initial focus has long since been spent. Both are now locked — `src/components/shell/account-menu.test.tsx` with *opens with the checked theme focused*, `src/components/shell/theme-picker.test.tsx` with *hands focus to the checked chip rather than dropping it on the body*. The first test is only meaningful because its file installs a `getClientRects` mock: `useDialogA11y` skips elements with no client rects so a `display:none` branch cannot take focus, and jsdom gives everything zero rects, so without the mock the trap is inert and any assertion about first focus passes vacuously. The property table had nothing to say either way, since the notice's visuals are undrawn. **Two items go back to Design as ratifications, neither blocking:** the retirement notice's invented visuals, and the grid-slot ordering. Gap report: `docs/superpowers/gap-report-theme-replacement.md`; property table: `docs/superpowers/design-tables/theme-replacement.md` |
| **#220** Commander discovery — one ranked list, two sorts (covers **#213** + **#214**) | `design/design_handoff_the99_discovery/` (R1) | 2026-09-06 (PRs #293, #298, #301, #304, #305, #306, #307, #309, #310, #313, #316, #322, #326, #327) — eleven planned phases plus the brief, the handoff and two performance PRs the build forced. `/commanders` gained a scope control: **Score my collection** keeps the shipped 242-commander ranking, **Something new** opens a population of every indexed commander the player has not built — a shade over 3,300 — ranked either by fit or by distance from what they have already played. Novelty is a distance sort with buildability as a floor, never a term — `NOVELTY_FLOOR` is 0.3 and lives in its own module (`src/lib/discovery/floor.ts`) because both the ranking and the empty state have to print the same number. Detail pages work for commanders the player does not own, and all four discovery states — the reveal window, the floor empty, the no-decks banner and the filtered empty — were driven in a real browser at 390px and 1300px rather than read off the source. Plan: `docs/superpowers/plans/2026-09-05-commander-discovery.md`; property tables and gap reports are split three ways, `discovery-controls`, `discovery-rows` and `discovery-empties`, one per design-reviewed phase. **Three items go back to Design as ratifications**, all raised in PR #327: the `FilteredEmpty` canvas predates Surfaces v2 while state 3c forbids moving the shipped geometry; superset colour matching means a five-colour deck reads as "is Green" under a Green filter, where "fits" may be the truer word; and M-7 draws the ghost outline in `--accent` where the shipped `GhostButton` uses `--border-strong` until hover |
| **#342** Explain every commander recommendation in prose (folds **#345**, **#346**, **#347**, **#366**) | `design/design_handoff_the99_commander_explained/` (R3) | 2026-09-07 (PR #397, single-PR build off the plan at `docs/superpowers/plans/2026-09-07-commander-explained.md`) — audited 🟡 Yellow at R3, where all three residual findings were eng-resolvable and took no Design round. The score now explains itself: segments round to whole points and the score is **defined as their sum**, so the key's closing line is a true statement about the figure above it rather than an approximation of it. A commander EDHREC does not index prints `/40 measurable` instead of a figure beside a ceiling it was never measured against, and rank order survives that on `rankScore`, which #385 broke by shipping the honest denominator without the ordering meant to outlive it. "Why this commander" pairs one stored sentence with two templated ones and unmounts entirely, heading included, when it has nothing to say. **Two things eng must not re-derive:** the paragraph's committed-deck clause needs the owned support cards as *oracle ids*, not EDHREC names, which is why `scoreCommander` indexes the pool to a `Map` and the detail route alone scores to a `CommanderDetailScore` — no list surface names a deck, and none should pay for one; and a recovered EDHREC retry refreshes the route rather than its own state, because the score, the denominator, the legend and the hero note are all server-rendered from the compute the retry just repeated. `legend.segment` was deleted rather than implemented: its two halves render in different colours, so no single string can carry the figure. Gap report: `docs/superpowers/gap-report-commander-explained.md`; property table: `docs/superpowers/design-tables/commander-explained.md` — twelve verify-pass findings, all closed, confirm returned zero |
| **#340** Commanders as one plane (folds **#335**, **#341**, **#343**, **#344**) | `design/design_handoff_the99_commanders_plane/` (R6) | 2026-09-07 (PR #398, single-PR build off the plan at `docs/superpowers/plans/2026-09-06-commanders-one-plane.md`) — audited 🟡 Yellow at R6, where all nine blockers closed eng-side and none took a Design round. `/commanders` gained a name search mirrored to `?q=`, a `contains` / `exactly` colour match mode mirrored to `?join=exact`, and a list that accounts for itself. **The population rule is the feature's argument and must not be relaxed:** each surface prints its own population — the subtitle names the full pool, the pip row and the in-field count name the rows on screen, and the exclusion line bridges the two, so `full pool − below-floor − unmeasurable = rows shown` is checkable against the figures on screen. That is why the floor tier has a **second** population: a row is unmeasurable when its tag list is empty **or** when its denominator is missing, which `index-build.ts` writes whenever EDHREC could not be reached — so the copy says **no data** to measure where the handoff said *no tags*, which would have been false for half the group. A settled query that matches nothing in the list asks the server about the full index and, when the index carries the commander, names the ONE outermost control that removed it (scope → pips or mode → floor → `Score against`) and offers the correction; above one match it counts rather than naming one, because the singular sentence diagnoses from the first row's identity. Copilot ran twenty-two rounds. The findings that would have shipped broken were a name lookup whose aggregates scanned 240,000 rows for the two hundred it returned, the colour pips taking the blame for a query that matched nothing (offering a Clear-colours button that would surface nothing), a floor note marking the threshold instead of the row's own figure whenever a row cleared the floor exactly, and `Emphasised` reading a colour-only tint as `<strong>`. **Five items are flagged for Design ratification** in the PR body, none blocking: +173px of mobile stack, leading-edge search placement, must-not 3's scope, `WindowCount` dropped from the mobile bar, and the `excluded.control` copy block. Gap report: `docs/superpowers/gap-report-commanders-plane.md`; property tables: `docs/superpowers/design-tables/discovery-controls.md` and `discovery-empties.md` — enumerate → verify returned **0 gaps** |
| **The rail head is the mark** — no ticket filed | `design/design_handoff_the99_rail_mark/` (R1) | 2026-09-08 (PR #446, single-PR build off the plan at `docs/superpowers/plans/2026-09-08-rail-mark.md`) — audited 🟢 **Green** at R1, the first Green of this pipeline that needed no eng-side gap closure at all. The 62px rail drew the crown's middle diamond alone, which is also the shape Discover's nav glyph is built from, so the app's mark and one of its five nav icons were the same drawing; the head now renders `<Crowned99 variant="rail-62">` and the head zone grows 56 → 73px, moving everything below it down 17px. **Three things eng must not re-derive.** The `gap` passed to `crownBox` is the 3px of visible air between diamond *points*, not the handoff's 6px, which is the flex conversion an SVG doing its own rotation maths does not need — passing 6 doubles the air. The numeral baseline sits 22px under the crown rather than 4 + 23, because the canvas sets the digits with `line-height: 1` and Cinzel 900's 31px of ascent-plus-descent gives −4px of half-leading that an SVG `<text>` has no line box to inherit; the em-box reading drops the digits 5px and opens a trench, which no unit test can see and only the browser walk caught. And `rail-62` **replaced** the dead `rail` variant rather than joining it, so `variant` is now required. Three of the handoff's own statements were corrected eng-side rather than sent back to Design — the 13px nav shift is 17, the 32.5px lockup is its flex box against a painted 35.0, and `shellCopy.railMarkAria` was declined because `Crowned99` already renders the name for every variant — and all of them are recorded in an errata table at the top of the handoff's README, with the handoff's prose left verbatim as the record of what Design ruled. Ticketless for the same reason as the refresh it amends: scoped from a direct request against a reported screenshot. Probe: `scripts/probe-rail-mark.mjs`, kept, because JSDOM has no layout and can prove none of the geometry that matters here |
| **Commander art wash — readability amendment** — no ticket filed (adjacent to **#336**) | `design/design_handoff_the99_art_wash/` | 2026-09-08 (PRs #444, #445, off the plan at `docs/superpowers/plans/2026-09-08-art-wash-readability.md`) — audited 🟡 **Yellow** the same day it was drawn; all eight of Yellow's findings closed eng-side and none needed a Design round-trip. The reported bug was that every wash drew `image_uris.normal`, so a printed card frame — border, name bar, type line — sat behind the text on the deck tile, Home's ready-to-build hero, the commander recommendation and discovery rows, and Home's resume row. All four now draw `art_crop` through one shared `<ArtWash>` in `src/components/ui/`, with two strategies (`cover`, `left-portrait`) and no per-surface scrim, which is exactly how this would drift back; `CommanderBleed` is deleted. Yellow's blocking gap was that the column did not exist and `src/db/schema.ts:64` forbids deriving the URL from `normal`, so task 1 added `cards.art_crop_uri` — migration **0021**, not the plan's 0020, which #442 took first — and both catalogs were re-seeded by dispatching `catalog-refresh.yml` with `job=oracle`, reaching 35313/35313 coverage on staging and production alike. **Three things eng must not re-derive.** `!important` in both accessibility media queries is load-bearing, because `<ArtWash>` sets opacity and gradients inline — both are computed from the band height — and an inline declaration outranks any plain selector. `--art-wash-reduced-opacity` is a **ceiling and never a floor**: the handoff's flat `0.3` was written for the cover band's art at `0.58`, and applied flat it raises a `left-portrait` row's ambient copy from `0.14`, answering a request for less transparency with more art. And the no-crop identity gradient publishes its own opacity rather than that ceiling, because it is ground rather than photography and is the only identity signal a commander with no crop has. Two of the handoff's own premises were disproved against code and recorded as closed rather than built: decision 10's apostrophe escape is already handled by `cssUrl` in `src/lib/collection/browse.ts:103`, and open item 1's subtitle-truncation trade does not exist because the resume row prints the deck name, not the commander's. **Two deviations went back to Design and were both ratified the same day** (PR #452). The status pill had taken one `1px solid var(--border-strong)` for all six statuses, retiring Building's `--border-dashed` alongside the four signal statuses' colour-faded edges, because the wash rules ink over art to full opacity and a 50% fade of the status colour was the worst-reading edge in the report; Design ratified the uniform colour and weight but **restored the dash on Building only** — a line style is not an alpha fade, so the readability rule never reached it, and it is the one status signal surviving greyscale and colour blindness now that colour lives only in fill and label, on the one status that differs in kind. And the no-crop identity gradient keeps full opacity under `prefers-reduced-transparency` where the README said "the same opacity"; ratified as shipped, with Design correcting the README wording rather than the code. Probe: `scripts/probe-art-wash.mjs`, hand-run like its siblings — **Playwright's `emulateMedia` has no `prefers-reduced-transparency` option and silently ignores one**, so that check passed vacuously until it was moved to CDP `Emulation.setEmulatedMedia` behind a loud throw. **A second audit re-ran the handoff with the whole surface in scope, and turned that clean verdict into forty findings.** The first property table enumerated the wash's gradient layers alone, on the plan's line that "only the art behind it changes", so the verify pass could report 0 gaps against a surface that had not been built: **a table that enumerates only what the code already does cannot find a missing structure.** README decision 4 — *data lives on flat ground* — is not a statement about gradients; it says the wash owns one band and everything below a `1px var(--border)` divider sits on `var(--surface-inset)`, and no surface had that split. Neither did decision 6's top-anchored labels (which is the whole payoff of the `center top` focal), decision 8's band-derived portrait geometry, or decision 3's ink-over-art rule for the chips. The rec and discovery rows ran the wash under the entire row via `absolute inset-0`, which is **also the root cause of the over-scaled crop**: the sharp layer's `background-size: auto 100%` resolved against the *rendered* row height, so a row grown by a long note stretched the wash. `<ArtWash>` now states `height: ${band}px` on its own root and each band is a stated box rather than a floor, so neither path survives. The rows also gained the type-line subtitle the canvas draws, which required `typeLine` on `CommanderListItem`. Two structural fixes are worth not re-deriving: the resume row states `h-[72px]` rather than a floor, because the wash root is a hard 72px and any overflow left an unwashed strip; and the deck tile and hero roots take `min-w-0`, having survived on `overflow-hidden` alone. **Two items go back to Design as ratifications, neither blocking:** the `left-portrait` L1 plate resolves to the row's own ground rather than the darker `color-mix(… 86%, black)` the `cover` strategy uses, deliberately, so a row's art fades into the row; and the band's vertical alignment bottom-aligns all three children per the README's "labels at band baseline" where the canvas centres the rank and top-aligns the fit chip (table conflict 10). Gap report: `docs/superpowers/gap-report-art-wash.md`, now two rounds; property tables: `docs/superpowers/design-tables/art-wash.md` (layers) and `art-wash-full-surface.md` (all five surfaces, both breakpoints) |

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
