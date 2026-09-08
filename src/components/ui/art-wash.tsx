import { cssUrl } from "../../lib/collection/browse";
import { commanderGradient } from "../../lib/collection/gradients";

const bg = (pct: number) => `color-mix(in oklab, var(--bg) ${pct}%, transparent)`;

/** L3. Heavy where the labels are, thin through the middle third. The fourth
    stop is what lets the status chip sit on art without its own plate. */
const SCRIM = `linear-gradient(180deg, ${bg(90)} 0%, ${bg(30)} 40%, ${bg(52)} 74%, ${bg(86)} 100%)`;

const COVER_ART_OPACITY = 0.58;

export type ArtWashProps =
  | { strategy: "cover"; band?: never; artCropUri: string | null; colorIdentity: string[] }
  | { strategy: "left-portrait"; band: 148 | 72; artCropUri: string | null; colorIdentity: string[] };

export function ArtWash(props: ArtWashProps) {
  const { artCropUri, colorIdentity } = props;
  // L1: the base plate, under the art, so a slow or missing image never flashes
  // light ground.
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
