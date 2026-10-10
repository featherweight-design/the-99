import { holdingKeyOf, isComplete, type AddLineState } from "./add-lines";
import type { CardHolding, PrintingChoice } from "./catalog-read";
import type { Finish } from "./key";

/**
 * The lines the Edit copies sheet builds (collection screens plan, PR 7; handoff R2 §C).
 *
 * The sheet starts from one line per holding the player has of ONE card and stages every change
 * locally. Pure, like `add-lines.ts`, whose line operations it reuses: the sheet owns the effects,
 * and every rule a reader can feel lives here where a test can break it.
 *
 * A save is the DIFF between the holdings the sheet read and the lines it ends with, by holding
 * key, so a printing fixed by re-picking is the old key to zero and the new key up in ONE entry,
 * and two lines that land on one holding are one row.
 */

export type EditLineState = AddLineState & {
  /** The non-key column a printing fix carries to the row it creates. */
  condition: string | null;
  /** The holding this line began as, or null for a line the player added. */
  origin: { key: string; label: string; printKey: string; finish: Finish } | null;
};

/** The key `holdingKeyOf` gives a holding, so held rows and lines are compared in one vocabulary. */
export const holdingKey = (oracleId: string, h: { setCode: string; collectorNumber: string; finish: Finish }) =>
  `${oracleId}|${h.setCode}|${h.collectorNumber}|${h.finish}`;

/** `C21 · #263`: the chip's own label, also the `was` text a fixed printing keeps. */
export function printingLabel(p: { setCode: string; collectorNumber: string }): string {
  return `${p.setCode.toUpperCase()}${p.collectorNumber ? ` · #${p.collectorNumber}` : ""}`;
}

/**
 * A printing the catalog does not list for this card: a bare `Name,Qty` import (an empty set code),
 * or a set the catalog has since dropped. It is a holding the player can still lower, raise or
 * re-pick, but its finish cannot change, because a row naming no catalog printing cannot be created.
 */
export const isSynthetic = (p: PrintingChoice) => p.scryfallId === "";

function syntheticPrinting(h: CardHolding): PrintingChoice {
  return {
    scryfallId: "",
    setCode: h.setCode,
    setName: null,
    collectorNumber: h.collectorNumber,
    releasedAt: null,
    imageUri: null,
    flavorName: null,
    finishes: [h.finish],
    owned: {},
  };
}

export type EditCard = { oracleId: string; name: string; imageUri: string | null };

/** One line per holding, in the order the catalog lists printings (newest set first). */
export function linesFromHoldings(card: EditCard, choices: PrintingChoice[], holdings: CardHolding[]): EditLineState[] {
  const order = new Map(choices.map((c, i) => [`${c.setCode}|${c.collectorNumber}`, i]));
  const rank = (h: CardHolding) => order.get(`${h.setCode}|${h.collectorNumber}`) ?? Number.MAX_SAFE_INTEGER;
  return [...holdings]
    .sort((a, b) => rank(a) - rank(b))
    .map((h) => {
      const printing = choices.find((c) => c.setCode === h.setCode && c.collectorNumber === h.collectorNumber) ?? syntheticPrinting(h);
      const key = holdingKey(card.oracleId, h);
      return {
        id: `held:${key}`,
        oracleId: card.oracleId,
        name: card.name,
        imageUri: card.imageUri,
        // Every catalog printing: re-picking a line's printing may land on any of them.
        choices,
        printing,
        finish: h.finish,
        quantity: h.quantity,
        condition: h.condition,
        origin: { key, label: printingLabel(h), printKey: `${h.setCode}|${h.collectorNumber}`, finish: h.finish },
      };
    });
}

/**
 * A new line for `Add another printing`: the required printing step, with the printings the
 * player already holds left out (choosing one would only be `+` on its own line).
 */
export function openNewLine(
  lines: EditLineState[],
  id: string,
  card: EditCard,
  choices: PrintingChoice[],
  holdings: CardHolding[],
): EditLineState[] {
  const held = new Set(holdings.map((h) => `${h.setCode}|${h.collectorNumber}`));
  return [
    {
      id,
      oracleId: card.oracleId,
      name: card.name,
      imageUri: card.imageUri,
      choices: choices.filter((c) => !held.has(`${c.setCode}|${c.collectorNumber}`)),
      printing: null,
      finish: "nonfoil",
      quantity: 1,
      condition: null,
      origin: null,
    },
    ...lines,
  ];
}

/** The rows `editCollection` takes: every holding whose count the lines change, by key. */
export type EditPayloadRow = {
  oracleId: string;
  setCode: string;
  collectorNumber: string;
  finish: Finish;
  quantity: number;
  expected: number;
  condition?: string | null;
};

type Staged = { quantity: number; line: EditLineState };

function stagedByKey(lines: EditLineState[]): Map<string, Staged> {
  const out = new Map<string, Staged>();
  for (const l of lines) {
    const key = holdingKeyOf(l);
    if (key === null) continue;
    const have = out.get(key);
    out.set(key, { quantity: (have?.quantity ?? 0) + l.quantity, line: have?.line ?? l });
  }
  return out;
}

/**
 * The rows that change. A holding the lines no longer name goes to zero; a holding the sheet
 * showed at zero and the lines now name is created, carrying the condition of the line it came
 * from (null for a line the player added). `removeAll` stages every holding at zero.
 */
export function diffRows(
  oracleId: string,
  holdings: CardHolding[],
  lines: EditLineState[],
  removeAll = false,
): EditPayloadRow[] {
  const held = new Map(holdings.map((h) => [holdingKey(oracleId, h), h]));
  const staged = removeAll ? new Map<string, Staged>() : stagedByKey(lines);
  const rows: EditPayloadRow[] = [];
  for (const [key, h] of held) {
    const quantity = staged.get(key)?.quantity ?? 0;
    if (quantity !== h.quantity) {
      rows.push({ oracleId, setCode: h.setCode, collectorNumber: h.collectorNumber, finish: h.finish, quantity, expected: h.quantity });
    }
  }
  for (const [key, s] of staged) {
    if (held.has(key)) continue;
    const p = s.line.printing!;
    rows.push({
      oracleId, setCode: p.setCode, collectorNumber: p.collectorNumber, finish: s.line.finish,
      quantity: s.quantity, expected: 0, condition: s.line.condition,
    });
  }
  return rows;
}

const printKeyOf = (l: EditLineState) => (l.printing ? `${l.printing.setCode}|${l.printing.collectorNumber}` : null);

export type EditSummary = {
  /** Copies the save raises and lowers, across every holding it touches. */
  up: number;
  down: number;
  /** Lines whose printing was fixed by re-picking. */
  moved: number;
  /** The copies the lines hold at the end. */
  total: number;
  /** Copies held when the sheet opened. */
  held: number;
  changed: boolean;
  /** Nothing is left: every holding goes to zero. */
  removes: boolean;
  /** A lowering is in it, so the server may answer with the decks it leaves short. */
  lowers: boolean;
};

export function summarizeEdit(oracleId: string, holdings: CardHolding[], lines: EditLineState[], removeAll = false): EditSummary {
  const rows = diffRows(oracleId, holdings, lines, removeAll);
  const up = rows.reduce((n, r) => n + Math.max(0, r.quantity - r.expected), 0);
  const down = rows.reduce((n, r) => n + Math.max(0, r.expected - r.quantity), 0);
  const done = removeAll ? [] : lines.filter(isComplete);
  const held = holdings.reduce((n, h) => n + h.quantity, 0);
  return {
    up,
    down,
    moved: done.filter((l) => l.origin !== null && l.origin.printKey !== printKeyOf(l)).length,
    total: done.reduce((n, l) => n + l.quantity, 0),
    held,
    changed: rows.length > 0,
    removes: held > 0 && done.length === 0,
    lowers: down > 0,
  };
}

/**
 * The diff beside Save (R2 C5): `+1 · −1`, or `1 printing changed` when the copies only changed
 * labels, which is a save that never warns about decks. Null when there is nothing to say.
 */
export function diffParts(s: EditSummary): { up: number; down: number } | { moved: number } | null {
  if (!s.changed) return null;
  if (s.moved > 0 && s.up === s.down) return { moved: s.moved };
  return { up: s.up, down: s.down };
}

/**
 * The note at a line's right edge: `−1` / `+1` against the holding it names, or where a fixed
 * printing was. Null for a line the edit leaves alone.
 */
export type LineNote =
  | { kind: "delta"; delta: number }
  | { kind: "moved"; from: string; copies: number };

export function lineNote(oracleId: string, holdings: CardHolding[], l: EditLineState): LineNote | null {
  const key = holdingKeyOf(l);
  if (key === null) return null;
  if (l.origin !== null && l.origin.key !== key) {
    // A finish change alone keeps the printing, so the note names the finish it was.
    const same = l.origin.printKey === printKeyOf(l);
    return { kind: "moved", from: same ? `${l.origin.label} · ${l.origin.finish}` : l.origin.label, copies: l.quantity };
  }
  const was = holdings.find((h) => holdingKey(oracleId, h) === key)?.quantity ?? 0;
  const delta = l.quantity - was;
  return delta === 0 ? null : { kind: "delta", delta };
}
