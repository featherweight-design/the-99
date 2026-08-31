# Card Availability (#43) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A physical card lives in one deck at a time. Teach the recommender and the builder to subtract cards already sleeved into a finished deck, and annotate the four surfaces where that changes a decision.

**Architecture:** One aggregate query (`loadAvailability`) returns `{owned, hard, soft, free}` per `oracle_id` for a user, classifying each deck as *mature* (99 cards → hard claim) or *brewing* (under 99 → soft claim). A pure classifier turns those numbers into one of four states, of which the common one renders **nothing**. On `/commanders` the same numbers reduce the scoring pool, producing a second score computed from the **already-cached** EDHREC data — no extra network, no new persisted table. Everywhere else the numbers are pure annotation.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Vitest.

**Sources:**
- Spec: `docs/superpowers/specs/2026-08-08-card-availability-design.md`
- Design handoff: `design/design_handoff_the99_availability/README.md` (R3), `ADDENDUM-README.md` (R2 rulings) and `ADDENDUM-2-README.md` (R3 — `/collection` and the deck-detail roll-up)
- Copy: `design/design_handoff_the99_availability/availability · copy strings.ts` — including the `collection` and `deckRollup` blocks added by Addendum 2
- Verdicts: `READINESS.md` and `ADDENDUM-READINESS.md` (🟢 Green, audited 2026-08-13) · `ADDENDUM-2-READINESS.md` (🟢 Green, audited 2026-08-27)
- **Addendum 2 is not optional scope.** It extends the marker to `/collection` (Tasks 9–10) and the deck-detail roll-up (Task 8), and its §6 self-exclusion rule changes the classifier that every earlier task depends on. Read it before Task 1.

## Global Constraints

- **`free` renders nothing.** There is no string for the free state, deliberately, so a future copy edit cannot give silence a label. Three of five decklist rows must carry no marker.
- **Vocabulary is load-bearing.** `free` and `in use` are the two nouns. **"Deck tax" is banned** (collides with commander tax). A swap to "available" is all strings at once or none.
- **Nothing asserts where a physical card is.** We describe *lists*, never boxes, binders or sleeves.
- **Nothing is blocked and nothing is refused.** Every card stays addable, including the over-committed one. #140's refusal pattern appears nowhere.
- **AA without colour.** Every marker is glyph *plus* number *plus* word. Greyscaled, all four states stay distinct.
- **`--danger` `#C6533F` is glyph-and-border only, never text.** Use `--avail-over-fg` `#E9917A` for over-committed text.
- **There is no light theme.** `src/app/globals.css` has exactly one `:root` and no `color-scheme`. New tokens are single-value like every other token.
- **Brass is AAA for normal text** (~7.0:1 on `--surface`). `--avail-hard-fg` exists for a *size* reason — the 8.5px tile chip — not because brass fails. **The glyph itself stays `--brass`.**
- **Zero net motion.** The marker never animates, not on appear, not on add.
- **The marker is never a tap target.** A 6px glyph that responds to taps in a grid of 44px Add buttons is a mis-tap generator.
- **The four states apply only when `owned > 0`.** A card you do not own is not "in use". This guard reads *true* owned, never a self-excluded figure.
- **A deck never claims a card against itself** (Addendum 2 §6). On a deck's own decklist the marker excludes that deck from **supply as well as claims**, so `free === 0` there means "exactly enough for everyone, including this deck" — silence. Off-decklist there is no exclusion: *"the marker is relative to where you stand, and only a decklist is somewhere to stand."*
- **`/collection` is count-only** (Addendum 2 §3), in the accessible name as well as the label. It renders `marker.hard` (`0 free`) and **never** `hardIn` or `hardMulti`.
- **No roll-up and no badge on the deck index** (locked decision 2). The deck index status pill keeps meaning card count and nothing else.
- **No grid changes on either collection view.** The row marker lives inside the existing `1fr` name cell; the tile chip goes **top-left** because top-right is the brass quantity badge.
- **The deck-name half is the only part allowed to truncate.** The marker renders as a `flex-none` prefix plus a `truncate min-w-0` name, full name always in the accessible name and **never** in a `title` (table row 3.6). No character budget, no breakpoint hook.
- **Mature deck threshold is 99 cards.** Constant, one definition, `MATURE_DECK_SIZE`.
- **Design-doc precedence:** where the canvas `The 99 - Card Availability.dc.html` and `README.md` disagree, **`README.md` wins**. The canvas's implementation-notes panel still says "get a light-theme pair there" and "brass is not AA as small text"; both are corrected in the README and **must not be implemented**.
- **Contrast figures in R3 drift ~5% high.** Verified values on `--surface #1E1A15`: `#E8CE93` 11.1:1 · `#E9917A` 7.1:1 · `--fg-body` 8.5:1 · `--brass` 7.0:1. All AAA; brass has less headroom than the document claims.

---

## File Structure

**New:**
- `src/lib/decks/availability.ts` — **pure, and it must never import `db`**: the `Availability` type, the `MATURE_DECK_SIZE` constant, and the `availabilityState()` classifier. Client components value-import the classifier, and `src/lib/decks/status.ts:1-5` exists solely because of this rule: *"a `use client` component that value-imports from [a module that touches the db] pulls the db into the browser bundle and the page dies on hydration."* `decklist-row.tsx`, `card-search-row.tsx` and `suggestion-tile.tsx` are all `"use client"`.
- `src/lib/decks/availability-query.ts` — `loadAvailability`, the only piece that touches Drizzle. Server-side callers only.
- `src/lib/decks/availability.test.ts` — classifier unit tests.
- `src/lib/copy/availability.ts` — the copy block, ported from the handoff's copy file.
- `src/components/ui/availability-marker.tsx` — the marker at both densities.
- `src/components/ui/availability-marker.test.tsx` — silence, states, a11y.
- `src/lib/recs/free-ranking.ts` — the second score, computed from cached EDHREC data.
- `src/lib/recs/free-ranking.test.ts`
- `src/lib/commanders/rank-maps.ts` — the two global rank maps.
- `src/lib/commanders/rank-maps.test.ts`
- `src/lib/collection/availability-filter.ts` — the pure half of the `Availability ▾` panel: option building with counts, `parseAvailParam`, `serializeAvail`, and the predicate `filterCards` calls. Deliberately mirrors `type-filter.ts` / `set-filter.ts` so the four panels never disagree about what a count means.
- `src/lib/collection/availability-filter.test.ts`
- `drizzle/` — one generated migration dropping `decks.status`.

**Modified:**
- `src/db/schema.ts:130` — drop the dead `status` column.
- `src/app/globals.css` — four derived tokens beside `--danger`.
- `src/lib/copy/decks-builder.ts:199-200` — extend `rowAria` with a 4th optional argument.
- `src/app/decks/[id]/search-action.ts` — add availability to `SearchResult`.
- `src/components/decks/card-search-row.tsx`, `src/components/decks/suggestion-tile.tsx` — render the marker.
- `src/lib/decks/read.ts`, `src/lib/decks/grouping.ts` — add availability to `DeckDetailCard`.
- `src/components/decks/decklist-row.tsx` — render the marker.
- `src/app/commanders/page.tsx`, `src/components/commanders/commanders-view.tsx`, `src/components/commanders/rec-card.tsx` — the toggle, the two rank maps, the receipt line, the delta.
- `src/components/commanders/degraded-banner.tsx` — generalise from synergy-only to a variant prop.
- `src/components/decks/builder-spine.tsx` — the over-committed summary on the deck header.
- `src/components/commanders/detail.tsx` — the in-use disclosure.
- `src/lib/collection/browse.ts` — `BrowseCard` gains `availability`; `BrowseFilters` gains `avail`; `filterCards` gains the availability clause. The availability map is joined **once for the page** in `loadBrowseCards`, not per row.
- `src/app/collection/page.tsx` — pass the availability map through, and read `?avail=`.
- `src/components/collection/browser.tsx` — the fourth filter's state, options, announcement and `serializeParams` round-trip. `/collection` **fails quiet** if the join errors: the panel renders disabled with `degraded.collectionFilterDisabledAria` and there is **no banner**.
- `src/components/collection/filter-bar.tsx` — mount `Availability ▾` (fourth on desktop, fifth on phone) via the shared `FilterPanel`.
- `src/components/collection/rows-view.tsx` — the count-only marker inside the existing `1fr` name cell.
- `src/components/collection/grid-view.tsx` — the count-only chip, **top-left**.
- `src/components/collection/card-modal.tsx` — the full clause with the deck name, plus `detailHeading` and the state note.
- `src/components/collection/chip-row.tsx` — availability chips reuse the shipped row; no new chip component.

---

## Task 1: The availability query and model

**Files:**
- Create: `src/lib/decks/availability.ts` — **pure. No `db` import in this file.**
- Create: `src/lib/decks/availability-query.ts` — the Drizzle query.
- Create: `src/lib/decks/availability.test.ts`
- Modify: `src/db/schema.ts:130` (drop dead `status` column)
- Create: `drizzle/<generated>_drop_decks_status.sql`

**Interfaces:**
- Consumes: nothing.
- Produces, from `availability.ts` (pure):
  - `MATURE_DECK_SIZE = 99`
  - `type Availability = { owned: number; hard: number; soft: number; free: number; hardDeckNames: string[] }`
  - `type AvailabilityState = "free" | "soft" | "hard" | "over"`
  - `availabilityState(a, opts?: { selfExcluded?: boolean }): AvailabilityState`
- Produces, from `availability-query.ts` (server only):
  - `loadAvailability(userId: string, opts?: { oracleIds?: string[]; excludeDeckId?: string }): Promise<Map<string, Availability>>`

**The options object replaces the bare `oracleIds?` positional** that an earlier revision of
this plan specified. Nothing has been implemented yet, so there is no call site to migrate;
two independent optional narrowings do not belong in positional slots.

**The split is not tidiness — it is a hydration crash.** See `src/lib/decks/status.ts:1-5`, which is split from `read.ts` for exactly this reason: the Drizzle client throws at module init without `DATABASE_URL`, so a `"use client"` component that value-imports from a db-touching module takes the whole page down. The marker in Task 3 value-imports `availabilityState`, and all three of its host components are client components.

- [ ] **Step 1: Write the failing classifier test**

Create `src/lib/decks/availability.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { availabilityState } from "./availability";

describe("availabilityState", () => {
  it("is free when nothing claims the card", () => {
    expect(availabilityState({ owned: 4, free: 4, soft: 0 })).toBe("free");
  });

  // The partition's sharpest edge: hard claims are ALLOWED in the free state.
  // Four Sol Rings with three sleeved still leaves one free, and the player
  // sees nothing.
  it("is free when a hard claim still leaves a spare copy and no brew wants it", () => {
    expect(availabilityState({ owned: 4, free: 1, soft: 0 })).toBe("free");
  });

  it("is soft when a copy is free but an unfinished brew wants it", () => {
    expect(availabilityState({ owned: 2, free: 1, soft: 1 })).toBe("soft");
  });

  it("is hard when nothing is free, regardless of brews", () => {
    expect(availabilityState({ owned: 1, free: 0, soft: 0 })).toBe("hard");
    expect(availabilityState({ owned: 1, free: 0, soft: 3 })).toBe("hard");
  });

  it("is over when more finished decks want the card than are owned", () => {
    expect(availabilityState({ owned: 1, free: -2, soft: 0 })).toBe("over");
  });

  // The states annotate a card the player HAS. An unowned card is not "in use".
  it("is free when the card is not owned at all", () => {
    expect(availabilityState({ owned: 0, free: 0, soft: 0 })).toBe("free");
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/decks/availability.test.ts`
Expected: FAIL — `Failed to resolve import "./availability"`.

- [ ] **Step 3: Write the module**

Create `src/lib/decks/availability.ts` — **note there is no `db` import here, deliberately**:

```ts
/**
 * A deck at 99 cards is finished enough that its cards are physically sleeved,
 * so its claims are hard. Below 99 it is a brew and its claims are soft. This
 * is the brief's proxy for deck maturity and it reuses statusPill()'s own
 * threshold — Playable/Complete sit at 99, Draft/Building below it. There is
 * deliberately no second status vocabulary, and `decks.status` stays dead.
 */
export const MATURE_DECK_SIZE = 99;

export type Availability = {
  owned: number;
  hard: number;
  soft: number;
  /**
   * Copies not spoken for, FROM THE VANTAGE THIS WAS LOADED WITH. Negative when
   * finished decks want more copies than exist.
   *
   * Off-decklist (no `excludeDeckId`) this is `owned − hard`. On a deck's own
   * decklist it is `(owned − ownClaim) − (hard − ownHardClaim)`, because
   * Addendum 2 §6 excludes that deck from supply as well as claims. The query
   * computes it either way; **never recompute it from `owned` and `hard`**,
   * which is right only in the first case and silently wrong in the second.
   */
  free: number;
  /**
   * Names of the mature decks holding a hard claim, minus the excluded deck
   * when one was passed. Used only when length === 1.
   */
  hardDeckNames: string[];
};

export type AvailabilityState = "free" | "soft" | "hard" | "over";

/**
 * Total order, most severe first — the four states are a partition, so the
 * first match wins and every card lands in exactly one.
 *
 * `selfExcluded` is the deck's-own-decklist vantage (Addendum 2 §6). There,
 * `free` is computed against a supply that already has the current deck's
 * copies removed, so `free === 0` means "exactly enough for everyone,
 * including this deck" — which is silence, not a claim. A genuine conflict has
 * `free < 0` and presents as `over`.
 *
 * The hard state is therefore unreachable in this vantage — for ANY deck, not
 * only a finished one. Deck maturity is not an input here: it is already spent
 * upstream, deciding whether each claim counted as hard or soft. Addendum 2
 * words the consequence as "inside a finished deck", because that is the case
 * it draws, but the caller controls the vantage and nothing checks maturity at
 * this layer. Pass `selfExcluded` only when `free` came from a query given the
 * matching `excludeDeckId`; passing it against an unexcluded figure silently
 * converts every genuine hard claim into silence.
 *
 * The `owned <= 0` guard is tested against TRUE owned, never the excluded
 * supply, and it stays first. It exists to keep the marker off cards the
 * player does not own — reachable on the Add panel, where a finished deck can
 * list a card that is in nobody's collection. Reordering it under `over` would
 * put "short 2" on a card the player simply never bought.
 */
export function availabilityState(
  a: Pick<Availability, "owned" | "free" | "soft">,
  opts?: { selfExcluded?: boolean },
): AvailabilityState {
  if (a.owned <= 0) return "free";
  if (a.free < 0) return "over";
  if (a.free === 0) return opts?.selfExcluded ? "free" : "hard";
  if (a.soft > 0) return "soft";
  return "free";
}
```

**Worked against drawn state 9** (Addendum 2, Atraxa 99/99 `Complete`, viewing its own
list). `ownClaim` is the current deck's own quantity; `owned` stays true owned;
`free = (owned − ownClaim) − (hard − ownHardClaim)`.

| Card | owned | ownClaim | hard | free | State | Renders |
|---|---|---|---|---|---|---|
| Smothering Tithe | 1 | 1 | 1 | 0 | free | *silent* |
| Rhystic Study | 1 | 1 | 1 | 0 | free | *silent* |
| Arcane Signet | 1 | 1 | 2 | −1 | over | `short 1 — also in Kykar` |
| Sol Ring | 4 | 1 | 1 | 3 | free | *silent* |
| Mind Stone | 2 | 1 | 1 | 1 (soft 1) | soft | `1 in a brew` |
| Cyclonic Rift | 1 | 1 | 1 | 0 | free | *silent* |

Six of six match the canvas. **Do not implement claims-exclusion alone** — excluding the
deck's claims while leaving its copies in the supply gives Arcane Signet `free === 0` and
renders `0 free — in Kykar`, which contradicts the drawing.

- [ ] **Step 3b: Write the query module**

Create `src/lib/decks/availability-query.ts`:

```ts
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { MATURE_DECK_SIZE, type Availability } from "./availability";

type Row = {
  oracle_id: string;
  owned: number;
  hard: number;
  soft: number;
  free: number;
  hard_deck_names: string[] | null;
};

/**
 * One aggregate for the whole user. Deck size is computed in SQL here rather
 * than in TS, because maturity has to be known before the per-oracle rollup —
 * loading every deck to count it in JS would be a fanout over the whole
 * collection. Archidekt refused the equivalent feature on performance grounds;
 * their problem is a per-card fanout, ours is one GROUP BY over one user's rows.
 *
 * Cards with no deck claim are absent from `claims` and fall through the left
 * join as hard = soft = 0, so free = owned. Cards the user does not own cannot
 * appear at all: the driver of the outer select is the collection.
 *
 * TWO THINGS THIS QUERY DELIBERATELY HANDLES, both verified against the schema:
 *
 * 1. THE COMMANDER IS NOT A deck_cards ROW. `decks.commander_oracle_id` is its
 *    own column (schema.ts:129) and never appears in deck_cards. Without the
 *    `commanders` CTE below, a single-copy legendary sleeved as another deck's
 *    commander would read as free everywhere — the most visible card in a deck
 *    being the one card the feature could not see.
 *
 * 2. BASIC LANDS ARE EXCLUDED ENTIRELY. A finished deck holds 30-odd Forests
 *    and almost nobody's collection row matches, so every mature deck would
 *    push its basics into `over` and fire the over-committed summary on a deck
 *    with nothing wrong with it. Basics are fungible and proxy-free in every
 *    playgroup; they are not what "a card lives in one deck" is about.
 *
 * Deck size for the maturity test stays sum(deck_cards.quantity), excluding the
 * commander — that is exactly what `built` is (read.ts:233) and what statusPill
 * thresholds on, so 99 here means the same 99 the player sees on the pill.
 * Basics DO count toward that size; they are only excluded as claim subjects.
 */
export async function loadAvailability(
  userId: string,
  opts?: { oracleIds?: string[]; excludeDeckId?: string },
): Promise<Map<string, Availability>> {
  // Both narrowings are null-guarded in SQL rather than by string-building the
  // query, so there is one query plan and one place to read.
  //
  // sql.param is load-bearing for the array. A bare `${jsArray}` in a drizzle
  // template expands to a parenthesised param LIST — `($1, $2)::uuid[]` — which
  // is a syntax error, not an array. sql.param forces the whole array into one
  // placeholder so the driver serialises it as a Postgres array literal.
  const only = sql.param(opts?.oracleIds ?? null);
  const skip = sql.param(opts?.excludeDeckId ?? null);
  const rows = await db.execute<Row>(sql`
    with deck_totals as (
      select dc.deck_id, sum(dc.quantity)::int as cards
      from deck_cards dc
      join decks d on d.id = dc.deck_id
      where d.user_id = ${userId}
      group by dc.deck_id
    ),
    -- Every claim on a card, one row per (deck, card): the deck's list, plus
    -- the deck's commander, which lives in its own column and would otherwise
    -- be invisible to this feature.
    all_claims as (
      select dc.deck_id, dc.oracle_id, dc.quantity
      from deck_cards dc
      join decks d on d.id = dc.deck_id
      where d.user_id = ${userId}
      union all
      select d.id as deck_id, d.commander_oracle_id as oracle_id, 1 as quantity
      from decks d
      where d.user_id = ${userId}
    ),
    -- The CURRENT deck's own claim, and only it. Null excludeDeckId makes this
    -- empty, so every figure below collapses to the un-excluded model.
    own_claims as (
      select ac.oracle_id, sum(ac.quantity)::int as own_claim
      from all_claims ac
      where ${skip}::uuid is not null and ac.deck_id = ${skip}::uuid
      group by ac.oracle_id
    ),
    -- A backtick anywhere in these SQL comments would terminate the enclosing
    -- template literal, so they are deliberately plain prose.
    -- One row per (oracle, claiming deck). select distinct is what makes the
    -- name list right: a deck whose commander is also on its own list appears
    -- twice in all_claims, and two decks that share a name are still two rows
    -- because deck_id is in the key. Quantities are NOT summed here.
    claim_decks as (
      select distinct ac.oracle_id, ac.deck_id, d.name, coalesce(dt.cards, 0) as cards
      from all_claims ac
      -- LEFT: a deck whose only card is its commander has no deck_cards rows
      -- and therefore no deck_totals row. An inner join would drop that claim
      -- entirely. No rows means no cards means brewing, hence coalesce to 0.
      left join deck_totals dt on dt.deck_id = ac.deck_id
      join decks d on d.id = ac.deck_id
    ),
    claims as (
      select
        ac.oracle_id,
        sum(case when coalesce(dt.cards, 0) >= ${MATURE_DECK_SIZE} then ac.quantity else 0 end)::int as hard,
        sum(case when coalesce(dt.cards, 0) <  ${MATURE_DECK_SIZE} then ac.quantity else 0 end)::int as soft
      from all_claims ac
      left join deck_totals dt on dt.deck_id = ac.deck_id
      -- Self-exclusion (Addendum 2 §6): the current deck never claims against
      -- itself, so hard/soft come back already net of its own claim.
      where ${skip}::uuid is null or ac.deck_id <> ${skip}::uuid
      group by ac.oracle_id
    ),
    claim_names as (
      select
        cd.oracle_id,
        array_agg(cd.name order by cd.name) as hard_deck_names
      from claim_decks cd
      where cd.cards >= ${MATURE_DECK_SIZE}
        and (${skip}::uuid is null or cd.deck_id <> ${skip}::uuid)
      group by cd.oracle_id
    ),
    owned as (
      select ci.oracle_id, sum(ci.quantity)::int as owned
      from collection_items ci
      join cards c on c.oracle_id = ci.oracle_id
      where ci.user_id = ${userId}
        -- Basics are excluded from the whole model. See the header comment.
        and c.type_line !~ '\\mBasic\\M'
      group by ci.oracle_id
    )
    select
      o.oracle_id,
      -- TRUE owned, never reduced: this is the owned <= 0 guard's input.
      o.owned,
      coalesce(c.hard, 0) as hard,
      coalesce(c.soft, 0) as soft,
      -- (owned − ownClaim) − (hard − ownHardClaim). The right-hand subtraction
      -- already happened in the claims CTE; this applies the supply half.
      (o.owned - coalesce(oc.own_claim, 0) - coalesce(c.hard, 0))::int as free,
      n.hard_deck_names
    from owned o
    left join claims c on c.oracle_id = o.oracle_id
    left join claim_names n on n.oracle_id = o.oracle_id
    left join own_claims oc on oc.oracle_id = o.oracle_id
    -- oracle_id is a uuid column (schema.ts), so the cast is uuid[], not text[].
    where ${only}::uuid[] is null or o.oracle_id = any(${only}::uuid[])
  `);

  const out = new Map<string, Availability>();
  for (const r of rows.rows) {
    out.set(r.oracle_id, {
      owned: r.owned,
      hard: r.hard,
      soft: r.soft,
      // Straight from the query. Do NOT recompute as `r.owned - r.hard` here:
      // that is right only when excludeDeckId is unset, and silently wrong on
      // a deck's own decklist, where supply is self-excluded too.
      free: r.free,
      hardDeckNames: r.hard_deck_names ?? [],
    });
  }
  return out;
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `pnpm vitest run src/lib/decks/availability.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Drop the dead `decks.status` column**

The schema carries `status: "brewing" | "built"` defaulting to `brewing`. **No code path has ever written it** — both insert sites omit it (`src/app/decks/actions.ts:51-52`, `src/app/decks/import-actions.ts:166-167`) and nothing reads it. Every deck in the database is `brewing` and always will be. An earlier draft of the brief hung hard/soft on that column; this plan hangs it on card count instead, so the column is now a trap for the next reader.

Confirm it is genuinely dead before deleting:

Run: `grep -rn "\.status" src/app/decks src/lib/decks src/db | grep -v statusPill`
Expected: no hit that reads or writes `decks.status`. **If there is one, stop and report it — do not drop the column.**

Then remove the line from `src/db/schema.ts:130` and generate the migration:

Run: `pnpm db:generate`
Expected: a new file in `drizzle/` containing `ALTER TABLE "decks" DROP COLUMN "status";`

- [ ] **Step 6: Full gate**

Run: `pnpm typecheck && pnpm lint && pnpm test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/lib/decks/availability.ts src/lib/decks/availability.test.ts src/db/schema.ts drizzle
git commit -m "feat(availability): compute per-card free/in-use counts across decks (#43)"
```

---

## Task 2: Tokens, copy block, and the `rowAria` extension

**Files:**
- Modify: `src/app/globals.css` (beside `--danger`, around line 48)
- Create: `src/lib/copy/availability.ts`
- Modify: `src/lib/copy/decks-builder.ts:199-200`
- Create: `src/lib/copy/availability.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `availabilityCopy` (the full block), and `addPanelCopy.quickAdd.rowAria(name, typeLine, owned, availability?)`.

- [ ] **Step 1: Add the five tokens**

In `src/app/globals.css`, in the `/* Feedback */` group beside `--danger`:

```css
  /* Card availability (#43). Two aliases and three literals — no new hues.
     There is no light theme in this stylesheet (one :root, no color-scheme),
     so these are single-value like every other token. */
  --avail-soft: var(--fg-muted);
  --avail-hard: var(--brass);
  /* NOT because brass fails — brass is AAA for normal text (~7.0:1 on
     --surface). This exists for a size reason: the tile chip label is 8.5px
     mono on a scrim over card art, below the 14px large-text threshold. The
     glyph itself stays --brass. */
  --avail-hard-fg: #E8CE93;
  /* The shipped danger red lifted for text. --danger itself is glyph-and-border
     only and must never be used as text. */
  --avail-over-fg: #E9917A;
  /* The over-committed row/tile border tint. Both canvases already draw this
     exact value; it gets a name here so Task 9 does not paste a hex literal
     into two components. Border only — never text, never a background. */
  --avail-over-border: #6B3226;
```

- [ ] **Step 2: Port the copy block**

Copy `design/design_handoff_the99_availability/availability · copy strings.ts` to `src/lib/copy/availability.ts` **verbatim**, with two edits:

1. Delete the `rowAria` export from the bottom of the file — it belongs in `decks-builder.ts` where the shipped signature lives (Step 4 below), not in a second copy module.
2. Delete the `quantity` sub-object (`joiner: ' · '`); callers join with `' · '` inline and a one-key object earns nothing.

Keep the header comment block intact — the "VOCABULARY IS LOAD-BEARING" paragraph is the thing that stops a future edit from renaming `free` on one surface only.

- [ ] **Step 3: Write the copy test**

Create `src/lib/copy/availability.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { availabilityCopy } from "./availability";

describe("availabilityCopy", () => {
  // The free state must stay unnameable. If someone adds a `free:` key here,
  // this fails and they have to justify it.
  it("has no string for the free state", () => {
    expect(availabilityCopy.marker).not.toHaveProperty("free");
    expect(availabilityCopy.marker).not.toHaveProperty("freeAria");
  });

  it("names the claiming deck only in the singular form", () => {
    expect(availabilityCopy.marker.hardIn("Atraxa")).toBe("0 free — in Atraxa");
    expect(availabilityCopy.marker.hardMulti(3)).toBe("0 free — across 3 decks");
  });

  // Over-commitment is a count problem, not a location problem.
  it("never names a deck in the over state", () => {
    expect(availabilityCopy.marker.over(2)).not.toMatch(/in |across /);
    expect(availabilityCopy.marker.overWithDemand(2, 3)).not.toMatch(/ in /);
  });

  it("singularises the soft marker", () => {
    expect(availabilityCopy.marker.soft(1)).toBe("1 in a brew");
    expect(availabilityCopy.marker.soft(2)).toBe("2 in a brew");
  });

  it("banned vocabulary does not appear anywhere", () => {
    expect(JSON.stringify(availabilityCopy)).not.toMatch(/deck tax/i);
  });
});
```

- [ ] **Step 4: Extend `rowAria` — do not replace it**

R1 of the handoff specified a 3-argument replacement that silently dropped `typeLine` from every Consider row's accessible name. **Do not reintroduce it.** In `src/lib/copy/decks-builder.ts`, replace lines 199-200 with:

```ts
  // `availability` is one of the availabilityCopy.marker.*Aria strings, or null.
  // It is prose, not the visual label: the eye reads "0 free — in Atraxa", the
  // ear hears "no free copies; this one is on your Atraxa list" — the same
  // reason the diamond glyph is aria-hidden. A free card passes nothing and
  // produces the exact shipped string: the accessible-name form of "silence is
  // the default".
  rowAria: (
    name: string,
    typeLine: string,
    owned: boolean,
    availability?: string | null,
  ) =>
    `${name}, ${typeLine}, ${owned ? "owned" : "not owned"}` +
    (availability ? `, ${availability}` : ""),
```

- [ ] **Step 5: Test the extension preserves the shipped string**

Append to `src/lib/copy/decks-builder.test.ts` (create the file if absent, importing `addPanelCopy` from `./decks-builder`):

```ts
describe("quickAdd.rowAria", () => {
  it("is byte-identical to the shipped 3-arg output when nothing is passed", () => {
    expect(addPanelCopy.quickAdd.rowAria("Swords to Plowshares", "Instant", true))
      .toBe("Swords to Plowshares, Instant, owned");
  });

  it("ignores a null availability, so the free state stays silent", () => {
    expect(addPanelCopy.quickAdd.rowAria("Swords to Plowshares", "Instant", true, null))
      .toBe("Swords to Plowshares, Instant, owned");
  });

  it("appends the clause without displacing the type line", () => {
    expect(
      addPanelCopy.quickAdd.rowAria(
        "Cyclonic Rift", "Instant", true,
        "no free copies; this one is on your Atraxa list",
      ),
    ).toBe(
      "Cyclonic Rift, Instant, owned, no free copies; this one is on your Atraxa list",
    );
  });
});
```

- [ ] **Step 6: Run tests and gate**

Run: `pnpm vitest run src/lib/copy && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/lib/copy/availability.ts src/lib/copy/availability.test.ts src/lib/copy/decks-builder.ts src/lib/copy/decks-builder.test.ts
git commit -m "feat(availability): tokens, copy block, and an extended rowAria (#43)"
```

---

## Task 3: The marker component

**Files:**
- Create: `src/components/ui/availability-marker.tsx`
- Create: `src/components/ui/availability-marker.test.tsx`

**Interfaces:**
- Consumes: `Availability`, `availabilityState` (Task 1); `availabilityCopy` (Task 2).
- Produces: `<AvailabilityMarker availability={a} density="row" | "chip" seam={...} {...MarkerOpts} />`, the `MarkerOpts` type (`{ selfExcluded?: boolean; nameless?: boolean }`, both added by Addendum 2), and `markerAria(a, opts?: MarkerOpts): string | null`.

The marker is **a diamond, a count, and a word**. Hollow diamond when an unfinished brew wants the card, solid brass when nothing is free. The glyph is two rotated `<span>`s — no new dependency, no SVG. It is `aria-hidden`; the text beside it carries the meaning, which is also why the greyscale test passes.

> **Amended 2026-08-30, in the PR that shipped this task.** The draft code that
> stood here contradicted `docs/superpowers/design-tables/card-availability.md`
> in ten places, and the design table wins. Rather than leave a second,
> divergent copy of a 300-line component in a plan doc, this section now names
> the shipped file and records every deviation. **Task 4 must read
> `src/components/ui/availability-marker.tsx`, never re-paste from here.**

**Shipped:**
- `src/components/ui/availability-marker.tsx` — 33 tests in `availability-marker.test.tsx`.

**Public API as built** (this is what Task 4 consumes):

```tsx
<AvailabilityMarker
  availability={a}
  density="row" | "chip"      // default "row"
  seam="var(--bg)"             // default; the background behind the marker, over
                               // glyph only. Pass the surface the marker actually
                               // sits on, read off that surface's own code. A
                               // decklist row is var(--surface-rail) (#1A160F,
                               // decklist-row.tsx:103), NOT var(--surface).
  className={...}
  selfExcluded?                // MarkerOpts
  nameless?                    // MarkerOpts
/>

markerAria(a, opts?: MarkerOpts): string | null
```

**The seam and hover, for Task 4.** A decklist row changes background on hover
(`#1A160F` → `#211C15`, `decklist-row.tsx:103`), and a `seam` string fixed at
render cannot follow it: the seam would read as a hairline against the hovered
row. Both colours are in design table line 124's observed list, so neither is
wrong; what is wrong is picking one and calling it done. The fix, if Task 4
wants it, is a CSS variable the row sets and the row's `md:hover:` overrides,
passed as `seam="var(--row-bg)"` — the prop takes any CSS colour value, so this
needs no component change. Decide it in Task 4 rather than inheriting it.

**Deviations from the draft, and why:**

1. **Styling is Tailwind classes, not inline `style`.** House style is
   `ownership-dot.tsx`: `twMerge` plus arbitrary values
   (`bg-[color:var(--x)]`, `[border:1px_solid_var(--y)]`), and the tests assert
   on `className` to match. **One exception, the seam**: it is a runtime prop
   (deviation 3), so no build-time class can carry it and
   `style={{ borderLeft: \`1px solid ${seam}\` }}` is the only way to deliver it.
   Its two tests read `element.style.borderLeft` accordingly. Nothing else in
   the file sets an inline style.
2. **The `over` glyph is two diamonds, not one.** Design table row 2.4 and the
   canvas at `The 99 - Card Availability.dc.html:123`: a `position:relative`
   11×6 wrapper holding two 6×6 rotated squares, the second at `left:5px` with
   `border-left: 1px solid <seam>`. The draft drew a single diamond for all
   three states.
3. **The seam colour is a `seam` prop, defaulting to `var(--bg)`.** Design table
   line 124 — *"build it as a prop, not a constant"* — because the seam only
   reads as a seam while it matches whatever sits behind the marker, and the
   handoff observes six different backgrounds. Chip density overrides it to the
   scrim `#0B0907`, since the chip supplies its own background.
4. **Soft's label is a step brighter than its glyph.** Table rows 2.2/3.3: glyph
   outline `--fg-muted` (`#A89B84`), label `--fg-body` (`#C6B79A`). The draft
   painted both `var(--avail-soft)`.
5. **Row density sets no font size and no font family.** Table row 3.1 — row
   density *"takes no column and no row height"* — so it inherits the meta line
   it sits on. The draft's `fontSize: 11.5` would have changed the line height of
   every consuming surface.
6. **Chip density forces `nameless`.** A 63×88 tile has no room for a proper
   noun, and every chip in every canvas is count-only. Making the density imply
   it defends against a future tile surface forgetting the flag.
7. **Empty `hardDeckNames` degrades to the base form in both `hard` and
   `over`.** A degraded read (Task 7) can return counts with no names; the draft
   rendered `0 free — across 0 decks` and *"0 of your finished lists include this
   card"*. Both now fall back to `c.hard` / a sliced countless over aria.
8. **`overWithDemand` fires at one deck, not two.** An "any number" card
   (Relentless Rats, Nazgûl) can have a single deck as the whole demand, so the
   draft's `length > 1` made the copy file's singular branch dead code.
9. **The prefix span is `whitespace-pre`, not `whitespace-nowrap`.** A flex item
   trims its own trailing whitespace, so `0 free — in ` lost its trailing space
   and rendered `0 free — inAtraxa`. jsdom cannot see this and the draft's
   `composed()` helper normalised it away; only the Gate 2 browser pass caught
   it. There is a regression test pinning the literal `"0 free — in "`.
10. **No `title` on the deck name, reversing decision B (2026-08-27).** Table row
    3.6 says "no title-on-marker", and the earlier reading — that it forbids an
    explanatory tooltip but not a `title` recovering a clipped name — does not
    survive reading the component. The marker root sets no `aria-label`;
    `markerAria` is exported so Task 4 can compose the full deck name into the
    **row's** accessible name. A screen reader therefore already has the name,
    and the `title` only ever served a sighted mouse user, on an element row 3.6
    says has no hover and is never a tap target. The name span carries
    `data-deck-name` for tests to query, and a test asserts the marker renders no
    `title` anywhere.

**Carried to Design as ratify items** (see the PR body): the copy file has no
nameless `hardAria` key and no countless `overAria` key, both of which are
currently sliced out of the keys that do exist. The row-3.6 `title` question is
**closed engineering-side** by deviation 10 above and needs no Design call.

---

## Task 4: The builder surfaces — decklist row, search row, Consider tile

**Files:**
- Modify: `src/app/decks/[id]/search-action.ts:38-75` (signature gains `deckId`)
- Modify: `src/components/decks/use-card-search.ts` (thread `deckId` through)
- Modify: `src/lib/decks/grouping.ts:10-18` (`DeckDetailCard`)
- Modify: `src/lib/decks/read.ts:131-140` (`getDeckDetail`)
- Modify: `src/components/decks/card-search-row.tsx`
- Modify: `src/components/decks/suggestion-tile.tsx`
- Modify: `src/components/decks/decklist-row.tsx`
- Test: `src/components/decks/decklist-row.test.tsx`

**Interfaces:**
- Consumes: `loadAvailability`, `Availability` (Task 1); `AvailabilityMarker`, `markerAria` (Task 3); extended `rowAria` (Task 2).
- Produces: `SearchResult.availability: Availability | null` and `DeckDetailCard.availability: Availability | null`.

These surfaces are **pure annotation**. Nothing here changes what a control means, so a failed availability read must fail **genuinely quiet** — `availability: null`, no marker, no banner, no message. That degrades to exactly the silent state a player with no commitments sees. This is the load-bearing half of the degraded ruling; Task 7 handles the other half.

- [ ] **Step 1: Widen the two payload types**

In `src/lib/decks/grouping.ts`, add to `DeckDetailCard`:

```ts
  /**
   * Optional, not `| null` required. Six existing sites build DeckDetailCard
   * literals — quick-add-bar.tsx:329, resolution-expander.tsx:115 and
   * suggestion-tile.tsx:151 (optimistic adds), plus fixtures in
   * optimistic-deck.test.tsx:12, role-counter-strip.test.tsx:21 and
   * card-detail-surfaces.test.tsx:26 — and DeckSuggestion (suggest.ts:20) has
   * no availability to give. A required field breaks all six for no gain: an
   * optimistically-added card genuinely has no availability yet, and "absent"
   * and "read failed" both correctly render nothing.
   */
  availability?: Availability | null;
```

In `src/app/decks/[id]/search-action.ts`, add the same optional field to `SearchResult`.

**Do not add `loadAvailability` to `searchCards` naively.** That action runs on every keystroke (`use-card-search.ts`) to annotate at most ~20 rows, and `loadAvailability` aggregates the player's whole collection. Restrict the query to the oracle_ids actually being returned — pass `{ oracleIds }` to `loadAvailability`, which appends `and o.oracle_id = any(${oracleIds})` to the outer select. The commanders path calls it with no options, as before.

**The decklist path passes `{ excludeDeckId: deck.id }`** — Addendum 2 §6, self-exclusion. In
`getDeckDetail` this is the deck being rendered. Three things change inside the query when it
is set, and all three are required together:

1. `owned` stays TRUE owned — it is the `owned <= 0` guard's input and must not shrink.
2. `free` becomes `(owned − ownClaim) − (hard − ownHardClaim)`, where `ownClaim` is the
   current deck's `quantity` for that oracle (its commander column included) and
   `ownHardClaim` is that same figure when the current deck is mature, else 0. `soft`
   likewise drops the current deck's own soft claim.
3. `hardDeckNames` **excludes the current deck's name**, so a single remaining entry is the
   *other* claimant and drives `marker.overAlsoIn` rather than `marker.overWithDemand`.

Callers on `/collection` and the commander surfaces pass no `excludeDeckId`. Addendum 2:
*"the marker is relative to where you stand, and only a decklist is somewhere to stand."*

- [ ] **Step 2: Populate them**

In both `getDeckDetail` (`read.ts`) and `searchCards` (`search-action.ts`), call `loadAvailability` alongside the existing query and attach per-oracle. **Both pass `excludeDeckId`** — see the ruling below. Wrap it so a failure is quiet:

```ts
// Pure annotation on this surface: a failed read must be indistinguishable
// from a player with no commitments, never a banner over a working list.
const availability = await loadAvailability(userId, {
  excludeDeckId: deckId,
}).catch(() => null);
// …then, per row:
availability: availability?.get(row.oracleId) ?? null,
```

Every marker rendered by this task therefore also passes `selfExcluded: true`, which is what routes the single-other-claimant `over` case to `marker.overAlsoIn` (`short 1 — also in Kykar`) instead of counting the deck the player is standing in.

**`searchCards` has no `deckId` today** (`search-action.ts:38-40` takes `query, colorIdentity, ownedOnly`), so add it as a fourth parameter and thread it from `use-card-search.ts`. The route already scopes the action — the file lives under `src/app/decks/[id]/` — so this makes an existing fact explicit rather than introducing a new coupling.

**Why search self-excludes too, and this is a ruling rather than an inheritance.** Addendum 2 §6 is written about "a deck's own decklist", and most search results are cards the deck has no claim on, where exclusion is a no-op. But a card already on the list *does* come back from search, one panel away from its own row. Without exclusion it reads `0 free — in <this deck>` in the add panel and renders silent in the decklist behind it — the same card, the same deck, two answers. §6's stated reason is that inside a list the card *is* built with, and that is no less true in the panel you are adding from. **Flagged to Design for ratification, not redrawn.**

- [ ] **Step 3: Write the failing decklist-row test**

Add to `src/components/decks/decklist-row.test.tsx`. **Match the file's real helpers**: `renderRow` takes **JSX**, not a card object (`:73`), and the fixture is named `card`, not `baseCard` (`:52`). The repo has **no `@testing-library/user-event`** dependency — use `.click()` inside `act`, as `clickRemove` at `:59` does.

```tsx
const avail = (owned: number, hard: number, names: string[] = []) => ({
  owned, hard, soft: 0, free: owned - hard, hardDeckNames: names,
});

it("carries no marker when the card is free", () => {
  renderRow(<DecklistRow card={{ ...card, availability: avail(2, 0) }} {...rowProps} />);
  expect(screen.queryByText(/free|in a brew|short/)).toBeNull();
});

it("carries the marker when nothing is free", () => {
  renderRow(
    <DecklistRow card={{ ...card, availability: avail(1, 1, ["Atraxa"]) }} {...rowProps} />,
  );
  // Two spans, so match the prefix by regex and the name by its data attribute —
  // getByText cannot see the composed string. See Task 3, Step 4.
  expect(screen.getByText(/0 free — in/)).toBeInTheDocument();
  expect(document.querySelector("[data-deck-name]")).toHaveTextContent("Atraxa");
});

// The quiet-failure half of the degraded ruling.
it("renders exactly like the free state when the availability read failed", () => {
  renderRow(<DecklistRow card={{ ...card, availability: null }} {...rowProps} />);
  expect(screen.queryByText(/free|in a brew|short/)).toBeNull();
});
```

Copy the surrounding `<DecklistRow …>` prop spread from an existing render call in the file rather than inventing `rowProps`.

- [ ] **Step 4: Run it and watch it fail**

Run: `pnpm vitest run src/components/decks/decklist-row.test.tsx`
Expected: FAIL — the marker text is not found.

- [ ] **Step 5: Render the marker on all three surfaces**

The marker **rides the existing quantity string** rather than claiming a column — it joins `×${qty} owned` with `' · '`. It is never a tap target and never sits inside the row's button.

All three pass `selfExcluded` — every payload on this task's surfaces was loaded with `excludeDeckId` set (Step 2), and the flag is what tells `markerAria` to reach for `overAlsoIn`.

- `decklist-row.tsx`: after `OwnershipDot`/name, render `{card.availability && <AvailabilityMarker availability={card.availability} density="row" selfExcluded />}`.
- `card-search-row.tsx`: same, in `CardSearchRowBody` beside the `{ownership}` figure, joined with `' · '`. Pass `markerAria(availability, { selfExcluded: true })` as the 4th argument to `addPanelCopy.quickAdd.rowAria`.
- `suggestion-tile.tsx`: `density="chip" selfExcluded` on the art scrim, plus the caption line under the type line via `availabilityCopy.marker.tileInUse(deckName)` / `tileOver(deckCount)`.

- [ ] **Step 6: Run tests and gate**

Run: `pnpm vitest run src/components/decks src/lib/decks && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 7: Verify in the browser at both widths**

Run `pnpm dev`, sign in, open a deck with a card that is also in a 99-card deck. Confirm at 390px and 1300px: the marker appears on the committed row, three of five rows carry nothing, the Add button still works on an over-committed card (**nothing is ever blocked**), and no layout shifts when the marker appears.

- [ ] **Step 8: Commit**

```bash
git add src/app/decks src/lib/decks src/components/decks
git commit -m "feat(availability): annotate decklist rows, search rows and Consider tiles (#43)"
```

---

## Task 5: The second score — ranking against what's free

**Files:**
- Create: `src/lib/recs/free-ranking.ts`
- Create: `src/lib/recs/free-ranking.test.ts`
- Create: `src/lib/recs/free-ranking-wiring.test.ts`
- ~~Modify: `src/app/commanders/page.tsx:46-52`~~ — moved to Task 6 by the Step 5 amendment below (2026-08-31). Task 5 modifies no page.

**Interfaces:**
- Consumes: `loadAvailability` (Task 1); `loadCollectionPool`, `scoreCommander`, `byScoreThenOracleId`, `toListItem`, `type CommanderListItem`, `type RankedCommander` (existing, `src/lib/recs/`); `readEdhrecCache` (existing, `src/lib/edhrec/client.ts`); `parseEdhrecPayload` (existing, `src/lib/edhrec/parse.ts`).
- Produces:
  - `freePool(collection: PoolCard[], availability: Map<string, Availability>): PoolCard[]`
  - `rankFree(userId: string, canonical: CommanderListItem[]): Promise<{ items: CommanderListItem[]; ok: boolean }>`

**The key design decision, and why.** `commander_scores` persists the "everything I own" score, keyed on collection generation. Availability changes on **every deck mutation**, so persisting a second score there would need a whole new invalidation axis — a deck generation — for a score most users never ask for. Instead the free score is computed **on demand, only when `?avail=free` is requested**, from the EDHREC data already in the cache. `scoreCommander` is a pure function of the pool, so the second score is the same function over a smaller array: **zero extra network calls**, one extra collection query and one aggregate.

**Two traps in the existing code that this task must route around — both verified by reading `src/lib/recs/recommend.ts` and `src/lib/edhrec/client.ts`:**

1. **Do not call `finalizeRecommendations` here.** It assigns dedup slug suffixes *in rank order* (`recommend.ts:87-99`): the first `Kykar` gets `kykar`, the second gets `kykar-2`. Re-ranking reorders those two, so the same commander would get a **different slug** in `What's free` than in `Everything I own` — silently breaking every detail link on the page and desynchronising the two rank maps in Task 6, which are keyed on slug. `rankFree` therefore takes the canonical (already-slugged) list as an argument and looks each slug up **by `oracleId`**, which is stable. `CommanderListItem` carries `oracleId` (`recommend.ts:20`), so the lookup needs no extra query.

2. **`readEdhrecCache` returns raw rows, not parsed data.** `EdhrecCacheRow` is `{ commanderOracleId, payload: unknown, fetchedAt }` (`client.ts:21-25`) — there is no `topCards` on it. The payload must go through `parseEdhrecPayload` (`src/lib/edhrec/parse.ts:11`) first. Do **not** reach for `resolveEdhrecData` instead: it fetches, and this path must never touch the network.

- [ ] **Step 1: Write the failing test**

Create `src/lib/recs/free-ranking.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { freePool } from "./free-ranking";
import type { PoolCard } from "./score";

const card = (oracleId: string): PoolCard => ({
  oracleId, name: oracleId, typeLine: "Instant", oracleText: null,
  keywords: [], colorIdentity: [], imageUri: null, manaCost: null,
});

const avail = (owned: number, hard: number) => ({
  owned, hard, soft: 0, free: owned - hard, hardDeckNames: [],
});

describe("freePool", () => {
  it("drops a card with no free copies", () => {
    const pool = freePool([card("a"), card("b")], new Map([["a", avail(1, 1)]]));
    expect(pool.map((c) => c.oracleId)).toEqual(["b"]);
  });

  it("keeps a card that still has a spare copy", () => {
    const pool = freePool([card("a")], new Map([["a", avail(4, 3)]]));
    expect(pool.map((c) => c.oracleId)).toEqual(["a"]);
  });

  // Soft claims are brews, and a brew is not sleeved. They must NOT reduce the pool.
  it("keeps a card an unfinished brew wants", () => {
    const pool = freePool([card("a")], new Map([["a", { ...avail(1, 0), soft: 1 }]]));
    expect(pool.map((c) => c.oracleId)).toEqual(["a"]);
  });

  it("drops an over-committed card", () => {
    const pool = freePool([card("a")], new Map([["a", avail(1, 3)]]));
    expect(pool).toEqual([]);
  });

  // A card absent from the map has no claim on it at all.
  it("keeps a card with no availability row", () => {
    const pool = freePool([card("a")], new Map());
    expect(pool.map((c) => c.oracleId)).toEqual(["a"]);
  });
});
```

Add this second block to the same file. It is the regression guard for the slug trap — it fails loudly if anyone reintroduces `finalizeRecommendations` on this path. It tests a real exported helper, `carryCanonicalSlugs`, which Step 3 extracts so the rule is testable without a database:

```ts
import { carryCanonicalSlugs } from "./free-ranking";

describe("carryCanonicalSlugs", () => {
  // Two commanders whose names produce the same slug base. finalizeRecommendations
  // would hand `kykar` to whichever ranks first and `kykar-2` to the other — so a
  // re-rank swaps their slugs, breaking every detail link and desynchronising the
  // two rank maps in Task 6. Slugs must follow oracleId, not rank.
  const canonical = [
    { oracleId: "id-1", slug: "kykar" },
    { oracleId: "id-2", slug: "kykar-2" },
  ];

  it("keeps each commander's slug when the free ranking reverses their order", () => {
    const scored = [{ oracleId: "id-2" }, { oracleId: "id-1" }];
    expect(carryCanonicalSlugs(scored, canonical)).toEqual([
      { oracleId: "id-2", slug: "kykar-2" },
      { oracleId: "id-1", slug: "kykar" },
    ]);
  });

  it("drops a commander the canonical list has never seen, rather than inventing a slug", () => {
    const scored = [{ oracleId: "id-1" }, { oracleId: "id-unknown" }];
    expect(carryCanonicalSlugs(scored, canonical)).toEqual([
      { oracleId: "id-1", slug: "kykar" },
    ]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/recs/free-ranking.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/recs/free-ranking.ts`:

```ts
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { decks } from "../../db/schema";
import { readEdhrecCache, type EdhrecFetchResult } from "../edhrec/client";
import { parseEdhrecPayload } from "../edhrec/parse";
import { type Availability } from "../decks/availability";
import { loadAvailability } from "../decks/availability-query";
import { synergyStateFrom } from "./synergy-state";
import {
  byScoreThenOracleId, loadCollectionPool, toListItem,
  type CommanderListItem, type RankedCommander,
} from "./recommend";
import { isCommanderCandidate, scoreCommander, type PoolCard } from "./score";

/**
 * The pool a player could build from right now. Hard claims subtract because a
 * card sleeved into a finished deck is physically unavailable; soft claims do
 * not, because a brew is a list, not a stack of sleeves. That asymmetry is the
 * whole point of the two severities.
 */
export function freePool(
  collection: PoolCard[],
  availability: Map<string, Availability>,
): PoolCard[] {
  return collection.filter((c) => {
    const a = availability.get(c.oracleId);
    return a === undefined || a.free > 0;
  });
}

/**
 * Attaches each item's canonical slug, matched on oracleId.
 *
 * Slugs must NOT be regenerated per ranking mode. `finalizeRecommendations`
 * assigns dedup suffixes in rank order, so two commanders sharing a slug base
 * would swap slugs when the order changes — breaking detail links and the two
 * rank maps. An item with no canonical entry is dropped rather than given an
 * invented slug that would 404.
 *
 * Generic over T so the unit test can pass bare `{ oracleId }` objects.
 */
export function carryCanonicalSlugs<T extends { oracleId: string }>(
  scored: T[],
  canonical: { oracleId: string; slug: string }[],
): (T & { slug: string })[] {
  const slugByOracleId = new Map(canonical.map((c) => [c.oracleId, c.slug]));
  return scored.flatMap((s) => {
    const slug = slugByOracleId.get(s.oracleId);
    return slug ? [{ ...s, slug }] : [];
  });
}

/**
 * Ranks the same candidate set against the free pool.
 *
 * Reads the EDHREC cache but never the network. The "everything I own" list has
 * already been computed by getRankedList before this runs, so the cache is warm
 * by construction; a candidate missing from it scores with a null fitSynergy
 * rather than triggering a second fanout. `ok: false` means the availability
 * read failed — the caller must then disable the toggle rather than serve
 * scores identical to the other mode.
 *
 * `canonical` is the "everything I own" list. It is the ONLY source of slugs:
 * see the slug-stability note above. A candidate absent from it (possible if the
 * persisted list is a generation behind the collection) is dropped rather than
 * given an invented slug that would 404 on click.
 */
export async function rankFree(
  userId: string,
  canonical: CommanderListItem[],
): Promise<{ items: CommanderListItem[]; ok: boolean }> {
  let availability: Map<string, Availability>;
  try {
    availability = await loadAvailability(userId);
  } catch {
    return { items: [], ok: false };
  }

  const known = new Set(canonical.map((c) => c.oracleId));

  const { collection } = await loadCollectionPool(userId);
  const built = new Set(
    (await db.select({ oracleId: decks.commanderOracleId })
      .from(decks).where(eq(decks.userId, userId))).map((d) => d.oracleId),
  );

  // Candidacy is a property of the collection, not of the pool: a commander you
  // own but have sleeved is still a commander you could unsleeve. Only the pool
  // it is SCORED against shrinks.
  const candidates = collection.filter(
    (c) =>
      isCommanderCandidate(c) && !built.has(c.oracleId) && known.has(c.oracleId),
  );
  const pool = freePool(collection, availability);

  const cache = await readEdhrecCache(candidates.map((c) => c.oracleId));
  const scored = candidates.map((commander) => {
    const cached = cache.get(commander.oracleId);
    // The row holds unparsed JSON, so it has to go through parseEdhrecPayload
    // before it has topCards. `unreachable` is false even on a miss: a miss here
    // is an absence, not an outage — the canonical list already resolved this
    // same candidate set, so anything reachable is already cached.
    const result: EdhrecFetchResult = {
      data: cached ? parseEdhrecPayload(cached.payload) : null,
      unreachable: false,
    };
    return {
      ...scoreCommander({
        commander, collection: pool, edhrecTopCards: result.data?.topCards ?? null,
      }),
      synergyState: synergyStateFrom(result),
    };
  });
  scored.sort(byScoreThenOracleId);

  const ranked: RankedCommander[] = carryCanonicalSlugs(scored, canonical);
  return { items: ranked.map(toListItem), ok: true };
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run src/lib/recs/free-ranking.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 5: Wire it into the page — MOVED TO TASK 6 (amended 2026-08-31, mid-run)**

`freeItems` and `availOk` have no consumer until Task 6 widens `CommandersView`'s props, so
wiring them here would either fail typecheck or add two props the component accepts and
ignores. The page edit below is unchanged in substance; it just lands in Task 6's commit
alongside the component that reads it. Task 5 therefore ships `free-ranking.ts` and its
tests, and modifies no page.

In `src/app/commanders/page.tsx`, read `searchParams.avail` and call `rankFree` **only** when it is `"free"`, so a player who never touches the toggle pays nothing. `rankFree` runs **after** `getRankedList`, both because it needs the canonical list for slugs and because that ordering is what guarantees the EDHREC cache is warm:

**`CommandersPage` currently takes no props at all** (`page.tsx:15`: `export default async function CommandersPage()`). Add the `searchParams` prop — in Next 16 it is a Promise:

```tsx
export default async function CommandersPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
```

Then, after the existing `getRankedList` call (**reuse its result — it is `cache()`-wrapped, but do not call it twice for clarity's sake; bind the real property name, which is `items`**):

```tsx
const avail = (await searchParams).avail === "free" ? "free" : "all";
const free = avail === "free" ? await rankFree(userId, list.items) : null;
```

Use whatever local name the existing `getRankedList(userId)` result is already bound to in this file rather than introducing a second one.

Pass `freeItems={free?.items ?? null}` and `availOk={free?.ok ?? true}` to `CommandersView`.

**Check the real property name** on `getRankedList`'s return before writing that call — it is `{ items, degraded, uniqueCardsRead, candidateCount }` in `src/lib/recs/ranked-list.ts`, and `getRankedList` is `cache()`-wrapped, so calling it again in the same request is free rather than a second compute.

- [ ] **Step 6: Gate and commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`

```bash
git add src/lib/recs/free-ranking.ts src/lib/recs/free-ranking.test.ts src/lib/recs/free-ranking-wiring.test.ts
git commit -m "feat(availability): rank commanders against what's free (#43)"
```

---

## Task 6: The commanders list — toggle, two rank maps, receipt, delta

**Files:**
- Create: `src/lib/commanders/rank-maps.ts`
- Create: `src/lib/commanders/rank-maps.test.ts`
- Modify: `src/components/commanders/commanders-view.tsx:28-45,78-115,300-310,452`
- Modify: `src/components/commanders/rec-card.tsx`

**Files (amended 2026-08-31):** also `src/app/commanders/page.tsx` — Task 5 Step 5 moved
here, because `freeItems` and `availOk` have no consumer until this task's props exist.

**Interfaces:**
- Consumes: `rankFree` (Task 5); `availabilityCopy.ranking` and `.receipt` (Task 2).
- Produces: `rankMap(items): Map<string, number>`.

**The three rulings this task implements, and why they are not negotiable:**

1. **The numeral recomputes under `What's free`.** The shipped invariant at `commanders-view.tsx:90-95` says filtering must never renumber — and it survives, because that invariant is about *filtering*, which changes no score. `Score against` changes the score itself. Frozen numerals would render `3, 4, 1, 2` down the page: a list whose numbers contradict its own order.
2. **Both maps are global, built before any colour filter.** So `filtering never renumbers` holds verbatim in both modes, and a filtered list shows `2, 3, 4` with a gap where rank 1 was.
3. **Flipping the toggle resets the reveal window.** Same class of event as a colour-filter change (`:111`), because different cards occupy the revealed range. Keeping `shown = 50` would hand the player fifty different commanders with no signal the set had changed.

- [ ] **Step 1: Write the failing rank-map test**

Create `src/lib/commanders/rank-maps.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { rankMap } from "./rank-maps";

describe("rankMap", () => {
  it("numbers the full candidate set from 1 in list order", () => {
    const m = rankMap([{ slug: "a" }, { slug: "b" }, { slug: "c" }]);
    expect([...m.entries()]).toEqual([["a", 1], ["b", 2], ["c", 3]]);
  });

  // The invariant that survives the re-rank: the map is built over EVERYTHING,
  // so a filtered render shows 2, 3, 4 with a gap where rank 1 was hidden.
  it("is independent of any filter applied afterwards", () => {
    const all = [{ slug: "a" }, { slug: "b" }, { slug: "c" }];
    const m = rankMap(all);
    const filtered = all.filter((x) => x.slug !== "a");
    expect(filtered.map((x) => m.get(x.slug))).toEqual([2, 3]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/commanders/rank-maps.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/lib/commanders/rank-maps.ts`:

```ts
/**
 * Global rank over the full candidate set, in the given order. Built BEFORE any
 * colour filter, which is what keeps the shipped `filtering never renumbers`
 * invariant true in both ranking modes — a filter hides rows and leaves a gap in
 * the numerals rather than closing it.
 *
 * Two of these exist per page, one per `Score against` mode. Which is in play
 * follows ?avail=.
 */
export function rankMap(items: { slug: string }[]): Map<string, number> {
  return new Map(items.map((r, i) => [r.slug, i + 1]));
}
```

- [ ] **Step 4: Run and watch it pass**

Run: `pnpm vitest run src/lib/commanders/rank-maps.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the toggle to `CommandersView`**

**First, fix `serializeParams` — the plan's earlier draft got this wrong and it is a silent data-loss bug.** The real signature is `serializeParams(colors: string[])` (`commanders-view.tsx:33`), and `:79-83` runs it in a `useEffect` on every `colors` change:

```tsx
useEffect(() => {
  const qs = serializeParams(colors);
  router.replace(`/commanders${qs}`, { scroll: false });
}, [colors, router]);
```

As written, **the next colour toggle would drop `?avail=free` from the URL** and the server would re-render in `all` mode. Widen the function and the effect together:

```tsx
function serializeParams(colors: string[], avail: "all" | "free"): string {
  const p = new URLSearchParams();
  if (colors.length > 0) p.set("c", colors.join(""));
  // Only the non-default is written, so a player who never touches the toggle
  // keeps the URL they have today.
  if (avail === "free") p.set("avail", "free");
  const s = p.toString();
  return s ? `?${s}` : "";
}
```

and make the effect depend on `avail` too. **One important asymmetry:** the colours effect uses `router.replace` because filtering is client-side and needs no RSC refetch. Flipping `avail` **does** need the server — `rankFree` runs there — so that transition must be `router.push`, not `replace`. Do not fold them into one call.

Then replace the single `rankBySlug` at `:90-95` with a mode-selected map, and add the `avail` state mirroring the existing `colors` pattern (`parseColors` at `:28`):

```tsx
// Two rank maps, each built once over the full candidate set from that mode's
// base ordering. Both are pre-filter, so filtering still never renumbers.
const rankAll = useMemo(() => rankMap(results), [results]);
const rankFree = useMemo(() => (freeItems ? rankMap(freeItems) : null), [freeItems]);
const active = avail === "free" && freeItems ? freeItems : results;
const rankBySlug = avail === "free" && rankFree ? rankFree : rankAll;
```

Render the segmented control with `availabilityCopy.ranking.label` (`Score against`), `.all` and `.free`. **Do not shorten the label to "Availability"** — it does the anti-collision work against the builder's `Owned only`, which is a *collection* filter and a different question.

- [ ] **Step 6: Reset the window on flip and announce**

In the `avail` change handler, mirror `toggleColor` at `:111`:

```tsx
function setAvail(next: "all" | "free") {
  // The window is a property of the current result set, not of the session, and
  // a re-rank means different cards occupy the revealed range.
  setShown(REVEAL_STEP);
  // push, not replace: this transition needs the server, because rankFree runs
  // there. The colours effect stays on replace.
  router.push(`/commanders${serializeParams(colors, next)}`);
}
```

Announce on the page's existing live region using `availabilityCopy.ranking.announce(mode, n)` — one region per page, not one per surface.

- [ ] **Step 7: Receipt line and delta in `rec-card.tsx`**

**Where the two numbers come from — neither exists on the payload, and neither needs a new query.** `rankFree` returns `CommanderListItem[]`, which carries no in-use count and no "other score". Both are derived **on the client**, by joining the two arrays on `oracleId` (which `CommanderListItem` carries, `recommend.ts:20`):

```tsx
// The all-mode item for the same commander. Both arrays are already on the
// client, so this is a join, not a fetch.
const allByOracleId = useMemo(
  () => new Map(results.map((r) => [r.oracleId, r])),
  [results],
);
```

- **`inUse` is computed directly from the availability map, NOT from the two-run difference.**
  An earlier revision of this plan derived it as `allItem.colorPoolSize - freeItem.colorPoolSize`,
  which is arithmetically correct but forces the whole free ranking to exist before the clause
  can render — and that is what made the clause look like it had to be `What's free`-only.
  It does not. Count the commander's fitting owned cards whose availability is `hard` or `over`:

  ```ts
  const inUse = pool.filter((c) => {
    const a = availability.get(c.oracleId);
    if (!a) return false;
    const s = availabilityState(a);
    return s === "hard" || s === "over";
  }).length;
  ```

  One `loadAvailability(userId)` call for the page, shared across all 24 commanders, no
  second scoring pass and no EDHREC fanout. `rankFree` is not on this path.
- **`was`** is `allItem.score`; **`drop`** is `allItem.score - freeItem.score`. These two *do*
  require the free ranking, so **the delta stays `What's free`-only** — it is a statement about
  a re-rank and has nothing to say before one has happened.

**The receipt's second clause renders in both modes, and Design drew it that way.** Canvas
state A of `The 99 - Card Availability.dc.html` is labelled *"Everything I own (default)"* and
its rows read `34 of your cards fit · 12 already in use`. There is no open question here; the
earlier "flag this to Design" note in this plan was answering a cost objection that the
derivation above removes.

The receipt line **always renders**; only the second clause is conditional, so row height never changes between players. Use `receipt.fit` / `receipt.fitFree` for the first clause and append `receipt.inUse` with `' · '` when `inUse > 0`.

The delta renders in `free` mode only, and only where the score moved: `receipt.deltaFrom(drop, was)` → `↓21 from 82`, with `receipt.deltaAria` as the accessible form. It compares a card to **its own other score**, never to another row, so it is window-independent by construction — correct at rank 3 or rank 200, revealed or not.

Do not change the `40/100/1fr/236` grid (`rec-card.tsx:3`) or the fit bar. The receipt is an added line in the evidence column, not a reshape.

- [ ] **Step 8: Verify in the browser**

Run `pnpm dev`. At 1300px and 390px:
- Flip `Score against` → order changes, numerals renumber, the list returns to the first batch, the live region announces.
- Apply a colour filter → numerals **do not** renumber; a gap appears where a filtered-out rank was.
- Confirm `Order: Fit ↓ · fixed` still reads true — the order *rule* is unchanged in both modes; what changed is the measurement.
- Confirm the desktop toolbar is now three controls wide and still fits at 1300px. **This is the row most likely to break first at a narrow desktop width.**

- [ ] **Step 9: Gate and commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`

```bash
git add src/lib/commanders src/components/commanders
git commit -m "feat(availability): Score against toggle, two rank maps, and the delta (#43)"
```

---

## Task 7: The degraded read

**Files:**
- Modify: `src/components/commanders/degraded-banner.tsx`
- Modify: `src/components/commanders/commanders-view.tsx`
- Test: `src/components/commanders/degraded-banner.test.tsx`

**Interfaces:**
- Consumes: `availOk` (Task 5); `availabilityCopy.degraded` (Task 2).
- Produces: `<DegradedBanner variant="synergy" | "availability" | "both" />`.

**The rule, plainly: a banner is owed wherever the failure changes what a control means. Nowhere else.** On `/commanders` a silent fallback would leave `What's free` selectable and produce scores identical to `Everything I own` — the player would read "nothing you own is committed" from a network error. So the free segment is **disabled and struck**, selection reverts to `Everything I own`, and `?avail=free` is honoured again after a successful retry. On the builder surfaces (Task 4) the failure stays genuinely quiet, because nothing there changes meaning.

- [ ] **Step 1: Write the failing test**

Create `src/components/commanders/degraded-banner.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DegradedBanner } from "./degraded-banner";

describe("DegradedBanner", () => {
  it("keeps the shipped synergy copy unchanged", () => {
    render(<DegradedBanner variant="synergy" />);
    expect(screen.getAllByText("Synergy data unavailable").length).toBeGreaterThan(0);
  });

  it("says what is unavailable when the deck read failed", () => {
    render(<DegradedBanner variant="availability" />);
    expect(screen.getAllByText(/can’t see your decks right now/).length).toBeGreaterThan(0);
  });

  // Two failures, one banner. Never two stacked.
  it("folds both failures into a single banner with one Retry", () => {
    render(<DegradedBanner variant="both" />);
    expect(screen.getAllByText(/Synergy data and deck contents are both unavailable/).length)
      .toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Retry/ })).toHaveLength(2); // mobile + desktop
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/commanders/degraded-banner.test.tsx`
Expected: FAIL — `DegradedBanner` takes no props.

- [ ] **Step 3: Generalise the banner**

Add a `variant` prop defaulting to `"synergy"` so every existing call site is untouched. Keep the amber left border, the ring, the mobile/desktop split and the `retryRecs` form exactly as they are.

**There are four shipped strings here, not two.** The mobile and desktop branches carry *different* body copy (`degraded-banner.tsx:37-38` vs `:88-90`), and the mobile button reads **"Retry"** while `availabilityCopy.degraded.retry` is **"Retry now"**. Sourcing the mobile button from the copy block would silently change shipped mobile text as a side effect of this ticket. Either keep the existing per-width strings for the `"synergy"` variant untouched and use the copy block only for the two new variants, or change the mobile button deliberately and say so in the PR — do not do it by accident.

- [ ] **Step 4: Disable the free segment**

In `CommandersView`, when `availOk === false`: render the `What's free` segment `disabled` with a line-through, set `aria-label` from `availabilityCopy.degraded.segmentDisabledAria`, and force the active mode back to `all`.

- [ ] **Step 5: Run tests, gate, commit**

Run: `pnpm vitest run src/components/commanders && pnpm typecheck && pnpm lint`

```bash
git add src/components/commanders
git commit -m "feat(availability): a failed deck read disables What's free, quietly elsewhere (#43)"
```

---

## Task 8: Commander detail disclosure and the deck-detail roll-up

**Files:**
- Modify: `src/components/commanders/detail.tsx` (rendered by `src/app/commanders/[slug]/page.tsx:46`, which gets its data from `scoreOneCommander`)
- Modify: `src/app/commanders/[slug]/page.tsx` — attach availability to the detail payload
- Modify: `src/components/decks/builder-spine.tsx` (`BuilderSpine`, the deck header — there is no `deck-header.tsx`)
- Test: `src/components/commanders/detail.test.tsx`, `src/components/decks/builder-spine.test.tsx`

**Interfaces:**
- Consumes: `loadAvailability`, `availabilityState` (Task 1); `availabilityCopy.detail`, `.deckSummary` and `.deckRollup` (Task 2).
- Produces: no new exports. `BuilderSpine` gains two props: `overCommitted: number`, `softClaimed: number`.

> **Read this before starting — Task 8 has an unresolved data dependency that the other seven do not.**
>
> The disclosure needs to say *which* of a commander's matching cards are in use, and to split or filter a list by that. But the detail page does not have the identity to join on. `detail.tsx` renders `overlapOwned` (`:405,590,696`), which is an array of **EDHREC card names — strings**, and `colorPoolSize`, which is a **bare number**. Neither carries an `oracle_id`, and availability is keyed on `oracle_id`. Joining on name is not acceptable: names are not unique keys in this app and the whole feature is about counting specific printings' worth of a card.
>
> So Task 8 Step 3 requires a **prior step that does not exist yet**: `scoreOneCommander` must return the identity-fitting owned cards as `{oracleId, name}[]`, not just a count and a name list. That is a change to `src/lib/recs/recommend.ts:192+` and to `CommanderScore`. Scope it as **Step 0 below** and expect it to be the largest part of this task.
>
> `detail.tsx` is also a **server component** (no `"use client"` on line 1), so the `aria-expanded` disclosure must be a new small client child rather than state added in place.

- [ ] **Step 0: Give the detail page something to join on**

Extend `scoreOneCommander`'s return so the detail payload carries the fitting owned cards with their oracle_ids. Then call `loadAvailability(userId)` in `src/app/commanders/[slug]/page.tsx` and attach per-card availability before rendering. Only once this lands do the remaining steps have data.

- [ ] **Step 1: Write the failing tests**

Both test files need helpers that **do not exist yet**: `builder-spine.test.tsx` has not been created at all, and `detail.test.tsx` exposes a `commander(overrides)` fixture builder, not a `renderDetail`. Write the tests against the real fixtures in those files. The repo has **no `@testing-library/user-event`** — use `.click()` inside `act`, matching `decklist-row.test.tsx:59`.

```tsx
// src/components/decks/builder-spine.test.tsx (new file — model the setup on
// an existing component test such as role-counter-strip.test.tsx).

it("shows no summary line when nothing is over-committed", () => {
  render(<BuilderSpine {...spineProps} overCommitted={0} />);
  expect(screen.queryByText(/spoken for twice/i)).toBeNull();
});

it("states the shortfall without offering a dismiss or a retry", () => {
  render(<BuilderSpine {...spineProps} overCommitted={2} />);
  expect(screen.getByText(/2 cards/)).toBeInTheDocument();
  // Not an error state: no dismiss, no retry, no icon.
  expect(screen.queryByRole("button", { name: /dismiss|retry/i })).toBeNull();
});
```

```tsx
// src/components/commanders/detail.test.tsx — extend the existing
// `commander(overrides)` fixture with the new in-use fields.

it("reaches the in-use cards through a real button, not a div", () => {
  render(<CommanderDetail commander={commander({ inUse: 12 })} rank={1} isBestFit />);
  const toggle = screen.getByRole("button", { name: /in use/i });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(toggle).toHaveAttribute("aria-controls");
});

// "Do not assert physical location" is a locked constraint, and the copy file
// flags this sentence as the one most likely to drift.
it("describes lists, never boxes or binders", async () => {
  render(<CommanderDetail commander={commander({ inUse: 12 })} rank={1} isBestFit />);
  await act(async () => {
    screen.getByRole("button", { name: /in use/i }).click();
  });
  expect(screen.getByText(/you'd be taking them out of something/i)).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/\b(box|binder|sleeve|shelf)\b/i);
});

it("shows no disclosure for a player with nothing in use", () => {
  render(<CommanderDetail commander={commander({ inUse: 0 })} rank={1} isBestFit />);
  expect(screen.queryByRole("button", { name: /in use/i })).toBeNull();
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `pnpm vitest run src/components/commanders/detail.test.tsx src/components/decks/builder-spine.test.tsx`
Expected: FAIL — no disclosure button, no summary line.

- [ ] **Step 3: The disclosure**

On the commander detail page, the "cards you own that fit" list gains a count of how many are in use, and a **real button** with `aria-expanded` / `aria-controls` to reach them. Copy: `availabilityCopy.detail`. The expanded sentence describes **lists** — *"sleeved into decks you've finished… you'd be taking them out of something"* — and must never say box, shelf or binder. Flagged in the copy file as the sentence most likely to drift.

**One structural delta between widths, and it is deliberate:** desktop **splits** the list into `Free to build with — N` and `In use — N` sections; phone **filters** to `Showing the N in use` with a `show all N` escape. Announce the new count on the page's existing live region.

The disclosure is the only interactive thing this pass adds: **44px tap target on phone.**

- [ ] **Step 4: The deck roll-up — one region, up to two lines, fixed severity order**

Addendum 2 §5. This supersedes the single over-committed line an earlier revision of this plan
specified; that line is now the first of two, and its copy is unchanged.

The region is a `<section aria-label={availabilityCopy.deckRollup.regionAria}>` — "Card
commitments". **Not a live region, not an alert**: it is present on arrival and nothing
interrupts. A deck with neither count above zero renders **no region at all**, not an empty one.

**Order is fixed, never sorted by count.** Over-committed always above soft, even at 1 over and
40 soft. The severity ladder is the marker's own hollow → solid → doubled progression read
vertically.

```tsx
// src/components/decks/builder-spine.tsx
const rollup = availabilityCopy.deckRollup;

{(overCommitted > 0 || softClaimed > 0) && (
  <section aria-label={rollup.regionAria} className="flex flex-col gap-[8px]">
    {overCommitted > 0 && (
      <p style={{ background: "var(--surface-rail)", borderLeft: "2px solid #C6533F" }}>
        {rollup.overHeading(overCommitted)}
      </p>
    )}
    {softClaimed > 0 && (
      <p style={{ color: "#C6B79A", borderLeft: "2px solid #4A4033" }}>
        {/* "more" is load-bearing: the counts are disjoint, so it does the
            arithmetic for the player instead of making them add 1 and 12. */}
        {overCommitted > 0
          ? rollup.softHeadingAfterOver(softClaimed)
          : rollup.softHeading(softClaimed)}
        {" "}
        {overCommitted > 0 ? rollup.softBodyShort : rollup.softBody}
      </p>
    )}
  </section>
)}
```

**`softClaimed` is pre-99 only.** Compute it as the number of this deck's cards in the `soft`
state *from this deck's own vantage* — so it consumes the same `loadAvailability(userId,
{ excludeDeckId: deck.id })` map Task 4 already loads for the decklist rows, with no second
query. Once the deck reaches 99 it turns `Playable`, its own claims go hard, and the soft count
falls to zero on its own. **Do not add a size check** — the arithmetic already exits, and a
manual `if (built < 99)` would be a second maturity threshold competing with `statusPill()`.

Neither line is an error: no dismiss, no retry, no icon-in-a-circle. `availabilityCopy` is
straight-with-a-shrug throughout — *"Nothing's broken here — it's a shopping decision."*

Add to Step 1's `builder-spine.test.tsx`:

```tsx
it("renders no region at all for a deck with nothing contested", () => {
  render(<BuilderSpine {...spineProps} overCommitted={0} softClaimed={0} />);
  expect(screen.queryByRole("region", { name: /card commitments/i })).toBeNull();
});

it("leads with the red line even when the soft count is far larger", () => {
  render(<BuilderSpine {...spineProps} overCommitted={1} softClaimed={40} />);
  const region = screen.getByRole("region", { name: /card commitments/i });
  const text = region.textContent ?? "";
  expect(text.indexOf("spoken for twice")).toBeLessThan(text.indexOf("in other brews"));
});

// The disjointness proof: "more" only appears when there is something to be more than.
it("says 'more' only when the over-committed line is also showing", () => {
  const { rerender } = render(<BuilderSpine {...spineProps} overCommitted={1} softClaimed={12} />);
  expect(screen.getByText(/12 more are in other brews too/)).toBeInTheDocument();
  rerender(<BuilderSpine {...spineProps} overCommitted={0} softClaimed={12} />);
  expect(screen.getByText(/12 cards here are in other brews too/)).toBeInTheDocument();
});
```

- [ ] **Step 5: Verify at both widths**

Confirm the desktop split and the phone filter, that a player with no commitments sees neither the disclosure nor the summary, and that nothing animates.

- [ ] **Step 6: Gate and commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`

```bash
git commit -m "feat(availability): commander detail disclosure and the over-committed summary (#43)"
```

---

## Task 9: The marker on `/collection` — rows, tiles, card detail

**Files:**
- Modify: `src/lib/collection/browse.ts:20-58` (`BrowseCard`)
- Modify: `src/app/collection/page.tsx:44-51`
- Modify: `src/components/collection/rows-view.tsx:30-75`
- Modify: `src/components/collection/grid-view.tsx:26-53`
- Modify: `src/components/collection/card-modal.tsx:350-365`
- Test: `src/components/collection/rows-view.test.tsx` (create)
- Test: `src/components/collection/grid-view.test.tsx` (create)

**Interfaces:**
- Consumes: `Availability`, `availabilityState`, `MATURE_DECK_SIZE` (Task 1, `src/lib/decks/availability.ts`); `loadAvailability` (Task 1, `src/lib/decks/availability-query.ts`); `AvailabilityMarker`, `markerAria`, `MarkerOpts` (Task 3, `src/components/ui/availability-marker.tsx`); `availabilityCopy.collection.*` (Task 2, `src/lib/copy/availability.ts`).
- Produces: `BrowseCard.availability?: Availability | null`, and the `AvailabilityDetail` block inside `card-modal.tsx`.

Addendum 2 §1–§3. `/collection` is the **count-only** vantage: rows and tiles pass `nameless`, so a committed card reads `0 free` rather than `0 free — in Atraxa`. The deck name appears in exactly one place on this surface, the card-detail modal. Nothing here ever passes `selfExcluded` — Addendum 2 §6, *"the marker is relative to where you stand, and only a decklist is somewhere to stand"*, and `/collection` is not a decklist.

The aggregate is **joined once for the page, not per row** (Addendum 2, Implementation notes). `loadAvailability` runs in the page's existing `Promise.all` and is attached to the cards before they cross into the client browser. A `Map` cannot cross the RSC boundary as a prop, so it is flattened onto each card server-side.

Both grid templates ship **unchanged** — `[grid-template-columns:38px_40px_1fr_auto]` and `md:[grid-template-columns:52px_54px_1fr_150px_92px_18px]`. The marker lives inside the existing `1fr` name cell, and the row height does not move: the marker is `flex: none` and the name is the half that gives way.

- [ ] **Step 1: Widen `BrowseCard`**

In `src/lib/collection/browse.ts`, add to the `BrowseCard` type, alongside `quantity`:

```ts
  /**
   * Optional, not `| null` required — same call as DeckDetailCard in Task 4.
   * `loadBrowseCards` does not set it (the aggregate is joined in the page, not
   * in this query), and the browse fixtures across browse.test.ts, no-results
   * and card-modal build BrowseCard literals that have no availability to give.
   * "Absent" and "read failed" both correctly render nothing.
   */
  availability?: Availability | null;
```

and at the top of the file:

```ts
import type { Availability } from "../decks/availability";
```

`availability.ts` is the pure module and imports no db — safe for a file the client bundles.

- [ ] **Step 2: Thread the aggregate through the page**

In `src/app/collection/page.tsx`, extend the existing `Promise.all` and attach per oracle:

```ts
  const [stats, cards, lastUpdated, ownedSets, availability] = await Promise.all([
    getCollectionStats(userId),
    loadBrowseCards(userId),
    getCollectionLastUpdated(userId),
    // Set names + release dates for the Set ▾ panel (#86).
    loadOwnedSetMeta(userId),
    // One aggregate for the whole page — never per row (Addendum 2).
    // Quiet failure: /collection shows no banner, the markers simply do not
    // appear and the Availability ▾ trigger disables (Task 10).
    loadAvailability(userId).catch(() => null),
  ]);

  // Flattened onto the cards here: a Map cannot cross the server/client
  // boundary as a prop, and every consumer below wants one card's entry.
  const cardsWithAvailability = cards.map((c) => ({
    ...c,
    availability: availability?.get(c.oracleId) ?? null,
  }));
```

with the import:

```ts
import { loadAvailability } from "../../lib/decks/availability-query";
```

and pass it down, adding the degraded flag Task 10 consumes:

```tsx
      <CollectionBrowser
        cards={cardsWithAvailability}
        ownedSets={ownedSets}
        availabilityOk={availability !== null}
      />
```

Add `availabilityOk: boolean` to `CollectionBrowser`'s props in `src/components/collection/browser.tsx` and leave it unused this task — Task 10 wires it to the filter trigger.

- [ ] **Step 3: Write the failing rows test**

Create `src/components/collection/rows-view.test.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Availability } from "../../lib/decks/availability";
import type { BrowseCard } from "../../lib/collection/browse";
import { RowsView } from "./rows-view";

const card: BrowseCard = {
  oracleId: "o1",
  name: "Smothering Tithe",
  typeLine: "Enchantment",
  manaCost: "{3}{W}",
  oracleText: "",
  keywords: [],
  rarity: "rare",
  colorIdentity: ["W"],
  imageUri: null,
  quantity: 1,
  printings: [],
  setCodes: ["RVR"],
  primarySetCode: "RVR",
  preferredPrinting: null,
};

const avail = (
  owned: number,
  hard: number,
  soft = 0,
  hardDeckNames: string[] = [],
): Availability => ({ owned, hard, soft, free: owned - hard, hardDeckNames });

function renderRows(c: BrowseCard) {
  return render(
    <RowsView cards={[c]} totalCards={1} onShowMore={() => {}} onOpen={() => {}} />,
  );
}

describe("RowsView availability marker", () => {
  // The single most important assertion in the feature: three of five rows in
  // any real collection are free, and a free row must be untouched.
  it("renders nothing at all for a free card", () => {
    renderRows({ ...card, quantity: 2, availability: avail(2, 0) });
    expect(screen.queryByText(/free|in a brew|short/)).toBeNull();
  });

  it("renders nothing when the availability read failed", () => {
    renderRows({ ...card, quantity: 2, availability: null });
    expect(screen.queryByText(/free|in a brew|short/)).toBeNull();
  });

  it("is count-only — the deck name never reaches a collection row", () => {
    renderRows({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(screen.getByText("0 free")).toBeInTheDocument();
    expect(screen.queryByText(/Atraxa/)).toBeNull();
  });

  it("gives a free row exactly today's accessible name, with no clause", () => {
    renderRows({ ...card, availability: avail(1, 0) });
    expect(
      screen.getByRole("button", {
        name: "Smothering Tithe, Enchantment, 1 copy, RVR, rare",
      }),
    ).toBeInTheDocument();
  });

  it("appends the availability clause last on a committed row", () => {
    renderRows({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(
      screen.getByRole("button", {
        name: "Smothering Tithe, Enchantment, 1 copy, RVR, rare, no free copies",
      }),
    ).toBeInTheDocument();
  });
});
```

`markerAria(a, { nameless: true })` returns `"no free copies"` for the hard state (Task 3, Step 4) — that is the string the last assertion pins.

- [ ] **Step 4: Run it and watch it fail**

Run: `pnpm vitest run src/components/collection/rows-view.test.tsx`
Expected: FAIL — no accessible name on the row button at all (the button has no `aria-label` today), and `"0 free"` is not in the document.

- [ ] **Step 5: Render the row marker and the row label**

In `src/components/collection/rows-view.tsx`, import:

```ts
import { availabilityState } from "../../lib/decks/availability";
import { availabilityCopy } from "../../lib/copy/availability";
import { AvailabilityMarker, markerAria } from "../ui/availability-marker";
```

Replace the name-cell block with a flex pair. The name keeps `truncate min-w-0`; the marker is `shrink-0`, so the name is the half that gives way and the row height never moves:

```tsx
          {/* Name column — §Row: Name Column Container: min-width 0 */}
          <span className="min-w-0">
            {/* Name + availability marker share the line; Addendum 2 §1 puts the
                marker inline after the name, inside the existing 1fr cell, so
                neither grid template changes. */}
            <span className="flex items-center gap-[7px] md:gap-[9px] min-w-0">
              {/* §Row: Card Name — 14/15px 600, #EDE6D8 (--fg), ellipsis */}
              <span className="truncate min-w-0 text-[14px] md:text-[15px] font-semibold" style={{ color: "var(--fg)" }}>
                {c.name}
              </span>
              {c.availability && (
                // `nameless` — /collection is the count-only vantage. No
                // `selfExcluded`: there is no deck to stand in here.
                <span className="shrink-0">
                  <AvailabilityMarker availability={c.availability} density="row" nameless />
                </span>
              )}
            </span>
            {/* Mobile type line — §Row: Type Line (mobile): 11.5px, #8E8269 (--fg-faint), truncate */}
            <span className="block md:hidden truncate text-[11.5px]" style={{ color: "var(--fg-faint)" }}>
              {c.typeLine}
            </span>
          </span>
```

Then give the button its accessible name and the over-committed tint. Compute both above the JSX, inside the `cards.map` callback:

```tsx
      {cards.map((c) => {
        const state = c.availability ? availabilityState(c.availability) : "free";
        // Addendum 2 §1: over-committed "keeps its border tint and nothing
        // else". The tint is `--avail-over-border`, added in Task 2 Step 1 —
        // the same #6B3226 the R1 canvas already draws, so it is not a new hue.
        const border =
          state === "over"
            ? "[border:1px_solid_var(--avail-over-border)] hover:[border:1px_solid_var(--avail-over-border)]"
            : "[border:1px_solid_var(--border)] hover:[border:1px_solid_var(--border-strong)]";
        const setAndRarity = `${c.primarySetCode}, ${c.rarity}`;
        return (
          <button
            key={c.oracleId}
            type="button"
            onClick={() => onOpen(c.oracleId)}
            aria-label={availabilityCopy.collection.rowAria(
              c.name,
              c.typeLine,
              c.quantity,
              setAndRarity,
              // Clause lands LAST, and only when there is one — a free card
              // produces today's exact string, unchanged.
              (c.availability ? markerAria(c.availability, { nameless: true }) : null) ?? undefined,
            )}
            className={`grid items-center text-left rounded-lg gap-[10px] md:gap-[16px] py-[10px] md:py-[12px] px-[12px] md:px-[18px] md:cursor-pointer bg-[color:var(--surface)] hover:bg-[color:var(--surface-raised)] ${border} [grid-template-columns:38px_40px_1fr_auto] md:[grid-template-columns:52px_54px_1fr_150px_92px_18px]`}
          >
```

Close the callback with `);` + `})` instead of the current `))`.

- [ ] **Step 6: Run the rows test and watch it pass**

Run: `pnpm vitest run src/components/collection/rows-view.test.tsx`
Expected: PASS, all five.

- [ ] **Step 7: Write the failing tile test**

Create `src/components/collection/grid-view.test.tsx` with the same `card`/`avail` fixtures as Step 3 (copy them; the two files are read side by side and a shared fixture module for six lines is not worth the indirection):

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Availability } from "../../lib/decks/availability";
import type { BrowseCard } from "../../lib/collection/browse";
import { GridView } from "./grid-view";

const card: BrowseCard = {
  oracleId: "o1",
  name: "Smothering Tithe",
  typeLine: "Enchantment",
  manaCost: "{3}{W}",
  oracleText: "",
  keywords: [],
  rarity: "rare",
  colorIdentity: ["W"],
  imageUri: null,
  quantity: 1,
  printings: [],
  setCodes: ["RVR"],
  primarySetCode: "RVR",
  preferredPrinting: null,
};

const avail = (
  owned: number,
  hard: number,
  soft = 0,
  hardDeckNames: string[] = [],
): Availability => ({ owned, hard, soft, free: owned - hard, hardDeckNames });

function renderTiles(c: BrowseCard) {
  return render(
    <GridView cards={[c]} totalCards={1} onShowMore={() => {}} onOpen={() => {}} />,
  );
}

describe("GridView availability chip", () => {
  it("renders nothing at all for a free card", () => {
    renderTiles({ ...card, quantity: 2, availability: avail(2, 0) });
    expect(screen.queryByText(/free|in a brew|short/)).toBeNull();
  });

  it("renders nothing when the availability read failed", () => {
    renderTiles({ ...card, quantity: 2, availability: null });
    expect(screen.queryByText(/free|in a brew|short/)).toBeNull();
  });

  it("carries a count-only chip on a committed tile", () => {
    renderTiles({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(screen.getByText("0 free")).toBeInTheDocument();
    expect(screen.queryByText(/Atraxa/)).toBeNull();
  });

  it("leaves the set · rarity caption untouched", () => {
    renderTiles({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(screen.getByText("RVR · rare")).toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run it and watch it fail**

Run: `pnpm vitest run src/components/collection/grid-view.test.tsx`
Expected: FAIL on the two positive cases — `"0 free"` is not rendered. (The two "renders nothing" cases pass vacuously; they are the regression guard for Step 9, not the driver.)

- [ ] **Step 9: Render the tile chip**

In `src/components/collection/grid-view.tsx`, import `availabilityState` and `AvailabilityMarker` as in Step 5, then add the chip inside the `relative` art region — **top-left**, because top-right is the shipped brass quantity badge:

```tsx
            {/* Availability chip — Addendum 2 §2, top-left on the art. The
                quantity badge owns top-right. Count-only, same as the row. */}
            {c.availability && (
              <span className="absolute left-[5px] top-[5px] md:left-[6px] md:top-[6px]">
                <AvailabilityMarker availability={c.availability} density="chip" nameless />
              </span>
            )}
```

and apply the same over-committed tint to the tile, wrapping the `cards.map` body exactly as Step 5 did:

```tsx
        const border =
          state === "over"
            ? "[border:1px_solid_var(--avail-over-border)] hover:[border:1px_solid_var(--avail-over-border)]"
            : "[border:1px_solid_var(--border)] hover:[border:1px_solid_var(--brass)]";
```

The caption `{c.primarySetCode} · {c.rarity}` is **not** touched.

- [ ] **Step 10: Run the tile test and watch it pass**

Run: `pnpm vitest run src/components/collection/grid-view.test.tsx`
Expected: PASS, all four.

- [ ] **Step 11: The card-detail clause — the one place the deck name appears**

In `src/components/collection/card-modal.tsx`, add a block component below `OracleText`'s definition:

```tsx
function AvailabilityDetail({ card }: { card: BrowseCard }) {
  if (!card.availability) return null;
  const state = availabilityState(card.availability);
  if (state === "free") return null;
  const c = availabilityCopy.collection;
  const note =
    state === "hard" ? c.detailHardNote : state === "soft" ? c.detailSoftNote : c.detailOverNote;
  return (
    // Mirrors the oracle-text block's chrome so the two read as one column.
    <div
      className="rounded-[10px] mt-[16px] md:mt-[22px] p-[14px_16px] md:p-[18px_20px]"
      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
    >
      <div
        className="font-mono text-[10px] tracking-[0.1em] uppercase"
        style={{ color: "var(--fg-faint)" }}
      >
        {c.detailHeading}
      </div>
      <div className="mt-[8px] flex items-center gap-[8px] text-[13px]" style={{ color: "var(--fg-body)" }}>
        <span className="font-mono" style={{ color: "var(--brass)" }}>×{card.quantity}</span>
        <span aria-hidden style={{ color: "var(--fg-faint)" }}>·</span>
        {/* No `nameless` here — this is the ONE place on /collection that names
            the claiming deck ("0 free — in Atraxa"). Still no `selfExcluded`. */}
        <AvailabilityMarker availability={card.availability} density="row" />
      </div>
      <p className="m-0 mt-[8px] text-[12.5px] leading-[1.5]" style={{ color: "var(--fg-muted)" }}>
        {note}
      </p>
    </div>
  );
}
```

Render it directly after the oracle-text block, before the mobile meta grid:

```tsx
            <AvailabilityDetail card={card} />
```

**The claiming deck's status pill is not rendered, and it must not be faked.** Addendum 2 §3 draws `×1 · ◆ 0 free — in Atraxa [Complete]`. `Availability.hardDeckNames` is `string[]` — names only — and `statusPill()` needs that deck's `built` / `ownedCount` / `unresolvedCount`, none of which the aggregate carries. Deriving "Complete" from `hard > 0` would be a guess that reads as fact. Shipping the clause without the pill is honest and complete on its own. **Unblocking it is a Task 1 change**: widen `hardDeckNames` to `{ name: string; pill: StatusPill }[]`, which ripples through `markerAria` and every marker caller — out of scope here, and flagged to the design/eng thread rather than improvised.

- [ ] **Step 12: Run the gate**

Run: `pnpm vitest run src/components/collection src/lib/collection && pnpm typecheck && pnpm lint`
Expected: PASS. The `browse.test.ts` fixtures compile unchanged because `availability` is optional.

- [ ] **Step 13: Verify in the browser at both widths**

Run `pnpm dev`, sign in, open `/collection` with at least one card in a 99-card deck. At 390px and 1300px confirm: most rows carry nothing; a committed row reads `0 free` with no deck name; the row height is identical to a free row above it; a long card name truncates while the marker stays whole; the tile chip sits top-left and the brass `×N` badge top-right; an over-committed row and tile carry the border tint and nothing else; opening that card shows `In your collection`, `×N · 0 free — in <deck>`, and the note.

- [ ] **Step 14: Commit**

```
git add src/lib/collection/browse.ts src/app/collection/page.tsx src/components/collection/browser.tsx src/components/collection/rows-view.tsx src/components/collection/grid-view.tsx src/components/collection/card-modal.tsx src/components/collection/rows-view.test.tsx src/components/collection/grid-view.test.tsx
git commit -m "feat(collection): availability marker on rows, tiles and card detail (#43)"
```

---

## Task 10: The `Availability ▾` filter on `/collection`

**Files:**
- Create: `src/lib/collection/availability-filter.ts`
- Create: `src/lib/collection/availability-filter.test.ts`
- Create: `src/components/collection/availability-glyph.tsx`
- Create: `src/components/collection/chip-row.test.tsx`
- Modify: `src/lib/collection/browse.ts:60-71` (`BrowseFilters`), `:319-340` (`filterCards`)
- Modify: `src/lib/copy/collection.ts` (add the `availability` FilterPanelCopy block)
- Modify: `src/components/ui/filter-panel.tsx:35-56, 88-130, 460-500, 786-795`
- Modify: `src/components/collection/filter-bar.tsx`
- Modify: `src/components/collection/browser.tsx`
- Modify: `src/components/collection/chip-row.tsx`
- Test: `src/components/ui/filter-panel.test.tsx` (extend)

**Interfaces:**
- Consumes: `Availability`, `availabilityState`, `AvailabilityState` (Task 1); `availabilityCopy.collection.*` and `availabilityCopy.degraded.collectionFilterDisabledAria` (Task 2); `BrowseCard.availability` and `availabilityOk` (Task 9); `FilterPanel`, `FilterPanelOption` (shipped).
- Produces: `BrowseFilters.availability?: AvailabilityState[]`, `buildAvailabilityOptions`, `parseAvailabilityParam`, `serializeAvailability`, `AvailabilityGlyph`, and the `?avail=` URL param.

Addendum 2 §4. A fifth `FilterPanel`, wired exactly as `Type ▾` is: multi-select, no search, counts on. Four options — `Free` / `Wanted by a brew` / `In use` / `Over-committed` — whose counts partition the collection and therefore sum to its total. **Nothing defaults on.** A zero-count option stays in the list `aria-disabled`, never removed, same as `Type ▾`.

Two counting rules differ from `Set ▾` / `Type ▾` deliberately. Counts here are **distinct cards, not summed quantities**: availability is classified once per `oracle_id`, and the addendum's own arithmetic is per-card — *"availability for 1,418 **unique** cards"*, *"a 1,418-**row** scroll"*, and `1,186 + 168 + 61 + 3 = 1,418`. Summed quantities would not partition to that number. And the options AND with the other filters while ORing internally, the `types`/`setCodes` shape.

**Do not change the shipped result-count copy.** The addendum draws `Showing 61 of 1,418`, but `chip-row.tsx:48-50` renders `Showing <resultCount> of <totalQuantity>` whenever any filter is active — `totalQuantity` being the sum of quantities, the `2,933` in the shipped design copy, not the `1,418` unique total. The numerator already agrees (`resultCount` is `sorted.length`, one per card, so `In use` really does show `61`); only the denominator differs, and it differs because the addendum's fixture collection happens to be drawn with the unique figure in that slot. Addendum 2 changes no result-count copy and says so — *"no grid changes on either collection view"*, chips *"reuse the shipped chip row"*. Leave `chip-row.tsx`'s two count variants exactly as they are. **Design to ratify, not to redraw.**

- [ ] **Step 1: Write the failing filter-model test**

Create `src/lib/collection/availability-filter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { BrowseCard } from "./browse";
import { filterCards } from "./browse";
import {
  buildAvailabilityOptions,
  parseAvailabilityParam,
  serializeAvailability,
} from "./availability-filter";

const base: BrowseCard = {
  oracleId: "o", name: "Card", typeLine: "Artifact", manaCost: "{1}", oracleText: "",
  keywords: [], rarity: "common", colorIdentity: [], imageUri: null, quantity: 1,
  printings: [], setCodes: ["ABC"], primarySetCode: "ABC", preferredPrinting: null,
};

const card = (
  oracleId: string,
  owned: number,
  hard: number,
  soft: number,
): BrowseCard => ({
  ...base,
  oracleId,
  quantity: owned,
  availability: { owned, hard, soft, free: owned - hard, hardDeckNames: [] },
});

const cards: BrowseCard[] = [
  card("free1", 2, 0, 0),
  card("free2", 1, 0, 0),
  card("soft1", 2, 0, 1),
  card("hard1", 1, 1, 0),
  card("over1", 1, 2, 0),
  { ...base, oracleId: "unread", availability: null },
];

const empty = { search: "", colors: [], types: [], setCodes: [] };

describe("buildAvailabilityOptions", () => {
  it("counts distinct cards and partitions the collection", () => {
    const options = buildAvailabilityOptions(cards, empty);
    expect(options.map((o) => [o.code, o.count])).toEqual([
      ["free", 3],   // free1, free2 and the unread card
      ["soft", 1],
      ["hard", 1],
      ["over", 1],
    ]);
    expect(options.reduce((n, o) => n + o.count, 0)).toBe(cards.length);
  });

  it("labels the options in the design's words", () => {
    expect(buildAvailabilityOptions(cards, empty).map((o) => o.label)).toEqual([
      "Free", "Wanted by a brew", "In use", "Over-committed",
    ]);
  });

  it("disables a zero-count option rather than dropping it", () => {
    const options = buildAvailabilityOptions([card("free1", 1, 0, 0)], empty);
    expect(options).toHaveLength(4);
    expect(options.filter((o) => o.disabled).map((o) => o.code)).toEqual(["soft", "hard", "over"]);
  });

  it("counts under the other active filters", () => {
    const options = buildAvailabilityOptions(cards, { ...empty, types: ["Artifact"] });
    expect(options.find((o) => o.code === "hard")?.count).toBe(1);
    expect(buildAvailabilityOptions(cards, { ...empty, types: ["Creature"] })
      .every((o) => o.count === 0)).toBe(true);
  });
});

describe("filterCards with availability", () => {
  it("ORs the selected states internally", () => {
    const kept = filterCards(cards, { ...empty, availability: ["hard", "over"] });
    expect(kept.map((c) => c.oracleId)).toEqual(["hard1", "over1"]);
  });

  it("treats an unread card as free", () => {
    expect(filterCards(cards, { ...empty, availability: ["free"] }).map((c) => c.oracleId))
      .toEqual(["free1", "free2", "unread"]);
  });

  it("ANDs with every other filter", () => {
    expect(
      filterCards(cards, { ...empty, availability: ["free"], setCodes: ["ZZZ"] }),
    ).toEqual([]);
  });

  it("is a no-op when nothing is selected", () => {
    expect(filterCards(cards, empty)).toHaveLength(cards.length);
    expect(filterCards(cards, { ...empty, availability: [] })).toHaveLength(cards.length);
  });
});

describe("the ?avail= param", () => {
  it("round-trips through the design's tokens", () => {
    expect(serializeAvailability(["hard", "over"])).toBe("inuse,over");
    expect(parseAvailabilityParam("inuse,over")).toEqual(["hard", "over"]);
    expect(serializeAvailability(["free", "soft"])).toBe("free,brew");
    expect(parseAvailabilityParam("free,brew")).toEqual(["free", "soft"]);
  });

  it("drops unknown, duplicate and empty tokens", () => {
    expect(parseAvailabilityParam("inuse,INUSE,nonsense,")).toEqual(["hard"]);
    expect(parseAvailabilityParam(null)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/lib/collection/availability-filter.test.ts`
Expected: FAIL — `./availability-filter` does not resolve.

- [ ] **Step 3: Write the filter model**

Create `src/lib/collection/availability-filter.ts`:

```ts
// Availability-filter options — the pure half of the Availability ▾ panel (#43).
//
// Mirrors type-filter.ts, with two deliberate differences, both from
// Addendum 2 §4:
//
// 1. A count is the number of DISTINCT cards, not the sum of quantities.
//    Availability is classified once per oracle_id, so a per-card count is the
//    only one that partitions — the four numbers must add up to the collection
//    total, and summed quantities would not.
// 2. The vocabulary is the four states, always all four, so a state with no
//    matches is listed disabled rather than removed.

import { availabilityState, type AvailabilityState } from "../decks/availability";
import { availabilityCopy } from "../copy/availability";
import { filterCards, type BrowseCard, type BrowseFilters } from "./browse";

/** Menu order, top to bottom, per the addendum canvas. */
export const AVAILABILITY_STATES: AvailabilityState[] = ["free", "soft", "hard", "over"];

const LABEL: Record<AvailabilityState, string> = {
  free: availabilityCopy.collection.filterFree,
  soft: availabilityCopy.collection.filterSoft,
  hard: availabilityCopy.collection.filterHard,
  over: availabilityCopy.collection.filterOver,
};

/**
 * URL tokens. `inuse` and `over` are fixed by the addendum's worked example
 * (`?avail=inuse,over`); `free` and `brew` are chosen to match — short, lower
 * case, and readable next to them. The internal codes stay AvailabilityState
 * values, so the translation happens only at the URL boundary.
 */
const PARAM_TOKEN: Record<AvailabilityState, string> = {
  free: "free", soft: "brew", hard: "inuse", over: "over",
};
const STATE_BY_TOKEN = new Map<string, AvailabilityState>(
  AVAILABILITY_STATES.map((s) => [PARAM_TOKEN[s], s]),
);

export type AvailabilityOption = {
  code: AvailabilityState;
  label: string;
  count: number;
  disabled: boolean;
};

export function availabilityLabel(state: AvailabilityState): string {
  return LABEL[state];
}

/**
 * A card with no availability entry reads as free — an unclaimed card and a
 * failed read are the same silence everywhere else in this feature, and the
 * four counts must still partition.
 */
export function cardAvailabilityState(card: BrowseCard): AvailabilityState {
  return card.availability ? availabilityState(card.availability) : "free";
}

/**
 * The four states with the number of cards in each under the OTHER active
 * filters — not the free-text search box, and not this panel's own selection,
 * the same convention set-filter.ts and type-filter.ts follow.
 */
export function buildAvailabilityOptions(
  cards: BrowseCard[],
  filters: BrowseFilters,
): AvailabilityOption[] {
  const surviving = filterCards(cards, {
    search: "",
    colors: filters.colors,
    types: filters.types,
    setCodes: filters.setCodes,
  });

  const counts = new Map<AvailabilityState, number>(AVAILABILITY_STATES.map((s) => [s, 0]));
  for (const c of surviving) {
    const state = cardAvailabilityState(c);
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }

  return AVAILABILITY_STATES.map((code) => {
    const count = counts.get(code) ?? 0;
    return { code, label: LABEL[code], count, disabled: count === 0 };
  });
}

/** `?avail=inuse,over` → `["hard","over"]`, in menu order, unknowns dropped. */
export function parseAvailabilityParam(param: string | null): AvailabilityState[] {
  if (!param) return [];
  const picked = new Set<AvailabilityState>();
  for (const raw of param.split(",")) {
    const state = STATE_BY_TOKEN.get(raw.trim().toLowerCase());
    if (state) picked.add(state);
  }
  return AVAILABILITY_STATES.filter((s) => picked.has(s));
}

/** `["hard","over"]` → `inuse,over`. Round-trips through parseAvailabilityParam. */
export function serializeAvailability(states: AvailabilityState[]): string {
  return states.map((s) => PARAM_TOKEN[s]).join(",");
}
```

- [ ] **Step 4: Extend `BrowseFilters` and `filterCards`**

In `src/lib/collection/browse.ts`, add to `BrowseFilters`:

```ts
  /**
   * Multi-select (#43): a card matches when its state is ANY selected state.
   * ORs internally, ANDs with every other filter — the `setCodes` shape.
   *
   * Optional, unlike its three siblings: fourteen files build BrowseFilters
   * literals and a required field would break every one of them for no gain.
   * Absent and empty both mean "no availability filter".
   */
  availability?: AvailabilityState[];
```

with `import type { AvailabilityState } from "../decks/availability";`, and inside `filterCards`, after the set-code check:

```ts
    if (f.availability && f.availability.length > 0) {
      // No entry reads as free — an unclaimed card and a failed read are the
      // same silence everywhere else in this feature.
      const state = c.availability ? availabilityState(c.availability) : "free";
      if (!f.availability.includes(state)) return false;
    }
```

importing `availabilityState` as a value. `filterCards` is imported by `availability-filter.ts`, which imports `filterCards` back — the cycle is type-and-function only and Vite resolves it, but keep `cardAvailabilityState` out of `browse.ts` to avoid deepening it.

- [ ] **Step 5: Run the model test and watch it pass**

Run: `pnpm vitest run src/lib/collection/availability-filter.test.ts src/lib/collection/browse.test.ts`
Expected: PASS.

- [ ] **Step 6: Add the panel's copy block**

In `src/lib/copy/collection.ts`, add an `availability` block to `collectionFilterCopy`, sourced from the availability copy module rather than re-authored:

```ts
  // Availability ▾ (#43) — the Type ▾ shape (no search, no footer total).
  // Every user-visible string comes from availabilityCopy.collection; the keys
  // FilterPanelCopy needs and the addendum does not author (the search and
  // group strings) are inert here, exactly as they are in the `type` block.
  availability: {
    triggerLabel: availabilityCopy.collection.filterLabel,
    triggerOne: (name: string) => `${availabilityCopy.collection.filterLabel}: ${name}`,
    triggerAriaCollapsed: "Filter by availability, collapsed",
    triggerAriaWithSelection: (n: number) => `Filter by availability, ${n} selected, collapsed`,

    panelAriaLabel: "Filter by availability",
    sheetTitle: availabilityCopy.collection.filterLabel,
    searchPlaceholder: "",
    searchAriaLabel: "",
    clearSearch: "Clear search",

    groupDefault: "All",
    groupSelected: (n: number) => `Selected · ${n}`,
    groupMatches: (n: number) => (n === 1 ? "1 match" : `${n} matches`),

    // FilterPanel hands the count pre-formatted; the addendum's string wants a
    // number for its "1 card"/"N cards" pluralisation, so it is read back out.
    // The ", selected" tail is this panel family's convention, not the
    // addendum's — every shipped block appends it.
    optionAria: (name: string, count: string, selected: boolean) =>
      availabilityCopy.collection.filterOptionAria(name, Number(count.replaceAll(",", ""))) +
      (selected ? ", selected" : ""),
    optionAriaUnavailable: (name: string) =>
      availabilityCopy.collection.filterEmptyOptionAria(name),

    footerTotal: (total: string) => `${total} cards`,
    footerSelected: (n: number, total: string) => `${n} of ${total} selected`,
    clear: "Clear",
    done: "Done",
    closeLabel: "Close",

    emptyTitle: "Nothing to show",
    emptyBody: (query: string) => ({
      before: "No availability matches ",
      query: `“${query}”`,
      after: ".",
    }),

    announceMatches: (n: number, query: string) =>
      n === 0 ? `No options match ${query}` : `${n} ${n === 1 ? "option matches" : "options match"} ${query}`,
    announceAdded: (name: string, n: number, shown: string, total: string) =>
      `${name} added. ${n} ${n === 1 ? "filter" : "filters"}, ${shown} of ${total} cards shown.`,
    announceRemoved: (name: string, n: number, shown: string, total: string) =>
      n === 0
        ? `${name} removed. No availability filter, ${total} cards shown.`
        : `${name} removed. ${n} ${n === 1 ? "filter" : "filters"}, ${shown} of ${total} cards shown.`,
    announceCleared: (total: string) => `Availability filter cleared. ${total} cards shown.`,
  },
```

with `import { availabilityCopy } from "./availability";` at the top.

- [ ] **Step 7: The glyph, shared by the menu rows and the chips**

Create `src/components/collection/availability-glyph.tsx`:

```tsx
// The bare availability diamond, with no copy beside it (#43).
//
// AvailabilityMarker's own Diamond is module-private and always ships with a
// label; the filter menu rows and the filter chips need the mark alone, and
// the over-committed mark is DOUBLED there per the addendum canvas.
// Hues are the marker's, unchanged — the addendum adds no new hues.

import type { AvailabilityState } from "../../lib/decks/availability";

const HUE: Record<Exclude<AvailabilityState, "free">, string> = {
  soft: "#C6B79A",  // --fg-body
  hard: "#C9A24B",  // --brass
  over: "#C6533F",
};

export function AvailabilityGlyph({ state }: { state: AvailabilityState }) {
  if (state === "free") return null;
  const color = HUE[state];
  return (
    <span aria-hidden className="relative inline-block shrink-0" style={{ width: state === "over" ? 11 : 6, height: 6 }}>
      <span
        className="absolute left-0 top-0 block"
        style={{ width: 6, height: 6, background: color, transform: "rotate(45deg)" }}
      />
      {state === "over" && (
        <span
          className="absolute top-0 block"
          style={{ left: 5, width: 6, height: 6, background: color, transform: "rotate(45deg)" }}
        />
      )}
    </span>
  );
}
```

- [ ] **Step 8: Two additive props on `FilterPanel`**

`FilterPanel` has no slot for a per-row glyph and no accessible reason for a disabled trigger. Both are additive and no shipped caller changes.

In `src/components/ui/filter-panel.tsx`, add to `FilterPanelOption`:

```ts
  /**
   * Rendered between the checkbox and the label. Only Availability ▾ uses it —
   * its rows are distinguished by a mark, not by a color swatch in the label.
   */
  leadingGlyph?: ReactNode;
```

render it in `renderRow`, immediately after the checkbox span:

```tsx
        {option.leadingGlyph}
```

add the prop:

```ts
  /**
   * Accessible reason the trigger is disabled. Without it a disabled trigger
   * still announces "Filter by availability, collapsed", which says nothing
   * about why it will not open.
   */
  disabledAriaLabel?: string,
```

and fold it into the computed name:

```ts
  const triggerAria = disabled && disabledAriaLabel
    ? disabledAriaLabel
    : open
      ? `${copy.panelAriaLabel}${triggerAriaDetail}, expanded`
      : selected.length === 0
        ? copy.triggerAriaCollapsed
        : selected.length === 1
          ? `${copy.panelAriaLabel}, ${oneName}, collapsed`
          : copy.triggerAriaWithSelection(selected.length);
```

Add to `src/components/ui/filter-panel.test.tsx`:

```tsx
  it("announces why a disabled trigger will not open", () => {
    render(
      <FilterPanel
        copy={collectionFilterCopy.type}
        options={OPTIONS}
        selected={[]}
        disabled
        disabledAriaLabel="Availability unavailable right now"
        onToggle={() => {}}
        onClear={() => {}}
        onAnnounce={() => {}}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Availability unavailable right now" });
    expect(trigger).toBeDisabled();
  });
```

Run: `pnpm vitest run src/components/ui/filter-panel.test.tsx`
Expected: PASS (FAIL first if you add the test before the props — do it in that order).

- [ ] **Step 9: Mount the panel — fourth on desktop, fifth on phone**

In `src/components/collection/filter-bar.tsx`, add props:

```ts
  /** The four availability states with counts under the other active filters. */
  availabilityOptions: AvailabilityOption[];
  /** False when the availability aggregate could not be read (Task 7 / Task 9). */
  availabilityOk: boolean;
```

and mount the panel **after `Sort ▾`** — the single DOM position that lands fourth on desktop (Type, Set, Sort, Availability; colour is the inline pip row there) and fifth on phone (Color, Type, Set, Sort, Availability), which is what the R3 correction asks for:

```tsx
        {/* Availability ▾ (#43) — the Type ▾ shape: fixed four-item vocabulary,
            no search, no footer total. Rows carry the marker's glyph so the
            menu and the list agree about what each state looks like. */}
        <FilterPanel
          copy={collectionFilterCopy.availability}
          options={availabilityOptions.map((o) => ({
            ...o,
            leadingGlyph: <AvailabilityGlyph state={o.code} />,
          }))}
          selected={filters.availability ?? []}
          searchable={false}
          widthPx={280}
          footerStatus={false}
          disabled={!availabilityOk}
          disabledAriaLabel={availabilityCopy.degraded.collectionFilterDisabledAria}
          onToggle={(code) => {
            const state = code as AvailabilityState;
            const current = filters.availability ?? [];
            onFiltersChange({
              ...filters,
              availability: current.includes(state)
                ? current.filter((s) => s !== state)
                : [...current, state],
            });
          }}
          onClear={() => onFiltersChange({ ...filters, availability: [] }, "clear-availability")}
          onAnnounce={onAnnounce}
        />
```

Extend the intent union at `filter-bar.tsx:38`:

```ts
export type FilterChangeIntent = "clear-sets" | "clear-types" | "clear-colors" | "clear-availability";
```

Imports: `AvailabilityGlyph` from `./availability-glyph`, `type AvailabilityOption` from `../../lib/collection/availability-filter`, `type AvailabilityState` from `../../lib/decks/availability`, `availabilityCopy` from `../../lib/copy/availability`.

**No banner.** Addendum 2, Implementation notes: `/collection` fails quiet — the markers are absent (Task 9) and the trigger is disabled with a reason. The banner belongs to Task 7's surfaces, not this one.

- [ ] **Step 9b: Repair the two shipped `FilterBar` render helpers**

`availabilityOptions` and `availabilityOk` are **required** props, so every existing `<FilterBar>` render stops compiling the moment Step 9 lands. Despite its name, `src/components/ui/filter-panel.test.tsx` renders `FilterBar` — it imports it at `:5` — through two fixed-prop helpers, `renderBar(setCodes)` at `:536` and `renderBar(types)` at `:649`. Add to the prop list inside **both**:

```tsx
        availabilityOptions={[]}
        availabilityOk
```

An empty option list is the honest fixture: those two suites are about the Set and Type panels and have no availability data to give. There are **no other call sites to repair** — `<CollectionBrowser>` is constructed only at `src/app/collection/page.tsx:124`, which Task 9 Step 2 already updates, and it has no test file of its own.

Run: `pnpm vitest run src/components/ui/filter-panel.test.tsx`
Expected: PASS — both suites unchanged in behaviour, now compiling.

- [ ] **Step 10: Wire state, counts and the URL param**

In `src/components/collection/browser.tsx`:

Seed the filter from the URL, in the existing `useState<BrowseFilters>` initialiser:

```ts
    availability: parseAvailabilityParam(search.get("avail")),
```

Serialise it in `serializeParams`, beside `t=` and `s=`:

```ts
  // Comma-joined, same shape as t= and s=.
  if (filters.availability && filters.availability.length > 0) {
    p.set("avail", serializeAvailability(filters.availability));
  }
```

Build the options — availability counts move with colors, types and sets, not with their own selection or the search box, the rule the other three follow:

```ts
  const availabilityOptions = useMemo(
    () =>
      buildAvailabilityOptions(cards, {
        search: "",
        colors: filterColors,
        types: filterTypes,
        setCodes: filterSetCodes,
      }),
    [cards, filterColors, filterTypes, filterSetCodes],
  );
```

Add the fourth announcement to `updateFilters`'s chain:

```ts
        availabilityChangeAnnouncement(filters, f, cards, availabilityOptions, totalQuantity, intent);
```

`updateFilters` now closes over `availabilityOptions`, so add it to that `useCallback`'s dependency array at `browser.tsx:265` — the three sibling option lists are already there, and omitting the fourth would announce stale labels after a filter change.

written next to the three shipped ones in the same file:

```ts
const availCopy = collectionFilterCopy.availability;

/**
 * The live-region string for a change to the availability selection. Same
 * shape as its three siblings; the `?? []` pair exists only because
 * `BrowseFilters.availability` is optional and theirs are required.
 */
export function availabilityChangeAnnouncement(
  prev: BrowseFilters,
  next: BrowseFilters,
  cards: BrowseCard[],
  options: { code: string; label: string }[],
  totalQuantity: number,
  intent?: FilterChangeIntent,
): string | null {
  return selectionAnnouncement(
    prev.availability ?? [], next.availability ?? [], availCopy,
    intent === "clear-availability",
    next, cards, options, totalQuantity,
  );
}
```

That is `selectionAnnouncement`'s real parameter order as declared at `browser.tsx:86-95` — `(before, after, copy, cleared, next, cards, options, totalQuantity)`. `AvailabilityOption["code"]` is an `AvailabilityState`, which is assignable to the `{ code: string }` the helper wants, so no cast is needed.

Add `availability: []` to the three clear-all literals (`onClearAll` ×2, `onKeepSearch`), and pass the new props through to `FilterBar`:

```tsx
        availabilityOptions={availabilityOptions}
        availabilityOk={availabilityOk}
```

**Do not add `filters.availability` to those deps.** It is this panel's own selection, and counting under it would make every option read as a subset of itself — the same omission `setOptions`, `typeOptions` and `colorOptions` already make. Destructure only the three fields listed; the shipped memos above show the pattern.

- [ ] **Step 11: Write the failing chip test**

Create `src/components/collection/chip-row.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BrowseFilters } from "../../lib/collection/browse";
import { ChipRow } from "./chip-row";

const filters: BrowseFilters = {
  search: "", colors: [], types: [], setCodes: [], availability: ["hard", "over"],
};

function renderRow(onRemoveAvailability = vi.fn()) {
  render(
    <ChipRow
      filters={filters}
      sort="name"
      resultCount={64}
      uniqueCount={1418}
      totalQuantity={2933}
      onClearAll={() => {}}
      onRemoveColor={() => {}}
      onRemoveType={() => {}}
      setLabels={{}}
      onRemoveSet={() => {}}
      onClearSearch={() => {}}
      onRemoveAvailability={onRemoveAvailability}
    />,
  );
  return onRemoveAvailability;
}

describe("ChipRow availability chips", () => {
  it("renders one removable chip per selected state, in the design's words", () => {
    renderRow();
    expect(screen.getByText("In use")).toBeInTheDocument();
    expect(screen.getByText("Over-committed")).toBeInTheDocument();
  });

  it("uses the addendum's remove label", () => {
    renderRow();
    expect(screen.getByRole("button", { name: "Remove filter: in use" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove filter: over-committed" })).toBeInTheDocument();
  });

  it("removes just that state", () => {
    const onRemove = renderRow();
    screen.getByRole("button", { name: "Remove filter: in use" }).click();
    expect(onRemove).toHaveBeenCalledWith("hard");
  });

  it("counts an availability selection as an active filter", () => {
    renderRow();
    expect(screen.getByText("Showing 64 of 2,933")).toBeInTheDocument();
  });
});
```

Run: `pnpm vitest run src/components/collection/chip-row.test.tsx`
Expected: FAIL — `onRemoveAvailability` is not a prop and no chips render.

- [ ] **Step 12: Render the chips**

In `src/components/collection/chip-row.tsx`, add the prop `onRemoveAvailability: (state: AvailabilityState) => void`, extend `anyActive`:

```ts
    (filters.availability?.length ?? 0) > 0;
```

add the chips after the set chips:

```tsx
      {/* Availability chips — the marker's glyph as the leading dot, so the
          chip, the menu row and the list all read the same mark. */}
      {(filters.availability ?? []).map((state) => (
        <Chip
          key={state}
          label={availabilityLabel(state)}
          leadingGlyph={<AvailabilityGlyph state={state} />}
          removeAria={availabilityCopy.collection.chipRemoveAria(availabilityLabel(state))}
          onRemove={() => onRemoveAvailability(state)}
        />
      ))}
```

and widen `Chip` — `leadingDot` stays for the WUBRG chips, which are a coloured circle, not a glyph:

```tsx
function Chip({
  label,
  leadingDot,
  leadingGlyph,
  removeAria,
  onRemove,
}: {
  label: string;
  leadingDot?: string;
  leadingGlyph?: ReactNode;
  /** Overrides the default "Remove X filter" — the addendum authors its own. */
  removeAria?: string;
  onRemove: () => void;
}) {
```

with `{leadingGlyph}` beside the existing `{leadingDot && …}` and:

```tsx
        aria-label={removeAria ?? `Remove ${label} filter`}
```

Wire the callback in `browser.tsx`:

```tsx
          onRemoveAvailability={(state) =>
            updateFilters({
              ...filters,
              availability: (filters.availability ?? []).filter((s) => s !== state),
            })
          }
```

- [ ] **Step 13: Run the chip test and watch it pass**

Run: `pnpm vitest run src/components/collection/chip-row.test.tsx`
Expected: PASS, all four.

- [ ] **Step 14: Run the gate**

Run: `pnpm vitest run src/lib/collection src/components/collection src/components/ui && pnpm typecheck && pnpm lint`
Expected: PASS. Then the stub build: `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`.

- [ ] **Step 15: Verify in the browser at both widths**

Run `pnpm dev`, sign in, open `/collection`. At 1300px confirm `Availability ▾` is the **fourth** dropdown (Type, Set, Sort, Availability) and at 390px the **fifth** (Color, Type, Set, Sort, Availability). Confirm: nothing is selected on load; the four counts sum to the collection's unique total shown in the chip row; a state you own none of is greyed and does not toggle by click or by ↓/Enter; picking `In use` + `Over-committed` puts `?avail=inuse,over` in the URL and two chips in the row; reloading that URL restores both; each chip's ✕ removes only its own state; `Clear all` clears them with everything else. Then break the read (temporarily `throw` inside `loadAvailability`) and confirm the trigger is disabled, no markers appear, and **no banner** does.

- [ ] **Step 16: Commit**

```
git add src/lib/collection/availability-filter.ts src/lib/collection/availability-filter.test.ts src/lib/collection/browse.ts src/lib/copy/collection.ts src/components/collection/availability-glyph.tsx src/components/collection/chip-row.tsx src/components/collection/chip-row.test.tsx src/components/collection/filter-bar.tsx src/components/collection/browser.tsx src/components/ui/filter-panel.tsx src/components/ui/filter-panel.test.tsx
git commit -m "feat(collection): Availability filter with counts, chips and ?avail= (#43)"
```

---

## Design tables to update

Per the handoff, these rows are superseded and must be updated in the same PR as the code that changes them:

- `docs/superpowers/design-tables/commanders.md` — §Evidence column (:424), §"Order: Fit ↓ · fixed" (:312), §Filter pip row wrapper (:208), §Fit column (:581-673), §Score row (:1492)
- `docs/superpowers/design-tables/decks.md` — §Decklist Row (:1222)
- `docs/superpowers/design-tables/add-panel.md` — §4c ownership dot (:207), §4e evidence row (:237), §4g tile states (:273)
- `docs/superpowers/design-tables/commanders-windowing.md` — **currently says "No implementation exists."** That is stale: windowing shipped as #52 (`src/components/commanders/reveal-control.tsx`). Correct it, and add the window-reset-on-re-rank rule.

## Copy strings shipped by Design that no task above renders

Found by auditing `availability · copy strings.ts` against all ten tasks. Each is either a surface the plan does not build or a string whose home was never decided. **Before implementing, decide per string: render it, or delete it from the ported copy block.** Leaving unused exports in `src/lib/copy/` is how the vocabulary drifts, because the next person assumes they are live.

- `ranking.freeNote` / `freeNoteLong` — annotated "shown only in the free state, under the control". Task 6 renders the control but not this note.
- `ranking.subtitleAll` / `subtitleFree`, `ranking.allAria` / `freeAria` — the segmented control's accessible names and subtitles.
- `receipt.wantedByBrew` — the soft-claim clause on the receipt line. Task 6 renders only `fit` / `fitFree` / `inUse` / `delta`.
- `receipt.altScore` — the other mode's score, adjacent to the delta.
- `detail.hint`, `detail.announceExpanded` / `announceCollapsed` — Task 8 announces a count but does not use these.
- ~~`marker.hard`~~ — **resolved by Addendum 2.** The bare form is exactly what `/collection` renders: Task 9 passes `nameless`, and §3 states *"collection uses `marker.hard` (`0 free`) and never `hardIn` or `hardMulti`."* Keep it.
- `collection.detailSoftNote` and `collection.detailOverNote` are written but only the hard note is drawn (gap A2 §3). Task 9 Step 11 renders all three off the same rule; the risk is low, and inventing two more surfaces to avoid the assumption would be worse.

## Open, non-blocking — do not solve these here

- **Gap §10 — a commander can vanish on the flip.** Rank 3 under `Everything I own` can be rank 60 under `What's free`, outside the first batch. Accepted: the toggle is telling the truth and `25 shown · 189 more below` says there is more.
- **Gap §11 — two degraded reads co-occurring** is drawn as copy (`bodyWithSynergy`), specified but not visually designed.
- **The soft threshold cliff is inherited, not introduced.** A 98-card list is soft, a 99-card list of pure theory is hard. The first support ticket about this feature will be about the 98th card.
- **Gap A2 §1 — no over-committed aggregate on `/collection`.** A player with three over-committed cards across 1,418 rows finds them via the filter or not at all. Deliberate: the collection page is an inventory, not a to-do list, and the deck with the problem shows it.
- **Gap A2 §4 — `?avail=` means two different things**: single-value ranking mode on `/commanders`, multi-value filter on `/collection`. Same concept, no shared reader, so it is safe today. It will bite during a future "share this view" feature.
- **The claiming deck's status pill is absent from the card-detail clause.** Addendum 2 §3 draws `×1 · ◆ 0 free — in Atraxa [Complete]`, but `Availability.hardDeckNames` carries names only and `statusPill()` needs that deck's `built` / `ownedCount` / `unresolvedCount`. Task 9 Step 11 ships the clause without the pill rather than deriving "Complete" from `hard > 0`, which would read as fact while being a guess. Unblocking it means widening `hardDeckNames` to `{ name, pill }[]` in Task 1, which ripples through every marker caller. **Design to ratify the omission, or to fund the widening.**
- **`Showing N of 1,418` uses a different denominator in the drawing than in the shipped page.** Numerator agrees; denominator is `totalQuantity` in `chip-row.tsx`, not the unique total. Task 10 leaves the shipped copy alone and explains why. **Design to ratify, not to redraw.**
- **Self-exclusion is extended to the add panel, which §6 does not explicitly cover.** §6 rules on "a deck's own decklist"; Task 4 Step 2 applies it to `searchCards` as well, because a card already on the list comes back from search and would otherwise read `0 free — in <this deck>` one panel away from its own silent row. **Design to ratify the extension, or to place the seam elsewhere.**
- **Gap A2 §6 — the 98th-card cliff applies to the roll-up too.** The soft line can vanish and the red line appear on a single add; that transition isn't drawn. Do not add a size check to compensate — the arithmetic already exits (Task 8 Step 4).

**Closed since the first revision of this plan, do not re-raise:**

- **Gap §2 (deck-name length budget)** — resolved 2026-08-27. The name is the only part allowed to truncate: `flex-none` prefix plus `truncate min-w-0` name, full name in the accessible name and not in a `title` (Task 3 deviation 10). Implemented in Task 3.
- **The collection page is no longer out of scope.** Addendum 2 designs it in full — Tasks 9 and 10.
