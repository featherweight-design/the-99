import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
const detail = (copiesAfter: number, more: { up?: number; leaving?: number; down?: number; before?: number } = {}) => ({
  unchanged: 0, up: more.up ?? 0, down: more.down ?? 0, leaving: more.leaving ?? 0, copiesBefore: more.before ?? 4616, copiesAfter,
  lists: { leaving: empty, down: empty, up: empty }, newHoldings: 0, distinctCards: 0, overlap: { held: 0, of: 0 }, allOwned: false,
});
const counts = { taken: 0, kept: 0, agreed: 0, unchanged: 0, conflicts: 0, undecided: 0, answeredFile: 0, ignored: 0 };
const common = { raised: 0, lowered: 0, decks: [], editsSinceUpload: 4, lastUploadAt: "2026-10-02T12:00:00.000Z", historyReaches: true };
const plain = (copiesAfter: number) => ({ ...common, detail: detail(copiesAfter) });
// The file reads 114 tokens (unless `fileTokens` says otherwise); each read says how many tokens it changes by
// count (`changed`). The anchor (Sep 28) is not the newest upload (Oct 2, an Add): Sync names the anchor's date.
type SyncOver = {
  stale?: "older" | "noNewer" | null; unavailable?: "noRecord" | "neverUploaded" | null; kept?: number; taken?: number;
  changed?: number; missing?: number; fileTokens?: number;
};
const syncData = (copiesAfter: number, more: Parameters<typeof detail>[1], over: SyncOver, digest: string) => ({
  ...common,
  detail: detail(copiesAfter, more),
  sync: {
    unavailable: over.unavailable ?? null, pick: "everything", counts: { ...counts, kept: over.kept ?? 0, taken: over.taken ?? 0 },
    conflicts: empty, kept: empty, stale: over.stale ?? null, tokens: { count: over.fileTokens ?? 114, copies: over.fileTokens ?? 313 },
    anchorConfirmedAt: over.unavailable ? null : "2026-09-28T12:00:00.000Z", missingFromAnchor: over.missing ?? 0, raisingConflicts: 0,
    tokensChange: (over.changed ?? 0) > 0, tokensChanged: over.changed ?? 0, nothing: false, planDigest: digest,
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

  it("with the switch on, reads the plain Sync and draws it third, and its Continue opens Sync's review", async () => {
    previewChange.mockImplementation(async (_id: string, mode: string) =>
      mode === "sync" ? syncData(4632, { up: 18 }, { kept: 121, taken: 18 }, "d-all") : plain(mode === "add" ? 8961 : 4345));
    await reachChoice(true);
    expect(previewChange).toHaveBeenCalledWith("up_1", "sync");
    const card = screen.getByRole("radio", { name: /Sync my collection/ });
    expect(within(card).getByText("4,616 → 4,632 cards")).toBeTruthy();
    // The anchor's date, while Replace's warning still names the newest upload's.
    expect(within(card).getByText("Keeps the 121 cards you changed in the app since your Sep 28 upload.")).toBeTruthy();
    expect(screen.getByText("4 changes you made in the app since your Oct 2 upload will be overwritten.")).toBeTruthy();
    fireEvent.click(card);
    expect(card.getAttribute("aria-checked")).toBe("true");
    // Replace still reaches its review from the same choice.
    fireEvent.click(screen.getByRole("radio", { name: /Replace my collection/ }));
    expect(screen.getByRole("button", { name: "Review the replace →" })).toBeEnabled();
    fireEvent.click(screen.getByRole("radio", { name: /Sync my collection/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review the sync →" }));
    expect(await screen.findByRole("heading", { name: "Review before you sync" })).toBeTruthy();
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
      if (opts?.pick === "additions") return syncData(4619, { up: 3, before: 4617 }, { stale: "older", kept: 121, taken: 3, changed: 40 }, "d-adds");
      if (opts?.pick === "tokens") return syncData(4616, {}, { stale: "older", kept: 121, changed: 38 }, "d-tokens");
      return syncData(4580, { up: 3, leaving: 16, down: 2 }, { stale: "older", kept: 121, taken: 21, changed: 44, missing: 12 }, "d-all");
    });
    await reachChoice(true);
    // The anchor's date, and the holdings the file lacks against the anchor's file (12), not the planned removals (16).
    expect(screen.getByText("This file looks older than your Sep 28 upload.").parentElement!.textContent).toContain("It’s missing 12 cards");
    fireEvent.click(screen.getByRole("radio", { name: /Sync my collection/ }));
    const group = await screen.findByRole("group", { name: "What should Sync take from this file?" });
    expect((within(group).getByRole("radio", { name: /Only what it adds/ }) as HTMLInputElement).checked).toBe(true);
    // The card's figure follows the pick: BOTH ends from Only what it adds' own dry run (its before is 4,617).
    await screen.findByText("4,617 → 4,619 cards");
    // Every option quotes the tokens ITS OWN read changes: 40, 38 and 44, never the file's 114.
    expect(within(group).getByText("3 cards going up or new, and 40 token changes. Nothing leaves or goes down.")).toBeTruthy();
    expect(within(group).getByText("38 tokens change. Your cards stay as they are.")).toBeTruthy();
    expect(within(group).getByText("3 going up or new, 16 leaving, 2 going down, and 44 token changes.")).toBeTruthy();
    // The lead-in is the same figure as the option picked.
    expect(screen.getByText("Next: the 3 cards this sync takes, and 40 token changes. Nothing leaves.")).toBeTruthy();

    fireEvent.click(within(group).getByRole("radio", { name: /Only its tokens/ }));
    await screen.findByText("Your cards stay as they are. 38 tokens change.");
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

  it("takes Sync back to the choice when a pick's own read finds the base gone, never opening `Nothing to sync`", async () => {
    let release: (v: unknown) => void = () => {};
    previewChange.mockImplementation(async (_id: string, mode: string, opts?: { pick?: string }) => {
      if (mode !== "sync") return plain(mode === "add" ? 8961 : 4345);
      // The anchor goes between the plain read and Only what it adds' own.
      if (opts?.pick === "additions")
        return new Promise((resolve) => {
          const gone = syncData(4617, {}, { unavailable: "noRecord" }, "");
          release = () => resolve({ ...gone, sync: { ...gone.sync, nothing: true } });
        });
      if (opts?.pick === "tokens") return syncData(4616, {}, { stale: "older", kept: 121, changed: 38 }, "d-tokens");
      return syncData(4580, { up: 3, leaving: 16, down: 2 }, { stale: "older", kept: 121, taken: 21, changed: 44, missing: 12 }, "d-all");
    });
    await reachChoice(true);
    fireEvent.click(screen.getByRole("radio", { name: /Sync my collection/ }));
    await screen.findByRole("group", { name: "What should Sync take from this file?" });
    await act(async () => release(undefined));
    const card = screen.getByRole("radio", { name: "Sync my collection" });
    expect(card.getAttribute("aria-disabled")).toBe("true");
    expect(card.getAttribute("aria-checked")).toBe("false");
    const go = screen.queryByRole("button", { name: "Review the sync →" });
    if (go) fireEvent.click(go);
    expect(screen.queryByRole("heading", { name: "Review before you sync" })).toBeNull();
    expect(screen.queryByText(/^Nothing to sync\./)).toBeNull();
  });

  it("leaves a Replace review standing when a pick's read finds the base gone", async () => {
    let release: (v: unknown) => void = () => {};
    previewChange.mockImplementation(async (_id: string, mode: string, opts?: { pick?: string }) => {
      if (mode !== "sync") return plain(mode === "add" ? 8961 : 4345);
      if (opts?.pick === "tokens") return new Promise((resolve) => { release = () => resolve(syncData(4616, {}, { unavailable: "noRecord" }, "")); });
      if (opts?.pick === "additions") return syncData(4619, { up: 3, before: 4617 }, { stale: "older", kept: 121, taken: 3, changed: 40 }, "d-adds");
      return syncData(4580, { up: 3, leaving: 16, down: 2 }, { stale: "older", kept: 121, taken: 21, changed: 44, missing: 12 }, "d-all");
    });
    await reachChoice(true);
    fireEvent.click(screen.getByRole("radio", { name: /Replace my collection/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review the replace →" }));
    await screen.findByRole("heading", { name: /Review before you replace/ });
    await act(async () => release(undefined));
    expect(screen.getByRole("heading", { name: /Review before you replace/ })).toBeTruthy();
  });

  it("draws no follow-up for a file whose cards match the last upload (S1)", async () => {
    previewChange.mockImplementation(async (_id: string, mode: string) =>
      mode === "sync" ? syncData(4616, {}, { stale: "noNewer", kept: 121, changed: 40 }, "d") : plain(mode === "add" ? 8961 : 4345));
    await reachChoice(true);
    // The banner names the same figure as the note: the tokens the sync changes by count (40), never the file's 114.
    expect(screen.getByText("This file looks no newer than your Sep 28 upload.").parentElement!.textContent).toContain(
      "Its cards match that upload exactly. Syncing it changes 40 tokens.",
    );
    fireEvent.click(screen.getByRole("radio", { name: /Sync my collection/ }));
    // The note quotes the tokens the sync changes by count (40).
    expect(screen.getByText("Your cards stay as they are. 40 tokens change.")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("group")).toBeNull());
    expect(previewChange.mock.calls.filter((c) => c[1] === "sync")).toHaveLength(1);
  });

  it("reads a removal as a change: an EMPTY token file and one upload-owned token", async () => {
    // The file's cards match the anchor and it reads no token; the one token an earlier upload recorded goes.
    previewChange.mockImplementation(async (_id: string, mode: string) =>
      mode === "sync" ? syncData(4616, {}, { stale: "noNewer", changed: 1, fileTokens: 0 }, "d") : plain(mode === "add" ? 8961 : 4345));
    await reachChoice(true);
    const banner = screen.getByRole("note");
    expect(banner.textContent).toContain("Its cards match that upload exactly. Syncing it changes 1 token.");
    fireEvent.click(screen.getByRole("radio", { name: /Sync my collection/ }));
    expect(screen.getByText("Your cards stay as they are. 1 token changes.")).toBeTruthy();
    expect(screen.getByText("Next: the tokens this sync changes. Your cards don’t move.")).toBeTruthy();
    // Nothing on the step reads as recording, or as something unrecorded.
    expect(document.body.textContent).not.toMatch(/record|unrecorded|its \d+ tokens?/i);
  });

  describe("the follow-up's own reads", () => {
    const older = (mode: string, pick?: string) => {
      if (mode !== "sync") return plain(mode === "add" ? 8961 : 4345);
      if (pick === "additions") return syncData(4619, { up: 3 }, { stale: "older", kept: 121, taken: 3, changed: 40 }, "d-adds");
      if (pick === "tokens") return syncData(4616, {}, { stale: "older", kept: 121, changed: 38 }, "d-tokens");
      return syncData(4580, { up: 3, leaving: 16, down: 2 }, { stale: "older", kept: 121, taken: 21, changed: 44, missing: 12 }, "d-all");
    };
    const syncPicks = () => previewChange.mock.calls.filter((c) => c[1] === "sync").map((c) => (c[2] as { pick?: string } | undefined)?.pick ?? "plain");

    it("reads each pick exactly once when the pick changes while its read is in flight", async () => {
      // The partial picks' reads are held until the test lets them land.
      const held: { pick: string; land: () => void }[] = [];
      previewChange.mockImplementation((_id: string, mode: string, opts?: { pick?: string }) => {
        if (mode === "sync" && opts?.pick) {
          return new Promise((resolve) => held.push({ pick: opts.pick!, land: () => resolve(older(mode, opts.pick)) }));
        }
        return Promise.resolve(older(mode));
      });
      await reachChoice(true);
      fireEvent.click(screen.getByRole("radio", { name: /Sync my collection/ }));
      const group = await screen.findByRole("group", { name: "What should Sync take from this file?" });
      await waitFor(() => expect(held.map((h) => h.pick).sort()).toEqual(["additions", "tokens"]));
      // Flip the pick back and forth with both reads still pending.
      fireEvent.click(within(group).getByRole("radio", { name: /Only its tokens/ }));
      fireEvent.click(within(group).getByRole("radio", { name: /Only what it adds/ }));
      fireEvent.click(within(group).getByRole("radio", { name: /Only its tokens/ }));
      await act(async () => {
        held.find((h) => h.pick === "additions")!.land();
        held.find((h) => h.pick === "tokens")!.land();
      });
      // Both results were kept, whatever was selected when they landed.
      expect(await screen.findByText("4,616 → 4,616 cards")).toBeTruthy();
      fireEvent.click(within(group).getByRole("radio", { name: /Only what it adds/ }));
      expect(await screen.findByText("4,616 → 4,619 cards")).toBeTruthy();
      expect(syncPicks().sort()).toEqual(["additions", "plain", "tokens"]);
    });

    it("offers Try again on a failed pick read, re-reads only that pick, and keeps the selection", async () => {
      let tokensFails = true;
      previewChange.mockImplementation(async (_id: string, mode: string, opts?: { pick?: string }) => {
        if (mode === "sync" && opts?.pick === "tokens" && tokensFails) throw new Error("boom");
        return older(mode, opts?.pick);
      });
      await reachChoice(true);
      fireEvent.click(screen.getByRole("radio", { name: /Sync my collection/ }));
      const group = await screen.findByRole("group", { name: "What should Sync take from this file?" });
      fireEvent.click(within(group).getByRole("radio", { name: /Only its tokens/ }));
      await screen.findByText("We couldn’t read how this file compares to your collection. Nothing was changed.");
      tokensFails = false;
      fireEvent.click(screen.getByRole("button", { name: "Try again" }));
      expect(await screen.findByText("4,616 → 4,616 cards")).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
      expect((within(group).getByRole("radio", { name: /Only its tokens/ }) as HTMLInputElement).checked).toBe(true);
      expect(screen.getByRole("radio", { name: /Sync my collection/ }).getAttribute("aria-checked")).toBe("true");
      // The plain read and Only what it adds were read once; only the failed pick was read again.
      expect(syncPicks().sort()).toEqual(["additions", "plain", "tokens", "tokens"]);
    });
  });
});
