// M8 Find a deck inside card details (discovery R1, PR 3): the modal decides the door's moment from the card's own
// claims, and both of its doors (the phone's column, the desktop row) carry it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { BrowseCard } from "../../lib/collection/browse";
import { momentsCopy } from "../../lib/copy/moments";
import { MOMENTS, type MomentId } from "../../lib/moments/registry";

vi.mock("../../app/moments-actions", () => ({ spendMomentAction: async () => {} }));
vi.mock("../../lib/swaps/actions", () => ({ loadFitsAction: vi.fn(), addFromFits: vi.fn() }));
vi.mock("../../lib/swaps/fits-read-actions", () => ({ readFitsReadAction: vi.fn(async () => null), pressFitsReadAction: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/collection", useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const { MomentsProvider, ARRIVE_MS } = await import("./moments-provider");
const { CardDetailProvider, CardDetailTrigger } = await import("../cards/card-detail-provider");
await (await import("../cards/card-detail-provider")).warmCardModal();

let notify: ((entries: { target: Element; isIntersecting: boolean }[]) => void) | null = null;
class FakeObserver {
  constructor(cb: (entries: { target: Element; isIntersecting: boolean }[]) => void) {
    notify = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}
const ALL = MOMENTS.map((m) => m.id) as MomentId[];
const name = momentsCopy.noteName(momentsCopy.findADeck.tool);

const card = (over: Partial<BrowseCard>): BrowseCard => ({
  oracleId: "o-birds", name: "Birds of Paradise", typeLine: "Creature", manaCost: "{G}", cmc: 1, oracleText: null,
  keywords: [], rarity: "rare", colorIdentity: ["G"], imageUri: null, printedName: null, quantity: 2, printings: [],
  setCodes: [], primarySetCode: "", preferredPrinting: null, commanderLegal: true, hasDecks: true,
  availability: { owned: 2, hard: 0, soft: 0, free: 2, claims: [] },
  ...over,
} as BrowseCard);

async function open(c: BrowseCard, deck?: { deckId: string; deckOracleIds: ReadonlySet<string> }) {
  render(
    <MomentsProvider live={ALL} spent={[]}>
      <CardDetailProvider fetchCard={async () => c} {...(deck ?? {})}>
        <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">open</CardDetailTrigger>
      </CardDetailProvider>
    </MomentsProvider>,
  );
  await act(async () => { fireEvent.click(screen.getByText("open")); });
}
async function see(door: Element) {
  act(() => notify!([{ target: door, isIntersecting: true }]));
  await act(async () => { vi.advanceTimersByTime(ARRIVE_MS); });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  window.localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  notify = null;
});

describe("M8 in card details", () => {
  it.each([0, 1])("arrives on door %i for an owned card no deck uses", async (i) => {
    await open(card({}));
    const doors = screen.getAllByTestId("fits-door");
    expect(doors).toHaveLength(2);
    await see(doors[i]);
    const note = screen.getByRole("note", { name });
    expect(doors[i].getAttribute("aria-describedby")).toBe(note.id);
  });

  it.each([
    ["an unowned card", { quantity: 0, availability: null }],
    ["a card a committed deck claims", { availability: { owned: 2, hard: 1, soft: 0, free: 1, claims: [] } }],
    ["a card a draft claims", { availability: { owned: 2, hard: 0, soft: 1, free: 2, claims: [] } }],
    ["a card with no availability read", { availability: null }],
  ])("stays away for %s", async (_, over) => {
    await open(card(over as Partial<BrowseCard>));
    for (const door of screen.getAllByTestId("fits-door")) await see(door);
    expect(screen.queryByRole("note", { name })).toBeNull();
  });

  it("stays away when the deck it was opened from holds the card", async () => {
    await open(card({}), { deckId: "d1", deckOracleIds: new Set(["o-birds"]) });
    for (const door of screen.getAllByTestId("fits-door")) await see(door);
    expect(screen.queryByRole("note", { name })).toBeNull();
  });
});
