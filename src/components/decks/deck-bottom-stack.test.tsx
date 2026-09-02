// The phone bottom stack on /decks/[id]: tab bar, then the quick-add bar, then
// the scrolling suggestion list. Both halves of the bug were invisible to a
// unit test until the layering was expressed as classes rather than as a
// measured gap — jsdom lays nothing out, so these assert the rule, and
// `scripts/probe-bottom.mjs` measures the result at runtime.
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/decks/deck-1",
}));

const { BuilderShell } = await import("./builder-shell");
const { TabBar } = await import("../shell/nav");

function makeDeck(): DeckDetail {
  const cards = Array.from({ length: 40 }, (_, i) => ({
    oracleId: `card-${i}`,
    name: `Card ${i}`,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts" as const,
    role: "other" as const,
    owned: true,
    quantity: 1,
  }));
  return {
    id: "deck-1",
    name: "Korvold",
    createdAt: new Date("2026-01-01"),
    commander: {
      oracleId: "korvold",
      name: "Korvold, Fae-Cursed King",
      colorIdentity: ["B", "R", "G"],
      manaCost: "{2}{B}{R}{G}",
      typeLine: "Legendary Creature — Dragon Noble",
      oracleText: null,
      imageUri: null,
    },
    cards,
    built: 40,
    ownedCount: 40,
    toBuyCount: 0,
    total: 99,
    unresolvedRows: [],
  } as DeckDetail;
}

async function dock() {
  await act(async () => {
    render(
      <BuilderShell
        deck={makeDeck()}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
      />,
    );
  });
  return screen.getByTestId("quick-add-dock");
}

describe("Quick-add bar — phone bottom stack", () => {
  it("offsets by the tab bar's own height rather than a guess at it", async () => {
    const bar = await dock();

    // `bottom-0` was the bug: a sticky element pins to the scrollport edge, and
    // the padding `main` carries to reserve the fixed tab bar does not move it.
    expect(bar).toHaveClass("bottom-[var(--tabbar-h)]");
    expect(bar).toHaveClass("md:bottom-0");
    expect(bar.className).not.toMatch(/bottom-\[\d/);
  });

  it("outranks the availability dots that scroll underneath it", async () => {
    const bar = await dock();

    // The dots on the suggestion tiles are `absolute z-10` in the same stacking
    // context, so at `z-auto` this bar lost to them and they drew over the
    // search field.
    expect(bar).toHaveClass("z-20");
  });
});

describe("Tab bar", () => {
  it("is held to the height every other surface reserves for it", () => {
    render(<TabBar locked={false} />);
    const bar = screen.getByRole("navigation", { name: "Primary" });

    // Sized by its contents the bar measured about 61px against the 80px four
    // separate places reserved, and the overshoot showed as a band of scrolling
    // content above it. A fixed height makes the reservation exact.
    expect(bar).toHaveClass("h-[var(--tabbar-h)]");
  });
});
