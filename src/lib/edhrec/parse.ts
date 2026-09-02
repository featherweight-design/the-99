export type EdhrecTag = { slug: string; label: string; count: number };

export type EdhrecData = {
  topCards: string[];
  inclusionByName: Record<string, number>;
  // How much more this commander's decks run a card than decks generally.
  // The map itself is always present; a card whose upstream `synergy` is missing
  // or non-numeric is simply left out of it, rather than entered as 0 — a 0
  // draws a real bar for no data.
  synergyByName: Record<string, number>;
  tags: EdhrecTag[];
  bracketCounts: Record<string, number>;
  budgetCounts: Record<string, number>;
  similarNames: string[];
  // null, never 0: a rank of 0 would read as the most popular commander in the game.
  deckCount: number | null;
  rank: number | null;
  saltScore: number | null;
};

const finiteOrNull = (v: unknown): number | null => (Number.isFinite(v) ? (v as number) : null);

/**
 * `tag_counts` and `panels.taglinks` carry the same records (both verified against
 * the live Gisa payload on 2026-08-29). Read one, fall back to the other, never
 * merge — merging would double every count.
 */
function readTags(payload: unknown): EdhrecTag[] {
  const p = payload as { tag_counts?: unknown; panels?: { taglinks?: unknown } } | null;
  const raw = Array.isArray(p?.tag_counts)
    ? p.tag_counts
    : Array.isArray(p?.panels?.taglinks)
      ? p.panels.taglinks
      : [];
  const tags: EdhrecTag[] = [];
  for (const t of raw as { slug?: unknown; value?: unknown; count?: unknown }[]) {
    if (typeof t?.slug !== "string" || !Number.isFinite(t?.count)) continue;
    tags.push({
      slug: t.slug,
      label: typeof t.value === "string" ? t.value : t.slug,
      count: t.count as number,
    });
  }
  return tags.sort((a, b) => b.count - a.count);
}

/** Keeps only finite numeric values — an upstream null must not become a 0 bar. */
function readCounts(v: unknown): Record<string, number> {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(v)) if (Number.isFinite(n)) out[k] = n as number;
  return out;
}

export function parseEdhrecPayload(payload: unknown): EdhrecData {
  const p = payload as {
    container?: { json_dict?: { cardlists?: unknown; card?: Record<string, unknown> } };
    bracket_counts?: unknown; budget_counts?: unknown; similar?: unknown;
  } | null;
  const card = p?.container?.json_dict?.card;
  const wide = {
    tags: readTags(payload),
    bracketCounts: readCounts(p?.bracket_counts),
    budgetCounts: readCounts(p?.budget_counts),
    similarNames: Array.isArray(p?.similar)
      ? p.similar.filter((n): n is string => typeof n === "string")
      : [],
    deckCount: finiteOrNull(card?.num_decks),
    rank: finiteOrNull(card?.rank),
    saltScore: finiteOrNull(card?.salt),
  };

  const cardlists = p?.container?.json_dict?.cardlists;
  if (!Array.isArray(cardlists)) {
    return { topCards: [], inclusionByName: {}, synergyByName: {}, ...wide };
  }

  const seen = new Set<string>();
  const inclusionByName: Record<string, number> = {};
  const synergyByName: Record<string, number> = {};
  for (const list of cardlists) {
    const cardviews = Array.isArray(list?.cardviews) ? list.cardviews : [];
    for (const card of cardviews) {
      if (typeof card?.name !== "string") continue;
      seen.add(card.name);
      // Every numeric read below tests finiteness, not just `typeof`: NaN and
      // Infinity are both `"number"`, and either one reaching a tile renders as
      // a bar of nonsense rather than the honest omission a missing key gives.
      // Prefer explicit inclusion (already a %), else derive from num_decks / potential_decks.
      const key = card.name.toLowerCase();
      if (Number.isFinite(card.inclusion)) {
        inclusionByName[key] = Math.round(card.inclusion * 10) / 10;
      } else if (
        Number.isFinite(card.num_decks) &&
        Number.isFinite(card.potential_decks) &&
        card.potential_decks > 0
      ) {
        inclusionByName[key] = Math.round((card.num_decks / card.potential_decks) * 1000) / 10;
      }
      if (Number.isFinite(card.synergy)) synergyByName[key] = card.synergy;
    }
  }
  return { topCards: [...seen], inclusionByName, synergyByName, ...wide };
}
