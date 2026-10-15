import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadPreview } from "../../app/collection/actions";
import type { SyncAnswers, SyncReviewRow } from "../../lib/collection/sync";
import type { ShortDeck } from "../../lib/collection/write";

// Collection Sync, the review in the flow (plan PR 3): each answer re-reads the dry run so every figure and the
// digest stay the server's, the newest read wins, and each of Sync's confirm refusals is answered in place.

const go = vi.fn();
vi.mock("../shell/pending-push", () => ({ usePendingPush: () => ({ go }) }));
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
const detail = (copiesAfter: number) => ({
  unchanged: 0, up: 15, down: 0, leaving: 0, copiesBefore: 4616, copiesAfter,
  lists: { leaving: empty, down: empty, up: empty }, newHoldings: 0, distinctCards: 0, overlap: { held: 0, of: 0 }, allOwned: false,
});
const common = { raised: 0, lowered: 0, decks: [], editsSinceUpload: 4, lastUploadAt: "2026-10-02T12:00:00.000Z", historyReaches: true };
const plain = (copiesAfter: number) => ({ ...common, detail: detail(copiesAfter) });
const conflict = (i: number, name: string): SyncReviewRow => ({
  oracleId: `o${i}`, setCode: "cmm", collectorNumber: String(i), finish: "nonfoil", key: `o${i}|cmm|${i}|nonfoil`, name, base: 1, app: 3, file: 2,
});
const baseRows = [conflict(1, "Arcane Signet"), conflict(2, "Esper Sentinel"), conflict(3, "Swords to Plowshares")];
const rows = baseRows;
const shortDeck: ShortDeck = { deckId: "d1", deckName: "Tithe and Tax", oracleId: "o9", cardName: "Smothering Tithe", short: 1 };

/** A sync read under `answers`, its figures following them the way the engine's would. */
function syncRead(
  answers: SyncAnswers = {},
  over: { nothing?: boolean; digest?: string; unavailable?: "noRecord"; extra?: SyncReviewRow[]; decks?: ShortDeck[] } = {},
) {
  const rows = [...baseRows, ...(over.extra ?? [])];
  const side = (r: SyncReviewRow) => answers.byKey?.[r.key] ?? answers.all;
  const file = rows.filter((r) => side(r) === "file").length;
  const undecided = rows.filter((r) => !side(r)).length;
  return {
    ...common,
    decks: over.decks ?? [],
    detail: detail(4632),
    sync: {
      unavailable: over.unavailable ?? null, pick: "everything",
      counts: { taken: 15, kept: 119, agreed: 0, unchanged: 3385, conflicts: rows.length, undecided, answeredFile: file, ignored: 0 },
      conflicts: { rows: rows.map((r) => (side(r) ? { ...r, answer: side(r) } : r)), total: rows.length },
      kept: empty, stale: null, anchorConfirmedAt: "2026-10-02T12:00:00.000Z", missingFromAnchor: 0, raisingConflicts: 1,
      tokens: { count: 114, copies: 313 }, tokensChange: true, tokensChanged: 114, nothing: over.nothing ?? false,
      planDigest: over.digest ?? `d:${JSON.stringify(answers)}`,
    },
  };
}

function choiceReads(sync: (opts?: { answers?: SyncAnswers }) => unknown = (o) => syncRead(o?.answers)) {
  previewChange.mockImplementation(async (_id: string, mode: string, opts?: { answers?: SyncAnswers }) =>
    mode === "sync" ? sync(opts) : plain(mode === "add" ? 8961 : 4345));
}

async function reachSyncReview() {
  previewPaste.mockResolvedValueOnce(preview);
  render(<ReplaceFlow currentCardCount={10} deckCheck sync />);
  fireEvent.click(screen.getAllByRole("button", { name: /Paste a list instead/ })[0]);
  fireEvent.change(screen.getByRole("textbox", { name: "Paste your card list" }), { target: { value: "3 Sol Ring" } });
  fireEvent.click(screen.getByRole("button", { name: /^Preview/ }));
  fireEvent.click(await screen.findByRole("radio", { name: /Sync my collection/ }));
  fireEvent.click(screen.getByRole("button", { name: "Review the sync →" }));
  await screen.findByRole("heading", { name: "Review before you sync" });
}

const tiles = () => [...document.querySelector("[aria-live]")!.children].map((t) => t.textContent);
const row = (name: string) => screen.getByRole("group", { name: new RegExp(`^${name},`) });
const syncCalls = () => previewChange.mock.calls.filter((c) => c[1] === "sync");

describe("ReplaceFlow · the Sync review", () => {
  beforeEach(() => {
    previewPaste.mockReset();
    previewChange.mockReset();
    confirmUpload.mockReset();
    go.mockReset();
  });

  it("re-reads on each answer, so the tiles and the digest the confirm sends are the server's", async () => {
    choiceReads();
    await reachSyncReview();
    expect(tiles()[0]).toBe("3to decide");
    fireEvent.click(within(row("Arcane Signet")).getByRole("radio", { name: "App ×3" }));
    await waitFor(() => expect(tiles()[0]).toBe("2to decide"));
    expect(syncCalls().at(-1)?.[2]).toEqual({ pick: "everything", answers: { byKey: { [rows[0].key]: "app" } } });

    fireEvent.click(screen.getByRole("button", { name: "Take the file’s for all 3" }));
    await waitFor(() => expect(tiles()).toEqual(["0to decide", "18from the file", "119kept from The 99", "3,385nothing to do"]));
    // Only conflicts answered File overwrite the player's work.
    expect(screen.getByText(/Taking the file’s count overwrites 3 cards/)).toBeTruthy();

    confirmUpload.mockResolvedValueOnce(undefined);
    fireEvent.click(screen.getByRole("button", { name: "Sync collection" }));
    await waitFor(() => expect(confirmUpload).toHaveBeenCalled());
    expect(confirmUpload.mock.calls[0][1]).toMatchObject({ mode: "sync", pick: "everything", answers: { all: "file" }, planDigest: 'd:{"all":"file"}' });
    await waitFor(() => expect(go).toHaveBeenCalledWith("/collection/replace/summary/up_1"));
    // Four debounced reads and a confirm: given room on a loaded machine.
  }, 15_000);

  it("draws the newest read and drops an older one that lands late", async () => {
    let releaseFirst: (v: unknown) => void = () => {};
    choiceReads((o) => {
      const byKey = o?.answers?.byKey ?? {};
      // The first answer's read hangs until released; the second lands at once.
      if (Object.keys(byKey).length === 1) return new Promise((resolve) => { releaseFirst = () => resolve(syncRead(o?.answers)); });
      return syncRead(o?.answers);
    });
    await reachSyncReview();
    fireEvent.click(within(row("Arcane Signet")).getByRole("radio", { name: "App ×3" }));
    const before = syncCalls().length;
    await waitFor(() => expect(syncCalls().length).toBe(before + 1));
    fireEvent.click(within(row("Esper Sentinel")).getByRole("radio", { name: "App ×3" }));
    await waitFor(() => expect(tiles()[0]).toBe("1to decide"));
    await act(async () => releaseFirst(undefined));
    // The first answer's read (2 to decide) landed after the newer one, and is not drawn.
    expect(tiles()[0]).toBe("1to decide");
  });

  it("keeps the answers across Back to the choice and into the review again", async () => {
    choiceReads();
    await reachSyncReview();
    fireEvent.click(screen.getByRole("button", { name: "Keep the app’s for all 3" }));
    await waitFor(() => expect(tiles()[0]).toBe("0to decide"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(await screen.findByRole("button", { name: "Review the sync →" }));
    await waitFor(() => expect(tiles()[0]).toBe("0to decide"));
    expect(screen.getByRole("button", { name: "Keep the app’s for all 3" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("answers `undecided` with a fresh read and the first card left focused", async () => {
    choiceReads();
    await reachSyncReview();
    // A stale screen that thought everything was answered: the server still finds one open.
    fireEvent.click(screen.getByRole("button", { name: "Keep the app’s for all 3" }));
    await waitFor(() => expect(tiles()[0]).toBe("0to decide"));
    fireEvent.click(within(row("Esper Sentinel")).getByRole("radio", { name: "File ×2" }));
    await screen.findByText(/overwrites 1 card /);
    const before = syncCalls().length;
    confirmUpload.mockResolvedValueOnce({ undecided: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Sync collection" }));
    await waitFor(() => expect(syncCalls().length).toBe(before + 1));
    // Every shipped row reads answered here, so focus stands on the section itself; no toast, no alert.
    await waitFor(() => expect(document.activeElement?.getAttribute("aria-labelledby")).toBe("sync-conflicts-heading"));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("answers `stale` by reading again with the same answers and saying the figures moved", async () => {
    choiceReads();
    await reachSyncReview();
    fireEvent.click(screen.getByRole("button", { name: "Keep the app’s for all 3" }));
    await waitFor(() => expect(tiles()[0]).toBe("0to decide"));
    const before = syncCalls().length;
    confirmUpload.mockResolvedValueOnce({ stale: true });
    fireEvent.click(screen.getByRole("button", { name: "Sync collection" }));
    await screen.findByText(/This changed while you were deciding\./);
    expect(syncCalls().length).toBe(before + 1);
    expect(syncCalls().at(-1)?.[2]).toEqual({ pick: "everything", answers: { all: "app" } });
    expect(screen.getByRole("button", { name: "Keep the app’s for all 3" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("answers `nothingToSync` with the nothing-to-sync state and only the way back", async () => {
    let nothing = false;
    choiceReads((o) => syncRead(o?.answers, { nothing }));
    await reachSyncReview();
    fireEvent.click(screen.getByRole("button", { name: "Keep the app’s for all 3" }));
    await waitFor(() => expect(tiles()[0]).toBe("0to decide"));
    nothing = true;
    confirmUpload.mockResolvedValueOnce({ nothingToSync: true });
    fireEvent.click(screen.getByRole("button", { name: "Sync collection" }));
    await screen.findByText(/^Nothing to sync\./);
    fireEvent.click(screen.getByRole("button", { name: "Back to Collection" }));
    expect(go).toHaveBeenCalledWith("/collection");
  });

  it("answers `unavailable` by going back to the choice, where the Sync card says why", async () => {
    choiceReads();
    await reachSyncReview();
    fireEvent.click(screen.getByRole("button", { name: "Keep the app’s for all 3" }));
    await waitFor(() => expect(tiles()[0]).toBe("0to decide"));
    confirmUpload.mockResolvedValueOnce({ unavailable: "noRecord" });
    fireEvent.click(screen.getByRole("button", { name: "Sync collection" }));
    const card = await screen.findByRole("radio", { name: "Sync my collection" });
    expect(card.getAttribute("aria-disabled")).toBe("true");
    expect(card.getAttribute("aria-checked")).toBe("false");
  });

  it("keeps the review and the answers through a failed confirm (A5)", async () => {
    choiceReads();
    await reachSyncReview();
    fireEvent.click(screen.getByRole("button", { name: "Keep the app’s for all 3" }));
    await waitFor(() => expect(tiles()[0]).toBe("0to decide"));
    confirmUpload.mockRejectedValueOnce(new Error("boom"));
    fireEvent.click(screen.getByRole("button", { name: "Sync collection" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn’t sync that");
    expect(screen.getByRole("alert")).toHaveTextContent("Your collection is unchanged, and this review is still here.");
    expect(screen.getByRole("button", { name: "Keep the app’s for all 3" }).getAttribute("aria-pressed")).toBe("true");
  });

  it("clears the failure alert once a later re-read lands", async () => {
    choiceReads();
    await reachSyncReview();
    fireEvent.click(screen.getByRole("button", { name: "Keep the app’s for all 3" }));
    await waitFor(() => expect(tiles()[0]).toBe("0to decide"));
    confirmUpload.mockRejectedValueOnce(new Error("boom"));
    fireEvent.click(screen.getByRole("button", { name: "Sync collection" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn’t sync that");
    // A new answer re-reads; the fresh figures are not drawn under the old failure.
    fireEvent.click(within(row("Esper Sentinel")).getByRole("radio", { name: "File ×2" }));
    await screen.findByText(/overwrites 1 card /);
    expect(screen.queryByRole("alert")).toBeNull();
  });
  it("answers a failed re-read's Try again with another read, never a write past the held bar", async () => {
    let fail = false;
    choiceReads((o) => (fail ? Promise.reject(new Error("read failed")) : syncRead(o?.answers)));
    await reachSyncReview();
    expect(tiles()[0]).toBe("3to decide");
    fail = true;
    // Answering App leaves the digest a write would check unchanged: only the read decides it.
    fireEvent.click(screen.getByRole("button", { name: "Keep the app’s for all 3" }));
    await screen.findByRole("alert");
    // The figures are the previous read's: still three to decide.
    expect(tiles()[0]).toBe("3to decide");
    fail = false;
    const before = syncCalls().length;
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(tiles()[0]).toBe("0to decide"));
    expect(syncCalls().length).toBe(before + 1);
    expect(syncCalls().at(-1)?.[2]).toEqual({ pick: "everything", answers: { all: "app" } });
    expect(confirmUpload).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("routes a failed write's Try again through Sync's short-deck dialog, never acknowledging the shortage itself", async () => {
    choiceReads((o) => syncRead(o?.answers, { decks: [shortDeck] }));
    await reachSyncReview();
    fireEvent.click(screen.getByRole("button", { name: "Keep the app’s for all 3" }));
    await waitFor(() => expect(tiles()[0]).toBe("0to decide"));
    fireEvent.click(screen.getByRole("button", { name: "Sync collection" }));
    confirmUpload.mockRejectedValueOnce(new Error("boom"));
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Sync anyway" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn’t sync that");
    expect(confirmUpload).toHaveBeenCalledTimes(1);
    fireEvent.click(within(screen.getByRole("alert")).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("dialog", { name: "Syncing leaves a deck short" })).toBeTruthy();
    expect(confirmUpload).toHaveBeenCalledTimes(1);
  });

  it("goes back to the choice when a re-read finds the base gone, never drawing `already has everything`", async () => {
    let gone = false;
    choiceReads((o) => syncRead(o?.answers, gone ? { unavailable: "noRecord", nothing: true } : {}));
    await reachSyncReview();
    gone = true;
    fireEvent.click(screen.getByRole("button", { name: "Keep the app’s for all 3" }));
    const card = await screen.findByRole("radio", { name: "Sync my collection" });
    expect(card.getAttribute("aria-disabled")).toBe("true");
    expect(screen.queryByText(/already has everything/)).toBeNull();
    expect(screen.queryByRole("heading", { name: "Review before you sync" })).toBeNull();
  });

  it("goes back to the choice when a thrown confirm's own re-read finds the base gone", async () => {
    let gone = false;
    choiceReads((o) => syncRead(o?.answers, gone ? { unavailable: "noRecord", nothing: true } : {}));
    await reachSyncReview();
    fireEvent.click(screen.getByRole("button", { name: "Keep the app’s for all 3" }));
    await waitFor(() => expect(tiles()[0]).toBe("0to decide"));
    confirmUpload.mockImplementationOnce(async () => {
      gone = true;
      throw new Error("boom");
    });
    fireEvent.click(screen.getByRole("button", { name: "Sync collection" }));
    const card = await screen.findByRole("radio", { name: "Sync my collection" });
    expect(card.getAttribute("aria-disabled")).toBe("true");
    expect(screen.queryByRole("heading", { name: "Review before you sync" })).toBeNull();
  });

  it("drops a Sync read still in flight once the reader leaves for another review", async () => {
    let release: (v: unknown) => void = () => {};
    choiceReads((o) => {
      if (o?.answers?.all === "app") return new Promise((resolve) => { release = () => resolve(syncRead(o.answers, { decks: [shortDeck] })); });
      return syncRead(o?.answers);
    });
    await reachSyncReview();
    fireEvent.click(screen.getByRole("button", { name: "Keep the app’s for all 3" }));
    await waitFor(() => expect(syncCalls().at(-1)?.[2]).toEqual({ pick: "everything", answers: { all: "app" } }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(await screen.findByRole("radio", { name: /Replace my collection/ }));
    fireEvent.click(screen.getByRole("button", { name: "Review the replace →" }));
    await screen.findByRole("heading", { name: /Review before you replace/ });
    await act(async () => release(undefined));
    // The Sync read's short deck never lands on the Replace review.
    expect(screen.queryByText(/Decks that will read short/)).toBeNull();
    expect(screen.getByRole("heading", { name: /Review before you replace/ })).toBeTruthy();
  });

  it("focuses a conflict the drawn review never showed, once the re-read an `undecided` asks for has drawn it", async () => {
    const late = conflict(4, "Teferi's Protection");
    let more = false;
    choiceReads((o) => syncRead(o?.answers, more ? { extra: [late] } : {}));
    await reachSyncReview();
    for (const name of ["Arcane Signet", "Esper Sentinel", "Swords to Plowshares"]) {
      fireEvent.click(within(row(name)).getByRole("radio", { name: "App ×3" }));
      await waitFor(() => expect(within(row(name)).getByRole("radio", { name: "App ×3" })).toBeChecked());
    }
    await waitFor(() => expect(tiles()[0]).toBe("0to decide"));
    more = true;
    confirmUpload.mockResolvedValueOnce({ undecided: 1 });
    fireEvent.click(screen.getByRole("button", { name: "Sync collection" }));
    await waitFor(() => expect(document.activeElement).toBe(within(row("Teferi's Protection")).getByRole("radio", { name: "App ×3" })));
  }, 15_000);

  it("asks in Sync's own short-deck dialog before the shortage is acknowledged (Confirm X1)", async () => {
    choiceReads((o) => syncRead(o?.answers, { decks: [shortDeck] }));
    await reachSyncReview();
    fireEvent.click(screen.getByRole("button", { name: "Keep the app’s for all 3" }));
    await waitFor(() => expect(tiles()[0]).toBe("0to decide"));
    fireEvent.click(screen.getByRole("button", { name: "Sync collection" }));
    const dialog = await screen.findByRole("dialog", { name: "Syncing leaves a deck short" });
    expect(confirmUpload).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(within(dialog).getByRole("button", { name: "Cancel" }));
    // Cancel writes nothing, and the review and its answers stay.
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(confirmUpload).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Sync collection" }));
    confirmUpload.mockResolvedValueOnce(undefined);
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Sync anyway" }));
    await waitFor(() => expect(confirmUpload).toHaveBeenCalled());
    expect(confirmUpload.mock.calls[0][1]).toMatchObject({ mode: "sync", confirmShort: [shortDeck], answers: { all: "app" } });
    await waitFor(() => expect(go).toHaveBeenCalledWith("/collection/replace/summary/up_1"));
  });

  it("closes Sync's dialog for a refusal the review answers, keeping the answers", async () => {
    choiceReads((o) => syncRead(o?.answers, { decks: [shortDeck] }));
    await reachSyncReview();
    fireEvent.click(screen.getByRole("button", { name: "Keep the app’s for all 3" }));
    await waitFor(() => expect(tiles()[0]).toBe("0to decide"));
    fireEvent.click(screen.getByRole("button", { name: "Sync collection" }));
    confirmUpload.mockResolvedValueOnce({ stale: true });
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Sync anyway" }));
    await screen.findByText(/This changed while you were deciding\./);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Keep the app’s for all 3" }).getAttribute("aria-pressed")).toBe("true");
  });
});
