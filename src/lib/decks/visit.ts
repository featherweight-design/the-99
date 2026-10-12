import { isUuid } from "../uuid";

/**
 * A VISIT to one deck (Hugh, 2026-10-11): from arriving on `/decks/[id]` until leaving it for
 * another route or another deck. A Tuning tool's result stays on screen for the whole visit,
 * across tab switches, other tools in the hub and the deck's own sub-pages (`/decks/[id]/*`), and
 * the next visit opens each tool in its offer state, with prior runs reachable only in History.
 *
 * Client-side module state, no React: a panel unmounts on every tab switch, so nothing it holds
 * can say "this visit". The shell's navigation provider reports every committed path
 * (`noteDeckRoute`), and a panel asks for its tool's BASELINE when its first read lands: what was
 * already stored when the visit began. A result whose identity equals the baseline's is a prior
 * visit's and is hidden; one that arrived after it (a run finishing during the visit) is shown.
 *
 * Identities only, never a timestamp compared against the client's clock, so a skewed clock
 * cannot move a result across the line.
 */
export type DeckTool = "suggested" | "cuts";

/** `okKey`: the stored ok result's identity (its `lastOkAt` as epoch-ms), null with none.
 *  `runId`: the newest SETTLED run's id, null with none — a pending run is always drawn as
 *  running, and whatever it settles to happened during this visit. */
export type ToolBaseline = { okKey: string | null; runId: string | null };

/** A tool result that is never stored server-side and must still last the visit. Opaque here; each owner
 *  decides what still holds. `mana-help` (Mana Balance's help) is checked against the list it was read for
 *  before it draws. `mana-trades` (the trades applied this visit) is drawn as it stands: each is a change
 *  already made, and its Undo is the check, refused over a deck that has moved since. */
export type VisitSlot = "mana-help" | "mana-trades";

type Visit = {
  deckId: string;
  baselines: Partial<Record<DeckTool, ToolBaseline>>;
  values: Partial<Record<VisitSlot, unknown>>;
  /** Per slot, the newest request asked in this visit, across every mount of its tool. */
  asks: Partial<Record<VisitSlot, number>>;
};

let visit: Visit | null = null;
let askSeq = 0;
const listeners = new Set<() => void>();
const notify = () => { for (const l of listeners) l(); };

/** Told whenever a value is kept or cleared, or the visit itself changes: for `useSyncExternalStore`, so
 *  every mounted reader of a slot redraws when ANY mount's request settles into it. */
export function subscribeVisit(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const DECK_ROUTE = /^\/decks\/([^/]+)(?:\/|$)/;

/** The committed path, from the shell. The same deck keeps the visit, another deck starts one,
 *  anything else (or null) ends it. */
export function noteDeckRoute(path: string | null): void {
  const id = path ? DECK_ROUTE.exec(path)?.[1] : undefined;
  if (!id || !isUuid(id)) {
    if (visit) {
      visit = null;
      notify();
    }
    return;
  }
  // Lowercase, as Postgres returns a uuid: an uppercase URL and the deck's own id name one deck.
  const deckId = id.toLowerCase();
  if (visit?.deckId !== deckId) {
    visit = { deckId, baselines: {}, values: {}, asks: {} };
    notify();
  }
}

/** A stored ok result's identity: its `lastOkAt` as epoch-ms, or null with none. */
export function okKeyOf(lastOkAt: Date | string | null | undefined): string | null {
  if (lastOkAt === null || lastOkAt === undefined) return null;
  const ms = new Date(lastOkAt).getTime();
  return Number.isNaN(ms) ? null : String(ms);
}

/** This visit's baseline for one tool: `seen` the first time it is asked in the visit, the
 *  recorded one thereafter. Only `noteDeckRoute` opens a visit: a read that lands after the
 *  player left the deck (the shell notes the new path in a layout effect, before a panel's own
 *  cleanup runs) gets `seen` back and records nothing, so it cannot revive the visit just ended. */
export function visitBaseline(anyCaseId: string, tool: DeckTool, seen: ToolBaseline): ToolBaseline {
  const deckId = anyCaseId.toLowerCase();
  if (visit?.deckId !== deckId) return { okKey: seen.okKey, runId: seen.runId };
  const recorded = visit.baselines[tool];
  if (recorded) return recorded;
  visit.baselines[tool] = { okKey: seen.okKey, runId: seen.runId };
  return visit.baselines[tool];
}

/** Whether a stored ok result is a prior visit's: it is the very one the baseline recorded. */
export function isPriorResult(baseline: ToolBaseline | null, okKey: string | null): boolean {
  return baseline !== null && baseline.okKey !== null && okKey === baseline.okKey;
}

/** Whether the newest run is a prior visit's settled run (its failure is not this visit's). */
export function isPriorRun(baseline: ToolBaseline | null, runId: string | null | undefined): boolean {
  return baseline !== null && baseline.runId !== null && runId === baseline.runId;
}

/** What this visit to the deck holds in `slot`, or undefined: nothing kept, or no visit open to it. */
export function visitValue<T>(anyCaseId: string, slot: VisitSlot): T | undefined {
  return visit?.deckId === anyCaseId.toLowerCase() ? (visit.values[slot] as T | undefined) : undefined;
}

/** Keeps `value` for the rest of this visit to the deck (undefined clears it). Like `visitBaseline`,
 *  only within a visit `noteDeckRoute` opened: a reply landing after the player left keeps nothing. */
export function setVisitValue(anyCaseId: string, slot: VisitSlot, value: unknown): void {
  if (visit?.deckId !== anyCaseId.toLowerCase()) return;
  if (value === undefined) delete visit.values[slot];
  else visit.values[slot] = value;
  notify();
}

/** Numbers a request for `slot` in this visit: the newest asked, across every mount of the tool
 *  (a panel remounts on each tab or tool switch), so a slower reply from an earlier mount cannot
 *  overwrite a newer one. Null with no visit open to the deck. */
export function askInVisit(anyCaseId: string, slot: VisitSlot): number | null {
  if (visit?.deckId !== anyCaseId.toLowerCase()) return null;
  // Numbered across visits, never restarting, so an earlier visit's number is never a later one's.
  visit.asks[slot] = ++askSeq;
  return visit.asks[slot];
}

/** Whether `ask` is still the newest request for `slot` in the open visit to the deck. */
export function isNewestAsk(anyCaseId: string, slot: VisitSlot, ask: number | null): boolean {
  return ask !== null && visit?.deckId === anyCaseId.toLowerCase() && visit.asks[slot] === ask;
}

/** The open visit to the deck, as an opaque token, or null with none: a press takes one, and its reply
 *  settles only while `isVisit` still holds. Unlike `askInVisit`, it does not number requests, so two
 *  concurrent presses in one visit both settle. */
export function visitToken(anyCaseId: string): object | null {
  return visit?.deckId === anyCaseId.toLowerCase() ? visit : null;
}

/** Whether `token` is still the open visit: false once the player left the deck, even if they came back. */
export function isVisit(token: object | null): boolean {
  return token !== null && token === visit;
}

export function resetDeckVisitForTests(): void {
  visit = null;
  notify();
}
