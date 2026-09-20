import { isLandFace } from "../cards/facet";
import { manaCurve, type CurveCard } from "../decks/stats";
import { classifyRoles, type Role } from "../recs/roles";
import type {
  Bracket,
  BracketPopulation,
  CardRef,
  ComboRef,
  CompositionTargets,
  DeckProfile,
  DetectionCoverage,
  FlagSource,
  ProfileColours,
  ProfileCounts,
  ProfileRoles,
  ProfileSkeleton,
  StapleRef,
} from "./types";

/**
 * The pure builder. Every input is a plain row the loader gathered; nothing here reads a
 * database, a clock or an environment.
 *
 * ONE GLOBAL RULE runs through all of it: **the commanders are cards.** They are columns on
 * `decks` rather than `deck_cards` rows, which is exactly why every pass in this app that
 * forgot them under-reported — the stats loader folds them in, `probe:stats` pins that, and a
 * Kinnan-led deck whose commander is the Game Changer must not slot as though it held none.
 * The loader appends both commander rows to `cards` BEFORE any classifier or flag pass, so
 * this function never has to remember: it counts what it is given.
 */

export type ProfileCardRow = {
  oracleId: string;
  name: string;
  typeLine: string;
  oracleText: string | null;
  keywords: string[];
  cmc: number;
  colorIdentity: string[];
  manaCost: string | null;
  quantity: number;
  commanderLegal: boolean;
};

/** A composition candidate, already read. The loader supplies the ones it found; the FIRST
 *  present in this order wins, which is the whole basis chain. */
export type CompositionCandidates = {
  pair: { targets: CompositionTargets; averageCurve: Record<string, number> | null } | null;
  commander: { targets: CompositionTargets; averageCurve: Record<string, number> | null } | null;
  identity: { targets: CompositionTargets; averageCurve: Record<string, number> | null } | null;
  count: { targets: CompositionTargets; averageCurve: Record<string, number> | null } | null;
};

export type ProfileInput = {
  deckId: string;
  fingerprint: string;
  /** Deck rows PLUS both commanders, already unioned by the loader. */
  cards: ProfileCardRow[];
  commanderOracleIds: string[];
  /** The commanders' colour identity, as stored. Sorted here. */
  identity: string[];
  declared: Bracket | null;
  condition: string;
  composition: CompositionCandidates;
  staples: StapleRef[];
  commanderDeckCount: number | null;
  population: BracketPopulation | null;
  /** oracleId -> which classifiers claimed it. Absent = not flagged. */
  mldFlags: Map<string, FlagSource[]>;
  extraTurnFlags: Map<string, FlagSource[]>;
  gameChangerIds: Set<string>;
  twoCardCombos: ComboRef[];
  /** Pre-classified by the loader (Task 16's `classifyTutor`), so this stays pure. */
  tutorIds: Set<string>;
  detection: DetectionCoverage;
};

const ref = (c: ProfileCardRow): CardRef => ({ oracleId: c.oracleId, name: c.name });

/** Dedupe by oracle id, preserving first-seen order. A commander appended to the rows can
 *  also be a `deck_cards` row in a malformed import, and a list naming it twice is wrong. */
function uniqueRefs(rows: ProfileCardRow[]): CardRef[] {
  const seen = new Set<string>();
  const out: CardRef[] = [];
  for (const r of rows) {
    if (seen.has(r.oracleId)) continue;
    seen.add(r.oracleId);
    out.push(ref(r));
  }
  return out;
}

function countCards(cards: ProfileCardRow[]): ProfileCounts {
  let total = 0;
  let land = 0;
  let basics = 0;
  for (const c of cards) {
    total += c.quantity;
    if (isLandFace(c.typeLine)) {
      land += c.quantity;
      // By TYPE LINE, never by name: a card is a basic because it says `Basic Land`, and
      // Snow-Covered Swamp and Wastes both do while neither is named for a basic type.
      if (/^basic\b/i.test(c.typeLine.trim())) basics += c.quantity;
    }
  }
  return { total, nonland: total - land, land, basics };
}

const ALL_ROLES: Role[] = ["ramp", "draw", "removal", "wipes", "land"];

function rolesOf(cards: ProfileCardRow[]): ProfileRoles {
  const counts = Object.fromEntries(ALL_ROLES.map((r) => [r, 0])) as Record<Role, number>;
  const refs = Object.fromEntries(ALL_ROLES.map((r) => [r, [] as CardRef[]])) as Record<
    Role,
    CardRef[]
  >;
  for (const c of cards) {
    for (const role of classifyRoles(c)) {
      // The COUNT is copies and the LIST is distinct cards. Three Rampant Growths are three
      // pieces of ramp against a target of ten, and naming the card three times in the
      // receipt would read as three different answers to the same problem.
      counts[role] += c.quantity;
      refs[role].push(ref(c));
    }
  }
  return { counts, cards: refs };
}

const WUBRG = ["W", "U", "B", "R", "G"] as const;

/**
 * Which colours the deck's nonland mana COSTS ask for.
 *
 * Read off the pips, never off colour identity: identity counts activation costs, so a card
 * whose only red is `{R}: …` would report a red the deck never has to produce at cast time.
 *
 * A HYBRID pip is one pip that either half pays, so it is grouped rather than split — the
 * caller reports it unproducible only when NO half is producible. `{2/W}` is the same shape
 * (generic or white), and `{W/P}` (Phyrexian) likewise offers a non-mana way out, so its
 * colour half alone carries the need.
 */
export function manaNeeds(manaCost: string | null): string[][] {
  if (!manaCost) return [];
  const needs: string[][] = [];
  for (const [, body] of manaCost.matchAll(/\{([^}]+)\}/g)) {
    const halves = body
      .toUpperCase()
      .split("/")
      .filter((h): h is (typeof WUBRG)[number] => (WUBRG as readonly string[]).includes(h));
    if (halves.length > 0) needs.push([...new Set(halves)]);
  }
  return needs;
}

function colours(cards: ProfileCardRow[], identity: string[]): ProfileColours {
  const producible = new Set<string>();
  for (const c of cards) {
    if (!isLandFace(c.typeLine)) continue;
    for (const colour of c.colorIdentity) producible.add(colour.toUpperCase());
  }

  const unproducible = new Set<string>();
  for (const c of cards) {
    if (isLandFace(c.typeLine)) continue;
    for (const pip of manaNeeds(c.manaCost)) {
      if (pip.some((half) => producible.has(half))) continue;
      for (const half of pip) unproducible.add(half);
    }
  }

  const order = (s: Set<string> | string[]) =>
    WUBRG.filter((c) => (Array.isArray(s) ? s.includes(c) : s.has(c))) as string[];

  return {
    identity: order(identity.map((c) => c.toUpperCase())),
    producibleColors: order(producible),
    unproducible: order(unproducible),
  };
}

/** The basis chain. First present wins, and the label travels with the data it describes. */
function skeleton(input: ProfileInput): ProfileSkeleton {
  const chain = [
    ["pair", input.composition.pair],
    ["commander", input.composition.commander],
    ["identity", input.composition.identity],
    ["count", input.composition.count],
  ] as const;
  const hit = chain.find(([, value]) => value != null);
  return {
    composition: hit ? { of: hit[0], ...hit[1]! } : null,
    condition: input.condition,
    staples: input.staples,
    commanderDeckCount: input.commanderDeckCount,
  };
}

export function buildDeckProfile(input: ProfileInput): DeckProfile {
  const { cards } = input;
  const commanders = new Set(input.commanderOracleIds);
  const identitySet = new Set(input.identity.map((c) => c.toUpperCase()));

  const flagged = (source: Map<string, FlagSource[]>) =>
    uniqueRefs(cards.filter((c) => source.has(c.oracleId))).map((r) => ({
      ...r,
      sources: source.get(r.oracleId)!,
    }));

  const tutors = uniqueRefs(cards.filter((c) => input.tutorIds.has(c.oracleId)));
  const byId = new Map(cards.map((c) => [c.oracleId, c]));
  const reaches: { tutor: CardRef; combo: ComboRef; piece: CardRef }[] = [];
  for (const tutor of tutors) {
    for (const combo of input.twoCardCombos) {
      for (const piece of combo.cards) {
        // A tutor that finds a piece the deck already holds still shortens the path: the
        // question is whether the combo can be ASSEMBLED, not whether a card is missing.
        // A tutor never "reaches" itself.
        if (piece.oracleId === tutor.oracleId) continue;
        if (!byId.has(piece.oracleId)) continue;
        reaches.push({ tutor, combo, piece });
      }
    }
  }

  const curveCards: CurveCard[] = cards.map((c) => ({
    cmc: c.cmc,
    typeLine: c.typeLine,
    quantity: c.quantity,
  }));

  return {
    deckId: input.deckId,
    fingerprint: input.fingerprint,
    counts: countCards(cards),
    roles: rolesOf(cards),
    curve: manaCurve(curveCards),
    colours: colours(cards, input.identity),
    skeleton: skeleton(input),
    brackets: {
      gameChangers: uniqueRefs(cards.filter((c) => input.gameChangerIds.has(c.oracleId))),
      massLandDenial: flagged(input.mldFlags),
      extraTurns: flagged(input.extraTurnFlags),
      twoCardCombos: input.twoCardCombos,
      comboReach: { tutors, reaches },
      population: input.population,
      detection: input.detection,
      declared: input.declared,
    },
    legality: {
      banned: uniqueRefs(cards.filter((c) => !c.commanderLegal)),
      // A commander cannot violate its own identity, and including it would report every
      // mono-colour deck as illegal the moment its commander was folded into the rows.
      identityViolations: uniqueRefs(
        cards.filter(
          (c) =>
            !commanders.has(c.oracleId) &&
            c.colorIdentity.some((colour) => !identitySet.has(colour.toUpperCase())),
        ),
      ),
    },
    // ALWAYS null — see the type's own note. #724 measured commander tags describing 76.3% of
    // rows with themes no card in the deck supports; filling this from them would propagate
    // that false claim into a new object.
    themes: null,
  };
}
