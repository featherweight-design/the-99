# Readiness Review — Draft deck hidden row (why a draft stays hidden)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-20 (cold audit, lane a6, rebased on origin/main e47c3e709)
**Related ticket(s):** #2988 (handoff PR #2991)
**Plan PR target:** TBD

## Summary

Buildable as drawn. Every file, component, route, field and token the handoff names exists on the rebased tree, and every drawn row is reachable from a real value: `settingsHideDeck(statusPill, prefs)` decides the block, `statusPill` (`New`/`Draft`/`Building`) and `prefs.seeDecks` pick the line, and the tile (`deck.built`, `deck.unresolvedCount`, `deck.versionNumber`, `deckBodySize(partnerName)`) and the deck header (`builder-shell.tsx`'s `offerFirstCommit` inputs) both hold what `Commit as v1` needs. No schema change, no new switch (it rides `SOCIAL_FRIENDS_ENABLED`, which already gates the row and the Settings section), no model call, no spend, no email. Five eng-side clarifications below, each settled from the handoff's own drawn patterns; none needs Design.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Boundary is one `DeckCardOverflow` branch (`hideLocked`) plus a scroll-and-wash on Settings' Your decks. Non-goals stated: header chip and /decks glyph unchanged; no in-place flip from the menu (G1); no per-deck keep-hidden offer (G2).

### 🎭 State coverage

- [✅] All five rows of the README table (Draft full and resolved, Draft short or unresolved, New, Building, all-off) plus the unchanged own-flag row are drawn on phone (Main) and desktop (Desktop).
- [🟡] The Settings landing (scroll + 2s wash) is drawn on desktop only. Settings' Your decks is one responsive component (`friend-decks-section.tsx`), so the phone build applies the same wash spec to the same row (clarification 1).
- [🟡] A Draft past its body size (e.g. 104 of 99) is not named. It cannot commit (`offerFirstCommit` needs `built === bodySize`), so it takes the "Draft, short or unresolved" row (clarification 2).
- [✅] Loading/error: the rows are links; the shipped `PendingReporter` pattern covers pending navigation, and `admitsReview` already redirects a `?commit=1` the server would refuse.

### 🔌 Data contract

- [✅] `settingsHideDeck` / `friendCanSeeDeck` (`src/lib/social/deck-visibility-rule.ts`) give exactly the drawn split: `seeDecks` off hides all; otherwise only `New`/`Draft`/`Building` with `seeUnfinished` off. Committed `Over`/`Unresolved`/`To buy`/`Complete` never reach the block, matching the table.
- [✅] `/decks/{id}/changes?commit=1` exists (`first-commit-offer.tsx`, `admits-review.ts`).
- [🟡] `DeckFriendsHide` carries only `hidden`, `statusPill`, `prefs`; it gains `built`, `bodySize` and a can-commit boolean. The test lives inline in `builder-shell.tsx` (not a named function), so the plan extracts it as one pure predicate both surfaces call (clarification 3).

### 🧱 Codebase fit

- [✅] Tokens all exist in `src/app/globals.css`: `--fg`, `--fg-muted`, `--accent-text`, `--elevated`, `--border-strong`, `--fg-locked` and every other var the boards use.
- [✅] Row geometry reuses `ITEM` (38px / 44px coarse) and the Settings row reuses `LOCKED_ITEM`'s two-line shape; `MENU_WIDTH` is 186 as drawn.
- [🟡] `#settings-decks` already exists (the section's `<h2 id>`), so the base link scrolls natively. The per-toggle target (`#settings-decks-unfinished` "e.g.") does not exist yet; the plan picks the hash form and adds ids on the two `data-friend-decks-row` labels (clarification 4).
- [✅] Copy is DRAFT (G3): `socialCopy.hideDeck.locked`/`lockedAria` retire, `why.*` and labels added, through /copy-review.

### ♿ Cross-cutting

- [✅] G4 settles a11y: why block is plain text (the panel is not `role=menu`, confirmed in the trigger's comments); each row's accessible name carries its destination.
- [🟡] The wash is motion; honour `prefers-reduced-motion` (no fade, or an instant clear) and set a scroll margin so the sticky header does not cover the landed row (clarification 5).
- [✅] No performance or analytics implications: no new read on either surface.

### ⏰ Drift from reality

- [✅] Drawn 2026-11-18 against the shipped locked row; `deck-card-overflow.tsx`, `builder-shell.tsx` (`offerFirstCommit`), `friend-decks-section.tsx`, `settingsCopy.decks` labels ("Friends can see my decks", "Include drafts and decks I’m building") and `socialCopy.hideDeck` all match as named on origin/main e47c3e709.

### 📝 Decision log

- [✅] G1/G2 ruled by Hugh (R1 approved 2026-11-17); G3/G4 recorded; `seeDecks`-first ordering and the `offerFirstCommit` reuse stated.

## Eng-side clarifications (Yellow only)

1. **Phone Settings landing:** apply the desktop wash (`--elevated` fill, `--border-strong` inset ring, radius 8, 2s then fade) to the same toggle row at phone width; the section is one responsive component.
2. **Draft over its body size:** treat as "Draft, short or unresolved" (Settings row only, no Commit). Its `{n} of {size}` line and the full-but-unresolved Draft's line (which reads "99 of 99 ... once it’s full") go to /copy-review, not Design.
3. **One commit predicate:** extract `offerFirstCommit`'s test (`no version && built === bodySize && unresolved === 0`) to a pure helper; the tile passes server counts, the header passes the same value it already hands the spine (server and optimistic counts agreeing).
4. **Landing target:** `/settings#settings-decks-see` and `#settings-decks-unfinished` (ids on the two row labels); a client effect on Your decks reads the hash, scrolls and washes. A bare `#settings-decks` keeps scrolling to the heading.
5. **Motion and offset:** wash respects `prefers-reduced-motion`; landed row gets a `scroll-margin-top` clearing the app header.

## Decisions inherited

- Settings stays the one place for account rules: nothing flips from the deck menu (Hugh, G1).
- No per-deck "keep hidden" offer in the why block (Hugh, G2).
- `seeDecks` off is tested before status.
- Header mark and /decks glyph unchanged: they mark only a deck hidden on its own.
- A deck hidden on its own keeps the shipped clearable checkbox row.

## Flags

None: no migration, no new feature switch, no model call, no spend, no email.

## Design's own read (kept)

## READINESS · Draft deck hidden row (R1, #2988)

**Verdict: Green.** R1 approved by Hugh 2026-11-17. Small change to `DeckCardOverflow` plus a scroll-and-wash on Settings' Your decks; no schema change.

- G1 Settings row links to `/settings#settings-decks` (no in-place flip). Ruled as drawn.
- G2 No per-deck "keep hidden" offer in the why block. Ruled as drawn.
- G3 Copy is DRAFT: run /copy-review on the new `socialCopy.hideDeck` lines before shipping.
- G4 a11y: the why block is plain text; each row's accessible name carries its destination ("Show drafts to friends, in Settings").
- Commit as v1 gating must reuse the `offerFirstCommit` test (no version, full body, nothing unresolved).
