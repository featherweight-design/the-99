import { inArray } from "drizzle-orm";

import { db } from "../../db";
import { cards } from "../../db/schema";
import { castFaceText, isLandFace } from "../cards/facet";
import type { DeckProfile } from "../profile/types";
import { loadComboFacts } from "../synopsis/combo-facts";
import type { CutsPlan } from "../tuning/cuts-evidence";

const COLOURS = ["W", "U", "B", "R", "G"] as const;
const BASIC_TYPES = ["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"] as const;

/** The WUBRG letters a mana cost asks for. A hybrid pip counts both halves; Phyrexian and generic pips none. */
export function costColours(manaCost: string | null): string[] {
  if (!manaCost) return [];
  const found = new Set<string>();
  for (const [, pip] of manaCost.matchAll(/\{([^}]+)\}/g)) {
    for (const part of pip.split("/")) if ((COLOURS as readonly string[]).includes(part)) found.add(part);
  }
  return COLOURS.filter((c) => found.has(c));
}

/**
 * What Proposed cuts needs to know about the deck's PLAN (prompt v2): the combos it assembles or is
 * one card short of, the commander's text, and the colours the deck's spells actually ask for. The
 * combo read is the Overview's own (`loadComboFacts`); a failed read leaves both lists null and the
 * rest stands. Catalog data only: nothing a player typed.
 */
export async function readCutsPlan(
  profile: Pick<DeckProfile, "cards" | "commanderOracleIds" | "colours">,
): Promise<CutsPlan> {
  const ids = [...new Set(profile.cards.map((c) => c.oracleId))];
  const [rows, combos] = await Promise.all([
    ids.length === 0 ? [] : db
      .select({ id: cards.oracleId, name: cards.name, cost: cards.manaCost, text: cards.oracleText, layout: cards.layout })
      .from(cards).where(inArray(cards.oracleId, ids)),
    loadComboFacts(profile),
  ]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const commanders = new Set(profile.commanderOracleIds);
  const needs = new Map<string, string[]>();
  const counts = new Map<string, number>();
  const basics = new Map<string, number>();
  for (const c of profile.cards) {
    if (commanders.has(c.oracleId)) continue;
    if (isLandFace(c.typeLine)) {
      const type = BASIC_TYPES.find((t) => c.name === t || c.name === `Snow-Covered ${t}`);
      if (type) basics.set(type, (basics.get(type) ?? 0) + c.quantity);
      continue;
    }
    const colours = costColours(byId.get(c.oracleId)?.cost ?? null);
    if (colours.length === 0) continue;
    needs.set(c.oracleId, colours);
    for (const k of colours) counts.set(k, (counts.get(k) ?? 0) + c.quantity);
  }
  const commanderText = [...commanders].flatMap((id) => {
    const r = byId.get(id);
    const t = r ? castFaceText(r.text, r.layout) : null;
    return r && t ? [`${r.name}: ${t.replace(/\s*\n\s*/g, " / ")}`] : [];
  });
  return {
    combos: combos?.combos ?? null,
    nearCombos: combos?.nearCombos ?? null,
    commanderText,
    colourNeeds: COLOURS.flatMap((colour) => (counts.has(colour) ? [{ colour, cards: counts.get(colour)! }] : [])).sort((a, b) => b.cards - a.cards),
    basics: BASIC_TYPES.flatMap((type) => (basics.has(type) ? [{ type, count: basics.get(type)! }] : [])),
    needs,
  };
}
