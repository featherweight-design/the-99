"use client";

import { readRaw, writeRaw } from "../ui/local-store";
import type { InstallBrowser } from "../../lib/pwa/install-detect";

/** Which ask the header's Install slot is making: an iPhone browser's how-to sheet, or Android's held prompt. */
export type InstallKind = InstallBrowser | "android";

export type InstallAsk = {
  kind: InstallKind;
  /** The slot's own press: the sheet, or `prompt()`. */
  press: () => void;
  /** The slot's Install button, for the tour's pass-through over it. */
  button: () => HTMLElement | null;
  /** The slot's own ✕: one dismiss, and the slot goes (30 days quiet, a second one retires it). */
  dismiss: () => void;
  /** The slot's ✕ button, for the tour's second pass-through. */
  closeButton: () => HTMLElement | null;
};

/**
 * What the install asks share across trees (install onboarding G2, G6): the shell's header slot, Home's tour and Home's
 * fallback row each mount in their own tree, and the page under a running tour is inert, so they meet here.
 * - `ask`: offered by the header slot while it would draw on a phone. The tour's Install stop reads it at the run's start
 *   for its body and presses it through its pass-through; the fallback row reads and presses it too.
 * - `tour`: true while a first-run tour is waiting to open or running in this tab, so the row never draws under it.
 * - `row`: true while the fallback row is drawn, so the header slot steps aside (one ask at a time).
 */
type State = { ask: InstallAsk | null; tour: boolean; row: boolean };
let state: State = { ask: null, tour: false, row: false };
const listeners = new Set<() => void>();
const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  for (const l of listeners) l();
};

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export const installState = (): State => state;
const SERVER: State = { ask: null, tour: false, row: false };
export const installServerState = (): State => SERVER;

/** The header slot's offer. Returns the withdrawal, which never clears a newer offer. */
export function offerInstallAsk(ask: InstallAsk): () => void {
  set({ ask });
  return () => {
    if (state.ask === ask) set({ ask: null });
  };
}

export function installAsk(): InstallAsk | null {
  return state.ask;
}

/** A first-run tour waiting or running in this tab. Returns the release. */
export function holdInstallRowForTour(): () => void {
  set({ tour: true });
  return () => set({ tour: false });
}

/** The fallback row drawn: the header slot steps aside. Returns the release. */
export function showInstallRow(): () => void {
  set({ row: true });
  return () => set({ row: false });
}

/**
 * The fallback row's local mark (install onboarding G6): `seen` once a tour reached the Install stop, `retired` once the
 * row or the header button was selected or the row's ✕ pressed. `retired` is final: `seen` never overwrites it.
 */
export const INSTALL_ROW_KEY = "the99-install-row";

export function markInstallStopSeen(): void {
  if (readRaw(INSTALL_ROW_KEY) !== "retired") writeRaw(INSTALL_ROW_KEY, "seen");
}

export function retireInstallRow(): void {
  writeRaw(INSTALL_ROW_KEY, "retired");
}
