import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { isLandFace } from "../cards/facet";
import type { Job, RampKind } from "../labels/types";
import { makesNoManaSource, sourceProduces, type ManaColor } from "../mana/supply";

/** The non-land mana sources of a deck, each with the colors it can add. A card absent from the record
 *  is not a source (or was added after load); one present with no colors is a source whose color the
 *  text does not give. */
export type SourceManaByCard = Readonly<Record<string, readonly ManaColor[]>>;

/** The ramp kinds that leave a lasting source. A cost reducer, an extra land drop, a doubler and a burst
 *  of mana make none, and neither does a Treasure maker: its mana is one-shot, and the mana addendum's
 *  counting table says "ritual, Treasure: not a source" (orchestrator ruling, 2026-10-10). */
const SOURCE_KINDS: ReadonlySet<RampKind> = new Set(["tapsForMana", "fetchesLand"]);

/**
 * Which cards are sources comes from the labels: a fresh label with a `ramp` job of a source kind. A
 * card with no fresh label falls back to the classifier's ramp role (`kind` null), so it always draws
 * something; a card WITH a fresh label is a source only by its own ramp job's kind, whatever the
 * classifier says, and a ramp job with no kind is not one.
 */
function sourceKind(jobs: readonly Job[] | undefined, role: string | null): RampKind | null | false {
  if (!jobs) return role === "ramp" ? null : false;
  const kind = (jobs.find((j) => j.kind === "ramp") as { rampKind?: RampKind | null } | undefined)?.rampKind ?? null;
  return kind !== null && SOURCE_KINDS.has(kind) ? kind : false;
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
    const out: Record<string, readonly ManaColor[]> = {};
    for (const r of rows) {
      const colors = sourceProduces(r, kinds.get(r.oracleId) ?? null, deckColors);
      // Landcyclers, token makers and top-of-library effects are no source at all, rather than an unreadable one.
      if (colors.length === 0 && makesNoManaSource(r)) continue;
      out[r.oracleId] = colors;
    }
    return out;
  } catch {
    return null;
  }
}
