import { act, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { StandInsRead } from "../../lib/swaps/gather";

const asOf = new Date("2026-09-20T00:00:00Z");
const cardRow = (name: string) => ({ oracleId: `id-${name}`, name, typeLine: "Instant", oracleText: "", keywords: [], cmc: 2, imageUri: null });
const standIn = (name: string, free: boolean) => ({
  card: cardRow(name), free, soft: 0, owned: free ? 1 : 0, cents: free ? null : 300, foilOnly: false,
  inclusion: null, isUniversal: false, shared: ["removal"], drawbacks: [], givesUp: [],
});
const READ = {
  job: { kind: "spell", roles: ["removal"], mv: 2 }, originalCents: 1500,
  free: [{ ...standIn("Swords to Plowshares", true), soft: 1 }], cheapest: [], byCommander: [], unlisted: [standIn("Chaos Warp", false)],
  original: cardRow("Anguished Unmaking"), commanders: ["Gishath"], newestAsOf: asOf,
} as unknown as StandInsRead;

const { loadStandInsAction } = vi.hoisted(() => ({ loadStandInsAction: vi.fn() }));
vi.mock("../../lib/swaps/actions", () => ({ loadStandInsAction }));

const { CardDetailProvider } = await import("../cards/card-detail-provider");
const { SwapToolsProvider } = await import("../../lib/swaps/context");
const { StandInsSheet } = await import("./stand-ins-sheet");

const original = {
  oracleId: "id-Anguished Unmaking", name: "Anguished Unmaking", role: "removal", owned: false, quantity: 1,
  price: { cents: 1500, foilCents: null, etchedCents: null, asOf },
} as unknown as DeckDetailCard;

async function open() {
  await act(async () => {
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <SwapToolsProvider deckId="d1" deckName="HD Gishath" storedLimitCents={null}>
          <StandInsSheet card={original} newestAsOf={asOf} onClose={() => {}} />
        </SwapToolsProvider>
      </CardDetailProvider>,
    );
  });
}

describe("StandInsSheet", () => {
  it("draws the head at once and the loading state while the list is read", async () => {
    loadStandInsAction.mockReturnValue(new Promise(() => {}));
    await open();
    expect(screen.getByText(swapToolsCopy.sheet.replacing("HD Gishath"))).toBeInTheDocument();
    expect(screen.getByText(swapToolsCopy.row.over("$10"))).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(swapToolsCopy.sheet.loadingSpells("removal"));
  });

  it("draws the list in its groups once read, free copies first, with the foot", async () => {
    loadStandInsAction.mockResolvedValue(READ);
    await open();
    const sheet = screen.getByTestId("stand-ins-sheet");
    const headings = within(sheet).getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(headings).toEqual([swapToolsCopy.sheet.groupFree, swapToolsCopy.sheet.groupUnlisted("Gishath")]);
    expect(within(sheet).getByText(swapToolsCopy.sheet.free)).toBeInTheDocument();
    // The free copy a draft holds carries the shipped marker; the row to buy carries none.
    const swords = within(sheet).getByText("Swords to Plowshares").closest("li")!;
    expect(swords.textContent).toMatch(/1 in a draft/);
    expect(within(sheet).getByText("Chaos Warp").closest("li")!.textContent).not.toMatch(/in a draft/);
    expect(within(sheet).getByText(swapToolsCopy.sheet.leadSpellsUnlisted("removal", 2))).toBeInTheDocument();
    expect(within(sheet).getByText(/Cheapest printing of each, from ManaPool/)).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("offers another try when the read fails, and reads again on it", async () => {
    loadStandInsAction.mockReset();
    loadStandInsAction.mockResolvedValueOnce(null).mockResolvedValueOnce(READ);
    await open();
    await act(async () => screen.getByRole("button", { name: swapToolsCopy.sheet.retry }).click());
    expect(loadStandInsAction).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Chaos Warp")).toBeInTheDocument();
  });
});
