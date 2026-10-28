"use client";

// History's re-review (Hugh, 2026-10-12): a press on a past run reopens its tool with that run
// loaded. The hub holds which run, and hands it to the open tool through this context, so the
// panels built once in `builder-shell` need no new props. A tool reads it with its own name and
// gets null when the run is another tool's, or when the tool was opened any other way.

import { createContext, useContext } from "react";

import type { HistoryTool } from "../../lib/tuning/history";

export type ReviewRun = {
  tool: HistoryTool;
  /** The stored record to load: a paid run's id (Proposed cuts, Suggested changes), or for Mana
   *  Balance an Improve-my-mana help read's `deck_tool_counts` id, with `color`. Null for a free
   *  count that named no card, whose tool reads the deck as it is now. */
  runId: string | null;
  /** Mana Balance only: the color of the Improve-my-mana help reopened by `runId`. */
  color?: string;
  /** The reader started a new run from the reopened tool: the hub drops the note, and the tool
   *  goes back to its ordinary read without remounting. Absent where nothing listens (tests). */
  leave?: () => void;
};

const ReviewRunContext = createContext<ReviewRun | null>(null);

export const ReviewRunProvider = ReviewRunContext.Provider;

/** The run History asked this tool to show, or null for the tool's ordinary read. */
export function useReviewRun(tool: HistoryTool): ReviewRun | null {
  const run = useContext(ReviewRunContext);
  return run && run.tool === tool ? run : null;
}

/**
 * Reopen one of a tool's own runs as History does, from inside the tool: Suggested changes v2's same-request confirm,
 * `Open Oct 26’s run` (Intake board D). The hub provides it; null where there is no hub (and so no History to go back to).
 * `at` is the run's ISO date, for the note the hub draws above the reopened run.
 */
export type OpenRun = (tool: HistoryTool, runId: string, at: string) => void;

const OpenRunContext = createContext<OpenRun | null>(null);

export const OpenRunProvider = OpenRunContext.Provider;

export function useOpenRun(): OpenRun | null {
  return useContext(OpenRunContext);
}

/** Open the hub's History tool from inside a tool (Suggested changes v2's footer, `Last run Oct 26 · History ›`). The hub
 *  provides it; null where there is no hub. */
const OpenHistoryContext = createContext<(() => void) | null>(null);

export const OpenHistoryProvider = OpenHistoryContext.Provider;

export function useOpenHistory(): (() => void) | null {
  return useContext(OpenHistoryContext);
}
