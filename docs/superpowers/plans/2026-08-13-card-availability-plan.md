# Card Availability (#43) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A physical card lives in one deck at a time. Teach the recommender and the builder to subtract cards already sleeved into a finished deck, and annotate the four surfaces where that changes a decision.

**Architecture:** One aggregate query (`loadAvailability`) returns `{owned, hard, soft, free}` per `oracle_id` for a user, classifying each deck as *mature* (99 cards → hard claim) or *brewing* (under 99 → soft claim). A pure classifier turns those numbers into one of four states, of which the common one renders **nothing**. On `/commanders` the same numbers reduce the scoring pool, producing a second score computed from the **already-cached** EDHREC data — no extra network, no new persisted table. Everywhere else the numbers are pure annotation.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Vitest.

**Sources:**
- Spec: `docs/superpowers/specs/2026-08-08-card-availability-design.md`
- Design handoff: `design/design_handoff_the99_availability/README.md` (R3) and `ADDENDUM-README.md` (R2 rulings)
- Copy: `design/design_handoff_the99_availability/availability · copy strings.ts`
- Verdict: 🟢 Green at R3, audited 2026-08-13

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
- **The four states apply only when `owned > 0`.** A card you do not own is not "in use".
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
  - `availabilityState(a: Pick<Availability, "owned" | "free" | "soft">): AvailabilityState`
- Produces, from `availability-query.ts` (server only):
  - `loadAvailability(userId: string): Promise<Map<string, Availability>>`

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
  /** owned − hard. Negative when finished decks want more copies than exist. */
  free: number;
  /** Names of the mature decks holding a hard claim. Used only when length === 1. */
  hardDeckNames: string[];
};

export type AvailabilityState = "free" | "soft" | "hard" | "over";

/**
 * Total order, most severe first — the four states are a partition, so the
 * first match wins and every card lands in exactly one.
 */
export function availabilityState(
  a: Pick<Availability, "owned" | "free" | "soft">,
): AvailabilityState {
  if (a.owned <= 0) return "free";
  if (a.free < 0) return "over";
  if (a.free === 0) return "hard";
  if (a.soft > 0) return "soft";
  return "free";
}
```

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
export async function loadAvailability(userId: string): Promise<Map<string, Availability>> {
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
    claims as (
      select
        ac.oracle_id,
        sum(case when dt.cards >= ${MATURE_DECK_SIZE} then ac.quantity else 0 end)::int as hard,
        sum(case when dt.cards <  ${MATURE_DECK_SIZE} then ac.quantity else 0 end)::int as soft,
        array_remove(
          array_agg(distinct case when dt.cards >= ${MATURE_DECK_SIZE} then d.name end),
          null
        ) as hard_deck_names
      from all_claims ac
      join deck_totals dt on dt.deck_id = ac.deck_id
      join decks d on d.id = ac.deck_id
      group by ac.oracle_id
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
      o.owned,
      coalesce(c.hard, 0) as hard,
      coalesce(c.soft, 0) as soft,
      c.hard_deck_names
    from owned o
    left join claims c on c.oracle_id = o.oracle_id
  `);

  const out = new Map<string, Availability>();
  for (const r of rows.rows) {
    out.set(r.oracle_id, {
      owned: r.owned,
      hard: r.hard,
      soft: r.soft,
      free: r.owned - r.hard,
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

- [ ] **Step 1: Add the four tokens**

In `src/app/globals.css`, in the `/* Feedback */` group beside `--danger`:

```css
  /* Card availability (#43). Two aliases and two literals — no new hues.
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
- Produces: `<AvailabilityMarker availability={a} density="row" | "chip" />`, and `markerAria(a): string | null`.

The marker is **a diamond, a count, and a word**. Hollow diamond when an unfinished brew wants the card, solid brass when nothing is free. The glyph is two rotated `<span>`s — no new dependency, no SVG. It is `aria-hidden`; the text beside it carries the meaning, which is also why the greyscale test passes.

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/availability-marker.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AvailabilityMarker, markerAria } from "./availability-marker";

const a = (owned: number, hard: number, soft: number, names: string[] = []) => ({
  owned, hard, soft, free: owned - hard, hardDeckNames: names,
});

describe("AvailabilityMarker", () => {
  // The single most important behaviour in this feature.
  it("renders nothing at all in the free state", () => {
    const { container } = render(<AvailabilityMarker availability={a(4, 0, 0)} density="row" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for a card the player does not own", () => {
    const { container } = render(<AvailabilityMarker availability={a(0, 0, 0)} density="row" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("names the claiming deck when there is exactly one", () => {
    render(<AvailabilityMarker availability={a(1, 1, 0, ["Atraxa"])} density="row" />);
    expect(screen.getByText("0 free — in Atraxa")).toBeInTheDocument();
  });

  it("counts the decks instead of naming them when there are several", () => {
    render(<AvailabilityMarker availability={a(2, 2, 0, ["Atraxa", "Kykar"])} density="row" />);
    expect(screen.getByText("0 free — across 2 decks")).toBeInTheDocument();
  });

  it("says how short the player is when over-committed", () => {
    render(<AvailabilityMarker availability={a(1, 3, 0, ["A", "B", "C"])} density="row" />);
    expect(screen.getByText(/short 2/)).toBeInTheDocument();
  });

  // Glyph plus number plus word: the text alone must distinguish the states,
  // so the marker survives greyscale.
  it("hides the glyph from assistive tech", () => {
    const { container } = render(
      <AvailabilityMarker availability={a(1, 1, 0, ["Atraxa"])} density="row" />,
    );
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe("markerAria", () => {
  it("is null in the free state, so no accessible name changes", () => {
    expect(markerAria(a(4, 0, 0))).toBeNull();
  });

  it("describes lists, never physical locations", () => {
    const s = markerAria(a(1, 1, 0, ["Atraxa"]))!;
    expect(s).toBe("no free copies; this one is on your Atraxa list");
    expect(s).not.toMatch(/box|binder|sleeve|shelf/i);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm vitest run src/components/ui/availability-marker.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/ui/availability-marker.tsx`:

```tsx
// Availability marker (#43) — a diamond, a count, and a word.
// §Marker (design handoff README, decisions 1 and 2).
//
// Two densities: "row" for decklist rows and search rows, "chip" for the
// 8.5px caption chip on a Consider tile's art scrim.
//
// The free state renders null. That is the feature, not an optimisation:
// a player whose collection covers their decks sees nothing new anywhere.

import { availabilityCopy } from "../../lib/copy/availability";
import {
  availabilityState,
  type Availability,
} from "../../lib/decks/availability";

/** Prose for the accessible name, or null when the card is free. */
export function markerAria(a: Availability): string | null {
  switch (availabilityState(a)) {
    case "free":
      return null;
    case "soft":
      return availabilityCopy.marker.softAria(a.soft);
    case "hard":
      return a.hardDeckNames.length === 1
        ? availabilityCopy.marker.hardAria(a.hardDeckNames[0])
        : availabilityCopy.marker.hardMultiAria(a.hardDeckNames.length);
    case "over":
      return availabilityCopy.marker.overAria(-a.free, a.hardDeckNames.length);
  }
}

function label(a: Availability): string | null {
  switch (availabilityState(a)) {
    case "free":
      return null;
    case "soft":
      return availabilityCopy.marker.soft(a.soft);
    case "hard":
      return a.hardDeckNames.length === 1
        ? availabilityCopy.marker.hardIn(a.hardDeckNames[0])
        : availabilityCopy.marker.hardMulti(a.hardDeckNames.length);
    case "over":
      return a.hardDeckNames.length > 1
        ? availabilityCopy.marker.overWithDemand(-a.free, a.hardDeckNames.length)
        : availabilityCopy.marker.over(-a.free);
  }
}

/**
 * Two rotated spans rather than an SVG or an icon dependency: the shape is a
 * square on its corner, and the app already draws its ownership dot this way.
 * Hollow reads as "someone wants it", solid as "it is gone".
 */
function Diamond({ filled, color }: { filled: boolean; color: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block flex-none rotate-45"
      style={{
        width: 6,
        height: 6,
        background: filled ? color : "transparent",
        border: `1px solid ${color}`,
        // No transition, no animation: zero net motion is a locked constraint.
      }}
    />
  );
}

export function AvailabilityMarker({
  availability,
  density = "row",
}: {
  availability: Availability;
  density?: "row" | "chip";
}) {
  const state = availabilityState(availability);
  if (state === "free") return null;

  const text = label(availability)!;
  const filled = state !== "soft";
  const glyphColor = state === "over" ? "var(--danger)" : "var(--avail-hard)";
  const textColor =
    state === "soft"
      ? "var(--avail-soft)"
      : state === "over"
        ? "var(--avail-over-fg)"
        : density === "chip"
          ? "var(--avail-hard-fg)"
          : "var(--avail-hard)";

  return (
    <span
      className="inline-flex items-center gap-[5px] min-w-0"
      style={
        density === "chip"
          ? {
              fontSize: 8.5,
              fontFamily: "'IBM Plex Mono', monospace",
              background: "rgba(11,9,7,0.9)",
              borderRadius: 4,
              padding: "2px 5px",
            }
          : { fontSize: 11.5 }
      }
    >
      <Diamond filled={filled} color={glyphColor} />
      <span className="truncate" style={{ color: textColor }}>
        {text}
      </span>
    </span>
  );
}
```

- [ ] **Step 4: Run the tests and watch them pass**

Run: `pnpm vitest run src/components/ui/availability-marker.test.tsx`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/availability-marker.tsx src/components/ui/availability-marker.test.tsx
git commit -m "feat(availability): the marker — a diamond, a count, and a word (#43)"
```

---

## Task 4: The builder surfaces — decklist row, search row, Consider tile

**Files:**
- Modify: `src/app/decks/[id]/search-action.ts:52-75`
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

**Do not add `loadAvailability` to `searchCards` naively.** That action runs on every keystroke (`use-card-search.ts`) to annotate at most ~20 rows, and `loadAvailability` aggregates the player's whole collection. Restrict the query to the oracle_ids actually being returned — add an optional `oracleIds?: string[]` parameter to `loadAvailability` that appends `and o.oracle_id = any(${oracleIds})` to the outer select. The decklist and commanders paths call it without the argument, as before.

- [ ] **Step 2: Populate them**

In both `getDeckDetail` (`read.ts`) and `searchCards` (`search-action.ts`), call `loadAvailability(userId)` alongside the existing query and attach per-oracle. Wrap it so a failure is quiet:

```ts
// Pure annotation on this surface: a failed read must be indistinguishable
// from a player with no commitments, never a banner over a working list.
const availability = await loadAvailability(userId).catch(() => null);
// …then, per row:
availability: availability?.get(row.oracleId) ?? null,
```

**Subtlety worth stating:** on the decklist, the row's *own* deck is one of the claimants. A card in a finished deck will read `0 free — in <this deck>`, which is correct and intended — the player is looking at where the card went.

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
  expect(screen.getByText("0 free — in Atraxa")).toBeInTheDocument();
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

- `decklist-row.tsx`: after `OwnershipDot`/name, render `{card.availability && <AvailabilityMarker availability={card.availability} density="row" />}`.
- `card-search-row.tsx`: same, in `CardSearchRowBody` beside the `{ownership}` figure, joined with `' · '`. Pass `markerAria(availability)` as the 4th argument to `addPanelCopy.quickAdd.rowAria`.
- `suggestion-tile.tsx`: `density="chip"` on the art scrim, plus the caption line under the type line via `availabilityCopy.marker.tileInUse(deckName)` / `tileOver(deckCount)`.

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
- Modify: `src/app/commanders/page.tsx:46-52`

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

- [ ] **Step 5: Wire it into the page**

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
git add src/lib/recs/free-ranking.ts src/lib/recs/free-ranking.test.ts src/app/commanders/page.tsx
git commit -m "feat(availability): rank commanders against what's free (#43)"
```

---

## Task 6: The commanders list — toggle, two rank maps, receipt, delta

**Files:**
- Create: `src/lib/commanders/rank-maps.ts`
- Create: `src/lib/commanders/rank-maps.test.ts`
- Modify: `src/components/commanders/commanders-view.tsx:28-45,78-115,300-310,452`
- Modify: `src/components/commanders/rec-card.tsx`

**Interfaces:**
- Consumes: `freeItems`, `availOk` (Task 5); `availabilityCopy.ranking` and `.receipt` (Task 2).
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

- **`inUse`** is `allItem.colorPoolSize - freeItem.colorPoolSize`. `colorPoolSize` is the count of the player's cards that fit the commander's identity, and the only difference between the two runs is which cards were in the pool — so the difference *is* the number of fitting cards that are spoken for. This is exactly the receipt's *"34 of your cards fit · 12 already in use"*.
- **`was`** is `allItem.score`; **`drop`** is `allItem.score - freeItem.score`.

**A consequence to be aware of, and it is a real constraint rather than an oversight:** both numbers require the free ranking to have been computed, and Task 5 computes it *only* when `?avail=free`. So the receipt's second clause and the delta render **in `What's free` mode only**. In `Everything I own` the line shows just `receipt.fit`. The alternative — always computing both rankings — would make every visit to `/commanders` pay for a feature most players never open, contradicting Task 5's whole premise.

**Flag this one to Design rather than assuming it.** The brief's surface list describes the receipt as *"a per-commander receipt line along the lines of 34 of your cards fit · 12 already in use"* on the commanders list, which could be read as applying in the default mode. Implement mode-scoped as above, and raise it for ratification; do not silently switch to always-computing-both.

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

## Task 8: Commander detail disclosure and the deck over-committed summary

**Files:**
- Modify: `src/components/commanders/detail.tsx` (rendered by `src/app/commanders/[slug]/page.tsx:46`, which gets its data from `scoreOneCommander`)
- Modify: `src/app/commanders/[slug]/page.tsx` — attach availability to the detail payload
- Modify: `src/components/decks/builder-spine.tsx` (`BuilderSpine`, the deck header — there is no `deck-header.tsx`)
- Test: `src/components/commanders/detail.test.tsx`, `src/components/decks/builder-spine.test.tsx`

**Interfaces:**
- Consumes: `loadAvailability`, `availabilityState` (Task 1); `availabilityCopy.detail` and `.deckSummary` (Task 2).
- Produces: no new exports.

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

- [ ] **Step 4: The deck over-committed summary**

Renders **only when count > 0**. It is not an error: no dismiss, no retry, no icon. Copy: `availabilityCopy.deckSummary`, which is straight-with-a-shrug — *"Nothing's broken here — it's a shopping decision."* A deck with no over-commitment has no summary line at all.

- [ ] **Step 5: Verify at both widths**

Confirm the desktop split and the phone filter, that a player with no commitments sees neither the disclosure nor the summary, and that nothing animates.

- [ ] **Step 6: Gate and commit**

Run: `pnpm typecheck && pnpm lint && pnpm test`

```bash
git commit -m "feat(availability): commander detail disclosure and the over-committed summary (#43)"
```

---

## Design tables to update

Per the handoff, these rows are superseded and must be updated in the same PR as the code that changes them:

- `docs/superpowers/design-tables/commanders.md` — §Evidence column (:424), §"Order: Fit ↓ · fixed" (:312), §Filter pip row wrapper (:208), §Fit column (:581-673), §Score row (:1492)
- `docs/superpowers/design-tables/decks.md` — §Decklist Row (:1222)
- `docs/superpowers/design-tables/add-panel.md` — §4c ownership dot (:207), §4e evidence row (:237), §4g tile states (:273)
- `docs/superpowers/design-tables/commanders-windowing.md` — **currently says "No implementation exists."** That is stale: windowing shipped as #52 (`src/components/commanders/reveal-control.tsx`). Correct it, and add the window-reset-on-re-rank rule.

## Copy strings shipped by Design that no task above renders

Found by auditing `availability · copy strings.ts` against the eight tasks. Each is either a surface the plan does not build or a string whose home was never decided. **Before implementing, decide per string: render it, or delete it from the ported copy block.** Leaving unused exports in `src/lib/copy/` is how the vocabulary drifts, because the next person assumes they are live.

- `ranking.freeNote` / `freeNoteLong` — annotated "shown only in the free state, under the control". Task 6 renders the control but not this note.
- `ranking.subtitleAll` / `subtitleFree`, `ranking.allAria` / `freeAria` — the segmented control's accessible names and subtitles.
- `receipt.wantedByBrew` — the soft-claim clause on the receipt line. Task 6 renders only `fit` / `fitFree` / `inUse` / `delta`.
- `receipt.altScore` — the other mode's score, adjacent to the delta.
- `detail.hint`, `detail.announceExpanded` / `announceCollapsed` — Task 8 announces a count but does not use these.
- `marker.hard` — the bare form, with no deck named. `markerAria` and `label` in Task 3 always branch to `hardIn` or `hardMulti`, so this never fires. It is the right string for a surface with no room for a deck name; if none exists, delete it.

## Open, non-blocking — do not solve these here

- **Gap §2 — deck names have no length budget.** `0 free — in Atraxa` fits; a 38-character deck name does not. Truncation point and whether the name drops entirely below some width are an unmade product call. The `truncate` in Task 3 is a holding position, not the answer.
- **Gap §10 — a commander can vanish on the flip.** Rank 3 under `Everything I own` can be rank 60 under `What's free`, outside the first batch. Accepted: the toggle is telling the truth and `25 shown · 189 more below` says there is more.
- **Gap §11 — two degraded reads co-occurring** is drawn as copy (`bodyWithSynergy`), specified but not visually designed.
- **The soft threshold cliff is inherited, not introduced.** A 98-card list is soft, a 99-card list of pure theory is hard. The first support ticket about this feature will be about the 98th card.
- **The collection page is out of scope** and is where a player would look first. The follow-up ticket should inherit this marker unchanged rather than re-solving it.
