// A token's card details (bug batch 2026-10-12, item 5): the existing modal, drawing only what a
// token has. The card is the loader's own (`assembleTokenDetail`), so these read what ships.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { cardLinkOutCopy } from "../../lib/copy/collection-browse";

vi.mock("../../db", () => ({ db: {} }));
vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const { CardModal } = await import("./card-modal");
const { assembleTokenDetail } = await import("../../lib/tokens/detail");

const NEWEST = new Date("2026-10-12T09:00:00Z");
const TOKEN = {
  oracleId: "t-1", name: "Goblin", typeLine: "Token Creature — Goblin", colors: ["R"],
  oracleText: "Haste", layout: "token",
};
const PRINTINGS = [
  { scryfallId: "p-b", setCode: "tm21", collectorNumber: "9", imageUri: "https://img/b.jpg", backImageUri: null },
  { scryfallId: "p-a", setCode: "tclb", collectorNumber: "4", imageUri: "https://img/a.jpg", backImageUri: null },
];
const PRICE = {
  cents: 25, foilCents: null, etchedCents: null, asOf: NEWEST,
  printing: { scryfallId: "p-b", setCode: "tm21", collectorNumber: "9", productName: "Goblin", productSet: "TM21", productNumber: "9" },
};

const mount = (priced: boolean) =>
  render(
    <CardModal
      card={assembleTokenDetail(TOKEN, PRINTINGS, priced ? (PRICE as never) : null, NEWEST)}
      position={1} total={1} onClose={() => {}} onPrev={null} onNext={null}
    />,
  );

describe("a token's card details", () => {
  it("draws its name, type line, rules text and set, and no rarity, identity or owned count", () => {
    mount(true);
    expect(screen.getAllByText("Goblin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Token Creature — Goblin").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Haste").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/TM21/).length).toBeGreaterThan(0);
    for (const label of ["Rarity", "Identity", "You own"]) expect(screen.queryByText(label)).toBeNull();
    // Nor the phone teaser's owned line: `×0` would be a count of cards, which a token is not.
    expect(screen.queryByText(/×0/)).toBeNull();
    // The phone grid's Set cell runs across both columns, so no half cell stands empty beside it.
    const set = screen.getAllByText("Set").map((l) => l.parentElement!).find((c) => c.className.includes("p-[11px_14px]"))!;
    expect(set.className).toContain("col-span-2");
  });

  it("shows the priced printing and its figure, and links the Mana Pool product that price is for", () => {
    mount(true);
    expect(screen.getByTestId("modal-price-desktop")).toHaveTextContent("$0.25");
    const links = screen.getAllByRole("link", { name: new RegExp(cardLinkOutCopy.token) });
    expect(links.length).toBeGreaterThan(0);
    for (const a of links) expect(a.getAttribute("href")).toContain("manapool.com");
    expect(screen.queryByRole("link", { name: new RegExp(cardLinkOutCopy.card) })).toBeNull();
  });

  it("draws no price and no buy link when Mana Pool lists none, and pictures the first printing by set", () => {
    const card = assembleTokenDetail(TOKEN, PRINTINGS, null, NEWEST);
    expect(card.imageUri).toBe("https://img/a.jpg");
    expect(card.printings).toHaveLength(1);
    mount(false);
    expect(screen.queryByTestId("modal-price-desktop")).toBeNull();
    expect(screen.queryByRole("link", { name: /Mana Pool/ })).toBeNull();
  });
});
