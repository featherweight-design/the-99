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
type Over = Partial<{ readingFresh: boolean; busy: boolean; pressed: boolean; announceReady: boolean; settled: boolean; reanalyzeBlocked: boolean; deeperLooks: boolean }>;
const tree = (state: SynopsisState, over: Over = {}) => (
    <CardDetailProvider fetchCard={async () => null}>
      <SynopsisOverview
        state={state}
        busy={over.busy ?? false}
        pressed={over.pressed ?? false}
        announceReady={over.announceReady ?? true}
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
    </CardDetailProvider>
);
const draw = (state: SynopsisState, over: Over = {}) => render(tree(state, over));

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
    expect(screen.getByText(/0 of 3 left · reset at/)).toBeTruthy();
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

  // H33: a write the upstream REFUSED (a bad key, a retired model id) fails the same way on every
  // press, so it says so without "just now" and offers nothing to press.
  it("says a rejected write failed, and offers no Try again", () => {
    draw(synopsisState({ synopsis: null, lastFailed: true, lastRejected: true, wouldSpend: true }));
    expect(screen.getByRole("alert").textContent).toBe(copy.rejected);
    expect(screen.queryByText(copy.failed)).toBeNull();
    expect(screen.queryByRole("button", { name: copy.tryAgain })).toBeNull();
  });

  it("draws a rejection over a held overview with no Try again, and the held text still labelled", () => {
    draw(synopsisState({ stale: true, lastFailed: true, lastRejected: true, wouldSpend: true }), { pressed: true });
    expect(screen.getByRole("alert").textContent).toBe(copy.rejected);
    expect(screen.queryByRole("button", { name: copy.tryAgain })).toBeNull();
    expect(screen.getByTestId("overview-held-caption").textContent).toBe(copy.olderThanList);
  });

  it("still offers Try again for a busy failure", () => {
    draw(synopsisState({ synopsis: null, lastFailed: true, lastRejected: false, wouldSpend: true }));
    expect(screen.getByRole("alert").textContent).toBe(copy.failed);
    expect(screen.getByRole("button", { name: copy.tryAgain })).toBeTruthy();
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

  // 1b (addendum_overview_loading): a run in flight is said, never drawn as a write that is
  // refused. No Write one, no credit note, no entry point.
  it("says the overview is being written while a run is in flight, and offers no write", () => {
    draw(synopsisState({ synopsis: null, pending: true }));
    expect(screen.getByTestId("overview-writing").textContent).toContain(copy.writing);
    expect(screen.getByTestId("overview-writing")).toHaveAttribute("role", "status");
    expect(screen.queryByRole("button", { name: copy.writeOne })).toBeNull();
    expect(screen.queryByText(copy.absent)).toBeNull();
  });

  // 1b, re-analysis: the held overview stays whole and the label row says a new one is being
  // written; ruling D's row waits, so nothing is inserted above painted text.
  it("keeps a held overview whole while a new one is written, and says so in the label row", () => {
    draw(synopsisState({ stale: true, wouldSpend: true }), { busy: true });
    expect(screen.getByTestId("overview-writing-new").textContent).toContain(copy.writingNew);
    expect(screen.getByText(/Ramp early with/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: copy.writeNew })).toBeNull();
    expect(screen.queryByText(copy.olderThanList)).toBeNull();
  });

  // 1d, first press: the failure is heard at once, and Try again draws no credit note, because
  // the press that failed already drew it.
  it("says a failed write as an alert, with no credit note after this page's press", () => {
    draw(synopsisState({ synopsis: null, lastFailed: true, wouldSpend: true }), { pressed: true });
    expect(screen.getByRole("alert").textContent).toBe(copy.failed);
    expect(screen.getByRole("button", { name: copy.tryAgain })).toBeTruthy();
    expect(screen.queryByText(/Uses a credit/)).toBeNull();
  });

  // Audit finding 3: a stored failure read on a later visit keeps the note, since the reader never
  // saw one and Try again spends on success.
  it("keeps the credit note on a stored failure no press of this page made", () => {
    draw(synopsisState({ synopsis: null, lastFailed: true, wouldSpend: true }));
    expect(screen.getByText(/Uses a credit/)).toBeTruthy();
  });

  // 1d, re-analysis: the failure leads, then a hairline and ruling D's line over the held text.
  it("leads a held overview with the failure, then labels the held text as older", () => {
    const { container } = draw(synopsisState({ stale: true, lastFailed: true, wouldSpend: true }), { pressed: true });
    const alert = screen.getByRole("alert");
    const caption = screen.getByTestId("overview-held-caption");
    const para = screen.getByText(/Ramp early with/);
    expect(caption.textContent).toBe(copy.olderThanList);
    const order = [alert, caption, para].map((el) => [...container.querySelectorAll("*")].indexOf(el));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(screen.getAllByRole("button", { name: copy.tryAgain })).toHaveLength(1);
  });

  // 1c: said once, when a written overview lands after a write.
  it("announces a written overview once, when it lands", () => {
    const { rerender } = draw(synopsisState({ synopsis: null, pending: true }));
    expect(screen.queryByText(copy.ready)).toBeNull();
    rerender(tree(synopsisState(), { pressed: true }));
    expect(screen.getByText(copy.ready)).toBeTruthy();
  });

  // 1c: a new overview replacing a held one fades in; a first one arriving does not.
  it("fades in only an overview that replaces a held one", () => {
    const { rerender, container } = draw(synopsisState({ synopsis: null, pending: true }));
    rerender(tree(synopsisState(), { pressed: true }));
    expect(container.querySelector(".anim-overview-in")).toBeNull();
    rerender(tree(synopsisState({ synopsis: { ...synopsisRow(), id: "syn-2" } }), { pressed: true }));
    expect(container.querySelector(".anim-overview-in")).not.toBeNull();
  });

  it("does not fade an overview in behind a held press's loader", () => {
    const { rerender, container } = draw(synopsisState());
    rerender(tree(synopsisState({ synopsis: { ...synopsisRow(), id: "syn-2" } }), { pressed: true, announceReady: false }));
    expect(container.querySelector(".anim-overview-in")).toBeNull();
  });

  // Ruling D's own failed write, under a held overview whose Overview section was refused: the
  // same 1d row, heard at once, with no second credit note after the press.
  it("says ruling D's failed write as an alert, with no note after this page's press", () => {
    const refused = checkedSynopsis({ overview: null as unknown as string, verdicts: [{ section: "overview", status: "refused", reason: "unknown_card", failed: 1, total: 2 }] });
    draw(synopsisState({ synopsis: synopsisRow(refused), stale: true, lastFailed: true, wouldSpend: true }), { pressed: true });
    expect(screen.getByRole("alert").textContent).toBe(copy.failed);
    expect(screen.queryByText(/Uses a credit/)).toBeNull();
  });

  it("says nothing when a write ends in a failure", () => {
    const { rerender } = draw(synopsisState({ synopsis: null }), { busy: true });
    rerender(tree(synopsisState({ synopsis: null, lastFailed: true }), { pressed: true }));
    expect(screen.queryByText(copy.ready)).toBeNull();
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

// THE METHOD-CHANGED NOTICE (addendum_method_notice 1a to 1f; READINESS build rules 2, 5, 6, 7, 8, 10).
describe("the method-changed notice", () => {
  const m = copy.method;
  const out = { used: 3, limit: 3, reopensAt: new Date(), nextAt: new Date() };
  const old = (over: Partial<SynopsisState> = {}) => synopsisState({ methodNotice: { attemptsLeft: 2 }, ...over });
  const notice = () => screen.getByTestId("method-notice");

  it("1a: line A, the free note and the outlined press, which writes", () => {
    draw(old());
    expect(within(notice()).getByText(m.line)).toBeTruthy();
    expect(within(notice()).getByText(m.note)).toBeTruthy();
    fireEvent.click(within(notice()).getByRole("button", { name: copy.writeNew }));
    expect(onWrite).toHaveBeenCalledOnce();
    // Not an alert, and the paragraph is still held under it.
    expect(within(notice()).getByText(m.line).getAttribute("role")).toBe("status");
    expect(screen.getByTestId("synopsis-overview").textContent).toContain("then close with");
  });

  // Rule 2: it reads the same at 0 credits or paused, and the press stays live.
  it("1a: reads the same, and stays pressable, with every credit out or the allowance paused", () => {
    for (const allowance of [out, { ...out, used: 0, paused: { until: new Date("2026-11-01") } }, { ...out, used: 0, ownerShare: true as const }]) {
      cleanup();
      draw(old({ allowance } as never));
      expect(within(notice()).getByText(m.note)).toBeTruthy();
      const press = within(notice()).getByRole("button", { name: copy.writeNew });
      expect(inert(press)).toBe(false);
      fireEvent.click(press);
      expect(onWrite).toHaveBeenCalled();
      onWrite.mockClear();
    }
  });

  it("1b: the notice goes while the free rewrite runs, the label row says so, and the held paragraph stays", () => {
    draw(old(), { busy: true });
    expect(screen.queryByTestId("method-notice")).toBeNull();
    expect(screen.getByTestId("overview-writing-new").textContent).toContain(m.writing);
    expect(screen.getByTestId("synopsis-overview").textContent).toContain("then close with");
  });

  it("1b: a press moves focus to the label row's status", () => {
    const view = draw(old());
    fireEvent.click(within(notice()).getByRole("button", { name: copy.writeNew }));
    view.rerender(tree(old(), { busy: true }));
    expect(document.activeElement).toBe(screen.getByTestId("overview-writing-new"));
  });

  it("1b: a run another page load started reads as the new method's only when the ledger marks it free", () => {
    draw(old({ pending: true, lastFree: true, methodNotice: { attemptsLeft: 1 } }));
    expect(screen.getByTestId("overview-writing-new").textContent).toContain(m.writing);
    cleanup();
    draw(old({ pending: true, lastFree: false, methodNotice: { attemptsLeft: 0 } }));
    expect(screen.getByTestId("overview-writing-new").textContent).toContain(copy.writingNew);
  });

  it("1c: no notice once the shown overview is the new method's, and the landing is announced", () => {
    const view = draw(old(), { busy: true });
    view.rerender(tree(synopsisState({ synopsis: { ...synopsisRow(), id: "syn-2", contractVersion: 8 } }), { busy: false }));
    expect(screen.queryByTestId("method-notice")).toBeNull();
    expect(screen.getAllByRole("status").some((el) => el.textContent === copy.ready)).toBe(true);
  });

  it("1d: a failed free try with one left is line B, an alert, and Try again; the slot draws no failure of its own", () => {
    draw(old({ methodNotice: { attemptsLeft: 1 }, lastFree: true, lastFailed: true, stale: false }));
    const n = notice();
    const line = within(n).getByText(m.failed);
    expect(line.getAttribute("role")).toBe("alert");
    expect(within(n).getByText(m.oneLeft)).toBeTruthy();
    fireEvent.click(within(n).getByRole("button", { name: copy.tryAgain }));
    expect(onWrite).toHaveBeenCalledOnce();
    // The slot's own ruling A row is left out (rule 5): the failure line appears once, in the notice.
    expect(screen.queryByText(copy.failed)).toBeNull();
    expect(screen.getAllByRole("button", { name: copy.tryAgain })).toHaveLength(1);
  });

  it("1d: a refusal and a rejection read as line B too, and a rejection still offers the one try left", () => {
    draw(old({ methodNotice: { attemptsLeft: 1 }, lastFree: true, lastRefused: { failed: 1, total: 2 } }));
    expect(screen.queryByText(copy.notWritten)).toBeNull();
    expect(within(notice()).getByText(m.failed)).toBeTruthy();
    cleanup();
    draw(old({ methodNotice: { attemptsLeft: 1 }, lastFree: true, lastFailed: true, lastRejected: true }));
    expect(screen.queryByText(copy.rejected)).toBeNull();
    expect(within(notice()).getByRole("button", { name: copy.tryAgain })).toBeTruthy();
  });

  it("1e: both tries used is line C and the shipped paid press with its credit note", () => {
    draw(old({ methodNotice: { attemptsLeft: 0 }, lastFree: true }));
    const n = notice();
    expect(within(n).getByText(m.triesUsed).getAttribute("role")).toBe("alert");
    expect(within(n).getByText(/^Uses a credit\./)).toBeTruthy();
    fireEvent.click(within(n).getByRole("button", { name: copy.writeNew }));
    expect(onWrite).toHaveBeenCalledOnce();
  });

  it("1e: with no credit to spend the line drops the clause and the press is disabled with the shipped note", () => {
    draw(old({ methodNotice: { attemptsLeft: 0 }, lastFree: true, allowance: out }));
    const n = notice();
    expect(within(n).getByText(m.triesUsedNoCredit)).toBeTruthy();
    expect(within(n).queryByText(m.triesUsed)).toBeNull();
    const press = within(n).getByRole("button", { name: copy.writeNew });
    expect(inert(press)).toBe(true);
    fireEvent.click(press);
    expect(onWrite).not.toHaveBeenCalled();
  });

  // Rule 6 and the audit's precedence: the banner leads, the notice keeps its line, loses its button.
  it("1f: with the stale banner above, line A keeps its place with no button and points to Re-analyze", () => {
    draw(old({ stale: true, pressWrites: true }), { readingFresh: false });
    const n = notice();
    expect(within(n).getByText(m.line)).toBeTruthy();
    expect(within(n).getByText(m.withStale)).toBeTruthy();
    expect(within(n).queryByRole("button")).toBeNull();
    expect(screen.queryByRole("button", { name: copy.writeNew })).toBeNull();
  });

  it("1f does not apply where Re-analyze would write nothing: the notice keeps its own press, held until the reading is fresh", () => {
    draw(old({ stale: true, pressWrites: false }), { readingFresh: false });
    const press = within(notice()).getByRole("button", { name: copy.writeNew });
    expect(within(notice()).queryByText(m.withStale)).toBeNull();
    expect(inert(press)).toBe(true);
  });

  // Rule 7: one button, not two with different notes.
  it("keeps ruling D's caption and drops its button while the notice holds the press", () => {
    draw(old({ stale: true, pressWrites: true }));
    expect(screen.getByText(copy.olderThanList)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: copy.writeNew })).toHaveLength(1);
    expect(within(notice()).getByRole("button", { name: copy.writeNew })).toBeTruthy();
  });

  // Rule 8.
  it("is withheld while the deck holds a card a legality notice stands for", () => {
    draw(old({ illegal: true }));
    expect(screen.queryByTestId("method-notice")).toBeNull();
  });

  it("is not drawn without it", () => {
    draw(synopsisState());
    expect(screen.queryByTestId("method-notice")).toBeNull();
  });

  // Rule 2 beyond the notice: a section retry is the free write too, so its credit note is gone.
  it("draws no credit note and no second press over a refused Overview while a free try is left", () => {
    const refused = checkedSynopsis({ overview: null, verdicts: [{ section: "overview", status: "refused", reason: "unknown_card", failed: 1, total: 2 }, ...checkedSynopsis().verdicts.slice(1)] });
    draw(old({ synopsis: synopsisRow(refused), allowance: out }));
    // The notice holds the one press; the refused slot's own retry is not drawn beside it.
    expect(screen.queryByRole("button", { name: copy.tryAgain })).toBeNull();
    const press = within(notice()).getByRole("button", { name: copy.writeNew });
    expect(inert(press)).toBe(false);
    expect(screen.queryByText(/Uses a credit/)).toBeNull();
  });

  // Copilot r6: the paid fallback's own failure must show, and a rejection offers no retry.
  it("1e: a failed paid press says so with Try again, and a rejected one offers no press", () => {
    draw(old({ methodNotice: { attemptsLeft: 0 }, lastFree: false, lastFailed: true }));
    expect(within(notice()).getByText(copy.failed)).toBeTruthy();
    expect(within(notice()).getByRole("button", { name: copy.tryAgain })).toBeTruthy();
    cleanup();
    draw(old({ methodNotice: { attemptsLeft: 0 }, lastFree: false, lastFailed: true, lastRejected: true }));
    expect(within(notice()).getByText(copy.rejected)).toBeTruthy();
    expect(within(notice()).queryByRole("button")).toBeNull();
  });

  it("1e: both free tries failing reads line C, not a paid-write failure", () => {
    draw(old({ methodNotice: { attemptsLeft: 0 }, lastFree: true, lastFailed: true, lastRejected: true }));
    expect(within(notice()).getByText(m.triesUsed)).toBeTruthy();
    expect(within(notice()).getByRole("button", { name: copy.writeNew })).toBeTruthy();
  });
});
