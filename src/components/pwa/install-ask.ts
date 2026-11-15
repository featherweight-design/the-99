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

let current: InstallAsk | null = null;

/**
 * The header's Install slot offers its ask here while it draws (install onboarding G2): the tour's Install stop reads it
 * once at the run's start for its body, and its lit pass-through presses it. The slot and the tour sit in separate
 * trees (the shell's header, Home's tour), and the page under a running tour is inert, so the tour cannot press the slot
 * itself. Returns the withdrawal.
 */
export function offerInstallAsk(ask: InstallAsk): () => void {
  current = ask;
  return () => {
    if (current === ask) current = null;
  };
}

export function installAsk(): InstallAsk | null {
  return current;
}

/**
 * The fallback row's local mark (install onboarding G6): `seen` once a tour reached the Install stop, `retired` once the
 * row or the header button was selected or the row's ✕ pressed. `retired` is final: `seen` never overwrites it.
 */
export const INSTALL_ROW_KEY = "the99-install-row";

export function markInstallStopSeen(): void {
  if (readRaw(INSTALL_ROW_KEY) !== "retired") writeRaw(INSTALL_ROW_KEY, "seen");
}
