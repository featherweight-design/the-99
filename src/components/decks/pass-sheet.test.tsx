import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { topOffCopy } from "../../lib/copy/top-off";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { FillPassSummary } from "../../lib/decks/fill-passes";

vi.mock("../../app/decks/actions", () => ({ undoFillPass: vi.fn() }));
// The rows are the list's own and are proved with it; this file proves the frame around them.
vi.mock("./decklist-row", () => ({ DecklistRow: () => null }));
vi.mock("./decklist-group-header", () => ({ DecklistGroupHeader: ({ label }: { label: string }) => <h3>{label}</h3> }));
vi.mock("./hover-preview", () => ({ HoverPreviewProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("../cards/card-detail-provider", () => ({ useCardDetail: () => ({ registerSheet: () => () => {}, openOracleId: null, revealing: false }), CardDetailTrigger: ({ children }: { children?: React.ReactNode }) => <>{children}</> }));

const { PassSheet } = await import("./pass-sheet");
const ledger = topOffCopy.ledger;

const card = (id: string): DeckDetailCard =>
  ({ oracleId: id, name: `Card ${id}`, typeLine: "Artifact", cardTypeGroup: "Artifacts", role: "ramp", owned: true, quantity: 1, auto: true, availability: null }) as DeckDetailCard;

const pass = (kind: FillPassSummary["kind"], live: number): FillPassSummary => ({
  id: "p1",
  kind,
  ordinal: 1,
  createdAt: new Date("2026-01-01"),
  live,
  kept: 0,
  removed: 0,
  openSlots: 5,
  liveCards: ["a", "b", "c"].map((oracleId) => ({ oracleId, quantity: 1 })),
});

function draw(p: FillPassSummary) {
  return render(
    <PassSheet
      target={{ kind: "pass", passId: "p1" }}
      deckId="d"
      cards={["a", "b", "c"].map(card)}
      passes={[p]}
      bodySize={99}
      newestAsOf={null}
      onAnnounce={vi.fn()}
      onClose={vi.fn()}
    />,
  );
}

describe("PassSheet (one pass)", () => {
  it("offers Undo on a top-off, and the title and the Undo draw one figure", () => {
    // The server's count lags a ✕ in flight (2 of 3 cards drawn are live): the sheet's own count wins.
    draw(pass("top_off", 2));
    expect(screen.getByRole("heading", { name: ledger.sheetTitle(3) })).toBeTruthy();
    expect(screen.getByRole("button", { name: ledger.undoAria("3", ledger.sheetLabel(pass("top_off", 2))) })).toBeTruthy();
    expect(screen.getByRole("button", { name: ledger.sheetDone })).toBeTruthy();
  });

  it("keeps the lead's placed figure when a ✕ has taken a card the server has not counted", () => {
    // 3 drawn, 4 live on the server: one removal in flight, so the pass still placed 4.
    const view = draw({ ...pass("top_off", 4), kept: 0 });
    expect(view.container.textContent).toContain("4 placed");
  });

  it("drops a card the player kept from the sheet and the count, and reports it as kept", () => {
    const kept = { ...card("c"), auto: false };
    const view = render(
      <PassSheet
        target={{ kind: "pass", passId: "p1" }}
        deckId="d"
        cards={[card("a"), card("b"), kept]}
        passes={[pass("top_off", 3)]}
        bodySize={99}
        newestAsOf={null}
        onAnnounce={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: ledger.sheetTitle(2) })).toBeTruthy();
    expect(view.container.textContent).toContain("1 now yours");
  });

  it("offers Done only on the seed, and says how it IS reversed in a line that is not a press", () => {
    draw(pass("seed", 3));
    expect(screen.getByRole("button", { name: ledger.sheetDone })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Undo/ })).toBeNull();
    const note = screen.getByText(ledger.seedReversal);
    expect(note.tagName).toBe("P");
    expect(note.closest("button")).toBeNull();
    // Centred above Done at 390, at the left from md (the board's `.sfp .rv`).
    expect(note.className).toContain("text-center");
    expect(note.className).toContain("md:text-left");
    expect(note.parentElement!.className).toContain("flex-col");
  });

  it("draws no such line on a top-off, which has its Undo", () => {
    draw(pass("top_off", 3));
    expect(screen.queryByText(ledger.seedReversal)).toBeNull();
  });
});

describe("PassSheet (other drafts)", () => {
  it("lists a draft that holds one copy but wants another", () => {
    const wanted = {
      ...card("a"),
      availability: { owned: 2, hard: 0, soft: 1, free: 1, claims: [{ id: "d2", name: "Brew Two", quantity: 2, granted: 1, mature: false, pending: false }] },
    } as unknown as DeckDetailCard;
    render(<PassSheet target={{ kind: "drafts" }} deckId="d" cards={[wanted]} passes={[]} bodySize={99} newestAsOf={null} onAnnounce={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Brew Two")).toBeTruthy();
  });
});

describe("PassSheet undo state", () => {
  it("is shared with the pass's other control and survives the sheet closing", async () => {
    const { undoFillPass } = await import("../../app/decks/actions");
    let finish!: (v: { removed: number; built: number }) => void;
    vi.mocked(undoFillPass).mockImplementation(() => new Promise((r) => { finish = r; }));
    const first = draw(pass("top_off", 3));
    fireEvent.click(screen.getByRole("button", { name: /^Undo/ }));
    first.unmount();
    // A fresh sheet for the same pass (the ledger's control reads the same state) is already pending.
    draw(pass("top_off", 3));
    expect(screen.getByRole("button", { name: /^Undo/ })).toBeDisabled();
    finish({ removed: 3, built: 90 });
    await waitFor(() => expect(screen.getByRole("button", { name: /^Undo/ })).not.toBeDisabled());
  });

  it("reports a refusal in the ledger when the sheet ran the undo", async () => {
    const { undoFillPass } = await import("../../app/decks/actions");
    const { ProvenanceLedger } = await import("./provenance-line");
    let fail!: (e: Error) => void;
    vi.mocked(undoFillPass).mockImplementation(() => new Promise((_, r) => { fail = r; }));
    const p = pass("top_off", 3);
    const cards = ["a", "b", "c"].map(card);
    render(<ProvenanceLedger deckId="e" bodySize={99} cards={cards} total={3} passes={[p]} onShow={vi.fn()} onAnnounce={vi.fn()} />);
    const sheet = render(<PassSheet target={{ kind: "pass", passId: "p1" }} deckId="e" cards={cards} passes={[p]} bodySize={99} newestAsOf={null} onAnnounce={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(within(sheet.container).getByRole("button", { name: /^Undo/ }));
    sheet.unmount();
    fail(new Error("no"));
    await waitFor(() => expect(screen.getByText(ledger.undoFailed)).toBeTruthy());
  });
});

// The frame is shared with the combos list (`SheetFrame`, combos close); the pass sheet keeps its own form.
describe("PassSheet's frame", () => {
  it("stays the full-height 600 sheet the combos list's options leave unset", () => {
    draw(pass("top_off", 3));
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("h-[calc(100%-52px)]");
    expect(dialog.className).toContain("rounded-t-[14px]");
    expect(dialog.className).toContain("md:w-[600px]");
    expect(dialog.className).not.toContain("max-h-[calc(100%-52px)]");
    expect(screen.getByRole("button", { name: ledger.sheetDone })).toBeTruthy();
  });
});
