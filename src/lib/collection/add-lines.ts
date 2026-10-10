import type { PrintingChoice } from "./catalog-read";
import type { Finish } from "./key";

/**
 * The list the Add cards sheet builds (collection screens plan, PR 2, handoff B4/B5).
 *
 * Pure: the sheet owns the effects, and every rule a reader can feel lives here where a test can
 * break it. A line is one holding to add: a card, a printing, a finish and a count. A line whose
 * `printing` is null is the required printing step still open (B4a); it has no finish or count
 * to speak of and cannot be saved.
 */

/** One line's count stops here, the same bound the server holds an add line to. */
export const MAX_LINE_QUANTITY = 9999;

export type AddLineState = {
  /** A key local to the sheet. Never sent: the server resolves the printing itself. */
  id: string;
  oracleId: string;
  name: string;
  /** The search result's art, shown until a printing is chosen. */
  imageUri: string | null;
  /** Every catalog printing of the card, with what the player holds of each. */
  choices: PrintingChoice[];
  printing: PrintingChoice | null;
  finish: Finish;
  quantity: number;
};

/** The finish a printing is added in until the player says otherwise (plan PR 1 note 3). */
export function defaultFinish(p: PrintingChoice): Finish {
  return p.finishes.includes("nonfoil") ? "nonfoil" : (p.finishes[0] ?? "nonfoil");
}

/** The finishes the chips offer beside nonfoil, in the order they are drawn. */
export const SPECIAL_FINISHES = ["foil", "etched"] as const;

export const holdingKeyOf = (l: AddLineState): string | null =>
  l.printing === null ? null : `${l.oracleId}|${l.printing.setCode}|${l.printing.collectorNumber}|${l.finish}`;

export const isComplete = (l: AddLineState) => l.printing !== null;

/**
 * Folds a line that now names a holding another line already names into that line (B5: one line
 * per holding). The survivor takes the counts, moves to the top and is reported so the sheet can
 * pulse it and say so. A line that is still choosing, or that names no other holding, is left be.
 */
function fold(lines: AddLineState[], id: string): { lines: AddLineState[]; merged: AddLineState | null } {
  const line = lines.find((l) => l.id === id);
  const key = line ? holdingKeyOf(line) : null;
  if (!line || key === null) return { lines, merged: null };
  const twin = lines.find((l) => l.id !== id && holdingKeyOf(l) === key);
  if (!twin) return { lines, merged: null };
  const merged = { ...twin, quantity: Math.min(MAX_LINE_QUANTITY, twin.quantity + line.quantity) };
  return { lines: [merged, ...lines.filter((l) => l.id !== id && l.id !== twin.id)], merged };
}

/** A new line opens with its printing step, newest first. */
export function openLine(lines: AddLineState[], line: Omit<AddLineState, "printing" | "finish" | "quantity">): AddLineState[] {
  return [{ ...line, printing: null, finish: "nonfoil", quantity: 1 }, ...lines];
}

/** Chooses (or re-chooses) a line's printing: nonfoil where it exists, else its only finish, at the line's count. */
export function choosePrinting(lines: AddLineState[], id: string, printing: PrintingChoice) {
  const next = lines.map((l) =>
    l.id === id ? { ...l, printing, finish: defaultFinish(printing) } : l,
  );
  return fold(next, id);
}

export function setFinish(lines: AddLineState[], id: string, finish: Finish) {
  const next = lines.map((l) => (l.id === id && l.printing?.finishes.includes(finish) ? { ...l, finish } : l));
  return fold(next, id);
}

export function setQuantity(lines: AddLineState[], id: string, quantity: number): AddLineState[] {
  const q = Math.max(1, Math.min(MAX_LINE_QUANTITY, Math.trunc(quantity)));
  return lines.map((l) => (l.id === id ? { ...l, quantity: q } : l));
}

export const removeLine = (lines: AddLineState[], id: string) => lines.filter((l) => l.id !== id);

export function summarize(lines: AddLineState[]): { lines: number; copies: number } {
  const done = lines.filter(isComplete);
  return { lines: done.length, copies: done.reduce((n, l) => n + l.quantity, 0) };
}

/** Saving waits on every printing step being answered, and on there being something to save. */
export function canSave(lines: AddLineState[]): boolean {
  return lines.length > 0 && lines.every(isComplete);
}

/** What `addToCollection` takes. The server resolves the printing's id; the client never names it. */
export function toPayload(lines: AddLineState[]) {
  return lines.filter(isComplete).map((l) => ({
    oracleId: l.oracleId,
    setCode: l.printing!.setCode,
    collectorNumber: l.printing!.collectorNumber,
    finish: l.finish,
    quantity: l.quantity,
  }));
}

/**
 * The line's holdings note: what the player holds of this exact holding, then what the save makes
 * it, or what they hold in other printings, or that the card is new to them.
 */
export type OwnedNote =
  | { kind: "holding"; have: number; after: number }
  | { kind: "elsewhere"; have: number }
  | { kind: "new" };

export function ownedNote(l: AddLineState): OwnedNote | null {
  if (l.printing === null) return null;
  const have = l.printing.owned[l.finish] ?? 0;
  if (have > 0) return { kind: "holding", have, after: have + l.quantity };
  const total = l.choices.reduce((n, c) => n + Object.values(c.owned).reduce((a, b) => a + (b ?? 0), 0), 0);
  return total > 0 ? { kind: "elsewhere", have: total } : { kind: "new" };
}

/** The copies a printing's tile says the player holds, across finishes. */
export const heldOf = (p: PrintingChoice) => Object.values(p.owned).reduce((a, b) => a + (b ?? 0), 0);
