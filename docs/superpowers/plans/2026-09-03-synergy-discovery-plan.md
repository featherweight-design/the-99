# Synergy Discovery, and the Last 31 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the commander page's EDHREC overlap panel into a synergy-ranked, selectable card list, and give the deck builder a "last 31" strip that finishes the deck from the same ranking — owned first, bought second.

**Architecture:** One new server read joins `commander_support_cards` to `cards`, buckets each row's type line into a coarse facet, drops the cards Role Coverage already draws, and hands the commander page a single ranked array. The panel becomes a 44px row list with a facet strip, a disclosure and a per-row select toggle; the selection rides the existing `/decks?commander=` entry into `createDeck` as an array of oracle ids. On the deck surface, two new server actions walk the same ranking to fill the open slots — one filtered to owned cards, one not — writing `auto = true` rows so the shipped sweep undoes both.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Tailwind 4, Drizzle ORM on Neon Postgres, Vitest + React Testing Library.

**Spec:** `design/design_handoff_the99_synergy_discovery/` — `README.md` (decisions log, component notes, engineering notes), `STATES-fill-controls.md` (the twelve-state matrix), `DENSITY-synergy-panel.md` (the §7.1 density call), and `synergy-discovery · copy strings.ts` (production-final copy).

**Design property table:** `docs/superpowers/design-tables/synergy-discovery.md`. Every task below must satisfy the rows for the components it touches. Where the table records a `⚠️ CANVAS/README DIVERGENCE`, the canvas value is authoritative — in all six cases the README is silent on a per-width value rather than contradicting the canvas.

## Global Constraints

- **No new design tokens, no new hex values, no new motion classes, no new empty states, no new modals.** Hexes live only in `globals.css`; every colour is an existing `var(--…)`.
- **The 68-card baseline is unchanged.** `planFill` is not edited. `FILL_BASELINE_TOTAL` stays derived. Reaching 99 is opt-in.
- **`recommendationsCopy.build.stickyPromise` and `.seedNote` are locked** — not edited, not deleted, and still rendered at zero selection. The selection promise is a third string beside them.
- **Everything either fill control places, and everything a selection places, is `auto = true`.** Both feed `Clear all auto`'s count and both are undone by it.
- **The Role Coverage exclusion runs server-side, before the facet counts are computed.** Computing it client-side derives the counts from a different list than the rows.
- **All new copy lives in `src/lib/copy/synergy-discovery.ts`**, transcribed verbatim from the handoff's copy-strings file. Copy is never inlined in a component.
- **Mobile and desktop parity ships in the same task.** The breakpoint is 640px (`sm:`) in Tailwind's default scale, but this codebase's deck and commander surfaces use `md:` for the desktop branch — follow the file you are editing.
- **`pnpm` only.** Pre-push gate every push: `pnpm typecheck && pnpm lint && pnpm test`, plus `DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`.
- **Lint must stay at 0 problems and no test may be deleted or skipped.** The bar entering this work is 0 lint problems and 2037 passing tests across 141 files.
- **`role-counter-strip.tsx` and `role-counter-cell.tsx` are untouched.** The last 31 is not a role and gets no cell.
- **`rolesWithShelves` in `consider-panel.tsx` is untouched.** The synergy shelf has no role and no coverage cell pointing at it.

---

## File Structure

**Created:**

- `src/lib/copy/synergy-discovery.ts` — the `synergyCopy` block.
- `src/lib/cards/facet.ts` — `cardFacet(typeLine)`, the six-bucket type parse.
- `src/lib/cards/facet.test.ts`
- `src/lib/commanders/synergy-cards.ts` — `SynergyCard` type plus the pure shaping/exclusion/ordering helpers.
- `src/lib/commanders/synergy-cards.test.ts`
- `src/app/commanders/[slug]/synergy-read.ts` — the Drizzle read that produces `SynergyCard[]`.
- `src/components/commanders/synergy-row.tsx` — the 44/52px row, both widths.
- `src/components/commanders/synergy-row.test.tsx`
- `src/components/commanders/facet-strip.tsx` — the facet pills.
- `src/components/commanders/facet-strip.test.tsx`
- `src/components/commanders/synergy-panel.tsx` — the panel, lifted out of `detail.tsx`.
- `src/components/commanders/synergy-panel.test.tsx`
- `src/components/commanders/synergy-selection.tsx` — the selection promise line, Clear selection, and the Build link that carries the selection.
- `src/components/commanders/synergy-selection.test.tsx`
- `src/components/decks/last-slots-strip.tsx` — the last-31 strip with both fill controls and the shortfall line.
- `src/components/decks/last-slots-strip.test.tsx`
- `src/lib/decks/last-slots.ts` — the pure "which cards, in what order, how many" decision the two server actions share.
- `src/lib/decks/last-slots.test.ts`

**Modified:**

- `src/components/commanders/detail.tsx` — deletes `MissingChip`, deletes the old `SynergyPanel`, mounts the new panel at both widths, hosts the selection state, and passes the selection to the Build links.
- `src/components/commanders/role-card-list.tsx` — deletes `OwnedChip`.
- `src/app/commanders/[slug]/page.tsx` — calls the new read and passes `synergyCards` to `CommanderDetail`.
- `src/app/decks/actions.ts` — `createDeck` takes a selection; two new actions `fillLastSlotsOwned` / `fillLastSlotsUnowned`.
- `src/components/decks/builder-shell.tsx` — mounts the last-31 strip under the provenance line, wires both actions and the live region.
- `src/components/decks/consider-panel.tsx` — one shelf key added to `ShelfKey` and `buildShelves`.
- `src/components/decks/suggestion-tile.tsx` — the lift line's `&& suggestion.owned` clause removed.
- `src/lib/decks/celebration.ts` — one suppression flag for a fill-completed deck.
- `src/components/decks/create-pre-filled.tsx` / `create-picker.tsx` — whichever holds the `/decks?commander=` entry, to carry the selection through.

---

## Task 1: The copy block

**Files:**
- Create: `src/lib/copy/synergy-discovery.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `synergyCopy`, a `const … as const` object with the sections `panel`, `figure`, `facet`, `disclosure`, `select`, `lastSlots`, `shelf`. Every later task imports from here.

- [ ] **Step 1: Transcribe the copy block**

Copy the `synergyCopy` export out of `design/design_handoff_the99_synergy_discovery/synergy-discovery · copy strings.ts` into `src/lib/copy/synergy-discovery.ts`, **verbatim** — every string, every function signature, every comment. Keep the file's header comment listing the strings this block must not touch.

Two details that are load-bearing and easy to lose in transcription:

```ts
    synergyNegative: (pts: string) => `−${pts} pts`,   // U+2212 MINUS SIGN, not a hyphen
    synergy: (pts: string) => `${pts === '1' ? '+1 pt' : `+${pts} pts`}`,
```

Do **not** transcribe the trailing `REPLACES` comment block as code — it is guidance for Tasks 6 and 12, and it stays in the handoff.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS. A copy module has no test of its own — it is a data file, and the components that render it assert on its values.

- [ ] **Step 3: Commit**

```bash
git add src/lib/copy/synergy-discovery.ts
git commit -m "feat(copy): the synergy discovery copy block"
```

---

## Task 2: The facet bucket

**Files:**
- Create: `src/lib/cards/facet.ts`
- Test: `src/lib/cards/facet.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export type CardFacet = "creature" | "spell" | "artifact" | "enchantment" | "land" | "other"` and `export function cardFacet(typeLine: string): CardFacet`.

The bucket order is a precedence, not a set: the handoff's gap report 2 rules that an artifact creature is a **creature**, and a creature land is a **creature** by the same precedence. Land is checked before artifact and enchantment so that an artifact land buckets as a land — a land is what you play it as.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { cardFacet } from "./facet";

describe("cardFacet", () => {
  it("buckets the six plain cases", () => {
    expect(cardFacet("Creature — Human Wizard")).toBe("creature");
    expect(cardFacet("Instant")).toBe("spell");
    expect(cardFacet("Sorcery")).toBe("spell");
    expect(cardFacet("Artifact")).toBe("artifact");
    expect(cardFacet("Enchantment")).toBe("enchantment");
    expect(cardFacet("Land")).toBe("land");
  });

  // Gap report 2: the facet answers "what supports this commander", and a
  // creature that is also an artifact is still a creature.
  it("gives a multi-type card its creature bucket first", () => {
    expect(cardFacet("Artifact Creature — Golem")).toBe("creature");
    expect(cardFacet("Enchantment Creature — Boar")).toBe("creature");
    expect(cardFacet("Legendary Creature — Elf Druid")).toBe("creature");
  });

  it("buckets an artifact land as a land", () => {
    expect(cardFacet("Artifact Land")).toBe("land");
    expect(cardFacet("Land — Forest")).toBe("land");
  });

  // A DFC's type line carries both faces; the front face decides.
  it("reads the front face of a double-faced type line", () => {
    expect(cardFacet("Creature — Human // Land")).toBe("creature");
    expect(cardFacet("Land // Instant")).toBe("land");
  });

  it("puts everything with no bucket in other", () => {
    expect(cardFacet("Planeswalker — Teferi")).toBe("other");
    expect(cardFacet("Battle — Siege")).toBe("other");
    expect(cardFacet("")).toBe("other");
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test src/lib/cards/facet.test.ts`
Expected: FAIL — cannot resolve `./facet`.

- [ ] **Step 3: Write the implementation**

```ts
export type CardFacet =
  | "creature"
  | "spell"
  | "artifact"
  | "enchantment"
  | "land"
  | "other";

/** The coarse bucket the synergy panel's facet strip groups on. Not the type
 *  line: the `All` facet prints this alone, and the strip counts rows by it.
 *
 *  Checked in precedence order, because most cards carry more than one type.
 *  Creature wins outright (handoff gap report 2: a creature that is also an
 *  artifact is still a creature). Land beats artifact and enchantment, because
 *  an artifact land is a land in play. Planeswalkers and battles have no facet
 *  of their own and fall to `other` rather than earning a pill of two rows.
 *
 *  A DFC's type line is "Front // Back" and only the front face is played from
 *  hand, so the back is not consulted. */
export function cardFacet(typeLine: string): CardFacet {
  const front = typeLine.split(" // ")[0].toLowerCase();
  if (front.includes("creature")) return "creature";
  if (front.includes("land")) return "land";
  if (front.includes("instant") || front.includes("sorcery")) return "spell";
  if (front.includes("artifact")) return "artifact";
  if (front.includes("enchantment")) return "enchantment";
  return "other";
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm test src/lib/cards/facet.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/cards/facet.ts src/lib/cards/facet.test.ts
git commit -m "feat(cards): bucket a type line into the synergy panel's six facets"
```

---

## Task 3: The synergy card shape, exclusion and ordering

**Files:**
- Create: `src/lib/commanders/synergy-cards.ts`
- Test: `src/lib/commanders/synergy-cards.test.ts`

**Interfaces:**
- Consumes: `cardFacet` from Task 2.
- Produces:
  - `export type SynergyCard = { oracleId: string; name: string; typeLine: string; facet: CardFacet; inclusionPct: number | null; synergyPts: number | null; owned: boolean }`
  - `export function orderBySynergy(cards: SynergyCard[]): SynergyCard[]`
  - `export function excludeCoveredRoleCards(cards: SynergyCard[], coveredOracleIds: Set<string>): SynergyCard[]`
  - `export function facetCounts(cards: SynergyCard[]): Record<CardFacet | "all", number>`

This task is pure. The Drizzle read is Task 4 and calls these.

`synergyPts` is EDHREC's fraction already multiplied to points and rounded — the formatting decision belongs to the read, not the row, so the client never sees a fraction. A null synergy orders last, and it does **not** suppress a real inclusion figure beside it.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import {
  orderBySynergy,
  excludeCoveredRoleCards,
  facetCounts,
  type SynergyCard,
} from "./synergy-cards";

function card(over: Partial<SynergyCard> & { oracleId: string }): SynergyCard {
  return {
    name: over.oracleId,
    typeLine: "Creature — Human",
    facet: "creature",
    inclusionPct: null,
    synergyPts: null,
    owned: false,
    ...over,
  };
}

describe("orderBySynergy", () => {
  it("sorts by synergy descending", () => {
    const out = orderBySynergy([
      card({ oracleId: "a", synergyPts: 12 }),
      card({ oracleId: "b", synergyPts: 47 }),
      card({ oracleId: "c", synergyPts: 30 }),
    ]);
    expect(out.map((c) => c.oracleId)).toEqual(["b", "c", "a"]);
  });

  // A negative figure is a fact about a matchup, not an absence — it sorts
  // where its value puts it, above the cards with no figure at all.
  it("sorts a negative figure above an absent one", () => {
    const out = orderBySynergy([
      card({ oracleId: "none" }),
      card({ oracleId: "neg", synergyPts: -5 }),
    ]);
    expect(out.map((c) => c.oracleId)).toEqual(["neg", "none"]);
  });

  it("breaks a tie on name so the order is stable across reads", () => {
    const out = orderBySynergy([
      card({ oracleId: "z", name: "Zealot", synergyPts: 9 }),
      card({ oracleId: "a", name: "Aegis", synergyPts: 9 }),
    ]);
    expect(out.map((c) => c.name)).toEqual(["Aegis", "Zealot"]);
  });

  it("does not mutate its input", () => {
    const input = [card({ oracleId: "a", synergyPts: 1 }), card({ oracleId: "b", synergyPts: 2 })];
    orderBySynergy(input);
    expect(input.map((c) => c.oracleId)).toEqual(["a", "b"]);
  });
});

describe("excludeCoveredRoleCards", () => {
  // Decision 4: the exclusion is silent, and it only takes OWNED cards.
  it("drops an owned card Role Coverage already draws", () => {
    const out = excludeCoveredRoleCards(
      [card({ oracleId: "sol", owned: true }), card({ oracleId: "keep", owned: true })],
      new Set(["sol"]),
    );
    expect(out.map((c) => c.oracleId)).toEqual(["keep"]);
  });

  it("keeps an unowned card even when the same id is covered", () => {
    const out = excludeCoveredRoleCards(
      [card({ oracleId: "crypt", owned: false })],
      new Set(["crypt"]),
    );
    expect(out.map((c) => c.oracleId)).toEqual(["crypt"]);
  });
});

describe("facetCounts", () => {
  it("counts each facet and the all scope", () => {
    const counts = facetCounts([
      card({ oracleId: "a", facet: "creature" }),
      card({ oracleId: "b", facet: "creature" }),
      card({ oracleId: "c", facet: "land" }),
    ]);
    expect(counts.creature).toBe(2);
    expect(counts.land).toBe(1);
    expect(counts.spell).toBe(0);
    expect(counts.all).toBe(3);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test src/lib/commanders/synergy-cards.test.ts`
Expected: FAIL — cannot resolve `./synergy-cards`.

- [ ] **Step 3: Write the implementation**

```ts
import type { CardFacet } from "../cards/facet";

/** One row of the commander's synergy ranking, as the panel draws it.
 *
 *  `synergyPts` is EDHREC's fraction already multiplied by 100 and rounded:
 *  the product states synergy in points everywhere (suggestion-tile.tsx's
 *  Evidence line shipped first), so the fraction never reaches the client and
 *  no component formats one twice.
 *
 *  The two figures are independently nullable. A card EDHREC ranks but reports
 *  no inclusion for is a real row with one em dash in it — a null synergy must
 *  never suppress a real inclusion, or the panel invents an outage per row. */
export type SynergyCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  facet: CardFacet;
  inclusionPct: number | null;
  synergyPts: number | null;
  owned: boolean;
};

/** Synergy descending, absent last, name as the tiebreak.
 *
 *  Name rather than insertion order: the read's row order is Postgres's, which
 *  is not stable across plans, and an unstable ranking re-orders under the
 *  player's cursor between one visit and the next.
 *
 *  A negative figure sorts on its value and lands above the nulls. "Runs it
 *  less often than average" is information; "we have no figure" is not. */
export function orderBySynergy(cards: SynergyCard[]): SynergyCard[] {
  return [...cards].sort((a, b) => {
    if (a.synergyPts == null && b.synergyPts == null) return a.name.localeCompare(b.name);
    if (a.synergyPts == null) return 1;
    if (b.synergyPts == null) return -1;
    if (a.synergyPts !== b.synergyPts) return b.synergyPts - a.synergyPts;
    return a.name.localeCompare(b.name);
  });
}

/** Ruling 3's exclusion: an owned card Role Coverage already draws for ramp,
 *  draw, removal or wipes does not appear here a second time.
 *
 *  Ownership is the whole condition. Role Coverage draws the player's own
 *  cards, so an unowned role staple — Mana Crypt is ramp, and unowned — is
 *  drawn nowhere else and stays. Silent by design: a "12 hidden" note invites
 *  a control to reveal them, which is the ownership audit returning by the
 *  side door. */
export function excludeCoveredRoleCards(
  cards: SynergyCard[],
  coveredOracleIds: Set<string>,
): SynergyCard[] {
  return cards.filter((c) => !(c.owned && coveredOracleIds.has(c.oracleId)));
}

/** Facet counts are post-exclusion, so a pill states the number of rows that
 *  exist behind it. The headline's `of top {n}` is a different number on
 *  purpose — it is what EDHREC associates, which ruling 1 locked. */
export function facetCounts(cards: SynergyCard[]): Record<CardFacet | "all", number> {
  const counts: Record<CardFacet | "all", number> = {
    creature: 0, spell: 0, artifact: 0, enchantment: 0, land: 0, other: 0, all: cards.length,
  };
  for (const c of cards) counts[c.facet]++;
  return counts;
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm test src/lib/commanders/synergy-cards.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/commanders/synergy-cards.ts src/lib/commanders/synergy-cards.test.ts
git commit -m "feat(commanders): shape, exclude and order the commander's synergy ranking"
```

---

## Task 4: The read path

**Files:**
- Create: `src/app/commanders/[slug]/synergy-read.ts`
- Modify: `src/app/commanders/[slug]/page.tsx`
- Test: `src/app/commanders/[slug]/synergy-read.test.ts`

**Interfaces:**
- Consumes: `SynergyCard`, `orderBySynergy`, `excludeCoveredRoleCards` (Task 3); `cardFacet` (Task 2); `commanderSupportCards`, `cards`, `collectionItems` from `src/db/schema.ts`.
- Produces: `export async function readSynergyCards(userId: string, commanderOracleId: string, coveredOracleIds: string[]): Promise<SynergyCard[]>`, and `CommanderDetail` gains a `synergyCards: SynergyCard[]` prop.

`commander_support_cards` carries `inclusion` and `synergy` as `real`. Both are nullable and neither is ever stored as 0 (`schema.ts:278-280` says so explicitly), so a null here is genuine absence, not a zero to be rendered as a figure.

The shape of the query: select from `commanderSupportCards` where `commanderOracleId` matches, inner-join `cards` on `oracleId` (a support row whose card is not in the catalog has no name or type line to draw and is dropped — the same silent drop `edhrecTotal`'s comment documents), and left-join the user's `collection_items` grouped to a boolean for ownership.

- [ ] **Step 1: Write the failing test**

The repo's existing DB-touching reads are tested by stubbing the Drizzle module. Follow the pattern in `src/app/commanders/[slug]/coverage-action.test.ts`. Assert three things and no more — the SQL itself is not unit-testable and the shaping is already covered by Task 3:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const rows = vi.hoisted(() => ({ value: [] as unknown[] }));

vi.mock("../../../db/client", () => ({
  db: {
    select: () => ({
      from: () => ({
        innerJoin: () => ({
          leftJoin: () => ({
            where: () => ({ groupBy: () => Promise.resolve(rows.value) }),
          }),
        }),
      }),
    }),
  },
}));

import { readSynergyCards } from "./synergy-read";

beforeEach(() => { rows.value = []; });

describe("readSynergyCards", () => {
  it("converts EDHREC's fraction to whole points and its inclusion to a percent", async () => {
    rows.value = [
      { oracleId: "a", name: "Command Tower", typeLine: "Land", inclusion: 0.82, synergy: 0.01, ownedQuantity: 0 },
    ];
    const out = await readSynergyCards("user", "cmdr", []);
    expect(out[0].inclusionPct).toBe(82);
    expect(out[0].synergyPts).toBe(1);
  });

  it("keeps a null figure null rather than turning it into a zero", async () => {
    rows.value = [
      { oracleId: "a", name: "Nulls", typeLine: "Instant", inclusion: null, synergy: null, ownedQuantity: 0 },
    ];
    const out = await readSynergyCards("user", "cmdr", []);
    expect(out[0].inclusionPct).toBeNull();
    expect(out[0].synergyPts).toBeNull();
  });

  it("orders by synergy and applies the covered-role exclusion", async () => {
    rows.value = [
      { oracleId: "low", name: "Low", typeLine: "Instant", inclusion: 10, synergy: 0.05, ownedQuantity: 0 },
      { oracleId: "high", name: "High", typeLine: "Instant", inclusion: 10, synergy: 0.5, ownedQuantity: 0 },
      { oracleId: "covered", name: "Covered", typeLine: "Artifact", inclusion: 80, synergy: 0.9, ownedQuantity: 2 },
    ];
    const out = await readSynergyCards("user", "cmdr", ["covered"]);
    expect(out.map((c) => c.oracleId)).toEqual(["high", "low"]);
  });

  it("reads ownership off the collection quantity", async () => {
    rows.value = [
      { oracleId: "a", name: "Owned", typeLine: "Land", inclusion: null, synergy: 0.2, ownedQuantity: 1 },
      { oracleId: "b", name: "Not", typeLine: "Land", inclusion: null, synergy: 0.1, ownedQuantity: 0 },
    ];
    const out = await readSynergyCards("user", "cmdr", []);
    expect(out.map((c) => c.owned)).toEqual([true, false]);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test src/app/commanders/\[slug\]/synergy-read.test.ts`
Expected: FAIL — cannot resolve `./synergy-read`.

- [ ] **Step 3: Write the read**

```ts
import { eq, and, sql } from "drizzle-orm";
import { db } from "../../../db/client";
import { cards, collectionItems, commanderSupportCards } from "../../../db/schema";
import { cardFacet } from "../../../lib/cards/facet";
import {
  excludeCoveredRoleCards,
  orderBySynergy,
  type SynergyCard,
} from "../../../lib/commanders/synergy-cards";

/** The commander's full EDHREC support list, ranked by synergy, as the panel
 *  draws it. One query: the support rows joined to the catalog for the name and
 *  type line, and left-joined to the collection for ownership.
 *
 *  Inner join to `cards` on purpose. A support row whose oracle id is not in
 *  the catalog has no name and no type line, so there is no row to draw — the
 *  same silent drop `commander_support.edhrec_total` documents, where the
 *  stored total counts names before unresolvable ones are dropped.
 *
 *  The exclusion is applied here rather than in the client because the facet
 *  counts are computed from this list: excluding on the client would count one
 *  list and render another. */
export async function readSynergyCards(
  userId: string,
  commanderOracleId: string,
  coveredOracleIds: string[],
): Promise<SynergyCard[]> {
  const rows = await db
    .select({
      oracleId: commanderSupportCards.oracleId,
      name: cards.name,
      typeLine: cards.typeLine,
      inclusion: commanderSupportCards.inclusion,
      synergy: commanderSupportCards.synergy,
      ownedQuantity: sql<number>`coalesce(sum(${collectionItems.quantity}), 0)::int`,
    })
    .from(commanderSupportCards)
    .innerJoin(cards, eq(cards.oracleId, commanderSupportCards.oracleId))
    .leftJoin(
      collectionItems,
      and(
        eq(collectionItems.oracleId, commanderSupportCards.oracleId),
        eq(collectionItems.userId, userId),
      ),
    )
    .where(eq(commanderSupportCards.commanderOracleId, commanderOracleId))
    .groupBy(
      commanderSupportCards.oracleId,
      cards.name,
      cards.typeLine,
      commanderSupportCards.inclusion,
      commanderSupportCards.synergy,
    );

  const shaped: SynergyCard[] = rows.map((r) => ({
    oracleId: r.oracleId,
    name: r.name,
    typeLine: r.typeLine ?? "",
    facet: cardFacet(r.typeLine ?? ""),
    // EDHREC hands inclusion back as a percentage on some feeds and a fraction
    // on others; the ingest normalises to a percentage, so this only rounds.
    inclusionPct: r.inclusion == null ? null : Math.round(r.inclusion),
    // Points, not the fraction. The product has stated synergy in points since
    // suggestion-tile.tsx's Evidence line, and formatting it once here means no
    // component multiplies by 100 a second time.
    synergyPts: r.synergy == null ? null : Math.round(r.synergy * 100),
    owned: r.ownedQuantity > 0,
  }));

  return orderBySynergy(excludeCoveredRoleCards(shaped, new Set(coveredOracleIds)));
}
```

**Note on the inclusion unit.** Before writing the conversion above, confirm the stored unit with one query against staging: `select inclusion from commander_support_cards limit 5`. If the values are fractions in `0..1` rather than percentages, change `Math.round(r.inclusion)` to `Math.round(r.inclusion * 100)` and say so in the commit message. Do not guess — a factor of 100 on this figure is the difference between `82%` and `1%`.

- [ ] **Step 4: Wire the page**

In `src/app/commanders/[slug]/page.tsx`, after `scoreOneCommander` returns, gather the covered oracle ids from the commander's `roleCards` (the four role buckets Role Coverage draws) and pass the result down:

```tsx
  const commander = await scoreOneCommander(userId, found.oracleId, slug);
  if (!commander) notFound();

  // Ruling 3's exclusion input: the owned cards Role Coverage already draws.
  // Taken off the same `roleCards` the coverage section renders, so the two can
  // never disagree about what is on screen twice.
  const covered = Object.values(commander.roleCards)
    .flat()
    .map((c) => c.oracleId);
  const synergyCards = await readSynergyCards(userId, found.oracleId, covered);

  return (
    <CommanderDetail
      commander={commander}
      rank={found.rank}
      isBestFit={found.rank === 1}
      synergyCards={synergyCards}
    />
  );
```

Add `synergyCards: SynergyCard[]` to `CommanderDetail`'s props in `detail.tsx` and thread it to the panel in Task 6. Until then, accept it and leave it unused with a `void synergyCards;` — no, do **not** do that: instead make Task 6 the first consumer and land Tasks 4 and 6 in the same fix round if the prop is otherwise unused. If `pnpm lint` objects to an unused prop before Task 6 lands, take the prop in Task 6 rather than in Task 4, and keep Task 4 to the read plus its test.

- [ ] **Step 5: Run the tests, typecheck and lint**

Run: `pnpm test src/app/commanders && pnpm typecheck && pnpm lint`
Expected: PASS, 0 lint problems.

- [ ] **Step 6: Commit**

```bash
git add src/app/commanders/\[slug\]/synergy-read.ts src/app/commanders/\[slug\]/synergy-read.test.ts src/app/commanders/\[slug\]/page.tsx
git commit -m "feat(commanders): read the commander's synergy ranking from EDHREC support"
```

---

## Task 5: The synergy row and the facet strip

**Files:**
- Create: `src/components/commanders/synergy-row.tsx`
- Create: `src/components/commanders/facet-strip.tsx`
- Test: `src/components/commanders/synergy-row.test.tsx`
- Test: `src/components/commanders/facet-strip.test.tsx`

**Interfaces:**
- Consumes: `SynergyCard` (Task 3), `synergyCopy` (Task 1), `CardDetailTrigger` from `../cards/card-detail-provider`.
- Produces:
  - `export function SynergyRow({ card, selected, onToggle, siblings, width }: { card: SynergyCard; selected: boolean; onToggle: () => void; siblings: string[]; width: "desktop" | "phone" })`
  - `export function FacetStrip({ counts, selected, onSelect }: { counts: Record<CardFacet | "all", number>; selected: CardFacet | "all"; onSelect: (f: CardFacet | "all") => void })`

Both are presentational. The panel (Task 6) owns the state.

**Row geometry — desktop.** `--surface` on `1px --border`, radius 8px, min-height 44px, padding `0 6px 0 12px`, gap 10px. Six slots left to right: ownership dot 7px · name 13.5px `--fg` ellipsed at `flex:auto;min-width:0` · type line mono 10px `--fg-locked` 150px ellipsed · synergy mono 11.5px `--accent` 64px right-aligned tabular · inclusion mono 11px `--fg-faint` 46px right-aligned tabular · toggle 34×34.

**Row geometry — phone.** Same fill and border, min-height **52px**, toggle 44×44. The type line is dropped; the two figures move to a meta line under the name — mono 10px, `+N pts` in `--accent` then `· edhrec N%` in `--fg-faint`.

**Ownership mark.** Owned: 7px filled `--success`. Unowned: 7px transparent with a `1px --fg-locked` ring. `aria-hidden` — the word is in the row's accessible name.

**Toggle.** Radius 7px, `1px --border-strong`, glyph mono `--fg-faint`, `+` at rest. Selected: `1px --accent`, glyph `✓` in `--accent`, fill `color-mix(in oklab, var(--accent) 10%, transparent)`. Carries `aria-pressed`.

**Selected row.** Fill `--elevated-hover`, border `--accent-shadow`. No transition.

**Absent figures.** Em dash, mono, `--fg-locked`, `aria-hidden`. Each figure absent independently.

**Negative synergy.** Mono 11.5px `--fg-locked`, minus sign U+2212, tabular. Never `--danger`.

**Facet pills.** Mono 11.5px, height 30px (32px phone), padding `0 11px`, radius 999px, `--surface-raised` on `1px --border`, count in `--fg-locked`. Selected: `1px --accent`, label `--fg`, count `--accent`. `All` takes a dashed `--border-strong` border when unselected — it is a scope, not a type. Horizontal scroller at phone width. The group is a `role="radiogroup"` with `aria-label={synergyCopy.facet.groupAria}` and each pill is a `role="radio"` with `aria-checked` — a radiogroup, not tabs, because no pill controls a panel of its own.

- [ ] **Step 1: Write the failing tests**

```tsx
// synergy-row.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SynergyRow } from "./synergy-row";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";

const base: SynergyCard = {
  oracleId: "a", name: "Command Tower", typeLine: "Land",
  facet: "land", inclusionPct: 82, synergyPts: 1, owned: true,
};

describe("SynergyRow", () => {
  it("states a single point in the singular", () => {
    render(<SynergyRow card={base} selected={false} onToggle={() => {}} siblings={["a"]} width="desktop" />);
    expect(screen.getByText("+1 pt")).toBeInTheDocument();
  });

  it("draws a negative figure with a minus sign, not a hyphen", () => {
    render(<SynergyRow card={{ ...base, synergyPts: -5 }} selected={false} onToggle={() => {}} siblings={["a"]} width="desktop" />);
    expect(screen.getByText("−5 pts")).toBeInTheDocument();
  });

  // An absent synergy must not suppress a real inclusion beside it.
  it("draws each figure's absence independently", () => {
    render(<SynergyRow card={{ ...base, synergyPts: null }} selected={false} onToggle={() => {}} siblings={["a"]} width="desktop" />);
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBe(1);
  });

  it("names ownership in the accessible name rather than by colour alone", () => {
    render(<SynergyRow card={{ ...base, owned: false }} selected={false} onToggle={() => {}} siblings={["a"]} width="desktop" />);
    expect(screen.getByLabelText(/Not in your collection/)).toBeInTheDocument();
  });

  it("toggles through an aria-pressed button", async () => {
    const onToggle = vi.fn();
    render(<SynergyRow card={base} selected={false} onToggle={onToggle} siblings={["a"]} width="desktop" />);
    const toggle = screen.getByRole("button", { name: synergyCopy.select.addAria("Command Tower") });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("offers the remove label once selected", () => {
    render(<SynergyRow card={base} selected onToggle={() => {}} siblings={["a"]} width="desktop" />);
    expect(
      screen.getByRole("button", { name: synergyCopy.select.removeAria("Command Tower") }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("drops the type line at phone width and prefixes the inclusion figure", () => {
    render(<SynergyRow card={base} selected={false} onToggle={() => {}} siblings={["a"]} width="phone" />);
    expect(screen.queryByText("Land")).not.toBeInTheDocument();
    expect(screen.getByText(/edhrec 82%/)).toBeInTheDocument();
  });
});
```

```tsx
// facet-strip.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FacetStrip } from "./facet-strip";
import { synergyCopy } from "../../lib/copy/synergy-discovery";

const counts = { creature: 66, spell: 40, artifact: 22, enchantment: 14, land: 56, other: 0, all: 198 };

describe("FacetStrip", () => {
  it("is a radiogroup, not a tablist", () => {
    render(<FacetStrip counts={counts} selected="creature" onSelect={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: synergyCopy.facet.groupAria })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("marks the selected facet checked and no other", () => {
    render(<FacetStrip counts={counts} selected="creature" onSelect={() => {}} />);
    const checked = screen.getAllByRole("radio").filter((r) => r.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveAccessibleName(synergyCopy.facet.itemAria("Creatures", "66"));
  });

  // A pill for a facet with no rows behind it is a control that does nothing.
  it("omits a facet with a zero count", () => {
    render(<FacetStrip counts={counts} selected="creature" onSelect={() => {}} />);
    expect(screen.queryByText(/^Other/)).not.toBeInTheDocument();
  });

  it("reports the chosen facet", async () => {
    const onSelect = vi.fn();
    render(<FacetStrip counts={counts} selected="creature" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("radio", { name: synergyCopy.facet.itemAria("Lands", "56") }));
    expect(onSelect).toHaveBeenCalledWith("land");
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm test src/components/commanders/synergy-row.test.tsx src/components/commanders/facet-strip.test.tsx`
Expected: FAIL — neither module resolves.

- [ ] **Step 3: Write the two components**

`SynergyRow` renders an `<li>` carrying the geometry above. The name is a `CardDetailTrigger` with `siblings` so Prev/Next pages the visible ranking. The row's accessible name comes from `synergyCopy.figure.rowAria`, composed from `ariaOwned` / `ariaUnowned`, `ariaSynergyPlus` / `ariaSynergyMinus` / `ariaSynergyNone`, and the inclusion percentage or `ariaInclusionNone`. The toggle is a `<button type="button" aria-pressed={selected}>` labelled `select.addAria` at rest and `select.removeAria` when selected.

`FacetStrip` renders a `<div role="radiogroup">` of `<button role="radio">` pills in the fixed order All, Creatures, Instants & sorceries, Artifacts, Enchantments, Lands — skipping any facet whose count is 0, and using `facet.spellsShort` for the spell pill at phone width. `Other` never gets a pill; its rows are reachable through `All`.

Follow the property table's rows for `FacetStrip` and both `SynergyRow` variants exactly. Both components take a single responsive tree where the two widths differ only in Tailwind classes — never two subtrees behind `md:hidden` / `hidden md:block`, which doubles the DOM and makes a verify pass mark both columns MATCH on a duplicated element. The one exception is the phone meta line, which has no desktop counterpart at all and is genuinely `md:hidden`.

- [ ] **Step 4: Run the tests**

Run: `pnpm test src/components/commanders/synergy-row.test.tsx src/components/commanders/facet-strip.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/commanders/synergy-row.tsx src/components/commanders/facet-strip.tsx src/components/commanders/synergy-row.test.tsx src/components/commanders/facet-strip.test.tsx
git commit -m "feat(commanders): the synergy row and its facet strip"
```

---

## Task 6: The synergy panel

**Files:**
- Create: `src/components/commanders/synergy-panel.tsx`
- Test: `src/components/commanders/synergy-panel.test.tsx`
- Modify: `src/components/commanders/detail.tsx`
- Modify: `src/components/commanders/role-card-list.tsx`

**Interfaces:**
- Consumes: `SynergyRow`, `FacetStrip` (Task 5); `facetCounts`, `SynergyCard` (Task 3); `synergyCopy` (Task 1).
- Produces: `export function SynergyPanel({ cards, edhrecTotal, synergyState, selected, onToggle, width, onRetry })` — `selected` is a `Set<string>` of oracle ids owned by `detail.tsx` (Task 7), and `onToggle` takes an oracle id.

**Panel structure, top to bottom:** headline (`{n}` count, `of top {edhrecTotal}` — kept **verbatim**, it is ruling 1's locked string) · sub-caption from `panel.subcaption` / `.subcaptionMobile` · facet strip · figure legend (`panel.legend` / `.legendMobile`) · column header row (desktop only, `panel.colCard` / `colType` / `colSynergy` / `colDecks`) · the rows · the disclosure.

**Disclosure.** Rests at 10 rows on desktop, 6 on phone. `disclosure.showAll(n, facet)` → `disclosure.showFewer`. Full-width 44px row at both widths, dashed `--border-strong`, mono 12px `--accent`. **No expanded item cap** — the full facet is reachable. Expanded, the list container takes `max-height: 480px; overflow-y: auto`.

**Facet changes and expansion do not reset each other**, and neither resets the selection.

**Absent vs. degraded.** When `synergyState !== "ok"` the panel draws the shipped pair from `detail.tsx:219-234` unchanged — `'Synergy data unavailable'` for degraded (with the existing retry) and `'No synergy data'` for absent. Those two strings are reused as-is and get no key in `synergyCopy`.

**Empty facet.** `facet.empty(facet)` when the selected facet has no rows. This cannot happen through the strip, which omits zero-count pills, but it can happen when a collection change empties a facet between render and interaction.

**Deletions in this task.** `MissingChip` (`detail.tsx:21-47`) and `OwnedChip` (`role-card-list.tsx:3-24`) are deleted as components, along with the old `SynergyPanel` (`detail.tsx:244-350`), the mobile EDHREC section's chip lists (`detail.tsx:525-614`), the string `'Not in your collection — {n} · the gap to close'`, and the string `'None of the top synergy cards are in your collection'`. Their dots survive inside `SynergyRow`. Check for and remove every now-dead import.

**The two sub-captions change.** `'Top {n} synergy cards for this commander'` becomes `synergyCopy.panel.subcaption(n)` at desktop and `.subcaptionMobile(n)` at phone. The headline's `of top {m}` does not change.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SynergyPanel } from "./synergy-panel";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";

function make(n: number, facet: SynergyCard["facet"] = "creature"): SynergyCard[] {
  return Array.from({ length: n }, (_, i) => ({
    oracleId: `id-${facet}-${i}`, name: `${facet} ${i}`, typeLine: "Creature — Human",
    facet, inclusionPct: 50, synergyPts: 100 - i, owned: i % 2 === 0,
  }));
}

const props = {
  edhrecTotal: 258, synergyState: "ok" as const,
  selected: new Set<string>(), onToggle: () => {}, onRetry: () => {},
};

describe("SynergyPanel", () => {
  it("rests on ten rows at desktop and reveals the rest behind the disclosure", async () => {
    render(<SynergyPanel {...props} cards={make(30)} width="desktop" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    await userEvent.click(
      screen.getByRole("button", { name: synergyCopy.disclosure.showAllAria("30", "Creatures") }),
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(30);
  });

  it("rests on six rows at phone width", () => {
    render(<SynergyPanel {...props} cards={make(30)} width="phone" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });

  it("defaults to the creature facet and keeps the expansion across a facet change", async () => {
    const cards = [...make(30, "creature"), ...make(20, "land")];
    render(<SynergyPanel {...props} cards={cards} width="desktop" />);
    await userEvent.click(
      screen.getByRole("button", { name: synergyCopy.disclosure.showAllAria("30", "Creatures") }),
    );
    await userEvent.click(screen.getByRole("radio", { name: synergyCopy.facet.itemAria("Lands", "20") }));
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
  });

  it("keeps the headline's locked of-top figure beside the facet's own count", () => {
    render(<SynergyPanel {...props} cards={make(30)} width="desktop" />);
    expect(screen.getByText(/of top 258/)).toBeInTheDocument();
  });

  it("draws the shipped degraded pair rather than a ranking", () => {
    render(<SynergyPanel {...props} cards={[]} synergyState="degraded" width="desktop" />);
    expect(screen.getByText("Synergy data unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });

  it("draws the shipped absent string rather than a ranking", () => {
    render(<SynergyPanel {...props} cards={[]} synergyState="absent" width="desktop" />);
    expect(screen.getByText("No synergy data")).toBeInTheDocument();
  });

  it("reports a toggle by oracle id", async () => {
    const onToggle = vi.fn();
    render(<SynergyPanel {...props} onToggle={onToggle} cards={make(3)} width="desktop" />);
    const rows = screen.getAllByRole("listitem");
    await userEvent.click(within(rows[0]).getByRole("button", { name: /^Add / }));
    expect(onToggle).toHaveBeenCalledWith("id-creature-0");
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test src/components/commanders/synergy-panel.test.tsx`
Expected: FAIL — cannot resolve `./synergy-panel`.

- [ ] **Step 3: Write the panel**

Own two pieces of state: `facet` (default `"creature"`, falling back to `"all"` when the creature count is 0) and `expanded` (default `false`). Neither resets the other and neither touches `selected`, which is the parent's.

- [ ] **Step 4: Rewire detail.tsx at both widths, and delete the dead code**

Mount `<SynergyPanel width="desktop" …>` in the desktop right column where the old panel sat (`detail.tsx:817`) and `<SynergyPanel width="phone" …>` in the mobile scrolling body where the mobile EDHREC section sat (`detail.tsx:525-614`). Take the `synergyCards` prop Task 4 added to the page. Delete `MissingChip`, `OwnedChip`, the old `SynergyPanel`, and the two deleted strings.

- [ ] **Step 5: Run the full suite, typecheck and lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS, 0 lint problems. `detail.test.tsx` will have assertions on the deleted chips and strings — update them to the new row list rather than deleting them; a test that asserted "the gap to close" now asserts an unowned row is present with its hollow-ring accessible name.

- [ ] **Step 6: Commit**

```bash
git add src/components/commanders/synergy-panel.tsx src/components/commanders/synergy-panel.test.tsx src/components/commanders/detail.tsx src/components/commanders/detail.test.tsx src/components/commanders/role-card-list.tsx
git commit -m "feat(commanders): the synergy panel replaces the two overlap chip lists"
```

---

## Task 7: Selection, the promise line, and the build handoff

**Files:**
- Create: `src/components/commanders/synergy-selection.tsx`
- Test: `src/components/commanders/synergy-selection.test.tsx`
- Modify: `src/components/commanders/detail.tsx`

**Interfaces:**
- Consumes: `synergyCopy` (Task 1), `FILL_BASELINE_TOTAL` (already imported by `detail.tsx`).
- Produces: `export function SynergySelection({ selectedCards, width })` rendering the promise line and Clear selection; and `detail.tsx` gains `const [selected, setSelected] = useState<Set<string>>(new Set())` plus a Build href carrying the selection.

**The promise arithmetic.** `filled` is `FILL_BASELINE_TOTAL` (68), `picked` is the selection size, `total` is `min(99, filled + picked)`. Past 99 the count clamps and `select.promiseFull(picked)` says so. The unowned clause `select.promiseUnowned(n)` renders in `--warning` when the selection holds unowned cards.

**The two locked strings stay.** `build.stickyPromise` and `build.seedNote` render unchanged at zero selection; the promise line is a **third** string that appears beneath them once a card is selected. At zero selection the page is byte-identical to what ships today.

**Placement.** Desktop: under `Build this deck` in the left sticky column. Phone: in the sticky Build bar. Mono 10.5px `--fg-body`, total in `--fg`, `Clear selection · N` mono 11px `--accent` beneath.

**Lifetime (ruling 4).** Page state. Cleared by `Clear selection` and by leaving the route. Not persisted, not restored by back-navigation, not capped. Survives facet changes and expansion.

**The handoff.** The Build link becomes `/decks?commander={oracleId}&select={ids.join(",")}`, and drops the `select` parameter entirely at zero selection so the shipped URL is unchanged.

**Announcement.** `select.announce(picked, total)` on the existing live region, debounced so twelve fast toggles are one message.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SynergySelection } from "./synergy-selection";
import { synergyCopy } from "../../lib/copy/synergy-discovery";

const owned = (n: number) => Array.from({ length: n }, (_, i) => ({ oracleId: `o${i}`, owned: true }));
const unowned = (n: number) => Array.from({ length: n }, (_, i) => ({ oracleId: `u${i}`, owned: false }));

describe("SynergySelection", () => {
  it("renders nothing at zero selection so the locked promise stands alone", () => {
    const { container } = render(<SynergySelection selectedCards={[]} onClear={() => {}} width="desktop" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("states the fill, the pick and the total", () => {
    render(<SynergySelection selectedCards={owned(7)} onClear={() => {}} width="desktop" />);
    expect(screen.getByText(synergyCopy.select.promise("68", "7", "75"))).toBeInTheDocument();
  });

  it("names the unowned cards in the selection", () => {
    render(<SynergySelection selectedCards={[...owned(5), ...unowned(2)]} onClear={() => {}} width="desktop" />);
    expect(screen.getByText(synergyCopy.select.promiseUnowned("2"))).toBeInTheDocument();
  });

  it("clamps at 99 and says the selection fills the deck on its own", () => {
    render(<SynergySelection selectedCards={owned(40)} onClear={() => {}} width="desktop" />);
    expect(screen.getByText(synergyCopy.select.promiseFull("40"))).toBeInTheDocument();
  });

  it("clears the selection", async () => {
    const onClear = vi.fn();
    render(<SynergySelection selectedCards={owned(3)} onClear={onClear} width="desktop" />);
    await userEvent.click(screen.getByRole("button", { name: synergyCopy.select.clearAria("3") }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
```

Add one test to `detail.test.tsx` asserting the Build href carries the selection and that it carries no `select` parameter at zero selection.

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test src/components/commanders/synergy-selection.test.tsx`
Expected: FAIL — cannot resolve `./synergy-selection`.

- [ ] **Step 3: Write the component and lift the state**

- [ ] **Step 4: Run the suite, typecheck and lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS, 0 lint problems.

- [ ] **Step 5: Commit**

```bash
git add src/components/commanders/synergy-selection.tsx src/components/commanders/synergy-selection.test.tsx src/components/commanders/detail.tsx src/components/commanders/detail.test.tsx
git commit -m "feat(commanders): carry a synergy selection into the build"
```

---

## Task 8: The selection reaches createDeck

**Files:**
- Modify: `src/app/decks/actions.ts:142` (`createDeck`)
- Modify: whichever component holds the `/decks?commander=` entry (`create-pre-filled.tsx` / `create-picker.tsx` — grep for `searchParams` and `commander=`)
- Test: `src/app/decks/create-deck-selection.test.ts`

**Interfaces:**
- Consumes: `buildFillPlan`, `planFill` (unchanged).
- Produces: `createDeck(commanderOracleId: string, name: string, selectedOracleIds?: string[])`.

**The dedupe is the whole task** (handoff gap report 4). The selection is placed **first**, and the fill then runs against a pool with those cards removed. Without that, a selected card that `planFill` would also have placed is spent twice and the deck lands at 98.

Every selected card is written with `auto = true` (ruling 7), so `Clear all auto` undoes the selection along with the fill — which is correct: the player asked for these cards on a different page and the sweep is the one control that means "none of this was mine".

Validate every selected id the same way `restoreAutoCards` does (`actions.ts:513`): UUID shape, then `validateCardForDeck` per id, inside the same transaction, with the 99 cap enforced. An invalid or illegal id is skipped rather than failing the whole create — the player is mid-flow from another page and a hard failure loses the commander choice too.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { dedupeSelectionFromPool } from "../../lib/decks/last-slots";

// The pure half of the dedupe, extracted so the transaction does not have to be
// stubbed to test the arithmetic that gap report 4 flagged.
describe("dedupeSelectionFromPool", () => {
  it("removes selected cards from the pool the fill plans against", () => {
    const pool = [{ oracleId: "a" }, { oracleId: "b" }, { oracleId: "c" }];
    expect(dedupeSelectionFromPool(pool, ["b"]).map((c) => c.oracleId)).toEqual(["a", "c"]);
  });

  it("leaves the pool alone when nothing was selected", () => {
    const pool = [{ oracleId: "a" }];
    expect(dedupeSelectionFromPool(pool, [])).toHaveLength(1);
  });

  it("ignores a selected id that is not in the pool", () => {
    const pool = [{ oracleId: "a" }];
    expect(dedupeSelectionFromPool(pool, ["zzz"])).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test src/app/decks/create-deck-selection.test.ts`
Expected: FAIL — `dedupeSelectionFromPool` is not exported.

- [ ] **Step 3: Write `dedupeSelectionFromPool` and wire `createDeck`**

```ts
/** Gap report 4. The selection is placed first and the 68-card fill runs
 *  against what is left, so a card the player picked is not also placed for a
 *  role and the deck does not land at 98.
 *
 *  The consequence is deliberate and worth stating: the fill's role counts can
 *  come out different from the zero-selection case, because a selected ramp
 *  card closes a ramp gap the fill would have closed with something else. The
 *  provenance line reads the counts off the placed rows, so it follows. */
export function dedupeSelectionFromPool<T extends { oracleId: string }>(
  pool: T[],
  selectedOracleIds: string[],
): T[] {
  if (selectedOracleIds.length === 0) return pool;
  const picked = new Set(selectedOracleIds);
  return pool.filter((c) => !picked.has(c.oracleId));
}
```

In `createDeck`, read the selection from the new third parameter, insert the validated selected cards as `auto: true` rows first, then call `buildFillPlan` against the deduped pool, and insert the fill's rows up to the 99 cap. The `redirect` stays outside the try, exactly as it is now.

- [ ] **Step 4: Run the tests, typecheck and lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS, 0 lint problems.

- [ ] **Step 5: Commit**

```bash
git add src/lib/decks/last-slots.ts src/app/decks/actions.ts src/app/decks/create-deck-selection.test.ts
git commit -m "feat(decks): place a synergy selection before the fill, and dedupe the pool"
```

---

## Task 9: The last-slots decision

**Files:**
- Modify: `src/lib/decks/last-slots.ts` (created in Task 8)
- Test: `src/lib/decks/last-slots.test.ts`

**Interfaces:**
- Consumes: `SynergyCard` (Task 3).
- Produces: `export function planLastSlots(args: { ranked: SynergyCard[]; openSlots: number; inDeckOracleIds: Set<string>; ownedOnly: boolean }): { place: string[]; shortfall: number }`.

This is the pure half both server actions share: which oracle ids, in what order, and how many slots were left unfilled. It is deliberately free of the DB so the twelve-state matrix's arithmetic is node-testable.

Colour identity and singleton legality are enforced by `validateCardForDeck` in the action, not here — this function decides ordering and count.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { planLastSlots } from "./last-slots";
import type { SynergyCard } from "../commanders/synergy-cards";

function card(id: string, synergyPts: number, owned: boolean): SynergyCard {
  return { oracleId: id, name: id, typeLine: "Instant", facet: "spell", inclusionPct: null, synergyPts, owned };
}

const ranked = [
  card("o1", 90, true), card("u1", 80, false), card("o2", 70, true), card("u2", 60, false),
];

describe("planLastSlots", () => {
  // State 1: deep pool.
  it("takes owned cards in synergy order up to the open slots", () => {
    const out = planLastSlots({ ranked, openSlots: 2, inDeckOracleIds: new Set(), ownedOnly: true });
    expect(out.place).toEqual(["o1", "o2"]);
    expect(out.shortfall).toBe(0);
  });

  // State 2: shallow pool — the control states what it can place, never the gap.
  it("reports the shortfall when the pool runs out", () => {
    const out = planLastSlots({ ranked, openSlots: 5, inDeckOracleIds: new Set(), ownedOnly: true });
    expect(out.place).toEqual(["o1", "o2"]);
    expect(out.shortfall).toBe(3);
  });

  // The top-up is the same iteration without the ownership filter.
  it("takes any card in synergy order when ownership is not required", () => {
    const out = planLastSlots({ ranked, openSlots: 3, inDeckOracleIds: new Set(), ownedOnly: false });
    expect(out.place).toEqual(["o1", "u1", "o2"]);
  });

  it("skips a card the deck already holds", () => {
    const out = planLastSlots({ ranked, openSlots: 2, inDeckOracleIds: new Set(["o1"]), ownedOnly: true });
    expect(out.place).toEqual(["o2"]);
    expect(out.shortfall).toBe(1);
  });

  // State 9: no open slots — the strip unmounts, and the plan places nothing.
  it("places nothing when there are no open slots", () => {
    const out = planLastSlots({ ranked, openSlots: 0, inDeckOracleIds: new Set(), ownedOnly: true });
    expect(out.place).toEqual([]);
    expect(out.shortfall).toBe(0);
  });

  // State 6 / 12: no candidates at all.
  it("reports every slot short when no candidate qualifies", () => {
    const out = planLastSlots({ ranked: [], openSlots: 4, inDeckOracleIds: new Set(), ownedOnly: true });
    expect(out.place).toEqual([]);
    expect(out.shortfall).toBe(4);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test src/lib/decks/last-slots.test.ts`
Expected: FAIL — `planLastSlots` is not exported.

- [ ] **Step 3: Write the implementation**

```ts
import type { SynergyCard } from "../commanders/synergy-cards";

/** The last 31, decided. Both fill controls run this — the owned one with
 *  `ownedOnly`, the top-up without it — so the two cannot drift apart on
 *  ordering or on what counts as a candidate.
 *
 *  `shortfall` is a count of slots, not of roles: the last 31 has no role
 *  targets, which is the whole point of it. §7.6's line states this number and
 *  the owned control's label states `place.length`, never the gap. */
export function planLastSlots(args: {
  ranked: SynergyCard[];
  openSlots: number;
  inDeckOracleIds: Set<string>;
  ownedOnly: boolean;
}): { place: string[]; shortfall: number } {
  const place: string[] = [];
  if (args.openSlots <= 0) return { place, shortfall: 0 };
  for (const c of args.ranked) {
    if (place.length >= args.openSlots) break;
    if (args.inDeckOracleIds.has(c.oracleId)) continue;
    if (args.ownedOnly && !c.owned) continue;
    place.push(c.oracleId);
  }
  return { place, shortfall: args.openSlots - place.length };
}
```

- [ ] **Step 4: Run the tests**

Run: `pnpm test src/lib/decks/last-slots.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/decks/last-slots.ts src/lib/decks/last-slots.test.ts
git commit -m "feat(decks): decide the last slots from the synergy ranking"
```

---

## Task 10: The two fill actions

**Files:**
- Modify: `src/app/decks/actions.ts`
- Test: `src/app/decks/last-slots-actions.test.ts`

**Interfaces:**
- Consumes: `planLastSlots` (Task 9), `readSynergyCards` (Task 4), `validateCardForDeck` and the locking pattern from `restoreAutoCards` (`actions.ts:513`).
- Produces:
  - `fillLastSlotsOwned(deckId: string): Promise<{ added: number; total: number; shortfall: number }>`
  - `fillLastSlotsUnowned(deckId: string): Promise<{ added: number; total: number; bought: number }>`

Both follow `restoreAutoCards`'s shape exactly: lock the deck row `for update`, re-read the card list **inside** the transaction, run `validateCardForDeck` per id, enforce the 99 cap inside the lock, insert with `auto: true` and `onConflictDoNothing`, then `revalidatePath` over `deckSurfaces(deckId)`.

Re-reading inside the lock is not optional. `openSlots` computed before the lock is a number another tab may already have spent.

**These are not `getDeckSuggestions`' `slice(0, 5)`.** That flat slice at `actions.ts:251` is the 68-card fill's top-up and stays exactly as it is. The last-31 top-up is a fresh iteration over the ranked support list with no role bounding at all.

- [ ] **Step 1: Write the failing test**

Stub the Drizzle module the way `src/app/decks/*.test.ts` already does and assert four things:

```ts
describe("fillLastSlotsOwned", () => {
  it("writes every placed card as auto so the sweep undoes it", async () => { /* … */ });
  it("stops at the 99 cap computed inside the lock, not before it", async () => { /* … */ });
  it("returns the shortfall when the owned pool runs out", async () => { /* … */ });
  it("skips a card validateCardForDeck refuses rather than failing the whole fill", async () => { /* … */ });
});

describe("fillLastSlotsUnowned", () => {
  it("does not filter on ownership", async () => { /* … */ });
  it("reports how many of the deck's cards are now unowned", async () => { /* … */ });
});
```

Fill each body against the stub pattern in the neighbouring action tests.

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm test src/app/decks/last-slots-actions.test.ts`
Expected: FAIL — neither action is exported.

- [ ] **Step 3: Write both actions**

- [ ] **Step 4: Run the suite, typecheck and lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS, 0 lint problems.

- [ ] **Step 5: Commit**

```bash
git add src/app/decks/actions.ts src/app/decks/last-slots-actions.test.ts
git commit -m "feat(decks): two server actions fill the last slots, owned first"
```

---

## Task 11: The last-31 strip

**Files:**
- Create: `src/components/decks/last-slots-strip.tsx`
- Test: `src/components/decks/last-slots-strip.test.tsx`
- Modify: `src/components/decks/builder-shell.tsx`

**Interfaces:**
- Consumes: `synergyCopy` (Task 1), `fillLastSlotsOwned` / `fillLastSlotsUnowned` (Task 10), the shipped `MutationError`, `GhostButton`.
- Produces: `export function LastSlotsStrip({ deckId, openSlots, ownedCandidates, unownedCandidates, commanderShortName, onAnnounce, width })`.

**Geometry.** `--surface-rail` on `1px --border-strong`, radius 10px, padding `14px 16px`. Heading `lastSlots.heading(n)` mono 10.5px `--accent` uppercase `letter-spacing .14em`; sub-clause `lastSlots.caption(n)` / `.captionMobile(n)` mono 10.5px `--fg-faint`. Sits **between the provenance line and the toolbar rule**. Unmounts as a unit at 0 open slots.

**Control A — owned fill.** `1px --accent`, transparent, label 13px weight 600 `--accent`, radius 8px, padding `10px 16px`; 44px full-width at phone. Label `lastSlots.fillOwned(min(openSlots, ownedCandidates))` — it states what it can place, never the gap. In flight: border `--accent-shadow`, label `--fg-faint`, text `recommendationsCopy.fill.fillingRows(n)`. **Absent** at 0 owned candidates.

**Control B — buying top-up.** `GhostButton`, `1px --border-strong`, label `lastSlots.topUp` 13px `--fg`, count mono 11px `--warning` on its face. **Absent** at 0 unowned candidates.

**The seven generating rules** from `STATES-fill-controls.md`, each of which needs a test:

1. A control with nothing to do is **absent, not disabled**.
2. **Nothing unmounts mid-action.** During either write, the other two controls go disabled and stay in place.
3. The strip unmounts **as a unit** at 0 open slots.
4. A never promises 99 — its label carries `min(openSlots, ownedCandidates)`.
5. A refusal does not disable the other control; `MutationError` renders under the clicked one.
6. `Clear all auto` is never affected by A or B beyond its count.
7. Everything A and B place is `auto`.

**The shortfall line (§7.6).** Rendered in the strip when A settles below 99: `lastSlots.short(total, shortfall)`. It takes the **provenance line's shape** — `--surface-sunken`, `1px --border`, `border-left 3px --accent` (NOT `--warning`), radius 9px, 20px `i` disc, body 12.5px `--fg-body`. B sits directly beneath it.

**Announcements.** One live-region message per settle on the existing region in `builder-shell.tsx`, never one per row: `lastSlots.filledAnnounce` at 99, `lastSlots.shortAnnounce` when short, `lastSlots.boughtAnnounce` after B.

- [ ] **Step 1: Write the failing test**

One test per state in the matrix. At minimum:

```tsx
it("states what the owned pool can place, not the gap", () => { /* state 2: openSlots 31, owned 12 → "Fill 12 from my collection" */ });
it("renders nothing at all when there are no open slots", () => { /* state 9 */ });
it("omits the owned control when there are no owned candidates", () => { /* state 6 */ });
it("omits the top-up when there are no unowned candidates", () => { /* state 12 */ });
it("disables the other control during a write rather than unmounting it", () => { /* state 3 and 8 */ });
it("draws the shortfall line in the provenance shape, not the warning one", () => { /* state 5 */ });
it("leaves the other control enabled after a refusal", () => { /* state 10 */ });
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm test src/components/decks/last-slots-strip.test.tsx`
Expected: FAIL — cannot resolve `./last-slots-strip`.

- [ ] **Step 3: Write the strip and mount it**

Mount it in `builder-shell.tsx` directly after the provenance-line block (`builder-shell.tsx:548`) and before the fill-failed banner. `openSlots` is `99 - built` off the optimistic card list. The candidate counts come from the deck page's server read — add `synergyCards` to the deck route's props alongside `suggestions`, reusing `readSynergyCards` with the deck's own card ids as the exclusion input.

- [ ] **Step 4: Run the suite, typecheck and lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS, 0 lint problems.

- [ ] **Step 5: Commit**

```bash
git add src/components/decks/last-slots-strip.tsx src/components/decks/last-slots-strip.test.tsx src/components/decks/builder-shell.tsx
git commit -m "feat(decks): the last-31 strip, owned fill beside a buying top-up"
```

---

## Task 12: The Consider shelf, the tile's lift line, and the celebration ruling

**Files:**
- Modify: `src/components/decks/consider-panel.tsx`
- Modify: `src/components/decks/suggestion-tile.tsx`
- Modify: `src/lib/decks/celebration.ts`
- Test: `src/lib/decks/celebration.test.ts`
- Test: `src/components/decks/consider-panel.test.tsx`, `src/components/decks/suggestion-tile.test.tsx`

Three small, independent edits in one task because each is a single clause and none carries its own review surface.

**1. The synergy shelf.** Add `"synergy"` to `ShelfKey` (`consider-panel.tsx:30`) and one shelf to `buildShelves` (`:39`), ordered by synergy descending, placed **above** the unowned append and **below** the coverage shelves. `SHELF_CAP` 12 applies. Heading `synergyCopy.shelf.label(commander)`, meta `synergyCopy.shelf.meta(n)`. `ShelfSection` is unmodified. `rolesWithShelves` is untouched.

**2. The lift line ungated.** In `suggestion-tile.tsx:120`, `{lift != null && suggestion.owned && (` becomes `{lift != null && (`. This closes design table §8-6. On a shelf whose entire ordering *is* synergy, hiding the figure on an unowned tile means the second tile in a row cannot show why it is second — and §0 answers the open question, because all 879,329 support rows carry both figures regardless of ownership.

**3. The celebration ruling.** `shouldCelebrate` gains one flag beside `arrivedFromImport`, for the same reason and in the same shape:

```ts
export function shouldCelebrate(args: {
  status: StatusPill;
  alreadyCelebrated: boolean;
  arrivedFromImport: boolean;
  completedByFill: boolean;
}): boolean {
  if (args.arrivedFromImport || args.completedByFill) return false;
  return args.status === "Complete" && !args.alreadyCelebrated;
}
```

Extend the file's existing doc comment with the reason, in the voice of the `arrivedFromImport` paragraph above it: the reveal is a receipt for a deck the player built, and a two-click fill has not earned it — the fill's own receipt is its counts plus the provenance line. `completedByFill` is true when the settle that reached 99 came from `fillLastSlotsOwned` or `fillLastSlotsUnowned`; `builder-shell.tsx` holds it in state beside `sweptRows` and clears it when the server list next changes.

- [ ] **Step 1: Write the failing tests**

```ts
// celebration.test.ts — add to the existing describe
it("suppresses the reveal when a fill placed the last card", () => {
  expect(shouldCelebrate({
    status: "Complete", alreadyCelebrated: false,
    arrivedFromImport: false, completedByFill: true,
  })).toBe(false);
});

it("still fires when the deck reached 99 by hand", () => {
  expect(shouldCelebrate({
    status: "Complete", alreadyCelebrated: false,
    arrivedFromImport: false, completedByFill: false,
  })).toBe(true);
});
```

```tsx
// consider-panel.test.tsx
it("puts the synergy shelf above the unowned append and below the role shelves", () => { /* … */ });

// suggestion-tile.test.tsx
it("prints the lift line on an unowned tile", () => { /* … */ });
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm test src/lib/decks/celebration.test.ts src/components/decks/consider-panel.test.tsx src/components/decks/suggestion-tile.test.tsx`
Expected: FAIL — three failures, one per edit.

- [ ] **Step 3: Make the three edits**

- [ ] **Step 4: Run the full gate**

Run: `pnpm test && pnpm typecheck && pnpm lint && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: PASS, 0 lint problems, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/decks/consider-panel.tsx src/components/decks/suggestion-tile.tsx src/lib/decks/celebration.ts src/lib/decks/celebration.test.ts src/components/decks/consider-panel.test.tsx src/components/decks/suggestion-tile.test.tsx
git commit -m "feat(decks): a synergy shelf, an ungated lift line, and no reveal for a filled 99"
```

---

## Before the PR

1. Run the design-review skill's **Agent 2 (verify)** against `docs/superpowers/design-tables/synergy-discovery.md` and every file this plan created or modified. Both passes: visual properties, and state reachability across the twelve-state matrix.
2. Fix every gap, re-run the quality gate, then run **Agent 3 (confirm)** on the gap list only.
3. Write the gap report to `docs/superpowers/gap-report-synergy-discovery.md` and commit it.
4. Only then `gh pr create`. Mobile and desktop parity ships in this one PR.
