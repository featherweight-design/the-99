import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";

// The view's own reads never settle here: what is under test is which face the window opens on.
const actions = vi.hoisted(() => ({
  loadFitsAction: vi.fn(() => new Promise(() => {})),
  addFromFits: vi.fn(),
  swapFromReadAction: vi.fn(),
  undoReadSwapAction: vi.fn(),
  undoReadAddAction: vi.fn(),
}));
vi.mock("../../lib/swaps/actions", () => actions);
vi.mock("../../lib/swaps/fits-read-actions", () => ({
  readFitsReadAction: vi.fn(() => new Promise(() => {})),
  pressFitsReadAction: vi.fn(),
}));
vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));
vi.mock("../../lib/analytics/posthog", () => ({ captureToolEvent: vi.fn() }));

const { CardDetailProvider, warmCardModal } = await import("./card-detail-provider");
const { useCardDetail } = await import("./card-detail-context");
await warmCardModal();

// Tool discovery call 1: a Find a deck button opens the card window straight on the Find a deck view.
const SOL: BrowseCard = {
  oracleId: "o-sol", name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", cmc: 1, oracleText: null, keywords: [],
  rarity: "uncommon", colorIdentity: [], imageUri: null, printedName: null, quantity: 1, printings: [], setCodes: [],
  primarySetCode: "", preferredPrinting: null, commanderLegal: true, hasDecks: true, fitsRead: true,
};

function Opener({ view }: { view?: "fits" }) {
  const { open } = useCardDetail();
  return (
    <button type="button" onClick={(e) => open("o-sol", undefined, null, { opener: e.currentTarget, view })}>
      open
    </button>
  );
}

async function press(view?: "fits", fetchCard = vi.fn().mockResolvedValue(SOL)) {
  render(
    <CardDetailProvider fetchCard={fetchCard}>
      <Opener view={view} />
    </CardDetailProvider>,
  );
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "open" }));
  });
  await screen.findByRole("dialog");
}

describe("CardDetailProvider: opening on Find a deck", () => {
  it("lands on the Find a deck view when the open asks for it", async () => {
    await press("fits");
    expect(await screen.findByTestId("fits-view")).toBeInTheDocument();
  });

  it("lands on the card's details for a plain open", async () => {
    await press();
    expect(screen.queryByTestId("fits-view")).toBeNull();
  });

  it("lands on the details for a card that is not legal in Commander", async () => {
    await press("fits", vi.fn().mockResolvedValue({ ...SOL, commanderLegal: false }));
    expect(screen.queryByTestId("fits-view")).toBeNull();
  });
});
