"use client";

import type { ReactNode } from "react";

import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import type { ProfileState } from "./use-deck-profile";

/**
 * The Analysis tab's own readings, above whatever the tab already draws.
 *
 * PRESENTATIONAL ON PURPOSE. The decision about when to fetch belongs to `useDeckProfile` in the
 * shell — a panel that unmounts on every tab switch cannot own a cache — so this component takes
 * the state and renders it, which is also what makes every reading testable without a request.
 *
 * NOTHING HERE REPLACES THE MIX. Round 0 moves the strip into this tab on purpose, and it is
 * counted from the list rather than from a profile, so it is true in every state below. The
 * readings sit ABOVE it and `children` is the tab's existing content: a reader whose profile
 * failed still has a true mix, and saying so is the difference between a delay and an outage.
 *
 * NO SPACE IS RESERVED FOR PROSE THAT IS NOT THERE. No paragraph-shaped placeholder, no shimmer,
 * no dummy lines — `STATES-synopsis.md`'s rule above all five states, and the reason the absent
 * reading is one line rather than a block.
 */
export function AnalysisPanel({
  state,
  onRequest,
  children,
}: {
  state: ProfileState;
  onRequest: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Reading state={state} onRequest={onRequest} />
      {children}
    </div>
  );
}

function Reading({ state, onRequest }: { state: ProfileState; onRequest: () => void }) {
  // THE FLAG BEING OFF DRAWS NOTHING. Not a reading, not an explanation: this deployment has no
  // analysis, and a sentence about a feature the reader cannot use is noise. The tab itself is
  // hidden by the same flag, so this branch is only reachable in a deployment that flipped it
  // mid-visit.
  if (state.kind === "disabled") return null;

  // A DECK THAT CANNOT BE READ DRAWS NOTHING EITHER. The page around it has already answered
  // that question — a deck the reader does not own renders not-found, not a tab — so a second
  // sentence here would be arguing with the page.
  if (state.kind === "missing") return null;


  // ONE HEADING IN THE TABPANEL. `synopsis.heading` is the same sentence — "What this deck is" —
  // and the slot below draws it, so a heading here put two identical `h3`s in one panel.
  return (
    <section aria-live="polite" className="flex flex-col gap-1.5">
      {state.kind === "ready" ? (
        // ROUND 4's t2 — determined, no edits since: outlined secondary, "Analyze again".
        //
        // The re-ask has to stay reachable. An earlier version drew nothing here, which removed
        // the only control on the surface the moment a read succeeded — so the re-ask path this
        // component documents was unreachable and an edited deck could never be re-read. The
        // verdict lands beside this in PR 4a; it does not replace the control.
        <button
          type="button"
          onClick={onRequest}
          className="w-fit rounded-[3px] border border-[color:var(--border-strong)] px-2 py-1 font-mono text-[11px] text-[color:var(--fg-body)] hover:bg-[color:var(--surface-raised)]"
        >
          {deckAnalysisCopy.panel.again}
        </button>
      ) : state.kind === "idle" ? (
        <>
          {/* Round 4's t1: never determined. The invitation, in its plain form — that round
              gives the control three weights, a fixed position and a tab dot, and refines
              this. It has to exist for the tab to be usable at all, which is why it is here
              rather than waiting. */}
          <button
            type="button"
            onClick={onRequest}
            className="w-fit rounded-[3px] bg-[color:var(--accent)] px-2.5 py-1 font-mono text-[11px] text-[color:var(--bg)]"
          >
            {deckAnalysisCopy.panel.analyze}
          </button>
          <p className="font-mono text-[11px] text-[color:var(--fg-faint)]">
            {deckAnalysisCopy.panel.analyzeCost}
          </p>
        </>
      ) : state.kind === "loading" ? (
        <p className="text-[13px] text-[color:var(--fg-faint)]">{deckAnalysisCopy.panel.reading}</p>
      ) : (
        <>
          <p className="max-w-[62ch] text-[13px] text-[color:var(--fg-muted)]">
            {deckAnalysisCopy.panel.failed}
          </p>
          {/* A BUTTON, NEVER AUTOMATIC. A silent retry loop is how a wait becomes a bill —
              `STATES-synopsis.md` says so about the refused state and it is the same rule. */}
          <button
            type="button"
            onClick={onRequest}
            className="w-fit rounded-[3px] border border-[color:var(--border)] px-2 py-1 font-mono text-[11px] text-[color:var(--fg-body)] hover:bg-[color:var(--surface-raised)]"
          >
            {deckAnalysisCopy.panel.retry}
          </button>
        </>
      )}
    </section>
  );
}

/**
 * The synopsis slot, in the one reading reachable today.
 *
 * SHIPS NO SENTENCE. What a summary may claim, its length and its accept contract belong to
 * sub-project 6; `commander_support.prose` is the precedent for the null state — a row that
 * fails its accept contract stores nothing and the surface draws no paragraph.
 *
 * AND NO CONTROL. Design's state 2 pairs the absent line with `Write one` and "about five
 * seconds", which is right for the round that can generate one. Offering a button that cannot
 * write is worse than the plain sentence, so the strings are transcribed in the copy module and
 * left unused until something can honour them.
 */
export function SynopsisSlot() {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-[color:var(--fg-faint)]">
        {deckAnalysisCopy.synopsis.heading}
      </h3>
      <p className="text-[13px] text-[color:var(--fg-faint)]">{deckAnalysisCopy.synopsis.absent}</p>
    </section>
  );
}
