import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { isLandFace } from "../cards/facet";
import { readLabels } from "../labels/read";
import type { Job, RampKind } from "../labels/types";
import { sourceProduces, type ManaColor } from "../mana/supply";

/** The non-land mana sources of a deck, each with the colors it can add. A card absent from the record
 *  is not a source (or was added after load); one present with no colors is a source whose color the
 *  text does not give. */
export type SourceManaByCard = Readonly<Record<string, readonly ManaColor[]>>;

/** The ramp kinds that leave a lasting source. A cost reducer, an extra land drop, a doubler and a burst
 *  of mana make none (labels-everywhere plan, "Switch the Colors ramp"). */
const SOURCE_KINDS: ReadonlySet<RampKind> = new Set(["tapsForMana", "fetchesLand", "makesTreasure"]);

/**
 * Which cards are sources comes from the labels: a fresh label with a `ramp` job of a source kind. A
 * card with no fresh label falls back to the classifier's ramp role (`kind` null), so it always draws
 * something; a card WITH a fresh label and no ramp job is not a source, whatever the classifier says.
 */
function sourceKind(jobs: readonly Job[] | undefined, role: string | null): RampKind | null | false {
  if (!jobs) return role === "ramp" ? null : false;
  const ramp = jobs.find((j) => j.kind === "ramp");
  if (!ramp) return false;
  const kind = (ramp as { rampKind?: RampKind | null }).rampKind ?? null;
  if (kind === null) return null;
  return SOURCE_KINDS.has(kind) ? kind : false;
}

/** Null when the text read failed: the card then draws land sources alone rather than state that no
 *  rock exists. A failed LABEL read is not a failure here, because the classifier is the fallback. */
export async function loadSourceMana(
  deckCards: readonly { oracleId: string; typeLine: string; role: string | null }[],
  deckColors: readonly string[],
): Promise<SourceManaByCard | null> {
  const nonland = deckCards.filter((c) => !isLandFace(c.typeLine));
  if (nonland.length === 0) return {};
  const labels = await readLabels(nonland.map((c) => c.oracleId)).catch(() => new Map<string, Job[]>());
  const kinds = new Map<string, RampKind | null>();
  for (const c of nonland) {
    const kind = sourceKind(labels.get(c.oracleId), c.role);
    if (kind !== false) kinds.set(c.oracleId, kind);
  }
  if (kinds.size === 0) return {};
  try {
    const rows = await db
      .select({ oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine, oracleText: cards.oracleText })
      .from(cards)
      .where(inArray(cards.oracleId, [...kinds.keys()]));
    return Object.fromEntries(rows.map((r) => [r.oracleId, sourceProduces(r, kinds.get(r.oracleId) ?? null, deckColors)]));
  } catch {
    return null;
  }
}
