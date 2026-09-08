import { cssUrl } from "../../lib/collection/browse";
import { commanderGradient } from "../../lib/collection/gradients";

const bg = (pct: number) => `color-mix(in oklab, var(--bg) ${pct}%, transparent)`;

/** L3. Heavy where the labels are, thin through the middle third. The fourth
    stop is what lets the status chip sit on art without its own plate. */
const SCRIM = `linear-gradient(180deg, ${bg(90)} 0%, ${bg(30)} 40%, ${bg(52)} 74%, ${bg(86)} 100%)`;

const COVER_ART_OPACITY = 0.58;

const PORTRAIT_RATIO = 1.37; // art_crop is 626×457

/** Keyed to the band, not to the row: `band` is the only input, so both the mask
    and the scrim travel with it at any row width. */
const portrait = (band: 148 | 72) => {
  const width = Math.round(band * PORTRAIT_RATIO); // 203 | 99
  const maskEnd = band === 148 ? 58 : 62; // a fraction of the art
  const stops =
    band === 148
      ? `${bg(30)} 0px, ${bg(26)} 118px, ${bg(78)} ${width}px, var(--bg) 264px`
      : `${bg(30)} 0px, ${bg(26)} 58px, ${bg(78)} ${width}px, var(--bg) 138px`;
  return {
    width,
    ambientOpacity: band === 148 ? 0.2 : 0.14,
    sharpOpacity: band === 148 ? 0.8 : 0.85,
    // Black is the opaque end of a mask's alpha, not a palette colour.
    mask: `linear-gradient(90deg, #000 0 ${maskEnd}%, transparent)`,
    scrim: `linear-gradient(90deg, ${stops})`,
  };
};

export type ArtWashProps =
  | { strategy: "cover"; band?: never; artCropUri: string | null; colorIdentity: string[] }
  | { strategy: "left-portrait"; band: 148 | 72; artCropUri: string | null; colorIdentity: string[] };

export function ArtWash(props: ArtWashProps) {
  const { artCropUri, colorIdentity } = props;
  // L1: the base plate, under the art, so a slow or missing image never flashes
  // light ground.
  if (props.strategy === "left-portrait") {
    const p = portrait(props.band);
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden bg-[color:var(--bg)]"
      >
        <div
          className="absolute inset-0"
          style={{
            opacity: artCropUri ? p.ambientOpacity : 1,
            background: artCropUri ? undefined : commanderGradient(colorIdentity),
            backgroundImage: artCropUri ? cssUrl(artCropUri) : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center top",
          }}
        />
        {artCropUri ? (
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${p.width}px`,
              opacity: p.sharpOpacity,
              backgroundImage: cssUrl(artCropUri),
              backgroundSize: "auto 100%",
              backgroundPosition: "left top",
              backgroundRepeat: "no-repeat",
              maskImage: p.mask,
              WebkitMaskImage: p.mask,
            }}
          />
        ) : null}
        <div className="absolute inset-0" style={{ background: p.scrim }} />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden bg-[color:var(--bg)]"
    >
      <div
        className="absolute inset-0"
        style={{
          opacity: artCropUri ? COVER_ART_OPACITY : 1,
          background: artCropUri ? undefined : commanderGradient(colorIdentity),
          backgroundImage: artCropUri ? cssUrl(artCropUri) : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center top",
        }}
      />
      <div className="absolute inset-0" style={{ background: SCRIM }} />
    </div>
  );
}
