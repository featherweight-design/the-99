// The card-detail availability block (#43, Addendum 2 §3). This is the only
// place on /collection that names the deck holding a card, so the count-only
// rule that governs rows and tiles stops here — and the claiming deck's status
// pill is deliberately absent rather than guessed.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { Availability, DeckClaim } from "../../lib/decks/availability";
import type { BrowseCard, CardArt } from "../../lib/collection/browse";
import { availabilityCopy } from "../../lib/copy/availability";
import { printedNameCopy } from "../../lib/copy/card-surfaces";
import { printingPickerCopy } from "../../lib/copy/collection";

vi.mock("../../app/collection/actions", () => ({
  // The real action reports whether it wrote; a bare `vi.fn()` would resolve undefined and
  // read as a refusal.
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const { CardModal, artWidthReservePx } = await import("./card-modal");

const card: BrowseCard = {
  oracleId: "o1",
  name: "Smothering Tithe",
  typeLine: "Enchantment",
  manaCost: "{3}{W}", cmc: 2,
  oracleText: "",
  keywords: [],
  rarity: "rare",
  colorIdentity: ["W"],
  imageUri: null,
  printedName: null,
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
  claims: hardDeckNames.map((n, i) => ({ id: `d${i + 1}`, name: n, quantity: 1, mature: true, pending: false, commander: false, senior: true })),
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
    mount({
      ...card,
      quantity: 2,
      availability: {
        owned: 2, hard: 1, soft: 1, free: 1,
        claims: [
          { id: "d1", name: "Atraxa", quantity: 1, mature: true, pending: false, commander: false, senior: true },
          { id: "d2", name: "Sketchbook", quantity: 1, mature: false, pending: false, commander: false, senior: true },
        ],
      },
    });
    expect(screen.getByText(availabilityCopy.collection.detailSoftNote(1))).toBeInTheDocument();
  });

  it("adds no reassurance under an over-commitment (H21)", () => {
    mount({ ...card, availability: avail(1, 2, 0, ["Atraxa", "Kykar"]) });
    expect(screen.queryByText(/shopping decision/)).toBeNull();
    expect(screen.queryByText(/Nothing’s broken/)).toBeNull();
  });

  // `hardDecks` carries an id and a name and nothing else, so a pill here would be
  // derived from `hard > 0` — a guess that reads as fact.
  it("does not invent the claiming deck's status pill", () => {
    mount({ ...card, availability: avail(1, 1, 0, ["Atraxa"]) });
    expect(screen.queryByText(/Complete|Building|Draft|Over|Unresolved|To buy/)).toBeNull();
  });
});

// #353/#355: the block used to print a total and a state with nothing between
// them, so a player owning seventeen and seeing "1 in a brew" had no way to
// learn where the other sixteen went. These assert the receipt reconciles.
describe("CardModal allocation receipt", () => {
  const claim = (
    id: string, name: string, quantity: number, mature: boolean,
  ): DeckClaim => ({
    id, name, quantity, mature, pending: false, commander: false, senior: true,
  });
  // Built term by term rather than through `avail`, because the whole point of
  // these cases is claims whose quantities are not 1 and whose maturity is
  // mixed — the shapes the old fixture could not express.
  const withClaims = (
    owned: number,
    claims: ReturnType<typeof claim>[],
  ): Availability => {
    const hard = claims.filter((c) => c.mature).reduce((n, c) => n + c.quantity, 0);
    const soft = claims.filter((c) => !c.mature).reduce((n, c) => n + c.quantity, 0);
    return { owned, hard, soft, free: owned - hard, claims };
  };

  const c = availabilityCopy.collection;

  it("names every claiming deck with its own count, and the counts reconcile", () => {
    mount({
      ...card,
      quantity: 4,
      availability: withClaims(4, [
        claim("d1", "Atraxa", 1, true),
        claim("d2", "Kykar", 2, true),
      ]),
    });
    expect(screen.getByText(c.detailClaimsHeading)).toBeInTheDocument();
    expect(screen.getByText("Atraxa")).toBeInTheDocument();
    expect(screen.getByText("Kykar")).toBeInTheDocument();
    expect(screen.getByText(c.detailClaimHolds(1))).toBeInTheDocument();
    expect(screen.getByText(c.detailClaimHolds(2))).toBeInTheDocument();
    // 3 in use + 1 free = the ×4 above it.
    expect(screen.getByText(c.detailSplit(3, 1))).toBeInTheDocument();
  });

  // `quantity` and `availability` reach a BrowseCard from different queries, so
  // they can disagree. The receipt's whole claim is that its rows add up to its
  // total, which only holds while the total comes from the same query the split
  // does.
  it("takes the total from the availability query, not the card's own count", () => {
    mount({
      ...card,
      quantity: 9,
      availability: withClaims(4, [claim("d1", "Atraxa", 3, true)]),
    });
    const receipt = screen.getByText(c.detailHeading).parentElement!;
    expect(within(receipt).getByText("×4")).toBeInTheDocument();
    expect(within(receipt).queryByText("×9")).toBeNull();
    expect(screen.getByText(c.detailSplit(3, 1))).toBeInTheDocument();
  });

  it("links every named deck, not just the first", () => {
    mount({
      ...card,
      quantity: 4,
      availability: withClaims(4, [
        claim("d1", "Atraxa", 1, true),
        claim("d2", "Kykar", 2, true),
      ]),
    });
    expect(screen.getByRole("link", { name: c.detailDeckLinkAria("Atraxa") }))
      .toHaveAttribute("href", "/decks/d1");
    expect(screen.getByRole("link", { name: c.detailDeckLinkAria("Kykar") }))
      .toHaveAttribute("href", "/decks/d2");
  });

  // The case the issue was filed on: a finished list holds a copy, spare copies
  // remain, so `availabilityState` says `free` and the old block drew nothing.
  it("draws the receipt for a claimed card that still has copies to spare", () => {
    mount({
      ...card,
      quantity: 5,
      availability: withClaims(5, [claim("d1", "Atraxa", 1, true)]),
    });
    expect(screen.getByText(c.detailHeading)).toBeInTheDocument();
    expect(screen.getByText("Atraxa")).toBeInTheDocument();
    expect(screen.getByText(c.detailSplit(1, 4))).toBeInTheDocument();
    // No state note: nothing is wrong, and every note asserts a problem.
    expect(screen.queryByText(c.detailHardNote)).toBeNull();
    expect(screen.queryByText(c.detailSoftNote(1))).toBeNull();
  });

  // Finished lists HOLD, unfinished lists WANT. The verbs are the model.
  it("separates what a committed deck holds from what a brew wants", () => {
    mount({
      ...card,
      quantity: 2,
      availability: withClaims(2, [
        claim("d1", "Atraxa", 1, true),
        claim("d2", "Sketchbook", 1, false),
      ]),
    });
    expect(screen.getByText(c.detailClaimHolds(1))).toBeInTheDocument();
    expect(screen.getByText(c.detailClaimWants(1))).toBeInTheDocument();
  });

  // THE BUG: every finished list read `holds 1` against a single owned copy and the block
  // said nothing about which of them the copy actually goes to. `holds` / `wants` is commit
  // status and stays that way (card assignments R2, vocabulary ruling 4); the allocation is
  // the third axis and takes that ruling's own third pair.
  it("names the list that gets the copy and the ones that buy one", () => {
    mount({
      ...card,
      quantity: 1,
      availability: withClaims(1, [
        { ...claim("d1", "Prismari Artistry", 1, true), since: 1_000 },
        { ...claim("d2", "Avatar Aang", 1, true), since: 2_000 },
        { ...claim("d3", "Gods", 1, true), since: 3_000 },
      ]),
    });
    // Every finished list still HOLDS the card: that word is commit status, unchanged.
    const rows = screen.getAllByRole("listitem");
    const textOf = (deck: string) => rows.find((r) => r.textContent!.includes(deck))!.textContent!;
    // The copy goes to the list that sleeved it first, not the one that sorts first.
    expect(textOf("Prismari Artistry")).toContain(c.detailClaimGets);
    expect(textOf("Avatar Aang")).toContain(c.detailClaimBuys);
    expect(textOf("Gods")).toContain(c.detailClaimBuys);
    for (const deck of ["Prismari Artistry", "Avatar Aang", "Gods"]) {
      expect(textOf(deck)).toContain(c.detailClaimHolds(1));
    }
  });

  // With copies enough for everyone there is nothing to decide, and a word per row saying
  // so is a word per row saying nothing.
  it("says nothing about allocation when the card is not contested", () => {
    mount({
      ...card,
      quantity: 4,
      availability: withClaims(4, [
        { ...claim("d1", "Prismari Artistry", 1, true), since: 1_000 },
        { ...claim("d2", "Avatar Aang", 1, true), since: 2_000 },
      ]),
    });
    expect(screen.queryByText(new RegExp(c.detailClaimGets))).toBeNull();
    expect(screen.queryByText(new RegExp(c.detailClaimBuys))).toBeNull();
  });

  // A reservation is the player's own allocation and outranks seniority, which is the one
  // rule a verb read off `mature` could never express.
  it("gives the copy to the list the player reserved it for", () => {
    mount({
      ...card,
      quantity: 1,
      availability: withClaims(1, [
        { ...claim("d1", "Prismari Artistry", 1, true), since: 1_000 },
        { ...claim("d2", "Avatar Aang", 1, true), since: 2_000, granted: 1 },
      ]),
    });
    const rows = screen.getAllByRole("listitem");
    const textOf = (deck: string) => rows.find((r) => r.textContent!.includes(deck))!.textContent!;
    expect(textOf("Avatar Aang")).toContain(c.detailClaimGets);
    expect(textOf("Prismari Artistry")).toContain(c.detailClaimBuys);
  });

  // A bare `gets it` would claim the whole ask was covered, and `buys it` that none of it
  // was. Neither is true of a list that got one of the three it asked for.
  it("names how much of the ask a part-covered list got", () => {
    mount({
      ...card,
      quantity: 2,
      availability: withClaims(2, [
        { ...claim("d1", "Prismari Artistry", 1, true), since: 1_000 },
        { ...claim("d2", "Avatar Aang", 3, true), since: 2_000 },
      ]),
    });
    expect(screen.getByText(new RegExp(c.detailClaimGetsPartial(1, 3)))).toBeInTheDocument();
  });

  // `short N` counts finished lists only, deliberately. A reader looking at three lists
  // wanting one card cannot tell that from a miscount unless the block says so.
  it("says how many uncommitted decks the figures leave out", () => {
    mount({
      ...card,
      quantity: 1,
      availability: withClaims(1, [
        { ...claim("d1", "Prismari Artistry", 1, true), since: 1_000 },
        { ...claim("d2", "Avatar Aang", 1, true), since: 2_000 },
        { ...claim("d3", "Sketchbook", 1, false) },
      ]),
    });
    expect(screen.getByText(c.detailDraftsUncounted(1))).toBeInTheDocument();
  });

  // A brew the player GAVE a copy to holds it (2026-10-11): it reads `holds`, not `wants`, and it
  // is counted, so it is not one of the uncommitted decks the line says the figures leave out.
  it("reads a brew given a copy as holding it, and leaves it out of the uncounted line", () => {
    mount({
      ...card,
      quantity: 1,
      availability: {
        owned: 1, hard: 2, soft: 1, free: -1,
        claims: [
          { ...claim("d1", "Prismari Artistry", 1, true), since: 1_000 },
          { ...claim("d2", "HD - Gishath", 1, false), granted: 1 },
          { ...claim("d3", "Sketchbook", 1, false) },
        ],
      },
    });
    const brewRow = screen.getByText("HD - Gishath").closest("li")!;
    expect(brewRow.textContent).toContain(c.detailClaimHolds(1));
    expect(brewRow.textContent).not.toContain(c.detailClaimWants(1));
    expect(screen.getByText(c.detailDraftsUncounted(1))).toBeInTheDocument();
    expect(screen.queryByText(c.detailDraftsUncounted(2))).toBeNull();
  });

  // In the soft state every claimant is a brew and `detailSoftNote` is the whole story,
  // so this line would be the same fact twice.
  it("leaves the line out when no committed deck is involved", () => {
    mount({
      ...card,
      quantity: 1,
      availability: withClaims(1, [claim("d1", "Sketchbook", 1, false)]),
    });
    expect(screen.queryByText(c.detailDraftsUncounted(1))).toBeNull();
    expect(screen.getByText(c.detailSoftNote(1))).toBeInTheDocument();
  });

  it("states an over-commitment as a comparison rather than a negative", () => {
    mount({
      ...card,
      quantity: 1,
      availability: withClaims(1, [
        claim("d1", "Atraxa", 1, true),
        claim("d2", "Kykar", 1, true),
      ]),
    });
    expect(screen.getByText(c.detailSplitOver(2, 1))).toBeInTheDocument();
    expect(screen.queryByText(/-1 free/)).toBeNull();
  });

  // The rows name every claimant; a marker naming one of them would duplicate a
  // link and make "first by name" look like a meaningful choice.
  it("leaves the naming to the rows, so the summary marker names no deck", () => {
    mount({
      ...card,
      quantity: 1,
      availability: withClaims(1, [claim("d1", "Atraxa", 1, true)]),
    });
    // The block's summary and the phone sheet's second line both draw the marker; neither names.
    expect(screen.getAllByText(availabilityCopy.marker.hard)).not.toHaveLength(0);
    expect(screen.queryByText(availabilityCopy.marker.hardIn("Atraxa"))).toBeNull();
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
        flavorName: null,
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

// A card nobody owns arrives from `catalogCard`, which fills `printings` with the whole
// catalog at quantity 0 so the modal has art to resolve. The picker must not read that
// list as a collection: it offered a pick over sixteen printings of a card owned ×0,
// captioned "16 printings you own".
describe("CardModal printing picker scope", () => {
  const catalogPrinting = (setCode: string, collectorNumber: string) => ({
    setCode,
    setName: setCode,
    collectorNumber,
    releasedAt: "2024-01-12",
    quantity: 0,
    finishes: {},
    imageUri: "https://cards.scryfall.io/normal/tithe.jpg",
    flavorName: null,
  });

  it("offers no picker for a card the user owns none of", () => {
    mount({
      ...card,
      quantity: 0,
      printings: [catalogPrinting("RVR", "24"), catalogPrinting("ELD", "8")],
    });
    expect(screen.queryByText(/printings you own/)).toBeNull();
  });

  it("counts only the printings actually owned", () => {
    mount({
      ...card,
      quantity: 3,
      printings: [
        { ...catalogPrinting("RVR", "24"), quantity: 1, finishes: { nonfoil: 1 } },
        { ...catalogPrinting("ELD", "8"), quantity: 2, finishes: { nonfoil: 2 } },
        catalogPrinting("M21", "99"),
      ],
    });
    // The trigger sets the count beside a chevron, so match the phrase, not the whole node.
    expect(screen.getAllByText(/2 printings you own/).length).toBeGreaterThan(0);
  });

  // The caller can re-read the open card and hand back the same oracle id, which does not
  // remount this component. A pick seeded once would then keep showing the printing the
  // preference no longer names, for as long as the reader left the modal open.
  it("follows a preference that changes under the mounted modal", () => {
    const owned = {
      ...card,
      quantity: 3,
      printings: [
        { ...catalogPrinting("RVR", "24"), quantity: 1, finishes: { nonfoil: 1 } },
        { ...catalogPrinting("ELD", "8"), quantity: 2, finishes: { nonfoil: 2 } },
      ],
    };
    const view = render(
      <CardModal card={owned} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} />,
    );
    expect(screen.getAllByText(/2 printings you own/).length).toBeGreaterThan(0);

    view.rerender(
      <CardModal
        card={{ ...owned, preferredPrinting: { setCode: "ELD", collectorNumber: "8" } }}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
      />,
    );
    expect(screen.queryByText(/2 printings you own/)).toBeNull();
    expect(screen.getAllByText(printingPickerCopy.printing.triggerPicked).length).toBeGreaterThan(0);
  });

  // A write can be refused: `setCardArtPreference` returns without writing when the chosen
  // printing is no longer one the reader owns, and the re-read that follows carries exactly
  // the preference that was already there. Holding the optimistic pick because the value did
  // not move would leave the refused choice on screen as though it had taken.
  it("drops an optimistic pick the write did not take", async () => {
    const owned = {
      ...card,
      quantity: 3,
      printings: [
        { ...catalogPrinting("RVR", "24"), quantity: 1, finishes: { nonfoil: 1 } },
        { ...catalogPrinting("ELD", "8"), quantity: 2, finishes: { nonfoil: 2 } },
      ],
    };
    const view = render(
      <CardModal card={owned} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} />,
    );
    // Both breakpoint trees render the picker; either one drives the same write.
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", {
        name: printingPickerCopy.printing.triggerAria(2, "RVR · 24 +1 more"),
      })[0]);
    });
    await act(async () => {
      fireEvent.click(screen.getAllByRole("radio", { name: /ELD/ })[0]);
    });
    expect(screen.getAllByText(printingPickerCopy.printing.triggerPicked).length).toBeGreaterThan(0);

    // The re-read after the refusal: a new card, same preference as before the pick.
    view.rerender(
      <CardModal card={{ ...owned }} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} />,
    );
    expect(screen.getAllByText(/2 printings you own/).length).toBeGreaterThan(0);
  });

  // The list behind the modal patches its own copy of the card from this payload rather
  // than refetching the route, so what it carries has to be the art the server would
  // resolve for the same pick — set code and printed name included, not just the image.
  it("reports the picked printing's art to onArtChange", async () => {
    const owned = {
      ...card,
      quantity: 3,
      printings: [
        {
          ...catalogPrinting("RVR", "24"),
          quantity: 1,
          finishes: { nonfoil: 1 },
          imageUri: "https://cards.scryfall.io/normal/rvr.jpg",
        },
        {
          ...catalogPrinting("ELD", "8"),
          quantity: 2,
          finishes: { nonfoil: 2 },
          imageUri: "https://cards.scryfall.io/normal/eld.jpg",
          flavorName: "Tithe of the Wilds",
        },
      ],
    };
    const seen: (CardArt | null)[] = [];
    render(
      <CardModal
        card={owned}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
        onArtChange={(art) => seen.push(art)}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", {
        name: printingPickerCopy.printing.triggerAria(2, "RVR · 24 +1 more"),
      })[0]);
    });
    await act(async () => {
      fireEvent.click(screen.getAllByRole("radio", { name: /ELD/ })[0]);
    });
    // Twice — optimistically, then on settlement — and both name the printing picked.
    expect(seen.length).toBeGreaterThanOrEqual(2);
    for (const art of seen) {
      expect(art).toEqual({
        primarySetCode: "ELD",
        imageUri: "https://cards.scryfall.io/normal/eld.jpg",
        printedName: "Tithe of the Wilds",
      });
    }
  });

  // A refused write rolls the modal back, and the list has to roll back with it: the
  // settlement's payload is what the server still holds, not the pick that failed.
  it("reports the printing the server kept when the write is refused", async () => {
    const actions = await import("../../app/collection/actions");
    vi.mocked(actions.setCardArtPreference).mockResolvedValueOnce(false);
    const owned = {
      ...card,
      quantity: 3,
      printings: [
        {
          ...catalogPrinting("RVR", "24"),
          quantity: 1,
          finishes: { nonfoil: 1 },
          imageUri: "https://cards.scryfall.io/normal/rvr.jpg",
        },
        {
          ...catalogPrinting("ELD", "8"),
          quantity: 2,
          finishes: { nonfoil: 2 },
          imageUri: "https://cards.scryfall.io/normal/eld.jpg",
        },
      ],
    };
    const seen: (CardArt | null)[] = [];
    render(
      <CardModal
        card={owned}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
        onArtChange={(art) => seen.push(art)}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", {
        name: printingPickerCopy.printing.triggerAria(2, "RVR · 24 +1 more"),
      })[0]);
    });
    await act(async () => {
      fireEvent.click(screen.getAllByRole("radio", { name: /ELD/ })[0]);
    });
    expect(seen[0]?.primarySetCode).toBe("ELD");
    // The last word is the printing that was there before the pick.
    expect(seen[seen.length - 1]?.primarySetCode).toBe("RVR");
  });

  // The eviction a pick fires starts a read straight away, and that read can answer before
  // the write does — with the preference as it stood before the pick. Nothing waits for the
  // read taken after the write, so the transition ends first: without retiring the stale
  // card, the reader watches their pick revert to the printing they just replaced.
  it("holds the pick when a read from before the write answers first", async () => {
    const actions = await import("../../app/collection/actions");
    let settle!: () => void;
    vi.mocked(actions.setCardArtPreference).mockImplementation(
      () => new Promise<boolean>((r) => { settle = () => r(true); }),
    );
    const owned = {
      ...card,
      quantity: 3,
      printings: [
        { ...catalogPrinting("RVR", "24"), quantity: 1, finishes: { nonfoil: 1 } },
        { ...catalogPrinting("ELD", "8"), quantity: 2, finishes: { nonfoil: 2 } },
      ],
    };
    const view = render(
      <CardModal card={owned} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} />,
    );
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", {
        name: printingPickerCopy.printing.triggerAria(2, "RVR · 24 +1 more"),
      })[0]);
    });
    await act(async () => {
      fireEvent.click(screen.getAllByRole("radio", { name: /ELD/ })[0]);
    });

    // The read from before the write lands while the write is still running.
    view.rerender(
      <CardModal card={{ ...owned }} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} />,
    );
    await act(async () => { settle(); });

    expect(screen.getAllByText(printingPickerCopy.printing.triggerPicked).length).toBeGreaterThan(0);
    vi.mocked(actions.setCardArtPreference).mockImplementation(async () => true);
  });

  // A refused write is the one case no re-read corrects: the read the eviction starts can
  // fail too, and then nothing arrives to replace the optimistic pick. The reader would be
  // left looking at a printing the server never accepted.
  it("puts the pick back when the write is refused outright", async () => {
    const actions = await import("../../app/collection/actions");
    vi.mocked(actions.setCardArtPreference).mockRejectedValue(new Error("refused"));
    const owned = {
      ...card,
      quantity: 3,
      printings: [
        { ...catalogPrinting("RVR", "24"), quantity: 1, finishes: { nonfoil: 1 } },
        { ...catalogPrinting("ELD", "8"), quantity: 2, finishes: { nonfoil: 2 } },
      ],
    };
    render(
      <CardModal card={owned} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} />,
    );
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", {
        name: printingPickerCopy.printing.triggerAria(2, "RVR · 24 +1 more"),
      })[0]);
    });
    await act(async () => {
      fireEvent.click(screen.getAllByRole("radio", { name: /ELD/ })[0]);
    });

    // No re-read arrives, and the pick is back where the server left it regardless.
    expect(screen.getAllByText(/2 printings you own/).length).toBeGreaterThan(0);
    vi.mocked(actions.setCardArtPreference).mockImplementation(async () => true);
  });

  // The action refuses a printing the reader no longer owns by returning without writing, and
  // a refusal reads back exactly the preference already on screen. Only the action can say
  // which of the two happened, so a refusal is reconciled from its answer rather than waiting
  // on a re-read that cannot tell the difference — and may not arrive at all.
  it("puts the pick back when the server declines to write it", async () => {
    const actions = await import("../../app/collection/actions");
    vi.mocked(actions.setCardArtPreference).mockImplementation(async () => false);
    const owned = {
      ...card,
      quantity: 3,
      printings: [
        { ...catalogPrinting("RVR", "24"), quantity: 1, finishes: { nonfoil: 1 } },
        { ...catalogPrinting("ELD", "8"), quantity: 2, finishes: { nonfoil: 2 } },
      ],
    };
    render(
      <CardModal card={owned} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} />,
    );
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", {
        name: printingPickerCopy.printing.triggerAria(2, "RVR · 24 +1 more"),
      })[0]);
    });
    await act(async () => {
      fireEvent.click(screen.getAllByRole("radio", { name: /ELD/ })[0]);
    });

    expect(screen.getAllByText(/2 printings you own/).length).toBeGreaterThan(0);
    vi.mocked(actions.setCardArtPreference).mockImplementation(async () => true);
  });

  // Nothing stops a second pick while the first write is still running, and a write that
  // settles badly rolls the pick back to what the server holds. Rolled back blindly, that
  // erases the second pick — the one the reader made last and is looking at.
  it("leaves a newer pick alone when an older write settles badly", async () => {
    const actions = await import("../../app/collection/actions");
    let refuse!: () => void;
    vi.mocked(actions.setCardArtPreference)
      .mockImplementationOnce(() => new Promise<boolean>((_resolve, reject) => {
        refuse = () => reject(new Error("refused"));
      }))
      .mockImplementation(async () => true);
    const owned = {
      ...card,
      quantity: 4,
      printings: [
        { ...catalogPrinting("RVR", "24"), quantity: 1, finishes: { nonfoil: 1 } },
        { ...catalogPrinting("ELD", "8"), quantity: 2, finishes: { nonfoil: 2 } },
        { ...catalogPrinting("M21", "1"), quantity: 1, finishes: { nonfoil: 1 } },
      ],
    };
    render(
      <CardModal card={owned} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} />,
    );
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", {
        name: printingPickerCopy.printing.triggerAria(3, "RVR · 24 +2 more"),
      })[0]);
    });
    await act(async () => {
      fireEvent.click(screen.getAllByRole("radio", { name: /ELD/ })[0]);
    });
    await act(async () => {
      fireEvent.click(screen.getAllByRole("radio", { name: /M21/ })[0]);
    });

    // The first write refuses only now, with the second pick already on screen.
    await act(async () => { refuse(); });

    expect(screen.getAllByText(printingPickerCopy.printing.triggerPicked).length).toBeGreaterThan(0);
    vi.mocked(actions.setCardArtPreference).mockImplementation(async () => true);
  });

  // A write's own re-read can fail, and then the card on screen is older than a pick the
  // server accepted. Rolling a later refusal back to that card would revert past a choice
  // that landed — so the rollback goes to what the server last said it holds, not to what
  // the last read happened to bring back.
  it("rolls back to the last write that landed, not to a card older than it", async () => {
    const actions = await import("../../app/collection/actions");
    vi.mocked(actions.setCardArtPreference)
      .mockImplementationOnce(async () => true)
      .mockImplementation(async () => false);
    const owned = {
      ...card,
      quantity: 4,
      printings: [
        { ...catalogPrinting("RVR", "24"), quantity: 1, finishes: { nonfoil: 1 } },
        { ...catalogPrinting("ELD", "8"), quantity: 2, finishes: { nonfoil: 2 } },
        { ...catalogPrinting("M21", "1"), quantity: 1, finishes: { nonfoil: 1 } },
      ],
    };
    render(
      <CardModal card={owned} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} />,
    );
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", {
        name: printingPickerCopy.printing.triggerAria(3, "RVR · 24 +2 more"),
      })[0]);
    });
    // The first pick lands on the server. No re-read follows it, so the card stays as it was.
    await act(async () => {
      fireEvent.click(screen.getAllByRole("radio", { name: /ELD/ })[0]);
    });
    // The second is refused, and rolls back to the first — which the server does hold.
    await act(async () => {
      fireEvent.click(screen.getAllByRole("radio", { name: /M21/ })[0]);
    });

    expect(screen.getAllByText(printingPickerCopy.printing.triggerPicked).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("radio", { name: /ELD/ })[0]).toBeChecked();
    vi.mocked(actions.setCardArtPreference).mockImplementation(async () => true);
  });

  // The other way that baseline goes stale: a read taken before a write lands while the write
  // is still running, carrying the preference as it stood beforehand. Believing it would put
  // the rollback back where it was two picks ago.
  it("ignores a read that predates an outstanding write when deciding what to roll back to", async () => {
    const actions = await import("../../app/collection/actions");
    let refuse!: () => void;
    vi.mocked(actions.setCardArtPreference)
      .mockImplementationOnce(async () => true)
      .mockImplementationOnce(() => new Promise<boolean>((resolve) => {
        refuse = () => resolve(false);
      }));
    const owned = {
      ...card,
      quantity: 4,
      printings: [
        { ...catalogPrinting("RVR", "24"), quantity: 1, finishes: { nonfoil: 1 } },
        { ...catalogPrinting("ELD", "8"), quantity: 2, finishes: { nonfoil: 2 } },
        { ...catalogPrinting("M21", "1"), quantity: 1, finishes: { nonfoil: 1 } },
      ],
    };
    const view = render(
      <CardModal card={owned} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} />,
    );
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", {
        name: printingPickerCopy.printing.triggerAria(3, "RVR · 24 +2 more"),
      })[0]);
    });
    await act(async () => {
      fireEvent.click(screen.getAllByRole("radio", { name: /ELD/ })[0]);
    });
    await act(async () => {
      fireEvent.click(screen.getAllByRole("radio", { name: /M21/ })[0]);
    });

    // A read from before either pick lands while the second write is still running.
    view.rerender(
      <CardModal card={{ ...owned }} position={1} total={1} onClose={() => {}} onPrev={null} onNext={null} />,
    );
    await act(async () => { refuse(); });

    expect(screen.getAllByRole("radio", { name: /ELD/ })[0]).toBeChecked();
    vi.mocked(actions.setCardArtPreference).mockImplementation(async () => true);
  });
});

// The printed name (#467 follow-on). The title is what the copy in hand says it
// is; the oracle name survives here and nowhere else on screen.
describe("CardModal oracle-name line", () => {
  const label = () => screen.queryByText(printedNameCopy.oracleLabel);

  it("titles the modal with the printed name and glosses it with the oracle name", () => {
    mount({ ...card, name: "World at War", printedName: "Battle of Olympus" });
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Battle of Olympus");
    expect(label()).toBeInTheDocument();
    expect(screen.getByText("World at War")).toBeInTheDocument();
  });

  it("renders no oracle line at all on an ordinary card", () => {
    mount({ ...card, name: "Cultivate", printedName: null });
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Cultivate");
    // Absent, not blank: no label, no placeholder, no reserved height.
    expect(label()).toBeNull();
  });

  it("keeps the title as the dialog's accessible name", () => {
    mount({ ...card, name: "World at War", printedName: "Battle of Olympus" });
    expect(screen.getByRole("dialog")).toHaveAccessibleName("Battle of Olympus");
  });
});

describe("CardModal opened at a particular printing", () => {
  const printing = (setCode: string, collectorNumber: string, imageUri: string) => ({
    setCode,
    setName: setCode,
    collectorNumber,
    releasedAt: "2024-01-12",
    quantity: 0,
    finishes: {},
    imageUri,
    flavorName: null,
  });

  const twoPrintings: BrowseCard = {
    ...card,
    quantity: 0,
    printings: [
      printing("HOB", "96", "https://cards.scryfall.io/normal/hob-96.jpg"),
      printing("HOB", "239", "https://cards.scryfall.io/normal/hob-239.jpg"),
    ],
  };

  // The face is a CSS background, not an <img>, so this reads the style the modal set.
  const artOf = (container: HTMLElement) =>
    [...container.querySelectorAll<HTMLElement>("[style*='background-image']")]
      .map((el) => el.style.backgroundImage);

  it("shows the printing it was opened at, not the one the resolver would choose", () => {
    // A set cell IS a printing: clicking the dashed #239 must show #239. Without this the
    // modal resolved to the first printing with art and showed a different card face.
    const { container } = render(
      <CardModal
        card={twoPrintings}
        openAtPrinting={{ setCode: "HOB", collectorNumber: "239" }}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
      />,
    );
    expect(artOf(container).some((src) => src?.includes("hob-239"))).toBe(true);
  });

  it("falls back to the resolver when it was opened at no printing in particular", () => {
    const { container } = render(
      <CardModal
        card={twoPrintings}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
      />,
    );
    expect(artOf(container).some((src) => src?.includes("hob-96"))).toBe(true);
  });

  it("does not claim the viewed printing as the reader's pick", () => {
    // Looking at a cell writes nothing and asserts nothing about preference: the picker
    // must still mark whatever the reader actually chose, which here is nothing.
    //
    // OWNED rows, deliberately: with quantity 0 the picker is not rendered at all and the
    // assertion below would pass over a `Your pick` that could never have appeared.
    const owned = {
      ...twoPrintings,
      quantity: 3,
      printings: twoPrintings.printings.map((p, i) => ({
        ...p, quantity: i + 1, finishes: { nonfoil: i + 1 },
      })),
    };
    render(
      <CardModal
        card={owned}
        openAtPrinting={{ setCode: "HOB", collectorNumber: "239" }}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
      />,
    );
    expect(screen.queryByText(/Your pick/)).toBeNull();
  });
});

describe("CardModal opened at a printing it does not own", () => {
  // The case the first fix missed. For an OWNED card `card.printings` is what the reader
  // owns, and a holding matched by name carries no collector number — so the printing the
  // set cell stands for is absent, and the resolver fell back to an unrelated set.
  const ownedElsewhere: BrowseCard = {
    ...card,
    quantity: 90,
    printings: [{
      setCode: "ARC",
      setName: "ARC",
      collectorNumber: "",
      releasedAt: "2010-06-18",
      quantity: 90,
      finishes: {},
      imageUri: "https://cards.scryfall.io/normal/arc.jpg",
      flavorName: null,
    }],
  };

  const backgrounds = (container: HTMLElement) =>
    [...container.querySelectorAll<HTMLElement>("[style*='background-image']")]
      .map((el) => el.style.backgroundImage);

  it("shows the art the caller handed it", () => {
    const { container } = render(
      <CardModal
        card={ownedElsewhere}
        openAtPrinting={{
          setCode: "TLA",
          collectorNumber: "282",
          imageUri: "https://cards.scryfall.io/normal/tla-282.jpg",
        }}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
      />,
    );
    expect(backgrounds(container).some((b) => b.includes("tla-282"))).toBe(true);
    expect(backgrounds(container).some((b) => b.includes("arc.jpg"))).toBe(false);
  });

  // The injected row is art for the face and nothing else. The picker counts and lists what
  // the reader OWNS, and a printing they do not own appearing in "N printings you own" is
  // the same defect this file already covers for the catalog list one describe block above —
  // reached the other way, through the caller rather than through the fetch.
  it("leaves the picker counting only what the reader owns", async () => {
    const twoOwned: BrowseCard = {
      ...card,
      quantity: 93,
      printings: [
        {
          setCode: "ARC", setName: "ARC", collectorNumber: "", releasedAt: "2010-06-18",
          quantity: 90, finishes: { nonfoil: 90 },
          imageUri: "https://cards.scryfall.io/normal/arc.jpg", flavorName: null,
        },
        {
          setCode: "M21", setName: "M21", collectorNumber: "268", releasedAt: "2020-07-03",
          quantity: 3, finishes: { nonfoil: 3 },
          imageUri: "https://cards.scryfall.io/normal/m21-268.jpg", flavorName: null,
        },
      ],
    };
    render(
      <CardModal
        card={twoOwned}
        openAtPrinting={{
          setCode: "TLA",
          collectorNumber: "282",
          imageUri: "https://cards.scryfall.io/normal/tla-282.jpg",
        }}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
      />,
    );
    // Two, not three: the injected TLA row is not a holding.
    expect(screen.getAllByText(/2 printings you own/).length).toBeGreaterThan(0);
    // The caption counts the reader's OWN printings, and the resolved row is not one of
    // them — so both are "other printings owned" and the figure is 2, not 1. Subtracting a
    // resolved row that is not in the list hid a printing they hold.
    expect(screen.getAllByText(/\+2 more/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\+3 more/)).toBeNull();
    expect(screen.queryByText(/3 printings you own/)).toBeNull();
    // And it is not offered as something to pick. Expanded, because the tiles are the
    // other half of the claim: a count that is right over a list that is wrong still
    // hands the reader a printing they cannot choose.
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", {
        name: /printings owned/,
      })[0]);
    });
    expect(screen.getAllByRole("radio", { name: /ARC/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("radio", { name: /M21/ }).length).toBeGreaterThan(0);
    expect(screen.queryAllByRole("radio", { name: /TLA/ })).toHaveLength(0);
  });

  // The suffix counts printings the reader OWNS besides the one on screen. Opened at a
  // printing they do not own, their single holding is one such — so `+1 more` is true here,
  // where it was the injected row counting itself before.
  it("counts the one owned printing as other than the one being shown", () => {
    render(
      <CardModal
        card={ownedElsewhere}
        openAtPrinting={{
          setCode: "TLA",
          collectorNumber: "282",
          imageUri: "https://cards.scryfall.io/normal/tla-282.jpg",
        }}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
      />,
    );
    expect(screen.getAllByText(/TLA · 282 \+1 more/).length).toBeGreaterThan(0);
  });

  // A row can match by set and collector number and still hold the WRONG art:
  // `collection_items.scryfall_id` is nullable, so a Moxfield or Archidekt holding falls
  // back to the set representative's image. The caller handed over the exact one.
  it("prefers the art it was handed over a matching row's fallback", () => {
    const fallbackArt: BrowseCard = {
      ...card,
      quantity: 1,
      printings: [{
        setCode: "TLA", setName: "TLA", collectorNumber: "282", releasedAt: "2025-11-21",
        quantity: 1, finishes: { nonfoil: 1 },
        imageUri: "https://cards.scryfall.io/normal/tla-representative.jpg",
        flavorName: null,
      }],
    };
    const { container } = render(
      <CardModal
        card={fallbackArt}
        openAtPrinting={{
          setCode: "TLA",
          collectorNumber: "282",
          imageUri: "https://cards.scryfall.io/normal/tla-282.jpg",
        }}
        position={1}
        total={1}
        onClose={() => {}}
        onPrev={null}
        onNext={null}
      />,
    );
    expect(backgrounds(container).some((b) => b.includes("tla-282"))).toBe(true);
    expect(backgrounds(container).some((b) => b.includes("representative"))).toBe(false);
  });
});

// `printedName` is a CARD-level field, resolved from whatever printing the collection
// picked. Opening at a different printing therefore printed the owned holding's flavour
// name over the target printing's art — the pairing `BrowseCard` documents, broken by the
// very branch that exists to keep it.
describe("CardModal title under an opened-at printing", () => {
  const flavoured: BrowseCard = {
    ...card,
    quantity: 2,
    printedName: "Lonely Sandbar Vista",
    printings: [{
      setCode: "SLD", setName: "SLD", collectorNumber: "1500", releasedAt: "2024-01-12",
      quantity: 2, finishes: { nonfoil: 2 },
      imageUri: "https://cards.scryfall.io/normal/sld-1500.jpg",
      flavorName: "Lonely Sandbar Vista",
    }],
  };

  it("falls back to the oracle name for a printing the reader does not own", () => {
    render(
      <CardModal
        card={flavoured}
        openAtPrinting={{
          setCode: "TLA", collectorNumber: "282",
          imageUri: "https://cards.scryfall.io/normal/tla-282.jpg",
        }}
        position={1} total={1} onClose={() => {}} onPrev={null} onNext={null}
      />,
    );
    expect(screen.getByRole("heading", { name: card.name })).toBeInTheDocument();
    expect(screen.queryByText("Lonely Sandbar Vista")).toBeNull();
  });

  it("keeps the flavour name when that IS the printing being shown", () => {
    render(
      <CardModal
        card={flavoured}
        openAtPrinting={{ setCode: "SLD", collectorNumber: "1500" }}
        position={1} total={1} onClose={() => {}} onPrev={null} onNext={null}
      />,
    );
    expect(screen.getByRole("heading", { name: "Lonely Sandbar Vista" })).toBeInTheDocument();
  });

  it("leaves an ordinary open untouched", () => {
    render(
      <CardModal card={flavoured} position={1} total={1}
        onClose={() => {}} onPrev={null} onNext={null} />,
    );
    expect(screen.getByRole("heading", { name: "Lonely Sandbar Vista" })).toBeInTheDocument();
  });

  // The same exact-equality rule `aggregateCollection` applies: a printing whose flavour
  // name IS the oracle name has renamed nothing, and copying it would print the name twice
  // with an oracle-name line under it saying the same thing.
  it("treats a flavour name equal to the oracle name as no rename", () => {
    const sameName: BrowseCard = {
      ...card,
      quantity: 1,
      printedName: null,
      printings: [{
        setCode: "SLD", setName: "SLD", collectorNumber: "1500", releasedAt: "2024-01-12",
        quantity: 1, finishes: { nonfoil: 1 },
        imageUri: "https://cards.scryfall.io/normal/sld-1500.jpg",
        flavorName: card.name,
      }],
    };
    render(
      <CardModal
        card={sameName}
        openAtPrinting={{ setCode: "SLD", collectorNumber: "1500" }}
        position={1} total={1} onClose={() => {}} onPrev={null} onNext={null}
      />,
    );
    expect(screen.getByRole("heading", { name: card.name })).toBeInTheDocument();
    expect(screen.queryByText(printedNameCopy.oracleLabel)).toBeNull();
  });

  // The reader picks a different owned printing: the art and caption move, so the name has
  // to move with them. It was falling back to `card.printedName`, which the server resolved
  // for the preference the pick just replaced.
  it("moves the name with an optimistic pick", async () => {
    const two: BrowseCard = {
      ...card,
      quantity: 3,
      printedName: "Lonely Sandbar Vista",
      preferredPrinting: { setCode: "SLD", collectorNumber: "1500" },
      printings: [
        {
          setCode: "SLD", setName: "SLD", collectorNumber: "1500", releasedAt: "2024-01-12",
          quantity: 1, finishes: { nonfoil: 1 },
          imageUri: "https://cards.scryfall.io/normal/sld-1500.jpg",
          flavorName: "Lonely Sandbar Vista",
        },
        {
          setCode: "M21", setName: "Core Set 2021", collectorNumber: "268",
          releasedAt: "2020-07-03", quantity: 2, finishes: { nonfoil: 2 },
          imageUri: "https://cards.scryfall.io/normal/m21-268.jpg", flavorName: null,
        },
      ],
    };
    render(
      <CardModal card={two} position={1} total={1}
        onClose={() => {}} onPrev={null} onNext={null} />,
    );
    expect(screen.getByRole("heading", { name: "Lonely Sandbar Vista" })).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", { name: /printings owned/ })[0]);
    });
    await act(async () => {
      fireEvent.click(screen.getAllByRole("radio", { name: /Core Set 2021/ })[0]);
    });
    // M21 prints its own name, so the heading is the oracle name again.
    expect(screen.getByRole("heading", { name: card.name })).toBeInTheDocument();
  });

  // Locked decision 2 (`card-detail.ts`): a card the player does not own keeps its oracle
  // name — there is no printing in hand to print one. `catalogCard` fills `printings` with
  // the whole catalog at quantity 0, so a renamed catalog row must not become a title.
  it("gives an unowned card no printed name, however the catalog names the printing", () => {
    const unowned: BrowseCard = {
      ...card,
      quantity: 0,
      printedName: null,
      printings: [{
        setCode: "SLD", setName: "SLD", collectorNumber: "1500", releasedAt: "2024-01-12",
        quantity: 0, finishes: {},
        imageUri: "https://cards.scryfall.io/normal/sld-1500.jpg",
        flavorName: "Lonely Sandbar Vista",
      }],
    };
    render(
      <CardModal
        card={unowned}
        openAtPrinting={{ setCode: "SLD", collectorNumber: "1500" }}
        position={1} total={1} onClose={() => {}} onPrev={null} onNext={null}
      />,
    );
    expect(screen.getByRole("heading", { name: card.name })).toBeInTheDocument();
    expect(screen.queryByText("Lonely Sandbar Vista")).toBeNull();
  });

  // The art the cell hands over replaces a REPRESENTATIVE fallback, and the name goes with
  // it. Where the two URLs already agree the row IS the printing, and clearing its name
  // took the title off an owned Secret Lair whose art was never in question.
  it("keeps an owned printing's flavour name when the art it was handed matches", () => {
    const exact: BrowseCard = {
      ...card,
      quantity: 2,
      printedName: "Lonely Sandbar Vista",
      printings: [{
        setCode: "SLD", setName: "SLD", collectorNumber: "1500", releasedAt: "2024-01-12",
        quantity: 2, finishes: { nonfoil: 2 },
        imageUri: "https://cards.scryfall.io/normal/sld-1500.jpg",
        flavorName: "Lonely Sandbar Vista",
      }],
    };
    render(
      <CardModal
        card={exact}
        openAtPrinting={{
          setCode: "SLD", collectorNumber: "1500",
          imageUri: "https://cards.scryfall.io/normal/sld-1500.jpg",
        }}
        position={1} total={1} onClose={() => {}} onPrev={null} onNext={null}
      />,
    );
    expect(screen.getByRole("heading", { name: "Lonely Sandbar Vista" })).toBeInTheDocument();
  });

  it("drops it when the handed-over art replaces a different image", () => {
    const fallback: BrowseCard = {
      ...card,
      quantity: 2,
      printedName: "Lonely Sandbar Vista",
      printings: [{
        setCode: "SLD", setName: "SLD", collectorNumber: "1500", releasedAt: "2024-01-12",
        quantity: 2, finishes: { nonfoil: 2 },
        imageUri: "https://cards.scryfall.io/normal/sld-representative.jpg",
        flavorName: "Lonely Sandbar Vista",
      }],
    };
    render(
      <CardModal
        card={fallback}
        openAtPrinting={{
          setCode: "SLD", collectorNumber: "1500",
          imageUri: "https://cards.scryfall.io/normal/sld-1500.jpg",
        }}
        position={1} total={1} onClose={() => {}} onPrev={null} onNext={null}
      />,
    );
    expect(screen.getByRole("heading", { name: card.name })).toBeInTheDocument();
  });
});

// The header row wraps, so a wide cost takes its own line rather than squeezing
// the name into two. jsdom lays nothing out, so what is asserted here is the
// RULE — the row is allowed to wrap and the name block is free to size to its
// content — and `probe:mana-symbols` measures whether it actually does.
describe("CardModal header — the cost may take its own line", () => {
  it("lets the header row wrap", () => {
    mount(card);

    const row = screen.getByTestId("modal-mana-cost").parentElement;
    expect(row?.className).toContain("flex-wrap");
  });

  // `flex-initial` is what makes the rule fall out of the name's own width: flex
  // wraps on an item's hypothetical size, which for this block is its one-line
  // content width. A `flex-1` here would give it a zero basis and the row would
  // never wrap — it would shrink the name instead, which is the defect.
  it("leaves the name block sizing to its content", () => {
    mount(card);

    const nameBlock = screen.getByText(card.typeLine).parentElement;
    expect(nameBlock?.className).not.toContain("flex-1");
    expect(nameBlock?.className).not.toContain("basis-");
  });
});

describe("CardModal carousel arrow keys stop at interactive zones (H23 PR 2)", () => {
  const catalogPrinting = (setCode: string, collectorNumber: string) => ({
    setCode,
    setName: setCode,
    collectorNumber,
    releasedAt: "2024-01-12",
    quantity: 1,
    finishes: { nonfoil: 1 },
    imageUri: "https://cards.scryfall.io/normal/tithe.jpg",
    flavorName: null,
  });

  // OVERFLOW_THRESHOLD (printing-region.tsx) is 12; one more than that is what makes the
  // real search input render, rather than stubbing around the gate.
  const overflowing = {
    ...card,
    quantity: 13,
    printings: Array.from({ length: 13 }, (_, i) => catalogPrinting("RVR", String(i + 1))),
  };

  it("does not page on an arrow key typed into the printing search field", async () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <CardModal card={overflowing} position={2} total={3} onClose={() => {}} onPrev={onPrev} onNext={onNext} />,
    );
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", {
        name: /13 printings owned/,
      })[0]);
    });
    const search = screen.getAllByPlaceholderText(printingPickerCopy.printing.searchPlaceholder)[0];
    search.focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(onPrev).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("does not page on an arrow key focused inside the printing radiogroup", async () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <CardModal card={overflowing} position={2} total={3} onClose={() => {}} onPrev={onPrev} onNext={onNext} />,
    );
    await act(async () => {
      fireEvent.click(screen.getAllByRole("button", {
        name: /13 printings owned/,
      })[0]);
    });
    screen.getAllByRole("radio", { name: /RVR/ })[0].focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(onPrev).not.toHaveBeenCalled();
    expect(onNext).not.toHaveBeenCalled();
  });

  it("pages normally on an arrow key outside any interactive zone", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <CardModal card={card} position={2} total={3} onClose={() => {}} onPrev={onPrev} onNext={onNext} />,
    );
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrev).toHaveBeenCalledTimes(1);
  });

  // The zoom layer (pre-open review, H23 PR 2): opened via the art, it has no input or
  // radiogroup of its own, so the one real focusable descendant it can carry is the
  // two-faced turn control. A card with a back — `layout: "transform"` plus its own
  // `backImageUri` — is what gets one.
  it("does not page on an arrow key focused inside the zoom layer", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const twoFaced = { ...card, layout: "transform", backImageUri: "https://cards.scryfall.io/normal/back.jpg" };
    render(
      <CardModal card={twoFaced} position={2} total={3} onClose={() => {}} onPrev={onPrev} onNext={onNext} />,
    );
    fireEvent.click(screen.getAllByRole("button", { name: /^Look at /i })[0]);
    // Scoped to the zoom layer: a non-zoomed two-faced card draws its OWN flip control too,
    // and an unscoped query can match that one instead, which is outside `#card-zoom` and
    // would pass this test on a build that never excluded the zoom at all.
    const zoom = screen.getByTestId("card-zoom");
    within(zoom).getAllByRole("button", { name: /^Turn over to/ })[0].focus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrev).not.toHaveBeenCalled();
  });

  // Pre-open review, round 2: Alt+Left/Right is the browser's own history navigation, and
  // the carousel was consuming it unconditionally, blocking Back/Forward from a card modal.
  it("ignores a modified arrow key, and still pages on a plain one", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <CardModal card={card} position={2} total={3} onClose={() => {}} onPrev={onPrev} onNext={onNext} />,
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "ArrowRight", altKey: true });
    fireEvent.keyDown(dialog, { key: "ArrowLeft", metaKey: true });
    fireEvent.keyDown(dialog, { key: "ArrowRight", ctrlKey: true });
    fireEvent.keyDown(dialog, { key: "ArrowLeft", shiftKey: true });
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrev).not.toHaveBeenCalled();
    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});

// Hugh's walk: the stand-ins door sat flush against the desktop art column's bottom edge,
// with none of the 28px breathing room every other edge of the column shows. jsdom lays
// nothing out and cannot even RETAIN this property: it drops `width` from the rendered
// element's style attribute entirely rather than fail to parse the `calc(min(...))` syntax,
// so a jsdom assertion against the rendered DOM proves nothing either way here (confirmed:
// `getAttribute("style")` omits `width` while every sibling property in the same object —
// `aspectRatio`, `perspective`, `background`, `boxShadow` — is present). The real proof is
// the before/after screenshots at 1300x900: the gap below "See cheaper stand-ins →"
// went from 11.375px to 25.77px. This pins the one number a regression could silently drift
// without either showing up in a diff review: the padding reserved below the stack, which
// must equal the column's own padding on every other edge.
describe("CardModal desktop art column reserves the door's room (pre-open review follow-up)", () => {
  it("reserves the stack's height doubled, plus the column's 28px foot padding on both sides", () => {
    // Independently computed right-hand side, not derived from the function's own constant:
    // a drift in the exported padding (or in the doubling) fails this even though the function
    // still agrees with itself.
    const underCardHeight = 10 + 15 + 27; // no two-faced row, no door
    expect(artWidthReservePx(underCardHeight)).toBe(2 * underCardHeight + 56);

    const withDoor = underCardHeight + 59; // DOOR_HEIGHT
    expect(artWidthReservePx(withDoor)).toBe(2 * withDoor + 56);
  });

  it("wires the width calc through artWidthReservePx, not an inline duplicate of its formula", () => {
    // A source-level check, not a DOM one: Copilot's finding was that reverting the call site
    // to the old inline `2 * underCardHeight` expression left the arithmetic test above green,
    // since that test only exercises the helper, never the component. jsdom cannot render the
    // real assertion (it drops `width` from the style attribute for this calc() entirely), so
    // this reads the source directly, the same pattern status-style.test.ts and limits.test.ts
    // use for a property only a real stylesheet or page module can show.
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "card-modal.tsx"),
      "utf8",
    );
    expect(source).toMatch(/artWidthReservePx\(underCardHeight\)/);
  });
});
