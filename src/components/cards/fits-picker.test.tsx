import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrowseCard } from "../../lib/collection/browse";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { FitsRead } from "../../lib/swaps/fits";

const actions = vi.hoisted(() => ({
  loadFitsAction: vi.fn(),
  addFromFits: vi.fn(),
}));
vi.mock("../../lib/swaps/actions", () => actions);
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const { FitsPicker } = await import("./fits-picker");
const { CardDetailProvider } = await import("./card-detail-provider");

const copy = swapToolsCopy.fits;
const card = {
  oracleId: "o-birds", name: "Birds of Paradise", printedName: null, colorIdentity: ["G"], quantity: 2,
  imageUri: null, availability: { owned: 2, free: 1 },
} as unknown as BrowseCard;

const read = (over: Partial<FitsRead> = {}): FitsRead => ({
  card: { oracleId: "o-birds", name: "Birds of Paradise", colorIdentity: ["G"], commanderLegal: true, role: "ramp" },
  staple: false,
  owned: 2,
  free: 1,
  fits: [
    { id: "d-g", name: "Gishath", commanders: ["Gishath, Sun's Avatar"], inclusion: 58.2, need: { role: "ramp", have: 7, target: 10 } },
    { id: "d-k", name: "Kinnan", commanders: ["Kinnan, Bonder Prodigy"], inclusion: null, need: null },
  ],
  holds: [{ id: "d-a", name: "Atraxa", quantity: 1 }],
  excluded: [],
  ...over,
});

function draw() {
  return render(
    <CardDetailProvider fetchCard={async () => null}>
      <FitsPicker card={card} onClose={() => {}} />
    </CardDetailProvider>,
  );
}
const settle = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  actions.loadFitsAction.mockReset();
  actions.addFromFits.mockReset();
});

describe("FitsPicker", () => {
  it("draws the card's copies while loading, then the two groups by name with their facts", async () => {
    let resolve!: (r: FitsRead) => void;
    actions.loadFitsAction.mockReturnValue(new Promise((r) => { resolve = r; }));
    draw();
    expect(screen.getByRole("status")).toHaveTextContent(copy.loadingHeading);
    expect(screen.getByTestId("fits-copies")).toHaveTextContent(copy.copies(2, 1));

    await act(async () => resolve(read()));
    const rows = screen.getAllByTestId("fits-row");
    expect(rows.map((r) => r.querySelector("a")?.textContent)).toEqual(["Gishath", "Kinnan"]);
    expect(rows[0]).toHaveTextContent(copy.cmdrFigure("58", "Gishath"));
    expect(rows[0]).toHaveTextContent(copy.need("ramp", 7, 10));
    expect(rows[1]).toHaveTextContent(copy.cmdrUnlisted("Kinnan"));
    expect(rows[1]).not.toHaveTextContent(copy.needLabel);
    expect(screen.getAllByTestId("fits-holds-row")[0]).toHaveTextContent(copy.holds(1));
    expect(screen.getAllByRole("button", { name: /using your free copy/ })).toHaveLength(2);
  });

  it("names a universal staple, never a percentage, with the note once (addendum)", async () => {
    actions.loadFitsAction.mockResolvedValue(read({ staple: true }));
    draw();
    await settle();
    for (const row of screen.getAllByTestId("fits-row")) {
      expect(row).toHaveTextContent(copy.cmdrStaple);
      expect(row.textContent).not.toMatch(/%/);
    }
    expect(screen.getAllByTestId("fits-staple-note")).toHaveLength(1);
    expect(screen.getByTestId("fits-staple-note")).toHaveTextContent(copy.stapleNote("Birds of Paradise"));
  });

  it("uses the no-role note for a staple with no role", async () => {
    actions.loadFitsAction.mockResolvedValue(read({ staple: true, card: { ...read().card, role: "other" } }));
    draw();
    await settle();
    expect(screen.getByTestId("fits-staple-note")).toHaveTextContent(copy.stapleNoteNoRole("Birds of Paradise"));
  });

  it("offers Add to buy on every row once no copy is free (H1)", async () => {
    actions.loadFitsAction.mockResolvedValue(read({ free: 0 }));
    draw();
    await settle();
    expect(screen.getAllByRole("button", { name: /as a card to buy/ })).toHaveLength(2);
    expect(screen.getByTestId("fits-copies")).toHaveTextContent(copy.copies(2, 0));
  });

  it("stamps the added row in place, says it used the last free copy, and flips the rest to Add to buy", async () => {
    actions.loadFitsAction.mockResolvedValueOnce(read()).mockResolvedValueOnce(read({ free: 0, fits: [read().fits[1]] }));
    actions.addFromFits.mockResolvedValue({ ok: true });
    draw();
    await settle();
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /using your free copy/ })[0]); });
    await settle();
    expect(actions.addFromFits).toHaveBeenCalledWith("d-g", "o-birds");
    const [gishath, kinnan] = screen.getAllByTestId("fits-row");
    expect(gishath).toHaveTextContent(copy.added);
    expect(gishath).toHaveTextContent(copy.addedUsedLast);
    expect(gishath.querySelector('a[href="/decks/d-g"]')).not.toBeNull();
    expect(kinnan).toHaveTextContent(copy.addToBuy);
    expect(screen.getByTestId("fits-copies")).toHaveTextContent(copy.copies(2, 0));
  });

  it("claims no count when the re-read after an add fails, and Try again brings the stamp back", async () => {
    let land: (r: FitsRead) => void = () => {};
    actions.loadFitsAction.mockResolvedValueOnce(read()).mockRejectedValueOnce(new Error("down"))
      .mockReturnValueOnce(new Promise<FitsRead>((resolve) => { land = resolve; }));
    actions.addFromFits.mockResolvedValue({ ok: true });
    draw();
    await settle();
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /using your free copy/ })[0]); });
    await settle();
    // No row offers an Add against a count that is spent, and the plate draws no count at all.
    expect(screen.getByRole("alert")).toHaveTextContent(copy.failed.heading);
    expect(screen.queryAllByTestId("fits-row")).toHaveLength(0);
    expect(screen.queryByTestId("fits-copies")).toBeNull();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: swapToolsCopy.sheet.retry })); });
    // Loading again, the payload's count is still the spent one.
    expect(screen.queryByTestId("fits-copies")).toBeNull();
    await act(async () => { land(read({ free: 0, fits: [read().fits[1]] })); });
    await settle();
    const [gishath, kinnan] = screen.getAllByTestId("fits-row");
    expect(gishath).toHaveTextContent(copy.addedFree);
    expect(gishath).not.toHaveTextContent(copy.addedUsedLast);
    expect(kinnan).toHaveTextContent(copy.addToBuy);
    expect(screen.getByTestId("fits-copies")).toHaveTextContent(copy.copies(2, 0));
  });

  it("stamps nothing when the deck already held it, and moves the deck to its holders", async () => {
    const heldBy = { id: "d-g", name: "Gishath", quantity: 1 };
    actions.loadFitsAction.mockResolvedValueOnce(read())
      .mockResolvedValueOnce(read({ fits: [read().fits[1]], holds: [...read().holds, heldBy] }));
    actions.addFromFits.mockResolvedValue({ ok: true, held: true });
    draw();
    await settle();
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /using your free copy/ })[0]); });
    await settle();
    const rows = screen.getAllByTestId("fits-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Kinnan");
    expect(screen.queryByText(copy.added)).toBeNull();
    expect(screen.getByRole("link", { name: copy.deckLinkAria("Gishath") })).toBeInTheDocument();
  });

  it("draws no copies line before the read when the payload's availability is unknown", async () => {
    actions.loadFitsAction.mockReturnValueOnce(new Promise(() => {}));
    render(
      <CardDetailProvider fetchCard={async () => null}>
        <FitsPicker card={{ ...card, availability: null } as BrowseCard} onClose={() => {}} />
      </CardDetailProvider>,
    );
    await settle();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByTestId("fits-copies")).toBeNull();
  });

  it("keeps the button and says the deck is unchanged when an add is refused", async () => {
    actions.loadFitsAction.mockResolvedValue(read());
    actions.addFromFits.mockResolvedValue({ ok: false, message: "full" });
    draw();
    await settle();
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /using your free copy/ })[0]); });
    const [gishath] = screen.getAllByTestId("fits-row");
    expect(gishath).toHaveTextContent(copy.addRefused);
    expect(gishath).not.toHaveTextContent(copy.added);
  });

  it("says every deck holds it, with the copies line still drawn (F15)", async () => {
    actions.loadFitsAction.mockResolvedValue(read({ fits: [] }));
    draw();
    await settle();
    expect(screen.getByText(copy.allHold("Birds of Paradise"))).toBeInTheDocument();
    expect(screen.queryAllByTestId("fits-row")).toHaveLength(0);
    expect(screen.getAllByTestId("fits-holds-row")).toHaveLength(1);
    expect(screen.getByTestId("fits-copies")).toBeInTheDocument();
  });

  it("names the card's colors when no deck can play it", async () => {
    actions.loadFitsAction.mockResolvedValue(read({ fits: [], holds: [] }));
    draw();
    await settle();
    expect(screen.getByText(copy.noneByColorsOne("Birds of Paradise", "green"))).toBeInTheDocument();
  });

  it("fails into the sheet's failed shape, and Try again reads again", async () => {
    actions.loadFitsAction.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(read());
    draw();
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent(copy.failed.heading);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: swapToolsCopy.sheet.retry })); });
    await settle();
    expect(screen.getAllByTestId("fits-row")).toHaveLength(2);
  });
});

describe("the Fits door", () => {
  const withGate = (gate: Partial<BrowseCard>): BrowseCard => ({
    oracleId: "o-birds", name: "Birds of Paradise", typeLine: "Creature", manaCost: "{G}", cmc: 1, oracleText: null,
    keywords: [], rarity: "rare", colorIdentity: ["G"], imageUri: null, printedName: null, quantity: 2, printings: [],
    setCodes: [], primarySetCode: "", preferredPrinting: null, ...gate,
  });
  async function openCard(gate: Partial<BrowseCard>) {
    const { CardDetailTrigger } = await import("./card-detail-provider");
    render(
      <CardDetailProvider fetchCard={async () => withGate(gate)}>
        <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">open</CardDetailTrigger>
      </CardDetailProvider>,
    );
    await act(async () => { fireEvent.click(screen.getByText("open")); });
  }

  it("draws on a Commander-legal card for a reader with a deck, at both widths", async () => {
    await openCard({ commanderLegal: true, hasDecks: true });
    expect(screen.getAllByTestId("fits-door")).toHaveLength(2);
  });

  it.each([
    ["a card that is not legal", { commanderLegal: false, hasDecks: true }],
    ["a reader with no deck", { commanderLegal: true, hasDecks: false }],
    ["a payload without the gate (the swap tools off)", {}],
  ])("draws nothing for %s", async (_, gate) => {
    await openCard(gate);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryAllByTestId("fits-door")).toHaveLength(0);
  });

  it("stacks the picker over the card, which stays mounted and covered", async () => {
    actions.loadFitsAction.mockResolvedValue(read());
    await openCard({ commanderLegal: true, hasDecks: true });
    const cardNode = document.querySelector('[aria-labelledby^="card-modal-title"]');
    await act(async () => { fireEvent.click(screen.getAllByTestId("fits-door")[0]); });
    await settle();
    expect(screen.getByTestId("fits-picker")).toBeInTheDocument();
    // The same node, not a remount under a new key, and covered.
    expect(cardNode?.isConnected).toBe(true);
    expect(document.querySelector('[aria-labelledby^="card-modal-title"]')).toBe(cardNode);
    expect(cardNode?.closest("[inert]")).not.toBeNull();
  });
});
