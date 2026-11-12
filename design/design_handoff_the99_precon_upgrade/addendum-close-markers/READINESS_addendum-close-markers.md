# Readiness Review — Upgrade this precon: close on every step, and bracket marks on the swaps (addendum A3)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-12 (cold read against origin/main at aae879a44; the PR branch is current with it)
**Related ticket(s):** PR #2894 (this addendum); parent handoff R2d (PR #2794), addendum A2c (PR #2873, backend #2874)
**Plan PR target:** TBD

## Summary

A3 is buildable on today's code with no Design round. Every piece it reuses exists as named: SocialModal's bare ✕ (`src/components/social/social-modal.tsx:127`, 44 × 44, 15px, `--fg-muted`, `-mr-[10px]`), the flow's plated desktop ✕ it replaces (`upgrade-flow.tsx:180`, `hidden … md:flex`, `aria-label` `notNow`), the three foot buttons it removes (`upgrade-flow.tsx:291` Not now, the Wait's Back that calls `leave`, `:225` History's Close), `CardFactMark`, `ComboGlyph`, `MarkKey`, `FactTooltip`, `factsFor` and the shipped `line-pulse`/`useLinePulse`. The mid-run claims hold: `useUpgradeRun.close` keeps a `wait` view (`use-upgrade-run.ts:94`), the entry and the A2c band both draw `entry.running` with its clock, and a run that lands while closed drops back to the press (`settle`, `:65`). G19 to G21 are real engineering work, not gaps. Eight clarifications below; the plan PR records each as a decision. Wording goes to `/copy-review`.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] The brief, what does not change (R2d, A2c) and the Not drawn list are stated in `README.md`; Must-nots in `STATES-close-markers.md`.
- [✅] Calls 6 and 7 are recorded as Hugh's rulings (2026-11-12).

### 🎭 State coverage

- [✅] The ✕ is drawn on all seven steps at 390 and 1300 (`A3-Close-Phone`, `A3-Close-Desktop`), plus W/P1/P2/R for mid-run and R1/R4 for marks at both widths. No-marks and past-result states are covered in text.
- [🟡] **"Next open starts at the intro" is not always the shipped behavior.** After a close before the confirm, or a run that fails while closed (call 6), the next open is `viewOf(pending ?? newest unstarted done run)` (`use-upgrade-run.ts:32`): with a kept unstarted result it opens on that result. The handoff says "as shipped". See clarification 1.
- [🟡] The failed run's ✕ and the deck page band while running are not drawn; the handoff names both as identical to drawn states. Accepted.
- [🟡] The Strategy step's same-picks ask (`upgrade-flow.tsx`, the `same` foot) has no Back today and is not mentioned. It gains the ✕ like every step; no other change.

### 🔌 Data contract

- [🟡] **G19.** `PanelCard` is `Partial<CardFacts> & { owned }` (`src/lib/precons/upgrade/run.ts:42`), and that `CardFacts` is `{ cmc, identity }` (`src/lib/precons/upgrade/facts.ts:6`): no bracket facts, as the gap says. The sources exist (`cards.game_changer`, `src/db/schema.ts:90`; `card_bracket_flags`; `factsFor`, `src/lib/bracket/facts.ts:23`). See clarification 2.
- [🟡] **G20.** Runs store `pairs` as JSON (`src/lib/precons/upgrade/store.ts:119`). Partners kept on the run need a field on the pair or the row, and runs made before it carry none. See clarification 3.
- [🟡] **G21.** `useLinePulse` plays once per visit, on first intersection (`use-upgrade-run.ts:125`, `played.current`). A replay on landing needs a second trigger, not a reuse as-is. See clarification 4.

### 🧱 Codebase fit

- [✅] No new token, colour or size. The board-only `--ink`/`--n` vars are the canvas scaffold every prior board in this handoff carries.
- [🟡] **Mark after the name.** `Name` is `min-w-0 flex-1 truncate` (`result-view.tsx:65`), so a mark placed after it lands at the row's right end, before `Pips` (`:80`), not "right after the name". See clarification 5.
- [🟡] **The key's entries.** `buildMarkKeyEntries` (`src/components/decks/mark-key-entries.tsx:29`) takes `DeckDetailCard[]` and adds buy/proxy/locked/foil entries. The result needs only its fact and combo rule (`:99` onward). See clarification 6.
- [🟡] Copy in `copy strings.ts` is DRAFT (one string, `close`) and goes through `/copy-review` into `src/lib/copy/precon-upgrade.ts`. `flow.notNow` and `history.close` lose their last callers; `flow.back` stays.

### ♿ Cross-cutting

- [✅] 44px hit on the ✕ at both widths; Escape and the scrim still close (`useDialogA11y(dialog, leave, {})`, `upgrade-flow.tsx:78`). Reduced motion drops `line-pulse` (`globals.css:1426`). Marks are 16px bare with `FactTooltip` on desktop.
- [🟡] **Combo hover wording.** `comboAwarenessCopy.deckTooltip.inDeck` reads `Both are in this deck.` (`src/lib/copy/combo-awareness.ts:92`). On a swap that is not applied, an add is not in the deck yet, and a cut's partner stays while the cut leaves. Wording, so `/copy-review`, not Design. See clarification 7.
- [🟡] Initial focus: with the ✕ first in the title row's tab order after History, `useDialogA11y` focuses it (or History). Follow SocialModal (the ✕ takes focus on open).
- [✅] Performance: G19 is one more read joined into the panel's existing `deps.facts(named)` call, not a new wave. Analytics: none stated, none needed.

### ⏰ Drift from reality

- [✅] Every file, component, hook and copy key named exists on origin/main as named (`upgrade-flow.tsx`, `result-view.tsx`, `use-upgrade-run.ts`, `upgrade-entry.tsx`, `deck-upgrade.tsx`, `social-modal.tsx`, `card-fact-mark.tsx`, `combo-glyph.tsx`, `mark-key.tsx`, `fact-tooltip.tsx`, `cardMarkCopy.keyRegionAria`, `comboAwarenessCopy.keyWord`, `preconUpgradeCopy.entry.running`, `wait.leave`).
- [✅] A2c's band shipped its running label and pulse (`deck-upgrade.tsx:108-120`), so call 5's "the band does the same" has a host.

### 📝 Decision log

- [✅] Calls 1 to 11 are numbered; rulings dated; gaps G19 to G21 logged in the addendum's own `READINESS.md`.
- [🟡] The self-assessed READINESS calls G20's partners "kept on the stored run" while G19's facts are read live. The handoff does not say why they differ. Clarification 3 records it.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

1. **Where the next open lands.** Keep `useUpgradeRun`'s shipped rule: the next open shows a pending run's wait, else the newest kept result not yet started (unless closed after History), else the intro. Call 4's and call 6's "starts at the intro" holds when no such result exists. Picks are always dropped (the flow unmounts on close).
2. **G19 facts.** Extend the panel's card read with `game_changer` and `card_bracket_flags`, assembled by `factsFor`, onto `PanelCard.facts` (undefined when none, never `[]`). Read live, like `owned`. A two-card commander side draws the union of both cards' facts, as `combined` already does for identity.
3. **G20 partners.** Compute on the box list with the run's pairs applied (`swapped`/`upgradedDeck`), using the deck row's `comboFor` rule, and store the partner name per pair at finish. A run stored before this ships has none and draws no combo mark (absence is the design), while facts still draw.
4. **G21 pulse.** Add a replay trigger to `useLinePulse` (a count the caller bumps) and bump it when `view.kind` moves from `wait` to `results` while `open` is false, on both the entry and the band. Twice, then still; nothing under reduced motion.
5. **Mark placement.** The name stops being `flex-1`: the name and mark sit in one `min-w-0 flex-1` box, the name `truncate` and shrinking, the mark `flex-none` after it, so the name ellipsises first and the mark stays beside it.
6. **The key.** Build the result's entries with the same fact loop and combo rule as `buildMarkKeyEntries` (closed set, `CARD_FACTS` order, combo after the facts), extracted as a shared helper rather than copied. No buy, proxy, locked or foil entries. Region label `cardMarkCopy.keyRegionAria`.
7. **Combo hover sentence.** Send `deckTooltip.inDeck` on a swap to `/copy-review` for an after-the-swaps wording; until it rules, use the shipped `keyWord` alone.
8. **The Wait's foot** keeps its disabled press full width on a phone and the `wait.held` line. The failed run's Back and History's `‹ Back` stay.

## Decisions inherited

- Hugh approved A3 R1 on 2026-11-12: a run that fails while closed opens as shipped (call 6), and tutors are marked on the swaps (call 7).
- The ✕ never asks, and closing never cancels or refunds a run in flight. No second ✕, no plate, no foot button that only closes.
- No new mark, colour or size; no count beside the bracket; no positive claim when a result has no marks.
- R2d and A2c stand unchanged: steps, copy, credits, results layout, Start and Apply.
