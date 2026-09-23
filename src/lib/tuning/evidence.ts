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
  /** The year note dates are judged against (`noteDate`), taken ONCE, when the pack is built, so
   *  the prompt and the validator format a date alike even if the model call crosses a New Year. */
  year: number;
};

export function buildEvidencePack(input: {
  profile: DeckProfile;
  play: ProfilePlay;
  intent: string | null;
  owned: ReadonlySet<string>;
  now?: Date;
}): EvidencePack {
  const { profile, play, intent, owned } = input;
  const commanderIds = new Set(profile.commanderOracleIds);

  const rolesOf = new Map<string, string[]>();
  for (const [role, cards] of Object.entries(profile.roles.cards)) {
    for (const card of cards) rolesOf.set(card.oracleId, [...(rolesOf.get(card.oracleId) ?? []), role]);
  }

  const mix = recommendedMix(profile.skeleton, profile.commanderOracleIds.length > 1);
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
    year: currentYear(input.now),
  };
}
