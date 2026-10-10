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

/** The cuts that are a swap: a removed card with an unused add that fills one of its roles. A card
 *  with no classified role pairs with nothing, so it is never counted a swap on that account. */
export function pairedSwaps(
  cut: readonly string[],
  added: readonly string[],
  rolesOf: ReadonlyMap<string, ReadonlySet<string>>,
): Set<string> {
  const free = new Set(added);
  const paired = new Set<string>();
  for (const id of cut) {
    const mine = rolesOf.get(id);
    if (!mine || mine.size === 0) continue;
    const mate = [...free].find((a) => [...(rolesOf.get(a) ?? [])].some((r) => mine.has(r)));
    if (mate) { free.delete(mate); paired.add(id); }
  }
  return paired;
}
