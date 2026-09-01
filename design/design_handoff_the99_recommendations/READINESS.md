# Readiness Review — Recommendations you can act on (#130 · #131)

**Verdict:** 🟡 Yellow — ready, with eng-side clarifications the plan PR carries.
**Audited:** 2026-08-31 (R1, R2, R3)
**Related ticket(s):** #130, #131
**Plan PR target:** `docs/superpowers/plans/2026-08-31-recommendations-you-can-act-on.md`

## Summary

The handoff is complete. Three rounds: R1 came back 🟠 Orange on eight items, R2 closed six and
was 🟠 Orange (light) on two, R3 closes both. **Nothing further requires a designer** — every
remaining item is an eng decision or a doc correction, which is what makes this Yellow rather
than Orange. Fifteen states are drawn at both widths, all seven §8 rulings hold, and the null
rule is clean: the canvas renders a dash in three places and a `0%` in none.

The one hard block is not a design question. §0's recommendation foundation
(`feat/rec-foundation`) has not merged, and per-card EDHREC inclusion for an arbitrary commander
does not exist offline. Every chip figure and the unowned top-up depend on it. **No drawing
changes when it clears** — this is scheduling, and the plan PR can be written now and executed
after.

## Per-dimension findings

### 🗺️ Scope clarity
- [✅] Boundary is the brief's §6 fifteen states; non-goals are stated (no blended score, no
  per-chip add control on Role Coverage, no staged roster).
- [✅] Open questions are logged rather than silently decided — the keep gesture and the desktop
  chip target are both flagged as needing a ruling, each with Design's proposed answer and an
  explicit note that neither forces a redraw.

### 🎭 State coverage
- [✅] All fifteen states drawn at 390px and desktop. R1's four undrawn frames (degraded-EDHREC
  retry, phone Shopping row, desktop in-flight, phone short cell) are the addendum's A1–A4.
- [✅] Degraded and absent are now distinct states, not one collapsed frame — same shape,
  `--warning` rule instead of `--fg-faint`, different string, and a control where absent has
  none. Four signals, none of them colour alone.
- [✅] Mobile parity is real, not asserted: A2 gives Shopping a 52px phone row with the figure on
  a meta line, because a sixth item in a 44px line leaves the card name ~90px and the row stops
  naming a card. It is the only row in the builder that grows, and the reason is stated.

### 🔌 Data contract
- [🟡] **Ruling 2 needs new engine code.** `getDeckSuggestions` appends a flat `slice(0, 5)` of
  EDHREC's ranking (`src/app/decks/actions.ts:106`, `:153`), unbounded by role. Each row *is*
  classified (`primaryRole(c)`, `:150`) — the role just never enters the selection. "Top each
  role up to its target and no further" therefore requires bounding each role by its own
  remaining gap against `ROLE_TARGETS`. State 11's seven-card Shopping tab is
  not reachable from what ships today. R1 recorded this as free and was wrong; R2 accepted the
  correction and propagated it.
- [🟡] **The three `REPLACES` entries target hardcoded JSX in `detail.tsx`**, not a copy module.
  Lifting those strings out of the component is part of the work, not a prerequisite someone else
  did.
- [✅] Every named state is reachable once §0 lands, with the single caveat Design flags itself:
  state 14 (in-flight) may never render if the fill happens inside the create transaction. It is
  drawn so a streaming implementation has a spec, not because one is recommended.

### 🧱 Codebase fit
- [✅] No new token, no new hex, no new motion class, no new empty-state construct, no new modal.
- [✅] The addendum's new treatments reuse shipped vocabulary rather than inventing: dashed is
  already this codebase's "nothing here yet" (dropzone border, spent slot, unowned dot), and the
  retry's disabled state is `CardDetailTrigger`'s shipped `opacity: 0.55` + `aria-busy`.
- [🟡] **`role-counter-cell.tsx` does change.** R1 said the strip and the cell were both
  untouched; that was true at R1 and is not true now. The *strip* is untouched per decision 8 —
  no layout change, no rename, no new construct — but the *cell* gains two state treatments: the
  in-flight rule (A3) and the `--border-strong` hairline on a short cell in a just-filled deck
  (A4). Corrected in `README.md:213` and below.

### ♿ Cross-cutting
- [✅] Focus is inherited, not overridden — global `:focus-visible`, 2px brass at +2px offset, so
  the A1 retry needs no bespoke ring.
- [✅] `aria-pressed` was removed from the `auto` tag in R2. It reported a state that cannot be
  observed: the control removes itself on activation, so `true` never exists and `false` is the
  only value it could announce. The tag carries `aria-label` and the builder's live region
  confirms the keep.
- [🟡] Desktop chips are 28px and pointer-first; their accessible equivalent is the phone's 44px
  row, and both ship. If a 44px desktop target is required, the row density replaces the pill
  wrap at all widths — drawn at phone, not drawn at desktop.
- [✅] Density is bounded without virtualisation: 12 desktop / 6 phone at rest, expand to 40,
  then `+N more` as an inert count (`DENSITY-long-role.md`).

### ⏰ Drift from reality
- [✅] Two claims the handoff made about shipped code were wrong and are now corrected in three
  files rather than inherited into an estimate (the flat `slice(0, 5)` and the `REPLACES`
  targets). Both were caught by reading `src/`, not by reading the handoff.
- [✅] Phone Card Draw draws 4 chips under `Show all 14`. That is a clipped 860px frame, not a
  cap change — the cap is 6 per `DENSITY-long-role.md`.

### 📝 Decision log
- [✅] Ten decisions in `README.md`, locked vs. tentative marked, plus a nine-item gap report.
- [✅] R2 and R3 both argue their changes rather than asserting them, and R3 concedes the A3
  drawing rather than defending the prose — the canvas moved, not the paragraph.

## Gaps requiring Design round-trip

**None.** Both R2 items closed in R3, verified in the canvas rather than in the README:

- **A3's in-flight bar.** R2's prose described a hairline with no vessel but drew
  `height:5px; border-radius:999px; border:1px dashed` — R1's exact track footprint with a
  dashed border, which is still a container and still invites "how full is it?". R3 redraws all
  five cells as `height:0; border-top:1px dashed`, holding the track's 5px as margin so the cell
  does not change height between frames. A rule is not a container.
- **The status pill.** Resolved without a fork and without new keys. The copy file records a
  *mapping* onto the shipped `Draft` / `Building` / `Playable` / `Complete` ladder — state 14 →
  `Draft`, state 8 → `Building` — with the rule that if the shipped thresholds disagree, the
  thresholds win and the comment is what gets edited. This avoids exactly the defect the
  add-panel addendum flagged when `strip.hint` was overwritten from two modules.

## Eng-side clarifications — the plan PR owns these

1. **Ruling 2's per-role bound is new code.** The candidates already carry a role; the selection
   ignores it. Bound each role by its own remaining gap against `ROLE_TARGETS` instead of taking
   EDHREC's overall top five. Size the task accordingly; do not assume the shipped top-up gets
   you there.
2. **Lift the `detail.tsx` strings into a copy module** before the three `REPLACES` entries can
   apply.
3. **The keep gesture.** Design's answer is tag-as-button (`auto` → `keep ✓` → gone). If an
   implicit keep is preferred — any edit to the row counts — the tag becomes inert text and
   nothing else moves. Decide in the plan PR.
4. **Desktop chip target size.** 28px pointer-first with the phone row as the accessible
   equivalent, or row density at all widths. Decide in the plan PR.
5. **A2's shrink order needs properties that do not exist yet.** The meta span must carry
   `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` for "the meta line ellipses
   first" to hold. The mock draws strings short enough not to need it, which is how it slipped.
   The name uses `flex-auto`, not `flex-1` — the bug `decklist-row.tsx` already documents.
6. **`role-counter-cell.tsx` gains two state treatments.** Read decision 8 as covering the strip
   only.
7. **The swept-empty copy branches** on whether the deck was ever filled. If that bit is
   expensive, ship the first-run string in both places and accept that it reads slightly wrong
   when reached by deletion.

## Decisions inherited — the plan PR must respect these

The brief's seven §8 rulings, none of which this handoff violates:

1. `Build this deck` fills the deck for real — ordinary deck-card rows with an `auto` flag, plus
   one *Clear all auto* sweep. Staged rosters and per-role opt-in were both rejected.
2. The fill reaches outside the collection but only as far as each role's baseline; unowned
   top-ups land in Shopping.
3. Ceiling is roles + a mana base, **68 of 99**. The 31 open synergy slots are deliberate.
4. Role Coverage chips carry `inclusionPct` and open the shipped card-detail modal. No blended
   score.
5. `auto` is a quiet marker cleared by a deliberate act. **Inspection is not endorsement** —
   opening the modal must not clear it.
6. Basics fill the mana base and never enter Shopping.
7. Role Coverage gets no per-chip add control — it is pre-deck.

Plus the project-wide null rule: missing data is omitted, never defaulted to zero.

## Blocking — not a design gap

**§0, the recommendation foundation, has not merged.** `feat/rec-foundation` carries the spec and
plan; there is no PR yet. Per-card EDHREC inclusion for an arbitrary commander, served offline,
does not exist. Every chip figure (§8.4) and the unowned top-up (§8.2) depend on it. The plan PR
for this handoff can be written now; execution waits.

---

## Appendix — Design's self-assessment, verbatim

Preserved from R1 as Design wrote it. Where it conflicts with the audit above, the audit is
current on two points: item 6's "`role-counter-cell.tsx` untouched" was true at R1 and is not
true after the addendum, and item 7's "no role classification" overstates the gap — the unowned
rows are classified, they are just not selected per role.

> **Self-assessed: 🟡 Yellow — one hard block, and it is not a design question.**
>
> **Blocking**
>
> 1. **§0 — the recommendation foundation has not merged.** Per-card EDHREC inclusion for an
>    arbitrary commander, served offline, does not exist. Every chip figure (§8.4) and the unowned
>    top-up (§8.2) depend on it. The brief instructs Design to mock as though it exists, and this
>    handoff does — but nothing here can be built until `feat/rec-foundation` lands. **This is a
>    scheduling block, not a design gap, and no drawing changes when it clears.**
>
> **Needs a ruling — neither requires a redraw**
>
> 2. **The keep gesture (§8.5's "explicitly").** The ruling fixes the semantics and names no
>    gesture. Design's answer is **tag-as-button**: `auto` → `keep ✓` → gone. If Product prefers
>    an implicit keep (any edit to the row counts), the tag becomes inert text and nothing else in
>    the handoff moves. Decision 4, gap 3.
> 3. **Desktop chip target size.** The desktop chip is 28px and pointer-first; its accessible
>    equivalent is the phone's 44px row, and both ship. If a 44px desktop target is required, the
>    row density replaces the pill wrap at all widths — a real option, drawn at phone, not drawn
>    at desktop. Gap 2.
>
> **Called, not asked — flagged for the record**
>
> 4. **No confirmation on `Clear all auto`.** The count in the label plus a reversible sweep is
>    Design's substitute for a dialog. §9.3 invited the question; this is the answer, not a
>    deferral.
> 5. **The swept-empty copy branches** on whether the deck was ever filled. If that bit is
>    expensive, the shipped first-run string ships in both places and reads slightly wrong when
>    reached by deletion. Gap 7.
> 6. **State 14 may never render.** Design prefers the fill inside the create transaction. The
>    in-flight frame is drawn so that a streaming implementation has a spec, not because one is
>    recommended.
>
> **Corrected since R1 — read these before estimating**
>
> 7. **The unowned top-up is a flat `slice(0, 5)`**, not a per-role bound
>    (`src/app/decks/actions.ts:106`, `:153`), with no role classification. Ruling 2 needs new
>    engine code, and state 11's seven-card Shopping tab is not reachable without it. R1 recorded
>    this as free and was wrong. Nothing drawn changes.
> 8. **The three `REPLACES` entries target hardcoded JSX in `detail.tsx`**, not a copy module.
>    The lift out of the component is part of the work.
>
> **Not blocking**
>
> - No new token, no new hex, no new motion class, no new empty-state construct, no new modal.
> - `role-counter-strip.tsx` and `role-counter-cell.tsx` are untouched (decision 8).
> - `suggestDeck` is untouched; #130 commits what it already returns.
> - The null rule is drawn in three places (chip dash, Shopping figure dash, in-flight role cells)
>   and **nowhere renders a 0%**.
> - Every figure in the canvas is arithmetically consistent: 10 + 10 + 8 + 3 + 37 = 68, state 13
>   is 67, Shopping is 7, and the pruned deck is 66 with 58 auto.
