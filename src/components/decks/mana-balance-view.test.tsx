import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { manaBalanceCopy as copy } from "../../lib/copy/mana-balance";
import { NO_TAPPED_LANDS } from "../../lib/mana/lands-tapped";
import type { ManaSupplyCardRow } from "../../lib/mana/supply";
import { readManaBalance } from "../../lib/tuning/mana-balance";
import { toClientBalance, type ManaPanelData } from "../../lib/tuning/mana-view";
import { ManaBalanceView } from "./mana-balance-view";

// No module mock on purpose: the view draws from props alone (no server action, no card-detail provider, no storage).

const land = (id: string, quantity: number, produces: ManaSupplyCardRow["produces"]): ManaSupplyCardRow => ({ id, typeLine: "Land", manaCost: null, quantity, produces });
const spell = (id: string, manaCost: string, quantity = 1): ManaSupplyCardRow => ({ id, typeLine: "Creature", manaCost, quantity });

function data(): ManaPanelData {
  const rows: ManaSupplyCardRow[] = [
    { id: "commander:0", typeLine: "Legendary Creature", manaCost: "{2}{R}{G}", quantity: 1 },
    spell("Archdruid", "{1}{G}{G}"), spell("Bolt", "{R}", 4), land("forest", 20, ["G"]), land("mountain", 10, ["R"]),
  ];
  const balance = readManaBalance({ rows, nameOf: (id) => (id === "commander:0" ? "Ghave" : id), tapped: NO_TAPPED_LANDS, identity: ["R", "G"] });
  const ids: Record<string, string> = {};
  for (const c of balance.colors) for (const p of c.patterns) for (const card of p.cards) ids[card.name] = `id-${card.name}`;
  return { balance: toClientBalance(balance), commander: "Ghave", commanders: 1, cards: 35, ids, art: {} };
}

afterEach(cleanup);

describe("ManaBalanceView draws from props alone", () => {
  it("draws the title, the lead and the evidence, both sections folded, and the door it was handed", () => {
    render(<ManaBalanceView data={data()} isOpen={() => false} onToggle={vi.fn()} improve={<div data-testid="door" />} />);
    expect(screen.getByRole("heading", { name: copy.title })).toBeTruthy();
    expect(screen.getByText(copy.lead)).toBeTruthy();
    expect(screen.getByTestId("door")).toBeTruthy();
    expect(document.querySelector("[data-mana-patterns]")).toBeNull();
  });

  it("reports a section's toggle to the handler, and draws it open when told it is", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<ManaBalanceView data={data()} isOpen={() => false} onToggle={onToggle} />);
    const heads = screen.getAllByRole("button", { expanded: false });
    fireEvent.click(heads[heads.length - 1]);
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<ManaBalanceView data={data()} isOpen={(id) => id === "hardest"} onToggle={onToggle} />);
    expect(document.querySelector("[data-mana-patterns]")).not.toBeNull();
  });

  it("draws a card name in Hardest costs through renderCard, and plain without one", () => {
    const view = (renderCard?: Parameters<typeof ManaBalanceView>[0]["renderCard"]) => (
      <ManaBalanceView data={data()} isOpen={(id) => id === "hardest"} onToggle={vi.fn()} renderCard={renderCard} />
    );
    const { unmount } = render(view());
    expect(screen.queryAllByTestId(/^card-/)).toHaveLength(0);
    unmount();
    render(view((c) => <button data-testid={`card-${c.name}`} className={c.className}>{c.name}</button>));
    // Whichever color's patterns are open, each card name with an id is drawn through the callback.
    const drawn = screen.getAllByTestId(/^card-/);
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn[0].textContent).toBe(drawn[0].getAttribute("data-testid")!.slice(5));
  });
});
