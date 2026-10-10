import { deckNameIndex, normalizeName } from "../synopsis/facts";
import { currentYear } from "./note-date";
import { recommendedMix, ROLE_ORDER, type MixRole } from "../decks/mix";
import type { ProfilePlay } from "../profile/play";
import type { DeckProfile } from "../profile/types";

/**
 * What a tuning run hands the model, assembled FROM the Deck Profile — never gathered a second
 * time. Pure and client-safe: it takes an already-loaded profile, its composed play group, the
 * intent and the reader's owned ids, and does no database or network work.
 *
 * THREE RULES DO THE WORK HERE, each a way the model could otherwise say something the app
 * cannot stand behind:
 *  - No proportion travels. A staple's breadth goes as `commanders of commanderTotal`; its
 *    `avgInclusion` and `weightedRank` stay behind, because a 0.62 is a 62% waiting to be
 *    written. The play group has already dropped `net`.
 *  - The commanders are marked, so a cut can be refused for naming one.
 *  - Role counts are measured against the targets they were derived for, as `fitSkeleton`
 *    decides it: the 99 alone against a measured target, the whole deck against the flat one.
 *
 * No bracket figure is in the pack: the app flags a swap that moves the bracket itself.
 */
export type EvidencePack = {
  commanders: { oracleId: string; name: string }[];
  colorIdentity: string[];
  cards: {
    oracleId: string;
    name: string;
    typeLine: string;
    roles: string[];
    quantity: number;
    owned: boolean;
    commander: boolean;
    /** The player locked it (Locked, never cut): the prompt tags it and the validator drops any cut
     *  of it. Absent, like false, for every card of a deck with no locks, so its prompt is today's. */
    locked?: boolean;
  }[];
  targets: {
    /**
     * The five mix cells, land included. `advisory` marks a range rather than a finish line.
     * `measured` is PER CELL, because `recommendedMix` resolves the four roles and the land count
     * independently: a commander indexed before the role pass has a measured land target beside
     * four asserted ones, and one flag for all five would misdescribe some of them.
     */
    roles: { role: MixRole; have: number; target: number; advisory: boolean; measured: boolean }[];
    /** The skeleton's own honesty flag: targets taken over too few decks. */
    thin: boolean;
  };
  /** Staples for these commanders that the deck does not hold, in the skeleton's rank order. */
  staples: { oracleId: string; name: string; commanders: number; commanderTotal: number; owned: boolean }[];
  play: ProfilePlay;
  intent: string | null;
  /** "Additional notes" (H35, PR 4b): the player's free text for THIS run alone, never saved.
   *  Null for a run with none, the same shape as `intent`. */
  notes: string | null;
  /** The year note dates are judged against (`noteDate`), taken ONCE, when the pack is built, so
   *  the prompt and the validator format a date alike even if the model call crosses a New Year. */
  year: number;
  /**
   * How the deck plays, from its own stored overview (tuning v2, Hugh's ruling 2026-09-24): its
   * strategy steps with their card marks unwrapped, and its Key cards, which are never cut. Only
   * Key cards still in this deck are kept, since the overview may have been written for an older
   * list. Null or absent when the deck has no overview, and the prompt then says nothing about one.
   */
  strategy?: { steps: string[]; keyCards: { oracleId: string; name: string }[] } | null;
  /** Every universal staple (`src/lib/staples/universal.ts`), one per oracle card, sorted by name
   *  as round 4 of the eval named them. None is cut just to fix a role count. Absent is none. */
  universal?: { oracleId: string; name: string }[];
  /** "Kept for this deck" (H35, PR 4a): hard filters, told to the model up front AND enforced by
   *  the validator against the model's own resolved cards. Null/empty/false until the player sets
   *  them, same shape as `TuningFacts["limits"]`. */
  limits: { capCents: number | null; sets: readonly string[]; ownedOnly: boolean };
};

export function buildEvidencePack(input: {
  profile: DeckProfile;
  play: ProfilePlay;
  intent: string | null;
  /** "Additional notes" (H35, PR 4b). Optional: absent/null for every caller that does not
   *  carry one — the eval harness, and older tests — the same shape as `intent`. */
  notes?: string | null;
  owned: ReadonlySet<string>;
  /** The deck's live locks (D5): an INPUT, like `owned`, read in the run's own request and never
   *  stored in the analysis, so toggling a lock never marks a reading stale. */
  locked?: ReadonlySet<string>;
  now?: Date;
  /** The deck's shown overview: its strategy steps and its Key cards' names, as written. */
  overview?: { strategy: string[]; keyCards: string[] } | null;
  /** The universal staples, resolved to names. */
  universal?: readonly { oracleId: string; name: string }[];
  /** "Kept for this deck" (H35, PR 4a). Optional: a neutral default (no filter) for every
   *  caller that does not carry limits — the eval harness, and older tests. */
  limits?: { capCents: number | null; sets: readonly string[]; ownedOnly: boolean };
}): EvidencePack {
  const { profile, play, intent, owned } = input;
  const commanderIds = new Set(profile.commanderOracleIds);

  const rolesOf = new Map<string, string[]>();
  for (const [role, cards] of Object.entries(profile.roles.cards)) {
    for (const card of cards) rolesOf.set(card.oracleId, [...(rolesOf.get(card.oracleId) ?? []), role]);
  }

  const mix = recommendedMix(profile.skeleton, profile.commanderOracleIds.length > 1, profile.skeleton.roleBasis ?? "classifier");
  // Whether the four ROLE cells are measured — the predicate `recommendedMix` applies before it
  // falls back to its flat figures (`rolesUsable`, src/lib/decks/mix.ts). Restated rather than
  // imported because mix.ts does not export it; if the two ever disagree, a cell would be
  // counted against a population its target was not derived for.
  const roleTargets = profile.skeleton.roleTargets;
  const roleTargetsFinite = Object.values(roleTargets.targets)
    .every((v) => typeof v === "number" && Number.isFinite(v));
  const rolesMeasured = roleTargets.of !== "flat" && roleTargetsFinite;
  // And the land figure's own guards, from `landTarget` (src/lib/decks/deck-size.ts): it falls
  // back to the flat 36/37 without a composition, with a non-finite land average, AND when any
  // role target is non-finite, since those set its cap. Any of the three means the land target
  // the model is handed is asserted, not measured.
  const composition = profile.skeleton.composition;
  const landMeasured = composition != null && Number.isFinite(composition.targets.land) && roleTargetsFinite;
  // WHICH POPULATION DEPENDS ON WHICH TARGET — the rule `fitSkeleton` applies. A measured target
  // came from EDHREC support lists, which never contain the commander, so the 99 alone is the
  // comparable count; full counts against it read a phantom surplus on a role-bearing commander.
  // The asserted baseline is a design figure for a whole deck, so it takes the full count.
  const have = rolesMeasured ? profile.roles.excludingCommanders : profile.roles.counts;

  const inDeck = new Set(profile.cards.map((c) => c.oracleId));

  return {
    commanders: profile.cards
      .filter((c) => commanderIds.has(c.oracleId))
      .map(({ oracleId, name }) => ({ oracleId, name })),
    colorIdentity: [...profile.colours.identity],
    cards: profile.cards.map((c) => ({
      oracleId: c.oracleId,
      name: c.name,
      typeLine: c.typeLine,
      roles: rolesOf.get(c.oracleId) ?? [],
      quantity: c.quantity,
      owned: owned.has(c.oracleId),
      commander: commanderIds.has(c.oracleId),
      // Only when set: a pack for a deck with no locks is the object it was before locks existed.
      ...(input.locked?.has(c.oracleId) && !commanderIds.has(c.oracleId) ? { locked: true } : {}),
    })),
    targets: {
      roles: ROLE_ORDER.map((role) => ({
        role,
        have: role === "land" ? profile.roles.counts.land : have[role],
        target: mix.cells[role].target,
        advisory: mix.cells[role].advisory,
        measured: role === "land" ? landMeasured : rolesMeasured,
      })),
      thin: profile.skeleton.thinCondition,
    },
    staples: profile.skeleton.staples
      .filter((s) => !inDeck.has(s.oracleId))
      .map((s) => ({
        oracleId: s.oracleId,
        name: s.name,
        commanders: s.commanders,
        commanderTotal: s.commanderTotal,
        owned: owned.has(s.oracleId),
      })),
    play,
    intent,
    notes: input.notes ?? null,
    year: currentYear(input.now),
    strategy: input.overview ? strategyOf(input.overview, profile.cards) : null,
    universal: universalOf(input.universal ?? []),
    limits: input.limits ?? { capCents: null, sets: [], ownedOnly: false },
  };
}

/** A `[[Name]]` mark unwrapped to its name, as the prompt shows cards unmarked. */
const unmark = (text: string) => text.replace(/\[\[([^\]]+)\]\]/g, "$1");

/**
 * The overview's strategy and the Key cards it names that this deck still holds, resolved as the
 * overview's own validator resolves them (`deckNameIndex`, `normalizeName`): curly quotes, spacing
 * and case folded, and a face answering for its card unless two deck cards share it.
 */
function strategyOf(overview: { strategy: string[]; keyCards: string[] }, cards: DeckProfile["cards"]) {
  const byName = deckNameIndex(cards);
  const keyCards = new Map<string, { oracleId: string; name: string }>();
  for (const written of overview.keyCards) {
    const card = byName.get(normalizeName(unmark(written)));
    if (card) keyCards.set(card.oracleId, card);
  }
  return { steps: overview.strategy.map(unmark), keyCards: [...keyCards.values()] };
}

/**
 * Every universal staple, one entry per ORACLE card, sorted by name as JavaScript sorts strings
 * (the eval harness's order), then by id. Catalog names are not unique (`resolve-names.ts`), so
 * nothing is merged by name here: the validator checks a cut by id, and a deck holding the second
 * card of a shared name must still be refused. The prompt deduplicates the names it prints.
 */
function universalOf(rows: readonly { oracleId: string; name: string }[]) {
  const byId = new Map<string, { oracleId: string; name: string }>();
  for (const r of rows) if (!byId.has(r.oracleId)) byId.set(r.oracleId, r);
  return [...byId.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : a.oracleId < b.oracleId ? -1 : 1));
}
