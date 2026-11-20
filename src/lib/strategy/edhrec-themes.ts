// A deck's strategy focus as EDHREC theme slugs (engine plan A4, orchestrator ruling 1, 2026-11-20):
// the Top picks shelf reads the commander's stored theme page for the build the player chose. Our
// focus keys are our own vocabulary (label themes, type-line axes, `typal:<Type>`), not EDHREC's, so
// this map is hand-kept. A slug the commander has no tag for is ignored (`themeSlugsFor`), so a key
// may name every EDHREC tag that means it; a key mapping to nothing keeps the commander page.
import { creatureTypePlural } from "../copy/strategy-focus";
import type { StrategyKey } from "./score";

const FOCUS_SLUGS: Readonly<Record<string, readonly string[]>> = {
  counters: ["plus-1-plus-1-counters", "counters"],
  tokens: ["tokens"],
  treasure: ["treasure"],
  blink: ["blink", "flicker"],
  recursion: ["reanimator"],
  // Milling opponents. Not `self-mill`, whose cards fill your own graveyard.
  mill: ["mill"],
  sacOutlet: ["aristocrats", "sacrifice"],
  deathTrigger: ["aristocrats"],
  drain: ["aristocrats"],
  lifegain: ["lifegain"],
  spellslinger: ["spellslinger"],
  landfall: ["landfall", "lands-matter"],
  discard: ["discard"],
  stax: ["stax"],
  theft: ["theft"],
  poison: ["infect", "poison"],
  goad: ["goad"],
  clones: ["clones"],
  // Not `wheels`: a wheel's high inclusion among wheel decks would crowd out draw engines.
  draw: ["card-draw"],
  artifacts: ["artifacts"],
  enchantments: ["enchantments", "enchantress"],
  voltron: ["voltron", "equipment", "auras"],
  vehicles: ["vehicles"],
};

/** The EDHREC slugs a focus key names: the map's, or a creature type's plural (`typal:Dragon` → `dragons`). */
export function focusThemeSlugs(focus: StrategyKey | null): string[] {
  if (focus === null) return [];
  if (focus.startsWith("typal:")) return [creatureTypePlural(focus.slice("typal:".length)).toLowerCase().replace(/\s+/g, "-")];
  return [...(FOCUS_SLUGS[focus] ?? [])];
}
