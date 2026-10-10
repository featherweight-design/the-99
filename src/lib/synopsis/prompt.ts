import { refOf } from "./claims";
import { engineCandidates } from "./engine-candidates";
import { CHAR_BUDGETS, EVIDENCE_MAX, SECTION_COUNTS, TIP_MIN_CARDS } from "./limits";
import { colorLabel } from "../decks/format";
import { isInfiniteOrGameEnding } from "../spellbook/combo-features";
import { identityNameOf, type SynopsisFacts } from "./facts";
import { normalizeV8, weaknessLines } from "./validate-v8";
import type { SynopsisReply } from "./response-schema";
import { ASSESSMENT_TOPICS, type CheckedSynopsis, type SectionId } from "./types";

/**
 * The two messages a synopsis run sends. Pure string work.
 *
 * The SYSTEM message states the accept contract as instructions, figure for figure from
 * `limits.ts`, so the prompt and `validate.ts` read one set of numbers. Asking is not checking:
 * every rule stated here is also enforced there.
 *
 * The USER message is the deck: its commanders, colours, the mulligan's computed figures, and
 * every card with its type line, what the app classifies it as, and its rules text. Two
 * deliberate absences: NO BRACKET and NO FIGURE ABOUT STRENGTH (brief §2.2), because a model
 * cannot restate a fact it was never shown; and NO THEME LIST (brief §6: the profile's theme slot
 * is null on purpose, and the strategy is named from the cards).
 *
 * A RETRY (`retry`) sends the passing sections back as context and asks for all four again; the
 * generator keeps the stored passing sections byte for byte and takes only the refused ones from
 * the reply, so a retry can never change what the player already read. It also names the reason
 * each refused section failed, read off the verdicts it was given.
 *
 * The LENGTH and PLUS rules are the eval harness's `budgets-plus` prompt (sub-project 10), shipped
 * as measured. On 15 held-out decks at `effort: "low"`, with the repair below, all four sections
 * rendered on 96% of answers against 18% without them.
 */

const SYSTEM_HEAD = [
  "You write a synopsis of a Magic: The Gathering Commander deck: how it plays, for the player who built it first and for their playgroup second. Nothing may make sense only to the builder.",
  "Say how the deck plays, never how strong it is. Never mention a bracket, power level, tier, score, rating or cEDH, never call the deck or a card strong, powerful, efficient or similar, and never rate anything out of ten. Facts of the game are fine (\"deals 16 damage\").",
  "Write every card name exactly as the decklist spells it, wrapped in double square brackets: [[Sol Ring]]. EVERY mention, every time, including the commander's own name and a name repeated in the same sentence: a card name written without brackets fails its whole section. Name only cards in the decklist, except in weaknesses, which may name a card the deck lacks.",
  "Write in US English.",
  "Name the deck's colors by the identity name given (\"Gruul\", \"Sultai\", \"Colorless\"), never by mana letters such as RG or BUG.",
  "Every item is one or more whole sentences ending in a period, question mark or exclamation mark.",
  "Sections:",
];

const SYSTEM_OVERVIEW = [
  `- overview: one paragraph, at most ${CHAR_BUDGETS.overview} characters: what the deck is and how it wins.`,
];

/** Contract 7's section rules: the lines the shipped prompt has always carried. */
const SECTIONS_V7 = [
  `- primer.strategy: ${range(SECTION_COUNTS.strategy)} steps of the deck's plan, in order, each at most ${CHAR_BUDGETS.strategy} characters.`,
  `- primer.mulligan.keep and primer.mulligan.sendBack: ${range(SECTION_COUNTS.keep)} lines each, each at most ${CHAR_BUDGETS.mulligan} characters, about what opening hand to keep and what to send back. The app already shows the land range above these lines, so NEVER state a land count, "no lands" or "all spells": each line names a card, a point on the curve, or a line of play instead. Do not begin a line with "Keep", "Send back" or "Mulligan"; the heading says it. The commander starts in the command zone, never in the opening hand: never write a hand "with" or "holding" it. Use only the figures given under "Mulligan figures"; state no other number.`,
  `- primer.tips: ${range(SECTION_COUNTS.tips)} tips, each an interaction between at least ${TIP_MIN_CARDS} cards in this deck, never general rules advice. List the tip's cards in "cards", and name exactly those cards in its text. Each text at most ${CHAR_BUDGETS.tip} characters.`,
  `- keyCards: ${range(SECTION_COUNTS.keyCards)} different cards from the decklist, never one marked "universal staple" (a card nearly every deck plays says nothing about this one), each with one line, at most ${CHAR_BUDGETS.job} characters, on the job it does in this deck. "claims" lists only categories the decklist shows in that card's brackets; leave it empty for a card with none. In a job, never use the words ramp, draw, removal, remove, destroy, wipe, sweeper, tutor, combo or infinite unless that card's brackets list the matching category.`,
  `- weaknesses: ${range(SECTION_COUNTS.weaknesses)} weaknesses of how the deck plays, untiered and unranked, each at most ${CHAR_BUDGETS.weakness} characters.`,
];

const SYSTEM = [...SYSTEM_HEAD, ...SYSTEM_OVERVIEW, ...SECTIONS_V7].join("\n");

/**
 * Contract 8's section rules (plan 2026-10-10-overview-accuracy.md, sections 3 and 11). Same
 * counts and budgets as contract 7, plus: every line cites the decklist refs of the cards it is
 * about, Key cards name the deck's win conditions and engine pieces, the Mulligan is tied to those
 * pieces and to the colors the spells need, and the Weaknesses are a CHECKLIST of seven topics the
 * model assesses once each. The app, not the model, picks the three that render and writes the
 * tier word, so the model is never asked to rank or to count.
 */
const REFS_RULE = `Each decklist line starts with its ref, such as "c12:". "evidence" lists the refs of the cards an item is about (at most ${EVIDENCE_MAX}), copied exactly from the decklist; a ref is never a card name and never a ref the decklist lacks.`;

const SECTIONS_V8 = [
  `- primer.strategy: ${range(SECTION_COUNTS.strategy)} steps of the deck's plan, in order, each at most ${CHAR_BUDGETS.strategy} characters, as { text, evidence }. A step about particular cards cites their refs.`,
  `- primer.mulligan.keep and primer.mulligan.sendBack: ${range(SECTION_COUNTS.keep)} lines each, as { text, evidence }, each at most ${CHAR_BUDGETS.mulligan} characters. The app already shows the land range above these lines, so NEVER state a land count, "no lands" or "all spells". Tie the advice to THIS deck: at least one keep line names an engine piece, as [[Name]] (a card of a listed combo, or one of the Engine candidates), and the send-back lines name what the hand lacks for the deck's colors or plan. Never write advice true of every deck, such as "keep Sol Ring" or "send back a hand with no lands". Do not begin a line with "Keep", "Send back" or "Mulligan". The commander starts in the command zone, never in the opening hand. Use only the figures given under "Mulligan figures"; state no other number.`,
  `- primer.tips: ${range(SECTION_COUNTS.tips)} tips, each an interaction between at least ${TIP_MIN_CARDS} cards in this deck, never general rules advice, as { text, evidence }. "evidence" lists the refs of exactly the cards the tip names (at least ${TIP_MIN_CARDS}), and its text names exactly those cards. Each text at most ${CHAR_BUDGETS.tip} characters. State only what the cards' rules text says: a keyword a card lacks (cascade, flying, haste) is never claimed for it, and a forced sacrifice or a "target player sacrifices" effect is never an enter-the-battlefield or a "dies" trigger for you.`,
  `- keyCards: ${range(SECTION_COUNTS.keyCards)} different cards from the decklist, never one marked "universal staple", each { card, claims, job, evidence } with "evidence" holding at least the card's own ref. Choose the cards that WIN or RUN the deck: the pieces of the combos listed under the facts (as many as fit, the first combo's first), the Engine candidates and other cards that work with the commander's ability, and the commander's enablers, before any card that is merely good. A Key card whose job names neither the commander's trigger nor its payoff is the exception. Each job at most ${CHAR_BUDGETS.job} characters, on the job it does in this deck. "claims" lists only categories the decklist shows in that card's brackets; leave it empty for a card with none. In a job, never use the words ramp, draw, removal, remove, destroy, wipe, sweeper, tutor, combo or infinite unless that card's brackets list the matching category.`,
  `- assessment: the weakness checklist, replacing any list of weaknesses. Give EXACTLY ONE entry for each of these ${ASSESSMENT_TOPICS.length} topics, no more and none missing: ${ASSESSMENT_TOPICS.join(", ")}.`,
];

/** The checklist's meaning, topic by topic, with the hate cards to name. Contract 8 only. */
const CHECKLIST_V8 = [
  'Each entry is { topic, verdict, tier, line, evidence }. "verdict" is "weakness" (the decklist shows the deck exposed here), "not_a_weakness" (the deck covers it, or the topic does not apply to it) or "unknown" (the decklist cannot tell you). Prefer "unknown" to a guess: an entry that is not a weakness is never shown. But the answer must contain at least one "weakness": when nothing stands out, give the single least bad applicable one as "minor".',
  `A "weakness" carries a "tier" ("critical": it can lose the game outright; "moderate": it costs many games; "minor") and a "line": one sentence of a weakness of THIS deck, at most ${CHAR_BUDGETS.weakness - 12} characters, naming the card that exploits it as [[Name]] (it may be a card the deck lacks). Do not write the tier into the line and do not begin it with a tier word; the app does. Any other verdict carries neither "tier" nor "line". Never write that something is fine, covered or flexible as a weakness. "evidence" may cite the refs of deck cards the weakness is about.`,
  "The topics, and the hate card each should name when it applies:",
  "- graveyard_or_zone_hate: a deck that wins through its graveyard (recursion, reanimation, flashback, self-mill): graveyard hate such as [[Rest in Peace]], [[Bojuka Bog]], [[Dauthi Voidwalker]]. A deck that relies on indestructible or regenerating creatures: exile wipes such as [[Farewell]], [[Sunfall]].",
  "- artifact_enchantment_removal: a deck built on artifacts: artifact hate and wipes such as [[Null Rod]], [[Collector Ouphe]], [[Vandalblast]]. A deck whose engine is the activated abilities of its creatures on the battlefield: [[Cursed Totem]] and cards like it (it does not stop an ability activated from hand, such as ninjutsu). Also the deck's own lack of an answer to an opposing artifact or enchantment, when the decklist shows none.",
  "- interaction_speed: use the interaction figures in the facts exactly as given, never your own count. When few of the deck's interaction pieces are cheap or at instant speed, that is the weakness against a fast combo; name what it cannot stop in time.",
  "- commander_dependence: how much of the plan stops if the commander is removed or taxed repeatedly, and what the deck loses without it.",
  "- win_path: a deck that wins mostly through combat or one route: fogs and pillowfort such as [[Propaganda]], [[Ghostly Prison]], and what stops that route.",
  "- combo_vulnerability: only when the facts list a combo or the plan depends on one piece: the removal or disruption that breaks it at its key window (the commander's combat or enter-the-battlefield trigger, the engine piece), naming the piece. If no combo is listed, answer \"not_a_weakness\" or \"unknown\".",
  "- mana_and_colors: the deck's own color needs, the basic-land count against its colors, tapped lands, or tapping out for its expensive spells. Judge the colors only against the identity named above; a single-color deck has no color-flexibility weakness.",
].join("\n");

const MARKS_RULE_V8 = "The double square brackets go around a card name in EVERY text you write, evidence refs excepted: the overview, each strategy step, each mulligan line, each tip, each Key card's job and each weakness line. Text such as \"Gishath leads a deck\" fails; \"[[Gishath, Sun's Avatar]] leads a deck\" passes. Refs (c12) are never written inside brackets.";

const V8_ARGUMENT_RULES = [
  MARKS_RULE_V8,
  REFS_RULE,
  CHECKLIST_V8,
].join("\n");


/**
 * Lengths, restated with targets under each limit and one worked example. Asking for shorter text
 * rather than loosening a budget: the job line ran 65 characters at the median against its 60.
 */
const LENGTH_RULES = [
  "Lengths are counted in characters as the text renders ([[Name]] counts as the name alone). One item over its limit refuses its whole section, so stay well under:",
  `- a Key card's job: at most ${CHAR_BUDGETS.job} characters; write one short clause of about ${CHAR_BUDGETS.job - 20}. For example: "Ramps two lands a turn off the top." (35).`,
  `- a mulligan line: at most ${CHAR_BUDGETS.mulligan}; aim for about ${CHAR_BUDGETS.mulligan - 25}.`,
  `- a tip: at most ${CHAR_BUDGETS.tip}; aim for about ${CHAR_BUDGETS.tip - 50}.`,
  "Before you answer, count each job, mulligan line and tip, and shorten any that is near or over its limit.",
].join("\n");

/**
 * Contract 8's length rules, added to `LENGTH_RULES` and not in place of them (contract 7's prompt
 * stays byte for byte). Measured on the 16 stored v8 first writes of the render gate (2026-10-10):
 * a mulligan line ran over its limit 25% of the time (16 of 64 lines against 4 of 52 on contract 7),
 * because the engine-piece rule makes it name a card and a commander's name alone is 25 to 35
 * characters; a strategy step, a WHOLE section the first overrun refuses, had no length rule at
 * all and ran to 148 against 144. `primer:over_budget` was 5 of those 16 first writes and survived
 * the repair in 4.
 */
const V8_LENGTH_RULES = [
  `- a strategy step: at most ${CHAR_BUDGETS.strategy}; aim for about ${Math.floor(CHAR_BUDGETS.strategy * 0.8)}. One overlong step refuses the whole Primer.`,
  "A card's name counts toward a limit in full. A mulligan line that names a long card, a commander's name above all, has room for few other words: name a shorter engine piece, or leave the commander out. Open the line with the card or the situation itself, never with filler such as A hand with or Having.",
  "Shorter never means a fragment: every job, line, step and tip is a whole sentence and ends with a period.",
  'A mulligan line that names an engine piece, sized to the budget: "[[Sol Ring]] into a cheap engine piece starts the plan." (51).',
].join("\n");

/**
 * The Mulligan's budget, restated (eval harness, `primer-budget-c` on contract 6). Its lines overran
 * their limit more than any other part of the answer, because a specific line names cards and runs
 * long: on 15 held-out decks the first write's Mulligan ran a median 75 characters against 80. With
 * these rules and the app's repair, all four sections rendered on 100% of answers (45 of 45),
 * against 89% without.
 *
 * NO NUMBER WORD IN A WORKED LINE. The first version's examples ("a two-drop", "no three-drop")
 * taught compounds `figuresIn` reads as figures, and 21 held-out lines naming a figure the deck
 * lacked were dropped silently under contract A. These examples carry no figure, and the target is
 * read from `limits.ts` like every other.
 */
const MULLIGAN_BUDGET_RULES = [
  `Mulligan lines are the tightest budget in the answer: at most ${CHAR_BUDGETS.mulligan} characters as rendered, and aim for about ${CHAR_BUDGETS.mulligan - 25}. Write 8 to 12 words.`,
  "Every mulligan line names one card from the decklist, as [[Name]], a point on the curve, or a line of play, never a list of cards. Any number in it still has to be one of the mulligan figures.",
  "The land range the app shows above the Mulligan is not one of your lines and does not count toward any line's length.",
  'Two lines sized to the budget: "[[Sol Ring]] with nothing to cast after it stalls out." (50), and "Early ramp backed by a way to draw more cards." (46).',
].join("\n");

/** A word target for the job line, this deck's own mulligan figures, the refused words, and marking every mention. */
function plusRules(facts: SynopsisFacts): string {
  return [
    "A Key card's job is 4 to 8 words.",
    `In the mulligan lines, every number, written as digits or as a word like "two", must be one of: ${facts.figures.join(", ")}. Do not name a turn number; say "early" or "late" instead.`,
    "Never use these words anywhere: strong, powerful, efficient, competitive, casual, optimized, tier, score, rating, bracket, power level, brutal, busted, oppressive, respectable.",
    "Mark EVERY mention of a card in the decklist, the commander included and every repeat: [[Name]] each time.",
  ].join("\n");
}

/**
 * The v2 rules (plan section 11.1), appended only under `OVERVIEW_V2_ENABLED`. They govern what the
 * model may SAY about the facts the user message adds, and never ask it to count or derive: every
 * figure and every combo is the app's own. Corpus evidence: a deterministic combo went unnamed on
 * four of nine decks, a mandatory loop was read as value, and a commander turn was guessed.
 */
export const V2_FACT_RULES = [
  "The facts may list combos this deck assembles. When one is listed, the overview and the strategy name the primary win condition by those cards and by what the combo produces (for example: [[Card A]] and [[Card B]] together make infinite mana). Never describe a listed combo as value, a bonus or a side effect.",
  "Name only the combos listed. If none is listed, do not claim the deck has a combo.",
  "Combos listed as one card short are NOT in the deck. Never call one a win condition or a plan; at most, say the deck wants that piece.",
  "When you give the commander's cast turn, use the turn the facts give, as \"around turn N\". Do not work out another.",
  "Use the interaction counts exactly as given, and do not call the deck short of or full of interaction beyond them.",
].join("\n");

const REPAIR_LEAD = "Those sections failed checking for these reasons; fix exactly these:";

/** Whether a user message asks for refused sections again: the repair, or the player's Try again. */
export function isRepair(user: string): boolean {
  return user.includes(REPAIR_LEAD);
}

const renderedLength = (text: string) => text.replace(/\[\[([^\[\]]+)\]\]/g, "$1").trim().length;
const textOf = (x: string | { text: string }) => (typeof x === "string" ? x : x.text);

/**
 * The lines of a first answer, in the sections being rewritten, that run over their character
 * limit: "keep line 1 is 98 characters, limit 80: <text>". Both contracts' reply shapes. Only the
 * sections named in `sections` are read, so a kept section is never second-guessed.
 * Weaknesses are read as the validator sees them: contract 7's strings, contract 8's ranked lines with the tier word.
 */
export function overLengthLines(reply: SynopsisReply, sections: readonly SectionId[]): string[] {
  const out: string[] = [];
  const check = (label: string, items: readonly (string | { text: string })[], limit: number) =>
    items.forEach((item, i) => {
      const text = textOf(item);
      const n = renderedLength(text);
      if (n > limit) out.push(`${label}${items.length > 1 ? ` ${i + 1}` : ""} is ${n} characters, limit ${limit}, write it at about ${Math.floor(limit * 0.8)}: "${text}"`);
    });
  if (sections.includes("overview")) check("the overview", [reply.overview], CHAR_BUDGETS.overview);
  if (sections.includes("primer")) {
    check("strategy step", reply.primer.strategy, CHAR_BUDGETS.strategy);
    check("keep line", reply.primer.mulligan.keep, CHAR_BUDGETS.mulligan);
    check("send-back line", reply.primer.mulligan.sendBack, CHAR_BUDGETS.mulligan);
    check("tip", reply.primer.tips, CHAR_BUDGETS.tip);
  }
  if (sections.includes("weaknesses")) {
    const lines = "assessment" in reply ? weaknessLines(normalizeV8(reply as never)) : (reply.weaknesses ?? []);
    check("weakness", lines, CHAR_BUDGETS.weakness);
  }
  if (sections.includes("keyCards")) check("key card job", reply.keyCards.map((k) => k.job), CHAR_BUDGETS.job);
  return out;
}

function range(r: { min: number; max: number }): string {
  return `${r.min} to ${r.max}`;
}

export function buildSynopsisPrompt(
  facts: SynopsisFacts,
  retry?: { keep: CheckedSynopsis; refused: SectionId[]; first?: SynopsisReply },
  /**
   * `v2`: state the combo and deck-stats facts and their rules. `contract8` (with `v2`): the
   * contract-8 sections, the checklist and the refs on the decklist. Off, the messages are byte for
   * byte what they were.
   */
  opts: { v2?: boolean; contract8?: boolean } = {},
): { system: string; user: string } {
  const lines: string[] = [];
  lines.push(`Commander: ${facts.commanders.join(" and ")}`);
  lines.push(`Color identity: ${identityNameOf(facts)}`);
  if (facts.unproducible.length > 0) {
    // By name, as the identity is: a letter run here would hand the model the very form it is
    // told never to write.
    lines.push(`Colors the spells need that no land produces: ${facts.unproducible.map((c) => colorLabel([c]).toLowerCase()).join(" and ")}`);
  }

  lines.push("", "Mulligan figures (the only numbers the mulligan lines may state):");
  lines.push(`- Lands, counting land-backed double-faced cards: ${facts.lands}`);
  lines.push(`- Ramp pieces: ${facts.ramp}`);
  // The land range itself is drawn by the app as a fixed line (contract 6). It is stated here so the
  // lines can agree with it, and flagged so they do not repeat it.
  lines.push(`- Shown by the app, not to be restated: a keepable seven-card hand holds ${facts.keep.low} to ${facts.keep.high} lands; send back ${facts.sendBack.none} to ${facts.sendBack.under} lands, or ${facts.sendBack.over} or more.`);
  if (facts.commanderManaValues.length > 0) {
    lines.push(`- Commander mana value (a turn to cast it on is this number): ${facts.commanderManaValues.join(" and ")}`);
  }

  if (opts.v2) lines.push(...v2FactLines(facts));
  if (opts.contract8) {
    const engine = engineCandidates(facts.cards, facts.commanders);
    if (engine.length > 0) {
      lines.push("", "Engine candidates (deck cards that share words with the commander's ability; a starting list, not a verdict):");
      for (const e of engine) lines.push(`- ${e.name}: ${e.shared.join(", ")}`);
    }
  }

  const total = facts.cards.reduce((n, c) => n + c.quantity, 0);
  lines.push("", `Decklist (${total} cards). Each card: name, type line, [categories], then its rules text.`);
  for (const [i, c] of facts.cards.entries()) {
    const ref = opts.contract8 ? `${refOf(i)}: ` : "";
    const qty = c.quantity > 1 ? `${c.quantity}x ` : "";
    const cats = c.categories.length > 0 ? ` [${c.categories.join(", ")}]` : "";
    const staple = c.universalStaple ? " (universal staple)" : "";
    lines.push(`- ${ref}${qty}${c.name} (${c.typeLine})${cats}${staple}${c.oracleText ? `: ${oneLine(c.oracleText)}` : ""}`);
  }

  if (retry) {
    lines.push("", `Rewrite these sections, which did not pass checking last time: ${retry.refused.join(", ")}.`);
    lines.push("The other sections passed and are kept as they are. They are given here so the rewrite agrees with them; return them unchanged.");
    if (opts.contract8) {
      lines.push('Your reply keeps its usual shape. For a kept section give its items with an empty "evidence" list: the app keeps the stored section and ignores yours. If Weaknesses is kept, answer every topic of the checklist as "unknown".');
    }
    lines.push(JSON.stringify({
      overview: retry.keep.overview,
      primer: retry.keep.primer,
      keyCards: retry.keep.keyCards,
      weaknesses: retry.keep.weaknesses,
    }));
    const reasons = retry.keep.verdicts.flatMap((v) =>
      v.status === "refused" && retry.refused.includes(v.section)
        ? [`${v.section}: ${v.reason}${v.failed ? ` (${v.failed} of ${v.total} cards failed checking)` : ""}`]
        : []);
    lines.push(`${REPAIR_LEAD} ${reasons.join("; ")}.`);
    // A reason alone does not say WHICH line is over; the repair then rewrote the section at the
    // same lengths (4 of 5 over-budget Primers stayed refused). Name the lines and their counts.
    const long = retry.first && opts.contract8 ? overLengthLines(retry.first, retry.refused) : [];
    if (long.length > 0) lines.push(`Shorten these, which ran over their limit (counted as rendered; every other item in those sections must also fit its limit): ${long.join("; ")}.`);
  }

  if (opts.contract8) {
    const system = [...SYSTEM_HEAD, ...SYSTEM_OVERVIEW, ...SECTIONS_V8].join("\n");
    return {
      // The Mulligan's budget rules are the measured ones (100% of sections rendered with them, 89%
      // without), and contract 8's engine pieces make its lines longer, so they stay.
      system: `${system}\n${V8_ARGUMENT_RULES}\n${LENGTH_RULES}\n${V8_LENGTH_RULES}\n${plusRules(facts)}\n${MULLIGAN_BUDGET_RULES}\n${V2_FACT_RULES}`,
      user: lines.join("\n"),
    };
  }
  const base = `${SYSTEM}\n${LENGTH_RULES}\n${plusRules(facts)}\n${MULLIGAN_BUDGET_RULES}`;
  return { system: opts.v2 ? `${base}\n${V2_FACT_RULES}` : base, user: lines.join("\n") };
}

/** A combo's feature list can run to a dozen names; the first few say what it is. */
const V2_PRODUCES_SHOWN = 4;

/** The first few features, counted ones (infinite or game-ending) first, so the cut never hides the one that admitted the combo. */
export function producesShown(produces: readonly string[]): string[] {
  const counted = produces.filter((f) => isInfiniteOrGameEnding([f]));
  const rest = produces.filter((f) => !isInfiniteOrGameEnding([f]));
  return [...counted, ...rest].slice(0, V2_PRODUCES_SHOWN);
}

/** The combo and deck-stats section of the user message. Empty parts are left out, never stated as none. */
export function v2FactLines(facts: SynopsisFacts): string[] {
  const out: string[] = [];
  const mana = (n: number | null) => (n === null ? "" : n === 0 ? " (costs no mana to run)" : ` (needs ${n} mana to run)`);
  if (facts.combos && facts.combos.length > 0) {
    out.push("", "Combos this deck assembles (Commander Spellbook; every card named is in the deck):");
    for (const c of facts.combos) out.push(`- ${c.pieces.join(" + ")}: ${producesShown(c.produces).join(", ")}${mana(c.manaNeeded)}`);
  }
  if (facts.nearCombos && facts.nearCombos.length > 0) {
    out.push("", "Combos one card short (the missing card is NOT in the deck):");
    for (const c of facts.nearCombos) out.push(`- has ${c.have}, lacks ${c.missing}: ${producesShown(c.produces).join(", ")}`);
  }
  const s = facts.stats;
  if (s) {
    out.push("", "Deck figures (the app's own):");
    out.push(`- Ramp pieces: ${s.ramp}`);
    if (s.commanderCastTurn !== null) out.push(`- Expected commander cast turn: around turn ${s.commanderCastTurn}`);
    const i = s.interaction;
    out.push(`- Interaction (removal, counterspells and mass removal): ${i.total} cards, ${i.instantSpeed} at instant speed, ${i.cheap} costing two or less, ${i.cheapInstant} both; of these, mass removal: ${i.wipes}`);
  }
  return out;
}

/** Rules text on one line: a line break inside it would read as a new list item. */
function oneLine(text: string): string {
  return text.replace(/\r\n|[\r\n\u2028\u2029]+/g, " / ");
}
