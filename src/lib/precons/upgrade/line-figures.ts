import type { RunFigures } from "../../decks/builder-figures";
import { cardTypeGroup, type CardTypeGroup } from "../../decks/grouping";
import type { JobRowsByCard } from "../../decks/job-tally";
import { roleCounterFor } from "../../decks/label-role-counts";
import { ROLE_ORDER, type MixRole, type RecommendedMix } from "../../decks/mix";
import { classifyRoles } from "../../recs/roles";
import { lineFacts } from "../../tuning/v2/line-facts";
import type { CardText } from "./facts";
import { withCommanders, type DeckLine } from "./inputs";

/**
 * What the result's lists read of each card and of the box (fresh start R2, call 9): Suggested changes' own lines, grouped
 * By type or By role under the deck page's heads. Pure: the panel read (`panelFor`) hands in the catalog text, the label
 * read and the mix, so a line names the shelf the deck strip would count it in (`lineFacts`, the one role rule).
 */

/** A card's line facts on the panel: its type line and art for the pick line, its type group and shelf role for the heads. */
export type PanelLineFacts = { typeLine: string; image: string | null; typeGroup: CardTypeGroup; role: MixRole | null };

export function panelLineFacts(oracleId: string, text: CardText, byCard: JobRowsByCard | null): PanelLineFacts {
  const { typeGroup, role } = lineFacts({ oracleId, name: "", typeLine: text.typeLine, oracleText: text.oracleText, keywords: text.keywords }, byCard);
  return { typeLine: text.typeLine, image: text.image, typeGroup, role };
}

/**
 * The heads' figures for the box led by `commanderIds`: its 99's count per type group (`n in the deck`) and what it has of
 * each shelf role against the mix's target, counted as the deck page counts them (`runFiguresOf`): by label when the label
 * read has them, else the classifier's single role. The lead's own cards are not of the 99, so they are not counted.
 */
export function upgradeFigures(
  lines: readonly DeckLine[], commanderIds: readonly string[], byCard: JobRowsByCard | null, mix: RecommendedMix,
): RunFigures {
  const ninetyNine = withCommanders(lines, commanderIds).filter((l) => !l.isCommander);
  const have = roleCounterFor(byCard)(ninetyNine.map((l) => ({
    oracleId: l.oracleId, name: l.name, quantity: l.quantity,
    role: classifyRoles({ typeLine: l.typeLine, oracleText: l.oracleText, keywords: [...l.keywords] })[0] ?? "other",
  })));
  return {
    typeCounts: ninetyNine.reduce<Partial<Record<CardTypeGroup, number>>>((acc, l) => {
      const g = cardTypeGroup(l.typeLine);
      acc[g] = (acc[g] ?? 0) + l.quantity;
      return acc;
    }, {}),
    roles: ROLE_ORDER.map((role) => ({ role, have: have[role], target: mix.cells[role].target })),
  };
}
