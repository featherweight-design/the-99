// Explicit shape (kept in sync with the cards table) rather than a schema
// import: pure lib code stays free of DB imports per the global constraints.
export type CardRow = {
  oracleId: string; scryfallId: string; name: string; manaCost: string | null;
  cmc: number; colorIdentity: string[]; typeLine: string; oracleText: string | null;
  keywords: string[]; commanderLegal: boolean; imageUri: string | null; rarity: string;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Scryfall bulk JSON is untyped by design; toCardRow narrows it.
export type ScryfallCard = Record<string, any>;

const SKIP_LAYOUTS = new Set(["token", "double_faced_token", "emblem", "art_series"]);

export function toCardRow(raw: ScryfallCard): CardRow | null {
  if (!raw.oracle_id || SKIP_LAYOUTS.has(raw.layout)) return null;
  const faces = raw.card_faces as ScryfallCard[] | undefined;
  const oracleText =
    raw.oracle_text ??
    (faces ? faces.map((f) => f.oracle_text ?? "").join("\n//\n") : null);
  const imageUri =
    raw.image_uris?.normal ?? faces?.find((f) => f.image_uris?.normal)?.image_uris.normal ?? null;
  return {
    oracleId: raw.oracle_id,
    scryfallId: raw.id,
    name: raw.name,
    manaCost: raw.mana_cost ?? null,
    cmc: raw.cmc ?? 0,
    colorIdentity: raw.color_identity ?? [],
    typeLine: raw.type_line ?? "",
    oracleText,
    keywords: raw.keywords ?? [],
    commanderLegal: raw.legalities?.commander === "legal",
    imageUri,
    rarity: raw.rarity ?? "unknown",
  };
}
