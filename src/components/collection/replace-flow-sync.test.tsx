import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadPreview } from "../../app/collection/actions";

// Collection Sync, the choice step (plan PR 2): what ReplaceFlow reads and draws with the switch on and off.

vi.mock("../shell/pending-push", () => ({ usePendingPush: () => ({ go: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

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

const preview: UploadPreview = {
  uploadId: "up_1", matchedCardCount: 3, unmatchedRows: [], skippedByDesignCount: 0, parseErrors: [],
  currentCollectionCount: 10, filename: "The Vault.csv", rowCount: 3,
};
const empty = { total: 0, rows: [] };
const detail = (copiesAfter: number, more: { up?: number; leaving?: number; down?: number } = {}) => ({
  unchanged: 0, up: more.up ?? 0, down: more.down ?? 0, leaving: more.leaving ?? 0, copiesBefore: 4616, copiesAfter,
  lists: { leaving: empty, down: empty, up: empty }, newHoldings: 0, distinctCards: 0, overlap: { held: 0, of: 0 }, allOwned: false,
});
const counts = { taken: 0, kept: 0, agreed: 0, unchanged: 0, conflicts: 0, undecided: 0, answeredFile: 0, ignored: 0 };
const common = { raised: 0, lowered: 0, decks: [], editsSinceUpload: 4, lastUploadAt: "2026-10-02T12:00:00.000Z", historyReaches: true };
const plain = (copiesAfter: number) => ({ ...common, detail: detail(copiesAfter) });
// The file reads 114 tokens; a sync with a token change changes 40 of them (the rest are recorded at the file's count).
type SyncOver = { stale?: "older" | "noNewer" | null; unavailable?: "noRecord" | "neverUploaded" | null; kept?: number; taken?: number; tokensChange?: boolean };
const syncData = (copiesAfter: number, more: Parameters<typeof detail>[1], over: SyncOver, digest: string) => ({
  ...common,
  detail: detail(copiesAfter, more),
  sync: {
    unavailable: over.unavailable ?? null, pick: "everything", counts: { ...counts, kept: over.kept ?? 0, taken: over.taken ?? 0 },
    conflicts: empty, kept: empty, stale: over.stale ?? null, tokens: { count: 114, copies: 313 },
    tokensChange: over.tokensChange ?? false, tokensChanged: over.tokensChange ? 40 : 0, nothing: false, planDigest: digest,
  },
});

async function reachChoice(sync: boolean) {
  previewPaste.mockResolvedValueOnce(preview);
  render(<ReplaceFlow currentCardCount={10} deckCheck sync={sync} />);
  fireEvent.click(screen.getAllByRole("button", { name: /Paste a list instead/ })[0]);
  fireEvent.change(screen.getByRole("textbox", { name: "Paste your card list" }), { target: { value: "3 Sol Ring" } });
  fireEvent.click(screen.getByRole("button", { name: /^Preview/ }));
  return screen.findByRole("radiogroup");
}

describe("ReplaceFlow · the Sync choice", () => {
  beforeEach(() => {
    previewPaste.mockReset();
    previewChange.mockReset();
    confirmUpload.mockReset();
  });

  it("with the switch off, reads and draws no Sync: two cards and the shipped title", async () => {
    previewChange.mockImplementation(async (_id: string, mode: string) => plain(mode === "add" ? 8961 : 4345));
    await reachChoice(false);
    expect(previewChange.mock.calls.map((c) => c[1])).toEqual(["replace", "add"]);
    expect(screen.getAllByRole("radio").map((r) => r.getAttribute("data-choice"))).toEqual(["replace", "add"]);
    expect(screen.queryByText("What’s this file for?")).toBeNull();
  });

  it("with the switch on, reads the plain Sync and draws it third, its Continue held until its review ships", async () => {
    previewChange.mockImplementation(async (_id: string, mode: string) =>
      mode === "sync" ? syncData(4632, { up: 18 }, { kept: 121, taken: 18 }, "d-all") : plain(mode === "add" ? 8961 : 4345));
    await reachChoice(true);
    expect(previewChange).toHaveBeenCalledWith("up_1", "sync");
    const card = screen.getByRole("radio", { name: /Sync my collection/ });
    expect(within(card).getByText("4,616 → 4,632 cards")).toBeTruthy();
    expect(within(card).getByText("Keeps the 121 cards you changed in the app since your Oct 2 upload.")).toBeTruthy();
    fireEvent.click(card);
    expect(card.getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("button", { name: "Review the sync →" })).toBeDisabled();
    // Replace still reaches its review from the same choice.
    fireEvent.click(screen.getByRole("radio", { name: /Replace my collection/ }));
    expect(screen.getByRole("button", { name: "Review the replace →" })).toBeEnabled();
  });

  it("leaves Replace and Add standing when the Sync read fails", async () => {
    previewChange.mockImplementation(async (_id: string, mode: string) => {
      if (mode === "sync") throw new Error("boom");
      return plain(mode === "add" ? 8961 : 4345);
    });
    await reachChoice(true);
    expect(screen.getAllByRole("radio").map((r) => r.getAttribute("data-choice"))).toEqual(["replace", "add"]);
  });

  it("draws an unavailable Sync that a press cannot pick", async () => {
    previewChange.mockImplementation(async (_id: string, mode: string) =>
      mode === "sync" ? syncData(4616, {}, { unavailable: "noRecord" }, "") : plain(mode === "add" ? 8961 : 4345));
    await reachChoice(true);
    const card = screen.getByRole("radio", { name: "Sync my collection" });
    expect(card.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(card);
    expect(card.getAttribute("aria-checked")).toBe("false");
  });

  it("under an older file, pre-picks what it adds from its own dry run, and reads each other pick once", async () => {
    previewChange.mockImplementation(async (_id: string, mode: string, opts?: { pick?: string }) => {
      if (mode !== "sync") return plain(mode === "add" ? 8961 : 4345);
      if (opts?.pick === "additions") return syncData(4619, { up: 3 }, { stale: "older", kept: 121, taken: 3, tokensChange: true }, "d-adds");
      if (opts?.pick === "tokens") return syncData(4616, {}, { stale: "older", kept: 121, tokensChange: true }, "d-tokens");
      return syncData(4580, { up: 3, leaving: 16, down: 2 }, { stale: "older", kept: 121, taken: 21 }, "d-all");
    });
    await reachChoice(true);
    expect(screen.getByText("This file looks older than your Oct 2 upload.")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /Sync my collection/ }));
    const group = await screen.findByRole("group", { name: "What should Sync take from this file?" });
    expect((within(group).getByRole("radio", { name: /Only what it adds/ }) as HTMLInputElement).checked).toBe(true);
    // The card's figure follows the pick: Only what it adds' own dry run.
    await screen.findByText("4,616 → 4,619 cards");
    expect(within(group).getByText("3 cards going up or new, and its 114 tokens. Nothing leaves or goes down.")).toBeTruthy();
    expect(within(group).getByText("3 going up or new, 16 leaving, 2 going down, and its 114 tokens.")).toBeTruthy();
    // The lead-in counts the tokens this sync changes, not every token the file reads.
    expect(screen.getByText("Next: the 3 cards and 40 tokens this sync takes. Nothing leaves.")).toBeTruthy();

    fireEvent.click(within(group).getByRole("radio", { name: /Only its tokens/ }));
    await screen.findByText("Your cards stay as they are. Sync records the file’s 114 tokens.");
    expect(screen.getByText("4,616 → 4,616 cards")).toBeTruthy();
    fireEvent.click(within(group).getByRole("radio", { name: /Everything, removals too/ }));
    expect(await screen.findByText("4,616 → 4,580 cards")).toBeTruthy();

    // Leaving Sync hides the follow-up and keeps its answer: Everything, not the default.
    fireEvent.click(screen.getByRole("radio", { name: /Add these cards/ }));
    expect(screen.queryByRole("group")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: /Sync my collection/ }));
    const back = screen.getByRole("group", { name: "What should Sync take from this file?" });
    expect((within(back).getByRole("radio", { name: /Everything, removals too/ }) as HTMLInputElement).checked).toBe(true);
    expect((within(back).getByRole("radio", { name: /Only what it adds/ }) as HTMLInputElement).checked).toBe(false);
    expect(screen.getByText("4,616 → 4,580 cards")).toBeTruthy();

    const picks = previewChange.mock.calls.filter((c) => c[1] === "sync").map((c) => (c[2] as { pick?: string } | undefined)?.pick ?? "plain");
    expect(picks.sort()).toEqual(["additions", "plain", "tokens"]);
  });

  it("draws no follow-up for a file whose cards match the last upload (S1)", async () => {
    previewChange.mockImplementation(async (_id: string, mode: string) =>
      mode === "sync" ? syncData(4616, {}, { stale: "noNewer", kept: 121, tokensChange: true }, "d") : plain(mode === "add" ? 8961 : 4345));
    await reachChoice(true);
    // The banner names the tokens this sync would record (40), not the file's 114.
    expect(screen.getByText("This file looks no newer than your Oct 2 upload.").parentElement!.textContent).toContain(
      "What it does have is 40 tokens your collection hasn’t recorded.",
    );
    fireEvent.click(screen.getByRole("radio", { name: /Sync my collection/ }));
    expect(screen.getByText("Your cards stay as they are. Sync records the file’s 114 tokens.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("group")).toBeNull());
    expect(previewChange.mock.calls.filter((c) => c[1] === "sync")).toHaveLength(1);
  });
});
