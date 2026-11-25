"use client";

// Collection quick filters (R2, option C): the strip of one-press chips. Desktop and tablet draw it inside the chassis chip
// row, phone in its own row under Filters / Sort (`layout`). A chip with no cards is not drawn unless it is pressed, so
// the reader can always take a press back; all-zero draws nothing and the row falls back to "No filters on".
import { CardFactMark } from "../cards/card-fact-mark";
import { noteAppScroll } from "../../lib/ui/reveal";
import { FitsGlyph } from "../cards/fits-glyph";
import { FoilMark } from "../cards/foil-mark";
import { quickFilterCopy } from "../../lib/copy/quick-filters";
import type { QuickCounts } from "../../lib/collection/quick-counts";
import type { QuickKey } from "../../lib/collection/quick-filters";
import type { CardFact } from "../../lib/copy/card-mark";

/** The pressed key: In no deck is `avail=free`, the rest ride `quick`. */
export type QuickPressed = "free" | QuickKey;

const ORDER: readonly QuickPressed[] = ["free", "gc", "tutor", "turns", "mld", "foil"];
// Design's order: In no deck, (Two-card combos, PR 4), Game changers, Tutors, Extra turns, Mass land denial, Foil.
const LABEL: Record<QuickPressed, string> = {
  free: quickFilterCopy.chips.free,
  gc: quickFilterCopy.chips.gameChanger,
  tutor: quickFilterCopy.chips.tutor,
  turns: quickFilterCopy.chips.extraTurns,
  mld: quickFilterCopy.chips.massLandDenial,
  foil: quickFilterCopy.chips.foil,
};
const FACT: Partial<Record<QuickPressed, CardFact>> = {
  gc: "gameChanger",
  tutor: "tutor",
  turns: "extraTurns",
  mld: "massLandDenial",
};

export const quickChipLabel = (key: QuickPressed): string => LABEL[key];

/** The chips the strip draws now: a count above zero, or the pressed one at any count. */
export function drawnQuickChips(counts: QuickCounts, pressed: QuickPressed | undefined): QuickPressed[] {
  return ORDER.filter((key) => counts[key] > 0 || key === pressed);
}

function Glyph({ id }: { id: QuickPressed }) {
  // The fact marks draw at 16 by rule; the chip holds them to 12 through its own box, so the shared mark is untouched.
  const fact = FACT[id];
  return (
    <span aria-hidden className="flex h-[12px] min-w-[12px] flex-none items-center justify-center [&>svg]:size-[12px]">
      {id === "free" ? <FitsGlyph /> : id === "foil" ? <FoilMark finish="foil" silent /> : fact ? <CardFactMark fact={fact} silent /> : null}
    </span>
  );
}

export function QuickFilterStrip({
  counts,
  pressed,
  onPress,
  layout,
}: {
  counts: QuickCounts;
  pressed: QuickPressed | undefined;
  onPress: (key: QuickPressed) => void;
  layout: "wide" | "phone";
}) {
  const drawn = drawnQuickChips(counts, pressed);
  if (drawn.length === 0) return null;
  const phone = layout === "phone";
  return (
    <div
      role="group"
      aria-label={quickFilterCopy.lead}
      data-quick-strip={layout}
      className={
        phone
          ? // The shelf's own trick (filter-bar.tsx): a 44px box with 6px given back, so the row costs 38px and keeps its hit area.
            "-mb-[6px] flex h-[44px] items-center gap-[6px] overflow-x-auto px-[16px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "flex flex-wrap items-center gap-[6px]"
      }
    >
      <span className="flex-none font-mono text-[11px] leading-[14px] text-[color:var(--fg-muted)]">{quickFilterCopy.lead}</span>
      {drawn.map((key) => {
        const on = key === pressed;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            aria-label={quickFilterCopy.chipAria(LABEL[key], counts[key], on)}
            data-quick-chip={key}
            onClick={() => onPress(key)}
            onFocus={(e) => {
              // The app's scroll, not the reader's (quick return).
              noteAppScroll();
              e.currentTarget.scrollIntoView?.({ inline: "nearest", block: "nearest" });
            }}
            className={[
              "relative flex flex-none cursor-pointer items-center border-0 bg-transparent p-0",
              phone ? "h-[44px]" : "after:absolute after:left-1/2 after:top-1/2 after:h-[44px] after:w-full after:min-w-[44px] after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
            ].join(" ")}
          >
            <span
              className={[
                "flex items-center gap-[5px] rounded-full border border-solid px-[8px] py-[2px] font-mono text-[11px] leading-[14px]",
                on
                  ? "border-[color:var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[color:var(--fg)]"
                  : "border-dashed border-[color:var(--border-dashed)] text-[color:var(--fg-muted)]",
              ].join(" ")}
            >
              <Glyph id={key} />
              <span aria-hidden>{LABEL[key]}</span>
              <span aria-hidden className={on ? "text-[color:var(--fg)]" : "text-[color:var(--fg-faint)]"}>
                {counts[key]}
              </span>
              {on && <span aria-hidden>{quickFilterCopy.pressedMark}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}
