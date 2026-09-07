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
  /** Called whenever the in-flight state changes. True = a write is running;
      false = the write settled. The shell uses this to disable control C while
      either fill is in flight (design table state 3 / state 8). */
  onInflight?: (inflight: boolean) => void;
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
      className="flex items-start gap-[9px] md:gap-[10px] mt-[10px] mb-[12px] rounded-[9px] px-[13px] py-[11px]"
      style={{
        background: "var(--surface-sunken)",
        border: "1px solid var(--border)",
        borderLeftWidth: "3px",
        borderLeftStyle: "solid",
        borderLeftColor: "var(--accent)",
      }}
    >
      {/* ⓘ disc — present at both widths per design table §ShortfallLine.
          18px mobile, 20px desktop. Border uses --accent-shadow, not --accent. */}
      <div
        className="flex flex-none items-center justify-center rounded-full font-mono text-[10px] md:text-[11px] w-[18px] h-[18px] md:w-[20px] md:h-[20px]"
        aria-hidden
        style={{
          border: "1px solid var(--accent-shadow)",
          color: "var(--accent)",
        }}
      >
        i
      </div>
      <p className="flex-1 font-mono text-[12.5px] leading-[1.6]" style={{ color: "var(--fg-body)" }}>
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
function LastSlotsStripInner({
  deckId,
  openSlots,
  ownedCandidates,
  unownedCandidates,
  commanderShortName,
  onAnnounce,
  onInflight,
}: LastSlotsStripProps) {
  // Which write is in flight. Null when idle.
  const [inflight, setInflight] = useState<"owned" | "unowned" | null>(null);

  // Error state is per-control: a refusal from A must not disable B (Rule 5).
  const [ownedError, setOwnedError] = useState<string | null>(null);
  const [unownedError, setUnownedError] = useState<string | null>(null);

  // §7.6: settled state from A. Kept so the shortfall line survives re-renders.
  const [settled, setSettled] = useState<{ total: string; shortfall: string } | null>(null);

  // Rule 4: A states what it can place, never the gap.
  const ownedPlaces = Math.min(openSlots, ownedCandidates);

  // Both runs clear the in-flight state in a `finally`. The actions catch their
  // own failures and answer `{ ok: false }`, but the call itself can still
  // reject before any of that runs — a dropped connection on the way out, a
  // transport error on the way back. Clearing only on the success path would
  // leave both controls disabled with nothing said and no way back but a reload.
  async function runOwned() {
    setInflight("owned");
    onInflight?.(true);
    setOwnedError(null);
    try {
      const result = await fillLastSlotsOwned(deckId);
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
        // The line is a receipt for one run, not a standing property of the
        // deck. A second run that reaches 99 would otherwise leave the earlier
        // "still N short" beneath a deck that is no longer short.
        setSettled(null);
        onAnnounce(synergyCopy.lastSlots.filledAnnounce(String(result.added), total));
      }
    } catch {
      // The same refusal copy the action returns: to the player a call that
      // never arrived and one that arrived and failed are the same event.
      setOwnedError(synergyCopy.lastSlots.fillFailed);
    } finally {
      setInflight(null);
      onInflight?.(false);
    }
  }

  async function runUnowned() {
    setInflight("unowned");
    onInflight?.(true);
    setUnownedError(null);
    // Clear any shortfall line from a prior A run: B is the way forward from
    // that state, and once B fires the A-settled numbers are stale.
    setSettled(null);
    try {
      const result = await fillLastSlotsUnowned(deckId);
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
    } catch {
      setUnownedError(synergyCopy.lastSlots.topUpFailed);
    } finally {
      setInflight(null);
      onInflight?.(false);
    }
  }

  const busy = inflight !== null;

  return (
    <div
      className="mx-[16px] mt-[10px] md:mb-[16px] md:mx-[30px] md:mt-[12px] rounded-[10px]"
      style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
      }}
    >
      <div className="px-[14px] py-[13px] md:px-[16px] md:py-[14px]">
        {/* Heading — mono 10.5px accent uppercase, letter-spacing .14em; margin-bottom 4px */}
        <p
          className="font-mono uppercase mb-[4px]"
          style={{ fontSize: "10.5px", letterSpacing: ".14em", color: "var(--accent)" }}
        >
          {synergyCopy.lastSlots.heading(String(openSlots))}
        </p>

        {/* Caption — responsive: desktop gets the long form, phone the short. One
            element with responsive classes, not two hidden subtrees. margin-bottom 11px */}
        <p
          className="font-mono mb-[11px]"
          style={{ fontSize: "10.5px", color: "var(--fg-faint)" }}
        >
          <span className="hidden md:inline">{synergyCopy.lastSlots.caption(String(openSlots))}</span>
          <span className="md:hidden">{synergyCopy.lastSlots.captionMobile(String(openSlots))}</span>
        </p>

        {/* Controls — on mobile: column; on desktop: flex row so A and B sit
            side-by-side. The shortfall line (§7.6) must appear between A and B
            in document order; it sits inside this flex container with full width
            so it forces B onto the next flex line even at desktop width. */}
        <div className="flex flex-col md:flex-row md:flex-wrap gap-[8px] md:gap-[10px] md:items-center">
          {/* Control A — owned fill. Absent when no owned candidates (Rule 1). */}
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
                  "font-sans font-semibold text-[14px] md:text-[13px]",
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

          {/* Owned note — explains the number beside A. Mono --fg-locked. Present
              only when there are owned candidates. */}
          {ownedCandidates > 0 && (
            <p
              className="font-mono"
              style={{ fontSize: "10.5px", color: "var(--fg-locked)" }}
            >
              {synergyCopy.lastSlots.ownedNote(String(ownedCandidates), commanderShortName)}
            </p>
          )}

          {/* §7.6 shortfall line — rendered when A settled below 99. Full width
              (w-full) forces B below it even in the desktop flex-row layout, so
              B always sits directly beneath the shortfall in document order. */}
          {settled && (
            <div className="w-full">
              <ShortfallLine total={settled.total} shortfall={settled.shortfall} />
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
                className="w-full md:w-auto min-h-[44px] md:min-h-0 rounded-[8px] px-[16px] py-[10px] text-[14px] md:text-[13px] disabled:opacity-50"
              >
                {inflight === "unowned"
                  ? recommendationsCopy.fill.fillingRows(String(openSlots))
                  : <>
                      {synergyCopy.lastSlots.topUp}
                      {/* Count badge: open-slot count, matching the aria-label */}
                      {" "}
                      <span className="font-mono text-[11px]" style={{ color: "var(--warning)" }}>
                        {openSlots}
                      </span>
                    </>}
              </GhostButton>
              {unownedError && <MutationError message={unownedError} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
