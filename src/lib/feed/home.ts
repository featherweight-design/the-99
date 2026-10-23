/**
 * Home's news feed, as the page draws it (menu and Home PR 6; plan `2026-10-22-menu-home.md`, "The feed model").
 * Read PER REQUEST, after `cachePageForUser` and never inside it: listed in `check:list-cache`'s `PER_REQUEST_READS`,
 * so Home's cached payload carries none of it. The feed's item table moves no data stamp, so a cached feed would go stale.
 *
 * `loadHomeFeed` answers three ways:
 * - null: `HOME_FEED_ENABLED` is off for the reader (Home as shipped), and nothing is read;
 * - `{ chosen: false }`: every kind the reader can be offered is off, so What's new IS the opt-in (handoff call 7);
 * - `{ chosen: true }`: the items in the window, each with the card it is drawn with, read in four catalog lookups
 *   and one ownership count over the whole list (never one per item).
 *
 * `homeFeedAfter` is the visit's two writes, for `after()`: `markFeedSeen` (writes only while an unseen item exists)
 * and `noticeTradeMatches` (idempotent). Neither runs during the render, and neither reaches the cached path.
 */
import { sql, type SQL } from "drizzle-orm";

import { db } from "../../db";
import { cards, collectionItems, preconCards, precons, printings, sets } from "../../db/schema";
import { chainArt } from "../cards/chain-art";
import { loadIncomingAsks, type IncomingAsk } from "../social/spare-requests";
import { noticeTradeMatches } from "../social/trade-match";
import { availableFeedKinds, homeFeedEnabled } from "./flag";
import { leadStory, type FeedKind } from "./kinds";
import { effectiveKinds, markFeedSeen, readFeedPrefs } from "./prefs";
import { loadFeed, type FeedItem } from "./read";

type Executor = Pick<typeof db, "execute">;

/** The card an item is drawn with: the full card image (never the art crop) and the crop for the lead's backdrop. */
/** `colorIdentity`: the card's own, so a card with no art draws its identity gradient at card shape (`CommanderThumb`). */
export type FeedCard = { oracleId: string; name: string; image: string | null; art: string | null; colorIdentity: string[] | null };

/** One item, as the row and the lead draw it. Client-safe: plain data, the time as an ISO string. */
export type FeedView = {
  key: string;
  kind: FeedKind;
  at: string;
  unseen: boolean;
  /** The card. A combo's row draws the ∞ mark instead; its lead draws this, the piece the write added. Null for a card the catalog no longer holds. */
  card: FeedCard | null;
  /** The friend who is the news (trade match, spare request), by public id. */
  friend: { publicId: string; displayName: string } | null;
  /** Where the press goes, or null when it opens a card's detail (`opens`) or has no press yet (spare request). */
  href: string | null;
  /** The card whose shipped detail the press opens: a price drop's card, a combo's first piece. */
  opens: string | null;
  /** A new set's or precon's name. */
  name: string | null;
  /** A new set's card count. */
  setSize: number | null;
  /** A new precon's cards the reader owns, of its total. */
  owned: { owned: number; of: number } | null;
  /** A price drop's two figures, in cents. */
  drop: { fromCents: number; toCents: number } | null;
  /** A combo's two pieces by name, and the piece the reader's write added. */
  combo: { pieces: [string, string]; added: string } | null;
  /**
   * A spare request LEADING Home, while its ask is still open and the holder still offers the card (`loadIncomingAsks`):
   * the request to answer with Yes and No on the story itself (spare requests PR 3d, board `Friend-Side`). Absent on
   * every other item, and on a request no longer answerable, which stays a line.
   */
  ask?: LeadAsk;
};

/** What the lead story's Yes and No need: the request, the holder's spare count, the copies and deck the ask names. */
export type LeadAsk = { id: string; spare: number; copies: number; deckName: string | null; daysLeft: number };

export type HomeFeed =
  /** `alsoOn`: a default-on kind is on already (the reader never chose), so the offer is for what ELSE shows. */
  | { chosen: false; offer: FeedKind[]; alsoOn: boolean }
  | { chosen: true; on: FeedKind[]; items: FeedView[]; unseen: number; lead: FeedView | null };

/** One card from each new set: a mythic, then a rare, then the lowest collector number, with an image. */
export function setCardsQuery(codes: readonly string[]) {
  return sql`select distinct on (sp.set_code) sp.set_code as code, ss.card_count as size,
      sc.oracle_id as oracle_id, sc.name as name, sc.color_identity as identity,
      coalesce(sp.image_uri, sc.image_uri) as image, coalesce(sp.art_crop_uri, sc.art_crop_uri) as art
    from ${printings} sp
    join ${cards} sc on sc.oracle_id = sp.oracle_id
    join ${sets} ss on ss.code = sp.set_code
    where sp.set_code = any(${sql.param([...codes])}::text[]) and coalesce(sp.image_uri, sc.image_uri) is not null
    order by sp.set_code,
      case coalesce(sp.rarity, sc.rarity) when 'mythic' then 0 when 'rare' then 1 else 2 end,
      sp.collector_number`;
}

/** Each new precon's commander (its first, by position), drawn from the precon's own printing where it names one. */
export function preconCommandersQuery(files: readonly string[]) {
  return sql`select distinct on (pc.file_name) pc.file_name as file_name,
      pcc.oracle_id as oracle_id, pcc.name as name, pcc.color_identity as identity,
      coalesce(pcp.image_uri, pcc.image_uri) as image, coalesce(pcp.art_crop_uri, pcc.art_crop_uri) as art
    from ${preconCards} pc
    join ${cards} pcc on pcc.oracle_id = pc.oracle_id
    left join ${printings} pcp on pcp.scryfall_id = pc.scryfall_id
    where pc.file_name = any(${sql.param([...files])}::text[]) and pc.is_commander
    order by pc.file_name, pc.position`;
}

/**
 * How many of each new precon's cards the reader owns, of its total. A card is capped ONCE at its copies the precon
 * needs in all: `precon_cards` keeps a row per printing and commander status, so two rows of five Plains need ten
 * between them, and the reader's three count three, not six. The total also counts the copies the ingest could not map
 * to a card (`precons.unmapped_count`): the deck is that big, though the reader can own none of those.
 */
export function preconOwnedQuery(userId: string, files: readonly string[]) {
  return sql`select pn.file_name as file_name, (sum(pn.need) + max(pr.unmapped_count))::int as total,
      sum(least(pn.need, coalesce(oc.n, 0)))::int as owned
    from (select po.file_name as file_name, po.oracle_id as oracle_id, sum(po.quantity) as need
          from ${preconCards} po
          where po.file_name = any(${sql.param([...files])}::text[])
          group by po.file_name, po.oracle_id) pn
    join ${precons} pr on pr.file_name = pn.file_name
    left join (select oci.oracle_id as oracle_id, sum(oci.quantity) as n from ${collectionItems} oci
               where oci.user_id = ${userId} group by oci.oracle_id) oc on oc.oracle_id = pn.oracle_id
    group by pn.file_name`;
}

/** The stored kinds' cards, by oracle id. */
export function feedCardsQuery(ids: readonly string[]) {
  return sql`select fc.oracle_id as oracle_id, fc.name as name, fc.color_identity as identity, fc.image_uri as image, fc.art_crop_uri as art
    from ${cards} fc where fc.oracle_id = any(${sql.param([...ids])}::uuid[])`;
}

type CardRow = { oracle_id: string; name: string; identity: string[] | null; image: string | null; art: string | null };
const toCard = (r: CardRow): FeedCard => ({ oracleId: r.oracle_id, name: r.name, image: r.image, art: r.art, colorIdentity: r.identity ?? null });

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

type Pieces = { cards?: { oracleId?: unknown; name?: unknown }[]; added?: unknown[] };

/** A combo's two pieces and the added one, from the writer's own `data`, or null when it is not that shape. */
export function comboPieces(data: Record<string, unknown>): { pieces: [string, string]; added: string; first: string } | null {
  const d = data as Pieces;
  const list = Array.isArray(d.cards) ? d.cards : [];
  if (list.length !== 2) return null;
  const [a, b] = list;
  if (typeof a.name !== "string" || typeof b.name !== "string" || typeof a.oracleId !== "string") return null;
  const addedId = Array.isArray(d.added) ? d.added[0] : undefined;
  const added = list.find((c) => c.oracleId === addedId)?.name;
  return { pieces: [a.name, b.name], added: typeof added === "string" ? added : a.name, first: a.oracleId };
}

/** The view of every item, given what the catalog lookups found. Pure, so the tests need no database. */
export function toViews(
  items: readonly FeedItem[],
  found: {
    sets: Map<string, FeedCard & { size: number | null }>;
    precons: Map<string, FeedCard>;
    owned: Map<string, { owned: number; of: number }>;
    cards: Map<string, FeedCard>;
  },
): FeedView[] {
  return items.map((item): FeedView => {
    const base = {
      key: item.key,
      kind: item.kind,
      at: item.createdAt.toISOString(),
      unseen: item.unseen,
      friend: null,
      href: null,
      opens: null,
      name: null,
      setSize: null,
      owned: null,
      drop: null,
      combo: null,
    } satisfies Omit<FeedView, "card">;
    if (item.kind === "new-set") {
      const s = found.sets.get(item.code) ?? null;
      return { ...base, card: s && { oracleId: s.oracleId, name: s.name, image: s.image, art: s.art, colorIdentity: s.colorIdentity }, href: item.href, name: item.name, setSize: s?.size ?? null };
    }
    if (item.kind === "new-precon") {
      return { ...base, card: found.precons.get(item.fileName) ?? null, href: item.href, name: item.name, owned: found.owned.get(item.fileName) ?? null };
    }
    const card = item.oracleId ? found.cards.get(item.oracleId) ?? null : null;
    const friend = item.friend;
    switch (item.kind) {
      case "price-drop": {
        const from = num(item.data.fromCents);
        const to = num(item.data.toCents);
        return { ...base, card, opens: item.oracleId, drop: from !== null && to !== null ? { fromCents: from, toCents: to } : null };
      }
      case "trade-match":
        return { ...base, card, friend, href: friend ? `/friends/${encodeURIComponent(friend.publicId)}` : null };
      case "combo": {
        const c = comboPieces(item.data);
        return { ...base, card, opens: c?.first ?? item.oracleId, combo: c && { pieces: c.pieces, added: c.added } };
      }
      case "spare-request":
        return { ...base, card, friend };
    }
  });
}

/**
 * The catalog lookups for these items, each skipped when nothing asks for it. A stored kind's card is drawn down the
 * chain card details uses (\`chainArt\`: the reader's own printing, else the one details opens on), so its hover preview
 * and its press show one picture; the catalog's representative stays where the chain has none.
 */
export async function lookups(userId: string, items: readonly FeedItem[], q: Executor, env: NodeJS.ProcessEnv) {
  const codes = items.flatMap((i) => (i.kind === "new-set" ? [i.code] : []));
  const files = items.flatMap((i) => (i.kind === "new-precon" ? [i.fileName] : []));
  const ids = [
    ...new Set(
      items.flatMap((i) => {
        if (i.kind === "new-set" || i.kind === "new-precon") return [];
        // A combo's row draws its mark, but as the lead story it is drawn with the piece the reader's write added.
        return i.oracleId ? [i.oracleId] : [];
      }),
    ),
  ];
  const run = <R extends Record<string, unknown>>(query: SQL, when: boolean) => (when ? q.execute<R>(query).then((r) => r.rows as R[]) : Promise.resolve([] as R[]));
  const [setRows, preconRows, ownedRows, cardRows, art] = await Promise.all([
    run<CardRow & { code: string; size: number | null }>(setCardsQuery(codes), codes.length > 0),
    run<CardRow & { file_name: string }>(preconCommandersQuery(files), files.length > 0),
    run<{ file_name: string; total: number; owned: number }>(preconOwnedQuery(userId, files), files.length > 0),
    run<CardRow>(feedCardsQuery(ids), ids.length > 0),
    chainArt(userId, null, ids, env),
  ]);
  return {
    sets: new Map(setRows.map((r) => [r.code, { ...toCard(r), size: r.size === null ? null : Number(r.size) }])),
    precons: new Map(preconRows.map((r) => [r.file_name, toCard(r)])),
    owned: new Map(ownedRows.map((r) => [r.file_name, { owned: Number(r.owned), of: Number(r.total) }])),
    cards: new Map(cardRows.map((r) => [r.oracle_id, { ...toCard(r), image: art.get(r.oracle_id) ?? r.image }])),
  };
}

/**
 * Home's What's new for this reader, or null with the feed off. The lead story is the first unseen item by
 * `LEAD_PRIORITY` (`leadStory`), and it leaves the list it heads.
 */
export async function loadHomeFeed(userId: string, env: NodeJS.ProcessEnv, now: Date, q: Executor & Pick<typeof db, "select"> = db): Promise<HomeFeed | null> {
  if (!homeFeedEnabled(env)) return null;
  const available = availableFeedKinds(env);
  const prefs = await readFeedPrefs(userId, q);
  const effective = effectiveKinds(prefs);
  const on = available.filter((k) => effective.includes(k));
  if (on.length === 0) return { chosen: false, offer: available, alsoOn: false };
  const items = await loadFeed(userId, env, now, q);
  // A reader who never chose keeps the offer until a default-on kind has something to show (an incoming ask). The
  // offer leaves out the default-on kinds already on: its boxes start empty and it saves only what it offers, so an
  // unticked default would read as turned off.
  const choseNothing = Object.keys(prefs.map).length === 0 && prefs.declined.length === 0;
  const offer = available.filter((k) => !on.includes(k));
  if (choseNothing && items.length === 0 && offer.length > 0) return { chosen: false, offer, alsoOn: true };
  const views = toViews(items, await lookups(userId, items, q, env));
  const feed = splitLead(views, on);
  // Only a spare request that leads is answered on Home; its ask is read only then. The ask waits on the friend's
  // side whatever the feed shows, so the match is by card and asker: one open ask per asker and card (the index).
  if (feed.chosen && feed.lead?.kind === "spare-request") return withLeadAsk(feed, await loadIncomingAsks(userId, env, now, q));
  return feed;
}

/** The lead with its ask attached, when one of `asks` is the lead's (its card and its asker). Pure, for the tests. */
export function withLeadAsk(feed: HomeFeed, asks: readonly IncomingAsk[]): HomeFeed {
  if (!feed.chosen || feed.lead?.kind !== "spare-request" || !feed.lead.card || !feed.lead.friend) return feed;
  const { card, friend } = feed.lead;
  const ask = asks.find((a) => a.oracleId === card.oracleId && a.asker.publicId === friend.publicId);
  if (!ask) return feed;
  return { ...feed, lead: { ...feed.lead, ask: { id: ask.id, spare: ask.spare, copies: ask.copies, deckName: ask.deckName, daysLeft: ask.daysLeft } } };
}

/** The lead out of the list, by the shared rule; the head's count is every unseen item, the lead's included. */
export function splitLead(views: FeedView[], on: FeedKind[]): HomeFeed {
  const lead = leadStory(views.map((v) => ({ ...v, createdAt: new Date(v.at) })));
  const leadView = lead ? views.find((v) => v.key === lead.key) ?? null : null;
  return {
    chosen: true,
    on,
    lead: leadView,
    items: leadView ? views.filter((v) => v.key !== leadView.key) : views,
    unseen: views.filter((v) => v.unseen).length,
  };
}

/**
 * The Home visit's writes, for `after()`, with the clock the page rendered at: an item that arrives after the render
 * stays unseen. Each write fails alone and quietly; nothing on the page was drawn from either.
 */
export function homeFeedAfter(userId: string, env: NodeJS.ProcessEnv, now: Date): () => Promise<void> {
  return async () => {
    if (!homeFeedEnabled(env)) return;
    try {
      await markFeedSeen(userId, env, now);
    } catch (error) {
      // not a fallback: the cursor stays where it was, so the items read as unseen once more next visit.
      console.error("home: the feed's seen write failed", error instanceof Error ? error.message : "");
    }
    try {
      await noticeTradeMatches(userId, env);
    } catch (error) {
      // not a fallback: the next visit notices again; the dedupe key makes that idempotent.
      console.error("home: the trade-match notice failed", error instanceof Error ? error.message : "");
    }
  };
}
