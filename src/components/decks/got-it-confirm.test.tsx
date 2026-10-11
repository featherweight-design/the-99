import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PrintingChoice } from "../../lib/collection/catalog-read";
import { gotItCopy } from "../../lib/copy/i-got-it";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { PriceFact } from "../../lib/decks/price";

const { loadPrintingChoices, markBought } = vi.hoisted(() => ({
  loadPrintingChoices: vi.fn(),
  markBought: vi.fn(),
}));
vi.mock("../../app/collection/edit-actions", () => ({ loadPrintingChoices }));
vi.mock("../../app/decks/mark-bought-actions", () => ({ markBought }));

const { GotItConfirm } = await import("./got-it-confirm");

const c = gotItCopy.confirm;
const DECK = "11111111-1111-4111-8111-111111111111";
const ORACLE = "33333333-3333-4333-8333-333333333333";
const NEWEST = new Date("2026-10-10T09:00:00Z");
const STALE = new Date("2026-10-01T09:00:00Z");

const choice = (over: Partial<PrintingChoice>): PrintingChoice => ({
  scryfallId: "a0000000-0000-4000-8000-000000000000", setCode: "mom", setName: "March of the Machine",
  collectorNumber: "137", releasedAt: "2023-04-21", imageUri: null, flavorName: null,
  finishes: ["nonfoil", "foil"], owned: {}, ...over,
});
const MOM = choice({ owned: { nonfoil: 2 } });
const SHOWCASE = choice({ scryfallId: "b0000000-0000-4000-8000-000000000000", setName: "MOM showcase", collectorNumber: "300" });
const PROMO = choice({ scryfallId: "c0000000-0000-4000-8000-000000000000", setCode: "pmom", setName: "MOM promos", collectorNumber: "137p", finishes: ["foil"] });

const price = (over: Partial<PriceFact>): PriceFact => ({ cents: null, foilCents: null, etchedCents: null, asOf: NEWEST, ...over });

const card = (over: Partial<DeckDetailCard> = {}): DeckDetailCard => ({
  oracleId: ORACLE, name: "Etali, Primal Conqueror", typeLine: "Legendary Creature", cardTypeGroup: "Creatures",
  role: "other", cmc: 7, owned: false, quantity: 1, auto: false, availability: null,
  price: price({ cents: 300, printing: { scryfallId: MOM.scryfallId } }), manaCost: "{5}{R}{G}", imageUri: null,
  printedName: null, printedSetCode: null, printedCollectorNumber: null,
  ...over,
} as DeckDetailCard);

function renderConfirm(over: { card?: DeckDetailCard } = {}) {
  const onClose = vi.fn();
  const onDone = vi.fn();
  const onPendingChange = vi.fn();
  render(
    <GotItConfirm
      deckId={DECK}
      card={over.card ?? card()}
      cardName="Etali, Primal Conqueror"
      newestAsOf={NEWEST}
      onClose={onClose}
      onDone={onDone}
      onPendingChange={onPendingChange}
    />,
  );
  return { onClose, onDone, onPendingChange };
}

const printingRadios = () => screen.getByRole("radiogroup", { name: "Printings" }).querySelectorAll('[role="radio"]');
const banner = () => screen.getByText(c.staleTitle).closest('[role="status"]') as HTMLElement;
const add = () => screen.getByRole("button", { name: /^Add|Choose a printing|Adding/ });

beforeEach(() => {
  loadPrintingChoices.mockReset();
  markBought.mockReset();
  loadPrintingChoices.mockResolvedValue([MOM, SHOWCASE, PROMO]);
});
afterEach(cleanup);

describe("GotItConfirm", () => {
  it("opens on the printing behind the live figure, nonfoil, at the need", async () => {
    renderConfirm();
    expect(screen.getByRole("dialog", { name: c.title })).toHaveAccessibleDescription("Etali, Primal Conqueror");
    expect(screen.getByRole("heading", { level: 3, name: c.title })).toBeInTheDocument();
    await waitFor(() => expect(printingRadios()).toHaveLength(3));
    expect([...printingRadios()].map((r) => r.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
    expect(screen.getByRole("radio", { name: c.finishes.nonfoil })).toHaveAttribute("aria-checked", "true");
    expect(add()).toHaveTextContent(c.add(1));
    expect(screen.getByText(c.need(1))).toBeInTheDocument();
    // No price anywhere on the form.
    expect(screen.queryByText(/\$\d/)).toBeNull();
  });

  it("presets nothing on a sold-out row, and Add reads Choose a printing until one is chosen", async () => {
    renderConfirm({ card: card({ price: price({ cents: 300, asOf: STALE, printing: { scryfallId: MOM.scryfallId } }) }) });
    await waitFor(() => expect(printingRadios()).toHaveLength(3));
    for (const r of printingRadios()) expect(r).toHaveAttribute("aria-checked", "false");
    expect(add()).toHaveTextContent(c.choosePrinting);
    // aria-disabled, not native: it stays focusable, and a press writes nothing.
    expect(add()).toHaveAttribute("aria-disabled", "true");
    expect(add()).not.toBeDisabled();
    await act(async () => fireEvent.click(add()));
    expect(markBought).not.toHaveBeenCalled();
    fireEvent.click(printingRadios()[1]);
    expect(add()).not.toHaveAttribute("aria-disabled");
    expect(add()).toHaveTextContent(c.add(1));
  });

  it("offers only the finishes the selected printing has, and draws nonfoil dashed on a foil-only one", async () => {
    renderConfirm();
    await waitFor(() => expect(printingRadios()).toHaveLength(3));
    fireEvent.click(printingRadios()[2]);
    expect(screen.getByRole("radio", { name: c.finishes.foil })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: c.finishes.nonfoil })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(c.foilOnly)).toBeInTheDocument();
  });

  it("draws no picker for a card's only printing, and selects it", async () => {
    loadPrintingChoices.mockResolvedValue([MOM]);
    renderConfirm({ card: card({ price: null }) });
    await waitFor(() => expect(screen.getByText(c.printingCount(1))).toBeInTheDocument());
    expect(screen.queryByRole("radiogroup", { name: "Printings" })).toBeNull();
    expect(add()).toHaveTextContent(c.add(1));
    expect(add()).not.toHaveAttribute("aria-disabled");
  });

  it("sends the chosen printing, finish, count and the holding's count as expected", async () => {
    markBought.mockResolvedValue({ applied: { id: "e1", receipt: null } });
    const { onDone } = renderConfirm({ card: card({ quantity: 2 }) });
    await waitFor(() => expect(printingRadios()).toHaveLength(3));
    fireEvent.click(screen.getByRole("button", { name: c.more }));
    expect(screen.getByText(/1 spare/)).toBeInTheDocument();
    await act(async () => fireEvent.click(add()));
    expect(markBought).toHaveBeenCalledTimes(1);
    const [deckId, oracleId, input] = markBought.mock.calls[0];
    expect(deckId).toBe(DECK);
    expect(oracleId).toBe(ORACLE);
    // The player holds two nonfoil copies of that printing: the write raises them.
    expect(input).toMatchObject({ scryfallId: MOM.scryfallId, finish: "nonfoil", quantity: 3, expected: 2 });
    expect(input.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("sends the variant chosen when two share a set and number", async () => {
    const TWIN = choice({ scryfallId: "d0000000-0000-4000-8000-000000000000", owned: {} });
    loadPrintingChoices.mockResolvedValue([MOM, TWIN, SHOWCASE]);
    markBought.mockResolvedValue({ applied: { id: "e1", receipt: null } });
    renderConfirm();
    await waitFor(() => expect(printingRadios()).toHaveLength(3));
    // The figure is MOM's: only it is checked, not its twin.
    expect([...printingRadios()].map((r) => r.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
    fireEvent.click(printingRadios()[1]);
    expect([...printingRadios()].map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true", "false"]);
    await act(async () => fireEvent.click(add()));
    expect(markBought.mock.calls[0][2]).toMatchObject({ scryfallId: TWIN.scryfallId, expected: 0 });
  });

  it("writes nothing on Cancel or Escape", async () => {
    const { onClose } = renderConfirm();
    await waitFor(() => expect(printingRadios()).toHaveLength(3));
    fireEvent.click(screen.getByRole("button", { name: c.cancel }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(markBought).not.toHaveBeenCalled();
  });

  it("disables Cancel and refuses Escape while the write is in flight", async () => {
    let resolve!: (v: unknown) => void;
    markBought.mockReturnValue(new Promise((r) => { resolve = r; }));
    const { onClose, onPendingChange } = renderConfirm();
    await waitFor(() => expect(printingRadios()).toHaveLength(3));
    await act(async () => fireEvent.click(add()));
    expect(onPendingChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("button", { name: c.cancel })).toBeDisabled();
    expect(add()).toHaveTextContent(c.adding);
    expect(add()).toHaveAttribute("aria-disabled", "true");
    await act(async () => fireEvent.click(add()));
    expect(markBought).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => resolve({ applied: { id: "e1", receipt: null } }));
    expect(onPendingChange).toHaveBeenLastCalledWith(false);
  });

  it("re-bases in place on stale: the banner, the new need and count, and the new expected next time", async () => {
    markBought.mockResolvedValueOnce({
      stale: [{ oracleId: ORACLE, setCode: "mom", collectorNumber: "137", finish: "nonfoil", quantity: 3 }],
    });
    renderConfirm({ card: card({ quantity: 3 }) });
    await waitFor(() => expect(printingRadios()).toHaveLength(3));
    expect(add()).toHaveTextContent(c.add(3));
    await act(async () => fireEvent.click(add()));
    // One copy landed elsewhere (2 → 3): the deck needs 2 now.
    expect(banner()).toHaveTextContent(c.staleTitle);
    expect(banner()).toHaveTextContent(c.staleBody(2));
    expect(banner()).toHaveFocus();
    expect(add()).toHaveTextContent(c.add(2));
    markBought.mockResolvedValueOnce({ applied: { id: "e1", receipt: null } });
    await act(async () => fireEvent.click(add()));
    const first = markBought.mock.calls[0][2];
    const second = markBought.mock.calls[1][2];
    expect(second).toMatchObject({ quantity: 2, expected: 3 });
    // A new decision is a new press.
    expect(second.id).not.toBe(first.id);
  });

  it("raises the need when copies left elsewhere, without saying one was added", async () => {
    markBought.mockResolvedValueOnce({
      stale: [{ oracleId: ORACLE, setCode: "mom", collectorNumber: "137", finish: "nonfoil", quantity: 1 }],
    });
    renderConfirm({ card: card({ quantity: 4 }) });
    await waitFor(() => expect(printingRadios()).toHaveLength(3));
    const before = Number(/\d+/.exec(add().textContent ?? "")![0]);
    await act(async () => fireEvent.click(add()));
    // One copy went elsewhere (2 → 1): the deck needs one more, and the banner names no addition.
    expect(banner()).toHaveTextContent(c.staleTitle);
    expect(banner().textContent).not.toMatch(/added somewhere else/);
    expect(banner()).toHaveFocus();
    expect(add()).toHaveTextContent(c.add(Math.min(4, before + 1)));
    expect(markBought.mock.calls).toHaveLength(1);
  });

  it("keeps the count and says so when a stale answer leaves no need", async () => {
    markBought.mockResolvedValueOnce({
      stale: [{ oracleId: ORACLE, setCode: "mom", collectorNumber: "137", finish: "nonfoil", quantity: 3 }],
    });
    renderConfirm();
    await waitFor(() => expect(printingRadios()).toHaveLength(3));
    await act(async () => fireEvent.click(add()));
    expect(banner()).toHaveTextContent(c.staleBodyDone);
    expect(add()).toHaveTextContent(c.add(1));
  });

  it("keeps the choices when the write fails, and retries the same press", async () => {
    markBought.mockRejectedValueOnce(new Error("network"));
    renderConfirm();
    await waitFor(() => expect(printingRadios()).toHaveLength(3));
    fireEvent.click(printingRadios()[1]);
    fireEvent.click(screen.getByRole("radio", { name: c.finishes.foil }));
    await act(async () => fireEvent.click(add()));
    expect(screen.getByRole("alert")).toHaveTextContent(c.failedTitle);
    expect(printingRadios()[1]).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: c.finishes.foil })).toHaveAttribute("aria-checked", "true");
    markBought.mockResolvedValueOnce({ applied: { id: "e1", receipt: null } });
    await act(async () => fireEvent.click(add()));
    expect(markBought.mock.calls[1][2].id).toBe(markBought.mock.calls[0][2].id);
    expect(markBought.mock.calls[1][2]).toMatchObject({ scryfallId: SHOWCASE.scryfallId, finish: "foil", expected: 0 });
  });

  it("reads a refusal as the failed form, with nothing written", async () => {
    markBought.mockResolvedValueOnce({ refused: "notAPrinting" });
    const { onDone } = renderConfirm();
    await waitFor(() => expect(printingRadios()).toHaveLength(3));
    await act(async () => fireEvent.click(add()));
    expect(screen.getByRole("alert")).toHaveTextContent(c.failedBody);
    expect(onDone).not.toHaveBeenCalled();
  });
});
