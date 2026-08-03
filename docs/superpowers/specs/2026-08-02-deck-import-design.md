# Deck import (Moxfield) — design brief

**Ticket:** #42 · **Workshopped:** 2026-08-02 · **Status:** brief locked, awaiting Design handoff

## Problem

A player already has decks built in Moxfield. They want those decks inside The 99 so collection math — committed cards, buildable commanders, shopping lists — reflects reality, without rebuilding each deck by hand.

## What already exists

The parser and matcher do not need to be built. `src/lib/manabox/parse.ts` already reads Moxfield, Archidekt, Deckbox and ManaBox exports plus bare `Name,Qty` CSV. `src/lib/collection/match.ts` already resolves a line to an oracle ID by Scryfall printing ID, then oracle ID, then case-insensitive name with double-faced-card splitting, and already classifies tokens and emblems as *skipped* rather than failed.

Design owns the entry point, the failure states, and the reconciliation surface. The collection replace flow (`/collection/replace`) and the Issue Inspector modal are the nearest prior art and set the visual vocabulary, but this flow deliberately diverges from them — see below.

## Shape of the flow

`/decks` → **Import a deck** → import surface (paste · file · Moxfield URL) → commander picker, only when the source does not declare one → deck created → land on `/decks/[id]`, populated.

**There is no review gate.** The collection flow makes the user clear a matched/unmatched screen before anything commits, because a collection import is a bulk fact being synced. A deck is a thing the user is about to open and use, so the deck exists as soon as it can and problems are carried into it.

## Reconciliation model

A line that cannot be matched becomes an **unresolved row** stored against the deck — `(deck_id, raw_name, quantity, source_line)`. It is a card the deck wants that the app cannot identify.

Unresolved rows:

- count toward the deck's **total**, never toward **built** or **owned**
- block the **Complete** status pill for as long as any exist
- stay out of `toBuyCount` — an unidentified card is not a shopping-list item, and a shopping list containing a typo is worse than one that omits it
- are ignored by the role counter; a card with no identity has no role

Tokens and emblems continue to be skipped silently, as they are today. They are not failures.

A user clears an unresolved row by tapping it and picking the real card from a search seeded with the failed name string — the same picker pattern the builder already uses. Delete is always available alongside. Editing the raw text and re-matching is explicitly rejected: it puts the user in a guessing loop against a matcher they cannot see, and it does nothing for the case where the name was already correct.

## Commander

A deck row requires a commander — it sets colour identity, anchors every recommendation, and supplies the deck's image. A wrong guess silently poisons all three.

When the source declares a commander, use it and say nothing. When it does not, show a one-step picker listing the legendary creatures found in the import, before the deck is created. When the import contains no legendary creature at all, the import cannot complete as a Commander deck and must say so plainly.

## States to draw — mobile and desktop parity

**Entry**

1. Empty — three input modes
2. URL fetching — a real third-party round-trip, not an instant local parse
3. Parsing and matching

**Entry failures** — each carries its own copy; a generic error toast is not sufficient

4. Invalid or non-Moxfield URL
5. Deck is private
6. Deck not found or deleted
7. Moxfield unreachable or rate-limited — the only one where retry is the right advice
8. File rejected — wrong type or too large
9. Paste unparseable — no recognisable card lines
10. Source parsed but empty — zero cards

**Commander**

11. Picker — legendary creatures found in the import
12. No legendary creature found — the dead end

**Deck page arrival**

13. Clean import — everything matched
14. Import with unresolved rows — how they sit among real cards, and how the deck header and status pill read

**Resolution**

15. Unresolved row at rest
16. Search and pick, seeded with the failed name string
17. Search returns nothing
18. Resolved — the row becomes a normal deck card
19. Deleted

## Locked decisions on edge cases

| Case | Decision | Reason |
|---|---|---|
| Sideboard / maybeboard lines | Not imported | Commander has no sideboard; importing them inflates the deck past 100 for no gain |
| Quantity > 1 on a non-basic | Import at quantity 1, raise it as a parse note | The card is identifiable; only the count is wrong, so an unresolved row would overstate the problem |
| Commander also appears in the 99 | Dedupe silently | An export artifact, not user intent |
| Re-importing the same Moxfield deck | Creates a second deck | Updating in place is sync, which is a much larger feature; import should not quietly become it |

## Out of scope

- **Per-deck printing overrides** — inherited from #105 and split back out to its own ticket. `card_art_preferences` is keyed on `(user_id, oracle_id)` and `deck_cards` holds no printing column, so a deck-level override needs new storage and a new read path. It is unrelated to import and is polish rather than function.
- Two-way sync with Moxfield.
- Editing an imported deck beyond resolving rows — the normal builder already covers that.
