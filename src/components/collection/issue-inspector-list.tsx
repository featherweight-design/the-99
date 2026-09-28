"use client";
// Row list for the Issue Inspector. Plain overflow at ≤150 rows; react-window
// above (Design's target — locked in the plan PR).
//
// The virtualised list sizes each row by MEASURING it, through
// VariableSizeList. It used to be a FixedSizeList at 46px (a 40px row plus
// the 6px gap), but the drawn row is a name line and a meta line inside 9–11px
// padding: 67px on desktop and 64px on a phone, measured. So every row past
// 150 was drawn over by the next one, its meta line cut off, at both widths.
// A second constant would be right until a name or a reason wraps, or a font
// loads late, so the row's own box is the figure: each row is observed, and a
// size that moves re-lays the rows from that index down.

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { VariableSizeList, type ListChildComponentProps } from "react-window";
import { issueInspectorCopy } from "../../lib/copy/issue-inspector";
import {
  findMatchRanges,
  type ParseErrorRow,
  type UnmatchedRow,
} from "../../lib/collection/issue-filter";

/** The plain list's flex gap, carried into each virtualised slot. */
const ROW_GAP = 6;
/**
 * A row's size before it has been measured: the phone row as drawn (64px; 67
 * on desktop) plus the gap. Only ever a first guess for rows not yet on
 * screen; a rendered row's size is always its measured one.
 */
const ESTIMATED_ROW = 64 + ROW_GAP;
export const VIRTUALIZE_THRESHOLD = 150;
const FALLBACK_VIRTUAL_HEIGHT = 420; // pre-measure fallback (SSR / first paint)

type Props =
  | { variant: "unmatched"; rows: UnmatchedRow[]; query: string }
  | { variant: "errors"; rows: ParseErrorRow[]; query: string };

// Measures the container's rendered height so react-window (which needs a
// numeric height) can fill the parent's flex space.
function useMeasuredHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setHeight(el.getBoundingClientRect().height);
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0;
      setHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, height };
}

const rowKey = (props: Props, index: number) =>
  props.variant === "unmatched"
    ? `${props.rows[index].line}-${props.rows[index].name}`
    : `${props.rows[index].line}-${props.rows[index].reason}`;

type ItemData = { props: Props; report: (index: number, key: string, size: number) => void };

// Stable at module scope: react-window takes this as a component type, and a
// render function declared inline is a new type every render, which remounts
// (and so re-measures) every row on every keystroke.
function VirtualRow({ index, style, data }: ListChildComponentProps<ItemData>) {
  const { props, report } = data;
  const key = rowKey(props, index);
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => report(index, key, el.getBoundingClientRect().height + ROW_GAP);
    measure();
    // A wrap, a late font or a width change moves the row after its first
    // measurement; the observer reports it.
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [index, key, report]);
  return (
    <div style={style}>
      <div ref={ref} data-issue-row="">
        {props.variant === "unmatched" ? (
          <UnmatchedRowView row={props.rows[index]} query={props.query} />
        ) : (
          <ParseErrorRowView row={props.rows[index]} query={props.query} />
        )}
      </div>
    </div>
  );
}

function VirtualIssueList({ props, height }: { props: Props; height: number }) {
  const listRef = useRef<VariableSizeList<ItemData>>(null);
  // Keyed by the row, not its index: a filter moves rows to new indexes, and a
  // size belongs to the row it measured.
  const sizes = useRef(new Map<string, number>());
  const pending = useRef<number | null>(null);

  const report = useCallback((index: number, key: string, size: number) => {
    if (sizes.current.get(key) === size) return;
    sizes.current.set(key, size);
    // Many rows report in one commit; re-lay once, from the earliest of them.
    const first = pending.current === null ? index : Math.min(pending.current, index);
    if (pending.current === null) {
      queueMicrotask(() => {
        const from = pending.current;
        pending.current = null;
        if (from !== null) listRef.current?.resetAfterIndex(from, true);
      });
    }
    pending.current = first;
  }, []);

  // New rows (a filter) put new rows at every index: re-read every offset.
  useLayoutEffect(() => {
    listRef.current?.resetAfterIndex(0, true);
  }, [props.rows]);

  const itemSize = (index: number) => sizes.current.get(rowKey(props, index)) ?? ESTIMATED_ROW;
  const itemData = useMemo<ItemData>(() => ({ props, report }), [props, report]);

  return (
    <VariableSizeList<ItemData>
      ref={listRef}
      height={height}
      // The list is the one scroll body, and a fling at its end stops there
      // rather than handing off to the page or the sheet (D8).
      style={{ overscrollBehavior: "contain" }}
      itemCount={props.rows.length}
      itemSize={itemSize}
      estimatedItemSize={ESTIMATED_ROW}
      itemData={itemData}
      itemKey={(index) => rowKey(props, index)}
      width="100%"
      overscanCount={8}
    >
      {VirtualRow}
    </VariableSizeList>
  );
}

export function IssueInspectorList(props: Props) {
  const { ref, height } = useMeasuredHeight();

  if (props.rows.length > VIRTUALIZE_THRESHOLD) {
    return (
      <div ref={ref} className="h-full w-full" data-issue-list="">
        <VirtualIssueList props={props} height={height || FALLBACK_VIRTUAL_HEIGHT} />
      </div>
    );
  }

  // Plain list fills the parent's flex space; single overflow-y body per
  // handoff. Last row previously clipped at fixed 420px cap — flex-fill
  // means the container's own bottom padding is the only breathing room.
  return (
    <ul
      data-issue-list=""
      className="flex flex-col gap-[6px] overflow-y-auto overscroll-contain h-full w-full"
    >
      {props.variant === "unmatched"
        ? props.rows.map((r) => (
            <li key={`${r.line}-${r.name}`}>
              <UnmatchedRowView row={r} query={props.query} />
            </li>
          ))
        : props.rows.map((r) => (
            <li key={`${r.line}-${r.reason}`}>
              <ParseErrorRowView row={r} query={props.query} />
            </li>
          ))}
    </ul>
  );
}

export function UnmatchedRowView({ row, query }: { row: UnmatchedRow; query: string }) {
  return (
    <div
      // §Unmatched row: bg --surface, 1px --border (the table draws it at
      // --elevated's value, but names the border token),
      // 3px left border --warning, radius 8px, ~40px tall.
      className="flex items-center justify-between gap-[12px] rounded-lg p-[9px_12px] md:p-[10px_14px]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--warning)",
        minHeight: 40,
      }}
    >
      <span className="min-w-0">
        <span
          className="block truncate text-[13px] md:text-[14px]"
          style={{ color: "var(--fg)" }}
        >
          <HighlightedText text={row.name} query={query} />
        </span>
        <span
          className="font-mono text-[10px] md:text-[10.5px]"
          style={{ color: "var(--fg-faint)" }}
        >
          <span className="md:hidden">
            {issueInspectorCopy.unmatchedRow.metaCompact(row.line, row.setCode)}
          </span>
          <span className="hidden md:inline">
            {issueInspectorCopy.unmatchedRow.metaLong(row.line, row.setCode)}
          </span>
        </span>
      </span>
      <span
        className="font-mono text-[11px] md:text-[12px] flex-none"
        style={{ color: "var(--fg-faint)" }}
      >
        {issueInspectorCopy.unmatchedRow.quantity(row.quantity)}
      </span>
    </div>
  );
}

export function ParseErrorRowView({ row, query }: { row: ParseErrorRow; query: string }) {
  return (
    <div
      // §Parse-error row: same shell, 3px left border --danger. Leading L####
      // in mono --danger, 46px fixed col; reason in --fg-body 1.45.
      className="flex items-start gap-[12px] rounded-lg p-[10px_12px] md:p-[11px_14px]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--danger)",
        minHeight: 40,
      }}
    >
      <span
        className="font-mono text-[10.5px] md:text-[11px] flex-none pt-[1px]"
        style={{ color: "var(--danger)", width: 46 }}
      >
        <HighlightedText
          text={issueInspectorCopy.parseErrorRow.lineBadge(row.line)}
          query={query}
        />
      </span>
      <span
        // `truncate` (nowrap + ellipsis) keeps a reason to one line, as the
        // row is drawn. The virtualised list measures each row, so a reason
        // that did wrap would grow its slot rather than clip under the next.
        className="flex-1 min-w-0 text-[12.5px] md:text-[13px] truncate"
        style={{ color: "var(--fg-body)", lineHeight: 1.45 }}
      >
        <HighlightedText text={row.reason} query={query} />
      </span>
    </div>
  );
}

// Wraps every match run in <mark> (all runs, not just the first — Yellow #3).
function HighlightedText({ text, query }: { text: string; query: string }) {
  const ranges = findMatchRanges(text, query);
  if (ranges.length === 0) return <>{text}</>;
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end]) => {
    if (start > cursor) nodes.push(text.slice(cursor, start));
    nodes.push(
      // §Match highlight: color-mix(in oklab, var(--accent) 28%, transparent) bg, --fg color, radius 2px.
      // Key uses range positions (stable across re-renders as query changes) —
      // avoids React reusing stale <mark> nodes for a shifted match set.
      <mark
        key={`${start}-${end}`}
        style={{
          background: "color-mix(in oklab, var(--accent) 28%, transparent)",
          color: "var(--fg)",
          borderRadius: 2,
          padding: "0 1px",
        }}
      >
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}
