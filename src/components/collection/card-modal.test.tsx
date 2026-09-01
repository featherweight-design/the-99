// The card-detail availability block (#43, Addendum 2 §3). This is the only
// place on /collection that names the deck holding a card, so the count-only
// rule that governs rows and tiles stops here — and the claiming deck's status
// pill is deliberately absent rather than guessed.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Availability } from "../../lib/decks/availability";
import type { BrowseCard } from "../../lib/collection/browse";
import { availabilityCopy } from "../../lib/copy/availability";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(),
  clearCardArtPreference: vi.fn(),
}));

const { CardModal } = await import("./card-modal");

const card: BrowseCard = {
  oracleId: "o1",
  name: "Smothering Tithe",
  typeLine: "Enchantment",
  manaCost: "{3}{W}",
  oracleText: "",
  keywords: [],
  rarity: "rare",
  colorIdentity: ["W"],
  imageUri: null,
  quantity: 1,
  printings: [],
  setCodes: ["RVR"],
  primarySetCode: "RVR",
  preferredPrinting: null,
};

const avail = (
  owned: number,
  hard: number,
  soft = 0,
  hardDeckNames: string[] = [],
): Availability => ({ owned, hard, soft, free: owned - hard, hardDeckNames });

function mount(c: BrowseCard) {
  render(
    <CardModal card={c} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} />,
  );
}

const heading = () => screen.queryByText(availabilityCopy.collection.detailHeading);

describe("CardModal availability detail", () => {
  it("draws no block at all for a free card", () => {
    mount({ ...card, quantity: 2, availability: avail(2, 0) });
    expect(heading()).toBeNull();
  });

  it("draws no block when the availability read failed", () => {
    mount({ ...card, quantity: 2, availability: null });
    expect(heading()).toBeNull();
  });

  // The whole reason this surface exists: rows and tiles withhold the deck
  // name, and this is where the player finds out which list has the card.
  it("names the claiming deck, which no row or tile ever does", () => {
    mount({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(heading()).toBeInTheDocument();
    expect(screen.getByText(/Atraxa/)).toBeInTheDocument();
    expect(screen.getByText(availabilityCopy.collection.detailHardNote)).toBeInTheDocument();
  });

  it("picks the note off the state rather than off the hard count", () => {
    mount({ ...card, quantity: 2, availability: avail(2, 1, 1) });
    expect(screen.getByText(availabilityCopy.collection.detailSoftNote)).toBeInTheDocument();
  });

  it("reads an over-commitment as a shopping decision", () => {
    mount({ ...card, availability: avail(1, 2, 0, ["Atraxa", "Kykar"]) });
    expect(screen.getByText(availabilityCopy.collection.detailOverNote)).toBeInTheDocument();
  });

  // `hardDeckNames` carries names and nothing else, so a pill here would be
  // derived from `hard > 0` — a guess that reads as fact.
  it("does not invent the claiming deck's status pill", () => {
    mount({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(screen.queryByText(/Complete|Playable|Building|Draft/)).toBeNull();
  });
});
