"use client";
// CoverageSection — Role Coverage panel for the commander detail page (#131).
// Composes CoverageChip, CoverageRow, CoverageDisclosure from Task 6.
// One section owns the heading, sub-caption, note, retry, and all four role panels.

import { useState, useTransition, useId, type JSX } from "react";
import { CardDetailProvider } from "../decks/card-detail-provider";
import { CoverageChip, CoverageRow, CoverageDisclosure, COVERAGE_CAP, COVERAGE_EXPANDED_CAP } from "./coverage-chip";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { ROLE_TARGETS } from "../../lib/recs/roles";
import type { RoleCard, RoleName } from "../../lib/recs/score";

type RoleOrder = readonly RoleName[];
const ROLE_ORDER: RoleOrder = ["ramp", "draw", "removal", "wipes"] as const;

const ROLE_LABELS: Record<RoleName, string> = {
  ramp: "Ramp",
  draw: "Card Draw",
  removal: "Removal",
  wipes: "Board Wipes",
};

// ── One role panel ─────────────────────────────────────────────────────────────

function RolePanelDesktop({
  role,
  cards,
  count,
  showFigures,
  expanded,
  onToggle,
  listId,
}: {
  role: RoleName;
  cards: RoleCard[];
  count: number;
  showFigures: boolean;
  expanded: boolean;
  onToggle: () => void;
  listId: string;
}): JSX.Element {
  const target = ROLE_TARGETS[role];
  const cap = COVERAGE_CAP.desktop;
  const siblings = cards.map((c) => c.oracleId);
  const visible = expanded ? cards.slice(0, COVERAGE_EXPANDED_CAP) : cards.slice(0, cap);
  const hiddenCount = cards.length - cap; // > 0 means disclosure needed
  const beyondExpanded = cards.length > COVERAGE_EXPANDED_CAP
    ? cards.length - COVERAGE_EXPANDED_CAP
    : 0;

  return (
    <section
      aria-labelledby={`${listId}-name`}
      className="rounded-[10px]"
      style={{
        background: "var(--surface-rail)",
        border: "1px solid var(--border)",
        padding: "15px 18px",
      }}
    >
      {/* Header row */}
      <div className="flex items-baseline gap-[12px]" style={{ marginBottom: 10 }}>
        <h3
          id={`${listId}-name`}
          className="font-sans font-[600] m-0"
          style={{ fontSize: 15, color: "var(--fg)" }}
        >
          {ROLE_LABELS[role]}
        </h3>
        <span className="font-mono" style={{ fontSize: 12, color: "var(--success)" }}>
          {count} owned
        </span>
        <span className="font-mono" style={{ fontSize: 12, color: "var(--fg-faint)", marginLeft: "auto" }}>
          {count > target
            ? `Well past the ${target}-source baseline`
            : count === target
              ? `At the ${target}-source baseline`
              : `${target - count} short of baseline`}
        </span>
      </div>

      {/* Card chips */}
      {cards.length === 0 ? (
        <span id={listId} className="font-mono" style={{ fontSize: 11, color: "var(--fg-locked)" }}>
          No {ROLE_LABELS[role].toLowerCase()} cards in your pool
        </span>
      ) : (
        <>
          <ul
            id={listId}
            className="flex flex-wrap gap-[7px] list-none m-0 p-0"
            style={expanded ? { maxHeight: 320, overflowY: "auto" } : undefined}
          >
            {visible.map((c) => (
              <li key={c.oracleId} className="contents">
                <CoverageChip card={c} siblings={siblings} showFigures={showFigures} />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-[7px] mt-[7px] empty:mt-0">
            {/* Beyond expansion cap: inert text, no hit box */}
            {expanded && beyondExpanded > 0 && (
              <span className="font-mono text-[11px] text-fg-faint self-center">
                {recommendationsCopy.coverage.beyondCap(String(beyondExpanded))}
              </span>
            )}
            {/* Disclosure chip — only when cards exceed the cap */}
            {hiddenCount > 0 && (
              <CoverageDisclosure
                width="desktop"
                total={cards.length}
                role={ROLE_LABELS[role].toLowerCase()}
                expanded={expanded}
                controls={listId}
                onToggle={onToggle}
              />
            )}
          </div>
          {/* §7 legend — only where a neighbouring chip actually prints a figure,
              so it never explains a dash that is not on screen. */}
          {showFigures && visible.some((c) => !Number.isFinite(c.inclusionPct)) && (
            <p className="font-mono text-[10px] text-fg-locked m-0 mt-[10px]">
              {recommendationsCopy.coverage.chipNoFigureLegend}
            </p>
          )}
        </>
      )}
    </section>
  );
}

function RolePanelPhone({
  role,
  cards,
  count,
  showFigures,
  expanded,
  onToggle,
  listId,
}: {
  role: RoleName;
  cards: RoleCard[];
  count: number;
  showFigures: boolean;
  expanded: boolean;
  onToggle: () => void;
  listId: string;
}): JSX.Element {
  const target = ROLE_TARGETS[role];
  const cap = COVERAGE_CAP.phone;
  const siblings = cards.map((c) => c.oracleId);
  const visible = expanded ? cards.slice(0, COVERAGE_EXPANDED_CAP) : cards.slice(0, cap);
  const hiddenCount = cards.length - cap;
  const beyondExpanded = cards.length > COVERAGE_EXPANDED_CAP
    ? cards.length - COVERAGE_EXPANDED_CAP
    : 0;

  return (
    <section
      aria-labelledby={`${listId}-name`}
      className="rounded-[10px]"
      style={{
        background: "var(--surface-rail)",
        border: "1px solid var(--border)",
        padding: "13px 14px",
      }}
    >
      {/* Header — the gap clause takes its own line here, because at phone width
          a role name, a count and a full sentence do not fit on one. */}
      <div className="flex items-baseline gap-[10px]">
        <h3
          id={`${listId}-name`}
          className="font-sans font-[600] m-0"
          style={{ fontSize: 15, color: "var(--fg)" }}
        >
          {ROLE_LABELS[role]}
        </h3>
        <span className="font-mono" style={{ fontSize: 11.5, color: "var(--success)" }}>
          {count} owned
        </span>
      </div>
      <p className="font-mono m-0" style={{ fontSize: 10.5, color: "var(--fg-faint)", marginBottom: 9 }}>
        {count > target
          ? `Well past the ${target}-source baseline`
          : count === target
            ? `At the ${target}-source baseline`
            : `${target - count} short of baseline`}
      </p>

      {/* Rows */}
      <div
        className="flex flex-col gap-[8px]"
      >
        {cards.length === 0 ? (
          <span id={listId} className="font-mono" style={{ fontSize: 11, color: "var(--fg-locked)" }}>
            No {ROLE_LABELS[role].toLowerCase()} cards in your pool
          </span>
        ) : (
          <>
            <ul
              id={listId}
              className="flex flex-col gap-[8px] list-none m-0 p-0"
              style={expanded ? { maxHeight: 320, overflowY: "auto" } : undefined}
            >
              {visible.map((c) => (
                <li key={c.oracleId}>
                  <CoverageRow card={c} siblings={siblings} showFigures={showFigures} />
                </li>
              ))}
            </ul>
            {expanded && beyondExpanded > 0 && (
              <span className="font-mono text-[12px] text-fg-faint text-center py-[10px]">
                {recommendationsCopy.coverage.beyondCap(String(beyondExpanded))}
              </span>
            )}
            {hiddenCount > 0 && (
              <CoverageDisclosure
                width="phone"
                total={cards.length}
                role={ROLE_LABELS[role].toLowerCase()}
                expanded={expanded}
                controls={listId}
                onToggle={onToggle}
              />
            )}
            {/* §7 legend — phone copy is the shorter of the two. */}
            {showFigures && visible.some((c) => !Number.isFinite(c.inclusionPct)) && (
              <p className="font-mono text-[10px] text-fg-locked m-0">
                {recommendationsCopy.coverage.chipNoFigureLegendMobile}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

// ── Main export ────────────────────────────────────────────────────────────────

export type CoverageSectionProps = {
  width: "desktop" | "phone";
  oracleId: string;
  slug: string;
  roleCards: Record<RoleName, RoleCard[]>;
  roleCounts: Record<RoleName, number>;
  synergyState: "ok" | "absent" | "degraded";
  /** Injected by the page — server action that re-resolves EDHREC.
      Passed explicitly so tests can mock it without a server-action import. */
  retryCoverageFigures: (slug: string) => Promise<Record<RoleName, RoleCard[]> | null>;
};

export function CoverageSection({
  width,
  slug,
  roleCards: initialRoleCards,
  roleCounts,
  synergyState,
  retryCoverageFigures,
}: CoverageSectionProps): JSX.Element {
  const [roleCards, setRoleCards] = useState<Record<RoleName, RoleCard[]>>(initialRoleCards);
  const [retrying, startRetry] = useTransition();
  const [expandedRoles, setExpandedRoles] = useState<Set<RoleName>>(new Set());

  // After a successful retry the section shows figures — treat as ok
  const [hasRetryData, setHasRetryData] = useState(false);
  const effectiveSynergyState =
    hasRetryData ? "ok" : synergyState;

  // showFigures iff ok (or after successful retry)
  const showFigures = effectiveSynergyState === "ok";

  // Sub-caption: with figures when ok, without otherwise
  const subcaption = showFigures
    ? recommendationsCopy.coverage.subcaption
    : recommendationsCopy.coverage.subcaptionNoFigures;

  const baseId = useId();
  const listId = (role: RoleName) => `${baseId}-${role}-list`;

  function toggleRole(role: RoleName) {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) {
        next.delete(role);
      } else {
        next.add(role);
      }
      return next;
    });
  }

  function handleRetry() {
    startRetry(async () => {
      try {
        const result = await retryCoverageFigures(slug);
        if (result !== null) {
          setRoleCards(result);
          setHasRetryData(true);
        }
        // On null: note stays, button re-enables (transition ends)
      } catch {
        // A rejected action is the same outcome as a null one — no figures.
        // Swallowing it keeps the degraded note and the Retry button on screen;
        // letting it escape the transition would reach an error boundary and
        // take the whole commander page down over a retry that can be retried.
      }
    });
  }

  const isDesktop = width === "desktop";

  return (
    <CardDetailProvider>
      <div>
      {/* Heading */}
      <h2 className="font-display font-[600] m-0" style={{ fontSize: 20, color: "var(--fg)" }}>
        Role Coverage
      </h2>
      <p className="m-0 font-mono mt-[2px]" style={{ fontSize: 12, color: "var(--fg-faint)" }}>
        {subcaption}
      </p>

      {/* Section-level note — absent or degraded */}
      {effectiveSynergyState === "absent" && (
        <div
          data-absent
          data-testid="coverage-note"
          className="flex items-start gap-[10px] rounded-[8px]"
          style={{
            background: "var(--elevated-hover)",
            border: "1px solid var(--border-strong)",
            // 2px, where degraded's is 3px: the weight of the rule is the only
            // thing separating a permanent absence from an outage at a glance.
            borderLeft: "2px solid var(--fg-faint)",
            padding: isDesktop ? "9px 13px" : "9px 12px",
            marginTop: isDesktop ? 14 : undefined,
            marginBottom: isDesktop ? undefined : 14,
            maxWidth: isDesktop ? 640 : undefined,
          }}
        >
          <span aria-hidden style={{ fontSize: isDesktop ? 13 : 12, color: "var(--fg-faint)" }}>
            ⚠
          </span>
          <div>
            <strong className="font-sans" style={{ fontSize: 13, color: "var(--fg-body)", fontWeight: 600 }}>
              {recommendationsCopy.coverage.absentHeading}
            </strong>
            <span style={{ fontSize: isDesktop ? 12.5 : 12, color: "var(--fg-muted)", lineHeight: 1.45 }}>
              {" — "}
              {isDesktop
                ? recommendationsCopy.coverage.absentBody
                : recommendationsCopy.coverage.absentBodyMobile}
            </span>
          </div>
        </div>
      )}

      {effectiveSynergyState === "degraded" && (
        <div
          data-degraded
          data-testid="coverage-note"
          className={isDesktop ? "rounded-[9px]" : "rounded-[8px]"}
          style={{
            background: "var(--surface-sunken)",
            border: "1px solid var(--border)",
            borderLeft: "3px solid var(--warning)",
            padding: isDesktop ? "11px 15px" : "10px 12px",
            marginTop: 14,
            maxWidth: isDesktop ? 700 : undefined,
          }}
        >
          {isDesktop ? (
            // Desktop: note text + retry inline
            <div className="flex items-center gap-[12px]">
              <div style={{ flex: 1 }}>
                <strong className="font-sans" style={{ fontSize: 13, color: "var(--fg-body)", fontWeight: 600 }}>
                  {recommendationsCopy.coverage.degradedHeading}
                </strong>
                <span style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45 }}>
                  {" — "}
                  {recommendationsCopy.coverage.degradedBody}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                aria-busy={retrying}
                aria-label={recommendationsCopy.coverage.degradedRetryAria}
                className="bg-transparent border-0 p-0 font-semibold text-accent shrink-0"
                style={{
                  fontSize: 12.5,
                  borderBottom: "1px solid var(--accent-shadow)",
                  cursor: retrying ? "default" : "pointer",
                  opacity: retrying ? 0.55 : undefined,
                }}
              >
                {recommendationsCopy.coverage.degradedRetry}
              </button>
            </div>
          ) : (
            // Phone: note, then retry on its own 44px line below
            <>
              <div>
                <strong className="font-sans" style={{ fontSize: 13, color: "var(--fg-body)", fontWeight: 600 }}>
                  {recommendationsCopy.coverage.degradedHeading}
                </strong>
                <span style={{ fontSize: 12.5, color: "var(--fg-muted)", lineHeight: 1.45 }}>
                  {" — "}
                  {recommendationsCopy.coverage.degradedBody}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                aria-busy={retrying}
                aria-label={recommendationsCopy.coverage.degradedRetryAria}
                className="bg-transparent border-0 flex items-center font-semibold text-accent"
                style={{
                  fontSize: 13,
                  borderBottom: "1px solid var(--accent-shadow)",
                  cursor: retrying ? "default" : "pointer",
                  opacity: retrying ? 0.55 : undefined,
                  minHeight: 44,
                  marginTop: 2,
                  paddingLeft: 20,
                }}
              >
                {recommendationsCopy.coverage.degradedRetry}
              </button>
            </>
          )}
        </div>
      )}

      {/* Role panels */}
      <div className="flex flex-col gap-[12px] mt-[16px]">
        {ROLE_ORDER.map((role) => {
          const expanded = expandedRoles.has(role);
          return isDesktop ? (
            <RolePanelDesktop
              key={role}
              role={role}
              cards={roleCards[role]}
              count={roleCounts[role]}
              showFigures={showFigures}
              expanded={expanded}
              onToggle={() => toggleRole(role)}
              listId={listId(role)}
            />
          ) : (
            <RolePanelPhone
              key={role}
              role={role}
              cards={roleCards[role]}
              count={roleCounts[role]}
              showFigures={showFigures}
              expanded={expanded}
              onToggle={() => toggleRole(role)}
              listId={listId(role)}
            />
          );
        })}
      </div>
      </div>
    </CardDetailProvider>
  );
}
