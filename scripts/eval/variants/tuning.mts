import { readFileSync } from "node:fs";

import type { EvidencePack } from "../../../src/lib/tuning/evidence";
import { noteDate } from "../../../src/lib/tuning/note-date";
import { axisLabel, oneLine } from "../../../src/lib/tuning/prompt";

/**
 * Tuning variants, each a TRANSFORM of the app's own work and never a copy of it.
 *
 * `pack` runs on the EvidencePack after `buildEvidencePack` returns and before `buildPrompt`
 * renders it, so the real builder still writes every line. `prompt` runs on `buildPrompt`'s output
 * after it returns. The validator always checks against the pack the model was shown.
 *
 * `base` is the app exactly. Every other entry states what it changes and why, and a winning
 * prompt variant is handed to the tuning lane as a diff against the shipped prompt; this lane
 * never edits `src/`.
 */
export type Messages = { system: string; user: string };

export type TuningVariant = {
  id: string;
  reason: string;
  pack?: (pack: EvidencePack) => EvidencePack;
  /** `deckId` is the deck the pack was built for, for a variant that brings in stored context. */
  prompt?: (messages: Messages, pack: EvidencePack, deckId: string) => Messages;
};

/** How many staples the trimmed context keeps. The prompt calls the list "context, not a menu". */
export const TRIM_STAPLES = 15;

/**
 * EVERY VARIANT HERE STARTS FROM THE APP'S OWN PROMPT (`tuning-app.mts` builds the pack with
 * `buildEvidencePack` and the messages with `buildPrompt`, then applies the variant), and since
 * tuning v2 (#948) that prompt is not the v1 prompt rounds 1 to 4 were measured on. What v2 adds
 * depends on the pack. Six lines are ALWAYS there: the 4-to-5 count, sizing to the gap and
 * grounding in how the deck plays, and the three rationale rules. Two more depend on the pack,
 * each on its own: the strategy block and the Key-card rule appear when it carries an overview,
 * and the universal-staple rule when it carries staples. The harness passes neither.
 *
 * So `base` is v2's always-on lines over v1. `trim` changes only the pack (fewer staples) and
 * appends nothing, but its base moved with it. The `cite-*` variants add their rules to that base.
 * And `strategy`, `strategy-terse` and `strategy-terse-b` bring their own overview, Key-card and
 * staple lines, while repeating the always-on lines v2 already emits. None reproduces a round's
 * messages any more. Round 4's are pinned by `scripts/fixtures/tuning-v2-round4.json`; any earlier
 * round means running the harness at the commit before #948.
 */
export const TUNING_VARIANTS: Record<string, TuningVariant> = {
  base: { id: "base", reason: "The shipped prompt, unchanged." },
  trim: {
    id: "trim",
    reason:
      `Staples capped at the first ${TRIM_STAPLES}, in the skeleton's own rank order. The list is context rather than a menu, ` +
      "and it is the one part of the pack whose length is not set by the deck itself.",
    pack: (pack) => ({ ...pack, staples: pack.staples.slice(0, TRIM_STAPLES) }),
  },
};

/**
 * Round 1 of the Haiku prompt tuning (plan step 2b). Derived from Haiku's drops on the four
 * DEVELOPMENT decks only: nearly all were `citation`. A staple's breadth cited as `mix`
 * ("Chaos Warp: in 339 of 344 commanders' decks"), an axis label paraphrased ("The deck's plan" with
 * a straight apostrophe, against the label's curly one), and a note cited without its date or
 * without its exact quotation.
 */
const CITE_RULES = [
  "Citations, exactly. A citation that does not match one of these forms discards the whole suggestion:",
  "- games: copy an axis label exactly as the Games section writes it, then its figure: \"Mana hurt in 3 of 5 games\". Or the record: \"Lost 4 of 5 games\".",
  "- mix: one line of the targets list, as written: \"draw 4 of 10\". Only the five targets are mix citations.",
  "- note: the note's date only, as the notes list writes it: \"26 Aug\". Then quote the whole note, character for character, in double quotation marks, in the rationale.",
  "- intent: the player's words, copied.",
  "- decklist: the name of the card in the deck you are relying on.",
  "How many decks run a staple is context for the rationale, never a citation.",
  "Say what a swap does, never that it will win games or make the deck better.",
].join("\n");

/** Every citation this pack can support, written out ready to copy. The strings are built from the
 *  pack by the app's own helpers (`axisLabel`, `noteDate`, `oneLine`), so they read exactly as the
 *  prompt above them renders the same facts. */
function citeMenu(pack: EvidencePack): string {
  const lines = ["Citations you can use for this deck, each copied exactly (choose the ones a swap relies on):"];
  const { summary, games } = pack.play;
  const n = summary.count;
  if (n > 0) {
    const { wins, losses, draws } = summary.record;
    if (wins > 0) lines.push(`- games: "Won ${wins} of ${n} games"`);
    if (losses > 0) lines.push(`- games: "Lost ${losses} of ${n} games"`);
    if (draws > 0) lines.push(`- games: "Drew ${draws} of ${n} games"`);
    for (const a of summary.axes) {
      if (a.hurt > 0) lines.push(`- games: "${axisLabel(a.key)} hurt in ${a.hurt} of ${n} games"`);
      if (a.worked > 0) lines.push(`- games: "${axisLabel(a.key)} worked in ${a.worked} of ${n} games"`);
    }
    for (const g of games) {
      if (g.note !== null) lines.push(`- note: "${noteDate(g.playedAt, pack.year)}", and quote it in the rationale as "${oneLine(g.note)}"`);
    }
  }
  for (const t of pack.targets.roles) lines.push(`- mix: "${t.role} ${t.have} of ${t.target}"`);
  if (pack.intent !== null) lines.push(`- intent: "${oneLine(pack.intent)}" (or a part of it)`);
  lines.push("- decklist: the exact name of a card in the decklist");
  return lines.join("\n");
}

TUNING_VARIANTS["cite-rules"] = {
  id: "cite-rules",
  reason: "Round 1: the citation forms restated with an example each, after the shipped system prompt. From Haiku's dev-deck drops.",
  prompt: (m) => ({ system: `${m.system}\n${CITE_RULES}`, user: m.user }),
};

TUNING_VARIANTS["cite-menu"] = {
  id: "cite-menu",
  reason: "Round 1: the citation rules, plus every citation this deck's evidence supports written out to copy, at the end of the user message.",
  prompt: (m, pack) => ({ system: `${m.system}\n${CITE_RULES}`, user: `${m.user}\n\n${citeMenu(pack)}` }),
};

/**
 * Round 2 (plan step 2b): cite-rules, round 1's best on the development decks, plus the one failure it
 * left. With the synthetic evidence, 8-25% of Haiku's dev answers named a card that is not there:
 * a cut misspelled against the decklist ("Spirerock Knoll" for Spinerock Knoll), a cut the deck does
 * not hold, and an add that does not exist ("Seizing the Spoils"). The staples list stays context,
 * as the shipped prompt says; this does not restrict adds to it.
 */
const NAMES_RULE = [
  "Card names, exactly:",
  "- The cut: copy its name character for character from the Decklist. A card not in the Decklist cannot be cut.",
  "- The add: a card from the staples list, copied exactly, or another real card whose exact printed name you are certain of. If unsure of a name, choose a different card.",
].join("\n");

TUNING_VARIANTS["cite-names"] = {
  id: "cite-names",
  reason: "Round 2: cite-rules, plus exact-name rules for the cut and the add. From Haiku's dev-overlay name errors.",
  prompt: (m) => ({ system: `${m.system}\n${CITE_RULES}\n${NAMES_RULE}`, user: m.user }),
};

export function applyVariant(variant: TuningVariant, pack: EvidencePack, build: (p: EvidencePack) => Messages, deckId = "") {
  const shown = variant.pack ? variant.pack(pack) : pack;
  const built = build(shown);
  return { pack: shown, messages: variant.prompt ? variant.prompt(built, shown, deckId) : built };
}

/**
 * Round 3, for Hugh's blind round 1 notes (orchestrator, 2026-09-24): the strategy each deck plays,
 * the size of each gap, grounding in the decklist, and the universal staples.
 *
 * The strategy is the deck's OWN stored overview: its strategy steps and its Key cards, read from
 * `runs/strategy-overviews.json`, which `strategy-input.mts` builds from the stored overview reads.
 * A deck with no entry fails the run rather than silently running without it. The universal staples
 * are read from the same file, derived there from `format_staples` (a staple in at least 12 of the
 * 16 conditions), never listed here.
 */
export type StrategyInput = {
  universal: string[];
  decks: Record<string, { strategy: string[]; keyCards: string[] }>;
};

let strategyInput: StrategyInput | null = null;
export function setStrategyInput(input: StrategyInput) { strategyInput = input; }
function strategyOf(deckId: string) {
  if (!strategyInput) {
    strategyInput = JSON.parse(readFileSync(new URL("../../../docs/superpowers/eval/runs/strategy-overviews.json", import.meta.url), "utf8")) as StrategyInput;
  }
  const deck = strategyInput.decks[deckId];
  if (!deck) throw new Error(`eval: no stored overview for deck ${deckId}; run eval:strategy-input first`);
  return { deck, universal: strategyInput.universal };
}

const STRATEGY_RULES = (universal: string[]) => [
  "Make 4 or 5 suggestions when the deck supports that many.",
  "Size suggestions to the gap. A role that is one short of its target gets one suggestion; if you offer two for it, say in each rationale that they are alternatives to each other.",
  "Prefer swaps grounded in how this deck plays, its strategy and its cards' interactions, over swaps that only move a role count toward its target.",
  "Never suggest cutting a Key card listed under \"How this deck plays\".",
  `Never suggest cutting ${universal.join(", ")} just to fix a role count.`,
].join("\n");

TUNING_VARIANTS.strategy = {
  id: "strategy",
  reason: "Round 3: the deck's own stored overview (strategy and Key cards, never cut), 4 to 5 suggestions sized to the gap, decklist-grounded swaps, and no universal staple cut for a count. From Hugh's blind round 1 notes.",
  prompt: (m, _pack, deckId) => {
    const { deck, universal } = strategyOf(deckId);
    const plain = (t: string) => t.replace(/\[\[([^\]]+)\]\]/g, "$1");
    const block = [
      "How this deck plays (from its own overview):",
      ...deck.strategy.map((s) => `- ${plain(s)}`),
      `Key cards, never to be cut: ${deck.keyCards.join(", ")}.`,
    ].join("\n");
    return { system: `${m.system}\n${STRATEGY_RULES(universal)}`, user: `${m.user}\n\n${block}` };
  },
};

/**
 * Round 4, Hugh's ruling on round 3 (2026-09-24): ship `strategy` on S, with two rationale rules
 * from his notes. Each suggestion is drawn with its citations as chips beneath the rationale
 * ("mix removal: 5 of 6"), so a rationale that restates a chip's figure says it twice, and three
 * rationales that each open on the same role count read as unpolished. Shorter rationales should
 * also shorten S's thinking, which ran to about 6,000 tokens on the two answers it lost.
 */
const TERSE_RULES = [
  "Each rationale is drawn above its citations, which the player sees as chips (a role count such as \"removal: 5 of 6\", a game count, a note's date). Never restate a chip's figure in the rationale: say \"one short on removal\", not \"Removal is 5 of 6\", and spend the words on what the added card does in this deck and why the cut card can go.",
  "Never open two rationales the same way: no two may begin with the same role or the same count.",
].join("\n");

TUNING_VARIANTS["strategy-terse"] = {
  id: "strategy-terse",
  reason: "Round 4: the strategy prompt plus Hugh's two rationale rules from round 3 — never restate a figure a citation chip shows, and never open two rationales on the same role or count.",
  prompt: (m, pack, deckId) => {
    const base = TUNING_VARIANTS.strategy.prompt!(m, pack, deckId);
    return { system: `${base.system}\n${TERSE_RULES}`, user: base.user };
  },
};

/**
 * Round 4b. On the dev decks every suggestion `strategy-terse` lost on 783df427 was a `citation`
 * drop: the deck has a game note, the contract wants that note QUOTED in the rationale, and the
 * first wording listed "a note's date" among the chips not to restate, which pushed the model to
 * paraphrase it. So a note is exempt by name, and only figures are never restated.
 */
const TERSE_RULES_B = [
  "Each rationale is drawn above its citations, which the player sees as chips. Never restate a chip's FIGURE in the rationale (a role count such as \"removal: 5 of 6\", or a game count): say \"one short on removal\", not \"Removal is 5 of 6\", and spend the words on what the added card does in this deck and why the cut card can go.",
  "A note citation is the exception: its note must still be quoted, word for word and in quotation marks, in the rationale.",
  "Never open two rationales the same way: no two may begin with the same role or the same count.",
].join("\n");

TUNING_VARIANTS["strategy-terse-b"] = {
  id: "strategy-terse-b",
  reason: "Round 4b: strategy-terse with a cited note exempt by name, since the first wording pushed the model to paraphrase notes it must quote.",
  prompt: (m, pack, deckId) => {
    const base = TUNING_VARIANTS.strategy.prompt!(m, pack, deckId);
    return { system: `${base.system}\n${TERSE_RULES_B}`, user: base.user };
  },
};
