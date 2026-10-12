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
const monthLabel = (m: MonthKey, month: "long" | "short") =>
  new Intl.DateTimeFormat("en-US", { month, ...(month === "long" ? { year: "numeric" } : {}), timeZone: "UTC" }).format(new Date(Date.UTC(m.year, m.month, 1)));
const share = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "0%");
const pctOf = (part: number, whole: number) => {
  const p = (part / whole) * 100;
  return p < 10 ? p.toFixed(1) : String(Math.round(p));
};
const millions = (n: number) => `${(n / 1e6).toFixed(2)}M`;
const featureName = (f: string) => copy.featureNames[f] ?? f;

/** A stacked bar's segments, each a share of `scale`; a non-zero one keeps a sliver. */
function Segs({ parts, scale, min }: { parts: { micro: number; ink: string }[]; scale: number; min: number }) {
  return (
    <>
      {parts
        .filter((p) => p.micro > 0)
        .map((p, i) => (
          <span key={i} className="flex-none" style={{ width: `${Math.max((p.micro / scale) * 100, min)}%`, background: p.ink }} />
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
          <div key={ri} className={`flex flex-col gap-[4px] border-0 border-t border-solid border-[color:var(--border)] px-[14px] py-[11px] first:border-t-0 ${r.foot ? "bg-[color:var(--surface-rail)]" : ""}`}>
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
  const rows: { key: string; label: string; micro: number; sub: string; parts: { micro: number; ink: string }[] }[] = d.models.map((m) => ({
    key: m.model,
    label: m.model,
    micro: m.micro,
    sub: [
      m.calls > 0 ? copy.modelSub.calls(m.calls, m.features.map(featureName).join(", ")) : null,
      m.batches > 0 ? copy.modelSub.batches(m.batches) : null,
      m.composite ? copy.modelSub.composite : null,
    ].filter(Boolean).join("; "),
    parts: [{ micro: m.segs.player, ink: INK.player }, { micro: m.segs.rewrites, ink: INK.rewrites }, { micro: m.segs.labels, ink: INK.labels }],
  }));
  if (d.series.evals > 0) {
    const ledgers = d.ledgers.filter((l) => l.settledMicro + l.pendingMicro > 0).length;
    rows.push({ key: "evals", label: copy.evalsUnsplit, micro: d.series.evals, sub: copy.modelSub.evals(ledgers), parts: [{ micro: d.series.evals, ink: INK.evals }] });
  }
  return (
    <div className={CARD}>
      {rows.map((r) => (
        <div key={r.key} className={ROW} data-model={r.key}>
          <div className="flex flex-wrap items-baseline gap-[10px]">
            <span className="min-w-0 flex-1 font-mono text-[13px] text-[color:var(--fg)]">{r.label}</span>
            <span className="font-mono text-[13px] text-[color:var(--fg)]">{usd(r.micro)}</span>
            <span className="w-[44px] text-right font-mono text-[11px] text-[color:var(--fg-faint)]">{share(r.micro, total)}</span>
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
    { key: "labels", t: copy.series.labels, micro: sys.labels, ink: INK.labels },
    { key: "evals", t: copy.series.evals, micro: sys.evals, ink: INK.evals },
    { key: "rewrites", t: copy.series.rewrites, micro: sys.rewrites, ink: INK.rewrites },
  ];
  const total = s.player.micro + sys.total;
  return (
    <div className={`${CARD} flex flex-col gap-[12px] p-[14px]`}>
      <span className="text-[14px] text-[color:var(--fg)]">{copy.splitLine(total > 0 ? Math.round((sys.total / total) * 100) : 0, monthLabel(month, "long").split(" ")[0])}</span>
      <div aria-hidden className="flex h-[14px] gap-[2px] overflow-hidden rounded-[3px] bg-[color:var(--surface-sunken)]">
        <Segs parts={parts} scale={total || 1} min={0.8} />
      </div>
      <div className="grid grid-cols-1 gap-x-[24px] gap-y-[8px] md:grid-cols-2">
        {parts.map((p) => (
          <div key={p.key} className="flex min-w-0 items-baseline gap-[8px]" data-series={p.key}>
            <span aria-hidden className="h-[9px] w-[9px] flex-none self-center rounded-[2px]" style={{ background: p.ink }} />
            <span className="min-w-0 flex-1 text-[13px] text-[color:var(--fg-body)]">{p.t}</span>
            <span className="font-mono text-[12.5px] text-[color:var(--fg)]">{usd(p.micro)}</span>
            <span className="w-[46px] text-right font-mono text-[11px] text-[color:var(--fg-faint)]">{share(p.micro, total)}</span>
          </div>
        ))}
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
      meta: copy.featureMeta(shortModel(f.model), effort, f.runs, usd(f.meanMicro), p90),
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
            {r.meanMicro === null ? copy.noPress : copy.reservedShare(pctOf(r.meanMicro, r.reservedMicro))}
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
    return { cells: [title, r.batches ?? "—", tokens ?? "—", usd(r.micro)], title, fig: usd(r.micro), meta: copy.labelMeta(r.batches, tokens) };
  });
  const batches = d.labelRuns.reduce((n, r) => n + (r.batches ?? 0), 0);
  const micro = d.labelRuns.reduce((n, r) => n + r.micro, 0);
  const name = monthLabel(month, "long").split(" ")[0];
  rows.push({ cells: [name, batches, "", usd(micro)], foot: true, title: name, fig: usd(micro), meta: copy.labelMeta(batches, null) });
  return <Table label={copy.labels} head={[h.run, h.batches, h.tokens, h.cost]} right={[1, 2, 3]} grid="minmax(0,1fr) 90px 150px 80px" rows={rows} />;
}

function Pending({ micro }: { micro: number }) {
  return <span className="ml-[6px] whitespace-nowrap text-[color:var(--warning)]">{copy.pending(usd(micro))}</span>;
}

function EvalLedgers({ d, month }: { d: CostDetail; month: MonthKey }) {
  const h = copy.ledgerHead;
  const rows: Row[] = d.ledgers.map((l) => {
    const title = ledgerName(l.file, copy.originalLedger);
    const last = l.lastAt ? fmtDay(new Date(l.lastAt)) : "—";
    const settled = <>{usd(l.settledMicro)}{l.pendingMicro > 0 && <Pending micro={l.pendingMicro} />}</>;
    return { cells: [title, l.requests, settled, usd(l.allTimeMicro), last], title, fig: settled, meta: copy.ledgerMeta(l.requests, usd(l.allTimeMicro), last) };
  });
  const t = d.ledgers.reduce((n, l) => ({ requests: n.requests + l.requests, settled: n.settled + l.settledMicro, pending: n.pending + l.pendingMicro, all: n.all + l.allTimeMicro }), { requests: 0, settled: 0, pending: 0, all: 0 });
  const name = monthLabel(month, "long").split(" ")[0];
  const pendingNote = t.pending > 0 ? <span className="text-[color:var(--warning)]">{copy.pending(usd(t.pending))}</span> : copy.nothingPending;
  rows.push({ cells: [name, t.requests, usd(t.settled), usd(t.all), pendingNote], foot: true, title: name, fig: usd(t.settled), meta: pendingNote });
  return <Table label={copy.evals} head={[h.ledger, h.requests, h.settled, h.allTime, h.last]} right={[1, 2, 3]} grid="minmax(0,1.4fr) 76px 120px 76px minmax(0,1fr)" rows={rows} />;
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
      <EvalLedgers d={d} month={month} />
    </>
  );
}
