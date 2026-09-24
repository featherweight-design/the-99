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

import { printedFaceName } from "../../lib/collection/browse";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { provenanceForm, type PriceFact } from "../../lib/decks/price";
import { loadStandInsAction, takeStandInAction, undoSwapAction } from "../../lib/swaps/actions";
import { useSwapTools } from "../../lib/swaps/context";
import type { StandInsRead } from "../../lib/swaps/gather";
import { formatLimit, isOverLimit } from "../../lib/swaps/limit";
import { loadingStatus, sheetModel, type SheetRow } from "../../lib/swaps/sheet-model";
import { AvailabilityMarker } from "../ui/availability-marker";
import { CardDetailTrigger } from "../cards/card-detail-provider";
import { Crown } from "../ui/crown";
import { BuyTag } from "./buy-tag";
import { MutationError } from "./mutation-error";
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

const APPLY =
  "inline-flex items-center justify-center h-[44px] w-[72px] rounded-[8px] text-[13px] font-semibold md:h-auto md:w-auto md:rounded-[7px] md:px-[13px] md:py-[6px] md:text-[12.5px] bg-transparent cursor-pointer disabled:opacity-50 text-[color:var(--accent)] [border:1px_solid_var(--accent)] hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)]";
const QUIET =
  "ml-auto min-h-[44px] md:min-h-[32px] rounded-[7px] px-[11px] py-[6px] text-[12px] font-medium bg-transparent cursor-pointer disabled:opacity-50 text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] hover:text-[color:var(--fg)]";

/** What the sheet knows about one row's Take: the press in flight, a refusal, or a throw. */
type RowTake = {
  /** Null once a take has landed on another row: Take is removed, not disabled (R2). */
  onTake: (() => void) | null;
  taking: boolean;
  refused: { body: string; onReread: () => void; onClose: () => void } | null;
  error: string | null;
  cut: string;
};

function StandInRow({ row, newestAsOf, take, siblings }: { row: SheetRow; newestAsOf: Date | null; take: RowTake; siblings: string[] }) {
  return (
    <li className="border-b border-[color:var(--border)]">
      <div className="grid grid-cols-[minmax(0,1fr)_72px] md:grid-cols-[minmax(0,1fr)_96px_64px] gap-x-[10px] gap-y-[6px] md:gap-x-[12px] md:gap-y-0 items-center py-[10px] md:py-[9px]">
        <div className="flex flex-col gap-[3px] min-w-0">
          <div className="flex items-center gap-[7px] min-w-0">
            <Thumb imageUri={row.imageUri} border="var(--border-dashed)" />
            <span
              aria-hidden="true"
              className="flex-none w-[7px] h-[7px] rounded-full"
              style={row.free ? { background: "var(--success)" } : { border: "1px dashed var(--fg-faint)" }}
            />
            <CardDetailTrigger
              oracleId={row.oracleId}
              name={row.name}
              siblings={siblings}
              className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-left text-[13px] font-semibold bg-transparent border-0 p-0 cursor-pointer"
              style={{ color: "var(--fg)", borderBottom: "1px dotted var(--accent)" }}
            >
              {row.name}
            </CardDetailTrigger>
            {/* A free copy a draft holds: the shipped marker, read as `soft` (free, owned, held). */}
            {row.free && row.soft > 0 ? (
              // The row sets no meta type for the marker to inherit, so it is given its own: mono 10.5.
              <span className="flex-none font-mono text-[10.5px]">
                <AvailabilityMarker availability={{ owned: 1, hard: 0, soft: row.soft, free: 1, claims: [] }} seam="var(--surface-raised)" />
              </span>
            ) : null}
          </div>
          {/* A row left with nothing to say (its give-up said once in the lead) draws no second line. */}
          {row.facts.length ? (
            <p className="m-0 pl-[43px] font-mono text-[10.5px] leading-[1.45] [text-wrap:pretty]" style={{ color: "var(--fg-muted)" }}>
              {row.facts.join(" · ")}
            </p>
          ) : null}
        </div>
        <div className="col-start-1 row-start-2 pl-[43px] md:col-start-2 md:row-start-1 md:pl-0 flex md:justify-end">
          <PricePlate row={row} newestAsOf={newestAsOf} />
        </div>
        <div className="col-start-2 row-start-1 row-span-2 md:col-start-3 md:row-span-1 flex justify-end">
          {take.onTake ? (
            <button
              type="button"
              onClick={take.onTake}
              disabled={take.taking}
              aria-label={copy.takeAria(row.name, take.cut)}
              className={APPLY}
            >
              {take.taking ? copy.taking : copy.take}
            </button>
          ) : null}
        </div>
      </div>
      {take.refused ? (
        <div
          role="alert"
          className="flex flex-col gap-[7px] mb-[10px] px-[14px] py-[12px] rounded-[9px] border border-[color:var(--avail-over-border)]"
          style={{ background: "var(--surface)" }}
        >
          <span className="flex items-center gap-[8px]">
            <span
              aria-hidden="true"
              className="flex items-center justify-center w-[15px] h-[15px] rounded-[4px] font-mono text-[10px] border border-[color:var(--danger)] text-[color:var(--danger)]"
            >
              !
            </span>
            <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase" style={{ color: "var(--danger)" }}>{copy.refused.tag}</span>
          </span>
          <b className="text-[13.5px] font-semibold leading-[1.35]" style={{ color: "var(--fg)" }}>{copy.refused.heading}</b>
          <p className="m-0 text-[12.5px] leading-[1.55] [text-wrap:pretty]" style={{ color: "var(--fg-body)" }}>{take.refused.body}</p>
          <span className="flex flex-wrap gap-[8px] mt-[4px]">
            <button
              type="button"
              onClick={take.refused.onReread}
              className="inline-flex items-center justify-center h-[44px] px-[14px] rounded-[8px] text-[13px] md:h-auto md:px-[13px] md:py-[6px] md:rounded-[7px] md:text-[12.5px] font-semibold bg-transparent cursor-pointer text-[color:var(--accent)] [border:1px_solid_var(--accent)]"
            >
              {copy.refused.reread}
            </button>
            <button
              type="button"
              onClick={take.refused.onClose}
              className="min-h-[44px] px-[10px] md:min-h-[30px] md:px-[6px] md:py-[4px] rounded-[7px] text-[12px] font-medium bg-transparent border-0 cursor-pointer text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
            >
              {copy.refused.close}
            </button>
          </span>
        </div>
      ) : null}
      {take.error ? <MutationError message={take.error} /> : null}
    </li>
  );
}

/** The row's price: `free`, or the shipped buy tag. Shared with the stacked card's footer. */
export function PricePlate({ row, newestAsOf }: { row: Pick<SheetRow, "free" | "cents" | "foilOnly">; newestAsOf: Date | null }) {
  if (row.free) {
    return (
      <span
        className="font-mono text-[9.5px] rounded-[4px] px-[6px] py-[1px]"
        style={{ color: "var(--success)", background: "color-mix(in oklab, var(--success) 13%, transparent)" }}
      >
        {copy.free}
      </span>
    );
  }
  return row.cents !== null && newestAsOf
    ? <BuyTag variant="row" price={factOf(row.cents, row.foilOnly, newestAsOf)} newestAsOf={newestAsOf} />
    : null;
}

/** The pressed row once its take has landed (suggestion-card's applied row, stamped `taken`). */
function TakenRow({ cut, add, busy, error, onUndo }: { cut: string; add: string; busy: boolean; error: string | null; onUndo: () => void }) {
  return (
    <li className="border-b border-[color:var(--border)]">
      <div
        data-testid="stand-in-taken"
        className="flex flex-wrap items-center gap-[9px] my-[8px] px-[12px] py-[10px] rounded-[9px] border border-[color:var(--success)]"
        style={{ background: "var(--surface)" }}
      >
        <span className="flex flex-none items-center gap-[6px]">
          <span
            aria-hidden="true"
            className="flex items-center justify-center w-[15px] h-[15px] rounded-[4px] text-[9px] border border-[color:var(--success)] text-[color:var(--success)]"
          >
            ✓
          </span>
          <span className="font-mono text-[9.5px] tracking-[0.1em] uppercase" style={{ color: "var(--success)" }}>{copy.taken}</span>
        </span>
        <span className="min-w-0 text-[13px]" style={{ color: "var(--fg-body)" }}>
          {cut} <span className="font-mono" style={{ color: "var(--success)" }}>→</span>{" "}
          <b className="font-semibold" style={{ color: "var(--fg)" }}>{add}</b>
        </span>
        <button type="button" onClick={onUndo} disabled={busy} aria-label={swapToolsCopy.row.undoSwapAria(cut, add)} className={QUIET}>
          {swapToolsCopy.row.undoSwap}
        </button>
      </div>
      {error ? <MutationError message={error} /> : null}
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
    setRefused(null);
    fetchList();
  };

  // One take per sheet (R2): once one lands the other rows put Take away until it is undone.
  const [taking, setTaking] = useState<string | null>(null);
  const [taken, setTaken] = useState<{ addId: string; add: string; swapId: string } | null>(null);
  const [refused, setRefused] = useState<{ addId: string; reason: string } | null>(null);
  const [failedTake, setFailedTake] = useState<string | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [undoFailed, setUndoFailed] = useState(false);

  if (!tools) return null;
  const model = load.state === "ready" ? sheetModel(load.read) : null;
  const over = isOverLimit(card.price, newestAsOf, tools.limitCents);
  const status = loadingStatus(card.role);
  const name = printedFaceName(card);

  const take = async (row: SheetRow) => {
    setTaking(row.oracleId);
    setRefused(null);
    setFailedTake(null);
    try {
      const result = await takeStandInAction(tools.deckId, card.oracleId, row.oracleId);
      if (result.ok) {
        setTaken({ addId: row.oracleId, add: row.name, swapId: result.swapId });
        tools.addReceipt({
          swapId: result.swapId, cutOracleId: card.oracleId, cut: name, add: row.name,
          sections: [card.cardTypeGroup, card.role, "other"], groupLabel: card.cardTypeGroup,
          free: result.addWasFree, cutLeft: result.cutLeft,
        });
        tools.announce(swapToolsCopy.announce.taken(name, row.name));
      } else {
        setRefused({ addId: row.oracleId, reason: result.reason });
      }
    } catch {
      setFailedTake(row.oracleId);
    } finally {
      setTaking(null);
    }
  };

  const undo = async () => {
    if (!taken) return;
    setUndoing(true);
    setUndoFailed(false);
    try {
      const { ok } = await undoSwapAction(taken.swapId);
      if (ok) {
        tools.dropReceipt(taken.swapId);
        tools.announce(swapToolsCopy.announce.undone(name, taken.add));
        setTaken(null);
      } else {
        setUndoFailed(true);
      }
    } catch {
      setUndoFailed(true);
    } finally {
      setUndoing(false);
    }
  };

  const rowTake = (row: SheetRow): RowTake => ({
    onTake: taken ? null : () => void take(row),
    taking: taking === row.oracleId,
    cut: name,
    error: failedTake === row.oracleId ? copy.takeFailed : null,
    refused: refused?.addId === row.oracleId
      ? {
          // F11: the cause is named only when the swap body reported it.
          body: refused.reason === "cutGone"
            ? copy.refused.body(tools.deckName, name, row.name)
            : copy.refused.bodyPlain(name, row.name),
          onReread: retry,
          onClose: () => setRefused(null),
        }
      : null,
  });
  // The stacked card pages the sheet's own list, in the sheet's order across its groups.
  const siblings = model?.groups.flatMap((g) => g.rows.map((r) => r.oracleId)) ?? [];
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
            <Thumb imageUri={card.imageUri ?? (load.state === "ready" ? load.read.original.imageUri : null)} border="var(--border-strong)" />
            <span aria-hidden="true" className="flex-none w-[7px] h-[7px] rounded-full" style={{ border: "1px dashed var(--fg-faint)" }} />
            <span className="text-[14px] font-semibold" style={{ color: "var(--fg)", borderBottom: "1px dotted var(--accent)" }}>
              {name}
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
              {copy.failed.kept(name)}
            </p>
            <button
              type="button"
              onClick={retry}
              className="mt-[18px] inline-flex items-center justify-center h-[44px] md:h-auto px-[18px] md:px-[16px] md:py-[7px] rounded-[8px] md:rounded-[7px] text-[13px] md:text-[12.5px] leading-none font-semibold bg-transparent cursor-pointer border border-solid border-[color:var(--accent)] text-[color:var(--accent)]"
            >
              {copy.retry}
            </button>
          </div>
        ) : null}

        {/* The taken state drops the lead and says why the others are put away. */}
        {taken ? (
          <p className="m-0 text-[12.5px] leading-[1.55] [text-wrap:pretty]" style={{ color: "var(--fg-muted)" }}>{copy.takenNote(name)}</p>
        ) : null}
        {model?.lead && !taken ? (
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
                taken?.addId === row.oracleId ? (
                  <TakenRow key={row.oracleId} cut={name} add={row.name} busy={undoing} error={undoFailed ? copy.undoRefused : null} onUndo={() => void undo()} />
                ) : (
                  <StandInRow
                    key={row.oracleId}
                    row={row}
                    newestAsOf={load.state === "ready" ? load.read.newestAsOf : null}
                    take={rowTake(row)}
                    siblings={siblings}
                  />
                )
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
