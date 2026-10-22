// Strategy axes a deck leans on, read off the catalog alone: the card's front-face type line, its mana value and its
// keywords. No model call and no label. These are the archetypes the 30 label themes have no word for (artifacts,
// enchantments, equipment and Auras, vehicles, big creatures, one creature type), found missing when the label-theme
// score was validated on staging (boards/strategy-focus-research-2026-10-18.md, Validation).
//
// A deck's score on an axis is the research's `copies × ln(lift)`, where lift is the deck's share of the axis over a
// baseline's share of it. The baseline is a parameter: the whole catalog, or one commander's EDHREC average deck.
import { frontFaceTypeLine } from "@/lib/recs/faces";
import { CREATURE_TYPES } from "./creature-types.generated";

/** Copies on an axis below this score 0: a splash, not a plan (research §2). */
export const AXIS_FLOOR = 5;
/** `cards` holds no power, so a big creature is a creature of this mana value or more: a named proxy. */
export const BIG_CREATURE_MIN_MV = 6;
/** A deck reads at most this many creature types as typal axes. */
export const TYPAL_AXES = 3;
/** A baseline share under this is raised to it, so an axis a baseline never holds has a finite lift. */
export const BASELINE_FLOOR = 0.005;

export const FIXED_AXES = ["artifacts", "enchantments", "voltron", "vehicles", "bigCreatures"] as const;
export type FixedAxis = (typeof FIXED_AXES)[number];
/** `typal:<Type>`, the type as the type line spells it (`typal:Elf`). */
export type AxisKey = FixedAxis | `typal:${string}`;

/** One nonland card of a list. The caller drops lands. */
export type AxisCard = { typeLine: string; manaValue: number; keywords: readonly string[]; quantity: number };

type Parsed = { types: string; subtypes: string[] };

/** The front face, split at the em dash into its types and its subtypes. */
function parse(typeLine: string): Parsed {
  const [types, subs] = frontFaceTypeLine(typeLine).split("—");
  return { types: types.toLowerCase(), subtypes: subs ? subs.trim().split(/\s+/).filter(Boolean) : [] };
}

/** Scryfall's creature types, by their lower-cased spelling, and the most words any one of them has (`Time Lord`: 2). */
const CREATURE_TYPE_BY_LOWER = new Map(CREATURE_TYPES.map((t) => [t.toLowerCase(), t]));
const LONGEST_TYPE = Math.max(...CREATURE_TYPES.map((t) => t.split(" ").length));

/**
 * The creature types among a card's subtypes, longest match first, so `Time Lord Doctor` reads `Time Lord` and `Doctor`.
 * A subtype that is not a creature type (`Equipment`, `Aura`) is skipped: a creature or Kindred card can carry both.
 */
export function creatureTypesIn(subtypes: readonly string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < subtypes.length;) {
    let matched = 0;
    for (let n = Math.min(LONGEST_TYPE, subtypes.length - i); n >= 1 && matched === 0; n--) {
      const type = CREATURE_TYPE_BY_LOWER.get(subtypes.slice(i, i + n).join(" ").toLowerCase());
      if (type) {
        out.push(type);
        matched = n;
      }
    }
    i += matched || 1;
  }
  return out;
}

const isCreature = (p: Parsed) => /\bcreature\b/.test(p.types);
/** A creature, or a Kindred (formerly Tribal) card, carries creature types. */
const bearsCreatureTypes = (p: Parsed) => isCreature(p) || /\b(kindred|tribal)\b/.test(p.types);
const isChangeling = (c: AxisCard) => c.keywords.some((k) => k.toLowerCase() === "changeling");

/** The fixed axes one card counts toward. */
export function fixedAxesOf(card: AxisCard): FixedAxis[] {
  const p = parse(card.typeLine);
  const out: FixedAxis[] = [];
  if (/\bartifact\b/.test(p.types)) out.push("artifacts");
  if (/\benchantment\b/.test(p.types)) out.push("enchantments");
  if (p.subtypes.includes("Equipment") || p.subtypes.includes("Aura")) out.push("voltron");
  if (p.subtypes.includes("Vehicle")) out.push("vehicles");
  if (isCreature(p) && card.manaValue >= BIG_CREATURE_MIN_MV) out.push("bigCreatures");
  return out;
}

/**
 * Whether one card counts toward an axis: a fixed axis it is on, or a creature type it carries. A changeling carries every
 * type, as it joins every type a deck picks (`deckAxes`).
 */
export function onAxis(card: AxisCard, axis: AxisKey): boolean {
  if (!axis.startsWith("typal:")) return fixedAxesOf(card).includes(axis as FixedAxis);
  const p = parse(card.typeLine);
  if (!bearsCreatureTypes(p)) return false;
  return isChangeling(card) || creatureTypesIn(p.subtypes).includes(axis.slice("typal:".length));
}

/**
 * Copies per fixed axis, and copies per EVERY creature type the list carries (so a baseline can be looked up for any
 * type a deck picks). Changelings are held apart: they join a type only once a deck has picked it (`deckAxes`).
 */
export function axisCounts(cards: readonly AxisCard[]): { fixed: Map<FixedAxis, number>; types: Map<string, number>; changelings: number; total: number } {
  const fixed = new Map<FixedAxis, number>();
  const types = new Map<string, number>();
  let changelings = 0;
  let total = 0;
  for (const card of cards) {
    total += card.quantity;
    for (const axis of fixedAxesOf(card)) fixed.set(axis, (fixed.get(axis) ?? 0) + card.quantity);
    const p = parse(card.typeLine);
    if (!bearsCreatureTypes(p)) continue;
    if (isChangeling(card)) changelings += card.quantity;
    else for (const t of new Set(creatureTypesIn(p.subtypes))) types.set(t, (types.get(t) ?? 0) + card.quantity);
  }
  return { fixed, types, changelings, total };
}

/**
 * A deck's axes and their copies: every fixed axis, plus its top `TYPAL_AXES` creature types held by `AXIS_FLOOR`
 * copies or more (ranked by copies, ties by name), each then joined by the deck's changelings.
 */
export function deckAxes(counts: ReturnType<typeof axisCounts>): Map<AxisKey, number> {
  const out = new Map<AxisKey, number>(counts.fixed);
  const ranked = [...counts.types].filter(([, n]) => n >= AXIS_FLOOR).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  for (const [type, n] of ranked.slice(0, TYPAL_AXES)) out.set(`typal:${type}`, n + counts.changelings);
  return out;
}

/** A baseline's share of one axis, with changelings counted toward every type, and never under `BASELINE_FLOOR`. */
export function baselineShare(counts: ReturnType<typeof axisCounts>, axis: AxisKey): number {
  if (counts.total === 0) return BASELINE_FLOOR;
  const n = axis.startsWith("typal:")
    ? (counts.types.get(axis.slice("typal:".length)) ?? 0) + counts.changelings
    : (counts.fixed.get(axis as FixedAxis) ?? 0);
  return Math.max(n / counts.total, BASELINE_FLOOR);
}

/** `copies × ln(lift)`: 0 under the floor, and 0 where the deck leans no further than the baseline. */
export function axisScore(copies: number, deckTotal: number, share: number): number {
  if (copies < AXIS_FLOOR || deckTotal === 0) return 0;
  const lift = copies / deckTotal / Math.max(share, BASELINE_FLOOR);
  return lift > 1 ? copies * Math.log(lift) : 0;
}
