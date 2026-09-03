"use client";
// SynergyRow — one row in the commander's synergy card list.
//
// Desktop geometry: ownership dot 7px · name (flex:auto) · type 150px · synergy 64px · inclusion 46px · toggle 34×34
// Phone geometry: ownership dot · name · toggle 44×44; meta line under the name (synergy pts + edhrec %)
//
// Single responsive tree — no md:hidden / hidden md:block pairs that duplicate the DOM.
// The phone meta line (genuinely absent on desktop) is the one exception, marked md:hidden.

import type { CardFacet } from "../../lib/cards/facet";
import { FACET_TYPE_LABEL } from "../../lib/cards/facet";
import type { SynergyCard } from "../../lib/commanders/synergy-cards";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { CardDetailTrigger } from "../cards/card-detail-provider";

// ── Figure formatters ────────────────────────────────────────────────────────

function formatSynergyDisplay(pts: number): string {
  if (pts < 0) return synergyCopy.figure.synergyNegative(String(Math.abs(pts)));
  return synergyCopy.figure.synergy(String(pts));
}

function formatSynergyAria(pts: number): string {
  if (pts < 0) return synergyCopy.figure.ariaSynergyMinus(String(Math.abs(pts)));
  return synergyCopy.figure.ariaSynergyPlus(String(pts));
}

// ── Ownership dot ────────────────────────────────────────────────────────────

function OwnershipDot({ owned }: { owned: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "block",
        flexShrink: 0,
        width: 7,
        height: 7,
        borderRadius: "50%",
        background: owned ? "var(--success)" : "transparent",
        border: owned ? undefined : "1px solid var(--fg-locked)",
      }}
    />
  );
}

// ── The row ──────────────────────────────────────────────────────────────────

export function SynergyRow({
  card,
  selected,
  onToggle,
  siblings,
  width,
  facet,
}: {
  card: SynergyCard;
  selected: boolean;
  onToggle: () => void;
  siblings: string[];
  width: "desktop" | "phone";
  facet: CardFacet | "all";
}) {
  const isPhone = width === "phone";

  // Type column content: under a single facet, print the real type line.
  // Under "all", print the bucket label only.
  const typeColContent =
    facet === "all" ? FACET_TYPE_LABEL[card.facet] : card.typeLine;

  // Display figures
  const synergyDisplay =
    card.synergyPts !== null
      ? formatSynergyDisplay(card.synergyPts)
      : synergyCopy.figure.synergyNone;

  const inclusionDisplay =
    card.inclusionPct !== null
      ? synergyCopy.figure.inclusion(String(card.inclusionPct))
      : synergyCopy.figure.inclusionNone;

  const inclusionMobileDisplay =
    card.inclusionPct !== null
      ? synergyCopy.figure.inclusionMobile(String(card.inclusionPct))
      : synergyCopy.figure.inclusionNone;

  // Aria
  const ownedAria = card.owned ? synergyCopy.figure.ariaOwned : synergyCopy.figure.ariaUnowned;
  const synergyAria =
    card.synergyPts !== null
      ? formatSynergyAria(card.synergyPts)
      : synergyCopy.figure.ariaSynergyNone;
  const inclusionAria =
    card.inclusionPct !== null
      ? synergyCopy.figure.inclusion(String(card.inclusionPct))
      : synergyCopy.figure.ariaInclusionNone;

  const rowAria = synergyCopy.figure.rowAria(card.name, ownedAria, synergyAria, inclusionAria);

  const toggleAria = selected
    ? synergyCopy.select.removeAria(card.name)
    : synergyCopy.select.addAria(card.name);

  const toggleSize = isPhone ? 44 : 34;

  return (
    <li
      aria-label={rowAria}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 6px 0 12px",
        minHeight: isPhone ? 52 : 44,
        borderRadius: 8,
        background: selected ? "var(--elevated-hover)" : "var(--surface)",
        border: selected
          ? "1px solid var(--accent-shadow)"
          : "1px solid var(--border)",
        listStyle: "none",
      }}
    >
      {/* Slot 1: ownership dot */}
      <OwnershipDot owned={card.owned} />

      {/* Slot 2: name + phone meta line */}
      <div style={{ flex: "auto", minWidth: 0 }}>
        <CardDetailTrigger
          oracleId={card.oracleId}
          name={card.name}
          siblings={siblings}
          style={{
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 13.5,
            color: "var(--fg)",
            textAlign: "left",
            width: "100%",
          }}
        >
          {card.name}
        </CardDetailTrigger>

        {/* Phone meta line: synergy pts · edhrec N% — only shown on phone, hidden on desktop */}
        {isPhone && (
          <div
            className="md:hidden"
            style={{
              display: "flex",
              gap: 6,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              marginTop: 1,
            }}
          >
            {card.synergyPts !== null ? (
              <span
                aria-hidden="true"
                style={{
                  color:
                    card.synergyPts >= 0 ? "var(--accent)" : "var(--fg-locked)",
                }}
              >
                {synergyDisplay}
              </span>
            ) : (
              <span aria-hidden="true" style={{ color: "var(--fg-locked)" }}>
                {synergyCopy.figure.synergyNone}
              </span>
            )}
            <span aria-hidden="true" style={{ color: "var(--fg-locked)" }}>·</span>
            <span aria-hidden="true" style={{ color: "var(--fg-faint)" }}>{inclusionMobileDisplay}</span>
          </div>
        )}
      </div>

      {/* Slot 3: type column — desktop only (absent on phone) */}
      {!isPhone && (
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            color: "var(--fg-locked)",
            width: 150,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {typeColContent}
        </span>
      )}

      {/* Slot 4: synergy figure — desktop only */}
      {!isPhone && (
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11.5,
            width: 64,
            flexShrink: 0,
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
            color:
              card.synergyPts === null
                ? "var(--fg-locked)"
                : card.synergyPts >= 0
                  ? "var(--accent)"
                  : "var(--fg-locked)",
          }}
          aria-hidden="true"
        >
          {synergyDisplay}
        </span>
      )}

      {/* Slot 5: inclusion figure — desktop only */}
      {!isPhone && (
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            width: 46,
            flexShrink: 0,
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
            color: "var(--fg-faint)",
          }}
          aria-hidden="true"
        >
          {inclusionDisplay}
        </span>
      )}

      {/* Slot 6: toggle button */}
      {/* Toggle: background/border/color are state-driven — genuinely dynamic,
          no static Tailwind class can express the accent vs neutral distinction.
          eslint-disable-next-line comments are below per the rule's own escape hatch. */}
      <button
        type="button"
        aria-pressed={selected}
        aria-label={toggleAria}
        onClick={onToggle}
        className="flex shrink-0 cursor-pointer items-center justify-center font-mono"
        style={{
          width: toggleSize,
          height: toggleSize,
          borderRadius: 7,
          fontSize: 14,
          // eslint-disable-next-line no-restricted-syntax -- border changes with selected state; genuinely dynamic
          border: selected ? "1px solid var(--accent)" : "1px solid var(--border-strong)",
          // eslint-disable-next-line no-restricted-syntax -- background changes with selected state; genuinely dynamic
          background: selected
            ? "color-mix(in oklab, var(--accent) 10%, transparent)"
            : "transparent",
          // eslint-disable-next-line no-restricted-syntax -- color changes with selected state; genuinely dynamic
          color: selected ? "var(--accent)" : "var(--fg-faint)",
        }}
      >
        {selected ? "✓" : "+"}
      </button>
    </li>
  );
}
