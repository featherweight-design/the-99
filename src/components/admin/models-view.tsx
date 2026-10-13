import type { AdminEnv } from "../../lib/admin/environment";
import type { JobValues } from "../../lib/admin/github-variables";
import { JOB_VARIABLES, type ModelRowDef } from "../../lib/admin/models";
import { usd } from "../../lib/admin/costs-rule";
import { adminCopy } from "../../lib/copy/admin";
import { SectionHead } from "./costs-detail";

// The Models page (admin STATES M1, M2; the `models` scene in `Admin R2.dc.html`). Read only: which
// feature or job calls which model at which effort, where the constant lives, and this month's
// spend; then the job switches as GitHub holds them. A server component: nothing here is pressed.

const copy = adminCopy.models;
const CARD = "overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)]";
const ROW_LINE = "border-0 border-solid border-[color:var(--border)] [border-top-width:1px]";
const HEAD = "hidden bg-[color:var(--surface-rail)] px-[14px] py-[9px] font-mono text-[9.5px] uppercase tracking-[0.12em] text-[color:var(--fg-faint)] md:grid";
const FOOT = "m-0 text-pretty text-[13px] leading-[1.6] text-[color:var(--fg-faint)]";
const MODEL_GRID = "md:grid-cols-[minmax(0,1.5fr)_74px_minmax(0,1fr)_74px_74px] md:gap-[12px]";
const JOB_GRID = "md:grid-cols-[minmax(0,1.3fr)_70px_minmax(0,1fr)] md:gap-[12px]";

export type ModelsRow = ModelRowDef & { micro: number; partial: boolean };

const modelText = (r: ModelRowDef) => (r.batch ? copy.batch(r.model) : r.model);
const effortText = (r: ModelRowDef) => r.effort ?? copy.noEffort;
const spentText = (r: ModelsRow) => (r.partial ? copy.partial(usd(r.micro)) : usd(r.micro));

/** One feature or job: a card on a phone, a grid row with its location line under it from `md` up. */
function ModelLine({ row, first }: { row: ModelsRow; first: boolean }) {
  const name = copy.rows[row.key];
  const origin = copy.origin[row.origin];
  return (
    <li data-model-row={row.key} className={first ? undefined : ROW_LINE}>
      <div className="flex flex-col gap-[4px] px-[14px] py-[11px] md:hidden">
        <div className="flex items-baseline justify-between gap-[10px]">
          <span className="min-w-0 text-[14px] font-medium text-[color:var(--fg)]">{name}</span>
          <span className="flex-none font-mono text-[13px] text-[color:var(--fg)]">{spentText(row)}</span>
        </div>
        <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]">
          {`${modelText(row)} · ${effortText(row)} · ${origin} · ${row.at}`}
        </span>
      </div>
      <div className={`hidden items-baseline px-[14px] pb-[11px] pt-[11px] md:grid ${MODEL_GRID}`}>
        <span className="min-w-0 text-[13.5px] font-medium text-[color:var(--fg)]">{name}</span>
        <span className="min-w-0 font-mono text-[12.5px] text-[color:var(--fg-body)]">{origin}</span>
        <span className="min-w-0 font-mono text-[12.5px] text-[color:var(--fg-body)] [overflow-wrap:anywhere]">{modelText(row)}</span>
        <span className="min-w-0 font-mono text-[12.5px] text-[color:var(--fg-body)]">{effortText(row)}</span>
        <span className="min-w-0 text-right font-mono text-[12.5px] text-[color:var(--fg)]">{spentText(row)}</span>
        <span className="col-span-full mt-[-6px] font-mono text-[10.5px] text-[color:var(--fg-faint)] [overflow-wrap:anywhere]">{row.at}</span>
      </div>
    </li>
  );
}

function JobLine({ name, readAt, value, first }: { name: string; readAt: string; value: string; first: boolean }) {
  return (
    <li data-job={name} className={first ? undefined : ROW_LINE}>
      <div className="flex flex-col gap-[4px] px-[14px] py-[11px] md:hidden">
        <div className="flex items-baseline justify-between gap-[10px]">
          <span className="min-w-0 font-mono text-[12px] text-[color:var(--fg)] [overflow-wrap:anywhere]">{name}</span>
          <span className="flex-none font-mono text-[13px] text-[color:var(--fg)]">{value}</span>
        </div>
        <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)] [overflow-wrap:anywhere]">{readAt}</span>
      </div>
      <div className={`hidden items-baseline px-[14px] py-[11px] md:grid ${JOB_GRID}`}>
        <span className="min-w-0 font-mono text-[12px] text-[color:var(--fg)] [overflow-wrap:anywhere]">{name}</span>
        <span className="min-w-0 font-mono text-[12.5px] text-[color:var(--fg-body)]">{value}</span>
        <span className="min-w-0 font-mono text-[12.5px] text-[color:var(--fg)] [overflow-wrap:anywhere]">{readAt}</span>
      </div>
    </li>
  );
}

export function ModelsView({ rows, jobs, month, env }: { rows: readonly ModelsRow[]; jobs: JobValues; month: string; env: AdminEnv }) {
  const h = copy.cols;
  const j = copy.jobCols;
  return (
    <div className="flex flex-col gap-[12px] px-[16px] pb-[28px] pt-[16px] md:px-[28px] md:pb-[40px] md:pt-[22px]">
      <SectionHead title={copy.features} meta={copy.featuresMeta(month, env)} />
      <div data-testid="model-rows" className={CARD}>
        <div aria-hidden className={`${HEAD} ${MODEL_GRID}`}>
          <span>{h.feature}</span>
          <span>{h.origin}</span>
          <span>{h.model}</span>
          <span>{h.effort}</span>
          <span className="text-right">{month}</span>
        </div>
        <ul className="m-0 list-none border-0 border-solid border-[color:var(--border)] p-0 md:[border-top-width:1px]">
          {rows.map((r, i) => (
            <ModelLine key={r.key} row={r} first={i === 0} />
          ))}
        </ul>
      </div>
      <p className={FOOT}>{copy.featuresFoot}</p>
      <SectionHead title={copy.jobs} meta={copy.jobsMeta} />
      {jobs.values === null && <p className="m-0 text-pretty text-[13px] leading-[1.6] text-[color:var(--fg-muted)]">{copy.noToken}</p>}
      <div data-testid="job-rows" className={CARD}>
        <div aria-hidden className={`${HEAD} ${JOB_GRID}`}>
          <span>{j.variable}</span>
          <span>{j.value}</span>
          <span>{j.readAt}</span>
        </div>
        <ul className="m-0 list-none border-0 border-solid border-[color:var(--border)] p-0 md:[border-top-width:1px]">
          {JOB_VARIABLES.map((v, i) => (
            <JobLine
              key={v.name}
              name={v.name}
              readAt={v.readAt}
              value={jobs.values === null ? "—" : (jobs.values[v.name] ?? copy.unset)}
              first={i === 0}
            />
          ))}
        </ul>
      </div>
      <p className={FOOT}>{copy.jobsFoot}</p>
    </div>
  );
}
