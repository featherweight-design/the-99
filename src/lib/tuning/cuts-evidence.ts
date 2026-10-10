import { deckDescriptionCopy } from "../copy/deck-description";
import { playerText } from "../model/player-text";
import type { MixRole } from "../decks/mix";
import type { BracketFlag, CardCutFacts, CutFacts, MissingSignal, RoleFact } from "./cuts";

/**
 * The evidence a Proposed cuts call is built from. Pure and client-safe. The facts are passed
 * through as counted figures with NO ranking and NO score: cards stay in the deck's own order, so
 * nothing anchors the model on an engine order. Ownership and price are never in the pack.
 *
 * Optional fields are ABSENT when they do not apply, so the prompt and the validator read presence.
 * A commander or locked card is already absent from `facts.cards`.
 */
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
};

export type CutsPack = {
  over: number;
  commander: string;
  /** Names. Never cut. */
  keyCards: string[];
  /** The player's words as a ready-to-embed `playerText` block, plus the raw text the validator quotes against. */
  intent: { raw: string; block: string } | null;
  missing: MissingSignal[];
  support: { deckCount: number | null; listed: number } | null;
  roles: RoleFact[];
  curve: { cmc: number; have: number; average: number }[] | null;
  brackets: { flag: BracketFlag; cards: string[] }[];
  cards: CutsPackCard[];
};

const round1 = (n: number) => Math.round(n * 10) / 10;

function packCard(c: CardCutFacts, text: string | undefined): CutsPackCard {
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
  };
}

export function buildCutsPack(input: {
  facts: CutFacts;
  commanderName: string;
  keyCards: string[];
  intent: string | null;
  /** Oracle text by oracle id, for the cards that should carry it. */
  texts?: ReadonlyMap<string, string>;
}): CutsPack {
  const { facts, commanderName, keyCards, intent, texts } = input;
  return {
    over: facts.over,
    commander: commanderName,
    keyCards: [...keyCards],
    intent: intent === null ? null : {
      raw: intent,
      block: playerText("What the deck is for, in the player's own words", intent, deckDescriptionCopy.description.maxLength),
    },
    missing: facts.missing,
    support: facts.support,
    roles: facts.roles,
    curve: facts.curve ? facts.curve.map((b) => ({ cmc: b.cmc, have: b.have, average: round1(b.average) })) : null,
    brackets: facts.brackets.map((b) => ({ flag: b.flag, cards: b.cards.map((c) => c.name) })),
    cards: facts.cards.map((c) => packCard(c, texts?.get(c.oracleId))),
  };
}
