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
import { type Theme } from "../recs/themes";
import { hasLabelledJob, labelledKeys, matchLabels, type JobRef } from "../labels/match";
import type { Job as LabelJob, Method } from "../labels/types";
import { honestJobs, type DeckLens, type SwapRole } from "./honest";
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
  /** The roles it shares with the original, ramp read as its kind (`honestJobs`, E1). */
  shared: SwapRole[];
  /** The themes it shares with the original (`honestJobs`): a spell's second match, beside its roles (Q6). */
  sharedThemes: Theme[];
  /** A spell's jobs beyond the original's, roles then themes: the row's `also …` (addendum R1). */
  extra: (SwapRole | Theme)[];
  /** The original's jobs this spell does not do, roles then themes: the row's `gives up …` (R1). */
  missing: (SwapRole | Theme)[];
  /**
   * What the shared jobs are worth in the sort: their count, except that two kept only through a labelled
   * stand-in's modal alternatives count once (the run plan's Task 5, rule 7).
   */
  credit: number;
  /** Advisory mismatches among the kept jobs, labelled pairs only (rules 5 and 6): ranks lower, never drops. */
  advisory: number;
  /** The permanent answers the original removes by that this stand-in does not (Q3): drawn among `loses`. */
  lostMethods: Method[];
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
  /** The original's jobs as a stand-in must keep them (`honestJobs`, ramp by kind); empty for a land. */
  jobRoles: SwapRole[];
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
/** A staple's figure describes every commander, so it has no synergy here to rank on: it goes last. */
const staplesLast = (a: StandIn, b: StandIn) => Number(a.isUniversal) - Number(b.isUniversal);
/**
 * Spells (d9's D1 ruling): how much of the original's work they share, its roles and its themes together
 * (Q6), so a creature that ramps and grows counters outranks a sorcery that only ramps; then synergy;
 * then price.
 */
const bySharing = (a: StandIn, b: StandIn) =>
  staplesLast(a, b) || b.credit - a.credit || a.advisory - b.advisory || bySynergy(a, b);
/** Lands on the ladder (item 2): the rung first, then synergy, then price, never the alphabet. */
const byLadder = (a: StandIn, b: StandIn) => staplesLast(a, b) || (a.rung ?? 1) - (b.rung ?? 1) || bySynergy(a, b);

const NO_LABELS: ReadonlyMap<string, readonly LabelJob[]> = new Map();

const asRolesThenThemes = (keys: readonly JobRef[]) =>
  [...keys.filter((k) => k.space === "role"), ...keys.filter((k) => k.space === "theme")].map((k) => k.key) as (SwapRole | Theme)[];

/** The text comparison's half of a row: what `honestJobs` says both cards do for this deck. */
function textSharing(
  shared: SwapRole[], roles: SwapRole[], themes: Theme[], originalRoles: SwapRole[], originalThemes: Theme[], isLand: boolean,
): Pick<StandIn, "sharedThemes" | "extra" | "missing" | "credit" | "advisory" | "lostMethods"> {
  const sharedThemes = themes.filter((t) => originalThemes.includes(t));
  return {
    sharedThemes,
    extra: [...roles.filter((r) => !originalRoles.includes(r)), ...themes.filter((t) => !originalThemes.includes(t))],
    missing: isLand ? [] : [...originalRoles.filter((r) => !roles.includes(r)), ...originalThemes.filter((t) => !themes.includes(t))],
    credit: shared.length + sharedThemes.length,
    advisory: 0,
    lostMethods: [],
  };
}

/**
 * The labelled comparison's half of a row (the run plan's Task 5), or null when the stand-in keeps none of
 * the original's jobs for this deck, or costs more than it.
 */
function labelRow(
  original: readonly LabelJob[], candidate: readonly LabelJob[], card: CardRow, job: Job, deck: DeckLens | null,
  isCreatureType: (w: string) => boolean,
): (Pick<StandIn, "shared" | "sharedThemes" | "extra" | "missing" | "credit" | "advisory" | "lostMethods">) | null {
  if (job.kind !== "spell" || isLandFace(card.typeLine) || card.cmc > job.mv) return null;
  const m = matchLabels(original, candidate, deck, isCreatureType);
  if (m.shared.length === 0) return null;
  return {
    shared: m.shared.filter((k) => k.space === "role").map((k) => k.key) as SwapRole[],
    sharedThemes: m.shared.filter((k) => k.space === "theme").map((k) => k.key) as Theme[],
    extra: asRolesThenThemes(m.extra),
    missing: asRolesThenThemes(m.missing),
    credit: m.credit,
    advisory: m.advisory,
    lostMethods: m.lostMethods,
  };
}

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
  /**
   * What the deck plays (`DeckLens`), or null for no deck. A spell's ability limited to a creature type or
   * subtype the deck does not play does no job for it (E1), so it neither matches nor counts as kept,
   * gained or given up.
   */
  deck: DeckLens | null,
  /**
   * Fresh card labels by oracle id (`readLabels`); empty while `STAND_IN_LABELS_ENABLED` is off, which leaves
   * every row exactly as the text comparison draws it. A pair is compared by its labels only when BOTH cards
   * carry one (Q1); every other pair by text.
   */
  labels: ReadonlyMap<string, readonly LabelJob[]> = NO_LABELS,
): StandInGroups {
  const originalLabels = labels.get(original.oracleId);
  const textJob = jobOf(original);
  // A labelled spell whose text names no job is a spell job from its label: only a labelled stand-in can match it.
  const job: Job = textJob.kind === "none" && originalLabels && !isLandFace(original.typeLine)
    && hasLabelledJob(originalLabels, deck, isCreatureType)
    ? { kind: "spell", roles: [], mv: original.cmc }
    : textJob;
  // E1: a spell is matched on what it does for THIS deck, ramp read as its kind (`honestJobs`).
  const originalJobs = job.kind === "spell" ? honestJobs(original, isCreatureType, deck) : { roles: [], themes: [] };
  const originalThemes = originalJobs.themes;
  const originalRoles = originalJobs.roles;
  const originalPrice = stocked(original.oracleId, priced);
  // A labelled original's header names what its label says it does here (roles, ramp by its kind).
  const jobRoles = originalLabels && job.kind === "spell"
    ? labelledKeys(originalLabels, deck, isCreatureType).filter((k) => k.space === "role").map((k) => k.key) as SwapRole[]
    : originalRoles;
  const read: StandInGroups = { job, originalCents: originalPrice?.cents ?? null, groups: [], jobRoles };
  if (job.kind === "none") return read;

  const isLand = job.kind !== "spell";
  const ownType = isLand ? "land" : mainType(original.typeLine);
  const same: StandIn[] = [];
  const other: StandIn[] = [];
  for (const c of candidates) {
    if (c.oracleId === original.oracleId) continue;
    const candLabels = isLand ? undefined : labels.get(c.oracleId);
    const labelled = originalLabels && candLabels
      ? labelRow(originalLabels, candLabels, c, job, deck, isCreatureType)
      : null;
    if (originalLabels && candLabels && !labelled) continue;
    if (!labelled && !sameJob(job, c)) continue;
    const jobs = isLand ? { roles: [], themes: [] } : honestJobs(c, isCreatureType, deck);
    // Sharing a coarse role is not enough: a stand-in keeps a job only when it does it for this deck,
    // and a ramp only in the same kind. One that keeps no role is not offered (E1 ruling d: Warg).
    const shared: SwapRole[] = labelled ? labelled.shared : isLand ? [] : jobs.roles.filter((r) => originalRoles.includes(r));
    if (!isLand && !labelled && shared.length === 0) continue;
    const price = stocked(c.oracleId, priced);
    const free = freeAfterTake(c, c.owned, c.free);
    if (!free && !(price && originalPrice && price.cents < originalPrice.cents)) continue;
    const roles = jobs.roles;
    const themes = jobs.themes;
    const row: StandIn = {
      card: c,
      free,
      soft: c.soft,
      cents: price?.cents ?? null,
      foilOnly: price?.foilOnly ?? false,
      inclusion: c.inclusion,
      synergy: c.synergy,
      isUniversal: c.isUniversal,
      shared,
      ...(labelled ?? textSharing(shared, roles, themes, originalRoles, originalThemes, isLand)),
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
