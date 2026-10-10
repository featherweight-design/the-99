import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { isLandFace } from "../cards/facet";
import type { Job, RampKind } from "../labels/types";
import { sourceKindsOf } from "../mana/source-kinds";
import { makesNoManaSource, sourceProduces, type ManaColor } from "../mana/supply";

/** The non-land mana sources of a deck, each with the colors it can add. A card absent from the record
 *  is not a source (or was added after load); one present with no colors is a source whose color the
 *  text does not give. */
export type SourceManaByCard = Readonly<Record<string, readonly ManaColor[]>>;

/**
 * Which cards are sources comes from the labels: a fresh label with a `ramp` job of a source kind. A
 * card with no fresh label falls back to the classifier's ramp role (an empty list of kinds, which
 * `sourceProduces` reads as "try both parsers"), so it always draws something; a card WITH a fresh label
 * is a source only by its own ramp jobs' kinds, whatever the classifier says. Null: not a source.
 */
function sourceKinds(jobs: readonly Job[] | undefined, role: string | null): RampKind[] | null {
  if (!jobs) return role === "ramp" ? [] : null;
  const kinds = sourceKindsOf(jobs);
  return kinds.length > 0 ? kinds : null;
}

/** Null when the text read failed: the card then stays a shell rather than state that no rock exists. A
 *  failed LABEL read (`allLabels` null) is not a failure here, because the classifier is the fallback. */
export async function loadSourceMana(
  deckCards: readonly { oracleId: string; typeLine: string; role: string | null }[],
  deckColors: readonly string[],
  allLabels: ReadonlyMap<string, Job[]> | null,
): Promise<SourceManaByCard | null> {
  const nonland = deckCards.filter((c) => !isLandFace(c.typeLine));
  if (nonland.length === 0) return {};
  const labels = allLabels ?? new Map<string, Job[]>();
  const kinds = new Map<string, RampKind[]>();
  for (const c of nonland) {
    const found = sourceKinds(labels.get(c.oracleId), c.role);
    if (found) kinds.set(c.oracleId, found);
  }
  if (kinds.size === 0) return {};
  try {
    const rows = await db
      .select({ oracleId: cards.oracleId, name: cards.name, typeLine: cards.typeLine, oracleText: cards.oracleText, layout: cards.layout })
      .from(cards)
      .where(inArray(cards.oracleId, [...kinds.keys()]));
    const out: Record<string, readonly ManaColor[]> = {};
    for (const r of rows) {
      const colors = sourceProduces(r, kinds.get(r.oracleId) ?? [], deckColors);
      // Landcyclers, token makers and top-of-library effects are no source at all, rather than an unreadable one.
      if (colors.length === 0 && makesNoManaSource(r)) continue;
      out[r.oracleId] = colors;
    }
    return out;
  } catch {
    return null;
  }
}
