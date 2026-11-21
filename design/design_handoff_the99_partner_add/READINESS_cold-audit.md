# Readiness Review (cold re-audit) — Add a partner to an existing deck (#491, R1b)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-21, against origin/main be0de9de0 (the handoff's own READINESS.md read 37bc087)
**Related ticket(s):** #491 (removing a partner is #492, out of scope)
**Plan PR target:** TBD (docs/superpowers/plans/ — name it when the plan PR opens)
**Intended home:** `design/design_handoff_the99_partner_add/READINESS_cold-audit.md`. The handoff folder already holds a READINESS.md written by the session that helped produce the handoff, so this cold audit sits beside it rather than over it. Merge the corrections below into that file if you want one verdict file.

## Summary

Every surface is drawn on phone and desktop where it matters, over shipped components, and no Design round-trip is needed. The existing Yellow stands, but its claims are not all true on main. Three of them are wrong or incomplete in ways that change the build: the feature switch it names was retired, G1 (Backgrounds) is far bigger than "add kinds to `canPair`", and the handoff never says where the list of outside partners comes from. All three are eng-resolvable. Two small states are not drawn (Undo refused, over-100 deck) but the shipped patterns settle them.

## Per-dimension findings

### 🗺️ Scope clarity
- [🟡] G6 (deck over 100) is "not drawn": the door and section are hidden with no words. Settle in the plan; an explanation would be a Design call, but hiding matches how the shipped door behaves for an ineligible deck.
- [🟡] The issue (#491) scoped to `canPair`. Hugh's decision 2 (Backgrounds) widens it. That is recorded, but it is a bigger change than the handoff admits (see Data contract).
- [✅] Non-goal (#492) and Hugh's three decisions are stated.

### 🎭 State coverage
- [✅] Frames exist for every row of the README table (all 21 listed frames have a file in `art/`).
- [🟡] Undo refused: G3 says Undo works "only while the draft still holds that change unchanged", but no frame shows what the reader sees when it is refused (draft moved on, or a stale tab). Resolve from the shipped deck refusal toasts (`token-refusal-toast.tsx`, `quick-add-failed-toast.tsx`); simplest rule is that any other edit dismisses the toast.
- [🟡] Toast lifetime is unspecified, and on a brew the toast is the only way back (`copy.brew`). Today `writeCommanderChange` refuses a pair becoming a single (`write.ts`, "mismatch") and nothing durable records the previous state. Decide the lifetime and that Undo is lost on reload or navigation, then say so in the plan. Worth Hugh seeing as a product consequence, not a Design gap.
- [🟡] The Add a partner section's empty case (no candidate at all, for example every Partner-with partner filtered) is not drawn; use the shipped sheet's none state.
- [🟡] Card details door while the card modal is open: how the modal and the sheet stack and where focus returns is not drawn. `useSheetHost`/`sheetsBelow` already govern stacked sheets; follow them.

### 🔌 Data contract
- [🟡] **G2 confirmed.** `tradeShape` returns null when the leader grows and `fromBody === 0` (`src/lib/commander-change/pending.ts`, the `fromIds.length !== toIds.length` branch: `fromBody === 2 ? pairTrade : fromBody === 1 ? pairUp : null`). `offerable` is shared by the loader (`candidates.ts`) and `writeCommanderChange` (`write.ts`), so outside partners are hidden and refused today. Also true: `writeCommanderChange` never checks the deck's size, so the "ends at 100 or under" and "cut is in the 99 and not locked" checks are all new.
- [🟡] **G1 is under-specified.** Adding Background kinds to `canPair` (`src/lib/decks/partner.ts`) is not enough:
  - `isCommanderCandidate` (`src/lib/recs/score.ts`, lines 273-298) rejects a Background (Legendary Enchantment, not a creature, no "can be your commander"). `write.ts` and `candidates.ts` both gate every half on it, so a Background would be refused "illegal" and filtered out.
  - `canPair` is also read by `create-picker.tsx`, `partner-slot.tsx`, `import-actions.ts`, `actions.ts`, `precons/start.ts`, `game-opponents.ts`, `opponent-commanders.ts`, `edhrec/pair-enumerate.ts` and `candidates.ts`. Widening it changes all of them, including the EDHREC pair sweep (`legalPairs`, `LEGAL_PAIR_FLOOR` 1,500 measured at 1,717). `announcements/pairing.ts` already knows Backgrounds, so there are two rules to reconcile.
  - A Background-led pair has no `commander_pair_support` row unless the sweep is widened; the figure then falls to `growingHits`' single-list fallback, and a Background has no single list.
  Decision for the plan: either scope the Background rule to this write and loader only, or widen the shared rule and own the blast radius.
- [🟡] **The candidate source is not stated.** Today a single deck's candidates are sampled singles (`candidateKeys`, `MIN_CANDIDATE_DECKS` 20) plus `growingPairs` over the 99's legends. Neither yields "every legal partner for this commander from the whole catalog". The plan must choose: pairs in `commander_pair_support` containing the commander (floor applies, as the shipped list), or a catalog-wide `canPair` scan with the `growingHits` fallback for the figure. Choose one and say how it treats pairs below the floor.
- [🟡] **G4/G5.** `commander_pair_support_cards` has `inclusion` (nullable "never 0") and `position`, so "least run" and "In N% of decks" are buildable. Two caveats: a pair with no support row falls back to either half's single list, so the copy "the {pair} decks we read" would be untrue there; and `reasonUnplayed` ("None of the ... decks we read run it") assumes the stored list is complete, which should be checked against how many cards the index keeps per pair. Cut suggestions must also skip locked cards, and "Cut another card" must not list them (G2 refuses them server-side; nothing draws the exclusion). Which basic a land cut names is not stated (the frame shows Plains for a W/U deck): pick the most-run basic.
- [🟡] **G3.** One write that restores the single and the cut, validated against the live columns. No new table is needed if the check is "live pair equals the pair the client wrote and the cut card is not back in the 99". `changeCommander` is a Server Action that revalidates (`revalidateClaims`), so keep the page-payload note from `actions.ts`.
- [✅] Review and history need nothing new: `notePartnerAdded` = "a partner joins" (`copy/change-commander.ts:135`; `change-commander-review.tsx:77` reaches it for a grown pair with no stayed, leaving or arrived half, which is this case) and `commanderPair` (`copy/deck-versioning.ts:490`, used `version-diff.tsx:280`) exist.
- [✅] Buy marking for the arriving partner: `heldIds`/`buyIds` in `draft-rows.ts` already treat an arriving, unowned half as to buy.

### 🧱 Codebase fit
- [🟡] **The Pick line is not a drop-in.** `SuggestedChangesPickLine` takes a tuning `LineItem` (side, verdict, `bracketAfter`, `evidence`, `applies`, `locked`...), `permits` and `aim`. Reusing it means synthesizing a cut `LineItem` with `bracketAfter: null`, `evidence: []`, `permits: []`, `aim: null` (it then draws no bracket flag or chips). Workable and consistent with the drawn frame, but the plan should record it.
- [🟡] `proposal.diff` exports `Mark`, `Thumb`, `Plate` and drops `ml-[68px]` on the figure panel; both exist as the diff expects on main (`change-commander-sheet.tsx`). The `commanderDoor` prop through `CardModal` and `CardModalSheet` is new; the provider decides it through a registration like `registerReceiptLink` in `card-detail-provider.tsx`.
- [🟡] `ChangeCommanderProvider` (`change-commander-context.tsx`) has `openSheet(from: DoorWidth)` with no section argument. "Opens the sheet on that section" needs an added parameter and a scroll or focus target.
- [🟡] The in-deck partner row moves from the shipped groups into Add a partner (shipped pairUpKeep case); the shipped `growingPairs` output must be partitioned, not duplicated.
- [🟡] **Stale feature switch.** The README and its READINESS say "behind `CHANGE_COMMANDER_ENABLED`". That switch was retired (#2502, migration 0212); it appears nowhere in `src/` now, and the deck page mounts `ChangeCommanderProvider` unconditionally (`src/app/decks/[id]/page.tsx:743`). Per repo rules a new switch needs Hugh first, so the plan ships this unflagged (or asks Hugh for a switch). Not a Design gap.
- [✅] Copy: `copy/partner-add.ts` is a proposal for `/copy-review` and reuses shipped keys that exist (`ctaPair`, `failedRetry`, `pairUpKeep`, `expandCaption`, `notePartnerAdded`, `commanderPair`). The `cc.sheet.figure` key is `copy.sheet.figure` in `copy/change-commander.ts:45`.

### ♿ Cross-cutting
- [✅] 44px phone hit boxes, `aria-pressed` on Pick, `opensAria` on the opened-cards button.
- [🟡] Announce the toast like the shipped deck toasts, and return focus to the commander line after Undo; the context's `announce` and `focusPending` already exist for the commit case.
- [🟡] Performance: a catalog-wide candidate read adds claims and price reads for many more halves than the shipped sheet reads (`loadAvailability`, `loadPrices` in `candidates.ts`). Keep it behind the sheet's on-open read (`readChangeCandidates`) and limit the To buy list to the first 5 as drawn.

### ⏰ Drift from reality
- [🔴→🟡] `CHANGE_COMMANDER_ENABLED` is gone (see Codebase fit). Everything else cited exists: `offerable`, `growingHits`, `notePartnerAdded`, `commanderPair`, `pairUpKeep`, `expandCaption`, `changeCommander`, `ToastFrame` (`edit-toast-frame.tsx` and others).
- [✅] The handoff was drawn after #2262 and the retirement; no navigation or schema drift found.

### 📝 Decision log
- [✅] Hugh's three decisions (2026-11-21) are recorded: both doors, Backgrounds, toast Undo.
- [🟡] Locked versus tentative is not marked for G4's basic-land rule (37+ lands) or the "first 5" cap; treat as drawn.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow)

1. Retire the switch claim: ship unflagged, or ask Hugh for a switch.
2. G1: decide scope of the Background rule (local to this feature, or shared `canPair`), and extend `isCommanderCandidate` or bypass it for a Background half in `write.ts` and `candidates.ts`; account for the pair sweep and `announcements/pairing.ts`.
3. State the candidate source for outside partners and the below-floor and no-pair-row behavior (and the copy for it).
4. G2 write shape (`pairUpCut` or similar) with size, in-99 and lock re-validation; the write currently checks no size.
5. G3 Undo: validation rule, toast lifetime, refused-Undo behavior, loss on reload; tell Hugh a brew's only way back is that toast.
6. G4/G5: exclude locked cards, name the basic land, null `inclusion` handling, verify the support-list cap behind `reasonUnplayed`.
7. Pick line: synthesize a cut `LineItem` with neutral bracket fields.
8. `openSheet` gains a section argument; card modal and sheet stacking and focus follow `useSheetHost`.
9. G6: hide door and section for a deck over 100.

## Decisions inherited
- Both doors; Change commander's "Add a partner" section above a "Replace {short}" list; the door box on the commander's own card details.
- Backgrounds supported (G1 ships with this).
- Toast Undo stays.
- Nothing becomes illegal (a pair's identity only widens); exactly one cut, first suggestion pre-picked; no model spend for suggestions.
- Removing a partner is #492.

## What this audit opened
Frames opened as images: L1-phone, C1-phone, A1-phone. Frames checked by name and file presence only (README table and `art/` listing), not looked at: D0, D1 (phone and desktop), L1-desk, L2, C1-desk, C2, C3, C4, C5, C6, C7, A1-desk, A2 (phone and desktop), V1 to V4. The `.dc.html` boards and `canvas.json` layout were not rendered; `canvas.json` and `copy/partner-add.ts`, `scratch-gen/proposal.diff` and README were read in full. `scratch-gen/partner-add.tsx` and `render.tsx` were not read. Code read on main: `pending.ts`, `write.ts`, `actions.ts`, `candidates.ts`, `draft-rows.ts`, `partner.ts`, `pair-enumerate.ts`, `fit.ts`, `suggested-changes-pick-line.tsx`, `change-commander-context.tsx`, `change-commander-door.tsx`, parts of `change-commander-review.tsx`, `card-detail-provider.tsx`, `score.ts`, `announcements/pairing.ts`.
