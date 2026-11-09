"use client";
// What each step draws: the signed-in drawing half, from the exported fixture data, inside the demo's providers. A step takes
// only `data` (the committed projection) and draws no per-player state: every press that would write is inert through the
// providers, and nothing here reads a table, a request or a model.

import { GridView } from "../../collection/grid-view";
import { CommandersList } from "../../commanders/commanders-list";
import { CardDetailTrigger } from "../../cards/card-detail-context";
import { ChooseResultsView } from "../../intake/choose-results-view";
import type { RowDoorProps } from "../../intake/choose-row-view";
import { commanderPagePath } from "../../public/links";
import { landingCopy } from "../../../lib/copy/landing";
import { helpMeChooseCopy } from "../../../lib/copy/help-me-choose";
import { DEMO_PLAYER } from "../../../lib/demo/player";
import { emptyParams } from "../../../lib/intake/params";
import type { RingPlace } from "./demo-ring";
import { StepAnalysis, StepSuggested } from "./demo-step-analysis";
import { StepBuy } from "./demo-step-buy";
import { StepDeck } from "./demo-step-deck";
import { StepGetTo99 } from "./demo-step-get-to-99";
import type { Projected } from "../../../lib/demo/projected";

const noop = () => {};

export function StepCollection({ data, onOpen }: { data: Projected; onOpen: (oracleId: string) => void }) {
  return <GridView cards={data.collection.cards} totalCards={data.collection.totalCards} onShowMore={noop} onOpen={onOpen} />;
}

export function StepCommanders({ data }: { data: Projected }) {
  // A row's press goes to the commander's PUBLIC page: the signed-in address would send a visitor to sign in.
  return (
    <div className="flex flex-col gap-[12px]">
      <p data-testid="demo-commanders-count" className="m-0 rounded-[12px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-inset)] px-[14px] py-[12px] font-mono text-[12px] text-[color:var(--fg-muted)]">{landingCopy.demo.commandersCount(data.commanders.total, DEMO_PLAYER)}</p>
      <CommandersList rows={data.commanders.rows} rankBySlug={data.commanders.rankBySlug} avail="all" hrefFor={commanderPagePath} />
    </div>
  );
}

const door = ({ oracleId, name, imageUri, preview, testId, className, children }: RowDoorProps) => (
  <CardDetailTrigger oracleId={oracleId} name={name} imageUri={imageUri} preview={preview} testId={testId} className={className}>
    {children}
  </CardDetailTrigger>
);
const noopRetry = () => {};

/** Step 3: the stored read's ranking, read-only: the wish above, the rows below, no press leaves the page. */
export function StepChoose({ data }: { data: Projected }) {
  const choose = data.choose;
  if (!choose) return null;
  const rows = choose.page.rows;
  return (
    <div className="flex flex-col gap-[14px]">
      <div data-testid="demo-wish" className="rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)] p-[12px]">
        <p className="m-0 flex items-center gap-[8px] font-mono text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--fg-muted)]">
          {helpMeChooseCopy.intake.extra.label}
          <span className="rounded-[6px] border border-solid border-[color:var(--border-strong)] px-[6px] py-[1px] text-[10px] normal-case tracking-normal">{landingCopy.demo.readOnly}</span>
        </p>
        <p className="m-0 mt-[6px] text-[13.5px] leading-[1.5] text-[color:var(--fg-body)]">{choose.words}</p>
      </div>
      <ChooseResultsView
        page={choose.page}
        rows={rows}
        hasMore={false}
        failed={false}
        pending={false}
        trials={choose.trials}
        read="done"
        retry={noopRetry}
        showMore={noopRetry}
        door={door}
        inert
        params={{ ...emptyParams(), words: choose.words, results: true }}
        themeLabels={choose.themeLabels}
        cardName={null}
        changeHref="#"
        deckNames={choose.deckNames}
      />
    </div>
  );
}

/**
 * The control each step's press ring floats over (`PressRing`): a selector for the first match inside the app panel. A ring
 * is drawn only where a press leads somewhere with no card details behind it: step 2 the first row's Fit chip ("Why it fits",
 * the board's), step 4 the mark key, which decodes the marks the rows below carry, step 5 the first
 * finding that opens its receipt, steps 7 and 8 the tab not yet open. The card rings (steps 1, 3 and 6) return with 5l-c,
 * which supplies card details: until then a card press opens nothing, so those steps draw no ring. A step with no entry draws
 * no ring.
 */
export function ringTarget(index: number): string | null {
  switch (index) {
    case 1:
      return "[data-fit-chip]";
    case 3:
      // The mark key (the first group in the step), near the top of the step: the first marked row sits ~1,850px down. The key's
      // entries are not controls, so the key as a whole is ringed.
      return "[data-testid='demo-deck'] [role='group']";
    case 4:
      return "[data-testid^='finding-']:has(button)";
    case 6:
    case 7:
      return "[role='tab'][aria-selected='false']";
    default:
      return null;
  }
}

/** Where each step's ring label sits (`RingPlace`): a tab's ring sits right under the panel label, so its label goes under it; step 1's tile has the legend row above; every other target is wide, with a label straddling its top edge. */
export function ringPlace(index: number): RingPlace {
  switch (index) {
    case 0:
      return "inside";
    case 6:
    case 7:
      return "bottom";
    default:
      return "top";
  }
}

/** One body per step, by index; an index past the eight draws nothing. */
export function StepBody({ index, data, onOpenCard }: { index: number; data: Projected; onOpenCard: (oracleId: string) => void }) {
  switch (index) {
    case 0:
      return <StepCollection data={data} onOpen={onOpenCard} />;
    case 1:
      return <StepCommanders data={data} />;
    case 2:
      return <StepChoose data={data} />;
    case 3:
      return <StepDeck data={data} />;
    case 4:
      return <StepAnalysis data={data} />;
    case 5:
      return <StepSuggested data={data} />;
    case 6:
      return <StepGetTo99 data={data} />;
    case 7:
      return <StepBuy data={data} onOpenCard={onOpenCard} />;
    default:
      return null;
  }
}
