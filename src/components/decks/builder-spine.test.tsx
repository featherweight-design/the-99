// The deck header's two bands, drawn from one BuilderSpine mount: the status pill and the one
// filled button. The commitments roll-up that sat under them is the to-do card's now.

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import type { DeckDetail } from "../../lib/decks/read";
import type { StatusPill } from "../../lib/decks/status";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { BuilderSpine } from "./builder-spine";

const deck = {
  id: "d1",
  name: "Kykar, Wind's Fury",
  createdAt: new Date(),
  commander: {
    oracleId: "o-kykar",
    name: "Kykar, Wind's Fury",
    colorIdentity: ["W", "U", "R"],
    manaCost: "{2}{U}{R}{W}",
    typeLine: "Legendary Creature",
    oracleText: null,
    imageUri: null,
  },
  cards: [],
  built: 62,
  ownedCount: 54,
  toBuyCount: 8,
} as unknown as DeckDetail;

type SpineProps = Omit<
  Parameters<typeof BuilderSpine>[0],
  "deck" | "counts" | "onExport" | "status"
> & { status?: StatusPill };

// `status` defaults here and nowhere in the component: the roll-up tests below
// say nothing about it, and a default on the prop itself would let a real call
// site render a status that is not the deck's.
function mount({ status = "Building", ...props }: SpineProps) {
  const fetchCard = vi.fn<(id: string) => Promise<BrowseCard | null>>().mockResolvedValue(null);
  return render(
    <CardDetailProvider fetchCard={fetchCard}>
      <BuilderSpine
        deck={deck}
        counts={{ built: 62, ownedCount: 54, toBuyCount: 8 }}
        onExport={vi.fn()}
        status={status}
        {...props}
      />
    </CardDetailProvider>,
  );
}

describe("BuilderSpine header", () => {
  it("names the deck's status with the shared pill", () => {
    mount({ status: "To buy" });
    expect(screen.getAllByText("To buy").length).toBeGreaterThan(0);
  });

  // Rule 2 of the refresh: one filled primary per screen. The assertion reads
  // the class the bone PRIMARY sets, because a test that cannot see the fill
  // cannot enforce the rule.
  it("draws exactly one filled button", () => {
    const { container } = mount({});
    expect(container.querySelectorAll(".bg-\\[color\\:var\\(--fg\\)\\]")).toHaveLength(1);
  });
});

describe("BuilderSpine after the marks", () => {
  // The marks are gone from both bands, and so is the phase LINE the desktop
  // head drew under its bar — the pill says it in a word now, and two
  // statements of one fact is what this round removes.
  it("draws no phase line and no mark at either width", () => {
    const { container } = mount({ status: "Draft" });
    expect(screen.queryByText("Not committed yet")).not.toBeInTheDocument();
    expect(container.querySelector("[data-deck-phase]")).toBeNull();
    for (const el of container.querySelectorAll("span")) {
      expect((el as HTMLElement).style.borderLeft).not.toBe("2px solid var(--fg)");
    }
    for (const el of container.querySelectorAll("div")) {
      expect((el as HTMLElement).style.opacity).not.toBe("0.5");
    }
  });

  // Both bands render from one mount, so a count of two is the parity check.
  it("prints the status word on both bands", () => {
    mount({ status: "Draft" });
    expect(screen.getAllByText("Draft")).toHaveLength(2);
  });
});
