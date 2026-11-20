# Readiness Review — Small items 12 (combo sheet, menu signature card, price label)

**Verdict:** 🟡 Yellow (worst of the three items)
**Audited:** 2026-11-20 (cold audit, lane a6, rebased on origin/main e47c3e709)
**Related ticket(s):** none (Hugh's notes; R1 approved 2026-11-18)
**Plan PR target:** TBD

**Per item:**

- **Item 1 · Combo sheet refresh:** 🟡 Yellow. Buildable as drawn; the feed-opened variant needs eng-side contract work (variant id to the client, a fetch, its loading/failure) that the drawn patterns settle.
- **Item 2 · Signature card from the account menu:** 🟡 Yellow. Buildable as drawn; the menu holds only `OwnHeaderFace`, not the picker's `OwnCommander`, and the save does not redraw the shell today.
- **Item 3 · Price label beside the price:** ✅ Green. A one-node move inside `commander-row.tsx`'s own local `PriceFigure`; every token and string is shipped.

## Summary

All three items draw the shipped components they change, at 390 and desktop, with every token present in `src/app/globals.css` (`--elevated`, `--border-dashed`, `--surface-rail`, `--border-strong`, `--accent-text`, `--fg-body`, `--border`, `--fg-locked`, `--fg-faint`, `--surface-raised`) and every string shipped except one DRAFT lead sentence. No migration, no new switch, no model call, no spend, no email. Item 3 is ready as-is. Items 1 and 2 are ready with the clarifications below, each settled by a pattern already drawn or shipped. The plan PR records them as decisions; no Design round-trip is needed.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Three items, each with its own board, a numbered call list and the shipped components it touches. Non-goals stated (no new menu row; Friends keeps its own way in; card details, price strip, Shopping and cart keep naming Mana Pool as links). Open questions logged and closed by Hugh's R1 approval (2.5° tilt, feed lead, picker over the menu).
- [🟡] Item 1 says "one body for every way in" and names three ways in, but `ComboBody` is also drawn by the deck-analysis `ReceiptModal` (`receipt-modal.tsx:79`) and `benchmark-ledger.tsx:301`. Clarification C1.

### 🎭 State coverage

- [✅] Item 1: card details (1a), one piece away with Add (1b), long combo first screen and scrolled end (1c), feed-opened (1d), each at 390 and 760, plus the shipped sheet for reference. Needs-absent (36%) is specified in text.
- [🟡] Item 1 feed-opened: no loading or failed-read state drawn for the sheet's own fetch (today the feed opens card details, whose provider owns loading). Clarification C2.
- [✅] Item 2: with a card (2a), no card (2b), picker over the menu (2c), saved (2d), each for the phone sheet and the desktop popover, plus today's reference.
- [✅] Item 3: shipped, new, and new-piece-outlined rows at both widths; not-stocked reads `○ not stocked manapool`.

### 🔌 Data contract

- [🟡] Item 1 feed-opened: the feed view carries only `{ pieces, added }` (`lib/feed/home.ts:297`), not the variant. The row already stores `feed_items.variant_id` (`src/db/schema.ts:4055`, written by `combo-writer.ts:146`), so no migration: pass it through and read the `CardCombo` for it. `CardComboSheet` requires `card: BrowseCard` and only computes where-lines for `others`; the feed head needs both pieces' where-lines (`spare` / `in {deck}`). Clarification C3.
- [✅] Item 1 steps: `ComboBody` already receives `combo.steps` as an array (`receipt-modal.tsx:708-716`); numbering is presentational. `CostPips` (`ui/cost-pips.tsx:115`) takes a cost string and a `size`, so inline 13px pips work; unknown symbols stay text (Design's G2).
- [🟡] Item 2: `SignaturePicker` needs `current: OwnCommander | null` (with `printingId`, `printingGone`) to outline the current pick; the shell reads only `OwnHeaderFace { name, art }` (`lib/social/commander.ts:22`, `shell.tsx:98`). Clarification C4.
- [🟡] Item 2: `setCommanderAction` revalidates only `/friends` (`app/friends/actions.ts:39,96`), so a save from the menu on any other route will not redraw the trigger and heads (Design's G5). Clarification C5.
- [✅] Item 3: `PriceFigure` is a local function in `commander-row.tsx:212`, used only by that row; `discoveryCopy.price.source` ("manapool") is shipped.

### 🧱 Codebase fit

- [✅] Reuses shipped pieces throughout: `ComboBody`, `ReceiptTile`, `ModalPanel`, `MissingPieceWhereLine`, `CostPips`, `LockedStep`'s numeral, `SignaturePicker`, Friends' badge and picking outline (`friends-head.tsx:95-103`). Copy keys exist: `deckAnalysisCopy.receipt.manaNeeded/steps/prerequisites`, `socialCopy.signature.changeAria/choose`, `feedCopy` kind name "Combos you can make" and line `You added {added}.`
- [🟡] Item 2 badge size: README says 22px, the board caption says 24px (Friends' own is 24px at a 56/64px face); the rendered proposal (`menu-new.tsx:645`) and the art draw 22px. Clarification C6.

### ♿ Cross-cutting

- [✅] Item 1 list semantics (`role="list"`, numerals `aria-hidden`) and item 3's `aria-hidden` stamp with the sr-only sentence carrying it are specified. Item 2 names the press with shipped aria strings and returns focus to the face.
- [🟡] Item 2: the popover closes on a window `pointerdown` outside it (`account-menu.tsx:516-524`); the picker portal sits outside the popover, and Escape must close the picker first (Design's G4). Clarification C7.
- [✅] No new analytics expectations; no performance concern beyond the feed sheet's one read.

### ⏰ Drift from reality

- [✅] Every file named exists on the rebased tree: `cards/card-combo-sheet.tsx`, `decks/combos-close-sheet.tsx`, `decks/receipt-modal.tsx`, `decks/combo-where-line.tsx`, `ui/cost-pips.tsx`, `home/first-run.tsx`, `feed/feed-item.tsx`, `shell/account-menu.tsx`, `social/friends-head.tsx`, `social/signature-picker.tsx`, `commanders/commander-row.tsx`, `commanders/commanders-list.tsx`. The menu heads are still 44px popover / 48px sheet (`account-menu.tsx:241,332`). The stamp is still `ml-auto` at `commander-row.tsx:481-507`.
- [🟡] "Engineering is pointing the feed at this sheet" (in flight): nothing on main or in an open PR does this. Today the feed press opens card details with its combo block open (`feed-item.tsx:274`, `opts.combo`). The feed-opened sheet is new work in this build (C3).

### 📝 Decision log

- [✅] R1 approved by Hugh 2026-11-18, all three items as drawn, open questions closed as drawn. DRAFT string marked (`small-items-12 · copy strings.ts`). `scratch-gen/` is labeled render-only.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

- **C1 (item 1):** The refreshed body is `ComboBody` itself, so `ReceiptModal` and `benchmark-ledger` take it too, keeping their own heads and feet, per the handoff's "one body for every way in". Covers them in the plan's route inventory.
- **C2 (item 1):** The feed-opened sheet's loading and failed read follow the card-details provider's own loading and toast pattern; a combo no longer resolvable (a piece sold) falls back to today's behavior, opening card details on `opens`.
- **C3 (item 1):** The feed view passes `variantId` (already stored on `feed_items`); the feed sheet reads that variant's `CardCombo` with no deck scope, and `CardComboSheet` gains the `.hd2` head variant in place of `back`/`overCard` with `card` optional. Both plates' where-lines come from the same `MissingPieceWhere` decision (Design's G1). No Add.
- **C4 (item 2):** The picker's `current` is read on open (an own-profile read that already exists for `/friends`), not added to the shell's per-request read. `OwnHeaderFace` keeps drawing the head.
- **C5 (item 2):** Saving goes through one shared hook lifted from `friends-view.tsx`'s `saveFace`. The action also revalidates the layout, or the hook calls `router.refresh()`, so the shell face redraws on any route.
- **C6 (item 2):** Badge 22px, as the rendered proposal and art draw it on the smaller menu face.
- **C7 (item 2):** The popover's outside-press handler ignores presses inside the picker dialog; Escape closes the picker, then the menu. The face press exists only where the shell reads a face (`friendLinksEnabled`): with that switch off the menu keeps Clerk's name and no press, so no new switch is needed. Draw `+` when the face read returns no card.

## Decisions inherited

- No new account-menu rows (Hugh's rule); the face is the press. Friends keeps its own way in.
- The picker opens over the menu (sheet over sheet on the phone; the 520 modal over the open popover on desktop, the face in Friends' picking outline).
- The 2.5° tilt on the combo pair; the feed lead `You added {card}. You own both halves now.` (second sentence DRAFT, to `/copy-review`).
- Long combos scroll with head and foot pinned; no collapse or "show all".
- The price stamp keeps the shipped `manapool` string and `aria-hidden`, and moves 6px after the figure inside its flex item, on both Discover and the Commanders list.

## Design's own read (kept)

# Small items 12 · READINESS (R1, Design's draft for engineering's audit)

Verdict: pending Hugh's audit.

## Gaps for engineering

- **G1 · Feed-opened combo sheet.** The feed's combo press opens the combo sheet with no card under it (engineering in flight). The sheet needs the variant's steps, mana, prerequisites and both pieces' art, plus where each copy is (`spare` or `in {deck}`); no deck scope, so no Add. `CardComboSheet` takes a `card` today; the feed path needs a head variant (`.hd2`: eyebrow, title, lead, ✕) in place of `back`/`overCard`.
- **G2 · Symbols in step text.** Steps and Needs carry Spellbook symbols. `{W}`…`{G}`, generic, hybrid and Phyrexian go through `CostPips`; any symbol `CostPips` does not draw (`{T}`, `{Q}`, `{E}`, …) stays as text.
- **G3 · List semantics.** The numbered `ol` keeps `list-style: none` with drawn numerals; add `role="list"` so Safari keeps announcing it as a list. Numerals `aria-hidden`.
- **G4 · Picker over the popover.** The popover closes on a pointerdown outside it; presses inside the picker's modal must not close it. Escape closes the picker first, then the menu.
- **G5 · Saving from the menu.** Reuse Friends' save (`saveFace`) through a shared hook; after the write lands, the shell's face read (`OwnHeaderFace`) must redraw the trigger and both heads without a reload.
- **G6 · Price stamp tests.** `commander-row.test.tsx` assertions about the stamp's place (line end) change to "after the figure, inside its item". Both Discover and the Commanders list take it.

## Copy

DRAFT for `/copy-review`: the feed head's second lead sentence. Everything else is shipped strings.
