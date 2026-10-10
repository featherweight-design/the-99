"use client";

import { useState, type ReactNode } from "react";

import { deckStatsCopy } from "../../lib/copy/deck-stats";
import { JOB_ROWS, type JobTally } from "../../lib/decks/job-tally";
import { MANA_COLORS, type ManaColor, type ManaSupply } from "../../lib/mana/supply";
import { CARD_TYPES, CURVE_MAX, type CardType, type DeckStatsSlice } from "../../lib/decks/stats";

const CARDS = [
  { key: "curve", title: deckStatsCopy.cards.curve },
  { key: "jobs", title: deckStatsCopy.cards.jobs },
  { key: "money", title: deckStatsCopy.cards.money },
  { key: "colors", title: deckStatsCopy.cards.colors },
  { key: "average", title: deckStatsCopy.cards.average },
  { key: "results", title: deckStatsCopy.cards.results },
] as const;

// Left column then right column at 1300 (curve, jobs, money | colors, average,
// results); a single column at 390 in the same order the handoff reads.
const LEFT = CARDS.slice(0, 3);
const RIGHT = CARDS.slice(3);

const TYPE_VAR: Record<CardType | "land", string> = {
  creature: "var(--type-creature)",
  instant: "var(--type-instant)",
  sorcery: "var(--type-sorcery)",
  artifact: "var(--type-artifact)",
  enchantment: "var(--type-enchantment)",
  planeswalker: "var(--type-planeswalker)",
  battle: "var(--type-battle)",
  land: "var(--type-land)",
};

const BUCKET_LABELS = Array.from({ length: CURVE_MAX + 1 }, (_, i) =>
  i === CURVE_MAX ? deckStatsCopy.curve.ceiling : String(i),
);

function Shell({ title, id, label, denom, children }: { title: string; id: string; label?: string; denom?: string; children?: ReactNode }) {
  return (
    <section
      role="figure"
      aria-label={label ?? title}
      data-stats-card={id}
      className="flex flex-col gap-[16px] rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[14px] py-[16px] md:px-[22px] md:py-[20px]"
    >
      <header className="flex items-baseline gap-[10px] border-b border-b-[color:var(--border)] pb-[10px]">
        <h3 className="font-serif text-[17px] text-[color:var(--fg)] md:text-[19px]">{title}</h3>
        <span className="flex-1" />
        {denom ? <span className="text-right font-mono text-[10.5px] text-[color:var(--fg-faint)]">{denom}</span> : null}
      </header>
      {children}
    </section>
  );
}

function CurveCard({ data }: { data: DeckStatsSlice }) {
  const copy = deckStatsCopy.curve;
  const [lit, setLit] = useState<CardType | null>(null);
  const { curve, types } = data;
  const cast = curve.copies;
  const avg = curve.average === null ? copy.noAverage : curve.average.toFixed(1);

  return (
    <Shell title={copy.title} id="curve" denom={copy.denom(cast)} label={`${copy.title}, ${copy.denom(cast)}`}>
      <div className="grid grid-cols-8 gap-x-[4px]" data-curve-columns>
        {curve.buckets.map((b, i) => {
          const per = types.buckets[i];
          return (
            <div key={b.cmc} className="flex flex-col items-center justify-end gap-[6px]" data-curve-column={b.cmc}>
              <span
                aria-hidden="true"
                className={`font-mono text-[11px] tabular-nums ${b.copies === 0 ? "text-[color:var(--fg-locked)]" : "text-[color:var(--fg-body)]"}`}
              >
                {b.copies}
              </span>
              <span className="sr-only" data-curve-summary>
                {copy.column(
                  BUCKET_LABELS[i],
                  b.copies,
                  CARD_TYPES.filter((t) => per[t] > 0).map((t) => `${per[t]} ${per[t] === 1 ? copy.types[t] : copy.typesPlural[t]}`),
                )}
              </span>
              <div aria-hidden="true" className="flex min-h-[10px] flex-col-reverse gap-[2px]">
                {CARD_TYPES.flatMap((t) =>
                  Array.from({ length: per[t] }, (_, k) => (
                    <span
                      key={`${t}-${k}`}
                      data-curve-square={t}
                      className="size-[7px] rounded-[1px] md:size-[10px]"
                      style={{ background: lit === null || lit === t ? TYPE_VAR[t] : "var(--border-strong)" }}
                    />
                  )),
                )}
              </div>
              <span aria-hidden="true" className="self-stretch border-t border-t-[color:var(--border-strong)] pt-[6px] text-center font-mono text-[11px] text-[color:var(--fg-muted)]">{BUCKET_LABELS[i]}</span>
            </div>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-[6px]">
        {CARD_TYPES.map((t) => {
          const n = types.totals[t];
          const on = lit === t;
          return (
            <li key={t}>
              <button
                type="button"
                aria-pressed={on}
                data-type-chip={t}
                onClick={() => setLit(on ? null : t)}
                className={`flex min-h-[44px] items-center gap-[6px] rounded-[6px] border px-[9px] text-[12px] md:min-h-[28px] ${
                  on ? "border-[color:var(--fg)]" : "border-[color:var(--border-strong)]"
                } ${n === 0 ? "text-[color:var(--fg-locked)]" : on ? "text-[color:var(--fg)]" : "text-[color:var(--fg-body)]"}`}
              >
                <span
                  aria-hidden="true"
                  className="size-[8px] rounded-[2px]"
                  style={{ background: n === 0 ? "var(--border-strong)" : TYPE_VAR[t] }}
                />
                {copy.types[t]} <span className="font-mono text-[11px]">{n}</span>
              </button>
            </li>
          );
        })}
        <li>
          <span
            data-type-chip="land"
            className="flex min-h-[44px] items-center gap-[6px] rounded-[6px] border border-dashed border-[color:var(--border-dashed)] px-[9px] text-[12px] text-[color:var(--fg-body)] md:min-h-[28px]"
          >
            <span aria-hidden="true" className="size-[8px] rounded-[2px]" style={{ background: TYPE_VAR.land }} />
            {copy.types.land} <span className="font-mono text-[11px]">{curve.lands}</span>
          </span>
        </li>
      </ul>
      <p aria-live="polite" aria-atomic="true" className="font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">
        {lit === null ? copy.caption(avg, curve.lands) : copy.lit(copy.types[lit], types.totals[lit], cast)}
      </p>
    </Shell>
  );
}

const JOB_VAR: Record<(typeof JOB_ROWS)[number]["key"], string> = {
  ramp: "var(--job-ramp)",
  draw: "var(--job-draw)",
  removal: "var(--job-removal)",
  wipes: "var(--job-wipes)",
  protection: "var(--job-protection)",
  finisher: "var(--job-finisher)",
};

function JobsCard({ tally }: { tally: JobTally }) {
  const copy = deckStatsCopy.jobs;
  const [open, setOpen] = useState<string | null>(null);
  const cast = tally.labeled + tally.unlabeled;
  return (
    <Shell title={deckStatsCopy.cards.jobs} id="jobs" denom={copy.denom(cast)} label={`${deckStatsCopy.cards.jobs}, ${copy.denom(cast)}`}>
      <ul className="flex flex-col gap-[10px]">
        {tally.rows.map((r) => {
          const on = open === r.key;
          const head = (
            <>
              <span className={`w-[96px] shrink-0 text-left text-[12.5px] md:w-[120px] ${r.copies === 0 ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg-body)]"}`}>
                {copy.rows[r.key]}
              </span>
              <span aria-hidden="true" className="flex flex-1 flex-wrap gap-[3px]" data-job-squares={r.key}>
                {Array.from({ length: r.copies }, (_, k) => (
                  <span key={k} className="size-[9px] rounded-[1px] md:size-[11px]" style={{ background: JOB_VAR[r.key] }} />
                ))}
              </span>
              <span className={`w-[24px] shrink-0 text-right font-mono text-[12px] tabular-nums ${r.copies === 0 ? "text-[color:var(--fg-locked)]" : "text-[color:var(--fg)]"}`}>
                {r.copies}
              </span>
              <span aria-hidden="true" className="w-[12px] shrink-0 text-center font-mono text-[12px] text-[color:var(--fg-muted)]">
                {r.copies === 0 ? "" : on ? "⌃" : "›"}
              </span>
            </>
          );
          return (
            <li key={r.key} data-job-row={r.key}>
              {r.copies === 0 ? (
                <div className="flex min-h-[28px] items-center gap-[10px]">{head}</div>
              ) : (
                <button
                  type="button"
                  aria-expanded={on}
                  onClick={() => setOpen(on ? null : r.key)}
                  className="flex min-h-[44px] w-full items-center gap-[10px] md:min-h-[28px]"
                >
                  {head}
                </button>
              )}
              {on ? (
                <p data-job-names className="pb-[4px] pl-[106px] pt-[2px] text-[12px] leading-[1.5] text-[color:var(--fg-muted)] md:pl-[130px]">
                  {[...r.names].sort((a, b) => a.localeCompare(b)).join(", ")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      {tally.unlabeled > 0 ? (
        <div className="flex flex-col gap-[6px]" data-job-unlabeled>
          <span aria-hidden="true" className="flex flex-wrap gap-[3px]">
            {Array.from({ length: tally.unlabeled }, (_, k) => (
              <span key={k} className="size-[9px] rounded-[1px] border border-dashed border-[color:var(--fg-muted)] md:size-[11px]" />
            ))}
          </span>
          <p className="font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{copy.unlabeled(tally.unlabeled)}</p>
        </div>
      ) : null}
      {tally.overlap > 0 ? <p className="font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{copy.overlap(tally.overlap)}</p> : null}
      {tally.none > 0 ? <p className="font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{copy.none(tally.none)}</p> : null}
    </Shell>
  );
}

const PIP_STYLE: Record<ManaColor, { bg: string; ink: string }> = {
  W: { bg: "var(--w)", ink: "var(--pip-ink-dark)" },
  U: { bg: "var(--u)", ink: "var(--pip-ink-light)" },
  B: { bg: "var(--b)", ink: "var(--pip-ink-dark)" },
  R: { bg: "var(--r)", ink: "var(--pip-ink-light)" },
  G: { bg: "var(--g)", ink: "var(--pip-ink-light)" },
  C: { bg: "var(--fg-muted)", ink: "var(--pip-ink-dark)" },
};

const share = (n: number, total: number) => (total === 0 ? 0 : Math.round((n / total) * 100));

function ColorsCard({ mana }: { mana: ManaSupply }) {
  const copy = deckStatsCopy.colors;
  const rows = MANA_COLORS.map((c) => ({ c, pips: mana.demand[c], sources: mana.supply[c].lands })).filter((r) => r.pips > 0 || r.sources > 0);
  const pipTotal = rows.reduce((a, r) => a + r.pips, 0);
  const sourceTotal = rows.reduce((a, r) => a + r.sources, 0);
  const shares = rows.map((r) => ({ pips: share(r.pips, pipTotal), sources: share(r.sources, sourceTotal) }));
  const widest = Math.max(1, ...shares.flatMap((s) => [s.pips, s.sources]));
  const asked = rows.filter((r) => r.pips > 0);
  const caption =
    mana.lands === 0
      ? copy.noLands
      : asked.length === 1
        ? `${copy.monoLead(copy.names[asked[0].c])} ${copy.captionMono}`
        : copy.caption;
  return (
    <Shell title={deckStatsCopy.cards.colors} id="colors" denom={copy.denom(pipTotal, mana.lands)} label={`${deckStatsCopy.cards.colors}, ${copy.denom(pipTotal, mana.lands)}`}>
      {rows.length > 0 ? (
        <div className="flex flex-col gap-[9px]" data-colors-rows>
          <div aria-hidden="true" className="grid grid-cols-[minmax(0,1fr)_26px_minmax(0,1fr)] gap-[10px] font-mono text-[9.5px] tracking-[0.12em] text-[color:var(--fg-faint)]">
            <span className="text-right">{copy.asks}</span>
            <span />
            <span>{copy.makes}</span>
          </div>
          <ul className="flex flex-col gap-[9px]">
            {rows.map((r, i) => (
              <li
                key={r.c}
                data-color-row={r.c}
                aria-label={copy.row(copy.names[r.c], r.pips, r.sources)}
                className="grid grid-cols-[minmax(0,1fr)_26px_minmax(0,1fr)] items-center gap-[10px]"
              >
                <div aria-hidden="true" className="flex flex-row-reverse items-center gap-[8px]">
                  <span className="h-[14px] flex-none rounded-[3px]" style={{ width: `${(shares[i].pips / widest) * 60}%`, background: PIP_STYLE[r.c].bg }} />
                  <span className="whitespace-nowrap font-mono text-[11px] text-[color:var(--fg-body)]">{r.pips ? `${r.pips} · ${shares[i].pips}%` : "0"}</span>
                </div>
                <span
                  aria-hidden="true"
                  className="flex size-[26px] items-center justify-center rounded-[5px] font-mono text-[11.5px] font-semibold"
                  style={{ background: PIP_STYLE[r.c].bg, color: PIP_STYLE[r.c].ink }}
                >
                  {r.c}
                </span>
                <div aria-hidden="true" className="flex items-center gap-[8px]">
                  <span className="h-[14px] flex-none rounded-[3px]" style={{ width: `${(shares[i].sources / widest) * 60}%`, background: PIP_STYLE[r.c].bg }} />
                  <span className="whitespace-nowrap font-mono text-[11px] text-[color:var(--fg-body)]">{r.sources ? `${r.sources} · ${shares[i].sources}%` : "0"}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {mana.unattributedNonland > 0 ? (
        <div className="flex flex-col gap-[8px] border-t border-dashed border-[color:var(--border-dashed)] pt-[12px]" data-colors-nonland>
          <span aria-hidden="true" className="flex flex-wrap gap-[3px]">
            {Array.from({ length: mana.unattributedNonland }, (_, k) => (
              <span key={k} className="size-[10px] rounded-[2px] border border-dashed border-[color:var(--fg-muted)]" />
            ))}
          </span>
          <span className="text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">
            {mana.unattributedNonland === 1 ? copy.nonlandOne : copy.nonlandMany(mana.unattributedNonland)}
          </span>
        </div>
      ) : null}
      <p className="font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{caption}</p>
    </Shell>
  );
}

export function DeckStatsView({ data = null }: { data?: DeckStatsSlice | null }) {
  const card = (c: (typeof CARDS)[number]) =>
    c.key === "curve" && data ? (
      <CurveCard key={c.key} data={data} />
    ) : c.key === "jobs" && data?.jobs ? (
      <JobsCard key={c.key} tally={data.jobs} />
    ) : c.key === "colors" && data?.mana ? (
      <ColorsCard key={c.key} mana={data.mana} />
    ) : (
      <Shell key={c.key} id={c.key} title={c.title} />
    );
  return (
    <div
      data-deck-stats
      className="grid grid-cols-1 gap-[14px] px-[16px] pb-[24px] pt-[14px] md:grid-cols-2 md:items-start md:px-[26px]"
    >
      <div className="flex flex-col gap-[14px]">{LEFT.map(card)}</div>
      <div className="flex flex-col gap-[14px]">{RIGHT.map(card)}</div>
    </div>
  );
}
