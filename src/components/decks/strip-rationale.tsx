// Strip rationale disclosure — §Role Counter Strip (#184).
//
// One disclosure for the whole strip, where there were five per-cell buttons.
// Five separate expansions each pushing the strip taller became one panel that
// answers the whole strip at once, which is how a player reads it anyway.
//
// Four lines for five roles: Removal and Wipes share line 3, as drawn. The
// bodies are quoted copy; the bold headings are composed from RECOMMENDED_MIX
// so the panel can never quote a target the cell above it disagrees with.
"use client";

import { useId, useState } from "react";
import { RECOMMENDED_MIX, type MixRole } from "../../lib/decks/mix";
import { addPanelCopy } from "../../lib/copy/decks-builder";

const LINES: { key: keyof typeof addPanelCopy.strip.rationaleBodies; roles: MixRole[] }[] = [
  { key: "ramp", roles: ["ramp"] },
  { key: "draw", roles: ["draw"] },
  { key: "removalWipes", roles: ["removal", "wipes"] },
  { key: "land", roles: ["land"] },
];

const heading = (roles: MixRole[]) =>
  roles
    .map((role) => {
      const mix = RECOMMENDED_MIX[role];
      return `${mix.label} ${mix.advisory ? "~" : ""}${mix.target}`;
    })
    .join(" · ");

export function StripRationale() {
  const [open, setOpen] = useState(false);
  // Per instance, not per module: two strips on one page would otherwise share
  // an id, and `aria-describedby` resolves to whichever element the document
  // reached first rather than to this trigger's own sentence.
  const panelId = useId();
  const descriptionId = `${panelId}-description`;

  if (!open) {
    /* §Rationale disclosure trigger — own row, mt 12px */
    return (
      <div className="flex items-center gap-[14px] mt-[12px]">
        {/* The authored sentence describes rather than names. As an `aria-label`
            it replaced the drawn text, so the accessible name held none of the
            words on screen — WCAG 2.5.3, and a voice-control user asking for
            "Why these numbers" would not have reached it. */}
        <span id={descriptionId} className="sr-only">
          {addPanelCopy.strip.rationaleToggleAria}
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          aria-describedby={descriptionId}
          className="font-mono text-[11px] text-brass border-b border-brass-shadow pb-[1px] cursor-pointer"
        >
          {addPanelCopy.strip.rationaleToggle}
        </button>
      </div>
    );
  }

  /*
    §Rationale panel
    bg --surface-sunken, border 1px --border, border-left 3px --brass,
    br 9px, p 11px 13px, mt 10px, internal gap 7px
  */
  return (
    <div className="mt-[10px] rounded-[9px] px-[13px] py-[11px] bg-surface-sunken border border-border border-l-[3px] border-l-brass">
      {/* §Rationale panel — header. The title is the same control as the closed
          trigger, so `aria-expanded` stays observable while the panel is open;
          `Hide` is the drawn close beside it.

          The authored sentence does not follow it open: it reads "Show why each
          role has the target it has", which is a lie once the panel is showing,
          and the panel below is the answer it was offering. */}
      <div className="flex items-baseline justify-between gap-[10px]">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-expanded
          aria-controls={panelId}
          className="font-mono text-[11px] text-brass cursor-pointer"
        >
          {addPanelCopy.strip.rationaleToggle}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="font-mono text-[11px] text-fg-faint hover:text-fg-body cursor-pointer"
        >
          {addPanelCopy.strip.rationaleClose}
        </button>
      </div>

      {/* §Rationale panel — lines */}
      <div
        id={panelId}
        role="region"
        aria-label={addPanelCopy.strip.rationaleToggle}
        className="flex flex-col gap-[7px] mt-[9px]"
      >
        {LINES.map((line) => (
          <p key={line.key} className="text-[12px] leading-[1.55] text-fg-body">
            <b className="font-semibold text-fg">{heading(line.roles)}</b>{" "}
            {addPanelCopy.strip.rationaleBodies[line.key]}
          </p>
        ))}
      </div>
    </div>
  );
}
