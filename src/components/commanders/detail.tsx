// Commander Detail — §Commander Detail Page design table.
// Desktop: sticky left column (63/88 card + oracle glass + build button) + scrolling right column.
// Mobile: art header band (236px, gradient + overlay text) + sticky bottom Build bar + sections.

import Link from "next/link";
import { commanderGradient } from "../../lib/collection/gradients";
import { WUBRG_COLOR, cssUrl } from "../../lib/collection/browse";
import { fitSegments } from "../../lib/recs/format";
import type { RankedCommander } from "../../lib/recs/recommend";
import { FullCardTrigger } from "./full-card-trigger";
import { PrimaryButton } from "../ui/button";
import { CoverageSection } from "./coverage-section";
import { retryCoverageFigures } from "../../app/commanders/[slug]/coverage-action";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { FILL_BASELINE_TOTAL } from "../../lib/decks/fill";

// ─── Owned card chip ─────────────────────────────────────────────────────────

function OwnedChip({ name }: { name: string }) {
  return (
    <span
      className="inline-flex items-center font-mono rounded-full"
      style={{
        fontSize: "11.5px",
        background: "var(--surface-raised)",
        border: "1px solid color-mix(in srgb, var(--success) 40%, var(--bg))",
        padding: "4px 10px",
        color: "var(--fg-body)",
        gap: 6,
      }}
    >
      {/* Green dot */}
      <span
        className="block shrink-0 rounded-full"
        style={{ width: 6, height: 6, background: "var(--success)" }}
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
        border: "1px dashed var(--border-strong)",
        padding: "5px 11px",
        color: "var(--fg-faint)",
        gap: 7,
      }}
    >
      {/* Hollow dot */}
      <span
        className="block shrink-0 rounded-full"
        style={{
          width: 6,
          height: 6,
          border: "1px solid var(--fg-locked)",
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

  // The same three-step ramp the fit bar draws, so it takes the same three
  // tokens. Reading these two as --accent-shadow and --accent-strong would
  // split one gradient across two token families, and Phase 3 moves those
  // families independently.
  const SEGMENT_COLORS: Record<"pool" | "roles" | "synergy", string> = {
    pool: "var(--accent-dim)",
    roles: "var(--accent-mid)",
    synergy: "var(--accent)",
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
        background: "var(--surface-rail)",
        border: "1px solid var(--border)",
        padding: "22px 24px",
      }}
    >
      {/* "FIT FOR YOUR COLLECTION" label */}
      <p
        className="m-0 font-mono uppercase"
        style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--fg-faint)" }}
      >
        Fit for your collection
      </p>

      {/* Score row */}
      <div className="flex items-baseline gap-[8px] mt-[8px]">
        <span
          className="font-mono font-[600]"
          style={{ fontSize: 52, color: "var(--fg)", lineHeight: 0.9 }}
        >
          {scoreDisplay}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 16, color: "var(--fg-faint)" }}
        >
          /100
        </span>
        {isBestFit && (
          <span
            className="font-sans font-[600]"
            style={{ fontSize: 13, color: "var(--success)", marginLeft: 6 }}
          >
            Best in your pool
          </span>
        )}
        {!isBestFit && (
          <span
            className="font-mono"
            style={{ fontSize: 13, color: "var(--fg-faint)" }}
          >
            Rank #{rank}
          </span>
        )}
      </div>

      {/* Fit bar — 12px height for detail hero */}
      <div
        className="overflow-hidden flex rounded-full"
        style={{ height: 12, background: "var(--elevated)", marginTop: 18 }}
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
              style={{ fontSize: 13, color: "var(--fg-body)" }}
            >
              {SEGMENT_LABELS[seg.key]}
            </span>
            <span
              className="font-mono"
              style={{ fontSize: 12, color: "var(--fg-faint)" }}
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
                background: "var(--border-strong)",
              }}
            />
            <span
              className="font-mono"
              style={{ fontSize: "9.5px", color: "var(--fg-locked)" }}
            >
              Synergy —
            </span>
          </div>
        )}
      </div>

      {/* Per-commander note when there is no synergy data. "absent" is permanent
          — EDHREC does not index the commander — so it must not read as an outage. */}
      {c.synergyState !== "ok" && (
        <div
          className="flex items-center gap-[9px] rounded-[8px] mt-[16px]"
          style={{
            background: "var(--elevated-hover)",
            border: "1px solid var(--border-strong)",
            borderLeft: "2px solid var(--fg-faint)",
            padding: "9px 13px",
          }}
        >
          <span style={{ color: "var(--fg-faint)", fontSize: 13 }}>⚠</span>
          <span style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45 }}>
            {c.synergyState === "degraded" ? (
              <>
                <strong style={{ color: "var(--fg-body)", fontWeight: 600 }}>
                  Synergy data unavailable
                </strong>{" "}
                — we couldn&apos;t reach EDHREC, so receipts are hidden for now.
              </>
            ) : (
              <>
                <strong style={{ color: "var(--fg-body)", fontWeight: 600 }}>
                  No synergy data
                </strong>{" "}
                — EDHREC doesn&apos;t track this commander, so fit comes from pool
                and roles alone.
              </>
            )}
          </span>
        </div>
      )}
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
        background: "var(--surface-rail)",
        border: "1px solid var(--border)",
        padding: "18px 20px",
      }}
    >
      {/* Score row */}
      <div className="flex items-center gap-[14px]">
        <span
          className="font-mono font-[600]"
          style={{ fontSize: 30, color: "var(--fg)" }}
        >
          {ownedCount}
        </span>
        <span
          className="font-mono"
          style={{ fontSize: 14, color: "var(--fg-faint)" }}
        >
          of top {total}
        </span>
        {/* Overlap bar */}
        <div
          className="overflow-hidden rounded-full"
          style={{
            flex: 1,
            height: 10,
            background: "var(--elevated)",
          }}
        >
          <div
            className="h-full"
            style={{ width: `${pct}%`, background: "var(--accent)" }}
          />
        </div>
        <span
          className="font-mono"
          style={{ fontSize: 12, color: "var(--success)" }}
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
          color: "var(--fg-faint)",
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
            style={{ fontSize: 11, color: "var(--fg-locked)" }}
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
              color: "var(--fg-faint)",
              margin: "20px 0 10px",
            }}
          >
            Not in your collection —{" "}
            <span style={{ color: "var(--fg-locked)" }}>
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
          background: c.imageUri ? undefined : gradient,
          backgroundImage: c.imageUri ? cssUrl(c.imageUri) : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center top",
          boxShadow: "inset 0 -60px 60px -30px color-mix(in oklab, var(--bg) 90%, transparent)",
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
            background: "color-mix(in oklab, var(--bg) 55%, transparent)",
            backdropFilter: "blur(4px)",
            color: "var(--fg)",
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
                  background: WUBRG_COLOR[color] ?? "var(--fg-faint)",
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)",
                }}
              />
            ))}
          </div>
        )}

        {/* ⛶ Full card trigger + lightbox (client component) */}
        <FullCardTrigger
          commander={{
            name: c.name,
            manaCost: c.manaCost,
            typeLine: c.typeLine,
            oracleText: c.oracleText,
            colorIdentity: c.colorIdentity,
            imageUri: c.imageUri,
          }}
        />

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
              color: "var(--accent)",
            }}
          >
            Rank {rank}
            {isBestFit ? " · your best fit" : ""}
          </p>
          <h1
            className="font-display font-[700]"
            style={{
              fontSize: 23,
              color: "var(--fg)",
              lineHeight: 1.1,
              marginTop: 3,
              marginBottom: 0,
            }}
          >
            {c.name}
          </h1>
          <p
            className="m-0"
            style={{ fontSize: 12, color: "var(--fg-body)", marginTop: 2 }}
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
              style={{ fontSize: 20, color: "var(--fg)" }}
            >
              The Pool
            </h2>
            <p
              className="m-0 font-mono"
              style={{ fontSize: 12, color: "var(--fg-faint)" }}
            >
              {c.colorPoolSize} card{c.colorPoolSize === 1 ? "" : "s"} fit this
              identity
            </p>
            <p
              className="m-0"
              style={{
                fontSize: 13.5,
                color: "var(--fg-body)",
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
        <CoverageSection
          width="phone"
          slug={c.slug}
          roleCards={c.roleCards}
          roleCounts={c.roleCounts}
          synergyState={c.synergyState}
          retryCoverageFigures={retryCoverageFigures}
        />

        {/* EDHREC Synergy section (mobile) */}
        {c.fitSynergy !== null && c.edhrecTotal !== null ? (
          <div>
            <div className="mb-[12px]">
              <h2
                className="font-display font-[600] m-0"
                style={{ fontSize: 20, color: "var(--fg)" }}
              >
                EDHREC Synergy
              </h2>
              <p
                className="m-0 font-mono"
                style={{ fontSize: 12, color: "var(--fg-faint)" }}
              >
                Top {c.edhrecTotal} synergy cards for this commander
              </p>
            </div>
            {/* Mobile EDHREC panel header */}
            <div
              className="rounded-[10px]"
              style={{
                background: "var(--surface-rail)",
                border: "1px solid var(--border)",
                padding: "13px 14px",
              }}
            >
              <div className="flex items-center justify-between mb-[10px]">
                <span
                  className="font-mono uppercase"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    color: "var(--fg-faint)",
                  }}
                >
                  EDHREC synergy
                </span>
                <span
                  className="font-mono"
                  style={{ fontSize: 12, color: "var(--fg)" }}
                >
                  {c.edhrecOwnedCount} / {c.edhrecTotal} owned
                </span>
              </div>
              {/* Overlap bar (mobile) */}
              <div
                className="overflow-hidden rounded-full"
                style={{ height: 6, background: "var(--elevated)", margin: "9px 0 11px" }}
              >
                <div
                  className="h-full"
                  style={{
                    width: `${c.edhrecTotal > 0 ? Math.round(((c.edhrecOwnedCount ?? 0) / c.edhrecTotal) * 100) : 0}%`,
                    background: "var(--accent)",
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
                  style={{ fontSize: 10.5, color: "var(--fg-faint)", marginTop: 8 }}
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
              background: "var(--elevated-hover)",
              border: "1px solid var(--border-strong)",
              padding: "7px 11px",
            }}
          >
            <span
              className="font-mono"
              style={{ fontSize: 10, color: "var(--fg-locked)" }}
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
          borderTop: "1px solid var(--border-strong)",
          background: "var(--surface-rail)",
          padding: "12px 16px 24px",
        }}
      >
        <div className="flex flex-col flex-1">
          <span
            className="font-mono"
            style={{ fontSize: 10, color: "var(--fg-faint)" }}
          >
            {recommendationsCopy.build.stickyLabel}
          </span>
          <span style={{ fontSize: 12, color: "var(--fg-body)" }}>
            {recommendationsCopy.build.stickyPromise(String(FILL_BASELINE_TOTAL))}
          </span>
        </div>
        <PrimaryButton
          href={`/decks?commander=${c.oracleId}`}
          // brand focus-visible outline treatment inherited from globals.css
          className="text-[14px] p-[12px_20px] text-center whitespace-nowrap"
        >
          Build this deck →
        </PrimaryButton>
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
              color: "var(--fg-faint)",
              textDecoration: "none",
            }}
          >
            ‹ Back to rankings
          </Link>

          {/* Commander card frame — 63/88 aspect. Image when available;
              gradient is the fallback. */}
          <div
            className="rounded-[14px]"
            style={{
              aspectRatio: "63/88",
              background: c.imageUri ? undefined : gradient,
              backgroundImage: c.imageUri ? cssUrl(c.imageUri) : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
              boxShadow:
                "inset 0 0 0 1px rgba(0,0,0,0.3), 0 20px 50px rgba(0,0,0,0.5)",
            }}
          />

          {/* Name + type line, below the card rather than over it. The card
              scan prints both itself, but the desktop column needs a real
              heading — the other h1 in this file is the mobile header and is
              sm:hidden. */}
          <div className="flex flex-col gap-[2px]">
            <h1
              className="font-display font-[700] m-0"
              style={{ fontSize: 21, color: "var(--fg)", lineHeight: 1.15 }}
            >
              {c.name}
            </h1>
            <p className="m-0" style={{ fontSize: 12.5, color: "var(--fg-body)" }}>
              {c.typeLine}
            </p>
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
                    background: WUBRG_COLOR[color] ?? "var(--fg-faint)",
                    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.4)",
                  }}
                />
              ))}
              <span
                className="font-mono ml-[4px]"
                style={{ fontSize: 12, color: "var(--fg-faint)" }}
              >
                {c.colorIdentity.join("")}
              </span>
            </div>
          )}

          {/* Build this deck button */}
          <PrimaryButton
            href={`/decks?commander=${c.oracleId}`}
            // brand focus-visible outline treatment inherited from globals.css
            className="text-[15px] p-[14px_0] text-center block w-full"
          >
            Build this deck →
          </PrimaryButton>

          {/* Seed note */}
          <p
            className="m-0 font-mono text-center"
            style={{
              fontSize: 10.5,
              color: "var(--fg-locked)",
              textAlign: "center",
              lineHeight: 1.5,
            }}
          >
            {recommendationsCopy.build.seedNote(String(FILL_BASELINE_TOTAL))}
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
              style={{ fontSize: 20, color: "var(--fg)" }}
            >
              The Pool
            </h2>
            <p
              className="m-0 font-mono"
              style={{ fontSize: 12, color: "var(--fg-faint)" }}
            >
              {c.colorPoolSize} card{c.colorPoolSize === 1 ? "" : "s"} fit this
              identity
            </p>
            <p
              className="m-0"
              style={{
                fontSize: 13.5,
                color: "var(--fg-body)",
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
          <CoverageSection
            width="desktop"
            slug={c.slug}
            roleCards={c.roleCards}
            roleCounts={c.roleCounts}
            synergyState={c.synergyState}
            retryCoverageFigures={retryCoverageFigures}
          />

          {/* EDHREC Synergy section */}
          {c.fitSynergy !== null && c.edhrecTotal !== null ? (
            <div>
              <h2
                className="font-display font-[600] m-0"
                style={{ fontSize: 20, color: "var(--fg)" }}
              >
                EDHREC Synergy
              </h2>
              <p
                className="m-0 font-mono"
                style={{ fontSize: 12, color: "var(--fg-faint)" }}
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
                background: "var(--elevated-hover)",
                border: "1px solid var(--border-strong)",
                padding: "7px 11px",
                width: "fit-content",
              }}
            >
              <span
                className="font-mono"
                style={{ fontSize: 11, color: "var(--fg-faint)" }}
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
