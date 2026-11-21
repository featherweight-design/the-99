"use client";

// The guided build's run window (handoff R1 to R5): Upgrade's chrome (a sheet on a phone, a 720 dialog from md), the picks tracker, then
// the wait, the failed run or the result. It is the engine's view only: the picks steps are PR D's. The window reads the run through
// `useGuidedRun`; closing it leaves the run going (the deck holds it, and its page says so).
import Link from "next/link";
import { useId, useMemo, useRef, type ReactNode } from "react";
import { useDialogA11y } from "../../../lib/a11y/dialog";
import { useInertWhileOpen } from "../../../lib/a11y/inert-page";
import { BRACKET_NAMES } from "../../../lib/copy/deck-analysis";
import { dollars } from "../../../lib/copy/credits-page";
import { guidedBuildCopy } from "../../../lib/copy/guided-build";
import type { GuidedState } from "../../../lib/guided/store";
import type { StrategyKey } from "../../../lib/strategy/score";
import { CreditsText } from "../../ui/credits-text";
import { SheetGrabber } from "../../ui/sheet-grabber";
import { useAiSweepRef } from "../../ui/use-ai-sweep";
import { useVisualViewportFrame, VV_FRAME } from "../../ui/visual-viewport";
import { PendingReporter } from "../../shell/pending-reporter";
import { SYNOPSIS_CONTRACT_VERSION_STAGES } from "../../../lib/precons/synopsis-contract";
import { StrategyIcon } from "../strategy-icon";
import { SynopsisSections } from "../synopsis-body";
import { useClock } from "../precons/upgrade/wait-view";
import type { FindingArt } from "../../../lib/decks/builder-figures";
import type { GuidedRun } from "./use-guided-run";

const copy = guidedBuildCopy.run;
// The foot's presses are Upgrade's: the accent fill, dimmed and still when off, and the hairline ghost.
const ACCENT_PRESS = "inline-flex h-[46px] cursor-pointer items-center justify-center rounded-[8px] border-0 bg-[color:var(--accent)] px-[16px] font-sans text-[13px] font-semibold text-[color:var(--bg)] no-underline transition-colors hover:bg-[color:var(--accent-hover)] disabled:cursor-default disabled:bg-[color:var(--elevated)] disabled:text-[color:var(--fg-faint)] disabled:hover:bg-[color:var(--elevated)] md:h-[40px]";
const GHOST_PRESS = "inline-flex h-[46px] cursor-pointer items-center justify-center rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[16px] font-sans text-[13px] font-semibold text-[color:var(--fg)] no-underline disabled:cursor-default disabled:opacity-60 md:h-[40px]";
const FOOT = "flex flex-none flex-col gap-[8px] md:flex-row md:items-center md:justify-between md:gap-[16px]";
const FOOT_LINE = "m-0 font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)] md:order-1 md:min-w-0 md:flex-1";

/** The pick's words, for the picks line and the tracker's cells. */
export function runPicks(run: GuidedState) {
  return {
    strategy: run.strategyLabel,
    bracket: run.bracketTarget as 2 | 3 | 4,
    pool: copy.pool[run.poolMode],
  };
}

function PicksLine({ run }: { run: GuidedState }) {
  const p = runPicks(run);
  const parts = [p.strategy, copy.bracket(p.bracket), p.pool];
  return (
    <p className="m-0 font-mono text-[11px] text-[color:var(--fg-faint)]">
      {parts.map((part, i) => <span key={part}>{i > 0 ? " · " : ""}<b className="font-semibold text-[color:var(--fg-body)]">{part}</b></span>)}
    </p>
  );
}

/** The tracker under the title while a run is out: every step done, the player's pick inside each cell. Not pressable: the picks of a run that has started do not change. */
function RunTracker({ run }: { run: GuidedState }) {
  const p = runPicks(run);
  const cells = [
    { key: "strategy", label: copy.steps.strategy, pick: p.strategy },
    { key: "bracket", label: copy.steps.bracket, pick: `${p.bracket} · ${BRACKET_NAMES[p.bracket]}` },
    { key: "cards", label: copy.steps.cards, pick: p.pool },
  ];
  return (
    <ol className="m-0 flex flex-none list-none gap-[4px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[4px]" aria-label={copy.steps.label}>
      {cells.map((c) => (
        <li key={c.key} className="flex min-w-0 flex-1">
          <span className="flex min-h-[44px] min-w-0 flex-1 items-center gap-[8px] rounded-[7px] border border-solid border-transparent px-[10px] py-[6px] text-left text-[color:var(--fg-faint)] md:min-h-[40px]">
            <span aria-hidden className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full bg-[color:var(--accent)] font-mono text-[10px] text-[color:var(--bg)]">✓</span>
            <span className="flex min-w-0 flex-col">
              <span className="font-mono text-[9.5px] uppercase tracking-[0.08em]">{c.label}</span>
              <span className="block min-w-0 truncate text-[12px] text-[color:var(--fg)]">{c.pick}</span>
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

type RowState = "done" | "now" | "next";
function Row({ state, children }: { state: RowState; children: ReactNode }) {
  return (
    <li className="flex items-center gap-[10px] text-[13px]" aria-current={state === "now" ? "step" : undefined}>
      <span aria-hidden className={"flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full font-mono text-[10px] "
        + (state === "done" ? "bg-[color:var(--accent)] text-[color:var(--bg)]" : state === "now" ? "border border-solid border-[color:var(--accent)]" : "border border-solid border-[color:var(--border-strong)]")}>
        {state === "done" ? "✓" : state === "now" ? <span className="h-[6px] w-[6px] rounded-full bg-[color:var(--accent)]" /> : null}
      </span>
      <span className={state === "next" ? "text-[color:var(--fg-faint)]" : "text-[color:var(--fg-body)]"}>{children}</span>
      <span className="sr-only">{state === "done" ? " (done)" : state === "now" ? " (now)" : " (next)"}</span>
    </li>
  );
}

/** R1 while the sharpening is out, R2 once it has finished and the Overview is being written. */
function WaitView({ run, phase }: { run: GuidedState; phase: "sharpen" | "plan" }) {
  const clock = useClock(run.createdAt.getTime());
  const sweepRef = useAiSweepRef();
  const s = run.strategyLabel;
  return (
    <div className="flex flex-col gap-[12px]" aria-busy="true">
      <PicksLine run={run} />
      {/* One live region for the whole wait: the clock ticks inside it, so it is `off` and the phase is announced by the rows' own text. */}
      <div ref={sweepRef} role="status" className="ai-sweep flex flex-col gap-[8px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] p-[12px_14px]">
        <p className="m-0 flex flex-wrap items-baseline gap-x-[10px] text-[13px] text-[color:var(--fg-body)]">
          <span aria-hidden className="font-mono text-[13px] font-semibold text-[color:var(--fg)]">{clock}</span>
          <span>{phase === "plan" ? copy.wait.overview : copy.wait.building(s)}</span>
          <span className="font-mono text-[12px] text-[color:var(--fg-muted)]">{copy.wait.usual}</span>
        </p>
        <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)]">{copy.wait.leave}</p>
        <span aria-hidden className="mt-[4px] block h-[2px] rounded-full bg-[color:var(--accent)]" style={{ width: phase === "plan" ? "78%" : "40%" }} />
      </div>
      <ol className="m-0 flex list-none flex-col gap-[10px] p-0 pl-[2px]">
        <Row state="done">{copy.wait.filled}</Row>
        <Row state={phase === "sharpen" ? "now" : "done"}>{copy.wait.sharpening(s)}</Row>
        <Row state={phase === "plan" ? "now" : "next"}>{copy.wait.overview}</Row>
      </ol>
    </div>
  );
}

function FailedView({ run, deckName }: { run: GuidedState; deckName: string }) {
  return (
    <div className="flex flex-col gap-[10px]">
      <PicksLine run={run} />
      <p role="alert" className="m-0 font-mono text-[11.5px] leading-[1.55]" style={{ color: "var(--danger)" }}>{copy.failed.line}</p>
      <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.failed.kept(deckName)}</p>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[3px] rounded-[7px] px-[12px] py-[8px]">
      <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[color:var(--fg-faint)]">{label}</span>
      <span className="flex items-baseline gap-[6px] text-[14px] font-semibold text-[color:var(--fg)]">{children}</span>
    </div>
  );
}
const SUB = "font-mono text-[12px] font-normal text-[color:var(--fg-body)]";

function ResultView({ run, overview, commanderId, art }: { run: GuidedState; overview: GuidedRun; commanderId: string | null; art: FindingArt }) {
  const p = runPicks(run);
  const short = run.state === "short";
  const row = overview.synopsis?.synopsis ?? null;
  const buy = run.buyTotalCents ? dollars(run.buyTotalCents) : null;
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="grid grid-cols-2 gap-[2px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[3px] md:grid-cols-4">
        <Fact label={copy.result.facts.strategy}><span className="text-[color:var(--accent-text)]"><StrategyIcon strategy={run.strategyKey as StrategyKey} size={14} /></span>{run.strategyLabel}</Fact>
        <Fact label={copy.result.facts.bracket}>{p.bracket} <span className={SUB}>{BRACKET_NAMES[p.bracket]}</span></Fact>
        <Fact label={copy.result.facts.sharpened}>{run.pairs.length} <span className={SUB}>{copy.result.cards}</span></Fact>
        <Fact label={copy.result.facts.toBuy}>{buy ? <span className={SUB + " text-[14px] font-semibold text-[color:var(--fg)]"}>{buy}</span> : copy.result.none}</Fact>
      </div>
      {short && <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.result.short(run.pairs.length, p.bracket)}</p>}
      {!short && overview.overview === "absent" && <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.result.overviewMissing}</p>}
      {row && (
        <div className="flex flex-col gap-[4px] rounded-[12px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-raised)] p-[14px] md:p-[18px]">
          <div className="flex items-baseline gap-[10px]">
            <h3 className="m-0 font-display text-[16px] font-normal text-[color:var(--fg)]">{copy.result.overview}</h3>
            <span className="ml-auto font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.result.overviewNote}</span>
          </div>
          <SynopsisSections content={row.content} contractVersion={row.contractVersion ?? SYNOPSIS_CONTRACT_VERSION_STAGES} commanderId={commanderId} art={art} evidenceNames={overview.synopsis?.evidenceNames ?? {}} onRetry={null} busy={false} />
        </div>
      )}
    </div>
  );
}

export function GuidedRunDialog({ deckId, deckName, commanderId, g, onClose }: {
  deckId: string;
  deckName: string;
  /** The commander's oracle id: the Overview draws its image beside the first paragraph. */
  commanderId: string | null;
  /** The run as the caller reads it (`useGuidedRun`): the page's line and this window share one read. */
  g: GuidedRun;
  onClose: () => void;
}) {
  const { run } = g;
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useDialogA11y(dialog, onClose, { initialFocusRef: closeRef });
  const inertRef = useInertWhileOpen(true);
  const visible = useVisualViewportFrame();
  const art = useMemo<FindingArt>(() => new Map(Object.entries(g.synopsis?.art ?? {}).map(([id, imageUri]) => [id, { name: "", imageUri }])), [g.synopsis]);

  // The window's stage: a run out is a wait (its second phase once the sharpening finished and the Overview is being written); a run that
  // kept its charge is the result as soon as its Overview arrives or is called absent; a short run has no Overview to wait for.
  const stage: "wait" | "plan" | "failed" | "result" =
    run.state === "running" ? "wait" : run.state === "failed" ? "failed" : run.state === "short" || g.overview !== "waiting" ? "result" : "plan";
  const heldLine = stage === "wait" || stage === "plan";
  const openHref = `/decks/${deckId}`;

  return (
    <div ref={inertRef} className={`fixed inset-0 ${VV_FRAME} z-50 flex flex-col justify-end md:justify-center md:px-[16px]`} style={visible}>
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-[rgba(16,13,10,0.74)]" />
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="relative z-10 mx-auto flex h-[calc(100dvh-24px)] w-full flex-col gap-[14px] overflow-hidden rounded-[16px_16px_0_0] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] p-[10px_18px_18px] md:h-auto md:max-h-[88dvh] md:max-w-[720px] md:rounded-[14px] md:p-[24px_24px_20px]">
        <SheetGrabber className="pt-0" />
        <div className="flex flex-none items-start justify-between gap-[12px]">
          <h2 id={titleId} className="m-0 min-w-0 flex-1 font-display text-[20px] font-normal text-[color:var(--fg)]">{stage === "result" ? copy.result.title(deckName) : copy.title(deckName)}</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={copy.close} className="-mr-[10px] -mt-[10px] flex h-[44px] w-[44px] flex-none cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-[15px] text-[color:var(--fg-muted)]">{"✕"}</button>
        </div>
        {stage !== "result" && <RunTracker run={run} />}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="-m-[6px] flex min-h-0 flex-1 flex-col gap-[16px] overflow-y-auto overflow-x-hidden p-[6px]">
            {(stage === "wait" || stage === "plan") && <WaitView run={run} phase={stage === "plan" ? "plan" : "sharpen"} />}
            {stage === "failed" && <FailedView run={run} deckName={deckName} />}
            {stage === "result" && <ResultView run={run} overview={g} commanderId={commanderId} art={art} />}
          </div>
        </div>
        {heldLine && (
          <div className={FOOT}>
            <div className="flex gap-[8px] md:order-2 md:flex-row-reverse">
              <button type="button" disabled className={`${ACCENT_PRESS} flex-1 md:flex-none`}>{copy.wait.pressing(run.strategyLabel)}</button>
            </div>
            <p className={FOOT_LINE}>{copy.wait.held}</p>
          </div>
        )}
        {stage === "failed" && (
          <div className={FOOT}>
            <div className="flex gap-[8px] md:order-2 md:flex-row-reverse">
              <button type="button" onClick={g.retry} disabled={g.starting} aria-busy={g.starting || undefined} className={`${ACCENT_PRESS} flex-[2] md:flex-none`}>{copy.failed.retry}</button>
              <Link href={openHref} className={`${GHOST_PRESS} flex-1 md:flex-none`}>{copy.failed.open}<PendingReporter href={openHref} /></Link>
            </div>
            <div className="flex flex-col gap-[4px] md:order-1 md:min-w-0 md:flex-1">
              <p className={FOOT_LINE.replace("md:order-1 ", "")}><CreditsText text={copy.failed.retryLine} /></p>
              {g.refused && <p role="alert" className="m-0 font-mono text-[10.5px] leading-[1.5]" style={{ color: "var(--danger)" }}>{copy.failed.retryRefused}</p>}
            </div>
          </div>
        )}
        {stage === "result" && (
          <div className="flex flex-none md:justify-end">
            <Link href={openHref} className={`${ACCENT_PRESS} flex-1 md:flex-none`}>{copy.result.open(deckName)}<PendingReporter href={openHref} /></Link>
          </div>
        )}
      </div>
    </div>
  );
}
