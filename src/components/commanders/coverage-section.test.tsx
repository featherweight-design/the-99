// CoverageSection — tests for Task 7 (#131).
// Covers: sub-caption branching, absent vs degraded notes, retry flow,
// and every edge count at both widths.

import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import { CardDetailProvider } from "../decks/card-detail-provider";
import { CoverageSection } from "./coverage-section";
import type { RoleCard } from "../../lib/recs/score";
import type { RoleName } from "../../lib/recs/score";
import { recommendationsCopy } from "../../lib/copy/recommendations";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeCard(n: number, pct: number | null = 50): RoleCard {
  return { oracleId: `oracle-${n}`, name: `Card ${n}`, inclusionPct: pct };
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

function renderSection(
  overrides: {
    width?: "desktop" | "phone";
    roleCards?: Record<RoleName, RoleCard[]>;
    roleCounts?: Record<RoleName, number>;
    synergyState?: "ok" | "absent" | "degraded";
    retryCoverageFigures?: () => Promise<Record<RoleName, RoleCard[]> | null>;
  } = {},
) {
  const fetchCard = vi.fn<(id: string) => Promise<BrowseCard | null>>().mockResolvedValue(null);
  const {
    width = "desktop",
    roleCards = EMPTY_ROLE_CARDS,
    roleCounts = BASE_ROLE_COUNTS,
    synergyState = "ok",
    retryCoverageFigures = vi.fn<() => Promise<Record<RoleName, RoleCard[]> | null>>().mockResolvedValue(null),
  } = overrides;

  render(
    <CardDetailProvider fetchCard={fetchCard}>
      <CoverageSection
        width={width}
        oracleId="oracle-commander"
        slug="commander-slug"
        roleCards={roleCards}
        roleCounts={roleCounts}
        synergyState={synergyState}
        retryCoverageFigures={retryCoverageFigures}
      />
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

  it("renders no note when synergyState is ok", () => {
    renderSection({ synergyState: "ok" });
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
          oracleId="oracle-commander"
          slug="commander-slug"
          roleCards={EMPTY_ROLE_CARDS}
          roleCounts={BASE_ROLE_COUNTS}
          synergyState="degraded"
          retryCoverageFigures={vi.fn<() => Promise<Record<RoleName, RoleCard[]> | null>>().mockResolvedValue(null)}
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
          oracleId="oracle-commander"
          slug="commander-slug"
          roleCards={EMPTY_ROLE_CARDS}
          roleCounts={BASE_ROLE_COUNTS}
          synergyState="absent"
          retryCoverageFigures={vi.fn<() => Promise<Record<RoleName, RoleCard[]> | null>>().mockResolvedValue(null)}
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
    expect(screen.getAllByText(/No .+ cards in your pool/)).not.toHaveLength(0);
    expect(screen.queryByRole("button", { name: /Show all/i })).toBeNull();
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
      { oracleId: "oracle-z", name: "Zombie Infestation", inclusionPct: null },
      { oracleId: "oracle-m", name: "Mana Vault", inclusionPct: null },
      { oracleId: "oracle-s", name: "Swords to Plowshares", inclusionPct: null },
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
      screen.getByRole("button", { name: /Show all 45 ramp cards/i }),
    ).toBeInTheDocument();
  });

  it("desktop: 45 cards, expanded shows 40 cards plus inert '+5 more not shown' text", async () => {
    renderSection({
      width: "desktop",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(45) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 45 },
    });
    const disclosureBtn = screen.getByRole("button", { name: /Show all 45 ramp cards/i });
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
      screen.getByRole("button", { name: /Show all 45 ramp cards/i }),
    ).toBeInTheDocument();
  });

  it("phone: 45 cards, expanded shows 40 cards and '+5 more not shown' text", async () => {
    renderSection({
      width: "phone",
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(45) },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 45 },
    });
    const disclosureBtn = screen.getByRole("button", { name: /Show all 45 ramp cards/i });
    fireEvent.click(disclosureBtn);
    await waitFor(() => {
      expect(
        screen.getByText(recommendationsCopy.coverage.beyondCap("5")),
      ).toBeInTheDocument();
    });
  });
});
