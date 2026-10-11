"use client";

import { useId, useState } from "react";

import { deckStatsCopy } from "../../lib/copy/deck-stats";
import { AverageCard } from "./deck-stats-average";
import { Shell } from "./deck-stats-shell";
import { InfoTip } from "../ui/info-tip";
import { MoneyCard } from "./deck-stats-money";
import { ResultsCard } from "./deck-stats-results";
import { JOB_ROWS, type JobTally } from "../../lib/decks/job-tally";
import type { ManaSupply } from "../../lib/mana/supply";
import { colorRows } from "../../lib/mana/color-rows";
import { PIP_STYLE, SourceBar } from "./mana-color-parts";
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

/** Exported for the About page's specimen, which draws this card from a fixture with a type lit. */
export function CurveCard({ data, initialLit = null }: { data: DeckStatsSlice; initialLit?: CardType | null }) {
  const copy = deckStatsCopy.curve;
  const [lit, setLit] = useState<CardType | null>(initialLit);
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
  const cast = tally.cast;
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
      {tally.overlap > 0 ? <p className="font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{copy.overlap(tally.overlap)}</p> : null}
      {tally.none > 0 ? <p className="font-mono text-[10.5px] leading-[1.6] text-[color:var(--fg-faint)]">{copy.none(tally.none)}</p> : null}
    </Shell>
  );
}

function ColorsCard({ mana }: { mana: ManaSupply }) {
  const copy = deckStatsCopy.colors;
  const tipId = useId();
  const { rows, pipTotal, sourceTotal, widest } = colorRows(mana);
  const shares = rows.map((r) => ({ pips: r.pipShare, sources: r.sourceShare }));
  // The displayed total and the legend are the bars' own: a source counts once for each color it adds.
  const landSegments = rows.reduce((a, r) => a + r.lands, 0);
  const otherSegments = rows.reduce((a, r) => a + r.other, 0);
  const sources = sourceTotal;
  const asked = rows.filter((r) => r.pips > 0);
  const tip = asked.length === 1 ? [`${copy.monoLead(copy.names[asked[0].c])} ${copy.tip[0]}`, copy.tip[1]] : copy.tip;
  // Each line states an absence, so each needs the whole count behind it: a rock whose color we cannot read
  // is still a rock, and a land that adds nothing is still a land.
  const footer =
    mana.lands === 0 && mana.nonlandSources === 0 && mana.unattributedNonland === 0
      ? copy.noLands
      : mana.nonlandSources === 0 && mana.unattributedNonland === 0 && mana.landSources > 0
        ? copy.onlyLands
        : null;
  return (
    <Shell
      title={deckStatsCopy.cards.colors}
      id="colors"
      denom={copy.denom(pipTotal, sources)}
      label={`${deckStatsCopy.cards.colors}, ${copy.denom(pipTotal, sources)}`}
      info={<InfoTip id={tipId} lines={tip} label={deckStatsCopy.colors.infoLabel} />}
      describedBy={tipId}
    >
      {rows.length > 0 ? (
        <div className="flex flex-col gap-[9px]" data-colors-rows>
          <div aria-hidden="true" className="grid grid-cols-[minmax(0,1fr)_26px_minmax(0,1fr)] gap-[10px] font-mono text-[9.5px] tracking-[0.12em] text-[color:var(--fg-faint)]">
            <span className="text-right">{copy.pips}</span>
            <span />
            <span>{copy.sources}</span>
          </div>
          <ul className="flex flex-col gap-[9px]">
            {rows.map((r, i) => (
              <li
                key={r.c}
                data-color-row={r.c}
                aria-label={copy.row(copy.names[r.c], r.pips, shares[i].pips, r.lands, r.other, shares[i].sources)}
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
                  <SourceBar c={r.c} lands={r.lands} other={r.other} widthPct={(shares[i].sources / widest) * 60} />
                  <span className="whitespace-nowrap font-mono text-[11px] text-[color:var(--fg-body)]">{r.lands + r.other ? `${r.lands + r.other} · ${shares[i].sources}%` : "0"}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {footer || mana.nonlandSources > 0 ? (
      <div className="flex flex-col gap-[6px] border-t border-dashed border-[color:var(--border-dashed)] pt-[12px]" data-colors-legend>
        {footer ? (
          <p className="text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{footer}</p>
        ) : (
          <div className="flex flex-wrap gap-x-[18px] gap-y-[6px] text-[12px] text-[color:var(--fg-body)]">
            <span className="flex items-center gap-[8px]">
              <span aria-hidden="true" className="h-[10px] w-[18px] rounded-[2px] bg-[color:var(--fg-muted)]" />
              {copy.legendLand} <span className="font-mono text-[11px]">{landSegments}</span>
            </span>
            <span className="flex items-center gap-[8px]">
              <span
                aria-hidden="true"
                className="h-[10px] w-[18px] rounded-[2px]"
                style={{ backgroundImage: "repeating-linear-gradient(135deg, var(--fg-muted) 0 2px, transparent 2px 5px)", boxShadow: "inset 0 0 0 1px var(--fg-muted)" }}
              />
              {copy.legendOther} <span className="font-mono text-[11px]">{otherSegments}</span>
            </span>
          </div>
        )}
      </div>
      ) : null}
    </Shell>
  );
}

export function DeckStatsView({ data = null, onShop, onLogGame }: { data?: DeckStatsSlice | null; onShop?: () => void; onLogGame?: () => void }) {
  const card = (c: (typeof CARDS)[number]) =>
    c.key === "curve" && data ? (
      <CurveCard key={c.key} data={data} />
    ) : c.key === "jobs" && data?.jobs ? (
      <JobsCard key={c.key} tally={data.jobs} />
    ) : c.key === "money" && data?.money ? (
      <MoneyCard key={c.key} money={data.money} onShop={onShop} />
    ) : c.key === "colors" && data?.mana ? (
      <ColorsCard key={c.key} mana={data.mana} />
    ) : c.key === "average" && data?.average ? (
      <AverageCard key={c.key} average={data.average} />
    ) : c.key === "results" && data?.results ? (
      <ResultsCard key={c.key} results={data.results} onLogGame={onLogGame} />
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
