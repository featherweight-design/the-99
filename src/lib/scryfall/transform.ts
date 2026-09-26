import { isGameCard } from "../cards/game-card";

// Explicit shape (kept in sync with the cards table) rather than a schema
// import: pure lib code stays free of DB imports per the global constraints.
export type CardRow = {
  oracleId: string; scryfallId: string; name: string; manaCost: string | null;
  cmc: number; colorIdentity: string[]; typeLine: string; oracleText: string | null;
  keywords: string[]; commanderLegal: boolean; imageUri: string | null;
  artCropUri: string | null; rarity: string;
  layout: string; backImageUri: string | null;
  gameChanger: boolean;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Scryfall bulk JSON is untyped by design; toCardRow narrows it.
export type ScryfallCard = Record<string, any>;

export function toCardRow(raw: ScryfallCard): CardRow | null {
  // Not a card (`isGameCard`): tokens and emblems, and the theme fronts, planes, schemes, avatars,
  // `Card` objects and sticker sheets the catalog used to take in. Skipped for NEW rows only; a
  // row already in `cards` stays, because deleting it could cascade into a player's collection.
  if (!raw.oracle_id) return null;
  if (!isGameCard({ layout: raw.layout ?? null, typeLine: raw.type_line ?? null })) return null;
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
    // Scryfall omits the top-level `mana_cost` on the two-sided layouts and
    // prints the cost on each face instead, so a transform card stored from the
    // top level alone has no cost and the decklist row draws no pips. Split and
    // adventure cards carry theirs joined at the top level (`{1}{R} // {1}{U}`),
    // so asking the faces only when the top level is empty keeps this from
    // having to name the layouts — the same trick as `backImageUri` below.
    manaCost: raw.mana_cost || joinedFaceCost(faces) || null,
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
    // WotC's Game Changers list, republished by Scryfall as a boolean on the card object and
    // refreshed by the weekly catalog job — so the list maintains itself and is never
    // transcribed into this repository. A transcribed copy of live data goes stale silently,
    // and the failure mode is a deck slotted into a bracket it has outgrown.
    //
    // `=== true` rather than a truthy read: the bulk is untyped, and anything absent or
    // non-boolean must read false. That under-claims — a Game Changer reading false loses a
    // mark, where a truthy read on some future string value would invent one.
    gameChanger: raw.game_changer === true,
  };
}

/**
 * A two-sided card's faces, joined the way Scryfall joins the layouts that print
 * two costs on one side.
 *
 * A modal DFC's back face is castable and printed with its own cost — Birgi, God
 * of Storytelling turns to Harnfel, Horn of Bounty at `{4}{R}` — and storing the
 * front alone left that cost nowhere in the app. Joining them means every reader
 * is already right: a row takes `frontFaceCost`, which is the face that row
 * shows, and the card modal takes `faceCosts`, which draws both halves with a
 * `//` between them. Neither needed changing, and no column was added.
 *
 * A `transform` back has no cost at all — Delver of Secrets turns to Insectile
 * Aberration for free — and there the join is skipped rather than storing a
 * trailing separator. `faceCosts` would drop the empty half anyway, but a stored
 * string is read by more things than this file can see.
 *
 * A front face with no cost keeps its empty half (`" // {3}{R}"`), so
 * `frontFaceCost` answers "" for it rather than borrowing the back's pips —
 * the shape `front-face-cost.test.ts` already pins.
 */
function joinedFaceCost(
  faces: { mana_cost?: string | null }[] | null | undefined,
): string | null {
  const front = faces?.[0]?.mana_cost ?? "";
  const back = faces?.[1]?.mana_cost ?? "";
  if (!front && !back) return null;
  return back ? `${front} // ${back}` : front;
}
