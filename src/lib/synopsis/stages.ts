import { z } from "zod";

import { refIndex } from "./claims";
import { deckNameIndex, normalizeName, type FactCard, type SynopsisFacts } from "./facts";
import { CHAR_BUDGETS } from "./limits";
import { synopsisResponseSchemaV8Wire } from "./response-schema";
import type { CheckedSynopsis } from "./types";
import { marksIn, rendered } from "./validate";

/**
 * THE STAGES SHAPE, TEST TOOLING ONLY (lane a6, Overview stage-shape test; plan "Combined plan",
 * Hugh 2026-10-29: for every deck, not precons alone). Nothing in the app imports this module: the
 * shipped prompt, the shipped schema and the renderer are unchanged. `buildSynopsisPrompt` takes the
 * `stages` option for the eval harness (`scripts/eval/overview-stages.mts`) alone.
 *
 * The reply is the contract-8 reply with ONE optional field added (`alternate`), so the contract-8
 * validator still reads it unchanged. The new rendered lines are represented as:
 *  - the three stages: `primer.strategy`, exactly three lines, labeled by POSITION (Early, Mid,
 *    Close). The model never writes a label, so a stage's label can never disagree with its slot.
 *  - Wins by: DERIVED at assembly from `plans.primary`, which every contract-8 reply already
 *    writes first and the app never rendered. No new field; the stages prompt adds its length
 *    and marking rules to the plans line.
 *  - the alternate commander: the optional `alternate` ({ text, evidence }), asked for only when
 *    the facts carry an alternate commander (`stages.alternates`), and absent otherwise.
 *
 * Every check here is PURE: it reads the reply (or a stored content) and the facts, never a database.
 */

/** The stage labels, by position in `primer.strategy`. */
export const STAGE_LABELS = ["Early", "Mid", "Close"] as const;

/** The stages shape's counts and budgets. Tips are exactly 2; every new line is a strategy step's 144. */
export const STAGES_LIMITS = {
  stages: STAGE_LABELS.length,
  stage: CHAR_BUDGETS.strategy,
  winsBy: CHAR_BUDGETS.strategy,
  alternate: CHAR_BUDGETS.strategy,
  // Exactly 2 from iteration 2 (coordinator, 2026-10-29): iteration 1's tips repeated the stages' cards.
  tips: { min: 2, max: 2 },
} as const;

const claimed = z.object({ text: z.string().max(2_000), evidence: z.array(z.string().max(16)).max(12) });

/** The contract-8 wire reply plus the optional alternate-commander line. Shape only, as its parent. */
export const stagesResponseSchemaWire = synopsisResponseSchemaV8Wire.extend({ alternate: claimed.optional() });
export type StagesReply = z.infer<typeof stagesResponseSchemaWire>;

/**
 * The alternate commanders a precon's box carries: the MTGJSON deck file's main-board cards that are
 * FOIL and can lead a deck (`leadershipSkills.commander`), the face commanders excepted. NOT
 * `displayCommander`, which names the face commander itself (checked on C16, C17, LCC, LTC and FDC
 * files, 2026-10-29). The precon boxes print their alternates in foil beside the face commander.
 */
export type MtgjsonCard = { name?: unknown; isFoil?: unknown; leadershipSkills?: { commander?: unknown } | null };
export function alternateCommanders(file: { data?: { commander?: unknown; mainBoard?: unknown } }): string[] {
  const data = file?.data;
  const faces = new Set((Array.isArray(data?.commander) ? data.commander as MtgjsonCard[] : []).map((c) => String(c.name)));
  const main = Array.isArray(data?.mainBoard) ? data.mainBoard as MtgjsonCard[] : [];
  return [...new Set(main
    .filter((c) => c.isFoil === true && c.leadershipSkills?.commander === true && typeof c.name === "string" && !faces.has(c.name))
    .map((c) => c.name as string))];
}

/** One rendered line, with the deck-local refs it cites when it has any (a stored old row has none). */
export type Line = { text: string; refs?: string[] };

/**
 * Everything a reader is shown, section by section, as one shape for both sides. The old shape has
 * `strategy` (Core strategy) and no stages, Wins by or alternate; the new one has `stages` and no
 * `strategy`. The fixed land line above the Mulligan is the same on both sides and is left out.
 */
export type OverviewDoc = {
  overview: Line[];
  strategy: Line[];
  stages: Line[];
  winsBy: Line[];
  alternate: Line[];
  keep: Line[];
  sendBack: Line[];
  tips: Line[];
  keyCards: { card: string; job: Line }[];
  weaknesses: Line[];
};

const EMPTY: OverviewDoc = { overview: [], strategy: [], stages: [], winsBy: [], alternate: [], keep: [], sendBack: [], tips: [], keyCards: [], weaknesses: [] };

/** What a stored (old) content shows: only the sections that passed. */
export function docFromChecked(content: CheckedSynopsis): OverviewDoc {
  const line = (text: string): Line => ({ text });
  return {
    ...EMPTY,
    overview: content.overview ? [line(content.overview)] : [],
    strategy: content.primer?.strategy.map(line) ?? [],
    keep: content.primer?.mulligan.keep.map(line) ?? [],
    sendBack: content.primer?.mulligan.sendBack.map(line) ?? [],
    tips: content.primer?.tips.map((t) => line(t.text)) ?? [],
    keyCards: content.keyCards?.map((k) => ({ card: k.card, job: line(k.job) })) ?? [],
    weaknesses: content.weaknesses?.map(line) ?? [],
  };
}

/**
 * What the stages reply SAYS, every line as written with its refs: what the checks read. The
 * weaknesses are the checklist's weakness lines (the validator's ranking and cut are its own).
 */
export function docFromStagesReply(reply: StagesReply): OverviewDoc {
  const l = (x: { text: string; evidence: string[] }): Line => ({ text: x.text, refs: x.evidence });
  return {
    ...EMPTY,
    overview: [{ text: reply.overview }],
    stages: reply.primer.strategy.map(l),
    winsBy: [{ text: reply.plans.primary }],
    alternate: reply.alternate ? [l(reply.alternate)] : [],
    keep: reply.primer.mulligan.keep.map(l),
    sendBack: reply.primer.mulligan.sendBack.map(l),
    tips: reply.primer.tips.map(l),
    keyCards: reply.keyCards.map((k) => ({ card: k.card, job: { text: k.job, refs: k.evidence } })),
    weaknesses: reply.assessment.filter((a) => a.line && a.line.trim() !== "").map((a) => ({ text: a.line!, refs: a.evidence })),
  };
}

/**
 * What a reader of the NEW shape is shown: the validated content (a refused section shows nothing),
 * its strategy shown as the stages, plus Wins by and the alternate line from the reply.
 */
export function docShownNew(content: CheckedSynopsis, reply: StagesReply): OverviewDoc {
  const old = docFromChecked(content);
  return {
    ...old,
    strategy: [],
    stages: old.strategy,
    winsBy: reply.plans.primary.trim() ? [{ text: reply.plans.primary }] : [],
    alternate: reply.alternate ? [{ text: reply.alternate.text }] : [],
  };
}

/** Every line of a doc with where it is, the Key cards' names included (a row shows the name). */
function allLines(doc: OverviewDoc): { where: string; text: string; refs?: string[] }[] {
  const out: { where: string; text: string; refs?: string[] }[] = [];
  const add = (key: Exclude<keyof OverviewDoc, "keyCards">) => doc[key].forEach((l, i) => out.push({ where: `${key}[${i}]`, ...l }));
  (["overview", "strategy", "stages", "winsBy", "alternate", "keep", "sendBack", "tips"] as const).forEach(add);
  doc.keyCards.forEach((k, i) => out.push({ where: `keyCards[${i}]`, ...k.job }));
  add("weaknesses");
  return out;
}

/** The rendered length of everything shown: each line as it renders ([[Name]] as the name) plus each Key card's name. Labels and headings are chrome on both sides and are not counted. */
export function renderedTotal(doc: OverviewDoc): number {
  return allLines(doc).reduce((n, l) => n + rendered(l.text).trim().length, 0)
    + doc.keyCards.reduce((n, k) => n + k.card.trim().length, 0);
}

type Deck = { names: Map<string, { oracleId: string; name: string }>; refs: Map<string, FactCard>; byId: Map<string, FactCard>; commanders: Set<string> };
function deckOf(facts: Pick<SynopsisFacts, "cards" | "commanders">): Deck {
  const names = deckNameIndex(facts.cards);
  const commanders = new Set(facts.commanders.flatMap((n) => { const c = names.get(normalizeName(n)); return c ? [c.oracleId] : []; }));
  return { names, refs: refIndex(facts.cards), byId: new Map(facts.cards.map((c) => [c.oracleId, c])), commanders };
}
const refCard = (deck: Deck, ref: string) => deck.refs.get(ref.trim().toLowerCase());

export type CheckResult<T> = { pass: boolean; offenders: T[] };

/**
 * ZERO CARDS NOT IN THE LIST: every `[[Name]]` mark outside the Weaknesses (which may name a card the
 * deck lacks) resolves to a deck card, every Key card is one, and every evidence ref resolves.
 */
export function checkCardsInList(doc: OverviewDoc, facts: Pick<SynopsisFacts, "cards" | "commanders">): CheckResult<{ where: string; name: string; kind: "mark" | "ref" | "keyCard" }> {
  const deck = deckOf(facts);
  const offenders: { where: string; name: string; kind: "mark" | "ref" | "keyCard" }[] = [];
  for (const l of allLines(doc)) {
    const weakness = l.where.startsWith("weaknesses");
    if (!weakness) for (const m of marksIn(l.text)) if (!deck.names.has(normalizeName(m))) offenders.push({ where: l.where, name: m, kind: "mark" });
    for (const r of l.refs ?? []) if (!refCard(deck, r)) offenders.push({ where: l.where, name: r, kind: "ref" });
  }
  doc.keyCards.forEach((k, i) => { if (!deck.names.has(normalizeName(k.card))) offenders.push({ where: `keyCards[${i}]`, name: k.card, kind: "keyCard" }); });
  return { pass: offenders.length === 0, offenders };
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const ORDINALS: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10 };
const NUM = `(\\d+|${Object.keys(NUMBER_WORDS).join("|")})`;
const num = (s: string) => (/^\d+$/.test(s) ? Number(s) : NUMBER_WORDS[s.toLowerCase()]!);

/**
 * The turn numbers a text states: "turn 3", "turns 1-3", "turns two to four", "turn-three", "by turn
 * 5", "the third turn", "T3". Read outside card marks, so a card's name never counts.
 */
export function turnNumbers(text: string): number[] {
  // Power/toughness ("turns 1/1s into 3/3s", "+1/+1") is a stat, never a turn.
  const prose = text.replace(/\[\[[^\[\]]+\]\]/g, " ").replace(/[+-]?(?:\d+|X)\/[+-]?(?:\d+|X)/gi, " ");
  const out: number[] = [];
  const range = new RegExp(`\\bturns?[\\s-]*${NUM}(?:\\s*(?:-|\\u2013|to|or|and|through)\\s*${NUM})?\\b`, "gi");
  for (const m of prose.matchAll(range)) { out.push(num(m[1])); if (m[2]) out.push(num(m[2])); }
  for (const m of prose.matchAll(new RegExp(`\\b(${Object.keys(ORDINALS).join("|")})\\s+turn\\b`, "gi"))) out.push(ORDINALS[m[1].toLowerCase()]!);
  for (const m of prose.matchAll(/\bT(\d+)\b/g)) out.push(Number(m[1]));
  return out;
}

/** ZERO TURN NUMBERS other than the computed commander cast turn, in any line shown (a null cast turn allows none). */
export function checkTurnNumbers(doc: OverviewDoc, castTurn: number | null): CheckResult<{ where: string; turn: number; text: string }> {
  const offenders = allLines(doc).flatMap((l) => turnNumbers(l.text).filter((n) => n !== castTurn).map((turn) => ({ where: l.where, turn, text: l.text })));
  return { pass: offenders.length === 0, offenders };
}

/**
 * The sections the repetition rule spans: a card is explained in ONE of them. The old shape's Core
 * strategy stands where the stages stand. A Key card's own name is the row's subject, not a mention:
 * only the cards its JOB names count, so a card may be a Key card and appear in one other section.
 */
export const REPETITION_SECTIONS = ["overview", "stages", "winsBy", "alternate", "tips", "keyCardJobs"] as const;
export type RepetitionSection = (typeof REPETITION_SECTIONS)[number];

/**
 * ZERO CARDS EXPLAINED TWICE: each deck card marked in text in more than one repetition section is an
 * offender, with the sections it is in. `pass` is the rule as written; `passExceptCommanders` the same
 * with the commanders left out, since the overview and the Early stage both have reason to name the
 * commander (reported apart, for a ruling).
 */
export function checkExplainedOnce(doc: OverviewDoc, facts: Pick<SynopsisFacts, "cards" | "commanders">): CheckResult<{ card: string; sections: RepetitionSection[]; commander: boolean }> & { passExceptCommanders: boolean } {
  const deck = deckOf(facts);
  const seen = new Map<string, Set<RepetitionSection>>();
  const note = (section: RepetitionSection, lines: readonly Line[]) => {
    for (const l of lines) for (const m of marksIn(l.text)) {
      const c = deck.names.get(normalizeName(m));
      if (!c) continue;
      if (!seen.has(c.oracleId)) seen.set(c.oracleId, new Set());
      seen.get(c.oracleId)!.add(section);
    }
  };
  note("overview", doc.overview);
  note("stages", [...doc.stages, ...doc.strategy]);
  note("winsBy", doc.winsBy);
  note("alternate", doc.alternate);
  note("tips", doc.tips);
  note("keyCardJobs", doc.keyCards.map((k) => k.job));
  const offenders = [...seen].filter(([, s]) => s.size > 1).map(([id, s]) => ({
    card: deck.byId.get(id)!.name,
    sections: REPETITION_SECTIONS.filter((x) => s.has(x)),
    commander: deck.commanders.has(id),
  }));
  return { pass: offenders.length === 0, passExceptCommanders: offenders.every((o) => o.commander), offenders };
}

/**
 * The most an Early card may cost: the computed cast turn plus one (turn 3 when the cast turn is
 * unknown). The rule chosen: Early is the turns up to the commander, and a card a turn after it is
 * still setup; anything dearer is the engine or the close. Commanders are exempt (the cast turn is theirs).
 */
export function earlyMaxManaValue(castTurn: number | null): number {
  return (castTurn ?? 3) + 1;
}

/** STAGE CARDS FIT THEIR STAGE: every non-commander card the Early line names or cites costs at most `earlyMaxManaValue`. A card with no known mana value is not judged. */
export function checkStageFit(doc: OverviewDoc, facts: Pick<SynopsisFacts, "cards" | "commanders">, castTurn: number | null): CheckResult<{ card: string; manaValue: number; max: number }> & { max: number } {
  const deck = deckOf(facts);
  const max = earlyMaxManaValue(castTurn);
  const early = doc.stages[0];
  if (!early) return { pass: true, offenders: [], max };
  const ids = new Set<string>();
  for (const m of marksIn(early.text)) { const c = deck.names.get(normalizeName(m)); if (c) ids.add(c.oracleId); }
  for (const r of early.refs ?? []) { const c = refCard(deck, r); if (c) ids.add(c.oracleId); }
  const offenders = [...ids].flatMap((id) => {
    const c = deck.byId.get(id)!;
    return !deck.commanders.has(id) && c.manaValue !== undefined && c.manaValue > max ? [{ card: c.name, manaValue: c.manaValue, max }] : [];
  });
  return { pass: offenders.length === 0, offenders, max };
}

/**
 * EVERY STAGE LINE NAMES A DECK CARD: exactly three stage lines, each marking at least one deck card
 * and citing at least one ref that resolves (when the line carries refs at all).
 */
export function checkStagesNameCards(doc: OverviewDoc, facts: Pick<SynopsisFacts, "cards" | "commanders">): CheckResult<{ stage: string; why: string }> {
  const deck = deckOf(facts);
  const offenders: { stage: string; why: string }[] = [];
  if (doc.stages.length !== STAGE_LABELS.length) offenders.push({ stage: "all", why: `${doc.stages.length} stage lines, not ${STAGE_LABELS.length}` });
  doc.stages.forEach((l, i) => {
    const stage = STAGE_LABELS[i] ?? `extra ${i + 1}`;
    if (!marksIn(l.text).some((m) => deck.names.has(normalizeName(m)))) offenders.push({ stage, why: "names no deck card" });
    if (l.refs && !l.refs.some((r) => refCard(deck, r))) offenders.push({ stage, why: "cites no deck card" });
  });
  return { pass: offenders.length === 0, offenders };
}

/** TOTAL LENGTH: the new shape shows no more text than the old one for the same deck. */
export function checkLength(newDoc: OverviewDoc, oldDoc: OverviewDoc): { pass: boolean; newChars: number; oldChars: number } {
  const newChars = renderedTotal(newDoc);
  const oldChars = renderedTotal(oldDoc);
  return { pass: newChars <= oldChars, newChars, oldChars };
}

/**
 * The shape's own counts and budgets: three stages of at most 144, Wins by and the alternate at most
 * 144, exactly 2 tips, and the alternate line present exactly when the facts carry an alternate commander,
 * naming one of them.
 */
export function checkShape(doc: OverviewDoc, alternates: readonly string[]): CheckResult<string> {
  const offenders: string[] = [];
  const len = (l: Line) => rendered(l.text).trim().length;
  if (doc.stages.length !== STAGES_LIMITS.stages) offenders.push(`${doc.stages.length} stages`);
  doc.stages.forEach((l, i) => { if (len(l) > STAGES_LIMITS.stage) offenders.push(`${STAGE_LABELS[i] ?? i} is ${len(l)} characters`); });
  doc.winsBy.forEach((l) => { if (len(l) > STAGES_LIMITS.winsBy) offenders.push(`Wins by is ${len(l)} characters`); });
  if (doc.winsBy.length === 0) offenders.push("no Wins by line");
  if (doc.tips.length < STAGES_LIMITS.tips.min || doc.tips.length > STAGES_LIMITS.tips.max) offenders.push(`${doc.tips.length} tips`);
  if (alternates.length === 0 && doc.alternate.length > 0) offenders.push("an alternate line with no alternate commander in the facts");
  if (alternates.length > 0 && doc.alternate.length === 0) offenders.push("no alternate line though the facts carry one");
  for (const l of doc.alternate) {
    if (len(l) > STAGES_LIMITS.alternate) offenders.push(`the alternate line is ${len(l)} characters`);
    const wanted = new Set(alternates.map(normalizeName));
    if (alternates.length > 0 && !marksIn(l.text).some((m) => wanted.has(normalizeName(m)))) offenders.push("the alternate line names none of the alternate commanders");
  }
  return { pass: offenders.length === 0, offenders };
}

export type StagesChecks = {
  cardsInList: ReturnType<typeof checkCardsInList>;
  turnNumbers: ReturnType<typeof checkTurnNumbers>;
  explainedOnce: ReturnType<typeof checkExplainedOnce>;
  stageFit: ReturnType<typeof checkStageFit>;
  stagesNameCards: ReturnType<typeof checkStagesNameCards>;
  length: ReturnType<typeof checkLength>;
  shape: ReturnType<typeof checkShape>;
};

/** Every auto-pass check on one deck's new reply, against its old shown content. */
export function stagesChecks(input: { reply: StagesReply; shownNew: OverviewDoc; oldDoc: OverviewDoc; facts: SynopsisFacts; alternates: readonly string[] }): StagesChecks {
  const doc = docFromStagesReply(input.reply);
  const castTurn = input.facts.stats?.commanderCastTurn ?? null;
  return {
    cardsInList: checkCardsInList(doc, input.facts),
    turnNumbers: checkTurnNumbers(doc, castTurn),
    explainedOnce: checkExplainedOnce(doc, input.facts),
    stageFit: checkStageFit(doc, input.facts, castTurn),
    stagesNameCards: checkStagesNameCards(doc, input.facts),
    length: checkLength(input.shownNew, input.oldDoc),
    shape: checkShape(doc, input.alternates),
  };
}

/**
 * The reply a reader's shown content was taken from after the app's one repair: the repaired
 * sections from the repair's reply, every other section (and `plans`, so Wins by, and `alternate`)
 * from the first. Mirrors `mergeRetry`, which keeps passing sections byte for byte.
 */
export function mergeStagesReply(first: StagesReply, repair: StagesReply | null, repaired: readonly string[]): StagesReply {
  if (!repair) return first;
  const take = (s: string) => repaired.includes(s);
  return {
    ...first,
    overview: take("overview") ? repair.overview : first.overview,
    primer: take("primer") ? repair.primer : first.primer,
    keyCards: take("keyCards") ? repair.keyCards : first.keyCards,
    assessment: take("weaknesses") ? repair.assessment : first.assessment,
  };
}
