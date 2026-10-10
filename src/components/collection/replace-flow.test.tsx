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
vi.mock("../../app/collection/actions", () => ({
  confirmUpload: (...args: unknown[]) => confirmUpload(...args),
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
