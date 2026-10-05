"use client";
// CoverageSection — Role Coverage panel for the commander detail page (#131).
// Composes CoverageChip, CoverageRow, CoverageDisclosure from Task 6.
// One section owns the heading, sub-caption, note, retry, and all four role panels.

import { useState, useTransition, useId, type JSX } from "react";
import { useDiscardedScroll } from "../ui/scroll-reset";
import { useRouter } from "next/navigation";
import { CoverageChip, CoverageRow, CoverageDisclosure, COVERAGE_CAP, COVERAGE_EXPANDED_CAP } from "./coverage-chip";
import { explainedCopy } from "../../lib/copy/commander-explained";
import { KeyPip } from "../ui/ownership-dot";
import { drawsMarker } from "../../lib/decks/availability";
import {
  CoverageSortMenu,
  COVERAGE_SORT_LABELS,
  sortRoleCards,
  type CoverageSortKey,
} from "./coverage-sort";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import type { ProfileRoleTargets } from "../../lib/profile/types";
import { roleAnchorId, ROLE_ANCHOR_SCROLL_MARGIN } from "./role-anchor";
import { wholeTarget, type RoleCard, type RoleName } from "../../lib/recs/score";

type RoleOrder = readonly RoleName[];
const ROLE_ORDER: RoleOrder = ["ramp", "draw", "removal", "wipes"] as const;

const ROLE_LABELS: Record<RoleName, string> = {
  ramp: "Ramp",
  draw: "Card Draw",
  removal: "Removal",
  wipes: "Board Wipes",
};

// Sentence form. A heading label is a column title and reads as one ("Card
// Draw"), but dropped into "No {role} cards in your pool" it says the noun
// twice. The handoff writes that string as "No ramp cards in your pool", so
// prose takes this map and headings take ROLE_LABELS.
const ROLE_NOUNS: Record<RoleName, string> = {
  ramp: "ramp",
  draw: "draw",
  removal: "removal",
  wipes: "board wipe",
};

// ── The dot key ────────────────────────────────────────────────────────────────

/**
 * The key for the chip dots, drawn once above all four panels rather than as a
 * footnote under each.
 *
 * It reads every card in every role, not the chips a cap happens to be showing:
 * expanding a panel must not make a key appear, and a reader who scrolls past
 * one marked chip in the fourth panel needs the key that was above the first.
 *
 * Free is unconditional — every panel holding a card draws that dot, because
 * Role Coverage is built from the owned pool.
 */
function DotKey({
  roleCards,
  markerElsewhere,
  isDesktop,
}: {
  roleCards: Record<RoleName, RoleCard[]>;
  /**
   * Whether a marker is on screen OUTSIDE these four panels.
   *
   * THE INVARIANT IS THE SENTENCE, not the count: *no key asserts availability
   * while a marker is on screen.* `dotFree` says "Owned and available.", which
   * is a claim about the COMMANDER rather than about the list beneath the key —
   * and a page-level claim cannot be computed from a panel-level input.
   *
   * This read four panels when four panels were the whole surface. The synergy
   * panel made that definition stale: a commander whose only marked card was a
   * synergy row printed "Owned and available." here while a marker sat on screen
   * below, and the synergy panel's own key said "Owned." for the same dot.
   *
   * ONLY the outside half is passed in. The role panels' own half is computed
   * here, from the CURRENT cards — because a successful degraded-retry replaces
   * them, and a prop derived from the page's initial set would then show a
   * marker while the key still read `dotFree`. `router.refresh()` is
   * asynchronous, so the retried cards render before any new prop could arrive.
   *
   * The next panel to draw markers adds itself to the page's expression rather
   * than reopening this ruling.
   */
  markerElsewhere: boolean;
  isDesktop: boolean;
}): JSX.Element | null {
  const all = ROLE_ORDER.flatMap((role) => roleCards[role]);
  if (all.length === 0) return null;
  // The invariant, assembled: no key asserts availability while a marker is on
  // screen — here or anywhere else.
  const markerOnPage = markerElsewhere || all.some(drawsMarker);

  return (
    <p
      className="font-mono text-fg-locked m-0"
      style={{ fontSize: 10.5, marginTop: isDesktop ? 8 : 10, lineHeight: 1.4 }}
    >
      {/* One entry, two forms, picked by `markerOnPage` — an availability
          question, page-wide. A SOFT claim with no committed deck selects
          `dotOwned`, where the retired `committedTo` read would have left the
          free form standing over a panel already drawing a marker.

          Four of the five readings print glyph + number + word and legend
          themselves; the dot is the only mark here that is a colour with no word
          beside it, so it is the only thing left to key.

          The free form is kept BYTE-IDENTICAL rather than reworded. `Owned.` is
          the honest word for an ownership-only dot, but shipping it
          unconditionally would repaint a free player's page for no gain — and a
          player whose collection covers their decks seeing nothing changed is
          this round's one unusual constraint. */}
      <KeyPip owned />
      {markerOnPage
        ? explainedCopy.committed.dotOwned
        : explainedCopy.committed.dotFree}
    </p>
  );
}

// ── One role panel ─────────────────────────────────────────────────────────────

/**
 * A role group's head: its name, what the reader owns, and that count against the role's
 * baseline. One component for both panels, so the About page's role-coverage figure can mount
 * the page's own rather than a stand-in. At phone width the gap clause takes its own line,
 * because a role name, a count and a full sentence do not fit on one.
 */
export function RoleGroupHeader({
  layout,
  role,
  count,
  targets,
  listId,
}: {
  layout: "desktop" | "phone";
  role: RoleName;
  count: number;
  /** The commander's role targets and where they came from — the ones its fit score used. */
  targets: ProfileRoleTargets;
  listId: string;
}): JSX.Element {
  const gap = recommendationsCopy.coverage.gap(
    count,
    wholeTarget(targets.targets[role]),
    targets.of !== "flat",
  );
  const name = (
    <h3 id={`${listId}-name`} className="font-sans font-[600] m-0" style={{ fontSize: 15, color: "var(--fg)" }}>
      {ROLE_LABELS[role]}
    </h3>
  );
  if (layout === "desktop") {
    return (
      <div className="flex items-baseline gap-[12px]" style={{ marginBottom: 10 }}>
        {name}
        <span className="font-mono" style={{ fontSize: 12, color: "var(--success)" }}>
          {count} owned
        </span>
        <span data-role-gap={role} data-owned={count} className="font-mono" style={{ fontSize: 12, color: "var(--fg-faint)", marginLeft: "auto" }}>
          {gap}
        </span>
      </div>
    );
  }
  return (
    <>
      <div className="flex items-baseline gap-[10px]">
        {name}
        <span className="font-mono" style={{ fontSize: 11.5, color: "var(--success)" }}>
          {count} owned
        </span>
      </div>
      <p data-role-gap={role} data-owned={count} className="font-mono m-0" style={{ fontSize: 10.5, color: "var(--fg-faint)", marginBottom: 9 }}>
        {gap}
      </p>
    </>
  );
}

function RolePanelDesktop({
  role,
  cards,
  count,
  targets,
  showFigures,
  expanded,
  onToggle,
  listId,
}: {
  role: RoleName;
  cards: RoleCard[];
  count: number;
  targets: ProfileRoleTargets;
  showFigures: boolean;
  expanded: boolean;
  onToggle: () => void;
  listId: string;
}): JSX.Element {
  const cap = COVERAGE_CAP.desktop;
  const siblingIds = cards.map((c) => c.oracleId);
  const siblings = cards.map((c) => ({ oracleId: c.oracleId, name: c.name, imageUri: c.imageUri ?? null }));
  // The open list is a 320px scroll box, and closing it writes nothing to
  // `scrollTop` — so a role scrolled to its foot and closed reopened at its foot,
  // measured at offset 1752 either side of a close.
  //
  // Keyed on WHICH CARDS ARE IN THE BOX, as a string rather than as the array. An
  // offset means nothing once the rows under it have changed, and the rows change
  // two ways: the reader re-sorts, and the degraded RETRY replaces `roleCards`
  // wholesale with a set carrying figures — that second one moves neither
  // `expanded` nor the sort, so a list open at its foot kept an offset into rows
  // that no longer exist, possibly past the new end.
  //
  // The array itself cannot be the dependency. `sortRoleCards` returns a fresh one
  // for every order but the default, so an array never compares equal and the
  // effect fires on every render — which would drag a reader back to the top of
  // the list they were reading the moment any sibling role was toggled. The joined
  // ids compare by value: same cards in the same order, same string, no reset. It
  // subsumes the sort key, which reaches this only through the order it puts the
  // ids in.
  const listRef = useDiscardedScroll<HTMLUListElement>([expanded, siblingIds.join()]);
  const visible = expanded ? cards.slice(0, COVERAGE_EXPANDED_CAP) : cards.slice(0, cap);
  const hiddenCount = cards.length - cap; // > 0 means disclosure needed
  const beyondExpanded = cards.length > COVERAGE_EXPANDED_CAP
    ? cards.length - COVERAGE_EXPANDED_CAP
    : 0;

  return (
    <section
      id={roleAnchorId("desktop", role)}
      aria-labelledby={`${listId}-name`}
      className="rounded-[10px] target:outline target:outline-1 target:outline-[color:var(--accent-dim)]"
      style={{
        background: "var(--surface-rail)",
        border: "1px solid var(--border)",
        padding: "15px 18px",
        scrollMarginTop: ROLE_ANCHOR_SCROLL_MARGIN,
      }}
    >
      {/* Header row */}
      <RoleGroupHeader layout="desktop" role={role} count={count} targets={targets} listId={listId} />

      {/* Card chips */}
      {cards.length === 0 ? (
        <span id={listId} className="font-mono" style={{ fontSize: 11, color: "var(--fg-locked)" }}>
          No {ROLE_NOUNS[role]} cards in your pool
        </span>
      ) : (
        <>
          <ul
            ref={listRef}
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
                role={ROLE_NOUNS[role]}
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
  targets,
  showFigures,
  expanded,
  onToggle,
  listId,
}: {
  role: RoleName;
  cards: RoleCard[];
  count: number;
  targets: ProfileRoleTargets;
  showFigures: boolean;
  expanded: boolean;
  onToggle: () => void;
  listId: string;
}): JSX.Element {
  const cap = COVERAGE_CAP.phone;
  const siblingIds = cards.map((c) => c.oracleId);
  const siblings = cards.map((c) => ({ oracleId: c.oracleId, name: c.name, imageUri: c.imageUri ?? null }));
  // The open list is a 320px scroll box, and closing it writes nothing to
  // `scrollTop` — so a role scrolled to its foot and closed reopened at its foot,
  // measured at offset 1752 either side of a close.
  //
  // Keyed on WHICH CARDS ARE IN THE BOX, as a string rather than as the array. An
  // offset means nothing once the rows under it have changed, and the rows change
  // two ways: the reader re-sorts, and the degraded RETRY replaces `roleCards`
  // wholesale with a set carrying figures — that second one moves neither
  // `expanded` nor the sort, so a list open at its foot kept an offset into rows
  // that no longer exist, possibly past the new end.
  //
  // The array itself cannot be the dependency. `sortRoleCards` returns a fresh one
  // for every order but the default, so an array never compares equal and the
  // effect fires on every render — which would drag a reader back to the top of
  // the list they were reading the moment any sibling role was toggled. The joined
  // ids compare by value: same cards in the same order, same string, no reset. It
  // subsumes the sort key, which reaches this only through the order it puts the
  // ids in.
  const listRef = useDiscardedScroll<HTMLUListElement>([expanded, siblingIds.join()]);
  const visible = expanded ? cards.slice(0, COVERAGE_EXPANDED_CAP) : cards.slice(0, cap);
  const hiddenCount = cards.length - cap;
  const beyondExpanded = cards.length > COVERAGE_EXPANDED_CAP
    ? cards.length - COVERAGE_EXPANDED_CAP
    : 0;

  return (
    <section
      id={roleAnchorId("phone", role)}
      aria-labelledby={`${listId}-name`}
      className="rounded-[10px] target:outline target:outline-1 target:outline-[color:var(--accent-dim)]"
      style={{
        background: "var(--surface-rail)",
        border: "1px solid var(--border)",
        padding: "13px 14px",
        scrollMarginTop: ROLE_ANCHOR_SCROLL_MARGIN,
      }}
    >
      {/* Header — the gap clause takes its own line here, because at phone width
          a role name, a count and a full sentence do not fit on one. */}
      <RoleGroupHeader layout="phone" role={role} count={count} targets={targets} listId={listId} />

      {/* Rows */}
      <div
        className="flex flex-col gap-[8px]"
      >
        {cards.length === 0 ? (
          <span id={listId} className="font-mono" style={{ fontSize: 11, color: "var(--fg-locked)" }}>
            No {ROLE_NOUNS[role]} cards in your pool
          </span>
        ) : (
          <>
            <ul
              ref={listRef}
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
                role={ROLE_NOUNS[role]}
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
  slug: string;
  roleCards: Record<RoleName, RoleCard[]>;
  roleCounts: Record<RoleName, number>;
  /** The role targets the commander's fit score was graded against. Each group head reads them. */
  roleTargets: ProfileRoleTargets;
  synergyState: "ok" | "absent" | "degraded";
  /**
   * Whether a marker is on screen outside the role panels — see `DotKey`.
   *
   * REQUIRED, with no default: the key it feeds makes a claim about the
   * commander, and a default would let a caller quietly assert availability it
   * had not checked.
   */
  markerElsewhere: boolean;
  /**
   * The mode the page is drawing, handed to the retry so a successful one scores
   * against the same pool. Without it a free-mode retry silently returned the
   * all-owned panel while the URL still said free.
   */
  avail: "all" | "free";
  /** Injected by the page — server action that re-resolves EDHREC.
      Passed explicitly so tests can mock it without a server-action import. */
  retryCoverageFigures: (
    slug: string,
    avail: "all" | "free",
  ) => Promise<Record<RoleName, RoleCard[]> | null>;
};

export function CoverageSection({
  width,
  slug,
  roleCards: initialRoleCards,
  roleCounts,
  roleTargets,
  synergyState,
  markerElsewhere,
  avail,
  retryCoverageFigures,
}: CoverageSectionProps): JSX.Element {
  const router = useRouter();
  const [roleCards, setRoleCards] = useState<Record<RoleName, RoleCard[]>>(initialRoleCards);
  const [retrying, startRetry] = useTransition();
  const [expandedRoles, setExpandedRoles] = useState<Set<RoleName>>(new Set());

  // After a successful retry the section shows figures — treat as ok
  const [hasRetryData, setHasRetryData] = useState(false);
  const effectiveSynergyState =
    hasRetryData ? "ok" : synergyState;

  // "ok" means EDHREC answered with a card list, not that the list came with
  // numbers: inclusion figures arrive in a separate map and can be absent from a
  // payload that still names cards. The sub-caption promises figures and the
  // chips would draw a dash apiece, so the flag has to read the figures.
  const hasAnyFigure = Object.values(roleCards).some((cs) =>
    cs.some((c) => Number.isFinite(c.inclusionPct)),
  );
  const showFigures = effectiveSynergyState === "ok" && hasAnyFigure;

  // The note explains why the figures are missing, so a payload that names
  // cards but carries no numbers earns it too: that reads as "ok" and still
  // leaves the section without a percentage anywhere. A section with no cards
  // at all is exempt — there is nothing there a figure could have ranked.
  // Degraded has its own note and its own retry.
  const hasAnyCard = Object.values(roleCards).some((cs) => cs.length > 0);
  const showAbsentNote =
    effectiveSynergyState === "absent" ||
    (effectiveSynergyState === "ok" && hasAnyCard && !hasAnyFigure);

  // Sub-caption: with figures when ok, without otherwise
  const subcaption = showFigures
    ? recommendationsCopy.coverage.subcaption
    : recommendationsCopy.coverage.subcaptionNoFigures;

  const baseId = useId();
  const listId = (role: RoleName) => `${baseId}-${role}-list`;

  // Local to the visit and never mirrored into the URL: the sort is a way of
  // reading the four panels, not a thing to link someone to.
  const [sort, setSort] = useState<CoverageSortKey>("played");
  // Empty until the reader sorts, so the region says nothing on arrival.
  const [announcement, setAnnouncement] = useState("");

  function chooseSort(next: CoverageSortKey) {
    setSort(next);
    setAnnouncement(explainedCopy.coverageSort.announce(COVERAGE_SORT_LABELS[next]));
  }

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
        const result = await retryCoverageFigures(slug, avail);
        if (result !== null) {
          setRoleCards(result);
          setHasRetryData(true);
          // The section owns its own figures, but not the rest of the page. A
          // recovered EDHREC read also moves the score, the denominator, the
          // legend and the hero note, all of which are server-rendered from the
          // same compute this retry just repeated. Without the refresh the page
          // shows recovered chips beside a degraded headline.
          router.refresh();
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
    <div>
      {/* Heading. Desktop hangs the sort off the right of this row; at phone
          width it takes a full-width row of its own under the sub-caption. */}
      <div className="flex items-center gap-[12px]">
        <h2 className="font-display font-[600] m-0" style={{ fontSize: 20, color: "var(--fg)" }}>
          Role Coverage
        </h2>
        {isDesktop && (
          <div className="ml-auto">
            <CoverageSortMenu sort={sort} showFigures={showFigures} isDesktop onChange={chooseSort} />
          </div>
        )}
      </div>
      <p className="m-0 font-mono mt-[2px]" style={{ fontSize: 12, color: "var(--fg-faint)" }}>
        {subcaption}
      </p>
      <DotKey roleCards={roleCards} markerElsewhere={markerElsewhere} isDesktop={isDesktop} />
      {!isDesktop && (
        <div className="mt-[10px]">
          <CoverageSortMenu sort={sort} showFigures={showFigures} isDesktop={false} onChange={chooseSort} />
        </div>
      )}

      {/* This section's own live region. There is no shared one on this page,
          and the synergy panel's belongs to its pick state. */}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* Section-level note — absent or degraded */}
      {showAbsentNote && (
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
          // Sorted before the panel, so the cap slices the order on screen
          // rather than the order that arrived. `roleCounts` is untouched: the
          // count beside a panel is how many cards the role has, and reordering
          // a list does not change that.
          const cards = sortRoleCards(roleCards[role], sort);
          return isDesktop ? (
            <RolePanelDesktop
              key={role}
              role={role}
              cards={cards}
              count={roleCounts[role]}
              targets={roleTargets}
              showFigures={showFigures}
              expanded={expanded}
              onToggle={() => toggleRole(role)}
              listId={listId(role)}
            />
          ) : (
            <RolePanelPhone
              key={role}
              role={role}
              cards={cards}
              count={roleCounts[role]}
              targets={roleTargets}
              showFigures={showFigures}
              expanded={expanded}
              onToggle={() => toggleRole(role)}
              listId={listId(role)}
            />
          );
        })}
      </div>
    </div>
  );
}
