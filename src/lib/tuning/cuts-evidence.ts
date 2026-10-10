import { deckDescriptionCopy } from "../copy/deck-description";
import { deckNameIndex, normalizeName } from "../synopsis/facts";
import { playerText } from "../model/player-text";
import type { MixRole } from "../decks/mix";
import { cutsAsk } from "./cuts-ask";
import type { BracketFlag, CardCutFacts, CutFacts, MissingSignal, RoleFact } from "./cuts";
import type { ComboFact, NearComboFact } from "../synopsis/facts-extra";

/**
 * The evidence a Proposed cuts call is built from. Pure and client-safe. The facts are passed
 * through as counted figures with NO ranking and NO score: cards stay in the facts' name order, so
 * nothing anchors the model on an engine order. Ownership and price are never in the pack.
 *
 * Optional fields are ABSENT when they do not apply, so the prompt and the validator read presence.
 * A commander or locked card is already absent from `facts.cards`.
 */
/**
 * The deck's PLAN, as facts (prompt v2). Hugh's ruling of 2026-10-10: the plan is the best signal for
 * a cut, then the card's quality against the alternatives. Read by `readCutsPlan` from the same
 * Spellbook-backed layer the Overview uses, plus the commander's text and the colours the deck
 * actually leans on. Every field is optional in effect: a read that failed leaves it out.
 */
export type CutsPlan = {
  /** Infinite or game-ending combos the deck assembles, as the Overview facts name them. Null when the read failed. */
  combos: ComboFact[] | null;
  /** The ones it is exactly one card short of. */
  nearCombos: NearComboFact[] | null;
  /** The commander's (and partner's) own text, "Name: text", for the engine it asks the deck to run. */
  commanderText: string[];
  /** Nonland cards in the 99 whose mana cost needs each colour, most first. */
  colourNeeds: { colour: string; cards: number }[];
  /** Basic lands the deck holds, by type. */
  basics: { type: string; count: number }[];
  /** The colours each nonland card's mana cost asks for. A colourless card is absent. */
  needs: ReadonlyMap<string, string[]>;
};

export type CutsPackCard = {
  oracleId: string;
  name: string;
  quantity: number;
  typeLine: string;
  /** Mana value. */
  mv: number;
  /** Oracle text, when the caller supplied it. Catalog data: no player can type it. */
  text?: string;
  roles: MixRole[];
  inclusion?: { pct: number } | "offList";
  roleSurplus?: RoleFact;
  opensGap?: MixRole;
  curve?: { cmc: number; have: number; average: number };
  flags?: BracketFlag[];
  /** Set when the card is a piece of a combo in `plan`: assembled, or the pieces held of one that is a card short. */
  comboState?: "assembled" | "oneShort";
  /** A land that enters tapped: always, or only under a condition (a check land, a fast land). */
  entersTapped?: "always" | "sometimes";
  /** The colours the card's mana cost asks for. */
  needs?: string[];
};

export type CutsPack = {
  over: number;
  /** The cuts this run asks for: `over`, up to `MAX_CUTS_PER_RUN`. */
  ask: number;
  commander: string;
  /** Names. Never cut. */
  keyCards: string[];
  /** The Key cards that are cut candidates, by oracle id: a Key card may be stored under one face
   *  name (`Fire` for `Fire // Ice`), so the validator compares ids, not spellings. */
  keyCardIds: string[];
  /** The player's words as a ready-to-embed `playerText` block, plus the raw text the validator quotes against. */
  intent: { raw: string; block: string } | null;
  missing: MissingSignal[];
  support: { deckCount: number | null; listed: number } | null;
  roles: RoleFact[];
  curve: { cmc: number; have: number; average: number }[] | null;
  brackets: { flag: BracketFlag; cards: string[] }[];
  cards: CutsPackCard[];
  /** The deck's plan; absent when the caller supplied none. */
  plan: CutsPlan | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** A land's tapped-ness from its text: "enters tapped" alone is always; any condition on it is sometimes. */
export function landEntersTapped(typeLine: string, text: string | undefined): "always" | "sometimes" | undefined {
  if (!/\bland\b/i.test(typeLine) || !text) return undefined;
  const sentences = text.split(/(?<=[.\n])\s*/).filter((t) => /enters( the battlefield)? tapped|enter tapped/i.test(t));
  if (sentences.length === 0) return undefined;
  const unconditional = sentences.some((t) => !/\b(unless|if you|you may pay|if a|if an|if there|if it)\b/i.test(t) && !/untapped/i.test(t));
  return unconditional ? "always" : "sometimes";
}

function packCard(c: CardCutFacts, text: string | undefined, plan: CutsPlan | null, comboCards: ReadonlyMap<string, "assembled" | "oneShort">): CutsPackCard {
  const tapped = landEntersTapped(c.typeLine, text);
  const needs = plan?.needs.get(c.oracleId);
  const comboState = plan ? comboCards.get(normalizeName(c.name)) : undefined;
  return {
    oracleId: c.oracleId,
    name: c.name,
    quantity: c.quantity,
    typeLine: c.typeLine,
    mv: c.cmc,
    ...(text ? { text } : {}),
    roles: c.roles,
    ...(c.inclusion ? { inclusion: c.inclusion.kind === "pct" ? { pct: round1(c.inclusion.pct) } : ("offList" as const) } : {}),
    ...(c.roleSurplus ? { roleSurplus: c.roleSurplus } : {}),
    ...(c.opensGap ? { opensGap: c.opensGap } : {}),
    ...(c.curve ? { curve: { cmc: c.curve.cmc, have: c.curve.have, average: round1(c.curve.average) } } : {}),
    ...(c.flags.length > 0 ? { flags: c.flags } : {}),
    ...(comboState ? { comboState } : {}),
    ...(tapped ? { entersTapped: tapped } : {}),
    ...(needs && needs.length > 0 ? { needs } : {}),
  };
}

/** Each combo piece the deck holds, by normalized name: assembled wins over one short. */
function comboPieces(plan: CutsPlan | null): Map<string, "assembled" | "oneShort"> {
  const out = new Map<string, "assembled" | "oneShort">();
  if (!plan) return out;
  for (const n of plan.nearCombos ?? []) for (const p of n.have.split(" + ")) out.set(normalizeName(p), "oneShort");
  for (const c of plan.combos ?? []) for (const p of c.pieces) out.set(normalizeName(p), "assembled");
  return out;
}

export function buildCutsPack(input: {
  facts: CutFacts;
  commanderName: string;
  keyCards: string[];
  intent: string | null;
  /** Oracle text by oracle id, for the cards that should carry it. */
  texts?: ReadonlyMap<string, string>;
  /** The deck's plan (prompt v2). */
  plan?: CutsPlan;
}): CutsPack {
  const { facts, commanderName, keyCards, intent, texts } = input;
  const plan = input.plan ?? null;
  const comboCards = comboPieces(plan);
  // Resolved as the overview's own validator resolves a Key card: case, spacing and curly quotes
  // folded, and a face answering for its card unless two cards share it.
  const byName = deckNameIndex(facts.cards);
  const keyCardIds = [...new Set(keyCards.flatMap((k) => { const hit = byName.get(normalizeName(k)); return hit ? [hit.oracleId] : []; }))];
  return {
    over: facts.over,
    ask: cutsAsk(facts.over),
    commander: commanderName,
    keyCards: [...keyCards],
    keyCardIds,
    intent: intent === null ? null : {
      raw: intent,
      block: playerText("What the deck is for, in the player's own words", intent, deckDescriptionCopy.description.maxLength),
    },
    missing: facts.missing,
    support: facts.support,
    roles: facts.roles,
    curve: facts.curve ? facts.curve.map((b) => ({ cmc: b.cmc, have: b.have, average: round1(b.average) })) : null,
    brackets: facts.brackets.map((b) => ({ flag: b.flag, cards: b.cards.map((c) => c.name) })),
    cards: facts.cards.map((c) => packCard(c, texts?.get(c.oracleId), plan, comboCards)),
    plan,
  };
}
