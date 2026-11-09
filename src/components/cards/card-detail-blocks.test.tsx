import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { availabilityCopy } from "../../lib/copy/availability";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { proxyCopy } from "../../lib/copy/proxies";
import type { BrowseCard } from "../../lib/collection/browse";
import type { Availability, DeckClaim } from "../../lib/cards/availability";
import { AvailabilityDetail, BracketFactsDetail, DeckLinksContext, OwnedLine, ProxyDetail, ReceiptHeading } from "./card-detail-blocks";

const card = (over: Record<string, unknown> = {}): BrowseCard =>
  ({
    oracleId: "o-1", name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", cmc: 1,
    oracleText: null, keywords: [], rarity: "uncommon", colorIdentity: [], imageUri: null,
    printedName: null, quantity: 1, printings: [], setCodes: [], primarySetCode: "C21",
    preferredPrinting: null, ...over,
  }) as unknown as BrowseCard;

const claim = (id: string, over: Partial<DeckClaim> = {}): DeckClaim =>
  ({ id, name: `Deck ${id}`, quantity: 1, mature: true, pending: false, commander: false, ...over }) as DeckClaim;

const avail = (over: Partial<Availability>): Availability => ({ owned: 1, hard: 0, soft: 0, free: 1, claims: [], ...over });

describe("ProxyDetail", () => {
  it("draws nothing for a card no deck proxies", () => {
    expect(render(<ProxyDetail card={card()} />).container).toBeEmptyDOMElement();
    expect(render(<ProxyDetail card={card({ proxiedBy: [] })} />).container).toBeEmptyDOMElement();
  });

  it("lists each deck as a link with the receipt note", () => {
    render(<ProxyDetail card={card({ proxiedBy: [{ id: "d1", name: "Atraxa" }, { id: "d2", name: "Korvold" }] })} />);
    expect(screen.getByText(proxyCopy.receipt.heading)).toBeTruthy();
    expect(screen.getByRole("link", { name: proxyCopy.receipt.deckLinkAria("Atraxa") }).getAttribute("href")).toBe("/decks/d1");
    expect(screen.getByText(proxyCopy.receipt.note(2))).toBeTruthy();
  });
});

// The landing's demo draws these blocks over made-up decks whose pages are the signed-in app's: its deck names are text.
describe("DeckLinksContext", () => {
  it("draws a deck's name as text, not a link, where the context is false (the proxy list and the claims receipt)", () => {
    const withoutLinks = (node: React.ReactNode) => render(<DeckLinksContext.Provider value={false}>{node}</DeckLinksContext.Provider>);
    withoutLinks(<ProxyDetail card={card({ proxiedBy: [{ id: "d1", name: "Atraxa" }] })} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Atraxa")).toBeTruthy();
    cleanup();
    withoutLinks(<AvailabilityDetail card={card({ availability: avail({ owned: 1, hard: 1, free: 0, claims: [claim("d1", { name: "Korvold" })] }) })} deckPage={false} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Korvold")).toBeTruthy();
  });

  it("keeps the links by default", () => {
    render(<ProxyDetail card={card({ proxiedBy: [{ id: "d1", name: "Atraxa" }] })} />);
    expect(screen.getByRole("link", { name: proxyCopy.receipt.deckLinkAria("Atraxa") }).getAttribute("href")).toBe("/decks/d1");
  });
});

describe("BracketFactsDetail", () => {
  it("draws nothing without facts and one row per fact with them", () => {
    expect(render(<BracketFactsDetail card={card()} />).container).toBeEmptyDOMElement();
    const { container } = render(<BracketFactsDetail card={card({ facts: ["gameChanger", "extraTurns"] })} />);
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });
});

describe("OwnedLine", () => {
  it("shows the card quantity and no marker without an availability read", () => {
    render(<OwnedLine card={card({ quantity: 3 })} deckPage={false} />);
    expect(screen.getByTestId("owned-line").textContent).toBe("×3");
  });

  it("takes the owned count from the availability and adds the marker when copies are spoken for", () => {
    const a = avail({ owned: 1, hard: 1, free: 0, claims: [claim("d1")] });
    render(<OwnedLine card={card({ quantity: 9, availability: a })} deckPage={false} />);
    const text = screen.getByTestId("owned-line").textContent ?? "";
    expect(text.startsWith("×1")).toBe(true);
    expect(text).toContain("·");
  });

  it("stays marker-free when every copy is free", () => {
    render(<OwnedLine card={card({ availability: avail({ owned: 2, free: 2 }) })} deckPage />);
    expect(screen.getByTestId("owned-line").textContent).toBe("×2");
  });
});

describe("ReceiptHeading", () => {
  it("is the bare heading without a link", () => {
    const { container } = render(<ReceiptHeading owned={1} onEditCopies={null} />);
    expect(container.textContent).toBe(availabilityCopy.collection.detailHeading);
    expect(screen.queryByTestId("edit-copies-link")).toBeNull();
  });

  it("offers Edit when owned and Add when not, and calls the press", () => {
    const press = vi.fn();
    const { unmount } = render(<ReceiptHeading owned={2} onEditCopies={press} />);
    fireEvent.click(screen.getByTestId("edit-copies-link"));
    expect(press).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("edit-copies-link").textContent).toBe(collectionEditCopy.copies.edit);
    unmount();
    render(<ReceiptHeading owned={0} onEditCopies={press} />);
    expect(screen.getByTestId("edit-copies-link").textContent).toBe(collectionEditCopy.copies.addToCollection);
  });

  it("draws a receipt link in the press's slot", () => {
    render(<ReceiptHeading owned={1} onEditCopies={null} link={<a href="/x">got it</a>} />);
    expect(screen.getByText("got it")).toBeTruthy();
  });
});

describe("AvailabilityDetail", () => {
  it("draws nothing for an unread card or a free card with no claims", () => {
    expect(render(<AvailabilityDetail card={card()} deckPage={false} />).container).toBeEmptyDOMElement();
    expect(render(<AvailabilityDetail card={card({ availability: avail({}) })} deckPage={false} />).container).toBeEmptyDOMElement();
  });

  it("draws an empty receipt with the edit link inside the shell, none when owned in none", () => {
    render(<AvailabilityDetail card={card({ quantity: 0 })} deckPage={false} onEditCopies={() => {}} />);
    expect(screen.getByTestId("owned-receipt").textContent).toContain(collectionEditCopy.copies.none);
    expect(screen.getByTestId("edit-copies-link")).toBeTruthy();
  });

  it("draws the owned count in the empty receipt when owned", () => {
    render(<AvailabilityDetail card={card({ quantity: 2 })} deckPage={false} receiptLink={<a href="/x">got it</a>} />);
    expect(screen.getByTestId("owned-receipt").textContent).toContain("×2");
  });

  it("names each claiming deck with its holds label and the split", () => {
    const a = avail({ owned: 2, hard: 1, free: 1, claims: [claim("d1")] });
    render(<AvailabilityDetail card={card({ availability: a })} deckPage={false} />);
    expect(screen.getByText(availabilityCopy.collection.detailClaimsHeading)).toBeTruthy();
    expect(screen.getByRole("link", { name: availabilityCopy.collection.detailDeckLinkAria("Deck d1") }).getAttribute("href")).toBe("/decks/d1");
    expect(screen.getByText(availabilityCopy.collection.detailClaimHolds(1))).toBeTruthy();
    expect(screen.getByText(availabilityCopy.collection.detailSplit(1, 1))).toBeTruthy();
  });

  it("says who gets the copy when two decks contest one", () => {
    const a = avail({ owned: 1, hard: 2, free: -1, claims: [claim("a", { since: 1 }), claim("b", { since: 2 })] });
    render(<AvailabilityDetail card={card({ availability: a })} deckPage={false} />);
    const c = availabilityCopy.collection;
    expect(screen.getByText(`${c.detailClaimHolds(1)} · ${c.detailClaimGets}`)).toBeTruthy();
    expect(screen.getByText(`${c.detailClaimHolds(1)} · ${c.detailClaimBuys}`)).toBeTruthy();
    expect(screen.getByText(c.detailSplitOver(2, 1))).toBeTruthy();
  });

  it("reads a brew as wants, and lists draft wants after the claims", () => {
    const a = avail({ owned: 1, hard: 0, soft: 1, free: 1, claims: [claim("b", { mature: false, quantity: 2 })] });
    render(<AvailabilityDetail card={card({ availability: a, draftWants: [{ id: "dr", name: "Draft deck" }] })} deckPage={false} />);
    const c = availabilityCopy.collection;
    expect(screen.getByText(c.detailClaimWants(2))).toBeTruthy();
    expect(screen.getByTestId("draft-want").textContent).toContain(c.detailClaimInDraft);
  });

  it("reads an unowned card's claims from unownedAvailability", () => {
    const a = avail({ owned: 0, hard: 1, free: -1, claims: [claim("d1")] });
    render(<AvailabilityDetail card={card({ quantity: 0, unownedAvailability: a })} deckPage={false} />);
    expect(screen.getByText(availabilityCopy.collection.detailClaimsHeading)).toBeTruthy();
  });
});
