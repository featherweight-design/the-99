export type EdhrecData = { topCards: string[] };

export function parseEdhrecPayload(payload: unknown): EdhrecData {
  const cardlists = (
    payload as { container?: { json_dict?: { cardlists?: unknown } } } | null
  )?.container?.json_dict?.cardlists;
  if (!Array.isArray(cardlists)) return { topCards: [] };
  const seen = new Set<string>();
  for (const list of cardlists) {
    const cardviews = Array.isArray(list?.cardviews) ? list.cardviews : [];
    for (const card of cardviews) {
      if (typeof card?.name === "string") seen.add(card.name);
    }
  }
  return { topCards: [...seen] };
}
