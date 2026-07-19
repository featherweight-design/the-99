# Task 12 — Final-review fixes report

Commit: `069a581`
Branch: `feat/8-decks`
Test run: 204 passed across 21 files. Build: green.

---

## Finding 1 (Important) — `addCardToDeck` skips server-side legality/identity validation

**Change:** Extracted a pure `validateCardForDeck(card, deck)` function into
`src/lib/decks/add-validation.ts`. It rejects when:
- `deck.built >= 99` (99-card cap — covers Finding 3 as well)
- `card.commanderLegal === false`
- `card.colorIdentity` is not a subset of `deck.commanderColorIdentity`
- `card.oracleId === deck.commanderOracleId`

`addCardToDeck` in `src/app/decks/actions.ts` now fetches the commander's
color identity and the deck's current built total in a single `Promise.all`
alongside the card lookup, then calls `validateCardForDeck` and throws the
returned error string before any insert.

**Covering tests** (`src/lib/decks/add-validation.test.ts`):
- `allows an on-color legal card`
- `allows a colorless card in any deck`
- `rejects a non-legal card`
- `rejects an off-color card`
- `rejects a multicolor card that exceeds the commander's identity`
- `rejects the commander oracle id itself`
- `rejects any card when deck is already at 99`
- `allows a card when deck is at 98 (one slot remaining)`
- `allows a basic land (colorless identity) in any mono-color deck`

---

## Finding 2 (Important) — deck detail page 500s instead of 404 for foreign/missing deck

**Change:** `src/app/decks/[id]/page.tsx` — replaced the three-way
`Promise.all` with a sequential fetch: `getDeckDetail` first, `notFound()`
if null, then `Promise.all([getDeckSuggestions, listDecksWithStats])`.
`getDeckSuggestions` (which calls `requireDeck` and would throw) no longer
runs when the deck is inaccessible.

**Covering tests:** no unit-testable pure logic changed here; the fix is
structural (Next.js page). Verified by TypeScript and build.

---

## Finding 3 (Minor) — no 99-card cap when incrementing basic lands

**Change:** Handled inside the same `validateCardForDeck` call added for
Finding 1. The `built >= 99` guard fires before any insert path (basic or
non-basic), so basic-land increments past 99 are rejected with
`"deck is full (99 cards)"`.

**Covering test:** `rejects any card when deck is already at 99` (see above).

---

## Finding 4 (Minor) — duplicate link exposed to screen readers on DeckCard

**Change:** `src/components/decks/deck-card.tsx` line ~221 — added
`aria-hidden="true"` to the desktop "Open builder" `<Link tabIndex={-1}>`.
The card-level overlay link (with `aria-labelledby`) remains the sole a11y
entry point; the button-styled duplicate is now presentation-only.

**Covering tests:** no unit test (pure HTML attribute change); verified by
TypeScript, ESLint, and build.

---

## Test summary

```
Test Files  21 passed (21)
     Tests  204 passed (204)
```

9 new tests in `src/lib/decks/add-validation.test.ts` cover all four
validation rules (legality, color identity, commander self-add, 99-cap) plus
edge cases (colorless cards, near-full decks).
