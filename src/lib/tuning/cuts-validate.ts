import { playerTextBody } from "../model/player-text";
import type { CutsPack, CutsPackCard } from "./cuts-evidence";
import type { CutCite, CutProposal, CutsResponse } from "./cuts-schema";
import { presentationFailures, type RuleKey } from "./presentation";

/**
 * What the model is NOT trusted about in a Proposed cuts reply. Pure and client-safe; the catalog
 * lookup is injected as `resolveName`. A cut failing any rule is dropped with a named reason and is
 * never repaired, and survivors are kept in the model's order up to `over`.
 */
export type CutDropRule =
  | "cardExists" | "notInDeck" | "keyCard" | "duplicate" | "tooMany" | "citeMismatch"
  | Extract<RuleKey, "noBracketClaim" | "noResultClaim" | "quotedNote">;

export type CutDrop = { position: number; rule: CutDropRule; name?: string; cite?: CutCite["kind"] };

export type ValidatedCut = { oracleId: string; name: string; reason: string; cites: CutCite[]; position: number };

export type CutsReport = { askedCount: number; survivedCount: number; keptCount: number; over: number; drops: CutDrop[] };

const TEXT_RULES: ReadonlySet<string> = new Set(["noBracketClaim", "noResultClaim", "quotedNote"]);

/** Whether a cite states a figure that is true for THIS card and this deck. */
export function citeHolds(cite: CutCite, card: CutsPackCard, pack: CutsPack): boolean {
  switch (cite.kind) {
    case "inclusion": return typeof card.inclusion === "object" && card.inclusion.pct === cite.pct;
    case "offList": return card.inclusion === "offList";
    case "role": {
      const fact = pack.roles.find((r) => r.role === cite.role);
      return !!fact && fact.have === cite.have && fact.target === cite.target && card.roles.includes(fact.role);
    }
    case "curve": return !!card.curve && card.curve.cmc === cite.cmc && card.curve.have === cite.have;
    case "flag": return (card.flags ?? []).includes(cite.flag);
    case "intent": return pack.intent !== null;
  }
}

export function validateCuts(args: {
  reply: CutsResponse;
  pack: CutsPack;
  resolveName: (name: string) => { oracleId: string } | null;
}): { kept: ValidatedCut[]; dropped: CutDrop[]; report: CutsReport } {
  const { reply, pack, resolveName } = args;
  const inDeck = new Map(pack.cards.map((c) => [c.oracleId, c]));
  const keyNames = new Set(pack.keyCards);
  const quotable = pack.intent ? [{ text: playerTextBody(pack.intent.raw), date: null }] : [];
  const seen = new Set<string>();
  const survivors: (ValidatedCut & { at: number })[] = [];
  const dropped: CutDrop[] = [];

  reply.cuts.forEach((cut, position) => {
    const fail = check(cut);
    if ("rule" in fail) dropped.push({ position, name: cut.name, ...fail });
    else {
      seen.add(fail.oracleId);
      survivors.push({ ...fail, position: survivors.length, at: position });
    }
  });

  const kept: ValidatedCut[] = survivors.slice(0, pack.over).map(({ at: _at, ...cut }) => cut);
  for (const extra of survivors.slice(pack.over)) dropped.push({ position: extra.at, rule: "tooMany", name: extra.name });

  return {
    kept,
    dropped,
    report: { askedCount: reply.cuts.length, survivedCount: survivors.length, keptCount: kept.length, over: pack.over, drops: dropped },
  };

  function check(cut: CutProposal): Omit<ValidatedCut, "position"> | { rule: CutDropRule; cite?: CutCite["kind"] } {
    const resolved = resolveName(cut.name);
    if (!resolved) return { rule: "cardExists" };
    const card = inDeck.get(resolved.oracleId);
    if (!card) return { rule: "notInDeck" };
    if (keyNames.has(card.name)) return { rule: "keyCard" };
    if (seen.has(card.oracleId)) return { rule: "duplicate" };
    for (const cite of cut.cites) {
      if (!citeHolds(cite, card, pack)) return { rule: "citeMismatch", cite: cite.kind };
    }
    const { broken, text } = presentationFailures(cut.reason, quotable);
    const textFail = broken.find((r) => TEXT_RULES.has(r));
    if (textFail) return { rule: textFail as CutDropRule };
    return { oracleId: card.oracleId, name: card.name, reason: text, cites: cut.cites };
  }
}
