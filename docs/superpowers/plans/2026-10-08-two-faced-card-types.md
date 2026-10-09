# Two-faced cards are misfiled by type

2026-10-08. Hugh reported two cards shown under the wrong "By type" / Type ▾
bucket:

- **Shatterskull Smashing // Shatterskull, the Hammer Pass** (modal DFC, sorcery
  front, land back) shows under **Lands**; should be **Sorcery**.
- **The Arkenstone // Seek the Heart** (Adventure, artifact front, sorcery-
  adventure back) shows as **Sorcery**; should be **Artifact**.

Verified on staging (`misty-rain-01681654` / `br-polished-pond-a6e63y0b`,
read-only):

| Name | `layout` | `type_line` |
|---|---|---|
| Shatterskull Smashing // Shatterskull, the Hammer Pass | `modal_dfc` | `Sorcery // Land` |
| The Arkenstone // Seek the Heart | `adventure` | `Legendary Artifact // Sorcery — Adventure` |

## Root cause

**`cardTypeGroup`** (`src/lib/decks/grouping.ts:123-133`):

```ts
export function cardTypeGroup(typeLine: string): CardTypeGroup {
  const t = typeLine.toLowerCase();
  if (t.includes("land")) return "Lands";
  if (t.includes("creature")) return "Creatures";
  if (t.includes("planeswalker")) return "Planeswalkers";
  if (t.includes("instant")) return "Instants";
  if (t.includes("sorcery")) return "Sorceries";
  if (t.includes("artifact")) return "Artifacts";
  if (t.includes("enchantment")) return "Enchantments";
  return "Other";
}
```

It lowercases the **whole** `type_line` — both faces — and checks a fixed
word order. For a two-faced card the winner is whichever word appears
anywhere in either face, in that fixed precedence, independent of which face
is actually in front:

- Shatterskull: `"sorcery // land"` contains `"land"`, and `land` is checked
  first → **Lands**, even though the front face is the sorcery.
- Arkenstone: `"legendary artifact // sorcery — adventure"` contains
  `"sorcery"`, and `sorcery` is checked before `artifact` → **Sorceries**,
  even though the front face is the artifact.

This is the function every "By type" grouping reads: `decklist.tsx:92`,
`version-diff.tsx:57`, `changed-strip.tsx:50,71`, `update-diff.tsx:40`,
`shopping.ts:67`, `suggestions-read.ts:250,278`, `draft-state.ts:564`,
`read.ts:499`, `search-action.ts:181`.

**Same shape, second surface** — the collection's Type ▾ filter, step 1's
"collection type filter":

- `src/lib/collection/browse.ts:876-879` (`filterCards`):
  ```ts
  if (types.length > 0) {
    const line = c.typeLine.toLowerCase();
    if (!types.some((t) => line.includes(t))) return false;
  }
  ```
- `src/lib/collection/type-filter.ts:44-50` (`buildTypeOptions`, the counts
  shown in the Type ▾ panel): `c.typeLine.toLowerCase().includes(needle)`.

Both test the whole `type_line` against each selected type word. The effect
here is **over-inclusion, not exclusive misfiling** — a two-faced card can
match *and count toward* more than one type filter (e.g. Shatterskull shows
under both `Land` and `Sorcery`), because the panel is designed to OR several
selected types (`browse.ts:318-320`, deliberate for same-row multi-select) but
never isolates which face it is ORing against.

**What is already correct, and stays that way:**

- `cardFacet` and `isLandFace` (`src/lib/cards/facet.ts:19-26,41`) already
  split on `" // "` and read the front face only — this is the synergy panel's
  facet pill, and it already gets both examples right today.
- `playableAsLand` (`facet.ts:74-86`) already gates on `layout === "modal_dfc"`
  rather than the type line, so it already knows a `transform` card's land
  back cannot be dropped from hand.
- `classifyRoles` (`src/lib/recs/roles.ts:46-47`) already calls `isLandFace`
  for the `land` role — the deck's land role count, the analysis roles strip,
  and the ramp gate below it are **already front-face-only and correct**. This
  was fixed and documented in `facet.ts`'s own header and `roles.ts:30-45`
  after an earlier round (82 commander-legal cards, measured there).
- `castFaceText` (`facet.ts:118-124`) is already front-face/cast-face scoped.

So the land-role and curve figures a deck already reports are not part of
this bug and must not move. This plan touches **grouping and filtering only**.

## The rule

**File every two-faced card under its FRONT face's type** — the first face in
the stored `"Front // Back"` string, which is also the face the game treats
as the card's default side and the one Moxfield-style tools file by. A back
face that happens to be a land still contributes to land-droppability
(`playableAsLand`, unchanged) and to nothing else that counts lands: the role
count stays `isLandFace`-only (unchanged), and the new front-face
`cardTypeGroup` is a **visual grouping**, not a counter anything sums for a
land total. Filing Shatterskull under Sorceries does not change how many
lands the deck reports — that number was never read from `cardTypeGroup`.

Per layout, using the stored `type_line` shape read from staging:

| Layout | Stored shape | Front-face rule | Catalog status |
|---|---|---|---|
| `modal_dfc` | `Front // Back` | File under front. Back land stays land-droppable (`playableAsLand`), never role-`land`. | **Bug** — Shatterskull Smashing is the reference case. |
| `transform` | `Front // Back` | File under front. Back arrives later or never; it is never the cast face. | **Bug** — e.g. `Tales of Master Seshiro // Seshiro's Living Legacy` (`Enchantment — Saga // Enchantment Creature`). |
| `adventure` | `Front // Back — Adventure` | File under front (the permanent). The Adventure half is a spell mode, not the card's identity. | **Bug** — The Arkenstone is the reference case. |
| `prepare` | `Creature // Sorcery\|Instant` | File under front. Every `prepare` row in this catalog has a creature front today, so this is currently correct by accident; the fix makes it correct by rule. | Not currently mis-grouped, but only because no counter-example exists yet. |
| `split` | `Face A // Face B`, both castable | File under the **first-named** face, for consistency with every other layout and with Scryfall's own card order (ruling 7). | **Bug**, small: 4 cards where the two halves differ (`Sorcery // Instant`-shaped). |
| `flip` | `Unflipped // Flipped` | File under the unflipped (front) state — the card as it is cast and as it sits outside combat/a triggered flip. | **Bug**, 1 card: `Curse of the Fire Penguin` (`Enchantment — Aura // Creature — Penguin`). |
| `meld` | **Single-face** `type_line` per row — melded pairs are ingested as separate single-face catalog rows (AGENTS.md's meld note) | No change: `cardTypeGroup` never sees a `//` for this layout today. | Confirmed via `cards.layout = 'meld'` sample: no row contains `//`. |
| `reversible_card` | Single-face `type_line` per row (ingested from one face, AGENTS.md's reversible-card note) | No change: nothing to split. | Confirmed: 0 rows on staging currently carry this layout with a `//` type_line. |

The same rule applies to the collection Type ▾ filter: a selected type should
match a two-faced card only when that type word is on the card's **front**
face, so Shatterskull stops appearing under both `Land` and `Sorcery` and
appears only under `Sorcery`.

## Measured impact (staging, read-only, `br-polished-pond-a6e63y0b`)

Catalog cards whose grouping changes (buggy whole-line bucket vs. fixed
front-face bucket), and the real decks they sit in:

| Layout | Affected catalog cards | Deck-row copies affected | Decks touched |
|---|---|---|---|
| `transform` | 125 | 5 | 3 |
| `modal_dfc` | 51 | 6 | 5 |
| `adventure` | 16 | 2 | 1 |
| `split` | 4 | 0 | 0 |
| `flip` | 1 | 0 | 0 |
| **Total (union)** | **197** | **13** | **8** |

(`decks_touched` union computed directly — a card can sit in more than one of
the per-layout decks, so the total is not the column sum.)

Collection Type ▾ over-inclusion (a two-faced card matching a filter word that
is only on its back face), same branch:

| Layout | Catalog cards with a leaking extra match |
|---|---|
| `transform` | 177 |
| `adventure` | 169 |
| `modal_dfc` | 72 |
| `prepare` | 70 |
| `split` | 29 |
| `flip` | 6 |

On Hugh's own staging collection specifically: 63 distinct owned two-faced
cards (87 copies) currently leak into a type filter they should not match.

## Files to change

1. **`src/lib/cards/facet.ts`** — export a small shared helper,
   `frontFace(typeLine: string): string` (`typeLine.split(" // ")[0]`), so
   `cardFacet` and `isLandFace` can call it instead of repeating the split, and
   the two new call sites below use the same primitive rather than a third
   inline implementation.
2. **`src/lib/decks/grouping.ts`** (`cardTypeGroup`, line ~123) — lowercase
   `frontFace(typeLine)` instead of the whole `typeLine`, keep the existing
   word-precedence order unchanged (it is still right for a single-face type
   line, and `isBasicLand` is untouched).
3. **`src/lib/collection/browse.ts`** (`filterCards`, line ~876) — match each
   selected type against `frontFace(c.typeLine).toLowerCase()` instead of the
   whole line.
4. **`src/lib/collection/type-filter.ts`** (`buildTypeOptions`, line ~44) —
   same change, so the panel's own counts agree with what the filter admits.

No schema or migration work: `type_line` and `layout` are already stored and
already read everywhere this touches. No component changes: `decklist.tsx`,
`decklist-row.tsx`, etc. render whatever `cardTypeGroup` returns today: the
fix is upstream of every renderer, not in one.

## Tests to add

One case per layout, named by a real card confirmed on staging, extending the
existing `cardTypeGroup` describe block in `src/lib/decks/read.test.ts`
(`cardTypeGroup` is re-exported from `read.ts` and tested there today, next to
the existing `"Land — Forest // Creature — Beast" → "Lands"` case, which must
keep passing — front face there is already the land):

- `modal_dfc`: `cardTypeGroup("Sorcery // Land")` → `"Sorceries"` (Shatterskull
  Smashing // Shatterskull, the Hammer Pass).
- `transform`: `cardTypeGroup("Enchantment — Saga // Enchantment Creature — Snake Warrior")`
  → `"Enchantments"` (Tales of Master Seshiro // Seshiro's Living Legacy).
- `adventure`: `cardTypeGroup("Legendary Artifact // Sorcery — Adventure")` →
  `"Artifacts"` (The Arkenstone // Seek the Heart).
- `split`: `cardTypeGroup("Sorcery // Instant")` → `"Sorceries"` (Discovery //
  Dispersal).
- `flip`: `cardTypeGroup("Enchantment — Aura // Creature — Penguin")` →
  `"Enchantments"` (Curse of the Fire Penguin).
- Regression guard, `meld`-shaped input (single face, no `//`):
  `cardTypeGroup("Legendary Creature — Angel Horror")` → `"Creatures"`,
  confirming the front-face split does not break a type line with no
  separator.

`src/lib/collection/browse.test.ts` and `src/lib/collection/type-filter.test.ts`:
one case each proving a sorcery-fronted MDFC (Shatterskull's type line) no
longer matches a `Land` filter and does match `Sorcery`, and that
`buildTypeOptions`'s `Land` count for a fixture collection holding only that
card reads 0.

`src/lib/cards/facet.test.ts`: a direct unit test for the new `frontFace`
export; no behavior change expected for `cardFacet` or `isLandFace`, so their
existing tests are the regression guard that the refactor is inert there.

## Verification

- `pnpm test` — the new and existing `cardTypeGroup`, `filterCards`,
  `buildTypeOptions`, `cardFacet`, and `isLandFace` suites.
- `pnpm typecheck && pnpm lint`.
- No probe needed: every touched function is pure and already unit-tested;
  there is no new visual state for a browser probe to prove, only a
  pre-existing section/filter now receiving a different (correct) classification.
- No DB migration, no catalog rebuild, no About entry (bug fix, not a new
  feature or capability).

## PR boundary

One PR, decklist and Collection Type filter together (ruling 8). Four source files plus their test files — well under the ~20-file /
~800-line split threshold. Doc-only *this* PR is the plan; the fix itself is a
follow-up implementation PR once this plan is reviewed.

## Rulings (Hugh, 2026-10-08)

7. **Split cards file by their first-named half.** Both halves are castable, so
   "front" is a convention (Scryfall's name and `type_line` order), and the
   convention is ruled. The `split` row above stands as written. Measured
   impact is 4 catalog cards and 0 deck rows on staging.
8. **The Collection Type filter fix ships in the SAME PR as the decklist fix.**
   Same root cause, same `frontFace` helper. It changes what a reader sees when
   filtering their 63 affected collection rows by type (fewer double-counted
   matches); that is the intended outcome, not a risk to split out.

No questions remain open.
