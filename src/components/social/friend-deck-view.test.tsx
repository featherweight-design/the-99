// A friend's deck, read-only (friend decks handoff, board 1 and States): the precon page's anatomy over the owner's list,
// with the viewer's ownership, the back link to the friend's decks, the owner's printing for card details, and none of
// the owner's money or plans.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FriendDeckCard, FriendDeckPage } from "../../lib/social/decks";

const providerProps = vi.hoisted(() => ({ views: null as unknown, picks: null as unknown }));
vi.mock("../cards/card-detail-provider", () => ({
  CardDetailProvider: ({ children, viewPrintings, deckPrintingPicks }: { children: React.ReactNode; viewPrintings?: unknown; deckPrintingPicks?: unknown }) => {
    providerProps.views = viewPrintings;
    providerProps.picks = deckPrintingPicks;
    return children;
  },
}));
vi.mock("../ui/commander-thumb", () => ({ CommanderThumb: () => null }));
vi.mock("../shell/pending-reporter", () => ({ PendingReporter: () => null }));
vi.mock("../decks/decklist-group", () => ({
  DecklistGroup: (p: { label: string; note?: string; readOnly?: boolean; cards: { name: string; owned: boolean }[]; footer?: React.ReactNode; footerCount?: number }) => (
    <section data-testid="group" data-readonly={String(p.readOnly)} data-footer-count={p.footerCount ?? 0}>
      <h2>{p.label}</h2><span data-testid="note">{p.note}</span>
      {p.cards.map((c) => <span key={c.name} data-owned={String(c.owned)}>{c.name}</span>)}{p.footer}
    </section>
  ),
}));

import { FriendDeckView } from "./friend-deck-view";

const card = (oracleId: string, name: string, typeLine: string, owned: boolean, extra: Partial<FriendDeckCard> = {}): FriendDeckCard => ({
  oracleId, name, typeLine, cardTypeGroup: typeLine.includes("Land") ? "Lands" : typeLine.includes("Artifact") ? "Artifacts" : "Creatures",
  role: "other", cmc: 1, quantity: 1, manaCost: "{1}", imageUri: `https://img/${oracleId}.jpg`, printedName: null,
  printedSetCode: null, printedCollectorNumber: null, layout: "normal", owned, ...extra,
});
const SAI = card("sai", "Sai, Master Thopterist", "Legendary Creature — Human Artificer", true, { commander: true, printedSetCode: "m19", printedCollectorNumber: "69" });
const DECK: FriendDeckPage = {
  id: "d1", name: "Thopter Factory", commanders: [SAI],
  cards: [
    card("sol", "Sol Ring", "Artifact", true, { printedSetCode: "cmm", printedCollectorNumber: "1", printedScryfallId: "sf-sol", printedBackImageUri: null }),
    card("ws", "Whirler Rogue", "Creature — Human Rogue", false),
    card("isl", "Island", "Basic Land — Island", false, { quantity: 27 }),
  ],
  colorIdentity: ["U"], artCropUri: null, built: 29, bodySize: 99,
  shares: [{ deckId: "v1", deckName: "Thopter Works", shared: 38, sameCommanders: true }],
};
const FRIEND = { publicId: "00000000-0000-4000-8000-000000000002", displayName: "Colin", commander: null };
const draw = (deck: FriendDeckPage = DECK) => render(<FriendDeckView deck={deck} friend={FRIEND} />);

afterEach(cleanup);

describe("FriendDeckView", () => {
  it("heads the page with the friend's back link, the eyebrow and the deck", () => {
    draw();
    const back = screen.getByRole("link", { name: "‹ Colin’s decks" });
    expect(back.getAttribute("href")).toBe("/friends/00000000-0000-4000-8000-000000000002/decks");
    expect(screen.getByTestId("friend-deck-eyebrow").textContent).toBe("COColin’s deck · read-only");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Thopter Factory");
    expect(screen.getByTestId("friend-deck-commanders").textContent).toBe("Sai, Master Thopterist");
    expect(screen.getByText(/^29 cards/)).toBeTruthy();
  });

  it("drops the commander line when the deck's name repeats the commander, whole or before the comma", () => {
    for (const name of ["Sai, Master Thopterist", "Sai"]) {
      cleanup();
      draw({ ...DECK, name });
      expect(screen.queryByTestId("friend-deck-commanders")).toBeNull();
    }
  });

  it("counts what the VIEWER owns, the commander in and the basics out, and names the viewer's shared deck", () => {
    draw();
    expect(screen.getByTestId("friend-deck-own").textContent).toContain("You own2 of 3of its cards");
    expect(screen.getByText("Your deck Thopter Works has the same commander and 38 of its cards.")).toBeTruthy();
  });

  it("keys the dots as the viewer's collection", () => {
    draw();
    const key = screen.getByRole("group", { name: "What the dots mean" });
    expect(key.textContent).toBe("you own ityou don’t");
    expect(screen.getByText("Your collection")).toBeTruthy();
  });

  it("draws every group read-only, the basics at the foot of Lands and out of what you own", () => {
    draw();
    const groups = screen.getAllByTestId("group");
    expect(groups.map((g) => g.querySelector("h2")!.textContent)).toEqual(["Commander", "Creatures", "Artifacts"]);
    for (const g of groups) expect(g.dataset.readonly).toBe("true");
    expect(within(groups[0]).getByTestId("note").textContent).toBe("you own it");
    expect(screen.getByText("Island ×27")).toBeTruthy();
  });

  it("views the owner's printing in card details, and draws nothing of the owner's money or plans", () => {
    draw();
    expect(providerProps.views).toEqual({
      sai: { setCode: "m19", collectorNumber: "69", imageUri: "https://img/sai.jpg" },
      sol: { setCode: "cmm", collectorNumber: "1", imageUri: "https://img/sol.jpg", backImageUri: null, scryfallId: "sf-sol" },
    });
    // The same picks as deck printings with no deck: card details offer the viewer no picker over the owner's printing.
    expect(providerProps.picks).toEqual({ sai: { setCode: "m19", collectorNumber: "69" }, sol: { setCode: "cmm", collectorNumber: "1" } });
    expect(document.body.textContent).not.toMatch(/\$|To buy|Complete|Draft|buy/);
  });

  it("an empty deck keeps the Commander and says so, with no own band, list note or key", () => {
    draw({ ...DECK, cards: [], built: 0, shares: [] });
    expect(screen.getByTestId("friend-deck-empty").textContent).toBe(
      "Colin hasn’t added cards yetThe list shows here as Colin builds it.",
    );
    expect(screen.getByText(/^0 cards/)).toBeTruthy();
    expect(screen.queryByTestId("friend-deck-own")).toBeNull();
    expect(screen.queryByRole("group", { name: "What the dots mean" })).toBeNull();
    expect(screen.getAllByTestId("group").map((g) => g.querySelector("h2")!.textContent)).toEqual(["Commander"]);
  });

  it("a pair heads its group Commanders and names both", () => {
    const thrasios = card("th", "Thrasios, Triton Hero", "Legendary Creature — Merfolk Wizard", false, { commander: true });
    draw({ ...DECK, name: "Tymna Thrasios", commanders: [{ ...SAI, name: "Tymna the Weaver", oracleId: "ty" }, thrasios] });
    expect(screen.getByTestId("friend-deck-commanders").textContent).toBe("Tymna the Weaver + Thrasios, Triton Hero");
    expect(screen.getAllByTestId("group")[0].querySelector("h2")!.textContent).toBe("Commanders");
  });
});
