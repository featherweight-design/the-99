import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { CommanderListItem } from "../../lib/recs/recommend";
import type { SynergyState } from "../../lib/recs/synergy-state";
import type { ReceiptCounts } from "../../lib/commanders/in-use";
import { RecCard, type ScoreDelta } from "./rec-card";
import { explainedCopy } from "../../lib/copy/commander-explained";
import { commandersCopy } from "../../lib/copy/lanes";

vi.mock("../../app/commanders/actions", () => ({
  retryRecs: vi.fn(),
}));

function item(overrides: Partial<CommanderListItem> = {}): CommanderListItem {
  return {
    oracleId: "oracle-1",
    slug: "krenko-mob-boss",
    name: "Krenko, Mob Boss",
    typeLine: "Legendary Creature — Goblin Warrior",
    colorIdentity: ["R"],
    colorPoolSize: 120,
    roleCounts: { ramp: 4, draw: 3, removal: 5, wipes: 1 },
    edhrecOwnedCount: 40,
    edhrecTotal: 100,
    receipts: "",
    fitPool: 12,
    fitRoles: 8,
    fitSynergy: 24,
    score: 44,
    rankScore: 44,
    measurableTotal: 100,
    imageUri: null,
    artCropUri: null,
    synergyState: "ok",
    ...overrides,
  };
}

function noSynergy(synergyState: SynergyState): CommanderListItem {
  // Dropping fitSynergy drops the score and the denominator with it: score is
  // exactly fitPool + fitRoles (12 + 8) per score.ts:254, out of 40.
  return item({ synergyState, fitSynergy: null, score: 20, rankScore: 50, measurableTotal: 40, edhrecOwnedCount: null, edhrecTotal: null });
}

const NO_CLAIMS: ReceiptCounts = { inUse: 0, wantedByBrew: 0 };

function card(
  over: {
    commander?: CommanderListItem;
    avail?: "all" | "free";
    counts?: ReceiptCounts;
    delta?: ScoreDelta | null;
  } = {},
) {
  const {
    commander = item(),
    avail = "all",
    counts = NO_CLAIMS,
    delta = null,
  } = over;
  return render(
    <RecCard commander={commander} rank={1} avail={avail} counts={counts} delta={delta} />,
  );
}

describe("RecCard synergy states", () => {
  it("shows no synergy note at all when the state is ok", () => {
    card();
    expect(screen.queryByText(/synergy data/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("offers Retry on both layouts when the state is degraded", () => {
    card({ commander: noSynergy("degraded") });
    expect(screen.getAllByText(/Synergy data unavailable/i)).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /retry/i })).toHaveLength(2);
  });

  it("renders no Retry control at all when the state is absent", () => {
    card({ commander: noSynergy("absent") });
    expect(screen.getAllByText(/EDHREC doesn't track this commander/i)).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("keeps the whole card linked to the detail page", () => {
    const { container } = card();
    const link = within(container).getByRole("link", { name: /Krenko, Mob Boss/ });
    expect(link).toHaveAttribute("href", "/commanders/krenko-mob-boss");
  });
});

describe("RecCard row shape", () => {
  // The art is the wash behind the row, not a printing in a box. `I3` is the
  // only frame with a thumbnail, and it applies only if a printing is named.
  it("shows no image at rest", () => {
    const { container } = card({
      commander: item({ imageUri: "https://example.test/art.jpg" }),
    });
    expect(container.querySelector("img")).toBeNull();
  });

  it("gives the row a 148px floor so the portrait reaches both edges", () => {
    const { container } = card();
    expect(container.firstElementChild?.className).toContain("min-h-[148px]");
  });

  it("draws the frame-free crop, never the printed card", () => {
    const { container } = card({
      commander: item({
        imageUri: "https://example.test/printed.jpg",
        artCropUri: "https://example.test/crop.jpg",
      }),
    });
    expect(container.innerHTML).toContain("crop.jpg");
    expect(container.innerHTML).not.toContain("printed.jpg");
  });

  // Every figure the shipped row printed is still printed: the redraw moved
  // them, it did not drop any.
  it("keeps every shipped figure", () => {
    card({ counts: { inUse: 6, wantedByBrew: 0 } });
    expect(screen.getAllByText(commandersCopy.row.fitDenominator)).toHaveLength(2);
    expect(screen.getAllByText("40")).not.toHaveLength(0);
    expect(screen.getAllByText(/120 of your cards fit/)).toHaveLength(2);
    expect(screen.getAllByText("6 already in use")).toHaveLength(2);
  });

  // No header CTA, and no second copy on the phone: the row is the action, so
  // exactly one link names it.
  it("names its action exactly once", () => {
    card();
    expect(screen.getAllByRole("link", { name: commandersCopy.row.action })).toHaveLength(1);
  });
});

// The line renders once per layout, so every count here is 2.
describe("RecCard receipt line", () => {
  // OPEN ITEM 7: the line always renders, so a row's height never depends on
  // how many decks the player happens to have finished.
  it("renders the first clause even for a commander with no claims at all", () => {
    card();
    expect(screen.getAllByText(/120 of your cards fit/)).toHaveLength(2);
    expect(screen.queryByText(/already in use/)).toBeNull();
    expect(screen.queryByText(/wanted by a brew/)).toBeNull();
  });

  it("says what is free rather than what fits under the free ranking", () => {
    card({ avail: "free" });
    expect(screen.getAllByText(/120 of your cards are free/)).toHaveLength(2);
    expect(screen.queryByText(/of your cards fit/)).toBeNull();
  });

  it("appends the in-use clause when a finished deck holds fitting cards", () => {
    card({ counts: { inUse: 12, wantedByBrew: 0 } });
    expect(screen.getAllByText("12 already in use")).toHaveLength(2);
  });

  it("appends the brew clause when only unfinished lists want them", () => {
    card({ counts: { inUse: 0, wantedByBrew: 4 } });
    expect(screen.getAllByText("4 wanted by a brew")).toHaveLength(2);
  });

  // Hard outranks soft, mirroring the deck roll-up's fixed severity order. A
  // pool holding both says nothing about its soft claims.
  it("shows only the harsher clause when the pool holds both severities", () => {
    card({ counts: { inUse: 12, wantedByBrew: 4 } });
    expect(screen.getAllByText("12 already in use")).toHaveLength(2);
    expect(screen.queryByText(/wanted by a brew/)).toBeNull();
  });
});

describe("RecCard score delta", () => {
  // Desktop buys the longer visible form; the pinned mobile Fit block does not
  // have the width for it. Both carry the same full sentence to a screenreader.
  it("shows the bare drop on mobile and the score it fell from on desktop", () => {
    card({ avail: "free", delta: { drop: 9, was: 44 } });
    expect(screen.getByText("↓9")).toBeInTheDocument();
    expect(screen.getByText("↓9 from 44")).toBeInTheDocument();
    expect(
      screen.getAllByText("9 points lower than its score against everything you own, 44"),
    ).toHaveLength(2);
  });

  it("renders nothing where the score did not move", () => {
    card({ avail: "free", delta: null });
    expect(screen.queryByText(/↓/)).toBeNull();
  });
});

describe("RecCard score and denominator", () => {
  // The card prints the score, not the bar's fill. 32 of 40 fills 80% of the
  // track, and an 80 here against a 32 on the detail page is the same commander
  // wearing two numbers.
  it("prints the score with the denominator that measured it", () => {
    // rankScore is deliberately the rescaled 80 this test asserts is never shown.
    card({ commander: { ...noSynergy("absent"), fitPool: 20, fitRoles: 12, score: 32, rankScore: 80 } });
    expect(screen.getAllByText("32")).toHaveLength(2);
    expect(
      screen.getAllByText(commandersCopy.row.fitDenominatorMeasurable(40)),
    ).toHaveLength(2);
    expect(screen.queryByText("80")).toBeNull();
  });

  it("takes the full denominator where synergy was measured", () => {
    card();
    expect(screen.getAllByText(commandersCopy.row.fitDenominator)).toHaveLength(2);
  });

  // The mobile tile has no room to print a denominator, so both layouts carry
  // it in the accessible name instead.
  it("names the figure and its ceiling together at both widths", () => {
    card({ commander: { ...noSynergy("absent"), fitPool: 20, fitRoles: 12, score: 32, rankScore: 80 } });
    expect(screen.getAllByText(explainedCopy.score.scoreAria(32, 40))).toHaveLength(2);
  });
});
