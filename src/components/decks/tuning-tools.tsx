"use client";
// The Tuning tools, loaded when first wanted. The hub and its three tools (Suggested changes,
// Proposed cuts, Mana Balance) are ~290KB of source and the strings of `deck-tuning.ts` and
// `tuning-hub.ts`, drawn only under the Analysis tab, yet bundled into `builder-shell` they were
// part of the deck page's startup download. They are fetched together, and the hub draws only once its
// tools have arrived (a tool that lagged it would leave a blank tile): at idle once the page has loaded, on intent (a pointer resting on, or focus arriving at, the Analysis tab or a shortcut
// into a tool), and on the press itself.

import { onDemand } from "../ui/on-demand";

export const TuningPanel = onDemand(() => import("./tuning-panel").then((m) => m.TuningPanel));
export const CutsPanelView = onDemand(() => import("./cuts-panel").then((m) => m.CutsPanelView));
export const ManaBalancePanel = onDemand(() => import("./mana-balance-panel").then((m) => m.ManaBalancePanel));
// The hub is not loaded until its tools are: it opens one the moment a tile is pressed, and a tool whose
// code lagged would draw nothing. A tool that failed to arrive fails the hub's load too, so it is retried.
export const TuningHub = onDemand(async () => {
  // The hub's own chunk is requested in the same round as the tools', and only withheld from drawing.
  const [hub] = await Promise.all([import("./tuning-hub"), TuningPanel.fetch(), CutsPanelView.fetch(), ManaBalancePanel.fetch()]);
  if (!TuningPanel.isLoaded() || !CutsPanelView.isLoaded() || !ManaBalancePanel.isLoaded()) throw new Error("the Tuning tools did not load");
  return hub.TuningHub;
});

/**
 * Starts the tools' code downloading and resolves once every one has arrived. A second call costs
 * nothing. Tests await it after their mocks are in place, so a tool draws in the same tick.
 */
export function warmTuningTools(): Promise<unknown> {
  return Promise.all([TuningHub.fetch(), TuningPanel.fetch(), CutsPanelView.fetch(), ManaBalancePanel.fetch()]);
}

/** Which tools have arrived, read by the warm test. */
export function tuningToolsReady() {
  return {
    hub: TuningHub.isLoaded(),
    suggested: TuningPanel.isLoaded(),
    cuts: CutsPanelView.isLoaded(),
    mana: ManaBalancePanel.isLoaded(),
  };
}

/** Spread on a control that opens a tool: a pointer resting on it, or focus arriving, starts the download. */
export const warmTuningToolsOnIntent = {
  onPointerEnter: () => void warmTuningTools(),
  onFocus: () => void warmTuningTools(),
};
