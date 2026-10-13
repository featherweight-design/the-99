// The shell's notice state belongs to ONE deck. `BuilderShell` is preserved across a move between
// decks (the route is dynamic), so a tag, an open sheet or a late `openNotices` reply from the deck
// just left must not be drawn on the next one (review of #942, round 1).
import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import { recommendedMix } from "../../lib/decks/mix";
import type { DeckNotices } from "../../lib/notices/read";
import { deckNoticesCopy } from "../../lib/copy/notices";

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

const peekNotices = vi.fn<(id: string) => Promise<DeckNotices | null>>();
const openNotices = vi.fn<(id: string) => Promise<DeckNotices | null>>();
vi.mock("../../lib/notices/actions", () => ({
  peekNotices: (id: string) => peekNotices(id),
  openNotices: (id: string) => openNotices(id),
}));

const { BuilderShell } = await import("./builder-shell");

const DECK = {
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
  partner: null,
  cards: [
    {
      oracleId: "sol-ring",
      name: "Sol Ring",
      quantity: 1,
      typeLine: "Artifact",
      cardTypeGroup: "Artifacts" as const,
      role: "other" as const,
      owned: true,
    },
  ],
  built: 1,
  ownedCount: 1,
  toBuyCount: 0,
  total: 1,
  unresolvedRows: [],
} as unknown as DeckDetail;

const OTHER = { ...DECK, id: "deck-2", name: "Another" } as unknown as DeckDetail;

/** One card not legal, unread: the tag every width draws. */
const ILLEGAL: DeckNotices = {
  analyzedAt: null,
  readingStale: false,
  groups: [{ group: "notLegal", items: [{ kind: "violation", group: "notLegal", card: { oracleId: "x", name: "Banned Card", imageUri: null }, colors: [] }] }],
  dataCount: 0,
  dataUnread: 0,
  violationCount: 1,
  violationsUnread: true,
  readMarks: { seq: 0, violations: ["x"] },
} as DeckNotices;

const never = () => new Promise<DeckNotices | null>(() => {});
const tags = () => screen.queryAllByRole("button", { name: /Open notices$/ });

function shell(deck: DeckDetail, over: { initialNotices?: DeckNotices | null; openNoticesOnArrival?: boolean } = {}) {
  return (
    <BuilderShell mix={TEST_MIX} deck={deck} suggestions={[]} degraded={false} firstRun={false}
      commanderIdentity={["B", "R", "G"]} arrivedFromImport={false} newestAsOf={null}
      analysisEnabled noticesEnabled {...over} />
  );
}

// The loader's read (Hugh's staging walk, 2026-09-26): the tag used to arrive from a read after mount,
// popping into a header that had already drawn. It is in the FIRST render now, and the tile's `!`
// lands with the sheet open.
describe("BuilderShell — notices read with the page", () => {
  beforeEach(() => {
    peekNotices.mockReset();
    openNotices.mockReset();
    window.history.replaceState(null, "", "/");
  });

  it("draws the tag in the first render, from the loader's read, and asks nothing after mount", async () => {
    peekNotices.mockImplementation(never);
    // No act: the synchronous first render is what the reader's first paint is.
    render(shell(DECK, { initialNotices: ILLEGAL }));
    expect(tags().length).toBeGreaterThan(0);
    await act(async () => {});
    expect(peekNotices).not.toHaveBeenCalled();
  });

  it("opens the sheet in the first render on `?notices=1`, records the open, and strips the parameter", async () => {
    openNotices.mockImplementation(async () => ({ ...ILLEGAL, violationsUnread: false }));
    window.history.replaceState(null, "", `/decks/${DECK.id}?tab=deck&notices=1`);
    render(shell(DECK, { initialNotices: ILLEGAL, openNoticesOnArrival: true }));
    expect(screen.getByTestId("notices-body")).toBeTruthy();
    await act(async () => {});
    expect(openNotices).toHaveBeenCalledWith(DECK.id);
    expect(window.location.search).toBe("?tab=deck");
    expect(screen.getByTestId("notices-body")).toBeTruthy();
  });

  it("opens it on a move to a deck that asks, the shell kept across the move", async () => {
    peekNotices.mockImplementation(async () => null);
    openNotices.mockImplementation(async () => ILLEGAL);
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(shell(DECK)); });
    expect(screen.queryByTestId("notices-body")).toBeNull();
    await act(async () => { view.rerender(shell(OTHER, { initialNotices: ILLEGAL, openNoticesOnArrival: true })); });
    expect(screen.getByTestId("notices-body")).toBeTruthy();
    expect(openNotices).toHaveBeenCalledWith(OTHER.id);
  });
});

describe("BuilderShell — notices follow the deck", () => {
  beforeEach(() => {
    peekNotices.mockReset();
    openNotices.mockReset();
  });

  it("draws no tag from the deck just left while the next deck's read is in flight", async () => {
    peekNotices.mockImplementation(async (id) => (id === DECK.id ? ILLEGAL : never()));
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(shell(DECK)); });
    expect(tags().length).toBeGreaterThan(0);
    await act(async () => { view.rerender(shell(OTHER)); });
    expect(tags()).toHaveLength(0);
  });

  it("closes the sheet on a move, and a late open reply for the old deck draws nothing", async () => {
    peekNotices.mockImplementation(async (id) => (id === DECK.id ? ILLEGAL : never()));
    let answer!: (n: DeckNotices) => void;
    openNotices.mockImplementation(() => new Promise((r) => { answer = r; }));
    let view!: ReturnType<typeof render>;
    await act(async () => { view = render(shell(DECK)); });
    await act(async () => { tags()[0].click(); });
    expect(screen.getByTestId("notices-body")).toBeTruthy();
    await act(async () => { view.rerender(shell(OTHER)); });
    expect(screen.queryByTestId("notices-body")).toBeNull();
    await act(async () => { answer(ILLEGAL); });
    expect(screen.queryByTestId("notices-body")).toBeNull();
    expect(tags()).toHaveLength(0);
  });

  // The open's reply says what it RECORDED (review of #942, round 2): a legality set the server
  // refused, because the cards moved while it opened, keeps the tag's dot.
  it("keeps the legality dot when the open's reply says the set was not recorded", async () => {
    peekNotices.mockImplementation(async () => ILLEGAL);
    openNotices.mockImplementation(async () => ({ ...ILLEGAL, violationsUnread: true }));
    await act(async () => { render(shell(DECK)); });
    await act(async () => { tags()[0].click(); });
    expect(tags().every((t) => t.getAttribute("aria-label") === deckNoticesCopy.tag.aria.notLegal(1))).toBe(true);
    expect(tags().every((t) => t.querySelector("[data-notice-dot]") !== null)).toBe(true);
  });
});
