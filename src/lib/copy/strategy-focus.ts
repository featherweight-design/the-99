/**
 * Strategy focus (handoff `design/design_handoff_the99_strategy_focus/`): the name each strategy goes by on the ring's
 * legend, the focus line and Suggested changes' focus chip. Title case, because a legend row is a name. Names the handoff
 * draws (Tokens, Spells matter, +1/+1 counters, Equipment and Auras, Creatures costing 6+) are taken as drawn; the rest
 * through /copy-review.
 */
import type { LabelTheme } from "../labels/types";
import type { FixedAxis } from "../strategy/axes";
import type { StrategyKey } from "../strategy/score";

const THEME_NAMES: Record<LabelTheme, string> = {
  counters: "+1/+1 counters", pump: "Pump", haste: "Haste", evasion: "Evasion", etbDraw: "Draw on arrival",
  draw: "Card draw", tokens: "Tokens", treasure: "Treasure", protection: "Protection", recursion: "Recursion",
  blink: "Blink", finisher: "Finishers", castFree: "Free spells", mill: "Mill", sacOutlet: "Sacrifice outlets",
  deathTrigger: "Death triggers", lifegain: "Life gain", drain: "Drain", spellslinger: "Spells matter",
  landfall: "Landfall", tribal: "Creature types", graveyardHate: "Graveyard hate", discard: "Discard", stax: "Stax",
  clones: "Clones", theft: "Theft", poison: "Poison", goad: "Goad", doublers: "Doublers", fog: "Fogs",
};

const AXIS_NAMES: Record<FixedAxis, string> = {
  artifacts: "Artifacts", enchantments: "Enchantments", voltron: "Equipment and Auras", vehicles: "Vehicles",
  bigCreatures: "Creatures costing 6+",
};

/** Plurals the endings rules below get wrong. Unchanged in the plural: listed as themselves. */
const IRREGULAR: Record<string, string> = {
  Dwarf: "Dwarves", Elf: "Elves", Wolf: "Wolves", Werewolf: "Werewolves", Fungus: "Fungi", Homunculus: "Homunculi",
  Pegasus: "Pegasi", Cyclops: "Cyclopes", Cyberman: "Cybermen", Mouse: "Mice", Ox: "Oxen", Child: "Children",
  Hero: "Heroes",
  Djinn: "Djinn", Efreet: "Efreet", Elk: "Elk", Kor: "Kor", Vedalken: "Vedalken", Nephilim: "Nephilim", Bison: "Bison",
  Squid: "Squid", Naga: "Naga", Azra: "Azra", Surrakar: "Surrakar", Aurochs: "Aurochs", Astartes: "Astartes",
  Custodes: "Custodes", Fish: "Fish", Jellyfish: "Jellyfish", Starfish: "Starfish", Sheep: "Sheep", Samurai: "Samurai",
  Thalakos: "Thalakos", Drix: "Drix", Primarch: "Primarchs", Yeti: "Yetis",
};

/** A creature type as a legend names its deck: `Elf` → `Elves`, `Merfolk` → `Merfolk`, `Time Lord` → `Time Lords`. */
export function creatureTypePlural(type: string): string {
  const irregular = IRREGULAR[type];
  if (irregular) return irregular;
  if (/(folk|kin|born|i)$/.test(type)) return type; // Eldrazi, Dauthi, Soltari
  if (/[^aeiou]y$/.test(type)) return `${type.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/.test(type)) return `${type}es`;
  return `${type}s`;
}

/** A strategy's name, as the legend, the focus line and the focus chip write it. */
export function strategyName(key: StrategyKey): string {
  if (key.startsWith("typal:")) return creatureTypePlural(key.slice("typal:".length));
  return key in AXIS_NAMES ? AXIS_NAMES[key as FixedAxis] : THEME_NAMES[key as LabelTheme];
}

/**
 * The strategy block on Analysis. The heading and sub are Hugh's (README, Copy); the rest are the handoff's placeholders,
 * through /copy-review.
 */
export const strategyFocusCopy = {
  heading: "The deck’s strategy",
  sub: "The themes your deck is built around and how many cards support each strategy.",
  kicker: "Pick a focus",
  /** A legend row's count: the committed count, then what changed since the last commit. */
  cards: (n: number) => (n === 1 ? "card" : "cards"),
  /** Marks the focus's own row when its strategy is outside the top five. */
  outsideTop: "your focus",
  focusLine: { lead: "Focus", tail: ": Suggested changes builds toward it." },
  keepBalanced: "Keep it balanced",
  noFocus: "No focus yet. Pick one and Suggested changes will build toward it.",
  /** Read aloud for the ring, which is drawn for the eye alone. */
  ringLabel: (names: string[]) => `Strategies by card count: ${names.join(", ")}.`,
  refused: "That didn’t save. Try again.",
  none: {
    lead: "No strategy stands out yet.",
    body: "One shows here once five or more cards share a theme, a type or a creature type more often than Commander cards do overall. Until then Suggested changes keeps the deck balanced.",
  },
  tooSmall: {
    lead: "Too early to read.",
    body: (nonland: number) => `The deck’s strategy shows once it has 30 cards besides lands. This one has ${nonland}.`,
  },
};
