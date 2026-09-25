// The Analysis tab's body. Every state is a prop here, which is the point of the panel being
// presentational: each reading is asserted without a request, and the two that draw NOTHING are
// asserted to draw nothing rather than assumed to.

import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnalysisPanel } from "./analysis-panel";
import { deckProfile } from "./__fixtures__/deck-profile";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import type { ProfileState } from "./use-deck-profile";

const copy = deckAnalysisCopy.panel;
const MIX = "the mix strip";
const AT = new Date().toISOString();
const onRequest = vi.fn();
const panel = (state: ProfileState) => (
  <CardDetailProvider fetchCard={async () => null}>
    <AnalysisPanel state={state} onRequest={onRequest}>
      <div>{MIX}</div>
    </AnalysisPanel>
  </CardDetailProvider>
);
const draw = (state: ProfileState) => render(panel(state));
const reading = (over: Partial<{ fresh: boolean; versionNumber: number | null }> = {}) =>
  ({ profile: deckProfile(), analyzedAt: AT, fresh: true, versionNumber: null, ...over });
const ready = (over: Partial<{ fresh: boolean; versionNumber: number | null }> = {}): ProfileState =>
  ({ kind: "ready", ...reading(over) });

beforeEach(() => onRequest.mockClear());

describe("AnalysisPanel", () => {
  // THE MIX SURVIVES EVERY STATE. It is counted from the list rather than from a profile, so it
  // is true whatever happened to the read — the difference between a delay and an outage.
  it.each<ProfileState>([
    { kind: "idle" },
    { kind: "loading", held: null },
    ready(),
    { kind: "disabled" },
    { kind: "missing" },
    { kind: "failed", held: null },
  ])("keeps the tab's own content in the %s state", (state) => {
    draw(state);
    expect(screen.getByText(MIX)).toBeInTheDocument();
  });

  // 2a: the one empty state, with the ring, both paragraphs, Analyze and the provenance opener.
  it("invites the reader to analyze when nothing has been asked", () => {
    draw({ kind: "idle" });
    const empty = screen.getByTestId("analysis-empty");
    expect(within(empty).getByRole("heading", { name: copy.idle.heading })).toBeInTheDocument();
    expect(within(empty).getByText(copy.idle.bodyPersist)).toBeInTheDocument();
    expect(within(empty).getAllByTestId("bracket-mark")).toHaveLength(5);
    expect(within(empty).getByRole("button", { name: /How we make these decisions/ })).toBeInTheDocument();
    fireEvent.click(within(empty).getByRole("button", { name: copy.idle.cta }));
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(empty.textContent).not.toMatch(/two seconds/);
  });

  // 2b: the ring lights 1 to 5 in turn, the heading is the live region, and Analyze holds still.
  it("reads with the ring animating and Analyze disabled in place", () => {
    draw({ kind: "loading", held: null });
    const empty = screen.getByTestId("analysis-empty");
    expect(within(empty).getByRole("heading", { name: copy.loading.heading }).getAttribute("aria-live")).toBe("polite");
    const waves = [...empty.querySelectorAll<HTMLElement>(".anim-at-wave")];
    expect(waves.map((w) => w.style.animationDelay)).toEqual(["0s", "0.16s", "0.32s", "0.48s", "0.64s"]);
    const button = within(empty).getByRole("button", { name: copy.idle.cta });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button);
    expect(onRequest).not.toHaveBeenCalled();
    // NO COUNT: `loadProfileHead` reads whatever the draft holds.
    expect(copy.loading.heading).not.toMatch(/\d/);
  });

  // 2c: an alert, the ring dimmed and still, and a retry that is a press, never automatic.
  it("states the failure and what it did not affect, with a retry", () => {
    draw({ kind: "failed", held: null });
    const empty = screen.getByTestId("analysis-empty");
    expect(within(empty).getByRole("alert").textContent).toBe(copy.failed.heading);
    expect(within(empty).getByText(copy.failed.body)).toBeInTheDocument();
    expect(within(empty).getByTestId("analysis-ring").style.opacity).toBe("0.3");
    expect(empty.querySelectorAll(".anim-at-wave")).toHaveLength(0);
    fireEvent.click(within(empty).getByRole("button", { name: copy.failed.cta }));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  // With a reading: no empty state, no control on the reading, no Overview, and the box before the
  // climb in the DOM so the phone reads it first.
  it("draws the reading with no re-analyze control and no Overview", () => {
    draw(ready());
    expect(screen.queryByTestId("analysis-empty")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Analyze|Try again/ })).toBeNull();
    expect(screen.queryByText(copy.overview)).toBeNull();
    const box = screen.getByRole("region", { name: deckAnalysisCopy.verdict.heading });
    const rung = screen.getAllByTestId("climb-rung")[0];
    expect(box.compareDocumentPosition(rung) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByTestId("verdict-analyzed").textContent).toBe(copy.analyzed(copy.justNow));
  });

  // The flag off and a deck that cannot be read draw no reading at all.
  it.each<ProfileState>([{ kind: "disabled" }, { kind: "missing" }])("draws nothing of its own when %s", (state) => {
    draw(state);
    expect(screen.queryByTestId("analysis-empty")).toBeNull();
    expect(screen.queryByRole("region", { name: deckAnalysisCopy.verdict.heading })).toBeNull();
  });

  // §E: said once when a press settles, and never for a stored reading painted on open.
  it("announces a reading when a press settles, and not when one is shown on open", () => {
    const { rerender } = draw({ kind: "loading", held: null });
    expect(screen.getByRole("status").textContent).toBe("");
    rerender(panel(ready()));
    expect(screen.getByRole("status").textContent).toBe(copy.settled("Exhibition or Core"));
  });

  it("does not announce a reading already there when the tab opens", () => {
    const { rerender } = draw({ kind: "idle" });
    rerender(panel(ready()));
    expect(screen.getByRole("status").textContent).toBe("");
  });

  // ─── The lifecycle (2i, 2d, ruling 1) ─────────────────────────────────────────────────────────
  const banner = () => screen.queryByTestId("analysis-banner");

  // A fresh reading draws no banner and offers no re-analysis.
  it("draws no banner over a fresh reading", () => {
    draw(ready());
    expect(banner()).toBeNull();
  });

  // 2i: a stale reading stays WHOLE under the banner, which offers Re-analyze.
  it("holds a stale reading under the banner, with Re-analyze", () => {
    draw(ready({ fresh: false }));
    const b = banner()!;
    expect(b).toHaveAttribute("role", "status");
    expect(b.textContent).toContain(deckAnalysisCopy.banner.stale);
    fireEvent.click(within(b).getByRole("button", { name: deckAnalysisCopy.banner.reanalyze }));
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("region", { name: deckAnalysisCopy.verdict.heading })).toBeInTheDocument();
    expect(screen.getByTestId("verdict-analyzed").textContent).toMatch(/before your changes$/);
  });

  // A press over a held reading: the button disables IN PLACE and the reading stays.
  it("keeps the reading while a re-read runs, the button disabled in place", () => {
    draw({ kind: "loading", held: reading({ fresh: false }) });
    const button = within(banner()!).getByRole("button", { name: deckAnalysisCopy.banner.reanalyze });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);
    expect(onRequest).not.toHaveBeenCalled();
    expect(screen.queryByTestId("analysis-empty")).toBeNull();
    expect(screen.getByRole("region", { name: deckAnalysisCopy.verdict.heading })).toBeInTheDocument();
  });

  // 2d: a failed re-read over a held reading says so as an alert, and the reading stays whole.
  it("says a failed re-read over the reading it held, as an alert", () => {
    draw({ kind: "failed", held: reading({ fresh: false }) });
    const b = banner()!;
    expect(b).toHaveAttribute("role", "alert");
    expect(b.textContent).toContain(deckAnalysisCopy.banner.failedHeld);
    expect(within(b).getByRole("button", { name: deckAnalysisCopy.banner.tryAgain })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: deckAnalysisCopy.verdict.heading })).toBeInTheDocument();
  });

  // F2 (deck notices readiness): the Notices foot re-analyzes a FRESH reading, and its busy and
  // failure are said on its own button. The banner speaks only for the player's own edits.
  it("draws no banner while a press over a fresh reading loads or fails", () => {
    const { unmount } = draw({ kind: "loading", held: reading({ fresh: true }) });
    expect(banner()).toBeNull();
    unmount();
    draw({ kind: "failed", held: reading({ fresh: true }) });
    expect(banner()).toBeNull();
    expect(screen.getByRole("region", { name: deckAnalysisCopy.verdict.heading })).toBeInTheDocument();
  });

  // A reading pinned to a version names it; a stale one never does.
  it("names the version a fresh reading is pinned to", () => {
    draw(ready({ versionNumber: 3 }));
    expect(screen.getByTestId("verdict-analyzed").textContent).toMatch(/^analyzed with version 3 · /);
  });

  // RULING 1, before any press: Analyze is disabled and the line says why.
  it("disables Analyze on a partial deck and says why", () => {
    render(
      <CardDetailProvider fetchCard={async () => null}>
        <AnalysisPanel state={{ kind: "idle" }} onRequest={onRequest} legality={{ built: 87, size: 99 }}>
          <div>{MIX}</div>
        </AnalysisPanel>
      </CardDetailProvider>,
    );
    const empty = screen.getByTestId("analysis-empty");
    const button = within(empty).getByRole("button", { name: copy.idle.cta });
    expect(button).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(button);
    expect(onRequest).not.toHaveBeenCalled();
    expect(screen.getByTestId("analysis-blocked").textContent).toBe(copy.illegal(87, 99));
  });

  // RULING 1 over a held reading: the reading stays, and Re-analyze is disabled with the same line.
  it("keeps a held reading on a partial deck, Re-analyze disabled with the line", () => {
    render(
      <CardDetailProvider fetchCard={async () => null}>
        <AnalysisPanel state={ready({ fresh: false })} onRequest={onRequest} legality={{ built: 100, size: 99 }}>
          <div>{MIX}</div>
        </AnalysisPanel>
      </CardDetailProvider>,
    );
    const b = banner()!;
    expect(b.textContent).toContain(copy.illegal(100, 99));
    expect(within(b).getByRole("button", { name: deckAnalysisCopy.banner.reanalyze })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("region", { name: deckAnalysisCopy.verdict.heading })).toBeInTheDocument();
  });

  // The server's refusal draws the same line, with its own counts.
  it("draws the server's illegal refusal as the same line", () => {
    draw({ kind: "illegal", built: 98, size: 99, held: null });
    expect(screen.getByTestId("analysis-blocked").textContent).toBe(copy.illegal(98, 99));
  });

  // A retry from 2d disables IN PLACE: the banner keeps its failure sentence, role and label.
  it("keeps 2d's banner while its retry runs", () => {
    draw({ kind: "loading", held: reading({ fresh: false }), retry: true });
    const b = banner()!;
    expect(b).toHaveAttribute("role", "alert");
    expect(b.textContent).toContain(deckAnalysisCopy.banner.failedHeld);
    expect(within(b).getByRole("button", { name: deckAnalysisCopy.banner.tryAgain })).toHaveAttribute("aria-disabled", "true");
  });

  // The server's refusal does not outlive the deck being made whole: the shell's count decides.
  it("re-enables the press once the shell's count is whole again", () => {
    render(
      <CardDetailProvider fetchCard={async () => null}>
        <AnalysisPanel state={{ kind: "illegal", built: 98, size: 99, held: null }} onRequest={onRequest} legality={{ built: 99, size: 99 }}>
          <div>{MIX}</div>
        </AnalysisPanel>
      </CardDetailProvider>,
    );
    expect(screen.queryByTestId("analysis-blocked")).toBeNull();
    fireEvent.click(within(screen.getByTestId("analysis-empty")).getByRole("button", { name: copy.idle.cta }));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  // Suggested changes follows the analysis: drawn last, after the mix, and only over a reading,
  // current or held, handed the permits that reading slots to.
  describe("the tuning slot", () => {
    const withTuning = (state: ProfileState) => {
      const tuning = vi.fn((permits: readonly number[]) => <div>tuning for {permits.join(",")}</div>);
      render(
        <CardDetailProvider fetchCard={async () => null}>
          <AnalysisPanel state={state} onRequest={onRequest} tuning={tuning}>
            <div>{MIX}</div>
          </AnalysisPanel>
        </CardDetailProvider>,
      );
      return tuning;
    };

    it("draws after the mix over a current reading", () => {
      withTuning(ready());
      const mix = screen.getByText(MIX);
      const tuning = screen.getByText(/^tuning for/);
      expect(mix.compareDocumentPosition(tuning) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("stays over a held reading while the deck has changed", () => {
      withTuning(ready({ fresh: false }));
      expect(screen.getByText(/^tuning for/)).toBeInTheDocument();
    });

    it("is absent before a first reading", () => {
      const tuning = withTuning({ kind: "idle" });
      expect(tuning).not.toHaveBeenCalled();
      expect(screen.queryByText(/^tuning for/)).toBeNull();
    });
  });

  // OPENING THE TAB (§8, 8a): the one state that withholds the mix. It draws nothing it cannot
  // yet know, because the fetch may resolve to the empty state or to any analyzed shape.
  describe("opening the tab", () => {
    const opening = (phase: "wait" | "loader", state: ProfileState = { kind: "idle" }) =>
      render(
        <CardDetailProvider fetchCard={async () => null}>
          <AnalysisPanel state={state} onRequest={onRequest} opening={phase} tuning={() => <p>tuning</p>}>
            <div>{MIX}</div>
          </AnalysisPanel>
        </CardDetailProvider>,
      );

    it("holds the block with nothing in it while waiting out the delay", () => {
      const { container } = opening("wait");
      const loader = container.querySelector("[data-opening-loader]")!;
      expect(loader).toHaveAttribute("data-opening-loader", "waiting");
      expect(loader.textContent).toBe("");
      // Mounted behind the loader so its reads can run, and drawn nowhere.
      expect(screen.getByTestId("analysis-empty")).not.toBeVisible();
      expect(screen.getByText(MIX)).not.toBeVisible();
    });

    it("draws the five marks and the word, and nothing else", () => {
      const { container } = opening("loader");
      const loader = container.querySelector("[data-opening-loader]")!;
      expect(loader).toHaveAttribute("role", "status");
      expect(loader.querySelectorAll(".anim-at-wave.at-wave-rest")).toHaveLength(5);
      expect(loader).toHaveTextContent(copy.opening);
      expect(screen.getByTestId("analysis-empty")).not.toBeVisible();
      expect(screen.getByTestId("analysis-ring")).not.toBeVisible();
      expect(screen.getByText(MIX)).not.toBeVisible();
    });

    // Held for the hold even once the reading landed: the reading waits behind the loader.
    // Suggested changes is MOUNTED under the held loader, which is what lets its first read run
    // before the tab paints (the shell holds the loader until that read settles), and it is drawn
    // only once the loader lets go.
    it("withholds a reading that landed while the loader is held, with Suggested changes mounted behind it", () => {
      opening("loader", ready());
      expect(screen.getByText(MIX)).not.toBeVisible();
      expect(screen.getByText("tuning")).not.toBeVisible();
      expect(screen.getByText(copy.opening)).toBeVisible();
    });

    it("draws the mix again once the tab has its answer", () => {
      draw({ kind: "idle" });
      expect(screen.getByText(MIX)).toBeInTheDocument();
      expect(screen.getByTestId("analysis-empty")).toBeInTheDocument();
    });
  });

  // The overview (synopsis plan, decision 6): one grid item, rendered once. It leads the phone's
  // reading order, and at 1300 heads the left column over the climb while the box spans both
  // rows. The geometry is `probe:synopsis-ui`'s; this pins the order and the one mount.
  describe("the overview slot", () => {
    const withOverview = (state: ProfileState) =>
      render(
        <CardDetailProvider fetchCard={async () => null}>
          <AnalysisPanel state={state} onRequest={onRequest} overview={<div>the overview</div>}>
            <div>{MIX}</div>
          </AnalysisPanel>
        </CardDetailProvider>,
      );

    it("draws once, before the box and the climb, over a reading", () => {
      withOverview(ready());
      const overview = screen.getAllByText("the overview");
      expect(overview).toHaveLength(1);
      const box = screen.getByTestId("verdict-name");
      const climb = screen.getAllByTestId("climb-rung")[0];
      expect(overview[0].compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(box.compareDocumentPosition(climb) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it("heads the left column at 1300, with the climb under it and the box spanning both", () => {
      withOverview(ready());
      const cell = screen.getByText("the overview").parentElement!;
      expect(cell.className).toMatch(/md:col-start-1/);
      expect(cell.className).toMatch(/md:row-start-1/);
      const grid = cell.parentElement!;
      const [, boxCell, climbCell] = Array.from(grid.children);
      expect(boxCell.className).toMatch(/md:row-span-2/);
      expect(climbCell.className).toMatch(/md:row-start-2/);
    });

    it("adds no second row, and no row gap, without an overview", () => {
      render(
        <CardDetailProvider fetchCard={async () => null}>
          <AnalysisPanel state={ready()} onRequest={onRequest}>
            <div>{MIX}</div>
          </AnalysisPanel>
        </CardDetailProvider>,
      );
      const grid = screen.getByTestId("verdict-cell").parentElement!;
      expect(grid.className).not.toMatch(/grid-rows|gap-y/);
    });

    it("is absent before a first reading", () => {
      withOverview({ kind: "idle" });
      expect(screen.queryByText("the overview")).toBeNull();
    });
  });
  // The credit note beside a press that also writes the overview (CREDITS-overview.md 7a to 7e).
  describe("the press note", () => {
    const NOTES = { analyze: "Also writes the overview, using a credit. 2 of 3 left.", reanalyze: "reanalyze note" };
    const withNotes = (state: ProfileState, legality?: { built: number; size: number }) =>
      render(
        <CardDetailProvider fetchCard={async () => null}>
          <AnalysisPanel state={state} onRequest={onRequest} pressNote={NOTES} legality={legality}>
            <div>{MIX}</div>
          </AnalysisPanel>
        </CardDetailProvider>,
      );

    it("draws beside Analyze, and describes it", () => {
      withNotes({ kind: "idle" });
      const note = screen.getByTestId("press-note");
      expect(note.textContent).toBe(NOTES.analyze);
      // The description is the note's text alone, never the See which control beside it.
      const described = screen.getByRole("button", { name: copy.idle.cta }).getAttribute("aria-describedby");
      expect(document.getElementById(described!)?.textContent).toBe(NOTES.analyze);
      expect(note.contains(document.getElementById(described!))).toBe(true);
    });

    it("draws beside Re-analyze on the banner, after the button in the DOM and before it at md", () => {
      withNotes(ready({ fresh: false }));
      const banner = screen.getByTestId("analysis-banner");
      const note = within(banner).getByTestId("press-note");
      const button = within(banner).getByRole("button");
      expect(note.textContent).toBe(NOTES.reanalyze);
      expect(document.getElementById(button.getAttribute("aria-describedby")!)?.textContent).toBe(NOTES.reanalyze);
      expect(button.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(note.className).toMatch(/md:order-2/);
      expect(button.className).toMatch(/md:order-3/);
    });

    // Finding 10b: a blocked press writes nothing, so it names no cost.
    it("draws no note over a deck that is not whole", () => {
      withNotes({ kind: "idle" }, { built: 60, size: 99 });
      expect(screen.queryByTestId("press-note")).toBeNull();
    });

    it("draws no note where none was handed in", () => {
      draw({ kind: "idle" });
      expect(screen.queryByTestId("press-note")).toBeNull();
    });
  });
});
