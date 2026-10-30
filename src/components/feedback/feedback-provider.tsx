"use client";

// The shell tells every client component whether Report a problem is on for this reader (`FEEDBACK_ENABLED`, resolved
// for the reader in `Shell`), so the error screen, which is a client boundary and cannot read a switch itself, draws
// its "Tell us what happened" link only for a signed-in reader who has the feature. Off by default: a tree with no
// provider (a signed-out page, `global-error.tsx`, a test) draws no link.
import { createContext, useContext } from "react";

const FeedbackContext = createContext(false);

export function FeedbackProvider({ on, children }: { on: boolean; children: React.ReactNode }) {
  return <FeedbackContext.Provider value={on}>{children}</FeedbackContext.Provider>;
}

export const useReportable = () => useContext(FeedbackContext);
