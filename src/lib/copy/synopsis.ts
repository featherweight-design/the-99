/**
 * The overview's copy (sub-project 6): the tab's short read, its write controls and the modal.
 *
 * THE PLAYER'S WORD IS "OVERVIEW" (Hugh, 2026-09-23), everywhere the summary is named, which
 * diverges from the handoff's "Synopsis" title, "View full synopsis" link and "Close synopsis"
 * label. Code, files and components keep "synopsis". Transcribed from `SYNOPSIS-modal.md`, the
 * `Synopsis Sheet` canvas and the Analysis-tab frames otherwise; owed to `/copy-review` with the
 * credit strings.
 */
const landsOf = (n: number) => `${n} ${n === 1 ? "land" : "lands"}`;

export const synopsisCopy = {
  label: "Overview",
  entry: "View full overview",

  /** Ruling A: a current reading with no overview. */
  absent: "No overview has been written for this deck yet.",
  writeOne: "Write one",
  /** Ruling A: the deck's own write just failed upstream (busy, timed out, malformed). */
  failed: "We couldn’t write the overview just now. Nothing about your deck changed.",
  /** The deck's own write was refused upstream (`upstream_rejected`: a bad key, a retired model
   *  id). No retry fixes it, so there is no Try again and no "just now". Owed to /copy-review. */
  rejected: "We couldn’t write the overview. Nothing about your deck changed.",
  tryAgain: "Try again",
  /** Ruling D: an older overview beside a fresh reading. */
  olderThanList: "This overview was written before your latest changes.",
  writeNew: "Write a new overview",

  /**
   * The overview's own loading (addendum_overview_loading, 2026-09-25). `writing` is the slot's
   * status line while a first overview is written (1b); `writingNew` sits in the label row while a
   * new one is written over a held overview; `ready` is said once when a written overview lands.
   * Owed to /copy-review.
   */
  writing: "Writing the overview\u2026",
  writingNew: "writing a new one for your changes",
  ready: "Overview ready.",

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
    /**
     * The method-change rewrite is free once per deck, so Re-analyze's note says so in place of
     * every credit form while a free try is left (addendum_method_notice, 1f). Owed to /copy-review.
     */
    free: "Also writes the overview, free this once because we changed how overviews are written.",
  },

  /**
   * The method-changed notice (addendum_method_notice, 2026-10-10): the shown overview was written
   * under the old method. Transcribed from the handoff's `M` block; owed to /copy-review.
   * `note` never carries the credits standing, so it reads the same at full credits, at none and
   * while the allowance is paused: the rewrite bypasses all three.
   */
  method: {
    /** Line A, 1a and 1f. */
    line: "We’ve changed how we write overviews. This one was written the old way.",
    note: "Free, no credit used. Only the overview is rewritten; your bracket and stats stay as they are.",
    /** The label row's status while the free rewrite runs (1b). */
    writing: "writing a new one with the new method",
    /** Line B, 1d: a free try failed and one is left. */
    failed: "We couldn’t write the new overview. Nothing about your deck changed.",
    oneLeft: "1 free try left. No credit used.",
    /** Line C, 1e: both free tries are used; the paid press takes over. */
    triesUsed: "We couldn’t write the new overview with the free tries. You can still write one with a credit.",
    /**
     * Line C while no credit can be spent (the allowance is paused, the owner's share or every
     * credit is used): "you can still write one with a credit" is not true this month, and the
     * paid press beside it says why. OWED to /copy-review (the audit's Copy section).
     */
    triesUsedNoCredit: "We couldn’t write the new overview with the free tries.",
    /** 1f: the stale banner leads, and its Re-analyze is the one press. */
    withStale: "Re-analyze above writes it the new way, free.",
  },

  /** Refused, in the tab (the Overview section itself) and in the modal (any one section). */
  notWritten: "not written",
  overviewRefused:
    "We wrote an overview and it did not check out against your list, so we are not showing it. Nothing about your deck changed.",
  sectionRefused:
    "We wrote this section and it did not check out against your list, so we are not showing it. The rest did. Nothing about your deck changed.",
  failedCount: (failed: number, total: number) =>
    `${failed} of ${total} ${total === 1 ? "card" : "cards"} failed checking`,

  /**
   * A version's overview (SYNOPSIS-modal.md §4, 6e): read only, opened from the version's expanded
   * panel, never stale and never written to. "Overview" per Hugh's 2026-09-23 word.
   */
  version: {
    entry: "Overview for this version",
    aside: (n: number, date: string) => `version ${n} · committed ${date}`,
    record: (n: number) =>
      `Written for version ${n} when it was committed. It describes that list, not your deck as it is now.`,
  },

  modal: {
    title: "Overview",
    close: "Close overview",
    aside: (deck: string, when: string) => `${deck} · written ${when}`,
    sections: { overview: "Overview", primer: "Primer", keyCards: "Key cards", weaknesses: "Weaknesses" },
    primer: { strategy: "Core strategy", mulligan: "Mulligan", tips: "Key tips" },
    keep: "Keep",
    sendBack: "Send back",
    /** The label of the line under a claim that lists the cards it is about (Overview accuracy,
     *  PR 6). Owed to /copy-review. */
    basedOn: "Based on",
    /**
     * The land range, drawn by the app as each box's first line; the model never writes it
     * (contract 6, the-99-d9's copy, 2026-09-24).
     */
    lands: {
      keep: (low: number, high: number) => (low === high ? landsOf(low) : `${low} to ${high} lands`),
      sendBack: (none: number, under: number, over: number) =>
        `${under - none === 1 ? `${none} or ${under}` : `${none} to ${under}`} lands, or ${over} or more`,
    },
    stale: "Your deck has changes since this was written, so parts of it might not match your list.",
  },
} as const;
