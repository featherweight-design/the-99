import { axisCopy } from "../copy/game-log";
import type { GameAxisKey } from "../decks/game-axes";
import { deckTuningCopy } from "../copy/deck-tuning";
import { deckDescriptionCopy } from "../copy/deck-description";
import { playerText, PLAYER_TEXT_SYSTEM_RULE } from "../model/player-text";
import type { EvidencePack } from "./evidence";
import { ASK_PER_LIST } from "./limits";
import { noteDate } from "./note-date";
import { lockedCardsCopy } from "../copy/locked-cards";
import type { BracketAim } from "./v2/bracket-aim";

/**
 * The evidence pack, rendered as the two messages a tuning run sends. Pure string work.
 *
 * The SYSTEM message carries the nine `suggestionRules` verbatim — they are the model's
 * instructions and the validator's checklist, one text, so the two cannot drift.
 *
 * The USER message renders what the pack holds, with three deliberate absences:
 *  - PER-CARD OWNERSHIP AND PRICE are not rendered. `suggestionRules.ownershipNotRanking`: a
 *    fact about one candidate card may not sway which cards are suggested or their order, and a
 *    model cannot be swayed by a fact it was never shown. The card states ownership afterwards,
 *    from the database. This is narrower than, and does not contradict, "Kept for this deck"'s
 *    limits (H35, PR 4a): a CONFIGURED cap, set or owned-only rule is told to the model as a
 *    structured run parameter (`limitsRules`) and is meant to affect candidate selection — it is
 *    the player's own rule, never a per-card fact leaking in to bias a choice.
 *  - NO BRACKET FIGURE. The app flags a swap that moves the bracket itself, through `slotDeck`.
 *  - NO NET and NO PROPORTION: the pack has already dropped both.
 * And one deliberate presence: at zero games the message SAYS no games are logged, rather than
 * rendering an empty summary a model might read as "0 of 0".
 */
export function buildPrompt(pack: EvidencePack): { system: string; user: string } {
  const universal = pack.universal ?? [];
  // One name per card the player would recognise: two oracle cards sharing a name print once.
  const universalNames = [...new Set(universal.map((u) => u.name))];
  // Locked (never cut): the commander line gains "or as locked" ONLY for a deck that has locks, so a
  // deck with none sends today's prompt byte for byte (`prompt.test.ts` pins it). No PROMPT_VERSION
  // bump: the lock ids join the gate's fingerprint, which reopens a locked deck's gate alone.
  const base = pack.cards.some((c) => c.locked) ? SYSTEM.replace(COMMANDER_RULE, LOCKED_RULE) : SYSTEM;
  const system = [base, ...strategyRules(universalNames, !!pack.strategy), ...focusRules(pack.focus, pack.targets.roles), ...limitsRules(pack), ...RATIONALE_RULES].join("\n");
  // Strategy focus: absent for a deck with none, so its prompt stays byte for byte today's (no PROMPT_VERSION bump; a
  // focus change reopens the gate through the fingerprint, as locks and limits do).
  const blocks = [renderPack(pack), pack.strategy ? strategyBlock(pack.strategy) : null, pack.focus ? focusBlock(pack.focus) : null];
  return { system, user: blocks.filter((b): b is string => b !== null).join("\n\n") };
}

/**
 * Suggested changes v2's prompt (`PROMPT_VERSION_V2` 12; spec 2026-10-27 §4, §5, §10; plan PR 2 and H2, H3), for ONE call of
 * the two-call flow: the additions stage, asked ceil(1.5N) (`askFor`), or the cut stage that makes room for what is coming
 * in, first asked ceil(1.5·min(N, K1)) for the K1 additions call 1 kept (`cutPlanFor`), and either one's refill (asked the shortfall, told what stands and what fell and why). Composed from
 * v10's own lines, so every rule both share is one text: only the size and aim sentences, the citation kinds (`notes` is the
 * `request` in v2), the signal-trust order and the bracket choice differ, with the "Coming in" list and the refill's question
 * appended to the user message. Derived from the count-mechanism prototype (`scripts/eval/count-mechanism.mts`'s
 * `patchFlow`, `comingInBlock`, `refillBlock`), the flow the eval measured.
 *
 * THE REQUEST is the pack's `notes`: the field `renderPack` already sends through `playerText` at 500 characters
 * (`deckDescriptionCopy.notes.maxLength`) under the system's `PLAYER_TEXT_SYSTEM_RULE`, and the one `validateSuggestions`
 * quotes a `request` citation against. One field, so the words the model was shown and the words a citation is checked
 * against cannot differ. `buildPrompt` (v10) is untouched; `prompt.test.ts` pins it byte for byte.
 */
export type PromptV2Stage = {
  list: "additions" | "cuts";
  /** The player's count: N cards in, N out. */
  n: number;
  /** How many lines this call asks for: on a first ask ceil(1.5N) for additions and ceil(1.5·min(N, K1)) for cuts, K1
   *  being the additions kept so far (`cutPlanFor`); the shortfall on a refill. */
  ask: number;
  /** The bracket choice beside the request (H3), or none. */
  aim: BracketAim | null;
  /** The cut stage only: the additions coming in, by name (H2: what call 1 kept). */
  comingIn?: readonly string[];
  /** A refill: what this list kept so far, and each rejected card with the reason in its rule's own words (`reasonFor`). */
  refill?: { kept: readonly string[]; rejected: readonly { card: string; reason: string }[] };
};

export function buildPromptV2(pack: EvidencePack, stage: PromptV2Stage): { system: string; user: string } {
  // The owned lists are what the ADDITIONS choose from (prompt v12): a cut call, and its refill, is sent neither, and its
  // owned-only rule falls back to the listless sentence, since it names no add of its own.
  const v10 = buildPrompt(stage.list === "cuts" ? { ...pack, ownedCandidates: undefined, ownedOffIndex: undefined } : pack);
  const swap = new Map<string, string>([
    [SIZE_LINE, sizeLineV2(stage)],
    [AIM_LINE, aimLineV2(stage)],
    [KINDS_LINE, KINDS_LINE.replace(" notes, ", " request, ")],
    [NOTES_LINE, REQUEST_LINE],
    // `noResultClaim` is narrowed on v2 CUTS (Hugh, spec §6.2, Q9; `presentationFailures`' `allowStronger`), so the cut
    // stage says what its validator allows; additions and v10 keep the rule as written.
    ...(stage.list === "cuts" ? [[RESULT_CLAIM_LINE, CUT_RESULT_CLAIM_LINE] as const] : []),
  ]);
  const lines = v10.system.split("\n").flatMap((line) => {
    const swapped = swap.get(line) ?? line;
    if (line.startsWith(GROUND_PREFIX)) return [swapped, SIGNAL_TRUST_LINE];
    if (line === AIM_LINE) return [swapped, ...bracketLines(stage)];
    // The request outranks the focus (spec §4's signal order), so the focus rules v10 states without exception give way
    // to it: the half-of-the-additions rule and the rule against cutting a focus card included (Copilot round 2).
    if (line.startsWith(FOCUS_LAST_RULE)) return [swapped, REQUEST_OVER_FOCUS_LINE];
    return [swapped];
  });
  for (const line of [SIZE_LINE, AIM_LINE, KINDS_LINE, NOTES_LINE]) {
    if (!v10.system.split("\n").includes(line)) throw new Error(`buildPromptV2: v10's line moved: ${line.slice(0, 40)}`);
  }
  const user = [
    v10.user,
    ...(stage.list === "cuts" ? [comingInBlockV2(stage.comingIn ?? [])] : []),
    ...(stage.refill ? [refillBlockV2(stage)] : []),
  ].join("\n");
  return { system: lines.join("\n"), user };
}

const GROUND_PREFIX = "Ground every card in the evidence you are given";
const FILL = "Fill the list: when the evidence thins, choose the soundest remaining cards rather than offering fewer.";
const RESULT_CLAIM_LINE = `- ${deckTuningCopy.suggestionRules.noResultClaim}`;
const CUT_RESULT_CLAIM_LINE = "- No rationale or citation may promise a game result: not that a change will win or lose games. A cut's rationale may say the deck gets stronger or more focused without the card.";
const REQUEST_LINE = "A request citation uses the player's own words from what they asked for this run. Quote their whole line in quotation marks, or cite a part of it WITHOUT quotation marks.";
/** Spec §4: the request first, then the overview, the focus and the deck's description (Hugh). */
const SIGNAL_TRUST_LINE = "Weigh what you are given in this order, strongest first: what the player is asking for this run, then how the deck plays (its overview), then the player's focus, then what the deck is for. Use the others where they help answer the request, never in place of it. With no request, work from the deck's own weaknesses.";
const INDEPENDENT = "Each card stands alone: never pair an addition with a cut, and never refer to a card in the other list.";

function sizeLineV2(stage: PromptV2Stage): string {
  return stage.list === "additions"
    ? `Propose exactly ${stage.ask} cards to add; the cuts are chosen in a separate step. ${INDEPENDENT}`
    : `Propose exactly ${stage.ask} cards to cut; the additions were chosen in an earlier step. ${INDEPENDENT}`;
}

function aimLineV2(stage: PromptV2Stage): string {
  const own = "Give every card its own rationale and its own citations.";
  return stage.list === "additions"
    ? `The player wants ${stage.n} cards in. Choose the additions for what the player asked, and for the deck's weaknesses that the overview, the focus, the games and the targets show. ${FILL} ${own}`
    : `The player is adding ${stage.comingIn?.length ?? 0} cards, listed under "Coming in", and the deck must stay its size. Choose the cuts that make room: the cards that make the least sense in this deck once those are in. ${FILL} ${own}`;
}

/**
 * The bracket choice (H3; spec §5.4). The model is told the target so it can steer, and never names a bracket itself
 * (`noBracketClaim`): the app shows each card's move, and `aimDrops` drops a line that breaks Keep or Down.
 */
function bracketLines(stage: PromptV2Stage): string[] {
  const aim = stage.aim;
  if (!aim) return [];
  const t = aim.target;
  const goal =
    aim.choice === "keep"
      ? aim.low !== undefined && aim.low < t
        // Keep on a range: the deck may settle anywhere in it, as `aimDrops` accepts.
        ? `The player wants the deck to stay in bracket ${aim.low} or ${t}: no card you suggest may move it out of brackets ${aim.low} to ${t}.`
        : `The player wants the deck to stay in bracket ${t}: no card you suggest may move it out of bracket ${t}.`
      : aim.choice === "down"
        ? stage.list === "additions"
          ? `The player wants to bring the deck down to bracket ${t}: every addition must keep it within bracket ${t}.`
          : `The player wants to bring the deck down to bracket ${t}: favor cuts that bring it down, the cards that hold it above bracket ${t}.`
        : stage.list === "additions"
          ? `The player wants to move the deck up to bracket ${t}: favor additions that move it there.`
          : `The player wants to move the deck up to bracket ${t}.`;
  return [goal, "Never name a bracket in a rationale or a citation: the app shows how each card moves it."];
}

/** What the cut stage is told is coming in: the additions kept, by name (prototype's `comingInBlock`). */
function comingInBlockV2(adds: readonly string[]): string {
  return ["", `Coming in (${adds.length}): ${adds.join("; ")}.`].join("\n");
}

/** The refill's question (spec §5.1, arm C): what stands, what fell and why, and exactly the shortfall. */
function refillBlockV2(stage: PromptV2Stage): string {
  const refill = stage.refill!;
  const noun = stage.list === "additions" ? "additions" : "cuts";
  return [
    "",
    "Your first answer was checked against the rules.",
    `Kept, ${noun}: ${refill.kept.join("; ") || "none"}.`,
    ...(refill.rejected.length > 0 ? ["Rejected, and why:", ...refill.rejected.map((r) => `- ${r.card}: ${r.reason}`)] : []),
    `Propose exactly ${stage.ask} more ${noun}, following every rule above. Name none of the cards listed here.`,
  ].join("\n");
}

/**
 * v2's rules (Hugh's ruling, 2026-09-24), the text round 4 of the eval ran and he rated 7 to 0
 * (`strategy-terse-b` in `scripts/eval/variants/tuning.mts`). Given the pack `buildEvidencePack`
 * builds from a deck's overview, the system and user messages are that run's byte for byte: all
 * eight of round 4's were checked, and `prompt.test.ts` pins one against
 * `scripts/fixtures/tuning-v2-round4.json`. Where the run had nothing sensible to say the app says
 * nothing: no overview drops the two lines that name one, and no Key card still in the deck drops
 * the Key-card line.
 */
function strategyRules(universal: string[], hasOverview: boolean): string[] {
  return [
    // "Make 4 or 5 suggestions..." removed (H35, PR 4a review round 2): it contradicted the
    // SYSTEM array's own "Propose up to 8 swaps" line, so a compliant model could stop at five
    // and defeat the eight-candidate buffer the hard filters need.
    "Size suggestions to the gap. A role that is one short of its target gets one addition; if you offer two for it, say in each rationale that they are alternatives to each other.",
    "Prefer changes grounded in how this deck plays, its strategy and its cards' interactions, over changes that only move a role count toward its target.",
    ...(hasOverview ? ["Never suggest cutting a Key card listed under \"How this deck plays\"."] : []),
    ...(universal.length > 0 ? [`Never suggest cutting ${universal.join(", ")} just to fix a role count.`] : []),
  ];
}

/**
 * "Kept for this deck" (H35, PR 4a): run parameters, never player text, so they bypass
 * `playerText` entirely — structured data the player set through the limits box, not a free-text
 * field they typed. Told to the model up front (orchestrator ruling, 2026-10-04) rather than left
 * for the validator alone: an unknowing model otherwise spends most of its 8 candidates on cards
 * the hard filters then drop, leaving needless empty answers. Absent for a deck with none set,
 * so that deck's prompt stays byte for byte today's (no `PROMPT_VERSION` bump needed; a limit
 * change already reopens the gate through the fingerprint).
 */
function limitsRules(pack: Pick<EvidencePack, "limits" | "ownedCandidates" | "ownedOffIndex" | "ownedNone">): string[] {
  const { limits } = pack;
  const lines: string[] = [];
  if (limits.capCents !== null) lines.push(`Every suggested add must cost $${(limits.capCents / 100).toFixed(2)} or less.`);
  if (limits.sets.length > 0) lines.push(`Every suggested add must be printed in one of these sets: ${limits.sets.map((s) => s.toUpperCase()).join(", ")}.`);
  if (limits.ownedOnly) {
    // The player's own rule, so it overrides `ownershipNotRanking` for the adds: the shortlist is
    // what the rule selects from, shown so the model stops guessing at what the player owns.
    // A second tier (v2, prompt v12) is named beside the first, and the first is preferred: its cards are on this
    // commander's own index, the second's only on its neighbours'.
    const first = ownedFirstTier(pack);
    lines.push(!first
      ? "Every suggested add must be a card the player already owns."
      : (pack.ownedOffIndex ?? []).length > 0
        ? `Every suggested add must be one of the cards listed under "${OWNED_HEADING}" or under "${OWNED_OFF_INDEX_HEADING}". Prefer the first list: draw from the second only when the first has no card that gives the deck what it needs. Choose among them by what the deck needs.`
        : `Every suggested add must be one of the cards listed under "${OWNED_HEADING}". Choose among them by what the deck needs.`);
  }
  // Owned-only was set and the player owns nothing that fits: the adds are cards to buy, and the
  // price cap and sets above still hold. The app tells the player so itself.
  if (pack.ownedNone) lines.push("The player owns no card that fits this deck's needs. Suggest cards for them to buy instead.");
  return lines;
}

const OWNED_HEADING = "Cards the player owns that fit this deck";
const OWNED_OFF_INDEX_HEADING = "Other cards the player owns that fit this deck's colors";

/** The first owned list as the prompt states it: the pack's own, or an empty one when only the second tier has cards. */
function ownedFirstTier(pack: Pick<EvidencePack, "ownedCandidates" | "ownedOffIndex">): EvidencePack["ownedCandidates"] {
  return pack.ownedCandidates ?? ((pack.ownedOffIndex ?? []).length > 0 ? [] : undefined);
}

const FOCUS_LAST_RULE = "The app shows how far each addition moves the focus";
const REQUEST_OVER_FOCUS_LINE = "When the player's request asks for something the focus rules above would prevent, the request wins: those rules give way to it, including the share of additions that must count toward the focus and the rule against cutting a card that counts toward it.";

/** Strategy focus: lean the additions toward it, prefer cuts off every top strategy, and never state the app's count. */
function focusRules(focus: EvidencePack["focus"], roles: EvidencePack["targets"]["roles"]): string[] {
  if (!focus) return [];
  // Named, not described: with a candidate list the model filled every addition from it and left a role two short
  // unfilled in 2 of 3 decks (plan 4c eval, 2026-10-22), until the rule said which roles.
  const short = roles.filter((r) => r.role !== "land" && !r.advisory && r.target - r.have >= 2).map((r) => r.role);
  return [
    `The player picked a focus for this deck, named under "${FOCUS_HEADING}". Build toward it: at least half of the additions must be cards that count toward the focus, doing what its listed cards do. The focus comes before a role count: fill a role that is only one short with a card that also counts toward the focus, or leave it for a later run.`,
    ...(focus.candidates.length > 0
      ? [
        `Draw the additions that count toward the focus from the list under "${CANDIDATES_HEADING}" first.`,
        ...(short.length > 0
          ? [`This deck is two or more short on ${short.join(" and ")}: at least one addition must fill ${short.length > 1 ? "each of those roles" : "that role"}, a card on that list when one there fills it, otherwise any card that fills it, on the focus or not.`]
          : []),
      ]
      : []),
    ...(focus.offTop.length > 0 ? ["Prefer cuts from the cards listed as on none of the top strategies. Never cut a card listed as counting toward the focus unless a game or a note gives a reason."] : []),
    `An addition that counts toward the focus may cite it with a focus citation: name the focus as it is written under "${FOCUS_HEADING}" ("${focus.name}"), with no figure. Never cite the focus as an intent citation: intent is only the player's own words.`,
    "The app shows how far each addition moves the focus, and marks each cut that is on none of the top strategies: never state either in a rationale or a citation.",
  ];
}

const FOCUS_HEADING = "The player's focus";
const CANDIDATES_HEADING = "Cards not in the deck that count toward the focus";

function focusBlock(focus: NonNullable<EvidencePack["focus"]>): string {
  return [
    `${FOCUS_HEADING}: ${focus.name}. ${focus.copies} of the ${focus.nonland} nonland cards count toward it${focus.on.length > 0 ? `: ${focus.on.join(", ")}` : ""}.`,
    ...(focus.top.length > 0 ? [`This deck's top strategies: ${focus.top.join(", ")}.`] : []),
    ...(focus.offTop.length > 0 ? [`Cards on none of them nor the focus: ${focus.offTop.join(", ")}.`] : []),
    ...(focus.candidates.length > 0
      ? [`${CANDIDATES_HEADING}:`, ...focus.candidates.map((c) => `- ${c.name} (${c.typeLine}${c.roles.length > 0 ? `; ${c.roles.join(", ")}` : ""})`)]
      : []),
  ].join("\n");
}

/** Each rationale is drawn above its citation chips, so it never restates their figures. */
const RATIONALE_RULES = [
  "Each rationale is drawn above its citations, which the player sees as chips. Never restate a chip's FIGURE in the rationale (a role count such as \"removal: 5 of 6\", or a game count): say \"one short on removal\", not \"Removal is 5 of 6\", and spend the words on what an added card does in this deck, or why a cut card can go.",
  "A note citation is the exception: its note must still be quoted, word for word and in quotation marks, in the rationale.",
  "Never open two rationales the same way: no two may begin with the same role or the same count.",
];

function strategyBlock(strategy: NonNullable<EvidencePack["strategy"]>): string {
  return [
    "How this deck plays (from its own overview):",
    ...strategy.steps.map((step) => `- ${step}`),
    ...(strategy.keyCards.length > 0 ? [`Key cards, never to be cut: ${strategy.keyCards.map((k) => k.name).join(", ")}.`] : []),
  ].join("\n");
}

const COMMANDER_RULE = "Never suggest cutting a card marked as a commander.";
const LOCKED_RULE = lockedCardsCopy.tuning.promptRule;

const SIZE_LINE = `Propose up to ${ASK_PER_LIST} cards to add and up to ${ASK_PER_LIST} cards to cut, as two separate lists. Each card stands alone: never pair an addition with a cut, and never refer to a card in the other list.`;
const AIM_LINE = "Aim for as many cuts as additions, so the deck stays its size, but offer fewer of either when the evidence is thin. Give every card its own rationale and its own citations.";
const KINDS_LINE = "Cite with one of seven kinds: games, note, decklist, intent, mix, notes, and focus, which only a deck with a focus may use. One figure per citation. A figure with no name, or one the evidence does not give, is discarded.";
const NOTES_LINE = "A notes citation uses the player's own words from what they asked for this run. Quote their whole line in quotation marks, or cite a part of it WITHOUT quotation marks.";

const SYSTEM_LINES = [
  "You suggest changes to a Magic: The Gathering Commander deck, for the player who built it.",
  PLAYER_TEXT_SYSTEM_RULE,
  SIZE_LINE,
  AIM_LINE,
  "Ground every card in the evidence you are given: the player's games and notes, the decklist and its targets, and what the player says the deck is for. Cite what you used.",
  KINDS_LINE,
  "A games citation names what it counts, in the words the games section uses, with the figure it gives: \"Mana hurt in 3 of 5 games\", \"Lost 4 of 5 games\".",
  "A note citation names the date of the note you quote, as the notes list writes it: \"26 Aug\". Quote that note in the rationale.",
  "An intent citation uses the player's own words. Quote their whole line in quotation marks, or cite a part of it WITHOUT quotation marks.",
  NOTES_LINE,
  "A mix citation names a target and its figure as the targets list writes it: \"draw 4 of 10\".",
  "A card from the staples list is cited with a decklist citation, with the figure as the staples list writes it: \"Sol Ring: in 415 of 431 commanders' decks\". Never as a mix citation: a mix citation names a target from the targets list.",
  `Name cards exactly as the decklist and the staples list spell them. ${COMMANDER_RULE}`,
  "Rules. A suggestion that breaks any of these is discarded before the player sees it:",
  ...Object.values(deckTuningCopy.suggestionRules).map((rule) => `- ${rule}`),
  "Write the rationale in plain words for the player. rationaleShort is the same point in at most 80 characters.",
];
const SYSTEM = SYSTEM_LINES.join("\n");

/**
 * The player's text as ONE line: each line break becomes a space, and nothing else changes.
 * A note or the intent is rendered as the rest of its own line, so a line break inside it would
 * start what reads as a new instruction or a new note. Both are typed into a one-line `<input>`,
 * so what a player TYPED holds no line break and passes through byte for byte — only text that
 * reached the column some other way is changed. The validator quotes against this same form,
 * because it is the only form the model was shown.
 */
export function oneLine(text: string): string {
  return text.replace(/\r\n|[\r\n\u2028\u2029]/g, " ");
}

function renderPack(pack: EvidencePack): string {
  const lines: string[] = [];

  lines.push(`Commander: ${pack.commanders.map((c) => c.name).join(" and ")}`);
  lines.push(`Colour identity: ${pack.colorIdentity.length > 0 ? pack.colorIdentity.join("") : "colourless"}`);

  // "Kept for this deck" (H35, PR 4a): absent when nothing is set, so a deck with none sends
  // today's user message byte for byte.
  const limitLines = limitsRules(pack);
  if (limitLines.length > 0) lines.push("", "Limits set for this deck:", ...limitLines.map((l) => `- ${l}`));
  const ownedFirst = ownedFirstTier(pack);
  if (pack.limits.ownedOnly && ownedFirst) {
    lines.push("", `${OWNED_HEADING} (the ones most decks with this commander play first):`);
    if (ownedFirst.length === 0) lines.push("- none");
    for (const c of ownedFirst) lines.push(`- ${c.name} (${c.typeLine})`);
  }
  // The second tier (v2, prompt v12): only when it has cards, so a pack without one sends the message it did before.
  if (pack.limits.ownedOnly && pack.ownedOffIndex && pack.ownedOffIndex.length > 0) {
    lines.push("", `${OWNED_OFF_INDEX_HEADING}:`);
    for (const c of pack.ownedOffIndex) lines.push(`- ${c.name} (${c.typeLine})`);
  }

  lines.push("", pack.intent === null
    ? "What the deck is for: no stated intent."
    : playerText("What the deck is for, in the player's own words", pack.intent, deckDescriptionCopy.description.maxLength));

  // "Additional notes" (H35, PR 4b): absent with no text this run, so a run with none sends
  // today's user message byte for byte (same rule "Kept for this deck" follows for limits).
  if (pack.notes !== null) {
    lines.push("", playerText("What the player is asking for this run, in their own words", pack.notes, deckDescriptionCopy.notes.maxLength));
  }

  lines.push("", "Games:");
  const { summary, games } = pack.play;
  if (summary.count === 0) {
    lines.push("No games logged yet. There is no play evidence: suggest from the decklist and its targets alone, and cite no games.");
  } else {
    const { wins, losses, draws } = summary.record;
    const n = summary.count;
    lines.push(`${n} games logged: won ${wins} of ${n}, lost ${losses} of ${n}, drew ${draws} of ${n}. ${summary.marked} of ${n} carry marks.`);
    for (const axis of summary.axes) {
      lines.push(`- ${axisLabel(axis.key)}: marked as hurting in ${axis.hurt} of ${summary.count} games, as working in ${axis.worked} of ${summary.count} games.`);
    }
    const noted = games.filter((g) => g.note !== null);
    if (noted.length > 0) {
      // Each note is its own delimited block, so one note's text cannot run into another's or
      // into what follows it. Quote a note in double quotes in the rationale, per the system rule.
      lines.push("Notes:");
      const year = pack.year;
      for (const g of noted) {
        lines.push(playerText(`Note from ${noteDate(g.playedAt, year)}`, g.note!, deckTuningCopy.note.maxLength));
      }
    }
  }

  lines.push("", "Targets for this commander (have / target):");
  for (const t of pack.targets.roles) {
    const basis = t.measured ? "measured from decklists" : "a common starting point";
    lines.push(`- ${t.role}: ${t.have} of ${t.target}${t.advisory ? ", a range rather than a finish line" : ""} (${basis})`);
  }
  if (pack.targets.thin) lines.push("These targets come from few decks; treat them as a guide.");

  lines.push("", `Decklist (${pack.cards.reduce((n, c) => n + c.quantity, 0)} cards):`);
  for (const c of pack.cards) {
    const tags = [
      c.commander ? "commander" : null,
      c.locked ? lockedCardsCopy.tuning.promptTag : null,
      c.roles.length > 0 ? c.roles.join(", ") : null,
    ].filter(Boolean);
    lines.push(`- ${c.quantity > 1 ? `${c.quantity}x ` : ""}${c.name} (${c.typeLine})${tags.length > 0 ? ` [${tags.join("; ")}]` : ""}`);
  }

  lines.push("", "Staples other decks with this commander run, not in this deck (context, not a menu):");
  if (pack.staples.length === 0) lines.push("- none recorded");
  for (const s of pack.staples) lines.push(`- ${s.name}: in ${s.commanders} of ${s.commanderTotal} commanders' decks`);

  return lines.join("\n");
}

export function axisLabel(key: string): string {
  return axisCopy[key as GameAxisKey]?.label ?? key;
}
