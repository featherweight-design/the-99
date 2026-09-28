"use client";
// Row list for the Issue Inspector. Plain overflow at ≤150 rows; react-window
// FixedSizeList above (Design's target — locked in the plan PR). Row height
// includes the 6px flex gap so virtualized rows stay flush with the plain
// list's rhythm.

import React, { useEffect, useRef, useState } from "react";
import { FixedSizeList, type ListChildComponentProps } from "react-window";
import { issueInspectorCopy } from "../../lib/copy/issue-inspector";
import {
  findMatchRanges,
  type ParseErrorRow,
  type UnmatchedRow,
} from "../../lib/collection/issue-filter";

const ROW_HEIGHT = 46; // 40px row + 6px gap
export const VIRTUALIZE_THRESHOLD = 150;
const FALLBACK_VIRTUAL_HEIGHT = 420; // pre-measure fallback (SSR / first paint)

type Props =
  | { variant: "unmatched"; rows: UnmatchedRow[]; query: string }
  | { variant: "errors"; rows: ParseErrorRow[]; query: string };

// Measures the container's rendered height so react-window's FixedSizeList
// (which needs a numeric height) can fill the parent's flex space.
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

export function IssueInspectorList(props: Props) {
  const { ref, height } = useMeasuredHeight();

  if (props.rows.length > VIRTUALIZE_THRESHOLD) {
    return (
      <div ref={ref} className="h-full w-full" data-issue-list="">
        <FixedSizeList
          height={height || FALLBACK_VIRTUAL_HEIGHT}
          // The list is the one scroll body, and a fling at its end stops
          // there rather than handing off to the page or the sheet (D8).
          style={{ overscrollBehavior: "contain" }}
          itemCount={props.rows.length}
          itemSize={ROW_HEIGHT}
          width="100%"
          overscanCount={8}
        >
          {({ index, style }: ListChildComponentProps) => (
            <div style={style}>
              {props.variant === "unmatched" ? (
                <UnmatchedRowView row={props.rows[index]} query={props.query} />
              ) : (
                <ParseErrorRowView row={props.rows[index]} query={props.query} />
              )}
            </div>
          )}
        </FixedSizeList>
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
        // `truncate` (nowrap + ellipsis) prevents wrapping — critical for the
        // virtualized branch where FixedSizeList uses a fixed ROW_HEIGHT and
        // wrapped text would clip/overlap adjacent rows. Backend reasons are
        // terse today; if they grow longer, bump ROW_HEIGHT + switch to
        // line-clamp-2.
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
