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
 * The control each step's press ring floats over (`PressRing`): a selector for the first match inside the app panel. Step 1
 * rings the first collection tile (`data-collection-tile`, grid-view), step 2 the first row's Fit chip ("Why it fits", the
 * board's), step 3 the whole first result row: with four or more rows and no narrow note the first rows draw as best fits
 * (`best-fit`) and the rest as `result-row`; a selector list matches in document order, so the first of either is the one ringed
 * (its card-name control is stretched over the row, so the row is the control). A step with no entry draws no
 * ring.
 */
export function ringTarget(index: number): string | null {
  switch (index) {
    case 0:
      return "[data-collection-tile]";
    case 1:
      return "[data-fit-chip]";
    case 2:
      return "[data-testid='best-fit'], [data-testid='result-row']";
    default:
      return null;
  }
}

/** The step bodies not built yet draw nothing: the section only ships when every step has its data and its half. */
export function StepBody({ index, data, onOpenCard }: { index: number; data: Projected; onOpenCard: (oracleId: string) => void }) {
  switch (index) {
    case 0:
      return <StepCollection data={data} onOpen={onOpenCard} />;
    case 1:
      return <StepCommanders data={data} />;
    case 2:
      return <StepChoose data={data} />;
    default:
      return null;
  }
}
