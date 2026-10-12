import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BrowseCard } from "../../lib/collection/browse";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { FitsRead } from "../../lib/swaps/fits";

const actions = vi.hoisted(() => ({
  loadFitsAction: vi.fn(),
  addFromFits: vi.fn(),
}));
vi.mock("../../lib/swaps/actions", () => actions);
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const { FitsPicker } = await import("./fits-picker");
const { CardDetailProvider, STACK_DROP_MS } = await import("./card-detail-provider");

const copy = swapToolsCopy.fits;
const card = {
  oracleId: "o-birds", name: "Birds of Paradise", printedName: null, colorIdentity: ["G"], quantity: 2,
  imageUri: null, availability: { owned: 2, free: 1 },
} as unknown as BrowseCard;

const read = (over: Partial<FitsRead> = {}): FitsRead => ({
  card: { oracleId: "o-birds", name: "Birds of Paradise", colorIdentity: ["G"], commanderLegal: true, role: "ramp" },
  staple: false,
  owned: 2,
  free: 1,
  fits: [
    { id: "d-g", name: "Gishath", commanders: ["Gishath, Sun's Avatar"], need: { role: "ramp", have: 7, target: 10 },
      reason: { kind: "combo", with: { oracleId: "o-sanity", name: "Fraying Sanity" } } },
    { id: "d-k", name: "Kinnan", commanders: ["Kinnan, Bonder Prodigy"], need: null, reason: { kind: "theme", theme: "mill", n: 9 } },
  ],
  holds: [{ id: "d-a", name: "Atraxa", quantity: 1, commanders: [] }],
  excluded: [],
  ...over,
});

function draw() {
  return render(
    <CardDetailProvider fetchCard={async () => null}>
      <FitsPicker card={card} onClose={() => {}} />
    </CardDetailProvider>,
  );
}
const settle = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

beforeEach(() => {
  actions.loadFitsAction.mockReset();
  actions.addFromFits.mockReset();
});

describe("FitsPicker", () => {
  it("draws the card's copies while loading, then the two groups by name with their facts", async () => {
    let resolve!: (r: FitsRead) => void;
    actions.loadFitsAction.mockReturnValue(new Promise((r) => { resolve = r; }));
    draw();
    expect(screen.getByRole("status")).toHaveTextContent(copy.loadingHeading);
    expect(screen.getByTestId("fits-copies")).toHaveTextContent(copy.copies(2, 1));

    await act(async () => resolve(read()));
    const rows = screen.getAllByTestId("fits-row");
    expect(rows.map((r) => r.querySelector("a")?.textContent)).toEqual(["Gishath", "Kinnan"]);
    // Addendum §1c: one line, `{reason} · this deck {need}`, and never a percentage (R2).
    expect(within(rows[0]).getByTestId("fits-reason")).toHaveTextContent(`${copy.reasonCombo} Fraying Sanity · ${copy.needLabel} ${copy.need("ramp", 7, 10)}`);
    expect(within(rows[0]).getByRole("button", { name: /Fraying Sanity/ })).toBeInTheDocument();
    expect(within(rows[1]).getByTestId("fits-reason")).toHaveTextContent(copy.reasonTheme(9, copy.themeWord.mill));
    expect(rows[1]).not.toHaveTextContent(copy.needLabel);
    for (const row of rows) expect(row.textContent).not.toMatch(/%/);
    expect(screen.getByText(copy.orderReasons)).toBeInTheDocument();
    expect(screen.getAllByTestId("fits-holds-row")[0]).toHaveTextContent(copy.holds(1));
    expect(screen.getAllByRole("button", { name: /using your free copy/ })).toHaveLength(2);
  });

  // Close-out ruling 5: the reason line breaks between segments only, the dot bound to the need.
  it("draws each reason segment unbroken, the dot travelling with the need", async () => {
    actions.loadFitsAction.mockResolvedValue(read());
    draw();
    await settle();
    const line = within(screen.getAllByTestId("fits-row")[0]).getByTestId("fits-reason");
    const need = within(line).getByTestId("fits-reason-need");
    expect(need).toHaveClass("whitespace-nowrap");
    expect(need.textContent).toMatch(/^· /);
    expect(line.firstElementChild).toHaveClass("whitespace-nowrap");
  });

  // Close-out ruling 7: a card the catalog has no art for draws the fits table's placeholder hatch.
  it("hatches the plate's thumb when the card has no art", async () => {
    actions.loadFitsAction.mockReturnValue(new Promise(() => {}));
    draw();
    const thumb = screen.getByTestId("fits-copies").closest("div")!.querySelector('span[aria-hidden="true"]')!;
    expect(thumb.getAttribute("style")).toContain("repeating-linear-gradient(135deg, var(--border) 0 3px, var(--surface-raised) 3px 6px)");
  });

  // R2: with no combo and no theme, the row shows its need alone, and with neither, no line at all.
  it("shows the need alone with no reason, and no line with neither", async () => {
    actions.loadFitsAction.mockResolvedValue(read({
      fits: [
        { id: "d-n", name: "Needy", commanders: ["Needy"], need: { role: "ramp", have: 3, target: 10 }, reason: null },
        { id: "d-z", name: "Zero", commanders: ["Zero"], need: null, reason: null },
      ],
    }));
    draw();
    await settle();
    const [needy, zero] = screen.getAllByTestId("fits-row");
    expect(within(needy).getByTestId("fits-reason").textContent).toBe(`${copy.needLabel} ${copy.need("ramp", 3, 10)}`);
    expect(within(zero).queryByTestId("fits-reason")).toBeNull();
  });

  it("names the key creature type a deck is built around", async () => {
    actions.loadFitsAction.mockResolvedValue(read({
      fits: [{ id: "d-e", name: "Elves", commanders: ["Lathril"], need: null, reason: { kind: "theme", theme: { type: "Elf" }, n: 31 } }],
    }));
    draw();
    expect(await screen.findByTestId("fits-reason")).toHaveTextContent(copy.reasonTheme(31, "Elf"));
  });

  it("names a universal staple, never a percentage, with the note once (addendum)", async () => {
    actions.loadFitsAction.mockResolvedValue(read({ staple: true }));
    draw();
    await settle();
    for (const row of screen.getAllByTestId("fits-row")) {
      expect(row).toHaveTextContent(copy.cmdrStaple);
      expect(row.textContent).not.toMatch(/%/);
    }
    expect(screen.getAllByTestId("fits-staple-note")).toHaveLength(1);
    // A staple's list stays by name, so it carries no order note.
    expect(screen.queryByText(copy.orderReasons)).toBeNull();
    expect(screen.getByTestId("fits-staple-note")).toHaveTextContent(copy.stapleNote("Birds of Paradise"));
  });

  it("uses the no-role note for a staple with no role", async () => {
    actions.loadFitsAction.mockResolvedValue(read({ staple: true, card: { ...read().card, role: "other" } }));
    draw();
    await settle();
    expect(screen.getByTestId("fits-staple-note")).toHaveTextContent(copy.stapleNoteNoRole("Birds of Paradise"));
  });

  it("offers Add to buy on every row once no copy is free (H1)", async () => {
    actions.loadFitsAction.mockResolvedValue(read({ free: 0 }));
    draw();
    await settle();
    expect(screen.getAllByRole("button", { name: /as a card to buy/ })).toHaveLength(2);
    expect(screen.getByTestId("fits-copies")).toHaveTextContent(copy.copies(2, 0));
  });

  it("stamps the added row in place, says it used the last free copy, and flips the rest to Add to buy", async () => {
    actions.loadFitsAction.mockResolvedValueOnce(read()).mockResolvedValueOnce(read({ free: 0, fits: [read().fits[1]] }));
    actions.addFromFits.mockResolvedValue({ ok: true });
    draw();
    await settle();
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /using your free copy/ })[0]); });
    await settle();
    expect(actions.addFromFits).toHaveBeenCalledWith("d-g", "o-birds");
    const [gishath, kinnan] = screen.getAllByTestId("fits-row");
    expect(gishath).toHaveTextContent(copy.added);
    expect(gishath).toHaveTextContent(copy.addedUsedLast);
    expect(gishath.querySelector('a[href="/decks/d-g"]')).not.toBeNull();
    expect(kinnan).toHaveTextContent(copy.addToBuy);
    expect(screen.getByTestId("fits-copies")).toHaveTextContent(copy.copies(2, 0));
  });

  it("claims no count when the re-read after an add fails, and Try again brings the stamp back", async () => {
    let land: (r: FitsRead) => void = () => {};
    actions.loadFitsAction.mockResolvedValueOnce(read()).mockRejectedValueOnce(new Error("down"))
      .mockReturnValueOnce(new Promise<FitsRead>((resolve) => { land = resolve; }));
    actions.addFromFits.mockResolvedValue({ ok: true });
    draw();
    await settle();
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /using your free copy/ })[0]); });
    await settle();
    // No row offers an Add against a count that is spent, and the plate draws no count at all.
    expect(screen.getByRole("alert")).toHaveTextContent(copy.failed.heading);
    expect(screen.queryAllByTestId("fits-row")).toHaveLength(0);
    expect(screen.queryByTestId("fits-copies")).toBeNull();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: swapToolsCopy.sheet.retry })); });
    // Loading again, the payload's count is still the spent one.
    expect(screen.queryByTestId("fits-copies")).toBeNull();
    await act(async () => { land(read({ free: 0, fits: [read().fits[1]] })); });
    await settle();
    const [gishath, kinnan] = screen.getAllByTestId("fits-row");
    expect(gishath).toHaveTextContent(copy.addedFree);
    expect(gishath).not.toHaveTextContent(copy.addedUsedLast);
    expect(kinnan).toHaveTextContent(copy.addToBuy);
    expect(screen.getByTestId("fits-copies")).toHaveTextContent(copy.copies(2, 0));
  });

  it("stamps nothing when the deck already held it, and moves the deck to its holders", async () => {
    const heldBy = { id: "d-g", name: "Gishath", quantity: 1, commanders: [] };
    actions.loadFitsAction.mockResolvedValueOnce(read())
      .mockResolvedValueOnce(read({ fits: [read().fits[1]], holds: [...read().holds, heldBy] }));
    actions.addFromFits.mockResolvedValue({ ok: true, held: true });
    draw();
    await settle();
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /using your free copy/ })[0]); });
    await settle();
    const rows = screen.getAllByTestId("fits-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Kinnan");
    expect(screen.queryByText(copy.added)).toBeNull();
    expect(screen.getByRole("link", { name: copy.deckLinkAria("Gishath") })).toBeInTheDocument();
  });

  it("draws no copies line before the read when the payload's availability is unknown", async () => {
    actions.loadFitsAction.mockReturnValueOnce(new Promise(() => {}));
    render(
      <CardDetailProvider fetchCard={async () => null}>
        <FitsPicker card={{ ...card, availability: null } as BrowseCard} onClose={() => {}} />
      </CardDetailProvider>,
    );
    await settle();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByTestId("fits-copies")).toBeNull();
  });

  it("keeps the button and says the deck is unchanged when an add is refused", async () => {
    actions.loadFitsAction.mockResolvedValue(read());
    actions.addFromFits.mockResolvedValue({ ok: false, message: "full" });
    draw();
    await settle();
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: /using your free copy/ })[0]); });
    const [gishath] = screen.getAllByTestId("fits-row");
    expect(gishath).toHaveTextContent(copy.addRefused);
    expect(gishath).not.toHaveTextContent(copy.added);
  });

  it("says every deck holds it, with the copies line still drawn (F15)", async () => {
    actions.loadFitsAction.mockResolvedValue(read({ fits: [] }));
    draw();
    await settle();
    expect(screen.getByText(copy.allHold("Birds of Paradise"))).toBeInTheDocument();
    expect(screen.queryAllByTestId("fits-row")).toHaveLength(0);
    expect(screen.getAllByTestId("fits-holds-row")).toHaveLength(1);
    expect(screen.getByTestId("fits-copies")).toBeInTheDocument();
  });

  it("names the card's colors when no deck can play it", async () => {
    actions.loadFitsAction.mockResolvedValue(read({ fits: [], holds: [] }));
    draw();
    await settle();
    expect(screen.getByText(copy.noneByColorsOne("Birds of Paradise", "green"))).toBeInTheDocument();
  });

  it("fails into the sheet's failed shape, and Try again reads again", async () => {
    actions.loadFitsAction.mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(read());
    draw();
    await settle();
    expect(screen.getByRole("alert")).toHaveTextContent(copy.failed.heading);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: swapToolsCopy.sheet.retry })); });
    await settle();
    expect(screen.getAllByTestId("fits-row")).toHaveLength(2);
  });
});

describe("the Fits door", () => {
  const withGate = (gate: Partial<BrowseCard>): BrowseCard => ({
    oracleId: "o-birds", name: "Birds of Paradise", typeLine: "Creature", manaCost: "{G}", cmc: 1, oracleText: null,
    keywords: [], rarity: "rare", colorIdentity: ["G"], imageUri: null, printedName: null, quantity: 2, printings: [],
    setCodes: [], primarySetCode: "", preferredPrinting: null, ...gate,
  });
  async function openCard(gate: Partial<BrowseCard>) {
    const { CardDetailTrigger } = await import("./card-detail-provider");
    render(
      <CardDetailProvider fetchCard={async () => withGate(gate)}>
        <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">open</CardDetailTrigger>
      </CardDetailProvider>,
    );
    await act(async () => { fireEvent.click(screen.getByText("open")); });
  }

  it("draws on a Commander-legal card for a reader with a deck, at both widths", async () => {
    await openCard({ commanderLegal: true, hasDecks: true });
    expect(screen.getAllByTestId("fits-door")).toHaveLength(2);
  });

  it.each([
    ["a card that is not legal", { commanderLegal: false, hasDecks: true }],
    ["a reader with no deck", { commanderLegal: true, hasDecks: false }],
    ["a payload without the gate (the swap tools off)", {}],
  ])("draws nothing for %s", async (_, gate) => {
    await openCard(gate);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryAllByTestId("fits-door")).toHaveLength(0);
  });

  it("stacks the picker over the card, which stays mounted and covered", async () => {
    actions.loadFitsAction.mockResolvedValue(read());
    await openCard({ commanderLegal: true, hasDecks: true });
    const cardNode = document.querySelector('[aria-labelledby^="card-modal-title"]');
    await act(async () => { fireEvent.click(screen.getAllByTestId("fits-door")[0]); });
    await settle();
    expect(screen.getByTestId("fits-picker")).toBeInTheDocument();
    // The same node, not a remount under a new key, and covered.
    expect(cardNode?.isConnected).toBe(true);
    expect(document.querySelector('[aria-labelledby^="card-modal-title"]')).toBe(cardNode);
    expect(cardNode?.closest("[inert]")).not.toBeNull();
  });
});

// E1 (About launch entries): the plate, the rows and the holds were drawn inline by the picker and
// are now `FitsPlate`, `FitsRows` and `FitsHolds`, which the About figure mounts on their own. The
// snapshots were written by the picker BEFORE that extraction, so each state below proves the picker
// still draws exactly what it drew: at rest, with an add in flight, after a refusal, and after an add.
describe("the picker's markup across the E1 extraction", () => {
  const body = () => screen.getByTestId("fits-picker").innerHTML;
  const firstAdd = () => screen.getAllByRole("button", { name: /using your free copy/ })[0];

  it("is unchanged at rest, with its rows and holds loaded", async () => {
    actions.loadFitsAction.mockResolvedValue(read());
    draw();
    await settle();
    expect(body()).toMatchSnapshot();
  });

  it("is unchanged with an add in flight", async () => {
    actions.loadFitsAction.mockResolvedValue(read());
    actions.addFromFits.mockReturnValue(new Promise(() => {}));
    draw();
    await settle();
    await act(async () => { fireEvent.click(firstAdd()); });
    expect(body()).toMatchSnapshot();
  });

  it("is unchanged after a refused add", async () => {
    actions.loadFitsAction.mockResolvedValue(read());
    actions.addFromFits.mockResolvedValue({ ok: false, message: "full" });
    draw();
    await settle();
    await act(async () => { fireEvent.click(firstAdd()); });
    await settle();
    expect(body()).toMatchSnapshot();
  });

  it("is unchanged after an add, with its note", async () => {
    actions.loadFitsAction.mockResolvedValueOnce(read()).mockResolvedValueOnce(read({ free: 0 }));
    actions.addFromFits.mockResolvedValue({ ok: true });
    draw();
    await settle();
    await act(async () => { fireEvent.click(firstAdd()); });
    await settle();
    expect(body()).toMatchSnapshot();
  });
});

describe("a card opened from the picker", () => {
  // Hugh's staging walk: pressing a card named inside the picker opened it BEHIND the picker. It
  // stacks over the picker the way a stand-in's card stacks over its sheet, and closing it is a step
  // back to the picker rather than out of both.
  const full = (oracleId: string, name: string) => ({
    ...card, oracleId, name, typeLine: "Creature", manaCost: "{G}", cmc: 1, oracleText: null, keywords: [],
    rarity: "rare", printings: [], setCodes: [], primarySetCode: "", preferredPrinting: null,
    commanderLegal: true, hasDecks: true, availability: null,
  }) as unknown as BrowseCard;
  const cards: Record<string, BrowseCard> = {
    "o-birds": full("o-birds", "Birds of Paradise"),
    "o-sanity": full("o-sanity", "Fraying Sanity"),
  };

  async function openPickerCard() {
    actions.loadFitsAction.mockResolvedValue(read());
    const { CardDetailTrigger } = await import("./card-detail-provider");
    render(
      <CardDetailProvider fetchCard={async (id) => cards[id] ?? null}>
        <CardDetailTrigger oracleId="o-birds" name="Birds of Paradise">Birds of Paradise</CardDetailTrigger>
      </CardDetailProvider>,
    );
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Birds of Paradise/ })));
    await settle();
    await act(async () => fireEvent.click(screen.getAllByRole("button", { name: copy.calloutAria("Birds of Paradise") })[0]));
    await settle();
    const picker = screen.getByTestId("fits-picker");
    await act(async () => fireEvent.click(within(picker).getByRole("button", { name: /Fraying Sanity/ })));
    await settle();
    return picker;
  }

  const dialogNamed = (name: string) =>
    screen.getAllByRole("dialog").find((d) => d.textContent?.includes(name) && !d.contains(screen.queryByTestId("fits-picker")));

  it("paints over the picker: both are fixed at one z-index, so it comes later in the document", async () => {
    const picker = await openPickerCard();
    const top = dialogNamed("Fraying Sanity");
    expect(top).toBeDefined();
    expect(picker.compareDocumentPosition(top!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("closes back to the picker, which is still open for the card it came from", async () => {
    await openPickerCard();
    const top = dialogNamed("Fraying Sanity")!;
    await act(async () => fireEvent.keyDown(top, { key: "Escape" }));
    // jsdom matches no media query, so this is the phone's drop off the picker (stacked sheets R1).
    await act(() => new Promise<void>((r) => { setTimeout(r, STACK_DROP_MS); }));
    expect(dialogNamed("Fraying Sanity")).toBeUndefined();
    expect(screen.getByTestId("fits-picker")).toBeInTheDocument();
  });
});
