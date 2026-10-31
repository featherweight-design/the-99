import { deckCutsCopy } from "../copy/deck-cuts";
import type { ChipContext } from "./cuts-count";
import { playerTextBody } from "../model/player-text";
import type { CutsPack, CutsPackCard } from "./cuts-evidence";
import type { CutCite, CutProposal, CutsResponse } from "./cuts-schema";
import { presentationFailures, type RuleKey } from "./presentation";

/**
 * What the model is NOT trusted about in a Proposed cuts reply. Pure and client-safe; the catalog
 * lookup is injected as `resolveName`. A cut is dropped, with a named reason and never repaired, only
 * when the CARD is not a valid cut (not a card, not in the deck, a Key card, a repeat). A cut is the
 * player's call even when no option is ideal, so a claim the facts do not support does not drop the
 * cut: the unverifiable claim goes, the cites that held stay, and a cut left with none of its own
 * words shows the deck's own counts for the card instead (`softened` in the report). Survivors are
 * kept in the model's order up to the cuts the run names (`pack.named`); beyond it is `tooMany`.
 */
export type CutDropRule =
  | "cardExists" | "notInDeck" | "keyCard" | "duplicate" | "tooMany" | "citeMismatch"
  | Extract<RuleKey, "noBracketClaim" | "noResultClaim" | "quotedNote">;

export type CutDrop = { position: number; rule: CutDropRule; name?: string; cite?: CutCite["kind"] };

/**
 * A cut kept without something the model said of it: `cite` names the kind of cite that failed and
 * `failed` the cite itself, as the model wrote it; `rule` the text rule that did.
 */
export type CutSoftened = { position: number; name: string; rule: "citeMismatch" | Extract<CutDropRule, "noBracketClaim" | "noResultClaim" | "quotedNote">; cite?: CutCite["kind"]; failed?: CutCite };

export type ValidatedCut = { oracleId: string; name: string; reason: string; cites: CutCite[]; position: number };

export type CutsReport = {
  askedCount: number; survivedCount: number; keptCount: number;
  /** The cuts the deck NEEDED from the run (up to MAX_CUTS_PER_RUN). Before prompt v5 a run named exactly this many. */
  over: number;
  /** The cuts the run was asked to NAME (`cutsNamed`). Absent on a run from before v5, which named `over`. */
  named?: number;
  drops: CutDrop[];
  /** Cuts kept with their reason or a cite removed. Absent on a run from before cuts were kept this way. */
  softened?: CutSoftened[];
  /** The figures the chips quote, as they stood when the validator checked the cites. Stored with the
   *  run so a cut made from the result does not change the evidence of the lines still open. */
  chips?: ChipContext;
};

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
    // "none" is a claim about the deck's combos, so it needs the combo read to have succeeded. The
    // membership is read before the prompt's lists are capped, so it holds for a deck at the cap too.
    case "combo":
      return cite.state === "none"
        ? !!pack.plan?.comboPieces && card.comboState === undefined
        : card.comboState === cite.state;
    case "cost": return card.mv === cite.mv;
    case "tapped": return card.entersTapped !== undefined;
    case "colour": return !!card.needs?.includes(cite.colour) && pack.plan?.colourNeeds.find((n) => n.colour === cite.colour)?.cards === cite.cards;
  }
}

/** The counts that are true of a card whatever the model said: its cost, its curve slot and its first role with a target. */
function ownCounts(card: CutsPackCard, pack: CutsPack): CutCite[] {
  const out: CutCite[] = [{ kind: "cost", mv: card.mv }];
  if (card.curve) out.push({ kind: "curve", cmc: card.curve.cmc, have: card.curve.have });
  const fact = pack.roles.find((r) => card.roles.includes(r.role));
  if (fact) out.push({ kind: "role", role: fact.role, have: fact.have, target: fact.target });
  return out;
}

type Soft = Omit<CutSoftened, "position" | "name">;
type Survivor = ValidatedCut & { at: number; soft?: Soft };

export function validateCuts(args: {
  reply: CutsResponse;
  pack: CutsPack;
  resolveName: (name: string) => { oracleId: string } | null;
}): { kept: ValidatedCut[]; dropped: CutDrop[]; report: CutsReport } {
  const { reply, pack, resolveName } = args;
  const inDeck = new Map(pack.cards.map((c) => [c.oracleId, c]));
  const keyIds = new Set(pack.keyCardIds);
  const quotable = pack.intent ? [{ text: playerTextBody(pack.intent.raw), date: null }] : [];
  const seen = new Set<string>();
  const survivors: Survivor[] = [];
  const dropped: CutDrop[] = [];

  reply.cuts.forEach((cut, position) => {
    const fail = check(cut);
    if ("rule" in fail) dropped.push({ position, name: cut.name, ...fail });
    else {
      seen.add(fail.oracleId);
      survivors.push({ ...fail, position: survivors.length, at: position });
    }
  });

  const kept: ValidatedCut[] = survivors.slice(0, pack.named).map(({ at: _at, soft: _soft, ...cut }) => cut);
  for (const extra of survivors.slice(pack.named)) dropped.push({ position: extra.at, rule: "tooMany", name: extra.name });
  const softened: CutSoftened[] = survivors.slice(0, pack.named).flatMap((s) => s.soft ? [{ position: s.at, name: s.name, ...s.soft }] : []);

  return {
    kept,
    dropped,
    report: { askedCount: reply.cuts.length, survivedCount: survivors.length, keptCount: kept.length, over: pack.ask, named: pack.named, drops: dropped, ...(softened.length > 0 ? { softened } : {}) },
  };

  function check(cut: CutProposal): Omit<Survivor, "position" | "at"> | { rule: CutDropRule } {
    const resolved = resolveName(cut.name);
    if (!resolved) return { rule: "cardExists" };
    const card = inDeck.get(resolved.oracleId);
    if (!card) return { rule: "notInDeck" };
    if (keyIds.has(card.oracleId)) return { rule: "keyCard" };
    if (seen.has(card.oracleId)) return { rule: "duplicate" };
    // The card is a valid cut. What the model SAID about it is checked next, and a claim the facts do not
    // support is removed rather than costing the player the cut.
    const holding = cut.cites.filter((c) => citeHolds(c, card, pack));
    const failedCite = cut.cites.find((c) => !citeHolds(c, card, pack));
    const { broken, text } = presentationFailures(cut.reason, quotable);
    const textFail = broken.find((r) => TEXT_RULES.has(r)) as Extract<CutDropRule, "noBracketClaim" | "noResultClaim" | "quotedNote"> | undefined;
    if (!failedCite && !textFail) return { oracleId: card.oracleId, name: card.name, reason: text, cites: cut.cites };
    // The words may lean on the claim that failed, and there is no telling which: they go with it.
    return {
      oracleId: card.oracleId, name: card.name, reason: deckCutsCopy.unchecked,
      cites: holding.length > 0 ? holding : ownCounts(card, pack),
      soft: failedCite ? { rule: "citeMismatch", cite: failedCite.kind, failed: failedCite } : { rule: textFail! },
    };
  }
}
