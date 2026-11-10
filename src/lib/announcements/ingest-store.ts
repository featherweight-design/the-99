/**
 * The database half of the Announcements ingest (`ingest.ts`): kept thin, every decision is made in the pure half.
 * Catalog family: one row per post, nothing per account. Reads `cards` read-only for name matching.
 */
import { and, eq, sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { cards, wizardsAnnouncementDecklists, wizardsAnnouncements } from "../../db/schema";
import { stampCatalogRefresh } from "../cache/stamp-catalog";
import { isGameCardWhere } from "../cards/game-card-where";
import type { AnnouncementFeedKind } from "../feed/kinds";
import type { IngestStore, KnownPost, ParseStatus, StoredDecklist } from "./ingest";

/** A sale column a re-read leaves alone unless it brings an hour or a new day (see `save`). */
const keepTime = (col: SQL) =>
  sql`case when excluded.on_sale_at is null and (excluded.on_sale_date is null or excluded.on_sale_date = wizards_announcements.on_sale_date) then wizards_announcements.${col} else excluded.${col} end`;

export const announcementsStore: IngestStore = {
  async readKnown(): Promise<KnownPost[]> {
    const rows = await db
      .select({
        url: wizardsAnnouncements.url,
        contentfulId: wizardsAnnouncements.contentfulId,
        title: wizardsAnnouncements.title,
        lastmod: wizardsAnnouncements.lastmod,
        kind: wizardsAnnouncements.kind,
        publishedAt: wizardsAnnouncements.publishedAt,
        parseStatus: wizardsAnnouncements.parseStatus,
        firstSeenAt: wizardsAnnouncements.firstSeenAt,
      })
      .from(wizardsAnnouncements);
    return rows.map((r) => ({
      ...r,
      kind: r.kind as AnnouncementFeedKind,
      parseStatus: r.parseStatus as ParseStatus,
      publishedAt: r.publishedAt.toISOString(),
      firstSeenAt: r.firstSeenAt.toISOString(),
    }));
  },

  async readCatalog() {
    return db
      .select({ oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine, oracleText: cards.oracleText })
      .from(cards)
      .where(isGameCardWhere());
  },

  async save(post, decklists) {
    const values = {
      ...post,
      publishedAt: new Date(post.publishedAt),
      lastFetchedAt: new Date(post.lastFetchedAt),
      onSaleAt: post.onSaleAt ? new Date(post.onSaleAt) : null,
      preQueueAt: post.preQueueAt ? new Date(post.preQueueAt) : null,
      firstSeenAt: new Date(post.firstSeenAt),
    };
    await db.transaction(async (tx) => {
      const [{ id }] = await tx
        .insert(wizardsAnnouncements)
        .values(values)
        .onConflictDoUpdate({
          target: wizardsAnnouncements.contentfulId,
          // `first_seen_at` and `baseline` are the first sighting's, never rewritten by a re-read.
          set: {
            url: values.url, slug: values.slug, title: values.title, excerpt: values.excerpt,
            heroImageUrl: values.heroImageUrl, publishedAt: values.publishedAt, kind: values.kind,
            lastmod: values.lastmod, lastFetchedAt: values.lastFetchedAt, promisedDecks: values.promisedDecks,
            parseStatus: values.parseStatus,
            // A re-read keeps what was stored when it finds no sale date, or the same date with no hour (an edit that
            // dropped the words, a changed layout); a changed date replaces the whole sale.
            onSaleDate: sql`coalesce(excluded.on_sale_date, wizards_announcements.on_sale_date)`,
            onSaleAt: keepTime(sql`on_sale_at`),
            onSaleZone: keepTime(sql`on_sale_zone`),
            preQueueAt: keepTime(sql`pre_queue_at`),
          },
        })
        .returning({ id: wizardsAnnouncements.id });
      await tx.delete(wizardsAnnouncementDecklists).where(eq(wizardsAnnouncementDecklists.announcementId, id));
      if (decklists.length > 0) {
        await tx.insert(wizardsAnnouncementDecklists).values(
          decklists.map((d) => ({ ...d, announcementId: id })),
        );
      }
    });
  },

  async readUnmatched(): Promise<StoredDecklist[]> {
    const t = wizardsAnnouncementDecklists;
    const rows = await db
      .select({
        announcementId: t.announcementId, position: t.position, title: t.title,
        commanderCardId: t.commanderCardId, commanderName: t.commanderName,
        partnerCardId: t.partnerCardId, partnerName: t.partnerName, partnerRole: t.partnerRole,
        commanderCandidate: t.commanderCandidate, cardCount: t.cardCount, cards: t.cards, unmatched: t.unmatched,
      })
      .from(t)
      .where(sql`cardinality(${t.unmatched}) > 0`);
    return rows.map((r) => ({ ...r, partnerRole: r.partnerRole as StoredDecklist["partnerRole"] }));
  },

  async saveMatches(decklists) {
    const t = wizardsAnnouncementDecklists;
    await db.transaction(async (tx) => {
      for (const d of decklists) {
        await tx
          .update(t)
          .set({
            commanderCardId: d.commanderCardId, partnerCardId: d.partnerCardId, partnerName: d.partnerName,
            partnerRole: d.partnerRole, cards: d.cards, unmatched: d.unmatched,
          })
          .where(and(eq(t.announcementId, d.announcementId), eq(t.position, d.position)));
      }
    });
  },

  async stampCatalog() {
    // Never throws: a failed stamp costs one hour's staleness, never the ingest (`stamp-catalog.ts`).
    await stampCatalogRefresh();
  },
};
