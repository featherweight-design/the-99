/**
 * The deck page's to-do card: which rows it holds, in what order, and which one is the next step.
 *
 * Pure. Every element's condition is the one its shipped banner drew under, reproduced here so the
 * card and the banners it replaces cannot disagree about when a thing is due. A fact the caller
 * leaves out is a row that is absent, which is how a later PR feeds a kind without this rule moving:
 * the precedence below is already the whole precedence (handoff `deck_messages`, README "The to-do
 * card").
 *
 * - The NEXT STEP is the first present of fill failed › unresolved › over the 99 › the last N (or
 *   ran out, the same slot) › pending changes. Spoken for twice is never the next step: it is
 *   fixed by buying, or by changing another deck, not by anything done here.
 * - The ORDER is the next step, then spoken for twice, then the other warnings, then the other
 *   actions in the precedence above.
 */

export type TodoKind =
  | "fillFailed"
  | "unresolved"
  | "over"
  | "spokenForTwice"
  | "lastN"
  | "ranOut"
  | "pending";

/** What the head's eyebrow says the deck is waiting to be: `Before {deck} is {word}`. */
export type TodoWord = "complete" | "legal" | "ready" | "built";

export interface TodoFacts {
  /** The guided first run: the player's only deck, nothing built yet. */
  firstRun: boolean;
  /** `decks.filled`: the fill ran, even if the deck was swept since. */
  filled: boolean;
  /** Card ROWS in the optimistic list. Emptiness is the only question asked of it. */
  cards: number;
  /** Unresolved LINES, not their quantities: the row says lines. */
  unresolved: number;
  /** Copies past the deck's body size. Absent, or 0, draws no row. */
  over?: number;
  /** Cards here on more committed decks than the player has copies. Absent, or 0, draws no row. */
  spokenForTwice?: number;
  /** `bodySize - counts.total`, the last N's own figure. Absent, or 0 and under, draws no row. */
  openSlots?: number;
  /** The ranked pool behind the last N. An open slot with an empty pool is the ran-out row. */
  candidates?: number;
  /** A committed deck whose list differs from its newest version (`hasChanges`). */
  pending?: boolean;
}

export interface TodoRow {
  kind: TodoKind;
  /** The one row whose press is filled. */
  next: boolean;
}

export interface Todo {
  /** In drawing order. Empty: the card is absent. */
  rows: TodoRow[];
  next: TodoKind | null;
  word: TodoWord;
  /** The head is the guided banner's step instead of the eyebrow. */
  firstRun: boolean;
}

/** The next step's precedence, which is also the actions' order. */
const PRECEDENCE: readonly TodoKind[] = ["fillFailed", "unresolved", "over", "lastN", "ranOut", "pending"];
const WARNINGS: ReadonlySet<TodoKind> = new Set(["over", "spokenForTwice"]);

/** What the next step is fixing, as the boards word it. A card with no next step is waiting to be played. */
const WORD: Record<TodoKind, TodoWord> = {
  fillFailed: "built",
  unresolved: "complete",
  over: "legal",
  lastN: "complete",
  ranOut: "complete",
  pending: "ready",
  spokenForTwice: "ready",
};

function present(f: TodoFacts): Set<TodoKind> {
  const kinds = new Set<TodoKind>();
  // FillFailedBanner's own gate (`!filled && !hasCards`) inside the shell's (`!firstRun && no
  // unresolved lines`): an import whose every line went unresolved is not a failed fill, and a
  // first run cannot tell a failed fill from one never asked for. See builder-shell.tsx.
  if (!f.firstRun && f.unresolved === 0 && !f.filled && f.cards === 0) kinds.add("fillFailed");
  if (f.unresolved > 0) kinds.add("unresolved");
  if ((f.over ?? 0) > 0) kinds.add("over");
  if ((f.spokenForTwice ?? 0) > 0) kinds.add("spokenForTwice");
  if ((f.openSlots ?? 0) > 0) kinds.add((f.candidates ?? 0) > 0 ? "lastN" : "ranOut");
  if (f.pending) kinds.add("pending");
  return kinds;
}

export function deckTodo(facts: TodoFacts): Todo {
  const kinds = present(facts);
  const next = PRECEDENCE.find((k) => kinds.has(k)) ?? null;
  const rest = (k: TodoKind) => kinds.has(k) && k !== next;
  const order: TodoKind[] = [
    ...(next ? [next] : []),
    ...(rest("spokenForTwice") ? (["spokenForTwice"] as const) : []),
    ...PRECEDENCE.filter((k) => WARNINGS.has(k) && rest(k)),
    ...PRECEDENCE.filter((k) => !WARNINGS.has(k) && rest(k)),
  ];
  return {
    rows: order.map((kind) => ({ kind, next: kind === next })),
    next,
    word: next ? WORD[next] : "ready",
    firstRun: facts.firstRun,
  };
}
