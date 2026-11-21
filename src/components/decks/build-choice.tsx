"use client";

// The new-deck screen's one choice of how the deck is built (guided build, call 1): radio rows in the Upgrade flow's option
// shape, each led by a line icon. The Guided row joins in a later PR; this one draws the free build and just the commander.
import type { ReactNode } from "react";
import Link from "next/link";
import { PendingReporter } from "../shell/pending-reporter";
import { guidedBuildCopy } from "../../lib/copy/guided-build";
import type { CreateBuildKind } from "../../lib/decks/build-kind";
import { CreditsText } from "../ui/credits-text";
import { creditsCopy } from "../../lib/copy/credits";
import type { GuidedChoice } from "../../lib/guided/choice";
import type { SelectedPick } from "../../lib/decks/selected-picks";

const copy = guidedBuildCopy.choice;

const ICONS: Record<CreateBuildKind, ReactNode> = {
  // a stack of cards
  free: (<><rect x="4" y="5" width="12" height="14" rx="2" /><path d="M8 3h12v14" /></>),
  // a card with a spark: picked, then sharpened
  guided: (<><rect x="4" y="6" width="11" height="14" rx="2" /><path d="M18.5 3v6M15.5 6h6" /></>),
  // one card alone
  empty: (<><rect x="6.5" y="4" width="11" height="16" rx="2" /><path d="M10 9.5h4" /></>),
};

export function BuildChoice({ value, onChange, commander, picks, commanderHref, disabled, guided = null }: {
  value: CreateBuildKind;
  onChange: (kind: CreateBuildKind) => void;
  guided?: GuidedChoice | null;
  /** The commander's short name, for the rows' lines. */
  commander: string;
  /** The synergy picks carried from the commander page (?select=), drawn so the reader sees they came along. */
  picks: SelectedPick[];
  /** The commander's page, where the picks are changed; null draws no link. */
  commanderHref: string | null;
  disabled?: boolean;
}) {
  const n = picks.length;
  const g = copy.guided;
  const guidedOff = guided !== null && guided.state !== "ready";
  const guidedReason = guided === null ? null
    : guided.state === "none" ? g.none
    : guided.state === "short" ? (guided.payments ? creditsCopy.withMore(g.shortMore(guided.have), true) : g.shortOff(guided.have))
    : null;
  const rows: { kind: CreateBuildKind; name: string; cost: string; line: string; off?: boolean; reason?: string | null }[] = [
    { kind: "free", name: copy.free.name, cost: copy.free.cost, line: n > 0 ? copy.withPicks.free(n) : copy.free.line },
    ...(guided === null ? [] : [{ kind: "guided" as const, name: g.name, cost: g.cost, line: `${g.line} ${g.back}`, off: guidedOff, reason: guidedReason }]),
    { kind: "empty", name: copy.empty.name, cost: copy.empty.cost, line: n > 0 ? copy.withPicks.empty(commander, n) : copy.empty.line(commander) },
  ];
  return (
    <div className="mb-[24px] md:mb-[28px]">
      {n > 0 && (
        <div data-testid="build-picks" className="mb-[16px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface)] p-[12px]">
          <div className="mb-[10px] flex items-baseline gap-[8px]">
            <span className="whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.picks.label(n)}</span>
            {commanderHref && (
              <Link href={commanderHref} aria-label={copy.picks.changeLabel(commander)} className="ml-auto font-mono text-[11px] text-[color:var(--accent-text)]">{copy.picks.change}<PendingReporter href={commanderHref} /></Link>
            )}
          </div>
          <ul className="m-0 flex list-none gap-[8px] overflow-x-auto p-0">
            {picks.map((p) => (
              <li key={p.oracleId} className="flex w-[64px] flex-none flex-col gap-[4px]">
                {p.imageUri
                  // eslint-disable-next-line @next/next/no-img-element -- a card face from the catalog's own CDN, as the deck rows draw it
                  ? <img src={p.imageUri} alt="" loading="lazy" className="block aspect-[63/88] w-[64px] rounded-[4px] bg-[color:var(--elevated)] object-cover" />
                  : <span aria-hidden className="block aspect-[63/88] w-[64px] rounded-[4px] bg-[color:var(--elevated)]" />}
                <span className="line-clamp-2 font-mono text-[9.5px] leading-[1.35] text-[color:var(--fg-muted)]">{p.name}</span>
                {!p.owned && <span className="font-mono text-[9.5px] text-[color:var(--warning)]">{copy.picks.buy}</span>}
              </li>
            ))}
          </ul>
          <p className="mb-0 mt-[8px] text-[12px] leading-[1.5] text-[color:var(--fg-body)]">{copy.picks.kept}</p>
        </div>
      )}
      <div role="radiogroup" aria-labelledby="build-choice-label" className="flex flex-col gap-[8px]">
        <p id="build-choice-label" className="mb-[0px] font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.label}</p>
        {rows.map((r) => {
          const on = r.kind === value && !r.off;
          const reasonId = r.reason ? `build-${r.kind}-reason` : undefined;
          return (
            <label
              key={r.kind}
              className={`flex w-full ${r.off ? "cursor-not-allowed" : "cursor-pointer"} gap-[12px] rounded-[10px] border border-solid p-[12px] text-left has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--accent)] ${
                on ? "border-[color:var(--accent)] bg-[color:color-mix(in_oklab,var(--accent)_10%,var(--surface))]" : "border-[color:var(--border)] bg-[color:var(--surface)]"
              }`}
            >
              <input
                type="radio"
                name="build-kind"
                value={r.kind}
                checked={on}
                disabled={disabled || r.off}
                aria-describedby={reasonId}
                onChange={() => onChange(r.kind)}
                className="sr-only"
              />
              <span aria-hidden className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full bg-[color:var(--elevated)] text-[color:var(--accent-text)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{ICONS[r.kind]}</svg>
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-[4px]">
                <span className="flex items-baseline gap-[8px]">
                  <span className="font-sans text-[14px] font-semibold text-[color:var(--fg)]">{r.name}</span>
                  <span className="ml-auto font-mono text-[10.5px] text-[color:var(--fg-faint)]">{r.cost}</span>
                </span>
                <span className="text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{r.line}</span>
                {r.reason && (
                  <span id={reasonId} className="whitespace-pre-line font-mono text-[11px] leading-[1.5]" style={{ color: "var(--warning)" }}><CreditsText text={r.reason} /></span>
                )}
              </span>
              <span aria-hidden className="mt-[2px] flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border border-solid" style={{ borderColor: on ? "var(--accent)" : "var(--border-strong)" }}>
                {on && <span className="h-[10px] w-[10px] rounded-full" style={{ background: "var(--accent)" }} />}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
