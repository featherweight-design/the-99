// The row's art, shared by the owned scope's `RecCard` and discovery's row.
// Both draw the same two shapes from the same two fields, so they live here
// rather than being copied into the second row and left to drift.

import { commanderGradient } from "../../lib/collection/gradients";
import { WUBRG_COLOR, cssUrl } from "../../lib/collection/browse";

/** Image when available; the identity gradient is the fallback, matching
    grid-view, the card modal and the builder spine. */
function artStyle(imageUri: string | null, colorIdentity: string[]) {
  return {
    background: imageUri ? undefined : commanderGradient(colorIdentity),
    backgroundImage: imageUri ? cssUrl(imageUri) : undefined,
    backgroundSize: "cover",
    backgroundPosition: "center",
  } satisfies React.CSSProperties;
}

/** Mobile: 36×50 thumbnail in the tile's header row. */
export function CommanderThumb({
  imageUri,
  colorIdentity,
}: {
  imageUri: string | null;
  colorIdentity: string[];
}) {
  return (
    <div
      className="shrink-0 rounded-[6px]"
      style={{
        width: 36,
        height: 50,
        ...artStyle(imageUri, colorIdentity),
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.35)",
      }}
    />
  );
}

/** Desktop: the 63/88 tile in grid column 2, with the WUBRG identity pips. */
export function CommanderTile({
  imageUri,
  colorIdentity,
}: {
  imageUri: string | null;
  colorIdentity: string[];
}) {
  return (
    <div
      className="rounded-[8px] relative"
      style={{
        aspectRatio: "63/88",
        ...artStyle(imageUri, colorIdentity),
        boxShadow:
          "inset 0 -30px 34px -26px rgba(0,0,0,0.65), inset 0 0 0 1px rgba(0,0,0,0.28)",
      }}
    >
      {colorIdentity.length > 0 && (
        <div className="absolute flex gap-[3px]" style={{ left: 6, right: 6, bottom: 6 }}>
          {colorIdentity.map((color) => (
            <span
              key={color}
              className="block rounded-full shrink-0"
              style={{
                width: 11,
                height: 11,
                background: WUBRG_COLOR[color] ?? "var(--fg-faint)",
                boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
