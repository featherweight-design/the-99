// The mix box's "Why these numbers?" disclosure (R3-Mix, R3-MixWhy). One button in the box foot opens one tile per
// role inside the box: an icon, the target, "you have N" and the role's rationale line. Removal and Wipes share the
// third tile, as drawn, so four tiles carry five roles. The name, target and count are composed from the deck's own
// mix and counts, so a tile can never quote a target the cell above it disagrees with.
//
// One button for both states: its label reads "Why these numbers?" closed and "Hide" open, and it keeps its place in
// the foot, so a keyboard user's focus is not dropped when the panel opens or closes.
"use client";

import { useId, useState } from "react";
import { type MixRole, type RecommendedMix } from "../../lib/decks/mix";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { TOUCH_HIT_INLINE } from "../ui/touch-hit";
import { DeckBoxFoot } from "./deck-box";

type TileKey = keyof typeof addPanelCopy.strip.rationaleTiles;

/** The drawn role icons (16-unit grid, 1.4 stroke). */
const ICONS: Record<TileKey, React.ReactNode> = {
  ramp: (
    <>
      <path d="M3 11.5 6.5 8l2.5 2.5L13 6" />
      <path d="M10 6h3v3" />
    </>
  ),
  draw: (
    <>
      <rect x="2.5" y="4" width="6.5" height="9" rx="1" />
      <path d="M6 4V3a1 1 0 0 1 1-1h5.5a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9" />
    </>
  ),
  removalWipes: (
    <>
      <circle cx="8" cy="8" r="5.5" />
      <circle cx="8" cy="8" r="2" />
      <path d="M8 1v2.5M8 12.5V15M1 8h2.5M12.5 8H15" />
    </>
  ),
  land: <path d="M1.5 13.5 6 6l3 4.5 2-3 3.5 6Z" />,
};

const TILES: { key: TileKey; roles: MixRole[] }[] = [
  { key: "ramp", roles: ["ramp"] },
  { key: "draw", roles: ["draw"] },
  { key: "removalWipes", roles: ["removal", "wipes"] },
  { key: "land", roles: ["land"] },
];

const joined = (parts: (string | number)[]) => parts.join(" · ");

export function StripRationale({ mix, counts }: { mix: RecommendedMix; counts: Record<MixRole, number> }) {
  const [open, setOpen] = useState(false);
  // Per instance, so two strips on one page never share an id.
  const panelId = useId();
  const descriptionId = `${panelId}-description`;

  return (
    <>
      {open && (
        <div
          id={panelId}
          role="region"
          aria-label={addPanelCopy.strip.rationaleToggle}
          className="grid grid-cols-1 gap-[10px] bg-[color:var(--surface-sunken)] p-[12px] [border-top:1px_solid_var(--border)] md:grid-cols-4 md:gap-[12px] md:px-[16px] md:pb-[16px] md:pt-[14px]"
        >
          {TILES.map(({ key, roles }) => {
            const targets = joined(roles.map((role) => mix.cells[role].target));
            const have = joined(roles.map((role) => counts[role]));
            return (
              <div
                key={key}
                data-mix-tile={key}
                className="grid grid-cols-[36px_minmax(0,1fr)] gap-x-[12px] gap-y-[4px] rounded-[10px] bg-[color:var(--surface)] p-[12px] [border:1px_solid_var(--border)] md:flex md:flex-col md:gap-[10px] md:px-[14px] md:pb-[14px] md:pt-[12px]"
              >
                <span
                  aria-hidden
                  className="row-span-2 flex size-[36px] flex-none items-center justify-center rounded-[8px] bg-[color:var(--elevated)] text-[color:var(--accent-text)] md:row-span-1"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {ICONS[key]}
                  </svg>
                </span>
                <div className="flex flex-wrap items-baseline gap-x-[8px] gap-y-[2px] whitespace-nowrap">
                  <b className="text-[14px] font-semibold text-[color:var(--fg)]">
                    {joined(roles.map((role) => mix.cells[role].label))}
                  </b>
                  <span className="font-mono text-[13px] font-medium text-[color:var(--fg)]">
                    {roles.length === 1 && mix.cells[roles[0]].advisory ? "~" : ""}
                    {targets}
                  </span>
                  <span
                    className="ml-auto font-mono text-[10.5px] font-medium text-[color:var(--fg-faint)]"
                  >
                    {addPanelCopy.strip.tileHave(have)}
                  </span>
                </div>
                <p className="col-start-2 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] md:col-start-auto">
                  {addPanelCopy.strip.rationaleTiles[key]}
                </p>
              </div>
            );
          })}
        </div>
      )}
      <DeckBoxFoot className="min-h-[44px] justify-center bg-[color:var(--surface-rail)]">
        {/* The authored sentence describes rather than names (WCAG 2.5.3): the accessible name keeps the drawn words.
            It does not follow the panel open, where it would read as a lie. */}
        <span id={descriptionId} className="sr-only">
          {addPanelCopy.strip.rationaleToggleAria}
        </span>
        <button
          type="button"
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          aria-expanded={open}
          aria-describedby={open ? undefined : descriptionId}
          aria-controls={open ? panelId : undefined}
          className={`${TOUCH_HIT_INLINE} self-start text-[12.5px] font-medium text-[color:var(--accent-text)] cursor-pointer`}
        >
          {open ? addPanelCopy.strip.rationaleClose : addPanelCopy.strip.rationaleToggle}
        </button>
      </DeckBoxFoot>
    </>
  );
}
