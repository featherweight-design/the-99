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
import { cardThemes, type Theme } from "../recs/themes";
import {
  colorSource, drawbacks, fetchFinds, givesUp, landCatch, landColors, landColorsOnce, type BasicType, type Color, type Drawback, type Finds, type GivenUp,
} from "./land";

/** How many stand-ins a group shows before `Show all` (Hugh's Q3). */
export const STAND_IN_GROUP_SHOWN = 5;
/**
 * How many ranked cards a group carries on the sheet's first read, staples aside. A payload cap and never
 * a limit on what the reader can see: each group says its true `total`, and `Show all` fetches the whole
 * group when this read was capped. Measured on Hugh's HD - Gishath: Plateau has 132 land stand-ins (93KB,
 * the 78 on rung 4 and the 5 one-shot lands all past row 30); Runadi's two groups are 260 rows each (390KB).
 */
export const STAND_IN_GROUP_CAP = 30;

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
      // A color the land makes only by sacrificing itself still answers the job, once: the addendum shows
      // those lands on the ladder's last rung (`colorSource` reads that color as utility), named on the row.
      const colors = new Set([...landColors(card), ...landColorsOnce(card)]);
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
  /** The themes it shares with the original (`cardThemes`): a spell's second match, beside its roles (Q6). */
  sharedThemes: Theme[];
  /** A spell's jobs beyond the original's, roles then themes: the row's `also …` (addendum R1). */
  extra: (SpellRole | Theme)[];
  /** The original's jobs this spell does not do, roles then themes: the row's `gives up …` (R1). */
  missing: (SpellRole | Theme)[];
  /** The job's colors this land makes only once, by sacrificing itself; its row names them. */
  once: Color[];
  /** A land's rung on the ladder (`landRung`); null for a spell. Orders the sheet, never drawn in B. */
  rung: 1 | 2 | 3 | 4 | null;
  drawbacks: Drawback[];
  givesUp: GivenUp[];
};

/**
 * One of the sheet's type groups (ranking-rebuild addendum §1b). A land is offered only lands, so a land
 * or fetch has the one `same` group; a spell has its own main type (Q4), then every other type.
 */
export type StandInGroup = {
  same: boolean;
  type: MainType;
  rows: StandIn[];
  /** Every stand-in in the group, however many `rows` carries: what `Show all {n}` counts. */
  total: number;
};

export type StandInGroups = {
  job: Job;
  /** The original's own price, when it is stocked now. Null means only free copies are offered (F5). */
  originalCents: number | null;
  /** `same` first, then `other`; a group with no rows is left out. */
  groups: StandInGroup[];
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
 * price in life (check, fast, slow, shock, pain, pay life); 3 enters tapped; 4 utility, a land that
 * makes the colors only by paying for them, only for a narrow use, or only once (`makesFreely`).
 * `basicOnly` is a limit on what a fetch finds rather than a cost of playing it, so it moves nothing.
 */
export function landRung(
  list: readonly Drawback[],
  source: "free" | "conditional" | "utility" = "free",
  catchOf: "condition" | "utility" | null = null,
): 1 | 2 | 3 | 4 {
  if (source === "utility" || catchOf === "utility") return 4;
  if (list.some((d) => d.kind === "entersTapped")) return 3;
  if (source === "conditional" || catchOf === "condition" || list.some((d) => d.kind !== "basicOnly")) return 2;
  return 1;
}

/** The worst of the colors a land is asked for: one utility color makes the land utility for this job. */
function sourceFor(card: CardRow, job: Job): "free" | "conditional" | "utility" {
  if (job.kind !== "land") return "free";
  const each = job.colors.map((color) => colorSource(card, color));
  return each.includes("utility") ? "utility" : each.includes("conditional") ? "conditional" : "free";
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
/** Price with a free copy counted as 0 (the addendum's ruling 2): free wins a tie, and only a tie. */
const byPrice = (a: StandIn, b: StandIn) =>
  (a.free ? 0 : a.cents ?? Infinity) - (b.free ? 0 : b.cents ?? Infinity) || byName(a, b);
/**
 * By the commander's synergy (v2 items 8 and 9): how much MORE its decks run a card than decks of its
 * colors do, rather than raw inclusion, which ranks every commander's staples first. A card the index
 * does not list has none, so it follows every listed card. Never drawn (Q2).
 */
const bySynergy = (a: StandIn, b: StandIn) =>
  (b.synergy ?? -Infinity) - (a.synergy ?? -Infinity) || byPrice(a, b);
const sharing = (s: StandIn) => s.shared.length + s.sharedThemes.length;
/** A staple's figure describes every commander, so it has no synergy here to rank on: it goes last. */
const staplesLast = (a: StandIn, b: StandIn) => Number(a.isUniversal) - Number(b.isUniversal);
/**
 * Spells (d9's D1 ruling): how much of the original's work they share, its roles and its themes together
 * (Q6), so a creature that ramps and grows counters outranks a sorcery that only ramps; then synergy;
 * then price.
 */
const bySharing = (a: StandIn, b: StandIn) => staplesLast(a, b) || sharing(b) - sharing(a) || bySynergy(a, b);
/** Lands on the ladder (item 2): the rung first, then synergy, then price, never the alphabet. */
const byLadder = (a: StandIn, b: StandIn) => staplesLast(a, b) || (a.rung ?? 1) - (b.rung ?? 1) || bySynergy(a, b);

/**
 * The stand-ins for one original, in the type groups the sheet draws (ranking-rebuild addendum §1b).
 *
 * - A free copy is offered whatever it costs (brief §5); ownership is drawn on the row, not as a group.
 * - A buy must be STOCKED NOW and cost less than the original (F6). A price that is absent is never
 *   free, and a sold-out original has no price to beat, so it gets free copies only (F5).
 * - A land or fetch is offered lands, on the ladder (`landRung`), then synergy, then price. A spell is
 *   offered its own main type first, then every other type, each by sharing, then synergy, then price.
 *   A universal staple goes last in its group (addendum §1b, retiring the staples group of #997).
 */
export function rankStandIns(
  original: CardRow,
  candidates: readonly Candidate[],
  priced: Priced,
  /** The catalog's creature subtypes, for the tribal theme (`cardThemes`). */
  isCreatureType: (word: string) => boolean,
  /** `STAND_IN_GROUP_CAP` for the sheet's first read; null for the whole group, which `Show all` asks for. */
  cap: number | null,
): StandInGroups {
  const job = jobOf(original);
  const originalThemes = job.kind === "spell" ? cardThemes(original, isCreatureType) : [];
  const originalRoles = job.kind === "spell" ? spellRoles(original) : [];
  const originalPrice = stocked(original.oracleId, priced);
  const read: StandInGroups = { job, originalCents: originalPrice?.cents ?? null, groups: [] };
  if (job.kind === "none") return read;

  const isLand = job.kind !== "spell";
  const ownType = isLand ? "land" : mainType(original.typeLine);
  const same: StandIn[] = [];
  const other: StandIn[] = [];
  for (const c of candidates) {
    if (c.oracleId === original.oracleId) continue;
    const match = sameJob(job, c);
    if (!match) continue;
    const price = stocked(c.oracleId, priced);
    const free = freeAfterTake(c, c.owned, c.free);
    if (!free && !(price && originalPrice && price.cents < originalPrice.cents)) continue;
    const roles = isLand ? [] : spellRoles(c);
    const themes = originalThemes.length > 0 || !isLand ? cardThemes(c, isCreatureType) : [];
    const row: StandIn = {
      card: c,
      free,
      soft: c.soft,
      cents: price?.cents ?? null,
      foilOnly: price?.foilOnly ?? false,
      inclusion: c.inclusion,
      synergy: c.synergy,
      isUniversal: c.isUniversal,
      shared: match.shared,
      sharedThemes: themes.filter((t) => originalThemes.includes(t)),
      extra: [...roles.filter((r) => !originalRoles.includes(r)), ...themes.filter((t) => !originalThemes.includes(t))],
      missing: isLand ? [] : [
        ...originalRoles.filter((r) => !roles.includes(r)),
        ...originalThemes.filter((t) => !themes.includes(t)),
      ],
      drawbacks: isLand ? drawbacks(c) : [],
      once: job.kind === "land" ? job.colors.filter((color) => landColorsOnce(c).has(color)) : [],
      // A fetch finds its types rather than making colors, so only a land's colors are read for freeness.
      rung: isLand ? landRung(drawbacks(c), sourceFor(c, job), landCatch(c)) : null,
      givesUp: isLand ? givesUp(original, c) : [],
    };
    (isLand || mainType(c.typeLine) === ownType ? same : other).push(row);
  }

  const order = isLand ? byLadder : bySharing;
  // The cap trims the ranked cards, never a staple: a staple sorts last, so capping after the sort would cut
  // every one from a long group (Sol Ring from Mana Vault's, measured). The staples a job admits are few.
  const capped = (list: StandIn[]) => {
    const sorted = list.sort(order);
    return cap === null ? sorted : [...sorted.filter((s) => !s.isUniversal).slice(0, cap), ...sorted.filter((s) => s.isUniversal)];
  };
  if (same.length) read.groups.push({ same: true, type: ownType, total: same.length, rows: capped(same) });
  if (other.length) read.groups.push({ same: false, type: "other", total: other.length, rows: capped(other) });
  return read;
}
