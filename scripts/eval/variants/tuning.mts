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
  prompt?: (messages: Messages, pack: EvidencePack) => Messages;
};

/** How many staples the trimmed context keeps. The prompt calls the list "context, not a menu". */
export const TRIM_STAPLES = 15;

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

export function applyVariant(variant: TuningVariant, pack: EvidencePack, build: (p: EvidencePack) => Messages) {
  const shown = variant.pack ? variant.pack(pack) : pack;
  const built = build(shown);
  return { pack: shown, messages: variant.prompt ? variant.prompt(built, shown) : built };
}
