/**
 * The ground truth for Proposed cuts evals: Hugh's own v1 to v2 cuts on five staging decks, each
 * rebuilt at its PRE-CUT size (v1 plus the cards v2 added), with the cards v2 dropped as the cuts
 * to find. Shared by the free-tier recall eval and the model tier's, so their numbers compare.
 * Read-only: `db` is the connection `connectStaging()` returns.
 */
import { and, eq } from "drizzle-orm";

import * as schema from "../../../src/db/schema";
import type { loadDeckProfileFromHead } from "../../../src/lib/profile/load";

export type Head = Parameters<typeof loadDeckProfileFromHead>[0];
type Db = Awaited<ReturnType<typeof import("./staging.mjs").connectStaging>>;

export const CUT_DECKS: { name: string; id: string }[] = [
  { name: "HD - Avatar Aang", id: "0f585441-203e-475b-be7c-f11e67e20d79" },
  { name: "HD Tune - Counter Intelligence", id: "2829cf41-1e07-4ec7-8353-8b0d9dfd678b" },
  { name: "HD Tune - Prismari Artistry", id: "1a352a97-00fc-4309-a60e-5d518d56d34f" },
  { name: "HD - Gods", id: "13a6dc28-958c-4591-a2bb-c0297bbe5d92" },
  { name: "HD - Wizards", id: "7653dec3-bcf4-4045-8242-9000765c7601" },
];
export const GISHATH_DECK = "904fdc61-e190-4ba5-8e34-2b18fa0584f2";

export type CutTruth = {
  name: string;
  deckId: string;
  /** v1 plus the cards v2 added: the oversize list Hugh chose from. */
  head: Head;
  /** Oracle ids v2 dropped. */
  cut: string[];
  /** Oracle ids v2 added. */
  added: string[];
};

async function versionCards(db: Db, deckId: string, number: number) {
  const [v] = await db.select().from(schema.deckVersions)
    .where(and(eq(schema.deckVersions.deckId, deckId), eq(schema.deckVersions.number, number)));
  if (!v) throw new Error(`deck ${deckId} has no version ${number}`);
  const rows = await db.select({ oracleId: schema.deckVersionCards.oracleId, quantity: schema.deckVersionCards.quantity })
    .from(schema.deckVersionCards).where(eq(schema.deckVersionCards.versionId, v.id));
  return { v, rows };
}

export async function loadCutTruth(db: Db): Promise<CutTruth[]> {
  const out: CutTruth[] = [];
  for (const d of CUT_DECKS) {
    const [v1, v2] = [await versionCards(db, d.id, 1), await versionCards(db, d.id, 2)];
    const [owner] = await db.select({ userId: schema.decks.userId }).from(schema.decks).where(eq(schema.decks.id, d.id));
    const in2 = new Set(v2.rows.map((r) => r.oracleId));
    const in1 = new Set(v1.rows.map((r) => r.oracleId));
    const added = v2.rows.filter((r) => !in1.has(r.oracleId));
    out.push({
      name: d.name,
      deckId: d.id,
      head: {
        deckId: d.id,
        userId: owner.userId,
        commanderOracleId: v2.v.commanderOracleId,
        partnerOracleId: v2.v.partnerOracleId,
        declaredBracket: v2.v.declaredBracket,
        cards: [...v1.rows, ...added],
      },
      cut: v1.rows.filter((r) => !in2.has(r.oracleId)).map((r) => r.oracleId),
      added: added.map((r) => r.oracleId),
    });
  }
  return out;
}

/** The cuts that are a swap: the largest set of removed cards that can each take a DIFFERENT added
 *  card filling one of their roles (maximum bipartite matching, so the count does not depend on the
 *  order the rows came back in). A card with no classified role pairs with nothing. */
export function pairedSwaps(
  cut: readonly string[],
  added: readonly string[],
  rolesOf: ReadonlyMap<string, ReadonlySet<string>>,
): Set<string> {
  const cuts = [...cut].sort();
  const adds = [...added].sort();
  const fits = (c: string, a: string) => [...(rolesOf.get(a) ?? [])].some((r) => rolesOf.get(c)?.has(r));
  const owner = new Map<string, string>();
  const place = (c: string, seen: Set<string>): boolean => {
    for (const a of adds) {
      if (seen.has(a) || !fits(c, a)) continue;
      seen.add(a);
      const held = owner.get(a);
      if (held === undefined || place(held, seen)) {
        owner.set(a, c);
        return true;
      }
    }
    return false;
  };
  for (const c of cuts) if ((rolesOf.get(c)?.size ?? 0) > 0) place(c, new Set());
  return new Set(owner.values());
}
