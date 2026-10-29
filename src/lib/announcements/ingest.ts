/**
 * The Announcements ingest: sitemap → changed posts → parsed rows. Runs dark (no reader, no feed, no push).
 *
 * Every dependency is injected (`IngestDeps`), so the whole run is tested with a fake fetch and an in-memory store;
 * the database half is `ingest-store.ts`.
 *
 * - A post is fetched when it is new to the store or its sitemap `lastmod` differs from the stored one (ruling 4:
 *   an edit, a third deck list added, moves `lastmod`). A post that fails to fetch or parse stores nothing, so the
 *   next run tries it again.
 * - Sequential, `delayMs` between page fetches, a User-Agent naming the app, and a time budget: the back catalogue
 *   (608 posts, ~2.5s a page) fills over several runs.
 * - `baseline` is true for a post published before the ingest's first run (the earliest `first_seen_at`, or this
 *   run's start on an empty table): the back catalogue, however many runs it takes to read, never reads as new.
 */
import type { AnnouncementFeedKind } from "../feed/kinds";
import { classifyAnnouncement, type AnnouncementKind } from "./classify";
import { parseDecklists, promisedDeckCount, type ParsedDeck } from "./decklists";
import { buildNameIndex, matchCardName } from "./match-names";
import { secondLineRole, type CommanderFacts } from "./pairing";
import { parsePost, type AnnouncementPost } from "./post";
import { announcementPosts, SITEMAP_URL, type SitemapEntry } from "./sitemap";

export const USER_AGENT = "The99/1.0 (Commander companion; announcements ingest)";

/**
 * The backfill floor (ruling 2): no alert for a post published before it. Measured over all 608 Announcements posts
 * in the sitemap on 2026-10-29 (42 classify as Commander decklists): Warhammer 40,000 Commander Decklists (2022-09-17) is the last Commander decklists
 * post drawn as plain HTML (`span.card-count`) that this parser cannot read; Starter Commander Decks Decklists
 * (`starter-commander-decks-decklists-2022-10-20`, published 2022-10-20T22:00Z) is the first after it, and every
 * one since uses `<deck-list>`. Before it the format is mixed (Innistrad: Midnight Hunt, 2021-09, already used it).
 */
export const DECKLIST_FLOOR = "2022-10-20T22:00:00.000Z";

/** How long a Commander decklists post may go with no lists, or fewer than it promised, before it alerts. */
export const INCOMPLETE_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

export type ParseStatus = "ok" | "empty" | "incomplete";

/** What the store knows of a post, keyed by URL for the sitemap diff. */
export type KnownPost = {
  url: string;
  contentfulId: string;
  title: string;
  lastmod: string | null;
  kind: AnnouncementFeedKind;
  publishedAt: string;
  parseStatus: ParseStatus;
  firstSeenAt: string;
};

export type AnnouncementRecord = {
  contentfulId: string;
  url: string;
  slug: string | null;
  title: string;
  excerpt: string | null;
  heroImageUrl: string | null;
  publishedAt: string;
  kind: AnnouncementFeedKind;
  lastmod: string | null;
  lastFetchedAt: string;
  promisedDecks: number | null;
  parseStatus: ParseStatus;
  baseline: boolean;
};

export type DecklistRecord = {
  position: number;
  title: string | null;
  commanderCardId: string | null;
  commanderName: string | null;
  partnerCardId: string | null;
  partnerName: string | null;
  partnerRole: "co-commander" | "alternate" | null;
  cardCount: number;
  cards: { name: string; count: number; cardId: string | null }[];
  unmatched: string[];
};

export type CatalogCard = CommanderFacts & { oracleId: string };

export type IngestStore = {
  readKnown(): Promise<KnownPost[]>;
  /** Read once per run, and only when a fetched post carries deck lists. */
  readCatalog(): Promise<CatalogCard[]>;
  /** Upserts the post on its Contentful id (keeping `first_seen_at` and `baseline`) and replaces its deck lists. */
  save(post: AnnouncementRecord, decklists: DecklistRecord[]): Promise<void>;
};

export type IngestAlert =
  | { kind: "sitemap-unreadable"; status: number | null }
  | { kind: "fetch-failed"; url: string; status: number | null }
  | { kind: "parse-failed"; url: string; reason: string }
  | { kind: "unknown-sections"; url: string; sections: string[] }
  | { kind: "decklists-missing"; url: string; title: string; status: Exclude<ParseStatus, "ok"> };

export type IngestDeps = {
  fetchText(url: string, init: { headers: Record<string, string> }): Promise<{ status: number; text: string }>;
  store: IngestStore;
  alert(alert: IngestAlert): void;
  now(): Date;
  sleep(ms: number): Promise<void>;
  delayMs?: number;
  /** Stop starting new page fetches after this long (ms). */
  budgetMs?: number;
};

export type IngestReport = { posts: number; due: number; saved: number; failed: number; deferred: number; alerts: number };

/** The sitemap entries due a fetch: new to the store, or edited since. Newest `lastmod` first, so new posts lead. */
export function planFetches(entries: readonly SitemapEntry[], known: readonly KnownPost[]): SitemapEntry[] {
  const stored = new Map(known.map((k) => [k.url, k.lastmod]));
  return entries
    .filter((e) => !stored.has(e.url) || stored.get(e.url) !== e.lastmod)
    .sort((a, b) => (b.lastmod ?? "").localeCompare(a.lastmod ?? ""));
}

/**
 * A page that is no longer a post: taken down (404, 410), or redirected (the sitemap still lists two posts that
 * 302 to the home page, measured 2026-10-29; the fetch does not follow redirects). Not stored, not alerted, and
 * tried again next run, which is one request each.
 */
export function isGone(status: number | null): boolean {
  return status === 404 || status === 410 || (status !== null && status >= 300 && status < 400);
}

/**
 * The stored (and feed) key for a classifier kind: its "Other" is `wizards-news` (`ANNOUNCEMENT_KINDS`). Mapped here, at
 * the store's boundary, so the pure classifier keeps its own vocabulary and every row and later reader uses the feed's.
 */
export function feedKindOf(kind: AnnouncementKind): AnnouncementFeedKind {
  return kind === "other" ? "wizards-news" : kind;
}

export function parseStatusOf(kind: AnnouncementFeedKind, decks: readonly ParsedDeck[], promised: number | null): ParseStatus {
  if (kind !== "commander-decklists") return "ok";
  if (decks.length === 0) return "empty";
  return promised !== null && decks.length < promised ? "incomplete" : "ok";
}

/** Ruling 4: a Commander decklists post after the floor, still empty or short three days after it was published. */
export function overdue(post: Pick<KnownPost, "kind" | "parseStatus" | "publishedAt">, now: Date): boolean {
  return (
    post.kind === "commander-decklists" &&
    post.parseStatus !== "ok" &&
    post.publishedAt >= DECKLIST_FLOOR &&
    now.getTime() - Date.parse(post.publishedAt) >= INCOMPLETE_GRACE_MS
  );
}

export type CatalogLookup = { index: Map<string, string>; facts: Map<string, CatalogCard> };

export function catalogLookup(catalog: readonly CatalogCard[]): CatalogLookup {
  return {
    index: buildNameIndex(catalog.map((c) => [c.name, c.oracleId] as const)),
    facts: new Map(catalog.map((c) => [c.oracleId, c])),
  };
}

/** One parsed list as stored: every line kept, its card id where the catalog has it, the misses listed. */
export function decklistRecord(deck: ParsedDeck, position: number, lookup: CatalogLookup): DecklistRecord {
  const id = (name: string) => matchCardName(name, lookup.index);
  const cards = deck.cards.map((c) => ({ name: c.name, count: c.count, cardId: id(c.name) }));
  const unmatched = [...new Set(cards.filter((c) => c.cardId === null).map((c) => c.name))];
  const [commanderName = null, headerPartner = null] = deck.commanders;
  const commanderCardId = commanderName ? id(commanderName) : null;

  let partnerName: string | null = null;
  let partnerRole: DecklistRecord["partnerRole"] = null;
  if (headerPartner) {
    // A legacy header that names both is the post itself saying they pair.
    partnerName = headerPartner;
    partnerRole = "co-commander";
  } else if (deck.commanderCandidate) {
    const second = id(deck.commanderCandidate);
    const role = secondLineRole(
      commanderCardId ? lookup.facts.get(commanderCardId) ?? null : null,
      second ? lookup.facts.get(second) ?? null : null,
    );
    if (role) {
      partnerName = deck.commanderCandidate;
      partnerRole = role;
    }
  }
  return {
    position,
    title: deck.title,
    commanderCardId,
    commanderName,
    partnerCardId: partnerName ? id(partnerName) : null,
    partnerName,
    partnerRole,
    cardCount: deck.cardCount,
    cards,
    unmatched,
  };
}

export function announcementRecord(
  post: AnnouncementPost,
  entry: SitemapEntry,
  kind: AnnouncementFeedKind,
  decks: readonly ParsedDeck[],
  at: { now: Date; firstRunAt: string },
): AnnouncementRecord {
  const promised = promisedDeckCount([post.excerpt]);
  return {
    contentfulId: post.contentfulId,
    url: entry.url,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    heroImageUrl: post.heroImageUrl,
    publishedAt: post.publishedDate,
    kind,
    lastmod: entry.lastmod,
    lastFetchedAt: at.now.toISOString(),
    promisedDecks: promised,
    parseStatus: parseStatusOf(kind, decks, promised),
    baseline: post.publishedDate < at.firstRunAt,
  };
}

export async function runAnnouncementsIngest(deps: IngestDeps): Promise<IngestReport> {
  const { store, now, sleep } = deps;
  const delayMs = deps.delayMs ?? 1000;
  const budgetMs = deps.budgetMs ?? 240_000;
  const started = now();
  const headers = { "user-agent": USER_AGENT };
  let alerts = 0;
  const alert = (a: IngestAlert) => {
    alerts++;
    deps.alert(a);
  };
  const report = (r: Omit<IngestReport, "alerts">): IngestReport => ({ ...r, alerts });

  const sitemap = await deps.fetchText(SITEMAP_URL, { headers }).catch(() => null);
  const entries = sitemap?.status === 200 ? announcementPosts(sitemap.text) : [];
  if (entries.length === 0) {
    alert({ kind: "sitemap-unreadable", status: sitemap?.status ?? null });
    return report({ posts: 0, due: 0, saved: 0, failed: 0, deferred: 0 });
  }

  const known = await store.readKnown();
  const firstRunAt = known.reduce((min, k) => (k.firstSeenAt < min ? k.firstSeenAt : min), started.toISOString());
  const due = planFetches(entries, known);
  const latest = new Map(known.map((k) => [k.url, k]));
  let lookup: CatalogLookup | null = null;
  let saved = 0;
  let failed = 0;
  let fetched = 0;

  for (const entry of due) {
    if (now().getTime() - started.getTime() >= budgetMs) break;
    if (fetched > 0) await sleep(delayMs);
    fetched++;
    const page = await deps.fetchText(entry.url, { headers }).catch(() => null);
    if (page?.status !== 200) {
      failed++;
      if (!isGone(page?.status ?? null)) alert({ kind: "fetch-failed", url: entry.url, status: page?.status ?? null });
      continue;
    }
    const parsed = parsePost(page.text, entry.url);
    if (!parsed.ok) {
      failed++;
      alert({ kind: "parse-failed", url: entry.url, reason: parsed.reason === "missing-fields" ? `missing ${parsed.missing.join(",")}` : parsed.reason });
      continue;
    }
    const { decks, unknownSections } = parseDecklists(parsed.post.bodyHtml);
    const kind = feedKindOf(classifyAnnouncement({ title: parsed.post.title, url: entry.url, decks }));
    // Banned and Restricted posts draw 60-card lists with `<side-board>` and `<companion-card>` (11 posts, 2025–26):
    // expected there. Only a Commander decklists post with a section the parser skips is worth a look.
    if (unknownSections.length > 0 && kind === "commander-decklists") {
      alert({ kind: "unknown-sections", url: entry.url, sections: unknownSections });
    }
    if (decks.length > 0 && !lookup) lookup = catalogLookup(await store.readCatalog());
    const record = announcementRecord(parsed.post, entry, kind, decks, { now: now(), firstRunAt });
    await store.save(record, lookup ? decks.map((d, i) => decklistRecord(d, i, lookup!)) : []);
    saved++;
    latest.set(entry.url, { ...record, firstSeenAt: latest.get(entry.url)?.firstSeenAt ?? started.toISOString() });
  }

  const at = now();
  for (const post of latest.values()) {
    // `overdue` already requires a status other than ok; restated so the alert's type narrows.
    if (overdue(post, at) && post.parseStatus !== "ok") {
      alert({ kind: "decklists-missing", url: post.url, title: post.title, status: post.parseStatus });
    }
  }
  return report({ posts: entries.length, due: due.length, saved, failed, deferred: due.length - fetched });
}
