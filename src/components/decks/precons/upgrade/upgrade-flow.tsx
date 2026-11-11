"use client";

// Upgrade this precon's flow (handoff R2d): a drawer on a phone, a 720-wide dialog on desktop, S1's chrome. It opens on what to expect, then walks
// Commander, Bracket and Strategy, one step at a time. The foot holds one primary press that names the next step; at Strategy it is the confirm.
// A step with one option is skipped and its pick made for the player. This PR draws the picks and the confirm; the run itself is the next PR's
// (`onConfirm` absent: the press is drawn off).
import { useId, useMemo, useRef, useState } from "react";
import { useDialogA11y } from "../../../../lib/a11y/dialog";
import { useInertWhileOpen } from "../../../../lib/a11y/inert-page";
import { useVisualViewportFrame, VV_FRAME } from "../../../ui/visual-viewport";
import { creditCount, creditSpent } from "../../../../lib/model/credit-line";
import { runFunding } from "../../../../lib/model/allowance-rule";
import { BRACKET_NAMES } from "../../../../lib/copy/deck-analysis";
import { preconDay } from "../../../../lib/copy/precons";
import { preconUpgradeCopy } from "../../../../lib/copy/precon-upgrade";
import { complete, choose, commanderOf, impliedPicks, pickSteps, sameRun, strategiesFor, type FlowStep, type PickStep, type Picks } from "../../../../lib/precons/upgrade/flow";
import type { UpgradePanel } from "../../../../lib/precons/upgrade/run";
import { PrimaryButton } from "../../../ui/button";
import { CreditsText } from "../../../ui/credits-text";
import { IntroStep } from "./intro-step";
import { BracketStep, CommanderStep, StrategyStep, type UpgradeArt } from "./pick-steps";
import { StepTracker } from "./step-tracker";

const copy = preconUpgradeCopy;
const bracketName = (b: 2 | 3 | 4) => BRACKET_NAMES[b];
/** The run's day as `Nov 10`, in UTC as the server draws it. */
const sameDate = (d: Date) => preconDay(new Date(d).toISOString().slice(0, 10));

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
      line: blocked ? creditSpent(panel.allowance) : copy.strategy.line(done.bracket, creditCount(panel.allowance)),
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
        <span aria-hidden="true" className="mx-auto h-[4px] w-[36px] flex-none rounded-full bg-[color:var(--border-strong)] md:hidden" />
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
        <div className="-m-[6px] flex min-h-0 flex-1 flex-col gap-[16px] overflow-y-auto overscroll-contain p-[6px]">
          {step === "intro" && <IntroStep />}
          {step === "commander" && <CommanderStep options={panel.commanders} art={art} picked={picks.commander} onPick={(k) => pick("commander", k)} />}
          {step === "bracket" && <BracketStep boxBracket={panel.boxBracket} picked={picks.bracket} onPick={(b) => pick("bracket", b)} />}
          {step === "strategy" && lead && picks.bracket !== null && (
            <StrategyStep lead={leadName ?? ""} bracket={picks.bracket} options={lead.strategies} art={art} picked={picks.strategy} onPick={(k) => pick("strategy", k)} />
          )}
        </div>
        {foot.line && <p className="m-0 flex-none font-mono text-[10.5px] text-[color:var(--fg-faint)]"><CreditsText text={foot.line} /></p>}
        {step === "strategy" && same && complete(picks) && !blocked && (
          <div className="flex flex-none flex-col gap-[8px] rounded-[10px] bg-[color:var(--surface-sunken)] p-[10px_12px]">
            <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">
              {copy.same.body(same.strategyLabel, leadName ?? "", picks.bracket, sameDate(same.createdAt))}
            </p>
            <div className="flex gap-[8px]">
              <button type="button" disabled={!onConfirm} onClick={() => onConfirm?.(picks)} className="h-[44px] flex-1 cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] text-[13px] text-[color:var(--fg-body)] disabled:cursor-default disabled:opacity-60 md:h-[40px] md:flex-none">{copy.same.run}</button>
            </div>
          </div>
        )}
        <div className="flex flex-none gap-[8px] md:justify-end">
          <button
            type="button"
            onClick={step === "intro" ? onClose : prevStep ? () => setStep(prevStep) : () => setStep("intro")}
            className="h-[46px] flex-1 cursor-pointer rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] font-sans text-[13px] text-[color:var(--fg-body)] md:h-[40px] md:flex-none"
          >
            {step === "intro" ? copy.flow.notNow : copy.flow.back}
          </button>
          <PrimaryButton type="button" disabled={foot.off} onClick={foot.onPress} className="h-[46px] flex-[2] rounded-[8px] px-[14px] text-[13px] md:h-[40px] md:flex-none">
            {foot.press}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
