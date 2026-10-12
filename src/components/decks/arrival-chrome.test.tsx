// Arrival chrome — states 13 and 14, exercised through BuilderShell because
// that is where the two are mutually exclusive and where the jump has a view
// and a filter to move. There is no browser gate on this repo (no Playwright,
// /decks is behind Clerk), so this is the only place the dismissal keying and
// the two-step jump are verified.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import { arrivalDismissKey } from "../../lib/decks/arrival";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { recommendedMix } from "../../lib/decks/mix";
import { reveal } from "../../lib/ui/reveal";

/** The asserted baseline, through the real function rather than restated — a hand-built
 *  literal drifts from the type the moment a field is added, which is how 120 of these broke. */
const TEST_MIX = recommendedMix(null, false);

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
// The jump is `reveal`'s; its eased scroll is `reveal`'s own test.
vi.mock("../../lib/ui/reveal", () => ({ reveal: vi.fn() }));

const { BuilderShell } = await import("./builder-shell");

const copy = deckImportCopy;

// The desktop banner sentence is split around a bolded `Complete`, so no single
// text node holds it. Match on the wrapping span's whole text instead.
function desktopSentence(text: string) {
  return screen.getByText(
    (_content, el) => el?.tagName === "SPAN" && el.textContent === text,
  );
}

function makeCards(n: number) {
  return Array.from({ length: n }, (_, i) => ({
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
}

function makeDeck(overrides: Partial<DeckDetail> = {}): DeckDetail {
  const cards = makeCards(99);
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
    built: 99,
    ownedCount: 99,
    toBuyCount: 0,
    total: 99,
    unresolvedRows: [],
    ...overrides,
  } as DeckDetail;
}

function renderBuilder(deck: DeckDetail, arrivedFromImport = false) {
  return render(
    <BuilderShell mix={TEST_MIX}
      deck={deck}
      suggestions={[]}
      degraded={false}
      firstRun={false}
      commanderIdentity={["B", "R", "G"]}
      arrivedFromImport={arrivedFromImport}
     newestAsOf={null}/>,
  );
}

const unresolvedRows = [
  { id: "row-1", rawName: "Sol Rong", quantity: 1, sourceLine: 4 },
  { id: "row-2", rawName: "Cultivat", quantity: 1, sourceLine: 9 },
];

// A deck that imported short: 97 matched cards plus two lines nobody could name.
function shortDeck(overrides: Partial<DeckDetail> = {}): DeckDetail {
  return makeDeck({
    id: "deck-short",
    cards: makeCards(97),
    built: 97,
    ownedCount: 97,
    toBuyCount: 0,
    total: 99,
    unresolvedRows,
    ...overrides,
  });
}

describe("Arrival strip (state 13)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows only when the navigation came from an import", async () => {
    await act(async () => {
      renderBuilder(makeDeck(), true);
    });
    expect(screen.getByText(copy.arrival.clean("99"))).toBeInTheDocument();
    expect(screen.getByText(copy.arrival.cleanMobile("99"))).toBeInTheDocument();
  });

  it("is absent on an ordinary visit to the same deck", async () => {
    await act(async () => {
      renderBuilder(makeDeck(), false);
    });
    expect(screen.queryByText(copy.arrival.clean("99"))).not.toBeInTheDocument();
  });

  it("separates the thousands, so a very long import does not read as a raw digit run", async () => {
    const cards = makeCards(1200);
    await act(async () => {
      renderBuilder(
        makeDeck({ id: "deck-big", cards, built: 1200, ownedCount: 1200, total: 1200 }),
        true,
      );
    });
    expect(screen.getByText(copy.arrival.clean("1,200"))).toBeInTheDocument();
  });

  // A Moxfield export writes basics as one line ("35 Forest"), so the quantity
  // sum and the line count diverge on almost every real deck. The sentence says
  // "lines", so it must count lines.
  it("counts lines, not copies, when a line carries many of a card", async () => {
    const cards = makeCards(65);
    cards[0] = { ...cards[0], typeLine: "Basic Land — Forest", quantity: 35 };
    await act(async () => {
      renderBuilder(
        makeDeck({ id: "deck-basics", cards, built: 99, ownedCount: 99, total: 99 }),
        true,
      );
    });
    expect(screen.getByText(copy.arrival.clean("65"))).toBeInTheDocument();
    expect(screen.queryByText(copy.arrival.clean("99"))).not.toBeInTheDocument();
  });

  it("dismisses, and the dismissal is keyed to the deck id", async () => {
    await act(async () => {
      renderBuilder(makeDeck(), true);
    });
    fireEvent.click(screen.getByRole("button", { name: copy.arrival.dismiss }));
    expect(screen.queryByText(copy.arrival.clean("99"))).not.toBeInTheDocument();
    expect(localStorage.getItem(arrivalDismissKey("deck-1"))).toBe("1");
  });

  // The repeat pass of the journey lifecycle, in a test: import, delete, import
  // the same list again. A dismissal keyed to anything the two imports share —
  // the list, the commander, the name — would silence the second one.
  it("returns for a new deck built from the same list", async () => {
    localStorage.setItem(arrivalDismissKey("deck-1"), "1");
    await act(async () => {
      renderBuilder(makeDeck({ id: "deck-2" }), true);
    });
    expect(screen.getByText(copy.arrival.clean("99"))).toBeInTheDocument();
  });

  it("stays dismissable when storage throws", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    await act(async () => {
      renderBuilder(makeDeck({ id: "deck-nostorage" }), true);
    });
    fireEvent.click(screen.getByRole("button", { name: copy.arrival.dismiss }));
    expect(screen.queryByText(copy.arrival.clean("99"))).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  // The strip says "nothing needs your attention". The banner says the opposite.
  it("is suppressed when the import came up short", async () => {
    await act(async () => {
      renderBuilder(shortDeck(), true);
    });
    expect(screen.queryByText(copy.arrival.clean("99"))).not.toBeInTheDocument();
    expect(desktopSentence(copy.unresolved.banner(2))).toBeInTheDocument();
  });
});

describe("Unresolved banner (state 14)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders both viewports' sentences with the line count", async () => {
    await act(async () => {
      renderBuilder(shortDeck());
    });
    expect(screen.getByText(copy.unresolved.bannerMobile(2))).toBeInTheDocument();
    expect(desktopSentence(copy.unresolved.banner(2))).toBeInTheDocument();
  });

  // The handoff's mobile line said the rows were "not in any count below" while
  // the group's mobile footnote said they "count toward the 99". Both shipped
  // verbatim, and a phone shows them on the same journey.
  it.each([1, 2])("does not tell mobile the rows are in no count at all (%i)", (n) => {
    expect(copy.unresolved.bannerMobile(n)).not.toContain("any count");
    expect(copy.unresolved.footnoteMobile).toContain("count toward the 99");
  });

  // Desktop warns that unresolved rows hold the deck off Complete; mobile is
  // where a player is most likely to stop, so it cannot be the viewport that
  // omits the consequence.
  it.each([1, 2])("keeps the Complete consequence on mobile too (%i)", (n) => {
    expect(copy.unresolved.bannerMobile(n)).toContain("off Complete");
    expect(copy.unresolved.banner(n)).toContain("off Complete");
  });

  it("does not depend on arrival — it is still there on a later visit", async () => {
    await act(async () => {
      renderBuilder(shortDeck(), false);
    });
    expect(desktopSentence(copy.unresolved.banner(2))).toBeInTheDocument();
  });

  it("disappears at zero unresolved rows", async () => {
    await act(async () => {
      renderBuilder(makeDeck(), true);
    });
    expect(
      screen.queryByRole("button", { name: copy.unresolved.bannerAction }),
    ).not.toBeInTheDocument();
  });

  // The defect class this whole surface has to stay clear of: a control that
  // promises something the surface cannot do. Resolution lands in PR 8.
  it("promises nothing the rows cannot yet honour", async () => {
    await act(async () => {
      renderBuilder(shortDeck());
    });
    expect(screen.queryByText(copy.unresolved.footnoteMobileResolve)).not.toBeInTheDocument();
  });

  it("offers the jump at both viewports", async () => {
    await act(async () => {
      renderBuilder(shortDeck());
    });
    // Two mounts, one per viewport: the mobile text link and the desktop ghost.
    expect(screen.getAllByRole("button", { name: copy.unresolved.bannerAction })).toHaveLength(2);
  });
});

describe("The banner's jump to the unresolved group", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The jump lands on the group itself, at its top.
  function spyOnScroll() {
    vi.mocked(reveal).mockClear();
    return {
      landed: () => vi.mocked(reveal).mock.calls.some(([el, block]) =>
        el === document.getElementById("unresolved-group") && el !== null && block === "start"),
    };
  }

  function clickJump(index = 0) {
    fireEvent.click(screen.getAllByRole("button", { name: copy.unresolved.bannerAction })[index]);
  }

  it("scrolls to the group when the player is already looking at it", async () => {
    const scrollIntoView = spyOnScroll();
    await act(async () => {
      renderBuilder(shortDeck());
    });
    await act(async () => clickJump());
    expect(scrollIntoView.landed()).toBe(true);
  });

  // Shopping hides the group outright, so the jump has to put the filter back
  // before there is anything to scroll to.
  it("switches off the Shopping filter first, then scrolls", async () => {
    const scrollIntoView = spyOnScroll();
    await act(async () => {
      renderBuilder(shortDeck({ cards: makeCards(97).map((c) => ({ ...c, owned: false })), ownedCount: 0, toBuyCount: 97 }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Shopping/ }));
    });
    expect(document.getElementById("unresolved-group")).toBeNull();

    await act(async () => clickJump());
    expect(document.getElementById("unresolved-group")).not.toBeNull();
    expect(scrollIntoView.landed()).toBe(true);
  });

  // Consider does not draw the decklist at all.
  it("switches back from the Consider tab first, then scrolls", async () => {
    const scrollIntoView = spyOnScroll();
    await act(async () => {
      renderBuilder(shortDeck());
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /Cards to consider/ }));
    });
    expect(document.getElementById("unresolved-group")).toBeNull();

    await act(async () => clickJump());
    expect(document.getElementById("unresolved-group")).not.toBeNull();
    expect(scrollIntoView.landed()).toBe(true);
  });
});
