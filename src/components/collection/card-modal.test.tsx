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

// `/collection` reads from off every decklist, so `free` really is `owned − hard`
// here. Fixtures for a deck's own list must set `free` explicitly instead.
const avail = (
  owned: number,
  hard: number,
  soft = 0,
  hardDeckNames: string[] = [],
): Availability => ({
  owned,
  hard,
  soft,
  free: owned - hard,
  hardDecks: hardDeckNames.map((n, i) => ({ id: `d${i + 1}`, name: n })),
});

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

  // The clause ships no status pill, so the link is what takes the player to
  // the deck that has their card.
  it("links the named deck to that deck", () => {
    mount({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    const link = screen.getByRole("link", {
      name: availabilityCopy.collection.detailDeckLinkAria("Atraxa"),
    });
    expect(link).toHaveAttribute("href", "/decks/d1");
  });

  it("picks the note off the state rather than off the hard count", () => {
    mount({ ...card, quantity: 2, availability: avail(2, 1, 1) });
    expect(screen.getByText(availabilityCopy.collection.detailSoftNote)).toBeInTheDocument();
  });

  it("reads an over-commitment as a shopping decision", () => {
    mount({ ...card, availability: avail(1, 2, 0, ["Atraxa", "Kykar"]) });
    expect(screen.getByText(availabilityCopy.collection.detailOverNote)).toBeInTheDocument();
  });

  // `hardDecks` carries an id and a name and nothing else, so a pill here would be
  // derived from `hard > 0` — a guess that reads as fact.
  it("does not invent the claiming deck's status pill", () => {
    mount({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(screen.queryByText(/Complete|Playable|Building|Draft/)).toBeNull();
  });
});

// The mobile art header and the tile inside it draw the same picture. At full
// sharpness on both, the card's own text was legible twice over at two sizes,
// one behind the other, and the band read as noise rather than as backdrop.
describe("CardModal mobile art header", () => {
  // The art follows the resolved printing, not the card-level image, so the
  // fixture has to own one for anything but the identity gradient to render.
  const art: BrowseCard = {
    ...card,
    imageUri: "https://cards.scryfall.io/normal/tithe.jpg",
    printings: [
      {
        setCode: "RVR",
        setName: "Ravnica Remastered",
        collectorNumber: "24",
        releasedAt: "2024-01-12",
        quantity: 1,
        finishes: { nonfoil: 1 },
        imageUri: "https://cards.scryfall.io/normal/tithe.jpg",
      },
    ],
  };

  it("keeps the band's copy of the art as a blurred wash", () => {
    mount(art);
    const wash = screen.getByTestId("mobile-art-wash");
    expect(wash.style.filter).toContain("blur");
    expect(Number(wash.style.opacity)).toBeLessThan(1);
    expect(wash.style.backgroundImage).toContain("tithe.jpg");
  });

  it("leaves the band itself unpainted, so only the wash carries the art", () => {
    mount(art);
    const band = screen.getByTestId("mobile-art-wash").parentElement!;
    expect(band.style.backgroundImage).toBe("");
  });
});
