import { edictEntry, keywordClaims, nonWeakness, readEvidence, refIndex } from "./claims";
import { deckNameIndex, type FactCard, type SynopsisFacts } from "./facts";
import type { SynopsisResponse, SynopsisResponseV8 } from "./response-schema";
import {
  ASSESSMENT_TOPICS,
  type CheckedSynopsis,
  type RefusalReason,
  type StoredAssessment,
  type StoredEvidence,
  type WeaknessTier,
} from "./types";
import { validateSynopsis, type LineChecks } from "./validate";

/**
 * The contract-8 accept contract (plan section 3 and 4.1). A reply here is the contract-7 content
 * plus evidence refs and a weakness CHECKLIST; this turns it into the shape `validateSynopsis`
 * already checks, adds the line checks that need more than a line's text, and returns the same
 * `CheckedSynopsis` carrying the evidence and the verdicts. One validator, not a second one:
 * every contract-7 rule still runs on every line.
 *
 * WEAKNESSES ARE CHOSEN IN CODE. Only `weakness` verdicts render (a `not_a_weakness` or `unknown`
 * renders nothing: humility is silence), ordered critical, moderate, minor, the tier as a leading
 * word in the existing slot. The maximum renders; the rest are cut.
 *
 * EVIDENCE: a ref is a deck-local `cN` (`refOf`). A tip and a Key card must cite at least one card
 * (a tip's cited cards ARE its `cards`, so the contract-7 rule that they equal the marks stands);
 * a strategy step, a mulligan line and a weakness may cite none, because the generic ones ("send
 * back a hand with no ramp") are about no card, but any ref they do give must resolve and the cap
 * holds. A line failing it is dropped under contract A with `evidence_not_in_deck`. Refs prove a
 * claim is anchored to real cards in this list; they do not prove it true.
 */

export const TIER_WORD: Record<WeaknessTier, string> = { critical: "Critical", moderate: "Moderate", minor: "Minor" };
const TIER_RANK: Record<WeaknessTier, number> = { critical: 0, moderate: 1, minor: 2 };

type Card = { oracleId: string; name: string };

type Normalized = {
  reply: SynopsisResponse;
  checks: LineChecks;
  /** Evidence ids per line, parallel to `reply`'s arrays (weaknesses: the ranked candidates). */
  evidence: { strategy: string[][]; keep: string[][]; sendBack: string[][]; tips: string[][]; keyCards: string[][]; weaknesses: string[][] };
  assessment: StoredAssessment[] | null;
};

/** The candidate weakness lines, ranked, as the validator will see them. Also what `catalogFor` reads. */
export function weaknessLines(reply: Pick<SynopsisResponseV8, "assessment">): string[] {
  return rank(reply).map((a) => `${TIER_WORD[a.tier!]}: ${a.line!.trim()}`);
}

function rank(reply: Pick<SynopsisResponseV8, "assessment">) {
  return reply.assessment
    .filter((a) => a.verdict === "weakness" && a.tier && a.line && a.line.trim() !== "")
    .map((a, i) => ({ ...a, i }))
    .sort((a, b) => TIER_RANK[a.tier!] - TIER_RANK[b.tier!] || a.i - b.i);
}

/** Every topic assessed exactly once, and every `weakness` verdict carrying the tier and the line it renders from. */
export function checklistComplete(reply: Pick<SynopsisResponseV8, "assessment">): boolean {
  if (reply.assessment.some((a) => a.verdict === "weakness" && (!a.tier || !a.line || a.line.trim() === ""))) return false;
  const seen = reply.assessment.map((a) => a.topic);
  return seen.length === ASSESSMENT_TOPICS.length && ASSESSMENT_TOPICS.every((t) => seen.filter((s) => s === t).length === 1);
}

function normalize(reply: SynopsisResponseV8, facts: SynopsisFacts): Normalized {
  const refs = refIndex(facts.cards);
  const deck = deckNameIndex(facts.cards);
  const byId = new Map<string, FactCard>(facts.cards.map((c) => [c.oracleId, c]));
  const cardsByName = new Map<string, FactCard>([...deck].flatMap(([k, v]) => { const c = byId.get(v.oracleId); return c ? [[k, c] as [string, FactCard]] : []; }));
  const keyword = (text: string): RefusalReason | null => (keywordClaims(text, cardsByName).length > 0 ? "keyword_not_on_card" : null);
  const first = (...r: (RefusalReason | null)[]) => r.find((x) => x !== null) ?? null;

  const checks: LineChecks = { overview: [keyword(reply.overview)], strategy: [], keep: [], sendBack: [], tips: [], keyCards: [], weaknesses: [] };
  const ev: Normalized["evidence"] = { strategy: [], keep: [], sendBack: [], tips: [], keyCards: [], weaknesses: [] };

  const claimed = (key: "strategy" | "keep" | "sendBack", lines: { text: string; evidence: string[] }[]) =>
    lines.map((l) => {
      const e = readEvidence(l.evidence, refs, false);
      ev[key].push(e.ids);
      checks[key]!.push(first(e.reason, keyword(l.text)));
      return l.text;
    });

  const strategy = claimed("strategy", reply.primer.strategy);
  const keep = claimed("keep", reply.primer.mulligan.keep);
  const sendBack = claimed("sendBack", reply.primer.mulligan.sendBack);

  const tips = reply.primer.tips.map((t) => {
    const e = readEvidence(t.evidence, refs, true);
    ev.tips.push(e.ids);
    checks.tips!.push(first(e.reason, keyword(t.text), edictEntry(t.text, e.cards, cardsByName) ? "edict_entry" : null));
    return { cards: e.cards.map((c) => c.name), text: t.text };
  });

  const keyCards = reply.keyCards.map((k) => {
    const e = readEvidence(k.evidence, refs, true);
    ev.keyCards.push(e.ids);
    checks.keyCards!.push(first(e.reason, keyword(k.job)));
    return { card: k.card, claims: k.claims, job: k.job };
  });

  const complete = checklistComplete(reply);
  const ranked = complete ? rank(reply) : [];
  const weaknesses = ranked.map((a) => {
    const line = `${TIER_WORD[a.tier!]}: ${a.line!.trim()}`;
    const e = readEvidence(a.evidence, refs, false);
    ev.weaknesses.push(e.ids);
    checks.weaknesses!.push(first(e.reason, nonWeakness(a.line!, facts.identity) ? "non_weakness" : null, keyword(line)));
    return line;
  });

  return {
    reply: { overview: reply.overview, primer: { strategy, mulligan: { keep, sendBack }, tips }, keyCards, weaknesses },
    checks,
    evidence: ev,
    assessment: complete ? reply.assessment.map((a) => ({ topic: a.topic, verdict: a.verdict, ...(a.tier ? { tier: a.tier } : {}) })) : null,
  };
}

/** The positions in `original` of `kept`, a subsequence of it with its order and duplicates kept. */
function positions<T>(original: readonly T[], kept: readonly T[], checks: readonly (RefusalReason | null)[]): number[] {
  const out: number[] = [];
  let from = 0;
  for (const item of kept) {
    // Equal text can be one line dropped by its own evidence check and another that survived, so the
    // survivor is the first equal line whose own check passed (the text rules agree on equal text).
    let at = original.indexOf(item, from);
    while (at !== -1 && checks[at]) at = original.indexOf(item, at + 1);
    out.push(at);
    from = at + 1;
  }
  return out;
}

export function validateSynopsisV8(
  reply: SynopsisResponseV8,
  facts: SynopsisFacts,
  catalog: ReadonlyMap<string, Card>,
): CheckedSynopsis {
  const n = normalize(reply, facts);
  const complete = n.assessment !== null;
  const checked = validateSynopsis(n.reply, facts, catalog, n.checks, true);

  // An incomplete checklist refuses the Weaknesses whole: there is nothing sound to choose from.
  const verdicts = checked.verdicts.map((v) =>
    v.section === "weaknesses" && !complete
      ? { section: "weaknesses" as const, status: "refused" as const, reason: "checklist_incomplete" as const, failed: 0, total: v.total }
      : v);
  const weaknesses = complete ? checked.weaknesses : null;

  const at = <T>(original: readonly T[], kept: readonly T[], evidence: string[][], checks: readonly (RefusalReason | null)[] | undefined) =>
    positions(original, kept, checks ?? []).map((p) => evidence[p] ?? []);
  const primer = checked.primer;
  const evidence: StoredEvidence = {
    strategy: primer ? at(n.reply.primer.strategy, primer.strategy, n.evidence.strategy, n.checks.strategy) : [],
    keep: primer ? at(n.reply.primer.mulligan.keep, primer.mulligan.keep, n.evidence.keep, n.checks.keep) : [],
    sendBack: primer ? at(n.reply.primer.mulligan.sendBack, primer.mulligan.sendBack, n.evidence.sendBack, n.checks.sendBack) : [],
    tips: primer ? at(n.reply.primer.tips, primer.tips, n.evidence.tips, n.checks.tips) : [],
    keyCards: checked.keyCards ? at(n.reply.keyCards, checked.keyCards, n.evidence.keyCards, n.checks.keyCards) : [],
    weaknesses: weaknesses ? at(n.reply.weaknesses, weaknesses, n.evidence.weaknesses, n.checks.weaknesses) : [],
  };

  return {
    ...checked,
    verdicts,
    weaknesses,
    ...(complete ? { assessment: n.assessment! } : {}),
    evidence,
  };
}
