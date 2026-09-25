// The Analysis tab's Overview, state by state (synopsis plan, PR 3; rulings A and D). Every state
// is a prop, so each is asserted without a request, and the ones that draw no write control are
// asserted to draw none rather than assumed to.

import { act, fireEvent, render, screen, within, cleanup } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkedSynopsis, synopsisRow, synopsisState } from "./__fixtures__/synopsis";
import { HoverPreviewProvider } from "./hover-preview";
import { SynopsisOverview } from "./synopsis-overview";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { clockTime } from "../../lib/copy/credits";
import { deckNoticesCopy } from "../../lib/copy/notices";
import { synopsisCopy as copy } from "../../lib/copy/synopsis";
import type { SynopsisState } from "../../lib/synopsis/read";

const onWrite = vi.fn();
const onRetry = vi.fn();
const onReanalyze = vi.fn();
const onSeeWhich = vi.fn();
const inert = (el: HTMLElement) => el.getAttribute("aria-disabled") === "true";
const draw = (state: SynopsisState, over: Partial<{ readingFresh: boolean; busy: boolean; settled: boolean; reanalyzeBlocked: boolean; deeperLooks: boolean }> = {}) =>
  render(
    <CardDetailProvider fetchCard={async () => null}>
      <SynopsisOverview
        state={state}
        busy={over.busy ?? false}
        deckName="Hoof"
        art={new Map()}
        readingFresh={over.readingFresh ?? true}
        deeperLooks={over.deeperLooks}
        settled={over.settled ?? true}
        onWrite={onWrite}
        onRetry={onRetry}
        onSeeWhich={onSeeWhich}
        reanalyze={{ onPress: onReanalyze, disabled: over.reanalyzeBlocked ?? false, note: null }}
      />
    </CardDetailProvider>,
  );

beforeEach(() => {
  onWrite.mockClear();
  onRetry.mockClear();
  onReanalyze.mockClear();
  onSeeWhich.mockClear();
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
    expect(inert(screen.getByRole("button", { name: copy.writeOne }))).toBe(true);
    expect(screen.queryByText(/credit/i)).toBeNull();
  });

  it("disables Write one and says when a credit comes back, with every credit out", () => {
    draw(synopsisState({ synopsis: null, wouldSpend: false, allowance: { used: 3, limit: 3, reopensAt: new Date(), nextAt: new Date() } }));
    expect(inert(screen.getByRole("button", { name: copy.writeOne }))).toBe(true);
    expect(screen.getByText(/0 of 3 left · next one at/)).toBeTruthy();
  });

  it("says what shares the credits exactly as before the deeper looks, unless Help me choose is on", () => {
    const out = { used: 3, limit: 3, reopensAt: null, nextAt: null };
    draw(synopsisState({ synopsis: null, wouldSpend: false, allowance: out }));
    expect(screen.getByText("0 of 3 left. Your overview and suggestions share these credits.")).toBeTruthy();
    cleanup();
    draw(synopsisState({ synopsis: null, wouldSpend: false, allowance: out }), { deeperLooks: true });
    expect(screen.getByText("0 of 3 left. Suggestions, overviews and deeper looks share these credits.")).toBeTruthy();
  });

  it("names when a credit truly comes back once every one is out, not the earliest expiry", () => {
    const next = new Date("2026-09-24T10:00:00");
    const reopens = new Date("2026-09-24T15:30:00");
    draw(synopsisState({ synopsis: null, wouldSpend: false, allowance: { used: 4, limit: 3, reopensAt: reopens, nextAt: next } }));
    const note = screen.getByText(/0 of 3 left/).textContent ?? "";
    expect(note).toContain(clockTime(reopens));
    expect(note).not.toContain(clockTime(next));
  });

  it("holds Write one and says the app is paused while the spend cap holds", () => {
    draw(synopsisState({ synopsis: null, wouldSpend: false, allowance: { used: 0, limit: 3, reopensAt: null, nextAt: null, paused: { until: new Date("2026-10-01T12:00:00Z") } } }));
    expect(inert(screen.getByRole("button", { name: copy.writeOne }))).toBe(true);
    expect(screen.getByText(/^Paused until/)).toBeTruthy();
    expect(screen.queryByText(/Uses a credit/)).toBeNull();
  });

  it("holds Write one and names the owner's used share", () => {
    draw(synopsisState({ synopsis: null, wouldSpend: false, allowance: { used: 0, limit: 3, reopensAt: null, nextAt: null, ownerShare: true } }));
    expect(inert(screen.getByRole("button", { name: copy.writeOne }))).toBe(true);
    expect(screen.getByText(/testing share/)).toBeTruthy();
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
    // A section retry always spends a credit, whatever `wouldSpend` says about a whole write.
    expect(screen.getByText(/Uses a credit/)).toBeTruthy();
  });

  // Ruling D: an older overview stays whole beside a fresh reading, with its own write.
  it("keeps an older overview whole beside a fresh reading, and offers to write a new one", () => {
    draw(synopsisState({ stale: true, wouldSpend: true }));
    expect(screen.getByRole("button", { name: /Sol Ring/ })).toBeTruthy();
    expect(screen.getByText(copy.olderThanList)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.writeNew }));
    expect(onWrite).toHaveBeenCalledOnce();
    // State 2's chrome, credit note included (credits audit, finding 3).
    expect(screen.getByText(/Uses a credit\. 2 of 3 left/)).toBeTruthy();
  });

  it("offers no write under a stale reading: the banner's Re-analyze comes first", () => {
    draw(synopsisState({ stale: true }), { readingFresh: false });
    expect(screen.getByRole("button", { name: /Sol Ring/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.writeNew })).toBeNull();
  });

  it("disables the write while a run is in flight", () => {
    draw(synopsisState({ synopsis: null, pending: true }));
    expect(inert(screen.getByRole("button", { name: copy.writeOne }))).toBe(true);
  });

  it("gives the modal ruling D's write over a stale overview, and its sections no retry", () => {
    draw(synopsisState({ stale: true, wouldSpend: true }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.entry) }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(copy.modal.stale)).toBeTruthy();
    // The banner says the overview predates the changes once, not twice.
    expect(within(dialog).queryByText(copy.olderThanList, { exact: false })).toBeNull();
    expect(within(dialog).getByText(/Uses a credit/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: copy.writeNew }));
    expect(onWrite).toHaveBeenCalledOnce();
  });

  // A disabled press stays in the tab order, described by its note (audit finding 10d).
  it("keeps a disabled press focusable and described by its credit note", () => {
    draw(synopsisState({ synopsis: null, wouldSpend: false, allowance: { used: 3, limit: 3, reopensAt: new Date(), nextAt: new Date() } }));
    const press = screen.getByRole("button", { name: copy.writeOne });
    expect(press.hasAttribute("disabled")).toBe(false);
    fireEvent.click(press);
    expect(onWrite).not.toHaveBeenCalled();
    const note = document.getElementById(press.getAttribute("aria-describedby")!);
    expect(note?.textContent).toMatch(/0 of 3 left/);
  });

  it("draws a newer run refused everywhere under the older overview, not ruling D's line again", () => {
    draw(synopsisState({ stale: true, wouldSpend: true, lastRefused: { failed: 4, total: 9 } }));
    expect(screen.getByRole("button", { name: /Sol Ring/ })).toBeTruthy();
    expect(screen.getByText(copy.overviewRefused)).toBeTruthy();
    expect(screen.queryByText(copy.olderThanList)).toBeNull();
  });

  it("offers the modal's Re-analyze while the reading itself is stale", () => {
    draw(synopsisState({ stale: true }), { readingFresh: false });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.entry) }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Re-analyze" }));
    expect(onReanalyze).toHaveBeenCalledOnce();
    expect(within(dialog).queryByRole("button", { name: copy.writeNew })).toBeNull();
  });

  // Finding 5: the sheet's Re-analyze also writes, so it carries the banner's note.
  it("draws the credit note beside the sheet's Re-analyze", () => {
    render(
      <CardDetailProvider fetchCard={async () => null}>
        <SynopsisOverview
          state={synopsisState({ stale: true })} busy={false} deckName="Hoof" art={new Map()}
          readingFresh={false} settled onWrite={onWrite} onRetry={onRetry} onSeeWhich={onSeeWhich}
          reanalyze={{ onPress: onReanalyze, disabled: false, note: "Also writes the overview, using a credit. 2 of 3 left." }}
        />
      </CardDetailProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.entry) }));
    const dialog = screen.getByRole("dialog");
    const press = within(dialog).getByRole("button", { name: "Re-analyze" });
    const note = document.getElementById(press.getAttribute("aria-describedby")!);
    expect(note?.textContent).toMatch(/^Also writes the overview/);
  });

  it("holds the modal's Re-analyze exactly as the tab's banner holds it", () => {
    draw(synopsisState({ stale: true }), { readingFresh: false, reanalyzeBlocked: true });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.entry) }));
    const press = within(screen.getByRole("dialog")).getByRole("button", { name: "Re-analyze" });
    expect(inert(press)).toBe(true);
    fireEvent.click(press);
    expect(onReanalyze).not.toHaveBeenCalled();
  });

  it("holds a modal section's Try again, with the reset line, once every credit is out", () => {
    const content = checkedSynopsis({
      primer: null,
      verdicts: checkedSynopsis().verdicts.map((v) =>
        v.section === "primer" ? { section: "primer", status: "refused", reason: "over_budget", failed: 1, total: 3 } : v,
      ),
    });
    draw(synopsisState({ synopsis: synopsisRow(content), allowance: { used: 3, limit: 3, reopensAt: new Date(), nextAt: new Date() } }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.entry) }));
    const section = screen.getByRole("region", { name: copy.modal.sections.primer });
    const press = within(section).getByRole("button", { name: copy.tryAgain });
    fireEvent.click(press);
    expect(onRetry).not.toHaveBeenCalled();
    expect(within(section).getByText(/0 of 3 left/)).toBeTruthy();
  });

  it("holds the press while the state has not been read for the reading on screen", () => {
    draw(synopsisState({ synopsis: null, wouldSpend: false }), { settled: false });
    expect(inert(screen.getByRole("button", { name: copy.writeOne }))).toBe(true);
  });

  it("keeps the modal's write, not Re-analyze, over a fresh reading the state has not caught up to", () => {
    draw(synopsisState({ stale: true, wouldSpend: true }), { settled: false });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.entry) }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: "Re-analyze" })).toBeNull();
    expect(inert(within(dialog).getByRole("button", { name: copy.writeNew }))).toBe(true);
  });

  it("offers ruling D's write under a stale overview whose Overview section was refused", () => {
    const content = checkedSynopsis({
      overview: null,
      verdicts: checkedSynopsis().verdicts.map((v) =>
        v.section === "overview" ? { section: "overview", status: "refused", reason: "over_budget", failed: 1, total: 2 } : v,
      ),
    });
    draw(synopsisState({ synopsis: synopsisRow(content), stale: true, wouldSpend: true }));
    expect(screen.getByText(copy.overviewRefused)).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.tryAgain })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: copy.writeNew }));
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
  // Weaknesses may name a card the deck does not hold. The page's art covers only the deck, so the
  // read carries art for every named card, and that name previews like any other.
  it("previews a named card the deck does not hold, from the read's own art", () => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      writable: true, configurable: true,
      value: (q: string) => ({ matches: q === "(hover: hover)", media: q, onchange: null,
        addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
        dispatchEvent: () => false }),
    });
    try {
      render(
        <CardDetailProvider fetchCard={async () => null}>
          <HoverPreviewProvider>
            <SynopsisOverview
              state={synopsisState({ art: { craterhoof: "https://img/hoof.jpg" } })}
              busy={false} deckName="Hoof" art={new Map()} readingFresh settled
              onWrite={onWrite} onRetry={onRetry} onSeeWhich={onSeeWhich} reanalyze={{ onPress: onReanalyze, disabled: false, note: null }}
            />
          </HoverPreviewProvider>
        </CardDetailProvider>,
      );
      const hoof = screen.getAllByTestId("synopsis-card").find((e) => /Craterhoof/.test(e.textContent ?? ""))!;
      fireEvent.mouseEnter(hoof);
      act(() => void vi.advanceTimersByTime(240));
      expect(screen.getByTestId("hover-preview").getAttribute("style")).toContain("hoof.jpg");
    } finally {
      vi.useRealTimers();
    }
  });
});

// The check before the overview (deck notices HANDOFF §6, plan D10, H3, Q4).
describe("SynopsisOverview on a deck holding a card that is not legal", () => {
  it("withholds a new overview: the line, Write one disabled, and See which", () => {
    draw(synopsisState({ synopsis: null, illegal: true, wouldSpend: false }));
    const withheld = screen.getByTestId("overview-withheld");
    expect(withheld.textContent).toContain(deckNoticesCopy.check.withheld);
    const write = within(withheld).getByRole("button", { name: copy.writeOne });
    expect(inert(write)).toBe(true);
    fireEvent.click(write);
    expect(onWrite).not.toHaveBeenCalled();
    fireEvent.click(within(withheld).getByRole("button", { name: new RegExp(deckNoticesCopy.check.seeWhich) }));
    expect(onSeeWhich).toHaveBeenCalledOnce();
  });

  it("keeps a saved overview whole under the warning line, and offers no write", () => {
    draw(synopsisState({ illegal: true, stale: true }));
    const warning = screen.getByTestId("overview-warning");
    expect(warning.textContent).toContain(deckNoticesCopy.check.warning);
    expect(screen.getByTestId("synopsis-overview").textContent).toContain("then close with");
    expect(screen.queryByRole("button", { name: copy.writeNew })).toBeNull();
    expect(screen.queryByTestId("overview-withheld")).toBeNull();
  });

  // Pre-open pass: the modal's own control offered a disabled write with nothing to say why.
  it("offers no write in the modal either, on an illegal deck", () => {
    draw(synopsisState({ illegal: true, stale: true }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.entry) }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: copy.writeNew })).toBeNull();
  });

  it("draws no check line on a legal deck", () => {
    draw(synopsisState());
    expect(screen.queryByTestId("overview-warning")).toBeNull();
    expect(screen.queryByTestId("overview-withheld")).toBeNull();
  });
});
