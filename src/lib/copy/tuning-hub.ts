// The Tuning hub's landing and shortcuts. ONE exported object so it can go to /copy-review as a
// block. PLACEHOLDERS owed to /copy-review, carried from the handoff's copy file
// (design/design_handoff_the99_tuning_hub, `tuning-hub · copy strings.ts`, the `hub` and
// `shortcuts` blocks, with the R2 Proposed cuts purpose). US English, no em dashes, and never the
// words AI, model or LLM: tier 2 is "a deeper look". Engineering additions are marked.

import { deckStatsCopy } from "./deck-stats";

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
      /** Mana Balance has no Look deeper (tier 2 is a later sub-project), so the pill says free. */
      cost: "free",
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
      runs: (n: number, running: number) => `${n} ${n === 1 ? "run" : "runs"}${running ? ` · ${running} running` : ""}`,
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
    balanceMana: "balance mana →",
    balanceManaShort: "balance →",
    /** Reworded by /copy-review: R3 retired the handoff's `{color} is short`, so the name says what
     *  the press does and never judges a color. */
    balanceManaAria: (have: number, target: number) => `Land, ${have} of ${target}. Open Mana Balance.`,
  },
  /** History (handoff `history` block, canvas C H1 to H4b). Engineering additions are marked. */
  history: {
    sub: "every run of every tool · newest first",
    /** Engineering: the empty state's sub as canvas H2b draws it, with nothing to order. */
    subEmpty: "every run of every tool",
    filterAll: "All",
    /** Engineering: the chip row's and the scroll region's accessible names. */
    filterLabel: "Show runs of",
    regionLabel: "Runs",
    tool: { suggested: "Suggested", mana: "Mana", cuts: "Cuts" },
    tier: { free: "free", credit: "1 credit", deeper: "deeper look" },
    outcome: { ok: "ok", refused: "refused", failed: "failed", stopped: "stopped", running: "running" },
    more: "Show 20 more",
    foot: "Kept for as long as the deck is. A free count is recorded once per version of the list.",
    empty: { head: "No runs yet", body: "Every run of every Tuning tool on this deck lands here, newest first. Open one to see it again." },
    emptyFiltered: "No runs of this tool yet",
    back: "‹ History",
    pastMeta: (date: string, version: number, tier: string) => `${date} · version ${version} · ${tier}`,
    /** Engineering: a run that read a deck with no committed version. */
    pastMetaNoVersion: (date: string, tier: string) => `${date} · ${tier}`,
    pastNote: (n: number) => `A past run, read-only. The list has changed by ${n} cards since; nothing here can be applied now.`,
    /** Engineering: the note when the list has not moved, or the version it read is gone. */
    pastNoteUncounted: "A past run, read-only. Nothing here can be applied now.",
    /** Engineering (re-review, Hugh 2026-10-12): the note above a tool History reopened. A paid
     *  run's lines are re-checked one by one; a free count named no card, so its tool reads the
     *  deck as it is now and the note keeps what the count found. /copy-review, 2026-10-12. */
    review: {
      note: { cuts: (date: string) => `From a run on ${date}. Each cut is checked against the deck as it is now.`, suggested: (date: string) => `From a run on ${date}. Each change is checked against the deck as it is now.` },
      counted: (date: string, summary: string) => `Counted ${date}: ${summary}. Below is the deck as it is now.`,
    },
    /** Engineering: a past run that returned no lines, and a free count's own body. */
    pastNothing: "This run returned nothing to change.",
    loadFailed: { tag: "Couldn’t load", body: "This deck’s history didn’t load. The runs are kept; only the list failed to arrive." },
    /** Engineering: the failed state's retry and a past run that will not open. */
    retry: "Try again",
    pastFailed: "This run didn’t load. Try again from History.",
    /** Engineering: each row's summary, from the canvas fixtures (§5 of the build spec). */
    summary: {
      running: { suggested: "Reading your deck", cuts: "Looking deeper", mana: "Looking deeper" },
      suggestedOk: (inN: number, outN: number, added: number, cut: number, rejected: number) => {
        const answered = [
          ...(added || cut ? [`${added} added, ${cut} cut`] : []),
          ...(rejected ? [`${rejected} rejected`] : []),
        ].join(", ");
        return `${inN} in, ${outN} out${answered ? ` · ${answered}` : ""}`;
      },
      cutsDeeperOk: (named: number, asked: number, cut: number, kept: number) => {
        const answered = [...(cut ? [`${cut} cut`] : []), ...(kept ? [`${kept} kept`] : [])].join(", ");
        return `${named} of ${asked} named${answered ? ` · ${answered}` : ""}`;
      },
      cutsFree: (over: number, roles: readonly { label: string; over: number }[]) =>
        `${over} over${roles.length ? ` · ${roles.map((r) => `${r.label} ${r.over} over`).join(", ")}` : ""}`,
      failed: "didn’t finish · credit back",
      refused: "found nothing it could check · credit back",
      stopped: { suggested: "stopped while reading · credit back", deeper: "stopped while looking · credit back" },
      /** Engineering (Mana Balance PR 3): the Colors card's own totals, as the tool's sub-line
       *  states them. The canvas fixtures (`green short by 3`, `every color covered`) are R1
       *  verdicts, which R3 retired. */
      manaFree: (pips: number, sources: number) => deckStatsCopy.colors.denom(pips, sources),
      counted: "counted",
    },
  },
} as const;
