# Readiness Review: Upcoming precons, Addendum A2 (Announced lists every named deck)

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-20 (rebased onto origin/main)
**Related ticket(s):** #2981; PR #3043 (reader); builds on addendum A1 and `design_handoff_the99_announcements` (STATES 3.1, 3.2)
**Plan PR target:** TBD

## Summary

A2 draws what the brief asked for: a named deck tile with no commander, revealed commanders in their own strip beside the deck grid, a names-only count, and the retirement of "N more lists to come" once names are known. Phone (390) and desktop (1300) boards show names-only through all-lists, and the Options board covers the rows view. The backend half is in place: `loadAnnouncedDeckNames` (`src/lib/announcements/collecting-read.ts`) returns deck names by set code and no code consumes it yet. The open items are eng-side decisions that the drawn patterns settle. No Design round is needed.

## Per-dimension findings

### 🗺️ Scope clarity
- ✅ Boundary, locked calls 1-4, and gaps G1-G3 are stated. The reader is explicit that a name stands for a deck and commanders can't be matched to one (matches the code header).
- ✅ Option B (single grid) is drawn for comparison only; A is recommended and recorded.

### 🎭 State coverage
- ✅ Drawn at phone and desktop: names only, lists partly posted, all posted. Rows view in Options. Filters and the A1 fold are specified in prose.
- 🟡 Not drawn: the set with names and a posted list count above the names known; the reader throwing (fall back to the shipped none plate and counts); a set whose post lists names but the set has zero reveals (the strip simply absent: follows the spec, "goes when empty").
- 🟡 "N more lists to come" survives only when a decklist post promises more than names known, and it is drawn once, on Main. Its place in a tile block with names and no spare slot is not drawn at phone or desktop.

### 🔌 Data contract
- ✅ Deck names: `deckNamesBySet` gives `string[]` by lowercase set code, empty sets have no key (matches "no names" fallback to T2).
- 🟡 "Promised taken from the names": shipped `promised` is `wizards_announcements.promised_decks` (`early-tiles-read.ts`, merged by max). Plan decides: promised = max(promisedDecks, names.length), with `listsToCome` and `allListsPosted` unchanged.
- 🟡 G2: matching a posted list to a name by normalized name. The shipped `EarlyTile.name` is the decklist's own title, which may differ from the Collecting post's name. Plan: fold both with `fold()`; no match yields an extra tile, which can push the tile count past the count shown, so the count uses max(names, posted).
- 🟡 `listsToCome(posted, promised, waiting)` subtracts waiting commanders. With names present, a revealed commander no longer stands for a deck slot, so `waiting` passes 0 for such sets.

### 🧱 Codebase fit
- ✅ Reuses `PreconTile` shell, `RevealedStrip`, `WaitingRow`, `NonePlate`, A1's fold, brand mark. Copy strings are DRAFT and go to `/copy-review` (G3), not Design.
- ✅ Shipped files named (`revealed.ts`, `early-tiles.ts`, `early-tiles-read.ts`) exist as described.

### ♿ Cross-cutting
- 🟡 The named tile has no press and no focus target by design; the plan adds an accessible name (deck name plus `list to come`). Strip cards keep card details' behavior.
- ✅ No new telemetry. One extra indexed read per Announced load; it throws on failure, so the loader must degrade to the shipped view.

### ⏰ Drift from reality
- ✅ Assets and names reflect the post-#3043 tree; the fixture code `NAU` and art are declared stand-ins (G1).

### 📝 Decision log
- ✅ Calls are numbered, Approved 2026-11-20 in INDEX.md. Locked vs open is clear.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

- Item 1: promised = max(`promised_decks`, names count); the count line is `N decks` (no lists), `k of N lists so far`, `All N lists`.
- Item 2: match a list to a name by `fold()` of both; no match adds a tile and N becomes max(names, posted).
- Item 3: for sets with names, pass `waiting = 0` to `listsToCome`; the note renders as a quiet line under the deck grid (A1 meta-line pattern) at phone and desktop.
- Item 4: on a failing names read, fall back to the shipped none plate and counts.
- Item 5: named tile exposes an accessible label; excluded from tab order.
- Item 6: the filter and fold rules follow the README (name match; color filter drops them; fold counts deck tiles only).
- Item 7: copy DRAFT strings go through `/copy-review` before build.

## Decisions inherited

- Every deck in a set is listed, even with no commander or art (Hugh, 2026-11-20).
- Revealed commanders are never matched to a deck by guess; a non-English scan shows as-is until Scryfall replaces it.
- Dashed edge means nothing to open; the none plate only for a set with no names and no reveals (T2).
- Decks keep the Collecting post's order; a posted list takes its slot.
