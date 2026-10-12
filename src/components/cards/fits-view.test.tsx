import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrowseCard } from "../../lib/collection/browse";
import { creditsCopy } from "../../lib/copy/credits";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { FitsRead } from "../../lib/swaps/fits";
import type { FitsReadPanel } from "../../lib/swaps/fits-read-run";
import type { StoredFitsRead } from "../../lib/swaps/fits-read-state";
import { creditLine } from "../ui/credit-line-matcher";

const actions = vi.hoisted(() => ({
  loadFitsAction: vi.fn(),
  addFromFits: vi.fn(),
  swapFromReadAction: vi.fn(),
  undoReadSwapAction: vi.fn(),
  undoReadAddAction: vi.fn(),
}));
const readActions = vi.hoisted(() => ({ readFitsReadAction: vi.fn(), pressFitsReadAction: vi.fn() }));
vi.mock("../../lib/swaps/actions", () => actions);
vi.mock("../../lib/swaps/fits-read-actions", () => readActions);
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
  useLinkStatus: () => ({ pending: false }),
}));

const { FitsView } = await import("./fits-view");

const copy = swapToolsCopy.fits;
const r = copy.read;
const card = {
  oracleId: "o-ajani", name: "Ajani Unrelenting", printedName: null, colorIdentity: ["W"], quantity: 1,
  imageUri: null, availability: { owned: 1, free: 1 },
} as unknown as BrowseCard;

const list = (over: Partial<FitsRead> = {}): FitsRead => ({
  card: { oracleId: "o-ajani", name: "Ajani Unrelenting", colorIdentity: ["W"], commanderLegal: true, role: "other" },
  staple: false,
  owned: 1,
  free: 1,
  fits: [
    { id: "d-gob", name: "Goblins", commanders: ["Krenko, Mob Boss"], need: null, reason: null },
    { id: "d-kra", name: "Kratos", commanders: ["Kratos, God of War"], need: null, reason: null },
  ],
  holds: [],
  excluded: [],
  ...over,
});

const allowance = { used: 1, limit: 5, nextAt: null, reopensAt: null } as unknown as FitsReadPanel["allowance"];
const stored = (over: Partial<StoredFitsRead> = {}): StoredFitsRead => ({
  readId: "r1", outcome: "picks", refunded: false, at: "2026-10-12T20:00:00Z", candidates: 2,
  changed: [], setChanged: false, resolved: [], current: true,
  picks: [{
    deckId: "d-gob", planSource: "v2", cut: "o-cut",
    parts: [{ card: "o-ajani" }, { text: " makes a body for " }, { card: "o-krenko" }, { text: " to double." }],
    cites: [],
  }],
  ...over,
});
const panel = (over: Partial<FitsReadPanel> = {}, view: Partial<FitsReadPanel["view"]> = {}): FitsReadPanel => ({
  fits: list(), candidates: 2, planSources: { "d-gob": "v2", "d-kra": "none" },
  names: { "o-ajani": "Ajani Unrelenting", "o-krenko": "Krenko, Mob Boss", "o-cut": "Goblin Instigator" },
  allowance, view: { pending: null, stored: null, failed: null, ...view }, ...over,
});

const onBack = vi.fn();
const onOpenCard = vi.fn();
function Harness() {
  const [memory, setMemory] = useState({});
  return <FitsView card={card} onBack={onBack} onOpenCard={onOpenCard} memory={memory} setMemory={(u) => setMemory(u)} onReading={() => {}} />;
}
const settle = () => act(async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); });
async function draw(p: FitsReadPanel, l: FitsRead = list()) {
  actions.loadFitsAction.mockResolvedValue(l);
  readActions.readFitsReadAction.mockResolvedValue(p);
  render(<Harness />);
  await settle();
}

beforeEach(() => {
  for (const f of [...Object.values(actions), ...Object.values(readActions)]) f.mockReset();
  onBack.mockReset();
  onOpenCard.mockReset();
});

describe("FitsView (Find a deck read, R2)", () => {
  it("heads with the title and the way back, focuses the heading, and offers the read first", async () => {
    await draw(panel());
    const heading = screen.getByRole("heading", { name: copy.pickerTitle });
    expect(document.activeElement).toBe(heading);
    fireEvent.click(screen.getByRole("button", { name: r.backAria(card.name) }));
    expect(onBack).toHaveBeenCalled();
    const band = screen.getByTestId("read-band-offer");
    expect(band).toHaveTextContent(r.offerLead(2, card.name));
    expect(within(band).getByRole("button", { name: r.pressAria(card.name) })).toBeEnabled();
    expect(within(band).getByText(creditsCopy.standing(4, 5, null))).toBeInTheDocument();
    // The free list stays open and unchanged beneath the band.
    expect(screen.getAllByTestId("fits-row")).toHaveLength(2);
    expect(screen.queryByTestId("fits-fold")).toBeNull();
  });

  it("with no credit left, the press is off and the line links to what uses credits (P8)", async () => {
    await draw(panel({ allowance: { ...allowance, used: 5 } as FitsReadPanel["allowance"] }));
    expect(screen.getByRole("button", { name: r.pressAriaSpent })).toBeDisabled();
    expect(screen.getByText(creditLine(creditsCopy.spent(5, null)))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: creditsCopy.link })).toHaveAttribute("href", "/about#credits");
  });

  it("runs with still rows and the list live, then draws the read's rows and folds the list (P2, P3)", async () => {
    await draw(panel());
    let resolve!: (v: unknown) => void;
    readActions.pressFitsReadAction.mockReturnValue(new Promise((res) => { resolve = res; }));
    fireEvent.click(screen.getByRole("button", { name: r.pressAria(card.name) }));
    expect(screen.getByTestId("read-band-running")).toHaveTextContent(r.running(2, card.name));
    expect(screen.getAllByTestId("read-skeleton")).toHaveLength(1);
    expect(screen.getAllByTestId("fits-row")).toHaveLength(2);
    await act(async () => resolve({ ok: true, panel: panel({}, { stored: stored() }) }));
    await settle();
    const row = screen.getByTestId("read-row");
    expect(within(row).getByTestId("read-row-source")).toHaveTextContent("Krenko, Mob Boss · from its overview");
    expect(within(row).getByTestId("read-row-sentence")).toHaveTextContent("Ajani Unrelenting makes a body for Krenko, Mob Boss to double.");
    expect(row).toHaveTextContent(r.cutNote);
    expect(screen.getByText(r.resultSubNow(1, 2))).toBeInTheDocument();
    // The list folds to one row, with its count, and opens on a press.
    expect(screen.queryAllByTestId("fits-row")).toHaveLength(0);
    fireEvent.click(screen.getByTestId("fits-fold"));
    expect(screen.getAllByTestId("fits-row")).toHaveLength(2);
    // A card the sentence names opens over the dialog, with the way back to the view.
    fireEvent.click(within(row).getByRole("button", { name: "Krenko, Mob Boss" }));
    expect(onOpenCard).toHaveBeenCalledWith("o-krenko");
  });

  it("Swap in takes the read's cut, turns Add only off, and pressed again undoes it (P3a, P3c)", async () => {
    await draw(panel({}, { stored: stored() }));
    actions.swapFromReadAction.mockResolvedValue({ ok: true, swapId: "s1", addWasFree: true, cutLeft: 0 });
    actions.undoReadSwapAction.mockResolvedValue({ ok: true });
    const row = screen.getByTestId("read-row");
    fireEvent.click(within(row).getByRole("button", { name: r.swapInAria(card.name, "Goblins", "Goblin Instigator") }));
    await settle();
    expect(actions.swapFromReadAction).toHaveBeenCalledWith("d-gob", "o-cut", "o-ajani");
    const swapped = within(row).getByRole("button", { name: r.swappedAria(card.name, "Goblins", "Goblin Instigator") });
    expect(swapped).toHaveAttribute("aria-pressed", "true");
    expect(swapped).toHaveTextContent(r.swapped);
    expect(within(row).getByRole("button", { name: r.addOnlyAria(card.name, "Goblins") })).toBeDisabled();
    expect(row).toHaveTextContent(r.cutNoteSwapped);
    fireEvent.click(swapped);
    await settle();
    expect(actions.undoReadSwapAction).toHaveBeenCalledWith("s1");
    expect(within(row).getByRole("button", { name: r.swapInAria(card.name, "Goblins", "Goblin Instigator") })).toHaveAttribute("aria-pressed", "false");
  });

  it("Add only adds with nothing cut, says the deck is at 100, and pressed again takes it out (P3h, P3i)", async () => {
    await draw(panel({}, { stored: stored() }));
    actions.addFromFits.mockResolvedValue({ ok: true });
    actions.undoReadAddAction.mockResolvedValue({ ok: true });
    const row = screen.getByTestId("read-row");
    fireEvent.click(within(row).getByRole("button", { name: r.addOnlyAria(card.name, "Goblins") }));
    await settle();
    expect(actions.addFromFits).toHaveBeenCalledWith("d-gob", "o-ajani");
    expect(row).toHaveTextContent(r.addedNote("Goblins"));
    expect(row).toHaveTextContent(r.cutNoteAdded);
    expect(within(row).getByRole("button", { name: r.swapInAria(card.name, "Goblins", "Goblin Instigator") })).toBeDisabled();
    fireEvent.click(within(row).getByRole("button", { name: r.addedAria(card.name, "Goblins") }));
    await settle();
    expect(actions.undoReadAddAction).toHaveBeenCalledWith("d-gob", "o-ajani");
    expect(row).not.toHaveTextContent(r.addedNote("Goblins"));
  });

  it("a deck that took the card since the read is resolved, not changed: its row stays, both actions off (F2)", async () => {
    await draw(panel({}, { stored: stored({ resolved: ["d-gob"] }) }));
    const row = screen.getByTestId("read-row");
    expect(within(row).getByRole("button", { name: r.swapInAria(card.name, "Goblins", "Goblin Instigator") })).toBeDisabled();
    expect(within(row).getByRole("button", { name: r.addOnlyAria(card.name, "Goblins") })).toBeDisabled();
  });

  it("with no free copy left, both actions read to buy (P3b)", async () => {
    await draw(panel({}, { stored: stored() }), list({ free: 0 }));
    const row = screen.getByTestId("read-row");
    expect(within(row).getByText(r.swapInToBuy)).toBeInTheDocument();
    expect(within(row).getByText(r.addOnlyToBuy)).toBeInTheDocument();
  });

  it("a thin read says the credit came back (P4); a reopened current read is dated with no press (P9)", async () => {
    await draw(panel({}, { stored: stored({ refunded: true }) }));
    expect(screen.getByTestId("read-thin")).toHaveTextContent(r.thin(1));
    expect(screen.queryByTestId("read-band-offer")).toBeNull();
    expect(screen.getByText(/^read Oct 12/)).toBeInTheDocument();
  });

  it("a stored read gone out of date never draws as current: the press is offered again", async () => {
    await draw(panel({}, { stored: stored({ current: false, changed: [{ deckId: "d-gob", reason: "deck" }] }) }));
    expect(screen.getByTestId("read-band-offer")).toBeInTheDocument();
    expect(screen.queryByTestId("read-row")).toBeNull();
  });

  it("a no fit is a box with no press, the list open beneath (P6)", async () => {
    await draw(panel({}, { stored: stored({ outcome: "noFit", picks: [], refunded: true }) }));
    const box = screen.getByTestId("read-band-nofit");
    expect(box).toHaveTextContent(r.noFitHead);
    expect(box).toHaveTextContent(r.noFitBodyStored(2, card.name));
    expect(screen.queryByRole("button", { name: r.pressAria(card.name) })).toBeNull();
    expect(screen.getAllByTestId("fits-row")).toHaveLength(2);
  });

  it("a failed press draws the failed band with Try again, the list open (P7)", async () => {
    await draw(panel());
    readActions.pressFitsReadAction.mockRejectedValue(new Error("down"));
    fireEvent.click(screen.getByRole("button", { name: r.pressAria(card.name) }));
    await settle();
    const band = screen.getByTestId("read-band-failed");
    expect(band).toHaveTextContent(r.failedHead);
    expect(within(band).getByRole("button", { name: `${r.retry}. Uses 1 credit.` })).toBeEnabled();
    expect(screen.getAllByTestId("fits-row")).toHaveLength(2);
  });

  it("draws no band when every deck holds the card (P1b)", async () => {
    await draw(panel({ candidates: 0 }), list({ fits: [], holds: [{ id: "d-a", name: "Atraxa", quantity: 1, commanders: [] }] }));
    expect(screen.queryByTestId("read-band-offer")).toBeNull();
    expect(screen.getByText(copy.allHold(card.name))).toBeInTheDocument();
  });
});
