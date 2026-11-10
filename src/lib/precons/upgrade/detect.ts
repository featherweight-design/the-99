import type { EdhrecTag } from "../../edhrec/parse";
import { MAX_STRATEGIES, MIN_BACKING } from "./constants";

/**
 * The strategies a precon offers the player to pick from, from STORED data and no model call (Hugh, 2026-11-10): the
 * commander's EDHREC tags, matched to the deck's own cards by what the cards are and say, plus any plan the precon's
 * Overview already wrote. A strategy the deck cannot back with `MIN_BACKING` of its own cards is not offered. Pure.
 */

export type DeckCardFact = {
  oracleId: string;
  name: string;
  typeLine: string;
  oracleText: string | null;
  isCommander: boolean;
};

/** A plan the stored Overview already names, with the cards its evidence cites. The loader (PR 2) builds these from the Overview. */
export type OverviewPlan = { label: string; blurb: string; cardIds: readonly string[] };

export type Strategy = {
  /** Stable key for the pick: the tag slug, or `overview:<n>`. */
  key: string;
  label: string;
  /** One plain sentence on what the strategy does. Never model-written. */
  blurb: string;
  source: "edhrec" | "overview";
  /** The deck's own cards that support it, most relevant first by deck order; names come from the deck at the draw. */
  backingIds: string[];
};

type Matcher = { label: string; blurb: string; test: (c: DeckCardFact) => boolean };

const has = (c: DeckCardFact, re: RegExp) => re.test(c.oracleText ?? "");
const isType = (c: DeckCardFact, re: RegExp) => re.test(c.typeLine);

/** EDHREC theme slugs we can read off a card. A slug not here (and not a creature type, below) is never offered: no card test, no backing. */
const MATCHERS: Record<string, Matcher> = {
  artifacts: { label: "Artifacts", blurb: "Play many artifacts and reward each one.", test: (c) => isType(c, /Artifact/) || has(c, /\bartifacts?\b/i) },
  tokens: { label: "Tokens", blurb: "Make creature tokens and use them in numbers.", test: (c) => has(c, /\bcreate[s]?\b[^.]*\btokens?\b/i) || has(c, /\btokens?\b/i) },
  treasure: { label: "Treasure", blurb: "Make Treasure tokens for mana and payoffs.", test: (c) => has(c, /\bTreasure\b/) },
  counters: { label: "+1/+1 counters", blurb: "Put +1/+1 counters on creatures and grow them.", test: (c) => has(c, /\+1\/\+1 counters?/i) },
  "1-1-counters": { label: "+1/+1 counters", blurb: "Put +1/+1 counters on creatures and grow them.", test: (c) => has(c, /\+1\/\+1 counters?/i) },
  "-1-1-counters": { label: "-1/-1 counters", blurb: "Shrink creatures with -1/-1 counters.", test: (c) => has(c, /-1\/-1 counters?/i) },
  flying: { label: "Fliers", blurb: "Win in the air with evasive creatures.", test: (c) => has(c, /\bflying\b/i) },
  lifegain: { label: "Lifegain", blurb: "Gain life and turn it into advantage.", test: (c) => has(c, /\bgain[s]?\b[^.]*\blife\b/i) },
  sacrifice: { label: "Sacrifice", blurb: "Sacrifice permanents for value.", test: (c) => has(c, /\bsacrifice\b/i) },
  graveyard: { label: "Graveyard", blurb: "Fill the graveyard and use it.", test: (c) => has(c, /\bgraveyard\b/i) },
  reanimator: { label: "Reanimator", blurb: "Return big creatures from the graveyard.", test: (c) => has(c, /\bfrom (?:your|a|any) graveyard to the battlefield\b/i) },
  spellslinger: { label: "Spells", blurb: "Cast many instants and sorceries and reward each one.", test: (c) => isType(c, /Instant|Sorcery/) || has(c, /\binstant or sorcery\b/i) },
  enchantments: { label: "Enchantments", blurb: "Play many enchantments and reward each one.", test: (c) => isType(c, /Enchantment/) || has(c, /\benchantments?\b/i) },
  equipment: { label: "Equipment", blurb: "Equip creatures with Equipment.", test: (c) => isType(c, /Equipment/) || has(c, /\bequip(?:ped)?\b/i) },
  auras: { label: "Auras", blurb: "Enchant creatures with Auras.", test: (c) => isType(c, /Aura/) || has(c, /\bAura\b/) },
  voltron: { label: "Voltron", blurb: "Make one creature huge and win through it.", test: (c) => isType(c, /Equipment|Aura/) || has(c, /\bcommander damage\b|\bdouble strike\b|\btrample\b/i) },
  landfall: { label: "Landfall", blurb: "Play lands for a trigger each time.", test: (c) => has(c, /\blandfall\b|\bwhenever a land enters\b/i) },
  lands: { label: "Lands", blurb: "Get extra lands and use them.", test: (c) => has(c, /\bland cards?\b|\bsearch your library for [^.]*\bland\b/i) },
  ramp: { label: "Ramp", blurb: "Make extra mana to cast big spells early.", test: (c) => has(c, /\badd \{|\bsearch your library for [^.]*\bland\b/i) },
  draw: { label: "Card draw", blurb: "Draw many cards and use them.", test: (c) => has(c, /\bdraw[s]?\b[^.]*\bcards?\b/i) },
  blink: { label: "Blink", blurb: "Flicker creatures to use their enters-the-battlefield effects again.", test: (c) => has(c, /\bexile (?:target|another|up to)[^.]*\bthen return\b|\bflicker\b/i) },
  burn: { label: "Burn", blurb: "Deal direct damage to creatures and players.", test: (c) => has(c, /\bdeals? \d+ damage\b|\bdeals? damage\b/i) },
  mill: { label: "Mill", blurb: "Put cards from libraries into graveyards.", test: (c) => has(c, /\bmills?\b|\bputs? the top\b[^.]*\bgraveyard\b/i) },
  wheels: { label: "Wheels", blurb: "Make every player discard and draw a new hand.", test: (c) => has(c, /\bdiscards? (?:their|your) hand\b/i) },
  theft: { label: "Theft", blurb: "Take and cast other players' cards.", test: (c) => has(c, /\bgain control of\b|\bexile the top card of (?:target|each) (?:player|opponent)/i) },
  group: { label: "Group hug", blurb: "Give every player something and benefit from it.", test: (c) => has(c, /\beach player\b|\ball players\b/i) },
};

const GENERIC = new Set(["aggro", "combo", "control", "midrange", "good-stuff", "stax", "budget", "cedh", "ramp-and-big-spells"]);

/** A tribal slug (`dragons`, `thopters`, `elves`) is a creature type: the deck's cards of that type. */
function tribal(slug: string): Matcher | null {
  if (!/^[a-z]+$/.test(slug) || slug.length < 4) return null;
  const singular = slug.endsWith("ves") ? `${slug.slice(0, -3)}f` : slug.endsWith("ies") ? `${slug.slice(0, -3)}y` : slug.endsWith("s") ? slug.slice(0, -1) : slug;
  const type = singular[0]!.toUpperCase() + singular.slice(1);
  const label = slug[0]!.toUpperCase() + slug.slice(1);
  return { label, blurb: `Play many ${label} and reward each one.`, test: (c) => c.typeLine.split("—")[1]?.split(/\s+/).some((t) => t === type) ?? false };
}

const nonBasic = (c: DeckCardFact) => !c.isCommander && !/Basic Land/.test(c.typeLine);

/**
 * Up to `MAX_STRATEGIES` strategies: the commander's tags in count order (a tag with no card test, a generic archetype tag
 * and a tag with fewer than `MIN_BACKING` backing cards are dropped; two tags that read as one strategy keep the higher),
 * then the Overview's plans. A plan whose cards mostly repeat one already offered is dropped rather than shown twice.
 */
export function detectStrategies(input: { tags: readonly EdhrecTag[]; deck: readonly DeckCardFact[]; overview?: readonly OverviewPlan[] }): Strategy[] {
  const cards = input.deck.filter(nonBasic);
  const out: Strategy[] = [];
  const offer = (s: Strategy) => {
    const set = new Set(s.backingIds);
    const twin = out.some((o) => {
      const shared = o.backingIds.filter((id) => set.has(id)).length;
      return o.label === s.label || shared >= 0.8 * Math.min(o.backingIds.length, s.backingIds.length);
    });
    if (!twin && s.backingIds.length >= MIN_BACKING && out.length < MAX_STRATEGIES) out.push(s);
  };
  for (const tag of [...input.tags].sort((a, b) => b.count - a.count)) {
    if (GENERIC.has(tag.slug)) continue;
    const m = MATCHERS[tag.slug] ?? tribal(tag.slug);
    if (!m) continue;
    offer({ key: tag.slug, label: m.label, blurb: m.blurb, source: "edhrec", backingIds: cards.filter(m.test).map((c) => c.oracleId) });
  }
  const inDeck = new Set(cards.map((c) => c.oracleId));
  input.overview?.forEach((p, i) => {
    offer({ key: `overview:${i}`, label: p.label, blurb: p.blurb, source: "overview", backingIds: [...new Set(p.cardIds)].filter((id) => inDeck.has(id)) });
  });
  return out;
}
