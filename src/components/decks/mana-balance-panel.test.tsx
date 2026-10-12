import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deckStatsCopy } from "../../lib/copy/deck-stats";
import { manaBalanceCopy as copy } from "../../lib/copy/mana-balance";
import { NO_TAPPED_LANDS, type TappedLands } from "../../lib/mana/lands-tapped";
import type { ManaColor, ManaSupplyCardRow } from "../../lib/mana/supply";
import { readManaBalance } from "../../lib/tuning/mana-balance";
import { toClientBalance, type ManaPanelData } from "../../lib/tuning/mana-view";
import { ManaBalancePanel, manaOpenKey } from "./mana-balance-panel";

const openCard = vi.fn();
// The trigger is a stand-in that presses through `openCard` and hovers through the REAL preview hook, as the shipped one does.
vi.mock("../cards/card-detail-provider", async () => {
  const { usePreviewRow } = await import("./hover-preview");
  return {
    useCardDetail: () => ({ open: openCard }),
    useCardIntent: () => ({}),
    CardDetailTrigger: ({ oracleId, siblings, imageUri, preview, children }: { oracleId: string; siblings?: string[]; imageUri?: string | null; preview?: boolean; children: React.ReactNode }) => {
      const hover = usePreviewRow(preview ? imageUri : null);
      return <button type="button" {...(preview ? hover : {})} onClick={(e) => openCard(oracleId, siblings, undefined, { opener: e.currentTarget })}>{children}</button>;
    },
  };
});
vi.mock("../../app/decks/mana-actions", () => ({ readManaBalance: vi.fn(), readManaHelpFor: vi.fn(), readManaHelpReview: vi.fn(), applyManaTrade: vi.fn(), undoManaTrade: vi.fn() }));

const land = (id: string, quantity: number, produces: ManaColor[]): ManaSupplyCardRow => ({ id, typeLine: "Land", manaCost: null, quantity, produces });
const spell = (id: string, manaCost: string, quantity = 1): ManaSupplyCardRow => ({ id, typeLine: "Creature", manaCost, quantity });
const rock = (id: string, manaCost: string, quantity: number, produces: ManaColor[]): ManaSupplyCardRow => ({ id, typeLine: "Artifact", manaCost, quantity, produces, ramp: true });
const commander = (manaCost: string): ManaSupplyCardRow => ({ id: "commander:0", typeLine: "Legendary Creature", manaCost, quantity: 1 });

const tapped: TappedLands = { ...NO_TAPPED_LANDS, always: 2, lands: 2, names: { always: [{ name: "Gruul Guildgate", copies: 2 }], unless: [], fetch: [] } };

function panelData(rows: ManaSupplyCardRow[], identity = ["R", "G", "W"], t: TappedLands = tapped): ManaPanelData {
  const names: Record<string, string> = { "commander:0": "Gishath, Sun's Avatar" };
  const balance = readManaBalance({ rows, nameOf: (id) => names[id] ?? id, tapped: t, identity });
  const ids: Record<string, string> = {};
  for (const c of balance.colors) for (const p of c.patterns) for (const card of p.cards) ids[card.name] = `id-${card.name}`;
  return { balance: toClientBalance(balance), commander: "Gishath", commanders: 1, cards: rows.reduce((a, r) => a + r.quantity, 0), ids, art: {} };
}

const gishath = () => panelData([
  commander("{5}{R}{G}{W}"),
  spell("Archdruid", "{1}{G}{G}"),
  spell("Armasaur", "{1}{G}{G}"),
  spell("Courser", "{2}{G}{G}"),
  spell("Pantlaza", "{2}{R}{W}"),
  spell("Bolt", "{R}", 4),
  spell("Elf", "{G}"),
  spell("Bear", "{1}{G}"),
  spell("Cub", "{1}{G}"),
  spell("Fox", "{1}{G}"),
  spell("Owl", "{1}{G}"),
  land("forest", 20, ["G"]),
  land("mountain", 8, ["R"]),
  land("plains", 5, ["W"]),
  land("island", 1, ["U"]),
  rock("sol", "{1}", 2, ["C"]),
]);

const heading = () => document.getElementById("mana-heading");

beforeEach(() => {
  openCard.mockReset();
  localStorage.clear();
});

describe("ManaBalancePanel: reading", () => {
  it("draws nothing at first, then a counting frame with no stable heading, then the count", async () => {
    vi.useFakeTimers();
    let resolve!: (d: ManaPanelData) => void;
    const read = vi.fn(() => new Promise<ManaPanelData>((r) => { resolve = r; }));
    const onSettled = vi.fn();
    try {
      const { container } = render(<ManaBalancePanel deckId="d" read={read} onSettled={onSettled} />);
      expect(container.innerHTML).toBe("");
      await act(async () => { vi.advanceTimersByTime(450); });
      expect(container.querySelector("[data-mana-state='counting']")).not.toBeNull();
      expect(heading()).toBeNull();
      await act(async () => { resolve(gishath()); });
      expect(heading()?.textContent).toBe(copy.title);
      expect(onSettled).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("draws the failed state, with its heading, when the read refuses or throws", async () => {
    const { unmount } = render(<ManaBalancePanel deckId="d" read={async () => null} />);
    await waitFor(() => expect(heading()?.textContent).toContain(copy.failed.heading));
    expect(screen.getByRole("img", { name: copy.failed.tag })).toBeTruthy();
    expect(screen.getByText(copy.failed.kept)).toBeTruthy();
    unmount();
    render(<ManaBalancePanel deckId="d" read={async () => { throw new Error("down"); }} />);
    await waitFor(() => expect(heading()?.textContent).toContain(copy.failed.heading));
  });

  it("draws only the newest-asked read when an older one lands last", async () => {
    const answers: ((d: ManaPanelData) => void)[] = [];
    const read = vi.fn(() => new Promise<ManaPanelData>((r) => { answers.push(r); }));
    const { rerender } = render(<ManaBalancePanel deckId="d" read={read} revision="a" />);
    rerender(<ManaBalancePanel deckId="d" read={read} revision="b" />);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    const newer = panelData([spell("Elf", "{G}"), land("forest", 10, ["G"])], ["G"]);
    await act(async () => { answers[1](newer); });
    await act(async () => { answers[0](gishath()); });
    expect(document.querySelectorAll("[data-mana-row]").length).toBe(1);
  });

  it("reads again when the list moves, and not on a re-render that leaves it alone", async () => {
    const read = vi.fn(async () => gishath());
    const { rerender } = render(<ManaBalancePanel deckId="d" read={read} revision="a" />);
    await waitFor(() => expect(heading()).not.toBeNull());
    rerender(<ManaBalancePanel deckId="d" read={read} revision="a" />);
    rerender(<ManaBalancePanel deckId="d" read={read} revision="b" />);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
  });
});

describe("ManaBalancePanel: the evidence", () => {
  it("states the Colors card's totals, a row per color W U B R G, and each color's Needed", async () => {
    render(<ManaBalancePanel deckId="d" read={async () => gishath()} />);
    await waitFor(() => expect(heading()).not.toBeNull());
    expect(screen.getByText(copy.lead)).toBeTruthy();
    expect([...document.querySelectorAll("[data-mana-row]")].map((r) => r.getAttribute("data-mana-row"))).toEqual(["W", "U", "R", "G"]);
    const green = document.querySelector("[data-mana-row='G']") as HTMLElement;
    // The commander's {G} is in the pips, and no figure without it is drawn (Hugh, 2026-10-11: they still pay for the commander).
    expect(green.textContent).not.toContain("without");
    expect(green.textContent).toContain(copy.table.neededFor("Archdruid", 1, "1CC"));
    // A color with a source and no pip is drawn, never hidden.
    const blue = document.querySelector("[data-mana-row='U']") as HTMLElement;
    expect(blue.textContent).toContain(copy.table.noPips);
    expect(document.querySelector("[data-mana-colorless]")?.textContent).toContain("no {C} pips · 2 sources");
  });

  it("never states a verdict, and names Karsten only where the ruling allows", async () => {
    render(<ManaBalancePanel deckId="d" read={async () => gishath()} />);
    await waitFor(() => expect(heading()).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /Lands/ }));
    fireEvent.click(screen.getByRole("button", { name: /Hardest costs/ }));
    const text = (document.querySelector("[data-mana-state]") as HTMLElement).textContent!;
    for (const word of [" short", "covered", "balanced", "Karsten’s count", "Karsten’s land", "labels"]) expect(text).not.toContain(word);
    // Karsten appears in the citation alone until "What Needs means" is opened.
    expect(text.split("Karsten").length - 1).toBe(1);
  });

  it("opens What Needs means in place and returns focus to it on Hide", async () => {
    render(<ManaBalancePanel deckId="d" read={async () => gishath()} />);
    await waitFor(() => expect(heading()).not.toBeNull());
    const toggle = screen.getByRole("button", { name: copy.needs.toggle });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const region = screen.getByRole("region", { name: copy.needs.toggle });
    expect(region.textContent).toContain(copy.needs.needsBody);
    expect(within(region).getByRole("link", { name: copy.newTab("TCGplayer") }).getAttribute("target")).toBe("_blank");
    fireEvent.click(screen.getByRole("button", { name: copy.needs.close }));
    expect(screen.queryByRole("region", { name: copy.needs.toggle })).toBeNull();
    expect(document.activeElement).toBe(toggle);
  });
});

describe("ManaBalancePanel: the folded sections", () => {
  it("starts both folded, opens one in place, and remembers it per deck", async () => {
    const { unmount } = render(<ManaBalancePanel deckId="d" read={async () => gishath()} />);
    await waitFor(() => expect(heading()).not.toBeNull());
    const hardest = screen.getByRole("button", { name: /Hardest costs/ });
    expect(hardest.getAttribute("aria-expanded")).toBe("false");
    expect(hardest.textContent).toContain(copy.sections.hardest.clause("white, red, green"));
    expect(document.querySelector("[data-mana-patterns]")).toBeNull();
    fireEvent.click(hardest);
    expect(document.querySelector("[data-mana-patterns='G']")).not.toBeNull();
    expect(JSON.parse(localStorage.getItem(manaOpenKey("d"))!)).toEqual(["hardest"]);
    unmount();
    render(<ManaBalancePanel deckId="d" read={async () => gishath()} />);
    await waitFor(() => expect(document.querySelector("[data-mana-patterns='G']")).not.toBeNull());
    expect(localStorage.getItem(manaOpenKey("other"))).toBeNull();
  });

  it("plays a section's arrival when the reader opens it, not when a remembered-open one mounts", async () => {
    const body = (name: RegExp) => document.getElementById(screen.getByRole("button", { name }).getAttribute("aria-controls")!)!;
    const first = render(<ManaBalancePanel deckId="d" read={async () => gishath()} />);
    await waitFor(() => expect(heading()).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /Hardest costs/ }));
    expect(body(/Hardest costs/).classList.contains("anim-gentle-in")).toBe(true);
    first.unmount();
    render(<ManaBalancePanel deckId="d" read={async () => gishath()} />);
    await waitFor(() => expect(document.querySelector("[data-mana-patterns='G']")).not.toBeNull());
    expect(body(/Hardest costs/).classList.contains("anim-gentle-in")).toBe(false);
  });

  it("switches colors with the chips, shows three names then +N more, and opens card detail by name", async () => {
    render(<ManaBalancePanel deckId="d" read={async () => gishath()} />);
    await waitFor(() => expect(heading()).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /Hardest costs/ }));
    const chips = screen.getByRole("radiogroup", { name: copy.patterns.chips });
    expect(within(chips).getByRole("radio", { name: "Green" }).getAttribute("aria-checked")).toBe("true");
    const oneG = document.querySelector("[data-mana-pattern='1C']") as HTMLElement;
    expect(within(oneG).getByRole("button", { name: copy.patterns.more(1) })).toBeTruthy();
    fireEvent.click(within(oneG).getByRole("button", { name: "Bear" }));
    expect(openCard).toHaveBeenCalledWith("id-Bear", expect.arrayContaining(["id-Bear", "id-Cub"]), undefined, expect.anything());
    fireEvent.keyDown(within(chips).getByRole("radio", { name: "Green" }), { key: "ArrowRight" });
    expect(document.querySelector("[data-mana-patterns='W']")).not.toBeNull();
    fireEvent.click(within(chips).getByRole("radio", { name: "Red" }));
    const red = document.querySelector("[data-mana-patterns='R']") as HTMLElement;
    expect(red.textContent).toContain(copy.patterns.haveNeeds(8, 19));
    expect(screen.getByText(copy.patterns.foot("Red"))).toBeTruthy();
  });

  it("lists the lands behind a tapped figure, and draws a row of 0 with nothing to open", async () => {
    render(<ManaBalancePanel deckId="d" read={async () => gishath()} />);
    await waitFor(() => expect(heading()).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /Lands/ }));
    const tappedRow = screen.getByRole("button", { name: new RegExp(copy.lands.always) });
    fireEvent.click(tappedRow);
    expect(screen.getByText(`Gruul Guildgate ${copy.patterns.copies(2)}`)).toBeTruthy();
    expect(screen.queryByRole("button", { name: new RegExp(copy.lands.unless) })).toBeNull();
    expect(screen.getByText(copy.lands.countOf(gishath().cards))).toBeTruthy();
  });
});

describe("ManaBalancePanel: thin decks", () => {
  it("draws the colorless deck with its note, the colorless count and Lands, and nothing about colors", async () => {
    const data = panelData([commander("{7}"), spell("Ring", "{C}{C}", 3), land("wastes", 10, ["C"])], []);
    render(<ManaBalancePanel deckId="d" read={async () => data} />);
    await waitFor(() => expect(heading()).not.toBeNull());
    expect(screen.getByText(copy.thin.colorless)).toBeTruthy();
    expect(document.querySelector("[data-mana-table]")).toBeNull();
    expect(screen.queryByRole("button", { name: copy.needs.toggle })).toBeNull();
    expect(screen.queryByRole("button", { name: /Hardest costs/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Lands/ })).toBeTruthy();
    expect(document.querySelector("[data-mana-colorless]")?.textContent).toContain("6 {C} pips · 10 sources");
    expect(document.querySelector("[data-mana-colorless]")?.textContent).not.toContain("%");
    expect(document.querySelector("[data-mana-citation]")?.textContent).toContain(copy.cite.landOnlyBefore);
  });

  it("draws the colorless line at zero for a colorless deck with no {C} pip and no source", async () => {
    const data = panelData([commander("{4}"), spell("Golem", "{3}")], []);
    render(<ManaBalancePanel deckId="d" read={async () => data} />);
    await waitFor(() => expect(heading()).not.toBeNull());
    expect(document.querySelector("[data-mana-colorless]")?.textContent).toContain("no {C} pips · 0 sources");
  });

  it("replaces the lead for a deck with no lands, and keeps the Needed figures", async () => {
    const data = panelData([commander("{5}{R}{G}{W}"), spell("Archdruid", "{1}{G}{G}", 3)], ["R", "G", "W"], NO_TAPPED_LANDS);
    render(<ManaBalancePanel deckId="d" read={async () => data} />);
    await waitFor(() => expect(heading()).not.toBeNull());
    expect(screen.getByText(`${deckStatsCopy.colors.noLands} ${copy.thin.noSources}`)).toBeTruthy();
    expect(screen.queryByText(copy.lead)).toBeNull();
    expect((document.querySelector("[data-mana-row='G']") as HTMLElement).textContent).toContain(copy.table.neededFor("Archdruid", 0, "1CC"));
    fireEvent.click(screen.getByRole("button", { name: /Lands/ }));
    expect(screen.getByText(copy.lands.caveat(0))).toBeTruthy();
  });
});

describe("ManaBalancePanel: a pattern's card names preview", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({ matches: query === "(hover: hover)", media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }),
    });
  });
  afterEach(() => { vi.useRealTimers(); });

  it("shows the deck's art for the name the pointer rests on", async () => {
    render(<ManaBalancePanel deckId="d" read={async () => ({ ...gishath(), art: { "id-Bear": "https://img.test/bear.jpg" } })} />);
    await waitFor(() => expect(heading()).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: /Hardest costs/ }));
    const oneG = document.querySelector("[data-mana-pattern='1C']") as HTMLElement;
    fireEvent.mouseEnter(within(oneG).getByRole("button", { name: "Bear" }), { clientX: 10, clientY: 10 });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId("hover-preview").getAttribute("style")).toContain("https://img.test/bear.jpg");
  });
});
