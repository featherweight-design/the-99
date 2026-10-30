import { z } from "zod";
import { suggestedChangesV2Copy } from "../../copy/suggested-changes-v2";
import { playerText, PLAYER_TEXT_SYSTEM_RULE } from "../../model/player-text";
import { deckDescriptionCopy } from "../../copy/deck-description";
import { TUNING_MODEL } from "../limits";
import { presentationFailures, type Quotable } from "../presentation";
import type { V2Line } from "./engine";

/**
 * Why these cards (handoff `design/design_handoff_the99_overview_stages` §2). Pure.
 *
 * Its own small call, made once both lists are final (`runV2`'s last step), on a run of N >= `WHY_MIN_N` whose cuts came
 * in. The model is shown the kept rows themselves, each with its short reason, and writes a lead on what the set does,
 * and for each list up to 3 groups of rows that share a job: a phrase, the group's cards by name, and one card to link.
 *
 * The model writes no counts. `checkWhy` matches each group's names to that list's kept rows (a name that is not one is
 * ignored; a row already in an earlier group is not counted twice), drops a group left with fewer than two, writes each
 * count as a word, and links the named card when it is one of the group's own rows, else the group's first. A side holds
 * at most 3 groups and 2 card links; groups past 160 characters are dropped from the end, and a side with none left is
 * null. A lead that is empty or over 120 characters drops the whole why.
 *
 * The lead and every phrase are player-visible model text, so they pass `presentationFailures` as a rationale does (no
 * game result, no bracket, no misquote; a cut's phrase may say "stronger", as a cut's rationale may), and US spelling
 * (`britishSpelling`): a failed lead drops the why, a failed phrase its group. A phrase that writes a count of its own
 * ("five are answers", "3 of the cuts") is dropped too; a number inside what the cards DO ("answers at one or two mana")
 * is the phrase's meaning and stays.
 */

/** The smallest count asked for a why: 12+ changes (the handoff's N = 6). The one constant. */
export const WHY_MIN_N = 6;
export const WHY_LEAD_MAX = 120;
export const WHY_LINE_MAX = 160;
export const WHY_GROUPS_MAX = 3;
export const WHY_LINKS_MAX = 2;
/** A group must keep this many rows to be written: a phrase is written for a plural subject ("three keep cards coming"). */
export const WHY_GROUP_MIN = 2;
/** The why call's reply ceiling: a lead and six short groups of names, with room. */
export const WHY_REPLY_TOKENS = 1_500;
/** The why call's input ceiling: its rules (about 1,600 characters), and at N = 20 up to 50 rows at about 140 characters
 *  each (a name and a short reason), about 3,000 tokens at 3 characters a token; doubled for room. */
export const WHY_INPUT_TOKENS = 6_000;
/** Its model. */
export const WHY_MODEL = TUNING_MODEL;
/** Its effort: it chooses nothing, it describes rows already chosen. */
export const WHY_EFFORT = "low" as const;

/** Whether a run asks for a why: N >= `WHY_MIN_N`, both lists hold rows, and the cuts came in. */
export function asksWhy(run: { n: number; adds: number; cuts: number; cutsFailed: boolean }): boolean {
  return run.n >= WHY_MIN_N && run.adds > 0 && run.cuts > 0 && !run.cutsFailed;
}

const groupSchema = z.object({ phrase: z.string(), cards: z.array(z.string()), like: z.string().optional() });
/** The reply's shape. Lengths and counts are the app's checks (`checkWhy`), never the schema's: a schema bound failing
 *  one long phrase would fail the whole reply. */
export const whySchema = z.object({ lead: z.string(), add: z.array(groupSchema), cut: z.array(groupSchema) });
export type WhyReply = z.infer<typeof whySchema>;

const SYSTEM = [
  "You write a short summary of a finished set of deck changes for a Magic: The Gathering Commander player. The cards are already chosen; you only describe them.",
  PLAYER_TEXT_SYSTEM_RULE,
  "Return:",
  `- lead: one sentence of at most 15 words and ${WHY_LEAD_MAX - 30} characters, on what the whole set does for the deck, and for the player's request when there is one.`,
  `- add: up to ${WHY_GROUPS_MAX} groups of the cards coming in that share one job. Each group has a phrase, its cards and like.`,
  "- cut: the same, for the cards going out.",
  "A phrase follows a number the app writes, so it starts with a plural verb: \"are answers at one or two mana\", \"keep cards coming\", \"fix the mana\". At most 50 characters.",
  "cards: every card in the group, at least two, each written exactly as it is listed. A card goes in one group at most; leave out a card that fits no group.",
  "like: one card from the group, the clearest example.",
  "Rules:",
  "- Never write a count or a number of cards; the app writes it.",
  "- Never promise a game result: not that a change will win or lose games. A cut's phrase may say the deck is stronger or more focused without those cards.",
  "- Never name a bracket. Never quote the player.",
  "- Name only cards in the lists below.",
  "- US English spelling: color, favor, defense, optimize.",
].join("\n");

/** The why call's prompt: the commander, the player's request when there is one, and both final lists with each row's
 *  short reason. Nothing about who the player is. */
export function buildWhyPrompt(
  input: { commanders: readonly string[]; request: string | null; adds: readonly V2Line[]; cuts: readonly V2Line[] },
): { system: string; user: string } {
  const rows = (lines: readonly V2Line[]) => lines.map((l) => `- ${l.card}: ${l.rationaleShort}`);
  const user = [
    `Commander: ${input.commanders.join(" and ")}`,
    ...(input.request && input.request.trim() !== ""
      ? ["", playerText("What the player asked for this run, in their own words", input.request, deckDescriptionCopy.notes.maxLength)]
      : []),
    "",
    "Coming in:",
    ...rows(input.adds),
    "",
    "Going out:",
    ...rows(input.cuts),
  ].join("\n");
  return { system: SYSTEM, user };
}

/** One piece of a side's line: text, or a card link (the shipped `CardName`). */
export type V2WhyPart = { text: string } | { card: string; oracleId: string };
/** What a run stores (`V2RunReport.why`): the lead, and each side's line, null when it failed its checks. */
export type V2Why = { lead: string; add: V2WhyPart[] | null; cut: V2WhyPart[] | null };

const words = suggestedChangesV2Copy.why;

/** A count as its word, or null past the words the copy holds. */
function countWord(n: number): string | null {
  return n >= 0 && n < words.counts.length ? words.counts[n] : null;
}

const clean = (s: unknown): string => (typeof s === "string" ? s.trim().replace(/\s+/g, " ") : "");
const key = (name: string) => clean(name).toLowerCase();

/** British spellings the copy rule (US English) rules out, as the model has written them ("colour" in a test lead). */
const BRITISH = new RegExp(
  "\\b(?:colour\\w*|favour\\w*|flavour\\w*|armour\\w*|honour\\w*|behaviour\\w*|defence\\w*|offence\\w*|" +
    "centre[sd]?|grey|travell\\w+|cancell(?:ed|ing)|(?:optimi|prioriti|utili|stabili|maximi|minimi|recogni|organi|speciali|" +
    "reali|summari|economi|synergi|capitali|neutrali)s(?:e|es|ed|ing)|whilst|amongst)\\b",
  "i",
);
/** Whether text spells a word the British way (`colourless` is caught, `colorless` is not). */
export function britishSpelling(text: string): boolean {
  return BRITISH.test(text);
}

const COUNT = `\\d+|${words.counts.join("|")}`;
/** A count the model wrote: one that opens the phrase, where the app's word goes, or one counting cards. */
const WROTE_COUNT = new RegExp(`^(?:${COUNT})\\b|\\b(?:${COUNT})\\s+(?:of|cards?|more|others?|are|is)\\b`, "i");

/** Text the player will read, or null when it fails: empty, British spelling, or a rationale's checks. */
function checkText(raw: unknown, quotable: readonly Quotable[], claims: { allowStronger?: boolean }): string | null {
  const text = clean(raw);
  if (text === "" || britishSpelling(text)) return null;
  const r = presentationFailures(text, quotable, claims);
  return r.broken.length > 0 ? null : r.text;
}

/** A phrase as the player will read it, or null: also fails a count of its own. */
export function checkPhrase(raw: unknown, quotable: readonly Quotable[], claims: { allowStronger?: boolean } = {}): string | null {
  const phrase = clean(raw).replace(/[.;,:]+$/, "");
  if (WROTE_COUNT.test(phrase)) return null;
  return checkText(phrase, quotable, claims);
}

/** A side's line from its raw groups and the side's kept rows, or null when no group passes. */
function sideLine(
  raw: unknown,
  kept: readonly V2Line[],
  idOf: (l: V2Line) => string | null,
  quotable: readonly Quotable[],
  claims: { allowStronger?: boolean },
): V2WhyPart[] | null {
  if (!Array.isArray(raw)) return null;
  const byName = new Map(kept.map((l) => [key(l.card), l]));
  const taken = new Set<V2Line>();
  const written: { count: number; phrase: string; like: V2Line }[] = [];
  for (const g of raw as { phrase?: unknown; cards?: unknown; like?: unknown }[]) {
    if (written.length >= WHY_GROUPS_MAX) break;
    const phrase = checkPhrase(g?.phrase, quotable, claims);
    if (phrase === null || !Array.isArray(g.cards)) continue;
    const mine: V2Line[] = [];
    for (const name of g.cards) {
      const row = typeof name === "string" ? byName.get(key(name)) : undefined;
      if (row && !taken.has(row) && !mine.includes(row)) mine.push(row);
    }
    if (mine.length < WHY_GROUP_MIN || countWord(mine.length) === null) continue;
    for (const row of mine) taken.add(row);
    const named = typeof g.like === "string" ? byName.get(key(g.like)) : undefined;
    written.push({ count: mine.length, phrase, like: named && mine.includes(named) ? named : mine[0] });
  }
  // Groups past the line's length are dropped from the end, so a long third group costs only itself.
  for (let size = written.length; size > 0; size--) {
    const parts = compose(written.slice(0, size), idOf);
    if (parts.reduce((n, p) => n + ("text" in p ? p.text.length : p.card.length), 0) <= WHY_LINE_MAX) return parts;
  }
  return null;
}

function compose(groups: readonly { count: number; phrase: string; like: V2Line }[], idOf: (l: V2Line) => string | null): V2WhyPart[] {
  const parts: V2WhyPart[] = [];
  let links = 0;
  let text = "";
  groups.forEach((g, i) => {
    const word = countWord(g.count)!;
    text += `${i === 0 ? word[0].toUpperCase() + word.slice(1) : word} ${g.phrase}`;
    const oracleId = idOf(g.like);
    if (oracleId && links < WHY_LINKS_MAX) {
      links += 1;
      parts.push({ text: text + words.like }, { card: g.like.card, oracleId });
      text = "";
    }
    text += i === groups.length - 1 ? words.end : words.between;
  });
  parts.push({ text });
  return parts;
}

/**
 * The why a run stores, from the why call's parsed reply and both lists as finally kept; null when the reply is missing
 * or its lead fails its checks.
 */
export function checkWhy(
  raw: unknown,
  keptAdds: readonly V2Line[],
  keptCuts: readonly V2Line[],
  /** What the player wrote that the text may quote (`quotableOf`); none, any quotation fails. */
  quotable: readonly Quotable[] = [],
): V2Why | null {
  const parsed = whySchema.safeParse(raw);
  if (!parsed.success) return null;
  const lead = checkText(parsed.data.lead, quotable, {});
  if (lead === null || lead.length > WHY_LEAD_MAX) return null;
  return {
    lead,
    add: sideLine(parsed.data.add, keptAdds, (l) => l.addOracleId, quotable, {}),
    cut: sideLine(parsed.data.cut, keptCuts, (l) => l.cutOracleId, quotable, { allowStronger: true }),
  };
}
