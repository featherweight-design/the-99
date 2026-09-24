/**
 * The overview's copy (sub-project 6): the tab's short read, its write controls and the modal.
 *
 * THE PLAYER'S WORD IS "OVERVIEW" (Hugh, 2026-09-23), everywhere the summary is named, which
 * diverges from the handoff's "Synopsis" title, "View full synopsis" link and "Close synopsis"
 * label. Code, files and components keep "synopsis". Transcribed from `SYNOPSIS-modal.md`, the
 * `Synopsis Sheet` canvas and the Analysis-tab frames otherwise; owed to `/copy-review` with the
 * credit strings.
 */
export const synopsisCopy = {
  label: "Overview",
  entry: "View full overview",

  /** Ruling A: a current reading with no overview. */
  absent: "No overview has been written for this deck yet.",
  writeOne: "Write one",
  /** Ruling A: the deck's own write just failed upstream (busy, timed out, malformed). */
  failed: "We couldn’t write the overview just now. Nothing about your deck changed.",
  tryAgain: "Try again",
  /** Ruling D: an older overview beside a fresh reading. */
  olderThanList: "This overview was written before your latest changes.",
  writeNew: "Write a new overview",

  /**
   * The note beside a press that also writes the overview (the credit note, `CREDITS-overview.md`
   * 7a to 7e): Analyze in the empty state and Re-analyze in the banner or the sheet. The standing
   * that follows each lead is the shared credits line.
   */
  pressNote: {
    writes: (standing: string) => `Also writes the overview, using a credit. ${standing}.`,
    /** 7b: the bracket is still free; only the overview waits. Followed by the used-up line. */
    analyzeUsedUp: "Reads the bracket only; the overview waits for a credit.",
    /** 7e: the overview on screen stays; the used-up line follows. */
    reanalyzeUsedUp: "Reads the bracket only; the overview stays as it was.",
    /**
     * The app-wide cap: the player HAS credits, and it is the app that is paused, so "waits for a
     * credit" would be false. Followed by the cap's own reason (the-99-d9's ruling, 2026-09-24).
     */
    paused: (month: string) => `Reads the bracket only; the overview is paused until ${month} 1.`,
    /** The owner's testing share for the month is used. */
    ownerShare: (month: string) => `Reads the bracket only; you’ve used your testing share for ${month}.`,
  },

  /** Refused, in the tab (the Overview section itself) and in the modal (any one section). */
  notWritten: "not written",
  overviewRefused:
    "We wrote an overview and it did not check out against your list, so we are not showing it. Nothing about your deck changed.",
  sectionRefused:
    "We wrote this section and it did not check out against your list, so we are not showing it. The rest did. Nothing about your deck changed.",
  failedCount: (failed: number, total: number) =>
    `${failed} of ${total} ${total === 1 ? "card" : "cards"} failed checking`,

  modal: {
    title: "Overview",
    close: "Close overview",
    aside: (deck: string, when: string) => `${deck} · written ${when}`,
    sections: { overview: "Overview", primer: "Primer", keyCards: "Key cards", weaknesses: "Weaknesses" },
    primer: { strategy: "Core strategy", mulligan: "Mulligan", tips: "Key tips" },
    keep: "Keep",
    sendBack: "Send back",
    stale: "Your deck has changes since this was written, so parts of it might not match your list.",
  },
} as const;
