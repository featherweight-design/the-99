import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadPreview } from "../../app/collection/actions";

const push = vi.fn();
// Records every code-started navigation the component starts through `usePendingPush`, which is
// what hands it to the navigation-pending provider (the plan's PR 3). The push still reaches the
// router mock, so the cases that assert it are unchanged.
const pushed = vi.hoisted(() => [] as string[]);
vi.mock("../shell/pending-push", async () => {
  const { useRouter } = await import("next/navigation");
  return {
    usePendingPush: () => {
      const router = useRouter();
      return { go: (href: string) => { pushed.push(href); router.push(href); } };
    },
  };
});

vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const confirmUpload = vi.fn();
const previewPaste = vi.fn();
const previewChange = vi.fn();
vi.mock("../../app/collection/actions", () => ({
  confirmUpload: (...args: unknown[]) => confirmUpload(...args),
  previewUploadChange: (...args: unknown[]) => previewChange(...args),
  previewPaste: (...args: unknown[]) => previewPaste(...args),
  previewUpload: vi.fn(),
}));

const { ReplaceFlow } = await import("./replace-flow");

function preview(currentCollectionCount: number): UploadPreview {
  return {
    uploadId: "up_1",
    matchedCardCount: 3,
    unmatchedRows: [],
    skippedByDesignCount: 0,
    parseErrors: [],
    currentCollectionCount,
    filename: "pasted list",
    rowCount: 3,
  };
}

// Through the real entry and review screen, so "Continue" is the button a player presses.
async function reachReview(currentCollectionCount: number) {
  previewPaste.mockResolvedValueOnce(preview(currentCollectionCount));
  render(<ReplaceFlow currentCardCount={currentCollectionCount} />);
  fireEvent.click(screen.getAllByRole("button", { name: /Paste a list instead/ })[0]);
  fireEvent.change(screen.getByRole("textbox", { name: "Paste your card list" }), {
    target: { value: "3 Sol Ring" },
  });
  fireEvent.click(screen.getByRole("button", { name: /^Preview/ }));
  return screen.findByRole("button", { name: /^Continue to (import|replace)/ });
}

describe("ReplaceFlow — the first import (prod walk 2026-09-28, item 5a)", () => {
  beforeEach(() => {
    push.mockReset();
    confirmUpload.mockReset();
    previewPaste.mockReset();
    previewChange.mockReset().mockResolvedValue(null);
  });

  it("confirms a first import straight from Continue, with no modal", async () => {
    confirmUpload.mockResolvedValueOnce(undefined);
    const cont = await reachReview(0);
    await act(async () => fireEvent.click(cont));
    expect(confirmUpload).toHaveBeenCalledWith("up_1", { firstImport: true });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(push).toHaveBeenCalledWith("/collection/replace/summary/up_1");
  });

  it("starts the push to the receipt through the navigation-pending hook", async () => {
    confirmUpload.mockResolvedValueOnce(undefined);
    pushed.length = 0;
    const cont = await reachReview(0);
    await act(async () => fireEvent.click(cont));
    expect(pushed).toContain("/collection/replace/summary/up_1");
  });

  it("holds Continue at Importing… while a first import runs, since no modal carries the wait", async () => {
    // Wired end to end through the flow, not only rendered by ReviewScreen: the prop is only
    // worth anything if the mount site passes it.
    let settle: (v: undefined) => void = () => {};
    confirmUpload.mockReturnValueOnce(new Promise((resolve) => (settle = resolve)));
    const cont = await reachReview(0);
    await act(async () => fireEvent.click(cont));
    const held = screen.getByRole("button", { name: "Importing…" });
    expect(held).toBeDisabled();
    // Nothing leaves the review mid-write, at either width: the write would land anyway.
    for (const name of ["Cancel"]) {
      const control = screen.getByRole("button", { name });
      expect(control).toBeDisabled();
      fireEvent.click(control);
    }
    expect(screen.getByRole("button", { name: "Importing…" })).toBeInTheDocument();
    await act(async () => settle(undefined));
    expect(push).toHaveBeenCalledWith("/collection/replace/summary/up_1");
  });

  it("keeps the confirm for a replace, and writes nothing until it is answered", async () => {
    const cont = await reachReview(2_933);
    fireEvent.click(cont);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(confirmUpload).not.toHaveBeenCalled();
  });

  it("falls back to the modal when the server finds a collection after all", async () => {
    confirmUpload.mockResolvedValueOnce({ needsConfirm: true, currentCollectionCount: 2_933 });
    const cont = await reachReview(0);
    await act(async () => fireEvent.click(cont));
    const dialog = await screen.findByRole("dialog");
    expect(push).not.toHaveBeenCalled();
    // The REPLACE variant, sized by what the server found: the preview drawn at 0 would have
    // asked for IMPORT over a write that deletes a collection.
    expect(dialog).toHaveTextContent("2,933");
    expect(dialog).toHaveTextContent("Replace your collection?");

    // Answering the modal is a real confirm: it no longer claims to be a first import.
    confirmUpload.mockResolvedValueOnce(undefined);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Replace with 3 cards" })));
    await waitFor(() => expect(confirmUpload).toHaveBeenLastCalledWith("up_1", { firstImport: false }));
  });

  it("names History as the way back when first run finds a collection, with no deck check", async () => {
    // First run mounts the flow with `history` alone: it never asks for the comparison.
    confirmUpload.mockResolvedValueOnce({ needsConfirm: true, currentCollectionCount: 2_933 });
    previewPaste.mockResolvedValueOnce(preview(0));
    render(<ReplaceFlow currentCardCount={0} history />);
    fireEvent.click(screen.getAllByRole("button", { name: /Paste a list instead/ })[0]);
    fireEvent.change(screen.getByRole("textbox", { name: "Paste your card list" }), { target: { value: "3 Sol Ring" } });
    fireEvent.click(screen.getByRole("button", { name: /^Preview/ }));
    const cont = await screen.findByRole("button", { name: /^Continue to (import|replace)/ });
    await act(async () => fireEvent.click(cont));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("revert this from History");
    expect(previewChange).not.toHaveBeenCalled();
  });

  // The count the server found outlives the preview: back on the upload step, the page must not
  // call a collection that exists empty (Copilot on #1110).
  it("keeps the collection the server found after the review is cancelled", async () => {
    confirmUpload.mockResolvedValueOnce({ needsConfirm: true, currentCollectionCount: 2_933 });
    const cont = await reachReview(0);
    await act(async () => fireEvent.click(cont));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Keep current" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getAllByRole("heading", { name: "Replace collection" }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Add your collection" })).toBeNull();
    expect(screen.getByText("2,933 cards")).toBeInTheDocument();
  });

  it("reports a failed first import in the modal's error slot rather than nowhere", async () => {
    confirmUpload.mockRejectedValueOnce(new Error("Upload has no matched cards"));
    const cont = await reachReview(0);
    await act(async () => fireEvent.click(cont));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Upload has no matched cards");

    // A retry from that modal is still a first import, so it keeps the server's guard: a
    // collection another tab imported while the error was up must not be replaced unasked.
    confirmUpload.mockResolvedValueOnce(undefined);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Import 3 cards" })));
    await waitFor(() => expect(confirmUpload).toHaveBeenLastCalledWith("up_1", { firstImport: true }));
  });
});

describe("ReplaceFlow — §E, decks the replace would leave short", () => {
  const deck = (deckId: string, deckName: string, short = 1) => ({
    deckId,
    deckName,
    oracleId: "o1",
    cardName: "Sol Ring",
    short,
  });

  async function reachConfirm() {
    previewPaste.mockResolvedValueOnce(preview(10));
    render(<ReplaceFlow currentCardCount={10} deckCheck />);
    fireEvent.click(screen.getAllByRole("button", { name: /Paste a list instead/ })[0]);
    fireEvent.change(screen.getByRole("textbox", { name: "Paste your card list" }), { target: { value: "3 Sol Ring" } });
    fireEvent.click(screen.getByRole("button", { name: /^Preview/ }));
    fireEvent.click(await screen.findByRole("button", { name: /^Continue to replace/ }));
    return screen.getByRole("button", { name: /^Replace with/ });
  }

  beforeEach(() => {
    push.mockReset();
    confirmUpload.mockReset();
    previewPaste.mockReset();
    previewChange.mockReset().mockResolvedValue(null);
  });

  it("reads Checking decks… on the pressed control while the check runs", async () => {
    confirmUpload.mockReturnValueOnce(new Promise(() => {}));
    const replace = await reachConfirm();
    await act(async () => fireEvent.click(replace));
    expect(screen.getByRole("button", { name: "Checking decks…" })).toBeDisabled();
  });

  it("swaps the confirm for the warning, and Cancel writes nothing", async () => {
    confirmUpload.mockResolvedValueOnce({ wouldShort: [deck("d1", "Atraxa")] });
    const replace = await reachConfirm();
    await act(async () => fireEvent.click(replace));
    expect(screen.getByRole("heading", { name: "Replacing leaves a deck short" })).toBeTruthy();
    expect(screen.getByText("Atraxa")).toBeTruthy();
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(confirmUpload).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the warning inside the same dialog element, so the confirm's back-button entry is not orphaned", async () => {
    confirmUpload.mockResolvedValueOnce({ wouldShort: [deck("d1", "Atraxa")] });
    const replace = await reachConfirm();
    const before = screen.getByRole("dialog");
    await act(async () => fireEvent.click(replace));
    expect(screen.getByRole("dialog")).toBe(before);
    expect(screen.getByRole("heading", { name: "Replacing leaves a deck short" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("confirming resends the SAME decks as confirmShort, then opens the receipt", async () => {
    const decks = [deck("d1", "Atraxa")];
    confirmUpload.mockResolvedValueOnce({ wouldShort: decks }).mockResolvedValueOnce(undefined);
    const replace = await reachConfirm();
    await act(async () => fireEvent.click(replace));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Replace anyway" })));
    expect(confirmUpload).toHaveBeenLastCalledWith("up_1", { firstImport: false, confirmShort: decks });
    expect(push).toHaveBeenCalledWith("/collection/replace/summary/up_1");
  });

  it("a confirm that comes back changed redraws the same dialog, with a notice and `new` on the added deck", async () => {
    confirmUpload
      .mockResolvedValueOnce({ wouldShort: [deck("d1", "Atraxa")] })
      .mockResolvedValueOnce({ wouldShort: [deck("d1", "Atraxa"), deck("d2", "Korvold")] });
    const replace = await reachConfirm();
    await act(async () => fireEvent.click(replace));
    expect(screen.queryByRole("status")).toBeNull();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Replace anyway" })));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("status").textContent).toMatch(/This changed while you were deciding/);
    expect(screen.getByRole("heading", { name: "Replacing leaves 2 decks short" })).toBeTruthy();
    const tags = screen.getAllByText("new");
    expect(tags).toHaveLength(1);
    expect(tags[0].parentElement?.textContent).toMatch(/Korvold/);
  });

  it("a thrown confirm from the warning reports in the warning and opens nothing over it", async () => {
    confirmUpload.mockResolvedValueOnce({ wouldShort: [deck("d1", "Atraxa")] }).mockRejectedValueOnce(new Error("Network down"));
    const replace = await reachConfirm();
    await act(async () => fireEvent.click(replace));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Replace anyway" })));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(within(screen.getByRole("dialog")).getByRole("alert").textContent).toBe("Network down");
  });

  it("names the cards the catalog dropped in the confirm's error slot, and writes nothing", async () => {
    confirmUpload.mockResolvedValueOnce({ missingCard: ["Sol Ring", "Arcane Signet"] });
    const replace = await reachConfirm();
    await act(async () => fireEvent.click(replace));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Sol Ring, Arcane Signet have been removed from the card catalog since this file was read. Nothing was changed.",
    );
    expect(push).not.toHaveBeenCalled();
  });
});

describe("ReplaceFlow · the ledger review (collection edit A2)", () => {
  const list = (names: string[], before: number, after: number) => ({
    total: names.length,
    rows: names.map((name) => ({ oracleId: `o-${name}`, name, setCode: "lea", collectorNumber: "1", finish: "nonfoil", before, after, edited: name === "Edited" })),
  });
  const detail = {
    unchanged: 7, up: 2, down: 1, leaving: 2,
    copiesBefore: 25, copiesAfter: 12,
    lists: { leaving: list(["Gone", "Edited"], 3, 0), down: list(["Fewer"], 4, 1), up: list(["More", "Fresh"], 0, 2) },
    newHoldings: 2, distinctCards: 5, overlap: { held: 0, of: 0 }, allOwned: false,
  };
  const deck = (deckId: string, deckName: string) => ({ deckId, deckName, oracleId: "o1", cardName: "Sol Ring", short: 1 });
  const data = (decks: ReturnType<typeof deck>[] = []) => ({
    raised: 2, lowered: 3, decks, editsSinceUpload: 3, lastUploadAt: "2026-09-12T10:00:00.000Z", historyReaches: true, detail,
  });

  // An Add lowers nothing, so it carries no decks; the file brings 6 copies across 2 cards.
  const addData = (allOwned = false) => ({
    raised: 2, lowered: 0, decks: [], editsSinceUpload: 3, lastUploadAt: "2026-09-12T10:00:00.000Z", historyReaches: true,
    detail: {
      ...detail,
      unchanged: 20, up: 2, down: 0, leaving: 0, copiesBefore: 25, copiesAfter: 31,
      lists: { leaving: list([], 0, 0), down: list([], 0, 0), up: list(["More", "Fresh"], 1, 4) },
      newHoldings: allOwned ? 0 : 1, distinctCards: 2, overlap: { held: 9, of: 10 }, allOwned,
    },
  });
  const serve = (replace: ReturnType<typeof data>, add: ReturnType<typeof addData> = addData()) =>
    previewChange.mockImplementation(async (_id: string, mode: string) => (mode === "add" ? add : replace));

  async function reachChoice() {
    previewPaste.mockResolvedValueOnce(preview(10));
    render(<ReplaceFlow currentCardCount={10} deckCheck />);
    fireEvent.click(screen.getAllByRole("button", { name: /Paste a list instead/ })[0]);
    fireEvent.change(screen.getByRole("textbox", { name: "Paste your card list" }), { target: { value: "3 Sol Ring" } });
    fireEvent.click(screen.getByRole("button", { name: /^Preview/ }));
    return screen.findByRole("radiogroup");
  }

  async function reachReview(mode: "replace" | "add" = "replace") {
    await reachChoice();
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(mode === "add" ? "Add these cards" : "Replace my collection") }));
    fireEvent.click(screen.getByRole("button", { name: mode === "add" ? "Review the add →" : "Review the replace →" }));
    return screen.findByRole("button", { name: mode === "add" ? /^Add \d/ : "Replace collection" });
  }

  beforeEach(() => {
    push.mockReset();
    confirmUpload.mockReset();
    previewPaste.mockReset();
    previewChange.mockReset();
  });

  it("draws the four figures, what is overwritten, the decks and the lists, and decides on the confirm bar", async () => {
    serve(data([deck("d1", "Atraxa")]));
    await reachReview();
    expect(previewChange).toHaveBeenCalledWith("up_1", "replace");
    expect(screen.getByText("going up or new").previousSibling?.textContent).toBe("2");
    expect(screen.getByText("leaving").previousSibling?.textContent).toBe("2");
    expect(screen.getByText(/This overwrites 3 changes you made in the app since your Sep 12 upload/)).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Decks that will read short · 1" })).toBeTruthy();
    expect(screen.getByText("Atraxa")).toBeTruthy();
    expect(screen.getByText("Leaving your collection · 2")).toBeTruthy();
    expect(screen.getByText("edited")).toBeTruthy();
    expect(screen.getByText("Replaces your 25 cards with 12. 1 deck will read short.")).toBeTruthy();
    // No dialog: the bar is the confirm.
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("confirms from the bar with the decks the review showed, then opens the receipt", async () => {
    const decks = [deck("d1", "Atraxa")];
    serve(data(decks));
    confirmUpload.mockResolvedValueOnce(undefined);
    const confirm = await reachReview();
    await act(async () => fireEvent.click(confirm));
    expect(confirmUpload).toHaveBeenCalledWith("up_1", { firstImport: false, confirmShort: decks, mode: "replace" });
    expect(push).toHaveBeenCalledWith("/collection/replace/summary/up_1");
  });

  it("redraws the same section when the decks moved, with a notice and `new`, and writes nothing", async () => {
    serve(data([deck("d1", "Atraxa")]));
    confirmUpload.mockResolvedValueOnce({ wouldShort: [deck("d1", "Atraxa"), deck("d2", "Korvold")] });
    const confirm = await reachReview();
    await act(async () => fireEvent.click(confirm));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/This changed while you were deciding/);
    expect(screen.getByRole("heading", { name: "Decks that will read short · 2" })).toBeTruthy();
    expect(screen.getAllByText("new")).toHaveLength(1);
    expect(push).not.toHaveBeenCalled();
  });

  it("a failed write keeps the review, says nothing changed, and Try again confirms again", async () => {
    serve(data());
    confirmUpload.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(undefined);
    const confirm = await reachReview();
    await act(async () => fireEvent.click(confirm));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/That didn’t go through/);
    expect(alert.textContent).toMatch(/Nothing changed/);
    expect(screen.getByRole("button", { name: "Replace collection" })).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Try again" })));
    expect(confirmUpload).toHaveBeenCalledTimes(2);
    expect(push).toHaveBeenCalledWith("/collection/replace/summary/up_1");
  });

  it("Show all hands focus to the first revealed row and says when the list is longer than what shipped", async () => {
    const many = Array.from({ length: 12 }, (_, i) => `Card ${String(i).padStart(2, "0")}`);
    serve({
      ...data(),
      detail: { ...detail, lists: { ...detail.lists, leaving: { total: 507, rows: list(many, 3, 0).rows } } },
    });
    await reachReview();
    expect(screen.queryByText("Card 09")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show all 12" }));
    expect(document.activeElement).toBe(screen.getByText("Card 08").closest("li"));
    expect(screen.getByText("Showing the first 12 of 507.")).toBeTruthy();
  });

  it("names a card the catalog dropped in the failure, and writes nothing", async () => {
    serve(data());
    confirmUpload.mockResolvedValueOnce({ missingCard: ["Sol Ring"] });
    const confirm = await reachReview();
    await act(async () => fireEvent.click(confirm));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Sol Ring has been removed from the card catalog/);
    expect(push).not.toHaveBeenCalled();
  });

  it("says it is comparing while the file is read, and draws no choice until both reads land", async () => {
    previewChange.mockReturnValue(new Promise(() => {}));
    previewPaste.mockResolvedValueOnce(preview(10));
    render(<ReplaceFlow currentCardCount={10} deckCheck />);
    fireEvent.click(screen.getAllByRole("button", { name: /Paste a list instead/ })[0]);
    fireEvent.change(screen.getByRole("textbox", { name: "Paste your card list" }), { target: { value: "3 Sol Ring" } });
    fireEvent.click(screen.getByRole("button", { name: /^Preview/ }));
    expect((await screen.findByRole("status")).textContent).toMatch(/Comparing with your collection/);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("says so when the comparison cannot be read, and Try again reads it again", async () => {
    previewChange.mockRejectedValue(new Error("down"));
    previewPaste.mockResolvedValueOnce(preview(10));
    render(<ReplaceFlow currentCardCount={10} deckCheck />);
    fireEvent.click(screen.getAllByRole("button", { name: /Paste a list instead/ })[0]);
    fireEvent.change(screen.getByRole("textbox", { name: "Paste your card list" }), { target: { value: "3 Sol Ring" } });
    fireEvent.click(screen.getByRole("button", { name: /^Preview/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn’t read how this file compares/);
    expect(screen.queryByRole("dialog")).toBeNull();
    serve(data());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Try again" })));
    expect(await screen.findByRole("radiogroup")).toBeTruthy();
  });

  it("draws the choice with nothing picked, each card's after-figure, and Continue held", async () => {
    serve(data());
    await reachChoice();
    expect(screen.getByText("STEP 2 OF 4", { exact: false })).toBeTruthy();
    expect(screen.getAllByRole("radio").every((r) => r.getAttribute("aria-checked") === "false")).toBe(true);
    expect(screen.getByText("25 → 12 cards")).toBeTruthy();
    expect(screen.getByText("25 → 31 cards")).toBeTruthy();
    expect(screen.getByText(/You already own 90% of these cards/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Review the replace →" })).toBeDisabled();
  });

  it("an Add review draws what is added and no deck section, edited tag or overwrite line", async () => {
    serve(data([deck("d1", "Atraxa")]));
    await reachReview("add");
    expect(screen.getByText("STEP 3 OF 4", { exact: false })).toBeTruthy();
    expect(screen.getByText("+6")).toBeTruthy();
    expect(screen.getByText("copies across 2 cards")).toBeTruthy();
    expect(screen.getByText("What gets added · 2")).toBeTruthy();
    expect(screen.getByText("Adding 6 copies and skipping 0 rows. Your 25 cards stay.")).toBeTruthy();
    expect(screen.queryByText(/Decks that will read short/)).toBeNull();
    expect(screen.queryByText("edited")).toBeNull();
    expect(screen.queryByText(/overwrites/)).toBeNull();
  });

  it("an Add confirms in add mode with no decks, then opens the receipt", async () => {
    serve(data());
    confirmUpload.mockResolvedValueOnce(undefined);
    const confirm = await reachReview("add");
    await act(async () => fireEvent.click(confirm));
    expect(confirmUpload).toHaveBeenCalledWith("up_1", { firstImport: false, confirmShort: [], mode: "add" });
    expect(push).toHaveBeenCalledWith("/collection/replace/summary/up_1");
  });

  it("an Add of cards all already owned says so, keeps Add available, and can switch to Replace", async () => {
    serve(data(), addData(true));
    const confirm = await reachReview("add");
    expect(screen.getByText("You already own every card in this file.")).toBeTruthy();
    expect(confirm).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Switch to Replace" }));
    expect(await screen.findByRole("button", { name: "Replace collection" })).toBeTruthy();
    expect(screen.queryByText("You already own every card in this file.")).toBeNull();
  });

  it("withdraws Switch to Replace while an Add confirm is in flight", async () => {
    serve(data(), addData(true));
    confirmUpload.mockReturnValue(new Promise(() => {}));
    const confirm = await reachReview("add");
    await act(async () => fireEvent.click(confirm));
    expect(screen.queryByRole("button", { name: "Switch to Replace" })).toBeNull();
  });

  it("Cancel on the review steps back to the choice, keeping the pick", async () => {
    serve(data());
    await reachReview("add");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByRole("radiogroup")).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Add these cards/ }).getAttribute("aria-checked")).toBe("true");
  });

  it("a confirm made inside the dialog is answered by the dialog even when the comparison has resolved", async () => {
    // A first import that finds a collection after all opens the dialog; the comparison then resolves.
    serve(data([deck("d1", "Atraxa")]));
    previewPaste.mockResolvedValueOnce(preview(0));
    confirmUpload
      .mockResolvedValueOnce({ needsConfirm: true, currentCollectionCount: 10 })
      .mockResolvedValueOnce({ wouldShort: [deck("d1", "Atraxa")] });
    render(<ReplaceFlow currentCardCount={0} deckCheck />);
    fireEvent.click(screen.getAllByRole("button", { name: /Paste a list instead/ })[0]);
    fireEvent.change(screen.getByRole("textbox", { name: "Paste your card list" }), { target: { value: "3 Sol Ring" } });
    fireEvent.click(screen.getByRole("button", { name: /^Preview/ }));
    const cont = await screen.findByRole("button", { name: /^Continue to import/ });
    await act(async () => fireEvent.click(cont));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(previewChange).toHaveBeenCalled());
    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: /^Replace with/ })));
    // The warning is drawn INSIDE the dialog, not only behind it.
    expect(within(screen.getByRole("dialog")).getByRole("heading", { name: "Replacing leaves a deck short" })).toBeTruthy();
  });

  it("a first import never asks for the comparison", async () => {
    serve(data());
    previewPaste.mockResolvedValueOnce(preview(0));
    confirmUpload.mockResolvedValueOnce(undefined);
    render(<ReplaceFlow currentCardCount={0} deckCheck />);
    fireEvent.click(screen.getAllByRole("button", { name: /Paste a list instead/ })[0]);
    fireEvent.change(screen.getByRole("textbox", { name: "Paste your card list" }), { target: { value: "3 Sol Ring" } });
    fireEvent.click(screen.getByRole("button", { name: /^Preview/ }));
    await screen.findByRole("button", { name: /^Continue to import/ });
    expect(previewChange).not.toHaveBeenCalled();
  });
});

describe("ReplaceFlow · the choice, keyboard and concurrency", () => {
  beforeEach(() => {
    previewPaste.mockReset();
    previewChange.mockReset();
  });
  const startFlow = async () => {
    previewPaste.mockResolvedValueOnce(preview(10));
    render(<ReplaceFlow currentCardCount={10} deckCheck />);
    fireEvent.click(screen.getAllByRole("button", { name: /Paste a list instead/ })[0]);
    fireEvent.change(screen.getByRole("textbox", { name: "Paste your card list" }), { target: { value: "3 Sol Ring" } });
    fireEvent.click(screen.getByRole("button", { name: /^Preview/ }));
  };
  const d = (copiesAfter: number) => ({
    raised: 0, lowered: 0, decks: [], editsSinceUpload: 0, lastUploadAt: null, historyReaches: false,
    detail: {
      unchanged: 0, up: 0, down: 0, leaving: 0, copiesBefore: 10, copiesAfter,
      lists: { leaving: { total: 0, rows: [] }, down: { total: 0, rows: [] }, up: { total: 0, rows: [] } },
      newHoldings: 0, distinctCards: 0, overlap: { held: 0, of: 0 }, allOwned: false,
    },
  });

  it("falls back to the shipped review when only ONE of the two reads says the upload is confirmed", async () => {
    previewChange.mockImplementation(async (_id: string, mode: string) => (mode === "add" ? null : d(5)));
    await startFlow();
    expect(await screen.findByRole("button", { name: /^Continue to replace/ })).toBeTruthy();
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("opens the receipt, not a retry, when a confirm threw after the write had committed", async () => {
    push.mockReset();
    confirmUpload.mockReset().mockRejectedValueOnce(new Error("receipt write failed"));
    previewChange.mockResolvedValueOnce(d(5)).mockResolvedValueOnce(d(12)).mockResolvedValue(null);
    await startFlow();
    fireEvent.click(await screen.findByRole("radio", { name: /Add these cards/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review the add →" }));
    await act(async () => fireEvent.click(await screen.findByRole("button", { name: /^Add \d/ })));
    expect(push).toHaveBeenCalledWith("/collection/replace/summary/up_1");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says it could not confirm, and not that nothing changed, when the confirm threw and the check failed too", async () => {
    push.mockReset();
    confirmUpload.mockReset().mockRejectedValueOnce(new Error("offline"));
    previewChange.mockResolvedValueOnce(d(5)).mockResolvedValueOnce(d(12)).mockRejectedValue(new Error("offline"));
    await startFlow();
    fireEvent.click(await screen.findByRole("radio", { name: /Add these cards/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review the add →" }));
    await act(async () => fireEvent.click(await screen.findByRole("button", { name: /^Add \d/ })));
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/couldn’t confirm whether that went through/);
    expect(alert.textContent).not.toMatch(/Nothing changed/);
    expect(push).not.toHaveBeenCalled();
  });

  it("quotes each card's own before-figure, since the two reads are separate transactions", async () => {
    const replace = d(5);
    const add = d(41);
    add.detail.copiesBefore = 35;
    previewChange.mockImplementation(async (_id: string, mode: string) => (mode === "add" ? add : replace));
    await startFlow();
    await screen.findByRole("radiogroup");
    expect(screen.getByText("10 → 5 cards")).toBeTruthy();
    expect(screen.getByText("35 → 41 cards")).toBeTruthy();
  });

  it("inflects the Add banner by the copies added, not the cards: three copies of one card", async () => {
    const add = d(13);
    add.detail.distinctCards = 1;
    previewChange.mockImplementation(async (_id: string, mode: string) => (mode === "add" ? add : d(5)));
    await startFlow();
    fireEvent.click(await screen.findByRole("radio", { name: /Add these cards/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review the add →" }));
    expect(await screen.findByText("+3")).toBeTruthy();
    expect(screen.getByText("copies across 1 card")).toBeTruthy();
  });

  it("arrow keys move focus with the pick, from whichever card has focus", async () => {
    previewChange.mockResolvedValue(d(5));
    await startFlow();
    await screen.findByRole("radiogroup");
    const [replace, add] = screen.getAllByRole("radio");
    replace.focus();
    fireEvent.keyDown(replace, { key: "ArrowRight" });
    expect(add.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(add);
    fireEvent.keyDown(add, { key: "ArrowLeft" });
    expect(replace.getAttribute("aria-checked")).toBe("true");
    expect(document.activeElement).toBe(replace);
  });
});
