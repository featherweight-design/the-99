import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import { manaBalanceCopy as copy } from "../../lib/copy/mana-balance";
import { noteDeckRoute, resetDeckVisitForTests } from "../../lib/decks/visit";
import { NO_TAPPED_LANDS } from "../../lib/mana/lands-tapped";
import type { ManaColor, ManaSupplyCardRow } from "../../lib/mana/supply";
import { readManaBalance, type BalanceColor } from "../../lib/tuning/mana-balance";
import type { ManaHelp } from "../../lib/tuning/mana-help";
import type { StapleCandidate } from "../../lib/tuning/mana-staples";
import { toClientBalance } from "../../lib/tuning/mana-view";
import { ImproveDoor, type HelpRead, type TradeActions } from "./mana-improve-door";
import { reveal } from "../../lib/ui/reveal";
import { ReviewRunProvider } from "./review-run";

const openCard = vi.fn();
vi.mock("../cards/card-detail-provider", () => ({ useCardDetail: () => ({ open: openCard }), useCardIntent: () => ({}) }));
vi.mock("../../app/decks/mana-actions", () => ({ readManaHelpFor: vi.fn(), readManaHelpReview: vi.fn(), applyManaTrade: vi.fn(), undoManaTrade: vi.fn() }));

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const land = (id: string, quantity: number, produces: ManaColor[]): ManaSupplyCardRow => ({ id, typeLine: "Land", manaCost: null, quantity, produces });
const spell = (id: string, manaCost: string, quantity = 1): ManaSupplyCardRow => ({ id, typeLine: "Creature", manaCost, quantity });
const balanceOf = (rows: ManaSupplyCardRow[], identity: string[]) => toClientBalance(readManaBalance({ rows, nameOf: (id) => id, tapped: NO_TAPPED_LANDS, identity }));

// Red is tightest (its sources sit furthest under its need), green next, blue has sources and no pips.
const three = balanceOf([
  spell("Archdruid", "{1}{G}{G}", 2), spell("Bolt", "{R}{R}", 2), spell("Elf", "{G}"),
  land("forest", 20, ["G"]), land("mountain", 6, ["R"]), land("island", 2, ["U"]),
], ["U", "R", "G"]);
const mono = balanceOf([spell("Merfolk", "{U}{U}", 3), land("island", 30, ["U"])], ["U"]);

const staple = (over: Partial<StapleCandidate>): StapleCandidate => ({
  oracleId: "s1", name: "Rockfall Vale", typeLine: "Land", manaCost: null, produces: ["R", "G"],
  fact: { kind: "commander", inclusion: 41.6 }, free: 0, priceCents: 310, imageUri: null, ...over,
});
const helpFor = (color: BalanceColor, over: Partial<ManaHelp> = {}): ManaHelp => ({
  color, inIdentity: true, sourcesNow: 6,
  rebalance: [{ kind: "rebalance", from: "G", basicOut: "Forest", basicIn: "Mountain", maxCopies: 3, changes: [{ color: "G", before: 20, after: 17 }, { color: color, before: 6, after: 9 }] }],
  trades: [],
  staples: [staple({}), staple({ oracleId: "s2", name: "Cinder Glade", free: 1, fact: { kind: "identity", condition: "count:3", commanders: 10, commanderTotal: 20, avgInclusion: 22.6 } })],
  ...over,
});

function door(read: (d: string, c: string) => Promise<ManaHelp | null>, deckId = A, balance = three, revision = "r1") {
  return <ImproveDoor deckId={deckId} balance={balance} commander="Gishath" revision={revision} read={read} />;
}

// A landed result is brought into view through `reveal`; its eased scroll is `reveal`'s own test.
vi.mock("../../lib/ui/reveal", () => ({ reveal: vi.fn() }));
const scroll = vi.mocked(reveal);
beforeEach(() => {
  scroll.mockReset();
  resetDeckVisitForTests();
  noteDeckRoute(`/decks/${A}`);
  openCard.mockReset();
});

describe("ImproveDoor: the step", () => {
  it("opens on a press, lists the colors tightest first with nothing selected, and focuses the first", async () => {
    const read = vi.fn();
    render(door(read));
    const button = screen.getByRole("button", { name: copy.door.button });
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("radiogroup")).toBeNull();
    fireEvent.click(button);
    const group = screen.getByRole("radiogroup", { name: copy.step.group });
    const rows = within(group).getAllByRole("radio");
    expect(rows.map((r) => r.getAttribute("data-mana-step-row"))).toEqual(three.colorOrder.map((c) => c.color));
    expect(rows.every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(rows[0]));
    // A color with sources and no pips is listed last and says so.
    expect(rows.at(-1)!.textContent).toContain(copy.step.noPips(2));
    expect(read).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: copy.door.button })).toBeNull();
    expect(screen.getByRole("button", { name: copy.needs.toggle })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.step.close }));
    expect(screen.queryByRole("radiogroup")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: copy.door.button })));
  });

  it("skips the step for a one-color deck and reads that color's help at once", async () => {
    const read = vi.fn(async () => helpFor("U", { rebalance: [], staples: [] }));
    render(door(read, A, mono));
    expect(screen.getByText(copy.door.leadOne("Gishath", "blue"))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.door.button }));
    await waitFor(() => expect(read).toHaveBeenCalledWith(A, "U"));
    expect(await screen.findByText(copy.help.noSwap("blue"))).toBeTruthy();
    expect(screen.getByText(copy.help.noStaples("blue"))).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.help.change })).toBeNull();
  });
});

describe("ImproveDoor: the result", () => {
  it("draws swaps, staples owned first with their facts, and a buy link for the rest", async () => {
    const read = vi.fn(async (_d: string, c: string) => helpFor(c as BalanceColor));
    render(door(read));
    fireEvent.click(screen.getByRole("button", { name: copy.door.button }));
    fireEvent.click(screen.getAllByRole("radio")[0]);
    const head = await screen.findByRole("heading", { name: copy.help.head("red") });
    await waitFor(() => expect(document.activeElement).toBe(head));
    expect(screen.getByText(copy.help.swap(3, "Forest", "Mountain"))).toBeTruthy();
    expect(screen.getByText("red 6 → 9 · green 20 → 17")).toBeTruthy();
    const toBuy = document.querySelector("[data-mana-staple='s1']") as HTMLElement;
    expect(toBuy.textContent).toContain(copy.help.toBuy);
    expect(toBuy.textContent).toContain(copy.help.rate.commander(42, "Gishath"));
    expect(within(toBuy).getByRole("link", { name: copy.help.buyAria("Rockfall Vale") }).getAttribute("href")).toContain("Rockfall%20Vale");
    const owned = document.querySelector("[data-mana-staple='s2']") as HTMLElement;
    expect(owned.textContent).toContain(copy.help.owned(1));
    expect(owned.textContent).toContain(copy.help.rate.identity(23, "3-color"));
    fireEvent.click(within(owned).getByRole("button", { name: "Cinder Glade" }));
    expect(openCard).toHaveBeenCalledWith("s2", ["s1", "s2"], undefined, expect.anything());
    fireEvent.click(screen.getByRole("button", { name: copy.help.howLabel }));
    expect(screen.getByRole("tooltip").textContent).toBe(copy.help.how("red"));
    expect(copy.help.how("red")).not.toContain("tightest");
  });

  it("names basics in the plural, Plains included", () => {
    expect(copy.help.swap(3, "Plains", "Mountain")).toBe("Up to 3 Plains → Mountains");
    expect(copy.help.swap(2, "Forest", "Plains")).toBe("Up to 2 Forests → Plains");
    expect(copy.help.swap(1, "Plains", "Island")).toBe("1 Plains → Island");
  });

  it("draws the failed state and reads again on Try again", async () => {
    const read = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(helpFor("R"));
    render(door(read));
    fireEvent.click(screen.getByRole("button", { name: copy.door.button }));
    fireEvent.click(screen.getAllByRole("radio")[0]);
    expect(await screen.findByText(copy.help.failed("red"))).toBeTruthy();
    expect(screen.getByRole("img", { name: copy.help.failedMark })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.help.retry }));
    expect(await screen.findByText(copy.help.swap(3, "Forest", "Mountain"))).toBeTruthy();
  });

  it("draws only the newest pick when an older read lands last", async () => {
    const answers: ((h: ManaHelp) => void)[] = [];
    const read = vi.fn(() => new Promise<ManaHelp>((r) => { answers.push(r); }));
    render(door(read));
    fireEvent.click(screen.getByRole("button", { name: copy.door.button }));
    fireEvent.click(screen.getAllByRole("radio")[0]);
    fireEvent.click(await screen.findByRole("button", { name: copy.help.change }));
    fireEvent.click(screen.getAllByRole("radio")[1]);
    await act(async () => { answers[1](helpFor(three.colorOrder[1].color)); });
    await act(async () => { answers[0](helpFor(three.colorOrder[0].color)); });
    expect(document.querySelector(`[data-mana-help='${three.colorOrder[1].color}']`)).not.toBeNull();
  });

  it("goes back to the step rather than draw help for a color outside the commander's", async () => {
    render(door(async () => helpFor("R", { inIdentity: false })));
    fireEvent.click(screen.getByRole("button", { name: copy.door.button }));
    fireEvent.click(screen.getAllByRole("radio")[0]);
    await waitFor(() => expect(screen.getByRole("radiogroup")).toBeTruthy());
    expect(document.querySelector("[data-mana-help]")).toBeNull();
  });
});

describe("ImproveDoor: the result lasts the visit (Hugh, 2026-10-11)", () => {
  async function showHelp(read: (d: string, c: string) => Promise<ManaHelp | null>) {
    const view = render(door(read));
    fireEvent.click(screen.getByRole("button", { name: copy.door.button }));
    fireEvent.click(screen.getAllByRole("radio")[0]);
    await screen.findByText(copy.help.swap(3, "Forest", "Mountain"));
    return view;
  }

  it("keeps it across a tool or tab switch (an unmount), without reading again", async () => {
    const read = vi.fn(async (_d: string, c: string) => helpFor(c as BalanceColor));
    const { unmount } = await showHelp(read);
    unmount();
    noteDeckRoute(`/decks/${A}/changes`);
    render(door(read));
    expect(screen.getByText(copy.help.swap(3, "Forest", "Mountain"))).toBeTruthy();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it("resets on leaving the deck and coming back", async () => {
    const { unmount } = await showHelp(async (_d, c) => helpFor(c as BalanceColor));
    unmount();
    noteDeckRoute("/decks");
    noteDeckRoute(`/decks/${A}`);
    render(door(vi.fn()));
    expect(document.querySelector("[data-mana-help]")).toBeNull();
  });

  it("resets on moving from deck A to deck B", async () => {
    const { unmount } = await showHelp(async (_d, c) => helpFor(c as BalanceColor));
    unmount();
    noteDeckRoute(`/decks/${B}`);
    render(door(vi.fn(), B));
    expect(document.querySelector("[data-mana-help]")).toBeNull();
  });

  it("retires it when the list moves, in place and on the next mount", async () => {
    const read = vi.fn(async (_d: string, c: string) => helpFor(c as BalanceColor));
    const { rerender, unmount } = await showHelp(read);
    rerender(door(read, A, three, "r2"));
    await waitFor(() => expect(document.querySelector("[data-mana-help]")).toBeNull());
    unmount();
    render(door(read, A, three, "r2"));
    expect(document.querySelector("[data-mana-help]")).toBeNull();
  });
});

describe("ImproveDoor: review round 1", () => {
  it("focuses the result heading once, and never takes focus back when the read lands", async () => {
    let answer!: (h: ManaHelp) => void;
    render(door(() => new Promise<ManaHelp>((r) => { answer = r; })));
    fireEvent.click(screen.getByRole("button", { name: copy.door.button }));
    fireEvent.click(screen.getAllByRole("radio")[0]);
    await waitFor(() => expect(document.activeElement?.tagName).toBe("H3"));
    const elsewhere = document.createElement("button");
    document.body.appendChild(elsewhere);
    elsewhere.focus();
    await act(async () => { answer(helpFor("R")); });
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });

  it("brings the result into view smoothly when it lands, not while it reads", async () => {
    let answer!: (h: ManaHelp) => void;
    render(door(() => new Promise<ManaHelp>((r) => { answer = r; })));
    fireEvent.click(screen.getByRole("button", { name: copy.door.button }));
    fireEvent.click(screen.getAllByRole("radio")[0]);
    await waitFor(() => expect(document.activeElement?.tagName).toBe("H3"));
    expect(scroll).not.toHaveBeenCalled();
    await act(async () => { answer(helpFor("R")); });
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll).toHaveBeenCalledWith(document.activeElement);
  });

  it("keeps nothing from a read that lands after the player left the deck and came back", async () => {
    let answer!: (h: ManaHelp) => void;
    const { unmount } = render(door(() => new Promise<ManaHelp>((r) => { answer = r; })));
    fireEvent.click(screen.getByRole("button", { name: copy.door.button }));
    fireEvent.click(screen.getAllByRole("radio")[0]);
    noteDeckRoute("/decks");
    noteDeckRoute(`/decks/${A}`);
    await act(async () => { answer(helpFor("R")); });
    unmount();
    render(door(vi.fn()));
    expect(document.querySelector("[data-mana-help]")).toBeNull();
  });

  it("draws no buy tag and no link for a staple with no price", async () => {
    render(door(async () => helpFor("R", { staples: [staple({ priceCents: null })] })));
    fireEvent.click(screen.getByRole("button", { name: copy.door.button }));
    fireEvent.click(screen.getAllByRole("radio")[0]);
    await waitFor(() => expect(document.querySelector("[data-mana-staple='s1']")).not.toBeNull());
    const row = document.querySelector("[data-mana-staple='s1']") as HTMLElement;
    expect(row.textContent).toContain(copy.help.toBuy);
    expect(within(row).queryByRole("link")).toBeNull();
    // `to buy` alone: no tag's own `buy` beside it.
    expect(row.textContent!.match(/buy/g)).toHaveLength(1);
  });
});

describe("ImproveDoor: review round 2", () => {
  it("keeps the newer of two reads from two mounts, whichever lands last", async () => {
    const answers: ((h: ManaHelp) => void)[] = [];
    const read = () => new Promise<ManaHelp>((r) => { answers.push(r); });
    const first = render(door(read));
    fireEvent.click(screen.getByRole("button", { name: copy.door.button }));
    fireEvent.click(screen.getAllByRole("radio")[0]);
    first.unmount();
    const second = render(door(read));
    fireEvent.click(screen.getByRole("button", { name: copy.door.button }));
    fireEvent.click(screen.getAllByRole("radio")[1]);
    const newer = three.colorOrder[1].color;
    await act(async () => { answers[1](helpFor(newer)); });
    await act(async () => { answers[0](helpFor(three.colorOrder[0].color)); });
    second.unmount();
    render(door(vi.fn()));
    expect(document.querySelector(`[data-mana-help='${newer}']`)).not.toBeNull();
  });

  it("draws no result for a color the new count no longer holds", async () => {
    const read = vi.fn(async (_d: string, c: string) => helpFor(c as BalanceColor));
    const { rerender } = render(door(read));
    fireEvent.click(screen.getByRole("button", { name: copy.door.button }));
    fireEvent.click(screen.getAllByRole("radio")[0]);
    await screen.findByText(copy.help.swap(3, "Forest", "Mountain"));
    // The same list, recounted with a commander that has none of red: the kept color is gone.
    rerender(<ImproveDoor deckId={A} balance={mono} commander="Gishath" revision="r1" read={read} />);
    expect(document.querySelector("[data-mana-help]")).toBeNull();
  });
});

describe("ImproveDoor: absent", () => {
  it("draws nothing for a colorless deck", () => {
    const colorless = balanceOf([spell("Ring", "{C}{C}"), land("wastes", 10, ["C"])], []);
    const { container } = render(door(vi.fn(), A, colorless));
    expect(container.innerHTML).toBe("");
  });
});

describe("ImproveDoor: applying a trade", () => {
  const trade = { kind: "trade" as const, out: { id: "forest-id", name: "Forest", kind: "basic" as const }, staple: staple({}), changes: [{ color: "R" as BalanceColor, before: 6, after: 7 }] };
  const withTrade = (color: BalanceColor) => helpFor(color, { trades: [trade] });
  const tradeButton = () => screen.getByRole("button", { name: copy.help.tradeApply("Forest") });

  async function openRed(read: HelpRead, trades: TradeActions, revision = "r1") {
    const view = render(<ImproveDoor deckId={A} balance={three} commander="Gishath" revision={revision} read={read} trades={trades} />);
    fireEvent.click(screen.getByRole("button", { name: copy.door.button }));
    fireEvent.click(screen.getAllByRole("radio")[0]);
    await screen.findByRole("button", { name: copy.help.tradeApply("Forest") });
    return view;
  }

  it("applies by naming only the color and the staple, then draws the receipt with Undo", async () => {
    const read = vi.fn(async (_d: string, c: string) => withTrade(c as BalanceColor));
    const trades = { apply: vi.fn(async () => ({ ok: true as const, applyId: "apply-1" })), undo: vi.fn() };
    await openRed(read, trades);
    await act(async () => { fireEvent.click(tradeButton()); });
    expect(trades.apply).toHaveBeenCalledWith(A, "R", "s1", "forest-id");
    const receipt = document.querySelector("[data-mana-applied]") as HTMLElement;
    expect(receipt.textContent).toContain("Forest");
    expect(receipt.textContent).toContain("Rockfall Vale");
    expect(within(receipt).getByRole("button", { name: deckTuningCopy.card.undo })).toBeTruthy();
  });

  it("reads the same color again when the list moves after its own trade, rather than closing", async () => {
    const read = vi.fn(async (_d: string, c: string) => withTrade(c as BalanceColor));
    const trades = { apply: vi.fn(async () => ({ ok: true as const, applyId: "apply-1" })), undo: vi.fn() };
    const view = await openRed(read, trades);
    await act(async () => { fireEvent.click(tradeButton()); });
    expect(read).toHaveBeenCalledTimes(1);
    view.rerender(<ImproveDoor deckId={A} balance={three} commander="Gishath" revision="r2" read={read} trades={trades} />);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(2));
    expect(read).toHaveBeenLastCalledWith(A, "R");
    expect(document.querySelector("[data-mana-help='R']")).not.toBeNull();
    // A list moving for any other reason still closes the result.
    view.rerender(<ImproveDoor deckId={A} balance={three} commander="Gishath" revision="r3" read={read} trades={trades} />);
    await waitFor(() => expect(document.querySelector("[data-mana-help]")).toBeNull());
  });

  it("undoes, dropping the receipt, and draws a refusal under the trade it was for", async () => {
    const read = vi.fn(async (_d: string, c: string) => withTrade(c as BalanceColor));
    const trades = {
      apply: vi.fn().mockResolvedValueOnce({ ok: false, message: deckTuningCopy.card.applyRefused }).mockResolvedValueOnce({ ok: true, applyId: "apply-1" }),
      undo: vi.fn(async () => ({ ok: true as const })),
    };
    await openRed(read, trades);
    await act(async () => { fireEvent.click(tradeButton()); });
    expect(screen.getByText(deckTuningCopy.card.applyRefused)).toBeTruthy();
    expect(document.querySelector("[data-mana-applied]")).toBeNull();
    await act(async () => { fireEvent.click(tradeButton()); });
    const receipt = document.querySelector("[data-mana-applied]") as HTMLElement;
    await act(async () => { fireEvent.click(within(receipt).getByRole("button", { name: deckTuningCopy.card.undo })); });
    expect(trades.undo).toHaveBeenCalledWith("apply-1");
    expect(document.querySelector("[data-mana-applied]")).toBeNull();
  });

  it("holds every Undo while any trade or Undo is in flight", async () => {
    const read = vi.fn(async (_d: string, c: string) => withTrade(c as BalanceColor));
    let land!: (r: { ok: true; applyId: string }) => void;
    const trades = {
      apply: vi.fn().mockResolvedValueOnce({ ok: true, applyId: "apply-1" }).mockReturnValueOnce(new Promise((r) => { land = r; })),
      undo: vi.fn(),
    };
    await openRed(read, trades);
    await act(async () => { fireEvent.click(tradeButton()); });
    const undo = () => within(document.querySelector("[data-mana-applied]") as HTMLElement).getAllByRole("button", { name: deckTuningCopy.card.undo })[0] as HTMLButtonElement;
    expect(undo().disabled).toBe(false);
    act(() => { fireEvent.click(tradeButton()); });
    expect(undo().disabled).toBe(true);
    await act(async () => { land({ ok: true, applyId: "apply-2" }); });
    expect(undo().disabled).toBe(false);
    expect(document.querySelectorAll("[data-mana-applied] li")).toHaveLength(2);
  });

  it("draws the receipt in a remounted door when an apply from the replaced mount settles", async () => {
    const read = vi.fn(async (_d: string, c: string) => withTrade(c as BalanceColor));
    let land!: (r: { ok: true; applyId: string }) => void;
    const trades = { apply: vi.fn(() => new Promise((r) => { land = r; })), undo: vi.fn() };
    const { unmount } = await openRed(read, trades as unknown as TradeActions);
    act(() => { fireEvent.click(tradeButton()); });
    unmount();
    render(<ImproveDoor deckId={A} balance={three} commander="Gishath" revision="r1" read={read} trades={trades as unknown as TradeActions} />);
    expect(document.querySelector("[data-mana-applied]")).toBeNull();
    await act(async () => { land({ ok: true, applyId: "apply-1" }); });
    expect(document.querySelector("[data-mana-applied]")?.textContent).toContain("Rockfall Vale");
  });

  it("re-reads the color in the mount on screen when the list moves after a replaced mount's trade", async () => {
    const read = vi.fn(async (_d: string, c: string) => withTrade(c as BalanceColor));
    let land!: (r: { ok: true; applyId: string }) => void;
    const trades = { apply: vi.fn(() => new Promise((r) => { land = r; })), undo: vi.fn() } as unknown as TradeActions;
    const { unmount } = await openRed(read, trades);
    act(() => { fireEvent.click(tradeButton()); });
    unmount();
    const view = render(<ImproveDoor deckId={A} balance={three} commander="Gishath" revision="r1" read={read} trades={trades} />);
    await act(async () => { land({ ok: true, applyId: "apply-1" }); });
    const reads = read.mock.calls.length;
    view.rerender(<ImproveDoor deckId={A} balance={three} commander="Gishath" revision="r2" read={read} trades={trades} />);
    await waitFor(() => expect(read).toHaveBeenCalledTimes(reads + 1));
    expect(read).toHaveBeenLastCalledWith(A, "R");
    expect(document.querySelector("[data-mana-help='R']")).not.toBeNull();
  });

  it("keeps nothing from an apply that settles after the player left the deck and came back", async () => {
    const read = vi.fn(async (_d: string, c: string) => withTrade(c as BalanceColor));
    let land!: (r: { ok: true; applyId: string }) => void;
    const trades = { apply: vi.fn(() => new Promise((r) => { land = r; })), undo: vi.fn() };
    await openRed(read, trades as unknown as TradeActions);
    act(() => { fireEvent.click(tradeButton()); });
    noteDeckRoute("/decks");
    noteDeckRoute(`/decks/${A}`);
    await act(async () => { land({ ok: true, applyId: "apply-1" }); });
    expect(document.querySelector("[data-mana-applied]")).toBeNull();
  });

  it("keeps an applied trade's Undo across a remount in the visit, and drops it when the player leaves the deck", async () => {
    const read = vi.fn(async (_d: string, c: string) => withTrade(c as BalanceColor));
    const trades = { apply: vi.fn(async () => ({ ok: true as const, applyId: "apply-1" })), undo: vi.fn() };
    const { unmount } = await openRed(read, trades);
    await act(async () => { fireEvent.click(tradeButton()); });
    unmount();
    const again = render(<ImproveDoor deckId={A} balance={three} commander="Gishath" revision="r1" read={read} trades={trades} />);
    expect(document.querySelector("[data-mana-applied]")).not.toBeNull();
    again.unmount();
    noteDeckRoute("/decks");
    noteDeckRoute(`/decks/${A}`);
    render(<ImproveDoor deckId={A} balance={three} commander="Gishath" revision="r1" read={read} trades={trades} />);
    expect(document.querySelector("[data-mana-applied]")).toBeNull();
  });
});

describe("ImproveDoor: a help read History reopened (re-review)", () => {
  const COUNT = "33333333-3333-4333-8333-333333333333";
  const tradeOf = (oracleId: string, out: string) => ({ kind: "trade" as const, out: { id: `${out}-id`, name: out, kind: "basic" as const }, staple: staple({ oracleId, name: oracleId }), changes: [] });
  const past = helpFor("R", { staples: [staple({ oracleId: "s1", name: "s1" }), staple({ oracleId: "s2", name: "s2" })], trades: [tradeOf("s1", "Forest"), tradeOf("s2", "Island")], noLonger: ["s2"] });

  it("opens on that color at once with the trades it showed: one still offered with Apply, one no longer applying", async () => {
    const live = vi.fn();
    const readReview = vi.fn(async () => past);
    const trades = { apply: vi.fn(async () => ({ ok: true as const, applyId: "apply-1" })), undo: vi.fn() };
    render(
      <ReviewRunProvider value={{ tool: "mana", runId: COUNT, color: "R" }}>
        <ImproveDoor deckId={A} balance={three} commander="Gishath" revision="r1" read={live} readReview={readReview} trades={trades} />
      </ReviewRunProvider>,
    );
    await screen.findByRole("button", { name: copy.help.tradeApply("Forest") });
    expect(readReview).toHaveBeenCalledWith(A, COUNT);
    expect(live).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: copy.help.tradeApply("Island") })).toBeNull();
    expect(document.querySelectorAll("[data-mana-trade-stale]")).toHaveLength(1);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.help.tradeApply("Forest") })); });
    expect(trades.apply).toHaveBeenCalledWith(A, "R", "s1", "Forest-id");
  });
});
