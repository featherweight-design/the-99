import { castFaceText, isLandFace, playableAsLand } from "../cards/facet";
import { manaCurve, type CurveCard } from "../decks/stats";
import { classifyRoles, LABEL_ROLE_TARGETS, ROLE_TARGETS, type Role } from "../recs/roles";
import type { LabelTargetRole } from "../labels/role-sets";
import type {
  Bracket,
  BracketPopulation,
  CardRef,
  ComboRef,
  CompositionTargets,
  DeckProfile,
  DetectionCoverage,
  FlagSource,
  ProfileRoleTargets,
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
  layout: string;
};

/** A composition candidate, already read. The loader supplies the ones it found; the FIRST
 *  present in this order wins, which is the whole basis chain. */
export type CompositionCandidates = {
  pair: { targets: CompositionTargets; averageCurve: Record<string, number> | null } | null;
  commander: { targets: CompositionTargets; averageCurve: Record<string, number> | null } | null;
  identity: { targets: CompositionTargets; averageCurve: Record<string, number> | null } | null;
  count: { targets: CompositionTargets; averageCurve: Record<string, number> | null } | null;
};

/** The role candidates, read down the same chain and resolved separately. */
export type RoleCandidates = {
  pair: RoleFour | null;
  commander: RoleFour | null;
  identity: RoleFour | null;
  count: RoleFour | null;
};
type RoleFour = { ramp: number; draw: number; removal: number; wipes: number };

/** Which count the targets are for: `classifier` (`avg_*`, `classifyRoles`) or `labels` (`label_*`,
 *  the Jobs card's tally). The candidates a caller hands in are of that basis already; this only
 *  picks the flat fallback that matches. */
export type RoleBasis = "classifier" | "labels";

/**
 * THE role-target selector: the chain's first measured hit, pair → commander → identity →
 * count, or the asserted `ROLE_TARGETS` when none was measured.
 *
 * ONE of these, deliberately (brief 2026-09-28 §5.4). The skeleton, the create path's
 * `loadSkeletonForCommanders`, and the commander surfaces (the fit score, Role Coverage, the
 * thinnest role) all take their targets from here, so a deck is never built to one set of
 * figures and graded, ranked or described against another.
 *
 * Read SEPARATELY from the composition chain: folding the two would let a missing role figure
 * drag a perfectly good composition to `flat`, and a missing composition hide role figures that
 * were measured — the two populations differ until one index run has covered both.
 *
 * Never null: `ROLE_TARGETS` is a real answer rather than an absence, and a reader measured
 * against it is being told something true about what it is measured against.
 */
export function pickRoleTargets(roles: RoleCandidates, basis: RoleBasis = "classifier"): ProfileRoleTargets {
  const roleChain = [
    ["pair", roles.pair],
    ["commander", roles.commander],
    ["identity", roles.identity],
    ["count", roles.count],
  ] as const;
  const roleHit = roleChain.find(([, value]) => value != null);
  return roleHit
    ? { of: roleHit[0], targets: roleHit[1]! }
    : { of: "flat", targets: { ...(basis === "labels" ? LABEL_ROLE_TARGETS : ROLE_TARGETS) } };
}

export type ProfileInput = {
  deckId: string;
  fingerprint: string;
  /** Deck rows PLUS both commanders, already unioned by the loader. */
  cards: ProfileCardRow[];
  commanderOracleIds: string[];
  /** The commanders' colour identity, as stored. Sorted here. */
  identity: string[];
  condition: string;
  composition: CompositionCandidates;
  roles: RoleCandidates;
  /**
   * The labels basis (labels-everywhere PR 8): each fresh-labelled card's role set, and the
   * `label_*` targets they are graded against. Present only when the switch is on; absent builds
   * exactly the classifier profile it always did. `roles` above stays the classifier's candidates
   * and is not read when this is present. A card absent from `sets` has no fresh label and falls
   * back to the classifier for that card alone.
   */
  labels?: { sets: ReadonlyMap<string, readonly LabelTargetRole[]>; roleTargets: ProfileRoleTargets };
  /** Whether the bucket serving this deck was derived from a below-bar population. */
  thinCondition: boolean;
  staples: StapleRef[];
  commanderDeckCount: number | null;
  population: BracketPopulation | null;
  /** oracleId -> which classifiers claimed it. Absent = not flagged. */
  mldFlags: Map<string, FlagSource[]>;
  extraTurnFlags: Map<string, FlagSource[]>;
  gameChangerIds: Set<string>;
  twoCardCombos: ComboRef[];
  /** Cards the loader classified as TUTORS (`isTutorTarget`): they can find a non-land. These
   *  are what `comboReach.tutors` lists and the tutors finding counts. */
  tutorIds: Set<string>;
  /**
   * Cards whose library search can find ONLY a land. Not tutors (ruled 2026-09-22), so never
   * listed or counted, but still paired for REACH, because a land can be a combo piece.
   *
   * Optional, and an absence means the deck holds none, which is exact for every hand-built
   * fixture that never states one. The loader always supplies it.
   */
  landSearchIds?: Set<string>;
  /**
   * Whether a tutor can actually FIND a piece. Supplied by the loader because the predicate
   * reads the tutor's oracle text, which this function does not parse.
   *
   * Defaults to "reaches everything" when absent, which is what the type tests want and what
   * an over-reporting caller gets: a receipt claiming every tutor finds every piece is one
   * nobody can check. The loader always supplies it.
   */
  tutorReaches?: (
    tutorId: string,
    /**
     * The piece's own row. `oracleId` is declared because the caller is handed the whole row
     * and a predicate that cannot name the card it is being asked about cannot express "this
     * tutor finds THAT half" — which is the distinction the 3-vs-4 boundary turns on (§6.1b).
     * It was passed all along and simply missing from the type.
     */
    piece: { oracleId: string; typeLine: string; colorIdentity: string[]; cmc: number },
  ) => boolean;
  detection: DetectionCoverage;
};

const ref = (c: ProfileCardRow): CardRef => ({ oracleId: c.oracleId, name: c.name });

/**
 * Map rows to refs, deduped on oracle id.
 *
 * `normalise` already guarantees one row per card, so the dedupe here is belt and braces —
 * kept because these lists are built from FILTERED subsets and a future filter that emits a
 * card twice would otherwise put it in a receipt twice. A receipt naming the same card twice
 * reads as two answers to one question.
 */
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

/**
 * ONE ROW PER CARD, with the quantities summed.
 *
 * Every figure on the profile is computed from the result, so `profile.cards` really is "the
 * list every count was computed from" rather than a differently-shaped neighbour. An earlier
 * version deduped only the exposed list while counting over the raw input, which made a
 * duplicated row report one card and two copies at the same time — and the type's own comment
 * promised otherwise.
 *
 * Summed rather than first-wins because no information should be lost: `deck_cards` has a
 * primary key on `(deck_id, oracle_id)` so two rows for one card is malformed input, and the
 * copies it names are still the caller's best statement of how many there are.
 */
function normalise(cards: readonly ProfileCardRow[]): ProfileCardRow[] {
  const byId = new Map<string, ProfileCardRow>();
  for (const card of cards) {
    const seen = byId.get(card.oracleId);
    if (seen) seen.quantity += card.quantity;
    else byId.set(card.oracleId, { ...card });
  }
  return [...byId.values()];
}

function countCards(cards: ProfileCardRow[]): ProfileCounts {
  let total = 0;
  let land = 0;
  let basics = 0;
  let extraLandCapable = 0;
  for (const c of cards) {
    total += c.quantity;
    if (isLandFace(c.typeLine)) {
      land += c.quantity;
      // By TYPE LINE, never by name: a card is a basic because it says `Basic Land`, and
      // Snow-Covered Swamp and Wastes both do while neither is named for a basic type.
      if (/^basic\b/i.test(c.typeLine.trim())) basics += c.quantity;
    } else if (playableAsLand(c.typeLine, c.layout)) {
      // Counted SEPARATELY, never into `land`. The ten type axes must keep summing to the deck,
      // so a modal land stays a Sorcery on the type table and gains a second figure here.
      extraLandCapable += c.quantity;
    }
  }
  return { total, nonland: total - land, land, basics, landCapable: land + extraLandCapable };
}

/** The cards that make `landCapable` differ from `land`. */
function landCapableRefs(cards: ProfileCardRow[]): CardRef[] {
  return uniqueRefs(cards.filter((c) => !isLandFace(c.typeLine) && playableAsLand(c.typeLine, c.layout)));
}

const ALL_ROLES: Role[] = ["ramp", "draw", "removal", "wipes", "land"];

/**
 * The roles one card fills. On the labels basis a fresh-labelled NONLAND card is its label role set
 * (a counterspell is not removal; `labelRoleSet`), a land face is the land role and nothing else
 * (the classifier already says that: labels call 163 lands ramp and the deck counts them as
 * lands), and a card with no fresh label falls back to the classifier for that card.
 */
function rolesFor(
  c: ProfileCardRow,
  faceText: string | null,
  sets: ReadonlyMap<string, readonly LabelTargetRole[]> | undefined,
): Role[] {
  const byText = classifyRoles({ ...c, oracleText: faceText });
  if (!sets) return byText;
  if (isLandFace(c.typeLine)) return byText.filter((r) => r === "land");
  const labelled = sets.get(c.oracleId);
  return labelled ? [...labelled] : byText;
}

function rolesOf(
  cards: ProfileCardRow[],
  commanders: Set<string>,
  sets?: ReadonlyMap<string, readonly LabelTargetRole[]>,
): ProfileRoles {
  const counts = Object.fromEntries(ALL_ROLES.map((r) => [r, 0])) as Record<Role, number>;
  const excludingCommanders =
    Object.fromEntries(ALL_ROLES.map((r) => [r, 0])) as Record<Role, number>;
  const refs = Object.fromEntries(ALL_ROLES.map((r) => [r, [] as CardRef[]])) as Record<
    Role,
    CardRef[]
  >;
  const listed = Object.fromEntries(ALL_ROLES.map((r) => [r, new Set<string>()])) as Record<
    Role,
    Set<string>
  >;
  for (const c of cards) {
    // THE FRONT FACE, through `castFaceText`. `cards.oracle_text` holds BOTH faces joined, so
    // a land-backed MDFC reads as ramp off the whole string — which is exactly the defect the
    // role DERIVATION was corrected for (82 commander-legal cards; mean ramp 8.5 against 7.8).
    // This side never got the same fix, so the deck's own counts classified one way while the
    // targets they are compared against classified the other, and `delta` reported a surplus
    // that was an artefact of the two disagreeing about which face to read.
    const faceText = castFaceText(c.oracleText, c.layout);
    for (const role of rolesFor(c, faceText, sets)) {
      // The COUNT is copies and the LIST is distinct cards. Three Rampant Growths are three
      // pieces of ramp against a target of ten, and naming the card three times in the
      // receipt would read as three different answers to the same problem.
      //
      // The count takes every row and the list dedupes on oracle id — a row repeated in the
      // input would otherwise be listed twice while the comment above promised otherwise.
      counts[role] += c.quantity;
      if (!commanders.has(c.oracleId)) excludingCommanders[role] += c.quantity;
      if (listed[role].has(c.oracleId)) continue;
      listed[role].add(c.oracleId);
      refs[role].push(ref(c));
    }
  }
  return { counts, excludingCommanders, cards: refs };
}

const WUBRG = ["W", "U", "B", "R", "G"] as const;

/**
 * Which colours the deck's nonland mana COSTS ask for.
 *
 * Read off the pips, never off colour identity: identity counts activation costs, so a card
 * whose only red is `{R}: …` would report a red the deck never has to produce at cast time.
 *
 * A HYBRID pip is one pip that either half pays, so it is grouped rather than split — the
 * caller reports it unproducible only when NO half is producible.
 *
 * A pip offering a NON-COLOUR alternative needs nothing at all, and is dropped here rather
 * than reduced to its colour half. `{2/W}` is paid with two generic mana by a deck that
 * produces no white, and `{W/P}` is paid with two life — so reporting W for either would
 * name a colour the deck never has to produce, which is the exact false positive the hybrid
 * rule exists to prevent. An earlier version kept the colour half of both and a comment
 * claiming they were "the same shape" as `{W/U}`; they are the opposite shape.
 */
export function manaNeeds(manaCost: string | null): string[][] {
  if (!manaCost) return [];
  const needs: string[][] = [];
  for (const [, body] of manaCost.matchAll(/\{([^}]+)\}/g)) {
    const halves = body.toUpperCase().split("/");
    // EVERY half must be a colour. A half that is not — the generic number in `{2/W}`, the
    // `P` in `{W/P}` — is a way to pay this pip WITHOUT that colour, so the pip demands
    // nothing. (Snow is not one of these: `{S}` is its own symbol and never a hybrid half, so
    // it has no colour to drop and never reaches this branch.)
    if (!halves.every((h) => (WUBRG as readonly string[]).includes(h))) continue;
    needs.push([...new Set(halves)]);
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
    roleTargets: input.labels ? input.labels.roleTargets : pickRoleTargets(input.roles),
    ...(input.labels ? { roleBasis: "labels" as const } : {}),
    thinCondition: input.thinCondition,
    condition: input.condition,
    staples: input.staples,
    commanderDeckCount: input.commanderDeckCount,
  };
}

export function buildDeckProfile(input: ProfileInput): DeckProfile {
  const cards = normalise(input.cards);
  const commanders = new Set(input.commanderOracleIds);
  const identitySet = new Set(input.identity.map((c) => c.toUpperCase()));

  const flagged = (source: Map<string, FlagSource[]>) =>
    uniqueRefs(cards.filter((c) => source.has(c.oracleId))).map((r) => ({
      ...r,
      sources: source.get(r.oracleId)!,
    }));

  const tutors = uniqueRefs(cards.filter((c) => input.tutorIds.has(c.oracleId)));
  // Every SEARCH pairs for reach — the tutors and the land searches alike — because reach asks
  // what a card can find, and a land search can find a land combo piece. Only `tutors` is
  // listed and counted. See `landSearchIds`.
  const searchers = uniqueRefs(
    cards.filter((c) => input.tutorIds.has(c.oracleId) || input.landSearchIds?.has(c.oracleId)),
  );
  const byId = new Map(cards.map((c) => [c.oracleId, c]));
  const reaches: { tutor: CardRef; combo: ComboRef; piece: CardRef }[] = [];
  for (const tutor of searchers) {
    for (const combo of input.twoCardCombos) {
      for (const piece of combo.cards) {
        // A tutor that finds a piece the deck already holds still shortens the path: the
        // question is whether the combo can be ASSEMBLED, not whether a card is missing.
        // A tutor never "reaches" itself.
        if (piece.oracleId === tutor.oracleId) continue;
        // A COMMANDER IS NOT IN THE LIBRARY. A tutor searches a library, so a combo piece
        // sitting in the command zone is already available and cannot be "reached" — and
        // counting it would push the lean to `reachable` on every commander-based
        // combo, which is the one case where the tutor contributes nothing at all.
        if (commanders.has(piece.oracleId)) continue;
        const held = byId.get(piece.oracleId);
        if (!held) continue;
        // And can this tutor find THIS piece? A land tutor does not fetch an artifact, and a
        // `mana value 1 or less` tutor does not fetch a six-drop.
        if (input.tutorReaches && !input.tutorReaches(tutor.oracleId, held)) continue;
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
    commanderOracleIds: input.commanderOracleIds,
    fingerprint: input.fingerprint,
    cards: cards.map((c) => ({
      oracleId: c.oracleId, name: c.name, typeLine: c.typeLine,
      cmc: c.cmc, quantity: c.quantity, layout: c.layout,
    })),
    counts: countCards(cards),
    landCapableCards: landCapableRefs(cards),
    roles: rolesOf(cards, commanders, input.labels?.sets),
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
