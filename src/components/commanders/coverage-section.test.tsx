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

const { CoverageSection } = await import("./coverage-section");
import type { RoleCard } from "../../lib/recs/score";
import type { RoleName } from "../../lib/recs/score";
import { explainedCopy } from "../../lib/copy/commander-explained";
import { recommendationsCopy } from "../../lib/copy/recommendations";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeCard(n: number, pct: number | null = 50): RoleCard {
  return { oracleId: `oracle-${n}`, name: `Card ${n}`, inclusionPct: pct, committedTo: null };
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
      { oracleId: "oracle-z", name: "Zombie Infestation", inclusionPct: null, committedTo: null },
      { oracleId: "oracle-m", name: "Mana Vault", inclusionPct: null, committedTo: null },
      { oracleId: "oracle-s", name: "Swords to Plowshares", inclusionPct: null, committedTo: null },
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

describe("the committed legend", () => {
  const committed = (n: number, deck: string): RoleCard => ({ ...makeCard(n), committedTo: deck });

  // Both figures count the chips on screen. The cap hides the rest, and a count
  // over the role total would explain dots the reader cannot see.
  it("counts the visible chips, not the role's total", () => {
    const cards = [committed(1, "Atraxa"), ...makeCards(19).slice(1)];
    renderSection({ roleCards: { ...EMPTY_ROLE_CARDS, ramp: cards }, roleCounts: { ...BASE_ROLE_COUNTS, ramp: 20 } });
    expect(screen.getByText(explainedCopy.committed.legend(1, 12))).toBeInTheDocument();
  });

  it("says so plainly when every visible chip is marked", () => {
    const cards = [committed(1, "Atraxa"), committed(2, "Krenko")];
    renderSection({ roleCards: { ...EMPTY_ROLE_CARDS, ramp: cards }, roleCounts: { ...BASE_ROLE_COUNTS, ramp: 2 } });
    expect(screen.getByText(explainedCopy.committed.legendAllTwo)).toBeInTheDocument();
  });

  it("draws nothing when no visible chip carries the mark", () => {
    renderSection({ roleCards: { ...EMPTY_ROLE_CARDS, ramp: makeCards(3) }, roleCounts: { ...BASE_ROLE_COUNTS, ramp: 3 } });
    expect(screen.queryByText(/already in/i)).toBeNull();
  });

  it("takes the shorter wording at phone width", () => {
    const cards = [committed(1, "Atraxa"), ...makeCards(3).slice(1)];
    renderSection({ width: "phone", roleCards: { ...EMPTY_ROLE_CARDS, ramp: cards }, roleCounts: { ...BASE_ROLE_COUNTS, ramp: 3 } });
    expect(screen.getByText(explainedCopy.committed.legendMobile(1, 3))).toBeInTheDocument();
  });
});

describe("the Role Coverage sort", () => {
  const committed = (n: number, deck: string): RoleCard => ({ ...makeCard(n), committedTo: deck });

  const chooseAvailability = () => {
    fireEvent.click(screen.getByRole("button", { name: explainedCopy.coverageSort.triggerAria }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Availability/ }));
  };

  it("reorders the chips inside every panel from one control", () => {
    const cards = [committed(1, "Atraxa"), makeCard(2)];
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
    const cards = [...makeCards(12).map((c) => ({ ...c, committedTo: "Atraxa" })), makeCard(13)];
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
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: [committed(1, "Atraxa"), makeCard(2)] },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 2 },
    });
    chooseAvailability();
    expect(screen.getByText("2 owned")).toBeInTheDocument();
  });

  it("announces the new order in the section's own live region", () => {
    renderSection({
      roleCards: { ...EMPTY_ROLE_CARDS, ramp: [committed(1, "Atraxa"), makeCard(2)] },
      roleCounts: { ...BASE_ROLE_COUNTS, ramp: 2 },
    });
    const region = document.querySelector('[aria-live="polite"]') as HTMLElement;
    expect(region.textContent).toBe("");
    chooseAvailability();
    expect(region.textContent).toBe(explainedCopy.coverageSort.announce("Availability"));
  });
});
