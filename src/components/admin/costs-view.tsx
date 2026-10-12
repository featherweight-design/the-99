import Link from "next/link";
import type { ReactNode } from "react";
import {
  capMicro,
  capUsd,
  daysIn,
  monthParam,
  shiftMonth,
  startsAfter,
  usd,
  type CostSummary,
  type MonthKey,
} from "../../lib/admin/costs-rule";
import { adminCopy } from "../../lib/copy/admin";
import { ALARM_PCTS, BUDGET_USD, HARD_STOP_USD, usdToMicro } from "../../lib/model/spend-rule";
import { PendingReporter } from "../shell/pending-reporter";
import { SettingAction } from "./setting-dialog";

// The Costs core (admin STATES C1 to C7; design table, Costs and the R2 deltas): the pinned month
// bar, the four tiles, the caps and the player trend. Pure render over `costSummary`; the caps in
// code are read from `spend-rule.ts` here and never spelled, and the owner's share is the one the
// allowance enforces, read by `loadCosts`. A cap row with no cap (or a ceiling that starts after the
// viewed month) draws the bare track: a bar filled with spend against no cap reads as at the cap.

const copy = adminCopy.costs;

const fmt = (m: MonthKey, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(m.year, m.month, 1)));
const monthLong = (m: MonthKey) => fmt(m, { month: "long", year: "numeric" });
const monthName = (m: MonthKey) => fmt(m, { month: "long" });
const monthShort = (m: MonthKey) => fmt(m, { month: "short" });
const hrefFor = (m: MonthKey, current: MonthKey) => (m.year === current.year && m.month === current.month ? "/admin" : `/admin?month=${monthParam(m)}`);
const pct = (part: number, whole: number) => Math.round((part / whole) * 100);
const dayLabel = (asOf: string) => new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${asOf}T00:00:00Z`));

const INK = { player: "var(--accent)", system: "var(--success)", elsewhere: "var(--fg-faint)" } as const;
const fill = (ink: string, hatch = false) =>
  hatch ? `repeating-linear-gradient(135deg, ${ink} 0 3px, transparent 3px 6px)` : ink;

type Seg = { micro: number; ink: string; hatch?: boolean };
type Tick = { micro: number; label: string; ink: string };

/** Each segment's left edge and width in percent, laid end to end and held inside the bar. */
function layout(segs: Seg[], scale: number) {
  const out: { left: number; width: number; seg: Seg }[] = [];
  for (const seg of segs) {
    const left = out.length ? out[out.length - 1].left + out[out.length - 1].width : 0;
    out.push({ left, width: Math.min(Math.max((seg.micro / scale) * 100, seg.micro > 0 ? 0.6 : 0), 100 - left), seg });
  }
  return out;
}

function CapBar({ scale, segs, ticks }: { scale: number; segs: Seg[]; ticks: Tick[] }) {
  return (
    <>
      <div className="relative mt-[6px] h-[10px] rounded-[3px] bg-[color:var(--surface-sunken)]">
        {layout(segs, scale).map(({ left, width, seg }, i) => (
          <span key={i} className="absolute inset-y-0 rounded-[2px]" style={{ left: `${left}%`, width: `${width}%`, background: fill(seg.ink, seg.hatch) }} />
        ))}
        {ticks.map((t) => {
          const x = Math.min((t.micro / scale) * 100, 100);
          return <span key={t.label} className="absolute top-[-4px] h-[18px] w-[2px]" style={{ left: `${x}%`, marginLeft: x >= 100 ? -2 : -1, background: t.ink }} />;
        })}
      </div>
      <div className="relative h-[15px]">
        {ticks.map((t) => {
          const x = Math.min((t.micro / scale) * 100, 100);
          const shift = x >= 98 ? "-translate-x-full" : x <= 2 ? "" : "-translate-x-1/2";
          return (
            <span key={t.label} className={`absolute top-[2px] whitespace-nowrap font-mono text-[10px] text-[color:var(--fg-faint)] ${shift}`} style={{ left: `${x}%` }}>
              <span className="md:hidden">{t.label.split(" ")[0]}</span>
              <span className="hidden md:inline">{t.label}</span>
            </span>
          );
        })}
      </div>
    </>
  );
}

function CapRow({ label, here, figure, children, sub, actions }: { label: string; here?: boolean; figure: string; children: ReactNode; sub: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-[4px] border-0 border-t border-solid border-[color:var(--border)] px-[14px] pb-[13px] pt-[12px] first:border-t-0 md:px-[16px] md:pb-[14px] md:pt-[13px]">
      <div className="flex flex-wrap items-baseline gap-[10px]">
        <span className="text-[13.5px] font-medium text-[color:var(--fg)]">{label}</span>
        <span
          className={`whitespace-nowrap rounded-[4px] border border-solid px-[6px] py-[2px] font-mono text-[9.5px] uppercase tracking-[0.08em] ${
            here ? "border-[color:var(--accent)] text-[color:var(--accent)]" : "border-[color:var(--border-strong)] text-[color:var(--fg-muted)]"
          }`}
        >
          {here ? copy.capSource.here : copy.capSource.code}
        </span>
        <span className="flex-1" />
        <span className="font-mono text-[13px] text-[color:var(--fg)]">{figure}</span>
      </div>
      {children}
      <span className="text-pretty text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">{sub}</span>
      {actions && <div className="flex flex-wrap gap-[14px]">{actions}</div>}
    </div>
  );
}

function SectionHead({ title, meta }: { title: string; meta?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-[10px] pt-[10px]">
      <h2 className="m-0 text-[15px] font-semibold text-[color:var(--fg)]">{title}</h2>
      {meta && <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{meta}</span>}
    </div>
  );
}

function Trend({ s, month }: { s: CostSummary; month: MonthKey }) {
  const n = s.daysInMonth;
  const max = s.trendScaleMicro;
  const x = (i: number) => ((i + 1) / n) * 1000;
  const y = (v: number) => 200 - (v / max) * 200;
  const cum = s.playerCumulative;
  const last = cum.length - 1;
  const total = s.player.micro;
  const pts = ["0,200", ...cum.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`)].join(" ");
  const plan = usdToMicro(BUDGET_USD);
  const lines = [
    { micro: plan, label: copy.ticks.plan(capUsd(BUDGET_USD)), dashed: false, ink: "var(--fg-muted)" },
    ...[...ALARM_PCTS].reverse().map((p) => ({ micro: (plan * p) / 100, label: copy.ticks.alarm(capUsd((BUDGET_USD * p) / 100), p), dashed: true, ink: "var(--warning)" })),
  ];
  const tallest = Math.max(0, ...s.playerByDay);
  const empty = s.calls.runs === 0;
  const endFigure = s.current ? s.playerPaceMicro ?? total : total;
  return (
    <div className="flex flex-col gap-[8px] rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[14px] pb-[12px] pt-[14px]">
      <p className="sr-only">{copy.trend.label(monthLong(month), usd(total), s.current && s.playerPaceMicro !== null ? usd(s.playerPaceMicro) : null)}</p>
      <div aria-hidden className="flex flex-wrap justify-between gap-[10px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">
        <span>{copy.trend.scale(usd(max))}</span>
        <span className="inline-flex flex-wrap gap-[14px]">
          <span className="inline-flex items-center gap-[6px]"><span className="h-[2px] w-[14px] bg-[color:var(--accent)]" />{copy.trend.soFar}</span>
          {s.current && <span className="inline-flex items-center gap-[6px]"><span className="w-[14px] border-0 border-t-2 border-dashed border-[color:var(--fg-muted)]" />{copy.trend.onPace}</span>}
        </span>
      </div>
      <div aria-hidden className="relative mt-[6px] h-[130px] md:h-[160px]">
        <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          <line x1="0" y1="200" x2="1000" y2="200" stroke="var(--border-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {!empty && last >= 0 && (
            <>
              <polygon points={`${pts} ${x(last).toFixed(1)},200`} fill="var(--accent)" fillOpacity="0.12" />
              {s.current && s.playerPaceMicro !== null && (
                <polyline points={`${x(last).toFixed(1)},${y(total).toFixed(1)} 1000,${y(s.playerPaceMicro).toFixed(1)}`} fill="none" stroke="var(--fg-muted)" strokeWidth="2" strokeDasharray="6 5" vectorEffect="non-scaling-stroke" />
              )}
              <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
            </>
          )}
        </svg>
        {lines.map((l) => {
          const top = `${(1 - l.micro / max) * 100}%`;
          return (
            <span key={l.label}>
              <span className="absolute inset-x-0 h-0" style={{ top, borderTop: `1.5px ${l.dashed ? "dashed" : "solid"} ${l.ink}` }} />
              <span className="absolute left-[4px] -translate-y-[115%] bg-[color:var(--surface)] px-[3px] font-mono text-[10px]" style={{ top, color: l.ink }}>{l.label}</span>
            </span>
          );
        })}
        {s.current && !empty && (
          <span className="absolute inset-y-0 w-px bg-[color:var(--border-dashed)]" style={{ left: `${x(last) / 10}%` }} />
        )}
        {!empty && (
          <span className="absolute right-0 top-0 whitespace-nowrap bg-[color:var(--surface)] px-[2px] font-mono text-[11px] text-[color:var(--fg-body)]">
            {s.current ? `${copy.trend.today(usd(total))} · ` : ""}
            {copy.trend.byEnd(usd(endFigure), n, monthShort(month))}
          </span>
        )}
      </div>
      {empty ? (
        <p className="m-0 text-[13px] text-[color:var(--fg-muted)]">{copy.empty(monthLong(month))}</p>
      ) : (
        <span className="mt-[6px] font-mono text-[10px] text-[color:var(--fg-faint)]">{copy.trend.byDay(usd(tallest))}</span>
      )}
      <div aria-hidden className="flex h-[46px] items-end gap-[2px] border-0 [border-bottom:1px_solid_var(--border-strong)]">
        {Array.from({ length: n }, (_, i) => {
          const v = s.playerByDay[i];
          const future = v === undefined;
          const height = future || v === 0 || tallest === 0 ? "2px" : `${(v / tallest) * 100}%`;
          const bg = future ? "var(--surface-sunken)" : v === 0 ? "var(--border-strong)" : "var(--accent)";
          return <span key={i} className="min-w-0 flex-1 rounded-t-[2px]" style={{ height, background: bg, opacity: future ? 0.8 : 1 }} />;
        })}
      </div>
      <div aria-hidden className="relative h-[14px]">
        {[1, 8, 15, 22, n].map((d) => (
          <span key={d} className="absolute -translate-x-1/2 font-mono text-[10px] text-[color:var(--fg-faint)]" style={{ left: `${((d - 0.5) / n) * 100}%` }}>{d}</span>
        ))}
      </div>
    </div>
  );
}

function Banner({ tone, children }: { tone: "warning" | "danger"; children: ReactNode }) {
  const ink = tone === "danger" ? "var(--danger)" : "var(--warning)";
  return (
    <div role="status" className="flex items-start gap-[12px] rounded-[12px] bg-[color:var(--surface-rail)] px-[14px] py-[12px] md:px-[16px] md:py-[14px]" style={{ border: `1px solid ${ink}` }}>
      <span aria-hidden className="mt-[6px] h-[8px] w-[8px] flex-none rotate-45" style={{ background: ink }} />
      <span className="text-[13.5px] font-medium leading-[1.5] text-[color:var(--fg)]">{children}</span>
    </div>
  );
}

export function CostsView({ s, month, current }: { s: CostSummary; month: MonthKey; current: MonthKey }) {
  const prev = shiftMonth(month, -1);
  const prevHref = hrefFor(prev, current);
  const nextHref = hrefFor(shiftMonth(month, 1), current);
  const plan = capUsd(BUDGET_USD);
  const planMicro = usdToMicro(BUDGET_USD);
  const storedCeiling = s.settings.system_ceiling_usd;
  // A ceiling set to start in a later month does not apply to this one.
  const ceilingStart = startsAfter(storedCeiling, month);
  const ceiling = ceilingStart ? undefined : storedCeiling;
  const ceilingSub = ceilingStart
    ? copy.capSub.startsIn(ceilingStart.year === month.year ? monthName(ceilingStart) : monthLong(ceilingStart))
    : ceiling
      ? copy.capSub.ceiling
      : copy.capSub.noCeiling;
  const share = s.ownerShareMicro;
  const cap = s.settings.account_cap_usd;
  const elsewhere = s.elsewhere;
  const accountTotal = s.calls.micro + (elsewhere?.micro ?? 0);
  const note = (text: string | null | undefined) => (text ? ` ${copy.note(text)}` : "");

  let banner: ReactNode = null;
  if (s.banner?.kind === "paused") banner = <Banner tone="danger">{copy.banner.paused(monthName(shiftMonth(month, 1)))}</Banner>;
  else if (s.banner?.kind === "alarm") banner = <Banner tone="warning">{copy.banner.alarm(s.alarm)}</Banner>;
  else if (s.banner?.kind === "pace") banner = <Banner tone="warning">{copy.banner.pace(plan, `${s.banner.day} ${monthName(month)}`)}</Banner>;

  const tiles = [
    { label: copy.tiles.calls, fig: usd(s.calls.micro), sub: [copy.tileSub.runs(s.calls.runs), s.callsPaceMicro !== null && s.calls.runs > 0 ? copy.tileSub.pace(usd(s.callsPaceMicro)) : null].filter(Boolean).join(" · ") },
    { label: copy.tiles.player, fig: usd(s.player.micro), sub: copy.tileSub.ofPlan(pct(s.player.micro, planMicro), plan), warn: s.alarm >= 80 },
    { label: copy.tiles.system, fig: usd(s.system.micro), sub: ceiling && ceiling.micro > 0 ? copy.tileSub.ofCeiling(pct(s.system.micro, ceiling.micro), capMicro(ceiling.micro)) : copy.tileSub.system },
    { label: copy.tiles.perAccount, fig: usd(s.perAccountMicro ?? 0), sub: copy.tileSub.accounts(s.accounts) },
  ];

  const planTicks: Tick[] = [
    ...ALARM_PCTS.map((p) => ({ micro: (planMicro * p) / 100, label: copy.ticks.alarm(capUsd((BUDGET_USD * p) / 100), p), ink: "var(--warning)" })),
    { micro: planMicro, label: copy.ticks.plan(plan), ink: "var(--fg-muted)" },
    { micro: usdToMicro(HARD_STOP_USD), label: copy.ticks.hardStop(capUsd(HARD_STOP_USD)), ink: "var(--danger)" },
  ];
  const paceRest = s.current && s.playerPaceMicro !== null ? Math.max(0, s.playerPaceMicro - s.player.micro) : 0;

  return (
    <>
      <div className="sticky top-[var(--admin-head-h,0px)] z-[1] flex flex-none flex-col items-start justify-between gap-[10px] border-0 border-solid border-[color:var(--border)] [border-bottom-width:1px] bg-[color:var(--bg)] px-[16px] pb-[12px] pt-[14px] md:flex-row md:items-center md:px-[28px] md:pb-[14px] md:pt-[18px]">
        <div className="flex items-center gap-[10px]">
          <Link href={prevHref} aria-label={copy.period.previous} className="px-[6px] text-[18px] text-[color:var(--fg-muted)]">
            ‹<PendingReporter href={prevHref} />
          </Link>
          <div className="flex flex-col gap-[2px]">
            <span className="font-display text-[19px] text-[color:var(--fg)]">{monthLong(month)}</span>
            <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
              {copy.period.range(s.elapsed, monthShort(month), s.current ? s.elapsed : null, daysIn(month))}
            </span>
          </div>
          {s.current ? (
            <span aria-hidden className="px-[6px] text-[18px] text-[color:var(--fg-disabled)]">›</span>
          ) : (
            <Link href={nextHref} aria-label={copy.period.next} className="px-[6px] text-[18px] text-[color:var(--fg-muted)]">
              ›<PendingReporter href={nextHref} />
            </Link>
          )}
        </div>
        <span className="text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">{copy.period.compare(monthName(prev), usd(s.previous.micro), s.previous.runs)}</span>
      </div>

      <div className="flex flex-col gap-[12px] px-[16px] pb-[28px] pt-[16px] md:px-[28px] md:pb-[40px] md:pt-[22px]">
        {banner}
        <div className="grid grid-cols-2 gap-[8px] md:grid-cols-4 md:gap-[12px]">
          {tiles.map((t) => (
            <div key={t.label} className="flex min-w-0 flex-col gap-[4px] rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[12px] py-[11px] md:px-[14px] md:py-[13px]">
              <span className="text-[12px] text-[color:var(--fg-muted)]">{t.label}</span>
              <span className="whitespace-nowrap font-mono text-[19px] font-medium text-[color:var(--fg)] md:text-[22px]">{t.fig}</span>
              <span className={`font-mono text-[10.5px] ${t.warn ? "text-[color:var(--warning)]" : "text-[color:var(--fg-faint)]"}`}>{t.sub}</span>
            </div>
          ))}
        </div>

        <SectionHead title={copy.caps} meta={copy.capsMeta} />
        <div className="overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]">
          <CapRow
            label={copy.capRows.plan}
            figure={copy.of(usd(s.player.micro), plan)}
            sub={<>
              <span className="md:hidden">{copy.capSub.planLines(planTicks.map((t) => t.label).join("; "))}</span>
              {copy.capSub.plan}
              {paceRest > 0 && s.playerPaceMicro !== null ? copy.capSub.planPace(usd(s.playerPaceMicro)) : ""}
            </>}
          >
            <CapBar scale={usdToMicro(HARD_STOP_USD)} segs={[{ micro: s.player.micro, ink: INK.player }, { micro: paceRest, ink: INK.player, hatch: true }]} ticks={planTicks} />
          </CapRow>
          <CapRow
            label={copy.capRows.owner}
            figure={s.ownerMicro === null ? copy.notSet(usd(0)) : copy.of(usd(s.ownerMicro), capMicro(share))}
            sub={s.ownerMicro === null ? copy.capSub.noOwner : copy.capSub.owner}
          >
            <CapBar scale={share} segs={[{ micro: s.ownerMicro ?? 0, ink: INK.player }]} ticks={[{ micro: share, label: capMicro(share), ink: "var(--fg-muted)" }]} />
          </CapRow>
          <CapRow
            label={copy.capRows.ceiling}
            here
            figure={ceiling ? copy.of(usd(s.system.micro), capMicro(ceiling.micro)) : copy.notSet(usd(s.system.micro))}
            sub={ceilingSub + note(storedCeiling?.note)}
            actions={s.current && <SettingAction kind="ceiling" label={copy.changeCeiling} />}
          >
            <CapBar
              scale={Math.max(ceiling?.micro ?? 0, s.system.micro, 1)}
              segs={ceiling ? [{ micro: s.system.micro, ink: INK.system }] : []}
              ticks={ceiling ? [{ micro: ceiling.micro, label: capMicro(ceiling.micro), ink: "var(--danger)" }] : []}
            />
          </CapRow>
          <CapRow
            label={copy.capRows.account}
            here
            figure={cap ? copy.of(usd(accountTotal), capMicro(cap.micro)) : copy.notSet(usd(accountTotal))}
            sub={copy.capSub.account + note(cap?.note) + (elsewhere ? copy.capSub.elsewhere(usd(elsewhere.micro), dayLabel(elsewhere.asOf)) + note(elsewhere.note) : copy.capSub.noElsewhere)}
            actions={s.current && <>
              <SettingAction kind="elsewhere" label={elsewhere ? copy.updateElsewhere : copy.enterElsewhere} />
              <SettingAction kind="cap" label={copy.changeCap} />
            </>}
          >
            <CapBar
              scale={Math.max(cap?.micro ?? 0, accountTotal, 1)}
              segs={cap ? [
                { micro: s.player.micro, ink: INK.player },
                { micro: s.system.micro, ink: INK.system },
                { micro: elsewhere?.micro ?? 0, ink: INK.elsewhere, hatch: true },
              ] : []}
              ticks={cap ? [{ micro: cap.micro, label: capMicro(cap.micro), ink: "var(--danger)" }] : []}
            />
          </CapRow>
        </div>

        <SectionHead title={copy.trendPlayer} meta={copy.trendPlayerMeta(plan)} />
        <Trend s={s} month={month} />
        <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-faint)]">{copy.trendNote}</p>
      </div>
    </>
  );
}
