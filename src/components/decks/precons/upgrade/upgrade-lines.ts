// Precon Upgrade fresh start R2 (#2985, README call 9): a run as Suggested changes' own results. The stored pairs become one
// line per side, so adds and cuts are picked separately in the shipped `SuggestedChangesRun`, never a fork of it. Pure, apart
// from the actions it wires (the run's own pick store and set bracket read).
import type { RunFigures } from "../../../../lib/decks/builder-figures";
import type { PanelRun, UpgradePanel } from "../../../../lib/precons/upgrade/run";
import type { UpgradePicks } from "../../../../lib/precons/upgrade/apply";
import type { LineItem, V2Ask } from "../../../../lib/tuning/state";
import type { SuggestionSetActions } from "../../suggested-changes-run";

/** A line's id, as the run's pick store keys it (`store.ts`): `a-` or `c-` and the card's oracle id. */
export const addLineId = (oracleId: string) => `a-${oracleId}`;
export const cutLineId = (oracleId: string) => `c-${oracleId}`;
/** The oracle id a line id names. */
export const oracleOfLine = (lineId: string) => lineId.slice(2);

/** The picked line ids as the Start and Apply actions take them: oracle ids a side. */
export function picksOf(addIds: readonly string[], cutIds: readonly string[]): UpgradePicks {
  return { adds: addIds.map(oracleOfLine), cuts: cutIds.map(oracleOfLine) };
}

/**
 * The run's pairs as Suggested changes' lines, adds then cuts, each in the run's order. The pair's reason goes on the add and
 * its own `cutReason` on the cut; a run kept before cuts carried one draws its cuts with no reason (readiness clarification 2),
 * never the add's. Every line starts picked: a run is the plan the player paid for (call 10); `unpicked` holds what they took
 * out since. The bracket line is the card's own (`addBracketAfter`/`cutBracketAfter`), absent on an older run.
 */
export function upgradeLines(panel: UpgradePanel, run: PanelRun): LineItem[] {
  const unpicked = new Set(run.unpicked);
  const asOf = new Date(run.createdAt);
  const base = { rationaleShort: "", evidence: [], verdict: "pending" as const, applies: true, locked: false, applySet: null, verdictAt: null };
  const adds = run.pairs.map((p): LineItem => {
    const card = panel.cards[p.addId];
    const id = addLineId(p.addId);
    return {
      ...base, side: "add", id, position: p.position, cardOracleId: p.addId, cardName: p.add,
      cardTypeLine: card?.typeLine ?? "", cardImageUri: card?.image ?? null, rationale: p.reason,
      owned: card?.owned ?? false, ownedQuantity: card?.owned ? 1 : 0, availability: card?.owned ? card.availability ?? null : null,
      // The run's own price for the add, as its facts count it; a card the run priced at nothing draws no tag.
      price: p.addCents > 0 ? { cents: p.addCents, foilCents: null, etchedCents: null, asOf } : null,
      bracketAfter: p.addBracketAfter ?? null, inDeck: false,
      typeGroup: card?.typeGroup, role: card?.role ?? null, picked: !unpicked.has(id),
    };
  });
  const cuts = run.pairs.map((p): LineItem => {
    const card = panel.cards[p.cutId];
    const id = cutLineId(p.cutId);
    return {
      ...base, side: "cut", id, position: p.position, cardOracleId: p.cutId, cardName: p.cut,
      cardTypeLine: card?.typeLine ?? "", cardImageUri: card?.image ?? null, rationale: p.cutReason ?? "",
      owned: false, ownedQuantity: 0, availability: null, price: null,
      bracketAfter: p.cutBracketAfter ?? null, inDeck: true,
      typeGroup: card?.typeGroup, role: card?.role ?? null, picked: !unpicked.has(id),
    };
  });
  return [...adds, ...cuts];
}

/**
 * What the box permits before any swap: every bracket its list permits, as the bar's set read is (a plain precon permits 1 and 2), so
 * the set's lowest bracket is measured against the box's own. The bracket the run found it at alone when the box could not be read
 * now; none when neither is known.
 */
export function upgradePermits(panel: UpgradePanel, run: PanelRun): number[] {
  if (panel.boxPermits.length > 0) return panel.boxPermits;
  const b = run.bracketBefore ?? panel.boxBracket;
  return b === null ? [] : [b];
}

/**
 * The run's ask as Suggested changes reads one: N of each, and the bracket the player chose (up from where the box plays, or
 * kept). The request and restrictions are a tuning run's; the upgrade has none, and its You asked box is left out (call 11).
 */
export function upgradeAsk(panel: UpgradePanel, run: PanelRun): V2Ask {
  const from = run.bracketBefore ?? panel.boxBracket;
  const target = run.bracketTarget;
  return {
    runId: run.id, requestedCount: run.pairs.length, request: null, units: 1, restrictions: null,
    bracket: target === null ? null : { choice: from !== null && target > from ? "up" : "keep", target },
  };
}

/** The group heads' figures for the run's commander; none read, the heads draw their counts alone. */
export function figuresOf(panel: UpgradePanel, run: PanelRun): RunFigures {
  // The run's commander option leads its stored key (`leadOf`), read here without the result view's imports.
  const lead = panel.commanders.find((c) => run.strategyKey.startsWith(`${c.key}/`));
  return (lead ? panel.figures[lead.key] : undefined) ?? { typeCounts: {}, roles: [] };
}

export type UpgradeActionDeps = {
  pick: (runId: string, lineId: string, picked: boolean) => Promise<{ ok: true; unpicked: string[] } | { ok: false }>;
  setBracket: (fileName: string, runId: string, adds: string[], cuts: string[]) => Promise<{ permits: number[] } | null>;
};

/**
 * The component's actions over one run: each Pick is stored on the run (`pickUpgradeLineAction`), and `onSaved` hands the
 * stored set back so the run reopened shows it (G28); the bar's set bracket reads the picked subset
 * (`upgradeSetBracketAction`, oracle ids). Apply and Undo are never reached: the flow's own press takes the bar's Apply
 * place (`press`), so they refuse.
 */
export function upgradeActions(
  fileName: string, runId: string, deps: UpgradeActionDeps, onSaved: (runId: string, unpicked: string[]) => void,
): SuggestionSetActions {
  const refused = async () => ({ ok: false as const, message: "" });
  return {
    apply: refused,
    undo: refused,
    pick: async (lineId, picked) => {
      const r = await deps.pick(runId, lineId, picked);
      if (!r.ok) return { ok: false };
      onSaved(runId, r.unpicked);
      return { ok: true };
    },
    setBracket: async (id, addIds, cutIds) => {
      const r = await deps.setBracket(fileName, id, addIds.map(oracleOfLine), cutIds.map(oracleOfLine));
      return r ? { permits: r.permits } : null;
    },
  };
}
