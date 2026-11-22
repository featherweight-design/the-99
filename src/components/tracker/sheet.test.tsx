import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { commit, replay, type Game, type GameConfig } from "../../lib/tracker/engine";
import type { PlaySeat } from "./panel";
import { Sheet, type SheetTab } from "./sheet";

const config: GameConfig = { tableId: "t", startingLife: 40, seats: [{ seat: 0, commanders: 1 }, { seat: 1, commanders: 2 }], first: 0, layout: "phone-2" };
const seats: PlaySeat[] = [
  { seat: 0, you: true, name: "Hugh", art: null, partnerArt: null, commander: "Sai", partner: null, deck: "Sai Artifacts" },
  { seat: 1, you: false, name: "Colin" as never, art: null, partnerArt: null, commander: "Ishai", partner: "Bruse", deck: "Ishai Ojutai" },
];
const render = (tab: SheetTab, game: Game, tablet = false, at = seats, seat = 0) =>
  renderToStaticMarkup(
    <Sheet view={{ seat, tab }} seats={at} state={replay(game)} game={game} rot={0} tablet={tablet} onView={() => {}} onClose={() => {}} onCommit={() => {}} onUndo={() => {}} />,
  );

describe("tracker sheet", () => {
  const game: Game = [
    { t: "tax", seat: 0, cmdr: 0, delta: 2 },
    { t: "damage", seat: 0, from: 1, cmdr: 1, delta: 10 },
  ].reduce((g, a) => commit(g, a as never), { config, log: [] } as Game);

  it("lists the five tabs in order, with damage and tax in the tab labels", () => {
    const html = render("damage", game);
    const order = ["Commander damage", "Counters", "Tax", "Mana", "Table"].map((t) => html.indexOf(`>${t}`));
    expect(order.every((n, i) => n > 0 && (i === 0 || n > order[i - 1]))).toBe(true);
    expect(html).toContain(">10</em>");
    expect(html).toContain(">+4</em>");
  });
  it("gives a partner deck one stepper per commander", () => {
    const html = render("damage", game);
    expect(html).toContain("Ishai");
    expect(html).toContain("Bruse");
  });
  // Opponent Background addendum, call 7: a Background is cast from the command zone (Tax keeps both rows) but deals no damage.
  it("gives a Background seat one damage stepper and two Tax rows", () => {
    const bgSeats = seats.map((p) => (p.seat === 1 ? { ...p, partnerIsBackground: true } : p));
    const damage = render("damage", game, false, bgSeats);
    expect(damage).toContain("Ishai");
    expect(damage).not.toContain("Bruse");
    expect(render("damage", game, true, bgSeats)).not.toContain("Bruse");
    const tax = render("tax", game, false, bgSeats, 1);
    expect(tax).toContain("Ishai");
    expect(tax).toContain("Bruse");
    expect(tax.match(/Next cast costs/g)).toHaveLength(2);
  });
  it("offers ten counters and no custom one", () => {
    const html = render("counters", game);
    for (const name of ["Poison", "Energy", "Experience", "Rad", "Tickets", "Speed", "Storm", "The Ring", "City’s blessing", "Dungeon"]) expect(html).toContain(name);
    expect(html).not.toContain("Other");
  });
  it("shows the next cast's tax on the Tax tab", () => {
    const html = render("tax", game);
    expect(html).toContain("Next cast costs");
    expect(html).toMatch(/text-\[44px\][^>]*>\+(<!-- -->)?4</);
  });
  it("heads the sheet with the player's name and deck, then life", () => {
    const html = render("damage", game);
    expect(html).toMatch(/font-display[^>]*>You<\/b>/);
    expect(html).toContain("Sai Artifacts");
  });
  it("draws one damage card per opponent with a Cinzel count and the commander name", () => {
    const html = render("damage", game);
    expect(html).toMatch(/font-display[^>]*tabular-nums[^>]*>10</);
    expect(html).toContain("Bruse");
  });
  it("draws Concede and End game in the danger colour", () => {
    const html = render("table", game);
    expect(html.match(/border-\[color:var\(--danger\)\]/g)?.length).toBe(2);
  });
  it("renders the six mana colours", () => {
    const html = render("mana", game);
    for (const c of ["White", "Blue", "Black", "Red", "Green", "Colorless"]) expect(html).toContain(`Fewer ${c} mana`.replace(" mana", ""));
  });
  it("on a tablet, takes the half of the table nearest its seat over a veil, and draws damage as art cards", () => {
    const html = render("damage", game, true);
    expect(html).toContain('data-testid="sheet-veil"');
    expect(html).toMatch(/class="absolute inset-x-0 bottom-0 flex h-1\/2 min-h-\[380px\][^"]*rounded-t-\[20px\][^"]*sheet-up_/);
    // One art card for the one opponent; a partner pair carries a stacked stepper under each half, each its own container.
    expect(html.match(/data-testid="damage-card"/g)).toHaveLength(1);
    expect(html.match(/class="flex min-w-0 flex-1 flex-col items-center gap-1 px-1\.5 pb-3 @container"/g)).toHaveLength(2);
    expect(html.match(/grid grid-cols-2 justify-items-center/g)).toHaveLength(2);
    expect(html).toContain("Ishai");
    expect(html).toContain("Bruse");
    // The Table tab sits in the row with the others, not pushed to the far end.
    expect(html).not.toMatch(/ml-auto[^"]*"[^>]*>Table/);
  });
  it("on a phone, keeps the full-height sheet with no veil", () => {
    const html = render("damage", game);
    expect(html).not.toContain('data-testid="sheet-veil"');
    expect(html).not.toContain('data-testid="damage-card"');
    expect(html).toContain("flex h-full w-full flex-col");
  });
});
