import { BRACKET_NAMES } from "../../copy/deck-analysis";
import { suggestedChangesV2Copy } from "../../copy/suggested-changes-v2";
import type { Bracket } from "../../profile/types";
import type { CheckedSynopsis } from "../../synopsis/types";
import type { BracketChoice } from "./bracket-aim";

/**
 * Suggested changes v2's intake (plan 2026-10-27, UI PR 5; the handoff's Intake board), the parts that are arithmetic.
 * Pure and client-safe: the "What we noticed" chips, the Bracket card's choices, and the usual-time band.
 */

const copy = suggestedChangesV2Copy.intake;

/** One mix role as the deck page counts it (`roleCounterFor`) against its cell (`recommendedMix`). */
export type NoticedRole = { role: string; label: string; have: number; target: number; advisory: boolean };

export type NoticedFacts = {
  roles: readonly NoticedRole[];
  /** The deck's focus, named as the app names a strategy (`strategyName`); null with none. */
  focus: string | null;
  /** The newest dated game note, in plain text; null when no game carries one. */
  game: { note: string; date: string } | null;
};

export type NoticedChip = {
  /** Stable per source, so React keeps a chip's identity as the facts move. */
  id: string;
  kind: "role" | "focus" | "game";
  /** The chip's words, and its quieter figure after the `·` when it has one. */
  text: string;
  meta: string | null;
  /** What a tap appends to the request. A chip tracks this sentence and no other. */
  sentence: string;
};

/** The longest game note a chip quotes before it is clipped: a chip appends a sentence, not a whole game write-up. */
export const GAME_NOTE_MAX = 120;

function clip(text: string, max: number): string {
  const chars = [...text.trim().replace(/\s+/g, " ")];
  return chars.length <= max ? chars.join("") : `${chars.slice(0, max - 1).join("").trimEnd()}…`;
}

/**
 * Up to four chips, in the handoff's order: the worst role gap, the focus, the newest game note, the second role gap
 * (README item 2; plan H5). A role gap is a role whose target is above what the deck holds; the land cell is advisory
 * (a range, not a finish line, `MixCell.advisory`), so it is never called short. Ties keep the mix's own order. None of
 * them is drawn when there is nothing to say.
 */
export function noticedChips(facts: NoticedFacts): NoticedChip[] {
  const gaps = facts.roles
    .filter((r) => !r.advisory && r.target - r.have > 0)
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (b.r.target - b.r.have) - (a.r.target - a.r.have) || a.i - b.i)
    .map(({ r }) => r);
  const sentenceOf = (r: NoticedRole) => copy.noticed.roleShort(r.label.toLowerCase(), r.have, r.target);
  const chips: NoticedChip[] = [];
  const [worst, second] = gaps;
  if (worst) {
    chips.push({
      id: `role:${worst.role}`, kind: "role", text: copy.noticed.roleShortChip(worst.label.toLowerCase()),
      meta: copy.noticed.roleOf(worst.have, worst.target), sentence: sentenceOf(worst),
    });
  }
  if (facts.focus) {
    chips.push({ id: "focus", kind: "focus", text: copy.noticed.focusChip(facts.focus), meta: copy.noticed.focusMeta, sentence: copy.noticed.focus(facts.focus) });
  }
  if (facts.game && facts.game.note.trim() !== "") {
    const note = clip(facts.game.note, GAME_NOTE_MAX);
    chips.push({ id: "game", kind: "game", text: copy.noticed.gameChip(note), meta: facts.game.date, sentence: copy.noticed.gameSentence(note, facts.game.date) });
  }
  if (second) {
    chips.push({ id: `role:${second.role}`, kind: "role", text: copy.noticed.roleIsChip(second.label, second.have, second.target), meta: null, sentence: sentenceOf(second) });
  }
  return chips;
}

/**
 * A chip's tap: its sentence at the end of the request, after a space when the request has words. Never replaces what is
 * there. Returns the new request; null when the sentence is already there (the chip is ✓) or would take the box past
 * its cap. The box highlights the appended tail itself (`highlightTail`, the sentence's length).
 */
export function appendSentence(request: string, sentence: string, room: number): { next: string } | null {
  if (request.includes(sentence)) return null;
  const sep = request === "" || /\s$/.test(request) ? "" : " ";
  if ([...sep, ...sentence].length > room) return null;
  return { next: `${request}${sep}${sentence}` };
}

/** The Bracket card's head, choices and what the press sends for each (README item 2; plan H3). */
export type BracketOption = { choice: BracketChoice; target: Bracket; label: string; note: string; mark: Bracket };
export type BracketCard = { now: string; options: BracketOption[] };
/** A Bracket card choice held by identity (null is Keep), so a new reading cannot move it to a different target. */
export type BracketPick = { choice: BracketChoice; target: Bracket } | null;

/** Where `pick` sits in `card`: Keep first; a Down or Up the new reading no longer offers falls back to Keep. */
export function pickIndex(card: BracketCard, pick: BracketPick): number {
  if (pick === null) return 0;
  const i = card.options.findIndex((o) => o.choice === pick.choice && o.target === pick.target);
  return i < 0 ? 0 : i;
}

/** The highest bracket Up offers: cEDH is not a bracket the run aims a deck at (the handoff's four choices stop at 4). */
const UP_MAX = 4;

/**
 * The choices for a deck the analysis reads at `permits`: Keep at the current bracket (the default, first), Down to each
 * lower bracket from 1, Up to each higher one to 4. A deck read as a RANGE (`[1,2]`, `[4,5]`, the only two `permitsFor`
 * returns) offers Down below its lower member and Up above its upper one, and Keep's wire target is the UPPER member
 * (ruled by d9, 2026-10-28: "Keep" means don't pass the bracket the deck already reaches, and the top of a range is that
 * bracket). The run's `aimDrops` reads one target and keeps only a line whose outcome still permits it, so a line that
 * settles the deck lower in the range is left out too. Null when there is no reading to aim from.
 */
export function bracketCard(permits: readonly Bracket[]): BracketCard | null {
  if (permits.length === 0) return null;
  const low = Math.min(...permits) as Bracket;
  const high = Math.max(...permits) as Bracket;
  const b = copy.bracket;
  const range = low !== high;
  const face = range ? `${BRACKET_NAMES[low]} or ${BRACKET_NAMES[high]}` : BRACKET_NAMES[low];
  const options: BracketOption[] = [{
    choice: "keep", target: high, mark: low,
    label: range ? b.keepRange(low, high, face) : b.keep(low, face),
    note: range ? b.noteKeepRange(low, high, face) : b.noteKeep(low, face),
  }];
  for (let t = low - 1; t >= 1; t--) {
    const target = t as Bracket;
    options.push({ choice: "down", target, mark: target, label: b.down(target, BRACKET_NAMES[target]), note: b.noteDown(target, BRACKET_NAMES[target]) });
  }
  for (let t = high + 1; t <= UP_MAX; t++) {
    const target = t as Bracket;
    options.push({ choice: "up", target, mark: target, label: b.up(target, BRACKET_NAMES[target]), note: b.noteUp(target, BRACKET_NAMES[target]) });
  }
  return { now: range ? b.nowRange(low, high, face) : b.now(low, face), options };
}

/** Whether the deck's shown overview is one the run reads: `readTuningContext` passes it only with a strategy or Key cards. */
export function hasOverviewContent(content: Pick<CheckedSynopsis, "primer" | "keyCards"> | null): boolean {
  return !!content && ((content.primer?.strategy.length ?? 0) > 0 || (content.keyCards?.length ?? 0) > 0);
}

/** The wait hint beside the credit line, by N: the handoff's three measured points (3, 10, 20), each N to the nearest
 *  (6 is nearer 3 than 10; 15, halfway, takes the 10). */
export function usualFor(n: number): string {
  return n <= 6 ? copy.usual[3] : n <= 15 ? copy.usual[10] : copy.usual[20];
}
