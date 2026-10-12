import { z } from "zod";

import { FIGURES, RANKS, SCORE_WORDS } from "../intake/the-read";
import { ROLES, THEMES } from "../labels/types";
import { keywordClaims } from "../synopsis/claims";
import { normalizeName, type FactCard } from "../synopsis/facts";
import { isPartOf } from "../tuning/quote-match";
import { validateCuts } from "../tuning/cuts-validate";
import type { CutsPack, CutsPackCard } from "../tuning/cuts-evidence";
import type { CutsResponse } from "../tuning/cuts-schema";
import type { FitDeck, FitsRead } from "./fits";

export * from "./fits-read-limits";

/**
 * FIND A DECK, WITH A READ (brief `docs/superpowers/design-briefs/2026-10-11-find-a-deck-read.md`).
 * Pure: who the candidates are, the prompt in both layouts, the reply's shape, and the validator.
 * The loader is `fits-read-load.ts`. No server action, switch or migration yet (PR A).
 *
 * CANDIDATES are `loadFits`' own `open` set (its `fits`: no copy held, not led by the card, inside
 * the deck's colors) and nothing else, refused outright when the card is not commander-legal
 * (default 2). Each candidate's `need` is `shapeFits`'s. There is no second candidate rule here.
 *
 * DECKS AND CARDS BY KEY (lock 1; Help me choose's F5). Decks go in as `D1`, `D2`..., never by
 * name, because a deck's name is player-typed: no player text reaches this prompt, so `playerText`
 * is not needed. Cards go in as `C1`, `C2`..., one key per card across every block shown, and the
 * sentence names one only as the token `{C12}`; the app draws the name.
 *
 * NOTHING THE MODEL RETURNS IS TRUSTED (locks 1 to 3 and 10). Each failure drops that deck and is
 * counted by its reason (`FitsDropReason`); the rest move up.
 */

/** Folded into any future cache key, so a prompt change never answers from an older prompt's result. */
export const FITS_READ_PROMPT_VERSION = 3;
/** The most decks a read lists (default 4: three to five). */
export const FITS_READ_TOP = 5;
/** A sentence's drawn length, card tokens drawn as names. Refused over it, never cut. */
export const FITS_READ_SENTENCE_MAX_CHARS = 240;
/** The prompt asks for less than the validator allows, as Help me choose's does: replies run long. */
const SENTENCE_ASK_CHARS = FITS_READ_SENTENCE_MAX_CHARS - 40;

/** The closed list a cite's job comes from: every label kind, role and theme space alike. */
export const FITS_READ_JOBS = [...new Set<string>([...ROLES, ...THEMES])] as [string, ...string[]];

export type FitsReadLayout = "per-press" | "cached-decks";

// ---- candidates --------------------------------------------------------------------------------

/**
 * The decks a read runs over: `loadFits`' open set, in its order, or none when the card is not
 * commander-legal (the door draws none either, but the read checks it itself).
 */
export function fitsReadCandidates(read: Pick<FitsRead, "card" | "fits">): FitDeck[] {
  if (!read.card.commanderLegal) return [];
  return read.fits;
}

// ---- inputs ------------------------------------------------------------------------------------

/** A card as the prompt shows it. `kinds` are its fresh label kinds (`card_labels`), maybe none. */
export type ReadCardFacts = {
  oracleId: string; name: string; typeLine: string; kinds: readonly string[];
  /** The validator's facts for a keyword claim (lock 2), never printed in the prompt. Absent, the
   *  keyword rule decides nothing for the card (`claims.ts` `cardHas`). */
  oracleText?: string | null;
  keywords?: readonly string[];
};
export type ReadTextCard = ReadCardFacts & { oracleText: string };

/** Where a deck's plan text came from: a v2 Overview (contracts 11, 12), an older one, or none. */
export type PlanSource = "v2" | "older" | "none";

/** One of the player's decks, independent of the card asked about: the cached layout's block. */
export type FitsDeckBlock = {
  deckId: string;
  commanders: readonly ReadTextCard[];
  /** The newest passing Overview's prose and strategy, marks drawn as names; null with none. */
  plan: { source: Exclude<PlanSource, "none">; text: string } | null;
  /** The deck's leading themes from its own cards' labels, shown when there is no plan. */
  themes: readonly { kind: string; n: number }[];
  /** The 99, one row per card, commanders not included. */
  list: readonly ReadCardFacts[];
  /** The Overview's Key cards, resolved to this list (never cut). */
  keyCardIds: readonly string[];
  /** The deck's never-cut cards (`liveLockedIds`). */
  lockedIds: readonly string[];
};

/** What a candidate deck carries about THIS card: its need in the card's role and the inclusion. */
export type CandidateFacts = {
  deckId: string; need: FitDeck["need"]; inclusion: number | null;
  /** The basic lands, by oracle id, this deck may cut for the card (`fits-read-basics.ts`, Hugh's rule:
   *  lands over the target, and the basic's color not left short). Absent or empty, no basic may go. */
  basicCuts?: readonly string[];
};

export type FitsReadInputs = {
  card: ReadTextCard;
  /** Every deck a prompt may show, in a stable order. */
  decks: readonly FitsDeckBlock[];
  /** The candidates, in the free list's order. */
  candidates: readonly CandidateFacts[];
};

// ---- the prompt --------------------------------------------------------------------------------

export const fitsReadSchema = z.object({
  // Unbounded, as Help me choose's: a sixth pick or a long sentence must not fail the whole reply.
  picks: z.array(z.object({
    deck: z.string(),
    sentence: z.string(),
    cut: z.string().nullable(),
    cites: z.array(z.object({ key: z.string(), job: z.enum(FITS_READ_JOBS) })),
  })),
});
export type FitsReadReply = z.infer<typeof fitsReadSchema>;

export const FITS_READ_RULES = [
  "You help a Magic: The Gathering Commander player see which of their decks a card actually serves, and how.",
  "Decks are named only by key (D1, D2...). Cards are named only by key (C1, C2...): every card shown has one, and the same card has the same key in every deck.",
  "You are given one card, and candidate decks that could legally run it. For each candidate where the card does a real job for that deck's plan, write ONE sentence on specifically how it serves that plan: what it does together with that deck's own cards or commander, or which part of the deck's written plan it advances.",
  "Name a card in a sentence only as its key in braces, for instance {C12}, and only a card from that deck's list, its commander, or the card being asked about. Never write a card's name yourself, and never write a deck's name.",
  "A sentence must name at least one card from that deck or its commander by key, or quote the deck's written plan word for word inside double quotes. A sentence doing neither is thrown away.",
  "Quote only the plan text shown for that same deck, exactly as written. Never invent a quote.",
  `A sentence is at most ${SENTENCE_ASK_CHARS} characters with the card names drawn in. It never contains a digit, a percentage, a score, a rank, or words like best, great, strong or perfect. That includes rules notation: never write "+1/+1" or "3 damage"; write "a +1/+1 counter" as "a counter" and "3 damage" as "damage".`,
  "For each deck you list, suggest one card to cut from that deck's list, by key, in `cut`: never its commander, never the card being asked about, never a Key card, never a card marked never cut, and never a basic land unless that deck's candidate line names it as one it can spare. The app has already checked those against the deck's land count and that basic's color; cutting any other basic leaves the deck's mana short. Use null only if no card can be cut.",
  "In `cites`, give every card your sentence names, and the card being asked about, each with the one job it does in your sentence. The job must be one of the labels shown beside that card; a card shown with no labels cannot be cited.",
  `List at most ${FITS_READ_TOP} decks, the deck it helps most first. Leave out every deck where the card is not a real fit: a deck it would merely sit in is not a fit. If none fits, return no picks.`,
  "Do not rank by how much of a theme a deck already has. Judge whether this card's own text does something that deck's plan wants.",
].join("\n");

/** Rules text on one line, as the prompts carry it. */
export function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, " / ").trim();
}

/** One key per card across every block, in block order, then the card asked about. Pure and stable. */
export function assignCardKeys(card: { oracleId: string }, decks: readonly FitsDeckBlock[]): Map<string, string> {
  const out = new Map<string, string>();
  const add = (id: string) => { if (!out.has(id)) out.set(id, `C${out.size + 1}`); };
  for (const d of decks) {
    for (const c of d.commanders) add(c.oracleId);
    for (const c of d.list) add(c.oracleId);
  }
  add(card.oracleId);
  return out;
}

const kindsOf = (k: readonly string[]) => (k.length > 0 ? ` [${k.join(", ")}]` : " [no labels]");

/** A deck as the model reads it: independent of the card asked about. */
export function deckBlock(deckKey: string, d: FitsDeckBlock, keyOf: ReadonlyMap<string, string>): string {
  const k = (id: string) => keyOf.get(id) ?? "?";
  const lines = [`${deckKey}`];
  for (const c of d.commanders) lines.push(`Commander ${k(c.oracleId)} ${c.name} (${c.typeLine})${kindsOf(c.kinds)}: ${oneLine(c.oracleText)}`);
  if (d.plan) lines.push(`Plan (the deck's written Overview): ${d.plan.text}`);
  else lines.push(`Plan: none written. Leading themes among its cards: ${d.themes.map((t) => `${t.kind} (${t.n})`).join(", ") || "none"}.`);
  const keyCards = d.keyCardIds.map(k);
  if (keyCards.length > 0) lines.push(`Key cards: ${keyCards.join(", ")}.`);
  const locked = d.lockedIds.map(k);
  if (locked.length > 0) lines.push(`Never cut: ${locked.join(", ")}.`);
  lines.push("List:");
  for (const c of d.list) lines.push(`${k(c.oracleId)} ${c.name} (${c.typeLine})${kindsOf(c.kinds)}`);
  return lines.join("\n");
}

function cardBlock(card: ReadTextCard, keyOf: ReadonlyMap<string, string>): string {
  return `The card: ${keyOf.get(card.oracleId)} ${card.name} (${card.typeLine})${kindsOf(card.kinds)}: ${oneLine(card.oracleText)}`;
}

function candidateLine(deckKey: string, c: CandidateFacts, keyOf: ReadonlyMap<string, string>): string {
  const need = c.need ? `has ${c.need.have} ${c.need.role} cards against a target of ${c.need.target}` : "no measured need in the card's role";
  const inc = c.inclusion === null ? "no inclusion figure is recorded for the card with this commander" : `the card is run by ${Math.round(c.inclusion)}% of decks with this commander`;
  const basics = (c.basicCuts ?? []).flatMap((id) => keyOf.get(id) ?? []);
  const spare = basics.length > 0 ? `basic lands it can spare: ${basics.join(", ")}` : "no basic land to spare";
  return `${deckKey}: ${need}; ${inc}; ${spare}.`;
}

export type FitsReadPrompt = {
  system: string;
  user: string;
  /** Whether the system prompt is the cacheable prefix (the cached-decks layout). */
  cacheSystem: boolean;
  /** Every deck key the call was shown, to its deck id. */
  deckOf: ReadonlyMap<string, string>;
  /** Every card key the call was shown, to its oracle id. */
  cardOf: ReadonlyMap<string, string>;
};

/**
 * The prompt. `per-press`: the rules alone as the system prompt, and the card with the candidates'
 * blocks in the user message. `cached-decks`: the rules and EVERY deck's block as a byte-stable,
 * cacheable system prompt, and the card with the candidates' keys in the user message.
 */
export function buildFitsReadPrompt(inputs: FitsReadInputs, layout: FitsReadLayout): FitsReadPrompt {
  const byId = new Map(inputs.decks.map((d) => [d.deckId, d]));
  const shown = layout === "cached-decks"
    ? inputs.decks
    : inputs.candidates.flatMap((c) => byId.get(c.deckId) ?? []);
  const keyOf = assignCardKeys(inputs.card, shown);
  const deckKeyOf = new Map(shown.map((d, i) => [d.deckId, `D${i + 1}`]));
  const blocks = shown.map((d) => deckBlock(deckKeyOf.get(d.deckId)!, d, keyOf));
  const candidates = inputs.candidates.filter((c) => deckKeyOf.has(c.deckId));
  const candidateLines = candidates.map((c) => candidateLine(deckKeyOf.get(c.deckId)!, c, keyOf));
  const card = cardBlock(inputs.card, keyOf);
  const system = layout === "cached-decks"
    ? `${FITS_READ_RULES}\n\nThe player's decks:\n\n${blocks.join("\n\n")}`
    : FITS_READ_RULES;
  const user = layout === "cached-decks"
    ? [card, "", `Candidate decks: ${candidates.map((c) => deckKeyOf.get(c.deckId)).join(", ")}. Only these may be listed.`, ...candidateLines].join("\n")
    : [card, "", "Candidate decks:", ...candidateLines, "", blocks.join("\n\n")].join("\n");
  return {
    system,
    user,
    cacheSystem: layout === "cached-decks",
    deckOf: new Map([...deckKeyOf].map(([id, k]) => [k, id])),
    cardOf: new Map([...keyOf].map(([id, k]) => [k, id])),
  };
}

// ---- validation --------------------------------------------------------------------------------

export type FitsDropReason =
  /** 1. The deck key was never shown, or names a deck that is not a candidate, or repeats one. */
  | "unknownDeck" | "notCandidate" | "duplicateDeck"
  /** 2. A card key (sentence, cut or cite) that is not that deck's, its commander's or the card's. */
  | "cardOutsideDeck"
  /** 3. The cut is the commander, the card itself, a Key card, a never-cut card, a basic land the deck
   *  cannot spare (`CandidateFacts.basicCuts`), or not in the 99. */
  | "cutCommander" | "cutSelf" | "cutKeyCard" | "cutLocked" | "cutNotInDeck" | "cutBasicLand"
  /** 4. A quoted phrase that is not in the deck's stored plan. */
  | "falseQuote"
  /** 5. Neither a deck card by key nor a plan quote. */
  | "noCitation"
  /** 6. Over length, a figure or score word, or a stray brace. */
  | "tooLong" | "figureOrScore" | "malformed"
  /** 7. A cite's job the card's labels do not carry, or a keyword credited to a card whose text and
   *  keywords lack it (lock 2, the Overview's `keyword_not_on_card` rule). */
  | "jobMismatch" | "keywordClaim"
  /** 8. No cut, though the deck holds a card that may be cut (brief default 4: every row carries one). */
  | "noCut"
  | "tooMany";

export type FitsSentencePart = { text: string } | { card: string } | { quote: string };
export type FitsPick = {
  deckId: string;
  parts: FitsSentencePart[];
  cut: string | null;
  cites: { oracleId: string; job: string }[];
};
/**
 * `outcome` (handoff audit F5): `picks` when at least one deck survived; `noFit` when the model named
 * no deck, a real answer that may be stored; `failed` when it named decks and every one failed
 * validation, which is a failed read (refunded, never stored as a no-fit).
 */
export type FitsReadOutcome = "picks" | "noFit" | "failed";
export type FitsReadValidated = { outcome: FitsReadOutcome; picks: FitsPick[]; drops: Partial<Record<FitsDropReason, number>> };

const CARD_TOKEN = /\{(C\d+)\}/g;
/** A phrase in straight or curly double quotes. */
const QUOTE = /["“]([^"“”]+)["”]/g;

/**
 * The cut rules, Proposed cuts' own (`validateCuts`): a card absent from the cuttable list is
 * `notInDeck`, a Key card is `keyCard`. The commander, the card itself and a never-cut card are
 * checked first so each is counted by its own reason.
 */
function cutFailure(cutId: string, deck: FitsDeckBlock, subjectId: string, nameOf: ReadonlyMap<string, string>, spareBasics: ReadonlySet<string>): FitsDropReason | null {
  if (deck.commanders.some((c) => c.oracleId === cutId)) return "cutCommander";
  if (cutId === subjectId) return "cutSelf";
  if (deck.lockedIds.includes(cutId)) return "cutLocked";
  // A basic land is the cut only where the deck can spare it (Hugh, 2026-10-12: `basicCutFair`, read
  // by the loader into `basicCuts`); any other basic changes the mana, not the plan.
  if (!spareBasics.has(cutId) && deck.list.some((c) => c.oracleId === cutId && /\bBasic\b/.test(c.typeLine) && /\bLand\b/.test(c.typeLine))) return "cutBasicLand";
  const locked = new Set(deck.lockedIds);
  // The cuttable list, as Proposed cuts builds it: a commander or locked card is absent from it.
  const cards = deck.list.filter((c) => !locked.has(c.oracleId)).map((c): CutsPackCard =>
    ({ oracleId: c.oracleId, name: c.name, quantity: 1, typeLine: c.typeLine, mv: 0, roles: [] }));
  const pack: CutsPack = {
    over: 1, ask: 1, commander: deck.commanders[0]?.name ?? "", keyCards: [], keyCardIds: [...deck.keyCardIds],
    intent: null, missing: [], support: null, roles: [], curve: null, brackets: [], cards, plan: null,
  };
  const name = nameOf.get(cutId) ?? cutId;
  const reply = { cuts: [{ name, reason: "cut", cites: [] }] } as unknown as CutsResponse;
  const { dropped } = validateCuts({ reply, pack, resolveName: () => ({ oracleId: cutId }) });
  const rule = dropped[0]?.rule;
  if (rule === "keyCard") return "cutKeyCard";
  if (rule) return "cutNotInDeck";
  return null;
}

/** Whole-word, case-sensitive: whether `text` names `name` outright rather than by key. */
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** A card name as a whole word, any case; a possessive (`Barrowgoyf's`) still names it. */
const nameSource = (name: string) => `(?<![\\p{L}\\p{N}'])${escapeRe(name)}(?![\\p{L}\\p{N}])`;

function namesOutright(text: string, name: string): boolean {
  return new RegExp(nameSource(name), "iu").test(text);
}

/**
 * Turns every card of `names` written outright in a text part into a card part, longest name first,
 * so the app draws it as it draws a key (lock 1: every card name in the line is the app's). A name
 * the reply spelled out is the same card as its key, and leaving it as prose would draw a name the
 * app did not.
 */
function tokenizeNames(parts: FitsSentencePart[], names: readonly { id: string; name: string }[]): FitsSentencePart[] {
  if (names.length === 0) return parts;
  const byLower = new Map(names.map((n) => [n.name.toLowerCase(), n.id]));
  const re = new RegExp([...names].sort((a, b) => b.name.length - a.name.length).map((n) => nameSource(n.name)).join("|"), "giu");
  return parts.flatMap((p): FitsSentencePart[] => {
    if (!("text" in p)) return [p];
    const out: FitsSentencePart[] = [];
    let last = 0;
    for (const m of p.text.matchAll(re)) {
      const id = byLower.get(m[0].toLowerCase());
      if (!id) continue;
      if (m.index! > last) out.push({ text: p.text.slice(last, m.index) });
      out.push({ card: id });
      last = m.index! + m[0].length;
    }
    if (last < p.text.length) out.push({ text: p.text.slice(last) });
    return out;
  });
}

const BASICS = new Set(["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes"]);

/**
 * The picks that count, in the reply's order, at most `FITS_READ_TOP`. Each rule that fails drops
 * that deck and is counted. Pure.
 */
export function validFitsRead(args: {
  reply: FitsReadReply;
  prompt: Pick<FitsReadPrompt, "deckOf" | "cardOf">;
  inputs: FitsReadInputs;
}): FitsReadValidated {
  const { reply, prompt, inputs } = args;
  const candidates = new Set(inputs.candidates.map((c) => c.deckId));
  const spareOf = new Map(inputs.candidates.map((c) => [c.deckId, new Set(c.basicCuts ?? [])]));
  const byId = new Map(inputs.decks.map((d) => [d.deckId, d]));
  const subject = inputs.card;
  // Every card shown: its name and labels, for drawing a token and checking a cite's job.
  const facts = new Map<string, ReadCardFacts>();
  for (const d of inputs.decks) for (const c of [...d.commanders, ...d.list]) facts.set(c.oracleId, c);
  facts.set(subject.oracleId, subject);
  const nameOf = new Map([...facts].map(([id, c]) => [id, c.name]));
  // The keyword rule's facts, keyed by ORACLE ID (two cards may share a name): the line is marked
  // by id below, so a claim is checked against the very card the key named. A card loaded without
  // its text decides nothing (`cardHas`).
  const factsOf = new Map([...facts.values()].map((c): [string, FactCard] => [normalizeName(c.oracleId), {
    oracleId: c.oracleId, name: c.name, typeLine: c.typeLine, quantity: 1, categories: [],
    oracleText: c.oracleText ?? null, ...(c.keywords ? { keywords: [...c.keywords] } : {}),
  }]));
  const shownNames = [...prompt.cardOf.values()].flatMap((id) => {
    const n = nameOf.get(id);
    return n && n.length >= 4 && !BASICS.has(n) ? [{ id, name: n }] : [];
  });

  const drops: Partial<Record<FitsDropReason, number>> = {};
  const drop = (r: FitsDropReason) => { drops[r] = (drops[r] ?? 0) + 1; };
  const seen = new Set<string>();
  const picks: FitsPick[] = [];

  for (const p of reply.picks) {
    const fail = check(p);
    if (typeof fail === "string") { drop(fail); continue; }
    if (picks.length === FITS_READ_TOP) { drop("tooMany"); continue; }
    seen.add(fail.deckId);
    picks.push(fail);
  }
  const outcome: FitsReadOutcome = picks.length > 0 ? "picks" : reply.picks.length === 0 ? "noFit" : "failed";
  return { outcome, picks, drops };

  function check(p: FitsReadReply["picks"][number]): FitsPick | FitsDropReason {
    // 1. A deck the call was shown, a candidate, once.
    const deckId = prompt.deckOf.get(p.deck.trim());
    if (!deckId) return "unknownDeck";
    if (!candidates.has(deckId)) return "notCandidate";
    if (seen.has(deckId)) return "duplicateDeck";
    const deck = byId.get(deckId);
    if (!deck) return "unknownDeck";
    const spare = spareOf.get(deckId) ?? new Set<string>();
    const allowed = new Set([...deck.list.map((c) => c.oracleId), ...deck.commanders.map((c) => c.oracleId), subject.oracleId]);
    const ownDeck = new Set([...deck.list.map((c) => c.oracleId), ...deck.commanders.map((c) => c.oracleId)]);
    const resolve = (key: string) => prompt.cardOf.get(key.trim().replace(/^\{|\}$/g, ""));

    // Parse the sentence into text, card tokens and quotes.
    const text = p.sentence.trim().replace(/\s+/g, " ");
    const parts: FitsSentencePart[] = [];
    let last = 0;
    for (const m of text.matchAll(CARD_TOKEN)) {
      const id = prompt.cardOf.get(m[1]);
      // 2. Every card the sentence names is that deck's, its commander's or the card's.
      if (!id || !allowed.has(id)) return "cardOutsideDeck";
      const before = text.slice(last, m.index);
      if (before) parts.push(...splitQuotes(before));
      parts.push({ card: id });
      last = (m.index ?? 0) + m[0].length;
    }
    const tail = text.slice(last);
    if (tail) parts.push(...splitQuotes(tail));
    // A card of this deck's (or the card itself) written outright is drawn as the card.
    parts.splice(0, parts.length, ...tokenizeNames(parts, shownNames.filter((s) => allowed.has(s.id))));

    const own = parts.flatMap((x) => ("text" in x ? [x.text] : [])).join(" ");
    // 6. A stray brace is a token the parse did not take; a figure or score word reads as a rank. A
    // stray quote mark is a quote the parse did not take (unclosed, or spanning a card token), which
    // would otherwise reach the reader unchecked against the plan (4).
    if (/[{}"“”]/.test(own)) return "malformed";
    // 2, by name: a card shown in the prompt written outright must still be this deck's.
    for (const s of shownNames) if (!allowed.has(s.id) && namesOutright(own, s.name)) return "cardOutsideDeck";
    // The cut and the cites resolve inside the deck too (2).
    const cutId = p.cut === null || p.cut.trim() === "" ? null : resolve(p.cut);
    if (p.cut !== null && p.cut.trim() !== "" && (!cutId || !allowed.has(cutId))) return "cardOutsideDeck";
    const cites: FitsPick["cites"] = [];
    for (const c of p.cites) {
      const id = resolve(c.key);
      if (!id || !allowed.has(id)) return "cardOutsideDeck";
      cites.push({ oracleId: id, job: c.job });
    }
    // 3. The cut.
    if (cutId) {
      const r = cutFailure(cutId, deck, subject.oracleId, nameOf, spare);
      if (r) return r;
    }
    // 4. Every quote is a true quote of this deck's stored plan.
    const quotes = parts.flatMap((x) => ("quote" in x ? [x.quote] : []));
    for (const q of quotes) if (!isPartOf(deck.plan?.text ?? null, q)) return "falseQuote";
    // 5. At least one of this deck's cards (its commander included) by key, or a plan quote.
    const citesDeck = parts.some((x) => "card" in x && ownDeck.has(x.card));
    if (!citesDeck && quotes.length === 0) return "noCitation";
    // 6. No figure, score word or rank in the model's own words; a true quote may hold a figure.
    if (FIGURES.test(own) || SCORE_WORDS.test(own) || RANKS.test(own)) return "figureOrScore";
    const drawn = parts.map((x) => ("card" in x ? nameOf.get(x.card) ?? "" : "quote" in x ? `"${x.quote}"` : x.text)).join("");
    if (drawn.trim().length === 0 || drawn.length > FITS_READ_SENTENCE_MAX_CHARS) return "tooLong";
    // 7. A keyword the line credits to a card is on that card (`keywordClaims`, the Overview's rule).
    const marked = parts.map((x) => ("card" in x ? `[[${x.card}]]` : "quote" in x ? `"${x.quote}"` : x.text)).join("");
    if (keywordClaims(marked, factsOf).length > 0) return "keywordClaim";
    // 8. A cut, whenever the deck holds a card that may be one.
    if (!cutId && deck.list.some((c) => c.oracleId !== subject.oracleId && cutFailure(c.oracleId, deck, subject.oracleId, nameOf, spare) === null)) return "noCut";
    // 7. Each cite's job is a label kind that card carries.
    for (const c of cites) if (!(facts.get(c.oracleId)?.kinds ?? []).includes(c.job)) return "jobMismatch";
    return { deckId, parts, cut: cutId ?? null, cites };
  }
}

function splitQuotes(text: string): FitsSentencePart[] {
  const out: FitsSentencePart[] = [];
  let last = 0;
  for (const m of text.matchAll(QUOTE)) {
    const before = text.slice(last, m.index);
    if (before) out.push({ text: before });
    out.push({ quote: m[1] });
    last = (m.index ?? 0) + m[0].length;
  }
  const tail = text.slice(last);
  if (tail) out.push({ text: tail });
  return out;
}
