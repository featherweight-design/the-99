import { colorLabel } from "../decks/format";
import type { DeckProfile } from "../profile/types";
import { CATEGORIES, type Category } from "./types";
import { comboFacts, deckStatsFact, type ComboFact, type DeckStatsFact, type NearComboFact } from "./facts-extra";

/**
 * What the synopsis is written from and checked against. Pure: the profile is the stored
 * analysis, and the oracle texts are a lookup the generator makes beside it.
 *
 * THE FIGURES ARE THE APP'S (brief §6). The model is handed the mulligan's counts and asked to
 * phrase them, never to count; the validator then refuses a Mulligan line quoting any numeral
 * that is not one of `figures`.
 */

export type FactCard = {
  oracleId: string;
  name: string;
  typeLine: string;
  quantity: number;
  categories: Category[];
  oracleText: string | null;
  /** Mana value. Optional so facts stored before it existed still read. */
  manaValue?: number;
  /** A universal staple (`src/lib/staples/universal.ts`): never a Key card (Hugh, 2026-09-24). */
  universalStaple?: boolean;
};

export type SynopsisFacts = {
  commanders: string[];
  /** WUBRG order, as the profile holds it. */
  identity: string[];
  /** The identity's name (Gruul, Sultai, Non-green, Colorless), which the prose uses in place of
   *  mana letters. `colorLabel`, the app's one naming. Optional only so facts stored before it
   *  existed (the eval harness's runs) still read: `identityNameOf` names them the same way. */
  identityName?: string;
  /** Colours the deck's costs ask for that no land produces. Named, never counted. */
  unproducible: string[];
  /** `counts.landCapable`: a modal double-faced land is a land drop. */
  lands: number;
  ramp: number;
  /** The keepable land count for an opening seven, inclusive. */
  keep: { low: number; high: number };
  /**
   * The land counts a hand is sent back at: none, one short of the keepable range, and one past
   * it. Computed from `keep` as surely as `keep` is, and the complement is how a player says it
   * ("send back 0 or 1 lands", "5 or more").
   */
  sendBack: { none: 0; under: number; over: number };
  /** Each commander's mana value, in `commanders` order: "castable by turn three". */
  commanderManaValues: number[];
  /** Every numeral a Mulligan line may quote. */
  figures: number[];
  cards: FactCard[];
  /** v2 (plan section 11.1): the combos this deck assembles. Absent on facts built before it. */
  combos?: ComboFact[];
  /** v2: combos one card short, named so the model does not claim them. */
  nearCombos?: NearComboFact[];
  /** v2: ramp, the commander's expected cast turn, interaction by speed and cost. */
  stats?: DeckStatsFact;
};

/** The identity's name, for facts built before `identityName` existed as well as after. */
export function identityNameOf(facts: Pick<SynopsisFacts, "identity" | "identityName">): string {
  return facts.identityName ?? colorLabel(facts.identity);
}

/** The opening hand. Quotable in a Mulligan line ("a seven-card hand"). */
export const HAND_SIZE = 7;
const LIBRARY = 99;

/**
 * The keepable land range for an opening seven. With `e = 7·L/99`, the expected lands in seven,
 * it is `[max(2, floor(e) − 1), min(5, ceil(e) + 1)]`: at 36 lands, 2–4. A stated rule rather
 * than a model's judgement, because the brief makes the Mulligan's counts the app's.
 */
export function keepableLands(lands: number): { low: number; high: number } {
  const e = (HAND_SIZE * lands) / LIBRARY;
  // Both ends inside 2–5, whatever the land count: a deck of nearly all lands would otherwise
  // push the low end past the high cap.
  const low = Math.min(5, Math.max(2, Math.floor(e) - 1));
  const high = Math.max(low, Math.min(5, Math.ceil(e) + 1));
  return { low, high };
}

/** Every card's categories, from the classifications the profile already holds. */
export function categoriesOf(profile: DeckProfile): Map<string, Set<Category>> {
  const out = new Map<string, Set<Category>>();
  const add = (oracleId: string, c: Category) => {
    const set = out.get(oracleId) ?? new Set<Category>();
    set.add(c);
    out.set(oracleId, set);
  };
  for (const [role, cards] of Object.entries(profile.roles.cards)) {
    if (!(CATEGORIES as readonly string[]).includes(role)) continue;
    for (const card of cards) add(card.oracleId, role as Category);
  }
  for (const t of profile.brackets.comboReach.tutors) add(t.oracleId, "tutor");
  for (const combo of profile.brackets.twoCardCombos) for (const c of combo.cards) add(c.oracleId, "combo");
  for (const id of profile.commanderOracleIds) add(id, "commander");
  return out;
}

export function buildSynopsisFacts(
  profile: DeckProfile,
  oracleTexts: ReadonlyMap<string, string | null>,
  universal: ReadonlySet<string> = new Set(),
  nearCombos: NearComboFact[] = [],
): SynopsisFacts {
  const cats = categoriesOf(profile);
  const byId = new Map(profile.cards.map((c) => [c.oracleId, c]));
  const lands = profile.counts.landCapable;
  const ramp = profile.roles.counts.ramp;
  const keep = keepableLands(lands);
  const sendBack = { none: 0 as const, under: keep.low - 1, over: keep.high + 1 };
  const commanderManaValues = profile.commanderOracleIds
    .map((id) => byId.get(id)?.cmc)
    .filter((n): n is number => typeof n === "number");
  const factCards: FactCard[] = profile.cards.map((c) => ({
    oracleId: c.oracleId,
    name: c.name,
    typeLine: c.typeLine,
    quantity: c.quantity,
    manaValue: c.cmc,
    categories: CATEGORIES.filter((k) => cats.get(c.oracleId)?.has(k)),
    oracleText: oracleTexts.get(c.oracleId) ?? null,
    universalStaple: universal.has(c.oracleId),
  }));
  return {
    commanders: profile.commanderOracleIds.map((id) => byId.get(id)?.name).filter((n): n is string => !!n),
    identity: profile.colours.identity,
    identityName: colorLabel(profile.colours.identity),
    unproducible: profile.colours.unproducible,
    lands,
    ramp,
    keep,
    sendBack,
    commanderManaValues,
    // A turn is quoted by the mana value it casts on ("by turn three"), so the mana values are the
    // turn figures too; nothing else here is a turn.
    figures: [...new Set([
      HAND_SIZE, lands, ramp, keep.low, keep.high,
      sendBack.none, sendBack.under, sendBack.over, ...commanderManaValues,
    ])].sort((a, b) => a - b),
    cards: factCards,
    combos: comboFacts(profile),
    nearCombos,
    stats: deckStatsFact(ramp, commanderManaValues, factCards),
  };
}

/**
 * The form two names are compared in: case, curly apostrophes and quotes, and runs of space do
 * not make two names different cards.
 */
export function normalizeName(name: string): string {
  return name
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Every name a deck card may be written as: its full name, and for a two-faced card each face
 * (`Fire // Ice` answers to `Fire` and to `Ice`). A full name always wins over a face. A face
 * name shared by two deck cards resolves to neither, since the mark could mean either.
 */
export function deckNameIndex(cards: readonly Pick<FactCard, "oracleId" | "name">[]): Map<string, { oracleId: string; name: string }> {
  const out = new Map<string, { oracleId: string; name: string }>();
  for (const c of cards) out.set(normalizeName(c.name), { oracleId: c.oracleId, name: c.name });
  const faces = new Map<string, { oracleId: string; name: string } | null>();
  for (const c of cards) {
    const parts = c.name.split(" // ");
    if (parts.length < 2) continue;
    for (const f of parts) {
      const key = normalizeName(f);
      if (out.has(key)) continue;
      const prior = faces.get(key);
      faces.set(key, prior === undefined || prior?.oracleId === c.oracleId ? { oracleId: c.oracleId, name: c.name } : null);
    }
  }
  for (const [key, card] of faces) if (card) out.set(key, card);
  return out;
}
