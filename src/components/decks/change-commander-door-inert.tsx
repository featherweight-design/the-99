// The change-commander door's inert face, for the deck loading skeleton. It lives apart from the real door because
// `change-commander-door.tsx` imports the sheet and its copy, and the loading skeleton ships in every page's startup graph
// (`scripts/lib/client-graph.test.mts` keeps the deck tools' copy out of Home and /decks). Keep it light: no sheet, no deck-tuning copy.
import { deckHeaderCopy } from "../../lib/copy/decks-builder";
import { changeCommanderCopy as copy } from "../../lib/copy/change-commander";
import { SwapGlyph } from "./change-commander-glyph";

export const PLATE =
  "pointer-events-none absolute rounded-[7px] border border-[color:var(--border-strong)] bg-[color:var(--bg)]";

export type Width = "desktop" | "mobile";

/**
 * The door's face with nothing behind it, for the deck's loading skeleton: the same plate, halves and geometry `ChangeCommanderDoor`
 * draws inside the provider, as inert shapes (not focusable, not named), so the corner controls are where they will be when the
 * page lands. Keep this beside the real door: a change to either one's boxes is a change to both.
 */
export function InertChangeCommanderDoor({ width, hasCrop, pair }: { width: Width; hasCrop: boolean; pair: boolean }) {
  const glyph = <span style={{ color: "var(--fg)", fontSize: 14, lineHeight: 1 }}>⛶</span>;
  if (width === "desktop") {
    return (
      <div aria-hidden="true" data-inert-door className="absolute z-[2] flex items-center" style={{ left: 16, bottom: 14 - 9, height: 44 }}>
        <span className={PLATE} style={{ left: 0, right: 0, top: 9, bottom: 9 }} />
        {hasCrop ? (<>
          <span className="relative flex h-[44px] items-center font-mono whitespace-nowrap text-[color:var(--fg)]" style={{ gap: 6, padding: "0 9px", fontSize: 11 }}>
            {glyph}
            <span style={{ lineHeight: 1 }}>{deckHeaderCopy.cardDetails}</span>
          </span>
          <span aria-hidden="true" className="relative" style={{ width: 1, height: 26, background: "var(--border-strong)" }} />
        </>) : null}
        <span className="relative flex h-[44px] items-center font-mono whitespace-nowrap text-[color:var(--fg)]" style={{ gap: 6, padding: "0 9px", fontSize: 11 }}>
          <SwapGlyph />
          <span style={{ lineHeight: 1 }}>{pair ? copy.door.pair : copy.door.single}</span>
        </span>
      </div>
    );
  }
  if (!hasCrop) {
    return (
      <div aria-hidden="true" data-inert-door className="absolute z-[2]" style={{ right: 16 - 9, bottom: 14 - 9, width: 44, height: 44 }}>
        <span className={PLATE} style={{ left: 9, right: 9, top: 9, bottom: 9 }} />
        <span className="absolute inset-0 flex items-center justify-center text-[color:var(--fg)]"><SwapGlyph /></span>
      </div>
    );
  }
  const half = 53 / 2;
  const overhang = 44 - half;
  return (
    <div aria-hidden="true" data-inert-door className="absolute z-[2]" style={{ right: 16 - 9, bottom: 23, width: 44, height: 53 }}>
      <span className={PLATE} style={{ left: 9, right: 9, top: 0, bottom: 0 }} />
      <span aria-hidden="true" className="absolute" style={{ left: 9, right: 9, top: half, height: 1, background: "var(--border-strong)" }} />
      <span className="absolute flex items-center justify-center text-[color:var(--fg)]" style={{ left: 0, width: 44, top: half - 44, height: 44, paddingTop: overhang }}>
        <SwapGlyph />
      </span>
      <span className="absolute flex items-center justify-center" style={{ left: 0, width: 44, top: half, height: 44, paddingBottom: overhang }}>
        {glyph}
      </span>
    </div>
  );
}
