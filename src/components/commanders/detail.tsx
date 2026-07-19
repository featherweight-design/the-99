// Commander Detail — §Commander Detail Page design table.
// Desktop: sticky left column (63/88 card + oracle glass + build button) + scrolling right column.
// Mobile: art header band (236px, gradient + overlay text) + sticky bottom Build bar + sections.

import Link from "next/link";
import { commanderGradient } from "../../lib/collection/gradients";
import { WUBRG_HEX } from "../../lib/collection/browse";
import { fitSegments } from "../../lib/recs/format";
import { ROLE_TARGETS } from "../../lib/recs/roles";
import type { RankedCommander } from "../../lib/recs/recommend";
import { FullCardTrigger } from "./full-card-trigger";

// ─── Internal sub-component types ───────────────────────────────────────────

type RoleName = "ramp" | "draw" | "removal" | "wipes";
const ROLE_ORDER: RoleName[] = ["ramp", "draw", "removal", "wipes"];
const ROLE_LABELS: Record<RoleName, string> = {
  ramp: "Ramp",
  draw: "Card Draw",
  removal: "Removal",
  wipes: "Board Wipes",
};

// ─── Owned card chip ─────────────────────────────────────────────────────────

function OwnedChip({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center font-mono rounded-full"
      style={{
        fontSize: "11.5px",
        background: "#221D16",
        border: "1px solid #33402F",
        padding: "4px 10px",
        color: "#C6B79A",
        gap: 6,
      }}
    >
      {/* Green dot */}
      <span
        className="block shrink-0 rounded-full"
        style={{ width: 6, height: 6, background: "#6FA368" }}
      />
      {name}
    </span>
  );
}

// ─── Missing card chip (dashed border) ───────────────────────────────────────

function MissingChip({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center font-mono rounded-full"
      style={{
        fontSize: "12px",
        background: "transparent",
        border: "1px dashed #3A3229",
        padding: "5px 11px",
        color: "#8E8269",
        gap: 7,
      }}
    >
      {/* Hollow dot */}
      <span
        className="block shrink-0 rounded-full"
        style={{
          width: 6,
          height: 6,
          border: "1px solid #6E6353",
          background: "transparent",
        }}
      />
      {name}
    </span>
  );
}

// ─── Fit Hero (right column top section) ─────────────────────────────────────

type FitHeroProps = {
  commander: RankedCommander;
  rank: number;
  isBestFit: boolean;
};

function FitHero({ commander: c, rank, isBestFit }: FitHeroProps) {
  const fit = fitSegments(c);
  const scoreDisplay = Math.round(fit.pct);
  const hasSynergy = fit.segments.some((s) => s.key === "synergy");

  const SEGMENT_COLORS: Record<"pool" | "roles" | "synergy", string> = {
    pool: "#6E5B33",
    roles: "#A9863E",
    synergy: "#C9A24B",
  };
  const SEGMENT_LABELS: Record<"pool" | "roles" | "synergy", string> = {
    pool: "Pool",
    roles: "Roles",
    synergy: "Synergy",
  };

  // Per-segment percentage labels for legend
  const total = c.fitPool + c.fitRoles + (c.fitSynergy ?? 0);
  const segPct = (val: number) =>
    total > 0 ? `${Math.round((val / total) * 100)}%` : "0%";

  return (
    <div
      className="rounded-[14px]"
      style={{
        background: "#1A160F",
        border: "1px solid #2A241D",
        padding: "22px 24px",
      }}
    >
      {/* "FIT FOR YOUR COLLECTION" label */}
      <p
        className="m-0 font-mono uppercase"
        style={{ fontSize: 11, letterSpacing: "0.14em", color: "#8E8269" }}
      >
        Fit for your collection
      </p>

      {/* Score row */}
      <div className="flex items-baseline gap-[8px] mt-[8px]">
        <span
          className="font-mono font-[600]"
          style={{ fontSize: 52, color: "#EDE6D8", lineHeight: 0.9 }}
        >
          {scoreDisplay}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 16, color: "#8E8269" }}
        >
          /100
        </span>
        {isBestFit && (
          <span
            className="font-sans font-[600]"
            style={{ fontSize: 13, color: "#6FA368", marginLeft: 6 }}
          >
            Best in your pool
          </span>
        )}
        {!isBestFit && (
          <span
            className="font-mono"
            style={{ fontSize: 13, color: "#8E8269" }}
          >
            Rank #{rank}
          </span>
        )}
      </div>

      {/* Fit bar — 12px height for detail hero */}
      <div
        className="overflow-hidden flex rounded-full"
        style={{ height: 12, background: "#2A241D", marginTop: 18 }}
      >
        <div className="flex h-full" style={{ width: `${fit.pct}%` }}>
          {fit.segments.map((seg) => (
            <div
              key={seg.key}
              className="h-full"
              style={{
                flexGrow: seg.grow,
                background: SEGMENT_COLORS[seg.key],
              }}
            />
          ))}
        </div>
      </div>

      {/* Legend row — desktop, 24px gap */}
      <div
        className="flex gap-[24px] mt-[12px]"
      >
        {fit.segments.map((seg) => (
          <div key={seg.key} className="flex items-center gap-[6px]">
            <span
              className="block shrink-0"
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: SEGMENT_COLORS[seg.key],
              }}
            />
            <span
              className="font-sans"
              style={{ fontSize: 13, color: "#C6B79A" }}
            >
              {SEGMENT_LABELS[seg.key]}
            </span>
            <span
              className="font-mono"
              style={{ fontSize: 12, color: "#8E8269" }}
            >
              {seg.key === "pool"
                ? segPct(c.fitPool)
                : seg.key === "roles"
                ? segPct(c.fitRoles)
                : segPct(c.fitSynergy ?? 0)}
            </span>
          </div>
        ))}
        {/* Synergy — placeholder when degraded */}
        {!hasSynergy && (
          <div className="flex items-center gap-[6px]">
            <span
              className="block shrink-0"
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: "#3A3229",
              }}
            />
            <span
              className="font-mono"
              style={{ fontSize: "9.5px", color: "#5E5647" }}
            >
              Synergy —
            </span>
          </div>
        )}
      </div>

      {/* Per-commander degraded note when fitSynergy is null */}
      {c.fitSynergy === null && (
        <div
          className="flex items-center gap-[9px] rounded-[8px] mt-[16px]"
          style={{
            background: "#211C15",
            border: "1px solid #3A3229",
            borderLeft: "2px solid #8E8269",
            padding: "9px 13px",
          }}
        >
          <span style={{ color: "#8E8269", fontSize: 13 }}>⚠</span>
          <span style={{ fontSize: 12.5, color: "#A89B84", lineHeight: 1.45 }}>
            <strong style={{ color: "#C6B79A", fontWeight: 600 }}>
              Synergy data unavailable
            </strong>{" "}
            — EDHREC receipts are hidden for this commander.
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Role panel (one per role) ────────────────────────────────────────────────

function RolePanel({
  role,
  cards,
  count,
}: {
  role: RoleName;
  cards: string[];
  count: number;
}) {
  const target = ROLE_TARGETS[role];

  return (
    <div
      className="rounded-[10px]"
      style={{
        background: "#1A160F",
        border: "1px solid #2A241D",
        padding: "15px 18px",
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-[12px]"
        style={{ marginBottom: 10 }}
      >
        <span
          className="font-sans font-[600]"
          style={{ fontSize: 15, color: "#EDE6D8" }}
        >
          {ROLE_LABELS[role]}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 12, color: "#6FA368" }}
        >
          {count} owned
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 12, color: "#8E8269", marginLeft: "auto" }}
        >
          {count > target
            ? `Well past the ${target}-source baseline`
            : count === target
              ? `At the ${target}-source baseline`
              : `${target - count} short of baseline`}
        </span>
      </div>

      {/* Card chips */}
      <div className="flex flex-wrap gap-[7px]">
        {cards.map((name) => (
          <OwnedChip key={name} name={name} />
        ))}
        {cards.length === 0 && (
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "#6E6353" }}
          >
            No {ROLE_LABELS[role].toLowerCase()} cards in your pool
          </span>
        )}
      </div>
    </div>
  );
}

// ─── EDHREC Synergy Panel ─────────────────────────────────────────────────────

function SynergyPanel({ commander: c }: { commander: RankedCommander }) {
  const ownedCount = c.edhrecOwnedCount ?? 0;
  const total = c.edhrecTotal ?? 0;
  const pct = total > 0 ? Math.round((ownedCount / total) * 100) : 0;

  return (
    <div
      className="rounded-[12px]"
      style={{
        background: "#1A160F",
        border: "1px solid #2A241D",
        padding: "18px 20px",
      }}
    >
      {/* Score row */}
      <div className="flex items-center gap-[14px]">
        <span
          className="font-mono font-[600]"
          style={{ fontSize: 30, color: "#EDE6D8" }}
        >
          {ownedCount}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 14, color: "#8E8269" }}
        >
          of top {total}
        </span>
        {/* Overlap bar */}
        <div
          className="overflow-hidden rounded-full"
          style={{
            flex: 1,
            height: 10,
            background: "#2A241D",
          }}
        >
          <div
            className="h-full"
            style={{ width: `${pct}%`, background: "#C9A24B" }}
          />
        </div>
        <span
          className="font-mono"
          style={{ fontSize: 12, color: "#6FA368" }}
        >
          {pct}% owned
        </span>
      </div>

      {/* Owned sub-label */}
      <p
        className="m-0 font-mono uppercase"
        style={{
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "#8E8269",
          margin: "18px 0 10px",
        }}
      >
        Owned — {ownedCount}
      </p>

      {/* Owned chips */}
      <div className="flex flex-wrap gap-[7px]">
        {c.overlapOwned.map((name) => (
          <OwnedChip key={name} name={name} />
        ))}
        {c.overlapOwned.length === 0 && (
          <span
            className="font-mono"
            style={{ fontSize: 11, color: "#6E6353" }}
          >
            None of the top synergy cards are in your collection
          </span>
        )}
      </div>

      {/* Missing sub-label */}
      {c.overlapMissing.length > 0 && (
        <>
          <p
            className="m-0 font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "#8E8269",
              margin: "20px 0 10px",
            }}
          >
            Not in your collection —{" "}
            <span style={{ color: "#6E6353" }}>
              {c.overlapMissing.length} · the gap to close
            </span>
          </p>

          {/* Missing chips */}
          <div className="flex flex-wrap gap-[7px]">
            {c.overlapMissing.map((name) => (
              <MissingChip key={name} name={name} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export type CommanderDetailProps = {
  commander: RankedCommander;
  rank: number;
  isBestFit: boolean;
};

export function CommanderDetail({
  commander: c,
  rank,
  isBestFit,
}: CommanderDetailProps) {
  const gradient = commanderGradient(c.colorIdentity);

  return (
    <>
      {/* ── Mobile: art header band ─────────────────────────────────── */}
      <div
        className="sm:hidden relative flex-none"
        style={{
          height: 236,
          background: gradient,
          boxShadow: "inset 0 -60px 60px -30px rgba(10,7,4,0.9)",
        }}
      >
        {/* Back chevron */}
        <Link
          href="/commanders"
          // brand focus-visible outline treatment inherited from globals.css
          className="absolute flex items-center justify-center rounded-full"
          style={{
            top: 16,
            left: 16,
            width: 30,
            height: 30,
            background: "rgba(10,7,4,0.55)",
            backdropFilter: "blur(4px)",
            color: "#EDE6D8",
            fontSize: 15,
            textDecoration: "none",
            zIndex: 1,
          }}
          aria-label="Back to rankings"
        >
          ‹
        </Link>

        {/* Mana identity pips (top-right) */}
        {c.colorIdentity.length > 0 && (
          <div
            className="absolute flex gap-[5px]"
            style={{ top: 16, right: 16 }}
          >
            {c.colorIdentity.map((color) => (
              <span
                key={color}
                className="block rounded-full shrink-0"
                style={{
                  width: 16,
                  height: 16,
                  background: WUBRG_HEX[color] ?? "#8E8269",
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)",
                }}
              />
            ))}
          </div>
        )}

        {/* ⛶ Full card trigger + lightbox (client component) */}
        <FullCardTrigger commander={c} />

        {/* Art header overlay (bottom) — pointer-events-none so taps fall
            through to the full-band lightbox trigger */}
        <div
          className="absolute pointer-events-none"
          style={{ left: 16, right: 16, bottom: 14 }}
        >
          <p
            className="m-0 font-mono uppercase"
            style={{
              fontSize: 10,
              letterSpacing: "0.14em",
              color: "#C9A24B",
            }}
          >
            Rank {rank}
            {isBestFit ? " · your best fit" : ""}
          </p>
          <h1
            className="font-display font-[700]"
            style={{
              fontSize: 23,
              color: "#EDE6D8",
              lineHeight: 1.1,
              marginTop: 3,
              marginBottom: 0,
            }}
          >
            {c.name}
          </h1>
          <p
            className="m-0"
            style={{ fontSize: 12, color: "#C6B79A", marginTop: 2 }}
          >
            {c.typeLine}
          </p>
        </div>
      </div>

      {/* ── Mobile: scrolling body ──────────────────────────────────── */}
      <div
        className="sm:hidden flex flex-col gap-[16px] overflow-y-auto"
        style={{ flex: 1, padding: "16px 14px 0" }}
      >
        {/* Fit Hero (mobile) */}
        <FitHero commander={c} rank={rank} isBestFit={isBestFit} />

        {/* The Pool section */}
        <div>
          <div className="mb-[12px]">
            <h2
              className="font-display font-[600] m-0"
              style={{ fontSize: 20, color: "#EDE6D8" }}
            >
              The Pool
            </h2>
            <p
              className="m-0 font-mono"
              style={{ fontSize: 12, color: "#8E8269" }}
            >
              {c.colorPoolSize} card{c.colorPoolSize === 1 ? "" : "s"} fit this
              identity
            </p>
            <p
              className="m-0"
              style={{
                fontSize: 13.5,
                color: "#C6B79A",
                lineHeight: 1.6,
                margin: "8px 0 0",
                maxWidth: 640,
              }}
            >
              Cards from your collection that fit within{" "}
              {c.name}&apos;s color identity and could slot into the 99.
            </p>
          </div>
        </div>

        {/* Role Coverage section */}
        <div>
          <div className="mb-[12px]">
            <h2
              className="font-display font-[600] m-0"
              style={{ fontSize: 20, color: "#EDE6D8" }}
            >
              Role Coverage
            </h2>
            <p
              className="m-0 font-mono"
              style={{ fontSize: 12, color: "#8E8269" }}
            >
              Your owned cards by role
            </p>
          </div>
          <div className="flex flex-col gap-[12px]">
            {ROLE_ORDER.map((role) => (
              <RolePanel
                key={role}
                role={role}
                cards={c.roleCards[role]}
                count={c.roleCounts[role]}
              />
            ))}
          </div>
        </div>

        {/* EDHREC Synergy section (mobile) */}
        {c.fitSynergy !== null && c.edhrecTotal !== null ? (
          <div>
            <div className="mb-[12px]">
              <h2
                className="font-display font-[600] m-0"
                style={{ fontSize: 20, color: "#EDE6D8" }}
              >
                EDHREC Synergy
              </h2>
              <p
                className="m-0 font-mono"
                style={{ fontSize: 12, color: "#8E8269" }}
              >
                Top {c.edhrecTotal} synergy cards for this commander
              </p>
            </div>
            {/* Mobile EDHREC panel header */}
            <div
              className="rounded-[10px]"
              style={{
                background: "#1A160F",
                border: "1px solid #2A241D",
                padding: "13px 14px",
              }}
            >
              <div className="flex items-center justify-between mb-[10px]">
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    color: "#8E8269",
                  }}
                >
                  EDHREC synergy
                </span>
                <span
                  className="font-mono"
                  style={{ fontSize: 12, color: "#EDE6D8" }}
                >
                  {c.edhrecOwnedCount} / {c.edhrecTotal} owned
                </span>
              </div>
              {/* Overlap bar (mobile) */}
              <div
                className="overflow-hidden rounded-full"
                style={{ height: 6, background: "#2A241D", margin: "9px 0 11px" }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${c.edhrecTotal > 0 ? Math.round(((c.edhrecOwnedCount ?? 0) / c.edhrecTotal) * 100) : 0}%`,
                    background: "#C9A24B",
                  }}
                />
              </div>
              {/* Owned chips */}
              <div className="flex flex-wrap gap-[5px]">
                {c.overlapOwned.map((name) => (
                  <OwnedChip key={name} name={name} />
                ))}
              </div>
              {c.overlapMissing.length > 0 && (
                <p
                  className="m-0 font-mono"
                  style={{ fontSize: 10.5, color: "#8E8269", marginTop: 8 }}
                >
                  +{c.overlapMissing.length} more not in collection
                </p>
              )}
            </div>
          </div>
        ) : (
          /* degraded: hidden-receipts note */
          <div
            className="flex items-center gap-[8px] rounded-[7px]"
            style={{
              background: "#211C15",
              border: "1px solid #33302A",
              padding: "7px 11px",
            }}
          >
            <span
              className="font-mono"
              style={{ fontSize: 10, color: "#6E6353" }}
            >
              Synergy receipts hidden — EDHREC data unavailable
            </span>
          </div>
        )}

        {/* Bottom spacer so sticky bar doesn't cover last content */}
        <div style={{ height: 100 }} />
      </div>

      {/* ── Mobile: sticky bottom Build bar ────────────────────────── */}
      <div
        className="sm:hidden flex-none flex items-center gap-[12px]"
        style={{
          borderTop: "1px solid #3A3229",
          background: "#1A160F",
          padding: "12px 16px 24px",
        }}
      >
        <div className="flex flex-col flex-1">
          <span
            className="font-mono"
            style={{ fontSize: 10, color: "#8E8269" }}
          >
            READY TO BUILD
          </span>
          <span style={{ fontSize: 12, color: "#C6B79A" }}>
            {c.colorPoolSize} cards in your pool
          </span>
        </div>
        <Link
          href={`/decks?commander=${c.oracleId}`}
          // brand focus-visible outline treatment inherited from globals.css
          className="font-sans font-[600] rounded-[8px] text-center"
          style={{
            fontSize: 14,
            color: "#14110E",
            background: "#C9A24B",
            border: "none",
            padding: "12px 20px",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Build this deck →
        </Link>
      </div>

      {/* ── Desktop: two-column layout ──────────────────────────────── */}
      <div
        className="hidden sm:grid"
        style={{
          gridTemplateColumns: "344px 1fr",
          gap: 36,
          marginTop: 20,
          alignItems: "start",
          padding: "26px 36px 40px",
        }}
      >
        {/* Left column — sticky */}
        <div
          className="sticky flex flex-col gap-[16px]"
          style={{ top: 20 }}
        >
          {/* Back link */}
          <Link
            href="/commanders"
            // brand focus-visible outline treatment inherited from globals.css
            className="inline-flex items-center gap-[7px] font-sans"
            style={{
              fontSize: 13,
              color: "#8E8269",
              textDecoration: "none",
            }}
          >
            ‹ Back to rankings
          </Link>

          {/* Commander card frame — 63/88 aspect, gradient */}
          <div
            className="flex flex-col rounded-[14px]"
            style={{
              aspectRatio: "63/88",
              background: gradient,
              boxShadow:
                "inset 0 -70px 70px -40px rgba(10,7,4,0.85), inset 0 0 0 1px rgba(0,0,0,0.3), 0 20px 50px rgba(0,0,0,0.5)",
              padding: 16,
            }}
          >
            {/* Card name + mana cost row */}
            <div className="flex items-start justify-between gap-[8px]">
              <h1
                className="font-display font-[700] m-0"
                style={{
                  fontSize: 19,
                  color: "#F4EEE0",
                  textShadow: "0 1px 6px rgba(0,0,0,0.6)",
                  lineHeight: 1.1,
                }}
              >
                {c.name}
              </h1>
              {/* Mana cost pips */}
              {c.manaCost && (
                <div className="flex gap-[4px] flex-none">
                  {[...c.manaCost.matchAll(/\{([^}]+)\}/g)].map((m, i) => {
                    const sym = m[1];
                    const isWUBRG = /^[WUBRG]$/.test(sym);
                    // Per §Mana pip text colors: B: #0E0C10, R: #1a0b08, G: #0c1608;
                    // W and U are not explicitly listed — use generic #C6B79A fallback.
                    const PIP_TEXT: Record<string, string> = {
                      W: "#C6B79A",
                      U: "#C6B79A",
                      B: "#0E0C10",
                      R: "#1a0b08",
                      G: "#0c1608",
                    };
                    return (
                      <span
                        key={i}
                        className="inline-flex items-center justify-center rounded-full font-mono font-[600]"
                        style={{
                          width: 24,
                          height: 24,
                          fontSize: 13,
                          background: isWUBRG
                            ? WUBRG_HEX[sym] ?? "#3A322A"
                            : "#3A322A",
                          color: isWUBRG ? (PIP_TEXT[sym] ?? "#C6B79A") : "#C6B79A",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                        }}
                      >
                        {sym}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Spacer pushes oracle glass to bottom */}
            <div style={{ flex: 1 }} />

            {/* Oracle glass panel */}
            <div
              className="rounded-[8px]"
              style={{
                background: "rgba(10,7,4,0.5)",
                backdropFilter: "blur(3px)",
                padding: "10px 12px",
              }}
            >
              {/* Type line */}
              <p
                className="m-0 font-[500]"
                style={{
                  fontSize: 12,
                  color: "#EDE6D8",
                  textShadow: "0 1px 4px rgba(0,0,0,0.6)",
                }}
              >
                {c.typeLine}
              </p>
              {/* Oracle text */}
              {c.oracleText && (
                <p
                  className="m-0"
                  style={{
                    fontSize: 11,
                    color: "#E4DCCB",
                    lineHeight: 1.4,
                    marginTop: 5,
                    textShadow: "0 1px 3px rgba(0,0,0,0.7)",
                    whiteSpace: "pre-line",
                  }}
                >
                  {c.oracleText}
                </p>
              )}
            </div>
          </div>

          {/* Identity pip row (below card) */}
          {c.colorIdentity.length > 0 && (
            <div className="flex items-center gap-[5px]">
              {c.colorIdentity.map((color) => (
                <span
                  key={color}
                  className="block rounded-full shrink-0"
                  style={{
                    width: 16,
                    height: 16,
                    background: WUBRG_HEX[color] ?? "#8E8269",
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)",
                  }}
                />
              ))}
              <span
                className="font-mono ml-[4px]"
                style={{ fontSize: 12, color: "#8E8269" }}
              >
                {c.colorIdentity.join("")}
              </span>
            </div>
          )}

          {/* Build this deck button */}
          <Link
            href={`/decks?commander=${c.oracleId}`}
            // brand focus-visible outline treatment inherited from globals.css
            className="font-sans font-[600] rounded-[8px] text-center block"
            style={{
              fontSize: 15,
              color: "#14110E",
              background: "#C9A24B",
              border: "none",
              padding: "14px 0",
              width: "100%",
              textDecoration: "none",
              cursor: "pointer",
            }}
          >
            Build this deck →
          </Link>

          {/* Compare button */}
          <button
            type="button"
            // brand focus-visible outline treatment inherited from globals.css
            className="font-sans font-[600] rounded-[8px] w-full"
            style={{
              fontSize: 13,
              color: "#EDE6D8",
              background: "transparent",
              border: "1px solid #3A3229",
              padding: "11px 0",
              cursor: "pointer",
            }}
          >
            Compare with another general
          </button>

          {/* Seed note */}
          <p
            className="m-0 font-mono text-center"
            style={{
              fontSize: 10.5,
              color: "#6E6353",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            Your owned pool will seed the deck builder
          </p>
        </div>

        {/* Right column — scrolling */}
        <div className="flex flex-col gap-[32px]">
          {/* Fit Hero */}
          <FitHero commander={c} rank={rank} isBestFit={isBestFit} />

          {/* The Pool section */}
          <div>
            <h2
              className="font-display font-[600] m-0"
              style={{ fontSize: 20, color: "#EDE6D8" }}
            >
              The Pool
            </h2>
            <p
              className="m-0 font-mono"
              style={{ fontSize: 12, color: "#8E8269" }}
            >
              {c.colorPoolSize} card{c.colorPoolSize === 1 ? "" : "s"} fit this
              identity
            </p>
            <p
              className="m-0"
              style={{
                fontSize: 13.5,
                color: "#C6B79A",
                lineHeight: 1.6,
                margin: "8px 0 0",
                maxWidth: 640,
              }}
            >
              Cards from your collection that fit within{" "}
              {c.name}&apos;s color identity and could slot into the 99.
            </p>
          </div>

          {/* Role Coverage section */}
          <div>
            <h2
              className="font-display font-[600] m-0"
              style={{ fontSize: 20, color: "#EDE6D8" }}
            >
              Role Coverage
            </h2>
            <p
              className="m-0 font-mono"
              style={{ fontSize: 12, color: "#8E8269" }}
            >
              Your owned cards by role
            </p>
            <div className="flex flex-col gap-[12px] mt-[16px]">
              {ROLE_ORDER.map((role) => (
                <RolePanel
                  key={role}
                  role={role}
                  cards={c.roleCards[role]}
                  count={c.roleCounts[role]}
                />
              ))}
            </div>
          </div>

          {/* EDHREC Synergy section */}
          {c.fitSynergy !== null && c.edhrecTotal !== null ? (
            <div>
              <h2
                className="font-display font-[600] m-0"
                style={{ fontSize: 20, color: "#EDE6D8" }}
              >
                EDHREC Synergy
              </h2>
              <p
                className="m-0 font-mono"
                style={{ fontSize: 12, color: "#8E8269" }}
              >
                Top {c.edhrecTotal} synergy cards for this commander
              </p>
              <div className="mt-[16px]">
                <SynergyPanel commander={c} />
              </div>
            </div>
          ) : (
            /* degraded: hidden-receipts note */
            <div
              className="flex items-center gap-[9px] rounded-[7px]"
              style={{
                background: "#211C15",
                border: "1px solid #33302A",
                padding: "7px 11px",
                width: "fit-content",
              }}
            >
              <span
                className="font-mono"
                style={{ fontSize: 11, color: "#8E8269" }}
              >
                Synergy receipts hidden — EDHREC data unavailable
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
