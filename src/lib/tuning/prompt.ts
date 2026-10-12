import { axisCopy } from "../copy/game-log";
import type { GameAxisKey } from "../decks/game-axes";
import { deckTuningCopy } from "../copy/deck-tuning";
import { deckDescriptionCopy } from "../copy/deck-description";
import { playerText, PLAYER_TEXT_SYSTEM_RULE } from "../model/player-text";
import type { EvidencePack } from "./evidence";
import { ASK_PER_LIST } from "./limits";
import { noteDate } from "./note-date";
import { lockedCardsCopy } from "../copy/locked-cards";

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
  const system = [base, ...strategyRules(universalNames, !!pack.strategy), ...limitsRules(pack), ...RATIONALE_RULES].join("\n");
  const block = pack.strategy ? strategyBlock(pack.strategy) : null;
  return { system, user: block ? `${renderPack(pack)}\n\n${block}` : renderPack(pack) };
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
function limitsRules(pack: Pick<EvidencePack, "limits" | "ownedCandidates" | "ownedNone">): string[] {
  const { limits } = pack;
  const lines: string[] = [];
  if (limits.capCents !== null) lines.push(`Every suggested add must cost $${(limits.capCents / 100).toFixed(2)} or less.`);
  if (limits.sets.length > 0) lines.push(`Every suggested add must be printed in one of these sets: ${limits.sets.map((s) => s.toUpperCase()).join(", ")}.`);
  if (limits.ownedOnly) {
    // The player's own rule, so it overrides `ownershipNotRanking` for the adds: the shortlist is
    // what the rule selects from, shown so the model stops guessing at what the player owns.
    lines.push(pack.ownedCandidates
      ? `Every suggested add must be one of the cards listed under "${OWNED_HEADING}". Choose among them by what the deck needs.`
      : "Every suggested add must be a card the player already owns.");
  }
  // Owned-only was set and the player owns nothing that fits: the adds are cards to buy, and the
  // price cap and sets above still hold. The app tells the player so itself.
  if (pack.ownedNone) lines.push("The player owns no card that fits this deck's needs. Suggest cards for them to buy instead.");
  return lines;
}

const OWNED_HEADING = "Cards the player owns that fit this deck";

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

const SYSTEM = [
  "You suggest changes to a Magic: The Gathering Commander deck, for the player who built it.",
  PLAYER_TEXT_SYSTEM_RULE,
  `Propose up to ${ASK_PER_LIST} cards to add and up to ${ASK_PER_LIST} cards to cut, as two separate lists. Each card stands alone: never pair an addition with a cut, and never refer to a card in the other list.`,
  "Aim for as many cuts as additions, so the deck stays its size, but offer fewer of either when the evidence is thin. Give every card its own rationale and its own citations.",
  "Ground every card in the evidence you are given: the player's games and notes, the decklist and its targets, and what the player says the deck is for. Cite what you used.",
  "Cite with one of six kinds: games, note, decklist, intent, mix, notes. One figure per citation. A figure with no name, or one the evidence does not give, is discarded.",
  "A games citation names what it counts, in the words the games section uses, with the figure it gives: \"Mana hurt in 3 of 5 games\", \"Lost 4 of 5 games\".",
  "A note citation names the date of the note you quote, as the notes list writes it: \"26 Aug\". Quote that note in the rationale.",
  "An intent citation uses the player's own words. Quote their whole line in quotation marks, or cite a part of it WITHOUT quotation marks.",
  "A notes citation uses the player's own words from what they asked for this run. Quote their whole line in quotation marks, or cite a part of it WITHOUT quotation marks.",
  "A mix citation names a target and its figure as the targets list writes it: \"draw 4 of 10\".",
  "A card from the staples list is cited with a decklist citation, with the figure as the staples list writes it: \"Sol Ring: in 415 of 431 commanders' decks\". Never as a mix citation: a mix citation names a target from the targets list.",
  `Name cards exactly as the decklist and the staples list spell them. ${COMMANDER_RULE}`,
  "Rules. A suggestion that breaks any of these is discarded before the player sees it:",
  ...Object.values(deckTuningCopy.suggestionRules).map((rule) => `- ${rule}`),
  "Write the rationale in plain words for the player. rationaleShort is the same point in at most 80 characters.",
].join("\n");

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
  if (pack.limits.ownedOnly && pack.ownedCandidates) {
    lines.push("", `${OWNED_HEADING} (the ones most decks with this commander play first):`);
    if (pack.ownedCandidates.length === 0) lines.push("- none");
    for (const c of pack.ownedCandidates) lines.push(`- ${c.name} (${c.typeLine})`);
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
