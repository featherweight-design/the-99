import Link from "next/link";
import type { ReactNode } from "react";
import { WORKSPACE_NAME } from "../../lib/admin/anthropic-cost-rule";
import type { CostDetail } from "../../lib/admin/costs-detail-rule";
import type { AdminEnv } from "../../lib/admin/environment";
import {
  capMicro,
  daysIn,
  monthParam,
  shiftMonth,
  startsAfter,
  usd,
  type CostSummary,
  type MonthKey,
  type WorkspaceBlock,
} from "../../lib/admin/costs-rule";
import { adminCopy } from "../../lib/copy/admin";
import { PendingReporter } from "../shell/pending-reporter";
import { CostsDetail, fill, INK, SectionHead } from "./costs-detail";
import { SettingAction } from "./setting-dialog";

// The Costs core (admin STATES C1 to C7; design table, Costs and the R2 deltas): the pinned month
// bar, the four tiles, the caps and the player trend. Pure render over `costSummary`; the caps in
// code are read from `spend-rule.ts` here and never spelled, and the owner's share is the one the
// allowance enforces, read by `loadCosts`. A cap row with no cap (or a ceiling that starts after the
// viewed month) draws the bare track: a bar filled with spend against no cap reads as at the cap.
// The workspace row's figure is Anthropic's own bill for The 99 (`anthropic-cost.ts`); unread, it
// draws this environment's ledger alone on the bare track, with the reason. The org row is the
// same read against the org cap (The 99, then other workspaces hatched), and the key list under
// the caps names each key on The 99 by its name, hint and status only.

const copy = adminCopy.costs;

const fmt = (m: MonthKey, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(new Date(Date.UTC(m.year, m.month, 1)));
const monthLong = (m: MonthKey) => fmt(m, { month: "long", year: "numeric" });
const monthName = (m: MonthKey) => fmt(m, { month: "long" });
const monthShort = (m: MonthKey) => fmt(m, { month: "short" });
const hrefFor = (m: MonthKey, current: MonthKey) => (m.year === current.year && m.month === current.month ? "/admin" : `/admin?month=${monthParam(m)}`);
const pct = (part: number, whole: number) => Math.round((part / whole) * 100);
/** A floor of a share, for a figure that is itself a floor: never rounded up past what is known. */
const pctFloor = (part: number, whole: number) => Math.floor((part / whole) * 100);
/** When the workspace was read: `14:05 UTC` today, `Oct 17, 14:05 UTC` on another day. */
function readAt(asOf: string, now: Date): string {
  const at = new Date(asOf);
  const time = `${String(at.getUTCHours()).padStart(2, "0")}:${String(at.getUTCMinutes()).padStart(2, "0")} UTC`;
  if (at.toISOString().slice(0, 10) === now.toISOString().slice(0, 10)) return time;
  return `${new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(at)} ${at.getUTCDate()}, ${time}`;
}

/** Why the workspace was not read, in the page's words. */
function unreadReason(read: Extract<WorkspaceBlock["read"], { ok: false }>): string {
  const u = copy.unread;
  switch (read.kind) {
    case "no_workspace":
      return u.no_workspace(WORKSPACE_NAME);
    case "ambiguous_workspace":
      return u.ambiguous(read.count ?? 2, WORKSPACE_NAME);
    default:
      return u[read.kind];
  }
}

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

function CapRow({ label, source = "code", figure, children, sub, actions }: { label: string; source?: "code" | "here" | "anthropic"; figure: string; children: ReactNode; sub: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-[4px] border-0 border-t border-solid border-[color:var(--border)] px-[14px] pb-[13px] pt-[12px] first:border-t-0 md:px-[16px] md:pb-[14px] md:pt-[13px]">
      <div className="flex flex-wrap items-baseline gap-[10px]">
        {/* Where the figure comes from, LEFT of the name (Hugh, 2026-10-13), drawn as a plain label
            rather than a bordered chip, which read as a control to press. */}
        <span className="whitespace-nowrap font-mono text-[9.5px] uppercase tracking-[0.08em] text-[color:var(--fg-faint)]">
          {copy.capSource[source]}
        </span>
        <span className="text-[13.5px] font-medium text-[color:var(--fg)]">{label}</span>
        <span className="flex-1" />
        <span className="font-mono text-[13px] text-[color:var(--fg)]">{figure}</span>
      </div>
      {children}
      <span className="text-pretty text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">{sub}</span>
      {actions && <div className="flex flex-wrap gap-[14px]">{actions}</div>}
    </div>
  );
}

/** The keys on The 99: the detail tables' row card, one row a key, the same at every width. */
function KeyListCard({ read }: { read: WorkspaceBlock["read"] }) {
  const k = copy.keys;
  const empty = (text: string) => <p className="m-0 px-[14px] py-[12px] text-[13px] text-[color:var(--fg-muted)] md:px-[16px]">{text}</p>;
  return (
    <div className="overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]">
      {!read.ok || !read.keys.ok ? empty(k.unread) : read.keys.rows.length === 0 ? empty(k.none) : (
        <ul className="m-0 list-none p-0">
          {read.keys.rows.map((key, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px] border-0 border-t border-solid border-[color:var(--border)] px-[14px] pb-[13px] pt-[12px] first:border-t-0 md:px-[16px] md:pb-[14px] md:pt-[13px]">
              <span className="min-w-0 flex-1 break-words text-[14px] font-medium text-[color:var(--fg)]">{key.name}</span>
              <span className={`font-mono text-[11px] ${key.status === "active" ? "text-[color:var(--fg-body)]" : "text-[color:var(--fg-faint)]"}`}>{k.status[key.statusWord]}</span>
              {key.hint && <span className="basis-full break-all font-mono text-[10.5px] text-[color:var(--fg-muted)]">{key.hint}</span>}
            </li>
          ))}
        </ul>
      )}
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

export function CostsView({
  s,
  month,
  current,
  detail,
  names,
  env,
  viewerId,
  now = new Date(),
}: {
  s: CostSummary;
  month: MonthKey;
  current: MonthKey;
  detail?: CostDetail;
  /** The masked name of each account id the page draws (`namesFor`). */
  names: Readonly<Record<string, string>>;
  env?: AdminEnv;
  viewerId?: string;
  now?: Date;
}) {
  const prev = shiftMonth(month, -1);
  const prevHref = hrefFor(prev, current);
  const nextHref = hrefFor(shiftMonth(month, 1), current);
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
  const orgCap = s.settings.org_cap_usd;
  const sys = s.systemSplit;
  const systemSegs: Seg[] = [
    { micro: sys.labels, ink: INK.labels },
    { micro: sys.rewrites, ink: INK.rewrites },
  ].filter((seg) => seg.micro > 0);
  // This environment's ledger (evals are never in it), and Anthropic's bill for the workspace.
  const ws = s.workspace;
  const wsRead = ws.read;
  // A label run still collecting, or unpriced, leaves every figure holding system spend partial.
  const sysUsd = (micro: number) => (sys.incomplete ? copy.soFar(usd(micro)) : usd(micro));
  const note = (text: string | null | undefined) => (text ? ` ${copy.note(text)}` : "");

  const tiles = [
    { label: copy.tiles.calls, fig: usd(s.calls.micro), sub: [copy.tileSub.runs(s.calls.runs), s.callsPaceMicro !== null && s.calls.runs > 0 ? copy.tileSub.pace(usd(s.callsPaceMicro)) : null].filter(Boolean).join(" · ") },
    { label: copy.tiles.player, fig: usd(s.player.micro), sub: [copy.tileSub.runs(s.player.runs), s.playerPaceMicro !== null && s.player.runs > 0 ? copy.tileSub.pace(usd(s.playerPaceMicro)) : null].filter(Boolean).join(" · ") },
    { label: copy.tiles.system, fig: sysUsd(sys.total), sub: [ceiling && ceiling.micro > 0 ? (sys.incomplete ? copy.tileSub.ofCeilingAtLeast(pctFloor(sys.total, ceiling.micro), capMicro(ceiling.micro)) : copy.tileSub.ofCeiling(pct(sys.total, ceiling.micro), capMicro(ceiling.micro))) : copy.tileSub.system, sys.incomplete ? copy.systemPartial : null].filter(Boolean).join(" · ") },
    { label: copy.tiles.perAccount, fig: usd(s.perAccountMicro ?? 0), sub: copy.tileSub.accounts(s.accounts) },
  ];


  return (
    <>
      <div className="sticky top-[calc(var(--header-offset,0px)+var(--admin-head-h,0px))] z-[1] flex flex-none flex-col items-start justify-between gap-[10px] border-0 border-solid border-[color:var(--border)] [border-bottom-width:1px] bg-[color:var(--bg)] px-[16px] pb-[12px] pt-[14px] md:flex-row md:items-center md:px-[28px] md:pb-[14px] md:pt-[18px]">
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
        <div className="grid grid-cols-2 gap-[8px] md:grid-cols-4 md:gap-[12px]">
          {tiles.map((t) => (
            <div key={t.label} className="flex min-w-0 flex-col gap-[4px] rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[12px] py-[11px] md:px-[14px] md:py-[13px]">
              <span className="text-[12px] text-[color:var(--fg-muted)]">{t.label}</span>
              <span className="whitespace-nowrap font-mono text-[19px] font-medium text-[color:var(--fg)] md:text-[22px]">{t.fig}</span>
              <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{t.sub}</span>
            </div>
          ))}
        </div>

        <SectionHead title={copy.caps} meta={copy.capsMeta} />
        <div className="overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]">
          <CapRow
            label={copy.capRows.owner}
            figure={s.ownerMicro === null ? copy.notSet(usd(0)) : copy.of(usd(s.ownerMicro), capMicro(share))}
            sub={s.ownerMicro === null ? copy.capSub.noOwner : copy.capSub.owner}
          >
            <CapBar scale={share} segs={[{ micro: s.ownerMicro ?? 0, ink: INK.player }]} ticks={[{ micro: share, label: capMicro(share), ink: "var(--fg-muted)" }]} />
          </CapRow>
          <CapRow
            label={copy.capRows.ceiling}
            source="here"
            figure={ceiling ? copy.of(sysUsd(sys.total), capMicro(ceiling.micro)) : copy.notSet(sysUsd(sys.total))}
            sub={ceilingSub + note(storedCeiling?.note)}
            actions={s.current && <SettingAction kind="ceiling" label={copy.changeCeiling} />}
          >
            <CapBar
              scale={Math.max(ceiling?.micro ?? 0, sys.total, 1)}
              segs={ceiling ? systemSegs : []}
              ticks={ceiling ? [{ micro: ceiling.micro, label: capMicro(ceiling.micro), ink: "var(--danger)" }] : []}
            />
          </CapRow>
          <CapRow
            label={copy.capRows.workspace}
            source="anthropic"
            figure={wsRead.ok
              ? cap ? copy.of(usd(wsRead.totalMicro), capMicro(cap.micro)) : copy.notSet(usd(wsRead.totalMicro))
              : copy.workspaceUnread(sysUsd(ws.ledgerMicro))}
            sub={wsRead.ok
              ? copy.capSub.workspace + note(cap?.note) + (wsRead.ledgerAhead ? copy.capSub.ledgerAhead : copy.capSub.elsewhere(usd(wsRead.elsewhereMicro))) + copy.asOf(readAt(wsRead.asOf, now))
              : unreadReason(wsRead) + note(cap?.note)}
            actions={s.current && <SettingAction kind="cap" label={copy.changeCap} />}
          >
            <CapBar
              scale={Math.max(cap?.micro ?? 0, wsRead.ok ? wsRead.totalMicro : 0, ws.ledgerMicro, 1)}
              segs={cap && wsRead.ok ? [
                { micro: s.player.micro, ink: INK.player },
                ...systemSegs,
                { micro: wsRead.elsewhereMicro, ink: INK.elsewhere, hatch: true },
              ] : []}
              ticks={cap && wsRead.ok ? [{ micro: cap.micro, label: capMicro(cap.micro), ink: "var(--danger)" }] : []}
            />
          </CapRow>
          <CapRow
            label={copy.capRows.org}
            source="anthropic"
            figure={wsRead.ok ? (orgCap ? copy.of(usd(wsRead.orgMicro), capMicro(orgCap.micro)) : copy.notSet(usd(wsRead.orgMicro))) : copy.orgUnread}
            sub={(wsRead.ok ? copy.capSub.org(usd(wsRead.totalMicro), usd(wsRead.otherMicro)) : copy.capSub.orgUnread) + note(orgCap?.note)}
            actions={s.current && <SettingAction kind="org" label={copy.changeOrgCap} />}
          >
            <CapBar
              scale={Math.max(orgCap?.micro ?? 0, wsRead.ok ? wsRead.orgMicro : 0, 1)}
              segs={orgCap && wsRead.ok ? [
                { micro: wsRead.totalMicro, ink: INK.player },
                // A credit could take the rest of the org below zero; the bar draws none rather than a negative width,
                // while the line beside it still names the signed figure.
                { micro: Math.max(0, wsRead.otherMicro), ink: INK.elsewhere, hatch: true },
              ] : []}
              ticks={orgCap && wsRead.ok ? [{ micro: orgCap.micro, label: capMicro(orgCap.micro), ink: "var(--danger)" }] : []}
            />
          </CapRow>
        </div>
        <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-faint)]">{copy.capsReference}</p>

        <SectionHead title={copy.keys.title} meta={copy.keys.meta} />
        <KeyListCard read={wsRead} />

        <SectionHead title={copy.trendPlayer} />
        <Trend s={s} month={month} />
        <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-faint)]">{copy.trendNote}</p>
        {detail && <CostsDetail s={s} d={detail} names={names} viewerId={viewerId} month={month} env={env ?? null} />}
      </div>
    </>
  );
}
