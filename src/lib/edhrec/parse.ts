export type EdhrecData = {
  topCards: string[];
  inclusionByName: Record<string, number>;
  // How much more this commander's decks run a card than decks generally.
  // Read defensively: the field is absent from some payloads, and an absent key
  // must stay absent rather than becoming 0 — a 0 draws a real bar for no data.
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
      // Prefer explicit inclusion (already a %), else derive from num_decks / potential_decks.
      const key = card.name.toLowerCase();
      if (typeof card.inclusion === "number") {
        inclusionByName[key] = Math.round(card.inclusion * 10) / 10;
      } else if (
        typeof card.num_decks === "number" &&
        typeof card.potential_decks === "number" &&
        card.potential_decks > 0
      ) {
        inclusionByName[key] = Math.round((card.num_decks / card.potential_decks) * 1000) / 10;
      }
      if (typeof card.synergy === "number") synergyByName[key] = card.synergy;
    }
  }
  return { topCards: [...seen], inclusionByName, synergyByName };
}
