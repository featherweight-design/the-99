/**
 * Which cards can stand in for an expensive one, and in what order (swap tools, sub-project 4).
 * Pure: the gather in `gather.ts` hands it rows it has already read, so every rule here is
 * unit-tested without a database.
 *
 * Every figure is a fact and none is a score (brief §5): a stand-in shows its price, its mana
 * value, its commander figure and what it gives up, and nothing combines them.
 */
import { isLandFace } from "../cards/facet";
import { priceOf, priceState, type PriceFact } from "../decks/price";
import { frontFaceOracle } from "../recs/faces";
import { classifyRoles, type Role } from "../recs/roles";
import {
  drawbacks, fetchFinds, givesUp, landColors, type BasicType, type Color, type Drawback, type Finds, type GivenUp,
} from "./land";

/** How many stand-ins a group shows. A presentation cap, stated once: the design draws no count. */
export const STAND_IN_GROUP_CAP = 12;

export type SpellRole = Exclude<Role, "land">;

export type CardRow = {
  oracleId: string;
  name: string;
  typeLine: string;
  oracleText: string | null;
  keywords: string[];
  cmc: number;
  imageUri: string | null;
};

/** What the original's job is, which decides who can stand in for it (rulings 5, 5a, 6). */
export type Job =
  | { kind: "land"; colors: Color[] }
  | { kind: "fetch"; types: BasicType[]; basicOnly: boolean }
  | { kind: "spell"; roles: SpellRole[]; mv: number }
  /** No role we can name, or a land that neither makes a color nor fetches: no stand-in, no guess. */
  | { kind: "none" };

const ORDER: readonly Color[] = ["W", "U", "B", "R", "G"];

/** The front face's roles only: a spell whose back face is a land (Agadeem's Awakening) is not ramp. */
function spellRoles(card: CardRow): SpellRole[] {
  return classifyRoles({ ...card, oracleText: frontFaceOracle(card.oracleText) })
    .filter((r): r is SpellRole => r !== "land");
}

export function jobOf(card: CardRow): Job {
  if (isLandFace(card.typeLine)) {
    const finds = fetchFinds(card);
    if (finds) return { kind: "fetch", types: [...finds.types], basicOnly: finds.basicOnly };
    const colors = landColors(card);
    if (colors.size > 0) return { kind: "land", colors: ORDER.filter((c) => colors.has(c)) };
    return { kind: "none" };
  }
  const roles = spellRoles(card);
  return roles.length > 0 ? { kind: "spell", roles, mv: card.cmc } : { kind: "none" };
}

/**
 * Does this card do the original's job? A land makes every color the original makes; a fetch finds
 * every type it finds; a spell shares at least one role at the same mana value or less (brief §3.0).
 * Returns the roles shared, for a spell's facts line, or null when it does not.
 */
export function sameJob(job: Job, card: CardRow): { shared: SpellRole[] } | null {
  switch (job.kind) {
    case "none":
      return null;
    case "land": {
      if (!isLandFace(card.typeLine)) return null;
      const colors = landColors(card);
      return job.colors.every((c) => colors.has(c)) ? { shared: [] } : null;
    }
    case "fetch": {
      if (!isLandFace(card.typeLine)) return null;
      const finds: Finds | null = fetchFinds(card);
      return finds && job.types.every((t) => finds.types.has(t)) ? { shared: [] } : null;
    }
    case "spell": {
      if (isLandFace(card.typeLine) || card.cmc > job.mv) return null;
      const shared = spellRoles(card).filter((r) => job.roles.includes(r));
      return shared.length > 0 ? { shared } : null;
    }
  }
}

/**
 * Taking a stand-in adds one copy to the deck's ask. From the deck's own vantage (`loadAvailability`
 * with this deck excluded), a card it does not hold has `free` copies spoken for by no one senior,
 * so after the take it is off Shopping exactly when at least one is free (brief §3.0: free means
 * taking it would not put it on Shopping). A basic is never on Shopping, so it is always free.
 */
export function freeAfterTake(card: { typeLine: string }, owned: number, free: number | null): boolean {
  if (/\bBasic\b/.test(card.typeLine)) return true;
  return owned > 0 && (free ?? owned) >= 1;
}

export type Candidate = CardRow & {
  /** This commander's inclusion figure, or the pair's. Null when the index does not list it. */
  inclusion: number | null;
  /**
   * EDHREC's synergy for this card under this commander (or pair): how much MORE its decks run it than
   * decks of its colors do, -1..1. Null when the index does not list it. Orders, never drawn (Q2).
   */
  synergy: number | null;
  isUniversal: boolean;
  owned: number;
  /** Copies free from this deck's vantage, from `loadAvailability`. Null when it owns none. */
  free: number | null;
  /** Copies a brew holds softly: the availability marker on a free row. */
  soft: number;
};

export type StandIn = {
  card: CardRow;
  free: boolean;
  soft: number;
  /** The price the row draws: a stocked figure, or null for a free copy of a card never stocked. */
  cents: number | null;
  foilOnly: boolean;
  inclusion: number | null;
  synergy: number | null;
  isUniversal: boolean;
  shared: SpellRole[];
  drawbacks: Drawback[];
  givesUp: GivenUp[];
};

export type StandInGroups = {
  job: Job;
  /** The original's own price, when it is stocked now. Null means every group but `free` is empty (F5). */
  originalCents: number | null;
  free: StandIn[];
  /** Lands and fetches: every buyable stand-in, cheapest first. */
  cheapest: StandIn[];
  /**
   * H4: universal staples to buy, cheapest first, in their own group between free and the
   * commander's ranking (addendum §1). A staple's inclusion figure describes every commander, so
   * the paid ranking leaves it out. A FREE staple stays in `free`, by the same figure as every free
   * row: the addendum moves only the one to buy.
   */
  staples: StandIn[];
  /** Spells the commander's index lists, by its inclusion figure. */
  byCommander: StandIn[];
  /** Spells it does not list, cheapest first. */
  unlisted: StandIn[];
};

type Priced = { prices: Map<string, PriceFact>; newestAsOf: Date | null };

function stocked(id: string, priced: Priced): { cents: number; foilOnly: boolean } | null {
  const fact = priced.prices.get(id);
  const state = priceState(fact, priced.newestAsOf);
  if (!fact || (state !== "priced" && state !== "foilOnly")) return null;
  const cents = priceOf(fact, state);
  return cents === null ? null : { cents, foilOnly: state === "foilOnly" };
}

/**
 * Where a land sits on the quality ladder (v2 item 2, Hugh's Q1), read from the drawbacks the row
 * already parses and never from a name list: 1 untapped with no cost; 2 untapped with a condition or a
 * price in life (check, fast, slow, shock, pain, pay life); 3 enters tapped. A one-shot never reaches
 * here, since `landColors` gives it no color to match (Q9). `basicOnly` is a limit on what a fetch
 * finds rather than a cost of playing it, so it moves nothing.
 */
export function landRung(list: readonly Drawback[]): 1 | 2 | 3 {
  if (list.some((d) => d.kind === "entersTapped")) return 3;
  if (list.some((d) => d.kind !== "basicOnly")) return 2;
  return 1;
}

const MAIN_TYPES = ["creature", "planeswalker", "battle", "instant", "sorcery", "artifact", "enchantment", "land"] as const;
export type MainType = (typeof MAIN_TYPES)[number] | "other";

/**
 * A card's main type, off the front face (Q4): the first of MAIN_TYPES its type line carries, so an
 * artifact creature is a creature, which is what a deck counting its creatures counts.
 */
export function mainType(typeLine: string): MainType {
  const front = typeLine.split(" // ")[0].toLowerCase();
  return MAIN_TYPES.find((t) => new RegExp(`\\b${t}\\b`).test(front)) ?? "other";
}

const byName = (a: StandIn, b: StandIn) => a.card.name.localeCompare(b.card.name);
const byPrice = (a: StandIn, b: StandIn) => (a.cents ?? Infinity) - (b.cents ?? Infinity) || byName(a, b);
/**
 * By the commander's synergy (v2 items 8 and 9): how much MORE its decks run a card than decks of its
 * colors do, rather than raw inclusion, which ranks every commander's staples first. Never drawn (Q2).
 */
const bySynergy = (a: StandIn, b: StandIn) =>
  (b.synergy ?? -Infinity) - (a.synergy ?? -Infinity) || byPrice(a, b);
/** Lands on the ladder (item 2): the rung first, then synergy, then price, never the alphabet. */
const byLadder = (a: StandIn, b: StandIn) => landRung(a.drawbacks) - landRung(b.drawbacks) || bySynergy(a, b);

/**
 * The stand-ins for one original, grouped and ordered as the sheet draws them.
 *
 * - A free copy leads, whatever it costs, and never needs to be cheaper (brief §5).
 * - A buy must be STOCKED NOW and cost less than the original (F6). A price that is absent is never
 *   free, and a sold-out original has no price to beat, so it gets free copies only (F5).
 * - Lands and fetches order by the ladder (`landRung`), then the commander's synergy, then price (v2
 *   item 2); spells by the commander's synergy, with the cards its index does not list after them, by
 *   price (ruling 6, F14; v2 item 8). A universal staple to buy is neither: it
 *   takes its own group, by price, ahead of the commander's ranking (H4).
 */
export function rankStandIns(original: CardRow, candidates: readonly Candidate[], priced: Priced): StandInGroups {
  const job = jobOf(original);
  const originalPrice = stocked(original.oracleId, priced);
  const groups: StandInGroups = {
    job, originalCents: originalPrice?.cents ?? null, free: [], cheapest: [], staples: [], byCommander: [], unlisted: [],
  };
  if (job.kind === "none") return groups;

  for (const c of candidates) {
    if (c.oracleId === original.oracleId) continue;
    const match = sameJob(job, c);
    if (!match) continue;
    const price = stocked(c.oracleId, priced);
    const isLand = job.kind !== "spell";
    const row: StandIn = {
      card: c,
      free: freeAfterTake(c, c.owned, c.free),
      soft: c.soft,
      cents: price?.cents ?? null,
      foilOnly: price?.foilOnly ?? false,
      inclusion: c.inclusion,
      synergy: c.synergy,
      isUniversal: c.isUniversal,
      shared: match.shared,
      drawbacks: isLand ? drawbacks(c) : [],
      givesUp: isLand ? givesUp(original, c) : [],
    };
    if (row.free) groups.free.push(row);
    else if (price && originalPrice && price.cents < originalPrice.cents) {
      if (isLand) groups.cheapest.push(row);
      else if (c.isUniversal) groups.staples.push(row);
      else if (c.inclusion !== null) groups.byCommander.push(row);
      else groups.unlisted.push(row);
    }
  }

  groups.free.sort(job.kind === "spell" ? bySynergy : byLadder);
  groups.cheapest.sort(byLadder);
  groups.staples.sort(byPrice);
  groups.byCommander.sort(bySynergy);
  groups.unlisted.sort(byPrice);
  for (const k of ["free", "cheapest", "staples", "byCommander", "unlisted"] as const) {
    groups[k] = groups[k].slice(0, STAND_IN_GROUP_CAP);
  }
  return groups;
}
