"use client";

// Upgrade this precon's flow (handoff R2d): a drawer on a phone, a 720-wide dialog on desktop, S1's chrome. It opens on what to expect, then walks
// Commander, Bracket and Strategy, one step at a time. The foot holds one primary press that names the next step; at Strategy it is the confirm.
// A step with one option is skipped and its pick made for the player. This PR draws the picks and the confirm; the run itself is the next PR's
// (`onConfirm` absent: the press is drawn off).
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDialogA11y } from "../../../../lib/a11y/dialog";
import { useInertWhileOpen } from "../../../../lib/a11y/inert-page";
import { useVisualViewportFrame, VV_FRAME } from "../../../ui/visual-viewport";
import { creditCount, creditSpent } from "../../../../lib/model/credit-line";
import { runFunding } from "../../../../lib/model/allowance-rule";
import { BRACKET_NAMES } from "../../../../lib/copy/deck-analysis";
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import { complete, choose, commanderOf, impliedPicks, pickSteps, sameRun, strategiesFor, type FlowStep, type PickStep, type Picks } from "../../../../lib/precons/upgrade/flow";
import type { UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { CreditsText } from "../../../ui/credits-text";
import { SheetGrabber } from "../../../ui/sheet-grabber";
import { IntroStep } from "./intro-step";
import { BracketStep, CommanderStep, StrategyStep, type UpgradeArt } from "./pick-steps";
import { StepTracker } from "./step-tracker";

const copy = preconUpgradeCopy;
// The foot's press is the accent fill (R2d boards), dimmed and still when off; Back and Not now are the hairline.
const ACCENT_PRESS = "h-[46px] cursor-pointer rounded-[8px] border-0 bg-[color:var(--accent)] px-[16px] font-sans text-[13px] font-semibold text-[color:var(--bg)] transition-colors hover:bg-[color:var(--accent-hover)] disabled:cursor-default disabled:bg-[color:var(--elevated)] disabled:text-[color:var(--fg-faint)] disabled:hover:bg-[color:var(--elevated)] md:h-[40px]";
const GHOST_PRESS = "h-[46px] cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[16px] font-sans text-[13px] font-semibold text-[color:var(--fg)] disabled:cursor-default disabled:opacity-60 md:h-[40px]";
const bracketName = (b: 2 | 3 | 4) => BRACKET_NAMES[b];
/** The run's day as `Nov 10`, in the reader's own zone: this draws only after the reader opens the flow, so no server render disagrees. */
const sameDate = (d: Date) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function UpgradeFlow({ precon, panel, art, onClose, onConfirm }: {
  precon: string;
  panel: UpgradePanel;
  art: UpgradeArt;
  onClose: () => void;
  /** The run's press; absent draws the confirm off. */
  onConfirm?: (picks: { commander: string; bracket: number; strategy: string }) => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const steps = useMemo(() => pickSteps(panel), [panel]);
  const [picks, setPicks] = useState<Picks>(() => impliedPicks(panel));
  const [step, setStep] = useState<FlowStep>("intro");
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
          <h2 id={titleId} className="m-0 font-display text-[20px] font-normal text-[color:var(--fg)]">{copy.flow.title(precon)}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.flow.notNow}
            className="hidden h-[36px] w-[36px] flex-none cursor-pointer items-center justify-center rounded-full border border-solid border-[color:var(--border-strong)] bg-transparent text-[color:var(--fg-muted)] md:flex"
          >
            ✕
          </button>
        </div>
        {here !== null && <StepTracker cells={cells} current={here} onGo={(s) => setStep(s)} />}
        <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={body} className="-m-[6px] flex min-h-0 flex-1 flex-col gap-[16px] overflow-y-auto overscroll-contain p-[6px]">
          {step === "intro" && <IntroStep />}
          {step === "commander" && <CommanderStep options={panel.commanders} art={art} picked={picks.commander} onPick={(k) => pick("commander", k)} />}
          {step === "bracket" && <BracketStep boxBracket={panel.boxBracket} picked={picks.bracket} onPick={(b) => pick("bracket", b)} />}
          {step === "strategy" && lead && picks.bracket !== null && (
            <StrategyStep lead={leadName ?? ""} bracket={picks.bracket} options={lead.strategies} art={art} picked={picks.strategy} onPick={(k) => pick("strategy", k)} />
          )}
        </div>
        {scrolls && (
          <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[36px] items-end justify-center bg-gradient-to-t from-[color:var(--surface)] to-transparent pb-[2px] font-mono text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--fg-faint)]">
            {copy.flow.scrolls}
          </span>
        )}
        </div>
        {step === "strategy" && same && complete(picks) && !blocked ? (
          <div className="flex flex-none flex-col gap-[10px]">
            <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">
              {copy.same.body(same.strategyLabel, leadName ?? "", picks.bracket, sameDate(same.createdAt))}
            </p>
            <div className="flex gap-[8px] md:justify-end">
              <button type="button" disabled={!onConfirm} onClick={() => onConfirm?.(picks)} className={`${ACCENT_PRESS} flex-1 md:flex-none`}>{copy.same.run}</button>
              <button type="button" disabled className={`${GHOST_PRESS} flex-1 md:flex-none`}>{copy.same.open(sameDate(same.createdAt))}</button>
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
