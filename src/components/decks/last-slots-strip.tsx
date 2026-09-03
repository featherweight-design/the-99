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
}

// ── Shortfall line (§7.6) ──────────────────────────────────────────────────
// Rendered inside the strip when A settles below 99. Takes the provenance shape
// from provenance-line.tsx (:79-84): surface-sunken background, 1px --border,
// 3px --accent left border — accent rather than warning because a shortfall is
// honest, not alarming. Border-left is set via inline styles (same as
// provenance-line.tsx) so jsdom can inspect the individual longhand properties.
// Border-radius and padding use responsive Tailwind classes so the component
// is mounted once without a width-prop branch.

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
  // Rule 3: unmount as a unit at 0 open slots. The guard lives in the outer
  // component so that the stateful inner component never calls hooks
  // conditionally — React requires hooks to run unconditionally.
  if (props.openSlots <= 0) return null;
  return <LastSlotsStripInner {...props} />;
}

// The inner component holds all state. Separated from the outer guard above so
// that `if (openSlots <= 0) return null` can appear before any useState calls —
// React's rules of hooks forbid a conditional return inside a component that
// also calls hooks.
type InnerProps = LastSlotsStripProps;

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

      {/* Control A row — owned fill plus its owned note. Both absent when there
          are no owned candidates (Rule 1). Flex row at desktop so the note sits
          beside the button without wrapping onto a second line. */}
      {ownedCandidates > 0 && (
        <div className="flex flex-col md:flex-row md:flex-wrap gap-[10px] md:items-center mb-[10px]">
          {/* Control A — owned fill. In flight: border softens to --accent-shadow,
              label colour to --fg-faint. State-dependent values are Tailwind
              arbitrary classes so hover utilities cannot be silently killed by an
              inline style override. */}
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

          {/* Owned note — explains the number beside A. Mono --fg-locked. Sits
              beside the button so neither control has to carry the explanation
              in its own label. */}
          <p
            className="font-mono md:ml-[4px]"
            style={{ fontSize: "10.5px", color: "var(--fg-locked)" }}
          >
            {synergyCopy.lastSlots.ownedNote(String(ownedCandidates), commanderShortName)}
          </p>
        </div>
      )}

      {/* §7.6 shortfall line — rendered when A settled below 99. The brief
          requires B to sit directly beneath it, so the shortfall line is placed
          between control A and control B in the DOM. */}
      {settled && (
        <ShortfallLine total={settled.total} shortfall={settled.shortfall} />
      )}

      {/* Control B — buying top-up. Absent at 0 unowned candidates (Rule 1).
          Disabled while either write is in flight (Rule 2). Rendered after the
          shortfall line so it sits directly beneath it once A has settled. */}
      {unownedCandidates > 0 && (
        <div className="flex flex-col mt-[10px]">
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
    </div>
  );
}
