/**
 * The deck's rules violations (brief §3.4): cards not legal in Commander, and cards outside the
 * commanders' colors. Derived LIVE from the deck's current cards, so it needs no analysis and a
 * card leaving the deck clears it (plan D6). Named "rules violations" rather than "legality",
 * which in this codebase means the body count (brief §1).
 *
 * The same rule `buildProfile` applies to `ProfileLegality` (`build.ts`): a commander is never an
 * identity violation of its own deck.
 */

export type ViolationCard = { oracleId: string; commanderLegal: boolean; colorIdentity: readonly string[] };

export type RulesViolations = {
  notLegal: string[];
  /** Each card outside the identity, with the colors that put it there. */
  outsideColors: { oracleId: string; colors: string[] }[];
};

export function rulesViolations(
  cards: readonly ViolationCard[],
  commanders: readonly ViolationCard[],
): RulesViolations {
  const identity = new Set(commanders.flatMap((c) => c.colorIdentity.map((x) => x.toUpperCase())));
  const commanderIds = new Set(commanders.map((c) => c.oracleId));
  const all = [...commanders, ...cards];
  const seen = new Set<string>();
  const unique = all.filter((c) => (seen.has(c.oracleId) ? false : (seen.add(c.oracleId), true)));
  return {
    notLegal: unique.filter((c) => !c.commanderLegal).map((c) => c.oracleId).sort(),
    outsideColors: unique
      .filter((c) => !commanderIds.has(c.oracleId))
      .map((c) => ({ oracleId: c.oracleId, colors: c.colorIdentity.map((x) => x.toUpperCase()).filter((x) => !identity.has(x)) }))
      .filter((c) => c.colors.length > 0)
      .sort((a, b) => a.oracleId.localeCompare(b.oracleId)),
  };
}

/** The sorted set of offending ids a player has seen, for the read state (readiness F11). */
export function offendingIds(v: RulesViolations): string[] {
  return [...new Set([...v.notLegal, ...v.outsideColors.map((c) => c.oracleId)])].sort();
}
