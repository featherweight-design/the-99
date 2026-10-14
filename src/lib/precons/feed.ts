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

/** `foil`: MTGJSON's `isFoil`, the copies the box holds in foil. */
export type FeedCard = { oracleId: string | null; scryfallId: string | null; count: number; commander: boolean; foil: boolean };

/** One entry of the deck's `tokens[]`, by its Scryfall printing id. */
export type FeedToken = { scryfallId: string | null; count: number };

export type PreconFeedDeck = {
  fileName: string; name: string; code: string; releaseDate: string; cards: FeedCard[]; tokens: FeedToken[];
};

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
 * One deck file reduced to the kept fields. `commander[]` and `mainBoard[]` are the deck, each card
 * with its `isFoil`; `tokens[]` is kept beside it, for adding the precon to a collection with its
 * tokens marked owned (the add action is the next change). The side board, planes, schemes and `displayCommander` are not part of it. A card
 * with no identifier keeps a null, so the ingest counts it as unmapped rather than this throwing it
 * away. A file with no `tokens` array reads as a deck with none.
 */
export function deriveDeck(entry: IndexEntry, file: unknown): PreconFeedDeck {
  const data = (file as { data?: { commander?: unknown; mainBoard?: unknown; tokens?: unknown } })?.data;
  if (!Array.isArray(data?.commander) || !Array.isArray(data?.mainBoard)) {
    throw new Error(`${entry.fileName}: commander or mainBoard is not an array`);
  }
  const card = (raw: unknown, commander: boolean): FeedCard => {
    const c = raw as { count?: unknown; isFoil?: unknown; identifiers?: { scryfallId?: unknown; scryfallOracleId?: unknown } };
    if (typeof c?.count !== "number" || !Number.isInteger(c.count) || c.count < 1) {
      throw new Error(`${entry.fileName}: a card entry has no positive integer count`);
    }
    // Every card entry carries it (64 of 64 decks sampled, 2011 to 2026, on 2026-10-14): a missing one
    // is a shape change, and reading it as non-foil would publish the wrong finish without failing.
    if (typeof c.isFoil !== "boolean") throw new Error(`${entry.fileName}: a card entry has no boolean isFoil`);
    const ids = c.identifiers ?? {};
    return {
      oracleId: str(ids.scryfallOracleId) ? ids.scryfallOracleId : null,
      scryfallId: str(ids.scryfallId) ? ids.scryfallId : null,
      count: c.count,
      commander,
      foil: c.isFoil,
    };
  };
  const token = (raw: unknown): FeedToken => {
    const t = raw as { count?: unknown; identifiers?: { scryfallId?: unknown } };
    if (typeof t?.count !== "number" || !Number.isInteger(t.count) || t.count < 1) {
      throw new Error(`${entry.fileName}: a token entry has no positive integer count`);
    }
    return { scryfallId: str(t?.identifiers?.scryfallId) ? t.identifiers.scryfallId : null, count: t.count };
  };
  return {
    fileName: entry.fileName,
    name: entry.name,
    code: entry.code,
    releaseDate: entry.releaseDate,
    cards: [...data.commander.map((c) => card(c, true)), ...data.mainBoard.map((c) => card(c, false))],
    tokens: Array.isArray(data.tokens) ? data.tokens.map(token) : [],
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
  const id = (v: unknown) => v === null || str(v);
  for (const d of f.decks) {
    // `tokens` and each card's `foil` arrived after the first files were cached: a file without
    // them reads as no cache, so the next fetch brings them rather than an ingest dropping them.
    if (!str(d?.fileName) || !str(d?.name) || !str(d?.code) || !str(d?.releaseDate) || !Array.isArray(d?.cards)
      || !Array.isArray(d?.tokens)) return null;
    for (const t of d.tokens as unknown[]) {
      const x = t as Partial<FeedToken>;
      if (!id(x?.scryfallId) || typeof x?.count !== "number" || !Number.isInteger(x.count) || x.count < 1) return null;
    }
    // Every card too: a cached file is reused straight into the artifact, so a malformed one must
    // read as no cache (and a refetch), never reach the ingest.
    for (const c of d.cards as unknown[]) {
      const x = c as Partial<FeedCard>;
      if (!id(x?.oracleId) || !id(x?.scryfallId) || typeof x?.commander !== "boolean" || typeof x?.foil !== "boolean"
        || typeof x?.count !== "number" || !Number.isInteger(x.count) || x.count < 1) return null;
    }
  }
  return f as PreconFeed;
}

/** Attempts per file, and the wait before the second (doubled before the third). */
export const FETCH_ATTEMPTS = 3;
const RETRY_BASE_MS = 2_000;

/** A status worth asking again: rate limited, or a server-side failure. */
export const retryable = (status: number) => status === 429 || status >= 500;

/**
 * How long to wait before attempt `attempt + 1`: the server's `Retry-After` seconds when it gives
 * them, capped at a minute, otherwise an exponential backoff.
 */
export function retryDelayMs(attempt: number, retryAfter: string | null): number {
  const seconds = retryAfter === null ? NaN : Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds, 60) * 1000;
  return RETRY_BASE_MS * 2 ** (attempt - 1);
}

/**
 * One file, with bounded retries: the fetch reads ~200 files, and one timeout or 429 failing the
 * whole run would also withhold the Scryfall and price files fetched beside them. A fresh timeout
 * per attempt; a 4xx other than 429 fails at once, because asking again cannot change it.
 */
async function getJson(url: string, timeoutMs: number): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    let wait: number;
    try {
      const res = await fetch(url, { headers: MTGJSON_HEADERS, signal: AbortSignal.timeout(timeoutMs) });
      if (res.ok) return await res.json();
      if (!retryable(res.status) || attempt >= FETCH_ATTEMPTS) throw new Error(`${url}: ${res.status} ${res.statusText}`);
      wait = retryDelayMs(attempt, res.headers.get("retry-after"));
    } catch (error) {
      // A network error or a timeout: retried like a 5xx. A status error thrown above is final.
      if (error instanceof Error && error.message.startsWith(`${url}: `)) throw error;
      if (attempt >= FETCH_ATTEMPTS) throw error;
      wait = retryDelayMs(attempt, null);
    }
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
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
