# Gate 1 — State reachability, Add panel overhaul (#158)

Epic: #158 · Handoff: `design/design_handoff_the99_add_panel/` (R2, 🟢 Green)
Run: PR 1 (`feat/add-panel-payload`), 2026-08-04.

Gate 1 asks three questions of every state the handoff names, and the third is the one that
matters: **given how the component is actually mounted, seeded and cached, can the triggering
condition ever be true?** A field that is typed and assigned can still be unreachable — that was
#1169.

Legend: ✅ reachable · ⚠️ type present, route incomplete · ❌ not surfaced · 🚫 unreachable at runtime

## Evidence commands

```
$ npx tsx --env-file=.env scripts/_probe.mts        # ad-hoc, not committed
{ "total": 34810, "imageUriNull": 0, "imageUriNullCommanderLegal": 0, "sample": [] }

$ pnpm vitest run src/lib/decks/suggest.test.ts
Test Files  1 passed (1) · Tests  15 passed (15)

$ pnpm typecheck
(clean — no output)
```

## The nine handoff states

| # | State | Type | Route | Runtime reachable | Verdict |
|---|---|---|---|---|---|
| 1 | Consider, populated | `DeckSuggestion[]` from `getDeckSuggestions` | `actions.ts:89-104` (owned) + `:149-163` (unowned staples) | Any deck with a non-empty owned pool. `suggestDeck` iterates `args.ownedPool`, so a seeded collection is sufficient | ✅ |
| 2 | Consider, empty | same, empty array | same | Reachable two ways: an empty collection, or a deck where every fitting owned card is already `inDeck`. No EDHREC dependency | ✅ |
| 3 | Degraded / EDHREC offline | `degraded` boolean on the action result | `actions.ts` returns `{ suggestions, degraded }` | `resolveEdhrecData` returning `unreachable`; forced in Gate 2 by blocking the host. Shelves still order by coverage gap, which needs no EDHREC | ✅ |
| 4 | Quick add, idle | n/a — component state | PR 4 | Default mount state | ✅ |
| 5 | Quick add, typing | `SearchResult[]` | `search-action.ts:33-42` | `searchCards` with q.length ≥ 2 | ✅ |
| 6 | Quick add, no results | `SearchResult[]` empty | same | A query matching nothing, **or** the owned-only filter (now defaulting `true`) suppressing all matches — the second path is why `ownedFilterOffNote` + `dropFilter` exist | ✅ |
| 7 | Card already in deck | `inDeck` derived from server `deckOracleIds` | `builder-shell.tsx:68-70` | Add a card, then view either surface. **Gate 5 repeat pass owns the reverse direction** | ✅ |
| 8 | Owned/unowned filter, positions A and B | `ownedOnly` component state | PR 4 | Both positions drawn; default flips to `true` (ruled 2026-08-04) | ✅ |
| 9 | Empty deck (0 of 99) | deck card count | `builder-shell.tsx` | A newly created deck | ✅ |

## The two honest omissions

These are states in their own right. Both are **handled correctly**, but they differ sharply on
reachability, and the difference is the finding of this gate.

| Omission | Type | Route | Runtime reachable | Verdict |
|---|---|---|---|---|
| `no EDHREC figure` | `inclusionPct: number \| null` on `DeckSuggestion` (`suggest.ts`) | Assigned in `buildSuggestionPayload`; `inclusionPct = inclusion ?? null` | **Yes, commonly.** Every role-sourced suggestion returns `null` by construction, and an EDHREC-sourced card absent from `inclusionByName` also returns `null`. Both asserted in `suggest.test.ts` | ✅ |
| `no art on file` | `imageUri: string \| null` on `DeckSuggestion` and `SearchResult` | Assigned at all three sites (`actions.ts` owned + unowned, `search-action.ts` select) | **Not with today's catalogue.** See below | ⚠️ |

### ⚠️ `no art on file` — handled, but not reachable from live data

`transform.ts:19-20` genuinely can emit `null`:

```ts
const imageUri =
  raw.image_uris?.normal ?? faces?.find((f) => f.image_uris?.normal)?.image_uris.normal ?? null;
```

and `cards.image_uri` (`schema.ts:33`) is nullable. So the null is a real shape the ingest is
capable of producing, not a defensive fiction.

But the probe above found **0 of 34,810 rows** with a null `imageUri`, and 0 among
commander-legal cards specifically. Scryfall supplies a normal image for every card currently in
the catalogue.

**Consequence, stated plainly:** the flat `no art on file` plate Design drew cannot be seen by
walking the app against real data. It is correct to build — the column is nullable and a future
catalogue refresh could introduce one — but it will not be exercised by Gate 2, by the staging
walk, or by Hugh's morning pass.

**Resolution taken** (not a block, and not a silent pass):

1. The null path is asserted at the payload layer now — `suggest.test.ts`, "passes imageUri
   through, including null (the `no art on file` state)".
2. PR 5's `suggestion-tile` tests must **force** `imageUri: null` explicitly rather than relying
   on a fixture drawn from real data, because real data will never produce it.
3. Carried into the run report as a known gap in walk coverage, so it is not mistaken for a
   state that was verified visually.

This is deliberately *not* escalated as a hard pause: it changes no premise the briefing locks,
and the fix (render the drawn fallback) is the same either way. It is recorded because "the
component handles null" and "a user can ever see that" are different claims, and only the first
is true here.

## Sequencing note

The plan's PR 1 task 7 says to extend "existing `searchCards` tests". There are none —
`grep -rn searchCards src/` returns only the definition and `search-pane.tsx`'s import, and the
action needs a live database. The substantive question that task asked — *does `imageUri` survive
the rest-destructure at `search-action.ts:51`?* — is answered by the type system instead:
`SearchResult` now **requires** `imageUri`, so a destructure that stripped it fails `pnpm
typecheck`. Typecheck is clean, which is the proof.
