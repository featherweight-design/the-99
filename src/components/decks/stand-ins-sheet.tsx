"use client";

/**
 * The stand-ins sheet (swap tools, PR 4a): cheaper cards that do the job of one Shopping row, opened
 * by the row's ⇄. `ModalChrome` at 640 (audit F7); the body is `sheetModel`'s, drawn as-is.
 *
 * The list is read when the sheet opens, not shipped with the page: the gather is several queries
 * per card and most rows are never pressed. The head draws at once from the row the reader tapped,
 * and the list arrives under it.
 *
 * Take is PR 4b's: a press that swaps needs its receipt, its refusal and its undo, and a Take drawn
 * without them would be a control that does nothing. The row's grid keeps its first two columns.
 */
import { useCallback, useEffect, useState } from "react";

import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { provenanceForm, type PriceFact } from "../../lib/decks/price";
import { loadStandInsAction } from "../../lib/swaps/actions";
import { useSwapTools } from "../../lib/swaps/context";
import type { StandInsRead } from "../../lib/swaps/gather";
import { formatLimit, isOverLimit } from "../../lib/swaps/limit";
import { loadingStatus, sheetModel, type SheetRow } from "../../lib/swaps/sheet-model";
import { Crown } from "../ui/crown";
import { BuyTag } from "./buy-tag";
import { ModalChrome } from "./receipt-modal";

const copy = swapToolsCopy.sheet;

type Load = { state: "loading" } | { state: "failed" } | { state: "ready"; read: StandInsRead };

function Thumb({ imageUri, border }: { imageUri: string | null; border: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex-none w-[22px] h-[31px] rounded-[3px]"
      style={{
        border: `1px solid ${border}`,
        background: imageUri
          ? `center / cover no-repeat url("${imageUri}")`
          : "repeating-linear-gradient(135deg, var(--border) 0 3px, var(--surface-raised) 3px 6px)",
      }}
    />
  );
}

/** A price as the fact BuyTag reads, so the tag draws it exactly as it does on the row. */
const factOf = (cents: number, foilOnly: boolean, asOf: Date): PriceFact =>
  ({ cents: foilOnly ? null : cents, foilCents: foilOnly ? cents : null, etchedCents: null, asOf });

function StandInRow({ row, newestAsOf }: { row: SheetRow; newestAsOf: Date | null }) {
  return (
    <li
      className="grid grid-cols-[minmax(0,1fr)_72px] md:grid-cols-[minmax(0,1fr)_96px] gap-x-[10px] gap-y-[6px] md:gap-x-[12px] md:gap-y-0 items-center py-[10px] md:py-[9px] border-b border-[color:var(--border)]"
    >
      <div className="flex flex-col gap-[3px] min-w-0">
        <div className="flex items-center gap-[7px] min-w-0">
          <Thumb imageUri={row.imageUri} border="var(--border-dashed)" />
          <span
            aria-hidden="true"
            className="flex-none w-[7px] h-[7px] rounded-full"
            style={row.free ? { background: "var(--success)" } : { border: "1px dashed var(--fg-faint)" }}
          />
          <span
            className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold"
            style={{ color: "var(--fg)", borderBottom: "1px dotted var(--accent)" }}
          >
            {row.name}
          </span>
        </div>
        <p className="m-0 pl-[43px] font-mono text-[10.5px] leading-[1.45] [text-wrap:pretty]" style={{ color: "var(--fg-muted)" }}>
          {row.facts.join(" · ")}
        </p>
      </div>
      <div className="col-start-1 row-start-2 pl-[43px] md:col-start-2 md:row-start-1 md:pl-0 flex md:justify-end">
        {row.free ? (
          <span
            className="font-mono text-[9.5px] rounded-[4px] px-[6px] py-[1px]"
            style={{ color: "var(--success)", background: "color-mix(in oklab, var(--success) 13%, transparent)" }}
          >
            {copy.free}
          </span>
        ) : row.cents !== null && newestAsOf ? (
          <BuyTag variant="row" price={factOf(row.cents, row.foilOnly, newestAsOf)} newestAsOf={newestAsOf} />
        ) : null}
      </div>
    </li>
  );
}

export function StandInsSheet({
  card,
  newestAsOf,
  onClose,
}: {
  /** The Shopping row pressed. Its name and price draw the head before the list arrives. */
  card: DeckDetailCard;
  newestAsOf: Date | null;
  onClose: () => void;
}) {
  const tools = useSwapTools();
  const [load, setLoad] = useState<Load>({ state: "loading" });

  const deckId = tools?.deckId;
  const fetchList = useCallback(() => {
    if (!deckId) return;
    loadStandInsAction(deckId, card.oracleId)
      .then((r) => setLoad(r ? { state: "ready", read: r } : { state: "failed" }))
      .catch(() => setLoad({ state: "failed" }));
  }, [deckId, card.oracleId]);

  // The sheet opens loading, so the first read needs no state change of its own.
  useEffect(fetchList, [fetchList]);
  const retry = () => {
    setLoad({ state: "loading" });
    fetchList();
  };

  if (!tools) return null;
  const model = load.state === "ready" ? sheetModel(load.read) : null;
  const over = isOverLimit(card.price, newestAsOf, tools.limitCents);
  const status = loadingStatus(card.role);
  const provenance = newestAsOf ? provenanceForm(newestAsOf, new Date()) : null;

  return (
    <ModalChrome title={copy.title} closeLabel={copy.closeAria} onClose={onClose} width={640}>
      <div data-testid="stand-ins-sheet" className="flex flex-col gap-[12px] md:gap-[14px] px-[16px] pt-[14px] pb-[24px] md:px-[18px] md:pt-[16px] md:pb-[18px]">
        <section
          className="flex flex-col gap-[6px] px-[13px] pt-[11px] pb-[12px] rounded-[10px] border border-[color:var(--border)]"
          style={{ background: "var(--bg)" }}
        >
          <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase" style={{ color: "var(--fg-faint)" }}>
            {copy.replacing(tools.deckName)}
          </span>
          <div className="flex flex-wrap items-center gap-x-[9px] gap-y-[6px]">
            <Thumb imageUri={load.state === "ready" ? load.read.original.imageUri : null} border="var(--border-strong)" />
            <span aria-hidden="true" className="flex-none w-[7px] h-[7px] rounded-full" style={{ border: "1px dashed var(--fg-faint)" }} />
            <span className="text-[14px] font-semibold" style={{ color: "var(--fg)", borderBottom: "1px dotted var(--accent)" }}>
              {card.name}
            </span>
            <BuyTag variant="row" price={card.price ?? null} newestAsOf={newestAsOf} />
            {over ? (
              <span className="font-mono text-[10px] whitespace-nowrap" style={{ color: "var(--warning)" }}>
                {swapToolsCopy.row.over(formatLimit(tools.limitCents))}
              </span>
            ) : null}
          </div>
          {model ? (
            <p className="m-0 font-mono text-[10.5px] leading-[1.5]" style={{ color: "var(--fg-muted)" }}>{model.job}</p>
          ) : null}
        </section>

        {load.state === "loading" ? (
          <div
            role="status"
            className="flex flex-col items-center justify-center text-center min-h-[250px] px-[20px] py-[28px] rounded-[10px]"
            style={{ background: "radial-gradient(420px 220px at 50% 70%, color-mix(in oklab, var(--accent) 8%, transparent), transparent 70%)" }}
          >
            <Crown pulse />
            <h3 className="m-0 mt-[20px] w-full font-display font-bold text-[18px] leading-[1.25] [text-wrap:balance]" style={{ color: "var(--fg)" }}>
              {copy.loadingHeading}
            </h3>
            {status ? (
              <p className="m-0 mt-[8px] font-mono text-[12px]" style={{ color: "var(--fg-faint)" }}>{status}</p>
            ) : null}
          </div>
        ) : null}

        {load.state === "failed" ? (
          <div
            role="alert"
            className="flex flex-col items-center text-center px-[20px] pt-[30px] pb-[26px] rounded-[10px] border border-[color:var(--border)]"
            style={{ background: "var(--surface)" }}
          >
            <Crown tone="quiet" />
            <span className="mt-[18px] font-mono text-[9.5px] tracking-[0.12em] uppercase" style={{ color: "var(--danger)" }}>
              {copy.failed.tag}
            </span>
            <h3 className="m-0 mt-[8px] w-full font-display font-bold text-[18px] leading-[1.25] [text-wrap:balance]" style={{ color: "var(--fg)" }}>
              {copy.failed.heading}
            </h3>
            <p className="m-0 mt-[10px] max-w-[420px] text-[13px] leading-[1.55] [text-wrap:pretty]" style={{ color: "var(--fg-body)" }}>
              {copy.failed.body}
            </p>
            <p className="m-0 mt-[8px] max-w-[420px] text-[12.5px] leading-[1.55] [text-wrap:pretty]" style={{ color: "var(--fg-muted)" }}>
              {copy.failed.kept(card.name)}
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-[18px] inline-flex items-center justify-center h-[44px] md:h-auto px-[18px] md:px-[16px] md:py-[7px] rounded-[8px] md:rounded-[7px] text-[13px] md:text-[12.5px] font-semibold bg-transparent cursor-pointer border border-solid border-[color:var(--accent)] text-[color:var(--accent)]"
            >
              {copy.retry}
            </button>
          </div>
        ) : null}

        {model?.lead ? (
          <p className="m-0 text-[12.5px] leading-[1.55] [text-wrap:pretty]" style={{ color: "var(--fg-body)" }}>{model.lead}</p>
        ) : null}

        {model?.sentence ? (
          <p className="m-0 pt-[12px] border-t border-[color:var(--border)] text-[13px] leading-[1.6] [text-wrap:pretty]" style={{ color: "var(--fg-body)" }}>
            {model.sentence}
          </p>
        ) : null}

        {model?.groups.map((group) => (
          <section key={group.heading} className="flex flex-col">
            <h4 className="m-0 pb-[6px] font-mono font-normal text-[9.5px] tracking-[0.12em] uppercase border-b border-[color:var(--border)]" style={{ color: "var(--fg-faint)" }}>
              {group.heading}
            </h4>
            <ul className="m-0 p-0 list-none">
              {group.rows.map((row) => (
                <StandInRow key={row.oracleId} row={row} newestAsOf={load.state === "ready" ? load.read.newestAsOf : null} />
              ))}
            </ul>
          </section>
        ))}

        {model?.foot && provenance ? (
          <p className="m-0 font-mono text-[9.5px] leading-[1.5]" style={{ color: "var(--fg-locked)" }}>{copy.foot(provenance.when)}</p>
        ) : null}
      </div>
    </ModalChrome>
  );
}
