// The four JUDGEMENT themes (group hug, pillow fort, big mana, politics): strategy axes no type line
// or rules-text pattern can decide, so a model decides them. They ride a separate, narrow prompt
// rather than `LABEL_PROMPT_VERSION`: adding a theme to the card-label SYSTEM would edit it, and an
// edit leaves every old row fresh under its own version, so the new themes would reach no card
// until all ~32.6k were relabelled at full price to add four themes that fit about 6% of them.
// Here only a pre-filtered candidate set is asked, and the answers live in `judged_labels`.
//
// Nothing in the app reads `judged_labels` yet. A theme becomes a strategy axis only after a graded
// sample proves its labels (docs/agents/judged-labels.md), so the table can fill without shipping
// anything a player sees.
import { createHash } from "node:crypto";

import { acceptsTemperature, needsThinkingDisabled, renderCard, type CardForPrompt } from "./prompt";

export const JUDGED_THEMES = ["groupHug", "pillowFort", "bigMana", "politics"] as const;
export type JudgedTheme = (typeof JUDGED_THEMES)[number];

/**
 * Names the ledger rows (`card_label_batches.prompt_version`) and the stored answers. Bumped, and
 * `JUDGED_SYSTEM` edited, together: a stored row also records the SYSTEM hash, so an edit without a
 * bump still stales the rows it describes, and nothing here needs a registry.
 */
export const JUDGED_PROMPT_VERSION = "j1";

export const JUDGED_SYSTEM = `You decide which of four STRATEGY THEMES a Magic: the Gathering card serves in a Commander deck.
You are given cards, each under a "Key:" number. Reply with ONE JSON object and nothing else: each key
maps to the array of themes that card serves, and an empty array when it serves none. Every key you
were given must appear.

Example reply to three cards: {"1": ["groupHug"], "2": [], "3": ["bigMana", "politics"]}

THEMES (use these exact names):
  groupHug   — a deck that gives EVERY player, opponents included, resources: cards, mana, life,
               lands, creatures. The card helps opponents on purpose, to build goodwill or to cash in
               on a table that is all ahead. NOT groupHug: a symmetric effect that is a cost or a
               punishment (each player discards or sacrifices), a wheel that exists to refill
               your own hand, or a drawback that only the card's controller escapes.
  pillowFort — makes you a poor target: stops attacks against you, taxes or blocks the attackers,
               or protects you and your permanents from interaction. Examples: "creatures can't
               attack you unless their controller pays", "prevent all combat damage". NOT pillowFort:
               a creature with its own protection or hexproof, or a single protective trick on one
               creature.
  bigMana    — produces or multiplies mana well beyond one land drop, or spends an enormous amount:
               "add X mana", doubling mana, untapping every land, mana from a count of permanents,
               and the payoffs that need a huge amount of it. NOT bigMana: a mana rock or land that
               adds one to three mana, a cost reducer, or a spell that is simply expensive.
  politics   — the card's value comes from other players choosing, voting, bargaining or being
               swayed: votes, a council's dilemma, "an opponent of your choice", a deal an opponent
               may accept or refuse, a choice that makes players negotiate. NOT politics: a
               symmetric effect nobody chooses, and goad or monarch alone (those are their own
               strategy themes).

A card may serve several themes, or none. Decide from what the card DOES, never from its name or
its flavour. When it is a close call, leave the theme out.`;

/** sha256 of the SYSTEM text: the instruction a stored answer was written against. */
export const judgedSystemHash = (system: string = JUDGED_SYSTEM): string =>
  createHash("sha256").update(system).digest("hex");

/**
 * The freshness key of one stored answer. Derived from `renderCard`, the exact text the model is
 * sent, so a card whose text moves under the same oracle id is asked again.
 */
export function judgedInputHash(
  card: CardForPrompt & { oracleId: string }, model: string, version: string = JUDGED_PROMPT_VERSION,
  systemHash: string = judgedSystemHash(),
): string {
  return createHash("sha256")
    .update(JSON.stringify([card.oracleId, renderCard(card), version, model, systemHash]))
    .digest("hex");
}

/** Cards in a request, numbered "Key: n" in order: the key echoes back so a reply never matches by name. */
export const judgedKey = (index: number): string => String(index + 1);

export const renderJudgedBody = (cards: CardForPrompt[]): string =>
  `Decide the themes of these ${cards.length} cards.\n\n${
    cards.map((c, i) => `Key: ${judgedKey(i)}\n${renderCard(c)}`).join("\n\n---\n\n")}`;

/** One reply is a JSON object of at most twelve short arrays: far under this, and the worst case books all of it. */
export const JUDGED_MAX_TOKENS = 400;

export const buildJudgedRequest = (customId: string, model: string, cards: CardForPrompt[]) => ({
  custom_id: customId,
  params: {
    model,
    max_tokens: JUDGED_MAX_TOKENS,
    ...(acceptsTemperature(model) ? { temperature: 0 } : {}),
    ...(needsThinkingDisabled(model) ? { thinking: { type: "disabled" as const } } : {}),
    system: [{ type: "text" as const, text: JUDGED_SYSTEM }],
    messages: [{ role: "user" as const, content: renderJudgedBody(cards) }],
  },
});

export type JudgedReply =
  | { ok: true; themes: Map<string, JudgedTheme[]>; refused: string[] }
  | { ok: false; why: string };

/**
 * Reads one reply against the keys the request sent.
 *
 * A reply that is not a JSON object is NOT an empty answer: `{}` is not "no card serves a theme",
 * it is "the model said nothing", and crediting it as all-empty would score as right on exactly
 * the cards a grader checks for misses. A key the request never sent, a value that is not an array
 * of known themes, or a card missing from the object is REFUSED (reported, its card left unlabelled
 * for a later run), never repaired.
 */
export function parseJudgedReply(text: string, sentKeys: readonly string[]): JudgedReply {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return { ok: false, why: "no JSON object" };
  let parsed: unknown;
  try { parsed = JSON.parse(text.slice(start, end + 1)); } catch { return { ok: false, why: "unparseable JSON" }; }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, why: "not an object" };
  const obj = parsed as Record<string, unknown>;
  const known = new Set<string>(JUDGED_THEMES);
  const themes = new Map<string, JudgedTheme[]>();
  const refused: string[] = [];
  for (const key of sentKeys) {
    const v = obj[key];
    if (!Array.isArray(v) || !v.every((t) => typeof t === "string" && known.has(t))) {
      refused.push(key);
      continue;
    }
    themes.set(key, [...new Set(v as JudgedTheme[])].sort());
  }
  return { ok: true, themes, refused };
}

/**
 * The PRE-FILTER: Postgres POSIX regexes over lowercased oracle text, loose on purpose. A card the
 * filter drops is never asked, so recall is what it must protect; precision is the model's job. The
 * sample includes cards NO pattern matched, to measure what the filter misses (the plan's miss bar).
 * An apostrophe is `.`, because Scryfall prints both ' and the curly one.
 */
export const JUDGED_PREFILTER: Record<JudgedTheme, string> = {
  groupHug:
    "(each|target|that) (other )?(player|opponent)s? (draws?|gains?|creates?|searches|puts|adds|may (search|put|play|draw))"
    + "|each player (draws|gains|creates|searches|puts|adds)|each opponent (draws|gains|creates|searches)",
  pillowFort:
    "can.t attack (you|unless)|attack(s)? you\\y|prevent all combat damage|you have (hexproof|shroud)"
    + "|can.t be the target|unless (that player|its controller|they) pays?|can.t attack or block",
  bigMana:
    "add (x|an amount|that much|twice|three|four|five|six|seven|eight)|(double|doubles|twice) (the amount of )?mana"
    + "|untap (all|each) (lands|permanents)|for each .{0,40}add|tapped for mana|mana value of x|x is (at least|equal)"
    + "|add (\\{[^}]+\\}){3,}|additional mana|(spend|spent) .{0,30}mana|x mana|total mana",
  politics:
    "\\yvote|council.s dilemma|will of the council|an opponent of your choice|target opponent chooses"
    + "|choose (a|an|target) (player|opponent)|secretly choose|each opponent (may|chooses)|an opponent (may|chooses)",
};
