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

import { acceptsTemperature, needsThinkingDisabled, renderCard, thinkingOff, type CardForPrompt } from "./prompt";

export const JUDGED_THEMES = ["groupHug", "pillowFort", "bigMana", "politics"] as const;
export type JudgedTheme = (typeof JUDGED_THEMES)[number];

/**
 * Names the ledger rows (`card_label_batches.prompt_version`) and the stored answers. Bumped, and
 * `JUDGED_SYSTEM` edited, together: a stored row also records the SYSTEM hash, so an edit without a
 * bump still stales the rows it describes, and nothing here needs a registry.
 */
export const JUDGED_PROMPT_VERSION = "j3";

export const JUDGED_SYSTEM = `You decide which of four STRATEGY THEMES a Magic: the Gathering card serves in a Commander deck.
You are given cards, each under a "Key:" number. Reply with ONE JSON object and nothing else: each key
maps to the array of themes that card serves, and an empty array when it serves none. Every key you
were given must appear.

Example reply to three cards: {"1": ["groupHug"], "2": [], "3": ["bigMana", "politics"]}

Most cards serve NO theme, and most cards that look like they might serve one do not. A theme is a
whole deck strategy the card is built for, not a word the card happens to contain. Mark a theme only
when you could name the deck that plays this card BECAUSE of that theme.

THEMES (use these exact names). Judge from what the card text DOES.
  groupHug   — a repeatable or standing effect that gives EVERY player a resource counts, even if you
               also profit or a minor rider exists. One-shot wheels and punishments do not.
               IN: Howling Mine; Rites of Flourishing; Winter, Misanthropic Guide (each player draws
               two each upkeep); Innocuous Researcher (each player draws on attack); Yurlok of Scorch
               Thrash (each player adds BRG).
               OUT: Windfall (one-shot wheel); Syphon Mind; Rhystic Study; Heroes' Reunion.
  pillowFort — a STANDING effect that stops, taxes or redirects attacks or damage aimed at you, or
               keeps you or your permanents from being targeted. An effect on a single creature, or a
               one-time "prevent combat damage" you pay for each turn, does not count.
               IN: Ghostly Prison; Propaganda; Dense Foliage (creatures can't be targeted by spells,
               even though it is symmetric); Enduring Angel (you have hexproof); Empyrial Archangel
               (all damage to you goes to it); Sandwurm Convergence (fliers can't attack you);
               Promise of Loyalty (lasting "can't attack you" counters).
               OUT: activated Fogs (Dawnstrider, Spike Weaver, Sunstone); a creature's own shroud or
               hexproof (Deft Duelist); a single soft counter (Mana Tithe).
  bigMana    — judge by the amount the TEXT guarantees, never by a count that depends on the deck. IN
               when one tap, trigger or cast adds 5 or more mana (restrictions do not matter), when the
               card doubles or adds extra mana whenever a land or permanent taps, or when it untaps all
               your lands or most of your permanents. OUT when the amount scales with a variable
               (devotion, power, counters, allies, colors, life gained, creature types), however large
               it can get.
               IN: Nyxbloom Ancient; Mana Reflection; Seedborn Muse; Timeless Lotus (five per tap);
               Savage Ventmaw (six on attack); Avatar Roku (six on attack); Irencrag Feat (seven);
               Geosurge (seven, restricted); Su-Chi Cave Guard (eight); Overgrowth (two extra per land
               tap); Extraplanar Lens; Rude Awakening (untap all lands); Bear Umbra (untap all lands on
               attack).
               OUT: Karametra's Acolyte, Topiary Lecturer, Harabaz Druid, Heronblade Elite, Mona Lisa,
               Marwyn, Cradle Clearcutter, Rainveil Rejuvenator (X = power, devotion or a count); Arbor
               Adherent, Faeburrow Elder, Bloom Tender, White Lotus Tile, Immortus, Accomplished
               Alchemist, Redshift, Seance Board, Rotating Fireplace, The Eternity Elevator (X mana from
               a count); Somberwald Sage (three, restricted); Master of Dark Rites.
  politics   — another player's DECISION is the value, and that decision is an accept or decline, a
               vote, or a deal. A forced pick between piles or cards, with nothing offered, is not
               politics. Monarch alone is not politics.
               IN: Expropriate; Coercive Portal; Tivit; Combustible Gearhulk and Palantir of Orthanc
               (the opponent may have you draw or take the penalty); Rootweaver Druid (each opponent
               may take lands from the offer); Tenuous Truce (a truce that ends when anyone attacks).
               OUT: pile or card picks with nothing to decline (Intuition, Epiphany at the Drownyard,
               Ecological Appreciation, Realms Uncharted, Forgotten Lore, Choice of Damnations, Truth or
               Tale); monarch cards (Crown-Hunter Hireling, Champions of Minas Tirith); Knight Rampager.

A card may serve several themes, or none. Decide from what the card DOES, never from its name or its
flavour. When it is a close call, leave the theme out: a missed card costs little, a wrong one costs more.`;

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
    ...(needsThinkingDisabled(model) ? { thinking: thinkingOff(model) } : {}),
    system: [{ type: "text" as const, text: JUDGED_SYSTEM }],
    messages: [{ role: "user" as const, content: renderJudgedBody(cards) }],
  },
});

// ---- Pass 2: the verifier ---------------------------------------------------------------------------------------
//
// Pass 1 is loose on purpose (recall), the verifier is the strict second look (precision): it is asked ONE claim,
// "this card serves THIS theme", for each theme pass 1 gave a card. Only a "yes" survives into `verified_themes`,
// the column the app reads. Graded against blind samples it carried pillowFort and bigMana over the precision bar.

const THEME_DEFINITIONS = JUDGED_SYSTEM.slice(JUDGED_SYSTEM.indexOf("THEMES (use"), JUDGED_SYSTEM.indexOf("A card may serve"));

/** The definitions are pass 1's own text, so the verifier judges against exactly what pass 1 was told. */
export const VERIFY_SYSTEM = `You check ONE claim about a Magic: the Gathering card in a Commander deck: that the card serves ONE named strategy theme.
A first pass was loose on purpose and is often wrong. You are the strict second look. Answer "yes" only when the card clearly
meets the definition below and you could name the deck that plays it BECAUSE of that theme. Any close call is "no".

${THEME_DEFINITIONS}
Apply the definitions above exactly, including their IN and OUT examples and split rules.

Reply with ONE JSON object and nothing else: {"verdict": "yes" or "no", "reason": "<one short line>"}`;

/** A reply is one verdict and one short line; 300 truncated two of sixteen, 600 did not. The worst case books all of it. */
export const VERIFY_MAX_TOKENS = 600;

/**
 * `vf<attempt>-<oracle id>-<theme>`: at most 52 characters, under the provider's 64, and decodable without the ledger.
 * The ledger keeps a custom id globally unique, so asking a pair again (`--retry-failed`) is attempt 2, never a reuse.
 */
export const verifyCustomId = (oracleId: string, theme: JudgedTheme, attempt = 1): string => `vf${attempt}-${oracleId}-${theme}`;

export function parseVerifyCustomId(customId: string): { oracleId: string; theme: JudgedTheme } | null {
  const m = /^vf\d{1,2}-([0-9a-f-]{36})-([A-Za-z]+)$/.exec(customId);
  return m !== null && (JUDGED_THEMES as readonly string[]).includes(m[2]) ? { oracleId: m[1], theme: m[2] as JudgedTheme } : null;
}

export const renderVerifyBody = (theme: JudgedTheme, card: CardForPrompt): string => `Claimed theme: ${theme}\n\n${renderCard(card)}`;

export const buildVerifyRequest = (customId: string, model: string, theme: JudgedTheme, card: CardForPrompt) => ({
  custom_id: customId,
  params: {
    model,
    max_tokens: VERIFY_MAX_TOKENS,
    ...(acceptsTemperature(model) ? { temperature: 0 } : {}),
    ...(needsThinkingDisabled(model) ? { thinking: thinkingOff(model) } : {}),
    system: [{ type: "text" as const, text: VERIFY_SYSTEM }],
    messages: [{ role: "user" as const, content: renderVerifyBody(theme, card) }],
  },
});

/**
 * "yes" or "no", or null for a reply that is neither. A reply that cannot be read is an ERROR for the caller, never a
 * "no": scoring a truncated reply as no silently drops true positives (the first big-mana re-sample lost two that way).
 */
export function parseVerifyReply(text: string): "yes" | "no" | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) return null;
  try {
    const verdict = (JSON.parse(text.slice(start, end + 1)) as { verdict?: unknown }).verdict;
    return verdict === "yes" || verdict === "no" ? verdict : null;
  } catch { return null; }
}

/**
 * A `--sample --spend` run that collected answers is finished: the next sample is drawn on purpose, by a
 * fresh invocation. Planning one here billed a stray batch on 2026-11-21 (`--fresh` skips the cards just stored).
 */
export const endsAfterCollect = (sample: boolean, collected: { stored: number; refused: number }): boolean =>
  sample && collected.stored + collected.refused > 0;

/**
 * Cards whose request already failed (errored, canceled, expired or refused) are dropped from the next plan, so a
 * failure is reported once and never re-asked by every later `--spend` run: that loop once resubmitted 36 batches.
 * `--retry-failed` is the deliberate way to ask them again. Pure, so the rule is pinned without a database.
 */
export const withoutFailed = <T extends { oracleId: string }>(
  cards: readonly T[], failedAsked: readonly string[], retryFailed: boolean,
): { todo: T[]; dropped: T[] } => {
  if (retryFailed) return { todo: [...cards], dropped: [] };
  const failed = new Set(failedAsked);
  return { todo: cards.filter((c) => !failed.has(c.oracleId)), dropped: cards.filter((c) => failed.has(c.oracleId)) };
};

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
