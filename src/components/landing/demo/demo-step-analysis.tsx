"use client";
// Steps 5 and 6, on the played deck: the Analysis tab (the verdict, the climb, the findings, the benchmarks, with the Overview
// beside the verdict) and Suggested changes' stored run. Both are the signed-in drawing halves handed the stored reading and the
// stored run from the committed projection. The paid presses (Analyze again, Write an overview, Apply, Undo, a pick) either do
// not draw over a stored result or are held by `readOnly`; the ones that remain are handed callbacks that write nothing.

import { AnalysisPanel } from "../../decks/analysis-panel";
import type { DeclarationControl } from "../../decks/declaration";
import type { ProfileState } from "../../decks/deck-profile-state";
import { SuggestedChangesRun, type SuggestionSetActions } from "../../decks/suggested-changes-run";
import { SynopsisOverview } from "../../decks/synopsis-overview";
import type { LineItem } from "../../../lib/tuning/state";
import type { Projected } from "../../../lib/demo/projected";
import { DemoHead } from "./demo-tabs";

const noop = () => {};
// `isLine` (`lib/tuning/state.ts`) is the same test, but that file sits in a directory the public surface may not reach by
// value, so the demo states it over the type alone.
const isLineItem = (item: { side?: "add" | "cut" }): item is LineItem => item.side !== undefined;

export function StepAnalysis({ data }: { data: Projected }) {
  const played = data.decks.played;
  const reading = data.analysis.reading;
  const state: ProfileState = { kind: "ready", ...reading };
  // The declaration's ask is a control that writes (the player's answer), so it draws only where the deck already carries one.
  const declaration: DeclarationControl | undefined =
    played.declared !== null ? { declared: played.declared, version: reading.versionNumber, previous: null, onDeclare: noop, refused: false } : undefined;
  const overview = data.overview;
  return (
    <div data-testid="demo-analysis">
      <DemoHead deckName={played.deckName} readOnly />
      <AnalysisPanel
        state={state}
        onRequest={noop}
        declaration={declaration}
        art={played.analysis.art}
        ledgerAvailability={played.analysis.ledgerAvailability}
        overview={overview ? (
          <SynopsisOverview
            state={overview.state}
            busy={false}
            deckName={played.deckName}
            commanderId={played.commander?.oracleId ?? null}
            art={played.analysis.art}
            readingFresh={reading.fresh}
            settled
            onWrite={noop}
            onRetry={noop}
            onSeeWhich={noop}
            reanalyze={{ onPress: noop, disabled: true, note: null }}
          />
        ) : null}
      />
    </div>
  );
}

/** The run's writes, refused: `readOnly` draws no Apply, Undo or pick, so none is ever called. */
const refuse = async () => ({ ok: false as const, message: "" });
const INERT_ACTIONS: SuggestionSetActions = {
  apply: refuse,
  undo: refuse,
  pick: async () => ({ ok: false }),
};

export function StepSuggested({ data }: { data: Projected }) {
  const suggested = data.suggested;
  if (!suggested) return null;
  const played = data.decks.played;
  const { state } = suggested;
  return (
    <div data-testid="demo-suggested">
      <DemoHead deckName={played.deckName} readOnly />
      <SuggestedChangesRun
        runId={suggested.runId}
        deckId={suggested.deckId}
        ask={state.itemsAsk ?? null}
        lines={state.items.filter(isLineItem)}
        live={null}
        startedAt={null}
        report={state.itemsValidationReport}
        permits={played.permits ?? []}
        declared={played.declared}
        newestPriceAsOf={state.newestPriceAsOf}
        figures={played.runFigures}
        drift={null}
        actions={INERT_ACTIONS}
        onChanged={async () => null}
        onAnnounce={noop}
        onNewRun={noop}
        readOnly
        groupingInMemory
      />
    </div>
  );
}
