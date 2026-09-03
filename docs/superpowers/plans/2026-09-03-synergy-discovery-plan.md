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
- `src/lib/cards/facet.ts` — `cardFacet(typeLine)`, the six-bucket type parse, plus `FACET_TYPE_LABEL`, the singular bucket noun the `All` facet's type column prints.
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
- `src/lib/decks/last-slots.ts` — the pure "which cards, in what order, how many" decision the two server actions share. Created in **Task 9**, not Task 8: the create-time dedupe belongs beside the fill it deduplicates (see the Modified entry for `fill.ts`), and this module is only about the last 31.
- `src/lib/decks/last-slots.test.ts`

**Modified:**

- `src/components/commanders/detail.tsx` — deletes `MissingChip`, deletes the old `SynergyPanel`, mounts the new panel at both widths inside the shipped `c.fitSynergy !== null && c.edhrecTotal !== null` gate, hosts the selection state, and passes the selection to the Build links.
- `src/components/commanders/role-card-list.tsx` — deletes `OwnedChip`.
- `src/app/commanders/[slug]/page.tsx` — calls the new read and passes `synergyCards` to `CommanderDetail`.
- `src/lib/decks/fill.ts` — gains `dedupeSelectionFromPool`, the pure filter `buildFillPlan` applies to both of its candidate lists.
- `src/app/decks/actions.ts` — `buildFillPlan` gains an `excludeOracleIds` parameter; `createDeck` takes a selection; two new actions `fillLastSlotsOwned` / `fillLastSlotsUnowned`.
- `src/lib/decks/suggest.ts` — `DeckSuggestion` gains a signed `synergyFigure` field beside the positive-only `lift`, which is unchanged.
- `src/components/decks/builder-shell.tsx` — mounts the last-31 strip under the provenance line, wires both actions and the live region, and reads the persisted fill-completed suppression.
- `src/app/decks/[id]/page.tsx` — reads the ranking and derives the strip's two candidate counts through `planLastSlots`.
- `src/components/decks/consider-panel.tsx` — one shelf key added to `ShelfKey` and `buildShelves`.
- `src/components/decks/suggestion-tile.tsx` — the lift line's `&& suggestion.owned` clause removed, the `Evidence` early return restructured so the line survives a null inclusion, and the synergy shelf's null branch draws `synergyCopy.shelf.noSynergy`.
- `src/lib/decks/celebration.ts` — the `completedByFill` flag and the `fillCompletedKey` storage key.
- `src/app/decks/page.tsx` — carries `?select=` through the `/decks?commander=` redirect.
- `src/app/decks/new/page.tsx` — reads `?select=` and hands it to `CreatePreFilled`.
- `src/components/decks/create-pre-filled.tsx` — the component that actually calls `createDeck` (line 54); takes the selected ids and passes them as the third argument. `create-picker.tsx` is **not** modified: the picker door has no commander in the URL and therefore no selection to carry.

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
- Produces: `export type CardFacet = "creature" | "spell" | "artifact" | "enchantment" | "land" | "other"`, `export function cardFacet(typeLine: string): CardFacet`, and `export const FACET_TYPE_LABEL: Record<CardFacet, string>`.

`FACET_TYPE_LABEL` is the singular noun the row prints in its type column under the `All` facet (property table Slot 3, and the README's engineering note: "The `All` facet prints the card type alone"). It lives here rather than in `synergyCopy` because the handoff's copy file has no key for it and these are the game's own type nouns, not product copy — the same reason `cardFacet`'s buckets are not copy either. If Design later wants different words, the map moves to the copy block wholesale.

The bucket order is a precedence, not a set: the handoff's gap report 2 rules that an artifact creature is a **creature**, and a creature land is a **creature** by the same precedence. Land is checked before artifact and enchantment so that an artifact land buckets as a land — a land is what you play it as.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { cardFacet, FACET_TYPE_LABEL } from "./facet";

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

describe("FACET_TYPE_LABEL", () => {
  // The `All` facet's type column prints this and nothing else, so every bucket
  // needs a singular noun — including `other`, which has no pill of its own but
  // does have rows under `All`.
  it("gives every facet a singular noun for the All facet's type column", () => {
    expect(FACET_TYPE_LABEL[cardFacet("Legendary Creature — Elf Druid")]).toBe("Creature");
    expect(FACET_TYPE_LABEL[cardFacet("Instant")]).toBe("Spell");
    expect(FACET_TYPE_LABEL[cardFacet("Artifact")]).toBe("Artifact");
    expect(FACET_TYPE_LABEL[cardFacet("Enchantment")]).toBe("Enchantment");
    expect(FACET_TYPE_LABEL[cardFacet("Land")]).toBe("Land");
    expect(FACET_TYPE_LABEL[cardFacet("Planeswalker — Teferi")]).toBe("Other");
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

/** The singular noun `SynergyRow` prints in its type column when the panel is
 *  on the `All` facet — property table Slot 3, "Content (`All` facet): Card
 *  type bucket only, e.g. 'Creature'". Under any single facet the row prints
 *  the card's real type line instead, because the bucket would then repeat the
 *  pill above it.
 *
 *  Deliberately not in `synergyCopy`: the handoff's copy file has no key for
 *  these, and they are the game's type nouns rather than product voice. */
export const FACET_TYPE_LABEL: Record<CardFacet, string> = {
  creature: "Creature",
  spell: "Spell",
  artifact: "Artifact",
  enchantment: "Enchantment",
  land: "Land",
  other: "Other",
};
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

**The degraded fallback is part of the ordering, not a separate branch.** `STATES-fill-controls.md` state 11 and the property table's *Panel-level null states* row both require that when synergy is null across the rows, "ordering degrades to inclusion desc, then name". A commander whose synergy column came back empty must not get an alphabetical panel. Because the fallback only applies where both sides are null, one comparator serves both cases: the mixed case still sends nulls to the bottom, and among those nulls — which on a degraded commander is every row — inclusion decides. There is no `state` flag anywhere in this module; the data's own shape produces the behaviour.

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

  // State 11: EDHREC degraded. Every synergy figure is null, so the ranking has
  // nothing to rank on and falls back to inclusion rather than to the alphabet.
  it("orders by inclusion descending when no row has a synergy figure", () => {
    const out = orderBySynergy([
      card({ oracleId: "a", name: "Aegis", inclusionPct: 12 }),
      card({ oracleId: "z", name: "Zealot", inclusionPct: 91 }),
      card({ oracleId: "m", name: "Mid", inclusionPct: 40 }),
    ]);
    expect(out.map((c) => c.oracleId)).toEqual(["z", "m", "a"]);
  });

  it("puts a row with neither figure below a row with an inclusion", () => {
    const out = orderBySynergy([
      card({ oracleId: "blank", name: "Aaa" }),
      card({ oracleId: "some", name: "Zzz", inclusionPct: 3 }),
    ]);
    expect(out.map((c) => c.oracleId)).toEqual(["some", "blank"]);
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

/** Synergy descending, absent last, then inclusion descending, then name.
 *
 *  Name rather than insertion order as the final tiebreak: the read's row order
 *  is Postgres's, which is not stable across plans, and an unstable ranking
 *  re-orders under the player's cursor between one visit and the next.
 *
 *  A negative figure sorts on its value and lands above the nulls. "Runs it
 *  less often than average" is information; "we have no figure" is not.
 *
 *  The inclusion step is state 11, the degraded-EDHREC case: when synergy came
 *  back null for every row there is nothing to rank on, and the states doc
 *  requires the panel fall back to inclusion rather than to the alphabet. It is
 *  written as a tiebreak between two nulls rather than as a separate degraded
 *  branch, because that is the same thing — on a degraded commander every pair
 *  is a null pair — and it needs no flag threaded in from the read. */
export function orderBySynergy(cards: SynergyCard[]): SynergyCard[] {
  return [...cards].sort((a, b) => {
    if (a.synergyPts == null && b.synergyPts == null) {
      if (a.inclusionPct == null && b.inclusionPct == null) return a.name.localeCompare(b.name);
      if (a.inclusionPct == null) return 1;
      if (b.inclusionPct == null) return -1;
      if (a.inclusionPct !== b.inclusionPct) return b.inclusionPct - a.inclusionPct;
      return a.name.localeCompare(b.name);
    }
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
- Produces: `export async function readSynergyCards(userId: string, commanderOracleId: string, coveredOracleIds: string[]): Promise<SynergyCard[]>`. `CommanderDetail`'s `synergyCards` prop is added in **Task 6**, not here — see Step 4.

`commander_support_cards` carries `inclusion` and `synergy` as `real`. Both are nullable and neither is ever stored as 0 (`schema.ts:278-280` says so explicitly), so a null here is genuine absence, not a zero to be rendered as a figure.

The shape of the query: select from `commanderSupportCards` where `commanderOracleId` matches, inner-join `cards` on `oracleId` (a support row whose card is not in the catalog has no name or type line to draw and is dropped — the same silent drop `edhrecTotal`'s comment documents), and left-join the user's `collection_items` grouped to a boolean for ownership.

- [ ] **Step 1: Write the failing test**

The repo's existing DB-touching reads are tested by stubbing the Drizzle module. Follow the pattern in `src/app/decks/actions.test.ts` (see its `vi.hoisted` stub object and the `vi.mock("../../db", …)` at line 122) — **not** `coverage-action.test.ts`, which mocks `lib/auth`, `lib/recs/store` and `lib/recs/recommend` and never stubs Drizzle at all.

The module to mock is `"../../../db"`. There is no `src/db/client.ts` in this repo: `src/db/` holds only `index.ts` and `schema.ts`, and every consumer imports `db` from the directory. Mocking a path that does not resolve is silent — the test would pass against a real, unmocked import.

Assert four things and no more — the SQL itself is not unit-testable and the shaping is already covered by Task 3:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const rows = vi.hoisted(() => ({ value: [] as unknown[] }));

vi.mock("../../../db", () => ({
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
import { db } from "../../../db";
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
    // `cards.typeLine` is `.notNull()` (schema.ts:31) and the join is an inner
    // join, so there is no null to defend against here.
    typeLine: r.typeLine,
    facet: cardFacet(r.typeLine),
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
      // `synergyCards={synergyCards}` is added in Task 6, which is the prop's
      // first consumer. See the rule below.
    />
  );
```

The rule for the prop, stated once: **Task 4 does not add `synergyCards` to `CommanderDetail`'s props.** Task 4 ships the read, its test, and the `readSynergyCards` call plus the `covered` derivation in `page.tsx`; Task 6 adds the prop to `detail.tsx` and passes it from `page.tsx` in the same commit, because Task 6 is its first consumer. This keeps Task 4 free of an unused prop — no `void synergyCards;`, no lint suppression, no dead parameter waiting two tasks for a reader.

Concretely, Task 4's `page.tsx` edit is the two statements above the `return`, and the `<CommanderDetail …>` element gains its `synergyCards={synergyCards}` line in Task 6. Between the two tasks `synergyCards` is a local the render does not read; if `pnpm lint` objects to that, fold the `readSynergyCards` call itself into Task 6 and keep Task 4 to `synergy-read.ts` and its test.

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
- Consumes: `SynergyCard` (Task 3), `cardFacet`'s `CardFacet` and `FACET_TYPE_LABEL` (Task 2), `synergyCopy` (Task 1), `CardDetailTrigger` from `../cards/card-detail-provider`.
- Produces:
  - `export function SynergyRow({ card, selected, onToggle, siblings, width, facet }: { card: SynergyCard; selected: boolean; onToggle: () => void; siblings: string[]; width: "desktop" | "phone"; facet: CardFacet | "all" })`
  - `export function FacetStrip({ counts, selected, onSelect }: { counts: Record<CardFacet | "all", number>; selected: CardFacet | "all"; onSelect: (f: CardFacet | "all") => void })`

Both are presentational. The panel (Task 6) owns the state.

**Row geometry — desktop.** `--surface` on `1px --border`, radius 8px, min-height 44px, padding `0 6px 0 12px`, gap 10px. Six slots left to right: ownership dot 7px · name 13.5px `--fg` ellipsed at `flex:auto;min-width:0` · type column mono 10px `--fg-locked` 150px ellipsed · synergy mono 11.5px `--accent` 64px right-aligned tabular · inclusion mono 11px `--fg-faint` 46px right-aligned tabular · toggle 34×34.

**The type column's content depends on the active facet**, which is why the row takes a `facet` prop it otherwise has no use for. Property table Slot 3: under a single facet the column prints the card's real `typeLine` (`Creature — Human Wizard`), because the pill above already establishes the bucket and the subtype is the only new information; under the `All` facet it prints `FACET_TYPE_LABEL[card.facet]` alone (`Creature`), because that is the column's job when the list is mixed. The README's engineering note says the same thing: "The `All` facet prints the card type alone."

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
  oracleId: "a", name: "Command Tower", typeLine: "Land — Gate",
  facet: "land", inclusionPct: 82, synergyPts: 1, owned: true,
};

// Every render shares these; only the ones a test is about are overridden.
const rest = { selected: false, onToggle: () => {}, siblings: ["a"], width: "desktop" as const, facet: "land" as const };

describe("SynergyRow", () => {
  it("states a single point in the singular", () => {
    render(<SynergyRow {...rest} card={base} />);
    expect(screen.getByText("+1 pt")).toBeInTheDocument();
  });

  it("draws a negative figure with a minus sign, not a hyphen", () => {
    render(<SynergyRow {...rest} card={{ ...base, synergyPts: -5 }} />);
    expect(screen.getByText("−5 pts")).toBeInTheDocument();
  });

  // An absent synergy must not suppress a real inclusion beside it.
  it("draws each figure's absence independently", () => {
    render(<SynergyRow {...rest} card={{ ...base, synergyPts: null }} />);
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBe(1);
  });

  // Slot 3: under a single facet the pill already names the bucket, so the
  // column earns its width by printing the subtype.
  it("prints the full type line under a single facet", () => {
    render(<SynergyRow {...rest} card={base} facet="land" />);
    expect(screen.getByText("Land — Gate")).toBeInTheDocument();
  });

  // …and under All the list is mixed, so the bucket is the useful thing.
  it("prints the bucket alone under the All facet", () => {
    render(<SynergyRow {...rest} card={base} facet="all" />);
    expect(screen.getByText("Land")).toBeInTheDocument();
    expect(screen.queryByText("Land — Gate")).not.toBeInTheDocument();
  });

  it("names ownership in the accessible name rather than by colour alone", () => {
    render(<SynergyRow {...rest} card={{ ...base, owned: false }} />);
    expect(screen.getByLabelText(/Not in your collection/)).toBeInTheDocument();
  });

  it("toggles through an aria-pressed button", async () => {
    const onToggle = vi.fn();
    render(<SynergyRow {...rest} card={base} onToggle={onToggle} />);
    const toggle = screen.getByRole("button", { name: synergyCopy.select.addAria("Command Tower") });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("offers the remove label once selected", () => {
    render(<SynergyRow {...rest} card={base} selected />);
    expect(
      screen.getByRole("button", { name: synergyCopy.select.removeAria("Command Tower") }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("drops the type column at phone width and prefixes the inclusion figure", () => {
    render(<SynergyRow {...rest} card={base} width="phone" />);
    expect(screen.queryByText("Land — Gate")).not.toBeInTheDocument();
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

`SynergyRow` renders an `<li>` carrying the geometry above. The type column is `facet === "all" ? FACET_TYPE_LABEL[card.facet] : card.typeLine`. The name is a `CardDetailTrigger` with `siblings` so Prev/Next pages the visible ranking. The row's accessible name comes from `synergyCopy.figure.rowAria`, composed from `ariaOwned` / `ariaUnowned`, `ariaSynergyPlus` / `ariaSynergyMinus` / `ariaSynergyNone`, and the inclusion percentage or `ariaInclusionNone`. The toggle is a `<button type="button" aria-pressed={selected}>` labelled `select.addAria` at rest and `select.removeAria` when selected.

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
- Modify: `src/app/commanders/[slug]/page.tsx` (passes `synergyCards`, deferred from Task 4)

**Interfaces:**
- Consumes: `SynergyRow`, `FacetStrip` (Task 5); `facetCounts`, `SynergyCard` (Task 3); `synergyCopy` (Task 1).
- Produces:

```ts
export function SynergyPanel({
  cards,          // SynergyCard[]  — already excluded and ordered by the read
  ownedCount,     // number         — the commander's locked EDHREC owned count
  edhrecTotal,    // number         — the commander's locked EDHREC total
  selected,       // Set<string>    — oracle ids, owned by detail.tsx (Task 7)
  onToggle,       // (oracleId: string) => void
  width,          // "desktop" | "phone"
}): JSX.Element
```

There is **no `synergyState` prop and no `onRetry` prop.** See "The panel has no null-state branch" below.

**Panel structure, top to bottom:** ownership headline bar · sub-caption from `panel.subcaption` / `.subcaptionMobile` · facet strip · figure legend (`panel.legend` / `.legendMobile`) · column header row (desktop only, `panel.colCard` / `colType` / `colSynergy` / `colDecks`) · the rows · the disclosure.

**The ownership headline bar** is its own component row in the property table and it is more than a line of text. Lift it out of the old `SynergyPanel` (`detail.tsx:249-291`), which already draws all four parts, and correct two values to the table: the card background is `--surface-raised` (shipped: `--surface-rail`) and the bar's track is `--border` (shipped: `--elevated`). It is an inner card — `--surface-raised` on `1px --border`, radius 10px phone / 12px desktop, padding `13px 14px` phone / `18px 20px` desktop, `margin-top: 16px` on desktop — holding four things:

- The **count figure**, `ownedCount`. Desktop: mono 30px weight 600 `--fg`. Phone: mono 12px `--fg`, rendered as `{ownedCount} / {edhrecTotal} owned` on one line instead of the desktop split.
- The **`of top {edhrecTotal}` label**, desktop only, mono 14px `--fg-faint`. This string is ruling 1's locked figure and is kept verbatim.
- The **progress bar**: track `--border`, fill `--accent`, radius 999px, `overflow: hidden`, height 6px phone / 10px desktop, `flex: 1` on desktop and `margin-bottom: 12px` on phone. Fill width is `ownedCount / edhrecTotal` as a percentage.
- The **owned percentage**, mono 12px in `--success` at both widths.

`ownedCount` and `edhrecTotal` are both props and both come from the commander record — `c.edhrecOwnedCount ?? 0` and `c.edhrecTotal`, exactly as `detail.tsx:245-246` already narrows them — **never** from `cards.length`. `cards` is post-exclusion and post-facet, so deriving the headline from it would silently restate a smaller, different number under a label that promises EDHREC's.

**Disclosure.** Rests at 10 rows on desktop, 6 on phone. `disclosure.showAll(n, facet)` → `disclosure.showFewer`. Full-width 44px row at both widths, dashed `--border-strong`, mono 12px `--accent`. It carries `aria-expanded` (the boolean `expanded`) and `aria-controls` pointing at the list container's id, and its accessible name is `disclosure.showAllAria(n, facet)` collapsed / `disclosure.showFewerAria(facet)` expanded. Focus stays on the disclosure across both transitions — nothing steals it. **No expanded item cap** — the full facet is reachable. Expanded, the list container takes `max-height: 480px; overflow-y: auto`; collapsing discards the scroll position and does not restore it.

The desktop label carries a trailing `→` glyph after the text and the phone label does not. This is a recorded canvas/README divergence and the preamble rules that the canvas wins, so the glyph ships — `aria-hidden`, since the accessible name comes from `showAllAria`.

**A facet change collapses the expansion.** `DENSITY-synergy-panel.md` and the property table's *Expanded scroll container* row both say so: "Facet change collapses to the resting cap, preserves selection, discards scroll." The `facet` setter therefore also sets `expanded` to `false`. What survives a facet change is the **selection** — that is what README decision 7 means by "survives facet changes and expansion" — and the selection lives in `detail.tsx`, not here, so the panel could not reset it if it tried.

**The panel has no null-state branch.** `detail.tsx` already gates the whole synergy section on `c.fitSynergy !== null && c.edhrecTotal !== null` (desktop `detail.tsx:802`, mobile `:525`), and its else-branch already renders `'Synergy receipts hidden — EDHREC data unavailable'` (`:835` desktop, `:611` mobile). Separately, `FitHero` (which ends at `detail.tsx:239`) already renders `'Synergy data unavailable'` with its retry and `'No synergy data'` at lines 222 and 229, and keeps doing so. The property table agrees: at panel-level absent or degraded, "the panel is **not drawn**" and the shipped FitHero note stands.

So the panel renders **only inside the shipped gate's true branch**, and it draws none of those three strings. Drawing them from the panel as well would print the note twice on the same screen. The retry belongs to the coverage/FitHero path (`retryCoverageFigures`, `detail.tsx:798`) and stays there; the panel neither takes nor forwards an `onRetry`.

The one degraded case the panel *does* handle is state 11 — synergy null on every row while inclusion survives — and it needs no branch at all, because Task 3's `orderBySynergy` already falls back to inclusion. The panel renders normally and each row prints its own em dash.

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
  ownedCount: 62,
  edhrecTotal: 258,
  selected: new Set<string>(),
  onToggle: () => {},
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

  it("marks the disclosure expanded and points it at the list it opens", async () => {
    render(<SynergyPanel {...props} cards={make(30)} width="desktop" />);
    const button = screen.getByRole("button", {
      name: synergyCopy.disclosure.showAllAria("30", "Creatures"),
    });
    expect(button).toHaveAttribute("aria-expanded", "false");
    const listId = button.getAttribute("aria-controls");
    expect(listId).toBeTruthy();
    expect(document.getElementById(listId!)).toBe(screen.getByRole("list"));
    await userEvent.click(button);
    expect(
      screen.getByRole("button", { name: synergyCopy.disclosure.showFewerAria("Creatures") }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  // The property table's *Expanded scroll container* row: "Facet change
  // collapses to the resting cap, preserves selection, discards scroll."
  it("defaults to the creature facet and collapses the expansion on a facet change", async () => {
    const cards = [...make(30, "creature"), ...make(20, "land")];
    render(<SynergyPanel {...props} cards={cards} width="desktop" />);
    await userEvent.click(
      screen.getByRole("button", { name: synergyCopy.disclosure.showAllAria("30", "Creatures") }),
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(30);

    await userEvent.click(screen.getByRole("radio", { name: synergyCopy.facet.itemAria("Lands", "20") }));
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(
      screen.getByRole("button", { name: synergyCopy.disclosure.showAllAria("20", "Lands") }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the headline's locked of-top figure beside the facet's own count", () => {
    render(<SynergyPanel {...props} cards={make(30)} width="desktop" />);
    expect(screen.getByText(/of top 258/)).toBeInTheDocument();
  });

  // The headline is EDHREC's figure, not the visible row count. `make(30)` and
  // the creature facet would both give 30; the bar must still read 62/258.
  it("draws the headline count and bar from the commander's locked figures", () => {
    render(<SynergyPanel {...props} cards={make(30)} width="desktop" />);
    expect(screen.getByText("62")).toBeInTheDocument();
    expect(screen.getByText("24% owned")).toBeInTheDocument();
    expect(screen.getByTestId("synergy-owned-bar")).toHaveStyle({ width: "24%" });
  });

  it("states the ownership figure on one line at phone width", () => {
    render(<SynergyPanel {...props} cards={make(30)} width="phone" />);
    expect(screen.getByText("62 / 258 owned")).toBeInTheDocument();
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

Own two pieces of state: `facet` (default `"creature"`, falling back to `"all"` when the creature count is 0) and `expanded` (default `false`). Route every facet change through one setter that writes both:

```tsx
  const [facet, setFacetState] = useState<CardFacet | "all">(initialFacet);
  const [expanded, setExpanded] = useState(false);

  // A facet change collapses to the resting cap and discards the scroll
  // position — the property table's *Expanded scroll container* row. Leaving a
  // 258-row expansion open under a pill the player just switched to would drop
  // them into the middle of a list they did not ask to be deep in.
  function selectFacet(next: CardFacet | "all") {
    setFacetState(next);
    setExpanded(false);
  }
```

The selection is untouched by both — it is the parent's, and it is the one thing README decision 7 says survives a facet change.

Give the list container a stable id (`useId`) so the disclosure's `aria-controls` can point at it, and set `aria-expanded={expanded}` on the disclosure. Do not move focus on expand or collapse.

- [ ] **Step 4: Rewire detail.tsx at both widths, and delete the dead code**

Add `synergyCards: SynergyCard[]` to `CommanderDetail`'s props (Task 4 deferred it here, its first consumer) and pass `synergyCards={synergyCards}` from `page.tsx`.

Mount `<SynergyPanel width="desktop" …>` in the desktop right column where the old panel sat (`detail.tsx:817`) and `<SynergyPanel width="phone" …>` in the mobile scrolling body where the mobile EDHREC section sat (`detail.tsx:525-614`). Both mounts go **inside** the shipped `c.fitSynergy !== null && c.edhrecTotal !== null` gate (`:802` desktop, `:525` mobile), replacing what that gate's true branch draws today. Its else-branch — `'Synergy receipts hidden — EDHREC data unavailable'` at `:835` and `:611` — is not touched, and neither is `FitHero`.

Pass `ownedCount={c.edhrecOwnedCount ?? 0}` and `edhrecTotal={c.edhrecTotal}`. Inside the gate TypeScript has already narrowed `c.edhrecTotal` to a number, so no second null check is needed.

Delete `MissingChip`, `OwnedChip`, the old `SynergyPanel`, and the two deleted strings.

- [ ] **Step 5: Run the full suite, typecheck and lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS, 0 lint problems. `detail.test.tsx` will have assertions on the deleted chips and strings — update them to the new row list rather than deleting them; a test that asserted "the gap to close" now asserts an unowned row is present with its hollow-ring accessible name.

- [ ] **Step 6: Commit**

```bash
git add src/components/commanders/synergy-panel.tsx src/components/commanders/synergy-panel.test.tsx src/components/commanders/detail.tsx src/components/commanders/detail.test.tsx src/components/commanders/role-card-list.tsx src/app/commanders/\[slug\]/page.tsx
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
- Produces:

```ts
export function SynergySelection({
  selectedCards, // { oracleId: string; owned: boolean }[] — the picked cards
  onClear,       // () => void
  width,         // "desktop" | "phone"
}): JSX.Element | null
```

and `detail.tsx` gains `const [selected, setSelected] = useState<Set<string>>(new Set())` plus a Build href carrying the selection.

`onClear` is a required prop, not an optional one: the component always draws `Clear selection · N` when it draws anything at all, so a caller that omitted the handler would ship a dead control.

**The promise arithmetic.** `filled` is `FILL_BASELINE_TOTAL` (68), `picked` is the selection size, `total` is `min(99, filled + picked)`. Past 99 the count clamps and `select.promiseFull(picked)` says so. The unowned clause `select.promiseUnowned(n)` renders in `--warning` when the selection holds unowned cards.

**The two locked strings stay.** `build.stickyPromise` and `build.seedNote` render unchanged at zero selection; the promise line is a **third** string that appears beneath them once a card is selected. At zero selection the page is byte-identical to what ships today.

**The two widths take different strings.** `width="desktop"` renders `select.promise(filled, picked, total)`; `width="phone"` renders `select.promiseMobile(...)`, which is the same sentence without the full stop because it sits in a bar rather than a paragraph. Both take `select.promiseUnowned(n)` appended and both take `select.promiseFull(picked)` at the clamp. `promiseMobile` is in the copy file for exactly this and must not be left unused.

**Placement — desktop.** Under `Build this deck` in the left sticky column. Promise mono 10.5px `--fg-body` with the total in `--fg`; `Clear selection · N` mono 11px `--accent` beneath.

**Placement — phone.** Inside the sticky Build bar that already ships at `detail.tsx:620-647`. That bar is not rebuilt: its `recommendationsCopy.build.stickyLabel` ("READY TO BUILD") uppercase label and its `build.stickyPromise` line stay where they are, and `<SynergySelection width="phone" …>` mounts as a further child of the same flex column, directly beneath `stickyPromise`. The promise renders at mono 12px inside the bar, per the property table's phone rows; the geometry of the bar itself — padding, backdrop, border-top, the safe-area inset — is shipped and unchanged.

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

  it("takes the mobile promise string at phone width", () => {
    render(<SynergySelection selectedCards={owned(7)} onClear={() => {}} width="phone" />);
    expect(screen.getByText(synergyCopy.select.promiseMobile("68", "7", "75"))).toBeInTheDocument();
    expect(screen.queryByText(synergyCopy.select.promise("68", "7", "75"))).not.toBeInTheDocument();
  });

  it("clears the selection", async () => {
    const onClear = vi.fn();
    render(<SynergySelection selectedCards={owned(3)} onClear={onClear} width="desktop" />);
    await userEvent.click(screen.getByRole("button", { name: synergyCopy.select.clearAria("3") }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
```

Add two tests to `detail.test.tsx` for the handoff itself:

```tsx
it("leaves the Build href unchanged while nothing is selected", () => {
  renderDetail();
  for (const link of screen.getAllByRole("link", { name: /Build this deck/i })) {
    expect(link).toHaveAttribute("href", `/decks?commander=${commander.oracleId}`);
  }
});

it("carries the selected oracle ids into the Build href", async () => {
  renderDetail();
  const rows = screen.getAllByRole("listitem");
  await userEvent.click(within(rows[0]).getByRole("button", { name: /^Add / }));
  await userEvent.click(within(rows[1]).getByRole("button", { name: /^Add / }));
  const href = screen.getAllByRole("link", { name: /Build this deck/i })[0].getAttribute("href");
  expect(href).toContain(`commander=${commander.oracleId}`);
  expect(new URL(href!, "http://x").searchParams.get("select")?.split(",")).toHaveLength(2);
});
```

`renderDetail()` is whatever helper `detail.test.tsx` already uses to mount `CommanderDetail` with a fixture commander; extend it to pass `synergyCards` rather than writing a second one.

- [ ] **Step 2: Run it to make sure it fails**

Run: `pnpm test src/components/commanders/synergy-selection.test.tsx`
Expected: FAIL — cannot resolve `./synergy-selection`.

- [ ] **Step 3: Write the component and lift the state**

`SynergySelection` is pure arithmetic over its props:

```tsx
export function SynergySelection({ selectedCards, onClear, width }: Props) {
  const picked = selectedCards.length;
  if (picked === 0) return null;              // the locked zero-selection copy stands alone

  const total = Math.min(99, FILL_BASELINE_TOTAL + picked);
  const unowned = selectedCards.filter((c) => !c.owned).length;
  const full = FILL_BASELINE_TOTAL + picked >= 99;
  const promise = full
    ? synergyCopy.select.promiseFull(String(picked))
    : width === "phone"
      ? synergyCopy.select.promiseMobile(String(FILL_BASELINE_TOTAL), String(picked), String(total))
      : synergyCopy.select.promise(String(FILL_BASELINE_TOTAL), String(picked), String(total));
  …
}
```

The unowned clause renders in `--warning` after the promise when `unowned > 0`. `Clear selection · N` is a `<button type="button">` labelled `select.clearAria(String(picked))` calling `onClear`.

In `detail.tsx`, lift the state once and pass it to both widths — a second `useState` per width would let the two panels disagree:

```tsx
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelected = useCallback((oracleId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(oracleId)) next.add(oracleId);
      return next;
    });
  }, []);
  const selectedCards = synergyCards.filter((c) => selected.has(c.oracleId));

  // Ruling 4: page state. No persistence, no restore, no cap.
  const buildHref =
    selected.size === 0
      ? `/decks?commander=${c.oracleId}`
      : `/decks?commander=${c.oracleId}&select=${[...selected].join(",")}`;
```

Both Build links (`detail.tsx:641` phone, `:735` desktop) take `buildHref`. At zero selection the string is byte-identical to the shipped one.

The announcement uses `select.announce(String(picked), String(total))` on the live region already in the page, debounced on a ~500ms timer so twelve fast toggles settle into one message.

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
- Modify: `src/lib/decks/fill.ts` (gains `dedupeSelectionFromPool`)
- Modify: `src/app/decks/actions.ts` — `buildFillPlan` (`:107`) and `createDeck` (`:142`)
- Modify: `src/app/decks/page.tsx` — carry `?select=` through the redirect
- Modify: `src/app/decks/new/page.tsx` — read `?select=` and pass it down
- Modify: `src/components/decks/create-pre-filled.tsx:54` — the actual `createDeck` call site
- Test: `src/app/decks/create-deck-selection.test.ts`
- Test: `src/lib/decks/fill.test.ts` (add to the existing file)

**Interfaces:**
- Consumes: `planFill` (unchanged).
- Produces:
  - `createDeck(commanderOracleId: string, name: string, selectedOracleIds?: string[]): Promise<void>`
  - `buildFillPlan(userId, commander, excludeOracleIds?: Set<string>): Promise<FillPlan>` — **a signature change.** The parameter defaults to an empty set so the two existing call sites (`createDeck` and `fillDeck`) need no edit.
  - `dedupeSelectionFromPool<T extends { oracleId: string }>(pool: T[], selectedOracleIds: Iterable<string>): T[]` in `src/lib/decks/fill.ts`.

**The entry point is a three-file chain**, not one component. `/decks?commander=` (`page.tsx:23-27`) redirects to `/decks/new?commander=`; `new/page.tsx` validates the id and renders `CreatePreFilled`; `create-pre-filled.tsx:54` is the only place `createDeck` is actually called. All three carry `select` through. `create-picker.tsx` is **not** touched: the picker door has no commander in the URL, so there is no selection to carry.

**Where `dedupeSelectionFromPool` lives.** In `src/lib/decks/fill.ts`, beside `planFill` and the 68-card fill it deduplicates — not in `last-slots.ts`, which is documented as being about the last 31 and would then own a helper whose only caller is the 68-card path, and not in `actions.ts`, which is a `"use server"` module and can only export async functions.

**The dedupe is the whole task** (handoff gap report 4). The selection is placed **first**, and the fill then runs against candidates with those cards removed. Without that, a selected card that `planFill` would also have placed is spent twice and the deck lands at 98.

**The exclusion must reach both of `buildFillPlan`'s candidate lists.** `buildFillPlan` takes no pool argument — it builds `ownedColorLegalPool` *and* `unownedStaples` internally (`actions.ts:115-124`) and hands both to `planFill`. There is no seam outside it, which is why it gains the parameter rather than the caller filtering something first. Filtering only the owned pool would leave gap report 4 open for exactly the unowned case ruling 5 cares about: an unowned selected card is in `staples`, not in `pool`.

Every selected card is written with `auto = true` (ruling 7), so `Clear all auto` undoes the selection along with the fill — which is correct: the player asked for these cards on a different page and the sweep is the one control that means "none of this was mine".

Validate every selected id the same way `restoreAutoCards` does (`actions.ts:513-551`): UUID shape, then one `validateCardForDeck` pass per id. An invalid or illegal id is **skipped**, not thrown — `restoreAutoCards` throws because its input is a receipt the client just received from the server, whereas this input is a URL the player carried across a navigation, and a hard failure would lose the commander choice as well. That is the one place this path deliberately departs from the pattern it otherwise copies.

The 99 cap is counted the way `restoreAutoCards` counts it: by **summing `quantity`**, not by counting rows. `planFill`'s rows carry a `quantity` and basics stack (`actions.ts:166`), so a row count would let a plan holding thirty Forests past the cap.

- [ ] **Step 1: Write the failing tests**

Two files. First, the pure helper, added to the existing `src/lib/decks/fill.test.ts`:

```ts
import { dedupeSelectionFromPool } from "./fill";

// The pure half of the dedupe, extracted so the transaction does not have to be
// stubbed to test the arithmetic that gap report 4 flagged.
describe("dedupeSelectionFromPool", () => {
  it("removes selected cards from the candidates the fill plans against", () => {
    const pool = [{ oracleId: "a" }, { oracleId: "b" }, { oracleId: "c" }];
    expect(dedupeSelectionFromPool(pool, ["b"]).map((c) => c.oracleId)).toEqual(["a", "c"]);
  });

  it("leaves the candidates alone when nothing was selected", () => {
    const pool = [{ oracleId: "a" }];
    expect(dedupeSelectionFromPool(pool, [])).toHaveLength(1);
  });

  it("ignores a selected id that is not among the candidates", () => {
    const pool = [{ oracleId: "a" }];
    expect(dedupeSelectionFromPool(pool, ["zzz"])).toHaveLength(1);
  });
});
```

Second, `src/app/decks/create-deck-selection.test.ts` — the actual task, which the helper test does not touch. Build it on the stub in `src/app/decks/actions.test.ts` (`vi.hoisted` state, `nameOf(table)` via `Symbol.for("drizzle:Name")`, `vi.mock("../../db", …)`, `vi.mock("../../lib/auth", …)`, `vi.mock("next/cache", …)`, the throwing `redirect` mock, and the `runCreate()` helper that swallows the redirect throw). Reuse that file's helpers rather than re-deriving them.

```ts
const VALID = "11111111-1111-4111-8111-111111111111";
const OFF_COLOUR = "22222222-2222-4222-8222-222222222222";
const NOT_A_UUID = "not-a-uuid";

describe("createDeck with a selection", () => {
  it("writes every selected card as an auto row so the sweep undoes it", async () => {
    stub.cards = [commanderRow(), cardRow(VALID)];
    await runCreate("cmdr", "My deck", [VALID]);
    const rows = stub.insertCalls.flatMap((c) => c.values);
    const selected = rows.find((r) => r.oracleId === VALID);
    expect(selected).toMatchObject({ auto: true, quantity: 1 });
  });

  it("keeps the fill from spending a card the selection already placed", async () => {
    // The pool and the selection overlap on VALID. Gap report 4: it lands once.
    stub.cards = [commanderRow(), cardRow(VALID), cardRow(OTHER)];
    stub.collectionItems = [{ oracleId: VALID, quantity: 1 }, { oracleId: OTHER, quantity: 1 }];
    await runCreate("cmdr", "My deck", [VALID]);
    const ids = stub.insertCalls.flatMap((c) => c.values).map((r) => r.oracleId);
    expect(ids.filter((id) => id === VALID)).toHaveLength(1);
  });

  it("skips a malformed id rather than failing the whole create", async () => {
    stub.cards = [commanderRow(), cardRow(VALID)];
    await runCreate("cmdr", "My deck", [NOT_A_UUID, VALID]);
    expect(stub.deckRows).toHaveLength(1);
    const ids = stub.insertCalls.flatMap((c) => c.values).map((r) => r.oracleId);
    expect(ids).toContain(VALID);
    expect(ids).not.toContain(NOT_A_UUID);
  });

  it("skips a card validateCardForDeck refuses rather than failing the whole create", async () => {
    // Off the commander's colour identity: the add path would refuse it, so
    // this path does too — quietly, because the player is mid-navigation.
    stub.cards = [commanderRow(), cardRow(VALID), cardRow(OFF_COLOUR, { colorIdentity: ["U"] })];
    await runCreate("cmdr", "My deck", [OFF_COLOUR, VALID]);
    const ids = stub.insertCalls.flatMap((c) => c.values).map((r) => r.oracleId);
    expect(ids).toContain(VALID);
    expect(ids).not.toContain(OFF_COLOUR);
  });

  it("counts the 99 cap on summed quantity, not on row count", async () => {
    // 30 basics at quantity 1 each plus a plan holding a stacked basic must not
    // slip past the cap the way a `rows.length` check would let it.
    stub.cards = [commanderRow(), ...manyCards(70), basicLandRow({ quantity: 30 })];
    await runCreate("cmdr", "My deck", selectionOf(5));
    const total = stub.insertCalls
      .flatMap((c) => c.values)
      .reduce((n, r) => n + r.quantity, 0);
    expect(total).toBeLessThanOrEqual(99);
  });

  it("is byte-identical to the shipped path when no selection is passed", async () => {
    stub.cards = [commanderRow(), cardRow(VALID)];
    await runCreate("cmdr", "My deck");
    const ids = stub.insertCalls.flatMap((c) => c.values).map((r) => r.oracleId);
    expect(ids).toEqual(await shippedFillIds());  // the same run with the parameter omitted
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm test src/lib/decks/fill.test.ts src/app/decks/create-deck-selection.test.ts`
Expected: FAIL — `dedupeSelectionFromPool` is not exported and `createDeck` takes two parameters.

- [ ] **Step 3: Write `dedupeSelectionFromPool`, widen `buildFillPlan`, and wire `createDeck`**

In `src/lib/decks/fill.ts`:

```ts
/** Gap report 4. The selection is placed first and the 68-card fill runs
 *  against what is left, so a card the player picked is not also placed for a
 *  role and the deck does not land at 98.
 *
 *  Generic over the row shape because it is applied twice — once to the owned
 *  pool and once to the unowned staples — and those two have different types.
 *
 *  The consequence is deliberate and worth stating: the fill's role counts can
 *  come out different from the zero-selection case, because a selected ramp
 *  card closes a ramp gap the fill would have closed with something else. The
 *  provenance line reads the counts off the placed rows, so it follows. */
export function dedupeSelectionFromPool<T extends { oracleId: string }>(
  pool: T[],
  selectedOracleIds: Iterable<string>,
): T[] {
  const picked = selectedOracleIds instanceof Set ? selectedOracleIds : new Set(selectedOracleIds);
  if (picked.size === 0) return pool;
  return pool.filter((c) => !picked.has(c.oracleId));
}
```

In `actions.ts`, `buildFillPlan` gains a third parameter and applies the filter to **both** lists:

```ts
export async function buildFillPlan(
  userId: string,
  commander: { oracleId: string; name: string; colorIdentity: string[] },
  // The cards a selection has already placed. Defaults to empty so `fillDeck`
  // and the no-selection `createDeck` are unchanged.
  excludeOracleIds: Set<string> = new Set(),
): Promise<FillPlan> {
  const pool = dedupeSelectionFromPool(
    await ownedColorLegalPool(userId, commander),
    excludeOracleIds,
  );
  const { data } = await getEdhrecData(commander.oracleId, commander.name);
  …
  const staples = dedupeSelectionFromPool(
    data?.topCards
      ? await unownedStaples(commander, data.topCards, ownedIds, new Set([commander.oracleId]))
      : [],
    excludeOracleIds,
  );
  …
}
```

Both, not one. A selected card the player does not own is in `staples`; a selected card they do own is in `pool`. Note that `ownedIds` is still built from the **deduped** pool, which is correct — `unownedStaples` uses it to avoid offering a card the player already owns, and a selected owned card is still owned.

In `createDeck`, take the selection as an optional third parameter, resolve it to a validated set before the transaction, place those rows first, and pass the same set to `buildFillPlan`:

```ts
export async function createDeck(
  commanderOracleId: string,
  name: string,
  selectedOracleIds: string[] = [],
): Promise<void> {
  …
  // Skipped, not thrown: this input rode in on a URL, and refusing the whole
  // create would cost the player the commander choice as well as the picks.
  const requested = [...new Set(selectedOracleIds)].filter((id) => UUID_RE.test(id));
  const candidates = requested.length
    ? await db.select({ oracleId: cards.oracleId, commanderLegal: cards.commanderLegal, colorIdentity: cards.colorIdentity })
        .from(cards).where(inArray(cards.oracleId, requested))
    : [];
  const selected = candidates
    .filter((card) => !validateCardForDeck(card, {
      commanderOracleId,
      commanderColorIdentity: commander.colorIdentity,
      built: 0,
    }))
    .map((card) => card.oracleId);
  const selectedSet = new Set(selected);

  const plan = await buildFillPlan(userId, { … }, selectedSet);
  deckId = await db.transaction(async (tx) => {
    const [deck] = await tx.insert(decks).values({ … }).returning({ id: decks.id });
    // The selection first, then as much of the fill as fits under 99. The cap
    // sums quantity because planFill's basics stack (actions.ts:166).
    const rows = [
      ...selected.map((oracleId) => ({ deckId: deck.id, oracleId, quantity: 1, auto: true })),
      ...plan.rows.map((r) => ({ deckId: deck.id, oracleId: r.oracleId, quantity: r.quantity, auto: true })),
    ];
    const capped: typeof rows = [];
    let built = 0;
    for (const row of rows) {
      if (built + row.quantity > 99) continue;
      capped.push(row);
      built += row.quantity;
    }
    if (capped.length > 0) await tx.insert(deckCards).values(capped).onConflictDoNothing();
    return deck.id;
  });
```

`built: 0` in the `validateCardForDeck` call asks about legality alone, exactly as `restoreAutoCards:546` does; the cap is enforced by the loop above, inside the transaction. The `redirect` stays outside the try, exactly as it is now.

- [ ] **Step 3b: Carry `select` through the three-file entry chain**

`src/app/decks/page.tsx` builds the redirect target — append `&select=…` when the parameter is present and well-formed, and drop it otherwise. `src/app/decks/new/page.tsx` reads `select` off its `searchParams` promise, splits on `,`, filters to UUID-shaped ids, and passes the array to `CreatePreFilled`. `src/components/decks/create-pre-filled.tsx:54` passes it as `createDeck`'s third argument. Every one of those layers filters rather than throws, for the reason above.

- [ ] **Step 4: Run the tests, typecheck and lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS, 0 lint problems.

- [ ] **Step 5: Commit**

```bash
git add src/lib/decks/fill.ts src/lib/decks/fill.test.ts src/app/decks/actions.ts src/app/decks/create-deck-selection.test.ts src/app/decks/page.tsx src/app/decks/new/page.tsx src/components/decks/create-pre-filled.tsx
git commit -m "feat(decks): place a synergy selection before the fill, and dedupe both candidate lists"
```

---

## Task 9: The last-slots decision

**Files:**
- Create: `src/lib/decks/last-slots.ts` — this task creates it. Task 8's dedupe helper lives in `fill.ts`, so nothing exists here yet.
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
- Consumes: `planLastSlots` (Task 9), `readSynergyCards` (Task 4), `validateCardForDeck` and the locking pattern from `restoreAutoCards` (`actions.ts:513`), `DeckMutationResult` from `src/lib/decks/mutation-result.ts`, `claimSurfaces` from `src/lib/decks/revalidate.ts`.
- Produces:

```ts
export type LastSlotsFillResult =
  | { ok: true; added: number; total: number; shortfall: number }   // owned
  | { ok: false; message: string };

export type LastSlotsTopUpResult =
  | { ok: true; added: number; total: number; bought: number }      // unowned
  | { ok: false; message: string };

export async function fillLastSlotsOwned(deckId: string): Promise<LastSlotsFillResult>;
export async function fillLastSlotsUnowned(deckId: string): Promise<LastSlotsTopUpResult>;
```

**Both actions return their refusal rather than throwing**, widening `DeckMutationResult`'s discriminated shape with the receipt fields on the success arm. This is the convention `addCardToDeck` established and `mutation-result.ts` documents in its header: a thrown server action is redacted to an opaque digest in production, so a client that only ever saw a throw could not tell "deck full" from "the database blinked" — and state 10 in the matrix requires the strip to draw `lastSlots.fillFailed` / `lastSlots.topUpFailed` under the clicked control specifically. Those two strings are the `message` each action returns.

Both follow `restoreAutoCards`'s shape otherwise: lock the deck row `for update`, re-read the card list **inside** the transaction, run `validateCardForDeck` per id, enforce the 99 cap inside the lock summing `quantity`, insert with `auto: true` and `onConflictDoNothing`, then `revalidatePath` over **`claimSurfaces(deckId)`** — not `deckSurfaces`. Both actions change deck *membership*, and `revalidate.ts` is explicit that membership writes take the wider set, which adds `/collection` and `/commanders`; `addCardToDeck`, `fillDeck`, `clearAutoCards` and `restoreAutoCards` all do the same. Using `deckSurfaces` here would leave the availability markers on those two surfaces stale after a fill that just claimed thirty-one cards.

Re-reading inside the lock is not optional. `openSlots` computed before the lock is a number another tab may already have spent.

**These are not `getDeckSuggestions`' `slice(0, 5)`.** That flat slice at `actions.ts:251` is the 68-card fill's top-up and stays exactly as it is. The last-31 top-up is a fresh iteration over the ranked support list with no role bounding at all.

- [ ] **Step 1: Write the failing test**

Stub the Drizzle module exactly the way `src/app/decks/actions.test.ts` does — its `vi.hoisted` state object, its `nameOf(table)` dispatch on `Symbol.for("drizzle:Name")`, `vi.mock("../../db", () => ({ db: stub.db }))`, `vi.mock("../../lib/auth", …)` and `vi.mock("next/cache", …)`. Add `vi.mock("./commanders/…/synergy-read")` so `readSynergyCards` returns a fixture ranking instead of touching the stub's SQL:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const ranked = vi.hoisted(() => ({ value: [] as unknown[] }));
vi.mock("../commanders/[slug]/synergy-read", () => ({
  readSynergyCards: () => Promise.resolve(ranked.value),
}));

function synergy(id: string, pts: number, owned: boolean) {
  return { oracleId: id, name: id, typeLine: "Instant", facet: "spell", inclusionPct: null, synergyPts: pts, owned };
}

beforeEach(() => {
  stub.reset();
  ranked.value = [];
});

describe("fillLastSlotsOwned", () => {
  it("writes every placed card as auto so the sweep undoes it", async () => {
    stub.deckCards = rowsFor(97);                       // two slots open
    ranked.value = [synergy("o1", 90, true), synergy("o2", 80, true)];
    const { fillLastSlotsOwned } = await import("./actions");
    const out = await fillLastSlotsOwned("deck-1");
    expect(out).toMatchObject({ ok: true, added: 2, total: 99, shortfall: 0 });
    expect(stub.insertCalls.flatMap((c) => c.values).every((r) => r.auto === true)).toBe(true);
  });

  it("stops at the 99 cap computed inside the lock, not before it", async () => {
    // The plan is made against 4 open slots; by the time the lock is taken the
    // deck holds 98. Only one card may land.
    stub.deckCards = rowsFor(95);
    stub.onLock = () => { stub.deckCards = rowsFor(98); };
    ranked.value = [synergy("o1", 90, true), synergy("o2", 80, true), synergy("o3", 70, true)];
    const { fillLastSlotsOwned } = await import("./actions");
    const out = await fillLastSlotsOwned("deck-1");
    expect(out).toMatchObject({ ok: true, added: 1, total: 99 });
  });

  it("returns the shortfall when the owned pool runs out", async () => {
    stub.deckCards = rowsFor(90);                       // nine slots open
    ranked.value = [synergy("o1", 90, true), synergy("u1", 80, false)];
    const { fillLastSlotsOwned } = await import("./actions");
    const out = await fillLastSlotsOwned("deck-1");
    expect(out).toMatchObject({ ok: true, added: 1, total: 91, shortfall: 8 });
  });

  it("skips a card validateCardForDeck refuses rather than failing the whole fill", async () => {
    stub.deckCards = rowsFor(97);
    stub.cards = [commanderRow(), cardRow("o1"), cardRow("bad", { colorIdentity: ["U"] })];
    ranked.value = [synergy("bad", 99, true), synergy("o1", 90, true)];
    const { fillLastSlotsOwned } = await import("./actions");
    const out = await fillLastSlotsOwned("deck-1");
    expect(out).toMatchObject({ ok: true, added: 1 });
    expect(stub.insertCalls.flatMap((c) => c.values).map((r) => r.oracleId)).toEqual(["o1"]);
  });

  it("returns the refusal rather than throwing when the write fails", async () => {
    stub.deckCards = rowsFor(97);
    stub.transactionError = new Error("boom");
    ranked.value = [synergy("o1", 90, true)];
    const { fillLastSlotsOwned } = await import("./actions");
    await expect(fillLastSlotsOwned("deck-1")).resolves.toEqual({
      ok: false,
      message: synergyCopy.lastSlots.fillFailed,
    });
  });

  it("revalidates the claim surfaces, not just the deck's own", async () => {
    stub.deckCards = rowsFor(98);
    ranked.value = [synergy("o1", 90, true)];
    const { fillLastSlotsOwned } = await import("./actions");
    await fillLastSlotsOwned("deck-1");
    expect(revalidated).toContain("/collection");
    expect(revalidated).toContain("/commanders");
  });
});

describe("fillLastSlotsUnowned", () => {
  it("does not filter on ownership", async () => {
    stub.deckCards = rowsFor(97);
    ranked.value = [synergy("u1", 90, false), synergy("o1", 80, true)];
    const { fillLastSlotsUnowned } = await import("./actions");
    const out = await fillLastSlotsUnowned("deck-1");
    expect(stub.insertCalls.flatMap((c) => c.values).map((r) => r.oracleId)).toEqual(["u1", "o1"]);
    expect(out).toMatchObject({ ok: true, added: 2 });
  });

  it("reports how many of the deck's cards are now unowned", async () => {
    stub.deckCards = rowsFor(97);
    ranked.value = [synergy("u1", 90, false), synergy("u2", 80, false)];
    const { fillLastSlotsUnowned } = await import("./actions");
    const out = await fillLastSlotsUnowned("deck-1");
    // `bought` is the whole deck's unowned count after the write, not this
    // call's — the strip states what the player still has to buy.
    expect(out).toMatchObject({ ok: true, bought: 2 });
  });

  it("returns the top-up refusal rather than throwing", async () => {
    stub.deckCards = rowsFor(97);
    stub.transactionError = new Error("boom");
    ranked.value = [synergy("u1", 90, false)];
    const { fillLastSlotsUnowned } = await import("./actions");
    await expect(fillLastSlotsUnowned("deck-1")).resolves.toEqual({
      ok: false,
      message: synergyCopy.lastSlots.topUpFailed,
    });
  });
});
```

`rowsFor(n)`, `commanderRow()`, `cardRow()`, `revalidated` and `stub.onLock` are helpers to add to the stub alongside the ones `actions.test.ts` already has; `onLock` is the hook that lets the cap test mutate the deck between planning and the `for update`, which is the only way to prove the re-read inside the lock is real.

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm test src/app/decks/last-slots-actions.test.ts`
Expected: FAIL — neither action is exported.

- [ ] **Step 3: Write both actions**

One private helper, two thin exported wrappers — the only difference between them is `ownedOnly` and which receipt they build:

```ts
async function fillLastSlots(deckId: string, ownedOnly: boolean) {
  const userId = await requireUserId();
  const deck = await requireDeck(deckId, userId);
  const [commander] = await db.select({ colorIdentity: cards.colorIdentity })
    .from(cards).where(eq(cards.oracleId, deck.commanderOracleId));
  if (!commander) throw new Error("commander not found");

  // The exclusion input is empty: the panel's role-coverage exclusion is a
  // commander-page concern, and on the deck surface every ranked card is a
  // candidate. `planLastSlots` does the in-deck filtering.
  const ranked = await readSynergyCards(userId, deck.commanderOracleId, []);

  return await db.transaction(async (tx) => {
    await tx.execute(sql`select 1 from ${decks} where ${decks.id} = ${deckId} for update`);
    // Re-read inside the lock. `openSlots` computed before it is a number
    // another tab may already have spent.
    const present = await tx.select({ oracleId: deckCards.oracleId, quantity: deckCards.quantity })
      .from(deckCards).where(eq(deckCards.deckId, deckId));
    const built = present.reduce((n, r) => n + r.quantity, 0);
    const inDeck = new Set(present.map((r) => r.oracleId));

    const { place, shortfall } = planLastSlots({
      ranked, openSlots: 99 - built, inDeckOracleIds: inDeck, ownedOnly,
    });

    // Same legality pass the add path runs; a refusal skips one card rather
    // than failing the fill, because a fill is a bulk act and one off-identity
    // row is not a reason to place nothing.
    const legal = place.filter((oracleId) => {
      const card = byOracleId.get(oracleId);
      return card != null && !validateCardForDeck(card, {
        commanderOracleId: deck.commanderOracleId,
        commanderColorIdentity: commander.colorIdentity,
        built: 0,
      });
    });

    if (legal.length > 0) {
      await tx.insert(deckCards)
        .values(legal.map((oracleId) => ({ deckId, oracleId, quantity: 1, auto: true })))
        .onConflictDoNothing();
    }
    for (const path of claimSurfaces(deckId)) revalidatePath(path);
    // The deck's membership after the write, deduplicated. The top-up wrapper
    // scopes its collection read to this.
    const finalOracleIds = [...new Set([...inDeck, ...legal])];
    return { added: legal.length, total: built + legal.length, shortfall, userId, finalOracleIds };
  });
}

export async function fillLastSlotsOwned(deckId: string): Promise<LastSlotsFillResult> {
  try {
    const r = await fillLastSlots(deckId, true);
    return { ok: true, added: r.added, total: r.total, shortfall: r.shortfall };
  } catch (err) {
    console.error("fillLastSlotsOwned failed", err);
    return { ok: false, message: synergyCopy.lastSlots.fillFailed };
  }
}

export async function fillLastSlotsUnowned(deckId: string): Promise<LastSlotsTopUpResult> {
  try {
    const r = await fillLastSlots(deckId, false);
    // `bought` is what the player still has to acquire for the whole deck, not
    // just this call — the strip's figure is about the deck, not the click.
    // Ownership therefore comes from `collection_items`, not from the ranked
    // list: a deck card EDHREC never ranked is still one the player has to buy.
    // The read sits outside the transaction because `collection_items` is
    // untouched by the deck write and needs no row lock, and it lives only in
    // this wrapper so the owned-only path does not pay for a figure it drops.
    const owned = new Set(
      (await db.select({ oracleId: collectionItems.oracleId })
        .from(collectionItems)
        .where(and(
          eq(collectionItems.userId, r.userId),
          inArray(collectionItems.oracleId, r.finalOracleIds),
        )))
        .map((c) => c.oracleId),
    );
    const bought = r.finalOracleIds.filter((id) => !owned.has(id)).length;
    return { ok: true, added: r.added, total: r.total, bought };
  } catch (err) {
    console.error("fillLastSlotsUnowned failed", err);
    return { ok: false, message: synergyCopy.lastSlots.topUpFailed };
  }
}
```

`byOracleId` is one `inArray` read of `place`'s ids inside the transaction, shaped like `restoreAutoCards`'s candidate read (`actions.ts:534-536`). The `try` wraps the whole call including `requireDeck`, so an unauthorised or missing deck also comes back as a refusal rather than a digest.

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
- Modify: `src/app/decks/[id]/page.tsx` — reads the ranking and derives the two candidate counts

**Interfaces:**
- Consumes: `synergyCopy` (Task 1), `fillLastSlotsOwned` / `fillLastSlotsUnowned` (Task 10), the shipped `MutationError`, `GhostButton`.
- Produces: `export function LastSlotsStrip({ deckId, openSlots, ownedCandidates, unownedCandidates, commanderShortName, onAnnounce, width })`.

**Geometry.** `--surface-rail` on `1px --border-strong`, radius 10px, padding `14px 16px`. Heading `lastSlots.heading(n)` mono 10.5px `--accent` uppercase `letter-spacing .14em`; sub-clause `lastSlots.caption(n)` / `.captionMobile(n)` mono 10.5px `--fg-faint`. Sits **between the provenance line and the toolbar rule**. Unmounts as a unit at 0 open slots.

**The owned note.** `lastSlots.ownedNote(String(ownedCandidates), commanderShortName)` renders beside the two controls in mono `--fg-locked`. This is what `commanderShortName` is for — the prop exists in the signature and the note is the only thing that reads it. It renders whenever control A is present, because the number it explains is almost always smaller than the gap and the label alone does not say why.

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

One test per state in the matrix. Mock the two actions at the module boundary the way the other `src/components/decks/*.test.tsx` files mock deck actions, and drive the in-flight states with a deferred promise:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { recommendationsCopy } from "../../lib/copy/recommendations";

const actions = vi.hoisted(() => ({
  fillOwned: vi.fn(), fillUnowned: vi.fn(),
}));
vi.mock("../../app/decks/actions", () => ({
  fillLastSlotsOwned: actions.fillOwned,
  fillLastSlotsUnowned: actions.fillUnowned,
}));

import { LastSlotsStrip } from "./last-slots-strip";

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

const base = {
  deckId: "deck-1", openSlots: 31, ownedCandidates: 12, unownedCandidates: 40,
  commanderShortName: "Atraxa", onAnnounce: () => {}, width: "desktop" as const,
};

beforeEach(() => {
  actions.fillOwned.mockReset().mockResolvedValue({ ok: true, added: 12, total: 80, shortfall: 19 });
  actions.fillUnowned.mockReset().mockResolvedValue({ ok: true, added: 19, total: 99, bought: 19 });
});

describe("LastSlotsStrip", () => {
  // State 2: shallow pool. Rule 4 — A never promises 99.
  it("states what the owned pool can place, not the gap", () => {
    render(<LastSlotsStrip {...base} />);
    expect(screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") })).toBeInTheDocument();
    expect(screen.queryByText(/Fill 31/)).not.toBeInTheDocument();
  });

  it("explains the number with the owned note", () => {
    render(<LastSlotsStrip {...base} />);
    expect(screen.getByText(synergyCopy.lastSlots.ownedNote("12", "Atraxa"))).toBeInTheDocument();
  });

  // State 9. Rule 3 — the strip unmounts as a unit, heading and all.
  it("renders nothing at all when there are no open slots", () => {
    const { container } = render(<LastSlotsStrip {...base} openSlots={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  // State 6. Rule 1 — absent, not disabled.
  it("omits the owned control when there are no owned candidates", () => {
    render(<LastSlotsStrip {...base} ownedCandidates={0} />);
    expect(screen.queryByRole("button", { name: /from my collection/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: synergyCopy.lastSlots.topUpAria("31") })).toBeEnabled();
  });

  // State 12.
  it("omits the top-up when there are no unowned candidates", () => {
    render(<LastSlotsStrip {...base} unownedCandidates={0} />);
    expect(screen.queryByRole("button", { name: /Top up/ })).not.toBeInTheDocument();
  });

  // States 3 and 8. Rule 2 — nothing unmounts mid-action.
  it("disables the other control during a write rather than unmounting it", async () => {
    const pending = deferred<{ ok: true; added: number; total: number; shortfall: number }>();
    actions.fillOwned.mockReturnValue(pending.promise);
    render(<LastSlotsStrip {...base} />);
    await userEvent.click(screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }));
    const topUp = screen.getByRole("button", { name: synergyCopy.lastSlots.topUpAria("31") });
    expect(topUp).toBeInTheDocument();
    expect(topUp).toBeDisabled();
    expect(screen.getByText(recommendationsCopy.fill.fillingRows("12"))).toBeInTheDocument();
    pending.resolve({ ok: true, added: 12, total: 80, shortfall: 19 });
  });

  // State 5, §7.6. The shortfall is honest, not alarming: --accent, not --warning.
  it("draws the shortfall line in the provenance shape, not the warning one", async () => {
    render(<LastSlotsStrip {...base} />);
    await userEvent.click(screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }));
    const line = await screen.findByText(synergyCopy.lastSlots.short("80", "19"));
    expect(line.closest("[data-testid='last-slots-shortfall']")).toHaveStyle({
      borderLeft: "3px solid var(--accent)",
    });
  });

  // State 10. Rule 5 — the refusal is under the clicked control and the other
  // control is untouched.
  it("leaves the other control enabled after a refusal", async () => {
    actions.fillOwned.mockResolvedValue({ ok: false, message: synergyCopy.lastSlots.fillFailed });
    render(<LastSlotsStrip {...base} />);
    await userEvent.click(screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }));
    expect(await screen.findByText(synergyCopy.lastSlots.fillFailed)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: synergyCopy.lastSlots.topUpAria("31") })).toBeEnabled();
  });

  // Rule 7, and the announcement rule: one message per settle, not per row.
  it("announces the settle once", async () => {
    const onAnnounce = vi.fn();
    render(<LastSlotsStrip {...base} onAnnounce={onAnnounce} />);
    await userEvent.click(screen.getByRole("button", { name: synergyCopy.lastSlots.fillOwnedAria("12") }));
    await screen.findByText(synergyCopy.lastSlots.short("80", "19"));
    expect(onAnnounce).toHaveBeenCalledExactlyOnceWith(
      synergyCopy.lastSlots.shortAnnounce("12", "80", "19"),
    );
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm test src/components/decks/last-slots-strip.test.tsx`
Expected: FAIL — cannot resolve `./last-slots-strip`.

- [ ] **Step 3: Write the strip and mount it**

Mount it in `builder-shell.tsx` directly after the provenance-line block (`builder-shell.tsx:548`) and before the fill-failed banner. `openSlots` is `99 - built` off the optimistic card list. `onAnnounce` writes to the live region already in the shell (`builder-shell.tsx:474`).

**Where the two candidate counts come from.** The deck route reads the ranking once and derives both counts with `planLastSlots`, the same function the actions use — so the face of a control and the effect of clicking it cannot disagree:

```ts
  const ranked = await readSynergyCards(userId, deck.commanderOracleId, []);
  const inDeckOracleIds = new Set(deckCardRows.map((r) => r.oracleId));
  const openSlots = 99 - built;
  const ownedCandidates = planLastSlots({
    ranked, openSlots, inDeckOracleIds, ownedOnly: true,
  }).place.length;
  const allCandidates = planLastSlots({
    ranked, openSlots, inDeckOracleIds, ownedOnly: false,
  }).place.length;
  const unownedCandidates = allCandidates - ownedCandidates;
```

Two things this deliberately does **not** do. It does not pass the deck's card ids as `readSynergyCards`'s `coveredOracleIds` argument: that argument feeds `excludeCoveredRoleCards`, which filters on `c.owned && covered.has(id)`, so an **unowned** card already in the deck would survive it and be counted as a candidate the top-up could place — over-counting exactly control B's face figure and breaking state 12, where B must be absent. The unconditional in-deck filter belongs to `planLastSlots`, which is where it already is. And it does not count `ranked.filter((c) => !c.owned)`: `place` is bounded by `openSlots`, so both counts are capped the same way the fill is, and control B's face never promises more than it can place.

`commanderShortName` comes from the deck's commander record, the same value the provenance line already uses.

- [ ] **Step 4: Run the suite, typecheck and lint**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS, 0 lint problems.

- [ ] **Step 5: Commit**

```bash
git add src/components/decks/last-slots-strip.tsx src/components/decks/last-slots-strip.test.tsx src/components/decks/builder-shell.tsx src/app/decks/\[id\]/page.tsx
git commit -m "feat(decks): the last-31 strip, owned fill beside a buying top-up"
```

---

## Task 12: The Consider shelf, the tile's lift line, and the celebration ruling

**Files:**
- Modify: `src/lib/decks/suggest.ts`
- Modify: `src/components/decks/consider-panel.tsx`
- Modify: `src/components/decks/suggestion-tile.tsx`
- Modify: `src/lib/decks/celebration.ts`
- Modify: `src/components/decks/builder-shell.tsx`
- Test: `src/lib/decks/suggest.test.ts`, `src/lib/decks/celebration.test.ts`
- Test: `src/components/decks/consider-panel.test.tsx`, `src/components/decks/suggestion-tile.test.tsx`

Three edits in one task because each is a single clause and none carries its own review surface. The first is larger than the plan originally claimed: the shelf cannot be ordered by a figure the suggestion does not carry.

**1a. `DeckSuggestion` gains a signed `synergy`.** `suggest.ts:94` sets `lift` only when `synergy > 0` — "zero and negative resolve to null", which `suggest.test.ts` locks with shipped assertions. A shelf whose *ordering is synergy* therefore has `lift == null` on most tiles and cannot be sorted by it.

Do **not** loosen `lift`: those locked tests are correct about what `lift` means, and the Global Constraints forbid deleting a test. Add a second field instead:

```ts
    const synergy = synergyByName[lower] ?? synergyByName[lower.split(" // ")[0]];
    const figure = synergy != null && Number.isFinite(synergy) ? synergy : null;
    // `lift` is the positive-only figure the Evidence line prints — a card the
    // commander runs *less* often than average is not a lift and never was.
    // `synergyFigure` is the same number unfiltered, because the synergy shelf
    // orders on it and "−3 pts" is a rank, not an absence.
    lift = figure != null && figure > 0 ? figure : null;
    synergyFigure = figure;
```

`synergyFigure: number | null` joins `DeckSuggestion`, defaulting to `null` on the role branch.

**1b. The synergy shelf.** Add `"synergy"` to `ShelfKey` (`consider-panel.tsx:30`) and one shelf to `buildShelves` (`:39`), placed **above** the unowned append and **below** the coverage shelves — the same `-Infinity` gap trick the `other` shelf uses will not separate them, so append it explicitly between the sorted coverage shelves and the unowned append, exactly as `unowned` is appended today.

It sorts on `synergyFigure ?? -Infinity` descending, which is where the new field earns itself. Note that `ShelfSection` re-sorts a shelf's contents through `sortWithin` under the `cheapest` and `edhrec` orderings; only the default `gaps` ordering preserves what `buildShelves` produced. That is correct and needs no change — the player asked for a different ordering — but it means the synergy ordering is the shelf's *resting* order, not an invariant.

`SHELF_CAP` 12 applies. Heading `synergyCopy.shelf.label(commander)`, meta `synergyCopy.shelf.meta(n)`. `ShelfSection` is otherwise unmodified. `rolesWithShelves` is untouched.

**2. The lift line ungated, and its absent case drawn.** Three changes in `suggestion-tile.tsx`, not one:

- `{lift != null && suggestion.owned && (` at `:120` becomes `{lift != null && (`. This closes design table §8-6. On a shelf whose entire ordering *is* synergy, hiding the figure on an unowned tile means the second tile in a row cannot show why it is second — and §0 answers the open question, because all 879,329 support rows carry both figures regardless of ownership.
- `Evidence` early-returns at `inclusionPct == null` (`:78-85`), so on a card with a synergy figure and no inclusion the lift line is unreachable. Restructure: keep the no-inclusion sentence, but render it in place of the bar row rather than instead of the whole component, so the lift line below it survives.
- On the synergy shelf specifically, a tile with no figure at all draws `synergyCopy.shelf.noSynergy` ("no synergy figure") in the same slot. The property table requires that string as the absent content and no task rendered it. It is scoped by a `showNoSynergy` prop that `ShelfSection` sets only for the synergy shelf — elsewhere an absent lift stays silent, which is what ships today.

**3. The celebration ruling.** README gap 1 records this collision as "**Needs a ruling, not a redraw**." What follows is the ruling this plan proposes, offered for ratification rather than presented as already settled: **a two-click fill does not earn the reveal.** If Design or Hugh disagrees, the change to make is deleting the flag, not reshaping the band.

`shouldCelebrate` gains one flag beside `arrivedFromImport`, for the same reason and in the same shape:

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

Extend the file's existing doc comment with the reason, in the voice of the `arrivedFromImport` paragraph above it: the reveal is a receipt for a deck the player built, and a two-click fill has not earned it — the fill's own receipt is its counts plus the provenance line.

**Where the flag is held, and why not in component state.** `revealDue` is computed from the **server** counts (`builder-shell.tsx:117-127`, deliberately — the optimistic list would fire the band before the write landed). The fill's own `revalidatePath` is what makes the server list change *and* what makes `serverStatus` become `"Complete"`. So a flag held in `useState` "until the server list next changes" clears on the very render that would fire the reveal: the suppression would race the thing it exists to suppress and lose.

Persist it instead, beside the celebration key, with the same `useLocalFlag` hook `useCelebrated` is built on:

```ts
// celebration.ts — beside celebrationKey
export const fillCompletedKey = (deckId: string) => `the99:filled-by-fill:${deckId}`;
```

```tsx
// builder-shell.tsx
const [completedByFill, markCompletedByFill] = useLocalFlag(fillCompletedKey(deck.id));
const revealDue = shouldCelebrate({
  status: serverStatus, alreadyCelebrated: celebrated, arrivedFromImport, completedByFill,
});
```

`markCompletedByFill()` is called from the strip's settle handler when a fill returns `total === 99`. Read the hook's first return value (`isSet`), **not** its third (`setHere`) — and do not reuse `markCelebrated()` for this, because `celebratedHere` would open the reveal band rather than suppress it (`builder-shell.tsx:451`).

One consequence, stated because it is a real tradeoff rather than an oversight: the flag is write-once per deck, so a player who fills to 99, sweeps the deck back down, then rebuilds it to 99 by hand does not get the reveal either. Reveals are already once-per-deck (`alreadyCelebrated`), so this costs a celebration that in practice would rarely have fired, and the alternative — clearing on some later mutation — is the race described above.

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

```ts
// suggest.test.ts — the new field beside the locked `lift` assertions
it("carries a negative synergy figure that lift refuses", () => {
  const [s] = buildSuggestions([edhrecCandidate("Ponder")], {}, { ponder: -0.03 });
  expect(s.lift).toBeNull();
  expect(s.synergyFigure).toBeCloseTo(-0.03);
});

it("leaves synergyFigure null on a role suggestion", () => {
  const [s] = buildSuggestions([roleCandidate("Llanowar Elves", "ramp")], {}, {});
  expect(s.synergyFigure).toBeNull();
});
```

```tsx
// consider-panel.test.tsx
it("puts the synergy shelf above the unowned append and below the role shelves", () => {
  render(<ConsiderPanel {...base} suggestions={[
    ownedSuggestion("Rampant Growth", { role: "ramp" }),
    ownedSuggestion("Beast Within", { synergyFigure: 0.4 }),
    unownedSuggestion("Mana Crypt"),
  ]} />);
  const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
  expect(headings.indexOf(synergyCopy.shelf.label("Atraxa")))
    .toBeGreaterThan(headings.findIndex((h) => h?.startsWith("Ramp")));
  expect(headings.indexOf(synergyCopy.shelf.label("Atraxa")))
    .toBeLessThan(headings.findIndex((h) => h?.includes("don't own")));
});

it("rests the synergy shelf in synergy order, negatives included", () => {
  render(<ConsiderPanel {...base} suggestions={[
    ownedSuggestion("Low", { synergyFigure: -0.1 }),
    ownedSuggestion("High", { synergyFigure: 0.9 }),
    ownedSuggestion("Mid", { synergyFigure: 0.2 }),
  ]} />);
  const shelf = screen.getByRole("region", { name: synergyCopy.shelf.label("Atraxa") });
  expect(within(shelf).getAllByRole("listitem").map((li) => within(li).getByRole("heading").textContent))
    .toEqual(["High", "Mid", "Low"]);
});

// suggestion-tile.test.tsx
it("prints the lift line on an unowned tile", () => {
  render(<SuggestionTile {...base} suggestion={suggestion({ owned: false, inclusionPct: 40, lift: 0.12 })} />);
  expect(screen.getByText(addPanelCopy.tile.lift("12"))).toBeInTheDocument();
});

it("prints the lift line on a card with no inclusion figure", () => {
  render(<SuggestionTile {...base} suggestion={suggestion({ inclusionPct: null, lift: 0.12 })} />);
  expect(screen.getByText(addPanelCopy.tile.noInclusion)).toBeInTheDocument();
  expect(screen.getByText(addPanelCopy.tile.lift("12"))).toBeInTheDocument();
});

it("says so on the synergy shelf when there is no figure at all", () => {
  render(<SuggestionTile {...base} showNoSynergy suggestion={suggestion({ inclusionPct: 40, lift: null })} />);
  expect(screen.getByText(synergyCopy.shelf.noSynergy)).toBeInTheDocument();
});

it("stays silent about an absent figure everywhere else", () => {
  render(<SuggestionTile {...base} suggestion={suggestion({ inclusionPct: 40, lift: null })} />);
  expect(screen.queryByText(synergyCopy.shelf.noSynergy)).not.toBeInTheDocument();
});
```

```tsx
// builder-shell.test.tsx — the suppression, at the level where the race lives
it("does not reveal a deck that a fill completed", async () => {
  window.localStorage.setItem(fillCompletedKey("deck-1"), "1");
  render(<BuilderShell {...completeDeckProps} />);
  expect(screen.queryByText(recommendationsCopy.reveal.heading)).not.toBeInTheDocument();
});

it("still reveals a deck completed by hand", () => {
  render(<BuilderShell {...completeDeckProps} />);
  expect(screen.getByText(recommendationsCopy.reveal.heading)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `pnpm test src/lib/decks/celebration.test.ts src/lib/decks/suggest.test.ts src/components/decks/consider-panel.test.tsx src/components/decks/suggestion-tile.test.tsx src/components/decks/builder-shell.test.tsx`
Expected: FAIL — one failure per edit above.

- [ ] **Step 3: Make the edits**

`consider-panel.test.tsx:351` already asserts the shelf order as it ships; extend that assertion to include the new shelf rather than adding a second, competing one. Every existing `shouldCelebrate` call site — in `builder-shell.tsx` and in `celebration.test.ts` — gains `completedByFill`, since the argument object is not optional-by-field.

- [ ] **Step 4: Run the full gate**

Run: `pnpm test && pnpm typecheck && pnpm lint && DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`
Expected: PASS, 0 lint problems, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/lib/decks/suggest.ts src/lib/decks/suggest.test.ts src/components/decks/consider-panel.tsx src/components/decks/suggestion-tile.tsx src/lib/decks/celebration.ts src/lib/decks/celebration.test.ts src/components/decks/builder-shell.tsx src/components/decks/builder-shell.test.tsx src/components/decks/consider-panel.test.tsx src/components/decks/suggestion-tile.test.tsx
git commit -m "feat(decks): a synergy shelf, an ungated lift line, and no reveal for a filled 99"
```

---

## Before the PR

1. Run the design-review skill's **Agent 2 (verify)** against `docs/superpowers/design-tables/synergy-discovery.md` and every file this plan created or modified. Both passes: visual properties, and state reachability across the twelve-state matrix.
2. Fix every gap, re-run the quality gate, then run **Agent 3 (confirm)** on the gap list only.
3. Write the gap report to `docs/superpowers/gap-report-synergy-discovery.md` and commit it.
4. Only then `gh pr create`. Mobile and desktop parity ships in this one PR.
