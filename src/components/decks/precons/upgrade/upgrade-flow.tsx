"use client";

// Upgrade this precon's flow (handoff R2d): a drawer on a phone, a 720-wide dialog on desktop, S1's chrome. It opens on what to expect, then walks
// Commander, Bracket and Strategy, one step at a time. The foot holds one primary press that names the next step; at Strategy it is the confirm.
// A step with one option is skipped and its pick made for the player. The confirm runs the upgrade (`onConfirm`); the wait, the failed run and the
// result are the flow's other stages, chosen by `view`. Starting a deck from a result is drawn off until its own PR (`onStart` absent).
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDialogA11y } from "../../../../lib/a11y/dialog";
import { useInertWhileOpen } from "../../../../lib/a11y/inert-page";
import { useVisualViewportFrame, VV_FRAME } from "../../../ui/visual-viewport";
import { creditCount, creditSpent } from "../../../../lib/model/credit-line";
import { runFunding } from "../../../../lib/model/allowance-rule";
import { BRACKET_NAMES } from "../../../../lib/copy/deck-analysis";
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import { complete, choose, commanderOf, impliedPicks, pickSteps, sameRun, strategiesFor, type FlowStep, type PickStep, type Picks, type RunView } from "../../../../lib/precons/upgrade/flow";
import type { UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { CreditsText } from "../../../ui/credits-text";
import { SheetGrabber } from "../../../ui/sheet-grabber";
import { IntroStep } from "./intro-step";
import { BracketStep, CommanderStep, StrategyStep, type UpgradeArt } from "./pick-steps";
import { StepTracker } from "./step-tracker";
import { ResultView, leadOf, runDay } from "./result-view";
import { HistoryView } from "./history-view";
import { FailedView, WaitView } from "./wait-view";

const copy = preconUpgradeCopy;
// The foot's press is the accent fill (R2d boards), dimmed and still when off; Back and Not now are the hairline.
const ACCENT_PRESS = "h-[46px] cursor-pointer rounded-[8px] border-0 bg-[color:var(--accent)] px-[16px] font-sans text-[13px] font-semibold text-[color:var(--bg)] transition-colors hover:bg-[color:var(--accent-hover)] disabled:cursor-default disabled:bg-[color:var(--elevated)] disabled:text-[color:var(--fg-faint)] disabled:hover:bg-[color:var(--elevated)] md:h-[40px]";
const GHOST_PRESS = "h-[46px] cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[16px] font-sans text-[13px] font-semibold text-[color:var(--fg)] disabled:cursor-default disabled:opacity-60 md:h-[40px]";
const bracketName = (b: 2 | 3 | 4) => BRACKET_NAMES[b];

export function UpgradeFlow({ precon, panel, art, onClose, onConfirm, onRetry, view = { kind: "none" }, onStart }: {
  precon: string;
  panel: UpgradePanel;
  art: UpgradeArt;
  onClose: () => void;
  /** The run's press; absent draws the confirm off. */
  onConfirm?: (picks: { commander: string; bracket: number; strategy: string }) => void;
  /** Try again after a failed run: the same picks, a new run. */
  onRetry?: () => void;
  /** The run the flow shows: the picks (none), the wait, the failed run or a kept result. The caller remounts the flow (a key) when it moves. */
  view?: RunView;
  /** Starts a deck from the shown result; absent draws the press off. */
  onStart?: (runId: string) => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const steps = useMemo(() => pickSteps(panel), [panel]);
  const [picks, setPicks] = useState<Picks>(() => impliedPicks(panel));
  const [step, setStep] = useState<FlowStep>("intro");
  // Leaving the wait, the failure or the result for the picks (Try another strategy, a done cell of the tracker).
  const [left, setLeft] = useState(false);
  // A kept run opened from the same-picks ask shows as a result, free.
  const [opened, setOpened] = useState<string | null>(null);
  // History is a list of every kept run; a row opened from it is read-only, with a way back to the list.
  const [history, setHistory] = useState(false);
  const [fromHistory, setFromHistory] = useState(false);
  const hasRuns = panel.runs.some((r) => r.status === "done");
  const resultId = opened ?? (view.kind === "results" ? view.runId : null);
  const shown = resultId ? panel.runs.find((r) => r.id === resultId) ?? null : null;
  // A result the panel does not hold (it moved on) falls back to the picks rather than drawing an empty result.
  const stage: "pick" | "wait" | "failed" | "results" | "history" = history ? "history" : opened ? (shown ? "results" : "pick") : left || view.kind === "none" || (view.kind === "results" && !shown) ? "pick" : view.kind;
  const shownLead = shown ? leadOf(panel, shown) : null;
  // A run made over another list than the box has now cannot start a deck (R3): its row is kept, and Start is off.
  const stale = shown !== null && (shown.listFp === null || shown.listFp !== panel.listFp);
  const body = useRef<HTMLDivElement>(null);
  const [scrolls, setScrolls] = useState(false);
  useDialogA11y(dialog, onClose, {});
  const inertRef = useInertWhileOpen(true);
  const visible = useVisualViewportFrame();

  const index = step === "intro" ? -1 : steps.indexOf(step);
  const nextStep = (steps[index + 1] ?? null) as PickStep | null;
  const prevStep = index > 0 ? steps[index - 1] : null;
  const lead = commanderOf(panel, picks.commander);
  const leadName = lead ? lead.cards.map((c) => c.name).join(" + ") : null;

  const pickLabel = (s: PickStep): string | null => {
    if (s === "commander") return leadName;
    if (s === "bracket") return picks.bracket === null ? null : `${picks.bracket} · ${bracketName(picks.bracket)}`;
    return strategiesFor(panel, picks.commander).find((x) => x.key === picks.strategy)?.label ?? null;
  };
  const cells = steps.map((s) => ({ step: s, pick: pickLabel(s) }));
  // The picks of the run on screen, for the tracker's done cells and the picks line.
  const runLead = shownLead ? shownLead.cards.map((c) => c.name).join(" + ") : commanderOf(panel, view.kind === "wait" || view.kind === "failed" ? view.picks.commander : null)?.cards.map((c) => c.name).join(" + ") ?? "";
  const runBracket = shown ? shown.bracketTarget : view.kind === "wait" || view.kind === "failed" ? view.picks.bracket : null;
  const runStrategy = shown
    ? shown.strategyLabel
    : view.kind === "wait" || view.kind === "failed" ? strategiesFor(panel, view.picks.commander).find((x) => x.key === view.picks.strategy)?.label ?? "" : "";
  const bracketLabel = runBracket === null ? "" : `${runBracket} · ${bracketName(runBracket as 2 | 3 | 4)}`;
  const runCells = steps.map((s) => ({ step: s, pick: s === "commander" ? runLead : s === "bracket" ? bracketLabel : runStrategy }));

  const here = step === "intro" ? null : step;
  const ready = here === null ? true : here === "commander" ? picks.commander !== null : here === "bracket" ? picks.bracket !== null : complete(picks);
  const funding = runFunding(panel.allowance, 2);
  const blocked = funding.source === "spent" || funding.source === "short" || panel.allowance.ownerShare === true || panel.allowance.paused === true;
  const same = sameRun(panel.runs, picks);

  // The drawn "scrolls on" cue: a fade and a mono label while the body has more below the fold.
  useEffect(() => {
    const el = body.current;
    if (!el) return;
    const measure = () => setScrolls(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    ro?.observe(el);
    for (const child of Array.from(el.children)) ro?.observe(child);
    return () => { el.removeEventListener("scroll", measure); ro?.disconnect(); };
  }, [step, picks.commander, picks.bracket, picks.strategy]);

  function pick(s: PickStep, value: string | number) {
    setPicks((p) => choose(p, s, value as string));
  }
  function next() {
    if (step === "intro") setStep(steps[0]);
    else if (nextStep) setStep(nextStep);
  }

  const foot = (() => {
    if (step === "intro") {
      return { press: copy.flow.next(copy.flow.steps[steps[0]]), line: copy.intro.standing(creditCount(panel.allowance)), off: false, onPress: next };
    }
    if (nextStep) {
      const none = step === "commander" ? copy.commander.none : copy.bracket.none;
      return { press: copy.flow.next(copy.flow.steps[nextStep]), line: ready ? null : none, off: !ready, onPress: next };
    }
    const strategy = strategiesFor(panel, picks.commander).find((x) => x.key === picks.strategy);
    if (!strategy || !complete(picks)) return { press: copy.strategy.none, line: null, off: true, onPress: next };
    const done = picks;
    return {
      press: copy.strategy.press(strategy.label),
      line: blocked ? (funding.source === "short" ? copy.strategy.freeOnly : creditSpent(panel.allowance)) : copy.strategy.line(done.bracket, creditCount(panel.allowance)),
      off: blocked || !onConfirm,
      onPress: () => onConfirm?.(done),
    };
  })();

  return (
    <div ref={inertRef} className={`fixed inset-0 ${VV_FRAME} z-50 flex flex-col justify-end md:justify-center md:px-[16px]`} style={visible}>
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-[rgba(16,13,10,0.74)]" />
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 mx-auto flex h-[calc(100dvh-24px)] w-full flex-col gap-[14px] overflow-hidden rounded-[16px_16px_0_0] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] p-[10px_18px_18px] md:h-auto md:max-h-[88dvh] md:max-w-[720px] md:rounded-[14px] md:p-[24px_24px_20px]"
      >
        <SheetGrabber className="pt-0" />
        <div className="flex flex-none items-start justify-between gap-[12px]">
          <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
            {stage === "history" && <button type="button" onClick={() => setHistory(false)} className="min-h-[44px] w-fit cursor-pointer border-0 bg-transparent p-0 text-left font-sans text-[12.5px] font-medium text-[color:var(--accent-text)] md:min-h-0">{copy.history.backLink}</button>}
            {stage === "results" && fromHistory && <button type="button" onClick={() => { setOpened(null); setFromHistory(false); setHistory(true); }} className="min-h-[44px] w-fit cursor-pointer border-0 bg-transparent p-0 text-left font-sans text-[12.5px] font-medium text-[color:var(--accent-text)] md:min-h-0">{copy.history.back}</button>}
            <h2 id={titleId} className="m-0 font-display text-[20px] font-normal text-[color:var(--fg)]">{stage === "results" ? copy.flow.resultTitle : copy.flow.title(precon)}</h2>
          </div>
          {hasRuns && ((stage === "pick" && step === "intro") || (stage === "results" && !fromHistory)) && (
            <button type="button" onClick={() => setHistory(true)} className="flex min-h-[44px] flex-none cursor-pointer items-center gap-[6px] border-0 bg-transparent px-[2px] font-sans text-[12.5px] font-medium text-[color:var(--accent-text)] md:min-h-0">
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" className="flex-none">
                <path d="M8 2.2a5.8 5.8 0 1 1-5.6 4.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M2 2.6v3.6h3.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M8 5v3.3l2.2 1.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {copy.history.link}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.flow.notNow}
            className="hidden h-[36px] w-[36px] flex-none cursor-pointer items-center justify-center rounded-full border border-solid border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-muted)] md:flex"
          >
            ✕
          </button>
        </div>
        {stage === "pick" && here !== null && <StepTracker cells={cells} current={here} onGo={(s) => setStep(s)} />}
        {stage !== "pick" && stage !== "history" && !(stage === "results" && fromHistory) && (
          <StepTracker
            cells={runCells}
            current={null}
            onGo={stage === "wait" ? undefined : (s) => {
              if (shown && shownLead) setPicks({ commander: shownLead.key, bracket: shown.bracketTarget as Picks["bracket"], strategy: shown.strategyKey.split("/")[2] ?? null });
              else if (view.kind === "failed" || view.kind === "wait") setPicks({ commander: view.picks.commander, bracket: view.picks.bracket, strategy: view.picks.strategy });
              setOpened(null);
              setFromHistory(false);
              setStep(s);
              setLeft(true);
            }}
          />
        )}
        <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={body} className="-m-[6px] flex min-h-0 flex-1 flex-col gap-[16px] overflow-y-auto overscroll-contain p-[6px]">
          {stage === "wait" && view.kind === "wait" && <WaitView lead={runLead} bracket={bracketLabel} strategy={runStrategy} startedAt={view.startedAt} />}
          {stage === "failed" && <FailedView lead={runLead} bracket={bracketLabel} strategy={runStrategy} />}
          {stage === "results" && shown && fromHistory && <p className="m-0 rounded-[8px] border border-dashed border-[color:var(--border-strong)] p-[10px_12px] text-[12.5px] leading-[1.5] text-[color:var(--fg-muted)]">{copy.history.past}</p>}
          {stage === "results" && shown && <ResultView panel={panel} run={shown} />}
          {stage === "history" && <HistoryView panel={panel} art={art} onOpen={(id) => { setOpened(id); setFromHistory(true); setHistory(false); }} />}
          {stage === "pick" && step === "intro" && <IntroStep />}
          {stage === "pick" && step === "commander" && <CommanderStep options={panel.commanders} art={art} picked={picks.commander} onPick={(k) => pick("commander", k)} />}
          {stage === "pick" && step === "bracket" && <BracketStep boxBracket={panel.boxBracket} picked={picks.bracket} onPick={(b) => pick("bracket", b)} />}
          {stage === "pick" && step === "strategy" && lead && picks.bracket !== null && (
            <StrategyStep lead={leadName ?? ""} bracket={picks.bracket} options={lead.strategies} art={art} picked={picks.strategy} onPick={(k) => pick("strategy", k)} />
          )}
        </div>
        {scrolls && (
          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[36px] items-end justify-center bg-gradient-to-t from-[color:var(--surface)] to-transparent pb-[2px] font-mono text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)]">
            {copy.flow.scrolls}
          </span>
        )}
        </div>
        {stage === "history" ? (
          <div className="flex flex-none flex-col gap-[8px] md:flex-row md:items-center md:justify-between md:gap-[16px]">
            <div className="flex gap-[8px] md:order-2 md:flex-row-reverse">
              <button type="button" onClick={() => { setHistory(false); setOpened(null); setFromHistory(false); setPicks(impliedPicks(panel)); setLeft(true); setStep("intro"); }} className={`${ACCENT_PRESS} flex-[2] md:flex-none`}>{copy.history.newUpgrade}</button>
              <button type="button" onClick={onClose} className={`${GHOST_PRESS} flex-1 md:flex-none`}>{copy.history.close}</button>
            </div>
            <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)] md:order-1 md:flex-1"><CreditsText text={copy.history.cost(creditCount(panel.allowance))} /></p>
          </div>
        ) : stage === "wait" ? (
          <div className="flex flex-none flex-col gap-[8px] md:flex-row md:items-center md:justify-between md:gap-[16px]">
            <div className="flex gap-[8px] md:order-2 md:flex-row-reverse">
              <button type="button" disabled className={`${ACCENT_PRESS} flex-[2] md:flex-none`}>{copy.strategy.press(runStrategy)}</button>
              <button type="button" onClick={onClose} className={`${GHOST_PRESS} flex-1 md:flex-none`}>{copy.flow.back}</button>
            </div>
            <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)] md:order-1 md:flex-1">{copy.wait.held}</p>
          </div>
        ) : stage === "failed" ? (
          <div className="flex flex-none flex-col gap-[8px] md:flex-row md:items-center md:justify-between md:gap-[16px]">
            <div className="flex gap-[8px] md:order-2 md:flex-row-reverse">
              <button type="button" onClick={onRetry} disabled={!onRetry} className={`${ACCENT_PRESS} flex-[2] md:flex-none`}>{copy.failed.retry}</button>
              <button type="button" onClick={() => { if (view.kind === "failed") setPicks({ commander: view.picks.commander, bracket: view.picks.bracket, strategy: view.picks.strategy }); setStep("strategy"); setLeft(true); }} className={`${GHOST_PRESS} flex-1 md:flex-none`}>{copy.flow.back}</button>
            </div>
            <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)] md:order-1 md:flex-1">{copy.failed.retryLine}</p>
          </div>
        ) : stage === "results" && shown ? (
          <div className="flex flex-none flex-col gap-[8px] md:flex-row md:flex-wrap md:items-center md:justify-end md:gap-[10px]">
            {/* In the foot, beside the press it explains, so it is read whatever the body has scrolled to. */}
            {stale && <p role="note" className="m-0 w-full text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.results.listChanged}</p>}
            <button type="button" disabled={!onStart || stale} onClick={() => onStart?.(shown.id)} className={`${ACCENT_PRESS} md:order-2`}>{copy.results.start(shown.pairs.length)}</button>
            <button
              type="button"
              onClick={() => {
                if (shownLead) setPicks({ commander: shownLead.key, bracket: shown.bracketTarget as Picks["bracket"], strategy: null });
                setOpened(null);
                setFromHistory(false);
                setStep("strategy");
                setLeft(true);
              }}
              className={`${GHOST_PRESS} flex items-center justify-center gap-[10px] md:order-1`}
            >
              {copy.results.another}
              <span className="border-y-0 border-r-0 border-l border-solid border-l-[color:var(--border-strong)] pl-[10px] font-mono text-[11px] font-normal text-[color:var(--fg-muted)]">{copy.results.anotherCost}</span>
            </button>
          </div>
        ) : step === "strategy" && same && complete(picks) && !blocked ? (
          <div className="flex flex-none flex-col gap-[10px]">
            <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">
              {copy.same.body(same.strategyLabel, leadName ?? "", picks.bracket, runDay(same.createdAt))}
            </p>
            <div className="flex gap-[8px] md:justify-end">
              <button type="button" disabled={!onConfirm} onClick={() => onConfirm?.(picks)} className={`${ACCENT_PRESS} flex-1 md:flex-none`}>{copy.same.run}</button>
              <button type="button" onClick={() => setOpened(same.id)} className={`${GHOST_PRESS} flex-1 md:flex-none`}>{copy.same.open(runDay(same.createdAt))}</button>
            </div>
          </div>
        ) : (
          // Phone: the press first, Back or Not now beside it, the line under both. 1300: the line at the left of one row, Back then the press at the right.
          <div className="flex flex-none flex-col gap-[8px] md:flex-row md:items-center md:justify-between md:gap-[16px]">
            <div className="flex gap-[8px] md:order-2 md:flex-row-reverse">
              <button type="button" disabled={foot.off} onClick={foot.onPress} className={`${ACCENT_PRESS} flex-[2] md:flex-none`}>{foot.press}</button>
              <button type="button" onClick={step === "intro" ? onClose : prevStep ? () => setStep(prevStep) : () => setStep("intro")} className={`${GHOST_PRESS} flex-1 md:flex-none`}>
                {step === "intro" ? copy.flow.notNow : copy.flow.back}
              </button>
            </div>
            {foot.line && <p className="m-0 font-mono text-[10.5px] leading-[1.5] text-[color:var(--fg-faint)] md:order-1 md:min-w-0 md:flex-1"><CreditsText text={foot.line} /></p>}
          </div>
        )}
      </div>
    </div>
  );
}
