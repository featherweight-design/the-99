// The phone bottom stack on /decks/[id]: tab bar, then the quick-add bar, then
// the scrolling suggestion list. Both halves of the bug were invisible to a
// unit test until the layering was expressed as classes rather than as a
// measured gap — jsdom lays nothing out, so these assert the rule, and
// `scripts/probe-bottom.mjs` measures the result at runtime.
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { topOffCopy } from "../../lib/copy/top-off";
import type { TopOffCandidate } from "../../lib/decks/last-slots";
import type { DeckDetail } from "../../lib/decks/read";

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
  commitTopOff: vi.fn(),
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
    cmc: 2,
    owned: true,
    quantity: 1,
    auto: false,
    printedName: null,
    printedSetCode: null,
    printedCollectorNumber: null,
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
      artCropUri: null,
    },
    partner: null,
    cards,
    built: 40,
    ownedCount: 40,
    coveredCount: 40,
    toBuyCount: 0,
    total: 99,
    filled: false,
    unresolvedRows: [],
  } as DeckDetail;
}

async function shell(candidates: TopOffCandidate[] = []) {
  await act(async () => {
    render(
      <BuilderShell
        deck={makeDeck()}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
        candidates={candidates}
      />,
    );
  });
}

async function dock() {
  await shell();
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

// The open top-off list's commit bar is `fixed`, so it holds no space, and the
// dock it displaces is hidden rather than shrunk. Nothing in flow then stands in
// the bottom slot and the last rows of the decklist cannot be scrolled clear of
// the bar. What makes this worth a test is not that a spacer exists — one did,
// inside the strip, hundreds of rows above the page foot, where it opened a band
// of dead space mid-list and reserved nothing at the end. The rule is the
// spacer's PLACEMENT, which typecheck cannot see.
describe("Top-off commit bar — page-foot reservation", () => {
  function candidate(id: string): TopOffCandidate {
    return {
      oracleId: id,
      name: id,
      typeLine: "Instant",
      facet: "spell",
      inclusionPct: 40,
      synergyPts: 20,
      owned: true,
      committedTo: null,
      manaCost: null,
      price: null,
      availability: null,
    };
  }

  const realRect = Element.prototype.getBoundingClientRect;
  afterEach(() => {
    Element.prototype.getBoundingClientRect = realRect;
  });

  async function openList() {
    // jsdom measures everything at zero, and the reservation is conditional on a
    // real height, so the bar has to report one.
    Element.prototype.getBoundingClientRect = function () {
      return { ...realRect.call(this), height: 72 } as DOMRect;
    };
    await shell([candidate("a"), candidate("b")]);
    await act(async () => {
      screen.getByLabelText(topOffCopy.strip.openAria("59")).click();
    });
  }

  it("reserves nothing while the list is closed", async () => {
    await dock();
    expect(screen.queryByTestId("top-off-bar-reserve")).toBeNull();
  });

  it("stands in for the hidden dock, in the dock's own slot", async () => {
    await openList();

    const dock = screen.getByTestId("quick-add-dock");
    expect(dock).toHaveClass("max-md:hidden");

    const reserve = screen.getByTestId("top-off-bar-reserve");
    expect(dock.nextElementSibling).toBe(reserve);
    expect(reserve.style.height).toBe("72px");
    // Desktop pins nothing: the commit row is an ordinary element at the foot of
    // the list there, so a spacer would be a band of dead space under it.
    expect(reserve).toHaveClass("md:hidden");
  });

  it("gives the space back when the list closes", async () => {
    await openList();
    await act(async () => {
      screen.getByLabelText(topOffCopy.strip.close).click();
    });

    expect(screen.queryByTestId("top-off-bar-reserve")).toBeNull();
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
