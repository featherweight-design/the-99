import { identityGradient } from "../../lib/cards/gradients";
import { publicPagesCopy } from "../../lib/copy/public-pages";
import type { PublicCommander } from "../../lib/public/commander";
import { cutAtWord } from "../../lib/public/preview";
import { commanderFigures } from "./commander-preview";
import { INK, Lockup, OG_SIZE } from "./og-card-image";

/** Where the image's sentence is cut: four lines at its size and width. */
const SENTENCE_MAX = 200;

export type OgCommanderInput = Pick<PublicCommander, "name" | "typeLine" | "colorIdentity" | "artCropUri" | "state" | "prose" | "rank" | "deckCount">;

/**
 * The commander page's link-preview image (C2, README call 8): 1200x630, the board's 600x315 doubled, drawn by `next/og` as
 * the card's is (`og-card-image.tsx`: the default theme's literal colours, `display: flex` on every box with children). The
 * art crop full bleed under a left-to-right shade, then the kicker, the name, the sentence and the two figures, and the
 * lockup bottom left; with no art crop (or `pictured: false`, the route's fallback when Scryfall does not answer) the
 * ground is the identity gradient.
 *
 * The sentence is the prose. A commander with none (no sentence yet, absent or degraded) draws its type line there, the
 * description's own fallback for absent and degraded; the figures line is left off when both figures are blank.
 */
export function OgCommanderImage({ commander, pictured = commander.artCropUri !== null }: { commander: OgCommanderInput; pictured?: boolean }) {
  const name = commander.name.split(" // ")[0];
  const sentence = cutAtWord(commander.prose ?? commander.typeLine, SENTENCE_MAX);
  const figures = commanderFigures(commander);
  return (
    <div style={{ ...OG_SIZE, display: "flex", position: "relative", overflow: "hidden", background: INK.bg, fontFamily: "Sans" }}>
      {pictured && commander.artCropUri ? (
        // eslint-disable-next-line @next/next/no-img-element -- drawn into a PNG by `next/og`, never served as a page.
        <img
          src={commander.artCropUri}
          alt=""
          width={OG_SIZE.width}
          height={OG_SIZE.height}
          style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", backgroundImage: identityGradient(commander.colorIdentity) }} />
      )}
      <div
        style={{
          position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
          backgroundImage: "linear-gradient(90deg, rgba(20,17,14,.92) 0%, rgba(20,17,14,.8) 48%, rgba(20,17,14,.15) 100%)",
        }}
      />
      <div style={{ position: "absolute", left: 72, top: 68, width: 660, display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", fontFamily: "Mono", fontSize: 20, letterSpacing: "0.3em", textTransform: "uppercase", color: INK.accent }}>
          {publicPagesCopy.linkPreview.ogCommanderKicker}
        </div>
        <div style={{ display: "flex", fontFamily: "Display", fontWeight: 700, fontSize: 54, lineHeight: 1.1, color: INK.fg }}>{name}</div>
        <div style={{ display: "flex", fontSize: 27, lineHeight: 1.5, color: INK["fg-body"] }}>{sentence}</div>
        {figures ? <div style={{ display: "flex", fontFamily: "Mono", fontSize: 23, color: INK["fg-muted"] }}>{figures}</div> : null}
      </div>
      <Lockup at={{ left: 72, bottom: 44 }} />
    </div>
  );
}
