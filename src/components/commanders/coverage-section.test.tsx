// CoverageSection — tests for Task 7 (#131).
// Covers: sub-caption branching, absent vs degraded notes, retry flow,
// and every edge count at both widths.

import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import { CardDetailProvider } from "../cards/card-detail-provider";

// A recovered retry moves the score, the legend and the hero note, none of which
// this section owns — so it refreshes the route rather than trying to.
const refresh = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const { CoverageSection, RoleGroupHeader } = await import("./coverage-section");
import type { RoleCard } from "../../lib/recs/score";
import type { RoleName } from "../../lib/recs/score";
import { explainedCopy } from "../../lib/copy/commander-explained";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { avail } from "./availability-fixture";
import type { ProfileRoleTargets } from "../../lib/profile/types";
import { ROLE_TARGETS } from "../../lib/recs/roles";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeCard(n: number, pct: number | null = 50): RoleCard {
  return {
    oracleId: `oracle-${n}`,
    name: `Card ${n}`,
    inclusionPct: pct,
    committedTo: null,
    availability: null,
  };
}

function makeCards(count: number, pct: number | null = 50): RoleCard[] {
  return Array.from({ length: count }, (_, i) => makeCard(i + 1, pct));
}

const EMPTY_ROLE_CARDS: Record<RoleName, RoleCard[]> = {
  ramp: [], draw: [], removal: [], wipes: [],
};

const BASE_ROLE_COUNTS: Record<RoleName, number> = {
  ramp: 0, draw: 0, removal: 0, wipes: 0,
};

/** The fallback, which is what every case written before 5.4b was measured against. */
const FLAT_TARGETS: ProfileRoleTargets = { of: "flat", targets: { ...ROLE_TARGETS } };

function renderSection(
  overrides: {
    width?: "desktop" | "phone";
    roleCards?: Record<RoleName, RoleCard[]>;
    roleCounts?: Record<RoleName, number>;
    roleTargets?: ProfileRoleTargets;
    synergyState?: "ok" | "absent" | "degraded";
    markerElsewhere?: boolean;
    avail?: "all" | "free";
    retryCoverageFigures?: (slug: string, avail: "all" | "free") => Promise<Record<RoleName, RoleCard[]> | null>;
  } = {},
) {
  const fetchCard = vi.fn<(id: string) => Promise<BrowseCard | null>>().mockResolvedValue(null);
  const {
    width = "desktop",
    roleCards = EMPTY_ROLE_CARDS,
    roleCounts = BASE_ROLE_COUNTS,
    roleTargets = FLAT_TARGETS,
    synergyState = "ok",
    // Defaults to what the ROLE panels alone would say, which is what this
    // condition used to read — so every case written before the key went
    // page-wide keeps its meaning. The cases that prove the new behaviour pass
    // it explicitly.
    markerElsewhere = false,
    avail = "all",
    retryCoverageFigures = vi.fn<(slug: string, avail: "all" | "free") => Promise<Record<RoleName, RoleCard[]> | null>>().mockResolvedValue(null),
  } = overrides;

  render(
    <CardDetailProvider fetchCard={fetchCard}>
      <CoverageSection
        width={width}
        slug="commander-slug"
        roleCards={roleCards}
        roleCounts={roleCounts}
        roleTargets={roleTargets}
        synergyState={synergyState}
        avail={avail}
        retryCoverageFigures={retryCoverageFigures}
       markerElsewhere={markerElsewhere}/>
    </CardDetailProvider>,
  );
}

// ── Sub-caption ────────────────────────────────────────────────────────────────

describe("sub-caption", () => {
  it("shows subcaption with figures when any card has a finite inclusionPct", () => {
    renderSection({
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: [makeCard(1, 75)] },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 1 },
      synergyState: "ok",
    });
    expect(
      screen.getByText(recommendationsCopy.coverage.subcaption),
    ).toBeInTheDocument();
  });

  // "ok" only means EDHREC named some cards. The figures arrive separately and
  // can be missing from a payload that still has a card list, and the subcaption
  // would then promise numbers over a column of dashes.
  it("shows subcaptionNoFigures when ok brought cards but no figures", () => {
    renderSection({
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(3, null) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 3 },
      synergyState: "ok",
    });
    expect(
      screen.getByText(recommendationsCopy.coverage.subcaptionNoFigures),
    ).toBeInTheDocument();
    expect(screen.queryByText(recommendationsCopy.coverage.subcaption)).toBeNull();
  });

  it("shows subcaptionNoFigures when synergyState is absent", () => {
    renderSection({
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: [makeCard(1, null)] },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 1 },
      synergyState: "absent",
    });
    expect(
      screen.getByText(recommendationsCopy.coverage.subcaptionNoFigures),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(recommendationsCopy.coverage.subcaption),
    ).toBeNull();
  });

  it("shows subcaptionNoFigures when synergyState is degraded (retry will fix)", () => {
    renderSection({
      roleCards: { ...EMPTY_ROLE_CARDS },
      roleCounts: BASE_ROLE_COUNTS,
      synergyState: "degraded",
    });
    expect(
      screen.getByText(recommendationsCopy.coverage.subcaptionNoFigures),
    ).toBeInTheDocument();
  });
});

// ── Absent vs Degraded notes ───────────────────────────────────────────────────

describe("absent vs degraded note rendering", () => {
  it("renders the absent heading and body for synergyState=absent", () => {
    renderSection({ synergyState: "absent" });
    expect(
      screen.getByText(recommendationsCopy.coverage.absentHeading),
    ).toBeInTheDocument();
  });

  it("renders the degraded heading and body for synergyState=degraded", () => {
    renderSection({ synergyState: "degraded" });
    expect(
      screen.getByText(recommendationsCopy.coverage.degradedHeading),
    ).toBeInTheDocument();
  });

  it("absent note has a faint left rule (not warning)", () => {
    renderSection({ synergyState: "absent" });
    // The absent note uses --fg-faint border
    const heading = screen.getByText(recommendationsCopy.coverage.absentHeading);
    // Navigate up to find the note container
    const note = heading.closest("[data-testid='coverage-note']") ?? heading.parentElement;
    expect(note).toBeTruthy();
    // The absent note container should carry data-absent attribute
    const absentEl = document.querySelector("[data-absent]");
    expect(absentEl).toBeTruthy();
  });

  it("degraded note has a warning left rule (not faint)", () => {
    renderSection({ synergyState: "degraded" });
    const heading = screen.getByText(recommendationsCopy.coverage.degradedHeading);
    const note = heading.closest("[data-testid='coverage-note']") ?? heading.parentElement;
    expect(note).toBeTruthy();
    const degradedEl = document.querySelector("[data-degraded]");
    expect(degradedEl).toBeTruthy();
  });

  // EDHREC can name cards without carrying a number for any of them, which
  // reads as "ok" and hides every percentage. Without the note the reader is
  // left with figures removed and no explanation for it.
  it("renders the absent note when ok but no card carries a figure", () => {
    renderSection({
      synergyState: "ok",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: [makeCard(1, null)] },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 1 },
    });
    expect(
      screen.getByText(recommendationsCopy.coverage.absentHeading),
    ).toBeInTheDocument();
  });

  // Nothing there a figure could have ranked — the note would be noise.
  it("renders no note when ok with no cards at all", () => {
    renderSection({ synergyState: "ok" });
    expect(
      screen.queryByText(recommendationsCopy.coverage.absentHeading),
    ).toBeNull();
  });

  it("renders no note when synergyState is ok", () => {
    renderSection({
      synergyState: "ok",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: [makeCard(1, 75)] },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 1 },
    });
    expect(
      screen.queryByText(recommendationsCopy.coverage.absentHeading),
    ).toBeNull();
    expect(
      screen.queryByText(recommendationsCopy.coverage.degradedHeading),
    ).toBeNull();
  });

  it("renders retry button only for degraded, not absent", () => {
    const { rerender } = render(
      <CardDetailProvider fetchCard={vi.fn<(id: string) => Promise<BrowseCard | null>>().mockResolvedValue(null)}>
        <CoverageSection
          width="desktop"
          slug="commander-slug"
          roleCards={EMPTY_ROLE_CARDS}
          roleCounts={BASE_ROLE_COUNTS}
          roleTargets={FLAT_TARGETS}
          synergyState="degraded"
          avail="all"
          retryCoverageFigures={vi.fn<() => Promise<Record<RoleName, RoleCard[]> | null>>().mockResolvedValue(null)}
          markerElsewhere={false}
        />
      </CardDetailProvider>,
    );
    expect(
      screen.getByRole("button", { name: recommendationsCopy.coverage.degradedRetryAria }),
    ).toBeInTheDocument();

    // Rerender with absent — no retry
    rerender(
      <CardDetailProvider fetchCard={vi.fn<(id: string) => Promise<BrowseCard | null>>().mockResolvedValue(null)}>
        <CoverageSection
          width="desktop"
          slug="commander-slug"
          roleCards={EMPTY_ROLE_CARDS}
          roleCounts={BASE_ROLE_COUNTS}
          roleTargets={FLAT_TARGETS}
          synergyState="absent"
          avail="all"
          retryCoverageFigures={vi.fn<() => Promise<Record<RoleName, RoleCard[]> | null>>().mockResolvedValue(null)}
          markerElsewhere={false}
        />
      </CardDetailProvider>,
    );
    expect(
      screen.queryByRole("button", { name: recommendationsCopy.coverage.degradedRetryAria }),
    ).toBeNull();
  });
});

// ── Retry flow ─────────────────────────────────────────────────────────────────

describe("retry flow", () => {
  beforeEach(() => refresh.mockClear());

  it("calls retryCoverageFigures once on click and updates figures on success", async () => {
    const newCards: Record<RoleName, RoleCard[]> = {
      ramp: [makeCard(1, 80)],
      draw: [],
      removal: [],
      wipes: [],
    };
    const retryCoverageFigures = vi.fn<() => Promise<Record<RoleName, RoleCard[]> | null>>().mockResolvedValue(newCards);

    renderSection({ synergyState: "degraded", retryCoverageFigures });

    const btn = screen.getByRole("button", {
      name: recommendationsCopy.coverage.degradedRetryAria,
    });
    fireEvent.click(btn);

    // Button goes busy
    expect(btn).toHaveAttribute("aria-busy", "true");

    await waitFor(() => {
      expect(retryCoverageFigures).toHaveBeenCalledTimes(1);
    });

    // After success, the section should show the figure from the new cards
    await waitFor(() => {
      expect(screen.getByText("80%")).toBeInTheDocument();
    });

    // The rest of the page — score, denominator, legend, hero note — is server
    // rendered from the same compute the retry just repeated, so a recovered
    // section without this refresh sits beside a degraded headline.
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("leaves the route alone when the retry fails", async () => {
    const retryCoverageFigures = vi
      .fn<() => Promise<Record<RoleName, RoleCard[]> | null>>()
      .mockResolvedValue(null);

    renderSection({ synergyState: "degraded", retryCoverageFigures });
    fireEvent.click(
      screen.getByRole("button", { name: recommendationsCopy.coverage.degradedRetryAria }),
    );

    await waitFor(() => expect(retryCoverageFigures).toHaveBeenCalledTimes(1));
    expect(refresh).not.toHaveBeenCalled();
  });

  it("retry stays available after a failure (action returns null)", async () => {
    const retryCoverageFigures = vi.fn<() => Promise<Record<RoleName, RoleCard[]> | null>>().mockResolvedValue(null);

    renderSection({ synergyState: "degraded", retryCoverageFigures });

    const btn = screen.getByRole("button", {
      name: recommendationsCopy.coverage.degradedRetryAria,
    });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(retryCoverageFigures).toHaveBeenCalledTimes(1);
    });

    // After failure, the retry button should still be available
    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: recommendationsCopy.coverage.degradedRetryAria,
        }),
      ).not.toBeDisabled();
    });
  });

  it("retry stays available when the action rejects", async () => {
    // A rejected server action is the same outcome as a null one — no figures.
    // If the rejection escapes the transition it reaches an error boundary and
    // the whole commander page goes down over a retry the player could repeat.
    const retryCoverageFigures = vi.fn<() => Promise<Record<RoleName, RoleCard[]> | null>>()
      .mockRejectedValue(new Error("network"));

    renderSection({ synergyState: "degraded", retryCoverageFigures });

    fireEvent.click(
      screen.getByRole("button", { name: recommendationsCopy.coverage.degradedRetryAria }),
    );

    await waitFor(() => {
      expect(retryCoverageFigures).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: recommendationsCopy.coverage.degradedRetryAria,
        }),
      ).not.toBeDisabled();
    });
    expect(screen.getByText(recommendationsCopy.coverage.degradedHeading)).toBeInTheDocument();
  });

  it("retry button is disabled with opacity and aria-busy during retrying", async () => {
    let resolve!: (val: Record<RoleName, RoleCard[]> | null) => void;
    const retryCoverageFigures = vi.fn<() => Promise<Record<RoleName, RoleCard[]> | null>>().mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );

    renderSection({ synergyState: "degraded", retryCoverageFigures });

    const btn = screen.getByRole("button", {
      name: recommendationsCopy.coverage.degradedRetryAria,
    });
    fireEvent.click(btn);

    // While pending
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toBeDisabled();

    resolve(null);
    await waitFor(() => {
      expect(btn).not.toHaveAttribute("aria-busy", "true");
    });
  });
});

// ── Edge counts ────────────────────────────────────────────────────────────────

// The brief specifies: desktop cap=12, phone cap=6, expanded cap=40.
// 0 → no disclosure; 1-6 → all, no disclosure (both widths);
// 7-12 → desktop shows all, no disclosure; phone shows 6 + disclosure
// 13-40 → capped + disclosure at both widths
// 41+ → capped; expanded shows 40 + inert beyondCap text

describe("edge count: 0 cards", () => {
  it("desktop: renders 'No ramp cards in your pool' and no disclosure", () => {
    renderSection({
      width: "desktop",
      roleCards: EMPTY_ROLE_CARDS,
      roleCounts: BASE_ROLE_COUNTS,
    });
    // The sentence takes the role noun, not the column heading — "Card Draw"
    // would read "No card draw cards in your pool".
    expect(screen.getByText("No ramp cards in your pool")).toBeInTheDocument();
    expect(screen.getByText("No draw cards in your pool")).toBeInTheDocument();
    expect(screen.getByText("No board wipe cards in your pool")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show all/i })).toBeNull();
  });

  it("phone: renders empty message and no disclosure", () => {
    renderSection({
      width: "phone",
      roleCards: EMPTY_ROLE_CARDS,
      roleCounts: BASE_ROLE_COUNTS,
    });
    expect(screen.getAllByText(/No .+ cards in your pool/)).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: /Show all/i })).toBeNull();
  });
});

describe("edge count: 1-6 cards (both widths, no disclosure)", () => {
  it("desktop: 5 ramp cards, no disclosure", () => {
    renderSection({
      width: "desktop",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(5) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 5 },
    });
    expect(screen.getAllByText(/Card \d+/).length).toBeGreaterThanOrEqual(5);
    expect(screen.queryByRole("button", { name: /Show all/i })).toBeNull();
  });

  it("phone: 5 ramp cards, no disclosure", () => {
    renderSection({
      width: "phone",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(5) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 5 },
    });
    // 5 <= phone cap(6), so no disclosure
    expect(screen.queryByRole("button", { name: /Show all/i })).toBeNull();
  });

  it("phone: exactly 6 cards, no disclosure", () => {
    renderSection({
      width: "phone",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(6) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 6 },
    });
    expect(screen.queryByRole("button", { name: /Show all/i })).toBeNull();
  });
});

describe("edge count: 7-12 cards", () => {
  it("desktop: 10 ramp cards, shows all, no disclosure", () => {
    renderSection({
      width: "desktop",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(10) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 10 },
    });
    // 10 <= desktop cap(12), no disclosure
    expect(screen.queryByRole("button", { name: /Show all/i })).toBeNull();
  });

  it("phone: 10 ramp cards, shows 6 plus Show all disclosure", () => {
    renderSection({
      width: "phone",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(10) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 10 },
    });
    // phone cap=6; 10 > 6, so show disclosure
    expect(
      screen.getByRole("button", { name: /Show all 10 ramp cards/i }),
    ).toBeInTheDocument();
  });

  it("desktop: 12 ramp cards (at cap), no disclosure", () => {
    renderSection({
      width: "desktop",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(12) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 12 },
    });
    expect(screen.queryByRole("button", { name: /Show all/i })).toBeNull();
  });
});

describe("edge count: 13-40 cards (both widths capped + disclosure)", () => {
  it("desktop: 20 ramp cards, shows 12 plus '+8 more' disclosure", () => {
    renderSection({
      width: "desktop",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(20) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 20 },
    });
    // Visible label is "+8 more"; the accessible name spells the role out.
    expect(screen.getByText(/\+8 more/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Show all 20 ramp cards/i }),
    ).toBeInTheDocument();
  });

  it("phone: 20 ramp cards, shows 6 plus 'Show all 20' disclosure", () => {
    renderSection({
      width: "phone",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(20) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 20 },
    });
    expect(
      screen.getByRole("button", { name: /Show all 20 ramp cards/i }),
    ).toBeInTheDocument();
  });

  it("desktop: expanding shows all 20 and 'Show fewer'", async () => {
    renderSection({
      width: "desktop",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(20) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 20 },
    });
    const disclosureBtn = screen.getByRole("button", { name: /Show all 20 ramp cards/i });
    fireEvent.click(disclosureBtn);
    await waitFor(() => {
      expect(screen.getByText("Show fewer")).toBeInTheDocument();
    });
  });
});

// ── Degraded pool order ────────────────────────────────────────────────────────
// When EDHREC is unreachable scoreCommander deliberately skips its sort and
// leaves cards in pool order, so an alphabetical list is never shown as if it
// were an authored ranking. The component must not re-sort.

describe("degraded state preserves pool order", () => {
  it("renders ramp cards in pool order, not alphabetical order", () => {
    // Pool order: Zombie Infestation, Mana Vault, Swords to Plowshares
    // Alphabetical order: Mana Vault, Swords to Plowshares, Zombie Infestation
    // The two orderings differ, so a sort introduced by the component is detectable.
    const poolOrderedCards: RoleCard[] = [
      { oracleId: "oracle-z", name: "Zombie Infestation", inclusionPct: null, committedTo: null, availability: null },
      { oracleId: "oracle-m", name: "Mana Vault", inclusionPct: null, committedTo: null, availability: null },
      { oracleId: "oracle-s", name: "Swords to Plowshares", inclusionPct: null, committedTo: null, availability: null },
    ];

    renderSection({
      width: "desktop",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: poolOrderedCards },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 3 },
      synergyState: "degraded",
    });

    // All three names must appear
    expect(screen.getByText("Zombie Infestation")).toBeInTheDocument();
    expect(screen.getByText("Mana Vault")).toBeInTheDocument();
    expect(screen.getByText("Swords to Plowshares")).toBeInTheDocument();

    // Assert pool order: Zombie Infestation must appear before Mana Vault,
    // which must appear before Swords to Plowshares — the opposite of alphabetical.
    const allChipNames = screen
      .getAllByText(/Zombie Infestation|Mana Vault|Swords to Plowshares/)
      .map((el) => el.textContent ?? "");

    const zombieIdx = allChipNames.indexOf("Zombie Infestation");
    const manaIdx = allChipNames.indexOf("Mana Vault");
    const swordsIdx = allChipNames.indexOf("Swords to Plowshares");

    expect(zombieIdx).toBeLessThan(manaIdx);
    expect(manaIdx).toBeLessThan(swordsIdx);
  });
});

describe("edge count: 41+ cards (beyond expansion cap)", () => {
  it("desktop: 45 cards, collapsed shows 12 plus '+33 more' disclosure", () => {
    renderSection({
      width: "desktop",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(45) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 45 },
    });
    expect(screen.getByText(/\+33 more/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Show 40 of 45 ramp cards/i }),
    ).toBeInTheDocument();
  });

  it("desktop: 45 cards, expanded shows 40 cards plus inert '+5 more not shown' text", async () => {
    renderSection({
      width: "desktop",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(45) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 45 },
    });
    const disclosureBtn = screen.getByRole("button", { name: /Show 40 of 45 ramp cards/i });
    fireEvent.click(disclosureBtn);
    await waitFor(() => {
      expect(
        screen.getByText(recommendationsCopy.coverage.beyondCap("5")),
      ).toBeInTheDocument();
    });
    // The beyondCap text should not be a button
    const beyondEl = screen.getByText(recommendationsCopy.coverage.beyondCap("5"));
    expect(beyondEl.tagName).not.toBe("BUTTON");
  });

  it("phone: 45 cards, collapsed shows Show all 45 disclosure", () => {
    renderSection({
      width: "phone",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(45) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 45 },
    });
    expect(
      screen.getByRole("button", { name: /Show 40 of 45 ramp cards/i }),
    ).toBeInTheDocument();
  });

  it("phone: 45 cards, expanded shows 40 cards and '+5 more not shown' text", async () => {
    renderSection({
      width: "phone",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(45) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 45 },
    });
    const disclosureBtn = screen.getByRole("button", { name: /Show 40 of 45 ramp cards/i });
    fireEvent.click(disclosureBtn);
    await waitFor(() => {
      expect(
        screen.getByText(recommendationsCopy.coverage.beyondCap("5")),
      ).toBeInTheDocument();
    });
  });
});

describe("the dot key", () => {
  // A card with something to say. The deck name is gone from the signature: the
  // key is a statement about the DOT, and the dot no longer knows which deck.
  const committed = (n: number): RoleCard => ({ ...makeCard(n), availability: avail("hard") });
  // One entry, two forms. `KEY` is the form drawn once any marker is on screen.
  const KEY = explainedCopy.committed.dotOwned;

  // One key above four panels, not one footnote under each.
  it("draws the key once for the whole section", () => {
    const cards = [committed(1), ...makeCards(3).slice(1)];
    renderSection({
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: cards, draw: cards },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 3, draw: 3 },
    });
    expect(screen.getAllByText(KEY)).toHaveLength(1);
  });

  // The key sits above every panel, so it reads every card rather than the ones
  // a cap happens to be showing — otherwise expanding a panel adds a key entry.
  it("takes the marker form for a card the resting cap is hiding", () => {
    const cards = [...makeCards(19).slice(1), committed(20)];
    renderSection({ roleCards: { ...EMPTY_ROLE_CARDS, ramp: cards }, roleCounts: { ...BASE_ROLE_COUNTS, ramp: 20 } });
    expect(screen.queryByRole("button", { name: /View details for Card 20/ })).toBeNull();
    expect(screen.getByText(KEY)).toBeInTheDocument();
  });

  // The free form, byte-identical to what shipped. This is the round's one
  // unusual constraint: a player whose collection covers their decks must see
  // nothing changed, and this key is the sentence that would give it away.
  it("keeps the shipped free string when no card draws a marker", () => {
    renderSection({ roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(3) }, roleCounts: { ...BASE_ROLE_COUNTS, ramp: 3 } });
    expect(screen.getByText("Owned and available.")).toBeInTheDocument();
    expect(screen.queryByText(explainedCopy.committed.dotOwned)).toBeNull();
  });

  // ── THE INVARIANT, stated as a sentence ────────────────────────────────
  //
  // *No key asserts availability while a marker is on screen.*
  //
  // Written this way on Design's instruction, and the wording is the reason:
  // `dotFree` says "Owned and available.", which is a claim about the COMMANDER
  // rather than about the list beneath the key — so it cannot be computed from
  // one panel's cards. A test that counted the role panels would pass the day a
  // third panel starts drawing markers, which is exactly how this broke: the
  // condition was written when four panels were the whole surface.
  it("never asserts availability while a marker is on screen elsewhere", () => {
    // Role Coverage itself is entirely free — every card here has a spare copy —
    // so the panel-level answer is "no marker" and the retired condition would
    // have printed the availability claim.
    renderSection({
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(3) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 3 },
      markerElsewhere: true, // ...but something on the page is marked.
    });
    expect(screen.getByText(explainedCopy.committed.dotOwned)).toBeInTheDocument();
    expect(screen.queryByText("Owned and available.")).toBeNull();
  });

  // The other half of the same sentence: with nothing marked anywhere, the
  // claim is true and the shipped string stands byte for byte.
  it("keeps the availability claim when no marker is on screen at all", () => {
    renderSection({
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(3) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 3 },
      markerElsewhere: false,
    });
    expect(screen.getByText("Owned and available.")).toBeInTheDocument();
  });

  // A soft claim is a marker too, so the key moves for it. Under the old
  // `anyCommitted` read this case drew the free string over a panel with a
  // marker on it.
  it("takes the marker form for a soft claim, not only a hard one", () => {
    const cards = [{ ...makeCard(1), availability: avail("soft") }, ...makeCards(3).slice(1)];
    renderSection({ roleCards: { ...EMPTY_ROLE_CARDS, ramp: cards }, roleCounts: { ...BASE_ROLE_COUNTS, ramp: 3 } });
    expect(screen.getByText(explainedCopy.committed.dotOwned)).toBeInTheDocument();
  });

  it("draws no key at all when the section has no cards", () => {
    renderSection({ roleCards: EMPTY_ROLE_CARDS, roleCounts: { ...BASE_ROLE_COUNTS, ramp: 0 } });
    expect(screen.queryByText(explainedCopy.committed.dotFree)).toBeNull();
  });

  it("draws the same key at phone width", () => {
    const cards = [committed(1), ...makeCards(3).slice(1)];
    renderSection({ width: "phone", roleCards: { ...EMPTY_ROLE_CARDS, ramp: cards }, roleCounts: { ...BASE_ROLE_COUNTS, ramp: 3 } });
    expect(screen.getByText(KEY)).toBeInTheDocument();
  });
});

describe("the Role Coverage sort", () => {
  const committed = (n: number): RoleCard => ({ ...makeCard(n), availability: avail("hard") });

  const chooseAvailability = () => {
    fireEvent.click(screen.getByRole("button", { name: explainedCopy.coverageSort.triggerAria }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Availability/ }));
  };

  it("reorders the chips inside every panel from one control", () => {
    const cards = [committed(1), makeCard(2)];
    renderSection({
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: cards, draw: cards },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 2, draw: 2 },
    });
    chooseAvailability();
    const names = screen
      .getAllByRole("button", { name: /View details for Card/ })
      .map((b) => b.getAttribute("aria-label")?.slice(0, 24));
    expect(names).toEqual([
      "View details for Card 2.",
      "View details for Card 1.",
      "View details for Card 2.",
      "View details for Card 1.",
    ]);
  });

  // The cap slices the order on screen, so sorting can pull a card into view
  // that the shipped order had hidden — and push one out.
  it("slices the cap after the sort, not before it", () => {
    const cards = [...makeCards(12).map((c) => ({ ...c, availability: avail("hard") })), makeCard(13)];
    renderSection({
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: cards },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 13 },
    });
    expect(screen.queryByRole("button", { name: /View details for Card 13/ })).toBeNull();
    chooseAvailability();
    expect(screen.getByRole("button", { name: /View details for Card 13/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /View details for Card 12\./ })).toBeNull();
  });

  it("leaves the owned count alone — a reorder is not a recount", () => {
    renderSection({
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: [committed(1), makeCard(2)] },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 2 },
    });
    chooseAvailability();
    expect(screen.getByText("2 owned")).toBeInTheDocument();
  });

  it("announces the new order in the section's own live region", () => {
    renderSection({
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: [committed(1), makeCard(2)] },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 2 },
    });
    const region = document.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(region.textContent).toBe("");
    chooseAvailability();
    expect(region.textContent).toBe(explainedCopy.coverageSort.announce("Availability"));
  });
});

// ── The retry is told which pool the page is drawing ───────────────────────
//
// The action half of this is tested in `coverage-action.test.ts`. The COMPONENT
// half was covered by nothing: the mock was typed with no parameters and every
// assertion counted calls, so dropping the argument left the whole suite and
// typecheck green while restoring the bug — a free-mode retry scoring against
// the collection.
describe("the retry carries the page's mode", () => {
  it("passes the mode it was rendered with", async () => {
    const retry = vi
      .fn<(slug: string, avail: "all" | "free") => Promise<Record<RoleName, RoleCard[]> | null>>()
      .mockResolvedValue(null);
    renderSection({ synergyState: "degraded", avail: "free", retryCoverageFigures: retry });
    fireEvent.click(
      screen.getByRole("button", { name: recommendationsCopy.coverage.degradedRetryAria }),
    );
    await waitFor(() => expect(retry).toHaveBeenCalledWith("commander-slug", "free"));
  });

  it("passes the default mode when the page is not in free", async () => {
    const retry = vi
      .fn<(slug: string, avail: "all" | "free") => Promise<Record<RoleName, RoleCard[]> | null>>()
      .mockResolvedValue(null);
    renderSection({ synergyState: "degraded", avail: "all", retryCoverageFigures: retry });
    fireEvent.click(
      screen.getByRole("button", { name: recommendationsCopy.coverage.degradedRetryAria }),
    );
    await waitFor(() => expect(retry).toHaveBeenCalledWith("commander-slug", "all"));
  });
});

// ── The group head's target (How it works §5.4b) ────────────────────────────────
//
// The head grades what the reader owns against the targets the commander's fit score used:
// its own measured figures where they exist, the per-role baseline where they do not.
describe("the group head's target", () => {
  const head = (count: number, targets: ProfileRoleTargets, layout: "desktop" | "phone" = "desktop") =>
    render(<RoleGroupHeader layout={layout} role="wipes" count={count} targets={targets} listId="t" />);
  const measured = (wipes: number): ProfileRoleTargets => ({
    of: "commander",
    targets: { ramp: 10, draw: 10, removal: 8, wipes },
  });

  it("names the commander's own figure, rounded the way the fit score rounds it", () => {
    head(1, measured(2.6));
    expect(screen.getByText("2 short of the 3 its decks run")).toBeInTheDocument();
  });

  it("is at and past the measured figure the way it was at and past the baseline", () => {
    const { unmount } = head(3, measured(3));
    expect(screen.getByText("At the 3 its decks run")).toBeInTheDocument();
    unmount();
    head(5, measured(3));
    expect(screen.getByText("Well past the 3 its decks run")).toBeInTheDocument();
  });

  // THE CASE d9 named. A commander whose decks run none of a role is never short on it,
  // whatever the reader owns, and never reads as "past 0" either.
  it("never reads short on a role whose measured target is 0, at either width", () => {
    for (const layout of ["desktop", "phone"] as const) {
      for (const count of [0, 2]) {
        const { container, unmount } = head(count, measured(0.3), layout);
        expect(container.textContent).not.toMatch(/short/);
        expect(container.textContent).not.toMatch(/past 0|At the 0/);
        expect(screen.getByText("Its decks run none")).toBeInTheDocument();
        unmount();
      }
    }
  });

  it("keeps the baseline's words when no figure was measured", () => {
    head(1, FLAT_TARGETS);
    expect(screen.getByText("2 short of baseline")).toBeInTheDocument();
  });

  it("draws every panel's head from the targets the section is handed", () => {
    renderSection({ roleCounts: { ramp: 0, draw: 0, removal: 0, wipes: 0 }, roleTargets: measured(0) });
    expect(screen.queryByText(/short of baseline/)).toBeNull();
    expect(screen.getByText("Its decks run none")).toBeInTheDocument();
    // Ramp and draw both run 10; removal runs 8.
    expect(screen.getAllByText("10 short of the 10 its decks run")).toHaveLength(2);
    expect(screen.getByText("8 short of the 8 its decks run")).toBeInTheDocument();
  });
});

// ── Sibling art (Hugh, 2026-10-05: Commander Details' neighbor plates drew empty boxes) ──────────

describe("the list it hands the card", () => {
  // Read-ahead is off here (a `fetchCard` with no `prefetchCard`), so a plate draws only what the
  // OPENER passed: an opener that drops a card's art draws an empty plate.
  it("passes each card's art as its sibling, so the neighbor plates draw it", async () => {
    const withArt = (n: number): RoleCard => ({ ...makeCard(n), imageUri: `https://cards.scryfall.io/owned-${n}.jpg` });
    const opened = (id: string) => ({
      oracleId: id, name: id, typeLine: "Artifact", manaCost: "{2}", cmc: 2, oracleText: null, keywords: [], rarity: "uncommon",
      colorIdentity: [], imageUri: null, printedName: null, quantity: 1, printings: [], setCodes: [], primarySetCode: "",
      preferredPrinting: null,
    }) as unknown as BrowseCard;
    render(
      <CardDetailProvider fetchCard={async (id) => opened(id)}>
        <CoverageSection
          width="desktop"
          slug="commander-slug"
          roleCards={{ ...EMPTY_ROLE_CARDS, ramp: [withArt(1), withArt(2)] }}
          roleCounts={{ ...BASE_ROLE_COUNTS, ramp: 2 }}
          roleTargets={FLAT_TARGETS}
          synergyState="ok"
          avail="all"
          retryCoverageFigures={vi.fn().mockResolvedValue(null)}
          markerElsewhere={false}
        />
      </CardDetailProvider>,
    );
    const trigger = screen.getAllByRole("button", { name: /View details for Card 1/ })[0];
    fireEvent.click(trigger);
    await waitFor(() => expect(screen.getAllByTestId("phone-peek-next")[0].outerHTML).toContain("owned-2.jpg"));
  });
});
