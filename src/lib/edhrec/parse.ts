export type EdhrecData = {
  topCards: string[];
  inclusionByName: Record<string, number>;
  // How much more this commander's decks run a card than decks generally.
  // The map itself is always present; a card whose upstream `synergy` is missing
  // or non-numeric is simply left out of it, rather than entered as 0 — a 0
  // draws a real bar for no data.
  synergyByName: Record<string, number>;
};

export function parseEdhrecPayload(payload: unknown): EdhrecData {
  const cardlists = (
    payload as { container?: { json_dict?: { cardlists?: unknown } } } | null
  )?.container?.json_dict?.cardlists;
  if (!Array.isArray(cardlists)) return { topCards: [], inclusionByName: {}, synergyByName: {} };

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
  return { topCards: [...seen], inclusionByName, synergyByName };
}
