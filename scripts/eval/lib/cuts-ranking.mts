/**
 * The tier-1 cut RANKING, kept ONLY so `pnpm eval:cuts` keeps reproducing the baseline the model
 * tier is scored against (free tier: 10 of Hugh's 58 cuts, 1.1x chance). It left the app on
 * 2026-10-09 with the model-first ruling; the app now has `cutFacts`, which orders nothing.
 *
 * It ranks the facts, as the engine did: inclusion leads, role and curve are the deck's shape
 * against the commander's average, and a bracket flag weighs least. Weights are the first-draft
 * ones, never tuned. Every flag is scored (declared bracket null), as the baseline did.
 */
import { cutFacts, type BracketFlag, type CutFacts, type CutSupport } from "../../../src/lib/tuning/cuts";
import type { MixRole } from "../../../src/lib/decks/mix";
import type { DeckProfile } from "../../../src/lib/profile/types";

export type CutWeights = { inclusion: number; role: number; curve: number; bracket: number };
export const CUT_WEIGHTS: CutWeights = { inclusion: 0.45, role: 0.3, curve: 0.15, bracket: 0.1 };

/** Cutting a card from a role at or under target costs this much score: a demotion, not a filter. */
const GAP_PENALTY = 0.3;

export type CutReason =
  | { kind: "inclusion"; pct: number; deckCount: number | null }
  | { kind: "offList"; listed: number; deckCount: number | null }
  | { kind: "roleSurplus"; role: MixRole; have: number; target: number }
  | { kind: "curve"; cmc: number; have: number; average: number }
  | { kind: "bracket"; flag: BracketFlag; count: number };

export type CutCandidate = {
  oracleId: string;
  name: string;
  quantity: number;
  reason: CutReason;
  signals: CutReason[];
  opensGap: MixRole | null;
  score: number;
};

export type RankedCuts = { total: number; over: number; candidates: CutCandidate[]; missing: CutFacts["missing"] };

export function rankCuts(facts: CutFacts, weights: CutWeights = CUT_WEIGHTS): RankedCuts {
  const W = weights;
  const deckCount = facts.support?.deckCount ?? null;
  const flagCount = new Map(facts.brackets.map((b) => [b.flag, b.cards.length]));
  const candidates: CutCandidate[] = [];
  for (const card of facts.cards) {
    const scored: { reason: CutReason; weight: number }[] = [];
    if (card.inclusion?.kind === "pct") {
      scored.push({
        reason: { kind: "inclusion", pct: card.inclusion.pct, deckCount },
        weight: W.inclusion * (1 - clamp01(card.inclusion.pct / 100)),
      });
    } else if (card.inclusion?.kind === "offList") {
      scored.push({ reason: { kind: "offList", listed: facts.support?.listed ?? 0, deckCount }, weight: W.inclusion });
    }
    if (card.roleSurplus) {
      const { role, have, target } = card.roleSurplus;
      scored.push({
        reason: { kind: "roleSurplus", role, have, target },
        weight: W.role * clamp01((have - target) / Math.max(target, 1)),
      });
    }
    if (card.curve) {
      scored.push({
        reason: { kind: "curve", cmc: card.curve.cmc, have: card.curve.have, average: Math.round(card.curve.average * 10) / 10 },
        weight: W.curve * clamp01((card.curve.have - card.curve.average) / Math.max(card.curve.average, 1)),
      });
    }
    for (const flag of card.flags) {
      scored.push({ reason: { kind: "bracket", flag, count: flagCount.get(flag) ?? 0 }, weight: W.bracket });
    }
    const positive = scored.filter((s) => s.weight > 0).sort((a, b) => b.weight - a.weight);
    if (positive.length === 0) continue;
    candidates.push({
      oracleId: card.oracleId,
      name: card.name,
      quantity: card.quantity,
      reason: positive[0].reason,
      signals: positive.map((s) => s.reason),
      opensGap: card.opensGap,
      score: positive.reduce((sum, s) => sum + s.weight, 0) - (card.opensGap ? GAP_PENALTY : 0),
    });
  }
  candidates.sort((a, b) => b.score - a.score || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return { total: facts.total, over: facts.over, candidates, missing: facts.missing };
}

/** The baseline's entry point: facts with every flag named, then ranked. */
export function proposeCuts(input: {
  profile: DeckProfile;
  locked: ReadonlySet<string>;
  support: CutSupport | null;
  weights?: CutWeights;
}): RankedCuts {
  return rankCuts(cutFacts({ ...input, declaredBracket: null }), input.weights);
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
