// A deck's token printing picker (token printings TP2): the card picker, opened from a token row through the
// same press and sheet, offering the printings the player holds and writing the DECK's pick for that token.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { DeckToken, DeckTokensRead } from "../../lib/tokens/read";
import { deckPrintingsCopy } from "../../lib/copy/deck-printings";

vi.mock("../../db", () => ({ db: {} }));
const setCardArtPreference = vi.fn(async () => true);
vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: (...a: unknown[]) => setCardArtPreference(...(a as [])),
  clearCardArtPreference: vi.fn(async () => {}),
}));
vi.mock("../../app/decks/actions", () => ({ setCardProxied: vi.fn(async () => ({ ok: true })) }));
vi.mock("../../app/decks/printing-actions", () => ({ setDeckPrinting: vi.fn(async () => ({ ok: true })) }));
const setDeckTokenPrinting = vi.fn(async (): Promise<{ ok: boolean }> => ({ ok: true }));
vi.mock("../../app/decks/token-actions", () => ({
  setDeckTokenPrinting: (...a: unknown[]) => setDeckTokenPrinting(...(a as [])),
}));

const { CardDetailProvider, useCardDetail } = await import("./card-detail-provider");
await (await import("./card-detail-provider")).warmCardModal();
const { DeckTokensProvider } = await import("../decks/deck-tokens-context");
const { assembleTokenDetail } = await import("../../lib/tokens/detail");

const TOKEN = { oracleId: "t-1", name: "Soldier", typeLine: "Token Creature — Soldier", colors: ["W"], oracleText: null, layout: "token" };
const PRINTINGS = [
  { scryfallId: "p-a", setCode: "tm21", collectorNumber: "9", imageUri: "https://img/a.jpg", backImageUri: null },
  { scryfallId: "p-b", setCode: "tclb", collectorNumber: "4", imageUri: "https://img/b.jpg", backImageUri: null },
];
const HELD = [{ tokenPrintingId: "p-a", quantity: 2 }, { tokenPrintingId: "p-b", quantity: 1 }];

const row = (over: Partial<DeckToken> = {}): DeckToken => ({
  oracleId: "t-1", name: "Soldier", typeLine: "Token Creature — Soldier", colors: ["W"], power: "1", toughness: "1",
  oracleText: null, makers: [{ oracleId: "m-1", name: "Maker", imageUri: null }], state: "owned", source: "upload",
  joined: false, picture: null, printingPick: null, price: null, ...over,
});

function Open() {
  const { open } = useCardDetail();
  return <button type="button" onClick={() => open("t-1")}>open token</button>;
}

const mount = (tokens: DeckTokensRead | null, held = HELD) => {
  const provider = (
    <CardDetailProvider
      fetchCard={async () => assembleTokenDetail(TOKEN, PRINTINGS, null, null, held)}
      deckId="d1" deckName="Soldiers" deckOracleIds={new Set(["m-1"])} deckPrintingPicks={{}}
    >
      <Open />
    </CardDetailProvider>
  );
  return render(tokens ? <DeckTokensProvider deckId="d1" read={tokens}>{provider}</DeckTokensProvider> : provider);
};
const ok = (t: DeckToken): DeckTokensRead => ({ status: "ok", read: true, tokens: [t], makerCount: 1, newestPriceAsOf: null });

const pickerTriggers = () => screen.queryAllByRole("button", { name: /printings owned/ });

beforeEach(() => {
  setCardArtPreference.mockClear();
  setDeckTokenPrinting.mockReset();
  setDeckTokenPrinting.mockResolvedValue({ ok: true });
});

describe("a deck's token printing picker", () => {
  it("offers the held printings from the deck, and writes the deck's pick for the token", async () => {
    mount(ok(row()));
    await act(async () => { fireEvent.click(screen.getByText("open token")); });
    expect(pickerTriggers().length).toBeGreaterThan(0);
    await act(async () => { fireEvent.click(pickerTriggers()[0]); });
    expect(screen.getAllByText(deckPrintingsCopy.picker.regionIntro(2)).length).toBeGreaterThan(0);
    await act(async () => { fireEvent.click(screen.getAllByRole("radio", { name: /TCLB/ })[0]); });
    expect(setDeckTokenPrinting).toHaveBeenCalledWith("d1", "t-1", { setCode: "TCLB", collectorNumber: "4" });
    expect(setCardArtPreference).not.toHaveBeenCalled();
  });

  it("opens on the deck's own pick", async () => {
    mount(ok(row({ printingPick: { setCode: "TCLB", collectorNumber: "4" } })));
    await act(async () => { fireEvent.click(screen.getByText("open token")); });
    await act(async () => { fireEvent.click(pickerTriggers()[0]); });
    expect(screen.getAllByRole("radio", { name: /TCLB/ })[0].getAttribute("aria-checked")).toBe("true");
  });

  it("draws no picker outside the deck's tokens, where nothing could save a token's pick", async () => {
    mount(null);
    await act(async () => { fireEvent.click(screen.getByText("open token")); });
    expect(screen.getAllByText("Soldier").length).toBeGreaterThan(0);
    expect(pickerTriggers()).toHaveLength(0);
  });

  it("draws no picker for one held printing, nothing to choose between", async () => {
    mount(ok(row()), [{ tokenPrintingId: "p-a", quantity: 3 }]);
    await act(async () => { fireEvent.click(screen.getByText("open token")); });
    expect(pickerTriggers()).toHaveLength(0);
  });
});
