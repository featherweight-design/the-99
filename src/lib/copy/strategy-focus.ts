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
