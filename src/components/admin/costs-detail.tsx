import type { ReactNode } from "react";
import { ledgerName, shortModel, type CostDetail } from "../../lib/admin/costs-detail-rule";
import { usd, type CostSummary, type MonthKey } from "../../lib/admin/costs-rule";
import type { AdminEnv } from "../../lib/admin/environment";
import { adminCopy } from "../../lib/copy/admin";

// The Costs detail (admin PR 3; design table, Costs `by-model row`, `split`, `tables`, `reserved
// bar`; the R2 canvas's costsSparse and costsBusy scenes, in their order). Pure render over
// `costDetail` and the core's summary. A month with no runs keeps only the eval ledgers (STATES C3);
// a pending eval entry reads `$X pending` beside its settled figure in warning ink (C8).

const copy = adminCopy.costs;

// The series inks (design table, Costs `series inks`), fixed across themes.
export const INK = { player: "var(--accent)", labels: "var(--fact)", evals: "var(--warning)", rewrites: "var(--success)", elsewhere: "var(--fg-faint)" } as const;
export const fill = (ink: string, hatch = false) =>
  hatch ? `repeating-linear-gradient(135deg, ${ink} 0 3px, transparent 3px 6px)` : ink;

export function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-[10px] pt-[10px]">
      <h2 className="m-0 text-[15px] font-semibold text-[color:var(--fg)]">{title}</h2>
      {meta && <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{meta}</span>}
    </div>
  );
}

const CARD = "overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]";
const ROW = "flex flex-col gap-[4px] border-0 border-t border-solid border-[color:var(--border)] px-[14px] pb-[13px] pt-[12px] first:border-t-0 md:px-[16px] md:pb-[14px] md:pt-[13px]";
const BODY = "m-0 text-pretty text-[13px] leading-[1.5] text-[color:var(--fg-muted)]";

const fmtDay = (d: Date) => new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
/** A ledger's span, first entry to last, as the canvas's Window: `Oct 10–11`, `Sep 30–Oct 11`, or one day. */
export function fmtWindow(first: string | null, last: string | null): string {
  if (!first || !last) return "—";
  const a = new Date(first), b = new Date(last);
  if (a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10)) return fmtDay(a);
  // Written out rather than `formatRange`, whose spaced dash outgrows the 92px column.
  return a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear() ? `${fmtDay(a)}–${b.getUTCDate()}` : `${fmtDay(a)}–${fmtDay(b)}`;
}
const usdLimit = (v: number) => (Number.isInteger(v) ? `$${v}` : `$${v.toFixed(2)}`);
const monthLabel = (m: MonthKey, month: "long" | "short") =>
  new Intl.DateTimeFormat("en-US", { month, ...(month === "long" ? { year: "numeric" } : {}), timeZone: "UTC" }).format(new Date(Date.UTC(m.year, m.month, 1)));
/**
 * A share as a reader can trust it: a part that is neither nothing nor everything never prints as an
 * endpoint, however thin. Rounding puts it at 0.1 or 99.9 instead, so the figure agrees with the
 * segment still drawn beside it.
 */
const clamped = (p: number, places: number): string => {
  if (p === 0 || p === 100) return String(p);
  const step = 1 / 10 ** places;
  return Math.min(Math.max(p, step), 100 - step).toFixed(places);
};
const share = (part: number, whole: number) => (whole > 0 ? `${clamped((part / whole) * 100, 1)}%` : "0%");
// One place near either end, whole numbers between.
const pctOf = (part: number, whole: number) => {
  const p = (part / whole) * 100;
  return p < 10 || p > 90 ? clamped(p, 1) : String(Math.round(p));
};
/** The same, for a share that is a floor: rounded DOWN, so it never claims more than is known. */
const pctFloorOf = (part: number, whole: number) => {
  const p = (part / whole) * 100;
  return p < 10 || p > 90 ? clamped(Math.floor(p * 10) / 10, 1) : String(Math.floor(p));
};
const millions = (n: number) => `${(n / 1e6).toFixed(2)}M`;
const featureName = (f: string) => copy.featureNames[f] ?? f;

/**
 * Each non-zero segment's width in percent: its share of `scale`, with a sliver held at `min`. The
 * widths a sliver gains are taken back from the segments above `min`, in proportion, so the stack
 * never draws wider than its shares do and the bar's overflow clip never hides the last segment.
 */
export function segWidths(values: readonly number[], scale: number, min: number): number[] {
  const shares = values.filter((v) => v > 0).map((v) => (v / scale) * 100);
  const total = Math.min(shares.reduce((a, b) => a + b, 0), 100);
  const slivers = shares.filter((sh) => sh < min).length;
  const big = shares.filter((sh) => sh >= min).reduce((a, b) => a + b, 0);
  const room = total - slivers * min;
  // Nothing to take back from (or nothing above the minimum): the shares as they are, floored.
  if (big <= 0 || room >= big) return shares.map((sh) => Math.max(sh, min));
  return shares.map((sh) => (sh < min ? min : (sh / big) * Math.max(room, 0)));
}

/** A stacked bar's segments, each a share of `scale`; a non-zero one keeps a sliver. */
function Segs({ parts, scale, min }: { parts: { micro: number; ink: string }[]; scale: number; min: number }) {
  const drawn = parts.filter((p) => p.micro > 0);
  const widths = segWidths(drawn.map((p) => p.micro), scale, min);
  return (
    <>
      {drawn.map((p, i) => (
        <span key={i} className="flex-none" style={{ width: `${widths[i]}%`, background: p.ink }} />
      ))}
    </>
  );
}

type Row = { cells: ReactNode[]; foot?: boolean; title: ReactNode; fig: ReactNode; meta: ReactNode };

/** A grid on desktop and a card per row on the phone (design table, Costs `tables`). */
function Table({ head, right, grid, rows, label }: { head: string[]; right: number[]; grid: string; rows: Row[]; label: string }) {
  const align = (i: number) => (right.includes(i) ? "text-right" : "text-left");
  return (
    <div className={CARD}>
      <div role="table" aria-label={label} className="hidden md:block">
        <div role="row" className="grid gap-[12px] bg-[color:var(--surface-rail)] px-[14px] py-[9px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)]" style={{ gridTemplateColumns: grid }}>
          {head.map((h, i) => <span role="columnheader" key={h} className={align(i)}>{h}</span>)}
        </div>
        {rows.map((r, ri) => (
          <div
            role="row"
            key={ri}
            className={`grid items-baseline gap-[12px] border-0 border-t border-solid border-[color:var(--border)] px-[14px] py-[11px] ${r.foot ? "bg-[color:var(--surface-rail)] font-semibold" : ""}`}
            style={{ gridTemplateColumns: grid }}
          >
            {r.cells.map((c, i) => (
              <span
                role="cell"
                key={i}
                className={`min-w-0 ${align(i)} ${i === 0 ? "text-[13.5px] text-[color:var(--fg)]" : `font-mono text-[12.5px] ${r.foot || i === r.cells.length - 1 ? "text-[color:var(--fg)]" : "text-[color:var(--fg-body)]"}`} ${i === 0 && !r.foot ? "font-medium" : ""}`}
              >
                {c}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="md:hidden">
        {rows.map((r, ri) => (
          <div key={ri} className={`flex flex-col gap-[4px] border-0 border-t border-solid border-[color:var(--border)] px-[14px] py-[11px] ${r.foot ? "bg-[color:var(--surface-rail)]" : ""}`}>
            <div className="flex items-baseline gap-[10px]">
              <span className={`min-w-0 flex-1 text-[14px] text-[color:var(--fg)] ${r.foot ? "font-semibold" : "font-medium"}`}>{r.title}</span>
              <span className="font-mono text-[13px] text-[color:var(--fg)]">{r.fig}</span>
            </div>
            <span className="font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-muted)]">{r.meta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ByModel({ d }: { d: CostDetail }) {
  const total = d.modelsTotal;
  // A share of a total that is only a lower bound is not a share: drawn as a dash until it is whole.
  // Evals are not here: they are no environment's spend, and are drawn apart (`EvalsApart`).
  const partial = d.labelsIncomplete;
  const rows: { key: string; label: string; micro: number; fig: string; sub: string; parts: { micro: number; ink: string }[] }[] = d.models.map((m) => ({
    key: m.model,
    label: m.model,
    micro: m.micro,
    // Nothing priced at an unpriceable model is unknown, not $0; a partial figure says so.
    fig: m.unpriced && m.micro === 0 ? copy.unpriced : m.incomplete ? copy.soFar(usd(m.micro)) : usd(m.micro),
    sub: [
      m.calls > 0 ? copy.modelSub.calls(m.calls, m.features.map(featureName).join(", ")) : null,
      m.batches > 0 ? copy.modelSub.batches(m.batches) : null,
      m.composite ? copy.modelSub.composite : null,
      m.incomplete ? copy.labelsPartial : null,
    ].filter(Boolean).join("; "),
    parts: [{ micro: m.segs.player, ink: INK.player }, { micro: m.segs.rewrites, ink: INK.rewrites }, { micro: m.segs.labels, ink: INK.labels }],
  }));
  return (
    <div className={CARD}>
      {rows.map((r) => (
        <div key={r.key} className={ROW} data-model={r.key}>
          <div className="flex flex-wrap items-baseline gap-[10px]">
            <span className="min-w-0 flex-1 font-mono text-[13px] text-[color:var(--fg)]">{r.label}</span>
            <span className="font-mono text-[13px] text-[color:var(--fg)]">{r.fig}</span>
            <span className="w-[44px] text-right font-mono text-[11px] text-[color:var(--fg-faint)]">{partial ? "—" : share(r.micro, total)}</span>
          </div>
          <div aria-hidden className="mt-[4px] flex h-[10px] gap-[2px] overflow-hidden rounded-[3px] bg-[color:var(--surface-sunken)]">
            <Segs parts={r.parts} scale={total} min={0.6} />
          </div>
          <span className="text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">{r.sub}</span>
        </div>
      ))}
    </div>
  );
}

function Split({ s, month }: { s: CostSummary; month: MonthKey }) {
  const sys = s.systemSplit;
  const parts = [
    { key: "player", t: copy.series.player, micro: s.player.micro, ink: INK.player },
    { key: "labels", t: copy.series.labels, micro: sys.labels, ink: INK.labels, partial: sys.labelsPartial },
    { key: "rewrites", t: copy.series.rewrites, micro: sys.rewrites, ink: INK.rewrites },
  ];
  const total = s.player.micro + sys.total;
  const monthName = monthLabel(month, "long").split(" ")[0];
  // With system spend still coming in, its share is a floor: the headline says so, and the
  // legend's shares, whose denominator is not whole, are not drawn.
  const pctSystem = total <= 0 ? "0" : sys.incomplete ? pctFloorOf(sys.total, total) : pctOf(sys.total, total);
  return (
    <div className={`${CARD} flex flex-col gap-[12px] p-[14px]`}>
      <span className="text-[14px] text-[color:var(--fg)]">{sys.incomplete ? copy.splitLineAtLeast(pctSystem, monthName) : copy.splitLine(pctSystem, monthName)}</span>
      <div aria-hidden className="flex h-[14px] gap-[2px] overflow-hidden rounded-[3px] bg-[color:var(--surface-sunken)]">
        <Segs parts={parts} scale={total || 1} min={0.8} />
      </div>
      <div className="grid grid-cols-1 gap-x-[28px] gap-y-[8px] md:grid-cols-2">
        {parts.map((p) => (
          <div key={p.key} className="flex min-w-0 items-baseline gap-[8px]" data-series={p.key}>
            <span aria-hidden className="h-[9px] w-[9px] flex-none self-center rounded-[2px]" style={{ background: p.ink }} />
            <span className="min-w-0 flex-1 text-[13px] text-[color:var(--fg-body)]">{p.t}</span>
            <span className="font-mono text-[12.5px] text-[color:var(--fg)]">{"partial" in p && p.partial ? copy.soFar(usd(p.micro)) : usd(p.micro)}</span>
            <span className="w-[46px] text-right font-mono text-[11px] text-[color:var(--fg-faint)]">{sys.incomplete ? "—" : share(p.micro, total)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The month's eval spend, on its own: the ledgers are committed files every deployment reads, so it
 * is no environment's System figure and sits under no cap. An unreadable ledger keeps it `so far`.
 */
function EvalsApart({ s, d }: { s: CostSummary; d: CostDetail }) {
  const ledgers = d.ledgers.filter((l) => l.settledMicro + l.pendingMicro > 0).length;
  return (
    <div className={CARD} data-evals-apart>
      <div className={ROW}>
        <div className="flex flex-wrap items-baseline gap-[8px]">
          <span aria-hidden className="h-[9px] w-[9px] flex-none self-center rounded-[2px]" style={{ background: INK.evals }} />
          <span className="min-w-0 flex-1 text-[13.5px] font-medium text-[color:var(--fg)]">{copy.evalsApart.title}</span>
          <span className="font-mono text-[13px] text-[color:var(--fg)]">{s.evals.partial ? copy.soFar(usd(s.evals.micro)) : usd(s.evals.micro)}</span>
        </div>
        <span className="text-pretty text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">{copy.evalsApart.sub(ledgers)}</span>
      </div>
    </div>
  );
}

function ByFeature({ d }: { d: CostDetail }) {
  const rows: Row[] = d.features.map((f) => {
    const free = f.origin === "system" && f.feature !== "labels" && f.feature !== "prose";
    const title = copy.featureTitle(featureName(f.feature), f.step, free);
    const effort = f.effort ?? copy.effortUnknown;
    const p90 = f.p90Micro === null ? null : usd(f.p90Micro);
    return {
      cells: [title, shortModel(f.model), effort, f.runs, usd(f.meanMicro), p90 ?? "—", usd(f.micro)],
      title,
      fig: usd(f.micro),
      meta: copy.featureMeta(shortModel(f.model), effort, f.runs, usd(f.meanMicro), p90 ?? "—"),
    };
  });
  rows.push({ cells: [copy.callsRow, "", "", copy.runsCell(d.runs), "", "", usd(d.callsMicro)], foot: true, title: copy.callsRow, fig: usd(d.callsMicro), meta: copy.runsCell(d.runs) });
  const h = copy.featureHead;
  return (
    <Table
      label={copy.byFeature}
      head={[h.feature, h.model, h.effort, h.runs, h.perRun, h.p90, h.month]}
      right={[3, 4, 5, 6]}
      grid="minmax(0,1.5fr) minmax(0,1fr) 92px 74px 64px 56px 64px"
      rows={rows}
    />
  );
}

function Reserved({ d }: { d: CostDetail }) {
  return (
    <div className={CARD}>
      {d.reserved.map((r) => (
        <div key={r.feature} className={ROW} data-feature={r.feature}>
          <div className="flex flex-wrap items-baseline gap-[10px]">
            <span className="min-w-0 flex-1 text-[13.5px] font-medium text-[color:var(--fg)]">{featureName(r.feature)}</span>
            <span className="font-mono text-[12px] text-[color:var(--fg-body)]">
              {r.meanMicro === null ? copy.reservedOnly(usd(r.reservedMicro)) : copy.of(usd(r.meanMicro), usd(r.reservedMicro))}
            </span>
          </div>
          <div aria-hidden className="relative mt-[4px] h-[12px] rounded-[3px] border border-dashed border-[color:var(--border-dashed)]">
            {r.meanMicro !== null && r.reservedMicro > 0 && (
              <span className="absolute inset-y-0 left-0 rounded-[2px] bg-[color:var(--accent)]" style={{ width: `${Math.min((r.meanMicro / r.reservedMicro) * 100, 100)}%` }} />
            )}
          </div>
          <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
            {r.meanMicro !== null ? copy.reservedShare(pctOf(r.meanMicro, r.reservedMicro)) : r.runs > 0 ? copy.noCostYet(r.runs) : copy.noPress}
          </span>
        </div>
      ))}
    </div>
  );
}

function PerAccount({ d }: { d: CostDetail }) {
  const h = copy.accountHead;
  const total = d.accounts.reduce((n, a) => ({ presses: n.presses + a.presses, credits: n.credits + a.credits, micro: n.micro + a.micro }), { presses: 0, credits: 0, micro: 0 });
  const rows: Row[] = d.accounts.map((a) => ({
    cells: [<span key="id" className="font-mono text-[12.5px]">{a.userId}</span>, a.presses, a.credits, usd(a.micro)],
    title: <span className="break-all font-mono text-[13px]">{a.userId}</span>,
    fig: usd(a.micro),
    meta: copy.accountMeta(a.presses, a.credits),
  }));
  rows.push({ cells: [copy.playersRow, total.presses, total.credits, usd(total.micro)], foot: true, title: copy.playersRow, fig: usd(total.micro), meta: copy.accountMeta(total.presses, total.credits) });
  return <Table label={copy.perAccount} head={[h.account, h.presses, h.credits, h.spent]} right={[1, 2, 3]} grid="minmax(0,1fr) 90px 110px 90px" rows={rows} />;
}

function LabelRuns({ d, month }: { d: CostDetail; month: MonthKey }) {
  const h = copy.labelHead;
  const rows: Row[] = d.labelRuns.map((r) => {
    const title = `${fmtDay(r.firstAt)} · ${r.runId ?? copy.labelSource.collector}`;
    const tokens = r.tokens ? `${millions(r.tokens.in)} / ${millions(r.tokens.out)}` : null;
    const fig = r.unpriced ? copy.unpriced : r.uncollected ? copy.soFar(usd(r.micro)) : usd(r.micro);
    return { cells: [title, r.batches ?? "—", tokens ?? "—", fig], title, fig, meta: copy.labelMeta(r.batches, tokens) };
  });
  const batches = d.labelRuns.reduce((n, r) => n + (r.batches ?? 0), 0);
  const micro = d.labelRuns.reduce((n, r) => n + r.micro, 0);
  const name = monthLabel(month, "long").split(" ")[0];
  const total = d.labelsIncomplete ? copy.soFar(usd(micro)) : usd(micro);
  rows.push({ cells: [name, batches, "", total], foot: true, title: name, fig: total, meta: copy.labelMeta(batches, null) });
  return <Table label={copy.labels} head={[h.run, h.batches, h.tokens, h.cost]} right={[1, 2, 3]} grid="minmax(0,1fr) 90px 150px 80px" rows={rows} />;
}

function Pending({ micro }: { micro: number }) {
  return <span className="ml-[6px] whitespace-nowrap text-[color:var(--warning)]">{copy.pending(usd(micro))}</span>;
}

function EvalLedgers({ d, month }: { d: CostDetail; month: MonthKey }) {
  const h = copy.ledgerHead;
  const rows: Row[] = d.ledgers.map((l) => {
    const title = ledgerName(l.file, copy.originalLedger);
    const limit = l.limits ? copy.limit(usdLimit(l.limits.hardCapUsd), l.limits.askAtUsd === null ? null : usdLimit(l.limits.askAtUsd)) : copy.noLimit;
    const window = fmtWindow(l.firstAt, l.lastAt);
    // The campaign's own totals, against its all-time limit and window; only the footer is the month's.
    const c = l.campaign;
    const settled = <>{usd(c.settledMicro)}{c.pendingMicro > 0 && <Pending micro={c.pendingMicro} />}</>;
    return { cells: [title, c.requests, settled, limit, window], title, fig: settled, meta: copy.ledgerMeta(c.requests, limit, window) };
  });
  const t = d.ledgers.reduce((n, l) => ({ requests: n.requests + l.requests, settled: n.settled + l.settledMicro, pending: n.pending + l.pendingMicro }), { requests: 0, settled: 0, pending: 0 });
  const name = monthLabel(month, "long").split(" ")[0];
  const pendingNote = t.pending > 0 ? <span className="text-[color:var(--warning)]">{copy.pending(usd(t.pending))}</span> : copy.nothingPending;
  rows.push({ cells: [name, t.requests, usd(t.settled), pendingNote, ""], foot: true, title: name, fig: usd(t.settled), meta: pendingNote });
  return <Table label={copy.evals} head={[h.ledger, h.requests, h.settled, h.limit, h.window]} right={[1, 2]} grid="minmax(0,1.4fr) 76px 76px minmax(0,1fr) 92px" rows={rows} />;
}

export function CostsDetail({ s, d, month, env }: { s: CostSummary; d: CostDetail; month: MonthKey; env: AdminEnv | null }) {
  const monthName = monthLabel(month, "long").split(" ")[0];
  // A month with no runs keeps the eval ledgers alone (STATES C3): they are committed, not monthly rows.
  const empty = s.calls.runs === 0 && d.labelRuns.length === 0;
  const refundShare = s.calls.micro > 0 ? Math.round((d.refunds.micro / s.calls.micro) * 100) : 0;
  return (
    <>
      {!empty && (
        <>
          <SectionHead title={copy.byModel} meta={copy.byModelMeta} />
          <ByModel d={d} />

          <SectionHead title={copy.split} />
          <Split s={s} month={month} />
          {(s.evals.micro > 0 || s.evals.partial) && <EvalsApart s={s} d={d} />}

          <SectionHead title={copy.byFeature} meta={copy.byFeatureMeta} />
          <ByFeature d={d} />
          <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-faint)]">{copy.byFeatureNote}</p>

          <SectionHead title={copy.refunds} meta={d.refunds.runs > 0 ? copy.refundsMeta(usd(d.refunds.micro), refundShare) : undefined} />
          <p className={BODY}>
            {d.refunds.runs > 0
              ? [copy.refundsBody(d.refunds.runs, copy.refundLine), ...d.refunds.byFeature.map((f) => copy.refundFeature(featureName(f.feature), f.runs, usd(f.micro)))].join(" ")
              : copy.noRefunds}
          </p>

          <SectionHead title={copy.reserved} meta={copy.reservedMeta} />
          <Reserved d={d} />

          <SectionHead title={copy.perAccount} meta={d.accounts.length > 0 ? copy.perAccountMeta(d.accounts.length) : undefined} />
          {d.accounts.length > 0 ? <PerAccount d={d} /> : <p className={BODY}>{copy.noPresses(monthName)}</p>}

          <SectionHead title={copy.labels} meta={copy.labelsMeta} />
          {d.labelRuns.length > 0 ? (
            <LabelRuns d={d} month={month} />
          ) : (
            <p className={BODY}>{env === "production" ? copy.labelsOnStaging : copy.noLabelRuns(monthName)}</p>
          )}
        </>
      )}

      <SectionHead title={copy.evals} meta={copy.evalsMeta} />
      {d.ledgersUnreadable.length > 0 && (
        <p role="alert" className="text-[13px] leading-[1.5] text-[color:var(--warning)]">{copy.ledgersUnreadable(d.ledgersUnreadable.join(", "))}</p>
      )}
      <EvalLedgers d={d} month={month} />
    </>
  );
}
