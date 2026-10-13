import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrowseCard } from "../../lib/collection/browse";
import { creditsCopy } from "../../lib/copy/credits";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { FitsRead } from "../../lib/swaps/fits";
import type { FitsReadPanel } from "../../lib/swaps/fits-read-run";
import type { StoredFitsRead } from "../../lib/swaps/fits-read-state";
import type { FitsViewMemory } from "./fits-view";
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
// The preview itself is `hover-preview.test.tsx`'s: here, which art each name hands it is the rule under test.
vi.mock("../ui/preview-button", () => ({
  PreviewButton: ({ imageUri, ...props }: { imageUri: string | null } & React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    <button data-preview={imageUri ?? ""} {...props} />,
}));
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
  images: { "o-ajani": "https://img/ajani.jpg", "o-krenko": "https://img/krenko.jpg", "o-cut": "https://img/cut.jpg" },
  commanderIds: { "d-gob": ["o-krenko"] },
  allowance, view: { pending: null, stored: null, failed: null, ...view }, ...over,
});

const onBack = vi.fn();
const onOpenCard = vi.fn();
function Harness() {
  const [memory, setMemory] = useState<FitsViewMemory>({ acts: {} });
  return <FitsView card={card} onBack={onBack} onOpenCard={onOpenCard} memory={memory} setMemory={(u) => setMemory(u)} onReading={() => {}} />;
}
const cleanupAll = () => cleanup();
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

  it("runs with breathing skeleton rows and the list live, then draws the read's rows and folds the list (P2, P3)", async () => {
    await draw(panel());
    let resolve!: (v: unknown) => void;
    readActions.pressFitsReadAction.mockReturnValue(new Promise((res) => { resolve = res; }));
    fireEvent.click(screen.getByRole("button", { name: r.pressAria(card.name) }));
    expect(screen.getByTestId("read-band-running")).toHaveTextContent(r.running(2, card.name));
    expect(screen.getAllByTestId("read-skeleton")).toHaveLength(1);
    // The skeleton breathes (Hugh, 2026-10-12).
    expect(screen.getByTestId("read-skeleton")).toHaveClass("anim-skeleton");
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
    fireEvent.click(within(within(row).getByTestId("read-row-sentence")).getByRole("button", { name: "Krenko, Mob Boss" }));
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

  it("one write at a time across the read's rows and the folded list, every action off while it runs", async () => {
    await draw(panel({}, { stored: stored() }));
    let resolve!: (v: unknown) => void;
    actions.swapFromReadAction.mockReturnValue(new Promise((res) => { resolve = res; }));
    const row = screen.getByTestId("read-row");
    fireEvent.click(within(row).getByRole("button", { name: r.swapInAria(card.name, "Goblins", "Goblin Instigator") }));
    fireEvent.click(screen.getByTestId("fits-fold"));
    for (const b of within(screen.getAllByTestId("fits-row")[1]).getAllByRole("button")) {
      if (b.textContent) fireEvent.click(b);
    }
    expect(actions.addFromFits).not.toHaveBeenCalled();
    for (const b of within(screen.getAllByTestId("fits-row")[1]).getAllByRole("button")) if (b.textContent) expect(b).toBeDisabled();
    for (const b of within(row).getAllByRole("button").filter((b) => b.hasAttribute("aria-pressed"))) expect(b).toBeDisabled();
    await act(async () => resolve({ ok: true, swapId: "s1", addWasFree: true, cutLeft: 0 }));
    await settle();
    const swapped = () => within(row).getByRole("button", { name: r.swappedAria(card.name, "Goblins", "Goblin Instigator") });
    expect(swapped()).toBeEnabled();
    // The folded list's Add in flight holds the selected Swap in too, and undoes nothing under it.
    let added!: (v: unknown) => void;
    actions.addFromFits.mockReturnValue(new Promise((res) => { added = res; }));
    const other = screen.getAllByTestId("fits-row")[1];
    fireEvent.click(within(other).getAllByRole("button").find((b) => b.textContent && !b.hasAttribute("disabled"))!);
    expect(swapped()).toBeDisabled();
    fireEvent.click(swapped());
    expect(actions.undoReadSwapAction).not.toHaveBeenCalled();
    await act(async () => added({ ok: true }));
    await settle();
    expect(swapped()).toBeEnabled();
  });

  it("a re-read that fails after a write leaves no count: the copies line goes and the row's actions wait on Try again", async () => {
    await draw(panel({}, { stored: stored() }));
    actions.swapFromReadAction.mockResolvedValue({ ok: true, swapId: "s1", addWasFree: true, cutLeft: 0 });
    actions.loadFitsAction.mockRejectedValue(new Error("down"));
    const row = screen.getByTestId("read-row");
    fireEvent.click(within(row).getByRole("button", { name: r.swapInAria(card.name, "Goblins", "Goblin Instigator") }));
    await settle();
    expect(screen.queryByTestId("fits-copies")).toBeNull();
    for (const b of within(row).getAllByRole("button").filter((b) => b.hasAttribute("aria-pressed"))) expect(b).toBeDisabled();
    // Try again in flight still has no count: the row's actions wait for it.
    let again!: (v: unknown) => void;
    actions.loadFitsAction.mockReturnValue(new Promise((res) => { again = res; }));
    fireEvent.click(screen.getByRole("button", { name: swapToolsCopy.sheet.retry }));
    for (const b of within(row).getAllByRole("button").filter((b) => b.hasAttribute("aria-pressed"))) expect(b).toBeDisabled();
    await act(async () => again(list()));
    await settle();
    expect(screen.getByTestId("fits-copies")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: r.swappedAria(card.name, "Goblins", "Goblin Instigator") })).toBeEnabled();
  });

  it("what the reader did on a read's rows belongs to that read: a newer read starts with none of it", async () => {
    const memory: FitsViewMemory = { acts: { "r1:d-gob": { kind: "swapped", swapId: "s1" } } };
    actions.loadFitsAction.mockResolvedValue(list());
    const view = (readId: string) => {
      readActions.readFitsReadAction.mockResolvedValue(panel({}, { stored: stored({ readId }) }));
      return <FitsView key={readId} card={card} onBack={onBack} onOpenCard={onOpenCard} memory={memory} setMemory={() => {}} onReading={() => {}} />;
    };
    const { rerender } = render(view("r1"));
    await settle();
    expect(within(screen.getByTestId("read-row")).getByRole("button", { name: r.swappedAria(card.name, "Goblins", "Goblin Instigator") })).toHaveAttribute("aria-pressed", "true");
    rerender(view("r2"));
    await settle();
    expect(within(screen.getByTestId("read-row")).getByRole("button", { name: r.swapInAria(card.name, "Goblins", "Goblin Instigator") })).toHaveAttribute("aria-pressed", "false");
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

  it("a refused Add only says the add was refused, never a swap (P3d)", async () => {
    await draw(panel({}, { stored: stored() }));
    actions.addFromFits.mockResolvedValue({ ok: false, message: "no" });
    const row = screen.getByTestId("read-row");
    fireEvent.click(within(row).getByRole("button", { name: r.addOnlyAria(card.name, "Goblins") }));
    await settle();
    expect(row).toHaveTextContent(copy.addRefused);
    expect(row).not.toHaveTextContent(r.swapRefused);
  });

  it("a deck the free list shows holding the card leaves the fold, and its read row's actions go off", async () => {
    await draw(panel({}, { stored: stored() }), list({ holds: [{ id: "d-gob", name: "Goblins", quantity: 1, commanders: ["Krenko, Mob Boss"] }] }));
    const row = screen.getByTestId("read-row");
    expect(within(row).getByRole("button", { name: r.addOnlyAria(card.name, "Goblins") })).toBeDisabled();
    fireEvent.click(screen.getByTestId("fits-fold"));
    expect(screen.getAllByTestId("fits-row").map((x) => x.querySelector("a")?.textContent)).toEqual(["Kratos"]);
  });

  it("a current read still reopens once every candidate has taken the card, its rows settled", async () => {
    await draw(panel({ candidates: 0 }, { stored: stored({ resolved: ["d-gob"] }) }), list({ fits: [], holds: [{ id: "d-gob", name: "Goblins", quantity: 1, commanders: ["Krenko, Mob Boss"] }] }));
    const row = screen.getByTestId("read-row");
    expect(row).toHaveTextContent("Goblins");
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

  it("a read gone out of date is marked so, never current: the changed row dims with its actions off (P10)", async () => {
    await draw(panel({}, { stored: stored({ current: false, changed: [{ deckId: "d-gob", reason: "deck" }] }) }));
    const note = screen.getByTestId("read-stale");
    expect(note).toHaveTextContent(r.staleOne("Goblins", "Oct 12, 8:00 PM").slice(0, 30));
    expect(within(note).getByRole("button", { name: `${r.readAgain}. Uses 1 credit.` })).toBeEnabled();
    expect(note).toHaveTextContent(r.again(creditsCopy.standing(4, 5, null)));
    expect(screen.queryByTestId("read-band-offer")).toBeNull();
    expect(screen.getByText(/· out of date$/)).toBeInTheDocument();
    const row = screen.getByTestId("read-row");
    expect(within(row).getByTestId("read-row-changed")).toHaveTextContent(r.changedTag);
    expect(row).toHaveTextContent(r.cutNoteChanged);
    expect(within(row).getByRole("button", { name: r.swapInAria(card.name, "Goblins", "Goblin Instigator") })).toBeDisabled();
    // Read again presses the read.
    readActions.pressFitsReadAction.mockResolvedValue({ ok: true, panel: panel({}, { stored: stored({ readId: "r2" }) }) });
    fireEvent.click(within(note).getByRole("button", { name: `${r.readAgain}. Uses 1 credit.` }));
    await settle();
    expect(readActions.pressFitsReadAction).toHaveBeenCalledWith("o-ajani");
    expect(screen.queryByTestId("read-stale")).toBeNull();
  });

  it("paused, Read again is off and named alone, never as out of credits", async () => {
    const paused = { ...allowance, paused: { until: new Date("2026-11-01T00:00:00Z") } } as unknown as FitsReadPanel["allowance"];
    await draw(panel({ allowance: paused }, { stored: stored({ current: false, changed: [{ deckId: "d-gob", reason: "deck" }] }) }));
    const press = within(screen.getByTestId("read-stale")).getByRole("button", { name: r.readAgain });
    expect(press).toBeDisabled();
  });

  it("a new overview tags the row and drops its source note (P3g); several or a set change say so (P10a)", async () => {
    const at = new Date(stored().at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    // An older overview would draw a source note; a new one since the read drops it for the tag.
    const pick = { ...stored().picks[0], planSource: "older" as const };
    await draw(panel({}, { stored: stored({ current: false, picks: [pick], changed: [{ deckId: "d-gob", reason: "overview" }] }) }));
    expect(screen.getByTestId("read-stale")).toHaveTextContent(r.staleOverview("Goblins", at));
    expect(screen.getByTestId("read-row-changed")).toHaveTextContent(r.changedTagOverview);
    expect(screen.queryByTestId("read-row-source-note")).toBeNull();
    cleanupAll();
    // Two decks changed: the note counts them rather than naming the first.
    const two = [stored().picks[0], { ...stored().picks[0], deckId: "d-kra" }];
    await draw(panel({}, { stored: stored({ current: false, picks: two, changed: [{ deckId: "d-gob", reason: "deck" }, { deckId: "d-kra", reason: "deck" }] }) }));
    expect(screen.getByTestId("read-stale")).toHaveTextContent(r.staleMany(2, at));
    cleanupAll();
    // A set change wins over a deck's own, even when one moved in the same span: no deck named, no row tagged.
    await draw(panel({}, { stored: stored({ current: false, setChanged: true, changed: [{ deckId: "d-gob", reason: "deck" }] }) }));
    expect(screen.getByTestId("read-stale")).toHaveTextContent(r.staleSet(at));
    expect(screen.queryByTestId("read-row-changed")).toBeNull();
  });

  it("a deck no longer a candidate drops from the read (P10b)", async () => {
    await draw(panel({}, { stored: stored({ current: false, setChanged: true }) }), list({ fits: [list().fits[1]] }));
    expect(screen.queryByTestId("read-row")).toBeNull();
  });

  it("a row whose own Swap in moved its deck into the holders stays, swapped (P10b keeps what took the card)", async () => {
    await draw(panel({}, { stored: stored() }));
    actions.swapFromReadAction.mockResolvedValue({ ok: true, swapId: "s1", addWasFree: true, cutLeft: 0 });
    actions.loadFitsAction.mockResolvedValue(list({
      free: 0, fits: [list().fits[1]], holds: [{ id: "d-gob", name: "Goblins", quantity: 1, commanders: ["Krenko, Mob Boss"] }],
    }));
    const row = screen.getByTestId("read-row");
    fireEvent.click(within(row).getByRole("button", { name: r.swapInAria(card.name, "Goblins", "Goblin Instigator") }));
    await settle();
    expect(screen.getByTestId("read-row")).toBeInTheDocument();
    expect(within(screen.getByTestId("read-row")).getByRole("button", { name: r.swappedAria(card.name, "Goblins", "Goblin Instigator") })).toBeEnabled();
  });

  it("a row read from an older overview, or none, says so and points at the deck page (P3f)", async () => {
    const pick = stored().picks[0];
    await draw(panel({}, { stored: stored({ picks: [{ ...pick, planSource: "none" }] }) }));
    const note = screen.getByTestId("read-row-source-note");
    expect(note).toHaveTextContent(r.srcNoteNone("Krenko, Mob Boss"));
    expect(within(note).getByRole("link", { name: r.srcLinkNone })).toHaveAttribute("href", "/decks/d-gob?tab=analysis");
  });

  it("a kept no fit whose decks changed fades under a note that offers the read again (P6c)", async () => {
    await draw(panel({}, { stored: stored({ outcome: "noFit", picks: [], refunded: true, current: false, changed: [{ deckId: "d-kra", reason: "deck" }] }) }));
    const note = screen.getByTestId("read-stale");
    expect(note).toHaveTextContent(/Kratos has changed since this read/);
    expect(note).toHaveTextContent(creditsCopy.first(4, 5, null));
    expect(screen.getByTestId("read-band-nofit").parentElement).toHaveClass("opacity-[0.72]");
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

  it("too many decks for one read: refused before any credit, with no Try again, the list open", async () => {
    await draw(panel());
    readActions.pressFitsReadAction.mockResolvedValue({ ok: false, reason: "tooBig" });
    fireEvent.click(screen.getByRole("button", { name: r.pressAria(card.name) }));
    await settle();
    expect(screen.queryByTestId("read-band-failed")).toBeNull();
    const band = screen.getByTestId("read-band-refused");
    expect(band).toHaveTextContent(r.tooBigHead);
    expect(band).toHaveTextContent(r.tooBigBody);
    expect(within(band).queryByRole("button")).toBeNull();
    expect(screen.getAllByTestId("fits-row")).toHaveLength(2);
    // An add changes the decks the read would take, so the offer comes back for them.
    actions.addFromFits.mockResolvedValue({ ok: true });
    actions.loadFitsAction.mockResolvedValue(list({ fits: [list().fits[1]], holds: [{ id: "d-gob", name: "Goblins", quantity: 1, commanders: ["Krenko, Mob Boss"] }] }));
    fireEvent.click(within(screen.getAllByTestId("fits-row")[0]).getAllByRole("button").find((b) => b.textContent)!);
    await settle();
    expect(screen.queryByTestId("read-band-refused")).toBeNull();
    expect(screen.getByTestId("read-band-offer")).toBeInTheDocument();
  });

  it("the offer counts the decks left after a free-list add, and a run keeps the count it started with", async () => {
    await draw(panel());
    actions.addFromFits.mockResolvedValue({ ok: true });
    actions.loadFitsAction.mockResolvedValue(list({ fits: [list().fits[1]], holds: [{ id: "d-gob", name: "Goblins", quantity: 1, commanders: ["Krenko, Mob Boss"] }] }));
    fireEvent.click(within(screen.getAllByTestId("fits-row")[0]).getAllByRole("button").find((b) => b.textContent)!);
    await settle();
    expect(screen.getByTestId("read-band-offer")).toHaveTextContent(r.offerLeadOne("Kratos", card.name));
  });

  it("a run keeps the count it started with while the free list moves under it", async () => {
    await draw(panel());
    let resolve!: (v: unknown) => void;
    readActions.pressFitsReadAction.mockReturnValue(new Promise((res) => { resolve = res; }));
    fireEvent.click(screen.getByRole("button", { name: r.pressAria(card.name) }));
    actions.addFromFits.mockResolvedValue({ ok: true });
    actions.loadFitsAction.mockResolvedValue(list({ fits: [list().fits[1]], holds: [{ id: "d-gob", name: "Goblins", quantity: 1, commanders: ["Krenko, Mob Boss"] }] }));
    fireEvent.click(within(screen.getAllByTestId("fits-row")[0]).getAllByRole("button").find((b) => b.textContent)!);
    await settle();
    expect(actions.addFromFits).toHaveBeenCalled();
    expect(screen.getByTestId("read-band-running")).toHaveTextContent(r.running(2, card.name));
    await act(async () => resolve({ ok: true, panel: panel({}, { stored: stored() }) }));
    await settle();
  });

  it("only the newest read of the list lands: a slow one asked before a write never replaces it", async () => {
    await draw(panel());
    let pressed!: (v: unknown) => void;
    readActions.pressFitsReadAction.mockReturnValue(new Promise((res) => { pressed = res; }));
    fireEvent.click(screen.getByRole("button", { name: r.pressAria(card.name) }));
    // The read settles and asks after the list; that answer is slow, and still says one copy is free.
    let slow!: (v: unknown) => void;
    actions.loadFitsAction.mockReturnValueOnce(new Promise((res) => { slow = res; }));
    await act(async () => pressed({ ok: true, panel: panel({}, { stored: stored() }) }));
    await settle();
    // A swap lands and its own re-read says the copy is spent.
    actions.swapFromReadAction.mockResolvedValue({ ok: true, swapId: "s1", addWasFree: true, cutLeft: 0 });
    actions.loadFitsAction.mockResolvedValue(list({ free: 0 }));
    fireEvent.click(within(screen.getByTestId("read-row")).getByRole("button", { name: r.swapInAria(card.name, "Goblins", "Goblin Instigator") }));
    await settle();
    expect(screen.getByTestId("fits-copies")).toHaveTextContent(copy.copies(1, 0));
    await act(async () => slow(list()));
    await settle();
    expect(screen.getByTestId("fits-copies")).toHaveTextContent(copy.copies(1, 0));
  });

  it("the free list is the list as last read: a deck newly able to take the card joins, one that can't leaves", async () => {
    await draw(panel());
    actions.addFromFits.mockResolvedValue({ ok: true });
    const atraxa = { id: "d-atr", name: "Atraxa", commanders: ["Atraxa, Praetors' Voice"], need: null, reason: null };
    // The add's re-read: Kratos no longer fits, Atraxa (the card taken out elsewhere) now does.
    actions.loadFitsAction.mockResolvedValue(list({ fits: [atraxa], holds: [{ id: "d-gob", name: "Goblins", quantity: 1, commanders: ["Krenko, Mob Boss"] }] }));
    fireEvent.click(within(screen.getAllByTestId("fits-row")[0]).getAllByRole("button").find((b) => b.textContent)!);
    await settle();
    const rows = screen.getAllByTestId("fits-row").map((r) => r.textContent ?? "");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toContain("Goblins");
    expect(rows[1]).toContain("Atraxa");
    expect(rows.some((t) => t.includes("Kratos"))).toBe(false);
  });

  it("an add to the last deck that could take the card takes the offer away (P1b)", async () => {
    await draw(panel({ candidates: 1 }), list({ fits: [list().fits[0]] }));
    expect(screen.getByTestId("read-band-offer")).toBeInTheDocument();
    actions.addFromFits.mockResolvedValue({ ok: true });
    actions.loadFitsAction.mockResolvedValue(list({ free: 0, fits: [], holds: [{ id: "d-gob", name: "Goblins", quantity: 1, commanders: ["Krenko, Mob Boss"] }] }));
    fireEvent.click(within(screen.getByTestId("fits-row")).getAllByRole("button").find((b) => b.textContent)!);
    await settle();
    expect(screen.queryByTestId("read-band-offer")).toBeNull();
  });

  it("draws no band when every deck holds the card (P1b)", async () => {
    await draw(panel({ candidates: 0 }), list({ fits: [], holds: [{ id: "d-a", name: "Atraxa", quantity: 1, commanders: [] }] }));
    expect(screen.queryByTestId("read-band-offer")).toBeNull();
    expect(screen.getByText(copy.allHold(card.name))).toBeInTheDocument();
  });

  describe("across a round trip through a card opened over the view", () => {
    function Trip() {
      const [memory, setMemory] = useState<FitsViewMemory>({ acts: {} });
      const [shown, setShown] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setShown((v) => !v)}>trip</button>
          {shown ? <FitsView card={card} onBack={onBack} onOpenCard={onOpenCard} memory={memory} setMemory={(u) => setMemory(u)} onReading={() => {}} /> : null}
        </>
      );
    }
    const trip = async () => {
      fireEvent.click(screen.getByRole("button", { name: "trip" }));
      fireEvent.click(screen.getByRole("button", { name: "trip" }));
      await settle();
    };
    async function drawTrip(p: FitsReadPanel, l: FitsRead = list()) {
      actions.loadFitsAction.mockResolvedValue(l);
      readActions.readFitsReadAction.mockResolvedValue(p);
      render(<Trip />);
      await settle();
    }

    it("a write in flight still holds every action, and the list is read again once it lands", async () => {
      await drawTrip(panel({}, { stored: stored() }));
      let resolve!: (v: unknown) => void;
      actions.swapFromReadAction.mockReturnValue(new Promise((res) => { resolve = res; }));
      fireEvent.click(within(screen.getByTestId("read-row")).getByRole("button", { name: r.swapInAria(card.name, "Goblins", "Goblin Instigator") }));
      await trip();
      for (const b of within(screen.getByTestId("read-row")).getAllByRole("button").filter((b) => b.hasAttribute("aria-pressed"))) expect(b).toBeDisabled();
      // The write spends the free copy: the view drawn now has to read that itself.
      actions.loadFitsAction.mockResolvedValue(list({ free: 0 }));
      await act(async () => resolve({ ok: true, swapId: "s1", addWasFree: true, cutLeft: 0 }));
      await settle();
      expect(screen.getByTestId("fits-copies")).toHaveTextContent(copy.copies(1, 0));
      expect(within(screen.getByTestId("read-row")).getByRole("button", { name: r.swappedAria(card.name, "Goblins", "Goblin Instigator") })).toBeEnabled();
    });

    it("a too-many-decks refusal still stands for the same decks", async () => {
      await drawTrip(panel());
      readActions.pressFitsReadAction.mockResolvedValue({ ok: false, reason: "tooBig" });
      fireEvent.click(screen.getByRole("button", { name: r.pressAria(card.name) }));
      await settle();
      await trip();
      expect(screen.getByTestId("read-band-refused")).toBeInTheDocument();
    });

    it("a running read keeps the count it was pressed with", async () => {
      await drawTrip(panel());
      readActions.pressFitsReadAction.mockResolvedValue({ ok: true, panel: panel({}, { pending: { readId: "r9", startedAt: new Date().toISOString() } }) });
      fireEvent.click(screen.getByRole("button", { name: r.pressAria(card.name) }));
      await settle();
      // Back in, the free list now names one deck: the run still reads two.
      actions.loadFitsAction.mockResolvedValue(list({ fits: [list().fits[1]], holds: [{ id: "d-gob", name: "Goblins", quantity: 1, commanders: ["Krenko, Mob Boss"] }] }));
      readActions.readFitsReadAction.mockResolvedValue(panel({}, { pending: { readId: "r9", startedAt: new Date().toISOString() } }));
      await trip();
      expect(screen.getByTestId("read-band-running")).toHaveTextContent(r.running(2, card.name));
    });
  });

  describe("Hugh's first walk (2026-10-12)", () => {
    it("draws nothing in the body until the list and the panel have both answered, so the offer never pops in", async () => {
      let listed!: (v: unknown) => void;
      actions.loadFitsAction.mockReturnValue(new Promise((res) => { listed = res; }));
      readActions.readFitsReadAction.mockResolvedValue(panel());
      render(<Harness />);
      await settle();
      expect(screen.queryByTestId("read-band-offer")).toBeNull();
      expect(screen.queryAllByTestId("fits-row")).toHaveLength(0);
      await act(async () => listed(list()));
      await settle();
      expect(screen.getByTestId("read-band-offer")).toBeInTheDocument();
      expect(screen.getAllByTestId("fits-row")).toHaveLength(2);
    });

    it("every card a row names previews and opens, except the card the read is for, which only opens", async () => {
      await draw(panel({}, { stored: stored() }));
      const row = screen.getByTestId("read-row");
      const sentence = within(row).getByTestId("read-row-sentence");
      const krenko = within(sentence).getByRole("button", { name: "Krenko, Mob Boss" });
      const ajani = within(sentence).getByRole("button", { name: "Ajani Unrelenting" });
      expect(krenko).toHaveAttribute("data-preview", "https://img/krenko.jpg");
      expect(ajani).toHaveAttribute("data-preview", "");
      fireEvent.click(ajani);
      expect(onOpenCard).toHaveBeenCalledWith("o-ajani");
      // The commander line names its commander as a card, and the cut is one too.
      fireEvent.click(within(within(row).getByTestId("read-row-source")).getByRole("button", { name: "Krenko, Mob Boss" }));
      expect(onOpenCard).toHaveBeenCalledWith("o-krenko");
      const cut = within(row).getByRole("button", { name: "Goblin Instigator" });
      expect(cut).toHaveAttribute("data-preview", "https://img/cut.jpg");
      expect(within(within(row).getByTestId("read-row-source")).getByRole("button", { name: "Krenko, Mob Boss" })).toHaveAttribute("data-preview", "https://img/krenko.jpg");
      fireEvent.click(cut);
      expect(onOpenCard).toHaveBeenCalledWith("o-cut");
    });

    it("a return draws what was there at once, with no entrance, and keeps it while the reads come again", async () => {
      function Trip() {
        const [memory, setMemory] = useState<FitsViewMemory>({ acts: {} });
        const [shown, setShown] = useState(true);
        return (
          <>
            <button type="button" onClick={() => setShown((v) => !v)}>trip</button>
            {shown ? <FitsView card={card} onBack={onBack} onOpenCard={onOpenCard} memory={memory} setMemory={(u) => setMemory(u)} onReading={() => {}} /> : null}
          </>
        );
      }
      actions.loadFitsAction.mockResolvedValue(list());
      readActions.readFitsReadAction.mockResolvedValue(panel({}, { stored: stored() }));
      render(<Trip />);
      await settle();
      expect(screen.getByTestId("fits-view").className).toContain("anim-view-in");
      // Back in, both reads hang: the rows and the list are there anyway, from the visit's own snapshot.
      actions.loadFitsAction.mockReturnValue(new Promise(() => {}));
      readActions.readFitsReadAction.mockReturnValue(new Promise(() => {}));
      fireEvent.click(screen.getByRole("button", { name: "trip" }));
      fireEvent.click(screen.getByRole("button", { name: "trip" }));
      expect(screen.getByTestId("fits-view").className).not.toContain("anim-view-in");
      expect(screen.getByTestId("read-row")).toBeInTheDocument();
      expect(screen.getByTestId("fits-fold")).toBeInTheDocument();
    });
  });
});
