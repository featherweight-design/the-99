import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { commit, replay, type Game, type GameConfig } from "../../lib/tracker/engine";
import type { PlaySeat } from "./panel";
import { Sheet, type SheetTab } from "./sheet";

const config: GameConfig = { tableId: "t", startingLife: 40, seats: [{ seat: 0, commanders: 1 }, { seat: 1, commanders: 2 }], first: 0, layout: "phone-2" };
const seats: PlaySeat[] = [
  { seat: 0, you: true, name: "Hugh", art: null, partnerArt: null, commander: "Sai", partner: null },
  { seat: 1, you: false, name: "Colin" as never, art: null, partnerArt: null, commander: "Ishai", partner: "Bruse" },
];
const render = (tab: SheetTab, game: Game) =>
  renderToStaticMarkup(
    <Sheet view={{ seat: 0, tab }} seats={seats} state={replay(game)} game={game} rot={0} onView={() => {}} onClose={() => {}} onCommit={() => {}} onUndo={() => {}} />,
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
    expect(html).toContain(">10<");
    expect(html).toContain("+4");
  });
  it("gives a partner deck one stepper per commander", () => {
    const html = render("damage", game);
    expect(html).toContain("Ishai");
    expect(html).toContain("Bruse");
  });
  it("offers ten counters and no custom one", () => {
    const html = render("counters", game);
    for (const name of ["Poison", "Energy", "Experience", "Rad", "Tickets", "Speed", "Storm", "The Ring", "City’s blessing", "Dungeon"]) expect(html).toContain(name);
    expect(html).not.toContain("Other");
  });
  it("shows the next cast's tax on the Tax tab", () => {
    expect(render("tax", game)).toContain("+4");
  });
  it("renders the six mana colours", () => {
    const html = render("mana", game);
    for (const c of ["White", "Blue", "Black", "Red", "Green", "Colorless"]) expect(html).toContain(`Fewer ${c} mana`.replace(" mana", ""));
  });
});
