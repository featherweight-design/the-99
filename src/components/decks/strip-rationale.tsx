// Strip rationale disclosure — §Role Counter Strip (#184).
//
// One disclosure for the whole strip, where there were five per-cell buttons.
// Five separate expansions each pushing the strip taller became one panel that
// answers the whole strip at once, which is how a player reads it anyway.
//
// Four lines for five roles: Removal and Wipes share line 3, as drawn. The
// bodies are quoted copy; the bold headings are composed from the deck's own `mix`
// so the panel can never quote a target the cell above it disagrees with.
"use client";

import { useId, useRef, useState } from "react";
import { type MixRole, type RecommendedMix } from "../../lib/decks/mix";
import { addPanelCopy } from "../../lib/copy/decks-builder";

const LINES: { key: keyof typeof addPanelCopy.strip.rationaleBodies; roles: MixRole[] }[] = [
  { key: "ramp", roles: ["ramp"] },
  { key: "draw", roles: ["draw"] },
  { key: "removalWipes", roles: ["removal", "wipes"] },
  { key: "land", roles: ["land"] },
];

const heading = (roles: MixRole[], mix: RecommendedMix) =>
  roles
    .map((role) => {
      const cell = mix.cells[role];
      return `${cell.label} ${cell.advisory ? "~" : ""}${cell.target}`;
    })
    .join(" · ");

export function StripRationale({ mix }: { mix: RecommendedMix }) {
  const [open, setOpen] = useState(false);
  // Per instance, not per module: two strips on one page would otherwise share
  // an id, and `aria-describedby` resolves to whichever element the document
  // reached first rather than to this trigger's own sentence.
  const panelId = useId();
  const descriptionId = `${panelId}-description`;
  const triggerRef = useRef<HTMLButtonElement>(null);

  /*
    One tree for both states, rather than an early return per state.

    The two states are drawn differently — a bare row when closed, a header
    inside the panel box when open — but they were also two different subtrees,
    so React unmounted the trigger on every toggle and the keyboard user's focus
    fell to `document.body` the instant they opened the thing. Same element, same
    position, classes doing the drawing.

    §Rationale panel, open: bg --surface-sunken, border 1px --border,
    border-left 3px --accent, br 9px, p 11px 13px, mt 10px, internal gap 7px.
    §Rationale disclosure trigger, closed: own row, mt 12px.
  */
  return (
    <div
      className={
        open
          ? "mt-[10px] rounded-[9px] px-[13px] py-[11px] bg-surface-sunken border border-border border-l-[3px] border-l-accent"
          : "mt-[12px]"
      }
    >
      <div className="flex items-baseline justify-between gap-[10px]">
        {/* The authored sentence describes rather than names. As an `aria-label`
            it replaced the drawn text, so the accessible name held none of the
            words on screen — WCAG 2.5.3, and a voice-control user asking for
            "Why these numbers" would not have reached it.

            It does not follow the panel open: it reads "Show why each role has
            the target it has", which is a lie once the panel is showing, and
            the panel below is the answer it was offering. */}
        <span id={descriptionId} className="sr-only">
          {addPanelCopy.strip.rationaleToggleAria}
        </span>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          aria-expanded={open}
          aria-describedby={open ? undefined : descriptionId}
          aria-controls={open ? panelId : undefined}
          className={
            open
              ? "font-mono text-[11px] text-accent cursor-pointer"
              : "font-mono text-[11px] text-accent border-b border-b-accent-shadow border-accent-shadow pb-[1px] cursor-pointer"
          }
        >
          {addPanelCopy.strip.rationaleToggle}
        </button>
        {/* §Rationale panel — the drawn close, beside the title.

            Hide unmounts itself, so focus has to be handed somewhere on the way
            out or it lands on `document.body`. The trigger is where the user
            came from and is the only control still on screen afterwards. */}
        {open && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
            className="font-mono text-[11px] text-fg-faint hover:text-fg-body cursor-pointer transition-colors"
          >
            {addPanelCopy.strip.rationaleClose}
          </button>
        )}
      </div>

      {/* §Rationale panel — lines */}
      {open && (
        <div
          id={panelId}
          role="region"
          aria-label={addPanelCopy.strip.rationaleToggle}
          className="flex flex-col gap-[7px] mt-[9px]"
        >
          {LINES.map((line) => (
            <p key={line.key} className="text-[12px] leading-[1.55] text-fg-body">
              <b className="font-semibold text-fg">{heading(line.roles, mix)}</b>{" "}
              {addPanelCopy.strip.rationaleBodies[line.key]}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
