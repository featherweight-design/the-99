# Cross-checking recommendations against cards committed to decks — design brief

**Ticket:** #43 · **Workshopped:** 2026-08-08 · **Status:** brief locked, awaiting Design handoff

## Problem

A physical Magic card can be in one deck at a time. The app does not know this.

Every read path treats the collection as an unlimited reference set. `ownedCardsWhere()` (`src/lib/collection/owned-cards.ts:23-30`) — shared by the scoring pool, the commander list and the deck-suggestion pool — is a bare existence predicate: `user_id = ?`. It asks "does this player own a copy", never "is that copy free". The scoring pool compounds it, reading the collection through `selectDistinctOn([cards.oracleId])` (`src/lib/recs/recommend.ts:106-128`), so ten Sol Rings and one Sol Ring are the same row.

The consequences arrive with the player's second deck and get worse with every one after:

1. **Recommendations overstate what is buildable.** A commander scores on staples that are already sleeved into another deck.
2. **The builder silently double-books.** Adding a card whose only copy sits in another deck succeeds with no signal, so two decks both believe they contain it.
3. **There is no way to ask "what can I still build with?"** — the question a player with a few decks most wants answered.

This is a blind spot, not an unfinished feature. `src/` does use words like *committed* and *remaining*, but never in this sense — they mean optimistic-mutation state (`src/components/decks/use-deck-mutation.ts:14`), Postgres isolation (`src/lib/recs/store.ts:94`) and import lines left to resolve (`src/lib/copy/deck-import.ts:348-351`). No card-availability concept exists under any name, and there is no cross-deck query anywhere.

## What already exists

Design does not need to invent these, and eng should not re-solve them:

- **The arithmetic is already possible.** `collection_items` stores `quantity` per printing+finish (`src/db/schema.ts:88-104`); `deck_cards` stores `quantity` per `(deck_id, oracle_id)` (`src/db/schema.ts:135-139`). Owned-minus-claimed is a subtraction over data we already hold.
- **One surface already carries a real quantity.** The quick-add search path selects `ownedQty` (`src/app/decks/[id]/search-action.ts:28,61,67`) and renders it through `addPanelCopy.quickAdd.rowOwned` (`src/lib/copy/decks-builder.ts:158`, `×${qty} owned`). The row already tells the player how many they own — it has simply never subtracted anything, and a `free` count would sit naturally beside a string that already carries a quantity.
- **Deck maturity is already computed and already shown.** `statusPill()` (`src/lib/decks/status.ts:15-24`) derives `Draft` (0 cards) · `Building` (1–98) · `Playable` (99, with gaps) · `Complete` (99, all owned), and it is on every deck card. This brief hangs the whole model on that existing pill rather than introducing a second status vocabulary.
- **An ownership filter already exists in the builder.** `ownedOnly` defaults to `true` in the quick-add bar (`src/components/decks/quick-add-bar.tsx:43`) and filters on `ownedQty > 0` (`src/app/decks/[id]/search-action.ts:81`). It is a filter about the *collection*, and must not be conflated with availability.
- **A refusal pattern already exists** for mutations the server rejects (#140, live on `main`). It is deliberately **not** used here — see Constraints.

### `decks.status` is dead, and should be deleted

The schema carries `status: "brewing" | "built"` defaulting to `brewing` (`src/db/schema.ts:130`). **No code path has ever written it.** Both insert sites omit the column — `createDeck` (`src/app/decks/actions.ts:51-52`) and the importer (`src/app/decks/import-actions.ts:166-167`) — and nothing reads it; the v1 plan explicitly instructed against it (`docs/superpowers/plans/2026-07-19-decks-ui.md:20`, "do NOT read `decks.status` DB column for the pill").

Every deck in the database is therefore `brewing`, and always will be. An earlier draft of this brief hung the hard/soft distinction on that column; it was wrong, and it would have required shipping a "mark this deck built" affordance — a deck-lifecycle feature smuggled inside an availability ticket. The column is a trap for the next reader and should be dropped in the implementation PR.

## Evidence from comparable products

Researched 2026-08-08 against Moxfield, Archidekt, Deckbox, ManaBox and TappedOut. MTGGoldfish, Delver Lens, Helvault, Urza Gatherer and Lion's Eye Diamond could not be verified and are excluded.

- **Nobody hard-blocks.** Not one shipped deckbuilder refuses an add because the copy is committed. The strictest shipped model is ManaBox, where a registered deck is a *storage location* and building moves cards out of binders — a state change, not a veto.
- **The deckbuilder-first tools do not model this at all.** Moxfield has no concept of it; its top-voted request for it is still a request. Archidekt exposes an "In decks" tab per card and nothing on the collection page — staff refused the collection view explicitly on performance grounds ("loading decks for every card on the collection page just isn't feasible at scale").
- **That performance objection does not transfer to us.** Archidekt's problem is a per-card fanout across 20k-card collections. Ours is a single `GROUP BY oracle_id` over one user's `deck_cards`, folded into queries we already run.
- **Deckbox is the closest prior art and ships the permissive default.** It distinguishes "built decks" from "deck ideas", and offers a profile checkbox — *"I am sharing cards between built decks"*, **checked by default** — which changes aggregation from a sum to a max. The only shipped precedent for an "I proxy / I don't care" escape hatch changes a *count*, never a permission.
- **Vocabulary is convergent but not formalised.** Users of both Moxfield and Archidekt independently reach for **"in use"** and **"available"** when filing this request. There is no established community term; **do not use "deck tax"**, which collides with commander tax, an unrelated rules concept.

## The model — ruled in workshop

```
owned = Σ collection_items.quantity                      across printings + finishes
hard  = Σ deck_cards.quantity   in decks at 99 cards     (Playable | Complete)
soft  = Σ deck_cards.quantity   in decks under 99        (Draft | Building)
free  = owned − hard
```

**Soft claims are visible but do not spend.** A finished decklist is likelier to be sleeved than a twelve-card sketch, so completeness stands in for physicality. It is a proxy, not proof — a 99-card list can still be pure theory — and the copy must not overclaim by asserting where cards physically are.

**These states apply only to cards the player owns** (`owned > 0`). A card with `owned = 0` is simply unowned and keeps the `buy` treatment already shipped in Consider — it has no availability state, and a finished deck listing it is *short a card*, not over-committed. Without this guard the arithmetic misfires: an unowned card in a finished deck computes `free = 0 − 1 = −1` and would render as the loudest state in the system for what is actually the most ordinary thing in the app.

Every owned card resolves to exactly one of four states:

| State | Condition | Intended reading |
|---|---|---|
| **Free** | `free > 0`, `soft = 0` | Silent. The common case; nothing is drawn. Hard claims are allowed here — a player with four Sol Rings and three sleeved still has one free, and sees nothing. |
| **Wanted by a brew** | `free > 0`, `soft > 0` | Quiet — the card is spoken for by an unfinished deck, but a copy is still free. |
| **In use** | `free = 0` | The marker. The next add double-books. Names the claiming deck when there is exactly one. |
| **Over-committed** | `free < 0` | Loud. More finished decks want the card than the player owns — a real error in the physical world. |

**Vocabulary is "in use" and "free."** *Free* rather than *available* only because the app already ships a `buy` tag, and "available" reads as purchasable next to it. If Design prefers *available*, it is a one-word swap that must happen on every surface at once.

**The marker stays quiet while a free copy exists.** A player with four Sol Rings never sees it; a player with one sees it on their second deck. Noise scales with actual scarcity, not with collection size.

### Ruled, and not open for Design to revisit

These were decided in the 2026-08-08 workshop. Design should treat them as given and say so if any is undrawable:

1. **Both finished and unfinished decks surface a claim, at two severities** — hard and soft, per the table above.
2. **Completeness is the severity source** — the existing `Draft/Building/Playable/Complete` pill. No new field, no new player-facing state, no revival of `decks.status`.
3. **Adding a fully-committed card proceeds.** The row carries the marker; there is no block and no confirmation dialog. #140's refusal pattern is reserved for mutations the server actually rejects, and using it here would misclassify a legal action as an error.
4. **Availability is scored two ways, behind a toggle** on the commanders list — `Everything I own` and `What's free` — which re-ranks.
5. **Counts, not booleans.** `owned` / `free` / short-by are surfaced as numbers, because "how many short am I" is what a purchase decision needs.
6. **No global setting.** Controls are per-surface. Accepted with a known risk: see Open question 5.

## Surfaces — in scope

Mobile and desktop parity in the same pass, on all four.

1. **Commanders list** — the `Everything I own | What's free` toggle and its two ranked states, plus a per-commander receipt line along the lines of *34 of your cards fit · 12 already in use*.
2. **Commander detail** — the same receipt, plus *which* matched cards are locked up. This is where "how does commitment change viability" is actually answered, and it is the surface the ticket's phrase points at.
3. **Add panel / Consider tiles** — the in-use marker on a tile, and its relationship to the existing `Owned only` filter.
4. **Decklist rows** — the marker on a card already added to this deck, naming the other claimant.

## Out of scope — deferred deliberately, not dropped

Both are real and should become a follow-up ticket rather than being folded in:

- **The collection page.** A per-card free/in-use column. This is arguably the most natural home for "what can I still build with", and it is the one surface where the marker is the point rather than an annotation. Deferred because it is a large-list surface with its own performance and layout questions, separable from the four above.
- **The deck list roll-up.** A per-deck "shares 12 cards with your other decks" line.

## Constraints — locked

- **Never block.** No incumbent does, and sharing staples between decks is normal play, not an error state.
- **Silence is the default.** A player whose collection comfortably covers their decks should see nothing new anywhere.
- **Do not assert physical location.** The model infers commitment from list completeness. Copy may say a card is in another deck; it may not claim to know where the cardboard is.
- **`Owned only` keeps its current meaning** — a filter about the collection, not about availability. If a second control lands beside it, the two must not both read as ownership switches.
- **Mobile and desktop parity in the same pass**, per repo convention.
- **One palette** — Palette A "Table Candlelight." Tokens per `src/app/globals.css`.
- **Voice: Kitchen Table**, locked verbatim in `design/design_handoff_the99_richness/README.md`.

## Open for Design to call

1. **What the marker *is*** — a dot, a chip, a caption, a treatment on the row. It must survive four surfaces at two widths, and read at tile density in Consider as well as row density in the decklist.
2. **How the two severities differ visually.** Hard (`in use`) and soft (`wanted by a brew`) are the same concept at different confidence. They should not read as two unrelated badges, nor as one indistinguishable one.
3. **Over-committed.** The loudest state, and the rarest. Does it live on the card, on the deck, on both? It is the only state describing a problem the player must resolve outside the app.
4. **The toggle's shape and default on the commanders list.** `Everything I own` vs `What's free` — segmented control, switch, filter chip; which side is default; whether the choice persists across sessions.
5. **Whether two adjacent ownership controls survive contact.** The workshop chose per-surface controls over one global setting, knowing the builder would then carry `Owned only` beside anything new. Design should say plainly if that collides in the drawing — this is the ruling most likely to need revisiting, and Deckbox's single default-on setting is the alternative if it does.
6. **How the commander detail page names the locked-up cards** — a list, a count with disclosure, an annotation on cards already shown.
7. **What the receipt line says when nothing is in use.** Silence is the default, so the line likely disappears — but the commanders list then has a row that grows and shrinks between players, which affects list rhythm.

## Success criteria

- A player with one copy of a staple across two finished decks can see that fact without going looking for it.
- A player with four copies sees nothing new.
- Neither ranked state of the commanders list ever claims a card is free when it is not, or in use when a copy is free.
- No surface asserts where a physical card is.
