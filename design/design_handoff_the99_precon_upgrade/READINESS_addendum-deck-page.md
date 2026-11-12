# Readiness Review — Upgrade precon on the deck page (addendum A2c)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-11 (cold read against origin/main at a9646b3b6)
**Related ticket(s):** PR #2873 (this addendum); parent handoff R2d (PR #2794), shipped in #2823, #2826, #2831
**Plan PR target:** TBD

## Summary

A2c is buildable on today's code with no Design round. Every surface it names exists as named (`spine-desktop.tsx`, `spine-mobile.tsx`, `ArrivalBandShell`, `PreconArrivalBand`, `readDeckOriginAndStart`, `readUpgrades`, the `line-pulse` keyframes, `src/lib/copy/precon-upgrade.ts`), and the swapped-list math already ships (`upgradedDeck`, `prepareUpgradeIn` in `src/lib/precons/upgrade/apply.ts`). G16 to G18 are real backend work, not gaps. Seven clarifications remain. The largest: the "Linked v0" case is always a linked brew (a deck with no committed version), and a brew has no draft state, so the A1 after-Apply board (to-do card's "changes since v0" step, the pending rule on rows) cannot draw for it as the code stands. The R3 K14 pattern settles it (the deck stays a brew, and the header keeps its Commit as v1 offer), so this is an eng-side decision, not a Design gap. The plan PR records each item below as a decision. Wording goes to `/copy-review`.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] The brief, the build target (A2c B2), the superseded placements (A2 header, A2b C and D) and the non-goals (`/decks` tiles, R2d steps unchanged) are stated in `README.md` and `STATES-deck-page.md` Must-nots.
- [✅] Call 4's extra gate (hidden while there are changes since v0) is recorded as ruled with the round.

### 🎭 State coverage

- [✅] Started, linked, changes since v0, has a v1, not from a precon, flow open, results, from History, applied, undone and apply failed are all in `STATES-deck-page.md`. Phone and desktop are drawn for the band (A2c-B-Compact, A2-Deck-Page) and the flow (A2-Flow, A2-After-Apply), plus all six themes.
- [🟡] **Running run on the deck page is not drawn.** A run started on the precon page, or one the player left mid-wait, shows on the precon page as `entry.running` ("Upgrading toward … · clock", `upgrade-entry.tsx`). The band's button has no drawn running form. See clarification 4.
- [🟡] **Linked brew after Apply** (A1 is drawn for a started deck only). See clarification 1.
- [🟡] **A run that no longer fits the list** (`prepareUpgradeIn` returns `listChanged`/`gone`) on the deck page: the shipped results stage greys the press and says `results.listChanged` "…so it can't start a deck", which is start wording. See clarification 5.
- [🟡] Apply's pending state (between the press and the toast) is not drawn. Nearest pattern: the results press disabled while pending, as Start's is.
- [✅] Signed out does not apply: the deck page is owner-only. A failed origin read draws no band, as the page's `originRead` catch already does (`src/app/decks/[id]/page.tsx:266`).

### 🔌 Data contract

- [🟡] **G16 gate, legacy starts.** A start made before starts committed v0 holds the box as v1 (`src/lib/precons/start-version.ts:23-37`, `isStartVersion`). "No committed version after v0" must read as "no version newer than `startVersionId`", not "no version numbered above 0". See clarification 2.
- [🟡] **G16 gate, linked brews.** `loadDraftState` stops at "no version" (`src/lib/decks/draft-state.ts:167-170`), so "a list that still matches v0" for a linked brew has to compare the live list and helm against `origin.cards` and the origin's commanders directly, not against a draft diff.
- [🟡] **Band persistence read.** `readPreconArrival` (the owned count, "You own 41 of its 85") runs only on `?from=precon` (`page.tsx:313`). The persistent band needs it on every visit while the gate is open. See clarification 3.
- [🟡] **G17 Apply.** `applyUpgradeIn` (`apply.ts:96`) rewrites the list and commits v1. The deck-page Apply must reuse `upgradedDeck` and `prepareUpgradeIn` but write the live list and commander without committing, and it needs its own Undo. Because the gate guarantees the list was v0 when Apply ran, Undo restores v0's list and helm, refused if the deck moved since (the `undoSuggestionSet` refusal shape, `src/app/decks/tuning-v2-actions.ts:53`).
- [🟡] **Overview on Apply is not addressed.** An upgraded Start writes an Overview at no credit, claimed once per run (`precon_upgrades.overview_at`, `src/app/decks/precon-actions.ts:38-39`). The deck page's Apply is silent. See clarification 6.
- [✅] G18: runs are keyed by reader and `precon_file` (`readUpgrades`, `src/lib/precons/upgrade/store.ts:136`), so History on both pages is one list with no schema change.

### 🧱 Codebase fit

- [✅] The band is `ArrivalBandShell` (`--surface-rail`, bottom rule, 16/30px padding: `src/components/decks/arrival-strip.tsx`), and the receipt body reuses `preconsCopy.arrival.bodyShort`/`bodyAll`. The button is the precon page's accent outline at 32/44px. `line-pulse` exists (`src/app/globals.css:772`) and is dropped under reduced motion (`globals.css:1424`).
- [✅] The "brass rule" on changed rows is the shipped pending-change mark (the 2px `--accent` left rule, `src/lib/copy/deck-versioning.ts` pending notes), which is brass in Low Sun. No new token.
- [✅] The to-do step reuses `deckVersioningCopy.pending.since`/`rowBodyNext`. The toast is the shared toast with Undo.
- [🟡] `ArrivalDismiss` is the band's only right-hand control today, and `ArrivalBand` always draws it. The band needs a slot for the button in place of the ✕ (first visit), and the persistent form has no ✕ at all.
- [🟡] `UpgradeFlow` takes `onStart` and draws `results.start(n)` (`src/components/decks/precons/upgrade/upgrade-flow.tsx:44,239`). It needs an Apply mode (label `apply(n)`, the same press) rather than a fork of the flow.
- [🟡] Copy in `copy strings.ts` is DRAFT and goes through `/copy-review` into `src/lib/copy/precon-upgrade.ts`. Note the shipped intro line it replaces is `intro.lines[4]` ("Nothing changes until you start a deck from it.").

### ♿ Cross-cutting

- [✅] Reduced motion is covered. Tap targets are 44px on the phone. The button's accessible name is its label.
- [🟡] The phone band ellipsizes a long precon name. The running label (clarification 4) is longer than `Upgrade precon` and must not push the row past one line.
- [🟡] Performance: the gate and the owned count are two more reads on the deck page's loader. Both must ride `originRead` (only a deck with an origin pays) and start in the existing early wave, not after it.
- [🟡] Analytics: none stated. The plan follows the precon page's existing upgrade events, with a source distinguishing the deck page.

### ⏰ Drift from reality

- [✅] Every file, component, read and copy module named in the addendum exists on origin/main as named. The deck page's band order (precon arrival, then suggestion, import strip, update strip: `src/components/decks/builder-shell.tsx:1722-1758`) holds, and the precon suggestion draws only on unlinked decks, so it never meets this band.
- [✅] The R2d flow the addendum reuses has shipped (#2823, #2826, #2831), including start-with-swaps and its Overview (G13).
- [🟡] `upgrade-flow.tsx:6` still says starting from a result is "drawn off until its own PR". The start shipped. The comment is stale and should be fixed in the PR that adds Apply.

### 📝 Decision log

- [✅] Design's calls 1 to 8 are numbered, the A2 → A2b → A2c path is recorded, and the call 4 ruling is dated. Gaps G16 to G18 are logged in the addendum's own `READINESS.md`.
- [🟡] The addendum does not say which R2d gaps (G13 Overview, G15) apply to Apply. It does say G15 does not. G13 is clarification 6.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

1. **Linked brew after Apply.** A linked deck with "no committed version at all" is a brew, and a brew has no draft state (`draft-state.ts:273`), so A1's to-do step and row marks cannot draw. Follow R3 K14 ("the deck stays a brew; Commit as v1 is offered as today"). After Apply on a linked brew, the shared toast with Undo shows, the band leaves (the live list no longer matches v0), and the header's shipped brew Commit as v1 offer stands. The plan does NOT give linked brews a draft against v0: that would change every linked brew, not just upgraded ones. The plan records this as a decision. If Hugh wants A1's marks on linked brews too, that reopens R3 K14 and is a separate ruling.
2. **Gate with a legacy start version.** The gate reads "no deck version newer than `startVersionId`", and for a linked deck, "no deck version". The intro's DRAFT line "you commit them as v1" and the to-do step take the real next number (`rowBodyNext(n, version)` already does). The intro line goes to `/copy-review` with that parameter.
3. **Persistent band.** It runs `preconArrivalQuery` on every visit while the gate is open, chained on `originRead`. The first visit after a start is the shipped receipt with the button in the ✕'s place. Later visits draw the same band with no ✕. The linked head (`Linked to the … precon`) is a new string beside `arrival.head`.
4. **Running state on the band.** Mirror the precon page's running entry (`entry.running`) at the band's size. On the phone, the label truncates inside the 44px button rather than growing the row. Pressing it opens the flow on its wait stage, as the precon page does.
5. **A run that no longer fits.** Keep the shipped behavior (press disabled, a line saying why). The line gets an Apply wording (it says "start a deck" today), through `/copy-review`. The server action refuses on the same `prepareUpgradeIn` result, in the same transaction as the gate (G17).
6. **No Overview on Apply.** Apply writes no Overview and claims no `overview_at`. The swaps land as uncommitted changes, the deck's carried Overview then shows its shipped stale note (`src/lib/copy/synopsis.ts:143`), and the shipped Write an Overview covers a fresh one at its usual cost. This keeps the Must-not "never charge for Apply" and adds no model call.
7. **Apply's Undo.** Undo restores the box's list and helm, refused with the shared toast error if the deck changed after Apply. Apply and Undo both revalidate claims, as `applySuggestionSet` does. `builtFromUpgradeId` is set on Apply and cleared on Undo.

## Decisions inherited

- Hugh approved A2c (B2) on 2026-11-12, with call 4: the band and button hide while the deck has changes since v0, and come back on Discard or Undo.
- The R2d flow, copy and credit rules are unchanged except the intro's last line and the results button (README call 6). Apply is free. Only a run costs 2 credits.
- There is no second confirm, and the button never goes in the header's action row (A2 rejected).
- R2d's G1, G9, G10 and G12 stand. G15 does not apply.
- R3 lock 4 and K14 apply: v0 is never a `deck_versions` row, and a linked brew stays a brew.
