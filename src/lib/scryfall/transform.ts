// Explicit shape (kept in sync with the cards table) rather than a schema
// import: pure lib code stays free of DB imports per the global constraints.
export type CardRow = {
  oracleId: string; scryfallId: string; name: string; manaCost: string | null;
  cmc: number; colorIdentity: string[]; typeLine: string; oracleText: string | null;
  keywords: string[]; commanderLegal: boolean; imageUri: string | null;
  artCropUri: string | null; rarity: string;
  layout: string; backImageUri: string | null;
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
  // The frame-free 626×457 crop. `imageUri` carries Magic's own printed name and
  // type line, which collide with our labels wherever art sits behind text.
  const artCropUri =
    raw.image_uris?.art_crop ??
    faces?.find((f) => f.image_uris?.art_crop)?.image_uris.art_crop ??
    null;
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
    artCropUri,
    rarity: raw.rarity ?? "unknown",
    layout: raw.layout ?? "normal",
    // The second face's own art, which is what a flip has to swap to. Asking
    // the face for an image rather than asking the layout for a list of the
    // ones that have two: split, flip and adventure cards are also `card_faces`
    // arrays, and they carry a single image between them, so they answer null
    // here without this needing to know their names.
    backImageUri: faces?.[1]?.image_uris?.normal ?? null,
  };
}
