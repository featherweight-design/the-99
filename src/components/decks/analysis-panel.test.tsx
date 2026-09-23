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
const ready = (): ProfileState => ({ kind: "ready", profile: deckProfile(), analyzedAt: AT });

beforeEach(() => onRequest.mockClear());

describe("AnalysisPanel", () => {
  // THE MIX SURVIVES EVERY STATE. It is counted from the list rather than from a profile, so it
  // is true whatever happened to the read — the difference between a delay and an outage.
  it.each<ProfileState>([
    { kind: "idle" },
    { kind: "loading" },
    ready(),
    { kind: "disabled" },
    { kind: "missing" },
    { kind: "failed" },
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
    draw({ kind: "loading" });
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
    draw({ kind: "failed" });
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
    const { rerender } = draw({ kind: "loading" });
    expect(screen.getByRole("status").textContent).toBe("");
    rerender(panel(ready()));
    expect(screen.getByRole("status").textContent).toBe(copy.settled("Exhibition or Core"));
  });

  it("does not announce a reading already there when the tab opens", () => {
    const { rerender } = draw({ kind: "idle" });
    rerender(panel(ready()));
    expect(screen.getByRole("status").textContent).toBe("");
  });
});
