"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { AdminEnv } from "../../lib/admin/environment";
import {
  matchesFilter,
  matchesSearch,
  sections,
  SWITCH_FILTERS,
  type ResolvedState,
  type SwitchFilter,
  type SwitchRow,
} from "../../lib/admin/switches-rule";
import { adminCopy, switchCopy } from "../../lib/copy/admin";
import { KILL } from "../../lib/switches/resolve";
import { PendingReporter } from "../shell/pending-reporter";
import { SearchField } from "../ui/text-field";
import { usePublishedHeight } from "./admin-head";

// The Switches list (admin STATES L1 to L6; design table, Switches list and the R2 deltas). The
// shell scrolls the document, as on Costs, so "pinned" is sticky: the search and chips sit under
// the head at `--admin-head-h`, and the desktop column head sits under both, at the height the
// pinned bar publishes (`--admin-pin-h`). The list box clips rather than hides its overflow, so the sticky column head
// inside it still sticks to the viewport.

const copy = adminCopy.switches;
const PIN_HEIGHT_VAR = "--admin-pin-h";
const GRID = "md:grid md:grid-cols-[minmax(0,1fr)_92px_76px_112px_116px] md:gap-[14px]";
const label = (row: { name: SwitchRow["name"] }) => switchCopy[row.name].label;

export function ResolvedDot({ state }: { state: ResolvedState }) {
  const fill =
    state === "on"
      ? "bg-[color:var(--success)] border-[color:var(--success)]"
      : state === "mixed"
        ? "bg-[linear-gradient(90deg,var(--success)_50%,transparent_50%)] border-[color:var(--success)]"
        : "bg-transparent border-[color:var(--fg-faint)]";
  return <span aria-hidden className={`h-[8px] w-[8px] flex-none rounded-full border-[1.5px] border-solid ${fill}`} />;
}

function Pill({ row }: { row: SwitchRow }) {
  return (
    <span
      className={`inline-flex items-center gap-[7px] whitespace-nowrap text-[13px] font-medium ${
        row.state === "off" ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg)]"
      }`}
    >
      <ResolvedDot state={row.state} />
      {copy.resolved[row.state]}
    </span>
  );
}

export function SwitchTags({ row }: { row: Pick<SwitchRow, "kind" | "parent"> }) {
  const base = "whitespace-nowrap rounded-[4px] border border-solid px-[6px] py-[2px] font-mono text-[9.5px] uppercase tracking-[0.08em]";
  return (
    <>
      {row.kind === "model" && <span className={`${base} border-[color:var(--accent)] text-[color:var(--accent)]`}>{copy.tagModel}</span>}
      {row.parent && (
        <span className={`${base} border-[color:var(--border-strong)] text-[color:var(--fg-muted)]`}>{copy.tagNeeds(switchCopy[row.parent].label)}</span>
      )}
    </>
  );
}

const resolvedSub = (row: SwitchRow) =>
  row.reason?.kind === "kill" ? copy.killed : row.reason?.kind === "parent" ? copy.parentOff(switchCopy[row.reason.parent].label) : copy.resolved.count(row.on, row.total);

/** The App-wide cell; a set override under a killed env var says it is refused, as the Overrides cell does (L4). */
const appText = (row: SwitchRow) => {
  const value = row.app === "on" ? copy.app.on : row.app === "off" ? copy.app.off : copy.app.notSet;
  return row.appRefused ? `${value}, ${copy.overrides.refused}` : value;
};

/** The Overrides cell (L4's `1 account, refused`), or null when the switch carries none. */
function overridesText(row: SwitchRow): string | null {
  const parts = [row.groups ? copy.overrides.groups(row.groups) : "", row.accounts ? copy.overrides.accounts(row.accounts) : ""].filter(Boolean);
  if (parts.length === 0) return null;
  if (row.refused) parts.push(copy.overrides.refused);
  else if (row.ignored) parts.push(copy.overrides.ignored);
  return parts.join(", ");
}

function envClass(env: string | null) {
  if (env === KILL) return "font-semibold text-[color:var(--danger)]";
  return env === "true" ? "text-[color:var(--fg-body)]" : "text-[color:var(--fg-muted)]";
}

function Row({ row }: { row: SwitchRow }) {
  const ov = overridesText(row);
  const env = row.env ?? copy.envUnset;
  const sub = resolvedSub(row);
  return (
    <li data-switch={row.name} className="border-0 border-solid border-[color:var(--border)] [border-top-width:1px]">
      {/* The whole row opens the switch's page (admin plan 8b). */}
      <Link
        href={`/admin/switches/${row.name}`}
        className={`flex flex-col px-[14px] py-[12px] text-inherit no-underline md:items-start ${GRID}`}
      >
      <div className="flex min-w-0 flex-col gap-[3px]">
        {/* The name and its tags wrap among themselves; the phone's resolved pill sits apart from them,
            pinned right, so two tags can never push it onto a line of its own. */}
        <div className="flex items-start gap-[10px]">
          <div data-testid="switch-title" className="flex min-w-0 flex-1 flex-wrap items-center gap-[7px]">
            <span className="text-[14px] font-medium text-[color:var(--fg)]">{label(row)}</span>
            <SwitchTags row={row} />
          </div>
          <span data-testid="switch-resolved-phone" className="flex-none pt-[1px] md:hidden">
            <Pill row={row} />
          </span>
        </div>
        <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)] [overflow-wrap:anywhere]">{row.name}</span>
        <span className="text-pretty text-[12.5px] leading-[1.45] text-[color:var(--fg-muted)]">{switchCopy[row.name].description}</span>
        <span data-testid="switch-meta" className="mt-[2px] font-mono text-[10.5px] text-[color:var(--fg-body)] md:hidden">
          {[copy.metaEnv(env), copy.metaApp(appText(row)), ov ?? copy.metaNoOverrides].join(" · ")}
          {" · "}
          {/* One unbreakable piece: `N of T on` never leaves `on` alone on the next line. */}
          <span className="whitespace-nowrap">{sub}</span>
        </span>
      </div>
      <span className={`hidden font-mono text-[12.5px] md:inline ${envClass(row.env)}`}>
        <span className="sr-only">{copy.cols.env} </span>
        {env}
      </span>
      <span className={`hidden text-[13px] md:inline ${row.appRefused ? "text-[color:var(--danger)]" : row.app ? "text-[color:var(--fg)]" : "text-[color:var(--fg-faint)]"}`}>
        <span className="sr-only">{copy.cols.app} </span>
        {appText(row)}
      </span>
      <span className={`hidden text-[12.5px] md:inline ${ov ? "text-[color:var(--fg-body)]" : "text-[color:var(--fg-faint)]"}`}>
        <span className="sr-only">{copy.cols.overrides} </span>
        {ov ?? copy.overrides.none}
      </span>
      <div className="hidden flex-col gap-[3px] md:flex">
        <Pill row={row} />
        <span className="whitespace-nowrap font-mono text-[10.5px] text-[color:var(--fg-faint)]">{sub}</span>
      </div>
      <PendingReporter href={`/admin/switches/${row.name}`} />
      </Link>
    </li>
  );
}

function GroupHead({ title, note, testId }: { title: string; note: string; testId?: string }) {
  return (
    <h2
      data-testid={testId}
      className="m-0 flex items-baseline gap-[10px] border-0 border-solid border-[color:var(--border)] [border-top-width:1px] bg-[color:var(--surface-sunken)] px-[14px] py-[8px] font-mono text-[10px] font-normal uppercase tracking-[0.12em] text-[color:var(--fg-muted)]"
    >
      <span>{title}</span>
      <span className="normal-case tracking-normal text-[color:var(--fg-faint)]">{note}</span>
    </h2>
  );
}

export function SwitchesList({
  rows,
  total,
  env,
  overridesRead,
  clerk,
}: {
  rows: SwitchRow[];
  total: number;
  env: AdminEnv;
  overridesRead: boolean;
  /** "down": the accounts counted are the stored ids, because Clerk could not be read (STATES A3). */
  clerk: "ok" | "down";
}) {
  const [filter, setFilter] = useState<SwitchFilter>("all");
  const [query, setQuery] = useState("");
  const pinRef = useRef<HTMLDivElement>(null);
  usePublishedHeight(pinRef, PIN_HEIGHT_VAR);

  const all = useMemo(() => sections(rows, label), [rows]);
  const shown = useMemo(() => {
    const keep = (r: SwitchRow) => matchesFilter(r, filter) && matchesSearch(r, label(r), query);
    return { features: all.features.filter(keep), plumbing: all.plumbing.filter(keep) };
  }, [all, filter, query]);
  const counts = useMemo(() => Object.fromEntries(SWITCH_FILTERS.map((f) => [f, rows.filter((r) => matchesFilter(r, f)).length])) as Record<SwitchFilter, number>, [rows]);
  const none = shown.features.length + shown.plumbing.length === 0;

  return (
    <>
      <div
        ref={pinRef}
        className="sticky top-[var(--admin-head-h,0px)] z-[1] flex flex-none flex-col gap-[10px] bg-[color:var(--bg)] px-[16px] pb-[12px] pt-[14px] md:px-[28px] md:pb-[14px] md:pt-[18px]"
      >
        <SearchField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder={copy.search}
          aria-label={copy.search}
          containerClassName="h-[44px] rounded-[9px] px-[12px] py-0 md:h-[38px] md:max-w-[420px]"
          className="text-[16px] md:text-[14px]"
        />
        <div role="group" aria-label={copy.chipsLabel} className="flex flex-wrap gap-[6px]">
          {SWITCH_FILTERS.map((f) => {
            const selected = f === filter;
            return (
              <button
                key={f}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(f)}
                className={`inline-flex h-[36px] items-center gap-[7px] rounded-full border border-solid px-[12px] text-[12.5px] md:h-[30px] ${
                  selected
                    ? "border-[color:var(--border-dashed)] bg-[color:var(--elevated)] text-[color:var(--fg)]"
                    : "border-[color:var(--border)] bg-transparent text-[color:var(--fg-muted)]"
                }`}
              >
                {copy.chips[f]}
                <span className="font-mono text-[11px] text-[color:var(--fg-faint)]">{counts[f]}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-[12px] px-[16px] pb-[12px] md:px-[28px] md:pb-[18px]">
        {clerk === "down" && <p className="m-0 text-[13px] leading-[1.6] text-[color:var(--warning)]">{adminCopy.accounts.clerkDown}</p>}
        {!overridesRead && <p className="m-0 text-[13px] leading-[1.6] text-[color:var(--warning)]">{copy.overridesUnread}</p>}
        <div className="overflow-clip rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]">
          <div
            aria-hidden
            className={`sticky top-[calc(var(--admin-head-h,0px)+var(--admin-pin-h,0px))] z-[1] hidden bg-[color:var(--surface-rail)] px-[14px] py-[9px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)] ${GRID}`}
          >
            <span>{copy.cols.name}</span>
            <span>{copy.cols.env}</span>
            <span>{copy.cols.app}</span>
            <span>{copy.cols.overrides}</span>
            <span>{copy.cols.resolved}</span>
          </div>
          {none ? (
            <div className="flex flex-wrap items-baseline gap-[10px] px-[14px] py-[14px]">
              <span className="text-[13px] text-[color:var(--fg-muted)]">{copy.noneMatch}</span>
              <button
                type="button"
                onClick={() => {
                  setFilter("all");
                  setQuery("");
                }}
                className="border-0 bg-transparent p-0 text-[13px] text-[color:var(--accent)]"
              >
                {copy.showAll}
              </button>
            </div>
          ) : (
            <>
              {shown.features.length > 0 && (
                <section>
                  <GroupHead title={copy.heads.features} note={String(all.features.length)} />
                  <ul className="m-0 list-none p-0">
                    {shown.features.map((r) => (
                      <Row key={r.name} row={r} />
                    ))}
                  </ul>
                </section>
              )}
              {shown.plumbing.length > 0 && (
                <section>
                  <GroupHead title={copy.heads.plumbing} note={copy.heads.plumbingNote} testId="switches-plumbing-head" />
                  <ul className="m-0 list-none p-0">
                    {shown.plumbing.map((r) => (
                      <Row key={r.name} row={r} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
        <p className="m-0 text-pretty text-[13px] leading-[1.6] text-[color:var(--fg-faint)]">{copy.footnote(total, env)}</p>
      </div>
    </>
  );
}
