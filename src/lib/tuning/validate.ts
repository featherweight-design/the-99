import { validateCardForDeck } from "../decks/add-validation";
import type { TuningCitation } from "../../db/schema";
import type { EvidencePack } from "./evidence";
import { presentationFailures, type RuleKey } from "./presentation";
import type { TuningResponse, TuningSuggestion } from "./response-schema";

/**
 * What the model is NOT trusted about. Pure and client-safe: the catalog lookup is injected as
 * `resolveName`, a closure the caller builds over one read of every name the reply used.
 *
 * Six rules, in order, and a suggestion is kept only if it survives all six:
 *  1. schema — already enforced by the structured output and the SDK's parse;
 *  2. the cards exist — both names resolve in the catalog;
 *  3. the cut is real — in this deck, and not a commander;
 *  4. the add is legal — `validateCardForDeck`, the add path's own rule (commander-legal, inside
 *     the colour identity, not a commander), and not already in the deck;
 *  5. the evidence exists — a cited game count matches the games read, a cited note is one the
 *     player wrote, a cited intent was stated;
 *  6. presentation — the text rules, on the rationale, the short rationale and every citation.
 *
 * Every drop is counted. Survivors are renumbered, so the card list has no holes.
 */
export type ResolvedCard = { oracleId: string; colorIdentity: string[]; commanderLegal: boolean };

export type ValidatedSuggestion = {
  addOracleId: string;
  cutOracleId: string;
  rationale: string;
  rationaleShort: string;
  evidence: TuningCitation[];
  position: number;
  /** Set after validation by the bracket flag; null when the swap moves no bracket. */
  bracketAfter: number[] | null;
};

/** Why a suggestion was dropped: a rule key the model was instructed with, or one of the
 *  structural checks no instruction covers. */
export type Drop = { position: number; rule: RuleKey | "cardExists" | "addNotLegal" | "duplicate" };

export function validateSuggestions(args: {
  response: TuningResponse;
  pack: EvidencePack;
  resolveName: (name: string) => ResolvedCard | null;
}): { kept: ValidatedSuggestion[]; droppedCount: number; drops: Drop[] } {
  const { response, pack, resolveName } = args;
  const inDeck = new Map(pack.cards.map((c) => [c.oracleId, c]));
  const notes = pack.play.games.flatMap((g) => (g.note === null ? [] : [g.note]));
  const [primary, partner] = pack.commanders;
  const deck = {
    commanderOracleId: primary?.oracleId ?? "",
    // The pack's identity is already the pair's union, which is what the rule measures against.
    commanderColorIdentity: pack.colorIdentity,
    partnerOracleId: partner?.oracleId ?? null,
    partnerColorIdentity: null,
    built: 0,
  };

  const kept: ValidatedSuggestion[] = [];
  const drops: Drop[] = [];
  const usedAdds = new Set<string>();
  const usedCuts = new Set<string>();

  response.suggestions.forEach((s, position) => {
    const reason = firstFailure(s);
    if (reason) {
      drops.push({ position, rule: reason });
      return;
    }
    const add = resolveName(s.add)!;
    const cut = resolveName(s.cut)!;
    usedAdds.add(add.oracleId);
    usedCuts.add(cut.oracleId);
    kept.push({
      addOracleId: add.oracleId,
      cutOracleId: cut.oracleId,
      rationale: s.rationale,
      rationaleShort: s.rationaleShort,
      evidence: s.evidence,
      position: kept.length,
      bracketAfter: null,
    });
  });

  return { kept, droppedCount: drops.length, drops };

  function firstFailure(s: TuningSuggestion): Drop["rule"] | null {
    const add = resolveName(s.add);
    const cut = resolveName(s.cut);
    if (!add || !cut) return "cardExists";

    const cutRow = inDeck.get(cut.oracleId);
    if (!cutRow || cutRow.commander) return "cutInDeck";

    const rejection = validateCardForDeck(add, deck);
    if (rejection === "off-color-identity") return "colourIdentity";
    if (rejection !== null || inDeck.has(add.oracleId) || add.oracleId === cut.oracleId) return "addNotLegal";
    // Two suggestions adding the same card, or cutting the same one, cannot both be applied.
    if (usedAdds.has(add.oracleId) || usedCuts.has(cut.oracleId)) return "duplicate";

    for (const c of s.evidence) {
      if (!citationHolds(c)) return "citation";
    }

    for (const text of [s.rationale, s.rationaleShort, ...s.evidence.map((c) => c.value)]) {
      const [broken] = presentationFailures(text, notes);
      if (broken) return broken;
    }
    return null;
  }

  function citationHolds(c: TuningCitation): boolean {
    const count = pack.play.summary.count;
    switch (c.kind) {
      case "games": {
        if (count === 0) return false;
        // Every `N of M games` in it must be about the games actually read.
        const figures = [...c.value.matchAll(/(\d+)\s+of\s+(\d+)\s+games?\b/gi)];
        if (figures.length === 0) return false;
        return figures.every((m) => Number(m[2]) === count && Number(m[1]) <= count);
      }
      case "note":
        return notes.some((n) => c.value.includes(n));
      case "intent":
        return pack.intent !== null;
      case "decklist":
        return true;
    }
  }
}
