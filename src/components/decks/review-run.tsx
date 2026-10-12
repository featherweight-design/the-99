"use client";

// History's re-review (Hugh, 2026-10-12): a press on a past run reopens its tool with that run
// loaded. The hub holds which run, and hands it to the open tool through this context, so the
// panels built once in `builder-shell` need no new props. A tool reads it with its own name and
// gets null when the run is another tool's, or when the tool was opened any other way.

import { createContext, useContext } from "react";

import type { HistoryTool } from "../../lib/tuning/history";

export type ReviewRun = {
  tool: HistoryTool;
  /** The paid run to load. Null for a free count, whose tool reads the deck as it is now. */
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
