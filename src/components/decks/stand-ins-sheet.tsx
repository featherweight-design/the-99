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
import { Fragment, useCallback, useEffect, useRef, useState } from "react";

import { printedFaceName } from "../../lib/collection/browse";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { provenanceForm, type PriceFact } from "../../lib/decks/price";
import { loadStandInsAction, takeStandInAction, undoSwapAction } from "../../lib/swaps/actions";
import { useSwapTools } from "../../lib/swaps/context";
import type { StandInsRead } from "../../lib/swaps/gather";
import { formatLimit, isOverLimit } from "../../lib/swaps/limit";
import { loadingStatus, sheetModel, type SheetGroup, type SheetRow } from "../../lib/swaps/sheet-model";
import { COMMA_CLASS, COMPARE_CLASS, GROUP_GAP_CLASS, ITEM_CLASS, TAG_CLASS, TYPE_CLASS, type Compare } from "../../lib/swaps/compare";
import { STAND_IN_GROUP_SHOWN } from "../../lib/swaps/stand-ins";
import { AvailabilityMarker } from "../ui/availability-marker";
import { SheetGroupHeading, SheetGroupToggle } from "../ui/sheet-group";
import { CardDetailTrigger, useCardDetail, type SheetFooter } from "../cards/card-detail-provider";
import { Crown } from "../ui/crown";
import { HoverPreviewProvider, usePreviewRow } from "./hover-preview";
import { BuyTag } from "./buy-tag";
import { MutationError } from "./mutation-error";
import { ModalChrome } from "./receipt-modal";
import { landOnReceipt } from "./swap-receipt";

const copy = swapToolsCopy.sheet;

type Load = { state: "loading" } | { state: "failed" } | { state: "ready"; read: StandInsRead };

/**
 * The card's art, or the design table's placeholder hatch when the catalog has none. The two thumbs hatch
 * differently, as suggestion-card.tsx's cut and add do: the head's (the card leaving) in --border over
 * --surface-raised, a row's (a card arriving) in --elevated over --border.
 */
const HATCH = {
  head: "repeating-linear-gradient(135deg, var(--border) 0 3px, var(--surface-raised) 3px 6px)",
  row: "repeating-linear-gradient(135deg, var(--elevated) 0 3px, var(--border) 3px 6px)",
} as const;

function Thumb({ imageUri, side }: { imageUri: string | null; side: keyof typeof HATCH }) {
  const border = side === "head" ? "var(--border-strong)" : "var(--border-dashed)";
  return (
    <span
      aria-hidden="true"
      className="flex-none w-[22px] h-[31px] rounded-[3px]"
      style={{
        border: `1px solid ${border}`,
        background: imageUri
          ? `center / cover no-repeat url("${imageUri}")`
          : HATCH[side],
      }}
    />
  );
}

/** A price as the fact BuyTag reads, so the tag draws it exactly as it does on the row. */
const factOf = (cents: number, foilOnly: boolean, asOf: Date): PriceFact =>
  ({ cents: foilOnly ? null : cents, foilCents: foilOnly ? cents : null, etchedCents: null, asOf });

const APPLY =
  "inline-flex items-center justify-center h-[44px] w-[72px] rounded-[8px] text-[13px] font-semibold md:h-auto md:w-auto md:rounded-[7px] md:px-[13px] md:py-[6px] md:text-[12.5px] leading-none bg-transparent cursor-pointer disabled:opacity-50 text-[color:var(--accent)] [border:1px_solid_var(--accent)] hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)]";
const QUIET =
  "ml-auto min-h-[44px] rounded-[8px] px-[14px] text-[13px] md:min-h-[32px] md:rounded-[7px] md:px-[11px] md:py-[6px] md:text-[12px] leading-none font-medium bg-transparent cursor-pointer disabled:opacity-50 text-[color:var(--fg-muted)] [border:1px_solid_var(--border-strong)] hover:text-[color:var(--fg)]";

/**
 * The rows a group draws: all of them once expanded, else the first `STAND_IN_GROUP_SHOWN` plus a taken
 * row wherever it ranks. The stacked card's Prev/Next walks exactly these, so it never pages to a row the
 * sheet is not showing (d9, close-out ruling 8).
 */
export function shownRows(group: SheetGroup, expanded: boolean, keep: string | null): SheetRow[] {
  if (expanded || groupTotal(group) <= STAND_IN_GROUP_SHOWN) return group.rows;
  return group.rows.filter((r, i) => i < STAND_IN_GROUP_SHOWN || r.oracleId === keep);
}

/** The group's true size: `total` when the read was capped, else the rows it carries (the About figure). */
const groupTotal = (group: SheetGroup) => group.total ?? group.rows.length;

/**
 * One type group (addendum §1b): its heading with the order note at the right, the rows `shownRows`
 * picks, and a `Show all {total}` text button that expands the group in place. The count is the group's
 * true size, never the capped read's: when the first read carried less than the whole group, the press
 * fetches the rest first and the button waits on it. A group no longer than it shows draws no toggle.
 *
 * The sheet CONTROLS it (`expanded`, `onToggle`), because the stacked card's Prev/Next pages the rows it
 * shows. Exported for the About page's stand-ins figure (E3), which draws one group without the sheet's
 * read and passes none of that: the group then holds its own open state, as it always did.
 */
export function StandInGroup({
  group, keep = null, expanded, fetching = false, onToggle, children,
}: {
  group: SheetGroup;
  keep?: string | null;
  expanded?: boolean;
  fetching?: boolean;
  onToggle?: () => void;
  children: (row: SheetRow) => React.ReactNode;
}) {
  const [own, setOwn] = useState(false);
  const all = expanded ?? own;
  const shown = shownRows(group, all, keep);
  const more = groupTotal(group) > STAND_IN_GROUP_SHOWN;
  return (
    <section className="flex flex-col" aria-label={group.heading}>
      <SheetGroupHeading label={group.heading} note={group.order} />
      <ul className="m-0 p-0 list-none">{shown.map(children)}</ul>
      {more ? (
        <SheetGroupToggle
          all={all}
          busy={fetching}
          onToggle={onToggle ?? (() => setOwn((v) => !v))}
          label={copy.showAll(groupTotal(group), group.noun)}
          fewer={copy.showFewer}
        />
      ) : null}
    </section>
  );
}

/** What the sheet knows about one row's Take: the press in flight, a refusal, or a throw. */
export type RowTake = {
  /** Null once a take has landed on another row: Take is removed, not disabled (R2). */
  onTake: (() => void) | null;
  taking: boolean;
  /** A take is in flight on some row: every Take waits for it, so one sheet makes one swap. */
  busy: boolean;
  refused: { body: string; onReread: () => void; onClose: () => void } | null;
  error: string | null;
  cut: string;
};

// Exported with StandInGroup (E3). A pure export: the sheet draws both unchanged.
export function StandInRow({ row, newestAsOf, take, siblings }: { row: SheetRow; newestAsOf: Date | null; take: RowTake; siblings: string[] }) {
  const preview = usePreviewRow(row.imageUri);
  return (
    <li className="border-b border-[color:var(--border)]">
      <div
        data-testid="stand-in-row"
        {...preview}
        // A press stacks the card over the sheet at z-50, under this box (z-60 over a sheet), and a
        // pointer held still fires no leave: so the press puts the box away itself.
        onPointerDown={preview.onMouseLeave}
        className="grid grid-cols-[minmax(0,max-content)_auto_minmax(0,1fr)_72px] md:grid-cols-[minmax(0,1fr)_96px_64px] gap-x-[7px] gap-y-0 md:gap-x-[12px] items-center py-[10px] md:py-[9px]">
        <div className="flex flex-col gap-[3px] min-w-0">
          <div className="flex items-center gap-[7px] min-w-0">
            <Thumb imageUri={row.imageUri} side="row" />
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

        </div>
        {/* Addendum 3a: the price sits on the name line at every width. At 390 it follows the name at the name
          line's 7px (the name's column grows to its text and no further, and an empty column takes the rest), so
          a long name ellipsizes beside it; from md it has its own right-aligned column. */}
        <div className="col-start-2 row-start-1 flex md:justify-end">
          <PricePlate row={row} newestAsOf={newestAsOf} />
        </div>
        <div className="col-start-4 md:col-start-3 row-start-1 flex justify-end">
          {take.onTake ? (
            <button
              type="button"
              onClick={take.onTake}
              disabled={take.busy}
              aria-label={copy.takeAria(row.name, take.cut)}
              className={APPLY}
            >
              {take.taking ? copy.taking : copy.take}
            </button>
          ) : null}
        </div>
        {/* Addendum 3a: the land facts line takes the row's full width under the name line, as a comparison does.
          A row left with nothing to say (its give-up said once in the lead) draws no second line. */}
        {row.body.length || row.muted.length ? (
          // Addendum §1a: what the row does in --fg-body, then what it costs or loses in --fg-muted. Hugh
          // (2026-09-26): the drawback starts its own line at every width, so the boundary between the mana
          // line and its cost is clear, as a spell row's LOSES starts its own group.
          <p className="col-span-full m-0 mt-[3px] pl-[43px] font-mono text-[10.5px] leading-[1.45] [text-wrap:pretty] text-[color:var(--fg-muted)]">
            {row.body.length ? <span className="text-[color:var(--fg-body)]">{row.body.join(" · ")}</span> : null}
            {row.muted.length ? <span data-drawback className="block">{row.muted.join(" · ")}</span> : null}
          </p>
        ) : null}
        {row.compare ? <Comparison compare={row.compare} /> : null}
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
              className="inline-flex items-center justify-center h-[44px] px-[14px] rounded-[8px] text-[13px] md:h-auto md:px-[13px] md:py-[6px] md:rounded-[7px] md:text-[12.5px] leading-none font-semibold bg-transparent cursor-pointer text-[color:var(--accent)] [border:1px_solid_var(--accent)]"
            >
              {copy.refused.reread}
            </button>
            <button
              type="button"
              onClick={take.refused.onClose}
              className="min-h-[44px] px-[10px] rounded-[8px] text-[13px] md:min-h-[30px] md:px-[6px] md:py-[4px] md:rounded-[7px] md:text-[12px] leading-none font-medium bg-transparent border-0 cursor-pointer text-[color:var(--fg-muted)] hover:text-[color:var(--fg)]"
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

/**
 * A spell row's comparison (stand-in row addendum 3a): what it keeps, gains and loses, on its own grid row
 * across every column, indented to the name. Inline flow, so the line breaks only between items: a group
 * that fits a line stays whole, and a longer one continues on the next (READINESS E3). `fitCompare` wrote it
 * to 1 line at `md` and 2 below; the height cap is a backstop that `measure:swap-lines` proves never engages.
 */
function Comparison({ compare }: { compare: Compare }) {
  const groups = (["keeps", "gains", "loses"] as const).filter((k) => compare[k].length > 0);
  return (
    <p data-compare className={COMPARE_CLASS}>
      {compare.type ? (
        <>
          <span className={TYPE_CLASS}>{compare.type}</span>{" "}
        </>
      ) : null}
      {groups.map((k, gi) => (
        <Fragment key={k}>
          <span className={gi < groups.length - 1 ? GROUP_GAP_CLASS : undefined}>
            <span className="sr-only">{copy.compare[k]} </span>
            {compare[k].map((item, i) => (
              <Fragment key={item}>
                {i > 0 ? " " : null}
                <span className={ITEM_CLASS[k]}>
                  {i === 0 ? <span aria-hidden="true" className={TAG_CLASS[k]}>{copy.compare[k]}</span> : null}
                  {item}
                  {i < compare[k].length - 1 ? <span className={COMMA_CLASS}>,</span> : null}
                </span>
              </Fragment>
            ))}
          </span>
          {gi < groups.length - 1 ? " " : null}
        </Fragment>
      ))}
    </p>
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
  fromCard = false,
}: {
  /** The Shopping row pressed. Its name and price draw the head before the list arrives. */
  card: DeckDetailCard;
  newestAsOf: Date | null;
  onClose: () => void;
  /** Opened from the card modal's door: the sheet sits over that card, and its close goes back to it. */
  fromCard?: boolean;
}) {
  const tools = useSwapTools();
  const { close: closeCard } = useCardDetail();
  const [load, setLoad] = useState<Load>({ state: "loading" });

  const deckId = tools?.deckId;
  // Whether the list in hand is every stand-in (`Show all` asked for it) or the capped first read. A ref
  // so a re-read after a refusal reads back the same size of list the reader was looking at.
  const full = useRef(false);
  const fetchList = useCallback(() => {
    if (!deckId) return;
    loadStandInsAction(deckId, card.oracleId, full.current)
      .then((r) => setLoad(r ? { state: "ready", read: r } : { state: "failed" }))
      .catch(() => setLoad({ state: "failed" }));
  }, [deckId, card.oracleId]);

  // Expanded groups, by heading. Held here rather than in each group, because the stacked card's
  // Prev/Next pages the rows the sheet is showing and has to know which groups are open.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [fetchingAll, setFetchingAll] = useState(false);
  const toggleGroup = (group: SheetGroup) => {
    const open = (on: boolean) => setExpanded((prev) => {
      const next = new Set(prev);
      if (on) next.add(group.heading); else next.delete(group.heading);
      return next;
    });
    if (expanded.has(group.heading)) return open(false);
    if (group.rows.length >= groupTotal(group)) return open(true);
    // The first read was capped: fetch the whole list, then open. A failed fetch leaves the group
    // collapsed under its true count rather than opening it on a silent partial list.
    if (!deckId) return;
    setFetchingAll(true);
    loadStandInsAction(deckId, card.oracleId, true)
      .then((r) => {
        if (!r) return;
        full.current = true;
        setLoad({ state: "ready", read: r });
        open(true);
      })
      .catch(() => {})
      .finally(() => setFetchingAll(false));
  };

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
  // A ref, not the `taking` state: two presses in one frame both read the state before either
  // render lands, and each would start its own swap.
  const inFlight = useRef(false);

  // Closed after a take from a Shopping row, the sheet lands on the receipt the take left, as the card's
  // door does (close-out ruling 2): the row that opened it left the list, so the dialog's focus return
  // has nowhere to go and dropped to the page, thousands of pixels above the receipt. From the card's
  // door the sheet closes back onto the card, which does this itself when it closes.
  const takenSwap = useRef<string | null>(null);
  useEffect(() => {
    takenSwap.current = fromCard ? null : taken?.swapId ?? null;
  });
  // Whether the sheet is still up: a take the reader closed the sheet on lands after this has unmounted.
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
    if (takenSwap.current) landOnReceipt(takenSwap.current);
  }, []);

  if (!tools) return null;
  const model = load.state === "ready" ? sheetModel(load.read) : null;
  const over = isOverLimit(card.price, newestAsOf, tools.limitCents);
  const status = loadingStatus(card.role);
  const name = printedFaceName(card);

  const take = async (row: SheetRow) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setTaking(row.oracleId);
    setRefused(null);
    setFailedTake(null);
    try {
      const result = await takeStandInAction(tools.deckId, card.oracleId, row.oracleId);
      if (result.ok) {
        setTaken({ addId: row.oracleId, add: row.name, swapId: result.swapId });
        tools.addReceipt({
          swapId: result.swapId, deckId: tools.deckId, cutOracleId: card.oracleId, cut: name, add: row.name,
          cutCard: card,
          free: result.addWasFree, cutLeft: result.cutLeft,
        });
        tools.announce(swapToolsCopy.announce.taken(name, row.name));
        // Closed while the take was in flight: the unmount found no swap to land on, so the take does.
        if (!mounted.current && !fromCard) landOnReceipt(result.swapId);
      } else {
        setRefused({ addId: row.oracleId, reason: result.reason });
      }
    } catch {
      setFailedTake(row.oracleId);
    } finally {
      inFlight.current = false;
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
    busy: taking !== null,
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
  // The stacked card pages the rows the sheet is SHOWING, in its order across its groups: five of a
  // collapsed group, all of an expanded one (ruling 8). `rows` stays the whole list, for the stack's lookup.
  const keep = taken?.addId ?? null;
  const rows = model?.groups.flatMap((g) => g.rows) ?? [];
  const shownBy = new Map(model?.groups.map((g) => [g.heading, shownRows(g, expanded.has(g.heading), keep)]) ?? []);
  const siblings = [...shownBy.values()].flat().map((r) => r.oracleId);
  const listAsOf = load.state === "ready" ? load.read.newestAsOf : null;

  // A stand-in's card, stacked over the sheet, takes it from where the reader is (§7.3). Nothing for
  // a card that is not one of the list's, and nothing once a take has landed.
  const stackFooter: SheetFooter = (oracleId, layout) => {
    const row = rows.find((r) => r.oracleId === oracleId);
    if (!row || taken) return null;
    const press = () => {
      closeCard();
      void take(row);
    };
    const where = swapToolsCopy.modal.inPlaceOf(name, tools.deckName);
    if (layout === "row") {
      return (
        <span data-testid="stand-in-footer" className="flex flex-1 min-w-0 items-center gap-[12px]">
          <span className="flex-1 min-w-0 font-mono text-[10.5px]" style={{ color: "var(--fg-muted)" }}>{where}</span>
          <PricePlate row={row} newestAsOf={listAsOf} />
          <button type="button" onClick={press} aria-label={copy.takeAria(row.name, name)} className={APPLY}>
            {copy.take}
          </button>
        </span>
      );
    }
    return (
      <div
        data-testid="stand-in-footer"
        className="flex flex-col gap-[8px] px-[16px] pt-[10px] pb-[20px] border-t border-[color:var(--border)]"
        style={{ background: "var(--surface-sunken)" }}
      >
        <span className="flex items-center gap-[8px]">
          <span className="flex-1 min-w-0 font-mono text-[10.5px]" style={{ color: "var(--fg-muted)" }}>{where}</span>
          <PricePlate row={row} newestAsOf={listAsOf} />
        </span>
        <button
          type="button"
          onClick={press}
          aria-label={copy.takeAria(row.name, name)}
          className="flex items-center justify-center w-full h-[44px] rounded-[8px] text-[13px] font-semibold bg-transparent cursor-pointer text-[color:var(--accent)] [border:1px_solid_var(--accent)]"
        >
          {swapToolsCopy.modal.take(row.name)}
        </button>
      </div>
    );
  };
  const provenance = newestAsOf ? provenanceForm(newestAsOf, new Date()) : null;

  return (
    // Its own preview provider, as the version synopsis has (swap tools v2, item 5): a stand-in row
    // previews its card like a decklist row does, raised above the sheet since it sits in a dialog.
    // It opens under the pointer that pressed its ⇄, often right over a row: a preview waits for a move.
    <HoverPreviewProvider waitForMove>
    <ModalChrome
      title={copy.title}
      closeLabel={copy.closeAria}
      onClose={onClose}
      width={640}
      backLabel={copy.backLabel}
      stackFooter={stackFooter}
      overCard={fromCard ? { name, backAria: copy.backToCardAria(name) } : undefined}
    >
      <div data-testid="stand-ins-sheet" className="flex flex-col gap-[12px] md:gap-[14px] px-[16px] pt-[14px] pb-[24px] md:px-[18px] md:pt-[16px] md:pb-[18px]">
        <section
          className="flex flex-col gap-[6px] px-[13px] pt-[11px] pb-[12px] rounded-[10px] border border-[color:var(--border)]"
          style={{ background: "var(--bg)" }}
        >
          <span className="font-mono text-[9.5px] tracking-[0.12em] uppercase" style={{ color: "var(--fg-faint)" }}>
            {copy.replacing(tools.deckName)}
          </span>
          <div className="flex flex-wrap items-center gap-x-[9px] gap-y-[6px]">
            <Thumb imageUri={card.imageUri ?? (load.state === "ready" ? load.read.original.imageUri : null)} side="head" />
            <span aria-hidden="true" className="flex-none w-[7px] h-[7px] rounded-full" style={{ border: "1px dashed var(--fg-faint)" }} />
            <CardDetailTrigger
              oracleId={card.oracleId}
              name={name}
              className="text-left text-[14px] font-semibold bg-transparent border-0 p-0 cursor-pointer"
              style={{ color: "var(--fg)", borderBottom: "1px dotted var(--accent)" }}
            >
              {name}
            </CardDetailTrigger>
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
          <StandInGroup
            key={group.heading}
            group={group}
            keep={keep}
            expanded={expanded.has(group.heading)}
            fetching={fetchingAll}
            onToggle={() => toggleGroup(group)}
          >
            {(row) => (
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
            )}
          </StandInGroup>
        ))}

        {model?.foot && provenance ? (
          <p className="m-0 font-mono text-[9.5px] leading-[1.5]" style={{ color: "var(--fg-locked)" }}>{copy.foot(provenance.when)}</p>
        ) : null}
      </div>
    </ModalChrome>
    </HoverPreviewProvider>
  );
}
