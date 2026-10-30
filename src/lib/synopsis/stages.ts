import { z } from "zod";

import { refIndex } from "./claims";
import { deckNameIndex, HAND_SIZE, normalizeName, type FactCard, type SynopsisFacts } from "./facts";
import { isLandFace, playableAsLand } from "../cards/facet";
import { CHAR_BUDGETS, SECTION_COUNTS, TIP_MIN_CARDS } from "./limits";
import { synopsisResponseSchemaV8Wire } from "./response-schema";
import type { CheckedSynopsis, SectionId } from "./types";
import { figuresIn, marksIn, rendered } from "./validate";
import { LAND_COUNT_WORDS, statedLandNumbers } from "./land-count";

export { statedLandNumbers };

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
 * ITERATION 3 (Hugh, 2026-10-29: test the trims before adopting anywhere, on precons AND players'
 * own decks) is a second SHAPE beside iteration 2's, which stays runnable byte for byte:
 *  - no Wins by line (`plans.primary` is still written first, and not shown);
 *  - a Key card is never a card a stage already explained: the Key card's own name counts as a
 *    mention (`checkExplainedOnce` with `keyCardNames`);
 *  - the land line is the model's `landKeep`, a deck-specific land number the app computes from
 *    the curve and land count (`landKeepNumber`), stated with its reason, in place of the fixed
 *    range; every other mulligan line names a deck card (`checkMulliganSpecific`);
 *  - exactly 2 tips; the alternate line only for a precon whose box carries alternates
 *    (`SECTION_SCOPE` marks it precon only, and a player's deck reads right without it).
 *
 * Every check here is PURE: it reads the reply (or a stored content) and the facts, never a database.
 */

/** Which shape a run asks for: iteration 2's (with Wins by) or iteration 3's (land line, no Wins by). Iteration 1 used 2's prompt. */
export type StagesShape = 2 | 3;
export const shapeOfIteration = (iteration: number): StagesShape => (iteration >= 3 ? 3 : 2);

/** The stage labels, by position in `primer.strategy`. */
export const STAGE_LABELS = ["Early", "Mid", "Close"] as const;

/** The stages shape's counts and budgets. Tips are exactly 2; every new line is a strategy step's 144. */
export const STAGES_LIMITS = {
  stages: STAGE_LABELS.length,
  stage: CHAR_BUDGETS.strategy,
  winsBy: CHAR_BUDGETS.strategy,
  alternate: CHAR_BUDGETS.strategy,
  /** Iteration 3's land line: a mulligan line's 80 plus room for its reason. */
  landKeep: 120,
  // Exactly 2 from iteration 2 (coordinator, 2026-10-29): iteration 1's tips repeated the stages' cards.
  tips: { min: 2, max: 2 },
} as const;

const claimed = z.object({ text: z.string().max(2_000), evidence: z.array(z.string().max(16)).max(12) });

/** The contract-8 wire reply plus the optional alternate-commander line. Shape only, as its parent. */
export const stagesResponseSchemaWire = synopsisResponseSchemaV8Wire.extend({ alternate: claimed.optional() });
/** Iteration 3's reply: iteration 2's plus the REQUIRED land line. Iteration 2's schema is left as it was. */
export const stagesResponseSchemaWireV3 = stagesResponseSchemaWire.extend({ landKeep: claimed });
export type StagesReply = z.infer<typeof stagesResponseSchemaWire> & { landKeep?: z.infer<typeof claimed> };
/**
 * Iteration 3's reply for a precon whose box carries an alternate commander: the alternate line is
 * REQUIRED in the schema, not only asked for in the prompt. The reply is constrained server-side to
 * the schema (`callModel`, `output_config.format`), so the model cannot leave it out; the prompt
 * alone did not hold (CounterIntelligence_EOC, iteration 3, 2026-10-29).
 */
export const stagesResponseSchemaWireV3Alternate = stagesResponseSchemaWireV3.extend({ alternate: claimed });
/** The schema a deck's reply is asked for in: iteration 3 requires the alternate line when the box carries one. Iteration 2's is unchanged. */
export const stagesSchemaFor = (shape: StagesShape, alternates: readonly string[] = []) =>
  (shape === 3 ? (alternates.length > 0 ? stagesResponseSchemaWireV3Alternate : stagesResponseSchemaWireV3) : stagesResponseSchemaWire);

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
 * `strategy`. The fixed land line above the Mulligan is the app's and is left out; iteration 3's
 * `landKeep` replaces it on the new side and, being the model's, is counted.
 */
export type OverviewDoc = {
  overview: Line[];
  strategy: Line[];
  stages: Line[];
  winsBy: Line[];
  alternate: Line[];
  /** Iteration 3: the model's land line, shown first under the Mulligan in place of the fixed range. */
  landKeep: Line[];
  keep: Line[];
  sendBack: Line[];
  tips: Line[];
  keyCards: { card: string; job: Line }[];
  weaknesses: Line[];
};

const EMPTY: OverviewDoc = { overview: [], strategy: [], stages: [], winsBy: [], alternate: [], landKeep: [], keep: [], sendBack: [], tips: [], keyCards: [], weaknesses: [] };

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
export function docFromStagesReply(reply: StagesReply, shape: StagesShape = 2): OverviewDoc {
  const l = (x: { text: string; evidence: string[] }): Line => ({ text: x.text, refs: x.evidence });
  return {
    ...EMPTY,
    overview: [{ text: reply.overview }],
    stages: reply.primer.strategy.map(l),
    winsBy: shape === 3 ? [] : [{ text: reply.plans.primary }],
    alternate: reply.alternate ? [l(reply.alternate)] : [],
    landKeep: shape === 3 && reply.landKeep ? [l(reply.landKeep)] : [],
    keep: reply.primer.mulligan.keep.map(l),
    sendBack: reply.primer.mulligan.sendBack.map(l),
    tips: reply.primer.tips.map(l),
    keyCards: reply.keyCards.map((k) => ({ card: k.card, job: { text: k.job, refs: k.evidence } })),
    weaknesses: reply.assessment.filter((a) => a.line && a.line.trim() !== "").map((a) => ({ text: a.line!, refs: a.evidence })),
  };
}

/**
 * What a reader of the NEW shape is shown: the validated content (a refused section shows nothing),
 * its strategy shown as the stages, plus Wins by (iteration 2) or the land line (iteration 3) and the
 * alternate line from the reply. The land line, like the alternate, is not a contract-8 section, so
 * the app's validator never sees it; the checks here are its only gate.
 */
export function docShownNew(content: CheckedSynopsis, reply: StagesReply, shape: StagesShape = 2): OverviewDoc {
  const old = docFromChecked(content);
  return {
    ...old,
    strategy: [],
    stages: old.strategy,
    winsBy: shape === 2 && reply.plans.primary.trim() ? [{ text: reply.plans.primary }] : [],
    alternate: reply.alternate ? [{ text: reply.alternate.text }] : [],
    landKeep: shape === 3 && reply.landKeep ? [{ text: reply.landKeep.text }] : [],
  };
}

/** Every line of a doc with where it is, the Key cards' names included (a row shows the name). */
function allLines(doc: OverviewDoc): { where: string; text: string; refs?: string[] }[] {
  const out: { where: string; text: string; refs?: string[] }[] = [];
  const add = (key: Exclude<keyof OverviewDoc, "keyCards">) => doc[key].forEach((l, i) => out.push({ where: `${key}[${i}]`, ...l }));
  (["overview", "strategy", "stages", "winsBy", "alternate", "landKeep", "keep", "sendBack", "tips"] as const).forEach(add);
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

/** A word before "turn N" that makes it a game turn ("on turn 3", "by turn five", "around turn 4"). */
const TURN_ANCHORS = new Set(["on", "by", "around", "until", "till", "before", "after", "from", "of", "through", "to", "than", "at", "since", "the", "a", "your", "their", "its", "each", "every", "as", "about", "near", "past", "in", "for"]);

/**
 * The turn numbers a text states: "on turn 3", "turns 1-3", "turns two to four", "turn-three", "by
 * turn 5", "the third turn", "T3". Read outside card marks, so a card's name never counts.
 *
 * THE VERB IS NOT A TURN: "it turns two tokens into threats", "turn 3 creatures face up". So "turn N"
 * counts only where it reads as a game turn: after an anchor word (`TURN_ANCHORS`), joined by a
 * hyphen ("turn-three"), as a plural range ("turns 1-3", "turns two to four"), or closing its clause
 * ("Turn 3:", "...of turn 6."), i.e. not followed by a word. A count of turns ("for two turns") states
 * no turn number and is not read.
 */
export function turnNumbers(text: string): number[] {
  // Power/toughness ("turns 1/1s into 3/3s", "+1/+1") is a stat, never a turn.
  const prose = text.replace(/\[\[[^\[\]]+\]\]/g, " ").replace(/[+-]?(?:\d+|X)\/[+-]?(?:\d+|X)/gi, " ");
  const out: number[] = [];
  const range = new RegExp(`\\bturn(s?)(\\s*-\\s*|\\s+)${NUM}(?:\\s*(?:-|\\u2013|to|or|and|through)\\s*${NUM})?\\b`, "gi");
  for (const m of prose.matchAll(range)) {
    const before = /([A-Za-z]+)\W*$/.exec(prose.slice(0, m.index))?.[1]?.toLowerCase();
    const after = prose.slice(m.index + m[0].length);
    const game = (before !== undefined && TURN_ANCHORS.has(before))
      || (m[1] === "" && m[2].includes("-"))
      || (m[1] === "s" && m[4] !== undefined)
      || !/^\s*[A-Za-z]/.test(after);
    if (!game) continue;
    out.push(num(m[3]));
    if (m[4]) out.push(num(m[4]));
  }
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
 * strategy stands where the stages stand. Iteration 2: a Key card's own name is the row's subject,
 * not a mention: only the cards its JOB names count, so a card may be a Key card and appear in one
 * other section. Iteration 3 (`keyCardNames`): the row's own name counts too, in the same bucket as
 * its job, so a Key card a stage (or any other section) already explained is a repeat.
 */
export const REPETITION_SECTIONS = ["overview", "stages", "winsBy", "alternate", "tips", "keyCardJobs"] as const;
export type RepetitionSection = (typeof REPETITION_SECTIONS)[number];

/**
 * ZERO CARDS EXPLAINED TWICE: each deck card marked in text in more than one repetition section is an
 * offender, with the sections it is in. `pass` is the rule as written; `passExceptCommanders` the same
 * with the commanders left out, since the overview and the Early stage both have reason to name the
 * commander (reported apart, for a ruling).
 */
export function checkExplainedOnce(doc: OverviewDoc, facts: Pick<SynopsisFacts, "cards" | "commanders">, opts: { keyCardNames?: boolean } = {}): CheckResult<{ card: string; sections: RepetitionSection[]; commander: boolean }> & { passExceptCommanders: boolean } {
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
  note("keyCardJobs", doc.keyCards.map((k) => (opts.keyCardNames ? { text: `[[${k.card}]] ${k.job.text}` } : k.job)));
  const offenders = [...seen].filter(([, s]) => s.size > 1).map(([id, s]) => ({
    card: deck.byId.get(id)!.name,
    sections: REPETITION_SECTIONS.filter((x) => s.has(x)),
    commander: deck.commanders.has(id),
  }));
  // The commander may be named in more than one section (the overview and Early), and that is
  // exempt. Iteration 3 (`keyCardNames`) never lets the commander be a Key card or a job's card, so a
  // commander repeat that involves the Key cards is not exempt there.
  const exempt = (o: { sections: RepetitionSection[]; commander: boolean }) => o.commander && !(opts.keyCardNames && o.sections.includes("keyCardJobs"));
  return { pass: offenders.length === 0, passExceptCommanders: offenders.every(exempt), offenders };
}

/**
 * THE EXPLAINED-ONCE POST-PASS (iteration 3, after the i3 run: ScrappySurvivors_PIP named Mantle of
 * the Ancients as a Key card and in a tip; CounterIntelligence_EOC named Hangarback Walker in a stage
 * and a tip, and Kappa Cannoneer in a stage and as a Key card). Deterministic, no model call.
 *
 * The sections are read in order, stages, then Key cards, then tips, and the EARLIER one keeps a
 * non-commander card (the commander is never touched):
 *  - a Key card whose own card a stage already explained is DROPPED (the row is about that card and
 *    has nothing left); a job that marks such a card keeps its words and loses the mark. Nothing
 *    refills the section: a Key cards section the drop leaves under `SECTION_COUNTS.keyCards.min`
 *    fails `checkShape` (iteration 3) and the reply needs a repair;
 *  - a tip that marks such a card keeps its words and loses that card's MARK (and its evidence ref),
 *    so the tip's subject is the cards it still marks. A tip is never deleted: tips are exactly 2;
 *  - a tip that would mark fewer than `TIP_MIN_CARDS` cards once the earlier-explained ones are taken
 *    out (the validator refuses such a tip, `tip_too_few_cards`) has lost a subject it needs: it is
 *    left exactly as written and REPORTED (`tipsWithoutSubject`), so `checkNoCardTwice` still fails
 *    it and the reply needs a repair, never a silent fix.
 * A mark is what makes a card a line's subject (`checkExplainedOnce` and `checkNoCardTwice` count
 * marks); a name left as plain text is a reference to a card explained elsewhere.
 */
export type DedupeReport = {
  droppedKeyCards: { card: string; explainedIn: "stages" }[];
  unmarked: { where: string; card: string; explainedIn: "stages" | "keyCards" }[];
  tipsWithoutSubject: { tip: number; text: string; cards: string[] }[];
};
export function dedupeSections(doc: OverviewDoc, facts: Pick<SynopsisFacts, "cards" | "commanders">): { doc: OverviewDoc; report: DedupeReport } {
  const deck = deckOf(facts);
  const report: DedupeReport = { droppedKeyCards: [], unmarked: [], tipsWithoutSubject: [] };
  const explained = new Map<string, "stages" | "keyCards">();
  const idOf = (name: string) => {
    const c = deck.names.get(normalizeName(name));
    return c && !deck.commanders.has(c.oracleId) ? c.oracleId : null;
  };
  const note = (text: string, section: "stages" | "keyCards") => {
    for (const m of marksIn(text)) { const id = idOf(m); if (id && !explained.has(id)) explained.set(id, section); }
  };
  /** The line with every mark of an already-explained card written as plain text, and those cards' refs dropped. */
  const unmark = (line: Line, where: string): { line: Line; removed: string[]; left: string[] } => {
    const removed: string[] = [];
    const left: string[] = [];
    const text = line.text.replace(/\[\[([^\[\]]+)\]\]/g, (whole, name: string) => {
      const id = idOf(name);
      const from = id ? explained.get(id) : undefined;
      if (!from) { left.push(name); return whole; }
      removed.push(name);
      report.unmarked.push({ where, card: deck.byId.get(id!)!.name, explainedIn: from });
      return name;
    });
    const gone = new Set(removed.flatMap((n) => { const id = idOf(n); return id ? [id] : []; }));
    const refs = line.refs?.filter((r) => { const c = refCard(deck, r); return !c || !gone.has(c.oracleId); });
    return { line: { ...line, text, ...(line.refs ? { refs } : {}) }, removed, left };
  };

  for (const l of [...doc.stages, ...doc.strategy]) note(l.text, "stages");
  const keyCards: OverviewDoc["keyCards"] = [];
  doc.keyCards.forEach((k) => {
    const id = idOf(k.card);
    if (id && explained.get(id) === "stages") { report.droppedKeyCards.push({ card: deck.byId.get(id)!.name, explainedIn: "stages" }); return; }
    const job = unmark(k.job, `keyCards[${keyCards.length}] (${k.card})`).line;
    keyCards.push({ card: k.card, job });
  });
  for (const k of keyCards) { const id = idOf(k.card); if (id && !explained.has(id)) explained.set(id, "keyCards"); note(k.job.text, "keyCards"); }
  const tips = doc.tips.map((t, i) => {
    const marked = marksIn(t.text);
    const subjects = marked.filter((m) => { const id = idOf(m); return !id || !explained.has(id); });
    // Counted by the card each mark resolves to, as the validator counts a tip's cards, so `[[Fire]]`
    // and `[[Ice]]` are one subject (Fire // Ice); a mark that resolves to nothing counts by its spelling.
    const cardOf = (m: string) => deck.names.get(normalizeName(m))?.oracleId ?? `?${normalizeName(m)}`;
    if (subjects.length < marked.length && new Set(subjects.map(cardOf)).size < TIP_MIN_CARDS) {
      report.tipsWithoutSubject.push({ tip: i, text: t.text, cards: marked });
      return t;
    }
    return unmark(t, `tips[${i}]`).line;
  });
  return { doc: { ...doc, keyCards, tips }, report };
}

/**
 * NO NON-COMMANDER CARD IN TWO SECTIONS (iteration 3): a deck card other than a commander that is
 * marked in, or is the Key card of, more than one of the overview, the stages, the alternate line,
 * the Key cards (name and job) and the tips is an offender. The commander's own repeats are
 * `checkExplainedOnce`'s to report. Run after `dedupeSections`, it fails exactly what the pass could
 * not fix: a tip left under `TIP_MIN_CARDS` marked cards, a card the overview and a later section
 * share, and a card the alternate line shares with any other section (the post-pass never reads the
 * alternate line, so a stage, Key card or tip naming the alternate's card fails here for a repair).
 */
export function checkNoCardTwice(doc: OverviewDoc, facts: Pick<SynopsisFacts, "cards" | "commanders">): CheckResult<{ card: string; sections: RepetitionSection[] }> {
  const offenders = checkExplainedOnce(doc, facts, { keyCardNames: true }).offenders
    .filter((o) => !o.commander)
    .map(({ card, sections }) => ({ card, sections }));
  return { pass: offenders.length === 0, offenders };
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
 * The alternate line's own rules, the one implementation (the shape check above and the app's
 * precon write, `stages-run.ts`, both read it): present exactly when the facts carry an alternate
 * commander, at most 144 characters, and marking one of them.
 */
export function checkAlternateLine(doc: Pick<OverviewDoc, "alternate">, alternates: readonly string[]): CheckResult<string> {
  const offenders: string[] = [];
  const len = (l: Line) => rendered(l.text).trim().length;
  if (alternates.length === 0 && doc.alternate.length > 0) offenders.push("an alternate line with no alternate commander in the facts");
  if (alternates.length > 0 && doc.alternate.length === 0) offenders.push("no alternate line though the facts carry one");
  for (const l of doc.alternate) {
    if (len(l) > STAGES_LIMITS.alternate) offenders.push(`the alternate line is ${len(l)} characters`);
    const wanted = new Set(alternates.map(normalizeName));
    if (alternates.length > 0 && !marksIn(l.text).some((m) => wanted.has(normalizeName(m)))) offenders.push("the alternate line names none of the alternate commanders");
  }
  return { pass: offenders.length === 0, offenders };
}

/**
 * The shape's own counts and budgets: three stages of at most 144, Wins by (iteration 2) and the
 * alternate at most 144, exactly 2 tips, and the alternate line present exactly when the facts carry
 * an alternate commander, naming one of them. Iteration 3: no Wins by line, and exactly one land line
 * of at most 120, and the Key cards within `SECTION_COUNTS.keyCards` (the explained-once post-pass
 * can drop one below the minimum, and nothing refills it).
 */
export function checkShape(doc: OverviewDoc, alternates: readonly string[], shape: StagesShape = 2): CheckResult<string> {
  const offenders: string[] = [];
  const len = (l: Line) => rendered(l.text).trim().length;
  if (doc.stages.length !== STAGES_LIMITS.stages) offenders.push(`${doc.stages.length} stages`);
  doc.stages.forEach((l, i) => { if (len(l) > STAGES_LIMITS.stage) offenders.push(`${STAGE_LABELS[i] ?? i} is ${len(l)} characters`); });
  doc.winsBy.forEach((l) => { if (len(l) > STAGES_LIMITS.winsBy) offenders.push(`Wins by is ${len(l)} characters`); });
  // An empty or blank plans.primary renders no Wins by line at all.
  if (shape === 2 && doc.winsBy.every((l) => len(l) === 0)) offenders.push("no Wins by line");
  if (shape === 3) {
    if (doc.winsBy.length > 0) offenders.push("a Wins by line, which iteration 3 drops");
    if (doc.landKeep.length !== 1) offenders.push(`${doc.landKeep.length} land lines, not 1`);
    doc.landKeep.forEach((l) => { if (len(l) > STAGES_LIMITS.landKeep) offenders.push(`the land line is ${len(l)} characters`); });
    const { min, max } = SECTION_COUNTS.keyCards;
    if (doc.keyCards.length < min || doc.keyCards.length > max) offenders.push(`${doc.keyCards.length} Key cards, not ${min} to ${max}`);
  }
  if (doc.tips.length < STAGES_LIMITS.tips.min || doc.tips.length > STAGES_LIMITS.tips.max) offenders.push(`${doc.tips.length} tips`);
  offenders.push(...checkAlternateLine(doc, alternates).offenders);
  return { pass: offenders.length === 0, offenders };
}

/**
 * The shape of the reply the checks read AND of the doc a reader is shown: an offender of either
 * fails, the shown doc's marked "shown: " (and left out when the reply already has the same one).
 */
export function checkShapeShown(replyDoc: OverviewDoc, shownDoc: OverviewDoc, alternates: readonly string[], shape: StagesShape = 2): CheckResult<string> {
  const reply = checkShape(replyDoc, alternates, shape).offenders;
  const shown = checkShape(shownDoc, alternates, shape).offenders.filter((o) => !reply.includes(o)).map((o) => `shown: ${o}`);
  const offenders = [...reply, ...shown];
  return { pass: offenders.length === 0, offenders };
}

// ---------------------------------------------------------------------------------------------
// Iteration 3: the deck's own land number, generic mulligan lines, and sections a precon alone has.

/** The curve facts a land number is derived from. Nonland, non-commander cards, by quantity; a card with no mana value is not counted. */
export type CurveFacts = {
  lands: number;
  ramp: number;
  /** Nonland, non-commander cards with a known mana value. */
  nonland: number;
  /** Their average mana value, to one decimal; null with none. */
  averageManaValue: number | null;
  fivePlus: number;
  twoOrLess: number;
  /** The highest commander mana value (a partner pair's dearer one); null when unknown. */
  commanderManaValue: number | null;
  /** 7 x lands / 99, to two decimals: the lands an opening seven holds on average. */
  expectedLandsInSeven: number;
};

/**
 * A card that takes a land drop is left off the curve: a land face, or a modal double-faced card with
 * a land back (`playableAsLand`), which `landCapable` (`facts.lands`) already counts. A transforming
 * card with a land back (Ojer Axonil) is cast as its front and only flips, so it stays on the curve.
 * Facts built before `layout` was carried fall back to reading a land on either face.
 */
const takesLandDrop = (c: Pick<FactCard, "typeLine" | "layout">) =>
  c.layout === undefined ? /\bLand\b/.test(c.typeLine) : isLandFace(c.typeLine) || playableAsLand(c.typeLine, c.layout);

export function curveFacts(facts: Pick<SynopsisFacts, "cards" | "commanders" | "lands" | "ramp" | "commanderManaValues">): CurveFacts {
  const deck = deckOf(facts);
  let n = 0, sum = 0, fivePlus = 0, twoOrLess = 0;
  for (const c of facts.cards) {
    if (deck.commanders.has(c.oracleId) || takesLandDrop(c) || c.manaValue === undefined) continue;
    n += c.quantity;
    sum += c.manaValue * c.quantity;
    if (c.manaValue >= 5) fivePlus += c.quantity;
    if (c.manaValue <= 2) twoOrLess += c.quantity;
  }
  return {
    lands: facts.lands,
    ramp: facts.ramp,
    nonland: n,
    averageManaValue: n === 0 ? null : Math.round((sum / n) * 10) / 10,
    fivePlus,
    twoOrLess,
    commanderManaValue: facts.commanderManaValues.length > 0 ? Math.max(...facts.commanderManaValues) : null,
    expectedLandsInSeven: Math.round(((HAND_SIZE * facts.lands) / 99) * 100) / 100,
  };
}

/**
 * THE LAND RULE (the app's, stated, so the number is never the model's judgement, as `keepableLands` is not):
 * start at 3; one more for a TOP-HEAVY deck (nonland average mana value 3.5 or more, 14 or more
 * nonland cards at five or more, or a commander at six or more); one fewer for a LOW CURVE (average
 * 2.6 or less with at most 5 cards at five or more); one more at 40 lands or more, one fewer at 32 or
 * fewer. Then held inside the app's keepable range and inside 2 to 4; where the two do not meet
 * (85 lands or more, where `keepableLands` gives 5 to 5), the rule's 2 to 4 wins.
 */
export const LAND_RULE = {
  base: 3,
  heavyAverage: 3.5,
  heavyFivePlus: 14,
  heavyCommander: 6,
  lightAverage: 2.6,
  lightFivePlusMax: 5,
  manyLands: 40,
  fewLands: 32,
} as const;

export type LandKeep = {
  /** The land number the land line states. */
  lands: number;
  curve: CurveFacts;
  /** Which adjustments moved it off the base, in order. */
  reasons: ("top-heavy" | "low curve" | "many lands" | "few lands" | "held to the keepable range")[];
  /** The reason in words, for the prompt and the summary table. */
  why: string;
  /** Every number the land line may state: the land number, the curve counts and their thresholds (5, 2), the commander's cost, the lands, the ramp, and 7. */
  figures: number[];
};

export function landKeepNumber(facts: Pick<SynopsisFacts, "cards" | "commanders" | "lands" | "ramp" | "commanderManaValues" | "keep">): LandKeep {
  const curve = curveFacts(facts);
  const reasons: LandKeep["reasons"] = [];
  const avg = curve.averageManaValue;
  const heavy = (avg !== null && avg >= LAND_RULE.heavyAverage) || curve.fivePlus >= LAND_RULE.heavyFivePlus || (curve.commanderManaValue ?? 0) >= LAND_RULE.heavyCommander;
  const light = !heavy && avg !== null && avg <= LAND_RULE.lightAverage && curve.fivePlus <= LAND_RULE.lightFivePlusMax;
  let n: number = LAND_RULE.base;
  if (heavy) { n += 1; reasons.push("top-heavy"); }
  if (light) { n -= 1; reasons.push("low curve"); }
  if (curve.lands >= LAND_RULE.manyLands) { n += 1; reasons.push("many lands"); }
  if (curve.lands <= LAND_RULE.fewLands) { n -= 1; reasons.push("few lands"); }
  // The keepable range, cut to the rule's 2 to 4. When they do not overlap, the rule's cap wins.
  const lo = Math.min(4, Math.max(2, facts.keep.low));
  const hi = Math.max(lo, Math.min(4, facts.keep.high));
  const held = Math.min(hi, Math.max(lo, n));
  if (held !== n) reasons.push("held to the keepable range");
  const parts: string[] = [];
  if (heavy) {
    const why: string[] = [];
    if (avg !== null && avg >= LAND_RULE.heavyAverage) why.push(`its nonland cards average ${avg} mana value`);
    if (curve.fivePlus >= LAND_RULE.heavyFivePlus) why.push(`${curve.fivePlus} nonland cards cost five or more`);
    if ((curve.commanderManaValue ?? 0) >= LAND_RULE.heavyCommander) why.push(`the commander costs ${curve.commanderManaValue}`);
    parts.push(`top-heavy: ${why.join(", ")}`);
  }
  if (light) parts.push(`a low curve: its nonland cards average ${avg} mana value and ${curve.twoOrLess} cost two or less`);
  if (curve.lands >= LAND_RULE.manyLands) parts.push(`it plays ${curve.lands} lands`);
  if (curve.lands <= LAND_RULE.fewLands) parts.push(`it plays only ${curve.lands} lands`);
  if (parts.length === 0) parts.push(`a middling curve (nonland average ${avg ?? "unknown"}, ${curve.fivePlus} at five or more) on ${curve.lands} lands`);
  if (held !== n) parts.push(`held to the keepable ${facts.keep.low} to ${facts.keep.high}`);
  // The thresholds the counts are stated against ("cost five or more", "two or less") are figures too.
  const figures = [...new Set([held, HAND_SIZE, curve.lands, curve.ramp, curve.fivePlus, curve.twoOrLess, 5, 2, ...facts.commanderManaValues])].sort((a, b) => a - b);
  return { lands: held, curve, reasons, why: parts.join("; "), figures };
}

/**
 * The land counts a line states as a RANGE or an open-ended bound rather than one exact number:
 * "2-4 lands" (hyphen, en or em dash), "3 to 4 lands", "3 or 4 lands", "4 or more lands", "4 or
 * fewer lands", "at least 4 lands", "4+ lands". Each is the phrase as written.
 */
export function inexactLandCounts(text: string): string[] {
  const bare = text.replace(/\[\[[^\[\]]+\]\]/g, " ");
  const W = `(?:\\d+|${Object.keys(LAND_COUNT_WORDS).join("|")})`;
  const forms = [
    `\\b${W}(?:\\s*[-\u2013\u2014]\\s*|\\s+(?:to|or)\\s+)${W}(?:\\s+|-)lands?\\b`,
    `\\b${W}(?:\\s+|-)(?:or\\s+(?:more|fewer|less)\\s+)lands?\\b`,
    `\\b${W}\\s+lands?\\s+or\\s+(?:more|fewer|less)\\b`,
    `\\b(?:at\\s+(?:least|most)|up\\s+to|no\\s+(?:more|fewer|less)\\s+than|more\\s+than|fewer\\s+than|less\\s+than)\\s+${W}(?:\\s+|-)lands?\\b`,
    `\\b\\d+\\+\\s*lands?\\b`,
  ];
  return forms.flatMap((f) => [...bare.matchAll(new RegExp(f, "gi"))].map((m) => m[0]));
}

const REASON_WORDS = /\b(curve|costs?|mana value|expensive|cheap|top-heavy|heavy|low|ramp|five or more|two or less)\b/i;

/**
 * THE LAND LINE STATES THE DECK'S NUMBER, WITH A REASON: exactly one land line; the one land count
 * it states is the app's `landKeepNumber` (never a range, never another); every other number in it is
 * one of that number's figures; it gives a reason (a curve figure, a curve word, or a deck card); and
 * it fits its budget. Records the stated number and the curve facts behind it, for the summary table.
 */
export function checkLandKeep(doc: OverviewDoc, facts: Pick<SynopsisFacts, "cards" | "commanders">, land: LandKeep): CheckResult<string> & { stated: number | null; target: number; curve: CurveFacts; why: string; text: string | null } {
  const offenders: string[] = [];
  const l = doc.landKeep[0];
  const base = { target: land.lands, curve: land.curve, why: land.why };
  if (!l) return { pass: false, offenders: ["no land line"], stated: null, text: null, ...base };
  if (doc.landKeep.length > 1) offenders.push(`${doc.landKeep.length} land lines`);
  const stated = [...new Set(statedLandNumbers(l.text))];
  const inexact = inexactLandCounts(l.text);
  if (inexact.length > 0) offenders.push(`states a range or an open-ended count, not one number: ${inexact.join("; ")}`);
  if (stated.length === 0) offenders.push("states no land count");
  if (stated.length > 1) offenders.push(`states more than one land count (${stated.join(", ")})`);
  if (stated.length === 1 && stated[0] !== land.lands) offenders.push(`states ${stated[0]} lands, not the deck's ${land.lands}`);
  const allowed = new Set(land.figures);
  const stray = figuresIn(l.text).filter((n) => !allowed.has(n));
  if (stray.length > 0) offenders.push(`states a figure the app did not give: ${[...new Set(stray)].join(", ")}`);
  if (/\d[.,]\d/.test(rendered(l.text))) offenders.push("states a decimal (the average is a reason, never a figure)");
  const others = figuresIn(l.text).filter((n) => n !== land.lands && n !== HAND_SIZE);
  const deck = deckOf(facts);
  const namesCard = marksIn(l.text).some((m) => deck.names.has(normalizeName(m)));
  if (others.length === 0 && !REASON_WORDS.test(rendered(l.text)) && !namesCard) offenders.push("gives no reason for the number");
  const len = rendered(l.text).trim().length;
  if (len > STAGES_LIMITS.landKeep) offenders.push(`${len} characters`);
  return { pass: offenders.length === 0, offenders, stated: stated.length === 1 ? stated[0]! : null, text: l.text, ...base };
}

/** One deck's row in the land-number table. */
export type LandRow = { id: string; name: string; kind: "precon" | "player deck"; target: number; stated: number | null; why: string; curve: CurveFacts };

/**
 * THE LAND NUMBER DIFFERS ACROSS DECKS FOR A REASON: the rows, the distinct numbers stated, whether
 * every stated number is the deck's own (the rule's), and whether the decks that differ differ in the
 * rule's reasons (two decks with the same stated number and different targets would be a model error,
 * caught by `checkLandKeep`). `differs` is true when at least two numbers are stated.
 */
export function landKeepTable(rows: readonly LandRow[]): { rows: LandRow[]; distinctStated: number[]; distinctTargets: number[]; everyStatedIsTheDecks: boolean; differs: boolean } {
  const stated = [...new Set(rows.flatMap((r) => (r.stated === null ? [] : [r.stated])))].sort((a, b) => a - b);
  return {
    rows: [...rows],
    distinctStated: stated,
    distinctTargets: [...new Set(rows.map((r) => r.target))].sort((a, b) => a - b),
    everyStatedIsTheDecks: rows.every((r) => r.stated === r.target),
    differs: stated.length > 1,
  };
}

const SPECIFIC_NUMBER_WORDS: Record<string, number> = { ...LAND_COUNT_WORDS, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
/** The unit right after a number that makes it a land or curve figure: "4 lands", "2-drops", "10 ramp pieces", "4 mana". */
const FIGURE_UNIT = /^(lands?|drops?|ramp|mana)$/;
/** The one verb form, right before the number: "costs 4". */
const FIGURE_VERB = /^(costs?|costing)$/;

/**
 * The numbers a line states as a number-and-unit phrase, outside card marks: the unit IMMEDIATELY
 * after the number (a hyphen allowed: "2-drops"), or "costs" immediately before it. A later word does
 * not tie a number to it: "a hand with four spells and no ramp" states no figure.
 */
export function figuresInContext(text: string): number[] {
  const words = rendered(text.replace(/\[\[[^\[\]]+\]\]/g, " ")).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const out: number[] = [];
  words.forEach((w, i) => {
    const n = /^\d+$/.test(w) ? Number(w) : SPECIFIC_NUMBER_WORDS[w];
    if (n === undefined) return;
    if (FIGURE_UNIT.test(words[i + 1] ?? "") || FIGURE_VERB.test(words[i - 1] ?? "")) out.push(n);
  });
  return out;
}

/**
 * NO GENERIC MULLIGAN LINE: every keep, send-back and land line names a card of this deck or states a
 * deck-specific number IN CONTEXT: one of the deck's figures (its lands, ramp, commander cost, the
 * land number, and the counts at five or more and two or less; the hand's 7 and a 0 are not
 * specific) tied by the words around it to a land or curve figure ("4 lands", "costs 6"). A bare
 * number that happens to equal a figure ("a hand with four spells") is not specific. Today's lines
 * and the new ones are read against the SAME figures, so the comparison is even.
 */
export function checkMulliganSpecific(doc: OverviewDoc, facts: Pick<SynopsisFacts, "cards" | "commanders" | "lands" | "ramp" | "commanderManaValues">, land: LandKeep): CheckResult<{ where: string; text: string }> {
  const deck = deckOf(facts);
  const specific = new Set([facts.lands, facts.ramp, ...facts.commanderManaValues, land.lands, land.curve.fivePlus, land.curve.twoOrLess]);
  specific.delete(HAND_SIZE);
  specific.delete(0);
  const offenders: { where: string; text: string }[] = [];
  const read = (key: "landKeep" | "keep" | "sendBack") => doc[key].forEach((l, i) => {
    const card = marksIn(l.text).some((m) => deck.names.has(normalizeName(m)));
    const num = figuresInContext(l.text).some((n) => specific.has(n));
    if (!card && !num) offenders.push({ where: `${key}[${i}]`, text: l.text });
  });
  read("landKeep");
  read("keep");
  read("sendBack");
  return { pass: offenders.length === 0, offenders };
}

/**
 * Which sections only make sense for a precon. The alternate line is the box's foil alternates: a
 * player's own deck has no box, so it never carries one, and the Overview must read whole without it.
 * Every other section serves every deck.
 */
export const SECTION_SCOPE: Record<Exclude<keyof OverviewDoc, "strategy">, "every deck" | "precon only"> = {
  overview: "every deck",
  stages: "every deck",
  winsBy: "every deck",
  alternate: "precon only",
  landKeep: "every deck",
  keep: "every deck",
  sendBack: "every deck",
  tips: "every deck",
  keyCards: "every deck",
  weaknesses: "every deck",
};

/** The sections a doc shows, in order, each with its scope: what the output records per section. */
export function sectionsOf(doc: OverviewDoc): { section: keyof typeof SECTION_SCOPE; scope: "every deck" | "precon only"; lines: number }[] {
  return (Object.keys(SECTION_SCOPE) as (keyof typeof SECTION_SCOPE)[]).map((section) => ({ section, scope: SECTION_SCOPE[section], lines: doc[section].length }));
}

const PRECON_WORDS = /\b(precon|preconstructed|the box|out of the box|in the box|face commander|alternate commanders?)\b/i;

/**
 * A PLAYER'S DECK READS RIGHT WITHOUT THE PRECON SECTIONS: no precon-only section is shown, and no
 * line talks about a box, a precon or an alternate commander. A precon passes whatever it shows.
 */
export function checkDeckKind(doc: OverviewDoc, kind: "precon" | "player deck"): CheckResult<string> {
  if (kind === "precon") return { pass: true, offenders: [] };
  const offenders: string[] = [];
  for (const s of sectionsOf(doc)) if (s.scope === "precon only" && s.lines > 0) offenders.push(`shows the precon-only ${s.section} section`);
  for (const l of allLines(doc)) if (PRECON_WORDS.test(rendered(l.text))) offenders.push(`${l.where} reads as a precon's: ${l.text}`);
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
  /** Iteration 3 only. */
  landKeep?: ReturnType<typeof checkLandKeep>;
  /** Iteration 3 only: the new side's mulligan lines, and today's for comparison (informational). */
  mulliganSpecific?: ReturnType<typeof checkMulliganSpecific>;
  mulliganSpecificToday?: ReturnType<typeof checkMulliganSpecific>;
  /** Iteration 3 only. */
  deckKind?: ReturnType<typeof checkDeckKind>;
  /** Iteration 3 only: no non-commander card in two sections, read after the post-pass when it ran. */
  noCardTwice?: ReturnType<typeof checkNoCardTwice>;
  /** Iteration 3 with `postPass`: what `dedupeSections` changed or reported on the reply the checks read. */
  dedupe?: DedupeReport;
};

/** Every auto-pass check on one deck's new reply, against its old shown content. */
export function stagesChecks(input: { reply: StagesReply; shownNew: OverviewDoc; oldDoc: OverviewDoc; facts: SynopsisFacts; alternates: readonly string[]; shape?: StagesShape; kind?: "precon" | "player deck"; postPass?: boolean }): StagesChecks {
  const shape = input.shape ?? 2;
  const raw = docFromStagesReply(input.reply, shape);
  // Iteration 3's explained-once post-pass, when the caller ran it on what it shows (`dedupeSections`).
  const passed = shape === 3 && input.postPass ? dedupeSections(raw, input.facts) : null;
  const doc = passed?.doc ?? raw;
  const castTurn = input.facts.stats?.commanderCastTurn ?? null;
  const base: StagesChecks = {
    cardsInList: checkCardsInList(doc, input.facts),
    turnNumbers: checkTurnNumbers(doc, castTurn),
    explainedOnce: checkExplainedOnce(doc, input.facts, { keyCardNames: shape === 3 }),
    stageFit: checkStageFit(doc, input.facts, castTurn),
    stagesNameCards: checkStagesNameCards(doc, input.facts),
    length: checkLength(input.shownNew, input.oldDoc),
    // After the post-pass the reader is shown the VALIDATED sections deduped, which can hold fewer
    // Key cards than the reply did (validation kept 5 of 6, the pass dropped one more): both are read.
    shape: passed ? checkShapeShown(doc, input.shownNew, input.alternates, shape) : checkShape(doc, input.alternates, shape),
  };
  if (shape === 2) return base;
  const land = landKeepNumber(input.facts);
  return {
    ...base,
    landKeep: checkLandKeep(doc, input.facts, land),
    mulliganSpecific: checkMulliganSpecific(doc, input.facts, land),
    mulliganSpecificToday: checkMulliganSpecific(input.oldDoc, input.facts, land),
    deckKind: checkDeckKind(input.shownNew, input.kind ?? "precon"),
    noCardTwice: checkNoCardTwice(doc, input.facts),
    ...(passed ? { dedupe: passed.report } : {}),
  };
}

/** The contract-8 section a repetition section's lines come from (the alternate and Wins by lines are no contract-8 section, so no repair rewrites them). */
const REPAIR_SECTION_OF: Record<RepetitionSection, SectionId | null> = { overview: "overview", stages: "primer", winsBy: null, alternate: null, tips: "primer", keyCardJobs: "keyCards" };

/**
 * What iteration 3's post-pass and its checks leave for the app's one repair: the sections to
 * rewrite and why. A Key cards section under its minimum (on the reply or on what is shown), a tip
 * the pass left without a subject, and a card still in two sections (the LATER section is rewritten,
 * as the pass keeps the earlier one; the earlier when the later is a line no repair rewrites).
 */
/** The post-pass's priority: the earlier section keeps a card (stages, then Key cards, then tips). */
const PASS_ORDER: Record<RepetitionSection, number> = { overview: 0, stages: 1, keyCardJobs: 2, tips: 3, alternate: 4, winsBy: 5 };

export function i3RepairTargets(c: StagesChecks): { sections: SectionId[]; reasons: string[] } {
  const sections = new Set<SectionId>();
  const reasons: string[] = [];
  for (const o of c.shape.offenders) if (/ Key cards, not /.test(o)) { sections.add("keyCards"); reasons.push(`keyCards: ${o.replace(/^shown: /, "")} once a Key card a stage already explains is dropped; name other cards`); }
  for (const t of c.dedupe?.tipsWithoutSubject ?? []) { sections.add("primer"); reasons.push(`primer: tip ${t.tip + 1} needs ${TIP_MIN_CARDS} cards no earlier section explains (it names ${t.cards.join(", ")})`); }
  for (const o of c.noCardTwice?.offenders ?? []) {
    // In the post-pass's priority (it keeps the earlier section), never the order the check listed them.
    const ordered = [...o.sections].sort((a, b) => PASS_ORDER[a] - PASS_ORDER[b]);
    // A line no repair rewrites (the alternate) keeps the card, so every editable section naming it is rewritten.
    const fixed = ordered.some((s) => REPAIR_SECTION_OF[s] === null);
    const later = (fixed ? ordered : ordered.slice(1)).flatMap((s) => REPAIR_SECTION_OF[s] ?? []);
    const targets = later.length > 0 ? later : ordered.flatMap((s) => REPAIR_SECTION_OF[s] ?? []);
    for (const s of targets) sections.add(s);
    if (targets.length > 0) reasons.push(`${[...new Set(targets)].join(", ")}: ${o.card} is explained in ${o.sections.join(" and ")}; explain each card in one section only`);
  }
  return { sections: [...sections], reasons: [...new Set(reasons)] };
}

/** Whether every check that applies to the shape passes. `exceptCommanders` reads the repetition rule with the commanders exempt. */
export function allChecksPass(c: StagesChecks, exceptCommanders: boolean): boolean {
  return c.cardsInList.pass && c.turnNumbers.pass && (exceptCommanders ? c.explainedOnce.passExceptCommanders : c.explainedOnce.pass)
    && c.stageFit.pass && c.stagesNameCards.pass && c.length.pass && c.shape.pass
    && (c.landKeep?.pass ?? true) && (c.mulliganSpecific?.pass ?? true) && (c.deckKind?.pass ?? true) && (c.noCardTwice?.pass ?? true);
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
