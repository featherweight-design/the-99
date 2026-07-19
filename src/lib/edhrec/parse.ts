export type EdhrecData = { topCards: string[]; inclusionByName: Record<string, number> };

export function parseEdhrecPayload(payload: unknown): EdhrecData {
  const cardlists = (
    payload as { container?: { json_dict?: { cardlists?: unknown } } } | null
  )?.container?.json_dict?.cardlists;
  if (!Array.isArray(cardlists)) return { topCards: [], inclusionByName: {} };

  const seen = new Set<string>();
  const inclusionByName: Record<string, number> = {};
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
    }
  }
  return { topCards: [...seen], inclusionByName };
}
