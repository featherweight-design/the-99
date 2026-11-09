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
import { DemoDeckScope, usePressedOpener } from "./demo-providers";
import { StepAnalysis, StepSuggested } from "./demo-step-analysis";
import { StepBuy, deckRoleOf, shoppingDeckOf } from "./demo-step-buy";
import { cardStepsFor } from "./demo-detail";
import { StepDeck } from "./demo-step-deck";
import { StepGetTo99 } from "./demo-step-get-to-99";
import type { DemoCardStep } from "../../../lib/demo/project-cards";
import type { Projected } from "../../../lib/demo/projected";

const noop = () => {};

export function StepCollection({ data, onOpen }: { data: Projected; onOpen: (oracleId: string, opener: HTMLElement | null) => void }) {
  const press = usePressedOpener(onOpen);
  return (
    <div className="contents" onClickCapture={press.capture}>
      <GridView cards={data.collection.cards} totalCards={data.collection.totalCards} onShowMore={noop} onOpen={press.open} />
    </div>
  );
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

export { DemoCardHost } from "./demo-card-host";
// The card details' loader and the lookup a press opens by (`detailFor`) ride this chunk: the frame (`demo.tsx`) imports nothing
// of them statically, so the landing's first load carries neither the modal nor the card data's decode.
export { loadDemoCardDetails, mergeCardChunks } from "../../../lib/demo/card-details";
export { detailFor } from "./demo-detail";

/** The card-details chunks the step on screen needs (`cardStepsFor`): step 8's Shopping list names the deck whose chunk it takes. */
export function cardStepsOf(data: Projected, index: number): DemoCardStep[] {
  const deck = index === 7 ? shoppingDeckOf(data) : null;
  return cardStepsFor(index, deck ? deckRoleOf(data, deck) : null);
}

/** One body per step, by index; an index past the eight draws nothing. */
export function StepBody({ index, data, onOpenCard }: { index: number; data: Projected; onOpenCard: (oracleId: string, opener: HTMLElement | null) => void }) {
  switch (index) {
    case 0:
      return <StepCollection data={data} onOpen={onOpenCard} />;
    case 1:
      return <StepCommanders data={data} />;
    case 2:
      return <StepChoose data={data} />;
    // Steps 4 to 6 are the played deck (Ashling): a card pressed there carries that deck's role (`detailFor` lays that deck's own combos over the card it opens).
    case 3:
      return <DemoDeckScope role="played"><StepDeck data={data} /></DemoDeckScope>;
    case 4:
      return <DemoDeckScope role="played"><StepAnalysis data={data} /></DemoDeckScope>;
    case 5:
      return <DemoDeckScope role="played"><StepSuggested data={data} /></DemoDeckScope>;
    case 6:
      return <StepGetTo99 data={data} />;
    case 7:
      return <StepBuy data={data} onOpenCard={onOpenCard} />;
    default:
      return null;
  }
}
