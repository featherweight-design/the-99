"use client";

// LastSlotsStrip — the last-31 fill controls, sitting between the provenance
// line and the fill-failed banner in the builder.
//
// Two controls: A fills from the player's collection, B tops up with cards to
// buy. Both are absent when they have nothing to place (Rule 1). During either
// write the other goes disabled rather than unmounting — the player needs to
// see it to know their options haven't disappeared (Rule 2). The strip itself
// unmounts as a unit at 0 open slots (Rule 3).
//
// §7.6: when A settles below 99, a shortfall line is shown in the provenance
// shape — accented, never warning, because the shortfall is honest, not
// alarming.

import { useState } from "react";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { fillLastSlotsOwned, fillLastSlotsUnowned } from "../../app/decks/actions";
import { MutationError } from "./mutation-error";
import { GhostButton } from "../ui/button";

// The strip accepts `width` to match the provenance-line convention — it lets
// the caller decide which responsive variant to mount, the same way
// provenance-line.tsx is mounted twice under md:hidden / hidden md:block.
// Interactive controls (A and B) are single elements with responsive classes,
// never duplicated subtrees, per Rule §responsive-split.
type Width = "phone" | "desktop";

export interface LastSlotsStripProps {
  deckId: string;
  /** 99 minus the current built count from the optimistic card list. */
  openSlots: number;
  /** Owned synergy cards that planLastSlots would place — derived once by the
      page route and passed down so the control face matches the action's plan. */
  ownedCandidates: number;
  /** Unowned synergy cards planLastSlots would add on top of owned ones. */
  unownedCandidates: number;
  /** Short commander name, already computed in builder-shell.tsx via
      shortCommanderName. Needed only for the owned note beside control A. */
  commanderShortName: string;
  /** Writes one message per settle to the live region in builder-shell.tsx. */
  onAnnounce: (message: string) => void;
  width: Width;
}

// ── Shortfall line (§7.6) ──────────────────────────────────────────────────
// Rendered inside the strip when A settles below 99. Provenance shape: inline
// styles matching provenance-line.tsx (:79-84) so that the border-left inline
// style is preserved and the test's toHaveStyle assertion passes.
// Border-radius and padding use responsive Tailwind classes so this component
// can be mounted once (not twice under md:hidden / hidden md:block).

interface ShortfallLineProps {
  total: string;
  shortfall: string;
}

function ShortfallLine({ total, shortfall }: ShortfallLineProps) {
  return (
    <div
      data-testid="last-slots-shortfall"
      className="flex items-start gap-[9px] mx-[16px] mt-[10px] mb-[2px] md:mx-[30px] rounded-[8px] md:rounded-[9px] px-[12px] py-[9px] md:px-[15px] md:py-[11px]"
      style={{
        background: "var(--surface-sunken)",
        border: "1px solid var(--border)",
        borderLeftWidth: "3px",
        borderLeftStyle: "solid",
        borderLeftColor: "var(--accent)",
      }}
    >
      {/* ⓘ disc — desktop only, matching provenance-line.tsx treatment. Drops at
          phone where the accent bar already anchors the note visually. */}
      <div
        className="hidden md:flex flex-none items-center justify-center rounded-full font-display font-bold text-[12px]"
        aria-hidden
        style={{
          width: 20,
          height: 20,
          border: "1.5px solid var(--accent)",
          color: "var(--accent)",
        }}
      >
        i
      </div>
      <p className="flex-1 font-mono text-[12.5px] leading-[1.5]" style={{ color: "var(--fg-body)" }}>
        {synergyCopy.lastSlots.short(total, shortfall)}
      </p>
    </div>
  );
}

// ── LastSlotsStrip ─────────────────────────────────────────────────────────

export function LastSlotsStrip(props: LastSlotsStripProps) {
  // Rule 3: unmount as a unit at 0 open slots.
  if (props.openSlots <= 0) return null;

  // `props.width` is accepted in the interface so callers can declare the
  // breakpoint they are rendering at — the test suite does this. The runtime
  // never reads it: every width-dependent element inside the strip uses
  // responsive Tailwind classes, so a single DOM mount is correct at both
  // phone and desktop without any prop-driven branching.
  return (
    <LastSlotsStripInner
      deckId={props.deckId}
      openSlots={props.openSlots}
      ownedCandidates={props.ownedCandidates}
      unownedCandidates={props.unownedCandidates}
      commanderShortName={props.commanderShortName}
      onAnnounce={props.onAnnounce}
    />
  );
}

// A narrower type for the inner component. `width` is part of the exported
// LastSlotsStripProps so callers can declare the breakpoint they are rendering
// at (the test suite does this). The inner component does not read it: every
// width-dependent element uses responsive Tailwind classes so the strip renders
// correctly in a single DOM mount without any prop-driven branching.
type InnerProps = Omit<LastSlotsStripProps, "width">;

// The inner component holds state. Separated from the outer so that `if
// (openSlots <= 0) return null` is a pure guard with no hook calls above it —
// React rules require hooks to run unconditionally, so the guard cannot live
// in the same component as the state that follows it.
function LastSlotsStripInner({
  deckId,
  openSlots,
  ownedCandidates,
  unownedCandidates,
  commanderShortName,
  onAnnounce,
}: InnerProps) {
  // Which write is in flight. Null when idle.
  const [inflight, setInflight] = useState<"owned" | "unowned" | null>(null);

  // Error state is per-control: a refusal from A must not disable B (Rule 5).
  const [ownedError, setOwnedError] = useState<string | null>(null);
  const [unownedError, setUnownedError] = useState<string | null>(null);

  // §7.6: settled state from A. Kept so the shortfall line survives re-renders.
  const [settled, setSettled] = useState<{ total: string; shortfall: string } | null>(null);

  // Rule 4: A states what it can place, never the gap.
  const ownedPlaces = Math.min(openSlots, ownedCandidates);

  async function runOwned() {
    setInflight("owned");
    setOwnedError(null);
    const result = await fillLastSlotsOwned(deckId);
    setInflight(null);
    if (!result.ok) {
      setOwnedError(result.message);
      return;
    }
    const total = String(result.total);
    const shortfall = String(result.shortfall);
    if (result.shortfall > 0) {
      setSettled({ total, shortfall });
      onAnnounce(synergyCopy.lastSlots.shortAnnounce(String(result.added), total, shortfall));
    } else {
      onAnnounce(synergyCopy.lastSlots.filledAnnounce(String(result.added), total));
    }
  }

  async function runUnowned() {
    setInflight("unowned");
    setUnownedError(null);
    const result = await fillLastSlotsUnowned(deckId);
    setInflight(null);
    if (!result.ok) {
      setUnownedError(result.message);
      return;
    }
    onAnnounce(
      synergyCopy.lastSlots.boughtAnnounce(
        String(result.added),
        String(result.total),
        String(result.bought),
      ),
    );
  }

  const busy = inflight !== null;

  return (
    <div
      className="mx-[16px] mt-[10px] mb-[10px] md:mx-[30px] md:mt-[12px] rounded-[10px] px-[16px] py-[14px]"
      style={{
        background: "var(--surface-rail)",
        border: "1px solid var(--border-strong)",
      }}
    >
      {/* Heading — mono 10.5px accent uppercase, letter-spacing .14em */}
      <p
        className="font-mono uppercase mb-[6px]"
        style={{ fontSize: "10.5px", letterSpacing: ".14em", color: "var(--accent)" }}
      >
        {synergyCopy.lastSlots.heading(String(openSlots))}
      </p>

      {/* Caption — responsive: desktop gets the long form, phone the short. One
          element with responsive classes, not two hidden subtrees. */}
      <p
        className="font-mono mb-[12px]"
        style={{ fontSize: "10.5px", color: "var(--fg-faint)" }}
      >
        <span className="hidden md:inline">{synergyCopy.lastSlots.caption(String(openSlots))}</span>
        <span className="md:hidden">{synergyCopy.lastSlots.captionMobile(String(openSlots))}</span>
      </p>

      {/* Controls row: owned note beside A and B */}
      <div className="flex flex-col md:flex-row md:flex-wrap gap-[10px] md:items-center">
        {/* Control A — owned fill. Absent at 0 owned candidates (Rule 1). In
            flight: border softens to --accent-shadow, label colour to --fg-faint.
            All state-dependent values are Tailwind arbitrary classes so hover
            utilities (inherited by future refactors) cannot be silently killed
            by an inline style override. */}
        {ownedCandidates > 0 && (
          <div className="flex flex-col">
            <button
              type="button"
              onClick={runOwned}
              disabled={busy}
              aria-label={synergyCopy.lastSlots.fillOwnedAria(String(ownedPlaces))}
              className={[
                "w-full md:w-auto min-h-[44px] md:min-h-0",
                "rounded-[8px] px-[16px] py-[10px]",
                "font-sans font-semibold text-[13px]",
                "bg-transparent cursor-pointer",
                "disabled:opacity-50 disabled:cursor-default",
                inflight === "owned"
                  ? "[border:1px_solid_var(--accent-shadow)] [color:var(--fg-faint)]"
                  : "[border:1px_solid_var(--accent)] [color:var(--accent)]",
              ].join(" ")}
            >
              {inflight === "owned"
                ? recommendationsCopy.fill.fillingRows(String(ownedPlaces))
                : synergyCopy.lastSlots.fillOwned(String(ownedPlaces))}
            </button>
            {ownedError && <MutationError message={ownedError} />}
          </div>
        )}

        {/* Control B — buying top-up. Absent at 0 unowned candidates (Rule 1).
            Disabled while either write is in flight (Rule 2). */}
        {unownedCandidates > 0 && (
          <div className="flex flex-col">
            <GhostButton
              onClick={runUnowned}
              disabled={busy}
              aria-label={synergyCopy.lastSlots.topUpAria(String(openSlots))}
              className="w-full md:w-auto min-h-[44px] md:min-h-0 rounded-[8px] px-[16px] py-[10px] text-[13px]"
            >
              {synergyCopy.lastSlots.topUp}
              {/* Count in mono warning — on the button's face, after the label */}
              {" "}
              <span className="font-mono text-[11px]" style={{ color: "var(--warning)" }}>
                {unownedCandidates}
              </span>
            </GhostButton>
            {unownedError && <MutationError message={unownedError} />}
          </div>
        )}

        {/* Owned note — explains the number when A is present. Mono --fg-locked.
            Sits beside the controls so neither control has to carry the
            explanation in its own label. */}
        {ownedCandidates > 0 && (
          <p
            className="font-mono md:ml-[4px]"
            style={{ fontSize: "10.5px", color: "var(--fg-locked)" }}
          >
            {synergyCopy.lastSlots.ownedNote(String(ownedCandidates), commanderShortName)}
          </p>
        )}
      </div>

      {/* §7.6 shortfall line — rendered below the controls when A settled below
          99, and B sits directly beneath it. The shape matches provenance-line
          so the accent border-left reads as informational, not alarming. */}
      {settled && (
        <ShortfallLine total={settled.total} shortfall={settled.shortfall} />
      )}
    </div>
  );
}
