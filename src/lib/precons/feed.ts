/**
 * MTGJSON's Commander precons, reduced to the fields the app keeps (plan
 * `2026-10-11-commander-precons.md`, PR 1; brief locks 1 to 3).
 *
 * Upstream is one index (`DeckList.json`, ~650KB) plus one file per deck (~510KB raw each, 197 of
 * them). The manifest gives each fetched file one URL and one hash, so 197 responses cannot be one
 * hash-checkable upstream file. The fetch therefore keeps the INDEX as fetched and writes ONE
 * derived file of our own (`PreconFeed`, a few MB), hashed as our bytes: the kept fields of every
 * `Commander Deck`, nothing else. Cards are carried by `scryfallOracleId` and `scryfallId` alone;
 * nothing here matches by name.
 *
 * Every read has one seam, `loadPreconFeed`: the fetched file when `CATALOG_FETCH_DIR` is set,
 * the network otherwise, as `fetchManapoolSingles` is.
 */
import { createHash } from "node:crypto";
import { fetchDir, readFetchedJson } from "../catalog/fetch-dir";

export const MTGJSON_BASE = "https://mtgjson.com/api/v5";
export const MTGJSON_DECKLIST_URL = `${MTGJSON_BASE}/DeckList.json`;
export const mtgjsonDeckUrl = (fileName: string) => `${MTGJSON_BASE}/decks/${encodeURIComponent(fileName)}.json`;

export const MTGJSON_HEADERS = {
  accept: "application/json",
  "user-agent": "the-99 (+https://the-99.dev)",
};

/** Ruling 1: this deck type and no other (not `MTGO Commander Deck`, not the Brawl types). */
export const COMMANDER_DECK_TYPE = "Commander Deck";

/** The two files the `precons` source arrives as: upstream's index, then our derived body. */
export const PRECON_INDEX_FILE = "mtgjson-decklist.json";
export const PRECON_FEED_FILE = "mtgjson-precons.json";

/** Every Commander precon is 100 cards (all 197 on 2026-10-11); a deck that is not is dropped and named. */
export const PRECON_SIZE = 100;
/** 197 listed on 2026-10-11. A feed under this is a broken fetch, not a smaller product line. */
export const MIN_PRECONS = 180;

/** A cached derived file older than this is fetched again even when the index has not moved. */
export const PRECON_REUSE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type IndexEntry = { code: string; fileName: string; name: string; releaseDate: string; type: string };

export type FeedCard = { oracleId: string | null; scryfallId: string | null; count: number; commander: boolean };

export type PreconFeedDeck = { fileName: string; name: string; code: string; releaseDate: string; cards: FeedCard[] };

export type PreconFeed = {
  /** `indexKey` of the index entries the decks were fetched for. */
  indexKey: string;
  /** When the deck files were fetched (not when this file was last reused). */
  fetchedAt: string;
  decks: PreconFeedDeck[];
};

const str = (v: unknown): v is string => typeof v === "string" && v.length > 0;

/** The index's `Commander Deck` entries, or a thrown contract break. */
export function commanderDeckEntries(index: unknown): IndexEntry[] {
  const data = (index as { data?: unknown })?.data;
  if (!Array.isArray(data)) throw new Error("DeckList.json: data is not an array");
  const out: IndexEntry[] = [];
  for (const raw of data) {
    const e = raw as Partial<IndexEntry>;
    if (e?.type !== COMMANDER_DECK_TYPE) continue;
    if (!str(e.code) || !str(e.fileName) || !str(e.name) || !str(e.releaseDate)) {
      throw new Error(`DeckList.json: a Commander Deck entry lacks code, fileName, name or releaseDate: ${JSON.stringify(raw)}`);
    }
    out.push({ code: e.code, fileName: e.fileName, name: e.name, releaseDate: e.releaseDate, type: e.type });
  }
  return out;
}

/**
 * Identifies the set of Commander decks the index lists. The index's own `meta` moves every day,
 * so its hash cannot say whether the decks moved; this hashes only the entries a fetch reads.
 */
export function indexKey(entries: readonly IndexEntry[]): string {
  const rows = entries.map((e) => [e.fileName, e.name, e.code, e.releaseDate]).sort((a, b) => a[0].localeCompare(b[0]));
  return createHash("sha256").update(JSON.stringify(rows)).digest("hex");
}

/**
 * One deck file reduced to the kept fields. `commander[]` and `mainBoard[]` are the deck; the side
 * board, tokens, planes, schemes and `displayCommander` are not part of it. A card with no
 * identifier keeps a null, so the ingest counts it as unmapped rather than this throwing it away.
 */
export function deriveDeck(entry: IndexEntry, file: unknown): PreconFeedDeck {
  const data = (file as { data?: { commander?: unknown; mainBoard?: unknown } })?.data;
  if (!Array.isArray(data?.commander) || !Array.isArray(data?.mainBoard)) {
    throw new Error(`${entry.fileName}: commander or mainBoard is not an array`);
  }
  const card = (raw: unknown, commander: boolean): FeedCard => {
    const c = raw as { count?: unknown; identifiers?: { scryfallId?: unknown; scryfallOracleId?: unknown } };
    if (typeof c?.count !== "number" || !Number.isInteger(c.count) || c.count < 1) {
      throw new Error(`${entry.fileName}: a card entry has no positive integer count`);
    }
    const ids = c.identifiers ?? {};
    return {
      oracleId: str(ids.scryfallOracleId) ? ids.scryfallOracleId : null,
      scryfallId: str(ids.scryfallId) ? ids.scryfallId : null,
      count: c.count,
      commander,
    };
  };
  return {
    fileName: entry.fileName,
    name: entry.name,
    code: entry.code,
    releaseDate: entry.releaseDate,
    cards: [...data.commander.map((c) => card(c, true)), ...data.mainBoard.map((c) => card(c, false))],
  };
}

/** Whether a derived file cached by an earlier run can stand for today's (same decks, fresh enough). */
export function canReuse(cached: PreconFeed | null, key: string, now: Date): boolean {
  if (!cached || cached.indexKey !== key) return false;
  const at = new Date(cached.fetchedAt).getTime();
  return Number.isFinite(at) && now.getTime() - at < PRECON_REUSE_MAX_AGE_MS && cached.decks.length > 0;
}

/** A derived file read back from disk, shape-checked, or null when it is not one. */
export function parseFeed(raw: unknown): PreconFeed | null {
  const f = raw as Partial<PreconFeed>;
  if (!str(f?.indexKey) || !str(f?.fetchedAt) || !Array.isArray(f?.decks)) return null;
  for (const d of f.decks) {
    if (!str(d?.fileName) || !str(d?.name) || !str(d?.code) || !str(d?.releaseDate) || !Array.isArray(d?.cards)) return null;
  }
  return f as PreconFeed;
}

async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  const res = await fetch(url, { headers: MTGJSON_HEADERS, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`${url}: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function fetchDeckListIndex(): Promise<unknown> {
  return getJson(MTGJSON_DECKLIST_URL, 60_000);
}

/** Fetches every listed deck file, a few at a time, and derives the feed. */
export async function fetchPreconDecks(entries: readonly IndexEntry[], key: string): Promise<PreconFeed> {
  const fetchedAt = new Date().toISOString();
  const decks: PreconFeedDeck[] = new Array(entries.length);
  let next = 0;
  const worker = async () => {
    while (next < entries.length) {
      const i = next++;
      decks[i] = deriveDeck(entries[i], await getJson(mtgjsonDeckUrl(entries[i].fileName), 60_000));
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return { indexKey: key, fetchedAt, decks };
}

/** The seam: the fetched artifact's derived file, or a live fetch when no artifact is named. */
export async function loadPreconFeed(): Promise<PreconFeed> {
  const dir = fetchDir();
  if (dir) {
    const feed = parseFeed(readFetchedJson(dir, PRECON_FEED_FILE));
    if (!feed) throw new Error(`${PRECON_FEED_FILE}: not a precon feed`);
    return feed;
  }
  const entries = commanderDeckEntries(await fetchDeckListIndex());
  return fetchPreconDecks(entries, indexKey(entries));
}
