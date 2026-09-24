// The Analysis tab's Overview, state by state (synopsis plan, PR 3; rulings A and D). Every state
// is a prop, so each is asserted without a request, and the ones that draw no write control are
// asserted to draw none rather than assumed to.

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkedSynopsis, synopsisRow, synopsisState } from "./__fixtures__/synopsis";
import { SynopsisOverview } from "./synopsis-overview";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { synopsisCopy as copy } from "../../lib/copy/synopsis";
import type { SynopsisState } from "../../lib/synopsis/read";

const onWrite = vi.fn();
const onRetry = vi.fn();
const draw = (state: SynopsisState, over: Partial<{ readingFresh: boolean; busy: boolean }> = {}) =>
  render(
    <CardDetailProvider fetchCard={async () => null}>
      <SynopsisOverview
        state={state}
        busy={over.busy ?? false}
        deckName="Hoof"
        art={new Map()}
        readingFresh={over.readingFresh ?? true}
        onWrite={onWrite}
        onRetry={onRetry}
      />
    </CardDetailProvider>,
  );

beforeEach(() => {
  onWrite.mockClear();
  onRetry.mockClear();
});

describe("SynopsisOverview", () => {
  it("draws the overview paragraph with its card names live, and the entry point", () => {
    draw(synopsisState());
    expect(screen.getByText(copy.label)).toBeTruthy();
    // The marks are gone and the names are card-open controls.
    expect(screen.queryByText(/\[\[/)).toBeNull();
    expect(screen.getByRole("button", { name: /Sol Ring/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Craterhoof Behemoth/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: new RegExp(copy.entry) })).toBeTruthy();
    // A current overview offers no write: nothing to replace, nothing to spend.
    expect(screen.queryByRole("button", { name: copy.writeNew })).toBeNull();
    expect(screen.queryByText(/credit/i)).toBeNull();
  });

  it("opens the whole overview in a dialog from the entry point, and closes it", () => {
    draw(synopsisState());
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.entry) }));
    const dialog = screen.getByRole("dialog");
    for (const label of Object.values(copy.modal.sections)) expect(within(dialog).getAllByText(label).length).toBeGreaterThan(0);
    expect(within(dialog).getByText("Folds to a board wipe.")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: copy.modal.close }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // Ruling A: the Overview's own control writes; the Analyze press does not (until PR 4).
  it("offers Write one over a current reading with no overview, with the credit it spends", () => {
    draw(synopsisState({ synopsis: null, wouldSpend: true }));
    expect(screen.getByText(copy.absent)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.writeOne }));
    expect(onWrite).toHaveBeenCalledOnce();
    expect(screen.getByText(/Uses a credit\. 2 of 3 left/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: new RegExp(copy.entry) })).toBeNull();
  });

  it("disables Write one, and says nothing about credits, while the reading is not current", () => {
    draw(synopsisState({ synopsis: null, wouldSpend: false }), { readingFresh: false });
    expect((screen.getByRole("button", { name: copy.writeOne }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText(/credit/i)).toBeNull();
  });

  it("disables Write one and says when a credit comes back, with every credit out", () => {
    draw(synopsisState({ synopsis: null, wouldSpend: false, allowance: { used: 3, limit: 3, reopensAt: new Date(), nextAt: new Date() } }));
    expect((screen.getByRole("button", { name: copy.writeOne }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/0 of 3 left · next one at/)).toBeTruthy();
  });

  it("says a failed write failed, and offers Try again", () => {
    draw(synopsisState({ synopsis: null, lastFailed: true, wouldSpend: true }));
    expect(screen.getByText(copy.failed)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.tryAgain }));
    expect(onWrite).toHaveBeenCalledOnce();
  });

  // Credits audit, finding 4: the note says what the PRESS does. A write the server would answer
  // from what it already holds spends nothing, so no credit is named beside it.
  it("names no credit beside a write that would spend none", () => {
    draw(synopsisState({ synopsis: null, lastFailed: true, wouldSpend: false }));
    expect(screen.getByRole("button", { name: copy.tryAgain })).toBeTruthy();
    expect(screen.queryByText(/credit/i)).toBeNull();
  });

  it("draws Round 0's refused state, with no entry point, when every section was refused", () => {
    draw(synopsisState({ synopsis: null, lastRefused: { failed: 3, total: 8 }, wouldSpend: true }));
    expect(screen.getByText(copy.notWritten)).toBeTruthy();
    expect(screen.getByText(copy.overviewRefused)).toBeTruthy();
    expect(screen.getByText(copy.failedCount(3, 8))).toBeTruthy();
    expect(screen.queryByRole("button", { name: new RegExp(copy.entry) })).toBeNull();
  });

  it("keeps the entry point when only the Overview section was refused, and retries that run", () => {
    const content = checkedSynopsis({
      overview: null,
      verdicts: checkedSynopsis().verdicts.map((v) =>
        v.section === "overview" ? { section: "overview", status: "refused", reason: "over_budget", failed: 1, total: 2 } : v,
      ),
    });
    draw(synopsisState({ synopsis: synopsisRow(content) }));
    expect(screen.getByText(copy.overviewRefused)).toBeTruthy();
    expect(screen.getByRole("button", { name: new RegExp(copy.entry) })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.tryAgain }));
    expect(onRetry).toHaveBeenCalledWith("syn-1");
    // A section retry spends whatever `wouldSpend` says about a whole write.
    expect(screen.getByText(/Uses a credit/)).toBeTruthy();
  });

  // Ruling D: an older overview stays whole beside a fresh reading, with its own write.
  it("keeps an older overview whole beside a fresh reading, and offers to write a new one", () => {
    draw(synopsisState({ stale: true, wouldSpend: true }));
    expect(screen.getByRole("button", { name: /Sol Ring/ })).toBeTruthy();
    expect(screen.getByText(copy.olderThanList)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.writeNew }));
    expect(onWrite).toHaveBeenCalledOnce();
    // The line already names the credit; the note is not said twice.
    expect(screen.queryByText(/Uses a credit\./)).toBeNull();
  });

  it("offers no write under a stale reading: the banner's Re-analyze comes first", () => {
    draw(synopsisState({ stale: true }), { readingFresh: false });
    expect(screen.getByRole("button", { name: /Sol Ring/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.writeNew })).toBeNull();
  });

  it("disables the write while a run is in flight", () => {
    draw(synopsisState({ synopsis: null, pending: true }));
    expect((screen.getByRole("button", { name: copy.writeOne }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("gives the modal ruling D's write over a stale overview, and its sections no retry", () => {
    draw(synopsisState({ stale: true, wouldSpend: true }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.entry) }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(copy.modal.stale, { exact: false })).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: copy.writeNew }));
    expect(onWrite).toHaveBeenCalledOnce();
  });

  it("draws a refused section's slot in the modal, under its own label", () => {
    const content = checkedSynopsis({
      weaknesses: null,
      verdicts: checkedSynopsis().verdicts.map((v) =>
        v.section === "weaknesses" ? { section: "weaknesses", status: "refused", reason: "unmarked_card", failed: 2, total: 5 } : v,
      ),
    });
    draw(synopsisState({ synopsis: synopsisRow(content) }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.entry) }));
    const section = screen.getByRole("region", { name: copy.modal.sections.weaknesses });
    expect(within(section).getByText(copy.sectionRefused)).toBeTruthy();
    expect(within(section).getByText(copy.failedCount(2, 5))).toBeTruthy();
    fireEvent.click(within(section).getByRole("button", { name: copy.tryAgain }));
    expect(onRetry).toHaveBeenCalledWith("syn-1");
  });
});
