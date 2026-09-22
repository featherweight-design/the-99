// The Analysis tab's readings. Every state is a prop here, which is the point of the panel
// being presentational: each reading is asserted without a request, and the two that draw
// NOTHING are asserted to draw nothing rather than assumed to.

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnalysisPanel, SynopsisSlot } from "./analysis-panel";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import type { ProfileState } from "./use-deck-profile";

const MIX = "the mix strip";
const onRequest = vi.fn();
const draw = (state: ProfileState) =>
  render(
    <AnalysisPanel state={state} onRequest={onRequest}>
      <div>{MIX}</div>
    </AnalysisPanel>,
  );

describe("AnalysisPanel", () => {
  // THE MIX SURVIVES EVERY STATE. It is counted from the list rather than from a profile, so it
  // is true whatever happened to the read — and that is the difference between a delay and an
  // outage. Swept across all six states rather than asserted on one.
  it.each<ProfileState>([
    { kind: "idle" },
    { kind: "loading" },
    { kind: "ready", profile: {} as never },
    { kind: "disabled" },
    { kind: "missing" },
    { kind: "failed" },
  ])("keeps the tab's own content in the %s state", (state) => {
    draw(state);
    expect(screen.getByText(MIX)).toBeInTheDocument();
  });

  it("says it is reading while the request is in flight", () => {
    draw({ kind: "loading" });
    expect(screen.getByText(deckAnalysisCopy.panel.reading)).toBeInTheDocument();
  });

  // NEVER "something went wrong". The reader is owed what is and is not affected, and the
  // counted figures are unaffected — the sentence says so.
  it("states the failure and what it did not affect, with a retry", () => {
    draw({ kind: "failed" });
    expect(screen.getByText(deckAnalysisCopy.panel.failed)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: deckAnalysisCopy.panel.retry })).toBeInTheDocument();
  });

  // A BUTTON, NEVER AUTOMATIC: a silent retry loop is how a wait becomes a bill.
  it("offers the retry only on failure", () => {
    for (const state of [{ kind: "loading" }, { kind: "idle" }] as const) {
      const { unmount } = draw(state);
      expect(screen.queryByRole("button", { name: deckAnalysisCopy.panel.retry })).toBeNull();
      unmount();
    }
  });

  // THE FLAG BEING OFF DRAWS NOTHING, and a deck that cannot be read draws nothing either — the
  // page around it has already answered that question. Asserted as an absence of the heading,
  // because "renders null" is what a reserved-space regression would quietly break.
  it.each<ProfileState>([{ kind: "disabled" }, { kind: "missing" }])(
    "draws no reading at all in the %s state",
    (state) => {
      draw(state);
      expect(screen.queryByText(deckAnalysisCopy.panel.reading)).toBeNull();
      expect(screen.queryByText(deckAnalysisCopy.panel.failed)).toBeNull();
      expect(screen.queryByText(deckAnalysisCopy.panel.analyze)).toBeNull();
      expect(screen.queryByRole("button")).toBeNull();
    },
  );

  // NO SPACE IS RESERVED FOR PROSE THAT IS NOT THERE. `ready` has no verdict to draw until
  // PR 4a, and a placeholder for it is the reserved space the states rule forbids.
  // THE RE-ASK SURVIVES A SUCCESSFUL READ. An earlier version drew nothing in `ready`, which
  // removed the only control on the surface the moment a read succeeded — so the re-ask path
  // this component documents was unreachable and an edited deck could never be re-read.
  //
  // The hook's own second-press test could not catch it: its harness renders its own button.
  // A component whose control vanished would have passed there and failed a reader.
  it("keeps a way to ask again once the profile is ready", () => {
    draw({ kind: "ready", profile: {} as never });
    expect(screen.getByRole("button", { name: deckAnalysisCopy.panel.again })).toBeInTheDocument();
    expect(screen.queryByText(deckAnalysisCopy.panel.reading)).toBeNull();
  });

  it("asks again when that control is pressed", () => {
    onRequest.mockClear();
    draw({ kind: "ready", profile: {} as never });
    screen.getByRole("button", { name: deckAnalysisCopy.panel.again }).click();
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  // ROUND 4 RULING 7: no auto-run on tab open. The reader has to be able to ask, so the idle
  // state is an invitation rather than a blank — and its cost line is the WORST case, not the
  // median, because a control promising less than it takes has broken a promise.
  it("invites the reader to ask, with its cost, when nothing has been asked", () => {
    draw({ kind: "idle" });
    expect(screen.getByRole("button", { name: deckAnalysisCopy.panel.analyze })).toBeInTheDocument();
    expect(screen.getByText(deckAnalysisCopy.panel.analyzeCost)).toBeInTheDocument();
  });

  it("asks when the invitation is pressed", () => {
    onRequest.mockClear();
    draw({ kind: "idle" });
    screen.getByRole("button", { name: deckAnalysisCopy.panel.analyze }).click();
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  // NO COUNT IN THE IN-FLIGHT LINE. `loadProfileHead` reads whatever `deck_cards` holds, so a
  // brew with twelve cards would be told we were reading all 99. An earlier draft said that.
  it("does not claim a card count while reading", () => {
    draw({ kind: "loading" });
    expect(screen.getByText(deckAnalysisCopy.panel.reading)).toBeInTheDocument();
    expect(deckAnalysisCopy.panel.reading).not.toMatch(/99|\d/);
  });
});

describe("SynopsisSlot", () => {
  it("states that no summary exists, and offers no control that cannot work", () => {
    render(<SynopsisSlot />);
    expect(screen.getByText(deckAnalysisCopy.synopsis.absent)).toBeInTheDocument();
    // The strings exist in the copy module and must NOT be drawn: nothing can generate a
    // summary until sub-project 6, and a button that cannot write is worse than the sentence.
    expect(screen.queryByText(deckAnalysisCopy.synopsis.write)).toBeNull();
    expect(screen.queryByText(deckAnalysisCopy.synopsis.writeCost)).toBeNull();
  });

  // SHIPS NO SENTENCE. Asserted as the absence of a paragraph beyond the one line, because the
  // failure this guards is a placeholder arriving later and reading as content.
  it("draws one line and no paragraph", () => {
    const { container } = render(<SynopsisSlot />);
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });
});
