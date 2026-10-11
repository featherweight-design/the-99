// The Tuning hub's landing and shortcuts. ONE exported object so it can go to /copy-review as a
// block. PLACEHOLDERS owed to /copy-review, carried from the handoff's copy file
// (design/design_handoff_the99_tuning_hub, `tuning-hub · copy strings.ts`, the `hub` and
// `shortcuts` blocks, with the R2 Proposed cuts purpose). US English, no em dashes, and never the
// words AI, model or LLM: tier 2 is "a deeper look". Engineering additions are marked.

export const tuningHubCopy = {
  title: "Tuning",
  allTools: "All tools",
  back: "‹ Tuning",
  /** The phone's header beside the open tool's mark. Engineering: counts the tools this
   *  deployment draws, so a hub with two tools says `1 of 2`. */
  toolOf: (n: number, total: number) => `${n} of ${total} tools`,
  tools: {
    suggested: {
      name: "Suggested changes",
      purpose: "Up to five swaps, read from your games, your notes and the list.",
      cost: "1 credit a run",
      /** Engineering (plan 2026-10-11): Suggested changes reads the deck's reading, and a deck
       *  over 100 has none, so its tile is inert there and says why. */
      needsReading: "Works from the deck’s analysis, and analysis needs a full deck.",
    },
    mana: {
      name: "Mana Balance",
      purpose: "Counts every source of each color against what your spells ask for.",
      cost: "free · look deeper 1 credit",
    },
    cuts: {
      name: "Proposed cuts",
      purpose: "Counts where the deck runs long. A deeper look names the cuts.",
      cost: "free · look deeper 1 credit",
      over: (n: number) => `this deck is ${n} over`,
      /** The inert tile. `total` is the spine's figure, commanders included (ruling 4). */
      notOffered: (total: number) => `Offered once the deck passes 100 cards. This one is at ${total}.`,
    },
    history: {
      name: "History",
      purpose: "Every run of every tool on this deck, newest first.",
      runs: (n: number, running: number) => `${n} runs${running ? ` · ${running} running` : ""}`,
    },
  },
  /** Dates are US short form, month first: `Oct 7`. */
  lastRun: (date: string, outcome?: string) => `last run ${date}${outcome ? ` · ${outcome}` : ""}`,
  /** Engineering: what came of the last run, on the desktop tile (the phone drops it, canvas A1b). */
  outcome: {
    applied: (accepted: number, total: number) => `${accepted} of ${total} applied`,
    cut: (accepted: number, total: number) => `${accepted} of ${total} cut`,
    nothing: "nothing to change",
    failed: "didn’t finish",
    stopped: "stopped",
  },
  /** The tool's own live-region words, then the elapsed `m:ss`. */
  running: (words: string, elapsed: string) => `${words} · ${elapsed}`,
  runningWords: { suggested: "reading your deck", deeper: "looking deeper" },
  /** The tile's accessible name: tool, then its status. */
  tileLabel: (name: string, status: string) => (status ? `${name}, ${status}` : name),
  shortcuts: {
    proposedCuts: "Proposed cuts →",
  },
} as const;
