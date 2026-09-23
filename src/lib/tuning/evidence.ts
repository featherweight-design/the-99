import { recommendedMix, type MixRole } from "../decks/mix";
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
    /** The five mix cells, land included. `advisory` marks a range rather than a finish line. */
    roles: { role: MixRole; have: number; target: number; advisory: boolean }[];
    /** Whether the targets came from decklists at all, or from the asserted baseline. */
    measured: boolean;
    /** The skeleton's own honesty flag: targets taken over too few decks. */
    thin: boolean;
  };
  /** Staples for these commanders that the deck does not hold, in the skeleton's rank order. */
  staples: { oracleId: string; name: string; commanders: number; commanderTotal: number; owned: boolean }[];
  play: ProfilePlay;
  intent: string | null;
};

const MIX_ORDER: readonly MixRole[] = ["ramp", "draw", "removal", "wipes", "land"];

export function buildEvidencePack(input: {
  profile: DeckProfile;
  play: ProfilePlay;
  intent: string | null;
  owned: ReadonlySet<string>;
}): EvidencePack {
  const { profile, play, intent, owned } = input;
  const commanderIds = new Set(profile.commanderOracleIds);

  const rolesOf = new Map<string, string[]>();
  for (const [role, cards] of Object.entries(profile.roles.cards)) {
    for (const card of cards) rolesOf.set(card.oracleId, [...(rolesOf.get(card.oracleId) ?? []), role]);
  }

  const mix = recommendedMix(profile.skeleton, profile.commanderOracleIds.length > 1);
  // WHICH POPULATION DEPENDS ON WHICH TARGET — the rule `fitSkeleton` applies. A measured target
  // came from EDHREC support lists, which never contain the commander, so the 99 alone is the
  // comparable count; full counts against it read a phantom surplus on a role-bearing commander.
  const measured = profile.skeleton.roleTargets.of !== "flat";
  const have = measured ? profile.roles.excludingCommanders : profile.roles.counts;

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
      roles: MIX_ORDER.map((role) => ({
        role,
        have: have[role],
        target: mix.cells[role].target,
        advisory: mix.cells[role].advisory,
      })),
      measured,
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
  };
}
