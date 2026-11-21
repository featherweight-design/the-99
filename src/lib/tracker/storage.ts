/**
 * The tracker's device storage: one key per table, holding the game (config plus log) and the instant it stops being
 * kept. That instant is the table's own close (`expires_at`, the 6 am a table's logging ends), so a running or finished
 * game survives a reload or the app sleeping for exactly as long as the table can still log it, and no longer. Reads
 * and writes never throw: storage can be absent, full or blocked, and then the game simply is not kept.
 */
import type { Game } from "./engine";

const PREFIX = "the99.tracker.";
const VERSION = 1;

type Stored = { v: typeof VERSION; game: Game; expiresAt: number };

const keyOf = (tableId: string) => PREFIX + tableId;

function parse(raw: string | null, tableId: string): Stored | null {
  if (raw === null) return null;
  try {
    const v = JSON.parse(raw) as Partial<Stored> | null;
    const g = v?.game;
    if (!v || v.v !== VERSION || typeof v.expiresAt !== "number") return null;
    if (!g || g.config?.tableId !== tableId || !Array.isArray(g.config.seats) || !Array.isArray(g.log)) return null;
    return v as Stored;
  } catch {
    return null;
  }
}

/** The game kept for a table, or null when none is kept, it is unreadable, or its table has closed for logging. */
export function loadGame(storage: Pick<Storage, "getItem" | "removeItem">, tableId: string, now: number): Game | null {
  return loadKept(storage, tableId, now)?.game ?? null;
}

/** `loadGame` with the instant it stops being kept, so a discard's Undo can put it back exactly (`saveGame`). */
export function loadKept(storage: Pick<Storage, "getItem" | "removeItem">, tableId: string, now: number): { game: Game; expiresAt: number } | null {
  try {
    const kept = parse(storage.getItem(keyOf(tableId)), tableId);
    if (kept && kept.expiresAt > now) return { game: kept.game, expiresAt: kept.expiresAt };
    storage.removeItem(keyOf(tableId));
  } catch {
    /* storage unavailable */
  }
  return null;
}

export function saveGame(storage: Pick<Storage, "setItem">, game: Game, expiresAt: number): void {
  try {
    storage.setItem(keyOf(game.config.tableId), JSON.stringify({ v: VERSION, game, expiresAt } satisfies Stored));
  } catch {
    /* storage unavailable or full */
  }
}

export function discardGame(storage: Pick<Storage, "removeItem">, tableId: string): void {
  try {
    storage.removeItem(keyOf(tableId));
  } catch {
    /* storage unavailable */
  }
}

/** Clears every kept game whose table has closed or whose entry is unreadable, so old nights do not pile up. */
export function sweepGames(storage: Pick<Storage, "getItem" | "removeItem" | "key" | "length">, now: number): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k?.startsWith(PREFIX)) keys.push(k);
    }
    for (const k of keys) {
      const kept = parse(storage.getItem(k), k.slice(PREFIX.length));
      if (!kept || kept.expiresAt <= now) storage.removeItem(k);
    }
  } catch {
    /* storage unavailable */
  }
}
