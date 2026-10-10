// Resolves what the "Against the average deck" card is measured against, for one deck. Server only:
// `averageDeckFrom` is pure (the rungs are provable without a database) and `loadStatsAverage` is the read.
// NOT `loadDeckProfile`: the basis chain is the only part needed, so this is the `deck-mix.ts` pattern.

import { guildLabel } from "../copy/color-labels";
import { foldCurve } from "../profile/fit";
import { loadSkeletonForCommanders } from "../profile/load";
import type { ProfileSkeleton } from "../profile/types";
import { deckBodySize } from "./deck-size";
import { CURVE_MAX } from "./stats";
import type { AverageBasisOf, AverageDeck } from "./stats-average";

const colorCount = (n: number) => (n === 0 ? "colorless" : `${n}-color`);

/** Pure so the rungs are provable without a database. `identity` is the deck's combined color identity. */
export function averageDeckFrom(skeleton: ProfileSkeleton, names: string[], identity: readonly string[], hasPartner: boolean): AverageDeck {
  const composition = skeleton.composition;
  const measuredRoles = skeleton.roleTargets.of !== "flat";
  const of: AverageBasisOf = composition ? composition.of : measuredRoles ? skeleton.roleTargets.of as AverageBasisOf : "baseline";
  const label = of === "identity" ? (identity.length === 0 ? "Colorless" : guildLabel([...identity])) : of === "count" ? colorCount(identity.length) : "";
  const raw = composition?.averageCurve ?? null;
  let manaValue: number | null = null;
  if (raw) {
    let total = 0;
    let n = 0;
    for (const [k, v] of Object.entries(raw)) {
      const cmc = Number(k);
      if (!Number.isFinite(cmc) || !Number.isFinite(v)) continue;
      total += cmc * v;
      n += v;
    }
    manaValue = n > 0 ? total / n : null;
  }
  const folded = raw ? foldCurve(raw) : null;
  return {
    body: deckBodySize(hasPartner),
    basis: {
      of,
      names: of === "pair" ? names : names.slice(0, 1),
      label,
      // A commander rung on a pair deck means the pair row carried no composition, and then it carries no count either
      // (measured on staging: the 38 pair rows without a composition have a null count), so this is the commander's.
      // Only a composition proves the count came from its own row: a role-only pair (no composition) would
      // carry the commander row's count under a pair label.
      decks: composition && (of === "commander" || of === "pair") ? skeleton.commanderDeckCount : null,
    },
    targets: composition ? composition.targets : null,
    curve: folded ? Array.from({ length: CURVE_MAX + 1 }, (_, i) => folded.get(i) ?? 0) : null,
    manaValue,
    // The two chains resolve independently, so the job targets can come from another rung than the
    // composition the basis line names. Only a rung that IS the named one draws; otherwise the bars would
    // sit under a line claiming a different average.
    roles: composition ? (skeleton.roleTargets.of === composition.of ? skeleton.roleTargets.targets : null) : skeleton.roleTargets.targets,
  };
}


/** Never throws: null when the chain cannot be resolved, and the card then stays a shell rather than
 *  state a basis it never read. */
export async function loadStatsAverage(deck: {
  commander: { oracleId: string; name: string; colorIdentity: readonly string[] };
  partner: { oracleId: string; name: string; colorIdentity: readonly string[] } | null;
}): Promise<AverageDeck | null> {
  try {
    // The identity comes off the deck detail the page already read: no second read of `cards`.
    const identity = [...new Set([...deck.commander.colorIdentity, ...(deck.partner?.colorIdentity ?? [])])];
    const { skeleton } = await loadSkeletonForCommanders(
      deck.commander.oracleId,
      deck.partner?.oracleId ?? null,
      identity,
      undefined,
      { roleBasis: "labels" },
    );
    return averageDeckFrom(skeleton, [deck.commander.name, ...(deck.partner ? [deck.partner.name] : [])], identity, deck.partner !== null);
  } catch (err) {
    console.warn("loadStatsAverage: no skeleton, the Average card stays a shell", err);
    return null;
  }
}
