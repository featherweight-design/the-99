import { fireEvent, render, screen, within } from "@testing-library/react";
import { createRef, useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { UploadChangePreview, UploadPreview, UploadSyncPreview } from "../../app/collection/actions";
import type { SyncAnswers, SyncReviewRow } from "../../lib/collection/sync";
import type { PreviewListRow } from "../../lib/collection/upload-preview";
import type { ShortDeck } from "../../lib/collection/write";
import { ReviewScreen } from "./review-screen";
import { ShortDeckWarning } from "./short-deck-warning";
import { SyncConflicts, syncBar, syncFigures, type SyncConflictsHandle, type SyncReviewControls } from "./sync-review";

// Collection Sync, the review (plan PR 3): the tiles, the conflicts, the bulk rules, the bar and its held state.

const preview: UploadPreview = {
  uploadId: "up_1", matchedCardCount: 3401, unmatchedRows: [], skippedByDesignCount: 120, skippedTokenCount: 114,
  parseErrors: [], currentCollectionCount: 4616, filename: "The Vault 10-14-26.csv", rowCount: 3570,
};
const empty = { total: 0, rows: [] as PreviewListRow[] };
const row = (name: string, before: number, after: number, edited = false): PreviewListRow => ({
  oracleId: `o-${name}`, name, setCode: "cmm", collectorNumber: "1", finish: "nonfoil", before, after, edited,
});
const conflict = (i: number, over: Partial<SyncReviewRow> = {}): SyncReviewRow => ({
  oracleId: `o${i}`, setCode: "cmm", collectorNumber: String(400 + i), finish: "nonfoil",
  key: `o${i}|cmm|${400 + i}|nonfoil`, name: `Card ${i}`, base: 1, app: 3, file: 2, ...over,
});
const counts = { taken: 15, kept: 119, agreed: 0, unchanged: 3385, conflicts: 0, undecided: 0, answeredFile: 0, ignored: 0 };

function data(over: Partial<Omit<UploadSyncPreview, "counts">> & { counts?: Partial<UploadSyncPreview["counts"]> } = {}, more: Partial<UploadChangePreview> = {}): UploadChangePreview {
  const { counts: c, ...rest } = over;
  return {
    raised: 0, lowered: 0, decks: [], editsSinceUpload: 4, lastUploadAt: "2026-10-02T12:00:00.000Z", historyReaches: true,
    detail: {
      unchanged: 3385, up: 15, down: 0, leaving: 0, copiesBefore: 4616, copiesAfter: 4632,
      lists: { leaving: empty, down: empty, up: { total: 1, rows: [row("Jeweled Lotus", 0, 1)] } },
      newHoldings: 1, distinctCards: 1, overlap: { held: 0, of: 0 }, allOwned: false,
    },
    ...more,
    sync: {
      unavailable: null, pick: "everything", counts: { ...counts, ...c },
      conflicts: { rows: [], total: 0 }, kept: { rows: [conflict(90, { name: "Sol Ring", base: 3, app: 4, file: 3 })], total: 119 },
      stale: null, anchorConfirmedAt: "2026-10-02T12:00:00.000Z", missingFromAnchor: 0, raisingConflicts: 0,
      tokens: { count: 120, copies: 313 }, tokensChange: true, tokensChanged: 114, nothing: false, planDigest: "d",
      ...rest,
    },
  };
}

const controls = (over: Partial<SyncReviewControls> = {}): SyncReviewControls => ({
  answers: {}, onAnswers: vi.fn(), reading: false, pending: false, conflictsRef: createRef(), onHeld: vi.fn(), onLeave: vi.fn(),
  ...over,
});

function renderReview(d: UploadChangePreview, c: SyncReviewControls = controls(), decks: ShortDeck[] = []) {
  const pending = c.pending;
  const onContinue = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <ReviewScreen
      preview={preview}
      onCancel={onCancel}
      onContinue={onContinue}
      mode="sync"
      step="STEP 3 OF 4"
      pending={pending}
      change={{ data: d, decks, fresh: new Set(), changed: false, failure: null }}
      sync={c}
    />,
  );
  return { ...utils, onContinue, onCancel };
}

const confirmButton = () => screen.getByRole("button", { name: /Sync collection|Syncing…|Sync .* token changes?|Back to Collection/ });

describe("Sync review · the tiles", () => {
  it("draws four tiles in risk order, as ONE polite live region", () => {
    renderReview(data());
    const regions = document.querySelectorAll("[aria-live]");
    expect(regions).toHaveLength(1);
    const grid = regions[0] as HTMLElement;
    expect(grid.getAttribute("aria-live")).toBe("polite");
    expect(grid.getAttribute("aria-atomic")).toBe("true");
    expect([...grid.children].map((t) => t.textContent)).toEqual([
      "0to decide", "15from the file", "119kept from The 99", "3,385nothing to do",
    ]);
  });

  it("inks `to decide` and its edge in warning while above 0, and faint at 0", () => {
    const { unmount } = renderReview(data({ counts: { conflicts: 3, undecided: 2 } }));
    let tile = screen.getByText("to decide").parentElement!;
    expect(tile.style.borderColor).toBe("var(--warning)");
    expect((tile.firstElementChild as HTMLElement).style.color).toBe("var(--warning)");
    unmount();
    renderReview(data());
    tile = screen.getByText("to decide").parentElement!;
    expect(tile.style.borderColor).toBe("");
    expect((tile.firstElementChild as HTMLElement).style.color).toBe("var(--fg-faint)");
  });

  it("moves an answered conflict to its side: App into kept, File into from the file", () => {
    // 3 conflicts: one App, one File, one undecided.
    const f = syncFigures(data({ counts: { conflicts: 3, undecided: 1, answeredFile: 1, taken: 15 } }).sync!, []);
    expect(f).toMatchObject({ decide: 1, take: 16, keep: 120, decided: 2 });
  });

  it("draws the tokens line, with the figure on desktop", () => {
    renderReview(data());
    expect(screen.getByText("114 tokens change to match the file, as an upload sets them. Tokens you marked by hand stay.")).toBeTruthy();
    // The desktop figure is the file's own read, not the changed count.
    expect(screen.getByText("120 tokens · 313 copies")).toBeTruthy();
  });
});

describe("Sync review · the lists", () => {
  it("draws the file-side lists, then Kept from The 99 with its rows read at last upload → now", () => {
    renderReview(data());
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(["Going up or new · 1", "Kept from The 99 · 119"]);
    const kept = screen.getByText("Sol Ring").closest("li")!;
    expect(kept.textContent).toContain("×3 → ×4");
    expect((kept.lastElementChild as HTMLElement).style.color).toBe("var(--fg-body)");
  });

  it("reads the conflict rows in name order, whatever order the engine's keys put them in", () => {
    const rows = [conflict(1, { name: "Sol Ring" }), conflict(2, { name: "Arcane Signet" }), conflict(3, { name: "Esper Sentinel" })];
    renderReview(data({ counts: { conflicts: 3, undecided: 3 }, conflicts: { rows, total: 3 } }));
    const legends = [...document.querySelectorAll("fieldset legend")].map((l) => l.textContent?.split(",")[0]);
    expect(legends).toEqual(["Arcane Signet", "Esper Sentinel", "Sol Ring"]);
  });

  it("draws the overwrite banner and `edited` tags only for conflicts answered File", () => {
    const { unmount } = renderReview(data({ counts: { conflicts: 3, undecided: 0, answeredFile: 0 } }));
    expect(screen.queryByText(/overwrites/)).toBeNull();
    unmount();
    renderReview(
      data(
        { counts: { conflicts: 3, undecided: 0, answeredFile: 2 } },
        {
          detail: {
            ...data().detail,
            lists: { leaving: { total: 1, rows: [row("Swords to Plowshares", 1, 0, true)] }, down: empty, up: empty },
          },
        },
      ),
    );
    expect(screen.getByText("Taking the file’s count overwrites 2 cards you changed in the app since your Oct 2 upload.")).toBeTruthy();
    expect(within(screen.getByText("Swords to Plowshares").closest("li")!).getByText("edited")).toBeTruthy();
  });

  it("names the stale pick at the head, with Change back to the choice (E5)", () => {
    const onChangePick = vi.fn();
    renderReview(data({ stale: "older", pick: "additions", counts: { taken: 3 } }), controls({ onChangePick }));
    expect(screen.getByText(/This file looks older than your Oct 2 upload, so this sync takes only what it adds: 3 cards, and 114 token changes\./)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Change" }));
    expect(onChangePick).toHaveBeenCalled();
  });

  it("says `emblem rows skipped` on a Sync, counting emblems alone (G4)", () => {
    const { container } = renderReview(data());
    expect(container.textContent).toMatch(/6\s*emblem rows skipped/);
    expect(container.textContent).not.toMatch(/token and emblem/);
  });
});

describe("G4 · Replace's issues panel is unchanged", () => {
  it("still sums tokens and emblems on a Replace, whatever the preview splits", () => {
    const { container } = render(
      <ReviewScreen
        preview={preview}
        onCancel={vi.fn()}
        onContinue={vi.fn()}
        mode="replace"
        change={{ data: data(), decks: [], fresh: new Set(), changed: false, failure: null }}
      />,
    );
    expect(container.textContent).toMatch(/120\s*token and emblem rows skipped/);
    expect(container.textContent).not.toMatch(/(?<!token and )emblem rows skipped/);
    expect(screen.getByRole("button", { name: "Replace collection" })).toBeTruthy();
  });
});

describe("ConflictRow", () => {
  it("is a fieldset named by the card and its counts, with two 44px radios and nothing pre-picked", () => {
    render(<SyncConflicts rows={[conflict(1, { name: "Arcane Signet" }), conflict(2, { name: "Esper Sentinel", base: 0, app: 1 })]} total={2} since="Oct 2" answers={{}} onAnswers={vi.fn()} disabled={false} />);
    const group = screen.getByRole("group", { name: "Arcane Signet, at Oct 2 ×1, app ×3, file ×2" });
    expect(screen.getByRole("group", { name: "Esper Sentinel, at Oct 2 ×0, app ×1, file ×2" })).toBeTruthy();
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.closest("label")!.textContent)).toEqual(["App ×3", "File ×2"]);
    expect(radios.every((r) => !(r as HTMLInputElement).checked)).toBe(true);
    expect(radios[0].closest("label")!.className).toContain("h-[44px]");
    // Unanswered: the 3px warning edge.
    expect(group.className).toContain("border-l-[color:var(--warning)]");
  });

  it("answers a row by key, and drops the warning edge once answered", () => {
    const onAnswers = vi.fn();
    const rows = [conflict(1)];
    const { rerender } = render(<SyncConflicts rows={rows} total={1} since="Oct 2" answers={{}} onAnswers={onAnswers} disabled={false} />);
    fireEvent.click(screen.getByRole("radio", { name: "File ×2" }));
    expect(onAnswers).toHaveBeenCalledWith({ byKey: { [rows[0].key]: "file" } });
    rerender(<SyncConflicts rows={rows} total={1} since="Oct 2" answers={{ byKey: { [rows[0].key]: "file" } }} onAnswers={onAnswers} disabled={false} />);
    expect((screen.getByRole("radio", { name: "File ×2" }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByRole("group").className).not.toContain("border-l-[color:var(--warning)]");
  });
});

describe("Bulk presses are rules", () => {
  /** A stateful host, as the flow holds the answers. */
  function Host({ rows, total, onAnswers }: { rows: SyncReviewRow[]; total: number; onAnswers?: (a: SyncAnswers) => void }) {
    const [answers, setAnswers] = useState<SyncAnswers>({});
    return (
      <SyncConflicts
        rows={rows}
        total={total}
        since="Oct 2"
        answers={answers}
        onAnswers={(a) => {
          onAnswers?.(a);
          setAnswers(a);
        }}
        disabled={false}
      />
    );
  }

  it("decides every conflict, shown or not, and a later change by hand unpresses it", () => {
    const rows = Array.from({ length: 12 }, (_, i) => conflict(i));
    const onAnswers = vi.fn();
    // 98 in all: the 12 shipped here and 86 past them, which only a rule can decide (G11).
    render(<Host rows={rows} total={98} onAnswers={onAnswers} />);
    expect(screen.getAllByRole("group")).toHaveLength(8);
    const bulk = screen.getByRole("button", { name: "Keep the app’s for all 98" });
    expect(bulk.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(bulk);
    expect(onAnswers).toHaveBeenLastCalledWith({ all: "app" });
    expect(bulk.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("status").textContent).toBe("Kept the app’s count for all 98. You can still change any one.");
    expect(screen.getByText(/All answered\./)).toBeTruthy();
    // The rows Show all reveals are decided too.
    fireEvent.click(screen.getByRole("button", { name: "Show all 98" }));
    expect(screen.getAllByRole("radio", { name: /^App/ }).every((r) => (r as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByText("Showing the first 12 of 98. The buttons above apply to all 98.")).toBeTruthy();

    fireEvent.click(within(screen.getByRole("group", { name: /^Card 3,/ })).getByRole("radio", { name: "File ×2" }));
    expect(onAnswers).toHaveBeenLastCalledWith({ all: "app", byKey: { [rows[3].key]: "file" } });
    expect(bulk.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("status").textContent).toBe("");
  });
});

describe("Sync review · the bar", () => {
  it("writes the Sync sentence and confirms with Sync collection", () => {
    const { onContinue } = renderReview(data({ counts: { taken: 18, kept: 121 } }), controls(), [
      { deckId: "d1", deckName: "Tithe and Tax", oracleId: "o", cardName: "Smothering Tithe", short: 1 } as ShortDeck,
    ]);
    expect(screen.getByText("Taking 18 cards from the file and keeping 121 of yours, with 114 token changes. 1 deck will read short.")).toBeTruthy();
    fireEvent.click(confirmButton());
    expect(onContinue).toHaveBeenCalled();
  });

  it("holds the confirm while a card is undecided: aria-disabled at .4, never native disabled, its press taken to the first card left", () => {
    function Harness() {
      const ref = useRef<SyncConflictsHandle>(null);
      const rows = Array.from({ length: 10 }, (_, i) => conflict(i));
      // The first eight are answered; the first one left is past Show all.
      const answers: SyncAnswers = { byKey: Object.fromEntries(rows.slice(0, 8).map((r) => [r.key, "app"])) };
      return (
        <ReviewScreen
          preview={preview}
          onCancel={vi.fn()}
          onContinue={onContinue}
          mode="sync"
          change={{
            data: data({ counts: { conflicts: 10, undecided: 2 }, conflicts: { rows, total: 10 } }),
            decks: [], fresh: new Set(), changed: false, failure: null,
          }}
          sync={controls({ answers, conflictsRef: ref, onHeld: () => ref.current?.focusFirstUndecided() })}
        />
      );
    }
    const onContinue = vi.fn();
    render(<Harness />);
    const button = confirmButton();
    expect(button.textContent).toBe("Sync collection");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    expect(button).not.toBeDisabled();
    expect(button.className).toContain("opacity-40");
    const line = screen.getByText("2 cards still to decide.");
    expect(line.className).toContain("text-[color:var(--warning)]");
    fireEvent.click(button);
    expect(onContinue).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
    const first = screen.getByRole("group", { name: /^Card 8,/ });
    expect(document.activeElement).toBe(within(first).getAllByRole("radio")[0]);
  });

  it("names what happens when no card moves: Sync N token changes", () => {
    renderReview(data({ counts: { taken: 0, kept: 121 }, stale: "noNewer" }));
    expect(screen.getByText("Your cards stay as they are, including the 121 you changed. 114 tokens change.")).toBeTruthy();
    expect(confirmButton().textContent).toBe("Sync 114 token changes");
    expect(screen.getByText("This file looks no newer than your Oct 2 upload, so this sync takes only its tokens.")).toBeTruthy();
  });

  it("states Nothing to sync and offers only the way back: no confirm, so no History entry (call 10)", () => {
    const onLeave = vi.fn();
    renderReview(data({ counts: { taken: 0 }, tokensChange: false, nothing: true }), controls({ onLeave }));
    expect(screen.getByText("Nothing to sync. Your collection already has everything in this file, and its tokens are recorded.")).toBeTruthy();
    expect(screen.getByText("Nothing will change.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sync collection" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back to Collection" }));
    expect(onLeave).toHaveBeenCalled();
  });

  it("holds the confirm while the read for the answers on screen is in flight", () => {
    const { onContinue } = renderReview(data(), controls({ reading: true }));
    fireEvent.click(confirmButton());
    expect(onContinue).not.toHaveBeenCalled();
    expect(confirmButton().getAttribute("aria-disabled")).toBe("true");
  });

  it("freezes the radios and reads Syncing… while the write is in flight (X2)", () => {
    renderReview(data({ counts: { conflicts: 1, undecided: 0, answeredFile: 1 }, conflicts: { rows: [conflict(1, { answer: "file" })], total: 1 } }), controls({ pending: true, answers: { all: "file" } }));
    expect(confirmButton().textContent).toBe("Syncing…");
    expect(screen.getAllByRole("radio").every((r) => (r as HTMLInputElement).disabled)).toBe(true);
  });

  it("composes the bar's sentence for every state", () => {
    const f = (c: Partial<UploadSyncPreview["counts"]>, o: Partial<Omit<UploadSyncPreview, "counts">> = {}) => syncBar(syncFigures(data({ counts: c, ...o }).sync!, []));
    expect(f({ taken: 18, kept: 0 })).toEqual({ kind: "confirm", line: "Taking 18 cards from the file, with 114 token changes. Nothing of yours to keep.", label: "Sync collection" });
    expect(f({ taken: 17, kept: 118, conflicts: 3, undecided: 0, answeredFile: 2 }).line).toBe(
      "Taking 19 cards from the file and keeping 119 of yours, with 114 token changes. You decided 3.",
    );
    expect(f({ conflicts: 3, undecided: 1 })).toEqual({ kind: "held", line: "1 card still to decide." });
    expect(f({ taken: 18 }, { tokensChange: false, tokensChanged: 0 }).line).toBe("Taking 18 cards from the file and keeping 119 of yours.");
    // Nothing of yours kept and only tokens moving: no "including the 0 you changed".
    expect(f({ taken: 0, kept: 0 })).toEqual({ kind: "confirm", line: "Your cards stay as they are. 114 tokens change.", label: "Sync 114 token changes" });
  });
});

describe("ShortDeckWarning · Sync's words", () => {
  it("titles the dialog `Syncing leaves N decks short` and confirms with `Sync anyway`, never in danger red, Cancel focused", () => {
    const decks = [
      { deckId: "d1", deckName: "Tithe and Tax", oracleId: "o1", cardName: "Smothering Tithe", short: 1 },
      { deckId: "d2", deckName: "Plowshares and Prayer", oracleId: "o2", cardName: "Swords to Plowshares", short: 1 },
    ] as ShortDeck[];
    render(<ShortDeckWarning source="sync" decks={decks} pending={false} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Syncing leaves 2 decks short" })).toBeTruthy();
    const confirm = screen.getByRole("button", { name: "Sync anyway" });
    expect(confirm.className).not.toMatch(/danger/);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cancel" }));
  });
});
