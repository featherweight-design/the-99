"use client";
// Try it, the live dummy app (public landing, 5l; design handoff `Demo-390` / `Demo-Desktop`): ONE bordered card holds the
// whole stage and swaps its contents in place, so the section header above never moves. A step is a bar row (Step N of 8, the
// bar, Skip to the end), the words, and the app. The words sit in a 340px column left of the app on a desktop, with Back and
// Next directly under them and the foot at the column's bottom; on a phone they sit above the app with Back and Next below it.
// ONE component at both widths, laid out by CSS alone. The app is the signed-in drawing halves fed by the committed fixture
// data and wrapped in the demo's inert providers; nothing typed or pressed here reaches any account. The end carries the real
// launch form.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { landingCopy } from "../../../lib/copy/landing";
import { DEMO_PLAYER } from "../../../lib/demo/player";
import type { Projected } from "../../../lib/demo/projected";
import { FadingImg } from "../../ui/hydrated-art";
import { LaunchPanel } from "../launch-panel";
import { Lead, Section } from "../section";
import { PressRing } from "./demo-ring";
import { DemoProviders } from "./demo-providers";
import { ringTarget, StepBody } from "./demo-steps";

const c = landingCopy.demo;
const STEPS = c.steps.length;

type Phase = { kind: "start" } | { kind: "step"; index: number } | { kind: "end"; skippedFrom: number | null };

const phaseKey = (p: Phase) => (p.kind === "step" ? `step-${p.index}` : p.kind === "end" ? `end-${p.skippedFrom ?? "none"}` : "start");

const FRAME = "mt-[24px] overflow-hidden rounded-[16px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-inset)]";
const BUTTON = "inline-flex h-[44px] cursor-pointer items-center justify-center whitespace-nowrap rounded-[10px] px-[18px] text-[14px]";
/** Start and Next: the main button, ink on the page's ground. */
const BTN_L = `${BUTTON} border-0 bg-[color:var(--fg)] font-medium text-[color:var(--bg)]`;
/** Back and Start over: the quiet one, bordered. */
const BTN_Q = `${BUTTON} border border-solid border-[color:var(--border-strong)] bg-transparent px-[14px] font-normal text-[color:var(--fg)]`;
const HEADING = "m-0 font-display font-bold leading-[1.25] text-[color:var(--fg)] focus:outline-none";
const CHIP = "inline-flex h-[22px] items-center gap-[5px] whitespace-nowrap rounded-[6px] border border-solid px-[8px] font-mono text-[10.5px] font-medium tracking-[0.04em]";
const CHIP_FREE = `${CHIP} border-[color:color-mix(in_oklab,var(--success)_45%,transparent)] text-[color:var(--success)]`;
const CHIP_CREDIT = `${CHIP} border-[color:color-mix(in_oklab,var(--accent)_50%,transparent)] text-[color:var(--accent-text)]`;
const LINK = "cursor-pointer border-0 bg-transparent p-0 underline underline-offset-[3px]";

/** The eight-segment bar: a segment is lit through the step shown (all of them on the end). */
function Bar({ lit }: { lit: number }) {
  return (
    <span aria-hidden className="flex flex-1 gap-[4px]">
      {c.steps.map((s, i) => (
        <span key={s.id} data-on={i < lit || undefined} className="block h-[4px] flex-1 rounded-[2px] bg-[color:var(--border-strong)] data-[on]:bg-[color:var(--accent)]" />
      ))}
    </span>
  );
}

/** The frame's top row: a label (the step, or the end), the bar and whatever sits at the right. */
function TopRow({ label, lit, right }: { label: ReactNode; lit: number; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-[12px] border-b border-solid border-b-[color:var(--border)] px-[16px] py-[12px]">
      {label}
      <Bar lit={lit} />
      {right}
    </div>
  );
}

const LABEL = "whitespace-nowrap font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-[color:var(--fg-muted)]";

/** Three cards of the player's own binder, fanned (-8, -1 and 7 degrees): the start and the end cards' picture. */
function Fan({ images }: { images: readonly string[] }) {
  if (images.length === 0) return null;
  const spots = [
    "left-0 top-[26px] rotate-[-8deg]",
    "left-[56px] top-[6px] z-[2] rotate-[-1deg] md:left-[84px]",
    "left-[112px] top-[28px] rotate-[7deg] md:left-[168px]",
  ];
  return (
    <div aria-hidden data-testid="demo-fan" className="relative h-[290px] w-[240px] flex-none self-center md:h-[360px] md:w-[330px]">
      {images.slice(0, 3).map((src, i) => (
        <span key={i} className={`absolute block aspect-[488/680] w-[118px] overflow-hidden rounded-[14px] border border-solid border-[color:var(--border-strong)] shadow-[0_10px_24px_rgba(0,0,0,0.45)] md:w-[150px] ${spots[i]}`}>
          <FadingImg src={src} alt="" loading="lazy" className="block h-full w-full object-cover" />
        </span>
      ))}
    </div>
  );
}

/** The art the fans draw: the binder's own cards, the first three for the start and the next three for the end. */
function fanArt(data: Projected, which: "start" | "end"): string[] {
  // Unique pictures only: two printings of a card can share an image, and the same one drawn twice reads as a bug.
  const art = [...new Set(data.collection.cards.flatMap((card) => (card.imageUri ? [card.imageUri] : [])))];
  return which === "end" && art.length >= 6 ? art.slice(3, 6) : art.slice(0, 3);
}

export function Demo({ data }: { data: Projected }) {
  const [phase, setPhase] = useState<Phase>({ kind: "start" });
  const [opened, setOpened] = useState<string | null>(null);
  const openCard = useCallback((oracleId: string) => setOpened(oracleId), []);
  const frame = useRef<HTMLDivElement | null>(null);
  const panel = useRef<HTMLDivElement | null>(null);
  const heading = useRef<HTMLHeadingElement | null>(null);
  const handled = useRef(phaseKey(phase));
  const go = (next: Phase) => {
    setOpened(null);
    setPhase(next);
  };

  // A press that swaps the card moves focus to its new heading (the control just pressed is gone or changed), and brings the
  // card's top back on screen when the longer step above left it scrolled past. Not on load: nothing has moved yet.
  const key = phaseKey(phase);
  useEffect(() => {
    if (handled.current === key) return;
    handled.current = key;
    heading.current?.focus({ preventScroll: true });
    const top = frame.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) frame.current?.scrollIntoView({ block: "start" });
  }, [key]);

  const header = { id: "landing-demo", testId: "demo", eyebrow: c.eyebrow, title: c.title, lead: <Lead>{c.lead}</Lead> };

  if (phase.kind === "start") {
    return (
      <Section {...header}>
        <div ref={frame} className={FRAME}>
          <div className="flex flex-col items-start gap-[14px] px-[20px] py-[26px] md:flex-row md:items-center md:gap-[34px] md:p-[30px]">
            <Fan images={fanArt(data, "start")} />
            <div className="flex flex-col items-start gap-[12px]">
              <h3 ref={heading} tabIndex={-1} className={`${HEADING} text-[21px]`}>{c.startTitle(DEMO_PLAYER)}</h3>
              <p className="m-0 text-[14.5px] leading-[1.6] text-[color:var(--fg-body)]">{c.startBody(DEMO_PLAYER)}</p>
              <button type="button" data-testid="demo-start" onClick={() => go({ kind: "step", index: 0 })} className={BTN_L}>
                {c.start}
              </button>
            </div>
          </div>
        </div>
      </Section>
    );
  }

  if (phase.kind === "end") {
    const skipped = phase.skippedFrom;
    return (
      <Section {...header}>
        <div ref={frame} className={FRAME}>
          <TopRow label={<span aria-live="polite" className={LABEL}>{c.end.label}</span>} lit={STEPS} />
          <div className="flex flex-col items-start gap-[14px] px-[20px] py-[26px] md:flex-row md:items-center md:gap-[34px] md:p-[30px]">
            <Fan images={fanArt(data, "end")} />
            <div className="flex min-w-0 flex-1 flex-col items-stretch gap-[12px] self-stretch md:self-auto">
              <h3 ref={heading} tabIndex={-1} className={`${HEADING} text-[21px]`}>{c.end.title(DEMO_PLAYER)}</h3>
              <p className="m-0 text-[14.5px] leading-[1.6] text-[color:var(--fg-body)]">{c.end.lead}</p>
              {skipped !== null ? (
                <p className="m-0 text-[13px] text-[color:var(--fg-muted)]" data-testid="demo-skipped">
                  {c.end.skipped(skipped + 1, STEPS)}{" "}
                  <button type="button" onClick={() => go({ kind: "step", index: skipped })} className={`${LINK} text-[13px] text-[color:var(--fg-muted)]`}>
                    {c.end.goBack(skipped + 1)}
                  </button>
                </p>
              ) : null}
              <LaunchPanel />
              <div className="flex items-center gap-[10px]">
                <button type="button" onClick={() => go({ kind: "start" })} className={BTN_Q}>
                  {c.end.startOver}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Section>
    );
  }

  const { index } = phase;
  const step = c.steps[index];
  const title = step.title(DEMO_PLAYER);
  const line = index === 0 ? step.line(DEMO_PLAYER, `${data.collection.totalCards.toLocaleString("en-US")} cards`) : step.line(DEMO_PLAYER, "");
  const last = index === STEPS - 1;
  // Skip to the end from the last step skips nothing, so the end says nothing was skipped.
  const toEnd = () => go({ kind: "end", skippedFrom: last ? null : index });
  return (
    <Section {...header}>
      <div ref={frame} className={FRAME}>
        <TopRow
          label={<span data-testid="demo-step" aria-live="polite" className={LABEL}>{c.step(index + 1, STEPS)}</span>}
          lit={index + 1}
          right={
            <button type="button" onClick={toEnd} className={`${LINK} flex min-h-[32px] items-center whitespace-nowrap text-[13px] text-[color:var(--fg-muted)] decoration-[color:var(--fg-faint)]`}>
              {c.skip}
            </button>
          }
        />
        <div className="flex flex-col md:grid md:grid-cols-[340px_minmax(0,1fr)]">
          {/* The words column: a plain stack on a desktop; on a phone `contents` hands its three parts to the card's own
              column, so the app can sit between the words and the nav. */}
          <div className="contents md:col-start-1 md:row-start-1 md:flex md:flex-col md:gap-[10px] md:px-[28px] md:pb-[24px] md:pt-[28px]">
            <div className="order-1 flex flex-col gap-[10px] border-b border-solid border-b-[color:var(--border)] px-[16px] pb-[14px] pt-[16px] md:order-none md:border-b-0 md:p-0">
              <div className="flex flex-wrap gap-[6px]">
                {step.tags.map((tag) => (
                  <span key={tag.label} data-testid="demo-tag" className={tag.kind === "free" ? CHIP_FREE : CHIP_CREDIT}>
                    {tag.kind === "free" ? null : <span aria-hidden className="block h-[6px] w-[6px] rotate-45 bg-[color:var(--accent)]" />}
                    {tag.label}
                  </span>
                ))}
              </div>
              <h3 ref={heading} tabIndex={-1} className={`${HEADING} text-[19px] md:text-[23px]`}>{title}</h3>
              <p className="m-0 text-[14px] leading-[1.6] text-[color:var(--fg-body)]">{line}</p>
            </div>
            <div className="order-3 flex items-center gap-[10px] border-t border-solid border-t-[color:var(--border)] px-[16px] py-[12px] md:order-none md:mt-[6px] md:border-t-0 md:p-0">
              {index === 0 ? null : (
                <button type="button" onClick={() => go({ kind: "step", index: index - 1 })} className={BTN_Q}>
                  {c.back}
                </button>
              )}
              <button type="button" data-testid="demo-next" onClick={() => go(last ? { kind: "end", skippedFrom: null } : { kind: "step", index: index + 1 })} className={`${BTN_L} flex-1 md:min-w-[130px] md:flex-none`}>
                {last ? c.seeEnd : c.next}
              </button>
            </div>
            <div className="order-4 flex flex-wrap items-center gap-x-[8px] gap-y-[4px] px-[16px] pb-[14px] text-[13.5px] text-[color:var(--fg-muted)] md:order-none md:mt-auto md:border-t md:border-solid md:border-t-[color:var(--border)] md:p-0 md:pt-[12px]">
              <span>{c.foot}</span>
              <button type="button" onClick={toEnd} className={`${LINK} inline-flex min-h-[32px] items-center text-[13.5px] font-semibold text-[color:var(--accent-text)]`}>
                {c.footLink}
              </button>
            </div>
          </div>
          <div ref={panel} className="relative order-2 min-w-0 bg-[color:var(--bg)] p-[16px] md:order-none md:col-start-2 md:row-start-1 md:border-l md:border-solid md:border-l-[color:var(--border)] md:px-[28px] md:py-[24px]">
            <span className="absolute right-[12px] top-[8px] font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[color:var(--fg-faint)]">{c.stage(DEMO_PLAYER)}</span>
            <div data-testid="demo-app" className="pt-[10px]">
              <DemoProviders onOpenCard={openCard} openOracleId={opened}>
                <StepBody index={index} data={data} onOpenCard={openCard} />
              </DemoProviders>
            </div>
            <PressRing panel={panel} selector={ringTarget(index)} label={step.press} />
          </div>
        </div>
      </div>
    </Section>
  );
}
