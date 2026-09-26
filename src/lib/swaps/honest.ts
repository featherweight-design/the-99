/**
 * What a card REALLY does for this deck, for matching one card against another on the stand-ins sheet
 * (close-out E1, from Hugh's staging walk). The coarse labels `classifyRoles` and `cardThemes` give say what
 * a card's text mentions; two failures made a stand-in look like a match when it is not:
 *
 * - A RESTRICTION. Bejeweled Warg's counter goes only on "target Wolf you control", worth nothing in a
 *   Dinosaur deck, and still read as `+1/+1 counters`. An ability limited to a creature type the deck does
 *   not play (its key type, `keyCreatureType`) does not count as any job here, role or theme. The sweep for
 *   other "X you control" / "target X" limits over the commander-legal catalog (2026-09-26): most name a
 *   card type every deck plays (creature, artifact, land, enchantment); 1,430 cards name a creature type,
 *   which this reads; and about 220 name a NONCREATURE subtype (Equipment 81, Vehicle 63, Aura 46, Shrine
 *   25, Gate 15, Saga 9, Desert 4). d9 ruled those the same bug (a Gate payoff in a deck with no Gates),
 *   at N = 1: such a line does its job only when the deck holds at least one card of that subtype, or
 *   makes it as a token (a Treasure payoff in a deck of Treasure makers). No larger N: it would be a
 *   number nobody measured.
 * - RAMP IS FOUR JOBS. Runadi taps for {G} every turn; Warg makes a Treasure on combat damage. Both read as
 *   `ramp`, so the tap-for-mana the swap loses never showed. A stand-in keeps ramp only in a kind it shares.
 *
 * Pure: the sheet's ranking (`rankStandIns`) calls it with the catalog's creature types and the deck's key.
 */
import { frontFaceOracle } from "../recs/faces";
import { classifyRoles, type Role } from "../recs/roles";
import { cardThemes, type Theme } from "../recs/themes";

/**
 * The kinds of ramp (E1 ruling b, and d9's option 1 for the fourth): mana every turn from a permanent's own
 * ability; a land put onto the battlefield from the library; a Treasure token, once or on a condition; and
 * mana added once by a source that is used up doing it (Lotus Petal, Dark Ritual, Generator Servant, a Gold
 * token). `tapsForMana` is repeatable mana from a permanent's own ability, which firebending's is too.
 */
export type RampKind = "tapsForMana" | "fetchesLand" | "makesTreasure" | "burstMana";

/** A spell's jobs with `ramp` read as its kinds, which is what a stand-in has to share. */
export type SwapRole = Exclude<Role, "land" | "ramp"> | RampKind;

export type HonestCard = { name: string; typeLine: string; oracleText: string | null; keywords: string[] };

/**
 * What a deck plays, for reading a limited line. Null reads no deck: no key type, so a line limited to a
 * creature type does no job, and no subtype list, so a line limited to a noncreature subtype is read as a
 * job (the measure's reading, which has no deck).
 */
export type DeckLens = {
  /** The deck's key creature type (`keyCreatureType`), or null when it plays none in numbers. */
  keyType: string | null;
  /** Whether a word is a noncreature subtype the catalog prints (Equipment, Gate, Treasure). */
  isSubtype: (word: string) => boolean;
  /** The noncreature subtypes the deck holds or makes, without the card being replaced (`heldSubtypes`). */
  held: ReadonlySet<string>;
};

/**
 * A mana token's reminder is the TOKEN's ability, not the card's: a Treasure's "{T}, Sacrifice this token: Add
 * one mana" would read every Treasure maker as a mana tapper. Every other reminder stays, because for a
 * keyword it is the only text the ability has: cycling's draw, firebending's mana (measured: stripping them
 * all left Titanoth Rex, Iroh and Akroma's Blessing with no job at all on Hugh's decks).
 */
const stripManaTokenReminders = (text: string) =>
  text.replace(/\([^)]*\)/g, (r) => (/\badd\b/i.test(r) && /\b(token|artifact with)\b/i.test(r) ? "" : r));

/**
 * A capitalized word, or a LIST of them: `Wolf or Dinosaur`, `Elves, Goblins, and Dinosaurs`. A line limited to
 * a list is usable when any item in it is (review, #1037 round 2: a single word read `target Wolf or Dinosaur
 * you control` as Wolf alone).
 */
const LIST = String.raw`([A-Z][a-z]+(?:(?:,? (?:or|and) |, )[A-Z][a-z]+)*)`;
const items = (list: string) => list.split(/,? (?:or|and) |, /);

/** The words a line limits itself to, in the card's own case: `target Wolf you control`, `Other Elves`. */
const RESTRICTING = [
  new RegExp(String.raw`\b${LIST} you control\b`, "g"),
  new RegExp(String.raw`\btarget ${LIST}\b`, "g"),
  new RegExp(String.raw`\b[Oo]ther ${LIST}\b`, "g"),
  new RegExp(String.raw`\b[Ee]ach (?:other )?${LIST}\b`, "g"),
  new RegExp(String.raw`\b${LIST} spells?\b`, "g"),
  // `Elf Warrior creature token` is what a line MAKES, not what it is limited to.
  new RegExp(String.raw`\b${LIST} creatures?\b(?! tokens?\b)`, "g"),
];

/** The singulars a captured word may be, for a type list of singulars (`Elves` is `Elf`). */
function singulars(word: string): string[] {
  if (word.endsWith("ves")) return [word.slice(0, -3) + "f", word];
  if (word.endsWith("s")) return [word.slice(0, -1), word];
  return [word];
}

/**
 * Whether a line is limited to cards the deck does not play. A creature type: it names at least one and
 * none is the deck's key (a deck with no key type plays no type in numbers). A noncreature subtype: it
 * names one the deck neither holds nor makes (d9's N = 1).
 */
export function offTypeLine(line: string, isCreatureType: (word: string) => boolean, deck: DeckLens | null): boolean {
  const named = new Set<string>();
  for (const pattern of RESTRICTING) {
    for (const m of line.matchAll(pattern)) {
      const words = items(m[1]);
      const types = words.flatMap((w) => singulars(w).find(isCreatureType) ?? []);
      if (types.length > 0) { for (const t of types) named.add(t); continue; }
      // A subtype list does its job when the deck holds or makes any one of them.
      const subtypes = deck ? words.flatMap((w) => singulars(w).find(deck.isSubtype) ?? []) : [];
      if (subtypes.length > 0 && !subtypes.some((s) => deck!.held.has(s))) return true;
    }
  }
  return named.size > 0 && (!deck?.keyType || !named.has(deck.keyType));
}

/** A token a line makes: `create a Treasure token`, `create X Food tokens`, `a Clue, Food, or Treasure token`. */
const MAKES_TOKEN = new RegExp(String.raw`\b[Cc]reates? [^.]*?\b${LIST} (?:artifact )?tokens?\b`, "g");

/** The noncreature subtypes a set of cards holds on their front faces or makes as tokens. */
export function heldSubtypes(cards: readonly { typeLine: string; oracleText: string | null }[]): Set<string> {
  const held = new Set<string>();
  for (const c of cards) {
    const sub = c.typeLine.split(" // ")[0].split(" — ")[1];
    for (const w of sub ? sub.trim().split(/\s+/) : []) held.add(w);
    for (const m of stripManaTokenReminders(frontFaceOracle(c.oracleText)).matchAll(MAKES_TOKEN)) for (const w of items(m[1])) held.add(w);

  }
  return held;
}

/** The card's front-face lines this deck can use: reminders out, the card's own name read as `this`. */
function usableText(card: HonestCard, isCreatureType: (word: string) => boolean, deck: DeckLens | null): string {
  const front = stripManaTokenReminders(frontFaceOracle(card.oracleText));
  const name = card.name.split(" // ")[0];
  const own = name ? front.split(name).join("this") : front;
  return own.split("\n").filter((line) => !offTypeLine(line, isCreatureType, deck)).join("\n");
}

/** An ability that adds mana. Wider than `classifyRoles`, so every card it calls ramp has a kind. */
const ADDS = /\badds? (\{[wubrgcsx0-9/]+\}|one|two|three|four|five|x\b|an amount|that much|mana|an additional)/;
const FETCHES = /search your library for .{0,40}land .{0,60}onto the battlefield/;
const TREASURE = /\bcreates? [^.]*\btreasures?\b/;
/** Gold is sacrificed for its mana (a burst); a Powerstone taps for it every turn. */
const GOLD = /\bcreates? [^.]*\bgold tokens?\b/;
const POWERSTONE = /\bcreates? [^.]*\bpowerstone tokens?\b/;

/** The ramp kinds in the card's usable text. */
export function rampKinds(text: string, typeLine: string): Set<RampKind> {
  const kinds = new Set<RampKind>();
  const oneShotSpell = /\b(instant|sorcery)\b/i.test(typeLine.split(" // ")[0]);
  for (const line of text.toLowerCase().split("\n")) {
    if (FETCHES.test(line)) kinds.add("fetchesLand");
    if (TREASURE.test(line)) kinds.add("makesTreasure");
    if (GOLD.test(line)) kinds.add("burstMana");
    if (POWERSTONE.test(line)) kinds.add("tapsForMana");
    if (!ADDS.test(line)) continue;
    const colon = line.indexOf(":");
    const cost = colon >= 0 && colon < line.search(ADDS) ? line.slice(0, colon) : "";
    // Used up doing it: a spell, a cost that sacrifices the SOURCE (its own name reads as `this`), or an
    // entering trigger that fires once. Sacrificing something else (Ashnod's Altar) repeats (review, round 4).
    const consumed = oneShotSpell || /\bsacrifice this\b/.test(cost) || /^when [^.,]* enters\b/.test(line);
    kinds.add(consumed ? "burstMana" : "tapsForMana");
  }
  return kinds;
}

/**
 * A spell's jobs and themes for THIS deck: lines limited to a type the deck does not play left out, and
 * ramp read as its kinds.
 */
export function honestJobs(
  card: HonestCard,
  isCreatureType: (word: string) => boolean,
  deck: DeckLens | null,
): { roles: SwapRole[]; themes: Theme[] } {
  const text = usableText(card, isCreatureType, deck);
  const coarse = classifyRoles({ ...card, oracleText: text });
  // Ramp is read here rather than off `classifyRoles`, whose ramp test found Treasure makers only through
  // the Treasure's own reminder text ("Add one mana"), which is not an ability and is stripped above.
  const roles: SwapRole[] = [
    ...coarse.filter((r): r is Exclude<Role, "land" | "ramp"> => r !== "land" && r !== "ramp"),
    ...(coarse.includes("land") ? [] : rampKinds(text, card.typeLine)),
  ];
  const themes = cardThemes({ typeLine: card.typeLine, oracleText: text }, isCreatureType);
  // A Treasure maker's `treasure` theme is the same fact as its ramp kind: one job, named once.
  return { roles, themes: roles.includes("makesTreasure") ? themes.filter((t) => t !== "treasure") : themes };
}
