import { asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards, commanderSupport, commanderSupportCards } from "../../db/schema";
import type { EdhrecTag } from "../edhrec/parse";
import { isSuppressed } from "../prose/suppressed";
import { resolvePublicSlug } from "./resolve";
import { publicSlug } from "./slug";

/**
 * The public commander page's data (launch epic F3 groundwork). CATALOG ONLY: `cards`, `commander_support` and
 * `commander_support_cards`. None of the signed-in page's per-reader parts (score, gap line, owned art) exist here.
 * NOT WIRED to any route yet; see `card.ts`.
 *
 * `state` is the support read's own: `ok`, `absent` (EDHREC does not index it: a settled fact), or `degraded` (an outage: the
 * page says "not available right now"). Every support figure, and the prose, is null/empty unless the state is `ok`. That is a
 * DELIBERATE departure from the signed-in page, which shows a stored sentence whatever the state. An oracle id with no
 * `commander_support` row is not a commander here: `not-found`.
 */
export type PublicCommanderLink = { oracleId: string; name: string; slug: string; imageUri: string | null };
export type PublicSignatureCard = PublicCommanderLink & { inclusion: number | null; synergy: number | null };

export type PublicCommander = {
  oracleId: string;
  name: string;
  slug: string;
  manaCost: string | null;
  colorIdentity: string[];
  typeLine: string;
  oracleText: string | null;
  commanderLegal: boolean;
  imageUri: string | null;
  artCropUri: string | null;
  backImageUri: string | null;
  layout: string;
  state: "ok" | "absent" | "degraded";
  rank: number | null;
  deckCount: number | null;
  tags: EdhrecTag[];
  bracketCounts: Record<string, number>;
  budgetCounts: Record<string, number>;
  engine: string | null;
  /** The one accepted sentence, only while the read is `ok` and the commander is not suppressed. */
  prose: string | null;
  similar: PublicCommanderLink[];
  signature: PublicSignatureCard[];
};

export type PublicCommanderResult =
  | { kind: "ok"; commander: PublicCommander; canonicalSlug: string }
  | { kind: "not-found" }
  | { kind: "ambiguous" };

/** What a read needs: `db` itself, or the transaction it is run in. */
type Reader = Pick<typeof db, "select">;

export const SIGNATURE_LIMIT = 12;
export const SIMILAR_LIMIT = 12;

/** Exported so the order can be asserted from the rendered SQL: it mirrors the support list's (`inclusion desc nulls last, oracle_id`). */
export function signatureQuery(commanderOracleId: string, q: Reader = db) {
  return q.select({
    oracleId: cards.oracleId, name: cards.name, imageUri: cards.imageUri,
    inclusion: commanderSupportCards.inclusion, synergy: commanderSupportCards.synergy,
  }).from(commanderSupportCards)
    .innerJoin(cards, eq(cards.oracleId, commanderSupportCards.oracleId))
    .where(eq(commanderSupportCards.commanderOracleId, commanderOracleId))
    .orderBy(sql`${commanderSupportCards.inclusion} desc nulls last`, asc(commanderSupportCards.oracleId))
    .limit(SIGNATURE_LIMIT);
}

const link = (r: { oracleId: string; name: string; imageUri: string | null }): PublicCommanderLink =>
  ({ oracleId: r.oracleId, name: r.name, slug: publicSlug(r.name, r.oracleId), imageUri: r.imageUri });

type CardRow = typeof cards.$inferSelect;
type SupportRow = typeof commanderSupport.$inferSelect;
type LinkRow = { oracleId: string; name: string; imageUri: string | null };
type SignatureRow = LinkRow & { inclusion: number | null; synergy: number | null };

/** How many similar commanders are read: the first of EDHREC's own adjacency list, in its own order. */
export const similarIdsOf = (support: Pick<SupportRow, "synergyState" | "similarOracleIds">): string[] =>
  support.synergyState === "ok" ? support.similarOracleIds.slice(0, SIMILAR_LIMIT) : [];

/**
 * The page's commander from the rows read. Pure, so the state rule is tested without a database: every support figure and the
 * prose are blank unless the read is `ok`, and the prose is dropped for a suppressed commander.
 */
export function shapeCommander(card: CardRow, support: SupportRow, signature: readonly SignatureRow[], similar: readonly LinkRow[]): PublicCommander {
  const ok = support.synergyState === "ok";
  const order = new Map(similarIdsOf(support).map((id, i) => [id, i]));
  return {
    oracleId: card.oracleId, name: card.name, slug: publicSlug(card.name, card.oracleId),
    manaCost: card.manaCost, colorIdentity: card.colorIdentity, typeLine: card.typeLine, oracleText: card.oracleText,
    commanderLegal: card.commanderLegal, imageUri: card.imageUri, artCropUri: card.artCropUri,
    backImageUri: card.backImageUri, layout: card.layout, state: support.synergyState,
    rank: ok ? support.rank : null, deckCount: ok ? support.deckCount : null,
    tags: ok ? support.tags : [], bracketCounts: ok ? support.bracketCounts : {}, budgetCounts: ok ? support.budgetCounts : {},
    engine: ok ? support.engine : null,
    prose: ok && !isSuppressed(card.oracleId) ? support.prose : null,
    similar: ok ? [...similar].sort((a, b) => (order.get(a.oracleId) ?? order.size) - (order.get(b.oracleId) ?? order.size)).map(link) : [],
    signature: ok ? signature.map((r) => ({ ...link(r), inclusion: r.inclusion, synergy: r.synergy })) : [],
  };
}

export async function loadPublicCommander(slug: string): Promise<PublicCommanderResult> {
  const hit = await resolvePublicSlug(slug);
  if (hit.kind !== "ok") return hit;
  // ONE snapshot: the index publisher replaces a header and its dependent lists in one transaction, so reading the header and
  // the signature and similar cards as separate statements could return the old state with the new cards
  // (`src/lib/edhrec/support-read.ts` documents the same race). Repeatable read and NEVER `accessMode: "read only"`: a read-only
  // transaction on the pooled Neon connection poisons the next transaction taken from the pool (`cuts-read.ts`; `draft-state-snapshot.test.ts` fails on it).
  const read = await db.transaction(async (tx) => {
    const [row] = await tx.select({ card: cards, support: commanderSupport }).from(cards)
      .innerJoin(commanderSupport, eq(commanderSupport.commanderOracleId, cards.oracleId))
      .where(eq(cards.oracleId, hit.oracleId));
    if (!row) return null;
    const similarIds = similarIdsOf(row.support);
    const [signature, similar] = await Promise.all([
      row.support.synergyState === "ok" ? signatureQuery(row.card.oracleId, tx) : Promise.resolve([]),
      similarIds.length === 0
        ? Promise.resolve([])
        // Only commanders: a similar id that is a card with no support row would link to an address that answers not-found.
        : tx.select({ oracleId: cards.oracleId, name: cards.name, imageUri: cards.imageUri }).from(cards)
          .innerJoin(commanderSupport, eq(commanderSupport.commanderOracleId, cards.oracleId)).where(inArray(cards.oracleId, similarIds)),
    ]);
    return { ...row, signature, similar };
  }, { isolationLevel: "repeatable read" });
  if (!read) return { kind: "not-found" };
  const commander = shapeCommander(read.card, read.support, read.signature, read.similar);
  return { kind: "ok", commander, canonicalSlug: commander.slug };
}
