// Deck printings PR 4: the picker in deck scope, through the PROVIDER, which is the production path.
// A card the deck holds, opened with the deck's picks, picks for that deck: it starts from the
// deck's pick, writes through `setDeckPrinting` and never the Collection's art preference. Every
// other case (no picks because the switch is off, or a card the deck does not hold) is today's
// collection-scoped picker.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { BrowseCard, BrowsePrinting, PreferredPrinting } from "../../lib/collection/browse";
import { printingPickerCopy } from "../../lib/copy/collection";
import { deckPrintingsCopy } from "../../lib/copy/deck-printings";

const setCardArtPreference = vi.fn(async () => true);
vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: (...a: unknown[]) => setCardArtPreference(...(a as [])),
  clearCardArtPreference: vi.fn(async () => {}),
}));
vi.mock("../../app/decks/actions", () => ({ setCardProxied: vi.fn(async () => ({ ok: true })) }));
const setDeckPrinting = vi.fn(async (): Promise<{ ok: boolean }> => ({ ok: true }));
vi.mock("../../app/decks/printing-actions", () => ({
  setDeckPrinting: (...a: unknown[]) => setDeckPrinting(...(a as [])),
}));

const { CardDetailProvider, useCardDetail } = await import("./card-detail-provider");

const printing = (setCode: string, collectorNumber: string): BrowsePrinting => ({
  setCode, setName: `${setCode} set`, collectorNumber, releasedAt: "2021-01-01",
  quantity: 1, finishes: { nonfoil: 1 }, imageUri: `https://img/${setCode}.jpg`, flavorName: null,
});

const card = (oracleId: string) => ({
  oracleId, name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", cmc: 1, oracleText: null,
  keywords: [], rarity: "uncommon" as const, colorIdentity: [], imageUri: null,
  printings: [printing("C21", "263"), printing("LEA", "270"), printing("ZNR", "12")],
  // The Collection's own pick, which deck scope must not start from.
  preferredPrinting: { setCode: "ZNR", collectorNumber: "12" },
  owned: [], proxiedBy: [],
}) as unknown as BrowseCard;

function Open({ id }: { id: string }) {
  const { open } = useCardDetail();
  return <button type="button" onClick={() => open(id)}>open {id}</button>;
}

const mount = (picks: Record<string, PreferredPrinting> | null) =>
  render(
    <CardDetailProvider
      fetchCard={async (id) => card(id)}
      deckId="d1"
      deckName="Artifacts"
      deckOracleIds={new Set(["held"])}
      deckPrintingPicks={picks}
    >
      <Open id="held" />
      <Open id="loose" />
    </CardDetailProvider>,
  );

async function openPicker(id: string) {
  await act(async () => { fireEvent.click(screen.getByText(`open ${id}`)); });
  await act(async () => {
    fireEvent.click(screen.getAllByRole("button", { name: /printings owned/ })[0]);
  });
}

const pickTile = async (set: RegExp) => {
  await act(async () => { fireEvent.click(screen.getAllByRole("radio", { name: set })[0]); });
};

beforeEach(() => {
  setCardArtPreference.mockClear();
  setDeckPrinting.mockReset();
  setDeckPrinting.mockResolvedValue({ ok: true });
});

describe("the picker in deck scope", () => {
  it("starts from the deck's pick and pins `For this deck`", async () => {
    mount({ held: { setCode: "LEA", collectorNumber: "270" } });
    await openPicker("held");
    // On the Set line itself; `Your pick` stays the tile's own badge.
    const triggers = [...document.querySelectorAll("button[aria-expanded=\"true\"]")];
    expect(triggers.length).toBeGreaterThan(0);
    for (const trigger of triggers) {
      expect(trigger.textContent).toContain(deckPrintingsCopy.picker.pinned);
      expect(trigger.textContent).not.toContain(printingPickerCopy.printing.triggerPicked);
    }
    expect(screen.getAllByText(deckPrintingsCopy.picker.regionIntroPicked).length).toBeGreaterThan(0);
    // The deck's pick is the checked tile, not the Collection's ZNR.
    expect(screen.getAllByRole("radio", { name: /LEA/ })[0].getAttribute("aria-checked")).toBe("true");
  });

  it("writes the deck's pick, never the Collection's art preference", async () => {
    mount({});
    await openPicker("held");
    expect(screen.getAllByText(deckPrintingsCopy.picker.regionIntro(3)).length).toBeGreaterThan(0);
    await pickTile(/C21/);
    expect(setDeckPrinting).toHaveBeenCalledWith("d1", "held", { setCode: "C21", collectorNumber: "263" });
    expect(setCardArtPreference).not.toHaveBeenCalled();
    expect(document.body.textContent).not.toContain(deckPrintingsCopy.picker.failed);
  });

  it("reverts a refused pick and says so in the region", async () => {
    setDeckPrinting.mockResolvedValue({ ok: false });
    mount({ held: { setCode: "LEA", collectorNumber: "270" } });
    await openPicker("held");
    await pickTile(/C21/);
    const notices = screen.getAllByRole("status").filter((n) => n.textContent?.includes(deckPrintingsCopy.picker.failed));
    expect(notices.length).toBeGreaterThan(0);
    expect(screen.getAllByRole("radio", { name: /LEA/ })[0].getAttribute("aria-checked")).toBe("true");
  });

  it("is the Collection's picker with the switch off", async () => {
    mount(null);
    await openPicker("held");
    expect(screen.queryByText(deckPrintingsCopy.picker.pinned)).toBeNull();
    await pickTile(/C21/);
    expect(setCardArtPreference).toHaveBeenCalled();
    expect(setDeckPrinting).not.toHaveBeenCalled();
  });

  it("is the Collection's picker on a card the deck does not hold", async () => {
    mount({});
    await openPicker("loose");
    await pickTile(/C21/);
    expect(setCardArtPreference).toHaveBeenCalled();
    expect(setDeckPrinting).not.toHaveBeenCalled();
  });
});
